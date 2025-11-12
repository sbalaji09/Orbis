import time
from redis_queue import RedisQueue

# this function monitors the Redis queue so we can see what exactly is going on
def monitor_queue():
    queue = RedisQueue()

    print("\n=== Queue Monitor ===")
    print(f"Monitoring queue: {queue.queue_name}")
    print("Press Ctrl+C to stop\n")

    # this try-except loop runs forever and returns information on the Redis Queue every 2 seconds
    try:
        while True:
            length = queue.get_queue_length()

            timestamp = time.strftime("%H:%M:%S")
            print(f"[{timestamp}] Queue length: {length} tasks waiting")

            time.sleep(2)

    except KeyboardInterrupt:
        print("\n\n=== Monitor Stopped ===\n")

if __name__ == "__main__":
    monitor_queue()
