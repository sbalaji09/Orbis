"""
Mock test for Anthropic streaming instrumentation
"""

import sys
import os
sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..'))

from unittest.mock import Mock
from observability_sdk import configure, instrument_all
from observability_sdk.integrations.anthropic_integration import _anthropic_instrumentor
from observability_sdk.core.span import Span
import time

# Configure
configure(
    api_key="test-key-123",
    api_url="http://localhost:8080",
    debug=True
)

instrument_all()

def test_anthropic_streaming_mock():
    """Test Anthropic streaming with mocked events"""
    
    print("\n" + "=" * 70)
    print("🧪 ANTHROPIC STREAMING MOCK TEST")
    print("=" * 70)
    
    print("\n🚀 TEST 1: Streaming Response Mock")
    print("-" * 70)
    
    # Create a generator that simulates network delay
    def mock_streaming_events():
        # Event 1: message_start
        time.sleep(0.01)  # 10ms delay
        event1 = Mock()
        event1.type = "message_start"
        event1.message = Mock()
        event1.message.usage = Mock()
        event1.message.usage.input_tokens = 20
        yield event1
        
        # Event 2-4: content_block_delta
        for text in ["Hello", " from", " Claude"]:
            time.sleep(0.005)  # 5ms delay
            event = Mock()
            event.type = "content_block_delta"
            event.delta = Mock()
            event.delta.text = text
            yield event
        
        # Event 5: message_delta with output tokens
        time.sleep(0.005)
        event5 = Mock()
        event5.type = "message_delta"
        event5.usage = Mock()
        event5.usage.output_tokens = 3
        yield event5
    
    # Create mock span
    span = Span(
        name="anthropic.claude-sonnet-4",
        model="claude-sonnet-4-20250514",
        prompt="Test prompt",
        is_streaming=True
    )
    
    # Test the streaming wrapper
    wrapped = _anthropic_instrumentor._wrap_anthropic_stream(mock_streaming_events(), span)
    
    # Consume the stream
    print("📡 Streaming chunks:")
    content = ""
    for event in wrapped:
        if event.type == "content_block_delta":
            print(event.delta.text, end="", flush=True)
            content += event.delta.text
    
    print("\n")
    
    # Verify
    print(f"✅ Content captured: '{content}'")
    print(f"✅ Span output: '{span.output}'")
    print(f"✅ Input tokens: {span.input_tokens}")
    print(f"✅ Output tokens: {span.output_tokens}")
    print(f"✅ TTFT: {span.time_to_first_token:.2f}ms")
    print(f"✅ Tokens/sec: {span.tokens_per_second:.2f}")
    print(f"✅ Total cost: ${span.total_cost:.6f}")
    print(f"✅ Status: {span.status}")
    
    assert content == "Hello from Claude", f"Expected 'Hello from Claude' but got '{content}'"
    assert span.output == "Hello from Claude", f"Expected span.output 'Hello from Claude' but got '{span.output}'"
    assert span.input_tokens == 20, f"Expected 20 input tokens but got {span.input_tokens}"
    assert span.output_tokens == 3, f"Expected 3 output tokens but got {span.output_tokens}"
    assert span.status == "success", f"Expected status 'success' but got '{span.status}'"
    assert span.time_to_first_token is not None, "TTFT should not be None"
    assert span.time_to_first_token > 0, f"TTFT should be > 0, got {span.time_to_first_token}"
    
    print("\n🎉 Anthropic streaming mock test PASSED!")

if __name__ == "__main__":
    print("=" * 70)
    print("🧪 ANTHROPIC MOCK TEST SUITE")
    print("=" * 70)
    
    test_anthropic_streaming_mock()
    
    print("\n" + "=" * 70)
    print("📊 TEST SUMMARY")
    print("=" * 70)
    print("✅ Streaming wrapper correctly captures content")
    print("✅ TTFT is calculated")
    print("✅ Token counts are extracted from events")
    print("✅ Tokens per second is calculated")
    print("✅ Cost is calculated")
    print("✅ Spans marked as successful")
    print("\n✅ All Anthropic mock tests PASSED!")