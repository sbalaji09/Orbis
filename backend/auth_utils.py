"""
JWT Authentication utilities for Supabase integration.
Verifies JWT tokens from Supabase Auth and extracts user information.
"""

import jwt
import os
import requests
from typing import Optional, Dict, Any
from fastapi import HTTPException, Security, Request
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from functools import lru_cache
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

# auto_error=False prevents 422 on missing header, we handle it ourselves with 401
security = HTTPBearer(auto_error=False)

# Supabase configuration from environment
SUPABASE_URL = os.getenv("SUPABASE_URL", "")
SUPABASE_JWT_SECRET = os.getenv("SUPABASE_JWT_SECRET", "")

# Try to decode base64 secret if it looks like base64
def get_jwt_secret() -> str:
    """Get the JWT secret, attempting base64 decode if needed."""
    secret = SUPABASE_JWT_SECRET
    if not secret:
        return ""

    # If it ends with == or = it's likely base64 encoded
    # Try to use it as-is first (raw secret), which is what Supabase expects
    return secret

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
        unverified_header = jwt.get_unverified_header(token)
        print(f"[AUTH] Token header: alg={unverified_header.get('alg')}, typ={unverified_header.get('typ')}, kid={unverified_header.get('kid')}")

        unverified = jwt.decode(token, options={"verify_signature": False})
        print(
            f"[AUTH] Token claims: aud={unverified.get('aud')}, iss={unverified.get('iss')}, sub={unverified.get('sub')}")

        # Get the algorithm from the token header
        token_alg = unverified_header.get('alg', 'HS256')
        print(f"[AUTH] Token uses algorithm: {token_alg}")

        # If JWT_SECRET is provided, try it first for verification (faster)
        print(f"[AUTH] SUPABASE_JWT_SECRET is set: {bool(SUPABASE_JWT_SECRET)}, length: {len(SUPABASE_JWT_SECRET) if SUPABASE_JWT_SECRET else 0}")
        if SUPABASE_JWT_SECRET and token_alg == "HS256":
            # Get the issuer from the token
            issuer = unverified.get('iss')

            try:
                # Try with the secret as-is first
                payload = jwt.decode(
                    token,
                    SUPABASE_JWT_SECRET,
                    algorithms=["HS256"],
                    audience="authenticated",
                    issuer=issuer,
                    options={"verify_signature": True,
                             "verify_aud": True, "verify_iss": True}
                )
                print("[AUTH] Token verified successfully with HS256!")
                return payload
            except jwt.InvalidSignatureError as e:
                print(f"[AUTH] HS256 signature verification failed: {e}")
                # Try without audience/issuer verification in case that's the issue
                try:
                    payload = jwt.decode(
                        token,
                        SUPABASE_JWT_SECRET,
                        algorithms=["HS256"],
                        options={"verify_signature": True, "verify_aud": False, "verify_iss": False}
                    )
                    print("[AUTH] Token verified with HS256 (no aud/iss check)!")
                    return payload
                except Exception as e2:
                    print(f"[AUTH] HS256 without aud/iss also failed: {e2}")
            except Exception as e:
                print(f"[AUTH] HS256 verification failed: {type(e).__name__}: {e}")
                pass

        # Try JWKs method for asymmetric algorithms (RS256, ES256, etc.)
        asymmetric_algs = ["RS256", "RS384", "RS512", "ES256", "ES384", "ES512"]
        if token_alg in asymmetric_algs:
            print(f"[AUTH] Trying JWKs verification for {token_alg}...")
            try:
                jwks = get_supabase_jwks()
                print(f"[AUTH] JWKs fetched, keys: {len(jwks.get('keys', []))}")

                kid = unverified_header.get("kid")
                print(f"[AUTH] Token kid: {kid}")

                # Find the matching key
                matching_key = None
                for key in jwks.get("keys", []):
                    print(f"[AUTH] Checking key: kid={key.get('kid')}, alg={key.get('alg')}, kty={key.get('kty')}")
                    if key.get("kid") == kid:
                        matching_key = key
                        break

                if not matching_key:
                    print(f"[AUTH] No matching key found in JWKs. Available kids: {[k.get('kid') for k in jwks.get('keys', [])]}")
                    raise HTTPException(
                        status_code=401,
                        detail="Unable to find matching key for token"
                    )

                # Convert JWK to a format PyJWT can use
                from jwt import PyJWK
                jwk_obj = PyJWK.from_dict(matching_key)
                public_key = jwk_obj.key

                # Verify and decode the token using the algorithm from the token
                payload = jwt.decode(
                    token,
                    public_key,
                    algorithms=[token_alg],
                    audience="authenticated"
                )
                print("[AUTH] JWKs verification successful!")
                return payload
            except HTTPException:
                raise
            except Exception as e:
                print(f"[AUTH] JWKs verification failed: {type(e).__name__}: {e}")
                import traceback
                traceback.print_exc()
                raise HTTPException(
                    status_code=401,
                    detail=f"Token verification failed: {str(e)}"
                )

        # If we get here, algorithm is not supported
        print(f"[AUTH] Unsupported algorithm: {token_alg}")
        raise HTTPException(
            status_code=401,
            detail=f"Unsupported token algorithm: {token_alg}"
        )

    except jwt.ExpiredSignatureError:
        print("[AUTH] Token has expired")
        raise HTTPException(status_code=401, detail="Token has expired")
    except jwt.InvalidTokenError as e:
        print(f"[AUTH] Invalid token error: {e}")
        raise HTTPException(status_code=401, detail=f"Invalid token: {str(e)}")
    except HTTPException:
        raise
    except Exception as e:
        print(f"[AUTH] Unexpected error: {e}")
        raise HTTPException(
            status_code=401,
            detail=f"Token verification failed: {str(e)}"
        )


