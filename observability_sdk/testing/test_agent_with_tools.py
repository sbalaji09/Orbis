"""
GitHub Research Agent: Multiple LLM Calls + Tools + APIs + CLI
Enhanced with 5 LLM streaming calls throughout the workflow
"""

import sys
import os
sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..'))

from observability_sdk import configure, instrument_all, observe, observe_tool, instrument_http, run_tracked_command
from observability_sdk.collector.collector import get_collector
import openai
import time

GROQ_API_KEY = "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"

# Check dependencies
try:
    import httpx
except ImportError as e:
    print(f"❌ Missing dependency: {e}")
    print("Install with: pip install httpx openai")
    sys.exit(1)

# Configure Orbis
configure(
    api_key="VGVzdCBBZ2VudAyqF8dhGI1mMuqLtMFmouY=",
    project_id="61d12c7c-e745-4a14-a039-60b7a5d1df62",
    user_id="fbd31533-fe77-427f-9d2d-a1c4c69e9a6d",
    api_url="http://localhost:8080",
)

# Enable all instrumentation
instrument_all()
instrument_http(httpx)

# Configure OpenAI client to use Groq
client = openai.OpenAI(
    api_key=GROQ_API_KEY,
    base_url="https://api.groq.com/openai/v1"
)

# ===================================================``=========================
# API TOOLS
# ============================================================================

@observe_tool(name="github_user_api", category="api")
def get_github_user(username: str) -> dict:
    """Get GitHub user profile"""
    print(f"   📡 Fetching user...")
    response = httpx.get(f"https://api.github.com/users/{username}", timeout=10.0)
    data = response.json()
    return {
        "username": data.get("login"),
        "name": data.get("name"),
        "repos": data.get("public_repos"),
        "followers": data.get("followers"),
        "bio": data.get("bio"),
        "company": data.get("company"),
        "location": data.get("location")
    }

@observe_tool(name="github_repos_api", category="api")
def get_top_repos(username: str) -> list:
    """Get top repositories"""
    print(f"   📡 Fetching repos...")
    response = httpx.get(
        f"https://api.github.com/users/{username}/repos",
        params={"sort": "updated", "per_page": 5},
        timeout=10.0
    )
    repos = response.json()
    return [{
        "name": r["name"],
        "stars": r["stargazers_count"],
        "language": r["language"],
        "description": r["description"]
    } for r in repos[:5]]

# ============================================================================
# ANALYTICS TOOLS
# ============================================================================

@observe_tool(name="developer_scorer", category="analytics")
def calculate_score(repos: int, followers: int) -> dict:
    """Calculate developer score"""
    print(f"   📊 Calculating score...")
    score = (repos * 10) + (followers * 5)
    
    if score > 10000:
        tier = "🌟 Legend"
    elif score > 1000:
        tier = "🚀 Influential"
    else:
        tier = "💻 Active"
    
    return {"score": score, "tier": tier}

# ============================================================================
# CLI TOOLS
# ============================================================================

@observe_tool(name="git_check", category="cli")
def check_git():
    """Check git version"""
    print(f"   🔧 Checking git...")
    result = run_tracked_command("git --version")
    return result.stdout.strip()

@observe_tool(name="python_check", category="cli")
def check_python():
    """Check Python version"""
    print(f"   🐍 Checking Python...")
    result = run_tracked_command("python3 --version")
    return result.stdout.strip()

# ============================================================================
# MAIN AGENT WITH 5 LLM CALLS
# ============================================================================

