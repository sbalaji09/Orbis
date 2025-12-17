"""
LLM Error Test Agent: Various LLM failure scenarios
Tests: Invalid API keys, rate limits, model errors, timeout issues
"""

import sys
import os
sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..'))

from observability_sdk import configure, instrument_all, observe
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

# Enable all instrumentation
instrument_all()

@observe(name="llm_error_test_suite", prompt_id="error_tester", prompt_version="v1.0")
def test_llm_errors():
    """Test various LLM error scenarios"""
    print("\n" + "="*70)
    print("🧪 LLM Error Test Suite")
    print("="*70 + "\n")
    
    results = {
        "total_tests": 5,
        "failed_tests": 0,
        "test_results": []
    }
    
    # ========================================================================
    # TEST 1: Invalid API Key
    # ========================================================================
    print("1️⃣  Testing Invalid API Key...")
    try:
        client_bad_key = openai.OpenAI(
            api_key="invalid_key_12345",
            base_url="https://api.groq.com/openai/v1"
        )
        
        response = client_bad_key.chat.completions.create(
            model="llama-3.3-70b-versatile",
            messages=[{"role": "user", "content": "Test"}],
            max_tokens=10
        )
        print("   ❌ UNEXPECTED: Should have failed\n")
        results["test_results"].append({"test": "invalid_api_key", "status": "unexpected_success"})
    except openai.AuthenticationError as e:
        print(f"   ✅ Expected error: {type(e).__name__}")
        print(f"   📝 Message: {str(e)[:100]}\n")
        results["failed_tests"] += 1
        results["test_results"].append({"test": "invalid_api_key", "status": "expected_error", "error": str(e)})
    except Exception as e:
        print(f"   ⚠️  Unexpected error type: {type(e).__name__}")
        print(f"   📝 Message: {str(e)[:100]}\n")
        results["failed_tests"] += 1
        results["test_results"].append({"test": "invalid_api_key", "status": "unexpected_error", "error": str(e)})
    
    # ========================================================================
    # TEST 2: Invalid Model Name
    # ========================================================================
    print("2️⃣  Testing Invalid Model Name...")
    try:
        client = openai.OpenAI(
            api_key=GROQ_API_KEY,
            base_url="https://api.groq.com/openai/v1"
        )
        
        response = client.chat.completions.create(
            model="nonexistent-model-xyz-999",
            messages=[{"role": "user", "content": "Test"}],
            max_tokens=10
        )
        print("   ❌ UNEXPECTED: Should have failed\n")
        results["test_results"].append({"test": "invalid_model", "status": "unexpected_success"})
    except openai.NotFoundError as e:
        print(f"   ✅ Expected error: {type(e).__name__}")
        print(f"   📝 Message: {str(e)[:100]}\n")
        results["failed_tests"] += 1
        results["test_results"].append({"test": "invalid_model", "status": "expected_error", "error": str(e)})
    except Exception as e:
        print(f"   ⚠️  Error: {type(e).__name__}")
        print(f"   📝 Message: {str(e)[:100]}\n")
        results["failed_tests"] += 1
        results["test_results"].append({"test": "invalid_model", "status": "error", "error": str(e)})
    
    # ========================================================================
    # TEST 3: Invalid Message Format
    # ========================================================================
    print("3️⃣  Testing Invalid Message Format...")
    try:
        client = openai.OpenAI(
            api_key=GROQ_API_KEY,
            base_url="https://api.groq.com/openai/v1"
        )
        
        response = client.chat.completions.create(
            model="llama-3.3-70b-versatile",
            messages=[{"role": "invalid_role", "content": "Test"}],  # Invalid role
            max_tokens=10
        )
        print("   ❌ UNEXPECTED: Should have failed\n")
        results["test_results"].append({"test": "invalid_format", "status": "unexpected_success"})
    except (openai.BadRequestError, openai.APIError) as e:
        print(f"   ✅ Expected error: {type(e).__name__}")
        print(f"   📝 Message: {str(e)[:100]}\n")
        results["failed_tests"] += 1
        results["test_results"].append({"test": "invalid_format", "status": "expected_error", "error": str(e)})
    except Exception as e:
        print(f"   ⚠️  Error: {type(e).__name__}")
        print(f"   📝 Message: {str(e)[:100]}\n")
        results["failed_tests"] += 1
        results["test_results"].append({"test": "invalid_format", "status": "error", "error": str(e)})
    
    # ========================================================================
    # TEST 4: Timeout (using very low timeout)
    # ========================================================================
    print("4️⃣  Testing Timeout...")
    try:
        client = openai.OpenAI(
            api_key=GROQ_API_KEY,
            base_url="https://api.groq.com/openai/v1",
            timeout=0.001  # Extremely low timeout
        )
        
        response = client.chat.completions.create(
            model="llama-3.3-70b-versatile",
            messages=[{"role": "user", "content": "Tell me a long story"}],
            max_tokens=100
        )
        print("   ❌ UNEXPECTED: Should have timed out\n")
        results["test_results"].append({"test": "timeout", "status": "unexpected_success"})
    except (openai.APITimeoutError, openai.APIConnectionError) as e:
        print(f"   ✅ Expected error: {type(e).__name__}")
        print(f"   📝 Message: {str(e)[:100]}\n")
        results["failed_tests"] += 1
        results["test_results"].append({"test": "timeout", "status": "expected_error", "error": str(e)})
    except Exception as e:
        print(f"   ⚠️  Error: {type(e).__name__}")
        print(f"   📝 Message: {str(e)[:100]}\n")
        results["failed_tests"] += 1
        results["test_results"].append({"test": "timeout", "status": "error", "error": str(e)})
    
    # ========================================================================
    # TEST 5: Streaming Error
    # ========================================================================
    print("5️⃣  Testing Streaming with Invalid Key...")
    try:
        client_bad = openai.OpenAI(
            api_key="bad_streaming_key",
            base_url="https://api.groq.com/openai/v1"
        )
        
        stream = client_bad.chat.completions.create(
            model="llama-3.3-70b-versatile",
            messages=[{"role": "user", "content": "Count to 10"}],
            max_tokens=50,
            stream=True
        )
        
        # Try to consume stream
        for chunk in stream:
            pass
        
        print("   ❌ UNEXPECTED: Should have failed\n")
        results["test_results"].append({"test": "streaming_error", "status": "unexpected_success"})
    except openai.AuthenticationError as e:
        print(f"   ✅ Expected error: {type(e).__name__}")
        print(f"   📝 Message: {str(e)[:100]}\n")
        results["failed_tests"] += 1
        results["test_results"].append({"test": "streaming_error", "status": "expected_error", "error": str(e)})
    except Exception as e:
        print(f"   ⚠️  Error: {type(e).__name__}")
        print(f"   📝 Message: {str(e)[:100]}\n")
        results["failed_tests"] += 1
        results["test_results"].append({"test": "streaming_error", "status": "error", "error": str(e)})
    
    # ========================================================================
    # SUMMARY
    # ========================================================================
    print("="*70)
    print("📊 TEST SUMMARY")
    print("="*70)
    print(f"Total Tests: {results['total_tests']}")
    print(f"Failed Tests: {results['failed_tests']}")
    print(f"Error Rate: {(results['failed_tests']/results['total_tests'])*100:.1f}%")
    print("="*70 + "\n")
    
    return results

