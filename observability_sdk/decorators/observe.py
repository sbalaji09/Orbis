from functools import wraps
from typing import Optional, Callable
from ..core.span import Span

# decorator that automatically tracks function execution as a span
def observe(name: Optional[str] = None, trace_id: Optional[str] = None):

    def decorator(func: Callable) -> Callable:
        @wraps(func)
        def wrapper(*args, **kwargs):
            span_name = name or func.__name__

            span = Span(
                name=span_name,
                trace_id=trace_id or Span.__dataclass_fields__['trace_id'].default_factory()
            )

            try: 
                result = func(*args, **kwargs)
                span.complete(status="success")
                return result
            except Exception as e:
                span.set_error(e)
                span.complete(status="error")

                raise

            finally:
                print(f"\n{'='*60}")
                print("Full span data:")
                print(span.to_dict())
                print(f"{'='*60}\n")
        
        return wrapper
    return decorator