import time
import json
import subprocess
import os
import signal
from redis_queue import RedisQueue

# Configuration for auto-scaling
SCALE_UP_THRESHOLD = 100      # Queue depth to trigger scale up
SCALE_DOWN_THRESHOLD = 10     # Queue depth to trigger scale down
MIN_WORKERS = 0               # Minimum number of workers
MAX_WORKERS = 10              # Maximum number of workers
HEARTBEAT_TIMEOUT = 60        # Seconds before considering a worker dead
CHECK_INTERVAL = 5            # How often to check (seconds)
IDLE_THRESHOLD_SECONDS = 300
COLD_START_WORKERS = 1

class WorkerPoolMonitor:
    def __init__(self):
        self.queue = RedisQueue()
        self.spawned_pids = []  # Track PIDs of workers we spawned

    # get the current queue depth
    def get_queue_depth(self) -> int:
        return self.queue.get_queue_length()

    # get the DLQ depth
    def get_dlq_depth(self) -> int:
        dlq_name = os.getenv('DEAD_LETTER_QUEUE_NAME', 'span_processing_dlq')
        return self.queue.redis_client.llen(dlq_name)

    # get all the active workers using Redis
    def get_active_workers(self) -> dict:
        workers = self.queue.redis_client.hgetall("workers:active")
        active = {}
        for worker_id, data in workers.items():
            try:
                active[worker_id] = json.loads(data)
            except json.JSONDecodeError:
                active[worker_id] = {"started": 0, "pid": 0}
        return active

    # get last heartbeat time for each worker
    def get_worker_heartbeats(self) -> dict:
        return self.queue.redis_client.hgetall("workers:heartbeat")

    # finds workers with stale heartbeats
    def get_dead_workers(self) -> list:
        heartbeats = self.get_worker_heartbeats()
        active_workers = self.get_active_workers()
        current_time = time.time()
        dead = []

        for worker_id in active_workers:
            last_heartbeat = heartbeats.get(worker_id)
            if last_heartbeat:
                try:
                    last_time = float(last_heartbeat)
                    if current_time - last_time > HEARTBEAT_TIMEOUT:
                        dead.append(worker_id)
                except ValueError:
                    dead.append(worker_id)
            else:
                # No heartbeat recorded yet - check if worker started recently
                worker_info = active_workers.get(worker_id, {})
                started = worker_info.get('started', 0)
                if current_time - started > HEARTBEAT_TIMEOUT:
                    dead.append(worker_id)

        return dead

    # remove dead workers from Redis
    def cleanup_dead_workers(self):
        dead_workers = self.get_dead_workers()
        for worker_id in dead_workers:
            self.queue.redis_client.hdel("workers:active", worker_id)
            self.queue.redis_client.hdel("workers:heartbeat", worker_id)
            print(f"  ⚠ Cleaned up dead worker: {worker_id}")

    # get aggregate stats across all the workers
    def get_worker_stats(self) -> dict:
        active_workers = self.get_active_workers()

        return {
            "active_count": len(active_workers),
            "worker_ids": list(active_workers.keys()),
        }

    # spawn a new worker process
    def spawn_worker(self):
        worker_script = os.path.join(os.path.dirname(__file__), '..', 'worker.py')

        # Start worker as background process
        process = subprocess.Popen(
            ['python', worker_script],
            stdout=subprocess.DEVNULL,
            stderr=subprocess.DEVNULL,
            start_new_session=True
        )

        self.spawned_pids.append(process.pid)
        print(f"  ↑ Spawned new worker with PID {process.pid}")
        return process.pid

    # gracefully terminate one of our spawned workers
    def terminate_worker(self):
        if not self.spawned_pids:
            print("  ⚠ No spawned workers to terminate")
            return False

        # Get the oldest spawned worker
        pid = self.spawned_pids.pop(0)

        try:
            os.kill(pid, signal.SIGTERM)
            print(f"  ↓ Sent SIGTERM to worker PID {pid}")
            return True
        except ProcessLookupError:
            print(f"  ⚠ Worker PID {pid} already terminated")
            return False
        except PermissionError:
            print(f"  ✗ Permission denied to terminate PID {pid}")
            return False

    # scale the amount of workers + worker depth based on the depth of the queue
    def auto_scale(self):
        queue_depth = self.get_queue_depth()
        stats = self.get_worker_stats()
        active_count = stats['active_count']

        if active_count == 0 and queue_depth > 0:
            self.spawn_worker()
            return
        
        # Scale up
        if queue_depth > SCALE_UP_THRESHOLD and active_count < MAX_WORKERS:
            workers_to_add = min(
                MAX_WORKERS - active_count,
                (queue_depth - SCALE_UP_THRESHOLD) // 100 + 1  # Add 1 per 100 in queue
            )
            for _ in range(workers_to_add):
                self.spawn_worker()
            return f"Scaled UP: added {workers_to_add} workers"

        # Scale down
        elif queue_depth < SCALE_DOWN_THRESHOLD and active_count > MIN_WORKERS:
            idle_duration_seconds = self.queue.get_idle_duration_seconds()
            workers_to_remove = min(
                active_count - MIN_WORKERS,
                1
            )

            if idle_duration_seconds > IDLE_THRESHOLD_SECONDS:
                workers_to_remove = active_count
            
            if active_count == 1 and self.queue.get_queue_length() == 0 and idle_duration_seconds < IDLE_THRESHOLD_SECONDS:
                workers_to_remove = active_count - 1
            
            for _ in range(workers_to_remove):
                self.terminate_worker()
            return f"Scaled DOWN: removed {workers_to_remove} workers"

        return None

    # print the current system status
    def print_status(self):
        queue_depth = self.get_queue_depth()
        dlq_depth = self.get_dlq_depth()
        stats = self.get_worker_stats()
        dead_workers = self.get_dead_workers()

        timestamp = time.strftime("%H:%M:%S")

        print(f"\n[{timestamp}] === Worker Pool Status ===")
        print(f"  Queue depth: {queue_depth} tasks")
        print(f"  DLQ depth: {dlq_depth} failed tasks")
        print(f"  Active workers: {stats['active_count']}")

        if stats['worker_ids']:
            for worker_id in stats['worker_ids']:
                status = "⚠ STALE" if worker_id in dead_workers else "✓"
                print(f"    {status} {worker_id}")

        if dead_workers:
            print(f"  Dead workers: {len(dead_workers)}")

    # monitoring loop
    def run(self, auto_scale_enabled: bool = False):
        print("\n=== Worker Pool Monitor ===")
        print(f"Monitoring queue: {self.queue.queue_name}")
        print(f"Auto-scaling: {'ENABLED' if auto_scale_enabled else 'DISABLED'}")
        if auto_scale_enabled:
            print(f"  Scale up threshold: {SCALE_UP_THRESHOLD} tasks")
            print(f"  Scale down threshold: {SCALE_DOWN_THRESHOLD} tasks")
            print(f"  Min workers: {MIN_WORKERS}, Max workers: {MAX_WORKERS}")
        print("Press Ctrl+C to stop\n")

        try:
            while True:
                # Cleanup dead workers
                self.cleanup_dead_workers()

                # Print status
                self.print_status()

                # Auto-scale if enabled
                if auto_scale_enabled:
                    scale_action = self.auto_scale()
                    if scale_action:
                        print(f"  → {scale_action}")

                time.sleep(CHECK_INTERVAL)

        except KeyboardInterrupt:
            print("\n\n=== Monitor Stopped ===")

            # Cleanup spawned workers on exit
            if self.spawned_pids:
                print(f"Terminating {len(self.spawned_pids)} spawned workers...")
                for pid in self.spawned_pids:
                    try:
                        os.kill(pid, signal.SIGTERM)
                        print(f"  Sent SIGTERM to PID {pid}")
                    except (ProcessLookupError, PermissionError):
                        pass

            print()