if __name__ == "__main__":
    print("\n🧪 Running LLM Error Tests\n")
    
    results = test_llm_errors()
    
    print("="*70)
    print("📊 EXPECTED DASHBOARD METRICS")
    print("="*70)
    print("\n✨ Total Spans: ~6-7 (1 function + 5 LLM attempts)")
    print(f"❌ Error Rate: ~{(results['failed_tests']/results['total_tests'])*100:.0f}% (should be high!)")
    print("\n🚨 Expected Errors:")
    print("   1. AuthenticationError - Invalid API key")
    print("   2. NotFoundError - Invalid model name")
    print("   3. BadRequestError - Invalid message format")
    print("   4. APITimeoutError - Connection timeout")
    print("   5. AuthenticationError - Streaming with bad key")
    
    print("\n📈 What You'll See in Dashboard:")
    print("   • High error rate on this trace")
    print("   • Each LLM span marked with error status")
    print("   • Error messages captured in span details")
    print("   • Different error types clearly labeled")
    print("   • No successful LLM completions")
    
    print("\n🎯 Metrics to Verify:")
    print("   • Prompt error rate should be 100% for this trace")
    print("   • Each error type should be categorized")
    print("   • Error messages should be stored")
    print("   • Span status should show 'error'")
    
    print("\n🚀 Check http://localhost:3000\n")
    
    # Flush
    print("📤 Flushing...")
    get_collector().flush()
    time.sleep(2)
    print("✅ Done!\n")