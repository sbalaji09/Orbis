"""
Auto-instrumentation for DeepSeek API calls.
Automatically wraps DeepSeek calls to capture spans.
DeepSeek uses OpenAI-compatible API with base URL: https://api.deepseek.com/v1
"""

import time
from typing import Optional, Any
import functools
from ..core.span import Span
from ..collector.collector import get_collector
from ..core.context import get_current_span, set_current_span
from ..collector.config import get_config


# DeepSeek pricing per 1M tokens (updated 12.19.25)
# Note: Cache hit pricing ($0.028/M) is significantly cheaper but not tracked separately here
DEEPSEEK_PRICING = {
    # DeepSeek V3.2 models
    "deepseek-chat": {"input": 0.28, "output": 0.42},  # non-thinking mode
    "deepseek-reasoner": {"input": 0.28, "output": 0.42},  # thinking mode

    # Aliases
    "deepseek-v3.2": {"input": 0.28, "output": 0.42},
    "deepseek-v3": {"input": 0.28, "output": 0.42},
}


def calculate_deepseek_cost(model: str, input_tokens: int, output_tokens: int) -> float:
    """Calculate cost for DeepSeek API call"""
    base_model = model

    # Normalize model names (remove version suffixes)
    if "-202" in model or "-20" in model:
        parts = model.split("-")
        base_model = "-".join(parts[:-1]) if parts[-1].isdigit() or parts[-1].startswith("202") else model

    pricing = DEEPSEEK_PRICING.get(base_model)
    if not pricing:
        # Default to deepseek-chat pricing
        pricing = DEEPSEEK_PRICING["deepseek-chat"]
        print(f"Unknown DeepSeek model '{model}', using deepseek-chat pricing as fallback")

    input_cost = (input_tokens / 1_000_000) * pricing["input"]
    output_cost = (output_tokens / 1_000_000) * pricing["output"]

    return input_cost + output_cost


def extract_prompt_from_messages(messages: list) -> str:
    """Convert DeepSeek message array to a single prompt string"""
    if not messages:
        return ""

    formatted = []
    for msg in messages:
        role = msg.get("role", "unknown")
        content = msg.get("content", "")
        formatted.append(f"{role}: {content}")

    return "\n".join(formatted)


class DeepSeekInstrumentor:
    """Handles automatic instrumentation of DeepSeek API calls"""

    def __init__(self):
        self.original_create = None
        self.instrumented = False

    def instrument(self):
        """Monkey-patch OpenAI SDK to intercept DeepSeek calls"""
        if self.instrumented:
            return

        try:
            import openai
            from openai.resources.chat import completions
        except ImportError:
            print("OpenAI package not installed. DeepSeek integration requires openai package.")
            return

        # Note: Users should initialize OpenAI client with DeepSeek base URL:
        # client = OpenAI(api_key=deepseek_key, base_url="https://api.deepseek.com/v1")

        try:
            original_create = completions.Completions.create

            @functools.wraps(original_create)
            def wrapped_create(self, *args, **kwargs):
                # Check if this is a DeepSeek call by inspecting the client's base_url
                if hasattr(self, '_client') and hasattr(self._client, 'base_url'):
                    base_url = str(self._client.base_url)
                    if 'deepseek.com' in base_url:
                        return _deepseek_instrumentor._trace_deepseek_call(original_create, self, *args, **kwargs)

                # If not DeepSeek, call original
                return original_create(self, *args, **kwargs)

            completions.Completions.create = wrapped_create
            self.original_create = original_create
            self.instrumented = True

            print("DeepSeek instrumentation enabled")

        except Exception as e:
            print(f"Could not instrument DeepSeek: {e}")

    def uninstrument(self):
        """Remove instrumentation and restore original methods"""
        if not self.instrumented:
            return

        try:
            from openai.resources.chat import completions
            if self.original_create:
                completions.Completions.create = self.original_create

            self.instrumented = False
            print("DeepSeek instrumentation disabled")

        except Exception as e:
            print(f"Error uninstrumenting DeepSeek: {e}")

    def _wrap_deepseek_stream(self, stream_response, span):
        """Wraps DeepSeek streaming response to capture metrics"""
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
                span.total_cost = calculate_deepseek_cost(
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

    def _trace_deepseek_call(self, original_func, *args, **kwargs):
        """Wrap a DeepSeek API call with span tracking"""
        config = get_config()

        model = kwargs.get("model", "unknown")
        messages = kwargs.get("messages", [])
        is_streaming = kwargs.get("stream", False)

        # Get parent context
        parent_span = get_current_span()

        # Create span
        span = Span(
            name=f"deepseek.{model}",
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
            # Call the actual DeepSeek API
            response = original_func(*args, **kwargs)

            # Handle streaming vs non-streaming
            if is_streaming:
                wrapped_response = self._wrap_deepseek_stream(response, span)
                return wrapped_response

            # Extract token usage from response
            if hasattr(response, "usage") and response.usage:
                span.input_tokens = response.usage.prompt_tokens
                span.output_tokens = response.usage.completion_tokens
                span.total_cost = calculate_deepseek_cost(
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
_deepseek_instrumentor = DeepSeekInstrumentor()


def instrument_deepseek():
    """Enable automatic DeepSeek instrumentation"""
    _deepseek_instrumentor.instrument()


def uninstrument_deepseek():
    """Disable automatic DeepSeek instrumentation"""
    _deepseek_instrumentor.uninstrument()
