from dataclasses import dataclass, field
from typing import Optional, List
from datetime import datetime, timezone
import uuid
import time

@dataclass
class Span:
    # tracks a single function execution
    name: str
    user_id: Optional[str] = None
    agent_id: Optional[str] = None
    trace_id: str = field(default_factory=lambda: str(uuid.uuid4()))

    span_id: str = field(default_factory=lambda: str(uuid.uuid4()))
    start_time: datetime = field(default_factory=lambda: datetime.now(timezone.utc))
    status: str = "running" # running, success, or error

    end_time: Optional[datetime] = None
    duration_ms: Optional[float] = None

    parent_span_id: List[str] = field(default_factory=list)
    
    error_message: Optional[str] = None

    # LLM specific fields
    model: Optional[str] = None
    prompt: Optional[str] = None
    output: Optional[str] = None
    input_data: Optional[str] = None
    output_data: Optional[str] = None
    context: Optional[str] = None

    # token tracking
    input_tokens: Optional[int] = None
    output_tokens: Optional[int] = None
    total_cost: Optional[float] = None

    # trace boundary flags
    is_start_span: bool = False
    is_end_span: bool = False

    # internal timing (hidden from user)
    _start_perf: float = field(default_factory=time.perf_counter, init=False, repr=False)

    # streaming metrics
    is_streaming: bool = False
    time_to_first_token: Optional[float] = None
    tokens_per_second: Optional[float] = None

    # prompt versioning
    prompt_id: Optional[str] = None
    prompt_name: Optional[str] = None
    prompt_version: Optional[str] = None
    prompt_hash: Optional[str] = None

    # mark the span as complete
    def complete(self, status: str = "success") -> None:
        self.end_time = datetime.now(timezone.utc)
        self.duration_ms = (time.perf_counter() - self._start_perf) * 1000
        self.status = status
    
    # record error that happened during execution
    def set_error(self, error: Exception) -> None:
        self.status = "error"
        self.error_message = f"{type(error).__name__}: {str(error)}"
    
    # convert to dict for JSON serialization
    def to_dict(self) -> dict:
        return {
            "trace_id": self.trace_id,
            "span_id": self.span_id,
            "parent_span_id": self.parent_span_id,
            "name": self.name,
            "start_time": self.start_time.isoformat(),
            "end_time": self.end_time.isoformat() if self.end_time else self.start_time.isoformat(),
            "duration": self.duration_ms or 0.0,
            "input_data": self.prompt or self.input_data or "",
            "output_data": self.output or self.output_data or "",
            "model": self.model or "",
            "input_tokens": self.input_tokens or 0,
            "output_tokens": self.output_tokens or 0,
            "total_cost": self.total_cost or 0.0,
            "status": self.status,
            "error_message": self.error_message,  # Can be None
            "user_id": self.user_id,
            "agent_id": self.agent_id,
            "is_start_span": self.is_start_span,
            "is_end_span": self.is_end_span,
            "is_streaming": self.is_streaming,
            "time_to_first_token": self.time_to_first_token,
            "tokens_per_second": self.tokens_per_second,
            "prompt_id": self.prompt_id,
            "prompt_name": self.prompt_name,
            "prompt_version": self.prompt_version,
            "prompt_hash": self.prompt_hash,
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

