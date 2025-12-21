"""
Auto-instrumentation for Groq API calls.
Automatically wraps Groq calls to capture spans.
Groq uses OpenAI-compatible API with base URL: https://api.groq.com/openai/v1
"""

import time
from typing import Optional, Any
import functools
from ..core.span import Span
from ..collector.collector import get_collector
from ..core.context import get_current_span, set_current_span
from ..collector.config import get_config


# Groq pricing per 1M tokens (updated 12.19.25)
GROQ_PRICING = {
    # GPT OSS models
    "gpt-oss-20b-128k": {"input": 0.075, "output": 0.3},
    "gpt-oss-safeguard-20b": {"input": 0.075, "output": 0.3},
    "gpt-oss-120b-128k": {"input": 0.15, "output": 0.6},

    # Kimi
    "kimi-k2-0905-1t-256k": {"input": 1.0, "output": 3.0},

    # Llama 4 family
    "llama-4-scout-17bx16e-128k": {"input": 0.11, "output": 0.34},
    "llama-4-maverick-17bx128e-128k": {"input": 0.2, "output": 0.6},
    "llama-guard-4-12b-128k": {"input": 0.2, "output": 0.2},

    # Qwen3
    "qwen3-32b-131k": {"input": 0.29, "output": 0.59},

    # Llama 3.3 (most popular)
    "llama-3.3-70b-versatile": {"input": 0.59, "output": 0.79},
    "llama-3.3-70b-versatile-128k": {"input": 0.59, "output": 0.79},

    # Llama 3.1
    "llama-3.1-8b-instant": {"input": 0.05, "output": 0.08},
    "llama-3.1-8b-instant-128k": {"input": 0.05, "output": 0.08},
}


def calculate_groq_cost(model: str, input_tokens: int, output_tokens: int) -> float:
    """Calculate cost for Groq API call"""
    base_model = model

    # Normalize model names (remove version suffixes)
    if "-202" in model or "-20" in model:
        parts = model.split("-")
        base_model = "-".join(parts[:-1]) if parts[-1].isdigit() or parts[-1].startswith("202") else model

    pricing = GROQ_PRICING.get(base_model)
    if not pricing:
        # Default to Llama 3.3 70B pricing (most common)
        pricing = GROQ_PRICING["llama-3.3-70b-versatile"]
        print(f"Unknown Groq model '{model}', using llama-3.3-70b-versatile pricing as fallback")

    input_cost = (input_tokens / 1_000_000) * pricing["input"]
    output_cost = (output_tokens / 1_000_000) * pricing["output"]

    return input_cost + output_cost


def extract_prompt_from_messages(messages: list) -> str:
    """Convert Groq message array to a single prompt string"""
    if not messages:
        return ""

    formatted = []
    for msg in messages:
        role = msg.get("role", "unknown")
        content = msg.get("content", "")
        formatted.append(f"{role}: {content}")

    return "\n".join(formatted)


class GroqInstrumentor:
    """Handles automatic instrumentation of Groq API calls"""

    def __init__(self):
        self.original_create = None
        self.instrumented = False

    def instrument(self):
        """Monkey-patch OpenAI SDK to intercept Groq calls"""
        if self.instrumented:
            return

        try:
            import openai
            from openai.resources.chat import completions
        except ImportError:
            print("OpenAI package not installed. Groq integration requires openai package.")
            return

        # Note: Users should initialize OpenAI client with Groq base URL:
        # client = OpenAI(api_key=groq_key, base_url="https://api.groq.com/openai/v1")

        try:
            original_create = completions.Completions.create

            @functools.wraps(original_create)
            def wrapped_create(self, *args, **kwargs):
                # Check if this is a Groq call by inspecting the client's base_url
                if hasattr(self, '_client') and hasattr(self._client, 'base_url'):
                    base_url = str(self._client.base_url)
                    if 'groq.com' in base_url:
                        return _groq_instrumentor._trace_groq_call(original_create, self, *args, **kwargs)

                # If not Groq, call original
                return original_create(self, *args, **kwargs)

            completions.Completions.create = wrapped_create
            self.original_create = original_create
            self.instrumented = True

            print("Groq instrumentation enabled")

        except Exception as e:
            print(f"Could not instrument Groq: {e}")

    def uninstrument(self):
        """Remove instrumentation and restore original methods"""
        if not self.instrumented:
            return

        try:
            from openai.resources.chat import completions
            if self.original_create:
                completions.Completions.create = self.original_create

            self.instrumented = False
            print("Groq instrumentation disabled")

        except Exception as e:
            print(f"Error uninstrumenting Groq: {e}")

    def _wrap_groq_stream(self, stream_response, span):
        """Wraps Groq streaming response to capture metrics"""
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
                span.total_cost = calculate_groq_cost(
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

    def _trace_groq_call(self, original_func, *args, **kwargs):
        """Wrap a Groq API call with span tracking"""
        config = get_config()

        model = kwargs.get("model", "unknown")
        messages = kwargs.get("messages", [])
        is_streaming = kwargs.get("stream", False)

        # Get parent context
        parent_span = get_current_span()

        # Create span
        span = Span(
            name=f"groq.{model}",
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
            # Call the actual Groq API
            response = original_func(*args, **kwargs)

            # Handle streaming vs non-streaming
            if is_streaming:
                wrapped_response = self._wrap_groq_stream(response, span)
                return wrapped_response

            # Extract token usage from response
            if hasattr(response, "usage") and response.usage:
                span.input_tokens = response.usage.prompt_tokens
                span.output_tokens = response.usage.completion_tokens
                span.total_cost = calculate_groq_cost(
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
_groq_instrumentor = GroqInstrumentor()


def instrument_groq():
    """Enable automatic Groq instrumentation"""
    _groq_instrumentor.instrument()


def uninstrument_groq():
    """Disable automatic Groq instrumentation"""
    _groq_instrumentor.uninstrument()
