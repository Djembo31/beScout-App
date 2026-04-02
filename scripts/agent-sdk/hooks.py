"""
Safety hooks for BeScout agent sessions.
These run as PreToolUse callbacks to block dangerous operations.
"""

import re

# Commands that should NEVER be run by agents
BLOCKED_PATTERNS = [
    r"taskkill",
    r"rm\s+-rf\s+/",
    r"git\s+push\s+--force",
    r"git\s+reset\s+--hard",
    r"drop\s+table",
    r"drop\s+database",
    r"truncate\s+table",
    r"DELETE\s+FROM\s+\w+\s*;?\s*$",  # DELETE without WHERE
    r"npx\s+supabase\s+db\s+reset",
    r"npm\s+publish",
    r"pip\s+install(?!.*claude-agent-sdk)",  # Don't install random packages
]

# Files agents should never modify
PROTECTED_FILES = [
    ".env",
    ".env.local",
    ".env.production",
    "supabase/config.toml",
    "package.json",  # Agents shouldn't change deps
    "pnpm-lock.yaml",
]


async def block_dangerous_bash(input_data, tool_use_id, context):
    """PreToolUse hook: Block dangerous shell commands."""
    command = input_data.get("tool_input", {}).get("command", "")
    for pattern in BLOCKED_PATTERNS:
        if re.search(pattern, command, re.IGNORECASE):
            return {
                "decision": "block",
                "reason": f"Blocked: command matches dangerous pattern '{pattern}'",
            }
    return {}


async def block_protected_files(input_data, tool_use_id, context):
    """PreToolUse hook: Block writes to protected files."""
    file_path = input_data.get("tool_input", {}).get("file_path", "")
    for protected in PROTECTED_FILES:
        if file_path.endswith(protected):
            return {
                "decision": "block",
                "reason": f"Blocked: '{protected}' is a protected file",
            }
    return {}


def get_hooks_for_agent(agent_name: str) -> dict:
    """Return appropriate hooks based on agent role."""
    from claude_agent_sdk import HookMatcher

    base_hooks = {
        "PreToolUse": [
            HookMatcher(matcher="Bash", hooks=[block_dangerous_bash]),
            HookMatcher(matcher="Write|Edit", hooks=[block_protected_files]),
        ]
    }

    # Read-only agents (BA, QA) don't need file protection hooks
    if agent_name in ("ba", "qa", "ceo"):
        return {
            "PreToolUse": [
                HookMatcher(matcher="Bash", hooks=[block_dangerous_bash]),
            ]
        }

    return base_hooks
