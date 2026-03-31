[Skip to content](https://github.com/shakacode/claude-code-commands-skills-agents/blob/main/docs/claude-code-with-codex.md#start-of-content)

You signed in with another tab or window. [Reload](https://github.com/shakacode/claude-code-commands-skills-agents/blob/main/docs/claude-code-with-codex.md) to refresh your session.You signed out in another tab or window. [Reload](https://github.com/shakacode/claude-code-commands-skills-agents/blob/main/docs/claude-code-with-codex.md) to refresh your session.You switched accounts on another tab or window. [Reload](https://github.com/shakacode/claude-code-commands-skills-agents/blob/main/docs/claude-code-with-codex.md) to refresh your session.Dismiss alert

{{ message }}

[shakacode](https://github.com/shakacode)/ **[claude-code-commands-skills-agents](https://github.com/shakacode/claude-code-commands-skills-agents)** Public

- [Notifications](https://github.com/login?return_to=%2Fshakacode%2Fclaude-code-commands-skills-agents) You must be signed in to change notification settings
- [Fork\\
3](https://github.com/login?return_to=%2Fshakacode%2Fclaude-code-commands-skills-agents)
- [Star\\
21](https://github.com/login?return_to=%2Fshakacode%2Fclaude-code-commands-skills-agents)


## Collapse file tree

## Files

main

Search this repository(forward slash)` forward slash/`

/

# claude-code-with-codex.md

Copy path

BlameMore file actions

BlameMore file actions

## Latest commit

![justin808](https://avatars.githubusercontent.com/u/1118459?v=4&size=40)![claude](https://avatars.githubusercontent.com/u/81847?v=4&size=40)

[justin808](https://github.com/shakacode/claude-code-commands-skills-agents/commits?author=justin808)

and

[claude](https://github.com/shakacode/claude-code-commands-skills-agents/commits?author=claude)

[Fix Codex CLI model names, approval modes, and sandbox config](https://github.com/shakacode/claude-code-commands-skills-agents/commit/492e80f907f4c2e5e072c376f55ca815c65eb39b)

Open commit detailssuccess

last monthFeb 9, 2026

[492e80f](https://github.com/shakacode/claude-code-commands-skills-agents/commit/492e80f907f4c2e5e072c376f55ca815c65eb39b) · last monthFeb 9, 2026

## History

[History](https://github.com/shakacode/claude-code-commands-skills-agents/commits/main/docs/claude-code-with-codex.md)

Open commit details

[View commit history for this file.](https://github.com/shakacode/claude-code-commands-skills-agents/commits/main/docs/claude-code-with-codex.md) History

190 lines (126 loc) · 6.19 KB

/

# claude-code-with-codex.md

Top

## File metadata and controls

- Preview

- Code

- Blame


190 lines (126 loc) · 6.19 KB

[Raw](https://github.com/shakacode/claude-code-commands-skills-agents/raw/refs/heads/main/docs/claude-code-with-codex.md)

Copy raw file

Download raw file

Outline

Edit and raw actions

# Using Claude Code with Codex CLI

[Permalink: Using Claude Code with Codex CLI](https://github.com/shakacode/claude-code-commands-skills-agents/blob/main/docs/claude-code-with-codex.md#using-claude-code-with-codex-cli)

This guide covers how to use Anthropic's Claude Code and OpenAI's Codex CLI together effectively. Both are terminal-based AI coding agents, and they complement each other well.

## What Is Codex CLI?

[Permalink: What Is Codex CLI?](https://github.com/shakacode/claude-code-commands-skills-agents/blob/main/docs/claude-code-with-codex.md#what-is-codex-cli)

[Codex CLI](https://github.com/openai/codex) is OpenAI's open-source (Apache 2.0) coding agent that runs in your terminal. First released April 2025, it's built in Rust and supports GPT models optimized for coding.

**Install:**

```
# npm
npm install -g @openai/codex

# Homebrew (macOS)
brew install --cask codex
```

**Authenticate** via ChatGPT sign-in (works with existing Plus/Pro/Team plans) or API key.

## Key Differences

[Permalink: Key Differences](https://github.com/shakacode/claude-code-commands-skills-agents/blob/main/docs/claude-code-with-codex.md#key-differences)

|  | Claude Code | Codex CLI |
| --- | --- | --- |
| **Models** | Claude Opus 4.6, Sonnet 4.5 | GPT-5-Codex |
| **Instructions file** | `CLAUDE.md` | `AGENTS.md` |
| **Sandbox** | macOS Seatbelt, configurable | Sandboxed by default (configurable via `sandbox_mode`) |
| **Approval modes** | Permission rules in settings.json | `approval_policy` \+ `sandbox_mode` in config.toml; `--auto-edit` / `--full-auto` flags |
| **Multi-agent** | Subagents, agent teams (experimental) | Single agent (parallelize manually) |
| **Slash commands** | Skills/commands system | Not built-in |
| **License** | Proprietary | Apache 2.0 |
| **Config** | `~/.claude/settings.json` | `~/.codex/config.toml` |

## When to Use Which

[Permalink: When to Use Which](https://github.com/shakacode/claude-code-commands-skills-agents/blob/main/docs/claude-code-with-codex.md#when-to-use-which)

Both tools are highly capable across all tasks. In practice, use whichever you're more fluent with. Some reasons to reach for one over the other:

- **Claude Code** has built-in multi-agent support (subagents, agent teams), skills/commands, and hooks
- **Codex CLI** is open-source, has strict sandboxing by default, and works with your existing ChatGPT subscription
- When you're stuck with one tool, try the other -- different models sometimes see different solutions

## Shared Instructions: AGENTS.md Strategy

[Permalink: Shared Instructions: AGENTS.md Strategy](https://github.com/shakacode/claude-code-commands-skills-agents/blob/main/docs/claude-code-with-codex.md#shared-instructions-agentsmd-strategy)

The key to using both tools on the same project is a shared instructions file.

### Option 1: AGENTS.md as the Single Source of Truth

[Permalink: Option 1: AGENTS.md as the Single Source of Truth](https://github.com/shakacode/claude-code-commands-skills-agents/blob/main/docs/claude-code-with-codex.md#option-1-agentsmd-as-the-single-source-of-truth)

Put universal instructions in `AGENTS.md` and configure both tools to read it:

**For Codex CLI:** Reads `AGENTS.md` automatically.

**For Claude Code:** Add a fallback in `CLAUDE.md`:

```
# Project Instructions
See @AGENTS.md for build commands, architecture, and conventions.

# Claude Code-Specific
- Use `/self-review` before creating PRs
- Use subagents for codebase exploration
```

### Option 2: Symlink

[Permalink: Option 2: Symlink](https://github.com/shakacode/claude-code-commands-skills-agents/blob/main/docs/claude-code-with-codex.md#option-2-symlink)

```
ln -s AGENTS.md CLAUDE.md
```

Simple but you lose the ability to have tool-specific instructions.

### Option 3: Separate Files with Shared Core

[Permalink: Option 3: Separate Files with Shared Core](https://github.com/shakacode/claude-code-commands-skills-agents/blob/main/docs/claude-code-with-codex.md#option-3-separate-files-with-shared-core)

```
AGENTS.md          # Universal instructions (both tools read this)
CLAUDE.md          # @AGENTS.md + Claude-specific features
```

This is the recommended approach -- it gives you cross-tool compatibility while letting you use tool-specific features.

### Codex Fallback Configuration

[Permalink: Codex Fallback Configuration](https://github.com/shakacode/claude-code-commands-skills-agents/blob/main/docs/claude-code-with-codex.md#codex-fallback-configuration)

Codex can also be configured to read `CLAUDE.md` as a fallback in `~/.codex/config.toml`:

```
project_doc_fallback_filenames = ["CLAUDE.md", "COPILOT.md"]
```

## AGENTS.md Discovery

[Permalink: AGENTS.md Discovery](https://github.com/shakacode/claude-code-commands-skills-agents/blob/main/docs/claude-code-with-codex.md#agentsmd-discovery)

Codex discovers `AGENTS.md` using a cascading hierarchy:

1. **Home directory** (`~/.codex/AGENTS.md`): Global defaults
2. **Project root** → **current directory**: Walks down, reads one file per directory
3. **Override files**: `AGENTS.override.md` takes priority over `AGENTS.md` in the same directory

Files are concatenated from root down. The closest file to the edited code wins for conflicting instructions.

See [templates/AGENTS.md](https://github.com/shakacode/claude-code-commands-skills-agents/blob/main/templates/AGENTS.md) for a starter template.

## Practical Workflows

[Permalink: Practical Workflows](https://github.com/shakacode/claude-code-commands-skills-agents/blob/main/docs/claude-code-with-codex.md#practical-workflows)

### 1\. Implement with Claude, Review with Codex

[Permalink: 1. Implement with Claude, Review with Codex](https://github.com/shakacode/claude-code-commands-skills-agents/blob/main/docs/claude-code-with-codex.md#1-implement-with-claude-review-with-codex)

```
# Session 1: Claude Code implements the feature
claude
> "Implement the CSV export feature described in issue #234"

# Session 2: Codex reviews the implementation
codex "Review the changes on this branch for bugs, security issues, and test coverage"
```

### 2\. Cross-Validation

[Permalink: 2. Cross-Validation](https://github.com/shakacode/claude-code-commands-skills-agents/blob/main/docs/claude-code-with-codex.md#2-cross-validation)

Ask both tools to solve the same problem independently, then compare approaches:

```
# Git worktrees keep both isolated
git worktree add ../feature-claude feature-branch-claude
git worktree add ../feature-codex feature-branch-codex

# Terminal 1
cd ../feature-claude && claude

# Terminal 2
cd ../feature-codex && codex
```

### 3\. Parallel Agents on Different Tasks

[Permalink: 3. Parallel Agents on Different Tasks](https://github.com/shakacode/claude-code-commands-skills-agents/blob/main/docs/claude-code-with-codex.md#3-parallel-agents-on-different-tasks)

Use git worktrees to run both tools simultaneously on different tasks:

```
git worktree add ../task-auth auth-refactor
git worktree add ../task-api api-endpoints

# Run Claude Code on auth refactor
cd ../task-auth && claude

# Run Codex on API endpoints
cd ../task-api && codex
```

### 4\. Spec-First Development

[Permalink: 4. Spec-First Development](https://github.com/shakacode/claude-code-commands-skills-agents/blob/main/docs/claude-code-with-codex.md#4-spec-first-development)

1. Write the spec/tests with one tool
2. Implement with the other
3. The implementation tool can't "cheat" because it didn't write the tests

## Codex CLI Quick Reference

[Permalink: Codex CLI Quick Reference](https://github.com/shakacode/claude-code-commands-skills-agents/blob/main/docs/claude-code-with-codex.md#codex-cli-quick-reference)

### Approval & Sandbox Modes

[Permalink: Approval & Sandbox Modes](https://github.com/shakacode/claude-code-commands-skills-agents/blob/main/docs/claude-code-with-codex.md#approval--sandbox-modes)

Configured via `~/.codex/config.toml` with two independent settings:

- **`approval_policy`**: `"untrusted"` (prompts before actions) or `"on-request"` (auto-approves)
- **`sandbox_mode`**: `"read-only"`, `"workspace-write"`, or `"danger-full-access"`

Interactive UX flags:

```
codex --auto-edit    # Auto-approve file edits, prompt for commands
codex --full-auto    # No prompts, but sandboxed
```

### Configuration (`~/.codex/config.toml`)

[Permalink: Configuration (~/.codex/config.toml)](https://github.com/shakacode/claude-code-commands-skills-agents/blob/main/docs/claude-code-with-codex.md#configuration-codexconfigtoml)

```
model = "gpt-5-codex"
approval_policy = "untrusted"
sandbox_mode = "workspace-write"

[profiles.fast]
model = "gpt-5-codex"
approval_policy = "on-request"
```

## Tips

[Permalink: Tips](https://github.com/shakacode/claude-code-commands-skills-agents/blob/main/docs/claude-code-with-codex.md#tips)

- **Keep AGENTS.md under 150 lines.** Same principle as CLAUDE.md -- long files bury the signal.
- **Wrap commands in backticks** in both files so agents can copy-paste them.
- **Use git worktrees** when running both tools simultaneously to avoid file conflicts.
- **Don't fight the tools.** If one tool is struggling with a task, try the other instead of correcting it repeatedly.
- **Update instructions when things change.** Both tools rely on accurate build/test commands.

## Cost Considerations

[Permalink: Cost Considerations](https://github.com/shakacode/claude-code-commands-skills-agents/blob/main/docs/claude-code-with-codex.md#cost-considerations)

Both tools offer subscription-based access and pay-per-token API access. Check current pricing at [claude.ai](https://claude.ai/) and [chatgpt.com](https://chatgpt.com/) as plans and pricing change frequently.

For teams doing heavy AI-assisted development, having access to both gives you flexibility to use whichever is faster, cheaper, or better for the specific task at hand.

You can’t perform that action at this time.