def get_user_id_from_token(
    credentials: Optional[HTTPAuthorizationCredentials] = Security(security)
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
    if credentials is None:
        raise HTTPException(
            status_code=401,
            detail="Authorization header missing. Please provide a Bearer token."
        )

    token = credentials.credentials
    payload = verify_jwt_token(token)

    user_id = payload.get("sub")
    if not user_id:
        raise HTTPException(
            status_code=401,
            detail="Token does not contain user information"
        )

    return user_id


def _get_redis_client():
    try:
        import redis  # type: ignore
    except Exception:
        return None

    return redis.Redis(
        host=os.getenv("REDIS_HOST", "localhost"),
        port=int(os.getenv("REDIS_PORT", 6379)),
        db=int(os.getenv("REDIS_DB", 0)),
        password=os.getenv("REDIS_PASSWORD", None),
        decode_responses=True,
        socket_timeout=1,
        socket_connect_timeout=1,
    )


def _verify_api_key(api_key: str) -> Dict[str, str]:
    """
    Verify an agent API key and return {user_id, agent_id?}.
    Uses Redis fast-path if available, falls back to DB bcrypt verification.
    """
    if not api_key:
        raise HTTPException(status_code=401, detail="Missing API Key. Include X-API-Key header.")

    # Fast path: Redis mappings written by backend/profile_api.py
    redis_client = _get_redis_client()
    if redis_client is not None:
        try:
            user_id = redis_client.get(f"api_key:{api_key}")
            agent_id = redis_client.get(f"api_key_agent:{api_key}")
            if user_id:
                ctx = {"user_id": str(user_id)}
                if agent_id:
                    ctx["agent_id"] = str(agent_id)
                return ctx
        except Exception:
            # Redis not reachable; fall back to DB
            pass

    # Slow path: bcrypt-check against stored hashes
    try:
        import bcrypt  # type: ignore
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"bcrypt not available: {e}")

    try:
        # Local import to avoid import-time DB work in module init
        from db_connection import db  # type: ignore
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Database not available for API key auth: {e}")

    agents = db.get_all_agents_for_auth()
    for agent in agents:
        hashed = agent.get("api_key")
        if not hashed:
            continue
        try:
            if bcrypt.checkpw(api_key.encode("utf-8"), hashed.encode("utf-8")):
                ctx = {"user_id": str(agent.get("user_id"))}
                if agent.get("agent_id"):
                    ctx["agent_id"] = str(agent.get("agent_id"))

                # Best-effort: populate Redis for next time
                if redis_client is not None:
                    try:
                        redis_client.set(f"api_key:{api_key}", ctx["user_id"])
                        if ctx.get("agent_id"):
                            redis_client.set(f"api_key_agent:{api_key}", ctx["agent_id"])
                    except Exception:
                        pass

                return ctx
        except Exception:
            continue

    raise HTTPException(status_code=401, detail="Invalid API Key")


def get_auth_context(
    request: Request,
    credentials: Optional[HTTPAuthorizationCredentials] = Security(security),
) -> Dict[str, str]:
    """
    Unified auth dependency:
    - Prefer Authorization: Bearer <JWT> (Supabase)
    - Fallback to X-API-Key (agent API key)
    Returns: {"user_id": "...", "auth_type": "jwt"|"api_key", "agent_id"?: "..."}
    """
    if credentials is not None:
        token = credentials.credentials
        payload = verify_jwt_token(token)
        user_id = payload.get("sub")
        if not user_id:
            raise HTTPException(status_code=401, detail="Token does not contain user information")
        return {"user_id": str(user_id), "auth_type": "jwt"}

    api_key = request.headers.get("X-API-Key")
    ctx = _verify_api_key(api_key or "")
    ctx["auth_type"] = "api_key"
    return ctx


def get_user_id_from_auth(
    request: Request,
    credentials: Optional[HTTPAuthorizationCredentials] = Security(security),
) -> str:
    """Convenience dependency for routes that only need user_id."""
    return get_auth_context(request, credentials)["user_id"]


def get_user_from_token(
    credentials: Optional[HTTPAuthorizationCredentials] = Security(security)
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
    if credentials is None:
        raise HTTPException(
            status_code=401,
            detail="Authorization header missing. Please provide a Bearer token."
        )

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
