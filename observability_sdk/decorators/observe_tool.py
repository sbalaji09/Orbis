from functools import wraps
from typing import Optional, Callable, Dict, Any
from ..core.span import Span
from ..collector.collector import get_collector
from ..collector.config import get_config
from ..core.context import get_current_span, set_current_span


def observe_tool(
    name: Optional[str] = None,
    category: str = "custom",
    span_type: str = "tool"
):
    """
    Decorator to track tool/function execution as a span.
    Use this for custom tools, API calls, or any operation you want to track.
    
    Usage:
        @observe_tool(name="web_search", category="search")
        def search_google(query: str) -> str:
            # Your tool code
            return results
        
        @observe_tool(name="calculate_price", category="calculator")
        def calculate_discount(price: float) -> float:
            return price * 0.9
    
    Args:
        name: Optional custom name for the span (defaults to function name)
        category: Category of tool (search, calculator, database, api, custom, etc.)
        span_type: Type of span (tool, http, database, cli, etc.)
    """
    def decorator(func: Callable) -> Callable:
        @wraps(func)
        def wrapper(*args, **kwargs):
            # Create span with custom name or use function name
            span_name = name or f"tool.{func.__name__}"

            # Get parent context
            parent_span = get_current_span()
            
            # Capture input arguments
            tool_input = {
                "args": args if args else None,
                "kwargs": kwargs if kwargs else None
            }
            
            # Create the span
            config = get_config()
            span = Span(
                name=span_name,
                span_type=span_type,
                agent_id=config.project_id,
                user_id=config.user_id,
                trace_id=parent_span.trace_id if parent_span else Span.__dataclass_fields__['trace_id'].default_factory(),
                tool_name=name or func.__name__,
                tool_category=category,
                tool_input=tool_input,
                input_data=str(tool_input)
            )

            # If there's a parent, set parent relationship
            if parent_span:
                span.parent_span_id = [parent_span.span_id]
            
            # Set this span as the active span
            previous_span = get_current_span()
            set_current_span(span)
            
            try:
                # Execute the actual function
                result = func(*args, **kwargs)
                
                # Capture output
                span.tool_output = {"result": result}
                span.output = str(result) if result is not None else ""
                span.output_data = str(result) if result is not None else ""
                
                # Mark span as successful
                span.complete(status="success")
                
                return result
                
            except Exception as e:
                # Capture the error
                span.set_error(e)
                span.complete(status="error")
                
                # Re-raise the exception so the program behaves normally
                raise
                
            finally:
                # Restore previous span context
                set_current_span(previous_span)
                # Send span to collector
                collector = get_collector()
                collector.collect(span)
        
        return wrapper
    return decorator
