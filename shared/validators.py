import re
from uuid import UUID
from typing import Optional
from fastapi import HTTPException

# this is a custom exception for validation errors
class ValidationError(HTTPException):
    def __init__(self, field: str, message: str):
        super().__init__(
            status_code=400,
            detail={
                "error": "validation_error",
                "field": field,
                "message": message
            }
        )

# checks if a string is in the valid UUID format
def is_valid_uuid(val: str) -> bool:
    if not val:
        return False
    
    try:
        UUID(val)
        return True
    except (ValueError, TypeError):
        return False

# validate that a string is a valid UUID and returns the validated string
def validate_uuid(val: str, field_name: str = "id") -> str:
    if not val:
        raise ValidationError(field_name, f"{field_name} is required")
    
    if not is_valid_uuid(val):
        raise ValidationError(field_name, f"{field_name} must be a valid UUID format")

    return val

def validate_trace_id(trace_id: str) -> str:
    return validate_uuid(trace_id, "trace_id")

def validate_span_id(span_id: str) -> str:
    return validate_uuid(span_id, "span_id")

def validate_user_id(user_id: str) -> str:
    return validate_uuid(user_id, "user_id")

def validate_agent_id(agent_id: Optional[str]) -> Optional[str]:
    if agent_id is None or agent_id == "":
        return None
    
    return validate_uuid(agent_id, "agent_id")

# validates pagination parameters
def validate_pagination(limit: int, offset: int, max_limit: int = 100) -> tuple[int, int]:
    if limit < 1:
        raise ValidationError("limit", "limit must be at least 1")
    
    if limit > max_limit:
        raise ValidationError("limit", f"limit cannot exceed {max_limit}")
    
    if offset < 0:
        raise ValidationError("offset", "offset cannot be negative")
    
    return limit, offset

# sanitize a string input by stripping and truncating
def sanitize_string(val: str, max_length: int = 1000, field_name: str = "field") -> str:
    if not isinstance(val, str):
        raise ValidationError(field_name, f"{field_name} must be a string")
    
    sanitized = val.strip()

    if len(sanitized) > max_length:
        sanitized = sanitized[:max_length]
    
    return sanitized

# # validate status field against allowed values
def validate_status(status: str, allowed: list[str] = None) -> str:
    if allowed is None:
        allowed = ["running", "completed", "error", "success"]

    if status not in allowed:
        raise ValidationError("status", f"status must be one of: {', '.join(allowed)}")
    
    return status