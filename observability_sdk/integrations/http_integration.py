"""
Auto-instrumentation for HTTP libraries (httpx, requests)
Automatically tracks all HTTP requests as spans
"""

from typing import Optional
from ..core.span import Span
from ..collector.collector import get_collector
from ..collector.config import get_config
from ..core.context import get_current_span, set_current_span


def instrument_http(library=None):
    """
    Auto-instrument HTTP libraries to track all HTTP requests as spans.
    
    Supports: httpx (sync and async)
    
    Usage:
        import httpx
        from orbis import instrument_http
        
        instrument_http(httpx)
        
        # Now all httpx calls are automatically tracked
        response = httpx.get("https://api.github.com/users/octocat")
    
    Args:
        library: The HTTP library module to instrument (e.g., httpx)
    """
    if library is None:
        print("No library specified. Usage: instrument_http(httpx)")
        return
    
    library_name = library.__name__ if hasattr(library, '__name__') else str(library)
    
    if library_name == 'httpx':
        _instrument_httpx(library)
    else:
        print(f"Library '{library_name}' not yet supported. Currently supports: httpx")


def _instrument_httpx(httpx_module):
    """Instrument the httpx library"""
    
    # Store original methods
    _original_get = httpx_module.get
    _original_post = httpx_module.post
    _original_put = httpx_module.put
    _original_delete = httpx_module.delete
    _original_patch = httpx_module.patch
    _original_request = httpx_module.request
    
    def _create_http_span(method: str, url: str):
        """Helper to create an HTTP span"""
        parent_span = get_current_span()
        config = get_config()
        
        span = Span(
            name=f"httpx.{method}",
            span_type="http",
            agent_id=config.project_id,
            user_id=config.user_id,
            trace_id=parent_span.trace_id if parent_span else Span.__dataclass_fields__['trace_id'].default_factory(),
            http_method=method,
            http_url=str(url),
            input_data=f"{method} {url}"
        )
        
        if parent_span:
            span.parent_span_id = [parent_span.span_id]
        
        return span
    
    def _tracked_get(url, **kwargs):
        span = _create_http_span("GET", url)
        previous_span = get_current_span()
        set_current_span(span)
        
        try:
            response = _original_get(url, **kwargs)
            span.http_status_code = response.status_code
            span.output_data = f"Status: {response.status_code}"
            span.complete(status="success" if response.status_code < 400 else "error")
            return response
        except Exception as e:
            span.set_error(e)
            span.complete(status="error")
            raise
        finally:
            set_current_span(previous_span)
            get_collector().collect(span)
    
    def _tracked_post(url, **kwargs):
        span = _create_http_span("POST", url)
        previous_span = get_current_span()
        set_current_span(span)
        
        try:
            response = _original_post(url, **kwargs)
            span.http_status_code = response.status_code
            span.output_data = f"Status: {response.status_code}"
            span.complete(status="success" if response.status_code < 400 else "error")
            return response
        except Exception as e:
            span.set_error(e)
            span.complete(status="error")
            raise
        finally:
            set_current_span(previous_span)
            get_collector().collect(span)
    
    def _tracked_put(url, **kwargs):
        span = _create_http_span("PUT", url)
        previous_span = get_current_span()
        set_current_span(span)
        
        try:
            response = _original_put(url, **kwargs)
            span.http_status_code = response.status_code
            span.output_data = f"Status: {response.status_code}"
            span.complete(status="success" if response.status_code < 400 else "error")
            return response
        except Exception as e:
            span.set_error(e)
            span.complete(status="error")
            raise
        finally:
            set_current_span(previous_span)
            get_collector().collect(span)
    
    def _tracked_delete(url, **kwargs):
        span = _create_http_span("DELETE", url)
        previous_span = get_current_span()
        set_current_span(span)
        
        try:
            response = _original_delete(url, **kwargs)
            span.http_status_code = response.status_code
            span.output_data = f"Status: {response.status_code}"
            span.complete(status="success" if response.status_code < 400 else "error")
            return response
        except Exception as e:
            span.set_error(e)
            span.complete(status="error")
            raise
        finally:
            set_current_span(previous_span)
            get_collector().collect(span)
    
    def _tracked_patch(url, **kwargs):
        span = _create_http_span("PATCH", url)
        previous_span = get_current_span()
        set_current_span(span)
        
        try:
            response = _original_patch(url, **kwargs)
            span.http_status_code = response.status_code
            span.output_data = f"Status: {response.status_code}"
            span.complete(status="success" if response.status_code < 400 else "error")
            return response
        except Exception as e:
            span.set_error(e)
            span.complete(status="error")
            raise
        finally:
            set_current_span(previous_span)
            get_collector().collect(span)
    
    def _tracked_request(method, url, **kwargs):
        span = _create_http_span(method.upper(), url)
        previous_span = get_current_span()
        set_current_span(span)
        
        try:
            response = _original_request(method, url, **kwargs)
            span.http_status_code = response.status_code
            span.output_data = f"Status: {response.status_code}"
            span.complete(status="success" if response.status_code < 400 else "error")
            return response
        except Exception as e:
            span.set_error(e)
            span.complete(status="error")
            raise
        finally:
            set_current_span(previous_span)
            get_collector().collect(span)
    
    # Monkey-patch the httpx module
    httpx_module.get = _tracked_get
    httpx_module.post = _tracked_post
    httpx_module.put = _tracked_put
    httpx_module.delete = _tracked_delete
    httpx_module.patch = _tracked_patch
    httpx_module.request = _tracked_request
    
    print("✓ HTTP instrumentation enabled for httpx")
