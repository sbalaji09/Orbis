# Orbis Authentication Setup Guide

## Overview

Orbis now uses **Supabase Auth** for user authentication with JWT (JSON Web Token) verification. This guide covers the complete setup process for both frontend and backend.

---

## Phase 1: Frontend Setup ✅ COMPLETE

### 1. Install Dependencies

```bash
cd frontend
pnpm install @supabase/supabase-js @supabase/ssr @supabase/auth-helpers-nextjs @supabase/auth-ui-react @supabase/auth-ui-shared
```

### 2. Environment Configuration

Create `/frontend/.env.local` with:

```env
# Supabase Configuration
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key-here

# Backend API
NEXT_PUBLIC_API_URL=http://localhost:8000
```

### 3. Authentication Pages

- `/app/(auth)/login` - User login
- `/app/(auth)/signup` - User registration
- `/app/(auth)/reset-password` - Password reset
- `/app/auth/callback` - OAuth callback handler

### 4. Protected Routes

All dashboard routes (`/dashboard/*`) are protected by middleware. Unauthenticated users are redirected to `/login`.

### 5. Frontend Features

- ✅ JWT-based authentication
- ✅ Automatic token refresh
- ✅ Supabase Auth UI components
- ✅ Logout functionality in navbar
- ✅ User email display
- ✅ SSE/WebSocket support with JWT

---

## Phase 2: Backend Setup ✅ COMPLETE

### 1. Install Dependencies

```bash
cd backend
pip install PyJWT cryptography
```

### 2. Environment Configuration

Create `/backend/.env` with:

```env
# Supabase Authentication
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_JWT_SECRET=your-jwt-secret-key-here

# Database Configuration
DATABASE_URL=postgresql://user:password@localhost:5432/orbis
POSTGRES_HOST=localhost
POSTGRES_PORT=5432
POSTGRES_DB=orbis
POSTGRES_USER=user
POSTGRES_PASSWORD=password

# Redis Configuration
REDIS_HOST=localhost
REDIS_PORT=6379
REDIS_PASSWORD=
```

### 3. Get Your Supabase JWT Secret

There are two options:

**Option A: Use JWT Secret (Recommended for Speed)**

1. Go to Supabase Dashboard → Project Settings → API
2. Copy the `JWT Secret` value
3. Set as `SUPABASE_JWT_SECRET` in backend `.env`

**Option B: Use JWKs (More Secure)**

1. Leave `SUPABASE_JWT_SECRET` empty
2. The backend will automatically fetch JWKs from Supabase
3. Slightly slower but more secure (uses RS256 instead of HS256)

### 4. Backend Authentication Flow

**REST API Endpoints:**

```python
from fastapi import Depends
from auth_utils import get_user_id_from_token

@app.get("/traces")
async def list_traces(user_id: str = Depends(get_user_id_from_token)):
    # user_id is automatically extracted from JWT token
    traces = db.get_traces(user_id)
    return traces
```

**SSE/WebSocket Endpoints:**

```python
from auth_utils import verify_token_from_query

@app.get("/spans/{span_id}/stream")
async def stream_span(
    span_id: str,
    token: Optional[str] = Query(None)
):
    # Verify token from query parameter
    user_id = verify_token_from_query(token)
    # ... stream logic
```

### 5. Updated Endpoints

All endpoints now use JWT authentication:

**Query API (`query_api.py`):**

- ✅ `GET /traces` - List user traces
- ✅ `GET /traces/{trace_id}` - Get specific trace
- ✅ `GET /traces/{trace_id}/spans` - Get trace spans
- ✅ `GET /spans/{span_id}` - Get span details
- ✅ `GET /spans/{span_id}/stream` - Stream span updates (SSE)
- ✅ `GET /agents` - List user agents
- ✅ `GET /search/traces` - Search traces
- ✅ `GET /metrics/user` - User metrics

**Prompt API (`prompt_api.py`):**

- ✅ `GET /prompts/families` - Get prompt families

**Profile API (`profile_api.py`):**

- ✅ `POST /agent` - Create agent
- ✅ `GET /agents` - List agents

---

## Authentication Utilities

