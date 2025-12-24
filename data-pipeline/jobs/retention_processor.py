import os
import sys
import time
from datetime import datetime, timezone
from typing import Dict, List

from dotenv import load_dotenv
import redis

sys.path.append(os.path.join(os.path.dirname(__file__), '..', '..'))
from backend.db_connection import db

sys.path.append(os.path.join(os.path.dirname(__file__), '..'))
from application_logging.logger_config import setup_logger

load_dotenv()

# config
SPAN_BATCH_SIZE = int(os.getenv("RETENTION_SPAN_BATCH_SIZE", "1000"))
TRACE_BATCH_SIZE = int(os.getenv("RETENTION_TRACE_BATCH_SIZE", "500"))
MAX_BATCHES_PER_RUN = int(os.getenv("RETENTION_MAX_BATCHES", "100"))
BATCH_DELAY_SECONDS = float(os.getenv("RETENTION_BATCH_DELAY", "0.1"))

LOCK_KEY = "retention:lock"
LOCK_TTL = 3600

class RetentionProcessor:
    def __init__(self):
        self.logger = setup_logger(__name__)
        self.metrics = {
            "spans_archived": 0,
            "traces_archived": 0,
            "archived_spans_deleted": 0,
            "archived_traces_deleted": 0,
            "errors": 0,
        }

    # get distinct user IDs that have at least one agent with retention enabled
    def get_users_with_retention_enabled(self) -> List[str]:
        conn = db.get_connection()
        try:
            with conn.cursor() as cur:
                cur.execute("""
                    SELECT DISTINCT user_id
                    FROM agents
                    WHERE retention_enabled = true
                      AND retention_days IS NOT NULL
                      AND user_id IS NOT NULL
                """)
                rows = cur.fetchall()
                return [str(row[0]) for row in rows]
        except Exception as e:
            self.logger.error(f"Error fetching users with retention enabled: {e}")
            return []
        finally:
            db.return_connection(conn)

    # archive spans for a user in batches until no more spans need archiving
    def archive_spans_for_user(self, user_id: str) -> int:
        total_archived = 0
        batch_count = 0

        while batch_count < MAX_BATCHES_PER_RUN:
            try:
                archived = db.archive_spans_batch(user_id, SPAN_BATCH_SIZE)
                if archived == 0:
                    break
                total_archived += archived
                batch_count += 1
                self.logger.info(
                    f"Archived {archived} spans for user {user_id} (batch {batch_count})"
                )
                if BATCH_DELAY_SECONDS > 0:
                    time.sleep(BATCH_DELAY_SECONDS)
            except Exception as e:
                self.logger.error(f"Error archiving spans for user {user_id}: {e}")
                self.metrics["errors"] += 1
                break

        return total_archived

    # archive traces for a user where all spans have been archived
    def archive_traces_for_user(self, user_id: str) -> int:
        total_archived = 0
        batch_count = 0

        while batch_count < MAX_BATCHES_PER_RUN:
            try:
                archived = db.archive_traces_batch(user_id, TRACE_BATCH_SIZE)
                if archived == 0:
                    break
                total_archived += archived
                batch_count += 1
                self.logger.info(
                    f"Archived {archived} traces for user {user_id} (batch {batch_count})"
                )
                if BATCH_DELAY_SECONDS > 0:
                    time.sleep(BATCH_DELAY_SECONDS)
            except Exception as e:
                self.logger.error(f"Error archiving traces for user {user_id}: {e}")
                self.metrics["errors"] += 1
                break

        return total_archived

    # delete archived spans and traces that exceed archive_retention_days
    def delete_expired_archived_data_for_user(self, user_id: str) -> Dict[str, int]:
        deleted_spans = 0
        deleted_traces = 0

        try:
            deleted_spans = db.delete_expired_archived_spans(user_id)
            if deleted_spans > 0:
                self.logger.info(
                    f"Permanently deleted {deleted_spans} expired archived spans for user {user_id}"
                )
        except Exception as e:
            self.logger.error(f"Error deleting expired archived spans for user {user_id}: {e}")
            self.metrics["errors"] += 1

        try:
            deleted_traces = db.delete_expired_archived_traces(user_id)
            if deleted_traces > 0:
                self.logger.info(
                    f"Permanently deleted {deleted_traces} expired archived traces for user {user_id}"
                )
        except Exception as e:
            self.logger.error(f"Error deleting expired archived traces for user {user_id}: {e}")
            self.metrics["errors"] += 1

        return {"spans": deleted_spans, "traces": deleted_traces}

    # run the full retention workflow for a single user
    def process_user(self, user_id: str) -> Dict[str, int]:
        user_metrics = {
            "spans_archived": 0,
            "traces_archived": 0,
            "archived_spans_deleted": 0,
            "archived_traces_deleted": 0,
        }

        self.logger.info(f"Processing retention for user {user_id}")

        user_metrics["spans_archived"] = self.archive_spans_for_user(user_id)

        user_metrics["traces_archived"] = self.archive_traces_for_user(user_id)

        deleted = self.delete_expired_archived_data_for_user(user_id)
        user_metrics["archived_spans_deleted"] = deleted["spans"]
        user_metrics["archived_traces_deleted"] = deleted["traces"]

        return user_metrics

    # run the full retention process for all users
    def run(self) -> Dict:
        start_time = time.time()
        self.metrics = {
            "spans_archived": 0,
            "traces_archived": 0,
            "archived_spans_deleted": 0,
            "archived_traces_deleted": 0,
            "errors": 0,
            "users_processed": 0,
        }

        self.logger.info("Starting retention processing run")

        users = self.get_users_with_retention_enabled()
        self.logger.info(f"Found {len(users)} users with retention enabled")

        for user_id in users:
            try:
                user_metrics = self.process_user(user_id)
                self.metrics["spans_archived"] += user_metrics["spans_archived"]
                self.metrics["traces_archived"] += user_metrics["traces_archived"]
                self.metrics["archived_spans_deleted"] += user_metrics["archived_spans_deleted"]
                self.metrics["archived_traces_deleted"] += user_metrics["archived_traces_deleted"]
                self.metrics["users_processed"] += 1
            except Exception as e:
                self.logger.error(f"Unexpected error processing user {user_id}: {e}")
                self.metrics["errors"] += 1

        elapsed = time.time() - start_time
        self.metrics["elapsed_seconds"] = round(elapsed, 2)
        self.metrics["completed_at"] = datetime.now(timezone.utc).isoformat()

        self.logger.info(
            f"Retention processing complete",
            extra={"metrics": self.metrics}
        )

        return self.metrics
    
def acquire_lock(worker_id: int):
    acquired = redis.set(LOCK_KEY, worker_id, nx=True, ex=LOCK_TTL)

def release_lock(worker_id: int):
    if redis.get(LOCK_KEY) == worker_id:
        redis.delete(LOCK_KEY)



retention_processor = RetentionProcessor()


if __name__ == "__main__":
    print("Starting retention processor...")
    result = retention_processor.run()
    print(f"\nRetention processing complete:")
    print(f"  Users processed: {result['users_processed']}")
    print(f"  Spans archived: {result['spans_archived']}")
    print(f"  Traces archived: {result['traces_archived']}")
    print(f"  Archived spans deleted: {result['archived_spans_deleted']}")
    print(f"  Archived traces deleted: {result['archived_traces_deleted']}")
    print(f"  Errors: {result['errors']}")
    print(f"  Elapsed time: {result['elapsed_seconds']}s")
