import requests
import json
import time
from datetime import datetime, timezone
from uuid import uuid4

# Test configuration
API_URL = "http://localhost:8000/span"
API_KEY = "test_api_key_123"  # Make sure this matches your .env or Redis

def create_test_span(trace_id: str, span_id: str, is_start: bool = False, is_end: bool = False):
    """Create a test span with realistic data"""
    return {
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
        "is_start_span": is_start,
        "is_end_span": is_end
    }

def send_span(span_data):
    """Send a span to the ingestion API"""
    headers = {
        "X-API-Key": API_KEY,
        "Content-Type": "application/json"
    }

    response = requests.post(API_URL, json=span_data, headers=headers)
    return response

def test_single_span():
    """Test sending a single span"""
    print("\n=== Test 1: Single Span ===")

    trace_id = str(uuid4())
    span_id = str(uuid4())

    span = create_test_span(trace_id, span_id, is_start=True, is_end=True)

    print(f"Sending span with trace_id: {trace_id}")
    response = send_span(span)

    print(f"Status Code: {response.status_code}")
    print(f"Response: {response.json()}")

    if response.status_code == 202:
        print("✓ Span accepted successfully")
        return True
    else:
        print(f"✗ Failed: {response.text}")
        return False

def test_trace_with_multiple_spans():
    """Test sending a trace with multiple spans"""
    print("\n=== Test 2: Trace with Multiple Spans ===")

    trace_id = str(uuid4())

    # Create 3 spans for the same trace
    spans = [
        create_test_span(trace_id, str(uuid4()), is_start=True, is_end=False),
        create_test_span(trace_id, str(uuid4()), is_start=False, is_end=False),
        create_test_span(trace_id, str(uuid4()), is_start=False, is_end=True)
    ]

    print(f"Sending 3 spans for trace_id: {trace_id}")

    success_count = 0
    for i, span in enumerate(spans, 1):
        response = send_span(span)
        if response.status_code == 202:
            print(f"  ✓ Span {i}/3 accepted")
            success_count += 1
        else:
            print(f"  ✗ Span {i}/3 failed: {response.text}")

        time.sleep(0.1)  # Small delay between requests

    if success_count == 3:
        print("✓ All spans accepted successfully")
        return True
    else:
        print(f"✗ Only {success_count}/3 spans accepted")
        return False

def test_rate_limiting():
    """Test rate limiting by sending many requests"""
    print("\n=== Test 3: Rate Limiting ===")

    print("Sending 10 rapid requests to test rate limiting...")

    success_count = 0
    rate_limited_count = 0

    for i in range(10):
        trace_id = str(uuid4())
        span_id = str(uuid4())
        span = create_test_span(trace_id, span_id, is_start=True, is_end=True)

        response = send_span(span)
        if response.status_code == 202:
            success_count += 1
        elif response.status_code == 429:
            rate_limited_count += 1
            print(f"  Rate limited after {success_count} requests")
            break

    print(f"✓ Sent {success_count} requests before rate limiting")
    return True

def test_invalid_span():
    """Test sending an invalid span"""
    print("\n=== Test 4: Invalid Span ===")

    # Create span with missing required fields
    invalid_span = {
        "trace_id": "not-a-uuid",
        "span_id": "also-not-a-uuid"
    }

    headers = {
        "X-API-Key": API_KEY,
        "Content-Type": "application/json"
    }

    response = requests.post(API_URL, json=invalid_span, headers=headers)

    if response.status_code == 400 or response.status_code == 422:
        print(f"✓ Invalid span rejected with status {response.status_code}")
        return True
    else:
        print(f"✗ Expected 400/422, got {response.status_code}")
        return False

def main():
    print("=== Orbis Data Pipeline End-to-End Test ===")
    print("\nMake sure:")
    print("1. Redis is running (redis-server)")
    print("2. Worker is running (python3 worker.py)")
    print("3. API is running (uvicorn ingestion_api:app --reload)")
    print("4. API key is configured in Redis or .env")

    input("\nPress Enter to start tests...")

    results = []

    # Run tests
    results.append(("Single Span", test_single_span()))
    results.append(("Multiple Spans", test_trace_with_multiple_spans()))
    results.append(("Rate Limiting", test_rate_limiting()))
    results.append(("Invalid Span", test_invalid_span()))

    # Print summary
    print("\n=== Test Summary ===")
    passed = sum(1 for _, result in results if result)
    total = len(results)

    for test_name, result in results:
        status = "✓ PASSED" if result else "✗ FAILED"
        print(f"{test_name}: {status}")

    print(f"\nTotal: {passed}/{total} tests passed")

    print("\nNext steps:")
    print("1. Check worker logs (data-pipeline.log) for processing details")
    print("2. Check Supabase dashboard to verify data was saved")
    print("3. Check Redis queue status: redis-cli LLEN span_processing_queue")
    print("4. Check DLQ for failed tasks: python3 inspect_dlq.py view")

if __name__ == "__main__":
    main()
