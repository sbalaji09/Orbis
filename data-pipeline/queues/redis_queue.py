import msgpack
import redis
import json
import os
from typing import Optional, Dict, Any
from datetime import datetime, timezone
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

# this queue is Redis-based and uses Redis Lists (linked lists of string values)
class RedisQueue:
    # initalize the redis queue with the queue name and all the dependencies in order to create the Redis queue
    def __init__(
        self,
        queue_name: str = None,
        host: str = None, # Redis host (default is localhost)
        port: int = None, # Redis port (default is 6379)
        db: int = None, # Redis database number (default is 0)
        password: str = None # Redis password (default is None)
    ):

        # get the configuration from the .env files or use default values
        # establish the queue_name, host, port, db, and password using the environment values
        self.queue_name = queue_name or os.getenv('QUEUE_NAME', 'span_processing_queue')
        host = host or os.getenv('REDIS_HOST', 'localhost')
        port = port or int(os.getenv('REDIS_PORT', 6379))
        db = db or int(os.getenv('REDIS_DB', 0))
        password = password or os.getenv('REDIS_PASSWORD', None)

        # create the Redis connection using the defined variables for the queue_nam
        self.redis_client = redis.Redis(
            host=host,
            port=port,
            db=db,
            password=password if password else None,
            decode_responses=True
        )

        # test the Redis connection at the specified host and port
        try:
            self.redis_client.ping()
            print(f"✓ Connected to Redis at {host}:{port}")
        except redis.ConnectionError as e:
            print(f"✗ Failed to connect to Redis: {e}")
            raise
    
    # adds a task to the queue with a dict to represent the task data
    # the dict is formatted like this: {'span_id': '123', 'data': {...}}
    def enqueue(self, task_data: Dict[Any, Any]) -> bool:
        try:
            # convert the dictionary into a JSON string
            task_json = msgpack.packb(task_data)

            queue_length = self.redis_client.llen(self.queue_name)
            if queue_length == 0:   
                self.redis_client.set('queue:last_non_empty_timestamp', datetime.now(timezone.utc).timestamp())
            
            # the lpush function adds to the left of the linked list
            self.redis_client.lpush(self.queue_name, task_json)

            print(f"✓ Task enqueued to '{self.queue_name}'")
            return True

        except Exception as e:
            print(f"Failed to enqueue task: {e}")
            return False

    # removes and returns a task from the queue with a timeout for how long to wait for the task
    # example: task = queue.dequeue(timeout=5)
    def dequeue(self, timeout: int = 0) -> Optional[Dict[Any, Any]]:
        try:
            # the brpop removes from the right of list and returns a tuple (queue_name, task_json) or None if timeout
            result = self.redis_client.brpop(self.queue_name, timeout=timeout)

            # if there is something to be popped from the end of the list, then parse the result into a python object
            if result:
                queue_name, task_json = result
                task_data = msgpack.unpackb(task_json)
                print(f"✓ Task dequeued from '{self.queue_name}'")
                return task_data
            else:
                return None

        except Exception as e:
            print(f"Failed to dequeue task: {e}")
            return None

    # gets the current number of tasks in the queue to be processed using the llen() function
    def get_queue_length(self) -> int:
        try:
            return self.redis_client.llen(self.queue_name)
        except Exception as e:
            print(f"✗ Failed to get queue length: {e}")
            return 0

    # clears all tasks from the queue using the delete() function
    def clear_queue(self) -> bool:
        try:
            self.redis_client.delete(self.queue_name)
            print(f"✓ Queue '{self.queue_name}' cleared")
            return True
        except Exception as e:
            print(f"✗ Failed to clear queue: {e}")
            return False

    # this function enqueues a failed task to the DLQ and only occurs after we have called the max retries
    def enqueue_to_dlq(self, task_data: Dict[Any, Any], error_message: str) -> bool:
        try:
            # the dead letter queue name will be different than the queue name for the messenger queue
            dlq_name = os.getenv('DEAD_LETTER_QUEUE_NAME', 'span_processing_dlq')

            # add the failure metadata to the task
            dlq_task = {
                **task_data,
                'failed_at': datetime.now().isoformat(),
                'error_message': error_message,
                'original_queue': self.queue_name
            }

            task_json = msgpack.packb(dlq_task) # converts a Python object to a JSON string
            self.redis_client.lpush(dlq_name, task_json)

            print(f"✓ Task moved to DLQ: {dlq_name}")
            return True

        except Exception as e:
            print(f"✗ Failed to move task to DLQ: {e}")
            return False

    def get_idle_duration_seconds(self):
        return datetime.now(timezone.utc).timestamp() - self.redis_client.get("queue:last_non_empty_timestamp")
    
# single instance of the Redis queue to be used throughout the system
queue = RedisQueue()

# this main function tests the queue functionality
if __name__ == "__main__":
    print("\n=== Testing Redis Queue ===\n")

    test_queue = RedisQueue(queue_name="test_queue")

    test_queue.clear_queue()

    # enqueues some tasks
    print("\n1. Testing enqueue:")
    test_queue.enqueue({"task_id": 1, "action": "process_span"})
    test_queue.enqueue({"task_id": 2, "action": "process_span"})
    test_queue.enqueue({"task_id": 3, "action": "process_span"})

    # checks the queue length
    print(f"\n2. Queue length: {test_queue.get_queue_length()}")

    # deque tasks
    print("\n3. Testing dequeue:")
    task1 = test_queue.dequeue(timeout=1)
    print(f"   Dequeued: {task1}")

    task2 = test_queue.dequeue(timeout=1)
    print(f"   Dequeued: {task2}")

    # determine the remaining queue length
    print(f"\n4. Remaining queue length: {test_queue.get_queue_length()}")

    # clears the queue after performing all tasks
    test_queue.clear_queue()
    print("\n=== Test Complete ===\n")
