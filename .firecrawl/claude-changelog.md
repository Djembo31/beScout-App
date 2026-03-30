[Skip to main content](https://claudelog.com/claude-code-changelog/#__docusaurus_skipToContent_fallback)

![Play](https://claudelog.com/play.svg)

1x

![Focus Mode](https://claudelog.com/focus_mode.svg)

On this page

Complete version history of Claude Code releases, from early beta versions to the latest stable release. Each version includes feature additions, bug fixes, and links to relevant documentation. **Need to downgrade?** See our [Revert Claude Code Version](https://claudelog.com/faqs/revert-claude-code-version/) guide.

![Kombai](https://cdn.claudelog.com/img/ads/sponsors/kombai-logo.svg)

Improve frontend design beyond Claude Code skills (ad)

Use [Kombai](https://analytics.claudelog.com/https://kombai.com/?utm_source=claudelog&utm_medium=website&utm_campaign=display&unit=random-tip&tip=4)'s built-in skills and best practices across 400+ frontend libraries, then refine the result in a best-in-class browser where you can see, edit, and verify changes directly. UI is inherently visual, so stop writing long prose in Markdown and iterate visually with real control. [Try Kombai Today](https://analytics.claudelog.com/https://kombai.com/?utm_source=claudelog&utm_medium=website&utm_campaign=display&unit=random-tip&tip=4)

![Improve frontend design beyond Claude Code skills](https://cdn.claudelog.com/img/ads/sponsors/kombai/kombai-diagonal-3.png)

* * *

**Synopsis:** Higher Opus 4.6 token limits. Sandbox allowRead setting. Copy command index. Many bug fixes.

### v2.1.77 [​](https://claudelog.com/claude-code-changelog/\#v2177 "Direct link to v2.1.77")

- Increased default maximum output token limits for Claude Opus 4.6 to 64k tokens, and the upper bound for Opus 4.6 and Sonnet 4.6 models to 128k tokens
- Added `allowRead` sandbox filesystem setting to re-allow read access within `denyRead` regions
- `/copy` now accepts an optional index: `/copy N` copies the Nth-latest assistant response
- Fixed "Always Allow" on compound bash commands (e.g. `cd src && npm test`) saving a single rule for the full string instead of per-subcommand, leading to dead rules and repeated permission prompts
- Fixed auto-updater starting overlapping binary downloads when the slash-command overlay repeatedly opened and closed, accumulating tens of gigabytes of memory
- Fixed `--resume` silently truncating recent conversation history due to a race between memory-extraction writes and the main transcript
- Fixed PreToolUse hooks returning `"allow"` bypassing `deny` permission rules, including enterprise managed settings
- Fixed Write tool silently converting line endings when overwriting CRLF files or creating files in CRLF directories
- Fixed memory growth in long-running sessions from progress messages surviving compaction
- Fixed cost and token usage not being tracked when the API falls back to non-streaming mode
- Fixed `CLAUDE_CODE_DISABLE_EXPERIMENTAL_BETAS` not stripping beta tool-schema fields, causing proxy gateways to reject requests
- Fixed Bash tool reporting errors for successful commands when the system temp directory path contains spaces
- Fixed paste being lost when typing immediately after pasting
- Fixed Ctrl+D in `/feedback` text input deleting forward instead of the second press exiting the session
- Fixed API error when dragging a 0-byte image file into the prompt
- Fixed Claude Desktop sessions incorrectly using the terminal CLI's configured API key instead of OAuth
- Fixed `git-subdir` plugins at different subdirectories of the same monorepo commit colliding in the plugin cache
- Fixed ordered list numbers not rendering in terminal UI
- Fixed a race condition where stale-worktree cleanup could delete an agent worktree just resumed from a previous crash
- Fixed input deadlock when opening `/mcp` or similar dialogs while the agent is running
- Fixed Backspace and Delete keys not working in vim NORMAL mode
- Fixed status line not updating when vim mode is toggled on or off
- Fixed hyperlinks opening twice on Cmd+click in VS Code, Cursor, and other xterm.js-based terminals
- Fixed background colors rendering as terminal-default inside tmux with default configuration
- Fixed iTerm2 session crash when selecting text inside tmux over SSH
- Fixed clipboard copy silently failing in tmux sessions; copy toast now indicates whether to paste with `⌘V` or tmux `prefix+]`
- Fixed `←`/`→` accidentally switching tabs in settings, permissions, and sandbox dialogs while navigating lists
- Fixed IDE integration not auto-connecting when Claude Code is launched inside tmux or screen
- Fixed CJK characters visually bleeding into adjacent UI elements when clipped at the right edge
- Fixed teammate panes not closing when the leader exits
- Fixed iTerm2 auto mode not detecting iTerm2 for native split-pane teammates
- Faster startup on macOS (~60ms) by reading keychain credentials in parallel with module loading
- Faster `--resume` on fork-heavy and very large sessions — up to 45% faster loading and ~100-150MB less peak memory
- Improved Esc to abort in-flight non-streaming API requests
- Improved `claude plugin validate` to check skill, agent, and command frontmatter plus `hooks/hooks.json`, catching YAML parse errors and schema violations
- Background bash tasks are now killed if output exceeds 5GB, preventing runaway processes from filling disk
- Sessions are now auto-named from plan content when you accept a plan
- Improved headless mode plugin installation to compose correctly with `CLAUDE_CODE_PLUGIN_SEED_DIR`
- Show a notice when `apiKeyHelper` takes longer than 10s, preventing it from blocking the main loop
- The Agent tool no longer accepts a `resume` parameter — use `SendMessage({to: agentId})` to continue a previously spawned agent
- `SendMessage` now auto-resumes stopped agents in the background instead of returning an error
- Renamed `/fork` to `/branch` (`/fork` still works as an alias)
- \[VSCode\] Improved plan preview tab titles to use the plan's heading instead of "Claude's Plan"
- \[VSCode\] When option+click doesn't trigger native selection on macOS, the footer now points to the `macOptionClickForcesSelection` setting

Mar 17, 2026

* * *

**Synopsis:** MCP elicitation support. Session naming flag. Worktree sparse paths. Multiple bug fixes.

### v2.1.76 [​](https://claudelog.com/claude-code-changelog/\#v2176 "Direct link to v2.1.76")

- Added MCP elicitation support — MCP servers can now request structured input mid-task via an interactive dialog (form fields or browser URL)
- Added new `Elicitation` and `ElicitationResult` hooks to intercept and override responses before they're sent back
- Added `-n` / `--name <name>` CLI flag to set a display name for the session at startup
- Added `worktree.sparsePaths` setting for `claude --worktree` in large monorepos to check out only the directories you need via git sparse-checkout
- Added `PostCompact` hook that fires after compaction completes
- Added `/effort` slash command to set model effort level
- Added session quality survey — enterprise admins can configure the sample rate via the `feedbackSurveyRate` setting
- Fixed deferred tools (loaded via `ToolSearch`) losing their input schemas after conversation compaction, causing array and number parameters to be rejected with type errors
- Fixed slash commands showing "Unknown skill"
- Fixed plan mode asking for re-approval after the plan was already accepted
- Fixed voice mode swallowing keypresses while a permission dialog or plan editor was open
- Fixed `/voice` not working on Windows when installed via npm
- Fixed spurious "Context limit reached" when invoking a skill with `model:` frontmatter on a 1M-context session
- Fixed "adaptive thinking is not supported on this model" error when using non-standard model strings
- Fixed `Bash(cmd:*)` permission rules not matching when a quoted argument contains `#`
- Fixed "don't ask again" in the Bash permission dialog showing the full raw command for pipes and compound commands
- Fixed auto-compaction retrying indefinitely after consecutive failures — a circuit breaker now stops after 3 attempts
- Fixed MCP reconnect spinner persisting after successful reconnection
- Fixed LSP plugins not registering servers when the LSP Manager initialized before marketplaces were reconciled
- Fixed clipboard copying in tmux over SSH — now attempts both direct terminal write and tmux clipboard integration
- Fixed `/export` showing only the filename instead of the full file path in the success message
- Fixed transcript not auto-scrolling to new messages after selecting text
- Fixed Escape key not working to exit the login method selection screen
- Fixed several Remote Control issues: sessions silently dying when the server reaps an idle environment, rapid messages being queued one-at-a-time instead of batched, and stale work items causing redelivery after JWT refresh
- Fixed bridge sessions failing to recover after extended WebSocket disconnects
- Fixed slash commands not found when typing the exact name of a soft-hidden command
- Improved `--worktree` startup performance by reading git refs directly and skipping redundant `git fetch` when the remote branch is already available locally
- Improved background agent behavior — killing a background agent now preserves its partial results in the conversation context
- Improved model fallback notifications — now always visible instead of hidden behind verbose mode, with human-friendly model names
- Improved blockquote readability on dark terminal themes — text is now italic with a left bar instead of dim
- Improved stale worktree cleanup — worktrees left behind after an interrupted parallel run are now automatically cleaned up
- Improved Remote Control session titles — now derived from your first prompt instead of showing "Interactive session"
- Improved `/voice` to show your dictation language on enable and warn when your `language` setting isn't supported for voice input
- Updated `--plugin-dir` to only accept one path to support subcommands — use repeated `--plugin-dir` for multiple directories
- \[VSCode\] Fixed gitignore patterns containing commas silently excluding entire filetypes from the @-mention file picker

Mar 14, 2026

* * *

[![Piebald](https://cdn.claudelog.com/img/ads/sponsors/pie-bald.png)Piebald](https://analytics.claudelog.com/https://piebald.ai/?ots=claudelog&unit=logo-wall)

* * *

**Synopsis:** Context command suggestions. Auto memory directory. Memory leak fix. Permission and authentication fixes.

### v2.1.74 [​](https://claudelog.com/claude-code-changelog/\#v2174 "Direct link to v2.1.74")

- Added actionable suggestions to `/context` command — identifies context-heavy tools, memory bloat, and capacity warnings with specific optimization tips
- Added `autoMemoryDirectory` setting to configure a custom directory for auto-memory storage
- Fixed memory leak where streaming API response buffers were not released when the generator was terminated early, causing unbounded RSS growth on the Node.js/npm code path
- Fixed managed policy ask rules being bypassed by user allow rules or skill allowed-tools
- Fixed full model IDs (e.g., `claude-opus-4-5`) being silently ignored in agent frontmatter `model:` field and `--agents` JSON config — agents now accept the same model values as `--model`
- Fixed MCP OAuth authentication hanging when the callback port is already in use
- Fixed MCP OAuth refresh never prompting for re-auth after the refresh token expires, for OAuth servers that return errors with HTTP 200 (e.g. Slack)
- Fixed voice mode silently failing on the macOS native binary for users whose terminal had never been granted microphone permission — the binary now includes the audio-input entitlement so macOS prompts correctly
- Fixed `SessionEnd` hooks being killed after 1.5 s on exit regardless of `hook.timeout` — now configurable via `CLAUDE_CODE_SESSIONEND_HOOKS_TIMEOUT_MS`
- Fixed `/plugin install` failing inside the REPL for marketplace plugins with local sources
- Fixed marketplace update not syncing git submodules — plugin sources in submodules no longer break after update
- Fixed unknown slash commands with arguments silently dropping input — now shows your input as a warning
- Fixed Hebrew, Arabic, and other RTL text not rendering correctly in Windows Terminal, conhost, and VS Code integrated terminal
- Fixed LSP servers not working on Windows due to malformed file URIs
- Changed `--plugin-dir` so local dev copies now override installed marketplace plugins with the same name (unless that plugin is force-enabled by managed settings)
- \[VS Code\] Fixed delete button not working for Untitled sessions
- \[VS Code\] Improved scroll wheel responsiveness in the integrated terminal with terminal-aware acceleration

Mar 12, 2026

* * *

**Synopsis:** Model overrides setting. SSL error guidance. Permission prompt fixes. Subagent model improvements.

### v2.1.73 [​](https://claudelog.com/claude-code-changelog/\#v2173 "Direct link to v2.1.73")

- Added `modelOverrides` setting to map model picker entries to custom provider model IDs (e.g. Bedrock inference profile ARNs)
- Added actionable guidance when OAuth login or connectivity checks fail due to SSL certificate errors (corporate proxies, `NODE_EXTRA_CA_CERTS`)
- Fixed freezes and 100% CPU loops triggered by permission prompts for complex bash commands
- Fixed a deadlock that could freeze Claude Code when many skill files changed at once (e.g. during git pull in a repo with a large `.claude/skills/` directory)
- Fixed Bash tool output being lost when running multiple Claude Code sessions in the same project directory
- Fixed subagents with `model: opus/sonnet/haiku` being silently downgraded to older model versions on Bedrock, Vertex, and Microsoft Foundry
- Fixed background bash processes spawned by subagents not being cleaned up when the agent exits
- Fixed `/resume` showing the current session in the picker
- Fixed `/ide` crashing with `onInstall is not defined` when auto-installing the extension
- Fixed `/loop` not being available on Bedrock/Vertex/Foundry and when telemetry was disabled
- Fixed `SessionStart` hooks firing twice when resuming a session via `--resume` or `--continue`
- Fixed JSON-output hooks injecting no-op system-reminder messages into the model's context on every turn
- Fixed voice mode session corruption when a slow connection overlaps a new recording
- Fixed Linux sandbox failing to start with "ripgrep (rg) not found" on native builds
- Fixed Linux native modules not loading on Amazon Linux 2 and other glibc 2.26 systems
- Fixed "media\_type: Field required" API error when receiving images via Remote Control
- Fixed `/heapdump` failing on Windows with `EEXIST` error when the Desktop folder already exists
- Improved Up arrow after interrupting Claude — now restores the interrupted prompt and rewinds the conversation in one step
- Improved IDE detection speed at startup
- Improved clipboard image pasting performance on macOS
- Improved `/effort` to work while Claude is responding, matching `/model` behavior
- Improved voice mode to automatically retry transient connection failures during rapid push-to-talk re-press
- Improved the Remote Control spawn mode selection prompt with better context
- Changed default Opus model on Bedrock, Vertex, and Microsoft Foundry to Opus 4.6 (was Opus 4.1)
- Deprecated `/output-style` command — use `/config` instead. Output style is now fixed at session start for better prompt caching
- \[VS Code\] Fixed HTTP 400 errors for users behind proxies or on Bedrock/Vertex with Claude 4.5 models

Mar 12, 2026

* * *

**Synopsis:** Effort level simplification. Plan description argument. Bash parsing improvements. Permission system fixes.

### v2.1.72 [​](https://claudelog.com/claude-code-changelog/\#v2172 "Direct link to v2.1.72")

- Changed tool search to bypass the third-party proxy gate when the environment variable is set (replaces `CLAUDE_CODE_PROXY_SUPPORTS_TOOL_REFERENCE`, now removed)
- Added `w` key in `/copy` to write the focused selection directly to a file, bypassing the clipboard (useful over SSH)
- Added optional description argument to `/plan` (e.g., `/plan fix the auth bug`) that enters plan mode and immediately starts
- Added `claude plugins` as an alias for `claude plugin`
- Added `ExitWorktree` tool to leave an `EnterWorktree` session
- Added `CLAUDE_CODE_DISABLE_CRON` environment variable to immediately stop scheduled cron jobs mid-session
- Added `lsof`, `pgrep`, `tput`, `ss`, `fd`, and `fdfind` to the bash auto-approval allowlist, reducing permission prompts for common read-only operations
- Added support for marketplace git URLs without `.git` suffix (Azure DevOps, AWS CodeCommit)
- Restored the `model` parameter on the Agent tool for per-invocation model overrides
- Simplified effort levels to low/medium/high (removed max) with new symbols (○ ◐ ●) and a brief notification instead of a persistent icon. Use `/effort auto` to reset to default
- Improved `/config` — Escape now cancels changes, Enter saves and closes, Space toggles settings
- Improved up-arrow history to show current session's messages first when running multiple concurrent sessions
- Improved voice input transcription accuracy for repo names and common dev terms (regex, OAuth, JSON)
- Improved marketplace clone failure messages to show diagnostic info even when git produces no stderr
- Improved `claude plugin validate` to explain that marketplace.json source paths are relative to the repo root when rejecting `../` paths
- Improved bash command parsing by switching to a native module — faster initialization and no memory leak
- Reduced false-positive bash permission prompts — tree-sitter parsing now handles `find -exec`, variable assignments, command substitutions, and many other patterns that previously triggered unnecessary prompts. Also fixed tree-sitter not loading in npm-installed versions
- Reduced bundle size by ~510 KB
- Changed CLAUDE.md HTML comments (`<!-- ... -->`) to be hidden from Claude when auto-injected. Comments remain visible when read with the Read tool
- Fixed slow exits when background tasks or hooks were slow to respond
- Fixed agent task progress stuck on "Initializing…"
- Fixed skill hooks firing twice per event when a hooks-enabled skill is invoked by the model
- Fixed several voice mode issues: occasional input lag, false "No speech detected" errors after releasing push-to-talk, and stale transcripts re-filling the prompt after submission
- Fixed `--continue` not resuming from the most recent point after `--compact`
- Fixed bash security parsing edge cases
- Fixed several plugin issues: installation failing on Windows with `EEXIST` error in OneDrive folders, marketplace blocking user-scope installs when a project-scope install exists, `CLAUDE_CODE_PLUGIN_CACHE_DIR` creating literal `~` directories, and `plugin.json` with marketplace-only fields failing to load
- Fixed feedback survey appearing too frequently in long sessions
- Fixed `--effort` CLI flag being reset by unrelated settings writes on startup
- Fixed backgrounded Ctrl+B queries losing their transcript or corrupting the new conversation after `/clear`
- Fixed `/clear` killing background agent/bash tasks — only foreground tasks are now cleared
- Fixed worktree isolation issues: Task tool resume not restoring cwd, and background task notifications missing `worktreePath` and `worktreeBranch`
- Fixed `/model` not displaying results when run while Claude is working
- Fixed digit keys selecting menu options instead of typing in plan mode permission prompt's text input
- Fixed sandbox permission issues: certain file write operations incorrectly allowed without prompting, and output redirections to allowlisted directories (like `/tmp/claude/`) prompting unnecessarily
- Improved CPU utilization in long sessions
- Fixed prompt cache invalidation in SDK `query()` calls, reducing input token costs up to 12x
- Fixed Escape key becoming unresponsive after cancelling a query
- Fixed double Ctrl+C not exiting when background agents or tasks are running
- Fixed team agents to inherit the leader's model
- Fixed "Always Allow" saving permission rules that never match again
- Fixed several hooks issues: `transcript_path` pointing to the wrong directory for resumed/forked sessions, agent `prompt` being silently deleted from settings.json on every settings write, PostToolUse block reason displaying twice, async hooks not receiving stdin with bash `read -r`, and validation error message showing an example that fails validation
- Fixed session crashes in Desktop/SDK when Read returned files containing U+2028/U+2029 characters
- Fixed terminal title being cleared on exit even when `CLAUDE_CODE_DISABLE_TERMINAL_TITLE` was set
- Fixed several permission rule matching issues: wildcard rules not matching commands with heredocs, embedded newlines, or no arguments; `sandbox.excludedCommands` failing with env var prefixes; "always allow" suggesting overly broad prefixes for nested CLI tools; and deny rules not applying to all command forms
- Fixed oversized and truncated images from Bash data-URL output
- Fixed a crash when resuming sessions that contained Bedrock API errors
- Fixed intermittent "expected boolean, received string" validation errors on Edit, Bash, and Grep tool inputs
- Fixed multi-line session titles when forking from a conversation whose first message contained newlines
- Fixed queued messages not showing attached images, and images being lost when pressing ↑ to edit a queued message
- Fixed parallel tool calls where a failed Read/WebFetch/Glob would cancel its siblings — only Bash errors now cascade
- VSCode: Fixed scroll speed in integrated terminals not matching native terminals
- VSCode: Fixed Shift+Enter submitting input instead of inserting a newline for users with older keybindings
- VSCode: Added effort level indicator on the input border
- VSCode: Added `vscode://anthropic.claude-code/open` URI handler to open a new Claude Code tab programmatically, with optional `prompt` and `session` query parameters

Mar 10, 2026

* * *

**Synopsis:** Loop command. Cron scheduling. Voice keybinding customization. Startup freeze fixes.

### v2.1.71 [​](https://claudelog.com/claude-code-changelog/\#v2171 "Direct link to v2.1.71")

- Added `/loop` command to run a prompt or slash command on a recurring interval (e.g. `/loop 5m check the deploy`)
- Added cron scheduling tools for recurring prompts within a session
- Added `voice:pushToTalk` keybinding to make the voice activation key rebindable in `keybindings.json` (default: space) — modifier+letter combos like `meta+k` have zero typing interference
- Added `fmt`, `comm`, `cmp`, `numfmt`, `expr`, `test`, `printf`, `getconf`, `seq`, `tsort`, and `pr` to the bash auto-approval allowlist
- Fixed stdin freeze in long-running sessions where keystrokes stop being processed but the process stays alive
- Fixed a 5–8 second startup freeze for users with voice mode enabled, caused by CoreAudio initialization blocking the main thread after system wake
- Fixed startup UI freeze when many claude.ai proxy connectors refresh an expired OAuth token simultaneously
- Fixed forked conversations (`/fork`) sharing the same plan file, which caused plan edits in one fork to overwrite the other
- Fixed the Read tool putting oversized images into context when image processing failed, breaking subsequent turns in long image-heavy sessions
- Fixed false-positive permission prompts for compound bash commands containing heredoc commit messages
- Fixed plugin installations being lost when running multiple Claude Code instances
- Fixed claude.ai connectors failing to reconnect after OAuth token refresh
- Fixed claude.ai MCP connector startup notifications appearing for every org-configured connector instead of only previously connected ones
- Fixed background agent completion notifications missing the output file path, which made it difficult for parent agents to recover agent results after context compaction
- Fixed duplicate output in Bash tool error messages when commands exit with non-zero status
- Fixed Chrome extension auto-detection getting permanently stuck on "not installed" after running on a machine without local Chrome
- Fixed `/plugin marketplace update` failing with merge conflicts when the marketplace is pinned to a branch/tag ref
- Fixed `/plugin marketplace add owner/repo@ref` incorrectly parsing `@` — previously only `#` worked as a ref separator, causing undiagnosable errors with `strictKnownMarketplaces`
- Fixed duplicate entries in `/permissions` Workspace tab when the same directory is added with and without a trailing slash
- Fixed `--print` hanging forever when team agents are configured — the exit loop no longer waits on long-lived `in_process_teammate` tasks
- Fixed "❯ Tool loaded." appearing in the REPL after every `ToolSearch` call
- Fixed prompting for `cd <cwd> && git ...` on Windows when the model uses a mingw-style path
- Improved startup time by deferring native image processor loading to first use
- Improved bridge session reconnection to complete within seconds after laptop wake from sleep, instead of waiting up to 10 minutes
- Improved `/plugin uninstall` to disable project-scoped plugins in `.claude/settings.local.json` instead of modifying `.claude/settings.json`, so changes don't affect teammates
- Improved plugin-provided MCP server deduplication — servers that duplicate a manually-configured server (same command/URL) are now skipped, preventing duplicate connections and tool sets. Suppressions are shown in the `/plugin` menu.
- Updated `/debug` to toggle debug logging on mid-session, since debug logs are no longer written by default
- Removed startup notification noise for unauthenticated org-registered claude.ai connectors

Mar 7, 2026

* * *

**Synopsis:** Third-party API proxy fixes. Windows stability improvements. VS Code session management enhancements.

### v2.1.70 [​](https://claudelog.com/claude-code-changelog/\#v2170 "Direct link to v2.1.70")

- Fixed API 400 errors when using `ANTHROPIC_BASE_URL` with a third-party gateway — tool search now correctly detects proxy endpoints and disables `tool_reference` blocks
- Fixed `API Error: 400 This model does not support the effort parameter` when using custom Bedrock inference profiles or other model identifiers not matching standard Claude naming patterns
- Fixed empty model responses immediately after `ToolSearch` — the server renders tool schemas with system-prompt-style tags at the prompt tail, which could confuse models into stopping early
- Fixed prompt-cache bust when an MCP server with `instructions` connects after the first turn
- Fixed Enter inserting a newline instead of submitting when typing over a slow SSH connection
- Fixed clipboard corrupting non-ASCII text (CJK, emoji) on Windows/WSL by using PowerShell `Set-Clipboard`
- Fixed extra VS Code windows opening at startup on Windows when running from the VS Code integrated terminal
- Fixed voice mode failing on Windows native binary with "native audio module could not be loaded"
- Fixed push-to-talk not activating on session start when `voiceEnabled: true` was set in settings
- Fixed markdown links containing `#NNN` references incorrectly pointing to the current repository instead of the linked URL
- Fixed repeated "Model updated to Opus 4.6" notification when a project's `.claude/settings.json` has a legacy Opus model string pinned
- Fixed plugins showing as inaccurately installed in `/plugin`
- Fixed plugins showing "not found in marketplace" errors on fresh startup by auto-refreshing after marketplace installation
- Fixed `/security-review` command failing with `unknown option merge-base` on older git versions
- Fixed `/color` command having no way to reset back to the default color — `/color default`, `/color gray`, `/color reset`, and `/color none` now restore the default
- Fixed a performance regression in the `AskUserQuestion` preview dialog that re-ran markdown rendering on every keystroke in the notes input
- Fixed feature flags read during early startup never refreshing their disk cache, causing stale values to persist across sessions
- Fixed `permissions.defaultMode` settings values other than `acceptEdits` or `plan` being applied in Claude Code Remote environments — they are now ignored
- Fixed skill listing being re-injected on every `--resume` (~600 tokens saved per resume)
- Fixed teleport marker not rendering in VS Code teleported sessions
- Improved error message when microphone captures silence to distinguish from "no speech detected"
- Improved compaction to preserve images in the summarizer request, allowing prompt cache reuse for faster and cheaper compaction
- Improved `/rename` to work while Claude is processing, instead of being silently queued
- Reduced prompt input re-renders during turns by ~74%
- Reduced startup memory by ~426KB for users without custom CA certificates
- Reduced Remote Control `/poll` rate to once per 10 minutes while connected (was 1–2s), cutting server load ~300×. Reconnection is unaffected — transport loss immediately wakes fast polling.
- \[VS Code\] Added spark icon in VS Code activity bar that lists all Claude Code sessions, with sessions opening as full editors
- \[VS Code\] Added full markdown document view for plans in VS Code, with support for adding comments to provide feedback
- \[VS Code\] Added native MCP server management dialog — use `/mcp` in the chat panel to enable/disable servers, reconnect, and manage OAuth authentication without switching to the terminal

Mar 6, 2026

* * *

**Synopsis:** Opus 4.6 medium effort default. Ultrathink keyword. Legacy model removal.

### v2.1.68 [​](https://claudelog.com/claude-code-changelog/\#v2168 "Direct link to v2.1.68")

- Opus 4.6 now defaults to medium effort for Max and Team subscribers. Medium effort works well for most tasks — it's the sweet spot between speed and thoroughness. You can change this anytime with `/model`
- Re-introduced the "ultrathink" keyword to enable high effort for the next turn
- Removed Opus 4 and 4.1 from Claude Code on the first-party API — users with these models pinned are automatically moved to Opus 4.6

Mar 4, 2026

* * *

**Synopsis:** Error logging reduction.

### v2.1.66 [​](https://claudelog.com/claude-code-changelog/\#v2166 "Direct link to v2.1.66")

- Reduced spurious error logging

Mar 3, 2026

* * *

**Synopsis:** New slash commands. HTTP hooks. Worktree config sharing. Memory leak fixes. VS Code session management.

### v2.1.63 [​](https://claudelog.com/claude-code-changelog/\#v2163 "Direct link to v2.1.63")

- Added `/simplify` and `/batch` bundled slash commands
- Fixed local slash command output like /cost appearing as user-sent messages instead of system messages in the UI
- Project configs & auto memory now shared across git worktrees of the same repository
- Added `ENABLE_CLAUDEAI_MCP_SERVERS=false` env var to opt out from making claude.ai MCP servers available
- Improved `/model` command to show the currently active model in the slash command menu
- Added HTTP hooks, which can POST JSON to a URL and receive JSON instead of running a shell command
- Fixed listener leak in bridge polling loop
- Fixed listener leak in MCP OAuth flow cleanup
- Added manual URL paste fallback during MCP OAuth authentication. If the automatic localhost redirect doesn't work, you can paste the callback URL to complete authentication.
- Fixed memory leak when navigating hooks configuration menu
- Fixed listener leak in interactive permission handler during auto-approvals
- Fixed file count cache ignoring glob ignore patterns
- Fixed memory leak in bash command prefix cache
- Fixed MCP tool/resource cache leak on server reconnect
- Fixed IDE host IP detection cache incorrectly sharing results across ports
- Fixed WebSocket listener leak on transport reconnect
- Fixed memory leak in git root detection cache that could cause unbounded growth in long-running sessions
- Fixed memory leak in JSON parsing cache that grew unbounded over long sessions
- \[VS Code\] Fixed remote sessions not appearing in conversation history
- Fixed a race condition in the REPL bridge where new messages could arrive at the server interleaved with historical messages during the initial connection flush, causing message ordering issues
- Fixed memory leak where long-running teammates retained all messages in AppState even after conversation compaction
- Fixed a memory leak where MCP server fetch caches were not cleared on disconnect, causing growing memory usage with servers that reconnect frequently
- Improved memory usage in long sessions with subagents by stripping heavy progress message payloads during context compaction
- Added "Always copy full response" option to the `/copy` picker. When selected, future `/copy` commands will skip the code block picker and copy the full response directly.
- \[VS Code\] Added session rename and remove actions to the sessions list
- Fixed `/clear` not resetting cached skills, which could cause stale skill content to persist in the new conversation

Feb 28, 2026

* * *

**Synopsis:** Prompt suggestion cache fix.

### v2.1.62 [​](https://claudelog.com/claude-code-changelog/\#v2162 "Direct link to v2.1.62")

- Fixed prompt suggestion cache regression that reduced cache hit rates

Feb 27, 2026

* * *

**Synopsis:** Windows config file fix.

### v2.1.61 [​](https://claudelog.com/claude-code-changelog/\#v2161 "Direct link to v2.1.61")

- Fixed concurrent writes corrupting config file on Windows

Feb 27, 2026

* * *

**Synopsis:** Remote Control expansion.

### v2.1.58 [​](https://claudelog.com/claude-code-changelog/\#v2158 "Direct link to v2.1.58")

- Expand Remote Control to more users

Feb 25, 2026

* * *

**Synopsis:** VS Code crash fix.

### v2.1.56 [​](https://claudelog.com/claude-code-changelog/\#v2156 "Direct link to v2.1.56")

- \[VS Code\] Fixed another cause of "command 'claude-vscode.editor.openLast' not found" crashes

Feb 25, 2026

* * *

**Synopsis:** Windows BashTool fix.

### v2.1.55 [​](https://claudelog.com/claude-code-changelog/\#v2155 "Direct link to v2.1.55")

- Fixed BashTool failing on Windows with EINVAL error

Feb 25, 2026

* * *

**Synopsis:** UI flicker fix. Bulk agent kill improvements. Windows and WebAssembly stability fixes.

### v2.1.53 [​](https://claudelog.com/claude-code-changelog/\#v2153 "Direct link to v2.1.53")

- Fixed a UI flicker where user input would briefly disappear after submission before the message rendered
- Fixed bulk agent kill (ctrl+f) to send a single aggregate notification instead of one per agent, and to properly clear the command queue
- Fixed graceful shutdown sometimes leaving stale sessions when using Remote Control by parallelizing teardown network calls
- Fixed `--worktree` sometimes being ignored on first launch
- Fixed a panic ("switch on corrupted value") on Windows
- Fixed a crash that could occur when spawning many processes on Windows
- Fixed a crash in the WebAssembly interpreter on Linux x64 & Windows x64
- Fixed a crash that sometimes occurred after 2 minutes on Windows ARM64

Feb 25, 2026

* * *

**Synopsis:** VS Code Windows crash fix.

### v2.1.52 [​](https://claudelog.com/claude-code-changelog/\#v2152 "Direct link to v2.1.52")

- \[VSCode\] Fixed extension crash on Windows ("command 'claude-vscode.editor.openLast' not found")

Feb 24, 2026

* * *

**Synopsis:** Remote-control subcommand. Plugin git timeout config. Custom npm registries. BashTool login shell optimization. Security fix for hook commands. Model picker UI improvements.

### v2.1.51 [​](https://claudelog.com/claude-code-changelog/\#v2151 "Direct link to v2.1.51")

- Added `claude remote-control` subcommand for external builds, enabling local environment serving for all users
- Updated plugin marketplace default git timeout from 30s to 120s and added `CLAUDE_CODE_PLUGIN_GIT_TIMEOUT_MS` to configure
- Added support for custom npm registries and specific version pinning when installing plugins from npm sources
- BashTool now skips login shell (`-l` flag) by default when a shell snapshot is available, improving command execution performance. Previously this required setting `CLAUDE_BASH_NO_LOGIN=true`
- Fixed a security issue where statusLine and fileSuggestion hook commands could execute without workspace trust acceptance in interactive mode
- Tool results larger than 50K characters are now persisted to disk (previously 100K). This reduces context window usage and improves conversation longevity
- Fixed a bug where duplicate `control_response` messages (e.g., from WebSocket reconnects) could cause API 400 errors by pushing duplicate assistant messages into the conversation
- Added `CLAUDE_CODE_ACCOUNT_UUID`, `CLAUDE_CODE_USER_EMAIL`, and `CLAUDE_CODE_ORGANIZATION_UUID` environment variables for SDK callers to provide account info synchronously, eliminating a race condition where early telemetry events lacked account metadata
- Fixed slash command autocomplete crashing when a plugin's SKILL.md description is a YAML array or other non-string type
- The `/model` picker now shows human-readable labels (e.g., "Sonnet 4.5") instead of raw model IDs for pinned model versions, with an upgrade hint when a newer version is available

Feb 23, 2026

* * *

**Synopsis:** Agent worktree isolation. WorktreeCreate/WorktreeRemove hooks. claude agents CLI command. Opus 4.6 1M context. RHEL 8 glibc fix. Extensive memory leak and performance fixes.

### v2.1.50 [​](https://claudelog.com/claude-code-changelog/\#v2150 "Direct link to v2.1.50")

- Added support for `startupTimeout` configuration for LSP servers
- Added `WorktreeCreate` and `WorktreeRemove` hook events, enabling custom VCS setup and teardown when agent worktree isolation creates or removes worktrees
- Added support for `isolation: worktree` in agent definitions, allowing agents to declaratively run in isolated git worktrees
- Added `claude agents` CLI command to list all configured agents
- Added `CLAUDE_CODE_DISABLE_1M_CONTEXT` environment variable to disable 1M context window support
- Opus 4.6 (fast mode) now includes the full 1M context window
- `CLAUDE_CODE_SIMPLE` mode now also disables MCP tools, attachments, hooks, and CLAUDE.md file loading for a fully minimal experience
- Fixed a bug where resumed sessions could be invisible when the working directory involved symlinks, because the session storage path was resolved at different times during startup. Also fixed session data loss on SSH disconnect by flushing session data before hooks and analytics in the graceful shutdown sequence
- Fixed native modules not loading on systems with glibc older than 2.30 (e.g., RHEL 8) \[Linux\]
- Fixed memory leak in agent teams where completed teammate tasks were never garbage collected from session state
- Fixed `CLAUDE_CODE_SIMPLE` to fully strip down skills, session memory, custom agents, and CLAUDE.md token counting
- Fixed `/mcp reconnect` freezing the CLI when given a server name that doesn't exist
- Fixed memory leak where completed task state objects were never removed from AppState
- Fixed bug where MCP tools were not discovered when tool search is enabled and a prompt is passed in as a launch argument
- Fixed prompt suggestion cache regression that reduced cache hit rates
- Fixed unbounded memory growth in long sessions by capping file history snapshots
- Fixed memory leak where TaskOutput retained recent lines after cleanup
- Fixed memory leak in CircularBuffer where cleared items were retained in the backing array
- Fixed memory leak in shell command execution where ChildProcess and AbortController references were retained after cleanup
- Fixed a memory leak where LSP diagnostic data was never cleaned up after delivery, causing unbounded memory growth in long sessions
- Fixed a memory leak where completed task output was not freed from memory, reducing memory usage in long sessions with many tasks
- Improved memory usage during long sessions by clearing internal caches after compaction
- Improved memory usage during long sessions by clearing large tool results after they have been processed
- Improved startup performance for headless mode (`-p` flag) by deferring Yoga WASM and UI component imports
- \[VSCode\] Added `/extra-usage` command support in VS Code sessions

Feb 21, 2026

* * *

**Synopsis:** Git worktree isolation for agents. Ctrl+F kills background agents. Simple mode file editing. ConfigChange hook event. SDK model capability fields. Many memory, performance, and stability fixes.

### v2.1.49 [​](https://claudelog.com/claude-code-changelog/\#v2149 "Direct link to v2.1.49")

- Added `--worktree` (`-w`) flag to start Claude in an isolated git worktree
- Subagents support `isolation: "worktree"` for working in a temporary git worktree
- Added Ctrl+F keybinding to kill background agents (two-press confirmation)
- Agent definitions support `background: true` to always run as a background task
- Plugins can ship `settings.json` for default configuration
- Simple mode (`CLAUDE_CODE_SIMPLE`) now includes the file edit tool in addition to the Bash tool, allowing direct file editing in simple mode
- Permission suggestions are now populated when safety checks trigger an ask response, enabling SDK consumers to display permission options
- SDK model info now includes `supportsEffort`, `supportedEffortLevels`, and `supportsAdaptiveThinking` fields so consumers can discover model capabilities
- Added `ConfigChange` hook event that fires when configuration files change during a session, enabling enterprise security auditing and optional blocking of settings changes
- Sonnet 4.5 with 1M context is being removed from the Max plan in favor of our frontier Sonnet 4.6 model, which now has 1M context. Please switch in /model.
- Fixed file-not-found errors to suggest corrected paths when the model drops the repo folder
- Fixed Ctrl+C and ESC being silently ignored when background agents are running and the main thread is idle. Pressing twice within 3 seconds now kills all background agents
- Fixed prompt suggestion cache regression that reduced cache hit rates
- Fixed `plugin enable` and `plugin disable` to auto-detect the correct scope when `--scope` is not specified, instead of always defaulting to user scope
- Fixed verbose mode not updating thinking block display when toggled via `/config` — memo comparators now correctly detect verbose changes
- Fixed unbounded WASM memory growth during long sessions by periodically resetting the tree-sitter parser
- Fixed potential rendering issues caused by stale yoga layout references
- Fixed unbounded memory growth during long-running sessions caused by Yoga WASM linear memory never shrinking
- Fixed `disableAllHooks` setting to respect managed settings hierarchy — non-managed settings can no longer disable managed hooks set by policy (#26637)
- Fixed `--resume` session picker showing raw XML tags for sessions that start with commands like `/clear`. Now correctly falls through to the session ID fallback
- Improved permission prompts for path safety and working directory blocks to show the reason for the restriction instead of a bare prompt with no context
- Improved performance in non-interactive mode (`-p`) by skipping unnecessary API calls during startup
- Improved performance by caching authentication failures for HTTP and SSE MCP servers, avoiding repeated connection attempts to servers requiring auth
- Improved startup performance by reducing HTTP calls for analytics token counting
- Improved startup performance by batching MCP tool token counting into a single API call

Feb 20, 2026

* * *

**Synopsis:** FileWriteTool trailing blank line fix. Windows terminal rendering fixes. VS Code plan preview improvements. PDF compaction fix. Memory and startup performance improvements. Background agent control with ctrl+f. Many bug fixes.

### v2.1.47 [​](https://claudelog.com/claude-code-changelog/\#v2147 "Direct link to v2.1.47")

- Fixed FileWriteTool line counting to preserve intentional trailing blank lines instead of stripping them with `trimEnd()`
- Fixed Windows terminal rendering bugs caused by `os.EOL` (`\r\n`) in display code — line counts now show correct values instead of always showing 1 on Windows
- Improved VS Code plan preview: auto-updates as Claude iterates, enables commenting only when the plan is ready for review, and keeps the preview open when rejecting so Claude can revise
- Fixed a bug where bold and colored text in markdown output could shift to the wrong characters on Windows due to `\r\n` line endings
- Fixed compaction failing when conversation contains many PDF documents by stripping document blocks alongside images before sending to the compaction API
- Improved memory usage in long-running sessions by releasing API stream buffers, agent context, and skill state after use
- Improved startup performance by deferring SessionStart hook execution, reducing time-to-interactive by ~500ms
- Fixed an issue where bash tool output was silently discarded on Windows when using MSYS2 or Cygwin shells
- Improved performance of `@` file mentions - file suggestions now appear faster by pre-warming the index on startup and using session-based caching with background refresh
- Improved memory usage by trimming agent task message history after tasks complete
- Improved memory usage during long agent sessions by eliminating O(n²) message accumulation in progress updates
- Fixed the bash permission classifier to validate that returned match descriptions correspond to actual input rules, preventing hallucinated descriptions from incorrectly granting permissions
- Fixed user-defined agents only loading one file on NFS/FUSE filesystems that report zero inodes
- Fixed plugin agent skills silently failing to load when referenced by bare name instead of fully-qualified plugin name
- Search patterns in collapsed tool results are now displayed in quotes for clarity
- Windows: Fixed CWD tracking temp files never being cleaned up, causing them to accumulate indefinitely
- Use `ctrl+f` to kill all background agents instead of double-pressing ESC. Background agents now continue running when you press ESC to cancel the main thread, giving you more control over agent lifecycle
- Fixed API 400 errors ("thinking blocks cannot be modified") that occurred in sessions with concurrent agents, caused by interleaved streaming content blocks preventing proper message merging
- Simplified teammate navigation to use only Shift+Down (with wrapping) instead of both Shift+Up and Shift+Down
- Fixed an issue where a single file write/edit error would abort all other parallel file write/edit operations. Independent file mutations now complete even when a sibling fails
- Added `last_assistant_message` field to Stop and SubagentStop hook inputs, providing the final assistant response text so hooks can access it without parsing transcript files
- Fixed custom session titles set via `/rename` being lost after resuming a conversation
- Fixed collapsed read/search hint text overflowing on narrow terminals by truncating from the start
- Fixed an issue where bash commands with backslash-newline continuation lines (e.g., long commands split across multiple lines with `\`) would produce spurious empty arguments, potentially breaking command execution
- Fixed built-in slash commands (`/help`, `/model`, `/compact`, etc.) being hidden from the autocomplete dropdown when many user skills are installed
- Fixed MCP servers not appearing in the MCP Management Dialog after deferred loading
- Fixed session name persisting in status bar after `/clear` command
- Fixed crash when a skill's `name` or `description` in SKILL.md frontmatter is a bare number (e.g., `name: 3000`) — the value is now properly coerced to a string
- Fixed /resume silently dropping sessions when the first message exceeds 16KB or uses array-format content
- Added `chat:newline` keybinding action for configurable multi-line input
- Added `added_dirs` to the statusline JSON `workspace` section, exposing directories added via `/add-dir` to external scripts
- Fixed `claude doctor` misclassifying mise and asdf-managed installations as native installs
- Fixed zsh heredoc failing with "read-only file system" error in sandboxed commands
- Fixed agent progress indicator showing inflated tool use count
- Fixed image pasting not working on WSL2 systems where Windows copies images as BMP format
- Fixed background agent results returning raw transcript data instead of the agent's final answer
- Fixed Warp terminal incorrectly prompting for Shift+Enter setup when it supports it natively
- Fixed CJK wide characters causing misaligned timestamps and layout elements in the TUI
- Fixed custom agent `model` field in `.claude/agents/*.md` being ignored when spawning team teammates
- Fixed plan mode being lost after context compaction, causing the model to switch from planning to implementation mode
- Fixed `alwaysThinkingEnabled: true` in settings.json not enabling thinking mode on Bedrock and Vertex providers
- Fixed `tool_decision` OTel telemetry event not being emitted in headless/SDK mode
- Fixed session name being lost after context compaction — renamed sessions now preserve their custom title through compaction
- Increased initial session count in resume picker from 10 to 50 for faster session discovery
- Windows: fixed worktree session matching when drive letter casing differs
- Fixed `/resume <session-id>` failing to find sessions whose first message exceeds 16KB
- Fixed "Always allow" on multiline bash commands creating invalid permission patterns that corrupt settings
- Fixed React crash (error #31) when a skill's `argument-hint` in SKILL.md frontmatter uses YAML sequence syntax (e.g., `[topic: foo | bar]`) — the value is now properly coerced to a string
- Fixed crash when using `/fork` on sessions that used web search — null entries in search results from transcript deserialization are now handled gracefully
- Fixed read-only git commands triggering FSEvents file watcher loops on macOS by adding --no-optional-locks flag
- Fixed custom agents and skills not being discovered when running from a git worktree — project-level `.claude/agents/` and `.claude/skills/` from the main repository are now included
- Fixed non-interactive subcommands like `claude doctor` and `claude plugin validate` being blocked inside nested Claude sessions
- Windows: Fixed the same CLAUDE.md file being loaded twice when drive letter casing differs between paths
- Fixed inline code spans in markdown being incorrectly parsed as bash commands
- Fixed teammate spinners not respecting custom spinnerVerbs from settings
- Fixed shell commands permanently failing after a command deletes its own working directory
- Fixed hooks (PreToolUse, PostToolUse) silently failing to execute on Windows by using Git Bash instead of cmd.exe
- Fixed LSP `findReferences` and other location-based operations returning results from gitignored files (e.g., `node_modules/`, `venv/`)
- Moved config backup files from home directory root to `~/.claude/backups/` to reduce home directory clutter
- Fixed sessions with large first prompts (>16KB) disappearing from the /resume list
- Fixed shell functions with double-underscore prefixes (e.g., `__git_ps1`) not being preserved across shell sessions
- Fixed spinner showing "0 tokens" counter before any tokens have been received
- \[VSCode\] Fixed conversation messages appearing dimmed while the AskUserQuestion dialog is open
- Fixed background tasks failing in git worktrees due to remote URL resolution reading from worktree-specific gitdir instead of the main repository config
- Fixed Right Alt key leaving visible `[25~` escape sequence residue in the input field on Windows/Git Bash terminals\
- The `/rename` command now updates the terminal tab title by default\
- Fixed Edit tool silently corrupting Unicode curly quotes (\\u201c\\u201d \\u2018\\u2019) by replacing them with straight quotes when making edits\
- Fixed OSC 8 hyperlinks only being clickable on the first line when link text wraps across multiple terminal lines\
\
Feb 18, 2026\
\
* * *\
\
**Synopsis:** macOS orphaned process fix. Claude.ai MCP connectors support.\
\
### v2.1.46 [​](https://claudelog.com/claude-code-changelog/\#v2146 "Direct link to v2.1.46")\
\
- Fixed orphaned CC processes after terminal disconnect on macOS\
- Added support for using claude.ai MCP connectors in Claude Code\
\
Feb 17, 2026\
\
* * *\
\
**Synopsis:** Claude Sonnet 4.6 support. Custom spinner tips. SDK rate limit info. Agent Teams Bedrock/Vertex/Foundry fix. Sandbox temp file fix. Memory and startup performance improvements.\
\
### v2.1.45 [​](https://claudelog.com/claude-code-changelog/\#v2145 "Direct link to v2.1.45")\
\
- Added support for Claude Sonnet 4.6\
- Added support for reading `enabledPlugins` and `extraKnownMarketplaces` from `--add-dir` directories\
- Added `spinnerTipsOverride` setting to customize spinner tips — configure `tips` with an array of custom tip strings, and optionally set `excludeDefault: true` to show only your custom tips instead of the built-in ones\
- Added `SDKRateLimitInfo` and `SDKRateLimitEvent` types to the SDK, enabling consumers to receive rate limit status updates including utilization, reset times, and overage information\
- Fixed Agent Teams teammates failing on Bedrock, Vertex, and Foundry by propagating API provider environment variables to tmux-spawned processes\
- Fixed sandbox "operation not permitted" errors when writing temporary files on macOS by using the correct per-user temp directory\
- Fixed Task tool (backgrounded agents) crashing with a `ReferenceError` on completion\
- Fixed autocomplete suggestions not being accepted on Enter when images are pasted in the input\
- Fixed skills invoked by subagents incorrectly appearing in main session context after compaction\
- Fixed excessive `.claude.json.backup` files accumulating on every startup\
- Fixed plugin-provided commands, agents, and hooks not being available immediately after installation without requiring a restart\
- Improved startup performance by removing eager loading of session history for stats caching\
- Improved memory usage for shell commands that produce large output — RSS no longer grows unboundedly with command output size\
- Improved collapsed read/search groups to show the current file or search pattern being processed beneath the summary line while active\
- \[VSCode\] Improved permission destination choice (project/user/session) to persist across sessions\
\
Feb 17, 2026\
\
* * *\
\
**Synopsis:** Startup performance improvement. Prompt cache hit rate optimization. Opus 4.6 effort callout. /resume session titles fix. Image dimension limit error improvement.\
\
### v2.1.42 [​](https://claudelog.com/claude-code-changelog/\#v2142 "Direct link to v2.1.42")\
\
- Improved startup performance by deferring Zod schema construction\
- Improved prompt cache hit rates by moving date out of system prompt\
- Added one-time Opus 4.6 effort callout for eligible users\
- Fixed `/resume` showing interrupt messages as session titles\
- Fixed image dimension limit errors to suggest `/compact`\
\
Feb 13, 2026\
\
* * *\
\
**Synopsis:** AWS auth timeout fix. Auth CLI subcommands. Windows ARM64 support. Auto-rename sessions. File resolution anchor fragment fix. FileReadTool blocking fix. Agent SDK background task fix. Various UI and permission fixes.\
\
### v2.1.41 [​](https://claudelog.com/claude-code-changelog/\#v2141 "Direct link to v2.1.41")\
\
- Fixed AWS auth refresh hanging indefinitely by adding a 3-minute timeout\
- Added `claude auth login`, `claude auth status`, and `claude auth logout` CLI subcommands\
- Added Windows ARM64 (win32-arm64) native binary support\
- Improved `/rename` to auto-generate session name from conversation context when called without arguments\
- Improved narrow terminal layout for prompt footer\
- Fixed file resolution failing for @-mentions with anchor fragments (e.g., `@README.md#installation`)\
- Fixed FileReadTool blocking the process on FIFOs, `/dev/stdin`, and large files\
- Fixed background task notifications not being delivered in streaming Agent SDK mode\
- Fixed cursor jumping to end on each keystroke in classifier rule input\
- Fixed markdown link display text being dropped for raw URL\
- Fixed auto-compact failure error notifications being shown to users\
- Fixed permission wait time being included in subagent elapsed time display\
- Fixed proactive ticks firing while in plan mode\
- Fixed clear stale permission rules when settings change on disk\
- Fixed hook blocking errors showing stderr content in UI\
\
Feb 13, 2026\
\
* * *\
\
**Synopsis:** Nested session guard. Agent Teams model fix for enterprise providers. MCP image streaming crash fix. /resume XML preview cleanup. Improved Bedrock/Vertex/Foundry error messages. Plugin browse hint fix. OTel fast mode visibility. Terminal performance and stability improvements.\
\
### v2.1.39 [​](https://claudelog.com/claude-code-changelog/\#v2139 "Direct link to v2.1.39")\
\
- Added guard against launching Claude Code inside another Claude Code session\
- Fixed Agent Teams using wrong model identifier for Bedrock, Vertex, and Foundry customers\
- Fixed a crash when MCP tools return image content during streaming\
- Fixed `/resume` session previews showing raw XML tags instead of readable command names\
- Improved model error messages for Bedrock/Vertex/Foundry users with fallback suggestions\
- Fixed plugin browse showing misleading "Space to Toggle" hint for already-installed plugins\
- Fixed hook blocking errors (exit code 2) not showing stderr to the user\
- Added `speed` attribute to OTel events and trace spans for fast mode visibility\
- Fixed /resume showing interrupt messages as session titles\
- Fixed Opus 4.6 launch announcement showing for Bedrock/Vertex/Foundry users\
- Improved error message for many-image dimension limit errors with /compact suggestion\
- Fixed structured-outputs beta header being sent unconditionally on Vertex/Bedrock\
- Fixed spurious warnings for non-agent markdown files in `.claude/agents/` directory\
- Improved terminal rendering performance\
- Fixed fatal errors being swallowed instead of displayed\
- Fixed process hanging after session close\
- Fixed character loss at terminal screen boundary\
- Fixed blank lines in verbose transcript view\
\
Feb 11, 2026\
\
* * *\
\
**Synopsis:** VS Code terminal scroll fix. Tab key autocomplete fix. Bash env wrapper permission matching. Non-streaming text disappearing fix. VSCode duplicate session fix. Heredoc delimiter parsing security. Sandbox skill directory protection.\
\
### v2.1.38 [​](https://claudelog.com/claude-code-changelog/\#v2138 "Direct link to v2.1.38")\
\
- Fixed VS Code terminal scroll-to-top regression introduced in 2.1.37\
- Fixed Tab key queueing slash commands instead of autocompleting\
- Fixed bash permission matching for commands using environment variable wrappers\
- Fixed text between tool uses disappearing when not using streaming\
- Fixed duplicate sessions when resuming in VS Code extension\
- Improved heredoc delimiter parsing to prevent command smuggling\
- Blocked writes to `.claude/skills` directory in sandbox mode\
\
Feb 10, 2026\
\
* * *\
\
**Synopsis:** Fast mode availability fix after enabling extra usage.\
\
### v2.1.37 [​](https://claudelog.com/claude-code-changelog/\#v2137 "Direct link to v2.1.37")\
\
- Fixed an issue where `/fast` was not immediately available after enabling `/extra-usage`\
\
Feb 9, 2026\
\
* * *\
\
**Synopsis:** Fast mode for Opus 4.6.\
\
### v2.1.36 [​](https://claudelog.com/claude-code-changelog/\#v2136 "Direct link to v2.1.36")\
\
- Fast mode is now available for Opus 4.6. Use `/fast` to toggle faster responses at higher cost. [Learn more](https://code.claude.com/docs/en/fast-mode)\
\
Feb 7, 2026\
\
* * *\
\
**Synopsis:** Agent teams render crash fix. Sandbox exclusion bypass fix for Bash permission rules.\
\
### v2.1.34 [​](https://claudelog.com/claude-code-changelog/\#v2134 "Direct link to v2.1.34")\
\
- Fixed a crash when agent teams setting changed between renders\
- Fixed a bug where commands excluded from sandboxing (via `sandbox.excludedCommands` or `dangerouslyDisableSandbox`) could bypass the Bash ask permission rule when `autoAllowBashIfSandboxed` was enabled\
\
Feb 6, 2026\
\
* * *\
\
**Synopsis:** Agent teammate tmux session messaging fix. Agent teams plan warnings fix. TeammateIdle and TaskCompleted hook events. Task(agent\_type) sub-agent restrictions. Memory frontmatter for agents. Plugin name in skill descriptions. Extended thinking interruption fix. Mid-stream abort and API proxy 404 fixes. Proxy settings for WebFetch on Node.js. /resume XML markup cleanup. Improved API connection error messages. VSCode remote sessions and session picker enhancements.\
\
### v2.1.33 [​](https://claudelog.com/claude-code-changelog/\#v2133 "Direct link to v2.1.33")\
\
- Fixed agent teammate sessions in tmux to send and receive messages\
- Fixed warnings about agent teams not being available on your current plan\
- Added TeammateIdle and TaskCompleted hook events for multi-agent workflows\
- Added support for restricting which sub-agents can be spawned via `Task(agent_type)` syntax in agent "tools" frontmatter\
- Added memory frontmatter field support for agents, enabling persistent memory with user, project, or local scope\
- Added plugin name to skill descriptions and /skills menu for better discoverability\
- Fixed an issue where submitting a new message while the model was in extended thinking would interrupt the thinking phase\
- Fixed an API error that could occur when aborting mid-stream, where whitespace text combined with a thinking block would bypass normalization and produce an invalid request\
- Fixed API proxy compatibility issue where 404 errors on streaming endpoints no longer triggered non-streaming fallback\
- Fixed an issue where proxy settings configured via settings.json environment variables were not applied to WebFetch and other HTTP requests on the Node.js build\
- Fixed /resume session picker showing raw XML markup instead of clean titles for sessions started with slash commands\
- Improved error messages for API connection failures — now shows specific cause (e.g., ECONNREFUSED, SSL errors) instead of generic "Connection error"\
- Errors from invalid managed settings are now surfaced\
- \[VSCode\] Added support for remote sessions, allowing OAuth users to browse and resume sessions from claude.ai\
- \[VSCode\] Added git branch and message count to the session picker, with support for searching by branch name\
- \[VSCode\] Fixed scroll-to-bottom under-scrolling on initial session load and session switch\
\
Feb 6, 2026\
\
* * *\
\
**Synopsis:** Claude Opus 4.6 model. Research preview agent teams for multi-agent collaboration. Automatic memory recording and recall. "Summarize from here" for partial conversation summarization. Skills from --add-dir directories. @ file completion path fix. Bash heredoc template literal fix. Skill character budget scaling. Thai/Lao character rendering fix. VSCode slash command and conversation loading fixes.\
\
### v2.1.32 [​](https://claudelog.com/claude-code-changelog/\#v2132 "Direct link to v2.1.32")\
\
- Claude Opus 4.6 is now available!\
- Added research preview agent teams feature for multi-agent collaboration (token-intensive feature, requires setting `CLAUDE_CODE_EXPERIMENTAL_AGENT_TEAMS=1`)\
- Claude now automatically records and recalls memories as it works\
- Added "Summarize from here" to the message selector, allowing partial conversation summarization\
- Skills defined in `.claude/skills/` within additional directories (`--add-dir`) are now loaded automatically\
- Fixed `@` file completion showing incorrect relative paths when running from a subdirectory\
- Updated `--resume` to re-use `--agent` value specified in previous conversation by default\
- Fixed: Bash tool no longer throws "Bad substitution" errors when heredocs contain JavaScript template literals like `${index + 1}`, which previously interrupted tool execution\
- Skill character budget now scales with context window (2% of context), so users with larger context windows can see more skill descriptions without truncation\
- Fixed Thai/Lao spacing vowels (สระ า, ำ) not rendering correctly in the input field\
- \[VSCode\] Fixed slash commands incorrectly being executed when pressing Enter with preceding text in the input field\
- \[VSCode\] Added spinner when loading past conversations list\
\
Feb 5, 2026\
\
* * *\
\
**Synopsis:** Session resume hint on exit. Japanese IME full-width space support. PDF size error fix for session locks. Sandbox read-only error fix. Plan mode crash fix. Temperature override fix for streaming API. LSP shutdown compatibility fix. Improved tool preference prompts. Better PDF/request error messages. Spinner layout jitter reduction.\
\
### v2.1.31 [​](https://claudelog.com/claude-code-changelog/\#v2131 "Direct link to v2.1.31")\
\
- Added session resume hint on exit, showing how to continue your conversation later\
- Added support for full-width (zenkaku) space input from Japanese IME in checkbox selection\
- Fixed PDF too large errors permanently locking up sessions, requiring users to start a new conversation\
- Fixed bash commands incorrectly reporting failure with "Read-only file system" errors when sandbox mode was enabled\
- Fixed a crash that made sessions unusable after entering plan mode when project config in ~/.claude.json was missing default fields\
- Fixed temperatureOverride being silently ignored in the streaming API path, causing all streaming requests to use the default temperature (1) regardless of the configured override\
- Fixed LSP shutdown/exit compatibility with strict language servers that reject null params\
- Improved system prompts to more clearly guide the model toward using dedicated tools (Read, Edit, Glob, Grep) instead of bash equivalents (cat, sed, grep, find), reducing unnecessary bash command usage\
- Improved PDF and request size error messages to show actual limits (100 pages, 20MB)\
- Reduced layout jitter in the terminal when the spinner appears and disappears during streaming\
- Removed misleading Anthropic API pricing from model selector for third-party provider (Bedrock, Vertex, Foundry) users\
\
Feb 4, 2026\
\
* * *\
\
**Synopsis:** PDF page range parameter for Read tool. Pre-configured OAuth for MCP servers. `/debug` command. Additional git log/show flags. Task tool metrics. Reduced motion mode. Phantom text block fix. Prompt cache invalidation fix. Session resume memory optimization (68% reduction). VSCode multiline input.\
\
### v2.1.30 [​](https://claudelog.com/claude-code-changelog/\#v2130 "Direct link to v2.1.30")\
\
- Added `pages` parameter to the Read tool for PDFs, allowing specific page ranges to be read (e.g., `pages: "1-5"`). Large PDFs (>10 pages) now return a lightweight reference when `@` mentioned instead of being inlined into context.\
- Added pre-configured OAuth client credentials for MCP servers that don't support Dynamic Client Registration (e.g., Slack). Use `--client-id` and `--client-secret` with `claude mcp add`.\
- Added `/debug` for Claude to help troubleshoot the current session\
- Added support for additional `git log` and `git show` flags in read-only mode (e.g., `--topo-order`, `--cherry-pick`, `--format`, `--raw`)\
- Added token count, tool uses, and duration metrics to Task tool results\
- Added reduced motion mode to the config\
- Fixed phantom "(no content)" text blocks appearing in API conversation history, reducing token waste and potential model confusion\
- Fixed prompt cache not correctly invalidating when tool descriptions or input schemas changed, only when tool names changed\
- Fixed 400 errors that could occur after running `/login` when the conversation contained thinking blocks\
- Fixed a hang when resuming sessions with corrupted transcript files containing `parentUuid` cycles\
- Fixed rate limit message showing incorrect "/upgrade" suggestion for Max 20x users when extra-usage is unavailable\
- Fixed permission dialogs stealing focus while actively typing\
- Fixed subagents not being able to access SDK-provided MCP tools because they were not synced to the shared application state\
- Fixed a regression where Windows users with a `.bashrc` file could not run bash commands\
- Improved memory usage for `--resume` (68% reduction for users with many sessions) by replacing the session index with lightweight stat-based loading and progressive enrichment\
- Improved `TaskStop` tool to display the stopped command/task description in the result line instead of a generic "Task stopped" message\
- Changed `/model` to execute immediately instead of being queued\
- \[VSCode\] Added multiline input support to the "Other" text input in question dialogs (use Shift+Enter for new lines)\
- \[VSCode\] Fixed duplicate sessions appearing in the session list when starting a new conversation\
\
Feb 3, 2026\
\
* * *\
\
**Synopsis:** Tool call debug logging. `--from-pr` flag for PR-linked session resume. Auto-linking sessions to PRs via `gh pr create`. Permissions `ask` precedence over `allow`. VSCode Claude in Chrome integration. Windows bash and console window fixes. VSCode OAuth token expiration fix.\
\
### v2.1.27 [​](https://claudelog.com/claude-code-changelog/\#v2127 "Direct link to v2.1.27")\
\
- Added tool call failures and denials to debug logs\
- Added `--from-pr` flag to resume sessions linked to a specific GitHub PR number or URL\
- Sessions are now automatically linked to PRs when created via `gh pr create`\
- Fixed context management validation error for gateway users, ensuring `CLAUDE_CODE_DISABLE_EXPERIMENTAL_BETAS=1` avoids the error\
- Fixed /context command not displaying colored output\
- Fixed status bar duplicating background task indicator when PR status was shown\
- Changed permissions to respect content-level `ask` over tool-level `allow` (previously `allow: ["Bash"], ask: ["Bash(rm *)"]` allowed all bash commands, but will now permission prompt for `rm`)\
- \[Windows\] Fixed bash command execution failing for users with `.bashrc` files\
- \[Windows\] Fixed console windows flashing when spawning child processes\
- \[VSCode\] Enabled Claude in Chrome integration\
- \[VSCode\] Fixed OAuth token expiration causing 401 errors after extended sessions\
\
Jan 31, 2026\
\
* * *\
\
**Synopsis:** Beta header validation fix for Bedrock and Vertex gateway users.\
\
### v2.1.25 [​](https://claudelog.com/claude-code-changelog/\#v2125 "Direct link to v2.1.25")\
\
- Fixed beta header validation error for gateway users on Bedrock and Vertex, ensuring `CLAUDE_CODE_DISABLE_EXPERIMENTAL_BETAS=1` avoids the error\
\
Jan 29, 2026\
\
* * *\
\
**Synopsis:** Customizable spinner verbs setting. mTLS and proxy connectivity fixes for corporate proxies. Per-user temp directory isolation. Prompt caching race condition fix. Terminal rendering performance improvements. Merged PR purple status indicator. IDE Bedrock region strings fix.\
\
### v2.1.23 [​](https://claudelog.com/claude-code-changelog/\#v2123 "Direct link to v2.1.23")\
\
- Added customizable spinner verbs setting (`spinnerVerbs`)\
- Fixed mTLS and proxy connectivity for users behind corporate proxies or using client certificates\
- Fixed per-user temp directory isolation to prevent permission conflicts on shared systems\
- Fixed a race condition that could cause 400 errors when prompt caching scope was enabled\
- Fixed pending async hooks not being cancelled when headless streaming sessions ended\
- Fixed tab completion not updating the input field when accepting a suggestion\
- Fixed ripgrep search timeouts silently returning empty results instead of reporting errors\
- Improved terminal rendering performance with optimized screen data layout\
- Changed Bash commands to show timeout duration alongside elapsed time\
- Changed merged pull requests to show a purple status indicator in the prompt footer\
- \[IDE\] Fixed model options displaying incorrect region strings for Bedrock users in headless mode\
\
Jan 29, 2026\
\
* * *\
\
**Synopsis:** Fixed structured outputs for non-interactive (`-p`) mode.\
\
### v2.1.22 [​](https://claudelog.com/claude-code-changelog/\#v2122 "Direct link to v2.1.22")\
\
- Fixed structured outputs for non-interactive (`-p`) mode\
\
Jan 28, 2026\
\
* * *\
\
**Synopsis:** Full-width (zenkaku) number input for Japanese IME. Shell completion cache truncation fix. API error fix for interrupted session resume. Auto-compact timing fix for large output token models. Task ID reuse prevention. Read/search progress indicator improvements. File operation tool preference over bash equivalents. VSCode Python virtual environment activation. VSCode Windows file search fix.\
\
### v2.1.21 [​](https://claudelog.com/claude-code-changelog/\#v2121 "Direct link to v2.1.21")\
\
- Added support for full-width (zenkaku) number input from Japanese IME in option selection prompts\
- Fixed shell completion cache files being truncated on exit\
- Fixed API errors when resuming sessions that were interrupted during tool execution\
- Fixed auto-compact triggering too early on models with large output token limits\
- Fixed task IDs potentially being reused after deletion\
- Fixed file search not working in VS Code extension on Windows\
- Improved read/search progress indicators to show "Reading…" while in progress and "Read" when complete\
- Improved Claude to prefer file operation tools (Read, Edit, Write) over bash equivalents (cat, sed, awk)\
- \[VSCode\] Added automatic Python virtual environment activation, ensuring python and pip commands use the correct interpreter (configurable via `claudeCode.usePythonEnvironment` setting)\
- \[VSCode\] Fixed message action buttons having incorrect background colors\
\
Jan 28, 2026\
\
* * *\
\
**Synopsis:** Vim normal mode arrow key history navigation. PR review status indicator in prompt footer with colored dot and clickable link. External editor shortcut (Ctrl+G) in help menu. CLAUDE.md loading from `--add-dir` directories. Task deletion via TaskUpdate. Session compaction and resume fixes. Wide character rendering fixes. Thinking status shimmer animation. Dynamic task list height. `/sandbox` dependency status UI.\
\
### v2.1.20 [​](https://claudelog.com/claude-code-changelog/\#v2120 "Direct link to v2.1.20")\
\
- Added arrow key history navigation in vim normal mode when cursor cannot move further\
- Added external editor shortcut (Ctrl+G) to the help menu for better discoverability\
- Added PR review status indicator to the prompt footer, showing the current branch's PR state (approved, changes requested, pending, or draft) as a colored dot with a clickable link\
- Added support for loading `CLAUDE.md` files from additional directories specified via `--add-dir` flag (requires setting `CLAUDE_CODE_ADDITIONAL_DIRECTORIES_CLAUDE_MD=1`)\
- Added ability to delete tasks via the `TaskUpdate` tool\
- Fixed session compaction issues that could cause resume to load full history instead of the compact summary\
- Fixed agents sometimes ignoring user messages sent while actively working on a task\
- Fixed wide character (emoji, CJK) rendering artifacts where trailing columns were not cleared when replaced by narrower characters\
- Fixed JSON parsing errors when MCP tool responses contain special Unicode characters\
- Fixed up/down arrow keys in multi-line and wrapped text input to prioritize cursor movement over history navigation\
- Fixed draft prompt being lost when pressing UP arrow to navigate command history\
- Fixed ghost text flickering when typing slash commands mid-input\
- Fixed marketplace source removal not properly deleting settings\
- Fixed duplicate output in some commands like `/context`\
- Fixed task list sometimes showing outside the main conversation view\
- Fixed syntax highlighting for diffs occurring within multiline constructs like Python docstrings\
- Fixed crashes when cancelling tool use\
- Improved `/sandbox` command UI to show dependency status with installation instructions when dependencies are missing\
- Improved thinking status text with a subtle shimmer animation\
- Improved task list to dynamically adjust visible items based on terminal height\
- Improved fork conversation hint to show how to resume the original session\
- Changed collapsed read/search groups to show present tense ("Reading", "Searching for") while in progress, and past tense ("Read", "Searched for") when complete\
- Changed `ToolSearch` results to appear as a brief notification instead of inline in the conversation\
- Changed the `/commit-push-pr` skill to automatically post PR URLs to Slack channels when configured via MCP tools\
- Changed the `/copy` command to be available to all users\
- Changed background agents to prompt for tool permissions before launching\
- Changed permission rules like `Bash(*)` to be accepted and treated as equivalent to `Bash`\
- Changed config backups to be timestamped and rotated (keeping 5 most recent) to prevent data loss\
\
Jan 27, 2026\
\
* * *\
\
**Synopsis:**`CLAUDE_CODE_ENABLE_TASKS` env var to disable new task system. Argument shorthand `$0`, `$1` for custom commands. Crash fixes for non-AVX processors and terminal close. Session fixes for `/rename`, `/tag`, and resuming by title. Skills without permissions auto-allowed. SDK message replay. VSCode session forking and rewind.\
\
### v2.1.19 [​](https://claudelog.com/claude-code-changelog/\#v2119 "Direct link to v2.1.19")\
\
- Added env var `CLAUDE_CODE_ENABLE_TASKS`, set to `false` to keep the old system temporarily\
- Added shorthand `$0`, `$1`, etc. for accessing individual arguments in custom commands\
- Fixed crashes on processors without AVX instruction support\
- Fixed dangling Claude Code processes when terminal is closed by catching EIO errors from `process.exit()` and using SIGKILL as fallback\
- Fixed `/rename` and `/tag` not updating the correct session when resuming from a different directory (e.g., git worktrees)\
- Fixed resuming sessions by custom title not working when run from a different directory\
- Fixed pasted text content being lost when using prompt stash (Ctrl+S) and restore\
- Fixed agent list displaying "Sonnet (default)" instead of "Inherit (default)" for agents without an explicit model setting\
- Fixed backgrounded hook commands not returning early, potentially causing the session to wait on a process that was intentionally backgrounded\
- Fixed file write preview omitting empty lines\
- Changed skills without additional permissions or hooks to be allowed without requiring approval\
- Changed indexed argument syntax from `$ARGUMENTS.0` to `$ARGUMENTS[0]` (bracket syntax)\
- \[SDK\] Added replay of `queued_command` attachment messages as `SDKUserMessageReplay` events when `replayUserMessages` is enabled\
- \[VSCode\] Enabled session forking and rewind functionality for all users\
\
Jan 23, 2026\
\
* * *\
\
**Synopsis:** Customizable keyboard shortcuts with context-specific keybindings and chord sequences via `/keybindings` command.\
\
### v2.1.18 [​](https://claudelog.com/claude-code-changelog/\#v2118 "Direct link to v2.1.18")\
\
- Added customizable keyboard shortcuts. Configure keybindings per context, create chord sequences, and personalize your workflow. Run `/keybindings` to get started. Learn more at [https://code.claude.com/docs/en/keybindings](https://code.claude.com/docs/en/keybindings)\
\
Jan 23, 2026\
\
* * *\
\
**Synopsis:** Fixed crashes on processors without AVX instruction support.\
\
### v2.1.17 [​](https://claudelog.com/claude-code-changelog/\#v2117 "Direct link to v2.1.17")\
\
- Fixed crashes on processors without AVX instruction support\
\
Jan 22, 2026\
\
* * *\
\
**Synopsis:** New task management system with dependency tracking. Native plugin management and remote session browsing in VSCode. Fixes for out-of-memory crashes, context warning, session titles, and Windows sidebar race condition.\
\
### v2.1.16 [​](https://claudelog.com/claude-code-changelog/\#v2116 "Direct link to v2.1.16")\
\
- Added new task management system, including new capabilities like dependency tracking\
- \[VSCode\] Added native plugin management support\
- \[VSCode\] Added ability for OAuth users to browse and resume remote Claude sessions from the Sessions dialog\
- Fixed out-of-memory crashes when resuming sessions with heavy subagent usage\
- Fixed an issue where the "context remaining" warning was not hidden after running `/compact`\
- Fixed session titles on the resume screen not respecting the user's language setting\
- \[IDE\] Fixed a race condition on Windows where the Claude Code sidebar view container would not appear on start\
\
Jan 22, 2026\
\
* * *\
\
**Synopsis:** Deprecation notification for npm installations with migration path to native installer. UI rendering performance improvements via React Compiler. Fix for context warning not clearing after `/compact`. MCP stdio server timeout fix.\
\
### v2.1.15 [​](https://claudelog.com/claude-code-changelog/\#v2115 "Direct link to v2.1.15")\
\
- Added deprecation notification for npm installations - run `claude install` or see [https://docs.anthropic.com/en/docs/claude-code/getting-started](https://docs.anthropic.com/en/docs/claude-code/getting-started) for more options\
- Improved UI rendering performance with React Compiler\
- Fixed the "Context left until auto-compact" warning not disappearing after running `/compact`\
- Fixed MCP stdio server timeout not killing child process, which could cause UI freezes\
\
Jan 21, 2026\
\
* * *\
\
**Synopsis:** History-based autocomplete in bash mode with Tab completion from command history. Plugin search and SHA pinning for exact versions. Fixed context window blocking at ~65% instead of intended ~98%. Memory crash fixes for parallel subagents and long-running sessions. Multiple UI fixes for bash mode, @-mentions, overlays, and autocomplete. VSCode `/usage` command.\
\
### v2.1.14 [​](https://claudelog.com/claude-code-changelog/\#v2114 "Direct link to v2.1.14")\
\
- Added history-based autocomplete in bash mode (`!`) \- type a partial command and press Tab to complete from your bash command history\
- Added search to installed plugins list - type to filter by name or description\
- Added support for pinning plugins to specific git commit SHAs, allowing marketplace entries to install exact versions\
- Fixed a regression where the context window blocking limit was calculated too aggressively, blocking users at ~65% context usage instead of the intended ~98%\
- Fixed memory issues that could cause crashes when running parallel subagents\
- Fixed memory leak in long-running sessions where stream resources were not cleaned up after shell commands completed\
- Fixed `@` symbol incorrectly triggering file autocomplete suggestions in bash mode\
- Fixed `@`-mention menu folder click behavior to navigate into directories instead of selecting them\
- Fixed `/feedback` command generating invalid GitHub issue URLs when description is very long\
- Fixed `/context` command to show the same token count and percentage as the status line in verbose mode\
- Fixed an issue where `/config`, `/context`, `/model`, and `/todos` command overlays could close unexpectedly\
- Fixed slash command autocomplete selecting wrong command when typing similar commands (e.g., `/context` vs `/compact`)\
- Fixed inconsistent back navigation in plugin marketplace when only one marketplace is configured\
- Fixed iTerm2 progress bar not clearing properly on exit, preventing lingering indicators and bell sounds\
- Improved backspace to delete pasted text as a single token instead of one character at a time\
- \[VSCode\] Added `/usage` command to display current plan usage\
\
Jan 20, 2026\
\
* * *\
\
**Synopsis:** Fixed message rendering bug.\
\
### v2.1.12 [​](https://claudelog.com/claude-code-changelog/\#v2112 "Direct link to v2.1.12")\
\
- Fixed message rendering bug\
\
Jan 17, 2026\
\
* * *\
\
**Synopsis:** Fixed excessive MCP connection requests for HTTP/SSE transports.\
\
### v2.1.11 [​](https://claudelog.com/claude-code-changelog/\#v2111 "Direct link to v2.1.11")\
\
- Fixed excessive MCP connection requests for HTTP/SSE transports\
\
Jan 17, 2026\
\
* * *\
\
**Synopsis:** New `Setup` hook event for repository setup and maintenance operations. Keyboard shortcut 'c' to copy OAuth URL during login. Crash fix for heredocs with JavaScript template literals. Improved startup keystroke capture and file suggestions.\
\
### v2.1.10 [​](https://claudelog.com/claude-code-changelog/\#v2110 "Direct link to v2.1.10")\
\
- Added new `Setup` hook event that can be triggered via `--init`, `--init-only`, or `--maintenance` CLI flags for repository setup and maintenance operations\
- Added keyboard shortcut 'c' to copy OAuth URL when browser doesn't open automatically during login\
- Fixed a crash when running bash commands containing heredocs with JavaScript template literals like `${index + 1}`\
- Improved startup to capture keystrokes typed before the REPL is fully ready\
- Improved file suggestions to show as removable attachments instead of inserting text when accepted\
- \[VSCode\] Added install count display to plugin listings\
- \[VSCode\] Added trust warning when installing plugins\
\
Jan 17, 2026\
\
* * *\
\
**Synopsis:**`auto:N` syntax for MCP tool search auto-enable threshold configuration. `plansDirectory` setting to customize plan file storage. External editor support (Ctrl+G) in AskUserQuestion "Other" input. Session URL attribution to commits and PRs from web sessions.\
\
### v2.1.9 [​](https://claudelog.com/claude-code-changelog/\#v219 "Direct link to v2.1.9")\
\
- Added `auto:N` syntax for configuring the MCP tool search auto-enable threshold, where N is the context window percentage (0-100)\
- Added `plansDirectory` setting to customize where plan files are stored\
- Added external editor support (Ctrl+G) in AskUserQuestion "Other" input field\
- Added session URL attribution to commits and PRs created from web sessions\
- Added support for PreToolUse hooks to return `additionalContext` to the model\
- Added `${CLAUDE_SESSION_ID}` string substitution for skills to access the current session ID\
- Fixed long sessions with parallel tool calls failing with an API error about orphan `tool_result` blocks\
- Fixed MCP server reconnection hanging when cached connection promise never resolves\
- Fixed Ctrl+Z suspend not working in terminals using Kitty keyboard protocol (Ghostty, iTerm2, kitty, WezTerm)\
\
Jan 16, 2026\
\
* * *\
\
**Synopsis:** Customizable keyboard shortcuts via `~/.claude/keybindings.json`. `showTurnDuration` setting to hide turn duration messages. Feedback option on permission prompts. Inline agent response display in task notifications. Security fix for wildcard permission rules matching compound commands. MCP tool search auto mode enabled by default.\
\
### v2.1.7 [​](https://claudelog.com/claude-code-changelog/\#v217 "Direct link to v2.1.7")\
\
- Added customizable keyboard shortcuts via `~/.claude/keybindings.json`. Run `/keybindings` to get started. Learn more at [https://code.claude.com/docs/en/keybindings](https://code.claude.com/docs/en/keybindings)\
- Added `showTurnDuration` setting to hide turn duration messages (e.g., "Cooked for 1m 6s")\
- Added ability to provide feedback when accepting permission prompts\
- Added inline display of agent's final response in task notifications, making it easier to see results without reading the full transcript file\
- Fixed security vulnerability where wildcard permission rules could match compound commands containing shell operators\
- Fixed false "file modified" errors on Windows when cloud sync tools, antivirus scanners, or Git touch file timestamps without changing content\
- Fixed orphaned `tool_result` errors when sibling tools fail during streaming execution\
- Fixed context window blocking limit being calculated using the full context window instead of the effective context window (which reserves space for max output tokens)\
- Fixed spinner briefly flashing when running local slash commands like `/model` or `/theme`\
- Fixed terminal title animation jitter by using fixed-width braille characters\
- Fixed plugins with git submodules not being fully initialized when installed\
- Fixed bash commands failing on Windows when temp directory paths contained characters like `t` or `n` that were misinterpreted as escape sequences\
- Improved typing responsiveness by reducing memory allocation overhead in terminal rendering\
- Enabled MCP tool search auto mode by default for all users. When MCP tool descriptions exceed 10% of the context window, they are automatically deferred and discovered via the MCPSearch tool instead of being loaded upfront. This reduces context usage for users with many MCP tools configured. Users can disable this by adding MCPSearch to `disallowedTools` in their settings.\
- Changed OAuth and API Console URLs from console.anthropic.com to platform.claude.com\
- \[VSCode\] Fixed `claudeProcessWrapper` setting passing the wrapper path instead of the Claude binary path\
\
Jan 14, 2026\
\
* * *\
\
**Synopsis:** Search functionality for `/config` command. Date range filtering in `/stats` (press r to cycle 7/30/All time). Updates section in `/doctor` showing auto-update channel and npm versions. Fixed permission bypass via shell line continuation.\
\
### v2.1.6 [​](https://claudelog.com/claude-code-changelog/\#v216 "Direct link to v2.1.6")\
\
- Added search functionality to `/config` command for quickly filtering settings\
- Added Updates section to `/doctor` showing auto-update channel and available npm versions (stable/latest)\
- Added date range filtering to `/stats` command - press r to cycle between Last 7 days, Last 30 days, and All time\
- Added automatic discovery of skills from nested `.claude/skills` directories when working with files in subdirectories\
- Added `context_window.used_percentage` and `context_window.remaining_percentage` fields to status line input for easier context window display\
- Added an error display when the editor fails during Ctrl+G\
- Fixed permission bypass via shell line continuation that could allow blocked commands to execute\
- Fixed false "File has been unexpectedly modified" errors when file watchers touch files without changing content\
- Fixed text styling (bold, colors) getting progressively misaligned in multi-line responses\
- Fixed the feedback panel closing unexpectedly when typing 'n' in the description field\
- Fixed rate limit warning appearing at low usage after weekly reset (now requires 70% usage)\
- Fixed rate limit options menu incorrectly auto-opening when resuming a previous session\
- Fixed numpad keys outputting escape sequences instead of characters in Kitty keyboard protocol terminals\
- Fixed Option+Return not inserting newlines in Kitty keyboard protocol terminals\
- Fixed corrupted config backup files accumulating in the home directory (now only one backup is created per config file)\
- Fixed `mcp list` and `mcp get` commands leaving orphaned MCP server processes\
- Fixed visual artifacts in ink2 mode when nodes become hidden via display:none\
- Improved the external CLAUDE.md imports approval dialog to show which files are being imported and from where\
- Improved the `/tasks` dialog to go directly to task details when there's only one background task running\
- Improved @ autocomplete with icons for different suggestion types and single-line formatting\
- Updated "Help improve Claude" setting fetch to refresh OAuth and retry when it fails due to a stale OAuth token\
- Changed task notification display to cap at 3 lines with overflow summary when multiple background tasks complete simultaneously\
- Changed terminal title to "Claude Code" on startup for better window identification\
- Removed ability to @-mention MCP servers to enable/disable - use `/mcp enable <name>` instead\
- \[VSCode\] Fixed usage indicator not updating after manual compact\
\
Jan 13, 2026\
\
* * *\
\
**Synopsis:**`CLAUDE_CODE_TMPDIR` environment variable to override temp directory for internal temp files.\
Useful for environments with custom temp directory requirements.\
\
### v2.1.5 [​](https://claudelog.com/claude-code-changelog/\#v215 "Direct link to v2.1.5")\
\
- Added `CLAUDE_CODE_TMPDIR` environment variable to override the temp directory used for internal temp files, useful for environments with custom temp directory requirements\
\
Jan 12, 2026\
\
* * *\
\
**Synopsis:**`CLAUDE_CODE_DISABLE_BACKGROUND_TASKS` environment variable to disable all background task functionality.\
Fixed "Help improve Claude" setting fetch to refresh OAuth and retry on stale token failure.\
\
### v2.1.4 [​](https://claudelog.com/claude-code-changelog/\#v214 "Direct link to v2.1.4")\
\
- Added `CLAUDE_CODE_DISABLE_BACKGROUND_TASKS` environment variable to disable all background task functionality including auto-backgrounding and the Ctrl+B shortcut\
- Fixed "Help improve Claude" setting fetch to refresh OAuth and retry when it fails due to a stale OAuth token\
\
Jan 10, 2026\
\
* * *\
\
**Synopsis:** Merged slash commands and skills (simplified mental model). Release channel toggle in `/config`. Unreachable permission rule warnings.\
\
### v2.1.3 [​](https://claudelog.com/claude-code-changelog/\#v213 "Direct link to v2.1.3")\
\
- Merged slash commands and skills, simplifying the mental model with no change in behavior\
- Added release channel (stable or latest) toggle to `/config`\
- Added detection and warnings for unreachable permission rules, with warnings in `/doctor` and after saving rules that include the source of each rule and actionable fix guidance\
- Fixed plan files persisting across `/clear` commands, now ensuring a fresh plan file is used after clearing a conversation\
- Fixed false skill duplicate detection on filesystems with large inodes (e.g., ExFAT) by using 64-bit precision for inode values\
- Fixed mismatch between background task count in status bar and items shown in tasks dialog\
- Fixed sub-agents using the wrong model during conversation compaction\
- Fixed web search in sub-agents using incorrect model\
- Fixed trust dialog acceptance when running from the home directory not enabling trust-requiring features like hooks during the session\
- Improved terminal rendering stability by preventing uncontrolled writes from corrupting cursor state\
- Improved slash command suggestion readability by truncating long descriptions to 2 lines\
- Changed tool hook execution timeout from 60 seconds to 10 minutes\
- VSCode: Added clickable destination selector for permission requests, allowing you to choose where settings are saved (this project, all projects, shared with team, or session only)\
\
Jan 9, 2026\
\
* * *\
\
**Synopsis:** Clickable file path hyperlinks (`OSC 8`). winget installation support. Fixed command injection security vulnerability.\
\
### v2.1.2 [​](https://claudelog.com/claude-code-changelog/\#v212 "Direct link to v2.1.2")\
\
- Added source path metadata to images dragged onto the terminal, helping Claude understand where images originated\
- Added clickable hyperlinks for file paths in tool output in terminals that support OSC 8 (like iTerm)\
- Added support for Windows Package Manager (winget) installations with automatic detection and update instructions\
- Added Shift+Tab keyboard shortcut in plan mode to quickly select "auto-accept edits" option\
- Added `FORCE_AUTOUPDATE_PLUGINS` environment variable to allow plugin autoupdate even when the main auto-updater is disabled\
- Added `agent_type` to `SessionStart` hook input, populated if `--agent` is specified\
- Fixed a command injection vulnerability in bash command processing where malformed input could execute arbitrary commands\
- Fixed a memory leak where tree-sitter parse trees were not being freed, causing WASM memory to grow unbounded over long sessions\
- Fixed binary files (images, PDFs, etc.) being accidentally included in memory when using `@include` directives in `CLAUDE.md` files\
- Fixed updates incorrectly claiming another installation is in progress\
- Fixed crash when socket files exist in watched directories (defense-in-depth for EOPNOTSUPP errors)\
- Fixed remote session URL and teleport being broken when using `/tasks` command\
- Fixed MCP tool names being exposed in analytics events by sanitizing user-specific server configurations\
- Improved Option-as-Meta hint on macOS to show terminal-specific instructions for native CSIu terminals like iTerm2, Kitty, and WezTerm\
- Improved error message when pasting images over SSH to suggest using `scp` instead of the unhelpful clipboard shortcut hint\
- Improved permission explainer to not flag routine dev workflows (git fetch/rebase, npm install, tests, PRs) as medium risk\
- Changed large bash command outputs to be saved to disk instead of truncated, allowing Claude to read the full content\
- Changed large tool outputs to be persisted to disk instead of truncated, providing full output access via file references\
- Changed `/plugins` installed tab to unify plugins and MCPs with scope-based grouping\
- Deprecated Windows managed settings path `C:\ProgramData\ClaudeCode\managed-settings.json` \- administrators should migrate to `C:\Program Files\ClaudeCode\managed-settings.json`\
- SDK: Changed minimum zod peer dependency to ^4.0.0\
- VSCode: Fixed usage display not updating after manual compact\
\
Jan 9, 2026\
\
* * *\
\
**Synopsis:** Automatic skill hot-reload. `language` setting for response language. `context: fork` for skill sub-agents. `Shift+Enter` works out-of-box.\
\
### v2.1.0 [​](https://claudelog.com/claude-code-changelog/\#v210 "Direct link to v2.1.0")\
\
- Added automatic skill hot-reload - skills created or modified in `~/.claude/skills` or `.claude/skills` are now immediately available without restarting the session\
- Added support for running skills and slash commands in a forked sub-agent context using `context: fork` in skill frontmatter\
- Added support for `agent` field in skills to specify agent type for execution\
- Added `language` setting to configure Claude's response language (e.g., `language: "japanese"`)\
- Changed Shift+Enter to work out of the box in iTerm2, WezTerm, Ghostty, and Kitty without modifying terminal configs\
- Added `respectGitignore` support in `settings.json` for per-project control over @-mention file picker behavior\
- Added `CLAUDE_CODE_HIDE_ACCOUNT_INFO` environment variable to hide email and organization from the UI, useful for streaming or recording sessions\
- Fixed security issue where sensitive data (OAuth tokens, API keys, passwords) could be exposed in debug logs\
- Fixed files and skills not being properly discovered when resuming sessions with `-c` or `--resume`\
- Fixed pasted content being lost when replaying prompts from history using up arrow or Ctrl+R search\
- Fixed Esc key with queued prompts to only move them to input without canceling the running task\
- Reduced permission prompts for complex bash commands\
- Fixed command search to prioritize exact and prefix matches on command names over fuzzy matches in descriptions\
- Fixed `PreToolUse` hooks to allow `updatedInput` when returning ask permission decision, enabling hooks to act as middleware while still requesting user consent\
- Fixed plugin path resolution for file-based marketplace sources\
- Fixed LSP tool being incorrectly enabled when no LSP servers were configured\
- Fixed background tasks failing with "git repository not found" error for repositories with dots in their names\
- Fixed Claude in Chrome support for WSL environments\
- Fixed Windows native installer silently failing when executable creation fails\
- Improved CLI help output to display options and subcommands in alphabetical order for easier navigation\
- Added wildcard pattern matching for Bash tool permissions using `*` at any position in rules (e.g., `Bash(npm *)`, `Bash(* install)`, `Bash(git * main)`)\
- Added unified Ctrl+B backgrounding for both bash commands and agents - pressing Ctrl+B now backgrounds all running foreground tasks simultaneously\
- Added support for MCP `list_changed` notifications, allowing MCP servers to dynamically update their available tools, prompts, and resources without requiring reconnection\
- Added `/teleport` and `/remote-env` slash commands for claude.ai subscribers, allowing them to resume and configure remote sessions\
- Added support for disabling specific agents using `Task(AgentName)` syntax in `settings.json` permissions or the `--disallowedTools` CLI flag\
- Added hooks support to agent frontmatter, allowing agents to define `PreToolUse`, `PostToolUse`, and `Stop` hooks scoped to the agent's lifecycle\
- Added hooks support for skill and slash command frontmatter\
- Added new Vim motions: `;` and `,` to repeat f/F/t/T motions, `y` operator for yank with `yy`/`Y`, `p`/`P` for paste, text objects (`iw`, `aw`, `iW`, `aW`, `i"`, `a"`, `i'`, `a'`, `i(`, `a(`, `i[`, `a[`, `i{`, `a{`), `>>` and `<<` for indent/dedent, and `J` to join lines\
- Added `/plan` command shortcut to enable plan mode directly from the prompt\
- Added slash command autocomplete support when `/` appears anywhere in input, not just at the beginning\
- Added `--tools` flag support in interactive mode to restrict which built-in tools Claude can use during interactive sessions\
- Added `CLAUDE_CODE_FILE_READ_MAX_OUTPUT_TOKENS` environment variable to override the default file read token limit\
- Added support for `once: true` config for hooks\
- Added support for YAML-style lists in frontmatter `allowed-tools` field for cleaner skill declarations\
- Added support for `prompt` and `agent` hook types from plugins (previously only command hooks were supported)\
- Added Cmd+V support for image paste in iTerm2 (maps to Ctrl+V)\
- Added left/right arrow key navigation for cycling through tabs in dialogs\
- Added real-time thinking block display in Ctrl+O transcript mode\
- Added filepath to full output in background bash task details dialog\
- Added Skills as a separate category in the context visualization\
- Fixed OAuth token refresh not triggering when server reports token expired but local expiration check disagrees\
- Fixed session persistence getting stuck after transient server errors by recovering from 409 conflicts when the entry was actually stored\
- Fixed session resume failures caused by orphaned tool results during concurrent tool execution\
- Fixed a race condition where stale OAuth tokens could be read from the keychain cache during concurrent token refresh attempts\
- Fixed AWS Bedrock subagents not inheriting EU/APAC cross-region inference model configuration, causing 403 errors when IAM permissions are scoped to specific regions\
- Fixed API context overflow when background tasks produce large output by truncating to 30K chars with file path reference\
- Fixed a hang when reading FIFO files by skipping symlink resolution for special file types\
- Fixed terminal keyboard mode not being reset on exit in Ghostty, iTerm2, Kitty, and WezTerm\
- Fixed Alt+B and Alt+F (word navigation) not working in iTerm2, Ghostty, Kitty, and WezTerm\
- Fixed `${CLAUDE_PLUGIN_ROOT}` not being substituted in plugin `allowed-tools` frontmatter, which caused tools to incorrectly require approval\
- Fixed files created by the Write tool using hardcoded 0o600 permissions instead of respecting the system umask\
- Fixed commands with `$()` command substitution failing with parse errors\
- Fixed multi-line bash commands with backslash continuations being incorrectly split and flagged for permissions\
- Fixed bash command prefix extraction to correctly identify subcommands after global options (e.g., `git -C /path log` now correctly matches `Bash(git log:*)` rules)\
- Fixed slash commands passed as CLI arguments (e.g., `claude /context`) not being executed properly\
- Fixed pressing Enter after Tab-completing a slash command selecting a different command instead of submitting the completed one\
- Fixed slash command argument hint flickering and inconsistent display when typing commands with arguments\
- Fixed Claude sometimes redundantly invoking the Skill tool when running slash commands directly\
- Fixed skill token estimates in `/context` to accurately reflect frontmatter-only loading\
- Fixed subagents sometimes not inheriting the parent's model by default\
- Fixed model picker showing incorrect selection for Bedrock/Vertex users using `--model haiku`\
- Fixed duplicate Bash commands appearing in permission request option labels\
- Fixed noisy output when background tasks complete - now shows clean completion message instead of raw output\
- Fixed background task completion notifications to appear proactively with bullet point\
- Fixed forked slash commands showing "AbortError" instead of "Interrupted" message when cancelled\
- Fixed cursor disappearing after dismissing permission dialogs\
- Fixed `/hooks` menu selecting wrong hook type when scrolling to a different option\
- Fixed images in queued prompts showing as "\[object Object\]" when pressing Esc to cancel\
- Fixed images being silently dropped when queueing messages while backgrounding a task\
- Fixed large pasted images failing with "Image was too large" error\
- Fixed extra blank lines in multiline prompts containing CJK characters (Japanese, Chinese, Korean)\
- Fixed ultrathink keyword highlighting being applied to wrong characters when user prompt text wraps to multiple lines\
- Fixed collapsed "Reading X files…" indicator incorrectly switching to past tense when thinking blocks appear mid-stream\
- Fixed Bash read commands (like `ls` and `cat`) not being counted in collapsed read/search groups, causing groups to incorrectly show "Read 0 files"\
- Fixed spinner token counter to properly accumulate tokens from subagents during execution\
- Fixed memory leak in git diff parsing where sliced strings retained large parent strings\
- Fixed race condition where LSP tool could return "no server available" during startup\
- Fixed feedback submission hanging indefinitely when network requests timeout\
- Fixed search mode in plugin discovery and log selector views exiting when pressing up arrow\
- Fixed hook success message showing trailing colon when hook has no output\
- Multiple optimizations to improve startup performance\
- Improved terminal rendering performance when using native installer or Bun, especially for text with emoji, ANSI codes, and Unicode characters\
- Improved performance when reading Jupyter notebooks with many cells\
- Improved reliability for piped input like `cat refactor.md | claude`\
- Improved reliability for AskQuestion tool\
- Improved `sed` in-place edit commands to render as file edits with diff preview\
- Improved Claude to automatically continue when response is cut off due to output token limit, instead of showing an error message\
- Improved compaction reliability\
- Improved subagents (Task tool) to continue working after permission denial, allowing them to try alternative approaches\
- Improved skills to show progress while executing, displaying tool uses as they happen\
- Improved skills from `/skills/` directories to be visible in the slash command menu by default (opt-out with `user-invocable: false` in frontmatter)\
- Improved skill suggestions to prioritize recently and frequently used skills\
- Improved spinner feedback when waiting for the first response token\
- Improved token count display in spinner to include tokens from background agents\
- Improved incremental output for async agents to give the main thread more control and visibility\
- Improved permission prompt UX with Tab hint moved to footer, cleaner Yes/No input labels with contextual placeholders\
- Improved the Claude in Chrome notification with shortened help text and persistent display until dismissed\
- Improved macOS screenshot paste reliability with TIFF format support\
- Improved `/stats` output\
- Updated Atlassian MCP integration to use a more reliable default configuration (streamable HTTP)\
- Changed "Interrupted" message color from red to grey for a less alarming appearance\
- Removed permission prompt when entering plan mode - users can now enter plan mode without approval\
- Removed underline styling from image reference links\
- SDK: Changed minimum zod peer dependency to ^4.0.0\
- VSCode: Added currently selected model name to the context menu\
- VSCode: Added descriptive labels on auto-accept permission button (e.g., "Yes, allow npm for this project" instead of "Yes, and don't ask again")\
- VSCode: Fixed paragraph breaks not rendering in markdown content\
- VSCode: Fixed scrolling in the extension inadvertently scrolling the parent iframe\
- Windows: Fixed issue with improper rendering\
\
Dec 23, 2025\
\
* * *\
\
**Synopsis:** Fixed macOS code-sign warning for Claude in Chrome feature.\
\
### v2.0.76 [​](https://claudelog.com/claude-code-changelog/\#v2076 "Direct link to v2.0.76")\
\
- Fixed macOS code-sign warning for Claude in Chrome\
\
Dec 21, 2025\
\
* * *\
\
**Synopsis:** LSP tool for code intelligence (go-to-definition, find references, hover documentation).\
Added `/terminal-setup` support for Kitty, Alacritty, Zed, and Warp terminals. Improved `/context` visualization with grouped skills and agents.\
\
### v2.0.74 [​](https://claudelog.com/claude-code-changelog/\#v2074 "Direct link to v2.0.74")\
\
- Added LSP (Language Server Protocol) tool for code intelligence features like go-to-definition, find references, and hover documentation\
- Added `/terminal-setup` support for Kitty, Alacritty, Zed, and Warp terminals\
- Added `ctrl+t` shortcut in `/theme` to toggle syntax highlighting on/off\
- Added syntax highlighting info to theme picker\
- Added guidance for macOS users when Alt shortcuts fail due to terminal configuration\
- Fixed skill allowed-tools not being applied to tools invoked by the skill\
- Fixed Opus 4.5 tip incorrectly showing when user was already using Opus\
- Fixed a potential crash when syntax highlighting isn't initialized correctly\
- Fixed visual bug in `/plugins discover` where list selection indicator showed while search box was focused\
- Fixed macOS keyboard shortcuts to display 'opt' instead of 'alt'\
- Improved `/context` command visualization with grouped skills and agents by source, slash commands, and sorted token count\
- Windows: Fixed issue with improper rendering\
- VSCode: Added gift tag pictogram for year-end promotion message\
\
Dec 19, 2025\
\
* * *\
\
**Synopsis:** Clickable `[Image #N]` links open attached images in default viewer. `Alt+Y` yank-pop cycles through kill ring history.\
Added search filtering to plugin discover screen. VS Code tab badges show pending permissions (blue) and unread completions (orange).\
\
### v2.0.73 [​](https://claudelog.com/claude-code-changelog/\#v2073 "Direct link to v2.0.73")\
\
- Added clickable `[Image #N]` links that open attached images in the default viewer\
- Added `alt-y` yank-pop to cycle through kill ring history after `ctrl-y` yank\
- Added search filtering to the plugin discover screen (type to filter by name, description, or marketplace)\
- Added support for custom session IDs when forking sessions with `--session-id` combined with `--resume` or `--continue` and `--fork-session`\
- Fixed slow input history cycling and race condition that could overwrite text after message submission\
- Improved `/theme` command to open theme picker directly\
- Improved theme picker UI\
- Improved search UX across resume session, permissions, and plugins screens with a unified SearchBox component\
- VSCode: Added tab icon badges showing pending permissions (blue) and unread completions (orange)\
\
Dec 19, 2025\
\
* * *\
\
**Synopsis:** Claude in Chrome (Beta) lets you control your browser directly from Claude Code via Chrome extension.\
Improved @ mention file suggestions ~3x faster in git repositories. Changed thinking toggle from Tab to Alt+T to avoid accidental triggers.\
\
### v2.0.72 [​](https://claudelog.com/claude-code-changelog/\#v2072 "Direct link to v2.0.72")\
\
- Added Claude in Chrome (Beta) feature that works with the Chrome extension ( [https://claude.ai/chrome](https://claude.ai/chrome)) to let you control your browser directly from Claude Code\
- Reduced terminal flickering\
- Added scannable QR code to mobile app tip for quick app downloads\
- Added loading indicator when resuming conversations for better feedback\
- Fixed `/context` command not respecting custom system prompts in non-interactive mode\
- Fixed order of consecutive `Ctrl+K` lines when pasting with `Ctrl+Y`\
- Improved `@` mention file suggestion speed (~3x faster in git repositories)\
- Improved file suggestion performance in repos with `.ignore` or `.rgignore` files\
- Improved settings validation errors to be more prominent\
- Changed thinking toggle from Tab to `Alt+T` to avoid accidental triggers\
\
Dec 18, 2025\
\
* * *\
\
**Synopsis:** Added `/settings` as alias for `/config` command. New toggle to enable/disable prompt suggestions.\
New syntax highlighting engine for native build. Fixed MCP servers not loading with `--dangerously-skip-permissions`.\
\
### v2.0.71 [​](https://claudelog.com/claude-code-changelog/\#v2071 "Direct link to v2.0.71")\
\
- Added `/config` toggle to enable/disable prompt suggestions\
- Added `/settings` as an alias for the `/config` command\
- Fixed `@` file reference suggestions incorrectly triggering when cursor is in the middle of a path\
- Fixed MCP servers from `.mcp.json` not loading when using `--dangerously-skip-permissions`\
- Fixed permission rules incorrectly rejecting valid bash commands containing shell glob patterns (e.g., `ls *.txt`, `for f in *.png`)\
- Bedrock: Environment variable `ANTHROPIC_BEDROCK_BASE_URL` is now respected for token counting and inference profile listing\
- New syntax highlighting engine for native build\
\
Dec 16, 2025\
\
* * *\
\
**Synopsis:**`Enter` key now submits prompt suggestions immediately (`Tab` still accepts for editing).\
Added wildcard syntax `mcp__server__*` for MCP tool permissions to allow/deny all tools from a server. Improved memory usage by 3x for large conversations.\
\
### v2.0.70 [​](https://claudelog.com/claude-code-changelog/\#v2070 "Direct link to v2.0.70")\
\
- Added Enter key to accept and submit prompt suggestions immediately (Tab still accepts for editing)\
- Added wildcard syntax `mcp__server__*` for MCP tool permissions to allow or deny all tools from a server\
- Added auto-update toggle for plugin marketplaces, allowing per-marketplace control over automatic updates\
- Added `plan_mode_required` spawn parameter for teammates to require plan approval before implementing changes\
- Added `current_usage` field to status line input, enabling accurate context window percentage calculations\
- Fixed input being cleared when processing queued commands while the user was typing\
- Fixed prompt suggestions replacing typed input when pressing Tab\
- Fixed diff view not updating when terminal is resized\
- Fixed thinking mode toggle in `/config` not persisting correctly\
- Improved memory usage by 3x for large conversations\
- Improved resolution of stats screenshots copied to clipboard (`Ctrl+S`) for crisper images\
- Improved UI for file creation permission dialog\
- Removed `#` shortcut for quick memory entry (tell Claude to edit your CLAUDE.md instead)\
\
Dec 16, 2025\
\
* * *\
\
**Synopsis:** Bug fixes and stability improvements.\
\
### v2.0.69 [​](https://claudelog.com/claude-code-changelog/\#v2069 "Direct link to v2.0.69")\
\
- Minor bugfixes\
\
Dec 13, 2025\
\
* * *\
\
**Synopsis:** Fixed IME (Input Method Editor) support for Chinese, Japanese, and Korean by correctly positioning composition window.\
Added enterprise managed settings support - contact Anthropic account team to enable. Improved plan mode exit with simplified yes/no dialog.\
\
### v2.0.68 [​](https://claudelog.com/claude-code-changelog/\#v2068 "Direct link to v2.0.68")\
\
- Fixed IME (Input Method Editor) support for languages like Chinese, Japanese, and Korean by correctly positioning the composition window at the cursor\
- Fixed a bug where disallowed MCP tools were visible to the model\
- Fixed an issue where steering messages could be lost while a subagent is working\
- Fixed Option+Arrow word navigation treating entire CJK (Chinese, Japanese, Korean) text sequences as a single word instead of navigating by word boundaries\
- Improved plan mode exit UX: show simplified yes/no dialog when exiting with empty or missing plan instead of throwing an error\
- Add support for enterprise managed settings. Contact your Anthropic account team to enable this feature.\
\
Dec 12, 2025\
\
* * *\
\
**Synopsis:** Claude now suggests prompts to speed up workflow - press `Tab` to accept or `Enter` to submit.\
Thinking mode enabled by default for Opus 4.5. Added search functionality to `/permissions` command with `/` keyboard shortcut for filtering.\
\
### v2.0.67 [​](https://claudelog.com/claude-code-changelog/\#v2067 "Direct link to v2.0.67")\
\
- Claude now suggests prompts to speed up your workflow: press Tab to accept or Enter to submit\
- Thinking mode is now enabled by default for Opus 4.5\
- Thinking mode configuration has moved to `/config`\
- Added search functionality to `/permissions` command with `/` keyboard shortcut for filtering rules by tool name\
- Show reason why autoupdater is disabled in `/doctor`\
- Fixed false "Another process is currently updating Claude" error when running `claude update` while another instance is already on the latest version\
- Fixed MCP servers from `.mcp.json` being stuck in pending state when running in non-interactive mode (`-p` flag or piped input)\
- Fixed scroll position resetting after deleting a permission rule in `/permissions`\
- Fixed word deletion (`opt+delete`) and word navigation (`opt+arrow`) not working correctly with non-Latin text such as Cyrillic, Greek, Arabic, Hebrew, Thai, and Chinese\
- Fixed `claude install --force` not bypassing stale lock files\
- Fixed consecutive `@~/` file references in `CLAUDE.md` being incorrectly parsed due to markdown strikethrough interference\
- Windows: Fixed plugin MCP servers failing due to colons in log directory paths\
\
Dec 12, 2025\
\
* * *\
\
**Synopsis:** Switch models while writing a prompt using `Alt+P` (Linux/Windows) or `Option+P` (macOS).\
Added context window information to status line. New `fileSuggestion` setting for custom @ file search commands.\
\
### v2.0.65 [​](https://claudelog.com/claude-code-changelog/\#v2065 "Direct link to v2.0.65")\
\
- Added ability to switch models while writing a prompt using `alt+p` (Linux, Windows), `option+p` (macOS)\
- Added context window information to status line input\
- Added `fileSuggestion` setting for custom `@` file search commands\
- Added `CLAUDE_CODE_SHELL` environment variable to override automatic shell detection (useful when login shell differs from actual working shell)\
- Fixed prompt not being saved to history when aborting a query with Escape\
- Fixed Read tool image handling to identify format from bytes instead of file extension\
\
Dec 11, 2025\|See Also: [Switch Models While Typing](https://claudelog.com/faqs/switch-models-while-typing/)\
\
* * *\
\
**Synopsis:** Auto-compacting is now instant. Agents and bash commands run asynchronously with wake-up messages.\
Named session support: use `/rename` to name sessions, `/resume <name>` to resume them. Added support for `.claude/rules/` directory.\
\
### v2.0.64 [​](https://claudelog.com/claude-code-changelog/\#v2064 "Direct link to v2.0.64")\
\
- Made auto-compacting instant\
- Agents and bash commands can run asynchronously and send messages to wake up the main agent\
- `/stats` now provides users with interesting CC stats, such as favorite model, usage graph, usage streak\
- Added named session support: use `/rename` to name sessions, `/resume <name>` in REPL or `claude --resume <name>` from the terminal to resume them\
- Added support for `.claude/rules/`. See [https://code.claude.com/docs/en/memory](https://code.claude.com/docs/en/memory) for details\
- Added image dimension metadata when images are resized, enabling accurate coordinate mappings for large images\
- Fixed auto-loading `.env` when using native installer\
- Fixed `--system-prompt` being ignored when using `--continue` or `--resume` flags\
- Improved `/resume` screen with grouped forked sessions and keyboard shortcuts for preview (P) and rename (R)\
- VSCode: Added copy-to-clipboard button on code blocks and bash tool inputs\
- VSCode: Fixed extension not working on Windows ARM64 by falling back to x64 binary via emulation\
- Bedrock: Improve efficiency of token counting\
- Unshipped `AgentOutputTool` and `BashOutputTool`, in favor of a new unified `TaskOutputTool`\
\
Dec 10, 2025\
\
* * *\
\
**Synopsis:** Added "(Recommended)" indicator for questions. New `attribution` setting for commit bylines. Fixed symlinked slash commands.\
\
### v2.0.62 [​](https://claudelog.com/claude-code-changelog/\#v2062 "Direct link to v2.0.62")\
\
- Added "(Recommended)" indicator for multiple-choice questions, with the recommended option moved to the top of the list\
- Added `attribution` setting to customize commit and PR bylines (deprecates `includeCoAuthoredBy`)\
- Fixed duplicate slash commands appearing when `~/.claude` is symlinked to a project directory\
- Fixed slash command selection not working when multiple commands share the same name\
- Fixed an issue where skill files inside symlinked skill directories could become circular symlinks\
- Fixed running versions getting removed because lock file incorrectly going stale\
- Fixed IDE diff tab not closing when rejecting file changes\
\
Dec 9, 2025\
\
* * *\
\
**Synopsis:** Reverted VS Code multiple terminal clients feature due to responsiveness issues.\
\
### v2.0.61 [​](https://claudelog.com/claude-code-changelog/\#v2061 "Direct link to v2.0.61")\
\
- Reverted VSCode support for multiple terminal clients due to responsiveness issues\
\
Dec 7, 2025\
\
* * *\
\
**Synopsis:** Background agent support - agents run in the background while you continue working.\
Added `/mcp enable|disable [server-name]` quick toggles for MCP servers. New `--disable-slash-commands` CLI flag to disable all slash commands.\
\
### v2.0.60 [​](https://claudelog.com/claude-code-changelog/\#v2060 "Direct link to v2.0.60")\
\
- Added background agent support. Agents run in the background while you work\
- Added `--disable-slash-commands` CLI flag to disable all slash commands\
- Added model name to "Co-Authored-By" commit messages\
- Enabled `/mcp enable [server-name]` or `/mcp disable [server-name]` to quickly toggle all servers\
- Updated Fetch to skip summarization for pre-approved websites\
- VSCode: Added support for multiple terminal clients connecting to the IDE server simultaneously\
\
Dec 6, 2025\
\
* * *\
\
**Synopsis:** New `--agent` CLI flag to override agent setting for the current session.\
Added `agent` setting to configure main thread with a specific agent's system prompt, tool restrictions, and model.\
\
### v2.0.59 [​](https://claudelog.com/claude-code-changelog/\#v2059 "Direct link to v2.0.59")\
\
- Added `--agent` CLI flag to override the agent setting for the current session\
- Added `agent` setting to configure main thread with a specific agent's system prompt, tool restrictions, and model\
- VSCode: Fixed `.claude.json` config file being read from incorrect location\
\
Dec 4, 2025\
\
* * *\
\
**Synopsis:** Opus 4.5 now available for Pro subscribers as part of their subscription!\
Fixed timer duration showing "11m 60s" instead of "12m 0s". Windows managed settings now prefer C:\\Program Files\\ClaudeCode.\
\
### v2.0.58 [​](https://claudelog.com/claude-code-changelog/\#v2058 "Direct link to v2.0.58")\
\
- Pro users now have access to Opus 4.5 as part of their subscription!\
- Fixed timer duration showing "11m 60s" instead of "12m 0s"\
- Windows: Managed settings now prefer C:\\Program Files\\ClaudeCode if it exists. Support for C:\\ProgramData\\ClaudeCode will be removed in a future version.\
\
Dec 3, 2025\
\
* * *\
\
**Synopsis:** Added plan rejection feedback input. VS Code: Streaming message support for real-time responses.\
\
### v2.0.57 [​](https://claudelog.com/claude-code-changelog/\#v2057 "Direct link to v2.0.57")\
\
- Added feedback input when rejecting plans, allowing users to tell Claude what to change\
- VSCode Extension: Added streaming message support for real-time response display\
\
Dec 3, 2025\
\
* * *\
\
**Synopsis:** Added terminal progress bar setting (`OSC 9;4`). VS Code: Secondary sidebar support.\
\
### v2.0.56 [​](https://claudelog.com/claude-code-changelog/\#v2056 "Direct link to v2.0.56")\
\
- Added setting to enable/disable terminal progress bar (`OSC 9;4`)\
- VSCode Extension: Added support for VS Code's secondary sidebar (VS Code 1.97+), allowing Claude Code to be displayed in the right sidebar while keeping the file explorer on the left. Requires setting `sidebar` as `Preferred Location` in the config.\
\
Dec 2, 2025\
\
* * *\
\
**Synopsis:** Fixed proxy DNS opt-in behavior. Improved @ file fuzzy matching. AskUserQuestion auto-submit for single-select.\
\
### v2.0.55 [​](https://claudelog.com/claude-code-changelog/\#v2055 "Direct link to v2.0.55")\
\
- Fixed proxy DNS resolution being forced on by default. Now opt-in via `CLAUDE_CODE_PROXY_RESOLVES_HOSTS=true` environment variable\
- Fixed keyboard navigation becoming unresponsive when holding down arrow keys in memory location selector\
- Improved `AskUserQuestion` tool to auto-submit single-select questions on the last question, eliminating the extra review screen for simple question flows\
- Improved fuzzy matching for `@` file suggestions with faster, more accurate results\
\
Nov 27, 2025\
\
* * *\
\
**Synopsis:** PermissionRequest hooks now process 'always allow'. VS Code: Secondary sidebar support and Preferred Location setting.\
\
### v2.0.54 [​](https://claudelog.com/claude-code-changelog/\#v2054 "Direct link to v2.0.54")\
\
- Hooks: Enable `PermissionRequest` hooks to process 'always allow' suggestions and apply permission updates\
- VSCode Extension: Added support for VS Code's secondary sidebar (VS Code 1.97+), allowing Claude Code to be displayed on the right sidebar while keeping the file explorer on the left. Requires setting `sidebar` as `Preferred Location` in the config.\
- VSCode Extension: Added `Preferred Location` setting to configure where Claude opens by default (sidebar or panel)\
- VSCode Extension: Added keyboard shortcut (`Cmd+N` / `Ctrl+N`) to start new conversations\
\
Nov 26, 2025\
\
* * *\
\
**Synopsis:** Fixed duplicate messages on startup. Fixed Wayland image pasting on Linux. Improved `/usage` progress bars.\
\
### v2.0.52 [​](https://claudelog.com/claude-code-changelog/\#v2052 "Direct link to v2.0.52")\
\
- Fixed duplicate message display when starting Claude with a command line argument\
- Fixed `/usage` command progress bars to fill up as usage increases (instead of showing remaining percentage)\
- Fixed image pasting not working on Linux systems running Wayland (now falls back to wl-paste when xclip is unavailable)\
- Permit some uses of `$!` in bash commands\
\
Nov 25, 2025\
\
* * *\
\
**Synopsis:** Opus 4.5 released! See [https://www.anthropic.com/news/claude-opus-4-5](https://www.anthropic.com/news/claude-opus-4-5) for details.\
Introducing Claude Code for Desktop at [https://claude.com/download](https://claude.com/download). Plan Mode now builds more precise plans and executes more thoroughly.\
\
### v2.0.51 [​](https://claudelog.com/claude-code-changelog/\#v2051 "Direct link to v2.0.51")\
\
- Added Opus 4.5! See [https://www.anthropic.com/news/claude-opus-4-5](https://www.anthropic.com/news/claude-opus-4-5)\
- Introducing Claude Code for Desktop: [https://claude.com/download](https://claude.com/download)\
- Updated usage limits for Claude Code users to give room to try out the new model. See the Claude Opus 4.5 blog for full details\
- Pro users can now purchase extra usage for access to Opus 4.5 in Claude Code\
- Plan Mode now builds more precise plans and executes more thoroughly\
- Usage limit notifications now easier to understand\
- Switched `/usage` back to "% used"\
- Fixed handling of thinking errors\
- Fixed performance regression\
\
Nov 24, 2025\
\
* * *\
\
**Synopsis:** Fixed bug preventing MCP tools with nested references in input schemas from being called.\
Improved ultrathink text display. Clearer 5-hour session limit warning message for better user understanding.\
\
### v2.0.50 [​](https://claudelog.com/claude-code-changelog/\#v2050 "Direct link to v2.0.50")\
\
- Fixed bug preventing calling MCP tools that have nested references in their input schemas\
- Silenced a noisy but harmless error during upgrades\
- Improved ultrathink text display\
- Improved clarity of 5-hour session limit warning message\
\
Nov 21, 2025\
\
* * *\
\
**Synopsis:** Added `Ctrl+Y` readline-style paste. Clearer usage limit warnings. Fixed subagent permissions.\
\
### v2.0.49 [​](https://claudelog.com/claude-code-changelog/\#v2049 "Direct link to v2.0.49")\
\
- Added readline-style `Ctrl+Y` for pasting deleted text\
- Improved clarity of usage limit warning message\
- Fixed handling of subagent permissions\
\
Nov 21, 2025\
\
* * *\
\
**Synopsis:** Improved `--teleport` validation and error messages. Fixed Vertex AI `settings.json` configuration.\
\
### v2.0.47 [​](https://claudelog.com/claude-code-changelog/\#v2047 "Direct link to v2.0.47")\
\
- Improved error messages and validation for `claude --teleport`\
- Improved error handling in `/usage`\
- Fixed race condition with history entry not getting logged at exit\
- Fixed Vertex AI configuration not being applied from `settings.json`\
\
Nov 20, 2025\
\
* * *\
\
**Synopsis:** Fixed image file media type detection when format cannot be determined from metadata.\
\
### v2.0.46 [​](https://claudelog.com/claude-code-changelog/\#v2046 "Direct link to v2.0.46")\
\
- Fixed image files being reported with incorrect media type when format cannot be detected from metadata\
\
Nov 20, 2025\
\
* * *\
\
**Synopsis:** Added Azure AI Foundry support! See [https://code.claude.com/docs/en/azure-ai-foundry](https://code.claude.com/docs/en/azure-ai-foundry) for setup.\
New `PermissionRequest` hook for custom auto-approve/deny logic. Start messages with `&` to send background tasks to Claude Code on web.\
\
### v2.0.45 [​](https://claudelog.com/claude-code-changelog/\#v2045 "Direct link to v2.0.45")\
\
- Add support for Azure AI Foundry! See [https://code.claude.com/docs/en/azure-ai-foundry](https://code.claude.com/docs/en/azure-ai-foundry)\
- Added `PermissionRequest` hook to automatically approve or deny tool permission requests with custom logic\
- Send background tasks to Claude Code on the web by starting a message with `&`\
\
Nov 19, 2025\
\
* * *\
\
**Synopsis:** Custom agents now support `permissionMode` field for controlling tool permissions.\
New `SubagentStart` hook event. Added `skills` frontmatter field to declare skills that auto-load for subagents.\
\
### v2.0.43 [​](https://claudelog.com/claude-code-changelog/\#v2043 "Direct link to v2.0.43")\
\
- Added `permissionMode` field for custom agents\
- Added `tool_use_id` field to `PreToolUseHookInput` and `PostToolUseHookInput` types\
- Added `skills` frontmatter field to declare skills to auto-load for subagents\
- Added the `SubagentStart` hook event\
- Fixed nested `CLAUDE.md` files not loading when @-mentioning files\
- Fixed duplicate rendering of some messages in the UI\
- Fixed some visual flickers\
- Fixed `NotebookEdit` tool inserting cells at incorrect positions when cell IDs matched the pattern `cell-N`\
\
Nov 18, 2025\
\
* * *\
\
**Synopsis:** SubagentStop hooks: Added `agent_id` and `agent_transcript_path` fields for better debugging.\
\
### v2.0.42 [​](https://claudelog.com/claude-code-changelog/\#v2042 "Direct link to v2.0.42")\
\
- Added `agent_id` and `agent_transcript_path` fields to `SubagentStop` hooks\
\
Nov 17, 2025\
\
* * *\
\
**Synopsis:** Stop hooks now support custom model parameter for hook evaluation.\
Plugins can now share and install output styles. More safe git commands run without approval. Added CLAUDE\_PROJECT\_DIR and CLAUDE\_PLUGIN\_ROOT env vars.\
\
### v2.0.41 [​](https://claudelog.com/claude-code-changelog/\#v2041 "Direct link to v2.0.41")\
\
- Added model parameter to prompt-based stop hooks, allowing users to specify a custom model for hook evaluation\
- Fixed slash commands from user settings being loaded twice, which could cause rendering issues\
- Fixed incorrect labeling of user settings vs project settings in command descriptions\
- Fixed crash when plugin command hooks timeout during execution\
- Fixed: Bedrock users no longer see duplicate Opus entries in the /model picker when using --model haiku\
- Fixed broken security documentation links in trust dialogs and onboarding\
- Fixed issue where pressing ESC to close the diff modal would also interrupt the model\
- Slash Commands: Added CLAUDE\_PROJECT\_DIR and CLAUDE\_PLUGIN\_ROOT env vars to bash command processing\
- ctrl-r history search landing on a slash command no longer cancels the search\
- SDK: Support custom timeouts for hooks\
- Allow more safe git commands to run without approval\
- Plugins: Added support for sharing and installing output styles\
- Teleporting a session from web will automatically set the upstream branch\
\
Nov 14, 2025\
\
* * *\
\
**Synopsis:** Hooks: Added matcher values for Notification hook events. Fixed notification idleness computation.\
Output Styles: New `keep-coding-instructions` frontmatter option to preserve coding context.\
\
### v2.0.37 [​](https://claudelog.com/claude-code-changelog/\#v2037 "Direct link to v2.0.37")\
\
- Fixed how idleness is computed for notifications\
- Hooks: Added matcher values for Notification hook events\
- Output Styles: Added keep-coding-instructions option to frontmatter\
\
Nov 11, 2025\
\
* * *\
\
**Synopsis:** Fixed `DISABLE_AUTOUPDATER` environment variable to properly disable package manager update notifications.\
Fixed queued messages being incorrectly executed as bash commands. Fixed input loss when typing during queued message processing.\
\
### v2.0.36 [​](https://claudelog.com/claude-code-changelog/\#v2036 "Direct link to v2.0.36")\
\
- Fixed: `DISABLE_AUTOUPDATER` environment variable now properly disables package manager update notifications\
- Fixed queued messages being incorrectly executed as bash commands\
- Fixed input being lost when typing while a queued message is processed\
\
Nov 8, 2025\
\
* * *\
\
**Synopsis:** Improved fuzzy search results when searching commands.\
VSCode Extension now respects `chat.fontSize` and `chat.fontFamily` settings. SDK: New `CLAUDE_CODE_EXIT_AFTER_STOP_DELAY` env var for automated workflows.\
\
### v2.0.35 [​](https://claudelog.com/claude-code-changelog/\#v2035 "Direct link to v2.0.35")\
\
- Improved fuzzy search results when searching commands\
- VSCode Extension: Respects `chat.fontSize` and `chat.fontFamily` settings throughout the entire UI, with immediate application without requiring reload\
- SDK: Added `CLAUDE_CODE_EXIT_AFTER_STOP_DELAY` environment variable to automatically exit SDK mode after a specified idle duration (useful for automated workflows and scripts)\
- Migrated `ignorePatterns` from project config to deny permissions in localSettings\
- Fixed messages returning null `stop_reason` and `stop_sequence` values\
- Fixed menu navigation getting stuck on items with empty string or other falsy values (e.g., in the `/hooks` menu)\
\
Nov 7, 2025\
\
* * *\
\
**Synopsis:** VSCode Extension: New setting to configure initial permission mode for new conversations.\
Improved file path suggestion performance with native Rust-based fuzzy finder. Fixed infinite OAuth token refresh loop affecting MCP servers like Slack.\
\
### v2.0.34 [​](https://claudelog.com/claude-code-changelog/\#v2034 "Direct link to v2.0.34")\
\
- VSCode Extension: Added setting to configure the initial permission mode for new conversations\
- Improved file path suggestion performance with native Rust-based fuzzy finder\
- Fixed infinite token refresh loop that caused MCP servers with OAuth (e.g., Slack) to hang during connection\
- Fixed memory crash when reading or writing large files (especially base64-encoded images)\
\
Nov 6, 2025\
\
* * *\
\
**Synopsis:** Native binary installs now launch faster.\
Fixed `claude doctor` incorrectly detecting Homebrew vs npm-global installations by properly resolving symlinks. Fixed `claude mcp serve` outputSchemas.\
\
### v2.0.33 [​](https://claudelog.com/claude-code-changelog/\#v2033 "Direct link to v2.0.33")\
\
- Native binary installs now launch quicker\
- Fixed `claude doctor` incorrectly detecting Homebrew vs npm-global installations by properly resolving symlinks\
- Fixed `claude mcp serve` exposing tools with incompatible outputSchemas\
\
Nov 5, 2025\
\
* * *\
\
**Synopsis:** Un-deprecated output styles based on community feedback - output styles are back!\
Added `companyAnnouncements` setting for displaying announcements on startup. Fixed hook progress messages during PostToolUse execution.\
\
### v2.0.32 [​](https://claudelog.com/claude-code-changelog/\#v2032 "Direct link to v2.0.32")\
\
- Un-deprecate output styles based on community feedback\
- Added `companyAnnouncements` setting for displaying announcements on startup\
- Fixed hook progress messages not updating correctly during PostToolUse hook execution\
\
Nov 4, 2025\
\
* * *\
\
**Synopsis:** Windows native installation uses `Shift+Tab` for mode switching instead of `Alt+M`.\
Vertex: Added Web Search support for supported models. Fixed subagent MCP "Tool names must be unique" error.\
\
### v2.0.31 [​](https://claudelog.com/claude-code-changelog/\#v2031 "Direct link to v2.0.31")\
\
- Windows: native installation uses `shift+tab` as shortcut for mode switching, instead of `alt+m`\
- Vertex: add support for Web Search on supported models\
- VSCode: Added `respectGitIgnore` configuration to include `.gitignored` files in file searches (defaults to `true`)\
- Fixed a bug with subagents and MCP servers related to "Tool names must be unique" error\
- Fixed issue causing `/compact` to fail with `prompt_too_long` by making it respect existing compact boundaries\
- Fixed plugin uninstall not removing plugins\
\
Nov 1, 2025\
\
* * *\
\
**Synopsis:** Prompt-based stop hooks allow custom stopping conditions. New `disallowedTools` field for explicit tool blocking in custom agents.\
Enabled SSE MCP servers on native build. `allowUnsandboxedCommands` setting for sandbox policy control. Deprecated output styles (later un-deprecated).\
\
### v2.0.30 [​](https://claudelog.com/claude-code-changelog/\#v2030 "Direct link to v2.0.30")\
\
- Added helpful hint to run `security unlock-keychain` when encountering API key errors on macOS with locked keychain\
- Added `allowUnsandboxedCommands` sandbox setting to disable the `dangerouslyDisableSandbox` escape hatch at policy level\
- Added `disallowedTools` field to custom agent definitions for explicit tool blocking\
- Added prompt-based stop hooks\
- VSCode: Added `respectGitIgnore` configuration to include `.gitignored` files in file searches (defaults to `true`)\
- Enabled SSE MCP servers on native build\
- Deprecated output styles. Review options in `/output-style` and use `CLAUDE.md` or plugins instead\
- Removed support for custom `ripgrep` configuration, resolving an issue where Search returns no results and config discovery fails\
- Fixed Explore agent creating unwanted `.md` investigation files during codebase exploration\
- Fixed a bug where `/context` would sometimes fail with `"max_tokens must be greater than thinking.budget_tokens"` error message\
- Fixed `--mcp-config` flag to correctly override file-based MCP configurations\
- Fixed bug that saved session permissions to local settings\
- Fixed MCP tools not being available to sub-agents\
- Fixed hooks and plugins not executing when using `--dangerously-skip-permissions` flag\
- Fixed delay when navigating through typeahead suggestions with arrow keys\
- VSCode: Restored selection indicator in input footer showing current file or code selection status\
\
Oct 31, 2025\
\
* * *\
\
**Synopsis:** Plan mode: Introducing new Plan subagent for better structured planning.\
Subagents can now be resumed and dynamically choose models. SDK: New `--max-budget-usd` flag for budget control. Git plugin branch/tag support via fragment syntax.\
\
### v2.0.28 [​](https://claudelog.com/claude-code-changelog/\#v2028 "Direct link to v2.0.28")\
\
- Plan mode: introduced new Plan subagent\
- Subagents: claude can now choose to resume subagents\
- Subagents: claude can dynamically choose the model used by its subagents\
- SDK: added `--max-budget-usd` flag\
- Stop `/terminal-setup` from adding backslash to Shift + Enter in VS Code\
- Add branch and tag support for git-based plugins and marketplaces using fragment syntax (e.g., `owner/repo#branch`)\
- Fixed a bug where macOS permission prompts would show up upon initial launch when launching from home directory\
- Various other bug fixes\
\
Oct 27, 2025\
\
* * *\
\
* * *\
\
**Synopsis:** New UI for permission prompts with improved clarity and usability.\
Session resume screen now includes current branch filtering and search. VSCode Extension: Config setting to include .gitignored files in searches.\
\
### v2.0.27 [​](https://claudelog.com/claude-code-changelog/\#v2027 "Direct link to v2.0.27")\
\
- New UI for permission prompts\
- Added current branch filtering and search to session resume screen for easier navigation\
- Fixed directory @-mention causing "No assistant message found" error\
- VSCode Extension: Add config setting to include .gitignored files in file searches\
- VSCode Extension: Bug fixes for unrelated 'Warmup' conversations, and configuration/settings occasionally being reset to defaults\
\
Oct 24, 2025\
\
* * *\
\
**Synopsis:** Removed legacy SDK entrypoint - migrate to @anthropic-ai/claude-agent-sdk for future updates.\
See migration guide at [https://docs.claude.com/en/docs/claude-code/sdk/migration-guide](https://docs.claude.com/en/docs/claude-code/sdk/migration-guide) for upgrade instructions.\
\
### v2.0.25 [​](https://claudelog.com/claude-code-changelog/\#v2025 "Direct link to v2.0.25")\
\
- Removed legacy SDK entrypoint. Please migrate to @anthropic-ai/claude-agent-sdk for future SDK updates: [https://docs.claude.com/en/docs/claude-code/sdk/migration-guide](https://docs.claude.com/en/docs/claude-code/sdk/migration-guide)\
\
Oct 22, 2025\
\
* * *\
\
**Synopsis:** Sandbox mode released for BashTool on Linux and Mac for improved security.\
Claude Code Web: Support for Web → CLI teleport to continue sessions locally. Fixed project-level skills not loading with `--setting-sources 'project'`.\
\
### v2.0.24 [​](https://claudelog.com/claude-code-changelog/\#v2024 "Direct link to v2.0.24")\
\
- Fixed a bug where project-level skills were not loading when `--setting-sources 'project'` was specified\
- Claude Code Web: Support for Web → CLI teleport\
- Sandbox: Releasing a sandbox mode for the BashTool on Linux & Mac\
\
Oct 21, 2025\
\
* * *\
\
**Synopsis:** IDE: Added toggle to enable/disable thinking mode.\
Added enterprise managed MCP allowlist and denylist for organizational control. Fixed duplicate permission prompts with parallel tool calls.\
\
### v2.0.22 [​](https://claudelog.com/claude-code-changelog/\#v2022 "Direct link to v2.0.22")\
\
- Fixed content layout shift when scrolling through slash commands\
- IDE: Add toggle to enable/disable thinking\
- Fix bug causing duplicate permission prompts with parallel tool calls\
- Add support for enterprise managed MCP allowlist and denylist\
\
Oct 18, 2025\
\
* * *\
\
**Synopsis:** Added interactive question tool for better user interaction. Claude now asks more clarifying questions in plan mode.\
MCP `structuredContent` field support. Haiku 4.5 now available as a model option for Pro users.\
\
### v2.0.21 [​](https://claudelog.com/claude-code-changelog/\#v2021 "Direct link to v2.0.21")\
\
- Support MCP `structuredContent` field in tool responses\
- Added an interactive question tool\
- Claude will now ask you questions more often in plan mode\
- Added Haiku 4.5 as a model option for Pro users\
- Fixed an issue where queued commands don't have access to previous messages' output\
\
Oct 18, 2025\
\
* * *\
\
* * *\
\
**Synopsis:** Introduced Claude Skills for reusable, shareable prompt templates and workflows.\
Skills enable consistent, high-quality outputs for common development tasks. Create and share skills with your team.\
\
### v2.0.20 [​](https://claudelog.com/claude-code-changelog/\#v2020 "Direct link to v2.0.20")\
\
- Added support for Claude Skills\
\
Oct 17, 2025\
\
* * *\
\
**Synopsis:** Long-running bash commands now auto-background instead of being killed.\
Customize timeout with `BASH_DEFAULT_TIMEOUT_MS` environment variable. Fixed unnecessary Haiku calls in print mode.\
\
### v2.0.19 [​](https://claudelog.com/claude-code-changelog/\#v2019 "Direct link to v2.0.19")\
\
- Auto-background long-running bash commands instead of killing them. Customize with `BASH_DEFAULT_TIMEOUT_MS`\
- Fixed a bug where Haiku was unnecessarily called in print mode\
\
Oct 16, 2025\
\
* * *\
\
**Synopsis:** Added Haiku 4.5 to model selector with SonnetPlan mode (uses Sonnet for planning, Haiku for execution).\
Introducing Explore subagent - powered by Haiku, efficiently searches your codebase to save context. Third-party providers require manual upgrade.\
\
### v2.0.17 [​](https://claudelog.com/claude-code-changelog/\#v2017 "Direct link to v2.0.17")\
\
- Added Haiku 4.5 to model selector\
- Haiku 4.5 automatically uses Sonnet in plan mode, and Haiku for execution (SonnetPlan by default)\
- Third-party providers (Bedrock and Vertex) are not automatically upgraded yet - manual upgrading can be done through setting `ANTHROPIC_DEFAULT_HAIKU_MODEL`\
- Introducing the Explore subagent - powered by Haiku, it searches through your codebase efficiently to save context\
\
Oct 15, 2025\
\
* * *\
\
**Synopsis:** Fixed bug with resuming conversations where previously created files needed to be read again before writing.\
Same fix applied to `-p` print mode for @-mentioned files. Improves workflow continuity.\
\
### v2.0.15 [​](https://claudelog.com/claude-code-changelog/\#v2015 "Direct link to v2.0.15")\
\
- Fixed bug with resuming where previously created files needed to be read again before writing\
- Fixed bug with `-p` mode where @-mentioned files needed to be read again before writing\
\
Oct 14, 2025\
\
* * *\
\
**Synopsis:** Fixed @-mentioning MCP servers to toggle them on/off. Improved permission checks for bash with inline env vars.\
Fixed ultrathink + thinking toggle interaction. Reduced unnecessary logins. Added `--system-prompt` documentation. Plugins UI polish.\
\
### v2.0.14 [​](https://claudelog.com/claude-code-changelog/\#v2014 "Direct link to v2.0.14")\
\
- Fix @-mentioning MCP servers to toggle them on/off\
- Improve permission checks for bash with inline env vars\
- Fix ultrathink + thinking toggle\
- Reduce unnecessary logins\
- Document `--system-prompt`\
- Several improvements to rendering\
- Plugins UI polish\
\
Oct 11, 2025\
\
* * *\
\
* * *\
\
**Synopsis:** Fixed `/plugin` command not working on native build installations.\
\
### v2.0.13 [​](https://claudelog.com/claude-code-changelog/\#v2013 "Direct link to v2.0.13")\
\
- Fixed `/plugin` not working on native build\
\
Oct 9, 2025\
\
* * *\
\
**Synopsis:** Plugin System released! Extend Claude Code with custom commands, agents, hooks, and MCP servers from marketplaces.\
New `/plugin` commands for install, enable/disable, and validation. Repository-level `extraKnownMarketplaces` config for team collaboration.\
\
### v2.0.12 [​](https://claudelog.com/claude-code-changelog/\#v2012 "Direct link to v2.0.12")\
\
- Plugin System Released: Extend Claude Code with custom commands, agents, hooks, and MCP servers from marketplaces\
- `/plugin install`, `/plugin enable/disable`, `/plugin marketplace` commands for plugin management\
- Repository-level plugin configuration via `extraKnownMarketplaces` for team collaboration\
- `/plugin validate` command for validating plugin structure and configuration\
- Plugin announcement blog post at [https://www.anthropic.com/news/claude-code-plugins](https://www.anthropic.com/news/claude-code-plugins)\
- Plugin documentation available at [https://docs.claude.com/en/docs/claude-code/plugins](https://docs.claude.com/en/docs/claude-code/plugins)\
- Comprehensive error messages and diagnostics via `/doctor` command\
- Avoid flickering in `/model` selector\
- Improvements to `/help`\
- Avoid mentioning hooks in `/resume` summaries\
- Changes to the "verbose" setting in `/config` now persist across sessions\
\
Oct 9, 2025\|See Also: [Plugin System](https://docs.claude.com/en/docs/claude-code/plugins)\
\
* * *\
\
**Synopsis:** Reduced system prompt size by 1.4k tokens for more context headroom.\
IDE: Fixed keyboard shortcuts and focus issues for smoother interaction. Fixed Opus fallback rate limit errors appearing incorrectly.\
\
### v2.0.11 [​](https://claudelog.com/claude-code-changelog/\#v2011 "Direct link to v2.0.11")\
\
- Reduced system prompt size by `1.4k tokens`\
- IDE: Fixed keyboard shortcuts and focus issues for smoother interaction\
- Fixed Opus fallback rate limit errors appearing incorrectly\
- Fixed `/add-dir` command selecting wrong default tab\
\
Oct 8, 2025\
\
* * *\
\
**Synopsis:** Rewrote terminal renderer for buttery smooth UI experience. Press `Ctrl+G` to edit your prompt in system's text editor.\
Enable/disable MCP servers by @mentioning in chat or via `/mcp`. PreToolUse hooks can now modify tool inputs for advanced workflows.\
\
### v2.0.10 [​](https://claudelog.com/claude-code-changelog/\#v2010 "Direct link to v2.0.10")\
\
- Rewrote terminal renderer for buttery smooth UI\
- Enable/disable MCP servers by `@mentioning`, or in `/mcp`\
- Added tab completion for shell commands in bash mode\
- `PreToolUse` hooks can now modify tool inputs\
- Press `Ctrl-G` to edit your prompt in your system's configured text editor\
- Fixes for bash permission checks with environment variables in the command\
\
Oct 8, 2025\
\
* * *\
\
**Synopsis:** Fixed regression where bash backgrounding stopped working.\
\
### v2.0.9 [​](https://claudelog.com/claude-code-changelog/\#v209 "Direct link to v2.0.9")\
\
- Fix regression where bash backgrounding stopped working\
\
Oct 6, 2025\
\
* * *\
\
**Synopsis:** IDE: Added drag-and-drop support for files and folders in chat.\
Updated Bedrock default to Sonnet 4.5. Removed deprecated `.claude.json` options (use `settings.json` instead). Fixed `/context` counting for thinking blocks.\
\
### v2.0.8 [​](https://claudelog.com/claude-code-changelog/\#v208 "Direct link to v2.0.8")\
\
- Update Bedrock default Sonnet model to `global.anthropic.claude-sonnet-4-5-20250929-v1:0`\
- IDE: Add drag-and-drop support for files and folders in chat\
- `/context`: Fix counting for thinking blocks\
- Improve message rendering for users with light themes on dark terminals\
- Remove deprecated `.claude.json``allowedTools`, `ignorePatterns`, `env`, and `todoFeatureEnabled` config options (instead, configure these in your `settings.json`)\
\
Oct 5, 2025\
\
* * *\
\
**Synopsis:** IDE: Fixed IME unintended message submission with `Enter` and `Tab`. Added "Open in Terminal" link on login screen.\
Fixed unhandled OAuth expiration 401 API errors. SDK: Added `SDKUserMessageReplay.isReplay` to prevent duplicate messages.\
\
### v2.0.5 [​](https://claudelog.com/claude-code-changelog/\#v205 "Direct link to v2.0.5")\
\
- IDE: Fix IME unintended message submission with Enter and Tab\
- IDE: Add "Open in Terminal" link in login screen\
- Fix unhandled OAuth expiration 401 API errors\
- SDK: Added `SDKUserMessageReplay.isReplay` to prevent duplicate messages\
\
Oct 4, 2025\
\
* * *\
\
* * *\
\
**Synopsis:** Bedrock: Updated default Sonnet model to `global.anthropic.claude-sonnet-4-5-20250929-v1:0`.\
Various bug fixes and presentation improvements for a more polished experience.\
\
### v2.0.2 [​](https://claudelog.com/claude-code-changelog/\#v202 "Direct link to v2.0.2")\
\
- Updated Bedrock default Sonnet model to `global.anthropic.claude-sonnet-4-5-20250929-v1:0`\
- Various bug fixes and presentation improvements\
\
Oct 2, 2025\
\
* * *\
\
**Synopsis:** Bedrock and Vertex: Skipped Sonnet 4.5 default model setting change for compatibility.\
Various bug fixes and presentation improvements. Third-party providers maintain existing model defaults.\
\
### v2.0.1 [​](https://claudelog.com/claude-code-changelog/\#v201 "Direct link to v2.0.1")\
\
- Skip Sonnet 4.5 default model setting change for Bedrock and Vertex\
- Various bug fixes and presentation improvements\
\
Sep 30, 2025\
\
* * *\
\
**Synopsis:** Major v2.0 release: New native VS Code extension with fresh UI throughout the app.\
Added `/rewind` to undo code changes and `/usage` to see plan limits. `Tab` toggles thinking (sticky). `Ctrl+R` searches history. Claude Code SDK is now Claude Agent SDK.\
\
### v2.0.0 [​](https://claudelog.com/claude-code-changelog/\#v200 "Direct link to v2.0.0")\
\
- New native VS Code extension\
- Fresh coat of paint throughout the whole app\
- `/rewind` a conversation to undo code changes\
- `/usage` command to see plan limits\
- Tab to toggle thinking (sticky across sessions)\
- Ctrl-R to search history\
- Unshipped claude config command\
- Hooks: Reduced PostToolUse 'tool\_use' ids were found without 'tool\_result' blocks errors\
- SDK: The Claude Code SDK is now the Claude Agent SDK\
- Add subagents dynamically with `--agents` flag\
\
Sep 29, 2025\|See Also: [Rewind](https://claudelog.com/mechanics/rewind/)\
\
* * *\
\
**Synopsis:** Enabled `/context` command for Bedrock and Vertex users for context inspection.\
Added mTLS support for HTTP-based OpenTelemetry exporters for enhanced security in enterprise deployments.\
\
### v1.0.126 [​](https://claudelog.com/claude-code-changelog/\#v10126 "Direct link to v1.0.126")\
\
- Enable `/context` command for Bedrock and Vertex\
- Add mTLS support for HTTP-based OpenTelemetry exporters\
\
Sep 26, 2025\|See Also: [Context Inspection](https://claudelog.com/mechanics/context-inspection/)\
\
* * *\
\
**Synopsis:** Added `CLAUDE_BASH_NO_LOGIN` env var to skip login shell for BashTool startup optimization.\
Fixed Bedrock and Vertex env vars incorrectly evaluating all strings as truthy. Fixed security vulnerability in Bash tool permission checks.\
\
### v1.0.124 [​](https://claudelog.com/claude-code-changelog/\#v10124 "Direct link to v1.0.124")\
\
- Set `CLAUDE_BASH_NO_LOGIN` environment variable to `1` or `true` to skip login shell for `BashTool`\
- Fix Bedrock and Vertex environment variables evaluating all strings as truthy\
- No longer inform Claude of the list of allowed tools when permission is denied\
- Fixed security vulnerability in Bash tool permission checks\
- Improved VSCode extension performance for large files\
\
Sep 25, 2025\
\
* * *\
\
**Synopsis:** Bash permission rules now support output redirections (e.g., `Bash(python:*)` matches `python script.py > output.txt`).\
Added SlashCommand tool enabling Claude to invoke your slash commands. Fixed thinking mode triggering on negation phrases like "don't think".\
\
### v1.0.123 [​](https://claudelog.com/claude-code-changelog/\#v10123 "Direct link to v1.0.123")\
\
- Bash permission rules now support output redirections when matching (e.g., `Bash(python:*)` matches `python script.py > output.txt`)\
- Fixed thinking mode triggering on negation phrases like `"don't think"`\
- Fixed rendering performance degradation during token streaming\
- Added `SlashCommand` tool, which enables Claude to invoke your slash commands. [https://docs.claude.com/en/docs/claude-code/slash-commands#SlashCommand-tool](https://docs.claude.com/en/docs/claude-code/slash-commands#SlashCommand-tool)\
- Enhanced `BashTool` environment snapshot logging\
- Fixed a bug where resuming a conversation in headless mode would sometimes enable thinking unnecessarily\
- Migrated `--debug` logging to a file, to enable easy tailing & filtering\
\
Sep 24, 2025\
\
* * *\
\
* * *\
\
**Synopsis:** Fixed input lag during typing, especially with large prompts.\
\
### v1.0.120 [​](https://claudelog.com/claude-code-changelog/\#v10120 "Direct link to v1.0.120")\
\
- Fix input lag during typing, especially noticeable with large prompts\
\
Sep 20, 2025\
\
* * *\
\
**Synopsis:** Fixed Windows issue where process visually freezes on entering interactive mode.\
Support dynamic headers for MCP servers via `headersHelper` configuration. Fixed thinking mode not working in headless sessions.\
\
### v1.0.119 [​](https://claudelog.com/claude-code-changelog/\#v10119 "Direct link to v1.0.119")\
\
- Fix Windows issue where process visually freezes on entering interactive mode\
- Support dynamic headers for MCP servers via `headersHelper` configuration\
- Fix thinking mode not working in headless sessions\
- Fix slash commands now properly update allowed tools instead of replacing them\
\
Sep 19, 2025\|See Also: [MCPs](https://claudelog.com/claude-code-mcps/)\
\
* * *\
\
**Synopsis:** Added `Ctrl+R` history search to recall previous commands like bash/zsh - improves command-line workflow.\
Fixed input lag while typing especially on Windows. Added `sed` command to auto-allowed commands in acceptEdits mode.\
\
### v1.0.117 [​](https://claudelog.com/claude-code-changelog/\#v10117 "Direct link to v1.0.117")\
\
- Add `Ctrl-R` history search to recall previous commands like `bash`/`zsh`\
- Fix input lag while typing, especially on Windows\
- Add `sed` command to auto-allowed commands in `acceptEdits` mode\
- Fix Windows `PATH` comparison to be case-insensitive for drive letters\
- Add permissions management hint to `/add-dir` output\
\
Sep 18, 2025\
\
* * *\
\
**Synopsis:** Enhanced thinking mode display with improved visual effects. Type `/t` to temporarily disable thinking in your prompt.\
Improved path validation for glob and grep tools. Show condensed output for post-tool hooks to reduce visual clutter.\
\
### v1.0.115 [​](https://claudelog.com/claude-code-changelog/\#v10115 "Direct link to v1.0.115")\
\
- Improve thinking mode display with enhanced visual effects\
- Type `/t` to temporarily disable thinking mode in your prompt\
- Improve path validation for `glob` and `grep` tools\
- Show condensed output for post-tool hooks to reduce visual clutter\
- Fix visual feedback when loading state completes\
- Improve UI consistency for permission request dialogs\
\
Sep 16, 2025\
\
* * *\
\
**Synopsis:** Moved transcript toggle from `Ctrl+R` to `Ctrl+O` (`Ctrl+R` now used for history search).\
Deprecated piped input in interactive mode - use `-p` flag for piped input instead.\
\
### v1.0.113 [​](https://claudelog.com/claude-code-changelog/\#v10113 "Direct link to v1.0.113")\
\
- Deprecated piped input in interactive mode\
- Move `Ctrl+R` keybinding for toggling transcript to `Ctrl+O`\
\
Sep 13, 2025\
\
* * *\
\
**Synopsis:** Transcript mode (`Ctrl+R`) now shows model used to generate each assistant message.\
Added `spinnerTipsEnabled` setting to disable spinner tips. Hooks: Added `systemMessage` support for SessionEnd hooks.\
\
### v1.0.112 [​](https://claudelog.com/claude-code-changelog/\#v10112 "Direct link to v1.0.112")\
\
- Transcript mode (`Ctrl+R`): Added the model used to generate each assistant message\
- Addressed issue where some Claude Max users were incorrectly recognized as Claude Pro users\
- Hooks: Added `systemMessage` support for `SessionEnd` hooks\
- Added `spinnerTipsEnabled` setting to disable spinner tips\
- IDE: Various improvements and bug fixes\
\
Sep 12, 2025\
\
* * *\
\
* * *\
\
**Synopsis:**`/model` command now validates provided model names to prevent invalid configurations.\
Fixed Bash tool crashes caused by malformed shell syntax parsing - improves stability for complex commands.\
\
### v1.0.111 [​](https://claudelog.com/claude-code-changelog/\#v10111 "Direct link to v1.0.111")\
\
- `/model` now validates provided model names\
- Fixed Bash tool crashes caused by malformed shell syntax parsing\
\
Sep 11, 2025\
\
* * *\
\
**Synopsis:**`/terminal-setup` command now supports WezTerm terminal for proper keybinding configuration.\
MCP OAuth tokens now proactively refresh before expiration. Fixed reliability issues with background Bash processes.\
\
### v1.0.110 [​](https://claudelog.com/claude-code-changelog/\#v10110 "Direct link to v1.0.110")\
\
- `/terminal-setup` command now supports `WezTerm`\
- MCP: OAuth tokens now proactively refresh before expiration\
- Fixed reliability issues with background Bash processes\
\
Sep 10, 2025\|See Also: [MCPs](https://claudelog.com/claude-code-mcps/)\
\
* * *\
\
**Synopsis:** SDK: Added partial message streaming support via `--include-partial-messages` CLI flag.\
Enables real-time message streaming for integrations that need immediate response visibility.\
\
### v1.0.109 [​](https://claudelog.com/claude-code-changelog/\#v10109 "Direct link to v1.0.109")\
\
- SDK: Added partial message streaming support via `--include-partial-messages` CLI flag\
\
Sep 10, 2025\
\
* * *\
\
**Synopsis:** Windows: Fixed path permission matching to consistently use POSIX format (e.g., `Read(//c/Users/...)`).\
Ensures permission rules work correctly across different Windows path formats and drive letters.\
\
### v1.0.106 [​](https://claudelog.com/claude-code-changelog/\#v10106 "Direct link to v1.0.106")\
\
- Windows: Fixed path permission matching to consistently use POSIX format (e.g., `Read(//c/Users/...)`)\
\
Sep 5, 2025\
\
* * *\
\
**Synopsis:**`/doctor` command now validates permission rule syntax and suggests corrections.\
Helps users identify and fix misconfigured permission rules that might block expected tool usage.\
\
### v1.0.97 [​](https://claudelog.com/claude-code-changelog/\#v1097 "Direct link to v1.0.97")\
\
- Settings: `/doctor` now validates permission rule syntax and suggests corrections\
\
Aug 29, 2025\
\
* * *\
\
**Synopsis:** Vertex: Added support for global endpoints on supported models for improved latency.\
`/memory` command now allows direct editing of all imported memory files. Added `/todos` command for task tracking. SDK: Custom tools as callbacks.\
\
### v1.0.94 [​](https://claudelog.com/claude-code-changelog/\#v1094 "Direct link to v1.0.94")\
\
- Vertex: add support for global endpoints for supported models\
- `/memory` command now allows direct editing of all imported memory files\
- SDK: Add custom tools as callbacks\
- Added `/todos` command to list current todo items\
\
Aug 28, 2025\
\
* * *\
\
**Synopsis:** Windows: Added `Alt+V` shortcut for pasting images from clipboard - matches macOS `Cmd+V` workflow.\
Support `NO_PROXY` environment variable to bypass proxy for specified hostnames and IPs.\
\
### v1.0.93 [​](https://claudelog.com/claude-code-changelog/\#v1093 "Direct link to v1.0.93")\
\
- Windows: Add alt + v shortcut for pasting images from clipboard\
- Support NO\_PROXY environment variable to bypass proxy for specified hostnames and IPs\
\
## Aug 26, 2025 [​](https://claudelog.com/claude-code-changelog/\#aug-26-2025 "Direct link to Aug 26, 2025")\
\
**Synopsis:** Settings file changes now take effect immediately without requiring a restart.\
Edit your `settings.json` and see changes apply in real-time - no more restart required.\
\
### v1.0.90 [​](https://claudelog.com/claude-code-changelog/\#v1090 "Direct link to v1.0.90")\
\
- Settings file changes take effect immediately - no restart required\
\
Aug 25, 2025\
\
* * *\
\
* * *\
\
**Synopsis:** Introduced `ANTHROPIC_DEFAULT_SONNET_MODEL` and `ANTHROPIC_DEFAULT_OPUS_MODEL` for controlling model aliases.\
Fixed OAuth authentication issues. Fixed incorrect usage tracking in /cost. Bedrock: Updated default to Sonnet 4.\
\
### v1.0.88 [​](https://claudelog.com/claude-code-changelog/\#v1088 "Direct link to v1.0.88")\
\
- Fixed issue causing "OAuth authentication is currently not supported"\
- Status line input now includes `exceeds_200k_tokens`\
- Fixed incorrect usage tracking in /cost.\
- Introduced `ANTHROPIC_DEFAULT_SONNET_MODEL` and `ANTHROPIC_DEFAULT_OPUS_MODEL` for controlling model aliases opusplan, opus, and sonnet.\
- Bedrock: Updated default Sonnet model to Sonnet 4\
\
Aug 22, 2025\
\
* * *\
\
**Synopsis:** Added `/context` command to help users self-serve debug context issues and understand token usage.\
SDK: Added UUID support for all messages and `--replay-user-messages` to replay messages back to stdout.\
\
### v1.0.86 [​](https://claudelog.com/claude-code-changelog/\#v1086 "Direct link to v1.0.86")\
\
- Added `/context` to help users self-serve debug context issues\
- SDK: Added UUID support for all SDK messages\
- SDK: Added `--replay-user-messages` to replay user messages back to stdout\
\
Aug 21, 2025\|See Also: [Context Inspection](https://claudelog.com/mechanics/context-inspection/) \| [Claude Code SDK](https://docs.anthropic.com/en/docs/claude-code/sdk)\
\
* * *\
\
**Synopsis:** Status line input now includes session cost information for real-time usage visibility.\
Track your spending as you work without needing to run separate cost commands.\
\
### v1.0.85 [​](https://claudelog.com/claude-code-changelog/\#v1085 "Direct link to v1.0.85")\
\
- Status line input now includes session cost info\
\
Aug 20, 2025\
\
* * *\
\
**Synopsis:** Fixed tool\_use/tool\_result id mismatch error on unstable networks. Now uses built-in ripgrep by default (opt out with `USE_BUILTIN_RIPGREP=0`).\
Fixed Claude ignoring real-time steering when wrapping up. Added ~/.claude/\* files to @-mention suggestions.\
\
### v1.0.84 [​](https://claudelog.com/claude-code-changelog/\#v1084 "Direct link to v1.0.84")\
\
- Fix tool\_use/tool\_result id mismatch error when network is unstable\
- Fix Claude sometimes ignoring real-time steering when wrapping up a task\
- @-mention: Add ~/.claude/\* files to suggestions for easier agent, output style, and slash command editing\
- Use built-in ripgrep by default; to opt out of this behavior, set USE\_BUILTIN\_RIPGREP=0\
\
Aug 19, 2025\
\
* * *\
\
* * *\
\
**Synopsis:** Added `~/.claude/*` files to auto-complete for easier agent, output style, and slash command editing.\
New shimmering spinner animation for a more polished visual experience during processing.\
\
### v1.0.83 [​](https://claudelog.com/claude-code-changelog/\#v1083 "Direct link to v1.0.83")\
\
- Auto-complete: allow mentioning ~/.claude/\* files\
- New shimmering spinner\
\
Aug 18, 2025\
\
* * *\
\
**Synopsis:** SDK: Added request cancellation support and new `additionalDirectories` option to search custom paths.\
Settings validation now prevents invalid fields in `.claude/settings.json`. Fixed crash when Claude reads large files automatically.\
\
### v1.0.82 [​](https://claudelog.com/claude-code-changelog/\#v1082 "Direct link to v1.0.82")\
\
- SDK: Add request cancellation support\
- SDK: New additionalDirectories option to search custom paths, improved slash command processing\
- Settings: Validation prevents invalid fields in .claude/settings.json files\
- MCP: Improve tool name consistency\
- Bash: Fix crash when Claude tries to automatically read large files\
\
Aug 16, 2025\|See Also: [Claude Code SDK](https://docs.anthropic.com/en/docs/claude-code/sdk) \| [Configuration](https://claudelog.com/configuration/) \| [MCP Servers](https://claudelog.com/faqs/what-is-mcp-server-in-claude-code/)\
\
* * *\
\
**Synopsis:** Released output styles with built-in educational modes "Explanatory" and "Learning" for different verbosity levels.\
Fixed custom agent loading when agent files are unparsable. Customize how Claude communicates.\
\
### v1.0.81 [​](https://claudelog.com/claude-code-changelog/\#v1081 "Direct link to v1.0.81")\
\
- Released output styles, including new built-in educational output styles "Explanatory" and "Learning"\
- Agents: Fix custom agent loading when agent files are unparsable\
\
Aug 14, 2025\|See Also: [Output Styles](https://docs.anthropic.com/en/docs/claude-code/output-styles)\
\
* * *\
\
**Synopsis:** UI improvements: Fixed text contrast for custom subagent colors ensuring readability.\
Fixed spinner rendering issues for a more polished visual experience during tool execution.\
\
### v1.0.80 [​](https://claudelog.com/claude-code-changelog/\#v1080 "Direct link to v1.0.80")\
\
- UI improvements: Fix text contrast for custom subagent colors and spinner rendering issues\
\
Aug 14, 2025\
\
* * *\
\
* * *\
\
**Synopsis:** New Opus Plan Mode: Run Opus for planning and Sonnet for execution - balance quality and speed.\
Fixed Bash heredoc and multiline string escaping. SDK: Added session support and permission denial tracking.\
\
### v1.0.77 [​](https://claudelog.com/claude-code-changelog/\#v1077 "Direct link to v1.0.77")\
\
- Bash tool: Fix heredoc and multiline string escaping, improve stderr redirection handling\
- SDK: Add session support and permission denial tracking\
- Fix token limit errors in conversation summarization\
- Opus Plan Mode: New setting in `/model` to run Opus only in plan mode, Sonnet otherwise\
\
Aug 13, 2025\|See Also: [Plan Mode](https://claudelog.com/mechanics/plan-mode/) \| [Claude Code SDK](https://docs.anthropic.com/en/docs/claude-code/sdk)\
\
* * *\
\
**Synopsis:** MCP: Support multiple config files with `--mcp-config file1.json file2.json`. Press `Esc` to cancel OAuth flows.\
Linux: Added support for Alpine and musl-based distributions. Improved bash command validation and spinner animations.\
\
### v1.0.73 [​](https://claudelog.com/claude-code-changelog/\#v1073 "Direct link to v1.0.73")\
\
- MCP: Support multiple config files with `--mcp-config file1.json file2.json`\
- MCP: Press Esc to cancel OAuth authentication flows\
- Bash: Improved command validation and reduced false security warnings\
- UI: Enhanced spinner animations and status line visual hierarchy\
- Linux: Added support for Alpine and musl-based distributions (requires separate ripgrep installation)\
\
Aug 12, 2025\|See Also: [MCP Servers](https://claudelog.com/faqs/what-is-mcp-server-in-claude-code/)\
\
* * *\
\
* * *\
\
**Synopsis:** Added "ask" permission mode via `/permissions` to always require confirmation for specific tools.\
Fine-grained control over which tools need explicit approval every time they're used.\
\
### v1.0.72 [​](https://claudelog.com/claude-code-changelog/\#v1072 "Direct link to v1.0.72")\
\
- Ask permissions: have Claude Code always ask for confirmation to use specific tools with `/permissions`\
\
Aug 12, 2025\|See Also: [Configuration](https://claudelog.com/configuration/)\
\
* * *\
\
**Synopsis:** Background commands: Press `Ctrl+B` to run bash commands in background while Claude keeps working.\
New `/statusline` command adds your terminal prompt to Claude Code for a customized status display.\
\
### v1.0.71 [​](https://claudelog.com/claude-code-changelog/\#v1071 "Direct link to v1.0.71")\
\
- Background commands: (Ctrl-b) to run any Bash command in the background so Claude can keep working (great for dev servers, tailing logs, etc.)\
- Customizable status line: add your terminal prompt to Claude Code with `/statusline`\
\
Aug 8, 2025\|See Also: [Background Commands](https://claudelog.com/faqs/what-are-background-commands/) \| [Customizable Status Line](https://claudelog.com/faqs/status-line-claude-code/)\
\
* * *\
\
**Synopsis:** Performance: Optimized message rendering for better handling of large contexts and long conversations.\
Windows: Fixed native file search, ripgrep, and subagent functionality. Added @-mention support in slash command arguments.\
\
### v1.0.70 [​](https://claudelog.com/claude-code-changelog/\#v1070 "Direct link to v1.0.70")\
\
- Performance: Optimized message rendering for better performance with large contexts\
- Windows: Fixed native file search, ripgrep, and subagent functionality\
- Added support for @-mentions in slash command arguments\
\
Aug 7, 2025\|See Also: [Windows Installation](https://claudelog.com/faqs/how-to-install-claude-code-on-windows/) \| [Custom Slash Commands](https://claudelog.com/faqs/what-is-slash-commands-in-claude-code/) \| [Custom Agents](https://claudelog.com/mechanics/custom-agents/)\
\
* * *\
\
* * *\
\
**Synopsis:** Upgraded Opus to version 4.1 with improved capabilities and performance.\
The latest Opus model brings enhanced reasoning and code generation for complex development tasks.\
\
### v1.0.69 [​](https://claudelog.com/claude-code-changelog/\#v1069 "Direct link to v1.0.69")\
\
- Upgraded Opus to version 4.1\
\
05/08/2025\|See Also: [Claude 4.1 Opus](https://claudelog.com/faqs/what-is-claude-4-1-opus/)\
\
* * *\
\
**Synopsis:** Enhanced `/doctor` with `CLAUDE.md` and MCP tool context for self-serve debugging. SDK: Added `canUseTool` callback.\
Added `disableAllHooks` setting. Windows: Improved permissions and sub-process spawning for commands like pnpm.\
\
### v1.0.68 [​](https://claudelog.com/claude-code-changelog/\#v1068 "Direct link to v1.0.68")\
\
- Fix incorrect model names being used for certain commands like `/pr-comments`\
- Windows: improve permissions checks for allow / deny tools and project trust. This may create a new project entry in `.claude.json` \- manually merge the history field if desired.\
- Windows: improve sub-process spawning to eliminate "No such file or directory" when running commands like pnpm\
- Enhanced `/doctor` command with CLAUDE.md and MCP tool context for self-serve debugging\
- SDK: Added canUseTool callback support for tool confirmation\
- Added `disableAllHooks` setting\
- Improved file suggestions performance in large repos\
\
05/08/2025\|See Also: [Windows Installation](https://claudelog.com/faqs/how-to-install-claude-code-on-windows/) \| [Hooks](https://claudelog.com/mechanics/hooks/) \| [MCPs](https://claudelog.com/claude-code-mcps/) \| [Claude Code SDK](https://docs.anthropic.com/en/docs/claude-code/sdk)\
\
* * *\
\
* * *\
\
**Synopsis:** IDE: Fixed connection stability issues and error handling for diagnostics display.\
Windows: Fixed shell environment setup for users without `.bashrc` files - improves first-run experience.\
\
### v1.0.65 [​](https://claudelog.com/claude-code-changelog/\#v1065 "Direct link to v1.0.65")\
\
- IDE: Fixed connection stability issues and error handling for diagnostics\
- Windows: Fixed shell environment setup for users without .bashrc files\
\
01/08/25\|See Also: [Windows Installation](https://claudelog.com/faqs/how-to-install-claude-code-on-windows/)\
\
* * *\
\
**Synopsis:** Agents: Added model customization per agent. Hooks: Added systemMessage field for warnings. Hidden files in @-mentions.\
\
### v1.0.64 [​](https://claudelog.com/claude-code-changelog/\#v1064 "Direct link to v1.0.64")\
\
- Agents: Added model customization support - you can now specify which model an agent should use\
- Agents: Fixed unintended access to the recursive agent tool\
- Hooks: Added systemMessage field to hook JSON output for displaying warnings and context\
- SDK: Fixed user input tracking across multi-turn conversations\
- Added hidden files to file search and @-mention suggestions\
\
July 30, 2025\|See Also: [Custom Agents](https://claudelog.com/mechanics/custom-agents/) \| [Hooks](https://claudelog.com/mechanics/hooks/) \| [Claude Code SDK](https://docs.anthropic.com/en/docs/claude-code/sdk)\
\
* * *\
\
**Synopsis:** Windows: Fixed file search, @agent mentions, and custom slash commands functionality.\
\
### v1.0.63 [​](https://claudelog.com/claude-code-changelog/\#v1063 "Direct link to v1.0.63")\
\
- Windows: Fixed file search, @agent mentions, and custom slash commands functionality\
\
July 29, 2025\|See Also: [Windows Installation](https://claudelog.com/faqs/how-to-install-claude-code-on-windows/) \| [Custom Agents](https://claudelog.com/mechanics/custom-agents/) \| [Custom Slash Commands](https://claudelog.com/faqs/what-is-slash-commands-in-claude-code/)\
\
* * *\
\
**Synopsis:** Added @-mention typeahead for custom agents. New SessionStart hook. /add-dir typeahead for directories.\
\
### v1.0.62 [​](https://claudelog.com/claude-code-changelog/\#v1062 "Direct link to v1.0.62")\
\
- Added @-mention support with typeahead for custom agents. @<your-custom-agent> to invoke it\
- Hooks: Added SessionStart hook for new session initialization\
- /add-dir command now supports typeahead for directory paths\
- Improved network connectivity check reliability\
\
July 28, 2025\|See Also: [Custom Subagents](https://docs.anthropic.com/en/docs/claude-code/subagents) \| [Hooks](https://claudelog.com/mechanics/hooks/)\
\
* * *\
\
* * *\
\
**Synopsis:** Added `--settings` flag for JSON config loading. VSCode macOS image paste with `⌘+V`. `CLAUDE_CODE_SHELL_PREFIX` env var.\
\
### v1.0.61 [​](https://claudelog.com/claude-code-changelog/\#v1061 "Direct link to v1.0.61")\
\
- Transcript mode (Ctrl+R): Changed Esc to exit transcript mode rather than interrupt\
- Settings: Added `--settings` flag to load settings from a JSON file\
- Settings: Fixed resolution of settings files paths that are symlinks\
- OTEL: Fixed reporting of wrong organization after authentication changes\
- Slash commands: Fixed permissions checking for allowed-tools with Bash\
- IDE: Added support for pasting images in VSCode MacOS using ⌘+V\
- IDE: Added `CLAUDE_CODE_AUTO_CONNECT_IDE=false` for disabling IDE auto-connection\
- Added `CLAUDE_CODE_SHELL_PREFIX` for wrapping Claude and user-provided shell commands run by Claude Code\
\
July 25, 2025\|See Also: [Configuration](https://claudelog.com/configuration/) \| [Custom Slash Commands](https://claudelog.com/faqs/what-is-slash-commands-in-claude-code/)\
\
* * *\
\
**Synopsis:** Launched custom subagents for specialized tasks. Run `/agents` to create and manage them.\
Define domain-specific agents with custom prompts and tool permissions for repeatable workflows.\
\
### v1.0.60 [​](https://claudelog.com/claude-code-changelog/\#v1060 "Direct link to v1.0.60")\
\
- You can now create custom subagents for specialized tasks! Run /agents to get started\
\
July 24, 2025\|See Also: [Task Agent Tools](https://claudelog.com/mechanics/task-agent-tools/) \| [Custom Subagents](https://docs.anthropic.com/en/docs/claude-code/subagents)\
\
* * *\
\
* * *\
\
**Synopsis:** SDK: Added canUseTool callback for tool confirmation. Hooks: Exposed PermissionDecision including "ask" option.\
Fixed issue where some Max users specifying Opus would still see fallback to Sonnet. SDK now allows specifying env for spawned process.\
\
### v1.0.59 [​](https://claudelog.com/claude-code-changelog/\#v1059 "Direct link to v1.0.59")\
\
- SDK: Added tool confirmation support with canUseTool callback\
- SDK: Allow specifying env for spawned process\
- Hooks: Exposed PermissionDecision to hooks (including "ask")\
- Hooks: UserPromptSubmit now supports additionalContext in advanced JSON output\
- Fixed issue where some Max users that specified Opus would still see fallback to Sonnet\
\
July 23, 2025\|See Also: [Claude Code SDK](https://docs.anthropic.com/en/docs/claude-code/sdk) \| [Hooks](https://claudelog.com/mechanics/hooks/)\
\
* * *\
\
**Synopsis:** Added PDF reading support - Claude can now read and analyze PDF documents directly.\
MCP: Improved server health status display in `claude mcp list`. Hooks: Added `CLAUDE_PROJECT_DIR` env var for hook commands.\
\
### v1.0.58 [​](https://claudelog.com/claude-code-changelog/\#v1058 "Direct link to v1.0.58")\
\
- Added support for reading PDFs\
- MCP: Improved server health status display in 'claude mcp list'\
- Hooks: Added CLAUDE\_PROJECT\_DIR env var for hook commands\
\
July 23, 2025\|See Also: [Hooks](https://claudelog.com/mechanics/hooks/) \| [MCPs](https://claudelog.com/claude-code-mcps/)\
\
* * *\
\
* * *\
\
**Synopsis:** Slash commands now support model specification - choose which model executes your custom commands.\
Improved permission messages to help Claude understand allowed tools. Fixed trailing newlines from bash output in terminal wrapping.\
\
### v1.0.57 [​](https://claudelog.com/claude-code-changelog/\#v1057 "Direct link to v1.0.57")\
\
- Added support for specifying a model in slash commands\
- Improved permission messages to help Claude understand allowed tools\
- Fix: Remove trailing newlines from bash output in terminal wrapping\
\
July 23, 2025\|See Also: [Custom Slash Commands](https://claudelog.com/faqs/what-is-slash-commands-in-claude-code/) \| [Auto-Accept Permissions](https://claudelog.com/mechanics/auto-accept-permissions/)\
\
* * *\
\
**Synopsis:** Windows: Enabled `Shift+Tab` for mode switching on Node.js versions that support terminal VT mode.\
Fixed WSL IDE detection issues. Fixed `awsRefreshHelper` not detecting changes to `.aws` directory.\
\
### v1.0.56 [​](https://claudelog.com/claude-code-changelog/\#v1056 "Direct link to v1.0.56")\
\
- Windows: Enabled shift+tab for mode switching on versions of Node.js that support terminal VT mode\
- Fixes for WSL IDE detection\
- Fix an issue causing awsRefreshHelper changes to .aws directory not to be picked up\
\
July 23, 2025\|See Also: [Windows Installation](https://claudelog.com/faqs/how-to-install-claude-code-on-windows/) \| [Configuration](https://claudelog.com/configuration/)\
\
* * *\
\
**Synopsis:** Added `--system-prompt-file` option to override system prompt in print mode for custom workflows.\
Clarified knowledge cutoff for Opus 4 and Sonnet 4 models. Windows: Fixed Ctrl+Z crash. SDK: Added ability to capture error logging.\
\
### v1.0.55 [​](https://claudelog.com/claude-code-changelog/\#v1055 "Direct link to v1.0.55")\
\
- Clarified knowledge cutoff for Opus 4 and Sonnet 4 models\
- Windows: fixed Ctrl+Z crash\
- SDK: Added ability to capture error logging\
- Add --system-prompt-file option to override system prompt in print mode\
\
July 23, 2025\|See Also: [Model Comparison](https://claudelog.com/model-comparison/) \| [Windows Installation](https://claudelog.com/faqs/how-to-install-claude-code-on-windows/) \| [Claude Code SDK](https://docs.anthropic.com/en/docs/claude-code/sdk)\
\
* * *\
\
**Synopsis:** Hooks: Added `UserPromptSubmit` hook and current working directory to hook inputs for better context.\
Slash commands: Added `argument-hint` to frontmatter. Windows: OAuth uses port 45454, mode switching now uses `Alt+M`, plan mode renders properly.\
\
### v1.0.54 [​](https://claudelog.com/claude-code-changelog/\#v1054 "Direct link to v1.0.54")\
\
- Hooks: Added UserPromptSubmit hook and the current working directory to hook inputs\
- Custom slash commands: Added argument-hint to frontmatter\
- Windows: OAuth uses port 45454 and properly constructs browser URL\
- Windows: mode switching now uses alt + m, and plan mode renders properly\
- Shell: Switch to in-memory shell snapshot to file-related errors\
\
July 19, 2025\|See Also: [Hooks](https://claudelog.com/mechanics/hooks/) \| [Custom Slash Commands](https://claudelog.com/faqs/what-is-slash-commands-in-claude-code/) \| [Windows Installation](https://claudelog.com/faqs/how-to-install-claude-code-on-windows/)\
\
* * *\
\
**Synopsis:** Increased @-mention file truncation from 100 lines to 2000 lines - see more file content in references.\
Added AWS token refresh helper settings: `awsAuthRefresh` for foreground SSO login, `awsCredentialExport` for background STS-like operations.\
\
### v1.0.53 [​](https://claudelog.com/claude-code-changelog/\#v1053 "Direct link to v1.0.53")\
\
- Updated @-mention file truncation from 100 lines to 2000 lines\
- Add helper script settings for AWS token refresh: awsAuthRefresh (for foreground operations like aws sso login) and awsCredentialExport (for background operation with STS-like response).\
\
July 18, 2025\|See Also: [Configuration](https://claudelog.com/configuration/)\
\
* * *\
\
* * *\
\
**Synopsis:** Added MCP server instructions support for custom server configuration guidance.\
Provide context and usage hints to Claude about how to use your MCP servers effectively.\
\
### v1.0.52 [​](https://claudelog.com/claude-code-changelog/\#v1052 "Direct link to v1.0.52")\
\
- Added support for MCP server instructions\
\
July 18, 2025\|See Also: [MCPs](https://claudelog.com/claude-code-mcps/)\
\
* * *\
\
**Synopsis:** Added native Windows support (requires Git for Windows) - no WSL required. Bedrock API keys via `AWS_BEARER_TOKEN_BEDROCK`.\
Settings: `/doctor` can now identify and fix invalid setting files. `--append-system-prompt` works in interactive mode. Fixed user directories with spaces.\
\
### v1.0.51 [​](https://claudelog.com/claude-code-changelog/\#v1051 "Direct link to v1.0.51")\
\
- Added support for native Windows (requires Git for Windows)\
- Added support for Bedrock API keys through environment variable AWS\_BEARER\_TOKEN\_BEDROCK\
- Settings: /doctor can now help you identify and fix invalid setting files\
- `--append-system-prompt` can now be used in interactive mode, not just --print/-p.\
- Increased auto-compact warning threshold from 60% to 80%\
- Fixed an issue with handling user directories with spaces for shell snapshots\
- OTEL resource now includes os.type, os.version, host.arch, and wsl.version (if running on Windows Subsystem for Linux)\
- Custom slash commands: Fixed user-level commands in subdirectories\
- Plan mode: Fixed issue where rejected plan from sub-task would get discarded\
\
July 11, 2025\|See Also: [Plan Mode](https://claudelog.com/mechanics/plan-mode/) \| [Windows Installation](https://claudelog.com/faqs/how-to-install-claude-code-on-windows/) \| [Custom Slash Commands](https://claudelog.com/faqs/what-is-slash-commands-in-claude-code/)\
\
* * *\
\
* * *\
\
**Synopsis:** Fixed app freeze bug from v1.0.45. Added progress messages to Bash tool showing last 5 lines of command output.\
New `PreCompact` hook. Vim mode: Added `c`, `f/F`, `t/T` motions. MCP: Expanding variables support. Shell snapshots moved to `~/.claude` for reliability.\
\
### v1.0.48 [​](https://claudelog.com/claude-code-changelog/\#v1048 "Direct link to v1.0.48")\
\
- Fixed a bug in [v1.0.45](https://claudelog.com/claude-code-changelog/#v1045) where the app would sometimes freeze on launch\
- Added progress messages to Bash tool based on the last 5 lines of command output\
- Added expanding variables support for MCP server configuration\
- Moved shell snapshots from /tmp to ~/.claude for more reliable Bash tool calls\
- Improved IDE extension path handling when Claude Code runs in WSL\
- Hooks: Added a PreCompact hook\
- Vim mode: Added c, f/F, t/T\
\
July 10, 2025\|See Also: [Hooks](https://claudelog.com/mechanics/hooks/) \| [MCPs](https://claudelog.com/claude-code-mcps/)\
\
* * *\
\
**Synopsis:** Redesigned Search (Grep) tool with new input parameters and features for better code searching.\
Fixed config file corruption with atomic writes. Restored slash command namespacing (e.g., .claude/frontend/component.md → /frontend:component).\
\
### v1.0.45 [​](https://claudelog.com/claude-code-changelog/\#v1045 "Direct link to v1.0.45")\
\
- Redesigned Search (Grep) tool with new tool input parameters and features\
- Disabled IDE diffs for notebook files, fixing "Timeout waiting after 1000ms" error\
- Fixed config file corruption issue by enforcing atomic writes\
- Updated prompt input undo to Ctrl+\_ to avoid breaking existing Ctrl+U behavior, matching zsh's undo shortcut\
- Stop Hooks: Fixed transcript path after /clear and fixed triggering when loop ends with tool call\
- Custom slash commands: Restored namespacing in command names based on subdirectories. For example, .claude/frontend/component.md is now /frontend:component, not /component.\
\
July 9, 2025\|See Also: [Custom Slash Commands](https://claudelog.com/faqs/what-is-slash-commands-in-claude-code/) \| [Hooks](https://claudelog.com/mechanics/hooks/)\
\
* * *\
\
* * *\
\
**Synopsis:** New `/export` command lets you quickly export a conversation for sharing with others.\
`Ctrl+Z` now suspends Claude Code (resume with `fg`). MCP: `resource_link` tool results, tool annotations and titles display in `/mcp` view.\
\
### v1.0.44 [​](https://claudelog.com/claude-code-changelog/\#v1044 "Direct link to v1.0.44")\
\
- New `/export` command lets you quickly export a conversation for sharing\
- MCP: resource\_link tool results are now supported\
- MCP: tool annotations and tool titles now display in /mcp view\
- Changed Ctrl+Z to suspend Claude Code. Resume by running `fg`. Prompt input undo is now Ctrl+U.\
\
July 7, 2025\|See Also: [MCPs](https://claudelog.com/claude-code-mcps/) \| [Suspend/Resume](https://claudelog.com/faqs/how-to-suspend-claude-code/)\
\
* * *\
\
**Synopsis:** Fixed a bug where the theme selector was saving excessively, causing performance issues.\
Hooks: Added EPIPE system error handling for more robust hook execution.\
\
### v1.0.43 [​](https://claudelog.com/claude-code-changelog/\#v1043 "Direct link to v1.0.43")\
\
- Fixed a bug where the theme selector was saving excessively\
- Hooks: Added EPIPE system error handling\
\
July 3, 2025\|See Also: [Hooks](https://claudelog.com/mechanics/hooks/)\
\
* * *\
\
**Synopsis:** Added tilde (`~`) expansion support in `/add-dir` command for easier home directory path references.\
Use ~/projects instead of typing full absolute paths when adding directories to context.\
\
### v1.0.42 [​](https://claudelog.com/claude-code-changelog/\#v1042 "Direct link to v1.0.42")\
\
- Added tilde (`~`) expansion support to `/add-dir` command\
\
July 3, 2025\|See Also: [/add-dir FAQ](https://claudelog.com/faqs/--add-dir/)\
\
* * *\
\
**Synopsis:** Hooks: Split Stop hook into Stop and SubagentStop events for finer-grained automation control.\
Added optional timeout configuration per hook command and "hook\_event\_name" to hook input. Fixed MCP tools displaying twice.\
\
### v1.0.41 [​](https://claudelog.com/claude-code-changelog/\#v1041 "Direct link to v1.0.41")\
\
- Hooks: Split Stop hook triggering into Stop and SubagentStop\
- Hooks: Enabled optional timeout configuration for each command\
- Hooks: Added "hook\_event\_name" to hook input\
- Fixed a bug where MCP tools would display twice in tool list\
- New tool parameters JSON for Bash tool in `tool_decision` event\
\
See Also: [Hooks](https://claudelog.com/mechanics/hooks/) \| [MCPs](https://claudelog.com/claude-code-mcps/)\
\
* * *\
\
**Synopsis:** Fixed API connection errors showing `UNABLE_TO_GET_ISSUER_CERT_LOCALLY` when `NODE_EXTRA_CA_CERTS` was set.\
Corporate proxy and custom CA certificate configurations now work correctly.\
\
### v1.0.40 [​](https://claudelog.com/claude-code-changelog/\#v1040 "Direct link to v1.0.40")\
\
- Fixed a bug causing API connection errors with UNABLE\_TO\_GET\_ISSUER\_CERT\_LOCALLY if `NODE_EXTRA_CA_CERTS` was set\
\
* * *\
\
* * *\
\
**Synopsis:** Added Active Time metric to OpenTelemetry logging for better session analytics and usage tracking.\
Track actual interaction time separately from total session duration for more accurate enterprise metrics.\
\
### v1.0.39 [​](https://claudelog.com/claude-code-changelog/\#v1039 "Direct link to v1.0.39")\
\
- New Active Time metric in OpenTelemetry logging\
\
July 2, 2025\
\
* * *\
\
**Synopsis:** Released Claude Code hooks for custom automation workflows - run scripts at tool invocation, session start/stop.\
Community-driven feature developed from GitHub feedback. Integrate Claude Code into your development pipeline.\
\
### v1.0.38 [​](https://claudelog.com/claude-code-changelog/\#v1038 "Direct link to v1.0.38")\
\
- Released [hooks](https://docs.anthropic.com/en/docs/claude-code/hooks). Special thanks to community input in [Github Issues](https://github.com/anthropics/claude-code/issues/712)\
\
July 2, 2025\|See Also: [Hooks](https://claudelog.com/mechanics/hooks/)\
\
* * *\
\
**Synopsis:** Security hardening: Removed ability to set `Proxy-Authorization` header via `ANTHROPIC_AUTH_TOKEN` or `apiKeyHelper`.\
Prevents potential credential exposure through proxy configurations.\
\
### v1.0.37 [​](https://claudelog.com/claude-code-changelog/\#v1037 "Direct link to v1.0.37")\
\
- Remove ability to set `Proxy-Authorization` header via ANTHROPIC\_AUTH\_TOKEN or apiKeyHelper\
\
July 2, 2025\
\
* * *\
\
**Synopsis:** Web search now uses today's date for time-sensitive queries - more accurate results for current events.\
Fixed a bug where stdio MCP servers were not terminating properly on exit, preventing clean shutdown.\
\
### v1.0.36 [​](https://claudelog.com/claude-code-changelog/\#v1036 "Direct link to v1.0.36")\
\
- Web search now takes today's date into context\
- Fixed a bug where stdio MCP servers were not terminating properly on exit\
\
July 2, 2025\|See Also: [MCPs](https://claudelog.com/claude-code-mcps/)\
\
* * *\
\
**Synopsis:** Added MCP OAuth Authorization Server discovery for streamlined authentication workflows with remote MCP servers.\
Automatically discover and connect to OAuth-protected MCP servers without manual configuration.\
\
### v1.0.35 [​](https://claudelog.com/claude-code-changelog/\#v1035 "Direct link to v1.0.35")\
\
- Added support for MCP OAuth Authorization Server discovery\
\
June 25, 2025\|See Also: [MCPs](https://claudelog.com/claude-code-mcps/)\
\
* * *\
\
**Synopsis:** Fixed memory leak causing `MaxListenersExceededWarning` messages during long sessions.\
Improved stability for extended coding sessions by properly managing event listeners.\
\
### v1.0.34 [​](https://claudelog.com/claude-code-changelog/\#v1034 "Direct link to v1.0.34")\
\
- Fixed a memory leak causing a MaxListenersExceededWarning message to appear\
\
June 24, 2025\
\
* * *\
\
**Synopsis:** Added undo functionality with `Ctrl+Z` (or Vim `u` command) to reverse changes in the prompt input.\
Session ID logging support for better debugging and tracking. Various plan mode improvements.\
\
### v1.0.33 [​](https://claudelog.com/claude-code-changelog/\#v1033 "Direct link to v1.0.33")\
\
- Improved logging functionality with session ID support\
- Added undo functionality (Ctrl+Z and vim 'u' command)\
- Improvements to plan mode\
\
June 24, 2025\|See Also: [Plan Mode](https://claudelog.com/mechanics/plan-mode/)\
\
* * *\
\
**Synopsis:** Added `forceLoginMethod` setting to bypass login selection screen and go directly to your preferred auth method.\
Updated loopback configuration for litellm compatibility. Streamline authentication for enterprise deployments.\
\
### v1.0.32 [​](https://claudelog.com/claude-code-changelog/\#v1032 "Direct link to v1.0.32")\
\
- Updated loopback config for litellm\
- Added forceLoginMethod setting to bypass login selection screen\
\
June 24, 2025\|See Also: [Configuration](https://claudelog.com/configuration/)\
\
* * *\
\
**Synopsis:** Fixed a bug where `~/.claude.json` would get reset when file contained invalid JSON.\
User configuration and session history are now preserved even if the config file becomes malformed.\
\
### v1.0.31 [​](https://claudelog.com/claude-code-changelog/\#v1031 "Direct link to v1.0.31")\
\
- Fixed a bug where ~/.claude.json would get reset when file contained invalid JSON\
\
June 24, 2025\
\
* * *\
\
**Synopsis:** Slash commands now support bash output, @-mention files, and thinking keywords for enhanced customization.\
Improved file path autocomplete with filename matching. Timestamps in `Ctrl+R` mode. Enhanced `jq` regex for complex filters with pipes.\
\
### v1.0.30 [​](https://claudelog.com/claude-code-changelog/\#v1030 "Direct link to v1.0.30")\
\
- Custom slash commands: Run bash output, @-mention files, enable thinking with thinking keywords\
- Improved file path autocomplete with filename matching\
- Added timestamps in Ctrl-r mode and fixed Ctrl-c handling\
- Enhanced jq regex support for complex filters with pipes and select\
\
June 24, 2025\|See Also: [Slash Commands](https://docs.anthropic.com/en/docs/claude-code/slash-commands)\
\
* * *\
\
* * *\
\
**Synopsis:** Improved CJK (Chinese, Japanese, Korean) character support for cursor navigation and rendering.\
Better text handling for multilingual codebases and international teams.\
\
### v1.0.29 [​](https://claudelog.com/claude-code-changelog/\#v1029 "Direct link to v1.0.29")\
\
- Improved CJK character support in cursor navigation and rendering\
\
June 24, 2025\
\
* * *\
\
**Synopsis:** Images auto-resize before upload to prevent API size limit errors - paste large screenshots worry-free.\
Added `XDG_CONFIG_HOME` support. Memory optimizations. New OTEL attributes: `terminal.type` and `language`.\
\
### v1.0.28 [​](https://claudelog.com/claude-code-changelog/\#v1028 "Direct link to v1.0.28")\
\
- Slash commands: Fix selector display during history navigation\
- Resizes images before upload to prevent API size limit errors\
- Added XDG\_CONFIG\_HOME support to configuration directory\
- Performance optimizations for memory usage\
- New attributes (terminal.type, language) in OpenTelemetry logging\
\
June 24, 2025\|See Also: [Configuration](https://docs.anthropic.com/en/docs/claude-code/settings)\
\
* * *\
\
**Synopsis:** Added streamable HTTP MCP support for efficient server communication. OAuth for remote MCP servers (SSE and HTTP).\
MCP resources can now be @-mentioned to include them directly in your prompts.\
\
### v1.0.27 [​](https://claudelog.com/claude-code-changelog/\#v1027 "Direct link to v1.0.27")\
\
- Streamable HTTP MCP servers are now supported\
- Remote MCP servers (SSE and HTTP) now support OAuth\
- MCP resources can now be @-mentioned\
\
June 18, 2025\|See Also: [MCP Resources](https://docs.anthropic.com/en/docs/claude-code/mcp#use-mcp-resources)\
\
* * *\
\
**Synopsis:** Improved slash command discovery with cleaner project/user prefixes moved to descriptions for better UX.\
Enhanced Ghostty terminal support. Improved web search reliability for better research assistance.\
\
### v1.0.25 [​](https://claudelog.com/claude-code-changelog/\#v1025 "Direct link to v1.0.25")\
\
- Slash commands: moved "project" and "user" prefixes to descriptions\
- Slash commands: improved reliability for command discovery\
- Improved support for Ghostty\
- Improved web search reliability\
\
June 16, 2025\|See Also: [Slash Commands](https://docs.anthropic.com/en/docs/claude-code/slash-commands)\
\
* * *\
\
**Synopsis:** Improved `/mcp` command output for better visibility into connected MCP servers and available tools.\
Fixed a bug where settings arrays got overwritten instead of properly merged.\
\
### v1.0.24 [​](https://claudelog.com/claude-code-changelog/\#v1024 "Direct link to v1.0.24")\
\
- Improved `/mcp` output\
- Fixed a bug where settings arrays got overwritten instead of merged\
\
June 16, 2025\|See Also: [MCPs](https://claudelog.com/claude-code-mcps/)\
\
* * *\
\
**Synopsis:** Released official TypeScript SDK (`@anthropic-ai/claude-code`) and Python SDK (`claude-code-sdk`).\
Build programmatic integrations, automate workflows, and embed Claude Code in your applications.\
\
### v1.0.23 [​](https://claudelog.com/claude-code-changelog/\#v1023 "Direct link to v1.0.23")\
\
- Released TypeScript SDK: `import @anthropic-ai/claude-code` to get started\
- Released Python SDK: `pip install claude-code-sdk` to get started\
\
June 16, 2025\|See Also: [Claude Code SDK](https://docs.anthropic.com/en/docs/claude-code/sdk)\
\
* * *\
\
**Synopsis:** SDK: Renamed `total_cost` to `total_cost_usd` for clearer currency identification in API responses.\
Ensures cost tracking is unambiguous for international usage and multi-currency environments.\
\
### v1.0.22 [​](https://claudelog.com/claude-code-changelog/\#v1022 "Direct link to v1.0.22")\
\
- SDK: Renamed `total_cost` to `total_cost_usd`\
\
June 12, 2025\|See Also: [CC Usage](https://claudelog.com/claude-code-mcps/cc-usage/)\
\
* * *\
\
**Synopsis:** Improved editing of files with tab-based indentation - better support for Go, Makefiles, and legacy code.\
Fixed tool\_use/tool\_result mismatch errors. Fixed stdio MCP server processes lingering after quitting.\
\
### v1.0.21 [​](https://claudelog.com/claude-code-changelog/\#v1021 "Direct link to v1.0.21")\
\
- Improved editing of files with tab-based indentation\
- Fix for `tool_use` without matching `tool_result` errors\
- Fixed a bug where stdio MCP server processes would linger after quitting Claude Code\
\
June 12, 2025\|See Also: [MCPs](https://claudelog.com/claude-code-mcps/)\
\
* * *\
\
* * *\
\
**Synopsis:** Added `--add-dir` CLI argument for specifying additional working directories - work across multiple projects.\
Streaming input without `-p` flag. MCP auto-reconnection on disconnect. Improved startup and session storage performance.\
\
### v1.0.18 [​](https://claudelog.com/claude-code-changelog/\#v1018 "Direct link to v1.0.18")\
\
- Added `--add-dir` CLI argument for specifying additional working directories\
- Added streaming input support without require `-p` flag\
- Improved startup performance and session storage performance\
- Added `CLAUDE_BASH_MAINTAIN_PROJECT_WORKING_DIR` environment variable to freeze working directory for bash commands\
- Added detailed MCP server tools display (`/mcp`)\
- MCP authentication and permission improvements\
- Added auto-reconnection for MCP SSE connections on disconnect\
- Fixed issue where pasted content was lost when dialogs appeared\
\
June 10, 2025\|See Also: [Configuration](https://claudelog.com/configuration/#mcp-configuration) \| [Additional Working Directories](https://docs.anthropic.com/en/docs/claude-code/common-workflows#additional-working-directories) \| [MCPs](https://claudelog.com/claude-code-mcps/)\
\
* * *\
\
**Synopsis:** Sub-task messages now emitted in print mode (`-p`) for better visibility into agent operations.\
See what your agents are doing in CI/CD pipelines and scripted automation workflows.\
\
### v1.0.17 [​](https://claudelog.com/claude-code-changelog/\#v1017 "Direct link to v1.0.17")\
\
- We now emit messages from sub-tasks in `-p` mode\
\
June 10, 2025\
\
* * *\
\
**Synopsis:** Added `parent_tool_use_id` property for tracking tool relationships. Fixed VS Code diff crashes on rapid invocations.\
Process title now displays `claude` instead of `node`. MCP server list UI improvements.\
\
### v1.0.16 [​](https://claudelog.com/claude-code-changelog/\#v1016 "Direct link to v1.0.16")\
\
- Additional improvements and bug fixes (look for the `parent_tool_use_id` property)\
- Fixed crashes when the VS Code diff tool is invoked multiple times quickly\
- MCP server list UI improvements\
- Update Claude Code process title to display `claude` instead of `node`\
\
June 6, 2025\|See Also: [MCPs](https://claudelog.com/claude-code-mcps/)\
\
* * *\
\
**Synopsis:** Claude Code now available with Claude Pro subscription - more accessible pricing option for individual developers.\
Added `/upgrade` command for smoother switching to Claude Max plans. Improved shell config error handling.\
\
### v1.0.11 [​](https://claudelog.com/claude-code-changelog/\#v1011 "Direct link to v1.0.11")\
\
- Claude Code can now also be used with a Claude Pro subscription\
- Added `/upgrade` for smoother switching to Claude Max plans\
- Improved UI for authentication from API keys and Bedrock/Vertex/external auth tokens\
- Improved shell configuration error handling\
- Improved todo list handling during compaction\
\
June 4, 2025\|See Also: [Pricing](https://claudelog.com/claude-code-pricing/) \| [Model Comparison](https://claudelog.com/model-comparison/) \| [Installation](https://claudelog.com/install-claude-code/)\
\
* * *\
\
**Synopsis:** Added markdown table support for better data presentation in responses and documentation.\
Improved streaming performance for faster, more responsive output during generation.\
\
### v1.0.10 [​](https://claudelog.com/claude-code-changelog/\#v1010 "Direct link to v1.0.10")\
\
- Added markdown table support\
- Improved streaming performance\
\
June 3, 2025\
\
* * *\
\
**Synopsis:** Fixed Vertex AI region fallback when using `CLOUD_ML_REGION`. Added thinking mode support for non-English languages.\
Fixed regression where search tools unnecessarily asked for permissions. Improved compacting UI.\
\
### v1.0.8 [​](https://claudelog.com/claude-code-changelog/\#v108 "Direct link to v1.0.8")\
\
- Fixed Vertex AI region fallback when using `CLOUD_ML_REGION`\
- Increased default otel interval from 1s -> 5s\
- Fixed edge cases where `MCP_TIMEOUT` and `MCP_TOOL_TIMEOUT` weren't being respected\
- Fixed a regression where search tools unnecessarily asked for permissions\
- Added support for triggering thinking non-English languages\
- Improved compacting UI\
\
June 2, 2025\|See Also: [Restarting Claude Code](https://claudelog.com/faqs/restarting-claude-code/) \| [Context Window Depletion](https://claudelog.com/mechanics/context-window-depletion/) \| [MCPs](https://claudelog.com/claude-code-mcps/)\
\
* * *\
\
**Synopsis:** Renamed `/allowed-tools` to `/permissions` for clearer terminology. Migrated tool settings from `.claude.json` to `settings.json`.\
Deprecated `claude config` commands. Fixed `--dangerously-skip-permissions` in `--print` mode.\
\
### v1.0.7 [​](https://claudelog.com/claude-code-changelog/\#v107 "Direct link to v1.0.7")\
\
- Renamed `/allowed-tools` -\> `/permissions`\
- Migrated `allowedTools` and `ignorePatterns` from `.claude.json` -\> `settings.json`\
- Deprecated `claude config` commands in favor of editing `settings.json`\
- Fixed a bug where `--dangerously-skip-permissions` sometimes didn't work in `--print` mode\
- Improved error handling for `/install-github-app`\
- Bugfixes, UI polish, and tool reliability improvements\
\
June 2, 2025\|See Also: [Auto-Accept Permissions](https://claudelog.com/mechanics/auto-accept-permissions/) \| [Configuration](https://claudelog.com/configuration/)\
\
* * *\
\
**Synopsis:** Improved edit reliability for tab-indented files - better Go, Makefile, and legacy code support.\
Respect `CLAUDE_CONFIG_DIR` everywhere. Added symlink support in @file typeahead. Reduced unnecessary tool permission prompts.\
\
### v1.0.6 [​](https://claudelog.com/claude-code-changelog/\#v106 "Direct link to v1.0.6")\
\
- Improved edit reliability for tab-indented files\
- Respect `CLAUDE_CONFIG_DIR` everywhere\
- Reduced unnecessary tool permission prompts\
- Added support for symlinks in `@file` typeahead\
- Bugfixes, UI polish, and tool reliability improvements\
\
June 2, 2025\|See Also: [Configuration](https://claudelog.com/configuration/)\
\
* * *\
\
**Synopsis:** Fixed a bug where MCP tool errors weren't being parsed correctly, causing unclear error messages.\
Better error handling for MCP tool failures helps with debugging custom integrations.\
\
### v1.0.4 [​](https://claudelog.com/claude-code-changelog/\#v104 "Direct link to v1.0.4")\
\
- Fixed a bug where MCP tool errors weren't being parsed correctly\
\
May 28, 2025\|See Also: [MCPs](https://claudelog.com/claude-code-mcps/)\
\
* * *\
\
**Synopsis:** Added `DISABLE_INTERLEAVED_THINKING` to opt out of interleaved thinking if preferred.\
Improved model names to show provider-specific versions (Sonnet 3.7 for Bedrock, Sonnet 4 for Console). Updated docs and OAuth flow.\
\
### v1.0.1 [​](https://claudelog.com/claude-code-changelog/\#v101 "Direct link to v1.0.1")\
\
- Added `DISABLE_INTERLEAVED_THINKING` to give users the option to opt out of interleaved thinking\
- Improved model references to show provider-specific names (Sonnet 3.7 for Bedrock, Sonnet 4 for Console)\
- Updated documentation links and OAuth process descriptions\
\
May 22, 2025\|See Also: [Configuration](https://claudelog.com/configuration/)\
\
* * *\
\
![Kombai](https://cdn.claudelog.com/img/ads/sponsors/kombai-logo.svg)\
\
Access best-in-class browser experiences missing in Claude Code today (ad)\
\
The `Kombai Browser` combines deep agentic automation with a visual editor. Get precise controls you need to guide, edit, debug, and audit your UI. Everything from CSS style edits, site text changes, visual rearrangements and DOM element deletions. [Try Kombai Today](https://analytics.claudelog.com/https://kombai.com/?utm_source=claudelog&utm_medium=website&utm_campaign=display&unit=random-tip&tip=2)\
\
![Access best-in-class browser experiences missing in Claude Code today](https://cdn.claudelog.com/img/ads/sponsors/kombai/kombai-diagonal-2.png)\
\
* * *\
\
**Synopsis:** Claude Code reaches general availability - production-ready for enterprise and individual developers.\
Introducing Sonnet 4 and Opus 4 models with enhanced capabilities for complex coding tasks.\
\
### v1.0.0 [​](https://claudelog.com/claude-code-changelog/\#v100 "Direct link to v1.0.0")\
\
- Claude Code is now generally available\
- Introducing Sonnet 4 and Opus 4 models\
\
May 22, 2025\|See Also: [Model Comparison](https://claudelog.com/model-comparison/) \| [Installation](https://claudelog.com/install-claude-code/) \| [Getting Started](https://claudelog.com/claude-code-tutorial/)\
\
* * *\
\
**Synopsis:** Breaking: Bedrock ARN passed to `ANTHROPIC_MODEL` should no longer contain escaped slash (use `/` instead of `%2F`).\
Debug logging now via `ANTHROPIC_LOG=debug` instead of `DEBUG=true` for consistent logging configuration.\
\
### v0.2.125 [​](https://claudelog.com/claude-code-changelog/\#v02125 "Direct link to v0.2.125")\
\
- Breaking change: Bedrock ARN passed to `ANTHROPIC_MODEL` or `ANTHROPIC_SMALL_FAST_MODEL` should no longer contain an escaped slash (specify / instead of %2F)\
- Removed `DEBUG=true` in favor of `ANTHROPIC_LOG=debug`, to log all requests\
\
May 21, 2025\|See Also: [Configuration](https://claudelog.com/configuration/)\
\
* * *\
\
**Synopsis:** Breaking: `--print` JSON output now returns nested message objects for forwards-compatibility with new metadata fields.\
Introduced `settings.cleanupPeriodDays`, `CLAUDE_CODE_API_KEY_HELPER_TTL_MS` env var, and `--debug` mode.\
\
### v0.2.117 [​](https://claudelog.com/claude-code-changelog/\#v02117 "Direct link to v0.2.117")\
\
- Breaking change: `--print` JSON output now returns nested message objects, for forwards-compatibility as we introduce new metadata fields\
- Introduced `settings.cleanupPeriodDays`\
- Introduced `CLAUDE_CODE_API_KEY_HELPER_TTL_MS` env var\
- Introduced `--debug` mode\
\
May 18, 2025\
\
* * *\
\
**Synopsis:** Real-time steering: Send messages to Claude while it works to redirect without waiting for completion.\
Introduced `BASH_DEFAULT_TIMEOUT_MS` and `BASH_MAX_TIMEOUT_MS` env vars. Deprecated MCP wizard in favor of other MCP commands.\
\
### v0.2.108 [​](https://claudelog.com/claude-code-changelog/\#v02108 "Direct link to v0.2.108")\
\
- You can now send messages to Claude while it works to steer Claude in real-time\
- Introduced `BASH_DEFAULT_TIMEOUT_MS` and `BASH_MAX_TIMEOUT_MS` env vars\
- Fixed a bug where thinking was not working in `-p` mode\
- Fixed a regression in `/cost` reporting\
- Deprecated MCP wizard interface in favor of other MCP commands\
- Lots of other bugfixes and improvements\
\
May 13, 2025\|See Also: [MCPs](https://claudelog.com/claude-code-mcps/)\
\
* * *\
\
**Synopsis:**`CLAUDE.md` now supports file imports via @-syntax. Add `@path/to/file.md` to load additional context on launch.\
Enables modular project configuration - split your context across multiple files for better organization.\
\
### v0.2.107 [​](https://claudelog.com/claude-code-changelog/\#v02107 "Direct link to v0.2.107")\
\
- `CLAUDE.md` files can now import other files. Add `@path/to/file.md` to `./CLAUDE.md` to load additional files on launch\
\
May 9, 2025\|See Also: [CLAUDE.md Supremacy](https://claudelog.com/mechanics/claude-md-supremacy/)\
\
* * *\
\
**Synopsis:** MCP SSE server configs can now specify custom headers for authentication and custom server requirements.\
Fixed a bug where MCP permission prompt didn't always show correctly, improving security visibility.\
\
### v0.2.106 [​](https://claudelog.com/claude-code-changelog/\#v02106 "Direct link to v0.2.106")\
\
- MCP SSE server configs can now specify custom headers\
- Fixed a bug where MCP permission prompt didn't always show correctly\
\
May 9, 2025\|See Also: [MCPs](https://claudelog.com/claude-code-mcps/)\
\
* * *\
\
**Synopsis:** Claude can now search the web for up-to-date information while working on your tasks.\
Moved system & account status to `/status` command. Added Vim word movement keybindings. Improved startup latency.\
\
### v0.2.105 [​](https://claudelog.com/claude-code-changelog/\#v02105 "Direct link to v0.2.105")\
\
- Claude can now search the web\
- Moved system & account status to `/status`\
- Added word movement keybindings for Vim\
- Improved latency for startup, todo tool, and file edits\
\
May 8, 2025\
\
* * *\
\
**Synopsis:** Improved thinking mode triggering reliability. Improved @-mention reliability for images and folders.\
You can now paste multiple large chunks into one prompt - no more splitting up your context.\
\
### v0.2.102 [​](https://claudelog.com/claude-code-changelog/\#v02102 "Direct link to v0.2.102")\
\
- Improved thinking triggering reliability\
- Improved `@mention` reliability for images and folders\
- You can now paste multiple large chunks into one prompt\
\
May 5, 2025\
\
* * *\
\
**Synopsis:** Fixed a crash caused by stack overflow error during extended sessions.\
Made db storage optional - missing db support disables `--continue` and `--resume` but core functionality works.\
\
### v0.2.100 [​](https://claudelog.com/claude-code-changelog/\#v02100 "Direct link to v0.2.100")\
\
- Fixed a crash caused by a stack overflow error\
- Made db storage optional; missing db support disables `--continue` and `--resume`\
\
* * *\
\
**Synopsis:** Fixed an issue where auto-compact was running twice, causing unnecessary context summarization.\
Improved conversation management reliability for long sessions.\
\
### v0.2.98 [​](https://claudelog.com/claude-code-changelog/\#v0298 "Direct link to v0.2.98")\
\
- Fixed an issue where auto-compact was running twice\
\
May 2, 2025\
\
* * *\
\
**Synopsis:** Claude Code now supports Claude Max subscription plans for enhanced usage limits and priority access.\
Higher rate limits and extended context for power users and professional developers.\
\
### v0.2.95 [​](https://claudelog.com/claude-code-changelog/\#v0295 "Direct link to v0.2.95")\
\
- Claude Code can now also be used with a [Claude Max subscription](https://claude.ai/upgrade)\
- Claude Code can now also be used with a [Claude Max subscription](https://claude.ai/upgrade)\
\
May 1, 2025\
\
* * *\
\
**Synopsis:** Resume conversations with `--continue` (last session) and `--resume` (select from history) flags.\
Claude now has a Todo list to track tasks and stay organized through complex multi-step workflows.\
\
### v0.2.93 [​](https://claudelog.com/claude-code-changelog/\#v0293 "Direct link to v0.2.93")\
\
- Resume conversations from where you left off from with `claude --continue` and `claude --resume`\
- Claude now has access to a Todo list that helps it stay on track and be more organized\
\
April 30, 2025\
\
* * *\
\
**Synopsis:** Added `--disallowedTools` flag to restrict specific tools from being used in a session.\
Renamed tools for consistency: `LSTool` → `LS`, `View` → `Read`, etc. Clearer tool naming.\
\
### v0.2.82 [​](https://claudelog.com/claude-code-changelog/\#v0282 "Direct link to v0.2.82")\
\
- Added support for `--disallowedTools`\
- Renamed tools for consistency: `LSTool` -\> `LS`, `View` -\> `Read`, etc.\
\
April 25, 2025\|See Also: [Auto-Accept Permissions](https://claudelog.com/mechanics/auto-accept-permissions/) \| [Configuration](https://claudelog.com/configuration/)\
\
* * *\
\
**Synopsis:** Hit `Enter` to queue messages while Claude works - no waiting for completion. Drag in or paste images directly.\
`@-mention` files to add them to context. Run one-off MCP servers with `--mcp-config <path>`.\
\
### v0.2.75 [​](https://claudelog.com/claude-code-changelog/\#v0275 "Direct link to v0.2.75")\
\
- Hit Enter to queue up additional messages while Claude is working\
- Drag in or copy/paste image files directly into the prompt\
- `@-mention` files to directly add them to context\
- Run one-off MCP servers with `claude --mcp-config <path-to-file>`\
- Improved performance for filename auto-complete\
\
April 21, 2025\|See Also: [MCPs & Add-ons](https://claudelog.com/claude-code-mcps/) \| [Configuration](https://claudelog.com/configuration/#mcp-configuration)\
\
* * *\
\
**Synopsis:** Added dynamic API key refresh via `apiKeyHelper` setting with 5-minute TTL for rotating credentials.\
Task tool can now perform file writes and run bash commands - more capable autonomous agents.\
\
### v0.2.7 [​](https://claudelog.com/claude-code-changelog/\#v027 "Direct link to v0.2.7")\
\
- Additional updates and fixes\
- Added support for refreshing dynamically generated API keys (via `apiKeyHelper`), with a 5 minute TTL\
- Task tool can now perform writes and run bash commands\
\
April 17, 2025\
\
* * *\
\
**Synopsis:** Enhanced spinner now shows token count and tool usage indicators while Claude works.\
Better visibility into what's happening during long-running operations.\
\
### v0.2.72 [​](https://claudelog.com/claude-code-changelog/\#v0272 "Direct link to v0.2.72")\
\
- Updated spinner to indicate tokens loaded and tool usage\
\
April 18, 2025\
\
* * *\
\
**Synopsis:** Network commands like `curl` are now available for Claude to fetch data and interact with APIs.\
Parallel web queries for faster research. Pressing `Esc` once immediately interrupts Claude in auto-accept mode.\
\
### v0.2.70 [​](https://claudelog.com/claude-code-changelog/\#v0270 "Direct link to v0.2.70")\
\
- Network commands like `curl` are now available for Claude to use\
- Claude can now run multiple web queries in parallel\
- Pressing ESC once immediately interrupts Claude in Auto-accept mode\
\
* * *\
\
**Synopsis:** Fixed UI glitches with improved Select component behavior for smoother menu interactions.\
Enhanced terminal output display with better text truncation logic for cleaner output.\
\
### v0.2.69 [​](https://claudelog.com/claude-code-changelog/\#v0269 "Direct link to v0.2.69")\
\
- Fixed UI glitches with improved Select component behavior\
- Enhanced terminal output display with better text truncation logic\
\
* * *\
\
**Synopsis:** Shared project permission rules can be saved in `.claude/settings.json` and committed to your repository.\
Enable consistent tool permissions across your team without per-user configuration.\
\
### v0.2.67 [​](https://claudelog.com/claude-code-changelog/\#v0267 "Direct link to v0.2.67")\
\
- Shared project permission rules can be saved in `.claude/settings.json`\
\
* * *\
\
**Synopsis:** Print mode (`-p`) now supports streaming output via `--output-format=stream-json` for real-time processing.\
Fixed issue where pasting could trigger memory or bash mode unexpectedly.\
\
### v0.2.66 [​](https://claudelog.com/claude-code-changelog/\#v0266 "Direct link to v0.2.66")\
\
- Print mode (`-p`) now supports streaming output via `--output-format=stream-json`\
- Fixed issue where pasting could trigger memory or bash mode unexpectedly\
\
* * *\
\
**Synopsis:** Fixed an issue where MCP tools were loaded twice, which caused tool call errors and duplicates.\
More reliable MCP server integration for custom tooling.\
\
### v0.2.63 [​](https://claudelog.com/claude-code-changelog/\#v0263 "Direct link to v0.2.63")\
\
- Fixed an issue where MCP tools were loaded twice, which caused tool call errors\
\
\|See Also: [MCPs](https://claudelog.com/claude-code-mcps/)\
\
* * *\
\
**Synopsis:** Navigate menus with vim-style (`j`/`k`) or emacs (`Ctrl+n`/`Ctrl+p`) shortcuts for faster interaction.\
Enhanced clipboard image detection for more reliable paste. Fixed `Esc` key crash in conversation history selector.\
\
### v0.2.61 [​](https://claudelog.com/claude-code-changelog/\#v0261 "Direct link to v0.2.61")\
\
- Navigate menus with vim-style keys (`j`/`k`) or bash/emacs shortcuts (`Ctrl+n`/`p`) for faster interaction\
- Enhanced image detection for more reliable clipboard paste functionality\
- Fixed an issue where ESC key could crash the conversation history selector\
\
* * *\
\
**Synopsis:** Copy+paste images directly into your prompt - share screenshots, diagrams, and visual context easily.\
Improved progress indicators for bash and fetch tools. Bugfixes for non-interactive mode (`-p`).\
\
### v0.2.59 [​](https://claudelog.com/claude-code-changelog/\#v0259 "Direct link to v0.2.59")\
\
- Copy+paste images directly into your prompt\
- Improved progress indicators for bash and fetch tools\
- Bugfixes for non-interactive mode (`-p`)\
\
* * *\
\
**Synopsis:** Quickly add to Memory by starting your message with `#` \- persistent context across sessions.\
Press `Ctrl+R` to see full output for long tool results. Added support for MCP SSE transport.\
\
### v0.2.54 [​](https://claudelog.com/claude-code-changelog/\#v0254 "Direct link to v0.2.54")\
\
- Quickly add to Memory by starting your message with `#`\
- Press `ctrl+r` to see full output for long tool results\
- Added support for MCP SSE transport\
\
\|See Also: [MCPs](https://claudelog.com/claude-code-mcps/)\
\
* * *\
\
**Synopsis:** New web fetch tool lets Claude view and analyze URLs that you paste into prompts.\
Read documentation, API references, and web content without leaving your session. Fixed JPEG detection bug.\
\
### v0.2.53 [​](https://claudelog.com/claude-code-changelog/\#v0253 "Direct link to v0.2.53")\
\
- New web fetch tool lets Claude view URLs that you paste in\
- Fixed a bug with JPEG detection\
\
* * *\
\
**Synopsis:** New MCP "project" scope allows you to add MCP servers to `.mcp.json` and commit to your repository.\
Share MCP server configurations with your team automatically through version control.\
\
### v0.2.50 [​](https://claudelog.com/claude-code-changelog/\#v0250 "Direct link to v0.2.50")\
\
- New MCP "project" scope now allows you to add MCP servers to `.mcp.json` files and commit them to your repository\
\
\|See Also: [MCPs](https://claudelog.com/claude-code-mcps/)\
\
* * *\
\
**Synopsis:** Renamed MCP server scopes for clearer configuration: "project" → "local", "global" → "user".\
Clearer distinction between per-project and user-wide MCP server configurations.\
\
### v0.2.49 [​](https://claudelog.com/claude-code-changelog/\#v0249 "Direct link to v0.2.49")\
\
- Previous MCP server scopes have been renamed: previous "project" scope is now "local" and "global" scope is now "user"\
\
\|See Also: [MCPs](https://claudelog.com/claude-code-mcps/)\
\
* * *\
\
**Synopsis:** Press `Tab` to auto-complete file and folder names. `Shift+Tab` toggles auto-accept for file edits.\
Automatic conversation compaction enables infinite conversation length - toggle with `/config`.\
\
### v0.2.47 [​](https://claudelog.com/claude-code-changelog/\#v0247 "Direct link to v0.2.47")\
\
- Press Tab to auto-complete file and folder names\
- Press Shift + Tab to toggle auto-accept for file edits\
- Automatic conversation compaction for infinite conversation length (toggle with `/config`)\
\
See Also: [Auto-Accept Permissions](https://claudelog.com/mechanics/auto-accept-permissions/)\
\
* * *\
\
**Synopsis:** Thinking mode triggers: Ask Claude to 'think', 'think harder', or 'ultrathink' for deeper reasoning.\
Natural language control over Claude's planning and analysis depth for complex problems.\
\
### v0.2.44 [​](https://claudelog.com/claude-code-changelog/\#v0244 "Direct link to v0.2.44")\
\
- Ask Claude to make a plan with thinking mode: just say 'think' or 'think harder' or even 'ultrathink'\
\
* * *\
\
**Synopsis:** MCP server startup timeout configurable via `MCP_TIMEOUT` environment variable for slow-starting servers.\
MCP server startup no longer blocks the app from launching - faster startup even with many servers.\
\
### v0.2.41 [​](https://claudelog.com/claude-code-changelog/\#v0241 "Direct link to v0.2.41")\
\
- MCP server startup timeout can now be configured via `MCP_TIMEOUT` environment variable\
- MCP server startup no longer blocks the app from starting up\
\
\|See Also: [MCPs](https://claudelog.com/claude-code-mcps/)\
\
* * *\
\
**Synopsis:** New `/release-notes` command lets you view changelog at any time without leaving your session.\
`claude config add/remove` commands now accept multiple values separated by commas or spaces.\
\
### v0.2.37 [​](https://claudelog.com/claude-code-changelog/\#v0237 "Direct link to v0.2.37")\
\
- New `/release-notes` command lets you view release notes at any time\
- `claude config add/remove` commands now accept multiple values separated by commas or spaces\
\
* * *\
\
**Synopsis:** Import MCP servers from Claude Desktop with `claude mcp add-from-claude-desktop` for quick migration.\
Add MCP servers as JSON strings with `claude mcp add-json <n> <json>` for scripted configuration.\
\
### v0.2.36 [​](https://claudelog.com/claude-code-changelog/\#v0236 "Direct link to v0.2.36")\
\
- Import MCP servers from Claude Desktop with `claude mcp add-from-claude-desktop`\
- Add MCP servers as JSON strings with `claude mcp add-json <n> <json>`\
\
April 21, 2025\|See Also: [MCPs & Add-ons](https://claudelog.com/claude-code-mcps/) \| [Configuration](https://claudelog.com/configuration/#mcp-configuration)\
\
* * *\
\
**Synopsis:** Vim bindings for text input - navigate and edit prompts with familiar modal commands.\
Enable with `/vim` or `/config` commands. Modal editing brings Vim power to your Claude sessions.\
\
### v0.2.34 [​](https://claudelog.com/claude-code-changelog/\#v0234 "Direct link to v0.2.34")\
\
- Vim bindings for text input - enable with `/vim` or `/config`\
\
* * *\
\
**Synopsis:** Interactive MCP setup wizard: Run `claude mcp add` to add servers with step-by-step interface.\
Guided configuration makes adding MCP servers accessible without manual JSON editing. Fixed PersistentShell issues.\
\
### v0.2.32 [​](https://claudelog.com/claude-code-changelog/\#v0232 "Direct link to v0.2.32")\
\
- Interactive MCP setup wizard: Run `claude mcp add` to add MCP servers with a step-by-step interface\
- Fix for some PersistentShell issues\
\
\|See Also: [MCPs](https://claudelog.com/claude-code-mcps/)\
\
* * *\
\
**Synopsis:** Custom slash commands: Markdown files in `.claude/commands/` appear as commands to insert prompts.\
MCP debug mode: Run with `--mcp-debug` flag for detailed MCP server error information.\
\
### v0.2.31 [​](https://claudelog.com/claude-code-changelog/\#v0231 "Direct link to v0.2.31")\
\
- Custom slash commands: Markdown files in `.claude/commands/` directories now appear as custom slash commands to insert prompts into your conversation\
- MCP debug mode: Run with `--mcp-debug` flag to get more information about MCP server errors\
\
See Also: [CLAUDE.md Supremacy](https://claudelog.com/mechanics/claude-md-supremacy/) \| [MCPs](https://claudelog.com/claude-code-mcps/) \| [Slash Commands](https://docs.anthropic.com/en/docs/claude-code/slash-commands)\
\
* * *\
\
**Synopsis:** Added ANSI color theme for better compatibility with various terminal emulators and color schemes.\
Mac: API keys now stored securely in macOS Keychain. Fixed slash command arguments not being sent.\
\
### v0.2.30 [​](https://claudelog.com/claude-code-changelog/\#v0230 "Direct link to v0.2.30")\
\
- Added ANSI color theme for better terminal compatibility\
- Fixed issue where slash command arguments weren't being sent properly\
- (Mac-only) API keys are now stored in macOS Keychain\
\
* * *\
\
**Synopsis:** Introduced `/approved-tools` command for managing tool permissions - control what Claude can do.\
Word-level diff display for improved code readability. Fuzzy matching for slash commands finds commands easily.\
\
### v0.2.26 [​](https://claudelog.com/claude-code-changelog/\#v0226 "Direct link to v0.2.26")\
\
- New `/approved-tools` command for managing tool permissions\
- Word-level diff display for improved code readability\
- Fuzzy matching for slash commands\
\
April 21, 2025\|See Also: [Auto-Accept Permissions](https://claudelog.com/mechanics/auto-accept-permissions/) \| [Configuration](https://claudelog.com/configuration/)\
\
* * *\
\
**Synopsis:** Added fuzzy matching for `/commands` \- type partial names and find commands faster.\
Improved command discovery makes navigating the growing list of slash commands more convenient.\
\
### v0.2.21 [​](https://claudelog.com/claude-code-changelog/\#v0221 "Direct link to v0.2.21")\
\
- Fuzzy matching for `/commands`\
\
* * *\
\
![](https://claudelog.com/img/star_logo_part_1.svg)![](https://claudelog.com/img/star_logo_part_2.svg)![](https://claudelog.com/img/star_logo_part_3.svg)![](https://claudelog.com/img/star_logo_part_4.svg)![](https://claudelog.com/img/star_logo_part_5.svg)![](https://claudelog.com/img/star_logo_part_6.svg)\
\
Remarkable Progress\
\
It's amazing how far Claude Code has come in such a short period of time. From early beta versions to a comprehensive development platform with MCPs, auto-permissions, plan mode, real-time steering, and sophisticated workflows - the pace of innovation has been extraordinary.\
\
![Custom image](https://cdn.claudelog.com/img/discovery/023_excite-343w.webp)\
\
* * *\
\
- [v2.1.77](https://claudelog.com/claude-code-changelog/#v2177)\
- [v2.1.76](https://claudelog.com/claude-code-changelog/#v2176)\
- [v2.1.74](https://claudelog.com/claude-code-changelog/#v2174)\
- [v2.1.73](https://claudelog.com/claude-code-changelog/#v2173)\
- [v2.1.72](https://claudelog.com/claude-code-changelog/#v2172)\
- [v2.1.71](https://claudelog.com/claude-code-changelog/#v2171)\
- [v2.1.70](https://claudelog.com/claude-code-changelog/#v2170)\
- [v2.1.68](https://claudelog.com/claude-code-changelog/#v2168)\
- [v2.1.66](https://claudelog.com/claude-code-changelog/#v2166)\
- [v2.1.63](https://claudelog.com/claude-code-changelog/#v2163)\
- [v2.1.62](https://claudelog.com/claude-code-changelog/#v2162)\
- [v2.1.61](https://claudelog.com/claude-code-changelog/#v2161)\
- [v2.1.58](https://claudelog.com/claude-code-changelog/#v2158)\
- [v2.1.56](https://claudelog.com/claude-code-changelog/#v2156)\
- [v2.1.55](https://claudelog.com/claude-code-changelog/#v2155)\
- [v2.1.53](https://claudelog.com/claude-code-changelog/#v2153)\
- [v2.1.52](https://claudelog.com/claude-code-changelog/#v2152)\
- [v2.1.51](https://claudelog.com/claude-code-changelog/#v2151)\
- [v2.1.50](https://claudelog.com/claude-code-changelog/#v2150)\
- [v2.1.49](https://claudelog.com/claude-code-changelog/#v2149)\
- [v2.1.47](https://claudelog.com/claude-code-changelog/#v2147)\
- [v2.1.46](https://claudelog.com/claude-code-changelog/#v2146)\
- [v2.1.45](https://claudelog.com/claude-code-changelog/#v2145)\
- [v2.1.42](https://claudelog.com/claude-code-changelog/#v2142)\
- [v2.1.41](https://claudelog.com/claude-code-changelog/#v2141)\
- [v2.1.39](https://claudelog.com/claude-code-changelog/#v2139)\
- [v2.1.38](https://claudelog.com/claude-code-changelog/#v2138)\
- [v2.1.37](https://claudelog.com/claude-code-changelog/#v2137)\
- [v2.1.36](https://claudelog.com/claude-code-changelog/#v2136)\
- [v2.1.34](https://claudelog.com/claude-code-changelog/#v2134)\
- [v2.1.33](https://claudelog.com/claude-code-changelog/#v2133)\
- [v2.1.32](https://claudelog.com/claude-code-changelog/#v2132)\
- [v2.1.31](https://claudelog.com/claude-code-changelog/#v2131)\
- [v2.1.30](https://claudelog.com/claude-code-changelog/#v2130)\
- [v2.1.27](https://claudelog.com/claude-code-changelog/#v2127)\
- [v2.1.25](https://claudelog.com/claude-code-changelog/#v2125)\
- [v2.1.23](https://claudelog.com/claude-code-changelog/#v2123)\
- [v2.1.22](https://claudelog.com/claude-code-changelog/#v2122)\
- [v2.1.21](https://claudelog.com/claude-code-changelog/#v2121)\
- [v2.1.20](https://claudelog.com/claude-code-changelog/#v2120)\
- [v2.1.19](https://claudelog.com/claude-code-changelog/#v2119)\
- [v2.1.18](https://claudelog.com/claude-code-changelog/#v2118)\
- [v2.1.17](https://claudelog.com/claude-code-changelog/#v2117)\
- [v2.1.16](https://claudelog.com/claude-code-changelog/#v2116)\
- [v2.1.15](https://claudelog.com/claude-code-changelog/#v2115)\
- [v2.1.14](https://claudelog.com/claude-code-changelog/#v2114)\
- [v2.1.12](https://claudelog.com/claude-code-changelog/#v2112)\
- [v2.1.11](https://claudelog.com/claude-code-changelog/#v2111)\
- [v2.1.10](https://claudelog.com/claude-code-changelog/#v2110)\
- [v2.1.9](https://claudelog.com/claude-code-changelog/#v219)\
- [v2.1.7](https://claudelog.com/claude-code-changelog/#v217)\
- [v2.1.6](https://claudelog.com/claude-code-changelog/#v216)\
- [v2.1.5](https://claudelog.com/claude-code-changelog/#v215)\
- [v2.1.4](https://claudelog.com/claude-code-changelog/#v214)\
- [v2.1.3](https://claudelog.com/claude-code-changelog/#v213)\
- [v2.1.2](https://claudelog.com/claude-code-changelog/#v212)\
- [v2.1.0](https://claudelog.com/claude-code-changelog/#v210)\
- [v2.0.76](https://claudelog.com/claude-code-changelog/#v2076)\
- [v2.0.74](https://claudelog.com/claude-code-changelog/#v2074)\
- [v2.0.73](https://claudelog.com/claude-code-changelog/#v2073)\
- [v2.0.72](https://claudelog.com/claude-code-changelog/#v2072)\
- [v2.0.71](https://claudelog.com/claude-code-changelog/#v2071)\
- [v2.0.70](https://claudelog.com/claude-code-changelog/#v2070)\
- [v2.0.69](https://claudelog.com/claude-code-changelog/#v2069)\
- [v2.0.68](https://claudelog.com/claude-code-changelog/#v2068)\
- [v2.0.67](https://claudelog.com/claude-code-changelog/#v2067)\
- [v2.0.65](https://claudelog.com/claude-code-changelog/#v2065)\
- [v2.0.64](https://claudelog.com/claude-code-changelog/#v2064)\
- [v2.0.62](https://claudelog.com/claude-code-changelog/#v2062)\
- [v2.0.61](https://claudelog.com/claude-code-changelog/#v2061)\
- [v2.0.60](https://claudelog.com/claude-code-changelog/#v2060)\
- [v2.0.59](https://claudelog.com/claude-code-changelog/#v2059)\
- [v2.0.58](https://claudelog.com/claude-code-changelog/#v2058)\
- [v2.0.57](https://claudelog.com/claude-code-changelog/#v2057)\
- [v2.0.56](https://claudelog.com/claude-code-changelog/#v2056)\
- [v2.0.55](https://claudelog.com/claude-code-changelog/#v2055)\
- [v2.0.54](https://claudelog.com/claude-code-changelog/#v2054)\
- [v2.0.52](https://claudelog.com/claude-code-changelog/#v2052)\
- [v2.0.51](https://claudelog.com/claude-code-changelog/#v2051)\
- [v2.0.50](https://claudelog.com/claude-code-changelog/#v2050)\
- [v2.0.49](https://claudelog.com/claude-code-changelog/#v2049)\
- [v2.0.47](https://claudelog.com/claude-code-changelog/#v2047)\
- [v2.0.46](https://claudelog.com/claude-code-changelog/#v2046)\
- [v2.0.45](https://claudelog.com/claude-code-changelog/#v2045)\
- [v2.0.43](https://claudelog.com/claude-code-changelog/#v2043)\
- [v2.0.42](https://claudelog.com/claude-code-changelog/#v2042)\
- [v2.0.41](https://claudelog.com/claude-code-changelog/#v2041)\
- [v2.0.37](https://claudelog.com/claude-code-changelog/#v2037)\
- [v2.0.36](https://claudelog.com/claude-code-changelog/#v2036)\
- [v2.0.35](https://claudelog.com/claude-code-changelog/#v2035)\
- [v2.0.34](https://claudelog.com/claude-code-changelog/#v2034)\
- [v2.0.33](https://claudelog.com/claude-code-changelog/#v2033)\
- [v2.0.32](https://claudelog.com/claude-code-changelog/#v2032)\
- [v2.0.31](https://claudelog.com/claude-code-changelog/#v2031)\
- [v2.0.30](https://claudelog.com/claude-code-changelog/#v2030)\
- [v2.0.28](https://claudelog.com/claude-code-changelog/#v2028)\
- [v2.0.27](https://claudelog.com/claude-code-changelog/#v2027)\
- [v2.0.25](https://claudelog.com/claude-code-changelog/#v2025)\
- [v2.0.24](https://claudelog.com/claude-code-changelog/#v2024)\
- [v2.0.22](https://claudelog.com/claude-code-changelog/#v2022)\
- [v2.0.21](https://claudelog.com/claude-code-changelog/#v2021)\
- [v2.0.20](https://claudelog.com/claude-code-changelog/#v2020)\
- [v2.0.19](https://claudelog.com/claude-code-changelog/#v2019)\
- [v2.0.17](https://claudelog.com/claude-code-changelog/#v2017)\
- [v2.0.15](https://claudelog.com/claude-code-changelog/#v2015)\
- [v2.0.14](https://claudelog.com/claude-code-changelog/#v2014)\
- [v2.0.13](https://claudelog.com/claude-code-changelog/#v2013)\
- [v2.0.12](https://claudelog.com/claude-code-changelog/#v2012)\
- [v2.0.11](https://claudelog.com/claude-code-changelog/#v2011)\
- [v2.0.10](https://claudelog.com/claude-code-changelog/#v2010)\
- [v2.0.9](https://claudelog.com/claude-code-changelog/#v209)\
- [v2.0.8](https://claudelog.com/claude-code-changelog/#v208)\
- [v2.0.5](https://claudelog.com/claude-code-changelog/#v205)\
- [v2.0.2](https://claudelog.com/claude-code-changelog/#v202)\
- [v2.0.1](https://claudelog.com/claude-code-changelog/#v201)\
- [v2.0.0](https://claudelog.com/claude-code-changelog/#v200)\
- [v1.0.126](https://claudelog.com/claude-code-changelog/#v10126)\
- [v1.0.124](https://claudelog.com/claude-code-changelog/#v10124)\
- [v1.0.123](https://claudelog.com/claude-code-changelog/#v10123)\
- [v1.0.120](https://claudelog.com/claude-code-changelog/#v10120)\
- [v1.0.119](https://claudelog.com/claude-code-changelog/#v10119)\
- [v1.0.117](https://claudelog.com/claude-code-changelog/#v10117)\
- [v1.0.115](https://claudelog.com/claude-code-changelog/#v10115)\
- [v1.0.113](https://claudelog.com/claude-code-changelog/#v10113)\
- [v1.0.112](https://claudelog.com/claude-code-changelog/#v10112)\
- [v1.0.111](https://claudelog.com/claude-code-changelog/#v10111)\
- [v1.0.110](https://claudelog.com/claude-code-changelog/#v10110)\
- [v1.0.109](https://claudelog.com/claude-code-changelog/#v10109)\
- [v1.0.106](https://claudelog.com/claude-code-changelog/#v10106)\
- [v1.0.97](https://claudelog.com/claude-code-changelog/#v1097)\
- [v1.0.94](https://claudelog.com/claude-code-changelog/#v1094)\
- [v1.0.93](https://claudelog.com/claude-code-changelog/#v1093)\
- [Aug 26, 2025](https://claudelog.com/claude-code-changelog/#aug-26-2025)\
  - [v1.0.90](https://claudelog.com/claude-code-changelog/#v1090)\
  - [v1.0.88](https://claudelog.com/claude-code-changelog/#v1088)\
  - [v1.0.86](https://claudelog.com/claude-code-changelog/#v1086)\
  - [v1.0.85](https://claudelog.com/claude-code-changelog/#v1085)\
  - [v1.0.84](https://claudelog.com/claude-code-changelog/#v1084)\
  - [v1.0.83](https://claudelog.com/claude-code-changelog/#v1083)\
  - [v1.0.82](https://claudelog.com/claude-code-changelog/#v1082)\
  - [v1.0.81](https://claudelog.com/claude-code-changelog/#v1081)\
  - [v1.0.80](https://claudelog.com/claude-code-changelog/#v1080)\
  - [v1.0.77](https://claudelog.com/claude-code-changelog/#v1077)\
  - [v1.0.73](https://claudelog.com/claude-code-changelog/#v1073)\
  - [v1.0.72](https://claudelog.com/claude-code-changelog/#v1072)\
  - [v1.0.71](https://claudelog.com/claude-code-changelog/#v1071)\
  - [v1.0.70](https://claudelog.com/claude-code-changelog/#v1070)\
  - [v1.0.69](https://claudelog.com/claude-code-changelog/#v1069)\
  - [v1.0.68](https://claudelog.com/claude-code-changelog/#v1068)\
  - [v1.0.65](https://claudelog.com/claude-code-changelog/#v1065)\
  - [v1.0.64](https://claudelog.com/claude-code-changelog/#v1064)\
  - [v1.0.63](https://claudelog.com/claude-code-changelog/#v1063)\
  - [v1.0.62](https://claudelog.com/claude-code-changelog/#v1062)\
  - [v1.0.61](https://claudelog.com/claude-code-changelog/#v1061)\
  - [v1.0.60](https://claudelog.com/claude-code-changelog/#v1060)\
  - [v1.0.59](https://claudelog.com/claude-code-changelog/#v1059)\
  - [v1.0.58](https://claudelog.com/claude-code-changelog/#v1058)\
  - [v1.0.57](https://claudelog.com/claude-code-changelog/#v1057)\
  - [v1.0.56](https://claudelog.com/claude-code-changelog/#v1056)\
  - [v1.0.55](https://claudelog.com/claude-code-changelog/#v1055)\
  - [v1.0.54](https://claudelog.com/claude-code-changelog/#v1054)\
  - [v1.0.53](https://claudelog.com/claude-code-changelog/#v1053)\
  - [v1.0.52](https://claudelog.com/claude-code-changelog/#v1052)\
  - [v1.0.51](https://claudelog.com/claude-code-changelog/#v1051)\
  - [v1.0.48](https://claudelog.com/claude-code-changelog/#v1048)\
  - [v1.0.45](https://claudelog.com/claude-code-changelog/#v1045)\
  - [v1.0.44](https://claudelog.com/claude-code-changelog/#v1044)\
  - [v1.0.43](https://claudelog.com/claude-code-changelog/#v1043)\
  - [v1.0.42](https://claudelog.com/claude-code-changelog/#v1042)\
  - [v1.0.41](https://claudelog.com/claude-code-changelog/#v1041)\
  - [v1.0.40](https://claudelog.com/claude-code-changelog/#v1040)\
  - [v1.0.39](https://claudelog.com/claude-code-changelog/#v1039)\
  - [v1.0.38](https://claudelog.com/claude-code-changelog/#v1038)\
  - [v1.0.37](https://claudelog.com/claude-code-changelog/#v1037)\
  - [v1.0.36](https://claudelog.com/claude-code-changelog/#v1036)\
  - [v1.0.35](https://claudelog.com/claude-code-changelog/#v1035)\
  - [v1.0.34](https://claudelog.com/claude-code-changelog/#v1034)\
  - [v1.0.33](https://claudelog.com/claude-code-changelog/#v1033)\
  - [v1.0.32](https://claudelog.com/claude-code-changelog/#v1032)\
  - [v1.0.31](https://claudelog.com/claude-code-changelog/#v1031)\
  - [v1.0.30](https://claudelog.com/claude-code-changelog/#v1030)\
  - [v1.0.29](https://claudelog.com/claude-code-changelog/#v1029)\
  - [v1.0.28](https://claudelog.com/claude-code-changelog/#v1028)\
  - [v1.0.27](https://claudelog.com/claude-code-changelog/#v1027)\
  - [v1.0.25](https://claudelog.com/claude-code-changelog/#v1025)\
  - [v1.0.24](https://claudelog.com/claude-code-changelog/#v1024)\
  - [v1.0.23](https://claudelog.com/claude-code-changelog/#v1023)\
  - [v1.0.22](https://claudelog.com/claude-code-changelog/#v1022)\
  - [v1.0.21](https://claudelog.com/claude-code-changelog/#v1021)\
  - [v1.0.18](https://claudelog.com/claude-code-changelog/#v1018)\
  - [v1.0.17](https://claudelog.com/claude-code-changelog/#v1017)\
  - [v1.0.16](https://claudelog.com/claude-code-changelog/#v1016)\
  - [v1.0.11](https://claudelog.com/claude-code-changelog/#v1011)\
  - [v1.0.10](https://claudelog.com/claude-code-changelog/#v1010)\
  - [v1.0.8](https://claudelog.com/claude-code-changelog/#v108)\
  - [v1.0.7](https://claudelog.com/claude-code-changelog/#v107)\
  - [v1.0.6](https://claudelog.com/claude-code-changelog/#v106)\
  - [v1.0.4](https://claudelog.com/claude-code-changelog/#v104)\
  - [v1.0.1](https://claudelog.com/claude-code-changelog/#v101)\
  - [v1.0.0](https://claudelog.com/claude-code-changelog/#v100)\
  - [v0.2.125](https://claudelog.com/claude-code-changelog/#v02125)\
  - [v0.2.117](https://claudelog.com/claude-code-changelog/#v02117)\
  - [v0.2.108](https://claudelog.com/claude-code-changelog/#v02108)\
  - [v0.2.107](https://claudelog.com/claude-code-changelog/#v02107)\
  - [v0.2.106](https://claudelog.com/claude-code-changelog/#v02106)\
  - [v0.2.105](https://claudelog.com/claude-code-changelog/#v02105)\
  - [v0.2.102](https://claudelog.com/claude-code-changelog/#v02102)\
  - [v0.2.100](https://claudelog.com/claude-code-changelog/#v02100)\
  - [v0.2.98](https://claudelog.com/claude-code-changelog/#v0298)\
  - [v0.2.95](https://claudelog.com/claude-code-changelog/#v0295)\
  - [v0.2.93](https://claudelog.com/claude-code-changelog/#v0293)\
  - [v0.2.82](https://claudelog.com/claude-code-changelog/#v0282)\
  - [v0.2.75](https://claudelog.com/claude-code-changelog/#v0275)\
  - [v0.2.7](https://claudelog.com/claude-code-changelog/#v027)\
  - [v0.2.72](https://claudelog.com/claude-code-changelog/#v0272)\
  - [v0.2.70](https://claudelog.com/claude-code-changelog/#v0270)\
  - [v0.2.69](https://claudelog.com/claude-code-changelog/#v0269)\
  - [v0.2.67](https://claudelog.com/claude-code-changelog/#v0267)\
  - [v0.2.66](https://claudelog.com/claude-code-changelog/#v0266)\
  - [v0.2.63](https://claudelog.com/claude-code-changelog/#v0263)\
  - [v0.2.61](https://claudelog.com/claude-code-changelog/#v0261)\
  - [v0.2.59](https://claudelog.com/claude-code-changelog/#v0259)\
  - [v0.2.54](https://claudelog.com/claude-code-changelog/#v0254)\
  - [v0.2.53](https://claudelog.com/claude-code-changelog/#v0253)\
  - [v0.2.50](https://claudelog.com/claude-code-changelog/#v0250)\
  - [v0.2.49](https://claudelog.com/claude-code-changelog/#v0249)\
  - [v0.2.47](https://claudelog.com/claude-code-changelog/#v0247)\
  - [v0.2.44](https://claudelog.com/claude-code-changelog/#v0244)\
  - [v0.2.41](https://claudelog.com/claude-code-changelog/#v0241)\
  - [v0.2.37](https://claudelog.com/claude-code-changelog/#v0237)\
  - [v0.2.36](https://claudelog.com/claude-code-changelog/#v0236)\
  - [v0.2.34](https://claudelog.com/claude-code-changelog/#v0234)\
  - [v0.2.32](https://claudelog.com/claude-code-changelog/#v0232)\
  - [v0.2.31](https://claudelog.com/claude-code-changelog/#v0231)\
  - [v0.2.30](https://claudelog.com/claude-code-changelog/#v0230)\
  - [v0.2.26](https://claudelog.com/claude-code-changelog/#v0226)\
  - [v0.2.21](https://claudelog.com/claude-code-changelog/#v0221)\
\
![](https://claudelog.com/img/metrics-icon-part-1.svg)![](https://claudelog.com/img/metrics-icon-part-2.svg)![](https://claudelog.com/img/metrics-icon-part-3.svg)![](https://claudelog.com/img/metrics-icon-part-4.svg)\
\
Live Users (90)\
\
|     |     |     |\
| --- | --- | --- |\
| [034](https://claudelog.com/faqs/how-to-suspend-claude-code/ "/faqs/how-to-suspend-claude-code/") | [\|](https://claudelog.com/faqs/how-to-suspend-claude-code/ "/faqs/how-to-suspend-claude-code/") | [Suspend](https://claudelog.com/faqs/how-to-suspend-claude-code/ "/faqs/how-to-suspend-claude-code/") |\
| [011](https://claudelog.com/configuration/ "/configuration/") | [\|](https://claudelog.com/configuration/ "/configuration/") | [Configuration](https://claudelog.com/configuration/ "/configuration/") |\
| [010](https://claudelog.com/ "/") | [\|](https://claudelog.com/ "/") | [Home](https://claudelog.com/ "/") |\
| [006](https://claudelog.com/faqs/claude-ai-is-free/ "/faqs/claude-ai-is-free/") | [\|](https://claudelog.com/faqs/claude-ai-is-free/ "/faqs/claude-ai-is-free/") | [Is Free](https://claudelog.com/faqs/claude-ai-is-free/ "/faqs/claude-ai-is-free/") |\
| [006](https://claudelog.com/faqs/what-are-background-agents/ "/faqs/what-are-background-agents/") | [\|](https://claudelog.com/faqs/what-are-background-agents/ "/faqs/what-are-background-agents/") | [/faqs/what-are-background-agents/](https://claudelog.com/faqs/what-are-background-agents/ "/faqs/what-are-background-agents/") |\
\
* * *\
\
Updates on Claude Code insights, news, mechanics, features & best practices\
\
Subscribe ↗