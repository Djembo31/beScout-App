[New: AI-native post-mortems are here! Get a data-rich draft in minutes.](https://incident.io/post-mortems)

[incident.io](https://incident.io/)

Brand Assets

[Download .PNG logos](https://incident.io/brand/resources/incidentio-brand-pngs.zip) [Download .SVG logos](https://incident.io/brand/resources/incidentio-brand-svgs.zip) [Download Brand Guidelines](https://incident.io/downloads/incidentio-brand-guidelines.pdf) [Visit brand center](https://incident.io/brand)

- Products
- Solutions
- Resources
- Customers
- [Pricing](https://incident.io/pricing)
- [Careers](https://incident.io/careers)

Open main menu

- Products

- Solutions

- Resources

- Customers

- Pricing

- Careers


[Get a demo](https://incident.io/demo) [Login](https://app.incident.io/login)

[incident.io](https://incident.io/)

Brand Assets

[Download .PNG logos](https://incident.io/brand/resources/incidentio-brand-pngs.zip) [Download .SVG logos](https://incident.io/brand/resources/incidentio-brand-svgs.zip) [Download Brand Guidelines](https://incident.io/downloads/incidentio-brand-guidelines.pdf) [Visit brand center](https://incident.io/brand)

- Products
- Solutions
- Resources
- Customers
- [Pricing](https://incident.io/pricing)
- [Careers](https://incident.io/careers)

[Get a demo](https://incident.io/demo) [Login](https://app.incident.io/login)

Open main menu

All posts `Esc`

- [How we're shipping faster with Claude Code and Git Worktrees](https://incident.io/blog/shipping-faster-with-claude-code-and-git-worktrees#content-top)
- [Claude Code: AI development in your terminal](https://incident.io/blog/shipping-faster-with-claude-code-and-git-worktrees#claude-code-ai-development-in-your-terminal)
- [Git Worktrees: The unsung hero](https://incident.io/blog/shipping-faster-with-claude-code-and-git-worktrees#git-worktrees-the-unsung-hero)
- [w - a friendly bash function for Claude and Git worktrees](https://incident.io/blog/shipping-faster-with-claude-code-and-git-worktrees#w---a-friendly-bash-function-for-claude-and-git-worktrees)
- [How we're actually using Claude Code](https://incident.io/blog/shipping-faster-with-claude-code-and-git-worktrees#how-were-actually-using-claude-code)
- [Plan Mode: The confidence booster](https://incident.io/blog/shipping-faster-with-claude-code-and-git-worktrees#plan-mode-the-confidence-booster)
- [Voice-driven development](https://incident.io/blog/shipping-faster-with-claude-code-and-git-worktrees#voice-driven-development)
- [What we're building toward](https://incident.io/blog/shipping-faster-with-claude-code-and-git-worktrees#what-were-building-toward)
- [Better development environments](https://incident.io/blog/shipping-faster-with-claude-code-and-git-worktrees#better-development-environments)
- [Closing the feedback loop](https://incident.io/blog/shipping-faster-with-claude-code-and-git-worktrees#closing-the-feedback-loop)
- [The Bottom Line](https://incident.io/blog/shipping-faster-with-claude-code-and-git-worktrees#the-bottom-line)
- [Getting started](https://incident.io/blog/shipping-faster-with-claude-code-and-git-worktrees#getting-started)

# How we're shipping faster with Claude Code and Git Worktrees

![Rory Bain](https://incident.io/_next/image?url=https%3A%2F%2Fcdn.sanity.io%2Fimages%2Foqy5aexb%2Fproduction%2F03152b7eec852151f760e893d865963694542181-500x500.png%3Fw%3D50%26h%3D50%26q%3D80%26fit%3Dmax%26auto%3Dformat&w=128&q=75)
[Rory Bain](https://incident.io/blog/author/rory)

June 27, 2025 — 16 min read

![](https://incident.io/_next/image?url=https%3A%2F%2Fcdn.sanity.io%2Fimages%2Foqy5aexb%2Fproduction%2Faf0cf56a2202b8c2f231ca226424497c5f2209a8-4800x2700.png%3Fw%3D2000%26q%3D80%26fit%3Dmax%26auto%3Dformat&w=3840&q=75)

Four months ago, Claude Code was announced and we were requesting invites to its "Research Preview." Now? We've gone from no Claude Code to simultaneously running four or five Claude agents, each working on different features in parallel. It sounds chaotic, but it's been a natural progression as we've learned to trust AI more and as the tools have dramatically improved.

When Pete (our CTO) gave the team the mission to "spend as many of my hard-earned VC dollars on Claude as possible," many of us took it as a personal challenge. We even had a leaderboard up in the office tracking Claude Code usage across the team.

What started as widespread experimentation has since turned into workflow changes that are accelerating our development pace.

## Claude Code: AI development in your terminal

For those who haven't tried it yet, Claude Code is Anthropic's command-line tool that lets you delegate coding tasks directly to Claude from your terminal. While there are other AI coding tools out there (Cursor, GitHub Copilot, and others) there's something really neat about Claude Code: it runs entirely in your terminal, meaning it can run any bash commands on your behalf and it’s easy to spin up multiple instances concurrently.

You simply run `claude` in any directory, and you get a conversational AI that can read your codebase, make changes, run commands, and even commit code. It feels natural for developers who live in the terminal, and unlike some IDE-based tools, you can have as many Claude Code sessions running as you want.

We're using this across all sorts of tasks - building new UIs, improving tooling, writing tests, and even drafting product specification documents. To give you a flavour of the kinds of things it can do, here are some real examples.

* * *

**Building new UI**

We have this quite advanced part of our product where you can write JavaScript to extract fields from your alert event JSON payloads. They're part of our "Expressions" feature that lets you run various bits of logic all across the product.

A simple bit of parse JavaScript could be `$.metadata.team` to extract a nested string. However, you can also use JavaScript functions for more advanced use cases—e.g., `return $.values.map(function(v) { return v*2; })`.

![](https://cdn.sanity.io/images/oqy5aexb/production/90c8996113d461d229f57696036fb7073a7ddf81-1404x711.png?w=2000&q=80&fit=max&auto=format)

In _most_ cases, you don't need particularly sophisticated JavaScript, and we even use AI in the product to suggest the JavaScript for you. For that reason, we hadn't prioritized making the input box for JavaScript very fancy—it's just a single line input that we use for all sorts of forms in the product.

However, with Claude Code, 30 seconds of prompting and about 10 minutes of processing time, we had a lovely new JavaScript editor with multiline support, line numbers, and even some code completion.

Here's the prompt I started Claude with. I let it run in Plan Mode (more on that later), where it went away and `grep`/`find`/`cat`'d its way to find the relevant files and produce the plan shown in the second image.

![](https://cdn.sanity.io/images/oqy5aexb/production/019c9515d0ebfec7eb8e8889f22d2eb1031144c3-1356x565.png?w=2000&q=80&fit=max&auto=format)![](https://cdn.sanity.io/images/oqy5aexb/production/979cf866ead0d0decb9f1194edffcba1cc490e34-1356x992.png?w=2000&q=80&fit=max&auto=format)

Claude suggested a plan which, funnily enough, estimated this as ~2 hours of work—yet it completed the task in 10 minutes. It's clearly been trained on human speed estimates!

I accepted the plan and it started working. Within 10 minutes, I had a 90% working version of the new editor. Because Claude can search my code as needed and run tools like the TypeScript compiler to verify its changes, it produced code that looked just like our existing codebase—completely valid and, other than some visual UI nits, even better than I had imagined.

This sort of change is one that we might have struggled to prioritise, but has become significantly easier by using Claude Code.

![](https://cdn.sanity.io/images/oqy5aexb/production/9879ade4aebc2af40eccb895a113a23786bd1429-1356x992.png?w=2000&q=80&fit=max&auto=format)![](https://cdn.sanity.io/images/oqy5aexb/production/a328dff1210f2e484f3e60f076a552e8bf679475-1444x1063.png?w=2000&q=80&fit=max&auto=format)

**Improving tooling**

In another case, here's an example of me prompting Claude Code about some of our slow tooling. We codegen our API specs and clients, and it's one of the slower parts of our tooling that had been annoying me.

While I was working on other features, I got Claude to analyze and improve our API generation commands in our Makefile.

The prompt at the top here is pretty much all the context I gave it. $8 of Claude credit later, it had produced a full analysis of the slowdowns and a bunch of suggested fixes.

I then asked it to implement the improvements one at a time, starting with the best bang for our buck. It edited our Makefile and introduced parallelism on some of the latter steps that generate frontend clients. With probably ~5 minutes of work from myself, we had an 18% (30 seconds) improvement on the time it takes to generate our APIs—something we run against every pull request and most developers here run almost daily, the $8 on Claude here was incredibly good value for money.

![](https://cdn.sanity.io/images/oqy5aexb/production/9bebdba86b9ced47fe82b8814dec08a000f290ee-1356x992.png?w=2000&q=80&fit=max&auto=format)

So, Claude Code is incredibly powerful, and we're using it all over. We're still responsible for the code we ship, and generally we can't rely on Claude for any larger architectural decisions, but when direction is clear, it's a massive implementation accelerator.

The only catch? You can have many Claude Code instances running concurrently, but by default, you probably only have one Git repository checked out at a time. This means all your Claude conversations are stepping on each other in the same working directory—until you discover Git Worktrees.

## Git Worktrees: The unsung hero

One of the most useful discoveries has been Git Worktrees—a feature that's been waiting for its moment in the spotlight. With multiple Claude agents running simultaneously, Git Worktrees is finally having that moment.

For those unfamiliar, Git Worktrees let you check out multiple branches of the same repository simultaneously, each in its own directory. Unlike cloning a repository multiple times (which duplicates the entire .git directory and wastes space), worktrees share a single repository database and only create the working files you need. Instead of constantly switching branches and losing your working state, you can have `feature-a` in one folder and `bugfix-b` in another, both connected to the same Git repository. Git also provides built-in commands to manage these worktrees, making it easy to add, remove, and track them.

The typical workflow involves creating worktrees manually: `git worktree add ../feature-branch`, then navigating to that directory. It works, but when you're managing several parallel development streams, the constant directory navigation and worktree management becomes tedious.

I was using a process just like that where I'd navigate to our monorepo, run `git worktree add`, specify a path, switch contexts, and then finally start the Claude session. When you're juggling multiple AI conversations simultaneously, all that friction adds up fast.

So I built [a custom worktree manager](https://gist.github.com/rorydbain/e20e6ab0c7cc027fc1599bd2e430117d) that improves this significantly. Now I can open a terminal, type `w core some-feature claude`, and instantly have a Claude Code window running on a completely isolated branch.

## `w` \- a friendly bash function for Claude and Git worktrees

This simple yet powerful bash function was created with Claude's help, streamlining our workflow when managing multiple development branches:

```sh
# Create and enter a new worktree
w myproject new-feature

# Run Claude Code in that worktree
w myproject new-feature claude

# Check git status without switching directories
w myproject new-feature git status

# Commit directly from anywhere
w myproject new-feature git commit -m "fix: the thing"
```

Under the hood, it:

- **Auto-completes** existing worktrees and repositories
- **Creates worktrees** automatically with your username as prefix (which under the hood is creating branches)
- **Organizes everything** in a clean `~/projects/worktrees/` structure
- **Runs commands** in the worktree context without changing your current directory
- **Remembers** existing worktrees across sessions

What's nice about this is the intelligent completion system. Start typing a worktree name and it suggests existing ones, or lets you create something new. Type a command and it suggests common git operations, Claude, or any other tool you need.

It's removing all the friction between "someone asks for a feature" and "Claude is actively working on it." The best part? Claude can even commit and push code changes when you ask it to, and with worktrees, every conversation stays completely isolated.

## How we're actually using Claude Code

So that's how we're managing branches and parallel development—but what about how we're actually using Claude Code day-to-day? We've been learning what works, what doesn't, and discovering patterns that have become essential to our workflow.

I'm not going to dive into prompting techniques here—there's already plenty of content about that online. My high-level advice? Just experiment. The real value we've found isn't in how to craft the perfect prompt, but in sharing learnings and in the workflows and tools we've built around Claude. So instead of another prompting guide, let me share some practical lessons we've learned about integrating AI into our development process.

### Plan Mode: The confidence booster

Claude Code's Plan Mode has changed how we work. You can confidently leave Claude running in plan mode without worrying about it making unauthorised changes. Before this, it felt risky—Claude would make changes and sit there waiting for confirmation, or you'd run auto-edit mode and pray you didn't come back to a mess.

This confidence means we can parallelise work well. I'm not just kicking off six things concurrently and closing them down—I'm having seven ongoing conversations at once, each evolving independently. It's like having a distributed team of junior developers, each working to my guidance.

### Voice-driven development

One of the most interesting developments recently has been incorporating voice into our Claude workflow. I've been using [SuperWhisper](https://superwhisper.com/) for dictation, and you'll often see me disappearing to a meeting room just to talk to Claude for 10 minutes straight.

The workflow is surprisingly natural:

1. Brain-dump context and requirements via voice for 5 minutes
2. Tag relevant files for Claude to examine
3. Let Claude generate a product spec or perhaps even a fully formed implementation

It feels like explaining a task to a junior developer: "Here are my thoughts, here are the files you'll need, off you go." Claude comes back with solutions that are often better than what I was struggling to articulate in text.

The voice approach shines for complex features where typing out all the edge cases and requirements would take forever. Recently, I've been working on improving our cover requests feature—there are so many different scenarios and it's hard to stay coherent when trying to get it all out at the speed of thought. Voice lets me think out loud naturally.

## What we're building toward

With this foundation in place, we're starting to dream bigger about automation and workflow improvements.

### Better development environments

One challenge we're excited to solve is resource management. While we can now make code changes quickly using multiple Git worktrees, we're still limited by local resources. Running several Claude sessions simultaneously means juggling databases, ports, and local services—which quickly becomes unwieldy.

We already have previews automatically generated for frontend code changes in pull requests, which run against our staging infrastructure—great for UI changes. But we need something more comprehensive. We’d love to push changes to CI and get complete ephemeral environments with their own database and backend, with pre-populated test data for each pull request.

The vision is being able to work on multiple features simultaneously, push them up, and come back later to find everything exactly as you left it—databases, services, the whole stack ready to go in its own isolated environment.

### Closing the feedback loop

With better preview environments in place, we can dramatically shorten the feedback-to-implementation cycle. Imagine our internal product feedback channel in Slack automatically triggering not just tickets, but actual working prototypes.

Here's how this enhanced workflow could look:

1. Someone posts in our #product-feedback Slack channel: "It would be cool if..."
2. This automatically creates a Linear ticket and Claude evaluates if the request is specific enough to prototype
3. Claude creates a worktree and branch in the background
4. It implements a working prototype based on the feedback
5. The changes get pushed to CI, triggering a preview deployment
6. Claude posts the preview link right back in the original Slack thread

The pieces are already there. Our CI runs in under five minutes, Claude can already create and push branches, and with the worktree manager, spinning up isolated development environments is instant.

## The Bottom Line

We're not just optimising our development workflow—we're preparing for a world where AI-assisted development is the norm. Fast, isolated environments become critical when you're managing multiple AI conversations, each potentially lasting hours or days.

The worktree approach gives us something powerful: the ability to treat AI coding sessions like long-running processes. We can have ongoing, focused dialogues about specific features, with all the context preserved in the branch and worktree.

Four months ago, actually even one month ago, we barely used Claude Code. Today, we're running multiple AI agents in parallel, each working on isolated features with their own complete development environments. Our build times are faster, our feature development is accelerated, and we're spending more time on the creative work of product development rather than fighting with tooling.

The future of development isn't about replacing engineers—it's about giving them superpowers. And sometimes, those superpowers come with an $8 price tag and an 18% performance improvement while you're making dinner.

Plus, there's something satisfying about the meta-aspect: I used Claude to build the tools that make working with Claude more efficient. It's Claude-optimising-Claude all the way down.

## Getting started

If you want to try this workflow yourself, the [worktree manager script](https://gist.github.com/rorydbain/e20e6ab0c7cc027fc1599bd2e430117d) is open source and ready to use. It assumes your projects live in `~/projects/` and creates worktrees in `~/projects/worktrees/`, but it's easy to customise.

For voice integration, [SuperWhisper](https://superwhisper.com/) has been really useful for complex feature discussions. The ability to brain-dump context for 5 minutes and then let Claude parse and implement it is surprisingly natural.

_Want to work with us as we push the boundaries of AI-assisted development? We're hiring engineers who are excited about the future of software development. [Check out our open roles](https://incident.io/careers)._

![Picture of Rory Bain](https://incident.io/_next/image?url=https%3A%2F%2Fcdn.sanity.io%2Fimages%2Foqy5aexb%2Fproduction%2F03152b7eec852151f760e893d865963694542181-500x500.png%3Fw%3D100%26h%3D100%26q%3D80%26fit%3Dmax%26auto%3Dformat&w=256&q=75)

Rory Bain

Product Engineer

[View morefrom Rory](https://incident.io/blog/author/rory)

## See related articles

[View all](https://incident.io/blog)

[![We rebuilt our post-mortems from the ground up](https://incident.io/_next/image?url=https%3A%2F%2Fcdn.sanity.io%2Fimages%2Foqy5aexb%2Fproduction%2F584a4d77cad5098314ff06e7aa20543e8c96095c-2000x1125.png%3Fw%3D2000%26q%3D80%26fit%3Dmax%26auto%3Dformat&w=3840&q=75)\\
\\
**We rebuilt our post-mortems from the ground up** \\
\\
Today we're launching our new post-mortems experience, and I want to walk you through what we've done and why.\\
\\
![Pete Hamilton](https://incident.io/_next/image?url=https%3A%2F%2Fcdn.sanity.io%2Fimages%2Foqy5aexb%2Fproduction%2F4884ed999f884514b6fc1571af01407f7c78c286-512x512.png%3Fw%3D2000%26q%3D80%26fit%3Dmax%26auto%3Dformat&w=1080&q=75)Pete Hamilton\\
\\
March 17, 2026](https://incident.io/blog/post-mortems-launch) [![Bloom filters: the niche trick behind a 16× faster API](https://incident.io/_next/image?url=https%3A%2F%2Fcdn.sanity.io%2Fimages%2Foqy5aexb%2Fproduction%2F4995c5246adaed7853165222bd84c5f6af4d83a7-4800x2700.png%3Fw%3D2000%26q%3D80%26fit%3Dmax%26auto%3Dformat&w=3840&q=75)\\
\\
**Bloom filters: the niche trick behind a 16× faster API** \\
\\
This post is a deep dive into how we improved the P95 latency of an API endpoint from 5s to 0.3s using a niche little computer science trick called a bloom filter.\\
\\
![Mike Fisher](https://incident.io/_next/image?url=https%3A%2F%2Fcdn.sanity.io%2Fimages%2Foqy5aexb%2Fproduction%2F03534500cc455a88eb475ec447557953e2db55c7-512x512.jpg%3Fw%3D2000%26q%3D80%26fit%3Dmax%26auto%3Dformat&w=1080&q=75)Mike Fisher\\
\\
November 14, 2025](https://incident.io/blog/bloom-filters) [![My first three months at incident.io](https://incident.io/_next/image?url=https%3A%2F%2Fcdn.sanity.io%2Fimages%2Foqy5aexb%2Fproduction%2F33045fd0cf6031c26a7035230c80ece158a9cd19-4800x2700.png%3Fw%3D2000%26q%3D80%26fit%3Dmax%26auto%3Dformat&w=3840&q=75)\\
\\
**My first three months at incident.io** \\
\\
Hear from Edd - one of our recent joiners in the On-Call team - how have they found their first three months and what's it been like working here.\\
\\
![Edd Sowden](https://incident.io/_next/image?url=https%3A%2F%2Fcdn.sanity.io%2Fimages%2Foqy5aexb%2Fproduction%2F0a5126f9b6b2180decac7e719fc194903597f3e7-512x512.png%3Frect%3D25%2C26%2C425%2C373%26w%3D2000%26q%3D80%26fit%3Dmax%26auto%3Dformat&w=1080&q=75)Edd Sowden\\
\\
September 1, 2025](https://incident.io/blog/my-first-three-months-at-incident-io)

[View all](https://incident.io/blog)

* * *

## So good, you’ll break things on purpose

Ready for modern incident management? Book a call with one of our experts today.

![Signup image](https://incident.io/_next/image?url=%2F_next%2Fstatic%2Fmedia%2Fsignup-image.81d38d52.png&w=3840&q=75&dpl=dpl_6L5rPLM6VjYPn2moBSzaVJGD76Nh)

### We’d love to talk to you about

- All-in-one incident management
- Our unmatched speed of deployment
- Why we’re loved by users and easily adopted
- How we work for the whole organization

[Get a demo](https://incident.io/demo)

![Eryn Carman](https://incident.io/_next/image?url=https%3A%2F%2Fcdn.sanity.io%2Fimages%2Foqy5aexb%2Fproduction%2F13c3df986e33da4b270a0ede8c6859982f9f87f9-943x943.jpg%3Fw%3D2000%26q%3D80%26fit%3Dmax%26auto%3Dformat&w=1920&q=75)![Rory Malcolm](https://incident.io/_next/image?url=https%3A%2F%2Fcdn.sanity.io%2Fimages%2Foqy5aexb%2Fproduction%2F1e715111dcf04d620a13db5d6b70d9a19b74033f-3024x4032.jpg%3Fw%3D2000%26q%3D80%26fit%3Dmax%26auto%3Dformat&w=3840&q=75)![Ed Dean](https://incident.io/_next/image?url=https%3A%2F%2Fcdn.sanity.io%2Fimages%2Foqy5aexb%2Fproduction%2F47574bc43bd13e32eb1ce20e4664dbe37ceeca63-4899x4899.png%3Frect%3D786%2C0%2C3135%2C3003%26w%3D2000%26q%3D80%26fit%3Dmax%26auto%3Dformat&w=3840&q=75)![Lucy Jennings](https://incident.io/_next/image?url=https%3A%2F%2Fcdn.sanity.io%2Fimages%2Foqy5aexb%2Fproduction%2F4a76d0ae3b8eef5d16f525ac375b3570563346a3-800x800.jpg%3Frect%3D263%2C175%2C351%2C341%26w%3D2000%26q%3D80%26fit%3Dmax%26auto%3Dformat&w=1920&q=75)

[incident.io![incident.io](https://incident.io/_next/image?url=%2F_next%2Fstatic%2Fmedia%2Ficon-512x512.8dedb876.png&w=1080&q=75&dpl=dpl_6L5rPLM6VjYPn2moBSzaVJGD76Nh)](https://incident.io/)

[BlueSky](https://bsky.app/profile/incident.io) [LinkedIn](https://www.linkedin.com/company/incident-io/) [X](https://x.com/incident_io) [Facebook](https://www.facebook.com/incident.io/) [Youtube](https://www.youtube.com/@incident-io) [Slack Community](https://incident.io/community)

© 2026 Pineapple Technology Ltd.

All rights reserved.

Product

[On-call](https://incident.io/on-call) [Incident Response](https://incident.io/respond) [Status Pages](https://incident.io/status-pages) [AI](https://incident.io/ai) [Changelog](https://incident.io/changelog)

Learn

[Blog](https://incident.io/blog) [Customer Stories](https://incident.io/customers) [Documentation](https://docs.incident.io/) [Alternatives](https://incident.io/alternatives) [Community](https://incident.io/community)

Company

[Legal](https://incident.io/legal) [Privacy Choices](https://incident.io/blog/shipping-faster-with-claude-code-and-git-worktrees#) [Security and Compliance](https://incident.io/security) [Careers](https://incident.io/careers) [Status](https://status.incident.io/)

Twitter Widget Iframe