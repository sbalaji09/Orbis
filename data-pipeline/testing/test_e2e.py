import json
from uuid import uuid4
from datetime import datetime, timezone
from queues.redis_queue import RedisQueue

print("=== End-to-End Pipeline Test ===\n")

# Create a test span
trace_id = str(uuid4())
span_id = str(uuid4())

span_data = {
    "trace_id": trace_id,
    "span_id": span_id,
    "parent_span_id": [],
    "name": "test_llm_call",
    "start_time": datetime.now(timezone.utc).isoformat(),
    "end_time": datetime.now(timezone.utc).isoformat(),
    "duration": 1.5,
    "input_data": "What is the meaning of life?",
    "output_data": "The meaning of life is 42.",
    "model": "gpt-4",
    "input_tokens": 10,
    "output_tokens": 20,
    "total_cost": 0.0015,
    "status": "success",
    "error_message": None,
    "user_id": "1",
    "is_start_span": True,
    "is_end_span": True
}

task_data = {
    "span": span_data,
    "user_id": "1",
    "received_at": datetime.now(timezone.utc).isoformat()
}

# Enqueue directly to Redis
queue = RedisQueue()
success = queue.enqueue(task_data)

if success:
    print(f"✓ Span enqueued successfully")
    print(f"  Trace ID: {trace_id}")
    print(f"  Span ID: {span_id}")
    print(f"\nWaiting for worker to process...")
    print("Check:")
    print("  1. Worker logs for processing")
    print("  2. Supabase dashboard for data")
    print(f"  3. Redis queue length: redis-cli LLEN span_processing_queue")
else:
    print("✗ Failed to enqueue span")
