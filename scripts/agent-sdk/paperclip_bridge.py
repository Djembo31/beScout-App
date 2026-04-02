"""
Paperclip API Bridge — connects Agent SDK results back to Paperclip.

Usage:
    python paperclip_bridge.py --agent engineer --issue-id <uuid> --task "Fix BES-107"

This script:
1. Updates the Paperclip issue to in_progress
2. Runs the agent via Claude Agent SDK
3. Posts the result as a comment / updates the issue status
"""

import argparse
import asyncio
import json
import sys
import os

import httpx

sys.path.insert(0, os.path.dirname(__file__))
from run_agent import run_agent

PAPERCLIP_URL = "http://localhost:3100"
COMPANY_ID = "cab471f1-96c2-403d-b0a7-1c5bf5db0b5d"


async def update_issue(issue_id: str, status: str, body: str | None = None):
    """Update a Paperclip issue status and optionally its body."""
    payload: dict = {"status": status}
    if body:
        payload["body"] = body
    async with httpx.AsyncClient() as client:
        resp = await client.patch(
            f"{PAPERCLIP_URL}/api/issues/{issue_id}",
            json=payload,
        )
        resp.raise_for_status()
        return resp.json()


async def run_with_paperclip(agent_name: str, issue_id: str, task: str, verbose: bool):
    """Full pipeline: update issue -> run agent -> post result."""
    # 1. Mark issue as in_progress
    print(f"[Bridge] Setting issue {issue_id[:8]}... to in_progress")
    try:
        await update_issue(issue_id, "in_progress")
    except Exception as e:
        print(f"[Bridge] Warning: Could not update issue status: {e}")

    # 2. Run agent
    print(f"[Bridge] Running agent '{agent_name}' on task...")
    try:
        output_json = await run_agent(agent_name, task, verbose)
        output = json.loads(output_json)
    except Exception as e:
        # Mark as failed
        error_msg = f"Agent failed: {e}"
        print(f"[Bridge] {error_msg}")
        try:
            await update_issue(issue_id, "todo", body=f"Agent error:\n```\n{error_msg}\n```")
        except Exception:
            pass
        return

    # 3. Post result back
    result = output.get("result", "No result")
    session_id = output.get("session_id", "unknown")

    result_body = f"""## Agent Result ({output.get('agent', agent_name)})

**Session:** `{session_id}`
**Task:** {task}

### Output
{result[:3000]}

---
*Generated via Claude Agent SDK*"""

    print(f"[Bridge] Posting result to issue...")
    try:
        await update_issue(issue_id, "in_review", body=result_body)
        print(f"[Bridge] Done. Issue set to in_review.")
    except Exception as e:
        print(f"[Bridge] Warning: Could not update issue: {e}")
        print(f"[Bridge] Result saved to: {output.get('log_file')}")

    return output


def main():
    parser = argparse.ArgumentParser(description="Paperclip Bridge for Agent SDK")
    parser.add_argument("--agent", "-a", required=True)
    parser.add_argument("--issue-id", "-i", required=True, help="Paperclip issue UUID")
    parser.add_argument("--task", "-t", required=True, help="Task description")
    parser.add_argument("--verbose", "-v", action="store_true")
    args = parser.parse_args()

    result = asyncio.run(
        run_with_paperclip(args.agent, args.issue_id, args.task, args.verbose)
    )
    if result:
        print(json.dumps(result, indent=2, ensure_ascii=False))


if __name__ == "__main__":
    main()
