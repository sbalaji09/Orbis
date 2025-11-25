"""
Test OpenAI instrumentation using Groq's free API
Groq uses OpenAI-compatible API, so this tests the real instrumentation!
"""

import sys
import os
sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..'))

from observability_sdk import configure, instrument_all, observe
import openai
import time

# Configure observability
configure(
    api_key="sk_live_Vy41Kdajw0Nigty3A3HrJlCx0ZXGXSqovDHCre6zU3Y",
    api_url="http://localhost:8080",
    debug=True
)

instrument_all()

# Configure OpenAI client to use Groq
client = openai.OpenAI(
    api_key="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",  # Get from https://console.groq.com
    base_url="https://api.groq.com/openai/v1"  # Point to Groq instead of OpenAI
)

print("=" * 70)
print("🧪 TESTING OPENAI INSTRUMENTATION WITH GROQ")
print("=" * 70)

# ========================================
# TEST 1: Streaming
# ========================================

@observe("groq_streaming_test")
def test_streaming():
    print("\n🚀 TEST 1: Streaming Response")
    print("-" * 70)
    
    response = client.chat.completions.create(
        model="llama-3.3-70b-versatile",  # Groq's fast model
        messages=[
            {"role": "user", "content": "Write a short 2-sentence story about a robot learning to code"}
        ],
        stream=True  # Enable streaming
    )
    
    print("📡 Streaming response:")
    full_text = ""
    for chunk in response:
        if chunk.choices[0].delta.content:
            content = chunk.choices[0].delta.content
            print(content, end="", flush=True)
            full_text += content
    
    print(f"\n✅ Complete! Length: {len(full_text)} chars")
    return full_text

# ========================================
# TEST 2: Non-Streaming
# ========================================

@observe("groq_nonstreaming_test")
def test_nonstreaming():
    print("\n🔄 TEST 2: Non-Streaming Response")
    print("-" * 70)
    
    response = client.chat.completions.create(
        model="llama-3.3-70b-versatile",
        messages=[
            {"role": "user", "content": "Write a short 2-sentence story about AI"}
        ],
        stream=False  # No streaming
    )
    
    print("📝 Complete response:")
    print(response.choices[0].message.content)
    print("✅ Complete!")
    return response.choices[0].message.content

# ========================================
# RUN TESTS
# ========================================

if __name__ == "__main__":
    # Test streaming
    result1 = test_streaming()
    time.sleep(2)
    
    # Test non-streaming
    result2 = test_nonstreaming()
    time.sleep(6)
    
    print("\n" + "=" * 70)
    print("📊 EXPECTED IN DASHBOARD")
    print("=" * 70)
    print("You should see 2 traces, each with:")
    print("1. Parent span (groq_streaming_test / groq_nonstreaming_test)")
    print("2. Child span (openai.llama-3.3-70b-versatile)")
    print()
    print("The streaming trace should show:")
    print("  🌊 STREAMING badge")
    print("  ⚡ TTFT: ~100-300ms")
    print("  🚀 Speed: 300-500 tok/s (Groq is FAST!)")
    print()
    print("✅ Check http://localhost:3000")