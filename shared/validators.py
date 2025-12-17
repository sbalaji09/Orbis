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