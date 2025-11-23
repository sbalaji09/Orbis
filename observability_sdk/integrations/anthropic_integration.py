"""
Auto-instrumentation for Anthropic API calls.
Automatically wraps Anthropic calls to capture spans
"""

from typing import Optional, Any
import functools
from ..core.span import Span
from ..collector.collector import get_collector
from ..core.context import get_current_span, set_current_span
import time

# anthropic pricing per 1M tokens (updated 11.16.25)
ANTHROPIC_PRICING = {
    # Claude 4 family
    "claude-opus-4-20250514": {"input": 15.0, "output": 75.0},
    "claude-sonnet-4-20250514": {"input": 3.0, "output": 15.0},
    
    # Claude 3.5 family
    "claude-3-5-sonnet-20241022": {"input": 3.0, "output": 15.0},
    "claude-3-5-sonnet-20240620": {"input": 3.0, "output": 15.0},
    "claude-3-5-haiku-20241022": {"input": 0.80, "output": 4.0},
    
    # Claude 3 family
    "claude-3-opus-20240229": {"input": 15.0, "output": 75.0},
    "claude-3-sonnet-20240229": {"input": 3.0, "output": 15.0},
    "claude-3-haiku-20240307": {"input": 0.25, "output": 1.25},
}

# calculate cost for anthropic api call
def calculate_anthropic_cost(model: str, input_tokens: int, output_tokens: int) -> float:
    pricing = ANTHROPIC_PRICING.get(model)
    if not pricing:
        # Default to sonnet pricing if model not found
        pricing = ANTHROPIC_PRICING["claude-3-5-sonnet-20241022"]
        print(f"Unknown model '{model}', using claude-3-5-sonnet pricing as fallback")
    
    input_cost = (input_tokens / 1_000_000) * pricing["input"]
    output_cost = (output_tokens / 1_000_000) * pricing["output"]

    return input_cost + output_cost

# convert anthropic message array to a single prompt string
def extract_prompt_from_messages(messages: list) -> str:
    if not messages:
        return ""

    formatted = []
    for msg in messages:
        role = msg.get("role", "unknown")
        content = msg.get("content", "")
        # Handle content that might be a list (for vision, etc.)
        if isinstance(content, list):
            content = " ".join([item.get("text", "") if isinstance(item, dict) else str(item) for item in content])
        formatted.append(f"{role}: {content}")
    
    return "\n".join(formatted)

