[Sitemap](https://alirezarezvani.medium.com/sitemap/sitemap.xml)

[Open in app](https://play.google.com/store/apps/details?id=com.medium.reader&referrer=utm_source%3DmobileNavBar&source=post_page---top_nav_layout_nav-----------------------------------------)

Sign up

[Sign in](https://medium.com/m/signin?operation=login&redirect=https%3A%2F%2Falirezarezvani.medium.com%2F141-claude-code-agents-the-setup-that-actually-works-a-complete-guide-98c2c79bf867&source=post_page---top_nav_layout_nav-----------------------global_nav------------------)

[Medium Logo](https://medium.com/?source=post_page---top_nav_layout_nav-----------------------------------------)

Get app

[Write](https://medium.com/m/signin?operation=register&redirect=https%3A%2F%2Fmedium.com%2Fnew-story&source=---top_nav_layout_nav-----------------------new_post_topnav------------------)

[Search](https://medium.com/search?source=post_page---top_nav_layout_nav-----------------------------------------)

Sign up

[Sign in](https://medium.com/m/signin?operation=login&redirect=https%3A%2F%2Falirezarezvani.medium.com%2F141-claude-code-agents-the-setup-that-actually-works-a-complete-guide-98c2c79bf867&source=post_page---top_nav_layout_nav-----------------------global_nav------------------)

![](https://miro.medium.com/v2/resize:fill:32:32/1*dmbNkD5D-u45r44go_cf0g.png)

1

Member-only story

# 141 Claude Code Agents: The Setup That Actually Works. A Complete Guide

## After 6 months building agents in production, here’s the 10-team structure, 8 autonomous skills, and 19 slash commands that saved my sanity.

[![Reza Rezvani](https://miro.medium.com/v2/resize:fill:32:32/1*jDxVaEgUePd76Bw8xJrr2g.png)](https://alirezarezvani.medium.com/?source=post_page---byline--98c2c79bf867---------------------------------------)

[Reza Rezvani](https://alirezarezvani.medium.com/?source=post_page---byline--98c2c79bf867---------------------------------------)

Follow

9 min read

·

Jan 25, 2026

234

8

[Listen](https://medium.com/m/signin?actionUrl=https%3A%2F%2Fmedium.com%2Fplans%3Fdimension%3Dpost_audio_button%26postId%3D98c2c79bf867&operation=register&redirect=https%3A%2F%2Falirezarezvani.medium.com%2F141-claude-code-agents-the-setup-that-actually-works-a-complete-guide-98c2c79bf867&source=---header_actions--98c2c79bf867---------------------post_audio_button------------------)

Share

Everyone builds one Claude Code agent. I built 141, to be honest at the start, I was not aware. Why? I will explain you why and when an agent and its dedicated skills would make sense and why you do not need to reinvent the wheel.

That number wasn’t the plan. Six months ago, I started with a single agent to help with code reviews. Then I needed one for documentation. Then testing.

Press enter or click to view image in full size

![](https://miro.medium.com/v2/resize:fit:700/1*aTpEho4dJQSrjxf9YneA0w.png)

141 Claude Code Agents on Beast Mode \| Image Generated with Gemini 3 Pro

_Quick note: AI tools helped structure this article. The 6 months of testing, 141 agent building, configurations, and every failure documented below are from my actual production workflow._

Before I knew it, I was drowning in agents — losing track of which did what, watching them step on each other’s work, and spending more time managing them than they saved me.

The breaking point came on a Tuesday at 11 PM. Three agents were fighting over the same file. Context from one session kept bleeding into another. I’d just spent four hours debugging a problem that only existed because my agent architecture was a mess.

That night, I started over. What emerged became my [claude-code-tresor repository](https://github.com/alirezarezvani/claude-code-tresor) — 288 stars as of this writing, containing the 10-team structure, 8 autonomous skills, and 19 slash commands that turned chaos into something manageable.

Here’s what actually works.

## Claude Code Agent Architecture: The 10-Team System

Most developers organize agents by task. _“Code review agent.”_ _“Documentation agent.” “Testing agent.”_ I tried this. It collapsed around agent number 30.

**The problem:** tasks overlap. A refactoring task needs code review, documentation updates, AND testing. When agents are organized by task, you’re constantly switching contexts, losing information in handoffs, and duplicating work.

**My solution:** organize by domain instead. Each _“team”_ owns a complete area of the codebase or workflow.

## Create an account to read the full story.

The author made this story available to Medium members only.

If you’re new to Medium, create a new account to read this story on us.

[Continue in app](https://play.google.com/store/apps/details?id=com.medium.reader&referrer=utm_source%3Dregwall&source=-----98c2c79bf867---------------------post_regwall------------------)

Or, continue in mobile web

[Sign up with Google](https://medium.com/m/connect/google?state=google-%7Chttps%3A%2F%2Falirezarezvani.medium.com%2F141-claude-code-agents-the-setup-that-actually-works-a-complete-guide-98c2c79bf867%3Fsource%3D-----98c2c79bf867---------------------post_regwall------------------%26skipOnboarding%3D1%7Cregister%7Cremember_me&source=-----98c2c79bf867---------------------post_regwall------------------)

[Sign up with Facebook](https://medium.com/m/connect/facebook?state=facebook-%7Chttps%3A%2F%2Falirezarezvani.medium.com%2F141-claude-code-agents-the-setup-that-actually-works-a-complete-guide-98c2c79bf867%3Fsource%3D-----98c2c79bf867---------------------post_regwall------------------%26skipOnboarding%3D1%7Cregister%7Cremember_me&source=-----98c2c79bf867---------------------post_regwall------------------)

Sign up with email

Already have an account? [Sign in](https://medium.com/m/signin?operation=login&redirect=https%3A%2F%2Falirezarezvani.medium.com%2F141-claude-code-agents-the-setup-that-actually-works-a-complete-guide-98c2c79bf867&source=-----98c2c79bf867---------------------post_regwall------------------)

234

234

8

[![Reza Rezvani](https://miro.medium.com/v2/resize:fill:48:48/1*jDxVaEgUePd76Bw8xJrr2g.png)](https://alirezarezvani.medium.com/?source=post_page---post_author_info--98c2c79bf867---------------------------------------)

[![Reza Rezvani](https://miro.medium.com/v2/resize:fill:64:64/1*jDxVaEgUePd76Bw8xJrr2g.png)](https://alirezarezvani.medium.com/?source=post_page---post_author_info--98c2c79bf867---------------------------------------)

Follow

[**Written by Reza Rezvani**](https://alirezarezvani.medium.com/?source=post_page---post_author_info--98c2c79bf867---------------------------------------)

[5.3K followers](https://alirezarezvani.medium.com/followers?source=post_page---post_author_info--98c2c79bf867---------------------------------------)

· [81 following](https://alirezarezvani.medium.com/following?source=post_page---post_author_info--98c2c79bf867---------------------------------------)

CTO & AI builder based in Berlin. Writing about Claude Code, agentic workflows, and shipping real products with AI. 20+ years of turning ideas into products.

Follow

## Responses (8)

![](https://miro.medium.com/v2/resize:fill:32:32/1*dmbNkD5D-u45r44go_cf0g.png)

Write a response

[What are your thoughts?](https://medium.com/m/signin?operation=register&redirect=https%3A%2F%2Falirezarezvani.medium.com%2F141-claude-code-agents-the-setup-that-actually-works-a-complete-guide-98c2c79bf867&source=---post_responses--98c2c79bf867---------------------respond_sidebar------------------)

Cancel

Respond

[![Reza Rezvani](https://miro.medium.com/v2/resize:fill:32:32/1*jDxVaEgUePd76Bw8xJrr2g.png)](https://alirezarezvani.medium.com/?source=post_page---post_responses--98c2c79bf867----0-----------------------------------)

[Reza Rezvani](https://alirezarezvani.medium.com/?source=post_page---post_responses--98c2c79bf867----0-----------------------------------)

Author

[Jan 25](https://alirezarezvani.medium.com/the-hardest-part-of-building-141-agents-wasnt-the-agents-themselves-it-was-learning-when-not-to-30f034de7e83?source=post_page---post_responses--98c2c79bf867----0-----------------------------------)

```
The hardest part of building 141 agents wasn't the agents themselves — it was learning when NOT to add another one. What's been your biggest challenge with Claude Code agent management? I'll share more specific configs if helpful.
```

3

1 reply

Reply

[![David Bui](https://miro.medium.com/v2/resize:fill:32:32/1*dmbNkD5D-u45r44go_cf0g.png)](https://medium.com/@DavidvsData?source=post_page---post_responses--98c2c79bf867----1-----------------------------------)

[David Bui](https://medium.com/@DavidvsData?source=post_page---post_responses--98c2c79bf867----1-----------------------------------)

[Jan 28](https://medium.com/@DavidvsData/when-started-using-claude-for-data-analytics-and-thought-about-this-question-thanks-cf1a4601e39f?source=post_page---post_responses--98c2c79bf867----1-----------------------------------)

Three agents were fighting over the same file

```
When started using Claude for Data Analytics and thought about this question. Thanks 🙏
```

4

1 reply

Reply

[![Vi_Sa](https://miro.medium.com/v2/resize:fill:32:32/0*DJ3QybD79IZf0mO2)](https://medium.com/@sawant.vishal.ailearning?source=post_page---post_responses--98c2c79bf867----2-----------------------------------)

[Vi\_Sa](https://medium.com/@sawant.vishal.ailearning?source=post_page---post_responses--98c2c79bf867----2-----------------------------------)

[Jan 25](https://medium.com/@sawant.vishal.ailearning/this-has-been-discussed-a-lot-on-x-recently-won-an-award-at-an-anthropic-hackathon-for-the-app-8760ac03ae1a?source=post_page---post_responses--98c2c79bf867----2-----------------------------------)

```
This has been discussed a lot on X recently - won an award at an Anthropic hackathon for the app they built using this - https://github.com/affaan-m/everything-claude-code.
```

4

Reply

See all responses

## More from Reza Rezvani

![Most Powerfull Claude Code Commands Open Source Library](https://miro.medium.com/v2/resize:fit:679/format:webp/1*miIEfGtOsp519QLZjF4P5w.png)

[![Reza Rezvani](https://miro.medium.com/v2/resize:fill:20:20/1*jDxVaEgUePd76Bw8xJrr2g.png)](https://alirezarezvani.medium.com/?source=post_page---author_recirc--98c2c79bf867----0---------------------8a87f5af_d444_42dc_8a74_0e25fc79614b--------------)

[Reza Rezvani](https://alirezarezvani.medium.com/?source=post_page---author_recirc--98c2c79bf867----0---------------------8a87f5af_d444_42dc_8a74_0e25fc79614b--------------)

[**10 Claude Code Commands That Cut My Dev Time 60%: A Practical Guide**\\
\\
**Custom slash commands, subagents, and automation workflows that transformed my team’s productivity — with copy-paste templates you can use**](https://alirezarezvani.medium.com/10-claude-code-commands-that-cut-my-dev-time-60-a-practical-guide-60036faed17f?source=post_page---author_recirc--98c2c79bf867----0---------------------8a87f5af_d444_42dc_8a74_0e25fc79614b--------------)

Nov 20, 2025

[A clap icon1.96K\\
\\
A response icon37](https://alirezarezvani.medium.com/10-claude-code-commands-that-cut-my-dev-time-60-a-practical-guide-60036faed17f?source=post_page---author_recirc--98c2c79bf867----0---------------------8a87f5af_d444_42dc_8a74_0e25fc79614b--------------)

![Claude Code Sessions Running in Parallel Terminal](https://miro.medium.com/v2/resize:fit:679/format:webp/1*XC9iKeKFuOtxzOe6wd-tYg.png)

[![Reza Rezvani](https://miro.medium.com/v2/resize:fill:20:20/1*jDxVaEgUePd76Bw8xJrr2g.png)](https://alirezarezvani.medium.com/?source=post_page---author_recirc--98c2c79bf867----1---------------------8a87f5af_d444_42dc_8a74_0e25fc79614b--------------)

[Reza Rezvani](https://alirezarezvani.medium.com/?source=post_page---author_recirc--98c2c79bf867----1---------------------8a87f5af_d444_42dc_8a74_0e25fc79614b--------------)

[**I Took Boris Cherny (the Creator of Claude Code) at His Word — Here Is What 4 Days of Following His…**\\
\\
**Implementing Boris Cherny’s Claude Code workflow tips on a real side project — what worked, what did not, and the highest-leverage change.**](https://alirezarezvani.medium.com/i-took-boris-cherny-the-creator-of-claude-code-at-his-word-here-is-what-4-days-of-following-his-1b660da12400?source=post_page---author_recirc--98c2c79bf867----1---------------------8a87f5af_d444_42dc_8a74_0e25fc79614b--------------)

Mar 4

[A clap icon649\\
\\
A response icon15](https://alirezarezvani.medium.com/i-took-boris-cherny-the-creator-of-claude-code-at-his-word-here-is-what-4-days-of-following-his-1b660da12400?source=post_page---author_recirc--98c2c79bf867----1---------------------8a87f5af_d444_42dc_8a74_0e25fc79614b--------------)

![How to avoid mistakes with CLAUDE.md](https://miro.medium.com/v2/resize:fit:679/format:webp/1*IRJMOu0mbNgSChGfTBQpUg.png)

[![Reza Rezvani](https://miro.medium.com/v2/resize:fill:20:20/1*jDxVaEgUePd76Bw8xJrr2g.png)](https://alirezarezvani.medium.com/?source=post_page---author_recirc--98c2c79bf867----2---------------------8a87f5af_d444_42dc_8a74_0e25fc79614b--------------)

[Reza Rezvani](https://alirezarezvani.medium.com/?source=post_page---author_recirc--98c2c79bf867----2---------------------8a87f5af_d444_42dc_8a74_0e25fc79614b--------------)

[**Your CLAUDE.md Is Probably Wrong: 7 Mistakes Boris Cherny Never Makes**\\
\\
**Boris Cherny’s file is 2.5k tokens. Mine was 15k. After 3 weeks studying his workflow, I found the patterns most developers miss — and how…**](https://alirezarezvani.medium.com/your-claude-md-is-probably-wrong-7-mistakes-boris-cherny-never-makes-6d3e5e41f4b7?source=post_page---author_recirc--98c2c79bf867----2---------------------8a87f5af_d444_42dc_8a74_0e25fc79614b--------------)

Jan 23

[A clap icon1.97K\\
\\
A response icon24](https://alirezarezvani.medium.com/your-claude-md-is-probably-wrong-7-mistakes-boris-cherny-never-makes-6d3e5e41f4b7?source=post_page---author_recirc--98c2c79bf867----2---------------------8a87f5af_d444_42dc_8a74_0e25fc79614b--------------)

![OpenClaw terminal showing automated cron job output with morning briefing and night scout timestamps — self-hosted AI assistant running 30 scheduled prompts](https://miro.medium.com/v2/resize:fit:679/format:webp/1*lpCODB65LBeODE8jiz_LWg.png)

[![Reza Rezvani](https://miro.medium.com/v2/resize:fill:20:20/1*jDxVaEgUePd76Bw8xJrr2g.png)](https://alirezarezvani.medium.com/?source=post_page---author_recirc--98c2c79bf867----3---------------------8a87f5af_d444_42dc_8a74_0e25fc79614b--------------)

[Reza Rezvani](https://alirezarezvani.medium.com/?source=post_page---author_recirc--98c2c79bf867----3---------------------8a87f5af_d444_42dc_8a74_0e25fc79614b--------------)

[**30 OpenClaw Automation Prompts That Turn a AI Assistant Into a 24/7 Autonomous AI Companion (My…**\\
\\
**SOUL.md templates, cron schedules, security guardrails, and multi-agent patterns — every configuration file I run in production on a VPS…**](https://alirezarezvani.medium.com/30-openclaw-automation-prompts-that-turn-a-ai-assistant-into-a-24-7-autonomous-ai-companion-my-ca44430f4df6?source=post_page---author_recirc--98c2c79bf867----3---------------------8a87f5af_d444_42dc_8a74_0e25fc79614b--------------)

Feb 25

[A clap icon663\\
\\
A response icon9](https://alirezarezvani.medium.com/30-openclaw-automation-prompts-that-turn-a-ai-assistant-into-a-24-7-autonomous-ai-companion-my-ca44430f4df6?source=post_page---author_recirc--98c2c79bf867----3---------------------8a87f5af_d444_42dc_8a74_0e25fc79614b--------------)

[See all from Reza Rezvani](https://alirezarezvani.medium.com/?source=post_page---author_recirc--98c2c79bf867---------------------------------------)

## Recommended from Medium

![I Stopped Vibe Coding and Started “Prompt Contracts” — Claude Code Went From Gambling to Shipping](https://miro.medium.com/v2/resize:fit:679/format:webp/1*6TZIJcVvtjnJ8olzmqrCzQ.png)

[![Phil | Rentier Digital](https://miro.medium.com/v2/resize:fill:20:20/1*8_UYeI21v_IBgt9VUGxsPg.png)](https://medium.com/@rentierdigital?source=post_page---read_next_recirc--98c2c79bf867----0---------------------6ffd91a9_90a0_4a4d_a7ff_79b724d51cfa--------------)

[Phil \| Rentier Digital](https://medium.com/@rentierdigital?source=post_page---read_next_recirc--98c2c79bf867----0---------------------6ffd91a9_90a0_4a4d_a7ff_79b724d51cfa--------------)

[**I Stopped Vibe Coding and Started “Prompt Contracts” — Claude Code Went From Gambling to Shipping**\\
\\
**Last Tuesday at 2 AM, I deleted 2,400 lines of code that Claude Code had just generated for me.**](https://medium.com/@rentierdigital/i-stopped-vibe-coding-and-started-prompt-contracts-claude-code-went-from-gambling-to-shipping-4080ef23efac?source=post_page---read_next_recirc--98c2c79bf867----0---------------------6ffd91a9_90a0_4a4d_a7ff_79b724d51cfa--------------)

Feb 10

[A clap icon3.5K\\
\\
A response icon93](https://medium.com/@rentierdigital/i-stopped-vibe-coding-and-started-prompt-contracts-claude-code-went-from-gambling-to-shipping-4080ef23efac?source=post_page---read_next_recirc--98c2c79bf867----0---------------------6ffd91a9_90a0_4a4d_a7ff_79b724d51cfa--------------)

![Claude Code Roadmap — Featured Image](https://miro.medium.com/v2/resize:fit:679/format:webp/1*CDrAAlpRM-fjw9ed1Ln5_w.png)

[![Joe Njenga](https://miro.medium.com/v2/resize:fill:20:20/1*0Hoc7r7_ybnOvk1t8yR3_A.jpeg)](https://medium.com/@joe.njenga?source=post_page---read_next_recirc--98c2c79bf867----1---------------------6ffd91a9_90a0_4a4d_a7ff_79b724d51cfa--------------)

[Joe Njenga](https://medium.com/@joe.njenga?source=post_page---read_next_recirc--98c2c79bf867----1---------------------6ffd91a9_90a0_4a4d_a7ff_79b724d51cfa--------------)

[**Claude Code Roadmap: How I Would Learn Claude Code ( If I Started All Over Again )**\\
\\
**You are learning Claude Code the wrong way, and that's why you are not getting the results you want. Here is the complete roadmap to master**](https://medium.com/@joe.njenga/claude-code-roadmap-how-i-would-learn-claude-code-if-i-started-all-over-again-f29a979228d8?source=post_page---read_next_recirc--98c2c79bf867----1---------------------6ffd91a9_90a0_4a4d_a7ff_79b724d51cfa--------------)

Nov 7, 2025

[A clap icon658\\
\\
A response icon6](https://medium.com/@joe.njenga/claude-code-roadmap-how-i-would-learn-claude-code-if-i-started-all-over-again-f29a979228d8?source=post_page---read_next_recirc--98c2c79bf867----1---------------------6ffd91a9_90a0_4a4d_a7ff_79b724d51cfa--------------)

![10 Must-Have Skills for Claude (and Any Coding Agent) in 2026](https://miro.medium.com/v2/resize:fit:679/format:webp/1*5Nup6r8Erd-5lEhYbscyJA.png)

[![unicodeveloper](https://miro.medium.com/v2/resize:fill:20:20/0*-kqhhb24fzA5QqSY.jpeg)](https://medium.com/@unicodeveloper?source=post_page---read_next_recirc--98c2c79bf867----0---------------------6ffd91a9_90a0_4a4d_a7ff_79b724d51cfa--------------)

[unicodeveloper](https://medium.com/@unicodeveloper?source=post_page---read_next_recirc--98c2c79bf867----0---------------------6ffd91a9_90a0_4a4d_a7ff_79b724d51cfa--------------)

[**10 Must-Have Skills for Claude (and Any Coding Agent) in 2026**\\
\\
**The definitive guide to agent skills that change how Claude Code, Cursor, Gemini CLI, and other AI coding assistants perform in production.**](https://medium.com/@unicodeveloper/10-must-have-skills-for-claude-and-any-coding-agent-in-2026-b5451b013051?source=post_page---read_next_recirc--98c2c79bf867----0---------------------6ffd91a9_90a0_4a4d_a7ff_79b724d51cfa--------------)

Mar 9

[A clap icon784\\
\\
A response icon9](https://medium.com/@unicodeveloper/10-must-have-skills-for-claude-and-any-coding-agent-in-2026-b5451b013051?source=post_page---read_next_recirc--98c2c79bf867----0---------------------6ffd91a9_90a0_4a4d_a7ff_79b724d51cfa--------------)

![Build Your First Claude Code Agent Skill: A Simple Project Memory System That Saves Hours](https://miro.medium.com/v2/resize:fit:679/format:webp/1*O2_piSNfbAuTTlXEy4i-oA.png)

[![Artificial Intelligence in Plain English](https://miro.medium.com/v2/resize:fill:20:20/1*9zAmnK08gUCmZX7q0McVKw@2x.png)](https://ai.plainenglish.io/?source=post_page---read_next_recirc--98c2c79bf867----1---------------------6ffd91a9_90a0_4a4d_a7ff_79b724d51cfa--------------)

In

[Artificial Intelligence in Plain English](https://ai.plainenglish.io/?source=post_page---read_next_recirc--98c2c79bf867----1---------------------6ffd91a9_90a0_4a4d_a7ff_79b724d51cfa--------------)

by

[Rick Hightower](https://medium.com/@richardhightower?source=post_page---read_next_recirc--98c2c79bf867----1---------------------6ffd91a9_90a0_4a4d_a7ff_79b724d51cfa--------------)

[**Build Your First Claude Code Agent Skill: A Simple Project Memory System That Saves Hours**\\
\\
**How a 300-line skill became my most-used productivity tool for AI-assisted development.**](https://medium.com/@richardhightower/build-your-first-claude-code-skill-a-simple-project-memory-system-that-saves-hours-1d13f21aff9e?source=post_page---read_next_recirc--98c2c79bf867----1---------------------6ffd91a9_90a0_4a4d_a7ff_79b724d51cfa--------------)

Jan 12

[A clap icon1.2K\\
\\
A response icon28](https://medium.com/@richardhightower/build-your-first-claude-code-skill-a-simple-project-memory-system-that-saves-hours-1d13f21aff9e?source=post_page---read_next_recirc--98c2c79bf867----1---------------------6ffd91a9_90a0_4a4d_a7ff_79b724d51cfa--------------)

![Local LLMs That Can Replace Claude Code](https://miro.medium.com/v2/resize:fit:679/format:webp/0*JpX_vOrpLzFhJfJM.png)

[![Agent Native](https://miro.medium.com/v2/resize:fill:20:20/1*dt5tcaKMBhB6JboQ9lIEAA.jpeg)](https://agentnativedev.medium.com/?source=post_page---read_next_recirc--98c2c79bf867----2---------------------6ffd91a9_90a0_4a4d_a7ff_79b724d51cfa--------------)

[Agent Native](https://agentnativedev.medium.com/?source=post_page---read_next_recirc--98c2c79bf867----2---------------------6ffd91a9_90a0_4a4d_a7ff_79b724d51cfa--------------)

[**Local LLMs That Can Replace Claude Code**\\
\\
**Editor’s note: While hardware tiers remain valuable context for this article, we’ve published an updated list for the models themselves:**](https://agentnativedev.medium.com/local-llms-that-can-replace-claude-code-6f5b6cac93bf?source=post_page---read_next_recirc--98c2c79bf867----2---------------------6ffd91a9_90a0_4a4d_a7ff_79b724d51cfa--------------)

Jan 20

[A clap icon1.7K\\
\\
A response icon51](https://agentnativedev.medium.com/local-llms-that-can-replace-claude-code-6f5b6cac93bf?source=post_page---read_next_recirc--98c2c79bf867----2---------------------6ffd91a9_90a0_4a4d_a7ff_79b724d51cfa--------------)

![How to avoid mistakes with CLAUDE.md](https://miro.medium.com/v2/resize:fit:679/format:webp/1*IRJMOu0mbNgSChGfTBQpUg.png)

[![Reza Rezvani](https://miro.medium.com/v2/resize:fill:20:20/1*jDxVaEgUePd76Bw8xJrr2g.png)](https://alirezarezvani.medium.com/?source=post_page---read_next_recirc--98c2c79bf867----3---------------------6ffd91a9_90a0_4a4d_a7ff_79b724d51cfa--------------)

[Reza Rezvani](https://alirezarezvani.medium.com/?source=post_page---read_next_recirc--98c2c79bf867----3---------------------6ffd91a9_90a0_4a4d_a7ff_79b724d51cfa--------------)

[**Your CLAUDE.md Is Probably Wrong: 7 Mistakes Boris Cherny Never Makes**\\
\\
**Boris Cherny’s file is 2.5k tokens. Mine was 15k. After 3 weeks studying his workflow, I found the patterns most developers miss — and how…**](https://alirezarezvani.medium.com/your-claude-md-is-probably-wrong-7-mistakes-boris-cherny-never-makes-6d3e5e41f4b7?source=post_page---read_next_recirc--98c2c79bf867----3---------------------6ffd91a9_90a0_4a4d_a7ff_79b724d51cfa--------------)

Jan 23

[A clap icon1.97K\\
\\
A response icon24](https://alirezarezvani.medium.com/your-claude-md-is-probably-wrong-7-mistakes-boris-cherny-never-makes-6d3e5e41f4b7?source=post_page---read_next_recirc--98c2c79bf867----3---------------------6ffd91a9_90a0_4a4d_a7ff_79b724d51cfa--------------)

[See more recommendations](https://medium.com/?source=post_page---read_next_recirc--98c2c79bf867---------------------------------------)

[Help](https://help.medium.com/hc/en-us?source=post_page-----98c2c79bf867---------------------------------------)

[Status](https://status.medium.com/?source=post_page-----98c2c79bf867---------------------------------------)

[About](https://medium.com/about?autoplay=1&source=post_page-----98c2c79bf867---------------------------------------)

[Careers](https://medium.com/jobs-at-medium/work-at-medium-959d1a85284e?source=post_page-----98c2c79bf867---------------------------------------)

[Press](mailto:pressinquiries@medium.com)

[Blog](https://blog.medium.com/?source=post_page-----98c2c79bf867---------------------------------------)

[Privacy](https://policy.medium.com/medium-privacy-policy-f03bf92035c9?source=post_page-----98c2c79bf867---------------------------------------)

[Rules](https://policy.medium.com/medium-rules-30e5502c4eb4?source=post_page-----98c2c79bf867---------------------------------------)

[Terms](https://policy.medium.com/medium-terms-of-service-9db0094a1e0f?source=post_page-----98c2c79bf867---------------------------------------)

[Text to speech](https://speechify.com/medium?source=post_page-----98c2c79bf867---------------------------------------)

reCAPTCHA

Recaptcha requires verification.

[Privacy](https://www.google.com/intl/en/policies/privacy/) \- [Terms](https://www.google.com/intl/en/policies/terms/)

protected by **reCAPTCHA**

[Privacy](https://www.google.com/intl/en/policies/privacy/) \- [Terms](https://www.google.com/intl/en/policies/terms/)