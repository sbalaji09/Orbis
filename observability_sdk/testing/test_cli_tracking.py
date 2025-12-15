"""
Test CLI command tracking
This test verifies that CLI commands are tracked as spans
"""

import sys
import os
sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..'))

from observability_sdk import observe, run_tracked_command
from observability_sdk.collector.config import configure

# Configure Orbis
configure(
    api_key="test-api-key-cli",
    project_id="test-project-cli",
    user_id="test-user-cli",
    api_url="http://localhost:8080"
)

@observe(name="test_cli_commands")
def test_cli_tracking():
    """
    Test function that runs several CLI commands.
    Each command should be tracked as a separate span.
    """
    print("\n⚙️  Running CLI commands...\n")

    # Test 1: Check current directory
    print("1. Running: pwd")
    result1 = run_tracked_command("pwd")
    print(f"   ✓ Exit code: {result1.returncode}")
    print(f"   ✓ Output: {result1.stdout.strip()}")

    # Test 2: List files
    print("\n2. Running: ls -la")
    result2 = run_tracked_command("ls -la")
    print(f"   ✓ Exit code: {result2.returncode}")
    print(f"   ✓ Listed {len(result2.stdout.splitlines())} items")

    # Test 3: Check Python version
    print("\n3. Running: python --version")
    result3 = run_tracked_command("python --version")
    print(f"   ✓ Exit code: {result3.returncode}")
    print(f"   ✓ Version: {result3.stdout.strip() if result3.stdout else result3.stderr.strip()}")

    # Test 4: Echo command
    print("\n4. Running: echo 'Hello from Orbis'")
    result4 = run_tracked_command("echo 'Hello from Orbis'")
    print(f"   ✓ Exit code: {result4.returncode}")
    print(f"   ✓ Output: {result4.stdout.strip()}")

    # Test 5: Git status (if in a git repo)
    print("\n5. Running: git status --short")
    try:
        result5 = run_tracked_command("git status --short")
        print(f"   ✓ Exit code: {result5.returncode}")
        if result5.returncode == 0:
            print(f"   ✓ Git status obtained")
        else:
            print(f"   ⚠️  Not a git repository or git not installed")
    except Exception as e:
        print(f"   ⚠️  Git command failed: {e}")

    return "All CLI tests completed!"

if __name__ == "__main__":
    print("=" * 60)
    print("🧪 CLI Tracking Test")
    print("=" * 60)

    result = test_cli_tracking()

    print("\n" + "=" * 60)
    print("✅ Test completed!")
    print("=" * 60)
    print("\n📊 Expected results in Orbis dashboard:")
    print("   - 1 trace: 'test_cli_commands'")
    print("   - Up to 6 spans total:")
    print("     1. test_cli_commands (parent, type: function)")
    print("     2. cli.pwd (type: cli)")
    print("     3. cli.ls (type: cli)")
    print("     4. cli.python (type: cli)")
    print("     5. cli.echo (type: cli)")
    print("     6. cli.git (type: cli)")
    print("\n💡 Each CLI span should show:")
    print("   - Command executed")
    print("   - Exit code")
    print("   - stdout/stderr output")
    print("\n💡 Check your Orbis dashboard to see the trace!")