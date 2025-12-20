"""
Auto-instrumentation for Google Gemini API calls.
Automatically wraps Gemini calls to capture spans
"""

from typing import Optional, Any
import functools
import time
from ..core.span import Span
from ..collector.collector import get_collector
from ..core.context import get_current_span, set_current_span
from ..collector.config import get_config

# Gemini pricing per 1M tokens (updated 12.19.25)
# Note: Using paid tier pricing. Free tier has usage limits but $0 cost.
GEMINI_PRICING = {
    # Gemini 3 family
    "gemini-3-pro-preview": {"input": 2.0, "output": 12.0},  # text input; prompts <= 200k
    "gemini-3-flash-preview": {"input": 0.5, "output": 3.0},  # text input
    "gemini-3-pro-image-preview": {"input": 2.0, "output": 12.0},  # text portion

    # Gemini 2.5 family
    "gemini-2.5-pro": {"input": 1.25, "output": 10.0},  # prompts <= 200k
    "gemini-2.5-flash": {"input": 0.3, "output": 2.5},  # text input
    "gemini-2.5-flash-preview-09-2025": {"input": 0.3, "output": 2.5},
    "gemini-2.5-flash-lite": {"input": 0.1, "output": 0.4},  # text input
    "gemini-2.5-flash-lite-preview-09-2025": {"input": 0.1, "output": 0.4},
    "gemini-2.5-flash-native-audio-preview-12-2025": {"input": 0.5, "output": 2.0},  # text input
    "gemini-2.5-flash-image": {"input": 0.3, "output": 0.039},  # per image output
    "gemini-2.5-flash-preview-tts": {"input": 0.5, "output": 10.0},  # audio output
    "gemini-2.5-pro-preview-tts": {"input": 1.0, "output": 20.0},  # audio output

    # Gemini 2.0 family
    "gemini-2.0-flash": {"input": 0.1, "output": 0.4},  # text input
    "gemini-2.0-flash-lite": {"input": 0.075, "output": 0.3},
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
        self.original_generate_stream = None
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
            # Patch BOTH generate_content (non-streaming) and generate_content_stream (streaming)
            original_generate = Models.generate_content
            original_generate_stream = Models.generate_content_stream
            
            @functools.wraps(original_generate)
            def wrapped_generate(self, *args, **kwargs):
                return _gemini_instrumentor._trace_gemini_call(
                    original_generate, self, *args, is_streaming=False, **kwargs
                )
            
            @functools.wraps(original_generate_stream)
            def wrapped_generate_stream(self, *args, **kwargs):
                return _gemini_instrumentor._trace_gemini_call(
                    original_generate_stream, self, *args, is_streaming=True, **kwargs
                )
            
            Models.generate_content = wrapped_generate
            Models.generate_content_stream = wrapped_generate_stream
            
            self.original_generate = original_generate
            self.original_generate_stream = original_generate_stream
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
            if self.original_generate_stream:
                Models.generate_content_stream = self.original_generate_stream
            
            self.instrumented = False
            print("Gemini instrumentation disabled")
        
        except Exception as e:
            print(f"Error uninstrumenting Gemini: {e}")
    
    def _trace_gemini_call(self, original_func, models_self, *args, is_streaming=False, **kwargs):
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

        config = get_config()
        
        # Create span
        span = Span(
            name=f"gemini.{model_name}",
            user_id=config.user_id,
            agent_id=config.project_id,
            model=model_name,
            prompt=prompt,
            is_streaming=is_streaming,
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
            
            # Handle streaming vs non-streaming
            if is_streaming:
                # Wrap the streaming response
                wrapped_response = self._wrap_gemini_stream(response, span, model_name)
                return wrapped_response
            else:
                # Non-streaming: extract data immediately
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
    
    def _wrap_gemini_stream(self, stream_response, span, model_name):
        """Wraps Gemini streaming response to capture metrics"""
        first_chunk_time = None
        full_content = ""
        chunk_count = 0
        start_time = time.time()
        total_input_tokens = 0
        total_output_tokens = 0
        
        try:
            for chunk in stream_response:
                # Record time to first token
                if first_chunk_time is None:
                    first_chunk_time = time.time()
                    span.time_to_first_token = (first_chunk_time - start_time) * 1000  # Convert to ms
                
                # Extract text content
                if hasattr(chunk, 'text') and chunk.text:
                    full_content += chunk.text
                    chunk_count += 1
                
                # Extract token usage if available
                if hasattr(chunk, 'usage_metadata'):
                    usage = chunk.usage_metadata
                    total_input_tokens = getattr(usage, 'prompt_token_count', 0)
                    total_output_tokens = getattr(usage, 'candidates_token_count', 0)
                
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
            
            # Set token counts
            span.input_tokens = total_input_tokens
            span.output_tokens = total_output_tokens
            
            # Calculate cost
            span.total_cost = calculate_gemini_cost(model_name, total_input_tokens, total_output_tokens)
            
            # Calculate tokens per second
            if first_chunk_time and total_output_tokens > 0:
                stream_duration = end_time - first_chunk_time
                if stream_duration > 0:
                    span.tokens_per_second = total_output_tokens / stream_duration
            
            # Mark as successful (unless error was already set)
            if span.status == "running":
                span.complete(status="success")
            elif span.status == "error":
                span.complete(status="error")
            
            # Send span to collector after stream completes
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