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