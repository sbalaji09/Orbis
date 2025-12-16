"""Quick test to debug span_type"""
import sys
import os
sys.path.insert(0, os.path.join(os.path.dirname(__file__), 'observability_sdk'))

from observability_sdk import configure
from observability_sdk.integrations.cli_integration import run_tracked_command
from observability_sdk.collector.collector import get_collector
import time

# Configure with debug
configure(
    api_key="test-tool-tracking-key-123",
    project_id="616d8f4e-8b03-4112-a40c-a61164977cb5",
    user_id="00000000-0000-0000-0000-000000000000",
    api_url="http://localhost:8080",
    debug=True
)

print("Testing CLI span_type...")
result = run_tracked_command("echo 'test'")
print(f"Command result: {result.stdout}")

# Flush to send spans
time.sleep(2)
get_collector().flush()
time.sleep(2)

print("Done! Check the debug output above to see what span_type was sent.")
