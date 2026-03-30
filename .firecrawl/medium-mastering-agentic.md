[Sitemap](https://medium.com/sitemap/sitemap.xml)

[Open in app](https://play.google.com/store/apps/details?id=com.medium.reader&referrer=utm_source%3DmobileNavBar&source=post_page---top_nav_layout_nav-----------------------------------------)

Sign up

[Sign in](https://medium.com/m/signin?operation=login&redirect=https%3A%2F%2Fmedium.com%2F%40soodrajesh%2Fmastering-claude-code-from-beginner-basics-to-advanced-agentic-workflows-f95cc83324ae&source=post_page---top_nav_layout_nav-----------------------global_nav------------------)

[Medium Logo](https://medium.com/?source=post_page---top_nav_layout_nav-----------------------------------------)

Get app

[Write](https://medium.com/m/signin?operation=register&redirect=https%3A%2F%2Fmedium.com%2Fnew-story&source=---top_nav_layout_nav-----------------------new_post_topnav------------------)

[Search](https://medium.com/search?source=post_page---top_nav_layout_nav-----------------------------------------)

Sign up

[Sign in](https://medium.com/m/signin?operation=login&redirect=https%3A%2F%2Fmedium.com%2F%40soodrajesh%2Fmastering-claude-code-from-beginner-basics-to-advanced-agentic-workflows-f95cc83324ae&source=post_page---top_nav_layout_nav-----------------------global_nav------------------)

![](https://miro.medium.com/v2/resize:fill:32:32/1*dmbNkD5D-u45r44go_cf0g.png)

# Mastering Claude Code: From Beginner Basics to Advanced Agentic Workflows

[![Rajesh Sood](https://miro.medium.com/v2/resize:fill:32:32/1*wbfhJd8Gn4CxxpnmpU50bA@2x.jpeg)](https://medium.com/@soodrajesh?source=post_page---byline--f95cc83324ae---------------------------------------)

[Rajesh Sood](https://medium.com/@soodrajesh?source=post_page---byline--f95cc83324ae---------------------------------------)

Follow

6 min read

·

Dec 14, 2025

1

[Listen](https://medium.com/m/signin?actionUrl=https%3A%2F%2Fmedium.com%2Fplans%3Fdimension%3Dpost_audio_button%26postId%3Df95cc83324ae&operation=register&redirect=https%3A%2F%2Fmedium.com%2F%40soodrajesh%2Fmastering-claude-code-from-beginner-basics-to-advanced-agentic-workflows-f95cc83324ae&source=---header_actions--f95cc83324ae---------------------post_audio_button------------------)

Share

Press enter or click to view image in full size

![](https://miro.medium.com/v2/resize:fit:700/1*tKOw7C_AqZyYAPtWyINlzQ.jpeg)

In the fast-evolving world of AI-assisted coding, Anthropic’s **Claude Code** stands out for one simple reason: it lives in your terminal and behaves like a real engineering partner.

Unlike traditional autocomplete tools, Claude Code is **agentic**. It doesn’t just suggest snippets — it understands your codebase, plans tasks, edits files, runs commands, and can even prepare pull requests autonomously.

If you’re tired of copy-pasting from chat UIs or being boxed into IDE-specific workflows, Claude Code gives you a low-level, flexible way to use Claude’s most powerful models (Sonnet and Opus) directly where you already work: **the command line**.

In this deep dive, we’ll go from first install to advanced workflows, with real examples and patterns that actually scale. If you’ve used Cursor or similar tools, you’ll see familiar ideas — but with more control and fewer guardrails.

Let’s get into it.

## What Is Claude Code?

Claude Code is Anthropic’s open-source **command-line AI coding agent**. It runs locally, but gives Claude controlled access to your filesystem, shell, and tools like Git.

That access unlocks real work:

- Reading and modifying files
- Debugging issues end-to-end
- Running tests and build commands
- Refactoring across large codebases

## Why Claude Code Feels Different

- **Agentic by default:**

Claude plans, executes, and iterates — you don’t have to micromanage steps.
- **Terminal-first:**

No IDE lock-in. It works anywhere your shell works.
- **Permission-aware:**

File writes, command execution, and sensitive actions are gated (and configurable).
- **Model flexibility:**

Heavy reasoning with Opus, fast iteration with Sonnet.

If you’re coming from **Cursor**: think of Claude Code as a _specialized agent_ you can embed into your editor rather than an editor that happens to have AI.

## Getting Started

## Installation

You’ll need an Anthropic API key (sign up at claude.ai if you don’t have one).

Install Claude Code using pip (Python 3.8+):

```
pip install claude-code
```

Authenticate:

```
claude login
```

Start a session:

```
claude
```

You’ll see:

```
Claude>
```

That’s it — you’re live.

## IDE Integration (Optional)

If you use VS Code or Cursor:

- Install the **Claude Code** extension
- It launches Claude Code in a terminal pane
- You can drag files directly into prompts

This gives you the best of both worlds: editor ergonomics plus agentic power.

## First Example: Generating a Simple Function

Let’s start small.

Prompt in the Claude terminal:

```
Write a Python function called is_palindrome that checks if a string is a palindrome. Ignore case and spaces. Save it to palindrome.py.
```

Claude’s internal reasoning (snippet):

```
Thinking... First, clean the string: lowercase and remove spaces.
Then, compare with its reverse.
```

```
Editing palindrome.py...
```

Generated file (`palindrome.py`):

```
def is_palindrome(text):
    # Clean the string: remove spaces and convert to lowercase
    cleaned = ''.join(char.lower() for char in text if char.isalnum())
    # Check if it reads the same forwards and backwards
    return cleaned == cleaned[::-1]
```

```
# Example usage
print(is_palindrome("A man a plan a canal Panama"))  # True
```

Terminal output:

```
File written: palindrome.py
```

Run it:

```
python palindrome.py
```

Output:

```
True
```

This is the baseline experience: natural language in, real files out.

## CLAUDE.md: Persistent Project Rules

If you’ve used Cursor’s `.cursorrules`, this will feel familiar.

Claude Code uses `CLAUDE.md` — a Markdown file that’s automatically loaded into every prompt. It acts as a persistent “constitution” for your project.

## Creating a CLAUDE.md

Place it in your project root (or `~/.claude/CLAUDE.md` for global rules).

Example for a Python project:

```
# Project Rules
- Use Python 3.10+.
- Follow PEP 8 style: snake_case variables, 4-space indentation.
- Always add docstrings to functions.
- For errors, use logging instead of print.
- IMPORTANT: Test all code with pytest before committing.
```

```
# Key Commands
- To run tests: pytest
- Build command: python setup.py build# Examples
For API calls, use requests library like: import requests; response = requests.get(url)
```

Now try:

```
Add a docstring and test to the is_palindrome function.
```

Claude will comply with the rules automatically.

## Advanced Tip

You can use **hierarchical**`CLAUDE.md` **files** in subdirectories (great for monorepos). Claude merges them, with higher-level rules taking precedence.

````
# CLAUDE.md — Project Rules & Working Agreement

This file defines how Claude should work inside this repository.
Follow these rules unless explicitly told otherwise.

---

## 1. Engineering Principles (Non-Negotiable)

- Prefer **clarity over cleverness**
- Optimize for **maintainability**, not premature performance
- If something looks over-engineered, **call it out**
- Always explain *why* a change is made, not just *what* changed
- Don’t introduce new abstractions unless there is clear reuse

---

## 2. Language & Runtime

- Primary language: **Python 3.10+**
- Package manager: **pip**
- Virtual env assumed active
- OS target: Linux / macOS

---

## 3. Code Style Rules

- Follow **PEP 8**
- Use `snake_case` for variables and functions
- Use `PascalCase` for classes
- Max line length: 88 chars
- Always add **docstrings** for public functions
- Prefer explicit code over magic

Example:
```python
def calculate_total(price: float, tax_rate: float) -> float:
    """
    Calculate total price including tax.

    Args:
        price: Base price
        tax_rate: Tax rate as decimal

    Returns:
        Total price including tax
    """
    return price * (1 + tax_rate)
````

## Commands and Slash Commands

Claude Code supports both free-form prompts and structured commands.

## Built-In Commands

- `/clear` — reset context
- `/undo` — revert last edit
- `/context` — show token usage
- `/tools` — manage permissions

Example:

```
Debug why this code fails: print(is_palindrome("123 321"))
```

Claude responds:

```
Analyzing... The function ignores non-alnum, so "123 321" cleans to "123321" which is palindrome.
```

```
No bug — it should return True.
```

## Custom Slash Commands (Power Feature)

You can define your own commands in `.claude/commands/`.

## Get Rajesh Sood’s stories in your inbox

Join Medium for free to get updates from this writer.

Subscribe

Subscribe

Remember me for faster sign in

Example: `test.md`

```
Generate pytest unit tests for the component $ARGUMENTS.
Include edge cases and mocks.
Place in tests/test_$ARGUMENTS.py.
```

Usage:

```
/test palindrome
```

Generated output (`tests/test_palindrome.py`):

```
import pytest
from palindrome import is_palindrome
```

```
def test_basic_palindrome():
    assert is_palindrome("radar") == Truedef test_with_spaces():
    assert is_palindrome("A man a plan a canal Panama") == Truedef test_non_palindrome():
    assert is_palindrome("hello") == False
```

Run:

```
pytest
```

All tests pass.

This is extremely powerful for teams — you can version-control workflows, not just code.

## Hooks: Automating After Edits

Hooks let you run shell commands automatically after Claude takes actions.

Configured in `.claude/settings.json`.

Example: auto-format after edits:

```
{
"hooks": {
    "PostToolUse": {
      "Edit": "prettier --write \"$CLAUDE_FILE_PATHS\""
    }
}
}
```

More advanced example (TypeScript type-checking):

```
{
"hooks": {
    "PostToolUse": {
      "Edit": "if [[ \"$CLAUDE_FILE_PATHS\" =~ \\.(ts|tsx)$ ]]; then npx tsc --noEmit \"$CLAUDE_FILE_PATHS\"; fi"
    }
}
}
```

Hooks turn Claude Code into a lightweight automation engine.

## Advanced Workflows

## Test-Driven Development (TDD)

Prompt:

```
Use TDD: Write failing tests for a fizzbuzz function, then implement to pass.
```

Claude will:

1. Write failing tests
2. Implement the function
3. Run tests
4. Iterate until green

End result: working code, tested properly.

## Visual Iteration (UI Work)

You can paste screenshots directly into prompts.

Example:

```
Match this UI mock [pasted image]: Implement in React.
```

Claude iterates visually and code-wise until the implementation matches.

## Multi-Agent Workflows

For larger tasks:

- Run multiple `claude` sessions
- Use Git worktrees:

```
git worktree add ../feature-branch
```

- One agent implements, another reviews

Review output example:

```
Reviewed fizzbuzz.py: No bugs, but add edge case for n=0.
```

This mirrors real team workflows surprisingly well.

## Using Claude Code with Cursor

If you’re a Cursor user, this combo is excellent.

- Use Cursor for fast inline edits
- Use Claude Code for multi-file, agentic work

Cursor’s `.cursorrules` and Claude’s `CLAUDE.md` complement each other nicely.

Example prompt via Cursor’s Claude Code pane:

```
Refactor this selected code [drag file] to use hooks.
```

Claude edits the file directly.

## Tips, Best Practices, and Gotchas

- Be specific in prompts — edge cases matter
- Clear context often to save tokens
- Document tools and commands in `CLAUDE.md`
- Use:

```
claude --dangerously-skip-permissions
```

only in safe environments

- For CI/headless use:

`claude -p "Fix lint errors" --output-format json`

## Final Thoughts

Claude Code turns your terminal into a serious coding collaborator. It combines Cursor-style rules with deeper autonomy and fewer constraints.

Start small: generate functions, fix bugs, write tests.

Then scale up: TDD, hooks, multi-agent workflows.

The real unlock is `CLAUDE.md` — once you invest in that, Claude starts working _the way you do_.

If you’re building something interesting with Claude Code, share it. This tool rewards experimentation.

[![Rajesh Sood](https://miro.medium.com/v2/resize:fill:48:48/1*wbfhJd8Gn4CxxpnmpU50bA@2x.jpeg)](https://medium.com/@soodrajesh?source=post_page---post_author_info--f95cc83324ae---------------------------------------)

[![Rajesh Sood](https://miro.medium.com/v2/resize:fill:64:64/1*wbfhJd8Gn4CxxpnmpU50bA@2x.jpeg)](https://medium.com/@soodrajesh?source=post_page---post_author_info--f95cc83324ae---------------------------------------)

Follow

[**Written by Rajesh Sood**](https://medium.com/@soodrajesh?source=post_page---post_author_info--f95cc83324ae---------------------------------------)

[27 followers](https://medium.com/@soodrajesh/followers?source=post_page---post_author_info--f95cc83324ae---------------------------------------)

· [3 following](https://medium.com/@soodrajesh/following?source=post_page---post_author_info--f95cc83324ae---------------------------------------)

Hey, I'm Raj. Cloud Engineering & DevOps Specialist, AI/ML Enthusiast. I share hands-on tutorials on AWS, Kubernetes, Terraform, AI/ML and beyond.

Follow

## Responses (1)

![](https://miro.medium.com/v2/resize:fill:32:32/1*dmbNkD5D-u45r44go_cf0g.png)

Write a response

[What are your thoughts?](https://medium.com/m/signin?operation=register&redirect=https%3A%2F%2Fmedium.com%2F%40soodrajesh%2Fmastering-claude-code-from-beginner-basics-to-advanced-agentic-workflows-f95cc83324ae&source=---post_responses--f95cc83324ae---------------------respond_sidebar------------------)

Cancel

Respond

[![Lch](https://miro.medium.com/v2/resize:fill:32:32/0*3JDKVrpULUyw1XDe.jpg)](https://medium.com/@lch15901771269?source=post_page---post_responses--f95cc83324ae----0-----------------------------------)

[Lch](https://medium.com/@lch15901771269?source=post_page---post_responses--f95cc83324ae----0-----------------------------------)

[5 days ago](https://medium.com/@lch15901771269/really-liked-this-perspective-cb7c55a51a87?source=post_page---post_responses--f95cc83324ae----0-----------------------------------)

```
Really liked this perspective. I’ve been thinking about very similar problems in https://github.com/claw-army/claude-node, especially the gap between “calling Claude” and actually making it useful inside real coding workflows.
```

--

1 reply

Reply

## More from Rajesh Sood

![Mastering K9s: The Ultimate Kubernetes CLI Tool for Efficiency](https://miro.medium.com/v2/resize:fit:679/format:webp/1*o-mQDJj8qRXLq-jyIHWOKQ.png)

[**Mastering K9s: The Ultimate Kubernetes CLI Tool for Efficiency**\\
\\
**Introduction**](https://medium.com/@soodrajesh/mastering-k9s-the-ultimate-kubernetes-cli-tool-for-efficiency-dd2f4c34db35?source=post_page---author_recirc--f95cc83324ae----0---------------------c548a96e_bbd3_4a15_ad69_75878882863b--------------)

Feb 20, 2025

![Exploring Cursor CLI: The AI-Powered Terminal Tool That’s Changing How We Code](https://miro.medium.com/v2/resize:fit:679/format:webp/1*wsuUkhc6M6zKzJnNIqwjhQ.jpeg)

[**Exploring Cursor CLI: The AI-Powered Terminal Tool That’s Changing How We Code**\\
\\
**Hey everyone — if you’re someone who spent way too many hours glued to the terminal, you know how clunky it can feel to switch contexts…**](https://medium.com/@soodrajesh/exploring-cursor-cli-the-ai-powered-terminal-tool-thats-changing-how-we-code-ad9b9b781fff?source=post_page---author_recirc--f95cc83324ae----1---------------------c548a96e_bbd3_4a15_ad69_75878882863b--------------)

Aug 29, 2025

![AI-Powered IDEs: Cursor vs Windsurf vs Kiro](https://miro.medium.com/v2/resize:fit:679/format:webp/1*CkCLarvgWQI_4y-o-Cv6Zw.jpeg)

[**AI-Powered IDEs: Cursor vs Windsurf vs Kiro**\\
\\
**As a developer, I can tell you: AI-powered IDEs are a godsend.**](https://medium.com/@soodrajesh/ai-powered-ides-cursor-vs-windsurf-vs-kiro-f7f7795f0c9c?source=post_page---author_recirc--f95cc83324ae----2---------------------c548a96e_bbd3_4a15_ad69_75878882863b--------------)

Aug 22, 2025

![ELK Stack: A Complete Guide with Real-World Use Cases](https://miro.medium.com/v2/resize:fit:679/format:webp/1*O9yeQmkBFyyZtDJ58nJ30g.jpeg)

[**ELK Stack: A Complete Guide with Real-World Use Cases**\\
\\
**Introduction**](https://medium.com/@soodrajesh/elk-stack-a-complete-guide-with-real-world-use-cases-8d51da1f07da?source=post_page---author_recirc--f95cc83324ae----3---------------------c548a96e_bbd3_4a15_ad69_75878882863b--------------)

Mar 3, 2025

[See all from Rajesh Sood](https://medium.com/@soodrajesh?source=post_page---author_recirc--f95cc83324ae---------------------------------------)

## Recommended from Medium

![10 Must-Have Skills for Claude (and Any Coding Agent) in 2026](https://miro.medium.com/v2/resize:fit:679/format:webp/1*5Nup6r8Erd-5lEhYbscyJA.png)

[**10 Must-Have Skills for Claude (and Any Coding Agent) in 2026**\\
\\
**The definitive guide to agent skills that change how Claude Code, Cursor, Gemini CLI, and other AI coding assistants perform in production.**](https://medium.com/@unicodeveloper/10-must-have-skills-for-claude-and-any-coding-agent-in-2026-b5451b013051?source=post_page---read_next_recirc--f95cc83324ae----0---------------------334a1dd7_589c_4a5f_8671_f10c980c381d--------------)

Mar 9

[A response icon13](https://medium.com/@unicodeveloper/10-must-have-skills-for-claude-and-any-coding-agent-in-2026-b5451b013051?source=post_page---read_next_recirc--f95cc83324ae----0---------------------334a1dd7_589c_4a5f_8671_f10c980c381d--------------)

![You Are Probably Buying the Wrong Machine for Local AI — The Mac Mini M4 vs Mini PC Truth Nobody…](https://miro.medium.com/v2/resize:fit:679/format:webp/1*NTxC-5yj0Zv2icQqHC0uyQ.png)

[**You Are Probably Buying the Wrong Machine for Local AI — The Mac Mini M4 vs Mini PC Truth Nobody…**\\
\\
**There is a quiet war happening on the desks of AI enthusiasts right now. On one side, the Mac Mini M4 sits sleek and silent, promising…**](https://medium.com/codex/you-are-probably-buying-the-wrong-machine-for-local-ai-the-mac-mini-m4-vs-mini-pc-truth-nobody-ed26e63f6a17?source=post_page---read_next_recirc--f95cc83324ae----1---------------------334a1dd7_589c_4a5f_8671_f10c980c381d--------------)

Mar 20

[A response icon14](https://medium.com/codex/you-are-probably-buying-the-wrong-machine-for-local-ai-the-mac-mini-m4-vs-mini-pc-truth-nobody-ed26e63f6a17?source=post_page---read_next_recirc--f95cc83324ae----1---------------------334a1dd7_589c_4a5f_8671_f10c980c381d--------------)

![The Complete Guide to Claude Code: CLAUDE.md](https://miro.medium.com/v2/resize:fit:679/format:webp/1*4_bLN2_Of8H4z9xZwNxLFA.jpeg)

[**The Complete Guide to Claude Code: CLAUDE.md**\\
\\
**A comprehensive guide to the CLAUDE.md file in Claude Code, including how it is loaded, how to write it, best practices, and how it…**](https://medium.com/ai-advances/the-complete-guide-to-claude-code-claude-md-743d4cbac757?source=post_page---read_next_recirc--f95cc83324ae----0---------------------334a1dd7_589c_4a5f_8671_f10c980c381d--------------)

Mar 17

[A response icon6](https://medium.com/ai-advances/the-complete-guide-to-claude-code-claude-md-743d4cbac757?source=post_page---read_next_recirc--f95cc83324ae----0---------------------334a1dd7_589c_4a5f_8671_f10c980c381d--------------)

![5 New Claude Code Slash Commands (That Are Making Workflows Better)](https://miro.medium.com/v2/resize:fit:679/format:webp/1*kd7AnDhTF_Em1jzUb4VQAw.png)

[**5 New Claude Code Slash Commands (That Are Making Workflows Better)**\\
\\
**If you have not tested the last few Claude Code updates, I understand. The rate at which Anthropic is shipping new features on Claude Code…**](https://medium.com/@joe.njenga/5-new-claude-code-slash-commands-that-are-making-workflows-better-7bd416a5859a?source=post_page---read_next_recirc--f95cc83324ae----1---------------------334a1dd7_589c_4a5f_8671_f10c980c381d--------------)

Mar 17

[A response icon7](https://medium.com/@joe.njenga/5-new-claude-code-slash-commands-that-are-making-workflows-better-7bd416a5859a?source=post_page---read_next_recirc--f95cc83324ae----1---------------------334a1dd7_589c_4a5f_8671_f10c980c381d--------------)

![Using spec-driven development with Claude Code](https://miro.medium.com/v2/resize:fit:679/format:webp/1*VOzPHcHIvwhHGi3HYRXplA.png)

[**Using spec-driven development with Claude Code**\\
\\
**I no longer write code by hand. I wouldn’t call myself a proper software development engineer by trade, nor have I deployed large-scale…**](https://medium.com/@heeki/using-spec-driven-development-with-claude-code-4a1ebe5d9f29?source=post_page---read_next_recirc--f95cc83324ae----2---------------------334a1dd7_589c_4a5f_8671_f10c980c381d--------------)

Feb 28

[A response icon14](https://medium.com/@heeki/using-spec-driven-development-with-claude-code-4a1ebe5d9f29?source=post_page---read_next_recirc--f95cc83324ae----2---------------------334a1dd7_589c_4a5f_8671_f10c980c381d--------------)

![The Claude Code Toolkit: Mastering AI Context for Production-Ready Development](https://miro.medium.com/v2/resize:fit:679/format:webp/1*cgrFzZDK097e7haN8cqnUA.png)

[**The Claude Code Toolkit: Mastering AI Context for Production-Ready Development**\\
\\
**The Problem Every Developer Has with AI Coding Assistants**](https://medium.com/@ashfaqbs/the-claude-code-toolkit-mastering-ai-context-for-production-ready-development-036d702f83d7?source=post_page---read_next_recirc--f95cc83324ae----3---------------------334a1dd7_589c_4a5f_8671_f10c980c381d--------------)

Feb 8

[See more recommendations](https://medium.com/?source=post_page---read_next_recirc--f95cc83324ae---------------------------------------)

[Help](https://help.medium.com/hc/en-us?source=post_page-----f95cc83324ae---------------------------------------)

[Status](https://status.medium.com/?source=post_page-----f95cc83324ae---------------------------------------)

[About](https://medium.com/about?autoplay=1&source=post_page-----f95cc83324ae---------------------------------------)

[Careers](https://medium.com/jobs-at-medium/work-at-medium-959d1a85284e?source=post_page-----f95cc83324ae---------------------------------------)

[Press](mailto:pressinquiries@medium.com)

[Blog](https://blog.medium.com/?source=post_page-----f95cc83324ae---------------------------------------)

[Privacy](https://policy.medium.com/medium-privacy-policy-f03bf92035c9?source=post_page-----f95cc83324ae---------------------------------------)

[Rules](https://policy.medium.com/medium-rules-30e5502c4eb4?source=post_page-----f95cc83324ae---------------------------------------)

[Terms](https://policy.medium.com/medium-terms-of-service-9db0094a1e0f?source=post_page-----f95cc83324ae---------------------------------------)

[Text to speech](https://speechify.com/medium?source=post_page-----f95cc83324ae---------------------------------------)

reCAPTCHA

Recaptcha requires verification.

[Privacy](https://www.google.com/intl/en/policies/privacy/) \- [Terms](https://www.google.com/intl/en/policies/terms/)

protected by **reCAPTCHA**

[Privacy](https://www.google.com/intl/en/policies/privacy/) \- [Terms](https://www.google.com/intl/en/policies/terms/)