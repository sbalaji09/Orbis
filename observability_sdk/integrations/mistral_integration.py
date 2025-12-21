"""
Auto-instrumentation for Mistral AI API calls.
Automatically wraps Mistral calls to capture spans.
Mistral uses OpenAI-compatible API with base URL: https://api.mistral.ai/v1
"""

import time
from typing import Optional, Any
import functools
from ..core.span import Span
from ..collector.collector import get_collector
from ..core.context import get_current_span, set_current_span
from ..collector.config import get_config


# Mistral pricing per 1M tokens (updated 12.19.25)
MISTRAL_PRICING = {
    # Premier models - Large
    "mistral-large-latest": {"input": 0.5, "output": 1.5},
    "mistral-large-3": {"input": 0.5, "output": 1.5},

    # Premier models - Medium
    "mistral-medium-latest": {"input": 0.4, "output": 2.0},
    "mistral-medium-3": {"input": 0.4, "output": 2.0},

    # Magistral (reasoning models)
    "magistral-medium-latest": {"input": 2.0, "output": 5.0},
    "magistral-small-latest": {"input": 0.5, "output": 1.5},

    # Ministral (lightweight models)
    "ministral-3b-latest": {"input": 0.1, "output": 0.1},
    "ministral-8b-latest": {"input": 0.15, "output": 0.15},
    "ministral-14b-latest": {"input": 0.2, "output": 0.2},

    # Devstral (coding models - free)
    "devstral-medium-latest": {"input": 0.0, "output": 0.0},
    "devstral-small-latest": {"input": 0.0, "output": 0.0},

    # Codestral
    "codestral-latest": {"input": 0.3, "output": 0.9},

    # Mistral Small
    "mistral-small-latest": {"input": 0.1, "output": 0.3},
    "mistral-small-3.2": {"input": 0.1, "output": 0.3},
    "mistral-small-creative": {"input": 0.1, "output": 0.3},
    "labs-mistral-small-creative": {"input": 0.1, "output": 0.3},

    # Voxtral (voice models)
    "voxtral-small-latest": {"input": 0.1, "output": 0.3},  # text portion
    "voxtral-mini-latest": {"input": 0.04, "output": 0.04},  # text portion
    "voxtral-mini-transcribe": {"input": 0.002, "output": 0.0},  # per minute audio

    # Pixtral (vision models)
    "pixtral-large-latest": {"input": 2.0, "output": 6.0},
    "pixtral-12b": {"input": 0.15, "output": 0.15},

    # Embedding models
    "mistral-embed": {"input": 0.1, "output": 0.0},
    "codestral-embed-2505": {"input": 0.15, "output": 0.0},

    # Moderation
    "mistral-moderation-latest": {"input": 0.1, "output": 0.0},

    # Open models (NeMo, 7B, Mixtral)
    "open-mistral-nemo": {"input": 0.15, "output": 0.15},
    "open-mistral-7b": {"input": 0.25, "output": 0.25},
    "open-mixtral-8x7b": {"input": 0.7, "output": 0.7},
    "open-mixtral-8x22b": {"input": 2.0, "output": 6.0},
}


def calculate_mistral_cost(model: str, input_tokens: int, output_tokens: int) -> float:
    """Calculate cost for Mistral API call"""
    base_model = model

    # Normalize model names (remove version suffixes)
    if "-202" in model or "-20" in model:
        parts = model.split("-")
        base_model = "-".join(parts[:-1]) if parts[-1].isdigit() or parts[-1].startswith("202") else model

    pricing = MISTRAL_PRICING.get(base_model)
    if not pricing:
        # Default to mistral-large pricing
        pricing = MISTRAL_PRICING["mistral-large-latest"]
        print(f"Unknown Mistral model '{model}', using mistral-large-latest pricing as fallback")

    input_cost = (input_tokens / 1_000_000) * pricing["input"]
    output_cost = (output_tokens / 1_000_000) * pricing["output"]

    return input_cost + output_cost


def extract_prompt_from_messages(messages: list) -> str:
    """Convert Mistral message array to a single prompt string"""
    if not messages:
        return ""

    formatted = []
    for msg in messages:
        role = msg.get("role", "unknown")
        content = msg.get("content", "")
        formatted.append(f"{role}: {content}")

    return "\n".join(formatted)


class MistralInstrumentor:
    """Handles automatic instrumentation of Mistral API calls"""

    def __init__(self):
        self.original_create = None
        self.instrumented = False

    def instrument(self):
        """Monkey-patch OpenAI SDK to intercept Mistral calls"""
        if self.instrumented:
            return

        try:
            import openai
            from openai.resources.chat import completions
        except ImportError:
            print("OpenAI package not installed. Mistral integration requires openai package.")
            return

        # Note: Users should initialize OpenAI client with Mistral base URL:
        # client = OpenAI(api_key=mistral_key, base_url="https://api.mistral.ai/v1")

        try:
            original_create = completions.Completions.create

            @functools.wraps(original_create)
            def wrapped_create(self, *args, **kwargs):
                # Check if this is a Mistral call by inspecting the client's base_url
                if hasattr(self, '_client') and hasattr(self._client, 'base_url'):
                    base_url = str(self._client.base_url)
                    if 'mistral.ai' in base_url:
                        return _mistral_instrumentor._trace_mistral_call(original_create, self, *args, **kwargs)

                # If not Mistral, call original
                return original_create(self, *args, **kwargs)

            completions.Completions.create = wrapped_create
            self.original_create = original_create
            self.instrumented = True

            print("Mistral instrumentation enabled")

        except Exception as e:
            print(f"Could not instrument Mistral: {e}")

    def uninstrument(self):
        """Remove instrumentation and restore original methods"""
        if not self.instrumented:
            return

        try:
            from openai.resources.chat import completions
            if self.original_create:
                completions.Completions.create = self.original_create

            self.instrumented = False
            print("Mistral instrumentation disabled")

        except Exception as e:
            print(f"Error uninstrumenting Mistral: {e}")

    def _wrap_mistral_stream(self, stream_response, span):
        """Wraps Mistral streaming response to capture metrics"""
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
                span.total_cost = calculate_mistral_cost(
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

    def _trace_mistral_call(self, original_func, *args, **kwargs):
        """Wrap a Mistral API call with span tracking"""
        config = get_config()

        model = kwargs.get("model", "unknown")
        messages = kwargs.get("messages", [])
        is_streaming = kwargs.get("stream", False)

        # Get parent context
        parent_span = get_current_span()

        # Create span
        span = Span(
            name=f"mistral.{model}",
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
            # Call the actual Mistral API
            response = original_func(*args, **kwargs)

            # Handle streaming vs non-streaming
            if is_streaming:
                wrapped_response = self._wrap_mistral_stream(response, span)
                return wrapped_response

            # Extract token usage from response
            if hasattr(response, "usage") and response.usage:
                span.input_tokens = response.usage.prompt_tokens
                span.output_tokens = response.usage.completion_tokens
                span.total_cost = calculate_mistral_cost(
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
_mistral_instrumentor = MistralInstrumentor()


def instrument_mistral():
    """Enable automatic Mistral instrumentation"""
    _mistral_instrumentor.instrument()


def uninstrument_mistral():
    """Disable automatic Mistral instrumentation"""
    _mistral_instrumentor.uninstrument()
