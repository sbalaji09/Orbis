"""
Comprehensive Agent Test: LLM + Tools + HTTP + CLI
This test demonstrates a real AI agent workflow combining all tracking features
"""

import sys
import os
sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..'))

from observability_sdk import observe, observe_tool, instrument_http, run_tracked_command
from observability_sdk.collector.config import configure

# Check dependencies
try:
    import httpx
    from openai import OpenAI
except ImportError as e:
    print(f"❌ Missing dependency: {e}")
    print("Install with: pip install httpx openai")
    sys.exit(1)

# Configure Orbis
configure(
    api_key="test-tool-tracking-key-123",
    project_id="616d8f4e-8b03-4112-a40c-a61164977cb5",
    user_id="00000000-0000-0000-0000-000000000000",
    api_url="http://localhost:8080",
)

# Enable HTTP instrumentation
print("🔧 Enabling HTTP instrumentation...")
instrument_http(httpx)

# Initialize OpenAI client
client = OpenAI()

# Define custom tools
@observe_tool(name="github_user_lookup", category="api")
def get_github_user(username: str) -> dict:
    """Fetch GitHub user information"""
    response = httpx.get(f"https://api.github.com/users/{username}")
    return response.json()

@observe_tool(name="repo_counter", category="analytics")
def count_repos(user_data: dict) -> dict:
    """Count user's public repositories"""
    return {
        "username": user_data.get("login"),
        "public_repos": user_data.get("public_repos"),
        "followers": user_data.get("followers"),
        "following": user_data.get("following")
    }

@observe_tool(name="git_check", category="cli")
def check_git_version():
    """Check git version using CLI"""
    result = run_tracked_command("git --version")
    return result.stdout.strip()

@observe(name="research_github_user_agent")
def research_github_user(username: str):
    """
    AI Agent that researches a GitHub user.

    This agent:
    1. Uses LLM to plan the research
    2. Calls GitHub API to get user data
    3. Analyzes the data with a custom tool
    4. Checks local git version with CLI
    5. Uses LLM to summarize findings
    """
    print(f"\n🤖 Starting research on GitHub user: {username}\n")

    # Step 1: LLM Planning
    print("1️⃣  LLM: Planning research strategy...")
    planning_prompt = f"I need to research GitHub user '{username}'. What information should I gather?"

    planning_response = client.chat.completions.create(
        model="gpt-3.5-turbo",
        messages=[
            {"role": "system", "content": "You are a helpful research assistant."},
            {"role": "user", "content": planning_prompt}
        ],
        max_tokens=100
    )
    plan = planning_response.choices[0].message.content
    print(f"   ✓ Plan: {plan[:100]}...")

    # Step 2: HTTP API call (via custom tool which internally uses httpx)
    print(f"\n2️⃣  Tool: Fetching {username}'s GitHub profile...")
    user_data = get_github_user(username)
    print(f"   ✓ Found user: {user_data.get('name', 'Unknown')}")

    # Step 3: Custom analytics tool
    print("\n3️⃣  Tool: Analyzing repository data...")
    stats = count_repos(user_data)
    print(f"   ✓ Stats: {stats}")

    # Step 4: CLI command
    print("\n4️⃣  CLI: Checking local git version...")
    git_version = check_git_version()
    print(f"   ✓ {git_version}")

    # Step 5: LLM Summarization
    print("\n5️⃣  LLM: Generating summary...")
    summary_prompt = f"""
    Summarize this GitHub user in 2-3 sentences:
    - Username: {stats['username']}
    - Public repos: {stats['public_repos']}
    - Followers: {stats['followers']}
    - Following: {stats['following']}
    - Bio: {user_data.get('bio', 'No bio')}
    """

    summary_response = client.chat.completions.create(
        model="gpt-3.5-turbo",
        messages=[
            {"role": "system", "content": "You are a helpful research assistant. Be concise."},
            {"role": "user", "content": summary_prompt}
        ],
        max_tokens=150
    )
    summary = summary_response.choices[0].message.content
    print(f"   ✓ Summary: {summary}")

    return {
        "username": username,
        "stats": stats,
        "summary": summary,
        "git_version": git_version
    }

if __name__ == "__main__":
    print("=" * 70)
    print("🧪 Comprehensive Agent Test: LLM + Tools + HTTP + CLI")
    print("=" * 70)

    # Run the agent
    result = research_github_user("octocat")

    print("\n" + "=" * 70)
    print("✅ Agent workflow completed!")
    print("=" * 70)

    print("\n📊 Expected results in Orbis dashboard:")
    print("   - 1 trace: 'research_github_user_agent'")
    print("   - Multiple spans showing:")
    print("\n   Parent Span:")
    print("     └─ research_github_user_agent (type: function)")
    print("\n   Child Spans (in order):")
    print("     ├─ 1. OpenAI GPT-3.5 call (type: llm) - Planning")
    print("     ├─ 2. github_user_lookup (type: tool)")
    print("     │   └─ httpx.GET github.com (type: http)")
    print("     ├─ 3. repo_counter (type: tool)")
    print("     ├─ 4. git_check (type: tool)")
    print("     │   └─ cli.git (type: cli)")
    print("     └─ 5. OpenAI GPT-3.5 call (type: llm) - Summary")
    print("\n   Total: ~8-10 spans showing complete agent workflow!")
    print("\n💡 This demonstrates:")
    print("   ✓ LLM tracking (OpenAI calls)")
    print("   ✓ HTTP tracking (GitHub API)")
    print("   ✓ Custom tools (github_user_lookup, repo_counter)")
    print("   ✓ CLI tracking (git --version)")
    print("   ✓ Proper span nesting/hierarchy")
    print("\n💡 Check your Orbis dashboard to see the complete trace DAG!")