@observe(
    name="github_research_agent",
    prompt_id="agent_orchestrator",
    prompt_version="v1.0",
    prompt_template="Orchestrate a complete GitHub user research workflow with multiple LLM analysis steps"
)
def research_github_user(username: str):
    """
    Enhanced GitHub Research Agent with:
    - 5 LLM streaming calls (each with prompt versioning)
    - 2 HTTP API calls
    - 1 Analytics tool
    - 2 CLI commands
    """
    print(f"\n{'='*70}")
    print(f"🤖 Enhanced GitHub Research Agent: @{username}")
    print(f"{'='*70}\n")

    # ========================================================================
    # LLM CALL #1: INITIAL PLANNING
    # ========================================================================
    print("1. 🧠 LLM #1: Planning Research (streaming)...")
    print("   💬 ", end="", flush=True)
    
    plan_response = client.chat.completions.create(
        model="llama-3.3-70b-versatile",
        messages=[
            {"role": "system", "content": "You're a research assistant. Create a brief plan."},
            {"role": "user", "content": f"Create a 2-sentence plan to research GitHub user @{username}. What key metrics should we gather?"}
        ],
        max_tokens=150,
        temperature=0.7,
        stream=True
    )
    
    plan = ""
    for chunk in plan_response:
        if chunk.choices[0].delta.content:
            content = chunk.choices[0].delta.content
            plan += content
            print(content, end="", flush=True)
    print("\n   ✅ Plan created\n")

    # ========================================================================
    # STEP 2: FETCH USER DATA
    # ========================================================================
    print("2. 📊 Fetching user profile...")
    user = get_github_user(username)
    print(f"   ✅ {user['name']} - {user['repos']} repos, {user['followers']} followers\n")

    # ========================================================================
    # LLM CALL #2: ANALYZE USER PROFILE
    # ========================================================================
    print("3. 🧠 LLM #2: Analyzing Profile (streaming)...")
    print("   💬 ", end="", flush=True)
    
    profile_analysis = client.chat.completions.create(
        model="llama-3.3-70b-versatile",
        messages=[
            {"role": "system", "content": "You're a GitHub profile analyst. Be concise."},
            {"role": "user", "content": f"""
Analyze this GitHub profile in 2 sentences:
- Name: {user['name']} (@{user['username']})
- Bio: {user['bio'] or 'No bio'}
- Location: {user['location'] or 'Unknown'}
- Company: {user['company'] or 'Independent'}
- Stats: {user['repos']} repos, {user['followers']} followers

What stands out about this developer?
"""}
        ],
        max_tokens=150,
        temperature=0.7,
        stream=True
    )
    
    profile_insight = ""
    for chunk in profile_analysis:
        if chunk.choices[0].delta.content:
            content = chunk.choices[0].delta.content
            profile_insight += content
            print(content, end="", flush=True)
    print("\n   ✅ Profile analyzed\n")

    # ========================================================================
    # STEP 4: FETCH REPOSITORIES
    # ========================================================================
    print("4. 📚 Fetching repositories...")
    repos = get_top_repos(username)
    print(f"   ✅ Found {len(repos)} repos\n")

    # ========================================================================
    # LLM CALL #3: ANALYZE REPOSITORY FOCUS
    # ========================================================================
    print("5. 🧠 LLM #3: Analyzing Repository Focus (streaming)...")
    print("   💬 ", end="", flush=True)
    
    repo_names = ", ".join([r['name'] for r in repos[:5]])
    languages = ", ".join(list(set([r['language'] for r in repos if r['language']])))
    
    repo_analysis = client.chat.completions.create(
        model="llama-3.3-70b-versatile",
        messages=[
            {"role": "system", "content": "You're a code repository analyst. Be brief."},
            {"role": "user", "content": f"""
Based on these repositories: {repo_names}
Using languages: {languages}

In 2 sentences, what is this developer's primary focus or expertise?
"""}
        ],
        max_tokens=150,
        temperature=0.7,
        stream=True
    )
    
    repo_focus = ""
    for chunk in repo_analysis:
        if chunk.choices[0].delta.content:
            content = chunk.choices[0].delta.content
            repo_focus += content
            print(content, end="", flush=True)
    print("\n   ✅ Repository focus identified\n")

    # ========================================================================
    # STEP 6: CALCULATE SCORE
    # ========================================================================
    print("6. 🎯 Calculating influence score...")
    score = calculate_score(user['repos'], user['followers'])
    print(f"   ✅ Score: {score['score']:,} - {score['tier']}\n")

    # ========================================================================
    # LLM CALL #4: INTERPRET INFLUENCE SCORE
    # ========================================================================
    print("7. 🧠 LLM #4: Interpreting Influence (streaming)...")
    print("   💬 ", end="", flush=True)
    
    score_interpretation = client.chat.completions.create(
        model="llama-3.3-70b-versatile",
        messages=[
            {"role": "system", "content": "You're a developer metrics analyst. Be insightful."},
            {"role": "user", "content": f"""
This developer has:
- Influence Score: {score['score']:,}
- Tier: {score['tier']}
- {user['repos']} repositories
- {user['followers']} followers

In 2 sentences, what does this score tell us about their impact in the GitHub community?
"""}
        ],
        max_tokens=150,
        temperature=0.7,
        stream=True
    )
    
    impact_analysis = ""
    for chunk in score_interpretation:
        if chunk.choices[0].delta.content:
            content = chunk.choices[0].delta.content
            impact_analysis += content
            print(content, end="", flush=True)
    print("\n   ✅ Impact analyzed\n")

    # ========================================================================
    # STEP 8: CHECK LOCAL ENVIRONMENT
    # ========================================================================
    print("8. 🔧 Checking local git...")
    git_ver = check_git()
    print(f"   ✅ {git_ver}\n")

    print("9. 🐍 Checking Python...")
    python_ver = check_python()
    print(f"   ✅ {python_ver}\n")

    # ========================================================================
    # LLM CALL #5: FINAL COMPREHENSIVE SUMMARY
    # ========================================================================
    print("10. 🧠 LLM #5: Final Summary (streaming)...")
    print("    💬 ", end="", flush=True)
    
    final_summary = client.chat.completions.create(
        model="llama-3.3-70b-versatile",
        messages=[
            {"role": "system", "content": "You're a tech writer. Create an engaging summary."},
            {"role": "user", "content": f"""
Create a comprehensive 4-sentence summary of this GitHub developer:

Profile:
{profile_insight}

Focus:
{repo_focus}

Impact:
{impact_analysis}

Developer: {user['name']} (@{user['username']})
Top repo: {repos[0]['name']} with {repos[0]['stars']} stars

Make it engaging and highlight their contributions!
"""}
        ],
        max_tokens=250,
        temperature=0.7,
        stream=True
    )
    
    summary = ""
    for chunk in final_summary:
        if chunk.choices[0].delta.content:
            content = chunk.choices[0].delta.content
            summary += content
            print(content, end="", flush=True)
    print("\n    ✅ Summary complete\n")

    # ========================================================================
    # DONE
    # ========================================================================
    print("=" * 70)
    print("✅ RESEARCH COMPLETE!")
    print("=" * 70)
    
    return {
        "username": username,
        "plan": plan,
        "user": user,
        "profile_insight": profile_insight,
        "repos": repos,
        "repo_focus": repo_focus,
        "score": score,
        "impact_analysis": impact_analysis,
        "summary": summary,
        "git_version": git_ver,
        "python_version": python_ver
    }

