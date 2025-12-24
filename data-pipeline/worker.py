import base64
import json
import os
import secrets
import sys
import time
from datetime import datetime, timezone
import uuid

import msgpack
import redis
from queues.redis_queue import RedisQueue
from dotenv import load_dotenv
from data_processing.prompt_upload import upload_input, upload_output
sys.path.append(os.path.join(os.path.dirname(__file__), '..'))
from backend.db_connection import db
from collections import defaultdict
import socket
import signal
from queues.dlq_processor import dlq_processor
from jobs.retention_processor import retention_processor

# add the application logging layer to the path
sys.path.append(os.path.join(os.path.dirname(__file__), 'application_logging'))
from application_logging.logger_config import setup_logger

# load environment variables
load_dotenv()

# Cost anomaly detection thresholds (can be overridden via env vars)
TRACE_COST_ALERT_THRESHOLD = float(os.getenv('TRACE_COST_ALERT_THRESHOLD', '1.0'))  # Alert for traces > $1
HIGH_TOKEN_ALERT_THRESHOLD = int(os.getenv('HIGH_TOKEN_ALERT_THRESHOLD', '50000'))  # Alert for traces > 50k tokens
TTL_SECONDS = 3600

DRAIN_TIMEOUT = 30

WORKER_IDLE_TIMEOUT = 300
DEQUEUE_TIMEOUT = 5

RETENTION_CHECK_INTERVAL = 86400

