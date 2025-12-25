"""
Mixed Success/Failure Test Agent
Shows realistic scenarios where some operations succeed and others fail
"""

import sys
import os
sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..'))

from observability_sdk import configure, instrument_all, observe, observe_tool, instrument_http, run_tracked_command
from observability_sdk.collector.collector import get_collector
import openai
import httpx
import time

GROQ_API_KEY = "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"

# Configure Orbis
configure(
    api_key="VGVzdCBUcmFjZSAMlhbKlbc_MKUVQ-Kb1c95",
    project_id="aca167c7-6c08-4fe2-a7af-21ec298e1d68",
    user_id="fbd31533-fe77-427f-9d2d-a1c4c69e9a6d",
    api_url="http://localhost:8080"
)

# Enable instrumentation
instrument_all()
instrument_http(httpx)

# Configure OpenAI client
client = openai.OpenAI(
    api_key=GROQ_API_KEY,
    base_url="https://api.groq.com/openai/v1"
)

@observe_tool(name="fetch_user_success", category="api")
def fetch_valid_user():
    """Fetch a user that exists - SUCCESS"""
    print("   ✅ Fetching valid user...")
    response = httpx.get("https://api.github.com/users/octocat", timeout=10.0)
    response.raise_for_status()
    return response.json()

@observe_tool(name="fetch_user_failure", category="api")
def fetch_invalid_user():
    """Fetch a user that doesn't exist - FAILURE"""
    print("   ❌ Fetching invalid user...")
    response = httpx.get("https://api.github.com/users/this-user-does-not-exist-xyz-999", timeout=10.0)
    response.raise_for_status()  # Will raise 404
    return response.json()

@observe_tool(name="git_version_success", category="cli")
def check_git_version():
    """Check git version - SUCCESS"""
    print("   ✅ Checking git version...")
    result = run_tracked_command("git --version")
    if result.returncode != 0:
        raise RuntimeError(f"Git failed: {result.stderr}")
    return result.stdout.strip()

@observe_tool(name="invalid_command_failure", category="cli")
def run_invalid_command():
    """Run invalid command - FAILURE"""
    print("   ❌ Running invalid command...")
    result = run_tracked_command("git invalid_subcommand")
    if result.returncode != 0:
        raise RuntimeError(f"Command failed: {result.stderr}")
    return result.stdout.strip()

@observe(
    name="mixed_workflow",
    prompt_id="mixed_tester",
    prompt_version="v1.0",
    prompt_template="Discover a comprehensive test workflow with mixed success and failure operations including LLM calls, HTTP requests, and CLI commands to validate error handling and telemetry capture.",
    metadata={"author": "test", "purpose": "mixed_error_testing", "expected_success_rate": "62.5%"}
)
def mixed_success_failure_workflow():
    """
    Workflow with mixed successes and failures
    Shows realistic error rate (not 0%, not 100%)
    """
    print("\n" + "="*70)
    print("🧪 Mixed Success/Failure Workflow")
    print("="*70 + "\n")
    
    results = {
        "total_operations": 8,
        "successful": 0,
        "failed": 0,
        "operations": []
    }
    
    # ========================================================================
    # OPERATION 1: LLM Success
    # ========================================================================
    print("1️⃣  LLM Call (should succeed)...")
    try:
        response = client.chat.completions.create(
            model="llama-3.3-70b-versatile",
            messages=[{"role": "user", "content": "Say hello"}],
            max_tokens=10
        )
        print(f"   ✅ SUCCESS: {response.choices[0].message.content}\n")
        results["successful"] += 1
        results["operations"].append({"op": "llm_valid", "status": "success"})
    except Exception as e:
        print(f"   ❌ FAILURE: {e}\n")
        results["failed"] += 1
        results["operations"].append({"op": "llm_valid", "status": "error"})
    
    # ========================================================================
    # OPERATION 2: LLM Failure (invalid model)
    # ========================================================================
    print("2️⃣  LLM Call with Invalid Model (should fail)...")
    try:
        response = client.chat.completions.create(
            model="nonexistent-model",
            messages=[{"role": "user", "content": "Test"}],
            max_tokens=10
        )
        print(f"   ✅ UNEXPECTED SUCCESS\n")
        results["successful"] += 1
        results["operations"].append({"op": "llm_invalid", "status": "unexpected_success"})
    except Exception as e:
        print(f"   ❌ EXPECTED FAILURE: {type(e).__name__}\n")
        results["failed"] += 1
        results["operations"].append({"op": "llm_invalid", "status": "expected_error"})
    
    # ========================================================================
    # OPERATION 3: HTTP Success
    # ========================================================================
    print("3️⃣  HTTP Request (should succeed)...")
    try:
        fetch_valid_user()
        print(f"   ✅ SUCCESS\n")
        results["successful"] += 1
        results["operations"].append({"op": "http_valid", "status": "success"})
    except Exception as e:
        print(f"   ❌ FAILURE: {e}\n")
        results["failed"] += 1
        results["operations"].append({"op": "http_valid", "status": "error"})
    
    # ========================================================================
    # OPERATION 4: HTTP Failure (404)
    # ========================================================================
    print("4️⃣  HTTP Request for Invalid User (should fail)...")
    try:
        fetch_invalid_user()
        print(f"   ✅ UNEXPECTED SUCCESS\n")
        results["successful"] += 1
        results["operations"].append({"op": "http_invalid", "status": "unexpected_success"})
    except Exception as e:
        print(f"   ❌ EXPECTED FAILURE: {type(e).__name__}\n")
        results["failed"] += 1
        results["operations"].append({"op": "http_invalid", "status": "expected_error"})
    
    # ========================================================================
    # OPERATION 5: CLI Success
    # ========================================================================
    print("5️⃣  CLI Command (should succeed)...")
    try:
        check_git_version()
        print(f"   ✅ SUCCESS\n")
        results["successful"] += 1
        results["operations"].append({"op": "cli_valid", "status": "success"})
    except Exception as e:
        print(f"   ❌ FAILURE: {e}\n")
        results["failed"] += 1
        results["operations"].append({"op": "cli_valid", "status": "error"})
    
    # ========================================================================
    # OPERATION 6: CLI Failure (invalid command)
    # ========================================================================
    print("6️⃣  Invalid CLI Command (should fail)...")
    try:
        run_invalid_command()
        print(f"   ✅ UNEXPECTED SUCCESS\n")
        results["successful"] += 1
        results["operations"].append({"op": "cli_invalid", "status": "unexpected_success"})
    except Exception as e:
        print(f"   ❌ EXPECTED FAILURE: {type(e).__name__}\n")
        results["failed"] += 1
        results["operations"].append({"op": "cli_invalid", "status": "expected_error"})
    
    # ========================================================================
    # OPERATION 7: Another LLM Success
    # ========================================================================
    print("7️⃣  Another LLM Call (should succeed)...")
    try:
        response = client.chat.completions.create(
            model="llama-3.3-70b-versatile",
            messages=[{"role": "user", "content": "Count to 3"}],
            max_tokens=20
        )
        print(f"   ✅ SUCCESS: {response.choices[0].message.content}\n")
        results["successful"] += 1
        results["operations"].append({"op": "llm_valid_2", "status": "success"})
    except Exception as e:
        print(f"   ❌ FAILURE: {e}\n")
        results["failed"] += 1
        results["operations"].append({"op": "llm_valid_2", "status": "error"})
    
    # ========================================================================
    # OPERATION 8: Final HTTP Success
    # ========================================================================
    print("8️⃣  Final HTTP Request (should succeed)...")
    try:
        response = httpx.get("https://httpbin.org/get", timeout=10.0)
        response.raise_for_status()
        print(f"   ✅ SUCCESS: Status {response.status_code}\n")
        results["successful"] += 1
        results["operations"].append({"op": "http_valid_2", "status": "success"})
    except Exception as e:
        print(f"   ❌ FAILURE: {e}\n")
        results["failed"] += 1
        results["operations"].append({"op": "http_valid_2", "status": "error"})
    
    # ========================================================================
    # SUMMARY
    # ========================================================================
    print("="*70)
    print("📊 WORKFLOW SUMMARY")
    print("="*70)
    print(f"Total Operations: {results['total_operations']}")
    print(f"Successful: {results['successful']} ({(results['successful']/results['total_operations'])*100:.1f}%)")
    print(f"Failed: {results['failed']} ({(results['failed']/results['total_operations'])*100:.1f}%)")
    print("="*70 + "\n")
    
    return results

