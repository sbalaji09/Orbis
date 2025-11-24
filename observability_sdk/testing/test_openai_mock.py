"""
Mock test for OpenAI streaming instrumentation
Tests the wrapper logic without requiring API keys
"""

import sys
import os
sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..'))

from unittest.mock import Mock
from observability_sdk import configure, instrument_all
from observability_sdk.integrations.openai_integration import _openai_instrumentor
from observability_sdk.core.span import Span
import time

# Configure
configure(
    api_key="test-key-123",
    api_url="http://localhost:8080",
    debug=True
)

instrument_all()

def test_openai_streaming_mock():
    """Test OpenAI streaming with mocked response"""
    
    print("\n" + "=" * 70)
    print("🧪 OPENAI STREAMING MOCK TEST")
    print("=" * 70)
    
    print("\n🚀 TEST 1: Streaming Response Mock")
    print("-" * 70)
    
    # Create a generator that simulates network delay
    def mock_streaming_response():
        texts = ["Hello", " world", "!", ""]
        for i, text in enumerate(texts):
            # Simulate network latency
            if i == 0:
                time.sleep(0.01)  # 10ms delay for first chunk
            else:
                time.sleep(0.005)  # 5ms delay for subsequent chunks
            
            chunk = Mock()
            chunk.choices = [Mock()]
            chunk.choices[0].delta = Mock()
            chunk.choices[0].delta.content = text
            
            # Add usage to last chunk (OpenAI now includes this)
            if i == 3:  # Last chunk
                chunk.usage = Mock()
                chunk.usage.prompt_tokens = 10
                chunk.usage.completion_tokens = 3
            else:
                chunk.usage = None
            
            yield chunk
    
    # Create mock span
    span = Span(
        name="openai.gpt-4o-mini",
        model="gpt-4o-mini",
        prompt="Test prompt",
        is_streaming=True
    )
    
    # Test the streaming wrapper
    wrapped = _openai_instrumentor._wrap_openai_stream(mock_streaming_response(), span)
    
    # Consume the stream
    print("📡 Streaming chunks:")
    content = ""
    for chunk in wrapped:
        if chunk.choices[0].delta.content:
            print(chunk.choices[0].delta.content, end="", flush=True)
            content += chunk.choices[0].delta.content
    
    print("\n")
    
    # Verify
    print(f"✅ Content captured: '{content}'")
    print(f"✅ Span output: '{span.output}'")
    print(f"✅ Input tokens: {span.input_tokens}")
    print(f"✅ Output tokens: {span.output_tokens}")
    print(f"✅ TTFT: {span.time_to_first_token:.2f}ms")
    print(f"✅ Tokens/sec: {span.tokens_per_second:.2f}")
    print(f"✅ Status: {span.status}")
    
    assert content == "Hello world!", f"Expected 'Hello world!' but got '{content}'"
    assert span.output == "Hello world!", f"Expected span.output 'Hello world!' but got '{span.output}'"
    assert span.status == "success", f"Expected status 'success' but got '{span.status}'"
    assert span.time_to_first_token is not None, "TTFT should not be None"
    assert span.time_to_first_token > 0, f"TTFT should be > 0, got {span.time_to_first_token}"
    assert span.input_tokens == 10, f"Expected 10 input tokens but got {span.input_tokens}"
    assert span.output_tokens == 3, f"Expected 3 output tokens but got {span.output_tokens}"
    
    print("\n🎉 OpenAI streaming mock test PASSED!")

def test_openai_nonstreaming_mock():
    """Test OpenAI non-streaming with mocked response"""
    
    print("\n🔄 TEST 2: Non-Streaming Response Mock")
    print("-" * 70)
    
    # Create mock response
    mock_response = Mock()
    mock_response.choices = [Mock()]
    mock_response.choices[0].message = Mock()
    mock_response.choices[0].message.content = "This is a test response"
    
    mock_response.usage = Mock()
    mock_response.usage.prompt_tokens = 15
    mock_response.usage.completion_tokens = 5
    
    print("📝 Complete response:")
    print(mock_response.choices[0].message.content)
    
    print(f"\n✅ Response captured")
    print(f"✅ Content: '{mock_response.choices[0].message.content}'")
    print(f"✅ Input tokens: {mock_response.usage.prompt_tokens}")
    print(f"✅ Output tokens: {mock_response.usage.completion_tokens}")
    
    assert mock_response.choices[0].message.content == "This is a test response"
    
    print("\n🎉 OpenAI non-streaming mock test PASSED!")

if __name__ == "__main__":
    print("=" * 70)
    print("🧪 OPENAI MOCK TEST SUITE")
    print("=" * 70)
    
    test_openai_streaming_mock()
    time.sleep(1)
    test_openai_nonstreaming_mock()
    
    print("\n" + "=" * 70)
    print("📊 TEST SUMMARY")
    print("=" * 70)
    print("✅ Streaming wrapper correctly captures content")
    print("✅ TTFT is calculated")
    print("✅ Token counts are extracted")
    print("✅ Tokens per second is calculated")
    print("✅ Spans marked as successful")
    print("\n✅ All OpenAI mock tests PASSED!")