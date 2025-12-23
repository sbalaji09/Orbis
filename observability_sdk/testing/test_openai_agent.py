import sys
import os
import json
import argparse
import base64
import re
from uuid import uuid4

sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "..")))

try:
    import requests  # required by observability_sdk collector
except ImportError as e:
    print(f"❌ Missing dependency: {e}")
    print("Install with: pip install requests")
    sys.exit(1)

import httpx
import openai

from observability_sdk import (
    configure,
    instrument_all,
    observe, 
    observe_tool,
    run_tracked_command,
)
from observability_sdk.core.context import get_current_span

GITHUB_TOKEN = "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"
OPENAI_KEY = "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"

PROMPT_ID = "github_triage_agent"
PROMPT_VERSION = "v2.0"
PROMPT_TEMPLATE = """You are a senior engineer doing GitHub issue/PR triage.

Output format:
- Return JSON only (no Markdown, no code fences).

Rules:
- Always follow the schema exactly.
- Never include extra top-level keys.

Schema (required):
- summary: string
- priority: one of ["p0","p1","p2","p3"]
- risk: one of ["low","medium","high"]
- action_items: array of strings
- draft_reply: string

Constraints:
- Be concise, practical, and polite.
- Use imperative verbs in action_items.
"""

MODEL = os.getenv("OPENAI_MODEL", "gpt-4o")

_openai_client: openai.OpenAI | None = None

def setup_orbis() -> None:
    configure(
        api_key="T1BFTkFJLWFnZW50XtwEl6DdxdgXYn8BsklwIA==",
        project_id="d823b86f-f6c5-47ab-b40b-35b53f9ac803",
        user_id="fbd31533-fe77-427f-9d2d-a1c4c69e9a6d",
        api_url="http://localhost:8080",
        debug=True,
    )
    instrument_all()
    # Keep total span count low for this test file.
    # (HTTP auto-instrumentation creates one span per request.)

def get_openai_client() -> openai.OpenAI:
    global _openai_client
    if _openai_client is not None:
        return _openai_client
    if not OPENAI_KEY:
        raise RuntimeError("Missing OpenAI key: set `OPENAI_API_KEY` (or `OPENAI_KEY`).")
    _openai_client = openai.OpenAI(api_key=OPENAI_KEY)
    return _openai_client

def _http_get_json(
    url: str,
    *,
    headers: dict | None = None,
    params: dict | None = None,
    timeout: float = 20.0,
    retries: int = 2,
) -> object:
    last_exc: Exception | None = None
    for attempt in range(retries + 1):
        try:
            r = httpx.get(url, headers=headers, params=params, timeout=timeout)
            if r.status_code in (429, 502, 503, 504) and attempt < retries:
                retry_after = r.headers.get("Retry-After")
                if retry_after:
                    try:
                        import time

                        time.sleep(min(float(retry_after), 3.0))
                    except Exception:
                        pass
                continue
            r.raise_for_status()
            return r.json()
        except Exception as e:
            last_exc = e
            if attempt >= retries:
                raise
    raise last_exc or RuntimeError("HTTP request failed")

def _read_streamed_content(stream) -> str:
    content = ""
    for chunk in stream:
        if not getattr(chunk, "choices", None):
            continue
        delta = getattr(chunk.choices[0], "delta", None)
        token = getattr(delta, "content", None) if delta else None
        if token:
            content += token
    return content

def _stream_chat(*, model: str, messages: list[dict], max_tokens: int = 300, temperature: float = 0.2) -> str:
    client = get_openai_client()
    stream = client.chat.completions.create(
        model=model,
        messages=messages,
        max_tokens=max_tokens,
        temperature=temperature,
        stream=True,
    )
    return _read_streamed_content(stream)

def _best_effort_json(raw: str) -> dict:
    try:
        return json.loads(raw)
    except Exception:
        pass

    m = re.search(r"\{(?:.|\n)*\}", raw)
    if m:
        try:
            return json.loads(m.group(0))
        except Exception:
            pass

    return {
        "summary": raw[:2000],
        "priority": "p2",
        "risk": "unknown",
        "action_items": ["Model did not return valid JSON; inspect raw output."],
        "draft_reply": "Thanks for the report — we’re looking into it.",
        "_raw_model_output": raw[:4000],
    }

