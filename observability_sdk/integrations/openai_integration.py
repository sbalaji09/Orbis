"""
Auto-instrumentation for OpenAI API calls.
Automatically wraps OpenAI calls to capture spans
"""

import time
from typing import Optional, Any
import functools
from ..core.span import Span
from ..collector.collector import get_collector
from ..core.context import get_current_span, set_current_span


# openai pricing per 1M tokens (updated 11.12.25)
OPENAI_PRICING = {
    # GPT-5 family
    "gpt-5": {"input": 1.25, "output": 10.0},
    "gpt-5-mini": {"input": 0.25, "output": 2.0},
    "gpt-5-nano": {"input": 0.05, "output": 0.4},
    "gpt-5-pro": {"input": 15.0, "output": 120.0},
    
    # GPT-4 family
    "gpt-4": {"input": 30.0, "output": 60.0},
    "gpt-4-turbo": {"input": 10.0, "output": 30.0},
    "gpt-4o": {"input": 5.0, "output": 15.0},
    "gpt-4o-mini": {"input": 0.150, "output": 0.600},
    
    # GPT-3.5
    "gpt-3.5-turbo": {"input": 0.50, "output": 1.50},
    
    # o1 family
    "o1-preview": {"input": 15.0, "output": 60.0},
    "o1-mini": {"input": 3.0, "output": 12.0},
}

# calculate cost for openai api call
def calculate_openai_cost(model: str, input_tokens: int, output_tokens: int) -> float:
    base_model = model

    # remove date suffixes if present
    if "-202" in model or "-20" in model:
        parts = model.split("-")
        base_model = "-".join(parts[:-1]) if parts[-1].isdigit() or parts[-1].startswith("202") else model
    
    # Get pricing (moved outside if block)
    pricing = OPENAI_PRICING.get(base_model)
    if not pricing:
        pricing = OPENAI_PRICING["gpt-5"]
        print(f"Unknown model '{model}', using gpt-5 pricing as fallback")
    
    input_cost = (input_tokens / 1_000_000) * pricing["input"]
    output_cost = (output_tokens / 1_000_000) * pricing["output"]

    return input_cost + output_cost

# convert openai message array to a single prompt string
def extract_prompt_from_messages(messages: list) -> str:
    if not messages:
        return ""

    formatted = []
    for msg in messages:
        role = msg.get("role", "unknown")  # ✅ Fixed: was "content"
        content = msg.get("content", "")
        formatted.append(f"{role}: {content}")
    
    return "\n".join(formatted)