### `auth_utils.py`

Provides three main functions:

1. **`get_user_id_from_token()`** - FastAPI dependency for REST endpoints

   - Extracts JWT from `Authorization: Bearer <token>` header
   - Returns `user_id` (sub claim)

2. **`get_user_from_token()`** - FastAPI dependency for full user payload

   - Returns complete decoded JWT payload
   - Useful when you need email or other user metadata

3. **`verify_token_from_query(token)`** - For SSE/WebSocket
   - Accepts token as query parameter: `?token=<jwt>`
   - Returns `user_id`

---

## Migration from X-User-ID

**Before:**

```python
@app.get("/traces")
async def list_traces(user_id: str = Header(..., alias="X-User-ID")):
    traces = db.get_traces(user_id)
    return traces
```

**After:**

```python
from auth_utils import get_user_id_from_token

@app.get("/traces")
async def list_traces(user_id: str = Depends(get_user_id_from_token)):
    traces = db.get_traces(user_id)
    return traces
```

---

## Testing

### 1. Start Backend

```bash
cd backend
python3 query_api.py
```

### 2. Start Frontend

```bash
cd frontend
pnpm dev
```

### 3. Test Flow

1. Navigate to `http://localhost:3000`
2. You'll be redirected to `/login`
3. Sign up for a new account at `/signup`
4. After login, you'll be redirected to `/dashboard`
5. Create an agent to get an API key
6. Use the SDK with your API key (API key auth remains unchanged)

---

## Security Notes

### User Authentication (JWT)

- Frontend users authenticate via Supabase Auth
- JWT tokens are stored in HTTP-only cookies
- Tokens are automatically refreshed by Supabase
- All user-facing endpoints require valid JWT

### Agent Authentication (API Keys)

- SDK agents use API key authentication (unchanged)
- API keys are bcrypt-hashed in database
- Redis caching for fast auth lookup
- API keys are separate from user authentication

### Two Authentication Systems

**For Users (Web Dashboard):**

- Supabase JWT tokens
- Cookie-based session management
- Automatic token refresh

**For Agents (SDK/API):**

- API key authentication
- Redis-cached validation
- bcrypt-hashed storage

---

## Troubleshooting

### Frontend Issues

**Error: "Cannot find module '@supabase/ssr'"**

```bash
cd frontend
pnpm install @supabase/ssr
```

**Error: "NEXT_PUBLIC_SUPABASE_URL is not defined"**

- Check that `.env.local` exists in `frontend/` directory
- Ensure all environment variables are set
- Restart the dev server

### Backend Issues

**Error: "Failed to fetch JWKS from Supabase"**

- Check `SUPABASE_URL` in backend `.env`
- Ensure backend can reach Supabase (no firewall blocking)
- Consider using `SUPABASE_JWT_SECRET` instead

**Error: "Token has expired"**

- Frontend should automatically refresh tokens
- Check that Supabase project is active
- Verify JWT secret matches your Supabase project

**Error: "Unable to find matching key for token"**

- This happens with JWKs method
- Set `SUPABASE_JWT_SECRET` for faster/simpler verification

---

## Next Steps

1. **Set up Supabase Project:**

   - Create account at https://supabase.com
   - Create new project
   - Get URL and anon key from project settings

2. **Configure Environment Variables:**

   - Update frontend `.env.local`
   - Update backend `.env`

3. **Test Authentication:**

   - Sign up a test user
   - Verify dashboard access
   - Test API calls with JWT

4. **Deploy:**
   - Set environment variables in production
   - Update CORS settings for production URLs
   - Configure Supabase redirect URLs

---

## API Key Authentication (Unchanged)

SDK agents continue to use API key authentication:

```python
from observability_sdk import Observer

observer = Observer(
    api_url="http://localhost:3000",
    api_key="your-agent-api-key"
)
```

The data-pipeline validates API keys independently of JWT authentication.

---

## Support

For issues or questions:

- Check Supabase documentation: https://supabase.com/docs/guides/auth
- Review FastAPI security: https://fastapi.tiangolo.com/tutorial/security/
- Check JWT.io for token debugging: https://jwt.io
