import base64
import os
import secrets
import sys
import time
from datetime import datetime, timezone
import uuid
from queues.redis_queue import RedisQueue
from dotenv import load_dotenv
from data_processing.prompt_upload import upload_input, upload_output
sys.path.append(os.path.join(os.path.dirname(__file__), '..'))
from backend.db_connection import db


# add the application logging layer to the path
sys.path.append(os.path.join(os.path.dirname(__file__), 'application_logging'))
from application_logging.logger_config import setup_logger

# load environment variables
load_dotenv()

# this class represents a worker that processes span tasks from the Redis queue
# it continuously pulls task from the queue and processes them and is separate from the API
class SpanWorker:
    # initialize the worker with the Redis queue information
    def __init__(self):
        # set up the logger for the worker
        self.logger = setup_logger(__name__)

        self.queue = RedisQueue()

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
                'received_at': received_at
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
                "error_message": span.get('error_message')
            }
            
            # Accumulate token/cost/duration in Redis for trace-level aggregation
            # These will be read when the SDK calls /trace/end
            self.queue.redis_client.incrbyfloat(f"trace:{trace_id}:total_tokens", span.get('input_tokens', 0) + span.get('output_tokens', 0))
            self.queue.redis_client.incrbyfloat(f"trace:{trace_id}:total_cost", span.get('total_cost', 0))
            self.queue.redis_client.incrbyfloat(f"trace:{trace_id}:total_duration", span.get('duration', 0))

            # Check if trace exists, if not create it
            # This handles SDK sending spans out of order or without explicit start span
            existing_trace = db.get_trace_by_id(trace_id)

            if not existing_trace:
                # Auto-create trace if it doesn't exist
                trace = {
                    "start_time": str(span.get('start_time')),
                    "end_time": "",
                    "duration": 0,
                    "total_cost": 0,
                    "total_tokens": 0,
                    "status": "running",
                    "user_id": str(span.get('user_id')),  # Keep as UUID string
                    "trace_hash_id": generate_hash_key(str(span.get('user_id')), str(span.get('agent_id')))
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
                    'reason': 'trace_did_not_exist'
                }})

            # Save span to database
            span_id = db.insert_span(span_db_data)

            # NEW: If span has error status, mark the trace as failed
            if span.get('status') == 'error':
                update_data = {
                    "status": "error"
                }
                db.update_trace(trace_id, update_data)
                
                self.logger.info("Trace marked as failed due to span error", extra={'extra_data': {
                    'trace_id': trace_id,
                    'span_id': span_id,
                    'error_message': span.get('error_message', 'Unknown error')
                }})

            # log successful completion with context for the span
            self.logger.info("Span processed successfully", extra={'extra_data': {
                'trace_id': trace_id,
                'model': model,
                'span_id': span_id,
                'cost': span.get('total_cost')
            }})

            return True

        except Exception as e:
            # log error with full context and stack trace
            self.logger.error(
                "Failed to process span task",
                extra={'extra_data': {
                    'trace_id': trace_id if 'trace_id' in locals() else 'unknown',
                    'model': model if 'model' in locals() else 'unknown',
                    'error': str(e)
                }},
                exc_info=True  # This includes the full stack trace
            )
            return False

    # this function is the main worker loop that pops from the queue and processes each popped task
    # note: this function will run forever unless forcefully stopped
    def run(self):
        self.logger.info("Worker started - waiting for tasks from queue")
        max_retries = int(os.getenv('MAX_RETRIES', 3))

        try:
            while True:
                # dequeues a task and waits 5 seconds before checking the queue again
                task = self.queue.dequeue(timeout=5)

                if task:
                    # Get retry count (default to 0 for new tasks)
                    retry_count = task.get('retry_count', 0)

                    # process the task
                    success = self.process_span_task(task)

                    if not success:
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
                                    'trace_id': task.get('span', {}).get('trace_id', 'unknown')
                                }}
                            )

                            self.queue.enqueue(task)
                        else:
                            # otherwise if we have already hit the max retries, move the task to the DLQ
                            self.logger.error(
                                f"Task failed after {max_retries} retries, moving to DLQ",
                                extra={'extra_data': {
                                    'retry_count': retry_count,
                                    'trace_id': task.get('span', {}).get('trace_id', 'unknown')
                                }}
                            )

                            self.queue.enqueue_to_dlq(
                                task,
                                f"Failed after {max_retries} retry attempts"
                            )
                else:
                    pass

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
