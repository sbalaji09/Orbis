import os
import time
from datetime import datetime
from redis_queue import RedisQueue
from firebase import firebase
from dotenv import load_dotenv

# load environment variables
load_dotenv()

# this class represents a worker that processes span tasks from the Redis queue
# it continuously pulls task from the queue and processes them and is separate from the API
class SpanWorker:
    # initialize the worker with the Redis queue information and the Firebase connection
    def __init__(self):
        self.queue = RedisQueue()

        firebase_url = os.getenv('FIREBASE_URL', 'https://<your-database-name>.firebaseio.com/')
        self.firebase_app = firebase.FirebaseApplication(firebase_url, None)

    # this function processes a single span task
    # instead of having the backend infra do it automatically, we have this worker do it because it saves time
    # this function will upload data to our blob storage (S3) and also save the span to the Firebase db
    def process_span_task(self, task_data: dict) -> bool:
        try:
            # extract span data
            span = task_data.get('span')
            received_at = task_data.get('received_at')

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

            return True

        except Exception as e:
            print(f"✗ Error processing span task: {e}")
            return False

    # this function is the main worker loop that pops from the queue and processes each popped task
    # note: this function will run forever unless forcefully stopped
    def run(self):
        try:
            while True:
                # dequeues a task and waits 5 seconds before checking the queue again
                task = self.queue.dequeue(timeout=5)

                if task:
                    # process the task
                    success = self.process_span_task(task)

                    if not success:
                        raise ValueError("Could not process task")
                else:
                    pass

        except KeyboardInterrupt:
            print("\n\n=== Worker Stopped ===")
            print("Shutting down gracefully...")
        except Exception as e:
            print(f"\n✗ Worker crashed: {e}")
            raise


# this is the entry point of the file to run the worker
if __name__ == "__main__":
    worker = SpanWorker()
    worker.run()
