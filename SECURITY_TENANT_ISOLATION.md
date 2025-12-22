# Tenant Isolation (Users / Agents / Prompts)

This project is multi-tenant: each user should only be able to see and mutate agents and agent-scoped data that they own.

## What Is Enforced In Code

- `GET /agents` is scoped by `user_id` (from the JWT `sub` claim).
- Prompt endpoints under `backend/prompt_api.py` require a valid Bearer JWT and are scoped to the authenticated user:
  - Reads only return prompt records where `prompt_versions.agent_id` belongs to the user (via `agents.user_id = <jwt.sub>`), plus optional “global” prompts where `prompt_versions.agent_id IS NULL`.
  - Writes (create/rollback) are only allowed for agents owned by the authenticated user.
- Prompt analytics/sample outputs are scoped by `traces.user_id` to avoid leaking another user’s spans.

## Manual Verification (API)

You need **two different user accounts** (User A and User B) and their JWTs.

1) As **User A**, list agents:
- `curl -sS -H "Authorization: Bearer $JWT_A" "$API_BASE_URL/agents"`

2) As **User A**, list prompt families:
- `curl -sS -H "Authorization: Bearer $JWT_A" "$API_BASE_URL/prompts/families"`

3) As **User B**, list prompt families:
- `curl -sS -H "Authorization: Bearer $JWT_B" "$API_BASE_URL/prompts/families"`

Expected:
- User A does not see User B’s agents in `/agents`.
- User A does not see prompt families where `agent_name` belongs to User B.
- If you support global prompts (`prompt_versions.agent_id IS NULL`), those may appear for both users but should have `agent_name = null`.

4) Verify prompts-by-agent is protected:
- `curl -i -sS "$API_BASE_URL/prompts/agent/<some-agent-id>" | head`
- Expected: `401` without auth, and `403` if the agent belongs to a different user.

## Manual Verification (Supabase SQL Editor)

If you are using Supabase Postgres, run these in the SQL editor:

### Find agents that are “unowned” (can cause confusing UI)
```sql
select agent_id, agent_name, user_id, created_at
from agents
where user_id is null;
```

### Find prompt records that reference missing agents (orphans)
```sql
select pv.prompt_id, pv.name, pv.agent_id
from prompt_versions pv
left join agents a on a.agent_id = pv.agent_id
where pv.agent_id is not null
  and a.agent_id is null;
```

### If you saw an unexpected agent name in the prompts UI (example: "data-analyst")
```sql
select agent_id, agent_name, user_id, created_at
from agents
where agent_name ilike '%data-analyst%';
```

## Supabase RLS (Optional But Recommended)

If any client queries Supabase directly (not through the backend API), enable Row Level Security (RLS) and add policies for:
- `agents` (by `user_id = auth.uid()`)
- `traces` (by `user_id = auth.uid()`)
- `spans` (via `exists(select 1 from traces where traces.trace_id = spans.trace_id and traces.user_id = auth.uid())`)
- `prompt_versions` (via `exists(select 1 from agents where agents.agent_id = prompt_versions.agent_id and agents.user_id = auth.uid())`)

Note: If the backend connects using a privileged Postgres role, it may bypass RLS; backend-side filtering is still required.
