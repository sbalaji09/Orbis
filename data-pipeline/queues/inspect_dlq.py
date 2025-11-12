"""
Dead Letter Queue Inspector
View failed tasks that couldn't be processed after multiple retries.
"""
import json
from redis_queue import RedisQueue
import os
from dotenv import load_dotenv

load_dotenv()

# inspect all the tasks in the dead letter queue
def inspect_dlq():
    # connect to DLQ
    dlq_name = os.getenv('DEAD_LETTER_QUEUE_NAME', 'span_processing_dlq')
    queue = RedisQueue(queue_name=dlq_name)

    print(f"\n{'='*60}")
    print(f"Dead Letter Queue Inspector: {dlq_name}")
    print(f"{'='*60}\n")

    # get the length of the queue
    length = queue.get_queue_length()
    print(f"Failed tasks in DLQ: {length}\n")

    if length == 0:
        print("✓ No failed tasks! DLQ is empty.\n")
        return

    # peek at tasks
    print("Failed Tasks (most recent first):\n")

    # view the values in the queue without popping
    tasks = queue.redis_client.lrange(dlq_name, 0, -1)

    for i, task_json in enumerate(tasks, 1):
        task = json.loads(task_json)

        print(f"Task #{i}:")
        print(f"  Failed At: {task.get('failed_at', 'unknown')}")
        print(f"  Error: {task.get('error_message', 'unknown')}")
        print(f"  Retry Count: {task.get('retry_count', 0)}")

        # extract span info
        span = task.get('span', {})
        print(f"  Trace ID: {span.get('trace_id', 'unknown')}")
        print(f"  Model: {span.get('model', 'unknown')}")
        print(f"  Received At: {task.get('received_at', 'unknown')}")
        print(f"  Last Error At: {task.get('last_error_at', 'unknown')}")
        print()

    print(f"{'='*60}")
    print("\nOptions:")
    print("1. Retry a specific task: Move it back to main queue")
    print("2. Clear DLQ: Remove all failed tasks")
    print("3. Exit")
    print(f"{'='*60}\n")

# clears all tasks from the DLQ
def clear_dlq():
    dlq_name = os.getenv('DEAD_LETTER_QUEUE_NAME', 'span_processing_dlq')
    queue = RedisQueue(queue_name=dlq_name)

    length = queue.get_queue_length()

    if length == 0:
        print("DLQ is already empty.")
        return

    # users have the option to delete failed tasks from the DLQ
    confirm = input(f"Are you sure you want to delete {length} failed tasks? (yes/no): ")

    if confirm.lower() == 'yes':
        queue.clear_queue()
        print(f"✓ Cleared {length} tasks from DLQ")
    else:
        print("Cancelled.")

# move a task from the DLQ back to the main queue
def retry_task(task_index: int):
    dlq_name = os.getenv('DEAD_LETTER_QUEUE_NAME', 'span_processing_dlq')
    main_queue_name = os.getenv('QUEUE_NAME', 'span_processing_queue')

    dlq_queue = RedisQueue(queue_name=dlq_name)
    main_queue = RedisQueue(queue_name=main_queue_name)

    # get this task and then add it to the main queue
    tasks = dlq_queue.redis_client.lrange(dlq_name, 0, -1)

    if task_index < 0 or task_index >= len(tasks):
        print(f"Invalid task index. Must be between 0 and {len(tasks) - 1}")
        return

    task_json = tasks[task_index]
    task = json.loads(task_json)

    # reset the retry count on this specific task
    task['retry_count'] = 0
    task.pop('failed_at', None)
    task.pop('last_error_at', None)

    main_queue.enqueue(task)
    dlq_queue.redis_client.lrem(dlq_name, 1, task_json)

    print(f"✓ Task #{task_index + 1} moved back to main queue for retry")


if __name__ == "__main__":
    inspect_dlq()

    while True:
        choice = input("Enter choice (1-3): ").strip()

        if choice == '1':
            task_num = int(input("Enter task number to retry: ")) - 1
            retry_task(task_num)
            inspect_dlq()
        elif choice == '2':
            clear_dlq()
            break
        elif choice == '3':
            print("Goodbye!")
            break
        else:
            print("Invalid choice. Try again.")