def _gh_headers() -> dict:
    h = {"Accept": "application/vnd.github+json", "User-Agent": "orbis-observability-sdk-test"}
    if GITHUB_TOKEN:
        h["Authorization"] = f"Bearer {GITHUB_TOKEN}"
    return h

# tools (http + cli + analysis)
@observe_tool(name="github_rate_limit_api", category="api")
def fetch_rate_limit() -> dict:
    url = "https://api.github.com/rate_limit"
    data = _http_get_json(url, headers=_gh_headers(), timeout=20.0)
    return data if isinstance(data, dict) else {}

@observe_tool(name="github_issue_api", category="api")
def fetch_issue(owner: str, repo: str, number: int) -> dict:
    url = f"https://api.github.com/repos/{owner}/{repo}/issues/{number}"
    data = _http_get_json(url, headers=_gh_headers(), timeout=20.0)
    return data if isinstance(data, dict) else {}

@observe_tool(name="github_issue_comments_api", category="api")
def fetch_comments(owner: str, repo: str, number: int) -> list[dict]:
    url = f"https://api.github.com/repos/{owner}/{repo}/issues/{number}/comments"
    data = _http_get_json(url, headers=_gh_headers(), timeout=20.0)
    return data if isinstance(data, list) else []


@observe_tool(name="github_repo_api", category="api")
def fetch_repo(owner: str, repo: str) -> dict:
    url = f"https://api.github.com/repos/{owner}/{repo}"
    data = _http_get_json(url, headers=_gh_headers(), timeout=20.0)
    return data if isinstance(data, dict) else {}

@observe_tool(name="github_repo_languages_api", category="api")
def fetch_languages(owner: str, repo: str) -> dict:
    url = f"https://api.github.com/repos/{owner}/{repo}/languages"
    data = _http_get_json(url, headers=_gh_headers(), timeout=20.0)
    return data if isinstance(data, dict) else {}

@observe_tool(name="github_readme_api", category="api")
def fetch_readme(owner: str, repo: str) -> dict:
    url = f"https://api.github.com/repos/{owner}/{repo}/readme"
    try:
        data = _http_get_json(url, headers=_gh_headers(), timeout=20.0)
    except httpx.HTTPStatusError as e:
        if getattr(e.response, "status_code", None) == 404:
            return {"text": "", "path": None}
        raise
    data = data if isinstance(data, dict) else {}
    content_b64 = data.get("content") or ""
    try:
        text = base64.b64decode(content_b64).decode("utf-8", errors="replace")
    except Exception:
        text = ""
    return {"text": text, "path": data.get("path")}

@observe_tool(name="github_latest_release_api", category="api")
def fetch_latest_release(owner: str, repo: str) -> dict:
    url = f"https://api.github.com/repos/{owner}/{repo}/releases/latest"
    try:
        data = _http_get_json(url, headers=_gh_headers(), timeout=20.0)
    except httpx.HTTPStatusError as e:
        if getattr(e.response, "status_code", None) in (404, 422):
            return {}
        raise
    return data if isinstance(data, dict) else {}

@observe_tool(name="github_contributors_api", category="api")
def fetch_top_contributors(owner: str, repo: str, limit: int = 5) -> list[dict]:
    url = f"https://api.github.com/repos/{owner}/{repo}/contributors"
    data = _http_get_json(url, headers=_gh_headers(), params={"per_page": limit}, timeout=20.0)
    if not isinstance(data, list):
        return []
    out: list[dict] = []
    for c in data[:limit]:
        if isinstance(c, dict):
            out.append({"login": c.get("login"), "contributions": c.get("contributions")})
    return out

@observe_tool(name="github_search_issues_api", category="api")
def search_similar_issues(owner: str, repo: str, title: str, limit: int = 5) -> list[dict]:
    keywords = " ".join(re.findall(r"[A-Za-z0-9_\\-]{4,}", title)[:6])
    if not keywords:
        return []
    q = f"repo:{owner}/{repo} is:issue {keywords}"
    url = "https://api.github.com/search/issues"
    data = _http_get_json(url, headers=_gh_headers(), params={"q": q, "per_page": limit}, timeout=20.0)
    if not isinstance(data, dict):
        return []
    items = data.get("items")
    if not isinstance(items, list):
        return []
    out: list[dict] = []
    for it in items[:limit]:
        if isinstance(it, dict):
            out.append({"number": it.get("number"), "title": it.get("title"), "state": it.get("state"), "url": it.get("html_url")})
    return out