# ============================================================================
# RUN
# ============================================================================

if __name__ == "__main__":
    print("\n🧪 Enhanced GitHub Research Agent - 5 LLM Calls\n")
    
    result = research_github_user("octocat")
    
    print("\n" + "=" * 70)
    print("📊 EXPECTED DASHBOARD")
    print("=" * 70)
    
    print("\n✨ Total Spans: ~15-18")
    print("\n🧠 LLM Spans (5 total - all streaming):")
    print("   1. Planning Research")
    print("   2. Profile Analysis")
    print("   3. Repository Focus Analysis")
    print("   4. Influence Score Interpretation")
    print("   5. Final Comprehensive Summary")
    
    print("\n🌲 Span Hierarchy:")
    print("   github_research_agent (function)")
    print("   ├─ openai.llama-3.3-70b-versatile #1 (llm, streaming) 🧠")
    print("   ├─ github_user_api (tool)")
    print("   │  └─ httpx.GET (http)")
    print("   ├─ openai.llama-3.3-70b-versatile #2 (llm, streaming) 🧠")
    print("   ├─ github_repos_api (tool)")
    print("   │  └─ httpx.GET (http)")
    print("   ├─ openai.llama-3.3-70b-versatile #3 (llm, streaming) 🧠")
    print("   ├─ developer_scorer (tool)")
    print("   ├─ openai.llama-3.3-70b-versatile #4 (llm, streaming) 🧠")
    print("   ├─ git_check (tool)")
    print("   │  └─ cli.git (cli)")
    print("   ├─ python_check (tool)")
    print("   │  └─ cli.python (cli)")
    print("   └─ openai.llama-3.3-70b-versatile #5 (llm, streaming) 🧠")
    
    print("\n📈 What You'll See:")
    print("   • 5 LLM streaming spans (green nodes)")
    print("   • 2 HTTP API calls (blue nodes)")
    print("   • 3 Tool spans (yellow nodes)")
    print("   • 2 CLI commands (cyan nodes)")
    print("   • All with proper parent-child relationships")
    print("   • Streaming metrics: TTFT, TPS for each LLM call")
    
    print("\n💡 Each LLM call does something different:")
    print("   1. Plans the research approach")
    print("   2. Analyzes the user's profile")
    print("   3. Identifies repository focus areas")
    print("   4. Interprets influence metrics")
    print("   5. Synthesizes everything into final summary")
    
    print("\n🚀 Check http://localhost:3000\n")
    
    # Flush
    print("📤 Flushing...")
    get_collector().flush()
    time.sleep(2)
    print("✅ Done!\n")