import os
import sys
import time
from datetime import datetime, timezone
from queues.redis_queue import RedisQueue
from dotenv import load_dotenv
from data_processing.prompt_upload import upload_input, upload_output
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
            input_blob_url = upload_input(
                user_id=task_data.get('user_id'),
                trace_id=trace_id,
                span_id=str(span.get('span_id', 'unknown')),
                content=span.get('input_data', '')
            )

            output_blob_url = upload_output(
                user_id=task_data.get('user_id'),
                trace_id=trace_id,
                span_id=str(span.get('span_id', 'unknown')),
                content=span.get('output_data', '')
            )

            # convert out input span data into a dict that can be passed into the Supabase table
            # this dict follows the span schema as stated in init.sql
            span_db_data = {
                "trace_id": str(span.get('trace_id', 'unknown')),
                "parent_span_ids": [str(id) for id in span.get('parent_span_id', [])],
                "start_time": span.get('start_time'),
                "end_time": span.get('end_time'),
                "duration": str(span.get('duration')),
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
                "name": span.get('name'),
                "is_start_span": span.get('is_start_span'),
                "is_end_span": span.get('is_end_span')
            }
            
            # we add the current token amount and cost to a redis in session variable for final registering
            self.queue.redis_client.incrbyfloat("trace:" + trace_id + ":total_tokens", span.get('input_tokens') + span.get('output_tokens'))
            self.queue.redis_client.incrbyfloat("trace:" + trace_id + ":total_cost", span.get('total_cost'))
            if span.get('is_end_span'):
                self.queue.redis_client.set("trace:" + trace_id + ":end_time", span.get('end_time'))
                
            self.queue.redis_client.incrbyfloat("trace:" + trace_id + ":total_duration", span.get('duration'))

            # if this span is the start of a trace, then add the init trace object
            if span.get('is_start_span'):
                trace = {
                    "start_time": str(span.get('start_time')),
                    "end_time": "",
                    "duration": 0,
                    "total_cost": 0,
                    "total_tokens": 0,
                    "status": "running",
                    "user_id": int(span.get('user_id')),
                }
                db.insert_trace(trace)

                self.logger.info("Trace created", extra={'extra_data': {
                    'trace_id': trace_id,
                    'user_id': trace['user_id']
                }})
            
            # if this span is the end of a trace, then update the trace object with the token count and duration
            if span.get('is_end_span'):
                # Data to patch - only update the fields you want
                total_tokens = int(self.queue.redis_client.get("trace:" + trace_id + ":total_tokens") or 0)
                total_cost = float(self.queue.redis_client.get("trace:" + trace_id + ":total_cost") or 0)
                end_time = self.queue.redis_client.get("trace:" + trace_id + ":end_time") or ""
                total_duration = float(self.queue.redis_client.get("trace:" + trace_id + ":total_duration") or 0)

                update_data = {
                    "end_time": end_time,
                    "duration": total_duration,
                    "total_cost": total_cost,
                    "total_tokens": total_tokens,
                    "status": "completed",
                }
                
                db.update_trace(update_data)

                self.queue.redis_client.delete(
                    f"trace:{trace_id}:total_tokens",
                    f"trace:{trace_id}:total_cost",
                    f"trace:{trace_id}:end_time",
                    f"trace:{trace_id}:total_duration"
                )

                self.logger.info("Trace completed", extra={'extra_data': {
                    'trace_id': trace_id,
                    'total_cost': total_cost,
                    'total_tokens': total_tokens,
                    'duration': total_duration
                }})

            # once the data has been converted into the proper format, the worker saves it to Supabase
            span_id = db.insert_span(span_db_data)

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


# this is the entry point of the file to run the worker
if __name__ == "__main__":
    worker = SpanWorker()
    worker.run()