@observe_tool(name="pypi_package_api", category="api")
def fetch_pypi_package(package: str) -> dict:
    url = f"https://pypi.org/pypi/{package}/json"
    try:
        data = _http_get_json(url, timeout=20.0)
    except httpx.HTTPStatusError as e:
        if getattr(e.response, "status_code", None) == 404:
            return {"package": package, "exists": False}
        raise
    data = data if isinstance(data, dict) else {}
    info = data.get("info") or {}
    return {
        "package": package,
        "exists": True,
        "version": info.get("version"),
        "summary": info.get("summary"),
        "home_page": info.get("home_page"),
    }


@observe_tool(name="git_branch", category="cli")
def current_git_branch() -> str:
    res = run_tracked_command(["git", "rev-parse", "--abbrev-ref", "HEAD"], shell=False, timeout=5)
    return (res.stdout or "").strip()

@observe_tool(name="git_status_short", category="cli")
def git_status_short() -> str:
    res = run_tracked_command(["git", "status", "--porcelain"], shell=False, timeout=5)
    return (res.stdout or "").strip()

@observe_tool(name="git_recent_commits", category="cli")
def git_recent_commits(limit: int = 5) -> str:
    res = run_tracked_command(
        ["git", "log", f"-n{limit}", "--pretty=format:%h %ad %s", "--date=short"],
        shell=False,
        timeout=5,
    )
    return (res.stdout or "").strip()

@observe_tool(name="python_version", category="cli")
def python_version() -> str:
    res = run_tracked_command(["python3", "--version"], shell=False, timeout=5)
    return (res.stdout or "").strip()

@observe_tool(name="pip_show_openai", category="cli")
def pip_show_openai() -> str:
    res = run_tracked_command(["python3", "-m", "pip", "show", "openai"], shell=False, timeout=10)
    return (res.stdout or "").strip()

@observe_tool(name="risk_heuristics", category="analysis")
def risk_heuristics(issue: dict, comments: list[dict]) -> dict:
    title = (issue.get("title") or "").lower()
    body = (issue.get("body") or "").lower()
    text = title + "\n" + body

    comment_count = len(comments)
    has_stacktrace = "traceback" in text or "exception" in text or "stack" in text
    mentions_security = "security" in text or "vuln" in text or "cve" in text
    mentions_data_loss = "data loss" in text or "deleted" in text or "corrupt" in text
    mentions_breaking = "breaking" in text or "regression" in text

    score = 0
    score += 2 if mentions_security else 0
    score += 2 if mentions_data_loss else 0
    score += 1 if has_stacktrace else 0
    score += 1 if mentions_breaking else 0
    score += 1 if comment_count >= 5 else 0

    if score >= 4:
        risk = "high"
    elif score >= 2:
        risk = "medium"
    else:
        risk = "low"

    return {
        "risk_score": score,
        "risk": risk,
        "signals": {
            "comment_count": comment_count,
            "has_stacktrace": has_stacktrace,
            "mentions_security": mentions_security,
            "mentions_data_loss": mentions_data_loss,
            "mentions_breaking": mentions_breaking,
        },
    }

@observe(name="collect_context")
def collect_context(
    owner: str,
    repo: str,
    number: int,
    *,
    include_pypi: bool,
) -> dict:
    repo_meta = fetch_repo(owner, repo)
    issue = fetch_issue(owner, repo, number)
    comments = fetch_comments(owner, repo, number)
    branch = current_git_branch()
    status = git_status_short()
    commits = git_recent_commits(limit=5)
    pyver = python_version()
    pip_openai = pip_show_openai()
    heur = risk_heuristics(issue, comments)
    pypi_openai = fetch_pypi_package("openai") if include_pypi else {"package": "openai", "exists": None}

    return {
        "repo_meta": repo_meta,
        "issue": issue,
        "comments": comments,
        "branch": branch,
        "git_status": status,
        "git_recent_commits": commits,
        "python_version": pyver,
        "pip_show_openai": pip_openai,
        "heuristics": heur,
        "pypi_openai": pypi_openai,
    }

