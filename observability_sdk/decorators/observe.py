from functools import wraps
from typing import Optional, Callable, Dict, Any
import time
from ..core.span import Span
from ..collector.collector import get_collector
from ..collector.config import get_config
from ..core.context import get_current_span, set_current_span
from ..core.prompt_versioning import get_prompt_registry


def observe(
        name: Optional[str] = None, 
        trace_id: Optional[str] = None, 
        user_id: Optional[str]= None,
        prompt_id: Optional[str] = None,
        prompt_version: Optional[str] = None,
        prompt_template: Optional[str] = None,
        metadata: Optional[Dict[str, Any]] = None):
    """
    Decorator to automatically track function execution as a span.
    """
    def decorator(func: Callable) -> Callable:
        @wraps(func)
        def wrapper(*args, **kwargs):
            # create span with custom name or use function name
            span_name = name or func.__name__

            # get parent context
            parent_span = get_current_span()
            
            # Capture input arguments
            input_str = f"args={args}, kwargs={kwargs}" if args or kwargs else ""
            
            # create the span
            config = get_config()
            span = Span(
                name=span_name,
                agent_id=config.project_id,
                user_id=user_id or config.user_id,
                trace_id=trace_id or (parent_span.trace_id if parent_span else Span.__dataclass_fields__['trace_id'].default_factory()),
                prompt=input_str
            )

            # ✅ FIX: Set span_type to "function" for @observe decorator
            span.span_type = "function"

            # add prompt versioning metadata
            if prompt_id:
                span.prompt_name = prompt_id
                span.prompt_version = prompt_version or "v1.0"

                # register prompt if template provided
                if prompt_template:
                    registry = get_prompt_registry()
                    config = get_config()
                    registered_prompt = registry.register_prompt(
                        prompt_id=prompt_id,
                        version=prompt_version or "v1.0",
                        prompt_text=prompt_template,
                        metadata=metadata or {},
                        agent_id=span.agent_id,
                        api_key=config.api_key,
                        api_url=config.api_url
                    )
                    span.prompt_hash = registered_prompt.prompt_hash
                    # Use the backend UUID for linking spans to prompts
                    span.prompt_id = registered_prompt.backend_uuid or prompt_id
                else:
                    # If no template, just use the name (won't link to backend properly)
                    span.prompt_id = prompt_id

            # if there's a parent, set parent relationship
            if parent_span:
                span.parent_span_id = [parent_span.span_id]
            
            # set this span as the active span
            previous_span = get_current_span()
            set_current_span(span)
            
            try:
                # execute the actual function
                result = func(*args, **kwargs)
                
                # Capture output
                span.output = str(result) if result is not None else ""
                
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

                # auto-flush if this is a root span (no parent) and auto_flush is enabled
                config = get_config()
                if config.auto_flush_on_root_span and parent_span is None:
                    collector.flush()
                    # wait for HTTP requests to complete
                    if config.auto_flush_wait_time > 0:
                        time.sleep(config.auto_flush_wait_time)
        
        return wrapper
    return decorator