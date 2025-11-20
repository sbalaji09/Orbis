"""
Auto-instrumentation for Google Gemini API calls.
Automatically wraps Gemini calls to capture spans
"""

from typing import Optional, Any
import functools
from ..core.span import Span
from ..collector.collector import get_collector
from ..core.context import get_current_span, set_current_span

# Gemini pricing per 1M tokens (updated 11.19.25)
GEMINI_PRICING = {
    # Gemini 2.5 family (FREE)
    "gemini-2.5-pro": {"input": 0.0, "output": 0.0},
    "gemini-2.5-flash": {"input": 0.0, "output": 0.0},
    "gemini-2.5-flash-preview-09-2025": {"input": 0.0, "output": 0.0},
    "gemini-2.5-flash-lite": {"input": 0.0, "output": 0.0},
    
    # Gemini 2.0 family (FREE)
    "gemini-2.0-flash": {"input": 0.0, "output": 0.0},
    "gemini-2.0-flash-lite": {"input": 0.0, "output": 0.0},
}

def calculate_gemini_cost(model: str, input_tokens: int, output_tokens: int) -> float:
    """Calculate cost for Gemini API call"""
    pricing = GEMINI_PRICING.get(model, {"input": 0.0, "output": 0.0})
    
    input_cost = (input_tokens / 1_000_000) * pricing["input"]
    output_cost = (output_tokens / 1_000_000) * pricing["output"]
    
    return input_cost + output_cost

class GeminiInstrumentor:
    def __init__(self):
        self.original_generate = None
        self.instrumented = False
    
    def instrument(self):
        """Monkey-patch Gemini to add automatic span tracking"""
        if self.instrumented:
            return
        
        try:
            from google.genai.models import Models
        except ImportError:
            print("google-genai package not installed. Skipping Gemini instrumentation.")
            return
        
        try:
            # Patch the Models.generate_content method
            original_generate = Models.generate_content
            
            @functools.wraps(original_generate)
            def wrapped_generate(self, *args, **kwargs):
                return _gemini_instrumentor._trace_gemini_call(
                    original_generate, self, *args, **kwargs
                )
            
            Models.generate_content = wrapped_generate
            self.original_generate = original_generate
            self.instrumented = True
            
            print("Gemini instrumentation enabled")
        
        except AttributeError as e:
            print(f"Could not instrument Gemini: {e}")
    
    def uninstrument(self):
        """Remove instrumentation and restore original Gemini methods"""
        if not self.instrumented:
            return
        
        try:
            from google.genai.models import Models
            if self.original_generate:
                Models.generate_content = self.original_generate
            
            self.instrumented = False
            print("Gemini instrumentation disabled")
        
        except Exception as e:
            print(f"Error uninstrumenting Gemini: {e}")
    
    def _trace_gemini_call(self, original_func, models_self, *args, **kwargs):
        """Wrap a Gemini API call with span tracking"""
        
        # Extract model name and content
        model_name = kwargs.get("model", "unknown")
        contents = kwargs.get("contents", "")
        
        # Convert contents to string prompt
        if isinstance(contents, str):
            prompt = contents
        else:
            prompt = str(contents)
        
        # Get parent context
        parent_span = get_current_span()
        
        # Create span
        span = Span(
            name=f"gemini.{model_name}",
            user_id="00000000-0000-0000-0000-000000000000",
            agent_id="af913dc2-732e-42a6-a113-a80c694d71bf",
            model=model_name,
            prompt=prompt,
        )
        
        # Inherit trace context if parent exists
        if parent_span:
            span.trace_id = parent_span.trace_id
            span.parent_span_id = [parent_span.span_id]
        
        # Set as active span
        previous_span = get_current_span()
        set_current_span(span)
        
        try:
            # Call actual Gemini API
            response = original_func(models_self, *args, **kwargs)
            
            # Extract token usage
            if hasattr(response, 'usage_metadata'):
                usage = response.usage_metadata
                span.input_tokens = getattr(usage, 'prompt_token_count', 0)
                span.output_tokens = getattr(usage, 'candidates_token_count', 0)
                span.total_cost = calculate_gemini_cost(
                    model_name,
                    span.input_tokens or 0,
                    span.output_tokens or 0
                )
            
            # Extract completion text
            if hasattr(response, 'text'):
                span.output = response.text or ""
            
            # Mark as successful
            span.complete(status="success")
            
            return response
        
        except Exception as e:
            span.set_error(e)
            span.complete(status="error")
            raise
        
        finally:
            # Restore previous span context
            set_current_span(previous_span)
            
            # Send span to collector
            collector = get_collector()
            collector.collect(span)

# Global instrumentor instance
_gemini_instrumentor = GeminiInstrumentor()

def instrument_gemini():
    """Enable automatic Gemini instrumentation"""
    _gemini_instrumentor.instrument()

def uninstrument_gemini():
    """Disable automatic Gemini instrumentation"""
    _gemini_instrumentor.uninstrument()