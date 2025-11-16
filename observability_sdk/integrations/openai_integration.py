"""
Auto-instrumentation for OpenAI API calls.
Automatically wraps OpenAI calls to capture spans
"""

from typing import Optional, Any
import functools
from ..core.span import Span
from ..collector.collector import get_collector

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
        except ImportError:
            print("OpenAI package not installed. Skipping OpenAI instrumentation.")
            return

        # wrap the chat completions create method
        try:
            original_create = openai.chat.completions.create
            
            @functools.wraps(original_create)
            def wrapped_create(*args, **kwargs):
                return self._trace_openai_call(original_create, *args, **kwargs)
            
            openai.chat.completions.create = wrapped_create
            self.original_create = original_create
            self.instrumented = True

            print("OpenAI instrumentation enabled")
        
        except AttributeError as e:
            print(f"Could not instrument OpenAI: {e}")
    
    # remove instrumentation and restore original openai methods
    def uninstrument(self):
        if not self.instrumented:
            return

        try:
            import openai
            if self.original_create:
                openai.chat.completions.create = self.original_create
            
            self.instrumented = False
            print("OpenAI instrumentation disabled")
        
        except Exception as e:
            print(f"Error uninstrumenting OpenAI: {e}")
    
    # wrap an openai api call with span tracking
    def _trace_openai_call(self, original_func, *args, **kwargs):
        model = kwargs.get("model", "unknown")
        messages = kwargs.get("messages", [])

        # create span
        span = Span(
            name=f"openai.{model}",
            model=model,
            prompt=extract_prompt_from_messages(messages),
        )

        try:
            # call the actual openai api
            response = original_func(*args, **kwargs)

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
            # send span to collector
            collector = get_collector()
            collector.collect(span)

# global instrumentor instance
_openai_instrumentor = OpenAIInstrumentor()

# enable automatic openai instrumentation
def instrument_openai():
    _openai_instrumentor.instrument()

# disable automatic openai instrumentation
def uninstrument_openai():
    _openai_instrumentor.uninstrument()