@observe(name="llm_flow")
def llm_flow(*, model: str, issue_block: dict) -> dict:
    print("1. 🧠 LLM #1: Create triage plan (streaming)...")
    plan = _stream_chat(
        model=model,
        max_tokens=150,
        temperature=0.4,
        messages=[
            {"role": "system", "content": "Create a short, practical plan. Output 3 bullets."},
            {"role": "user", "content": f"Create a triage plan for {issue_block.get('repo')}#{issue_block.get('number')}."},
        ],
    )

    print("2. 🧠 LLM #2: Summarize issue (streaming)...")
    issue_summary = _stream_chat(
        model=model,
        max_tokens=200,
        temperature=0.3,
        messages=[
            {"role": "system", "content": "Summarize the issue/pr in 4 bullets: what, expected, actual, impact."},
            {
                "role": "user",
                "content": json.dumps(
                    {k: issue_block.get(k) for k in ["repo", "number", "title", "state", "labels", "body", "heuristics"]}
                ),
            },
        ],
    )

    print("3. 🧠 LLM #3: Summarize comments (streaming)...")
    comments_summary = _stream_chat(
        model=model,
        max_tokens=220,
        temperature=0.3,
        messages=[
            {"role": "system", "content": "Summarize the key information from comments in 4 bullets."},
            {
                "role": "user",
                "content": json.dumps(
                    {"repo": issue_block.get("repo"), "number": issue_block.get("number"), "top_comments": issue_block.get("top_comments", [])}
                ),
            },
        ],
    )

    print("4. 🧠 LLM #4: Propose root causes + repro (streaming)...")
    hypotheses = _stream_chat(
        model=model,
        max_tokens=300,
        temperature=0.4,
        messages=[
            {"role": "system", "content": "Propose 3 likely root causes and 3 reproduction steps. Output bullets."},
            {"role": "user", "content": json.dumps(issue_block)},
        ],
    )

    print("5. 🧠 LLM #5: Ask clarifying questions (streaming)...")
    questions = _stream_chat(
        model=model,
        max_tokens=240,
        temperature=0.4,
        messages=[
            {"role": "system", "content": "Ask up to 5 clarifying questions to unblock triage. Output bullets."},
            {"role": "user", "content": json.dumps(issue_block)},
        ],
    )

    print("6. 🧠 LLM #6: Produce triage JSON (streaming)...")
    triage_raw = _stream_chat(
        model=model,
        max_tokens=500,
        temperature=0.2,
        messages=[
            {"role": "system", "content": PROMPT_TEMPLATE},
            {
                "role": "user",
                "content": "Triage this GitHub issue/PR. Consider these notes too:\n\n"
                + json.dumps(
                    {
                        "context": issue_block,
                        "issue_summary": issue_summary,
                        "comments_summary": comments_summary,
                        "hypotheses": hypotheses,
                    }
                ),
            },
        ],
    )
    triage_json = _best_effort_json(triage_raw)

    print("7. 🧠 LLM #7: Labels + owner + draft reply (streaming)...")
    labels_and_reply_raw = _stream_chat(
        model=model,
        max_tokens=260,
        temperature=0.35,
        messages=[
            {
                "role": "system",
                "content": (
                    "Output JSON with keys: labels (array of strings), owner_area (string), "
                    "draft_reply (string, 4-6 sentences, polite, no promises)."
                ),
            },
            {"role": "user", "content": json.dumps({"triage": triage_json, "questions": questions})},
        ],
    )
    labels_and_reply = _best_effort_json(labels_and_reply_raw)

    return {
        "plan": plan,
        "issue_summary": issue_summary,
        "comments_summary": comments_summary,
        "hypotheses": hypotheses,
        "questions": questions,
        "triage": triage_json,
        "label_suggestions": labels_and_reply,
        "draft_reply": labels_and_reply.get("draft_reply") if isinstance(labels_and_reply, dict) else "",
    }

