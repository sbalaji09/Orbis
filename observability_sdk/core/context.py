"""
Context management for tracking active spans and traces.
Allows for nested spans to connect to their parents.
"""

from typing import Optional
from contextvars import ContextVar
from .span import Span

# thread-safe storage for current span
_current_span: ContextVar[Optional[Span]] = ContextVar('current_span', default=None)

# get the currently active span (if any)
def get_current_span() -> Optional[Span]:
    return _current_span.get()

# set the current active span
def set_current_span(span: Optional[Span]) -> None:
    _current_span.set(span)

# clear the current span
def clear_current_span() -> None:
    _current_span.set(None)

