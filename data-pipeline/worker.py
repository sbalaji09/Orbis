import os
import sys
import time
from datetime import datetime, timezone
from redis_queue import RedisQueue
from firebase import firebase
from dotenv import load_dotenv

# add the application logging layer to the path
sys.path.append(os.path.join(os.path.dirname(__file__), 'application_logging'))
from application_logging.logger_config import setup_logger

# load environment variables
load_dotenv()

# this class represents a worker that processes span tasks from the Redis queue
# it continuously pulls task from the queue and processes them and is separate from the API
class SpanWorker:
    # initialize the worker with the Redis queue information and the Firebase connection
    def __init__(self):
        # set up the logger for the worker
        self.logger = setup_logger(__name__)

        self.queue = RedisQueue()

        firebase_url = os.getenv('FIREBASE_URL', 'https://<your-database-name>.firebaseio.com/')
        self.firebase_app = firebase.FirebaseApplication(firebase_url, None)

        # test print statement to see if the logger is working correctly
        self.logger.info("Worker initialized successfully", extra={'extra_data': {
            'queue_name': self.queue.queue_name,
            'firebase_url': firebase_url
        }})

    # this function processes a single span task
    # instead of having the backend infra do it automatically, we have this worker do it because it saves time
    # this function will upload data to our blob storage (S3) and also save the span to the Firebase db
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

            # this are placeholder upload links for the S3 bucketss
            input_blob_url = "s3://bucket/input/placeholder"
            output_blob_url = "s3://bucket/output/placeholder"

            # convert out input span data into a dict that can be passed into the Firebase table
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

            # once the data has been converted into the proper format, the worker saves it to Firebase
            result = self.firebase_app.post('/spans', span_db_data)
            firebase_id = result.get('name')

            # log successful completion with context for the span
            self.logger.info("Span processed successfully", extra={'extra_data': {
                'trace_id': trace_id,
                'firebase_id': firebase_id,
                'model': model,
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