# this class represents a worker that processes span tasks from the Redis queue
# it continuously pulls task from the queue and processes them and is separate from the API
class SpanWorker:
    # initialize the worker with the Redis queue information
    def __init__(self):
        # set up the logger for the worker
        self.logger = setup_logger(__name__)

        self.queue = RedisQueue()

        self.pending_spans = []
        self.batch_start_time = None
        self.BATCH_SIZE = 50
        self.FLUSH_INTERVAL = 5

        self.worker_id = f"{socket.gethostname()}-{os.getpid()}"

        self.shutdown_requested = False

        self.last_task_time = time.time()
        self.tasks_processed = 0
        self.last_heartbeat_time = time.time()
        self.HEARTBEAT_INTERVAL = 30  # Send heartbeat every 30 seconds

        self.drain_start_time = None

        self.last_retention_run = time.time()

        # Idle tracking for self-termination
        self.consecutive_empty_polls = 0
        self.max_empty_polls = WORKER_IDLE_TIMEOUT // DEQUEUE_TIMEOUT

    def invalidate_cost_caches(self, user_ids: set):
        """
        Invalidate cached cost aggregation data when new spans arrive.
        Uses pattern matching to delete all cache keys for affected users.
        """
        for user_id in user_ids:
            if not user_id:
                continue
            try:
                # Delete all cost-related cache keys for this user
                patterns = [
                    f"cache:cost_summary:{user_id}:*",
                    f"cache:cost_by_agent:{user_id}:*",
                    f"cache:cost_by_model:{user_id}:*",
                    f"cache:cost_trends:{user_id}:*",
                    f"cache:cost_trends:v2:{user_id}:*",
                    f"cache:token_breakdown:{user_id}:*",
                ]
                for pattern in patterns:
                    cursor = 0
                    while True:
                        cursor, keys = self.queue.redis_client.scan(
                            cursor=cursor,
                            match=pattern,
                            count=100
                        )
                        if keys:
                            self.queue.redis_client.delete(*keys)
                        if cursor == 0:
                            break
            except Exception as e:
                self.logger.warning(f"Failed to invalidate cost caches for user {user_id}: {e}")

    # this function processes a single span task
    # instead of having the backend infra do it automatically, we have this worker do it because it saves time
    # this function will upload data to our blob storage (S3) and also save the span to the Supabase db
    def process_span_task(self, task_data: dict) -> bool:
        try:
            # extract span data
            span = task_data.get('span')
            received_at = task_data.get('received_at')

            # extract ids for logging context
            trace_id = str(span.get('trace_id', 'unknown'))
            model = span.get('model', 'unknown')

            # add a log stating that we have started to process the span
            self.logger.info("Starting to process span task", extra={'extra_data': {
                'trace_id': trace_id,
                'model': model,
                'received_at': received_at,
                'worker_id': self.worker_id
            }})

            # this are links for the S3 buckets
            # If S3 credentials are not configured, use placeholder URLs
            try:
                input_blob_url = upload_input(
                    user_id=task_data.get('user_id'),
                    trace_id=trace_id,
                    span_id=str(span.get('span_id', 'unknown')),
                    content=span.get('input_data', '')
                )
            except Exception as e:
                self.logger.warning(f"S3 upload failed for input, using placeholder: {e}")
                input_blob_url = f"placeholder://input/{trace_id}/{span.get('span_id', 'unknown')}"

            try:
                output_blob_url = upload_output(
                    user_id=task_data.get('user_id'),
                    trace_id=trace_id,
                    span_id=str(span.get('span_id', 'unknown')),
                    content=span.get('output_data', '')
                )
            except Exception as e:
                self.logger.warning(f"S3 upload failed for output, using placeholder: {e}")
                output_blob_url = f"placeholder://output/{trace_id}/{span.get('span_id', 'unknown')}"

            # convert out input span data into a dict that can be passed into the Supabase table
            # this dict follows the span schema as stated in init.sql
            span_db_data = {
                "span_id": str(span.get('span_id', 'unknown')),
                "trace_id": trace_id,
                "parent_span_ids": span.get('parent_span_id', []),
                "name": span.get('name'),
                "start_time": span.get('start_time'),
                "end_time": span.get('end_time'),
                "duration": float(span.get('duration', 0)),
                "input_preview": span.get('input_data', '')[:200],
                "input_blob_url": input_blob_url,
                "output_preview": span.get('output_data', '')[:200],
                "output_blob_url": output_blob_url,
                "llm_model": span.get('model'),
                "prompt_tokens": span.get('input_tokens'),
                "completion_tokens": span.get('output_tokens'),
                "cost": span.get('total_cost'),
                "status": span.get('status'),
                "error_message": span.get('error_message'),
                "is_streaming": span.get('is_streaming', False),
                "time_to_first_token": span.get('time_to_first_token'),
                "tokens_per_second": span.get('tokens_per_second'),
                "prompt_id": span.get("prompt_id"),
                "prompt_name": span.get("prompt_name"),
                "prompt_version": span.get("prompt_version"),
                "prompt_hash": span.get("prompt_hash"),
                # Tool tracking fields
                "span_type": span.get('span_type', 'function'),
                "tool_metadata": span.get('tool_metadata'),
                "http_method": span.get('http_method'),
                "http_url": span.get('http_url'),
                "http_status_code": span.get('http_status_code'),
                "api_name": span.get('api_name'),
                "db_type": span.get('db_type'),
                "db_operation": span.get('db_operation'),
                "db_query": span.get('db_query'),
                "software_name": span.get('software_name'),
                "software_type": span.get('software_type'),
                "cli_command": span.get('cli_command'),
                "cli_exit_code": span.get('cli_exit_code'),
                "cli_stdout": span.get('cli_stdout'),
                "cli_stderr": span.get('cli_stderr'),
                "tool_name": span.get('tool_name'),
                "tool_category": span.get('tool_category'),
                "tags": span.get('tags'),
            }
            
            # Accumulate token/cost/duration in Redis for trace-level aggregation
            # These will be read when the SDK calls /trace/end
            self.queue.redis_client.incrbyfloat(f"trace:{trace_id}:total_tokens", span.get('input_tokens', 0) + span.get('output_tokens', 0))
            self.queue.redis_client.expire(f"trace:{trace_id}:total_tokens", TTL_SECONDS)
            self.queue.redis_client.incrbyfloat(f"trace:{trace_id}:total_cost", span.get('total_cost', 0))
            self.queue.redis_client.expire(f"trace:{trace_id}:total_cost", TTL_SECONDS)
            self.queue.redis_client.incrbyfloat(f"trace:{trace_id}:total_duration", span.get('duration', 0))
            self.queue.redis_client.expire(f"trace:{trace_id}:total_duration", TTL_SECONDS)

            # check if trace exists, if not create it
            existing_trace = db.get_trace_by_id(trace_id)

            if not existing_trace:
                trace = {
                    "start_time": str(span.get('start_time')),
                    "end_time": "",
                    "duration": 0,
                    "total_cost": 0,
                    "total_tokens": 0,
                    "status": "running",
                    "user_id": str(span.get('user_id')),  # Keep as UUID string
                    "trace_hash_id": generate_hash_key(str(span.get('user_id')), str(span.get('agent_id'))),
                    "tags": span.get('tags', [])
                }
                trace["trace_id"] = trace_id

                # Add agent_id if provided (as UUID string)
                if span.get('agent_id') is not None:
                    trace["agent_id"] = str(span.get('agent_id'))

                db.insert_trace(trace)

                self.logger.info("Trace auto-created", extra={'extra_data': {
                    'trace_id': trace_id,
                    'user_id': trace['user_id'],
                    'agent_id': trace.get('agent_id', 'none'),
                    'reason': 'trace_did_not_exist',
                    'worker_id': self.worker_id
                }})

            span_id = db.insert_span(span_db_data)
            user_id = str(span.get('user_id') or task_data.get('user_id') or "")
            self.publish_span_to_redis(span_db_data, user_id=user_id or None)

            # if span has an error message, then mark the trace as failed
            if span.get('status') == 'error':
                update_data = {
                    "status": "error"
                }
                db.update_trace(trace_id, update_data)
                
                self.logger.info("Trace marked as failed due to span error", extra={'extra_data': {
                    'trace_id': trace_id,
                    'span_id': span_id,
                    'error_message': span.get('error_message', 'Unknown error'),
                    'worker_id': self.worker_id
                }})

            # log successful completion with context for the span
            self.logger.info("Span processed successfully", extra={'extra_data': {
                'trace_id': trace_id,
                'model': model,
                'span_id': span_id,
                'cost': span.get('total_cost'),
                'worker_id': self.worker_id
            }})

            return True

        except Exception as e:
            # log error with full context and stack trace
            self.logger.error(
                "Failed to process span task",
                extra={'extra_data': {
                    'trace_id': trace_id if 'trace_id' in locals() else 'unknown',
                    'model': model if 'model' in locals() else 'unknown',
                    'worker_id': self.worker_id,
                    'error': str(e)
                }},
                exc_info=True  # This includes the full stack trace
            )
            return False
    
    # prepare the span data for batch insert
    def prepare_span_data(self, task_data: dict) -> dict:
        span = task_data.get('span')
        trace_id = str(span.get('trace_id', 'unknown'))

        # s3 input upload
        try:
            input_blob_url = upload_input(
                user_id=task_data.get('user_id'),
                trace_id=trace_id,
                span_id=str(span.get('span_id', 'unknown')),
                content=span.get('input_data', '')
            )
        except Exception as e:
            self.logger.warning(f"S3 upload failed for input, using placeholder: {e}")
            input_blob_url = f"placeholder://input/{trace_id}/{span.get('span_id', 'unknown')}"
        
        # s3 output upload
        try:
            output_blob_url = upload_output(
                user_id=task_data.get('user_id'),
                trace_id=trace_id,
                span_id=str(span.get('span_id', 'unknown')),
                content=span.get('output_data', '')
            )
        except Exception as e:
            self.logger.warning(f"S3 upload failed for output, using placeholder: {e}")
            output_blob_url = f"placeholder://output/{trace_id}/{span.get('span_id', 'unknown')}"

        # create the trace if it doesn't already exist
        existing_trace = db.get_trace_by_id(trace_id)

        if not existing_trace:
            # create the new trace
            trace = {
                "start_time": str(span.get('start_time')),
                "end_time": "",
                "duration": 0,
                "total_cost": 0,
                "total_tokens": 0,
                "status": "running",
                "user_id": str(span.get('user_id')),
                "trace_hash_id": generate_hash_key(str(span.get('user_id')), str(span.get('agent_id')))
            }
            trace["trace_id"] = trace_id

            if span.get('agent_id') is not None:
                trace["agent_id"] = str(span.get('agent_id'))

            try:
                db.insert_trace(trace)
            except Exception as e:
                if "duplicate key" in str(e).lower():
                    pass
                else:
                    raise

            self.logger.info("Trace auto-created", extra={'extra_data': {
                'trace_id': trace_id,
                'user_id': trace['user_id'],
                'agent_id': trace.get('agent_id', 'none'),
                'reason': 'trace_did_not_exist',
                'worker_id': self.worker_id
            }})
        
        # DEBUG: Print what we're about to return
        # Truncate error_message to 200 characters if present
        error_msg = span.get('error_message')
        truncated_error = error_msg[:200] if error_msg else None

        prepared_data = {
            "span_id": str(span.get('span_id', 'unknown')),
            "trace_id": trace_id,
            "parent_span_ids": span.get('parent_span_id', []),
            "name": span.get('name'),
            "start_time": span.get('start_time'),
            "end_time": span.get('end_time'),
            "duration": float(span.get('duration', 0)),
            "input_preview": span.get('input_data', '')[:200],
            "input_blob_url": input_blob_url,
            "output_preview": span.get('output_data', '')[:200],
            "output_blob_url": output_blob_url,
            "llm_model": span.get('model'),
            "prompt_tokens": span.get('input_tokens'),
            "completion_tokens": span.get('output_tokens'),
            "cost": span.get('total_cost'),
            "status": span.get('status'),
            "error_message": truncated_error,
            "is_streaming": span.get('is_streaming', False),
            "time_to_first_token": span.get('time_to_first_token'),
            "tokens_per_second": span.get('tokens_per_second'),
            "prompt_id": span.get('prompt_id'),
            "prompt_name": span.get('prompt_name'),
            "prompt_version": span.get('prompt_version'),
            "prompt_hash": span.get('prompt_hash'),
            # Tool tracking fields
            "span_type": span.get('span_type', 'function'),
            "tool_metadata": span.get('tool_metadata'),
            "http_method": span.get('http_method'),
            "http_url": span.get('http_url'),
            "http_status_code": span.get('http_status_code'),
            "api_name": span.get('api_name'),
            "db_type": span.get('db_type'),
            "db_operation": span.get('db_operation'),
            "db_query": span.get('db_query'),
            "software_name": span.get('software_name'),
            "software_type": span.get('software_type'),
            "cli_command": span.get('cli_command'),
            "cli_exit_code": span.get('cli_exit_code'),
            "cli_stdout": span.get('cli_stdout'),
            "cli_stderr": span.get('cli_stderr'),
            "tool_name": span.get('tool_name'),
            "tool_category": span.get('tool_category'),
        }

        print(f"🔍 DEBUG prepared_data prompt_name: {prepared_data.get('prompt_name')}")

        return prepared_data

    # this function is the main worker loop that pops from the queue and processes each popped task
    # note: this function will run forever unless forcefully stopped
    def run(self):
        self.queue.redis_client.hset(
            "workers:active",
            self.worker_id,
            msgpack.packb({"started": time.time(), "pid": os.getpid()})
        )

        self.logger.info("Worker started - waiting for tasks from queue")
        
        def handle_shutdown(signum, frame):
            signal_name = "SIGTERM" if signum == signal.SIGTERM else "SIGINT"
            self.logger.info(
                f"Received {signal_name}, initiating graceful shutdown",
                extra={'extra_data': {
                    'worker_id': self.worker_id,
                    'pending_spans': len(self.pending_spans),
                    'signal': signal_name
                }}
            )

            self.drain_start_time = time.time()

            self.queue.redis_client.hdel("workers:active", self.worker_id)
            self.queue.redis_client.hdel("workers:heartbeat", self.worker_id)

            self.shutdown_requested = True
        
        signal.signal(signal.SIGTERM, handle_shutdown)
        signal.signal(signal.SIGINT, handle_shutdown)

        if time.time() - self.last_retention_run > RETENTION_CHECK_INTERVAL:
            retention_processor.run()
            self.last_retention_run = time.time()

        try:
            while not self.shutdown_requested:
                # if we are in drain mode and timeout has elapsed, force exit
                if self.drain_start_time:
                    elapsed = time.time() - self.drain_start_time
                    if elapsed > DRAIN_TIMEOUT:
                        self.logger.error(
                            f"Drain timeout exceeded ({DRAIN_TIMEOUT}s), forcing exit",
                            extra={'extra_data': {
                                'worker_id': self.worker_id,
                                'pending_spans_lost': len(self.pending_spans),
                                'elapsed_seconds': elapsed
                            }}
                        )

                        # re-queue pending spans before force exit
                        for task in self.pending_spans:
                            self.queue.enqueue(task)
                        
                        self.pending_spans = []
                        break

                # Send heartbeat periodically
                if time.time() - self.last_heartbeat_time >= self.HEARTBEAT_INTERVAL:
                    self.queue.redis_client.hset(
                        "workers:heartbeat",
                        self.worker_id,
                        time.time()
                    )
                    self.last_heartbeat_time = time.time()

                    self.finalize_stale_traces()

                # dequeues a task and waits 5 seconds before checking the queue again
                task = self.queue.dequeue(timeout=DEQUEUE_TIMEOUT)

                if task:
                    self.consecutive_empty_polls = 0

                    # add the task to the pending spans
                    self.pending_spans.append(task)
                    if not self.batch_start_time:
                        self.batch_start_time = time.time()

                    
                    if len(self.pending_spans) >= self.BATCH_SIZE or (self.batch_start_time and time.time() - self.batch_start_time >= self.FLUSH_INTERVAL):
                        self.flush_batch()

                else:
                    self.consecutive_empty_polls += 1

                    # log every 12 polls (1 minute) to show we are still alive
                    if self.consecutive_empty_polls % 12 == 0:
                        minutes_idle = (self.consecutive_empty_polls * DEQUEUE_TIMEOUT) / 60
                        self.logger.info(
                            f"Worker idle for {minutes_idle:.1f} minutes",
                            extra={'extra_data': {
                                'worker_id': self.worker_id,
                                'consecutive_empty_polls': self.consecutive_empty_polls,
                                'max_before_termination': self.max_empty_polls
                            }}
                        )
                    
                    # check for self termination
                    if self.consecutive_empty_polls >= self.max_empty_polls:
                        self.logger.info(
                            f"No work for {WORKER_IDLE_TIMEOUT} seconds, self-terminating",
                            extra={'extra_data': {
                                'worker_id': self.worker_id,
                                'idle_seconds': self.consecutive_empty_polls * DEQUEUE_TIMEOUT,
                                'reason': 'prolonged_idle'
                            }}
                        )

                        # clean up redis registrations
                        self.queue.redis_client.hdel("workers:active", self.worker_id)
                        self.queue.redis_client.hdel("workers:heartbeat", self.worker_id)

                        break
            
            # process the DLQ every 5 minutes
            if not hasattr(self, '_last_dlq_process'):
                    self._last_dlq_process = 0
                
            if time.time() - self._last_dlq_process > 300:
                try:
                    summary = dlq_processor.process_dlq()
                    if summary["retried"] > 0 or summary["expired"] > 0:
                        self.logger.info(f"DLQ processed: {summary}")
                except Exception as e:
                    self.logger.error(f"DLQ processing failed: {e}")
                self._last_dlq_process = time.time()
            
            if self.pending_spans:
                self.logger.info(
                    f"Draining {len(self.pending_spans)} pending spans before shutdown",
                    extra={'extra_data': {
                        'worker_id': self.worker_id,
                        'pending_count': len(self.pending_spans)
                    }}
                )                
                try:
                    self.flush_batch()

                    self.logger.info(
                        "Drain completed successfully",
                        extra={'extra_data': {'worker_id': self.worker_id}}
                    )
                except Exception as e:
                    self.logger.error(
                        f"Drain flush failed, re-queuing spans: {e}",
                        extra={'extra_data': {
                            'worker_id': self.worker_id,
                            'pending_count': len(self.pending_spans)
                        }}
                    )

                    for task in self.pending_spans:
                        self.queue.enqueue(task)
            else:
                self.logger.info(
                    "No pending spans to drain",
                    extra={'extra_data': {'worker_id': self.worker_id}}
                )

        except KeyboardInterrupt:
            self.logger.info("Worker received shutdown signal (Ctrl+C)")
            self.logger.info("Shutting down gracefully...")
        except Exception as e:
            self.logger.critical(
                "Worker crashed unexpectedly",
                extra={'extra_data': {'error': str(e)}},
                exc_info=True
            )
            raise
    
    def flush_batch(self):
        max_retries = int(os.getenv('MAX_RETRIES', 3))
        try:
            prepared_spans = []
            failed_tasks = []
            for task in self.pending_spans:
                # prepare all spans
                try:
                    span_data = self.prepare_span_data(task)  # NEW METHOD - extract from process_span_task
                    prepared_spans.append((task, span_data))
                except Exception as e:
                    self.logger.error(f"Failed to prepare span: {e}")
                    failed_tasks.append(task)

            # batch insert all prepared spans
            if prepared_spans:
                span_dicts = [s[1] for s in prepared_spans]
                db.insert_spans_batch(span_dicts)

                # Collect unique user_ids for cache invalidation
                affected_user_ids = set()

                for task, span_data in prepared_spans:
                    user_id = str(
                        task.get('user_id')
                        or span_data.get('user_id')
                        or span_data.get('user_id')  # in case you add it later
                        or ""
                    )
                    if user_id:
                        affected_user_ids.add(user_id)
                    self.publish_span_to_redis(span_data, user_id=user_id or None)

                # Invalidate cost caches for affected users
                if affected_user_ids:
                    self.invalidate_cost_caches(affected_user_ids)

                self.tasks_processed += len(prepared_spans)
                self.last_task_time = time.time()
            
            # update trace aggregates
            spans_by_trace = defaultdict(list)
            for task, span_data in prepared_spans:
                spans_by_trace[span_data['trace_id']].append(span_data)
            
            for trace_id, trace_spans in spans_by_trace.items():
                has_error = any(s.get('status') == 'error' for s in trace_spans)
                if has_error:
                    db.update_trace(trace_id, {"status": "error"})
                    self.logger.info(f"Trace {trace_id} marked as error due to span failure")
                
                total_tokens = sum(
                    (s.get('prompt_tokens') or 0) + (s.get('completion_tokens') or 0)
                    for s in trace_spans
                )
                total_cost = sum(s.get('cost') or 0 for s in trace_spans)
                
                # Use existing Redis accumulation with TTL
                self.queue.redis_client.incrbyfloat(f"trace:{trace_id}:total_tokens", total_tokens)
                self.queue.redis_client.expire(f"trace:{trace_id}:total_tokens", TTL_SECONDS)
                self.queue.redis_client.incrbyfloat(f"trace:{trace_id}:total_cost", total_cost)
                self.queue.redis_client.expire(f"trace:{trace_id}:total_cost", TTL_SECONDS)

                # add a last activity timestamp to Redis to track the last active span
                self.queue.redis_client.set(
                    f"trace:{trace_id}:last_activity",
                    time.time(),
                    ex=3600
                )
            # handle failed preparation
            for task in failed_tasks:
                retry_count = task.get('retry_count', 0)
                # if the task did not succeed, we have to decide whether or not to send the task to the DLQ
                if retry_count < max_retries:
                    # we can retry the task since it is less than the max_retries and so, we increment the retry count and enqueue the task
                    task['retry_count'] = retry_count + 1
                    task['last_error_at'] = datetime.now(timezone.utc).isoformat()

                    self.logger.warning(
                        f"Task failed, retry {retry_count + 1}/{max_retries}",
                        extra={'extra_data': {
                            'retry_count': retry_count + 1,
                            'max_retries': max_retries,
                            'trace_id': task.get('span', {}).get('trace_id', 'unknown'),
                            'worker_id': self.worker_id
                        }}
                    )

                    self.queue.enqueue(task)
                else:
                    # otherwise if we have already hit the max retries, move the task to the DLQ
                    self.logger.error(
                        f"Task failed after {max_retries} retries, moving to DLQ",
                        extra={'extra_data': {
                            'retry_count': retry_count,
                            'trace_id': task.get('span', {}).get('trace_id', 'unknown'),
                            'worker_id': self.worker_id
                        }}
                    )

                    self.queue.enqueue_to_dlq(
                        task,
                        f"Failed after {max_retries} retry attempts"
                    )
        except Exception as e:
            # batch insert failed so reque all the tasks
            self.logger.error(f"Batch insert failed: {e}")
            for task in self.pending_spans:
                task['retry_count'] = task.get('retry_count', 0) + 1
                self.queue.enqueue(task)          
                
        self.pending_spans = []
        self.batch_start_time = None
    
    # find traces with no activity and mark them as completed
    def finalize_stale_traces(self):
        TRACE_TIMEOUT = 60

        cursor = 0
        while True:
            cursor, keys = self.queue.redis_client.scan(
                cursor=cursor,
                match="trace:*:last_activity",
                count=100
            )

            for key in keys:
                trace_id = key.split(":")[1]

                last_activity = self.queue.redis_client.get(key)
                if last_activity:
                    idle_time = time.time() - float(last_activity)

                    if idle_time > TRACE_TIMEOUT:
                        self.finalize_trace(trace_id)
            
            if cursor == 0:
                break

    def finalize_trace(self, trace_id: str):
        try:
            total_tokens = self.queue.redis_client.get(f"trace:{trace_id}:total_tokens")
            total_cost = self.queue.redis_client.get(f"trace:{trace_id}:total_cost")

            trace = db.get_trace_by_id(trace_id)

            # in this case, the trace does not exist or has finalized
            if not trace or trace.get('status') != 'running':
                return

            # calculate the duration of the span by using the min start time of a span and the max end time of a span
            spans = db.get_spans_by_trace(trace_id)
            if spans:
                start_time = min(s['start_time'] for s in spans)
                end_time = max(s['end_time'] for s in spans if s['end_time'])
                duration = (end_time - start_time).total_seconds() if end_time else 0
            else:
                duration = 0
            
            # update the trace in the database
            end_time_iso = datetime.now(timezone.utc).isoformat()
            update_data = {
                "status": "completed",
                "end_time": end_time_iso,
                "duration": duration,
                "total_tokens": int(float(total_tokens or 0)),
                "total_cost": float(total_cost or 0)
            }
            db.update_trace(trace_id, update_data)

            # Update daily aggregates with cost breakdown by model
            user_id = trace.get('user_id')
            if user_id and spans:
                by_model = {}
                for span in spans:
                    model = span.get('llm_model') or 'unknown'
                    cost = float(span.get('cost') or 0)
                    if model in by_model:
                        by_model[model] += cost
                    else:
                        by_model[model] = cost
                db.update_daily_aggregates(
                    total_cost=float(total_cost or 0),
                    total_tokens=int(float(total_tokens or 0)),
                    by_model=by_model,
                    user_id=user_id
                )

            self.publish_trace_completed(trace_id, trace.get('user_id'), update_data)
            
            event = {
                "type": "trace_completed",
                "trace_id": trace_id,
                "status": update_data["status"],
                "total_tokens": update_data["total_tokens"],
                "total_cost": update_data["total_cost"],
                "duration": update_data["duration"],
                "timestamp": end_time_iso,
            }

            self.publish_event(f"trace:{trace_id}", event)

            # cleanup Redis keys
            self.queue.redis_client.delete(
                f"trace:{trace_id}:total_tokens",
                f"trace:{trace_id}:total_cost",
                f"trace:{trace_id}:total_duration",
                f"trace:{trace_id}:last_activity"
            )

            # log the final result
            self.logger.info("Trace finalized", extra={'extra_data': {
                'trace_id': trace_id,
                'total_tokens': total_tokens,
                'total_cost': total_cost,
                'worker_id': self.worker_id
            }})

            # Check for cost anomalies and publish alerts
            final_cost = float(total_cost or 0)
            final_tokens = int(float(total_tokens or 0))

            if final_cost >= TRACE_COST_ALERT_THRESHOLD:
                self.publish_anomaly_alert(
                    trace_id=trace_id,
                    user_id=user_id,
                    anomaly_type='trace_spike',
                    severity='critical' if final_cost >= TRACE_COST_ALERT_THRESHOLD * 5 else 'warning',
                    actual_value=final_cost,
                    threshold_value=TRACE_COST_ALERT_THRESHOLD,
                    title=f"High-cost trace: ${final_cost:.2f}",
                    description=f"Trace {trace_id[:8]} cost ${final_cost:.2f}, exceeding threshold of ${TRACE_COST_ALERT_THRESHOLD:.2f}"
                )

            if final_tokens >= HIGH_TOKEN_ALERT_THRESHOLD:
                self.publish_anomaly_alert(
                    trace_id=trace_id,
                    user_id=user_id,
                    anomaly_type='high_token_response',
                    severity='warning',
                    actual_value=final_tokens,
                    threshold_value=HIGH_TOKEN_ALERT_THRESHOLD,
                    title=f"High token usage: {final_tokens:,} tokens",
                    description=f"Trace {trace_id[:8]} used {final_tokens:,} tokens, exceeding threshold of {HIGH_TOKEN_ALERT_THRESHOLD:,}"
                )

        except Exception as e:
            self.logger.error(f"Failed to finalize trace {trace_id}: {e}")
    
    def publish_event(self, channel: str, event: dict):
        self.queue.redis_client.publish(channel, msgpack.packb(event))
    
    def publish_span_to_redis(self, span_data: dict, user_id: str | None = None) -> None:
        if os.getenv("REALTIME_UPDATES_ENABLED", "true").lower() == "false":
            return
        
        try:
            trace_id = span_data.get("trace_id")
            span_id = span_data.get("span_id")
            status = span_data.get("status")

            if not trace_id or not span_id:
                return
            
            message = {
                "event": "span_created",
                "span_id": span_id,
                "trace_id": trace_id,
                "status": status,
                "user_id": user_id,
                "timestamp": datetime.now(timezone.utc).isoformat(),
            }

            payload = msgpack.packb(message)

            # specific channel for the traces
            try:
                self.queue.redis_client.publish(f"trace:{trace_id}", payload)

                # specific channel for users
                if user_id:
                    self.queue.redis_client.publish(f"user:{user_id}:spans", payload)
            except redis.ConnectionError as e:
                self.logger.warning(
                    "Redis pub/sub unavailable, skipping publish",
                    extra={"extra_data": {"error": str(e), "span_id": span_id}}
                )
            except redis.TimeoutError as e:
                self.logger.warning(
                    "Redis pub/sub timeout, skipping publish",
                    extra={"extra_data": {"error": str(e), "span_id": span_id}}
                )

        except Exception as e:
            self.logger.warning(
                "Failed to publish span update to Redis",
                extra={
                    "extra_data": {
                        "span_id": span_data.get("span_id"),
                        "trace_id": span_data.get("trace_id"),
                        "user_id": user_id,
                        "worker_id": self.worker_id,
                        "error": str(e),
                    }
                },
                exc_info=True,
            )
    
    def publish_trace_completed(self, trace_id: str, user_id: str, trace_data: dict) -> None:
        if os.getenv("REALTIME_UPDATES_ENABLED", "true").lower() == "false":
            return
        
        try:
            if not trace_id and not user_id:
                return
            
            message_dict = {
                "event": "trace_completed",
                "trace_id": trace_id,
                "user_id": user_id,
                "status": trace_data.get("status"),
                "total_tokens": trace_data.get("total_tokens"),
                "total_cost": trace_data.get("total_cost"),
                "duration": trace_data.get("duration"),
                "timestamp": datetime.now(timezone.utc).isoformat()
            }

            json_message = msgpack.packb(message_dict)

            try:
                self.queue.redis_client.publish(f"trace:{trace_id}", json_message)

                if user_id:
                    self.queue.redis_client.publish(f"user:{user_id}:spans", json_message)
            except (redis.ConnectionError, redis.TimeoutError) as e:
                self.logger.warning(
                    "Redis pub/sub unavailable for trace completion",
                    extra={"extra_data": {"error": str(e), "trace_id": trace_id}}
                )
            except Exception as e:
                self.logger.warning(
                    "Failed to publish trace update to Redis",
                    extra={
                        "extra_data": {
                            "trace_id": trace_id,
                            "user_id": user_id,
                            "worker_id": self.worker_id,
                            "error": str(e),
                        }
                    },
                    exc_info=True,
                )
            
        except Exception as e:
            self.logger.warning(
                "Failed to publish trace update to Redis",
                extra={
                    "extra_data": {
                        "trace_id": trace_id,
                        "user_id": user_id,
                        "worker_id": self.worker_id,
                        "error": str(e),
                    }
                },
                exc_info=True,
            )

    def publish_anomaly_alert(
        self,
        trace_id: str,
        user_id: str,
        anomaly_type: str,
        severity: str,
        actual_value: float,
        threshold_value: float,
        title: str,
        description: str
    ) -> None:
        """
        Publish a cost anomaly alert via Redis pub/sub for real-time notifications.
        Also saves the anomaly to the database for historical tracking.
        """
        try:
            # Save anomaly to database
            anomaly_data = {
                'anomaly_type': anomaly_type,
                'severity': severity,
                'actual_value': actual_value,
                'threshold_value': threshold_value,
                'trace_id': trace_id,
                'title': title,
                'description': description
            }

            try:
                db.save_anomaly(user_id, anomaly_data)
            except Exception as e:
                self.logger.warning(f"Failed to save anomaly to database: {e}")

            # Publish real-time alert via Redis pub/sub
            message = {
                "event": "cost_anomaly",
                "anomaly_type": anomaly_type,
                "severity": severity,
                "trace_id": trace_id,
                "user_id": user_id,
                "actual_value": actual_value,
                "threshold_value": threshold_value,
                "title": title,
                "description": description,
                "timestamp": datetime.now(timezone.utc).isoformat()
            }

            json_message = msgpack.packb(message)

            try:
                # Publish to user-specific anomaly channel
                if user_id:
                    self.queue.redis_client.publish(f"user:{user_id}:anomalies", json_message)

                # Also publish to trace channel for trace-specific listeners
                self.queue.redis_client.publish(f"trace:{trace_id}", json_message)

            except (redis.ConnectionError, redis.TimeoutError) as e:
                self.logger.warning(
                    "Redis pub/sub unavailable for anomaly alert",
                    extra={"extra_data": {"error": str(e), "trace_id": trace_id}}
                )

            self.logger.warning(
                f"Cost anomaly detected: {title}",
                extra={
                    "extra_data": {
                        "anomaly_type": anomaly_type,
                        "severity": severity,
                        "trace_id": trace_id,
                        "user_id": user_id,
                        "actual_value": actual_value,
                        "threshold_value": threshold_value,
                        "worker_id": self.worker_id
                    }
                }
            )

        except Exception as e:
            self.logger.error(
                "Failed to publish anomaly alert",
                extra={
                    "extra_data": {
                        "trace_id": trace_id,
                        "user_id": user_id,
                        "error": str(e),
                        "worker_id": self.worker_id
                    }
                },
                exc_info=True
            )


def generate_hash_key(user_id: str, agent_id: str) -> str:
    # Combine user_id and agent_id into one string
    combined_str = f"{user_id}:{agent_id}"
    # Generate 16 random bytes for extra uniqueness
    random_bytes = secrets.token_bytes(16)
    # Encode combined string as bytes
    combined_bytes = combined_str.encode('utf-8') + random_bytes
    # Encode to URL-safe base64 string
    api_key = base64.urlsafe_b64encode(combined_bytes).decode('utf-8')
    return api_key


# this is the entry point of the file to run the worker
if __name__ == "__main__":
    worker = SpanWorker()
    worker.run()