def build_issue_context(
    *,
    owner: str,
    repo: str,
    number: int,
    repo_meta: dict,
    issue: dict,
    comments: list[dict],
    branch: str,
    pypi_openai: dict,
    heur: dict,
) -> dict:
    return {
        "repo": f"{owner}/{repo}",
        "repo_stars": repo_meta.get("stargazers_count"),
        "repo_language": repo_meta.get("language"),
        "repo_default_branch": repo_meta.get("default_branch"),
        "number": issue.get("number"),
        "is_pull_request": bool(issue.get("pull_request")),
        "title": issue.get("title"),
        "state": issue.get("state"),
        "author": (issue.get("user") or {}).get("login"),
        "body": (issue.get("body") or "")[:2000],
        "labels": [l.get("name") for l in (issue.get("labels") or []) if isinstance(l, dict)],
        "comments_count": len(comments),
        "top_comments": [
            {
                "author": (c.get("user") or {}).get("login"),
                "body": (c.get("body") or "")[:800],
            }
            for c in comments[:5]
            if isinstance(c, dict)
        ],
        "local_branch": branch,
        "heuristics": heur,
        "pypi_openai": pypi_openai,
    }

@observe(
    name="github_pr_triage_agent",
    prompt_id=PROMPT_ID,
    prompt_version=PROMPT_VERSION,
    prompt_template=PROMPT_TEMPLATE,
    metadata={"agent": "triage", "provider": "openai"},
    tags=["triage", "github", "openai", "prodlike", "v2"],
)
def triage(
    owner: str,
    repo: str,
    number: int,
    *,
    model: str = MODEL,
    include_pypi: bool = True,
) -> dict:
    span = get_current_span()
    trace_id = span.trace_id if span else str(uuid4())
    print(f"\n{'='*70}")
    print(f"🤖 GitHub PR/Issue Triage Agent: {owner}/{repo}#{number}")
    print(f"{'='*70}\n")

    ctx = collect_context(owner, repo, number, include_pypi=include_pypi)
    repo_meta = ctx["repo_meta"]
    issue = ctx["issue"]
    comments = ctx["comments"]
    branch = ctx["branch"]
    heur = ctx["heuristics"]
    pypi_openai = ctx["pypi_openai"]

    issue_block = build_issue_context(
        owner=owner,
        repo=repo,
        number=number,
        repo_meta=repo_meta,
        issue=issue,
        comments=comments,
        branch=branch,
        pypi_openai=pypi_openai,
        heur=heur,
    )

    llm = llm_flow(model=model, issue_block=issue_block)
    triage_json = llm["triage"]
    if triage_json.get("risk") in (None, "", "unknown"):
        triage_json["risk"] = heur.get("risk") or "unknown"

    return {
        "trace_id": trace_id,
        "repo": f"{owner}/{repo}",
        "number": number,
        "title": issue.get("title"),
        "context": {
            "local_branch": ctx["branch"],
            "local_git_status": ctx["git_status"],
            "local_recent_commits": ctx["git_recent_commits"],
            "python_version": ctx["python_version"],
            "pip_show_openai": ctx["pip_show_openai"],
        },
        "plan": llm["plan"],
        "issue_summary": llm["issue_summary"],
        "comments_summary": llm["comments_summary"],
        "questions": llm["questions"],
        "hypotheses": llm["hypotheses"],
        "triage": triage_json,
        "label_suggestions": llm["label_suggestions"],
        "draft_reply": llm["draft_reply"],
        "heuristics": heur,
    }

if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="GitHub triage agent demo (single trace, many spans).")
    parser.add_argument("--owner", default="apple")
    parser.add_argument("--repo", default="coremltools")
    parser.add_argument("--number", type=int, default=2625)
    parser.add_argument("--model", default=MODEL)
    parser.add_argument("--no-pypi", action="store_true", help="Skip PyPI metadata fetch")
    args = parser.parse_args()

    setup_orbis()

    result = triage(
        args.owner,
        args.repo,
        args.number,
        model=args.model,
        include_pypi=not args.no_pypi,
    )
    print(json.dumps(result, indent=2)[:6000])
    print("trace_id:", result["trace_id"])
