from functools import wraps
from typing import Optional, Callable
from ..core.span import Span
from ..collector.collector import get_collector


def observe(name: Optional[str] = None, trace_id: Optional[str] = None):
    """
    Decorator to automatically track function execution as a span.
    
    Usage:
        @observe()
        def my_function():
            # Your code here
            pass
        
        @observe(name="custom_name")
        def another_function():
            pass
    
    Args:
        name: Optional custom name for the span (defaults to function name)
        trace_id: Optional trace_id to group related spans together
    """
    def decorator(func: Callable) -> Callable:
        @wraps(func)
        def wrapper(*args, **kwargs):
            # create span with custom name or use function name
            span_name = name or func.__name__
            
            # create the span
            span = Span(
                name=span_name,
                trace_id=trace_id or Span.__dataclass_fields__['trace_id'].default_factory()
            )
            
            try:
                # execute the actual function
                result = func(*args, **kwargs)
                
                # mark span as successful
                span.complete(status="success")
                
                return result
                
            except Exception as e:
                # capture the error
                span.set_error(e)
                span.complete(status="error")
                
                # re-raise the exception so the program behaves normally
                raise
                
            finally:
                # send span to collector (replaces print)
                collector = get_collector()
                collector.collect(span)
        
        return wrapper
    return decorator