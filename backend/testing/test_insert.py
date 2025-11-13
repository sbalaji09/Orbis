import sys
import os
sys.path.append(os.path.dirname(__file__))

from db_connection import db
from uuid import uuid4
from datetime import datetime, timezone

print("=== Testing Direct Database Insert ===\n")

# Test 1: Insert a trace
print("Test 1: Inserting trace...")
trace_id = str(uuid4())
trace_data = {
    "trace_id": trace_id,
    "start_time": datetime.now(timezone.utc).isoformat(),
    "end_time": "",
    "duration": 0,
    "total_cost": 0,
    "total_tokens": 0,
    "status": "running",
    "user_id": 1
}

try:
    result = db.insert_trace(trace_data)
    print(f"✓ Trace inserted successfully: {result}")
except Exception as e:
    print(f"✗ Failed to insert trace: {e}")
    sys.exit(1)

# Test 2: Insert a span
print("\nTest 2: Inserting span...")
span_id = str(uuid4())
span_data = {
    "span_id": span_id,
    "trace_id": trace_id,
    "parent_span_ids": [],
    "name": "test_span",
    "start_time": datetime.now(timezone.utc).isoformat(),
    "end_time": datetime.now(timezone.utc).isoformat(),
    "duration": 1.5,
    "input_preview": "Test input",
    "input_blob_url": "placeholder://input",
    "output_preview": "Test output",
    "output_blob_url": "placeholder://output",
    "llm_model": "gpt-4",
    "prompt_tokens": 10,
    "completion_tokens": 20,
    "cost": 0.0015,
    "status": "success",
    "error_message": None
}

try:
    result = db.insert_span(span_data)
    print(f"✓ Span inserted successfully: {result}")
except Exception as e:
    print(f"✗ Failed to insert span: {e}")
    sys.exit(1)

# Test 3: Update the trace
print("\nTest 3: Updating trace...")
update_data = {
    "end_time": datetime.now(timezone.utc).isoformat(),
    "duration": 1.5,
    "total_cost": 0.0015,
    "total_tokens": 30,
    "status": "completed"
}

try:
    result = db.update_trace(trace_id, update_data)
    print(f"✓ Trace updated successfully")
except Exception as e:
    print(f"✗ Failed to update trace: {e}")
    sys.exit(1)

print("\n=== All Tests Passed ===")
print(f"\nCheck Supabase dashboard:")
print(f"  Trace ID: {trace_id}")
print(f"  Span ID: {span_id}")
