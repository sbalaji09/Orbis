"""
Test script to send a sample span to the ingestion API.
This simulates what your SDK would do.
"""
import requests
import json
from datetime import datetime
from uuid import uuid4

# API endpoint
API_URL = "http://localhost:8000/span"

# Create a test span (simulating what the SDK would send)
test_span = {
    "prompt": "What is the capital of France?",
    "model": "gpt-4",
    "input_tokens": 10,
    "output_tokens": 5,
    "total_cost": 0.001,
    "start_time": datetime.utcnow().isoformat(),
    "end_time": datetime.utcnow().isoformat(),
    "duration": 1.5,
    "input_data": "User asked: What is the capital of France?",
    "output_data": "The capital of France is Paris.",
    "context": "General knowledge question",
    "output": "Paris",
    "status": "completed",
    "error_message": None,
    "parent_span_id": [],
    "name": "test_span",
    "is_start_span": True,
    "is_end_span": True
}

print("\n=== Testing Data Pipeline ===\n")
print(f"Sending test span to: {API_URL}")
print(f"Model: {test_span['model']}")
print(f"Prompt: {test_span['prompt'][:50]}...")

try:
    # Send POST request
    response = requests.post(API_URL, json=test_span)

    print(f"\n✓ Response Status: {response.status_code}")
    print(f"✓ Response Body: {response.json()}")

    if response.status_code == 202:
        print("\n✓ SUCCESS! Span was accepted and queued.")
        print("  → Check your worker terminal to see it being processed!")
        print("  → Check Redis: redis-cli LLEN span_processing_queue")
    else:
        print(f"\n✗ Unexpected status code: {response.status_code}")

except requests.exceptions.ConnectionError:
    print("\n✗ ERROR: Could not connect to API.")
    print("  → Make sure FastAPI is running: uvicorn ingestion_api:app --reload --port 8000")

except Exception as e:
    print(f"\n✗ ERROR: {e}")

print("\n=== Test Complete ===\n")
