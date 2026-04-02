"""Quick verification that all agent-sdk modules work."""
import sys
sys.path.insert(0, "C:/bescout-app/scripts/agent-sdk")

from config import get_agent, AGENTS
print("Agents loaded:", list(AGENTS.keys()))
for name, cfg in AGENTS.items():
    tools = len(cfg.allowed_tools)
    print(f"  {cfg.name}: model={cfg.model}, budget=${cfg.max_budget_usd:.2f}, tools={tools}, turns={cfg.max_turns}")

from hooks import get_hooks_for_agent
for name in AGENTS:
    hooks = get_hooks_for_agent(name)
    hook_count = sum(len(v) for v in hooks.values())
    print(f"  {name} hooks: {hook_count} matchers")

# Verify SDK imports
from claude_agent_sdk import ClaudeSDKClient, ClaudeAgentOptions, query, ResultMessage
from claude_agent_sdk import AgentDefinition, HookMatcher
print("\nClaude Agent SDK: all imports OK")
print("Verification PASSED")
