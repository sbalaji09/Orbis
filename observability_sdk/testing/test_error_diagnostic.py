"""
Simple diagnostic to verify error tracking works
"""

import sys
import os
sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..'))

from observability_sdk import configure, instrument_all
from observability_sdk.collector.collector import get_collector
import openai
import time

GROQ_API_KEY = "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"

# Configure Orbis
configure(
    api_key="test_LZmbYQh0EICyJHBpkg4UWiD69Mn6BybDo8G80In7CFA",
    project_id="73635de3-eedc-4ac0-8acb-a22c9816847d",
    user_id="00000000-0000-0000-0000-000000000000",
    api_url="http://localhost:8080",
)

instrument_all()

client = openai.OpenAI(
    api_key=GROQ_API_KEY,
    base_url="https://api.groq.com/openai/v1"
)

print("\n🧪 Testing Error Tracking\n")

# Test 1: Successful call
print("1️⃣  Success call...")
try:
    response = client.chat.completions.create(
        model="llama-3.3-70b-versatile",
        messages=[{"role": "user", "content": "Say hi"}],
        max_tokens=10
    )
    print(f"   ✅ SUCCESS\n")
except Exception as e:
    print(f"   ❌ Unexpected error: {e}\n")

# Test 2: Error call (caught)
print("2️⃣  Error call (caught)...")
try:
    response = client.chat.completions.create(
        model="nonexistent-model-xyz",
        messages=[{"role": "user", "content": "Test"}],
        max_tokens=10
    )
    print(f"   ✅ Unexpected success\n")
except Exception as e:
    print(f"   ❌ EXPECTED ERROR: {type(e).__name__}: {str(e)[:50]}\n")

# Test 3: Another success
print("3️⃣  Another success call...")
try:
    response = client.chat.completions.create(
        model="llama-3.3-70b-versatile",
        messages=[{"role": "user", "content": "Count to 3"}],
        max_tokens=20
    )
    print(f"   ✅ SUCCESS\n")
except Exception as e:
    print(f"   ❌ Unexpected error: {e}\n")

print("📤 Flushing...")
get_collector().flush()
time.sleep(3)

print("\n✅ Done! Check the dashboard:")
print("   Expected: 3 LLM spans total")
print("   Expected: 1 span with error (nonexistent-model)")
print("   Expected: 2 spans with success")
print("   Expected error rate: ~33%\n")
