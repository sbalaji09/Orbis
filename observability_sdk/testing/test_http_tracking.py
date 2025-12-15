"""
Test HTTP auto-instrumentation
This test verifies that HTTP calls are automatically tracked as spans
"""

import sys
import os
sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..'))

from observability_sdk import observe, instrument_http
from observability_sdk.collector.config import configure

# Check if httpx is installed
try:
    import httpx
except ImportError:
    print("❌ httpx not installed. Install with: pip install httpx")
    sys.exit(1)

# Configure Orbis
configure(
    api_key="test-api-key-http",
    project_id="test-project-http",
    user_id="test-user-http",
    api_url="http://localhost:8080",
    debug=True
)

# Enable HTTP instrumentation
print("🔧 Enabling HTTP instrumentation for httpx...")
instrument_http(httpx)

@observe(name="test_http_tracking")
def test_http_calls():
    """
    Test function that makes several HTTP calls.
    Each call should be tracked as a separate span.
    """
    print("\n📡 Making HTTP requests...\n")

    # Test 1: GET request to GitHub API
    print("1. GET request to GitHub API")
    response1 = httpx.get("https://api.github.com/users/octocat")
    print(f"   ✓ Status: {response1.status_code}")
    print(f"   ✓ User: {response1.json().get('name')}")

    # Test 2: GET request to JSONPlaceholder (another API)
    print("\n2. GET request to JSONPlaceholder")
    response2 = httpx.get("https://jsonplaceholder.typicode.com/posts/1")
    print(f"   ✓ Status: {response2.status_code}")
    print(f"   ✓ Post title: {response2.json().get('title')}")

    # Test 3: POST request
    print("\n3. POST request to JSONPlaceholder")
    response3 = httpx.post(
        "https://jsonplaceholder.typicode.com/posts",
        json={"title": "Test Post", "body": "Test Body", "userId": 1}
    )
    print(f"   ✓ Status: {response3.status_code}")
    print(f"   ✓ Created post ID: {response3.json().get('id')}")

    return "All HTTP tests completed!"

if __name__ == "__main__":
    print("=" * 60)
    print("🧪 HTTP Tracking Test")
    print("=" * 60)

    result = test_http_calls()

    print("\n" + "=" * 60)
    print("✅ Test completed!")
    print("=" * 60)
    print("\n📊 Expected results in Orbis dashboard:")
    print("   - 1 trace: 'test_http_tracking'")
    print("   - 4 spans total:")
    print("     1. test_http_tracking (parent, type: function)")
    print("     2. httpx.GET (GitHub API, type: http)")
    print("     3. httpx.GET (JSONPlaceholder, type: http)")
    print("     4. httpx.POST (JSONPlaceholder, type: http)")
    print("\n💡 Check your Orbis dashboard to see the trace!")