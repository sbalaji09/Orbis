from dataclasses import dataclass, field
from typing import Optional
from datetime import datetime, timezone
import uuid
import time

@dataclass
class Span:
    # tracks a single function execution

    name: str

    span_id: str = field(default_factory=lambda: str(uuid.uuid4()))
    start_time: datetime = field(default_factory=lambda: datetime.now(timezone.utc))
    status: str = "running" # running, success, or error

    end_time: Optional[datetime] = None
    duration_ms: Optional[float] = None
    error_message: Optional[str] = None

    # accurate timing (hidden from user)
    _start_perf: float = field(default_factory=time.perf_counter, init=False, repr=False)

    def complete(self, status: str = "success"):
        self.end_time = datetime.now(timezone.utc)
        self.duration_ms = (time.perf_counter() - self._start_perf) * 1000
        self.status = status
    
    def set_error(self, error: Exception):
        self.status = "error"
        self.error_message = f"{type(error).__name__}: {str(error)}"
    
    # convert to dict for printing and debugging
    def to_dict(self):
        return {
            "span_id": self.span_id, 
            "name": self.name,
            "start_time": self.start_time.isoformat(),
            "end_time": self.end_time.isoformat() if self.end_time else None,
            "duration_ms": self.duration_ms,
            "status": self.status,
            "error_message": self.error_message,
        }

    def __str__(self):
        if self.status == "running":
            return f"Span(name='{self.name}', status=running)"
        elif self.status == "error":
            duration = f"{self.duration_ms:.2f}" if self.duration_ms is not None else "N/A"
            return f"Span(name='{self.name}', status=error, duration={self.duration_ms:.2f}ms, error='{self.error_message}')"
        else:
            duration = f"{self.duration_ms:.2f}" if self.duration_ms is not None else "N/A"
            return f"Span(name='{self.name}', status=success, duration={self.duration_ms:.2f}ms)"

