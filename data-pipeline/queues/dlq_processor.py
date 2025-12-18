import os
import json
import time
import logging
from datetime import datetime, timezone
from typing import Optional
from redis_queue import RedisQueue
from dotenv import load_dotenv

load_dotenv()

logger = logging.getLogger(__name__)

# config
DLQ_NAME = os.getenv("DEAD_LETTER_QUEUE_NAME", "span_processing_dlq")
MAIN_QUEUE_NAME = os.getenv("QUEUE_NAME", "span_processing_queue")
DLQ_RETRY_DELAY_HOURS = int(os.getenv("DLQ_RETRY_DELAY_HOURS", 1))
DLQ_MAX_AGE_HOURS = int(os.getenv("DLQ_MAX_AGE_HOURS", 72))
DLQ_ALERT_THRESHOLD = int(os.getenv("DLQ_ALERT_THRESHOLD", 10))

class DLQProcessor:
    def __init__(self):
        self.dlq = RedisQueue(queue_name=DLQ_NAME)
        self.main_queue = RedisQueue(queue_name=MAIN_QUEUE_NAME)
        self.metrics_key = "dlq:metrics"
    
    # get the dlq length
    def get_dlq_length(self) -> int:
        return self.dlq.get_queue_length()
    
    # get DLQ metrics using Redis
    def get_metrics(self) -> dict:
        redis = self.dlq.redis_client

        return {
            "dlq_length": self.get_dlq_length(),
            "total_retried": int(redis.get(f"{self.metrics_key}:total_retried") or 0),
            "total_expired": int(redis.get(f"{self.metrics_key}:total_expired") or 0),
            "total_alerts_sent": int(redis.get(f"{self.metrics_key}:alerts_sent") or 0),
            "last_processed_at": int(redis.get(f"{self.metrics_key}:last_processed_at") or 0),
        }
    
    def process_dlq(self) -> dict:
        redis = self.dlq.redis_client
        tasks = redis.lrange(DLQ_NAME, 0, -1)

        now = datetime.now(timezone.utc)
        retried = 0
        expired = 0
        kept = 0

        for task_json in tasks:
            try:
                task = json.loads(task_json)
                failed_at = task.get("failed_at")
                last_dlq_retry = task.get("last_dlq_retry")

                if not failed_at:
                    redis.lrem(DLQ_NAME, 1, task_json)
                    expired += 1
                    continue

                failed_time = datetime.fromisoformat(failed_at.replace("Z", "+00:00"))
                age_hours = (now - failed_time).total_seconds() / 3600

                # this expires the task in the DLQ if it has been there for too long
                if age_hours > DLQ_MAX_AGE_HOURS:
                    redis.lrem(DLQ_NAME, 1, task_json)
                    expired += 1
                    logger.info(f"Expired DLQ task (age: {age_hours:.1f}h)", extra = {
                        "trace_id": task.get("span", {}).get("trace_id"),
                    })
                    continue

                should_retry = False

                # determines whether or not we should retry the dlq task
                if last_dlq_retry:
                    last_retry_time = datetime.fromisoformat(last_dlq_retry.replace("Z", "+00:00"))
                    hours_since_retry = (now - last_retry_time).total_seconds() / 3600
                    should_retry = hours_since_retry >= DLQ_RETRY_DELAY_HOURS
                else:
                    should_retry = age_hours >= DLQ_RETRY_DELAY_HOURS

                # if we should retry the task, then retry it otherwise add it to the kept pile
                if should_retry:
                    self._retry_task(task, task_json)
                    retried += 1
                else:
                    kept += 1
            except Exception as e:
                logger.error(f"rror procssing DLQ task: {e}")
                kept += 1
        
        # update the redis keys containing thi sdata
        redis.incrby(f"{self.metrics_key}:total_retried", retried)
        redis.incrby(f"{self.metrics_key}:total_expired", expired)
        redis.set(f"{self.metrics_key}:last_processed", now.isoformat())

        # if the current length of the DLQ is greater than the alert threshold, send an alert
        current_length = self.get_dlq_length()
        if current_length >= DLQ_ALERT_THRESHOLD:
            self._send_alert(current_length)
        
        summary = {
            "processed_at": now.isoformat(),
            "retried": retried,
            "expired": expired,
            "kept": kept,
            "current_dlq_length": current_length,
        }

        logger.info(f"DLQ processing complete", extra={"summary": summary})
        return summary
    
    # move a task from DLQ back to main queue
    def _retry_task(self, task: dict, task_json: str) -> None:
        redis = self.dlq.redis_client

        task["retry_count"] = 0
        task["dlq_retry_count"] = task.get("dlq_retry_count", 0) + 1
        task["last_dlq_retry"] = datetime.now(timezone.utc).isoformat()
        task.pop("failed_at", None)
        task.pop("error_message", None)

        self.main_queue.enqueue(task)

        redis.lrem(DLQ_NAME, 1, task_json)

        logger.info(f"Retried DLQ task", extra={
            "trace_id": task.get("span", {}).get("trace_id"),
            "dlq_retry_count": task["dlq_retry_count"],
        })

    # send alert when DLQ exceeds threshold
    def _send_alert(self, dlq_length: int) -> None:
        redis = self.dlq.redis_client

        last_alert = redis.get(f"{self.metrics_key}:last_alert")
        if last_alert:
            last_alert_time = datetime.fromisoformat(last_alert.replace("Z", "+00:00"))
            hours_since_alert = (datetime.now(timezone.utc) - last_alert_time).total_seconds() / 3600

            if hours_since_alert < 1:
                return
            
        logger.warning(
            f"DLQ ALERT: {dlq_length} tasks in a dead letter queue (threshold: {DLQ_ALERT_THRESHOLD})",
            extra={
                "alert_type": "dlq_threshold_exceeded",
                "dlq_length": dlq_length,
                "threshold": DLQ_ALERT_THRESHOLD,
            }
        )

        redis.set(f"{self.metrics_key}:last_alert", datetime.now(timezone.utc).isoformat())
        redis.incr(f"{self.metrics_key}:alerts_sent")
    
    # force retry all tasks in DLQ immediately
    def retry_all(self) -> int:
        redis = self.dlq.redis_client
        tasks = redis.lrange(DLQ_NAME, 0, -1)

        count = 0
        for task_json in tasks:
            try:
                task = json.loads(task_json)
                self._retry_task(task, task_json)
                count += 1
            except Exception as e:
                logger.error(f"Failed to retry task: {e}")
        
        return count
    
    # removes all tasks older than DLQ_MAX_AGE_HOURS
    def clear_expired(self) -> int:
        redis = self.dlq.redis_client
        tasks = redis.lrange(DLQ_NAME, 0, -1)
        
        now = datetime.now(timezone.utc)
        count = 0

        for task_json in tasks:
            try:
                task = json.loads(task_json)
                failed_at = task.get("failed_at")
                if failed_at:
                    failed_time = datetime.fromisoformat(failed_at.replace("Z", "+00:00"))
                    age_hours = (now - failed_time).total_seconds() / 3600

                    if age_hours > DLQ_MAX_AGE_HOURS:
                        redis.lrem(DLQ_NAME, 1, task_json)
                        count += 1
            except Exception:
                pass

dlq_processor = DLQProcessor()
