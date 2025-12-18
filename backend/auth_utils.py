"""
JWT Authentication utilities for Supabase integration.
Verifies JWT tokens from Supabase Auth and extracts user information.
"""

import jwt
import os
import requests
from typing import Optional, Dict, Any
from fastapi import HTTPException, Security
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from functools import lru_cache
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

security = HTTPBearer()

# Supabase configuration from environment
SUPABASE_URL = os.getenv("SUPABASE_URL", "")
SUPABASE_JWT_SECRET = os.getenv("SUPABASE_JWT_SECRET", "")

# Cache for JWKs (JSON Web Keys)
_jwks_cache: Optional[Dict[str, Any]] = None


@lru_cache(maxsize=1)
def get_supabase_jwks() -> Dict[str, Any]:
    """
    Fetch Supabase JWKs for JWT verification.
    Cached to avoid repeated network calls.
    """
    global _jwks_cache

    if _jwks_cache is not None:
        return _jwks_cache

    if not SUPABASE_URL:
        raise ValueError("SUPABASE_URL environment variable not set")

    jwks_url = f"{SUPABASE_URL}/auth/v1/.well-known/jwks.json"

    try:
        response = requests.get(jwks_url, timeout=5)
        response.raise_for_status()
        _jwks_cache = response.json()
        return _jwks_cache
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Failed to fetch JWKS from Supabase: {str(e)}"
        )


def verify_jwt_token(token: str) -> Dict[str, Any]:
    """
    Verify a Supabase JWT token and return the decoded payload.

    Args:
        token: The JWT token string to verify

    Returns:
        Dict containing the decoded token payload with user information

    Raises:
        HTTPException: If token is invalid or expired
    """
    if not token:
        raise HTTPException(status_code=401, detail="No token provided")

    try:
        # Debug: Log that we're attempting verification
        print(f"[AUTH] Attempting to verify token (length: {len(token)})")
        print(f"[AUTH] Using JWT_SECRET: {bool(SUPABASE_JWT_SECRET)}")
        print(
            f"[AUTH] JWT_SECRET first 10 chars: {SUPABASE_JWT_SECRET[:10]}..." if SUPABASE_JWT_SECRET else "None")
        print(f"[AUTH] SUPABASE_URL: {SUPABASE_URL}")

        # Decode token without verification to see its contents
        unverified = jwt.decode(token, options={"verify_signature": False})
        print(
            f"[AUTH] Token claims: aud={unverified.get('aud')}, iss={unverified.get('iss')}, sub={unverified.get('sub')}")

        # If JWT_SECRET is provided, try it first for verification (faster)
        if SUPABASE_JWT_SECRET:
            # Get the issuer from the token
            issuer = unverified.get('iss')

            payload = jwt.decode(
                token,
                SUPABASE_JWT_SECRET,
                algorithms=["HS256"],
                audience="authenticated",
                issuer=issuer,
                options={"verify_signature": True,
                         "verify_aud": True, "verify_iss": True}
            )
            print("[AUTH] Token verified successfully!")
            return payload

        # Otherwise, fetch JWKs and verify with RS256
        jwks = get_supabase_jwks()

        # Decode header to get the key ID
        unverified_header = jwt.get_unverified_header(token)
        kid = unverified_header.get("kid")

        # Find the matching key
        rsa_key = None
        for key in jwks.get("keys", []):
            if key.get("kid") == kid:
                rsa_key = key
                break

        if not rsa_key:
            raise HTTPException(
                status_code=401,
                detail="Unable to find matching key for token"
            )

        # Verify and decode the token
        payload = jwt.decode(
            token,
            rsa_key,
            algorithms=["RS256"],
            audience="authenticated"
        )

        return payload

    except jwt.ExpiredSignatureError:
        raise HTTPException(status_code=401, detail="Token has expired")
    except jwt.InvalidTokenError as e:
        raise HTTPException(status_code=401, detail=f"Invalid token: {str(e)}")
    except Exception as e:
        raise HTTPException(
            status_code=401,
            detail=f"Token verification failed: {str(e)}"
        )


def get_user_id_from_token(
    credentials: HTTPAuthorizationCredentials = Security(security)
) -> str:
    """
    FastAPI dependency to extract and verify JWT token, returning user_id.

    Usage in route:
        @app.get("/protected")
        async def protected_route(user_id: str = Depends(get_user_id_from_token)):
            return {"user_id": user_id}

    Args:
        credentials: HTTP Bearer token credentials

    Returns:
        str: The user_id (sub claim) from the verified token

    Raises:
        HTTPException: If token is invalid or missing
    """
    token = credentials.credentials
    payload = verify_jwt_token(token)

    user_id = payload.get("sub")
    if not user_id:
        raise HTTPException(
            status_code=401,
            detail="Token does not contain user information"
        )

    return user_id


def get_user_from_token(
    credentials: HTTPAuthorizationCredentials = Security(security)
) -> Dict[str, Any]:
    """
    FastAPI dependency to extract and verify JWT token, returning full user payload.

    Usage in route:
        @app.get("/protected")
        async def protected_route(user: dict = Depends(get_user_from_token)):
            return {"email": user.get("email")}

    Args:
        credentials: HTTP Bearer token credentials

    Returns:
        Dict: The full decoded token payload

    Raises:
        HTTPException: If token is invalid or missing
    """
    token = credentials.credentials
    return verify_jwt_token(token)


# Optional: Function for SSE/WebSocket authentication via query parameter
def verify_token_from_query(token: Optional[str] = None) -> str:
    """
    Verify JWT token passed as query parameter (for SSE/WebSocket).

    Args:
        token: JWT token from query parameter

    Returns:
        str: The user_id from the verified token

    Raises:
        HTTPException: If token is invalid or missing
    """
    if not token:
        raise HTTPException(
            status_code=401,
            detail="Authentication token required in query parameter"
        )

    payload = verify_jwt_token(token)
    user_id = payload.get("sub")

    if not user_id:
        raise HTTPException(
            status_code=401,
            detail="Token does not contain user information"
        )

    return user_id