# handles automatic instrumentation of anthropic api calls
class AnthropicInstrumentor:

    def __init__(self):
        self.original_create = None
        self.instrumented = False
    
    # monkey-patch anthropic to add automatic span tracking
    def instrument(self):
        if self.instrumented:
            return 
        
        try:
            import anthropic
        except ImportError:
            print("Anthropic package not installed. Skipping Anthropic instrumentation.")
            return

        # wrap the messages create method
        try:
            from anthropic.resources.messages import Messages
            original_create = Messages.create
            
            @functools.wraps(original_create)
            def wrapped_create(self, *args, **kwargs):
                return _anthropic_instrumentor._trace_anthropic_call(original_create, self, *args, **kwargs)
            
            Messages.create = wrapped_create
            self.original_create = original_create
            self.instrumented = True

            print("Anthropic instrumentation enabled")
        
        except AttributeError as e:
            print(f"Could not instrument Anthropic: {e}")
    
    # remove instrumentation and restore original anthropic methods
    def uninstrument(self):
        if not self.instrumented:
            return

        try:
            from anthropic.resources.messages import Messages
            if self.original_create:
                Messages.create = self.original_create
            
            self.instrumented = False
            print("Anthropic instrumentation disabled")
        
        except Exception as e:
            print(f"Error uninstrumenting Anthropic: {e}")
    
    # wraps anthropic streaming response to capture metrics. anthropic streams return events with different types.
    
    def _wrap_anthropic_stream(self, stream_response, span):

        first_chunk_time = None
        full_content = ""
        chunk_count = 0
        start_time = time.time()
        input_tokens = 0
        output_tokens = 0
        
        try:
            for event in stream_response:
                # Record time to first content
                if first_chunk_time is None and hasattr(event, "type") and event.type == "content_block_delta":
                    first_chunk_time = time.time()
                    span.time_to_first_token = (first_chunk_time - start_time) * 1000
                
                # Extract content from delta events
                if hasattr(event, "type"):
                    if event.type == "content_block_delta":
                        if hasattr(event, "delta") and hasattr(event.delta, "text"):
                            full_content += event.delta.text
                            chunk_count += 1
                    
                    # Anthropic provides usage in message_start and message_delta events
                    elif event.type == "message_start":
                        if hasattr(event, "message") and hasattr(event.message, "usage"):
                            input_tokens = event.message.usage.input_tokens
                    
                    elif event.type == "message_delta":
                        if hasattr(event, "usage"):
                            output_tokens = event.usage.output_tokens
                
                # Yield event to user
                yield event
            
            # After stream completes
            end_time = time.time()
            
            # Set output
            span.output = full_content
            
            # Set token counts
            span.input_tokens = input_tokens
            span.output_tokens = output_tokens
            
            # Calculate cost
            span.total_cost = calculate_anthropic_cost(
                span.model or "unknown",
                input_tokens,
                output_tokens
            )
            
            # Calculate tokens per second
            if first_chunk_time:
                stream_duration = end_time - first_chunk_time
                if stream_duration > 0 and output_tokens > 0:
                    span.tokens_per_second = output_tokens / stream_duration
            
            # Mark as successful
            span.complete(status="success")
        
        except Exception as e:
            span.set_error(e)
            span.complete(status="error")
            raise
        
        finally:
            # Send span to collector
            collector = get_collector()
            collector.collect(span)
    
    # wrap an anthropic api call with span tracking
    def _trace_anthropic_call(self, original_func, client_self, *args, **kwargs):
        model = kwargs.get("model", "unknown")
        messages = kwargs.get("messages", [])
        is_streaming = kwargs.get("stream", False)

        # Get parent context
        parent_span = get_current_span()
        
        # create span
        span = Span(
            name=f"anthropic.{model}",
            user_id="00000000-0000-0000-0000-000000000000",
            agent_id="af913dc2-732e-42a6-a113-a80c694d71bf",
            model=model,
            prompt=extract_prompt_from_messages(messages),
            is_streaming=is_streaming,
        )

        # If there's a parent, inherit its trace_id and set parent relationship
        if parent_span:
            span.trace_id = parent_span.trace_id
            span.parent_span_id = [parent_span.span_id]
        
        # Set this span as the active span
        previous_span = get_current_span()
        set_current_span(span)

        try:
            # call the actual anthropic api
            response = original_func(client_self, *args, **kwargs)

            # Handle streaming vs non-streaming
            if is_streaming:
                # Wrap the streaming response
                wrapped_response = self._wrap_anthropic_stream(response, span)
                return wrapped_response
            else:
                # Non-streaming: extract tokens immediately
                if hasattr(response, "usage") and response.usage:
                    span.input_tokens = response.usage.input_tokens
                    span.output_tokens = response.usage.output_tokens
                    span.total_cost = calculate_anthropic_cost(
                        model,
                        span.input_tokens or 0,
                        span.output_tokens or 0
                    )
                
                # extract completion
                if hasattr(response, "content") and response.content:
                    content_text = ""
                    for block in response.content:
                        if hasattr(block, "type") and block.type == "text" and hasattr(block, "text"):
                            content_text += block.text
                    span.output = content_text

                # mark as successful
                span.complete(status="success")
                
                # Send to collector
                collector = get_collector()
                collector.collect(span)

                return response
        
        except Exception as e:
            span.set_error(e)
            span.complete(status="error")
            
            # Send to collector even on error
            collector = get_collector()
            collector.collect(span)
            
            raise

        finally:
            # Restore previous span context
            set_current_span(previous_span)

# global instrumentor instance
_anthropic_instrumentor = AnthropicInstrumentor()

# enable automatic anthropic instrumentation
def instrument_anthropic():
    _anthropic_instrumentor.instrument()

# disable automatic anthropic instrumentation
def uninstrument_anthropic():
    _anthropic_instrumentor.uninstrument()