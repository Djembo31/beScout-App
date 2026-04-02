"""
BeScout Agent Runner — Claude Agent SDK adapter for Paperclip.

Usage:
    python run_agent.py --agent engineer --task "Fix the broken import in PlayerRow.tsx"
    python run_agent.py --agent qa --task "Run full type check and report errors"
    python run_agent.py --agent ba --task "Audit community page for forbidden wording"

Can also read task from stdin:
    echo "Fix BES-107" | python run_agent.py --agent engineer

Environment:
    ANTHROPIC_API_KEY must be set (used by Claude Agent SDK internally).
"""

import argparse
import asyncio
import json
import sys
import os
from datetime import datetime

# Add parent dir for imports
sys.path.insert(0, os.path.dirname(__file__))

from claude_agent_sdk import (
    ClaudeSDKClient,
    ClaudeAgentOptions,
    AssistantMessage,
    ResultMessage,
    SystemMessage,
    TextBlock,
)
from config import get_agent
from hooks import get_hooks_for_agent


PROJECT_DIR = "C:/bescout-app"
LOG_DIR = os.path.join(PROJECT_DIR, "scripts", "agent-sdk", "logs")


def ensure_log_dir():
    os.makedirs(LOG_DIR, exist_ok=True)


def log_result(agent_name: str, task: str, result: str, session_id: str | None):
    """Write agent run result to a log file."""
    ensure_log_dir()
    timestamp = datetime.now().strftime("%Y-%m-%d_%H-%M-%S")
    log_file = os.path.join(LOG_DIR, f"{timestamp}_{agent_name}.json")
    log_entry = {
        "agent": agent_name,
        "task": task,
        "result": result,
        "session_id": session_id,
        "timestamp": datetime.now().isoformat(),
    }
    with open(log_file, "w", encoding="utf-8") as f:
        json.dump(log_entry, f, indent=2, ensure_ascii=False)
    return log_file


async def run_agent(agent_name: str, task: str, verbose: bool = False) -> str:
    """Spawn a Claude Code session for the given agent and task."""
    config = get_agent(agent_name)
    hooks = get_hooks_for_agent(agent_name)

    options = ClaudeAgentOptions(
        cwd=PROJECT_DIR,
        model=config.model,
        system_prompt=config.system_prompt,
        allowed_tools=config.allowed_tools,
        max_budget_usd=config.max_budget_usd,
        max_turns=config.max_turns,
        permission_mode=config.permission_mode,
        hooks=hooks,
        setting_sources=["project"],  # Loads CLAUDE.md + .claude/rules/ + Skills
    )

    session_id = None
    result_text = ""

    async with ClaudeSDKClient(options=options) as client:
        await client.query(task)

        async for message in client.receive_response():
            if isinstance(message, SystemMessage) and message.subtype == "init":
                session_id = message.data.get("session_id")
                if verbose:
                    print(f"[{config.name}] Session: {session_id}")

            elif isinstance(message, AssistantMessage):
                for block in message.content:
                    if isinstance(block, TextBlock):
                        if verbose:
                            print(f"[{config.name}] {block.text[:200]}")

            elif isinstance(message, ResultMessage):
                result_text = message.result or ""
                if verbose:
                    print(f"\n[{config.name}] Done. Stop reason: {message.stop_reason}")

    # Log the result
    log_file = log_result(agent_name, task, result_text, session_id)

    return json.dumps({
        "agent": config.name,
        "paperclip_id": config.paperclip_id,
        "session_id": session_id,
        "result": result_text,
        "log_file": log_file,
    }, ensure_ascii=False)


def main():
    parser = argparse.ArgumentParser(description="BeScout Agent Runner")
    parser.add_argument(
        "--agent", "-a",
        required=True,
        help="Agent name: ceo, engineer, frontend, qa, ba",
    )
    parser.add_argument(
        "--task", "-t",
        default=None,
        help="Task description. If omitted, reads from stdin.",
    )
    parser.add_argument(
        "--verbose", "-v",
        action="store_true",
        help="Print agent messages in real-time",
    )
    args = parser.parse_args()

    # Get task from arg or stdin
    task = args.task
    if not task:
        if not sys.stdin.isatty():
            task = sys.stdin.read().strip()
        if not task:
            parser.error("No task provided. Use --task or pipe via stdin.")

    # Run the agent
    output = asyncio.run(run_agent(args.agent, task, args.verbose))
    print(output)


if __name__ == "__main__":
    main()
