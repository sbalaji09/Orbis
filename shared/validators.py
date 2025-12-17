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