# handles automatic instrumentation of openai api calls
class OpenAIInstrumentor:

    def __init__(self):
        self.original_create = None
        self.original_create_async = None
        self.instrumented = False
    
    # monkey-patch openai to add automatic span tracking
    def instrument(self):
        if self.instrumented:
            return 
        
        try:
            import openai
            from openai.resources.chat import completions
        except ImportError:
            print("OpenAI package not installed. Skipping OpenAI instrumentation.")
            return

        # Wrap the completions.create method at class level
        try:
            original_create = completions.Completions.create
            
            @functools.wraps(original_create)
            def wrapped_create(self, *args, **kwargs):
                return _openai_instrumentor._trace_openai_call(original_create, self, *args, **kwargs)
            
            completions.Completions.create = wrapped_create  # ← This line, not openai.chat.completions.create
            self.original_create = original_create
            self.instrumented = True

            print("OpenAI instrumentation enabled")
        
        except Exception as e:
            print(f"Could not instrument OpenAI: {e}")
    
    # remove instrumentation and restore original openai methods
    def uninstrument(self):
        if not self.instrumented:
            return

        try:
            import openai
            from openai.resources.chat import completions
            if self.original_create:
                completions.Completions.create = self.original_create
            
            self.instrumented = False
            print("OpenAI instrumentation disabled")
        
        except Exception as e:
            print(f"Error uninstrumenting OpenAI: {e}")
    
    # wraps openai streaming response to capture metrics
    def _wrap_openai_stream(self, stream_response, span):
    
        first_chunk_time = None
        full_content = ""
        chunk_count = 0
        start_time = time.time()

        try:
            for chunk in stream_response:
                if first_chunk_time is None:
                    first_chunk_time = time.time()
                    span.time_to_first_token = (first_chunk_time - start_time) * 1000

                # extract content from chunk
                if hasattr(chunk, "choices") and chunk.choices:
                    delta = chunk.choices[0].delta
                    if hasattr(delta, "content") and delta.content:
                        full_content += delta.content
                        chunk_count += 1
                
                # Yield chunk to user (pass-through)
                yield chunk
        
        except Exception as e:
            span.set_error(e)
            raise
        
        finally:
            # This ALWAYS runs, even if generator not fully consumed
            end_time = time.time()
            
            # Set output
            span.output = full_content

            # Try to extract token usage from last chunk (if available)
            # Note: OpenAI's latest streaming API may include usage in final chunk
            if hasattr(chunk, 'usage') and chunk.usage:
                span.input_tokens = chunk.usage.prompt_tokens
                span.output_tokens = chunk.usage.completion_tokens
                span.total_cost = calculate_openai_cost(
                    span.model or "unknown",
                    span.input_tokens or 0,
                    span.output_tokens or 0
                )
            
            # Calculate tokens per second
            if first_chunk_time and span.output_tokens and span.output_tokens > 0:
                stream_duration = end_time - first_chunk_time
                if stream_duration > 0:
                    span.tokens_per_second = span.output_tokens / stream_duration
            
            # Mark as successful (unless error was already set)
            if span.status == "running":
                span.complete(status="success")
            elif span.status == "error":
                span.complete(status="error")
            
            # Send span to collector after stream completes
            collector = get_collector()
            collector.collect(span)
    
    # wrap an openai api call with span tracking
    def _trace_openai_call(self, original_func, *args, **kwargs):
        model = kwargs.get("model", "unknown")
        messages = kwargs.get("messages", [])
        is_streaming = kwargs.get("stream", False)

        # get parent context
        parent_span = get_current_span()

        # create span
        span = Span(
            name=f"openai.{model}",
            user_id="00000000-0000-0000-0000-000000000000",
            agent_id="af913dc2-732e-42a6-a113-a80c694d71bf",
            model=model,
            prompt=extract_prompt_from_messages(messages),
            is_streaming=is_streaming,
        )

        # if there is a parent, inherit its trace_id and set parent relationship
        if parent_span:
            span.trace_id = parent_span.trace_id
            span.parent_span_id = [parent_span.span_id]

        # set this span as the active span
        previous_span = get_current_span()
        set_current_span(span)

        try:
            # call the actual openai api
            response = original_func(*args, **kwargs)

            # handle streaming vs non-streaming
            if is_streaming:
                # wrap the streaming response
                wrapped_response = self._wrap_openai_stream(response, span)
                return wrapped_response

            # extract token usage from response
            if hasattr(response, "usage") and response.usage:
                span.input_tokens = response.usage.prompt_tokens
                span.output_tokens = response.usage.completion_tokens  # ✅ Fixed typo
                span.total_cost = calculate_openai_cost(
                    model,
                    span.input_tokens or 0,
                    span.output_tokens or 0
                )
            
            # extract completion
            if hasattr(response, "choices") and response.choices:
                first_choice = response.choices[0]  # ✅ Fixed: was "choice"
                if hasattr(first_choice, "message"):
                    span.output = first_choice.message.content or ""

            # mark as successful
            span.complete(status="success")

            return response
        
        except Exception as e:
            span.set_error(e)
            span.complete(status="error")

            raise

        finally:
            # For non-streaming, send span to collector
            # For streaming, the wrapper handles collection
            if not is_streaming:
                collector = get_collector()
                collector.collect(span)

            # restore previous span context
            set_current_span(previous_span)


# global instrumentor instance
_openai_instrumentor = OpenAIInstrumentor()

# enable automatic openai instrumentation
def instrument_openai():
    _openai_instrumentor.instrument()

# disable automatic openai instrumentation
def uninstrument_openai():
    _openai_instrumentor.uninstrument()