#!/bin/bash
# agent-dispatch-guard.sh — PreToolUse Hook
# Enforces: Agent prompts MUST contain Gemini briefing (PROJEKT-WISSEN section)
# Exit 0 = allow, Exit 2 = block

TOOL_NAME="$1"

# Only check Agent tool calls
if [ "$TOOL_NAME" != "Agent" ]; then
  exit 0
fi

# Read tool input from stdin
INPUT=$(cat)

# Skip enforcement for Explore, Plan, and code-reviewer agents
SUBAGENT=$(echo "$INPUT" | grep -o '"subagent_type"[[:space:]]*:[[:space:]]*"[^"]*"' | head -1)
if echo "$SUBAGENT" | grep -qiE '(Explore|Plan|code-reviewer|statusline|claude-code-guide)'; then
  exit 0
fi

# Check if prompt contains PROJEKT-WISSEN or GEMINI marker
if echo "$INPUT" | grep -qiE '(PROJEKT-WISSEN|GEMINI.BRIEFING|gemini briefing)'; then
  exit 0
fi

# Block: no Gemini context found
echo "BLOCKED: Agent dispatch without Gemini briefing."
echo "Run get_agent_context(task) first, then include output under === PROJEKT-WISSEN (Gemini) ==="
exit 2
