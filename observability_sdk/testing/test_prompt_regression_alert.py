"""
Trigger a Prompt Regression alert end-to-end.

How it works:
- Creates 2 prompt versions for the same prompt family via @observe(prompt_template=...).
- Emits spans for each version (v1 good, v2 worse: higher latency + errors).
- The backend /cost/anomalies detector compares latest vs previous prompt version.

Notes:
- This script intentionally avoids hardcoding API keys in-repo. It will prompt at runtime.
"""

import sys
import time
import getpass
import os

sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))

from observability_sdk import configure, instrument_all, observe  # noqa: E402
from observability_sdk.collector.collector import get_collector  # noqa: E402


PROMPT_FAMILY = "prompt_regression_tester"

# Hardcoded non-secret values (matches your local setup)
API_URL = "http://localhost:8080"
PROJECT_ID = "aca167c7-6c08-4fe2-a7af-21ec298e1d68"
USER_ID = "fbd31533-fe77-427f-9d2d-a1c4c69e9a6d"

# Prompt for API key at runtime so it isn't stored in git history.
API_KEY = getpass.getpass("Orbis API key (X-API-Key): ").strip()
if not API_KEY:
    raise RuntimeError("Missing API key")


configure(
    api_key=API_KEY,
    project_id=PROJECT_ID,
    user_id=USER_ID,
    api_url=API_URL,
    debug=True,
)

instrument_all()


@observe(
    name="prompt_regression_good_v1",
    prompt_id=PROMPT_FAMILY,
    prompt_version="v1.0",
    prompt_template="You are a fast and reliable assistant. Answer succinctly.",
    metadata={"test": "prompt_regression", "variant": "v1_good"},
)
def good_v1_run() -> str:
    time.sleep(0.02)
    return "ok"


@observe(
    name="prompt_regression_bad_v2",
    prompt_id=PROMPT_FAMILY,
    prompt_version="v1.1",
    prompt_template="You are a fast and reliable assistant. Answer succinctly. (changed)",
    metadata={"test": "prompt_regression", "variant": "v2_bad"},
)
def bad_v2_run(should_error: bool) -> str:
    time.sleep(0.35)
    if should_error:
        raise RuntimeError("Intentional error to trigger regression alert")
    return "ok"


if __name__ == "__main__":
    print("\n=== Trigger Prompt Regression Alert ===")
    print(f"API_URL={API_URL}")
    print(f"PROMPT_FAMILY={PROMPT_FAMILY}")
    print("Emitting traces for v1 (good) and v2 (worse)...\n")

    # Emit enough traces so the detector has data for both versions.
    for _ in range(3):
        good_v1_run()

    for i in range(3):
        try:
            bad_v2_run(should_error=(i % 2 == 0))
        except Exception:
            pass

    # Ensure everything is flushed even if auto-flush is disabled.
    get_collector().flush()
    time.sleep(2.0)

    print("\nDone.")
    print("Now enable Prompt Regression Alerts in the UI and set:")
    print("- window >= 24h")
    print("- min traces/version <= 3")
    print("- error-rate increase (pp) small (e.g. 0.1)")
    print("- latency increase (s) small (e.g. 0.05)")
    print("Then refresh /dashboard/costs and check Alerts.")
