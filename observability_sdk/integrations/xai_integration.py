"""
Auto-instrumentation for xAI (Grok) API calls.
Automatically wraps xAI calls to capture spans.
xAI uses OpenAI-compatible API with base URL: https://api.x.ai/v1
"""

import time
from typing import Optional, Any
import functools
from ..core.span import Span
from ..collector.collector import get_collector
from ..core.context import get_current_span, set_current_span
from ..collector.config import get_config


# xAI (Grok) pricing per 1M tokens (updated 12.19.25)
XAI_PRICING = {
    # Grok 4.1 family
    "grok-4-1-fast-reasoning": {"input": 0.2, "output": 0.5},
    "grok-4-1-fast-non-reasoning": {"input": 0.2, "output": 0.5},

    # Grok 4 family
    "grok-code-fast-1": {"input": 0.2, "output": 1.5},
    "grok-4-fast-reasoning": {"input": 0.2, "output": 0.5},
    "grok-4-fast-non-reasoning": {"input": 0.2, "output": 0.5},
    "grok-4-0709": {"input": 3.0, "output": 15.0},

    # Grok 3 family
    "grok-3-mini": {"input": 0.3, "output": 0.5},
    "grok-3": {"input": 3.0, "output": 15.0},

    # Grok 2 family
    "grok-2-vision-1212": {"input": 2.0, "output": 10.0},

    # Image generation
    "grok-2-image-1212": {"input": 0.0, "output": 0.07},  # per image
}


def calculate_xai_cost(model: str, input_tokens: int, output_tokens: int) -> float:
    """Calculate cost for xAI API call"""
    base_model = model

    # Remove date suffixes if present
    if "-202" in model or "-20" in model:
        parts = model.split("-")
        base_model = "-".join(parts[:-1]) if parts[-1].isdigit() or parts[-1].startswith("202") else model

    pricing = XAI_PRICING.get(base_model)
    if not pricing:
        pricing = XAI_PRICING["grok-4-1-fast-reasoning"]
        print(f"Unknown xAI model '{model}', using grok-4-1-fast-reasoning pricing as fallback")

    input_cost = (input_tokens / 1_000_000) * pricing["input"]
    output_cost = (output_tokens / 1_000_000) * pricing["output"]

    return input_cost + output_cost


def extract_prompt_from_messages(messages: list) -> str:
    """Convert xAI message array to a single prompt string"""
    if not messages:
        return ""

    formatted = []
    for msg in messages:
        role = msg.get("role", "unknown")
        content = msg.get("content", "")
        formatted.append(f"{role}: {content}")

    return "\n".join(formatted)