if __name__ == "__main__":
    print("\n🧪 Running Mixed Success/Failure Test\n")
    
    results = mixed_success_failure_workflow()
    
    print("="*70)
    print("📊 EXPECTED DASHBOARD METRICS")
    print("="*70)
    
    success_rate = (results['successful']/results['total_operations'])*100
    error_rate = (results['failed']/results['total_operations'])*100
    
    print(f"\n✨ Total Spans: ~16-18")
    print(f"✅ Success Rate: ~{success_rate:.0f}%")
    print(f"❌ Error Rate: ~{error_rate:.0f}%")
    
    print("\n🎯 Expected Results:")
    print("   ✅ Successful Operations:")
    print("      • LLM call with valid model")
    print("      • HTTP GET for valid user")
    print("      • Git version command")
    print("      • Another LLM call")
    print("      • HTTP GET to httpbin")
    print("\n   ❌ Failed Operations:")
    print("      • LLM call with invalid model")
    print("      • HTTP GET for invalid user (404)")
    print("      • Invalid git command")
    
    print("\n🌲 Span Hierarchy:")
    print("   mixed_workflow (function)")
    print("   ├─ openai.llama-3.3-70b-versatile (llm) ✅")
    print("   ├─ openai.nonexistent-model (llm) ❌")
    print("   ├─ fetch_user_success (tool) ✅")
    print("   │  └─ httpx.GET (http) ✅")
    print("   ├─ fetch_user_failure (tool) ❌")
    print("   │  └─ httpx.GET (http) ❌")
    print("   ├─ git_version_success (tool) ✅")
    print("   │  └─ cli.git (cli) ✅")
    print("   ├─ invalid_command_failure (tool) ❌")
    print("   │  └─ cli.git (cli) ❌")
    print("   ├─ openai.llama-3.3-70b-versatile (llm) ✅")
    print("   └─ httpx.GET (http) ✅")
    
    print("\n📈 What You'll See in Dashboard:")
    print("   • Mixed green and red nodes in DAG")
    print("   • Realistic error rate (not 0%, not 100%)")
    print("   • Success spans in green")
    print("   • Failed spans in red")
    print("   • Accurate success/failure counts")
    
    print("\n🎯 Metrics to Verify:")
    print(f"   • Overall error rate: ~{error_rate:.0f}%")
    print(f"   • LLM error rate: ~33% (1 of 3 calls fail)")
    print(f"   • HTTP error rate: ~33% (1 of 3 calls fail)")
    print(f"   • CLI error rate: ~50% (1 of 2 calls fail)")
    print("   • Error messages captured for failures")
    print("   • Success data captured for successful ops")
    
    print("\n🚀 Check http://localhost:3000\n")
    
    # Flush
    print("📤 Flushing...")
    get_collector().flush()
    time.sleep(2)
    print("✅ Done!\n")