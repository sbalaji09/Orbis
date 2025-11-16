from functools import wraps
from typing import Optional, Callable
from ..core.span import Span
from ..collector.collector import get_collector
from ..core.context import get_current_span, set_current_span


def observe(name: Optional[str] = None, trace_id: Optional[str] = None, user_id: Optional[str]= None):
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

            # get parent context
            parent_span = get_current_span()
            
            # create the span
            span = Span(
                name=span_name,
                user_id=user_id or "sdk_auto",
                trace_id=trace_id or (parent_span.trace_id if parent_span else Span.__dataclass_fields__['trace_id'].default_factory())  # ✅ Inherit from parent
            )

            # if there's a parent, set parent relationship
            if parent_span:
                span.parent_span_id = [parent_span.span_id]
            
            # set this span as the active span
            previous_span = get_current_span()
            set_current_span(span)
            
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
                # restore previous span context
                set_current_span(previous_span)
                # send span to collector (replaces print)
                collector = get_collector()
                collector.collect(span)
        
        return wrapper
    return decorator