class XAIInstrumentor:
    """Handles automatic instrumentation of xAI API calls"""

    def __init__(self):
        self.original_create = None
        self.instrumented = False

    def instrument(self):
        """Monkey-patch OpenAI SDK to intercept xAI calls"""
        if self.instrumented:
            return

        try:
            import openai
            from openai.resources.chat import completions
        except ImportError:
            print("OpenAI package not installed. xAI integration requires openai package.")
            return

        # Note: Users should initialize OpenAI client with xAI base URL:
        # client = OpenAI(api_key=xai_key, base_url="https://api.x.ai/v1")
        # This instrumentor will work automatically when they use that client

        try:
            original_create = completions.Completions.create

            @functools.wraps(original_create)
            def wrapped_create(self, *args, **kwargs):
                # Check if this is an xAI call by inspecting the client's base_url
                if hasattr(self, '_client') and hasattr(self._client, 'base_url'):
                    base_url = str(self._client.base_url)
                    if 'x.ai' in base_url:
                        return _xai_instrumentor._trace_xai_call(original_create, self, *args, **kwargs)

                # If not xAI, call original
                return original_create(self, *args, **kwargs)

            completions.Completions.create = wrapped_create
            self.original_create = original_create
            self.instrumented = True

            print("xAI instrumentation enabled")

        except Exception as e:
            print(f"Could not instrument xAI: {e}")

    def uninstrument(self):
        """Remove instrumentation and restore original methods"""
        if not self.instrumented:
            return

        try:
            from openai.resources.chat import completions
            if self.original_create:
                completions.Completions.create = self.original_create

            self.instrumented = False
            print("xAI instrumentation disabled")

        except Exception as e:
            print(f"Error uninstrumenting xAI: {e}")

    def _wrap_xai_stream(self, stream_response, span):
        """Wraps xAI streaming response to capture metrics"""
        first_chunk_time = None
        full_content = ""
        chunk_count = 0
        start_time = time.time()

        try:
            for chunk in stream_response:
                if first_chunk_time is None:
                    first_chunk_time = time.time()
                    span.time_to_first_token = (first_chunk_time - start_time) * 1000

                # Extract content from chunk
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
            end_time = time.time()
            span.output = full_content

            # Try to extract token usage from last chunk
            if hasattr(chunk, 'usage') and chunk.usage:
                span.input_tokens = chunk.usage.prompt_tokens
                span.output_tokens = chunk.usage.completion_tokens
                span.total_cost = calculate_xai_cost(
                    span.model or "unknown",
                    span.input_tokens or 0,
                    span.output_tokens or 0
                )

            # Calculate tokens per second
            if first_chunk_time and span.output_tokens and span.output_tokens > 0:
                stream_duration = end_time - first_chunk_time
                if stream_duration > 0:
                    span.tokens_per_second = span.output_tokens / stream_duration

            # Mark as successful
            if span.status == "running":
                span.complete(status="success")
            elif span.status == "error":
                span.complete(status="error")

            # Send span to collector
            collector = get_collector()
            collector.collect(span)

    def _trace_xai_call(self, original_func, *args, **kwargs):
        """Wrap an xAI API call with span tracking"""
        config = get_config()

        model = kwargs.get("model", "unknown")
        messages = kwargs.get("messages", [])
        is_streaming = kwargs.get("stream", False)

        # Get parent context
        parent_span = get_current_span()

        # Create span
        span = Span(
            name=f"xai.{model}",
            span_type="llm",
            user_id=config.user_id or "00000000-0000-0000-0000-000000000000",
            agent_id=config.project_id,
            model=model,
            prompt=extract_prompt_from_messages(messages),
            is_streaming=is_streaming,
        )

        # If there is a parent, inherit its trace_id and set parent relationship
        if parent_span:
            span.trace_id = parent_span.trace_id
            span.parent_span_id = [parent_span.span_id]

        # Set this span as the active span
        previous_span = get_current_span()
        set_current_span(span)

        try:
            # Call the actual xAI API
            response = original_func(*args, **kwargs)

            # Handle streaming vs non-streaming
            if is_streaming:
                wrapped_response = self._wrap_xai_stream(response, span)
                return wrapped_response

            # Extract token usage from response
            if hasattr(response, "usage") and response.usage:
                span.input_tokens = response.usage.prompt_tokens
                span.output_tokens = response.usage.completion_tokens
                span.total_cost = calculate_xai_cost(
                    model,
                    span.input_tokens or 0,
                    span.output_tokens or 0
                )

            # Extract completion
            if hasattr(response, "choices") and response.choices:
                first_choice = response.choices[0]
                if hasattr(first_choice, "message"):
                    span.output = first_choice.message.content or ""

            # Mark as successful
            span.complete(status="success")

            return response

        except Exception as e:
            span.set_error(e)
            span.complete(status="error")
            raise

        finally:
            # For non-streaming, send span to collector
            if not is_streaming:
                collector = get_collector()
                collector.collect(span)

            # Restore previous span context
            set_current_span(previous_span)


# Global instrumentor instance
_xai_instrumentor = XAIInstrumentor()


def instrument_xai():
    """Enable automatic xAI instrumentation"""
    _xai_instrumentor.instrument()


def uninstrument_xai():
    """Disable automatic xAI instrumentation"""
    _xai_instrumentor.uninstrument()