# Legacy function for backwards compatibility
def monitor_queue():
    monitor = WorkerPoolMonitor()
    monitor.run(auto_scale_enabled=False)


if __name__ == "__main__":
    import argparse

    parser = argparse.ArgumentParser(description='Monitor worker pool and optionally auto-scale')
    parser.add_argument('--auto-scale', action='store_true', help='Enable auto-scaling of workers')
    parser.add_argument('--min-workers', type=int, default=MIN_WORKERS, help='Minimum number of workers')
    parser.add_argument('--max-workers', type=int, default=MAX_WORKERS, help='Maximum number of workers')
    parser.add_argument('--scale-up-threshold', type=int, default=SCALE_UP_THRESHOLD, help='Queue depth to trigger scale up')
    parser.add_argument('--scale-down-threshold', type=int, default=SCALE_DOWN_THRESHOLD, help='Queue depth to trigger scale down')

    args = parser.parse_args()

    # Update config from args
    MIN_WORKERS = args.min_workers
    MAX_WORKERS = args.max_workers
    SCALE_UP_THRESHOLD = args.scale_up_threshold
    SCALE_DOWN_THRESHOLD = args.scale_down_threshold

    monitor = WorkerPoolMonitor()
    monitor.run(auto_scale_enabled=args.auto_scale)
