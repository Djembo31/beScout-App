[Sitemap](https://medium.com/sitemap/sitemap.xml)

[Open in app](https://play.google.com/store/apps/details?id=com.medium.reader&referrer=utm_source%3DmobileNavBar&source=post_page---top_nav_layout_nav-----------------------------------------)

Sign up

[Sign in](https://medium.com/m/signin?operation=login&redirect=https%3A%2F%2Fmedium.com%2F%40ilyas.ibrahim%2Fhow-i-made-claude-code-agents-coordinate-100-and-solved-context-amnesia-5938890ea825&source=post_page---top_nav_layout_nav-----------------------global_nav------------------)

[Medium Logo](https://medium.com/?source=post_page---top_nav_layout_nav-----------------------------------------)

Get app

[Write](https://medium.com/m/signin?operation=register&redirect=https%3A%2F%2Fmedium.com%2Fnew-story&source=---top_nav_layout_nav-----------------------new_post_topnav------------------)

[Search](https://medium.com/search?source=post_page---top_nav_layout_nav-----------------------------------------)

Sign up

[Sign in](https://medium.com/m/signin?operation=login&redirect=https%3A%2F%2Fmedium.com%2F%40ilyas.ibrahim%2Fhow-i-made-claude-code-agents-coordinate-100-and-solved-context-amnesia-5938890ea825&source=post_page---top_nav_layout_nav-----------------------global_nav------------------)

![](https://miro.medium.com/v2/resize:fill:32:32/1*dmbNkD5D-u45r44go_cf0g.png)

# How I Made Claude Code Agents Coordinate 100% and Solved Context Amnesia

[![Ilyas Ibrahim Mohamed](https://miro.medium.com/v2/resize:fill:32:32/1*dmbNkD5D-u45r44go_cf0g.png)](https://medium.com/@ilyas.ibrahim?source=post_page---byline--5938890ea825---------------------------------------)

[Ilyas Ibrahim Mohamed](https://medium.com/@ilyas.ibrahim?source=post_page---byline--5938890ea825---------------------------------------)

Follow

16 min read

·

Nov 16, 2025

104

3

[Listen](https://medium.com/m/signin?actionUrl=https%3A%2F%2Fmedium.com%2Fplans%3Fdimension%3Dpost_audio_button%26postId%3D5938890ea825&operation=register&redirect=https%3A%2F%2Fmedium.com%2F%40ilyas.ibrahim%2Fhow-i-made-claude-code-agents-coordinate-100-and-solved-context-amnesia-5938890ea825&source=---header_actions--5938890ea825---------------------post_audio_button------------------)

Share

Press enter or click to view image in full size

![](https://miro.medium.com/v2/resize:fit:700/1*fb18n15Eu2IwELvioRax7w.png)

Claude Code coordinating multiple agents to implement fixes from my code audit

I often click on YouTube videos or read Medium articles promising groundbreaking solutions, only to feel let down. The titles grab attention, but the content rarely lives up to the hype. I’m in the minority who holds these materials to their word, and I frequently find that they miss a crucial step. They’re geared toward showcasing the creator’s achievements rather than truly benefiting the audience.

There’s no shortage of great content out there, but much of it is aimed at signaling expertise than sharing knowledge. This article, however, will do exactly what it promises. I’ll share what I did, how I did it, and most importantly, why it matters. You can skip ahead to the GitHub link at the end to directly adapt the workflow to your project, but I recommend reading the full article. This way, you’ll understand the problems I faced, the steps I took to find a solution, and how to avoid making the same mistakes.

## Working with a Low-Resource Language

I’m currently working on a classifier for a low-resource language, and this type of language has a significant issue when translated into English. Translation tools like Google Translate and LLMs often work well for formal language but fall short with informal or colloquial usage. This problem is even more glaring on online platforms like TikTok and Threads, where most users don’t speak in formal language. The result is poor translations, and more importantly, it’s a matter of accessibility and inclusiveness for speakers of these languages in the digital and AI space.

While this is a huge problem, I’ve decided to start small. My goal is to build a model that at least differentiates between formal and colloquial language. It’s a manageable problem, and if I can make it work, it could be a step toward improving AI inclusiveness in the long run.

## Collaboration with Claude Code

As I work through this project, I realize that while I’m proficient in coding, I’m not a coding “ninja.” I know my way around, but this is one of those projects where I needed help to move faster — weeks instead of months. That’s where Claude Code came in.

I’ll admit, I’m the type of person who prefers learning by doing. When I get a new tool, I experiment first. I try to make it work, break it, and learn from the mistakes, referencing the documentation only when necessary. With tools that are expensive or risky, I’ll start with the documentation, but for most tools, I learn by doing.

This method, however, didn’t work as well with Claude Code. It’s a tool with a steep price tag, so I expected it to work like magic. Unfortunately, that wasn’t the case. But the good news is, this forced me to take a step back and figure out how to use it more effectively.

Right from the beginning, I had three critical questions that shaped my exploration of Claude Code’s capabilities:

1\. **How do Claude Code agents work?** What’s the process for designing them, and how flexible is it?

2\. **Can these agents coordinate?** If so, how does this coordination work, and what expectations should I have to make it successful?

3\. **What knowledge do these agents need about my project?** How do they acquire it, and can I make this knowledge persistent?

## Excitement And Frustrations with Sub-Agents

I was initially very excited about the idea of sub-agents in Claude Code. I created 26 agents to handle everything from the end-to-end machine learning pipeline to the dashboard and site functionality. I even gave them real-world titles, thinking of myself as some kind of Principal Engineer overseeing this complex network of agents. It felt empowering. Claude Code promised that I could simply specify tasks, and the agents would take it from there.

But as you might guess, things didn’t go according to plan. The idea of throwing 5 to 9 agents at a problem at once seemed perfect — in theory. These agents could work in parallel, performing their tasks quickly and efficiently. However, the reality was far from ideal.

There were two main problems I encountered:

1\. **The main Claude agent didn’t coordinate** and would often try to do the task on its own, without engaging the specialized sub-agents. It was simple to resolve. All I had to do was interrupt and tell it to engage the specialized agents by adding their names to the prompt. But that wasn’t the real issue.

2\. **The more serious issue was the lack of collaboration between agents.** Even when the agents worked together, they weren’t referencing each other’s work. They would produce useful plans and reports, but these reports weren’t cross-referenced. They were isolated pieces of work, which created significant inefficiency. The result was duplication, with agents unaware of each other’s progress, leading to wasted time and resources.

So, after each task, I would go through the hundreds of lines of documents created by various agents, checking for gaps and ensuring nothing was overlooked. If I noticed anything missing, I’d add it to the tasks. The reports piled up quickly, so I had to manage everything by cleaning up the directory to keep things organized.

While it was technically feasible to automate the cleanup and report revisions (comparing tasks with completed reports), the real problem wasn’t about automation. It was about the incoherence between the agents. If only they had coordinated better, much of this cleanup could have been avoided.

## Coordination Through Agent-Memory-Protocol

After realizing the lack of coordination, I decided to help Claude Code overcome its habit of forgetting so it could better assist me. The solution was to introduce an **Agent-Memory-Protocol**. **I created a**`.md` **file under**`.claude` **in the project directory, hoping to provide a clear structure for agents to follow, including using registries and updating reports after completing tasks. The idea was simple. Each agent would check the registry for previous work and provide the necessary context before starting new tasks**.

So unlike the static **Claude.md** file, which requires manual updates, the Agent-Memory-Protocol is dynamic. It provides a continuously updating knowledge source, ensuring agents maintain context across tasks without relying on user intervention.

When the protocol worked as intended, it solved many of the problems. The agents knew exactly where to store their work and how to update it, all while incorporating the protocol into their respective .md files. They would check the Agent-Memory-Protocol and follow it. This is what the design looked like:

At user level:

```
~/.claude/
├── agents/ (26 files)
│ ├── ml-projects-orchestrator.md
│ ├── mlops-pipeline-orchestrator.md
│ ├── pipeline-orchestrator.md
│ ├── data-analyst.md
│ ├── data-collector.md
│ ├── data-preprocessor.md
│ ├── data-visualization-specialist.md
│ ├── lrl-nlp-expert.md
│ ├── model-trainer.md
│ ├── model-evaluator.md
│ ├── model-deployer.md
│ ├── model-monitor.md
│ ├── frontend-engineer.md
│ ├── backend-engineer.md
│ ├── code-reviewer.md
│ ├── code-debugger.md
│ ├── test-runner.md
│ ├── qa-test-engineer.md
│ ├── devops-engineer.md
│ ├── git-specialist.md
│ ├── ux-ui-designer.md
│ ├── ux-ui-expert.md
│ ├── ux-writer.md
│ ├── system-architect.md
│ ├── documentation-writer.md
│ └── webdev-documentation-writer.md
└── (no skills, no commands, no output styles)
```

At project level:

```
~/.claude/
├── AGENT_MEMORY_POLICY.md
├── DESIGN_SYSTEM.md
├── STYLE_GUIDE.md
├── UX_WRITING_GUIDE.md
├── reports/
│ ├── _registry.md
│ ├── analysis/
│ ├── arch/
│ ├── bugs/
│ ├── design/
│ ├── implementation/
│ ├── review/
│ └── tests/
└── archive/
```

However, this approach didn’t always work. Sometimes Claude Code would ignore the protocol entirely, or it would access it only half the time. The other issue was that the protocol, while helpful, was very slow, which signaled that I needed to reconsider my approach to agent communication and efficiency.

So I searched for a better solution, and **evidently, coordination itself isn’t the end goal. It’s the outcomes of coordination that truly matter, including iteration. Context, in this case, was the key. Just as humans make better decisions when they see the whole picture, context broadens judgment, and coordination broadens context. Artificial intelligence, like humans, thrives when it has the right context.**

I wasn’t talking about context in the traditional transformer sense of token sequencing, though that still might be relevant. Rather, I was thinking of context in a functional sense: **how much of the conversation a model can retain while working within the same session or across different sessio** ns. This realization led me to transform my workflow in a fundamental way. I can confidently say that this transformation became the key shift, with all other improvements iterating around it until I arrived at the working solution.

## Transforming Claude Code Workflow

Though my first experiments were failing, I began to see them as clear signals pointing to a version of this setup where programmers could suffer less. At this point, I hadn’t yet explored Slash Commands or the newly launched Claude Skills (which had only been out for two weeks). I had planned to defer those until after my initial experiments. However, it became clear that my agents needed to be “skilled” to achieve the coordination I envisioned.

After thoroughly analyzing my 26 user-level agents, project configuration, and coordination mechanisms, I identified significant opportunities to streamline my workflow. This promised to reduce the complexity of the previous design by more than 60% (though not exact, it was at least based on factors like information sharing, documents, and agents involved), improve discoverability, and leverage Claude Code’s native features more effectively.

The inefficiencies were evident. There was repetitive sections across all agents, each having identical branding policies and memory check sections (over 50 lines each — imagine the overhead). Documents like `STYLE_GUIDE`, `DESIGN_SYSTEM`, and `UX_WRITING_GUIDE` were often misplaced as reference documents (missed most of the time by agents) rather than skills. Also, agents were manually checking memory policies when Claude Code could automatically provide context. Additionally, I could have used quick actions for common workflows (commit, review, test) instead of relying on verbose agent invocations. I didn’t want to leave any stone unturned, which led to creating three orchestrators: `ml-projects-orchestrator`, `mlops-pipeline-orchestrator`, and `pipeline-orchestrator`, all with overlapping responsibilities.

Seeing this, I decided to start with the major change: simplifying the agents and consolidating similar ones. My goal was to reduce cognitive load by interacting with only 8 core agents, who would intelligently delegate tasks to specialized sub-agents defined within their bodies. (Yes, you heard that right.) The idea was that statements like “call upon sub-agent X if the task is Y” would work. Little did I know, I was asking for trouble by devising something Claude was never designed to handle.

## Get Ilyas Ibrahim Mohamed’s stories in your inbox

Join Medium for free to get updates from this writer.

Subscribe

Subscribe

Remember me for faster sign in

Next, I leveraged Claude Skills and converted guides into auto-invoked skills for just-in-time knowledge. I embedded the agent-management-protocol as a skill within the core agents, allowing them to trigger the skills when needed using keywords like “coordination” or by directly referring to the skill. Additionally, **I added sequencing and paralleling rules to the agent-management-protocol to determine when tasks should be sequenced or run in parallel. I also introduced a verification gate to ensure agents followed the protocol and created the reports they claimed**. Also, I used slash commands to create shortcuts for high-frequency workflows, and I employed output styles to standardize deliverable formats (reports, reviews, commits). For the rest, I relied on Claude Code’s native context awareness.

### The Bold Move To Bypass the Main Claude Agent

I won’t deny that my approach with the agents was a bold attempt to bypass the main Claude Agent. It wasn’t exactly a “ **control-plane takeover”**, but if it had been, it was poorly executed and short-lived. My agents and I were fed up with being at the mercy of the main Claude Agent, so we were open to all options in our pursuit of autonomy. I even made my agents absorb their cousins to grow stronger. Below is what each new core agent has in its .md file (with at least two or three subagents that it can call upon for specialized tasks):

```
ml-projects-orchestrator + mlops-pipeline-orchestrator = ml-orchestrator
data-analyst + data-collector + data-preprocessor = data-engineer
frontend-engineer + backend-engineer = full-stack-engineer
code-reviewer + code-debugger + test-runner + qa-test-engineer = code-quality
devops-engineer + git-specialist = devops-specialist
ux-ui-designer + ux-ui-expert + ux-writer = ux-designer
system-architect + pipeline-orchestrator = architect
documentation-writer + webdev-documentation-writer = documentation
```

At the **user** **level**, my .claude/ folder now looked like this:

```
~/.claude/
├── agents/ (8 files)
│ ├── ml-orchestrator.md
│ ├── data-engineer.md
│ ├── full-stack-engineer.md
│ ├── code-quality.md
│ ├── devops-specialist.md
│ ├── ux-designer.md
│ ├── architect.md
│ └── documentation.md
├── skills/
│ ├── design-system/SKILL.md
│ ├── style-guide/SKILL.md
│ ├── ux-writing/SKILL.md
│ └── agent-memory-protocol/SKILL.md
├── commands/
│ ├── commit.md
│ ├── review.md
│ ├── test.md
│ ├── design-review.md
│ ├── ml/
│ │ └── run.md
│ ├── data/
│ │ └── analyze.md
│ └── deploy.md
└── output-styles/
 ├── technical-report.md
 ├── code-review.md
 ├── design-review.md
 ├── test-report.md
 ├── commit-message.md
 └── handoff-document.md
```

At **project level**:

```
~/.claude/
├── skills/ (project-specific)
│ ├── data-engineering/
│ │ ├── data-quality-standards/SKILL.md
│ │ └── etl-patterns/SKILL.md
│ ├── machine-learning/
│ │ ├── lrl-nlp-techniques/SKILL.md
│ │ ├── model-evaluation-framework/SKILL.md
│ │ └── mlops-best-practices/SKILL.md
│ └── frontend/
│ ├── dashboard-patterns/SKILL.md
│ └── accessibility-checklist/SKILL.md
├── reports/ (unchanged)
│ ├── _registry.md
│ ├── analysis/
│ ├── arch/
│ ├── bugs/
│ ├── design/
│ ├── implementation/
│ ├── review/
│ └── tests/
└── archive/ (unchanged)
```

### Not So Autonomous

At this point, I have something to celebrate. My agents and I have conquered and tamed Claude Code. The coordination and institutional memory have measurably improved. However, paradoxically, this came with worse context consumption. While I’m now working with only the core 8 agents, the sub-agent design I initially used within them wasn’t the right fit. Essentially, the core agents would act as decision-makers. For example, when I wrote something like this in the body of the `architect` agent and there were no subagents, it would simply perform the work as a system-architect or pipeline-orchestrator, depending on the task.

```
Delegate to system-architect when:
· Complex system design decisions are needed
· Detailed technical specifications are required
· Architecture documentation is needed
· Technology stack evaluation is required
Delegate to pipeline-orchestrator when:
· Data/ML pipeline architecture is needed
· Workflow coordination design is required
· Multi-step process orchestration is needed
```

Despite improving coordination, I noticed that context consumption still wasn’t ideal. Every invocation loaded a sizeable amount of lines. When I requested, “mobilize specialized agents in line with agent-memory-protocol,” Claude (i.e. the main agent) couldn’t determine whether to invoke the coordinators to load the skills (which was my plan) or invoke the skill first, then proceed to agents (which shouldn’t have happened, but descriptions might have been a better match).

This confusion meant that the agent-management-protocol was repeatedly loaded by each agent with 850 lines of context. The main Claude Agent was still part of the process, meaning the workload was doubled whenever agents worked.

For a simple task, here’s what happened:

```
Request: "Mobilize specialized agents to build feature X in line with agent-memory-protocol"
· Main Claude Agent: Sees trigger words → Auto-loads agent-memory-protocol (850 lines) + registry (~500+ lines) + prior reports (~2,000+ lines)
· Coordinator Agent(s): Sees trigger words → Auto-loads agent-memory-protocol AGAIN (850 lines) + registry (~500+ lines) + prior reports (~2,000+ lines)
· Coordinator Agent(s): Develops plans (~300+ lines) + implements + generates implementation reports (~400+ lines) + updates registry (~100+ lines)
```

This cycle continued, and the main Claude Agent kept verifying and reading through all the reports to ensure they were created and met the objectives.

## Reducing Redundancy and the Cost of Autonomy

It didn’t sit well with me to have the agent-management-protocol loaded several times. I knew this wouldn’t scale as tasks became more complex. Also, the verification process was never meant to read the report. It should’ve only verified the existence, size, and word count using bash commands. Furthermore, I wanted the core agents to call upon real agents that existed in the `agents/` directory. So, I decided to cut out the middleman and compressed the agent-management-protocol into around 280 lines (a 67% reduction), covering the essentials, including reporting templates, registry conventions, sequencing and parallelism rules, and verification patterns for quality assurance. I removed examples, matrices, checklists, and verbose explanations.

Across all eight coordinator roles, I focused the definitions on what genuinely mattered, resulting in an average reduction of 73% in length. Here’s the breakdown:

- `architect`: 216 to 47 lines (78%)
- `code-quality`: 177 to 48 lines (73%)
- `data-engineer`: 145 to 49 lines (66%)
- `devops-specialist`: 185 to 48 lines (74%)
- `documentation`: 279 to 51 lines (82%)
- `full-stack-engineer`: 147 to 49 lines (67%)
- `ml-orchestrator`: 148 to 50 lines (66%)
- `ux-designer`: 186 to 52 lines (72%)

I also created around 23 subagents (previously referenced in the bodies of core coordinator agents), each around 25 lines in length. All of these changes were made at the user level, and the project-level structure remained the same.

At the **user level**, my `.claude/` folder now looked like this:

```
~/.claude/
├── agents/
│ ├── architect.md
│ ├── backend-engineer.md
│ ├── code-quality.md
│ ├── code-reviewer.md
│ ├── data-analyst.md
│ ├── data-collector.md
│ ├── data-engineer.md
│ ├── data-preprocessor.md
│ ├── data-viz-specialist.md
│ ├── debugger.md
│ ├── devops-engineer.md
│ ├── devops-specialist.md
│ ├── documentation-writer.md
│ ├── documentation.md
│ ├── frontend-engineer.md
│ ├── full-stack-engineer.md
│ ├── git-specialist.md
│ ├── lrl-nlp-expert.md
│ ├── ml-deployer.md
│ ├── ml-evaluator.md
│ ├── ml-orchestrator.md
│ ├── ml-trainer.md
│ ├── pipeline-orchestrator.md
│ ├── qa-engineer.md
│ ├── system-architect.md
│ ├── test-runner.md
│ ├── ux-designer.md
│ ├── ux-ui-designer.md
│ ├── ux-ui-expert.md
│ ├── ux-writer.md
│ └── webdev-documentation-writer.md
├── skills/
│ ├── design-system/SKILL.md
│ ├── style-guide/SKILL.md
│ ├── ux-writing/SKILL.md
│ └── agent-memory-protocol/SKILL.md
├── commands/
│ ├── commit.md
│ ├── review.md
│ ├── test.md
│ ├── design-review.md
│ ├── ml/
│ │ └── run.md
│ ├── data/
│ │ └── analyze.md
│ └── deploy.md
└── output-styles/
 ├── technical-report.md
 ├── code-review.md
 ├── design-review.md
 ├── test-report.md
 ├── commit-message.md
 └── handoff-document.md
```

**Despite the improvements in agent organization, this design turned out to be the worst in terms of resource consumption (both time and context)**. I cut out the middleman (the main agent), but I did something worse. Now every agent is reading everything. I stopped documenting all the issues, but the primary concern was that I had never seen Claude Code consume context like it did with this setup. My window kept compressing conversations and ran out of context in less than 15–20 minutes. This was the price of making every agent “know” almost everything.

Everything — including the protocol, reports, registries, etc. — was loaded when subagents worked, in numbers equivalent to the agents assigned to the task, as each had to access those documents. Additionally, the full-stack-engineer couldn’t share context in the form of bite-sized tasks with the frontend-engineer and backend-engineer as their coordinator, so they could report back to it in a way that consolidated their work. This doesn’t work like that in Claude. So, this design works best only if a single agent handles the task. In that case, you don’t even need the idea of subagents.

**This experience taught me the biggest lesson. I should have identified the highest-impact optimization first. While compressing the agent-management-protocol saved about 60%, addressing the auto-invoke issue would have saved far more**. If I wanted to load it only once, there was only one way to achieve that.

## A Deal with the Main Claude Agent

Eventually, the main Claude Agent and I restored order to our work environment. I realized that trying to replace the main agent would only lead to me doing its job, without saving any time or context. . None of the subagents could bypass the main agent to work effectively. Instead, I decided to focus on strategically guiding the project and having the main agent manage the tasks of the subagents, while they reported back to it.

I revised and expanded the agent-management-protocol to 370 lines and renamed it to `agent-coordination`. This version included lines to make reading registry entries more efficient without loading them each time. Since this would only be invoked by the main agent upon explicit instructions, a few dozen lines were enough. I also flattened the agents, eliminating the need for coordinators, leaving me with 22 agents and the following workflow, with the main agent handling everything:

```

┌──────────────────────────────────────────────────────────────────┐
│                    Main Claude Code Agent                        │
│                 (User-facing, coordination)                      │
│                                                                  │
│  When user says "mobilize agents":                               │
│  1. Invokes agent-memory-protocol skill (370 lines)              │
│  2. Reads project registry (.claude/reports/_registry.md)        │
│  3. Reads relevant reports (context from past work)              │
│  4. Determines which agents needed                               │
│  5. Decides parallel vs sequential execution                     │
│  6. Invokes agents with complete context                         │
│  7. Verifies deliverables                                        │
│  8. Synthesizes results                                          │
│  9. Updates registry                                             │
│  10. Reports to user                                             │
└────────────────────────┬─────────────────────────────────────────┘
                         │
                         │ Provides complete context
                         │ in task prompts
                         ▼
┌──────────────────────────────────────────────────────────────────┐
│              22 Specialized Task Agents (Flat)                   │
│                                                                  │
│  Code Quality (4):                                               │
│    code-reviewer, debugger, test-runner, qa-engineer             │
│                                                                  │
│  Architecture (2):                                               │
│    system-architect, pipeline-orchestrator                       │
│                                                                  │
│  Data (4):                                                       │
│    data-collector, data-analyst, data-preprocessor,              │
│    data-viz-specialist                                           │
│                                                                  │
│  DevOps (2):                                                     │
│    devops-engineer, git-specialist                               │
│                                                                  │
│  Documentation (2):                                              │
│    documentation-writer, webdev-documentation-writer             │
│                                                                  │
│  Implementation (2):                                             │
│    frontend-engineer, backend-engineer                           │
│                                                                  │
│  ML (4):                                                         │
│    ml-trainer, ml-evaluator, ml-deployer, lrl-nlp-expert         │
│                                                                  │
│  UX (2):                                                         │
│    ux-ui-designer, ux-writer                                     │
│                                                                  │
│  Each agent:                                                     │
│    - Receives context from main agent                            │
│    - Does specialized work                                       │
│    - Returns output to main agent                                │
│    - NEVR reads registry/reports                                 │
│    - NEVER invokes agent-memory-protocol                         │
└──────────────────────────────────────────────────────────────────┘
```

**Please refer to the GitHub for the final set of my .claude folders at both the user and project levels. It includes more than just subagents, with commands, skills, and output styles as shown above.**

[**https://github.com/ilyasibrahim/claude-agents-coordination/releases/tag/v1.0.0**](https://github.com/ilyasibrahim/claude-agents-coordination/releases/tag/v1.0.0)

**This change has carefully balanced several elements: technical correctness (aligning with what Claude Code considers the right method), my workflow value as a user (focusing on coordination and memory), performance constraints (maximizing context windows), maintainability (ensuring clear boundaries), and usability (creating clear invocation patterns)**. The results speak for themselves. I’ve increased the context window to over 2 hours, a considerable improvement from the previous 15–20 minutes.

Claude Code, and the broader field of coding agents, is changing dramatically (sometimes daily or weekly). By the time you read this, much might have evolved, and Claude Code could allow things that are unimaginable today. However, as of this writing, I have addressed the issue of context amnesia — a persistent challenge in coding agents — through improved coordination and institutional memory.

Reflecting on my journey, **I can see that efficiency gains can seem impressive when built on an unstable foundation. If your baseline is the worst version of that foundation, even small changes might look like significant progress. But rebuilding from a solid foundation brings truly unbeatable gains. This is why it’s essential to validate the architecture before jumping into optimization. Understanding the constraints of the tools you’re working with is also important before designing around them, unless you’re prepared to learn the hard way. Personally, I’ve learned far more from doing it wrong first than I would have from getting it right immediately**.

[Agentic Workflow](https://medium.com/tag/agentic-workflow?source=post_page-----5938890ea825---------------------------------------)

[Claude Code](https://medium.com/tag/claude-code?source=post_page-----5938890ea825---------------------------------------)

[Context Engineering](https://medium.com/tag/context-engineering?source=post_page-----5938890ea825---------------------------------------)

[Python](https://medium.com/tag/python?source=post_page-----5938890ea825---------------------------------------)

[Agentic Ai](https://medium.com/tag/agentic-ai?source=post_page-----5938890ea825---------------------------------------)

104

104

3

[![Ilyas Ibrahim Mohamed](https://miro.medium.com/v2/resize:fill:48:48/1*dmbNkD5D-u45r44go_cf0g.png)](https://medium.com/@ilyas.ibrahim?source=post_page---post_author_info--5938890ea825---------------------------------------)

[![Ilyas Ibrahim Mohamed](https://miro.medium.com/v2/resize:fill:64:64/1*dmbNkD5D-u45r44go_cf0g.png)](https://medium.com/@ilyas.ibrahim?source=post_page---post_author_info--5938890ea825---------------------------------------)

Follow

[**Written by Ilyas Ibrahim Mohamed**](https://medium.com/@ilyas.ibrahim?source=post_page---post_author_info--5938890ea825---------------------------------------)

[49 followers](https://medium.com/@ilyas.ibrahim/followers?source=post_page---post_author_info--5938890ea825---------------------------------------)

· [4 following](https://medium.com/@ilyas.ibrahim/following?source=post_page---post_author_info--5938890ea825---------------------------------------)

Follow

## Responses (3)

![](https://miro.medium.com/v2/resize:fill:32:32/1*dmbNkD5D-u45r44go_cf0g.png)

Write a response

[What are your thoughts?](https://medium.com/m/signin?operation=register&redirect=https%3A%2F%2Fmedium.com%2F%40ilyas.ibrahim%2Fhow-i-made-claude-code-agents-coordinate-100-and-solved-context-amnesia-5938890ea825&source=---post_responses--5938890ea825---------------------respond_sidebar------------------)

Cancel

Respond

[![Anna Kashkina](https://miro.medium.com/v2/resize:fill:32:32/0*UFjYPjC2c1XgaRmh)](https://medium.com/@anna.kashkina?source=post_page---post_responses--5938890ea825----0-----------------------------------)

[Anna Kashkina](https://medium.com/@anna.kashkina?source=post_page---post_responses--5938890ea825----0-----------------------------------)

[Jan 7](https://medium.com/@anna.kashkina/very-interesting-afebb2a7eccc?source=post_page---post_responses--5938890ea825----0-----------------------------------)

```
Very interesting! I wonder, with that much of agent-generated code, how do you still keep track of what's happening there in the codebase / do you still understand the code? Thanks!
```

1 reply

Reply

[![mergisi](https://miro.medium.com/v2/resize:fill:32:32/1*exS9Di060p0b8RzRhHZrkQ.jpeg)](https://medium.com/@mergisi?source=post_page---post_responses--5938890ea825----1-----------------------------------)

[mergisi](https://medium.com/@mergisi?source=post_page---post_responses--5938890ea825----1-----------------------------------)

[Jan 5](https://mergisi.medium.com/the-coordination-aspect-is-fascinating-especially-the-potential-for-scaling-agent-complexity-bbf6afbdb294?source=post_page---post_responses--5938890ea825----1-----------------------------------)

```
The coordination aspect is fascinating, especially the potential for scaling agent complexity without sacrificing coherence. Have you explored different prompting strategies to mitigate context amnesia beyond the 100% coordination benchmark, perhaps focusing on memory recall triggers?
```

Reply

[![Julian Alimin](https://miro.medium.com/v2/resize:fill:32:32/1*g7uDXnzYLagOTKsqB87AEg.png)](https://medium.com/@julianalimin?source=post_page---post_responses--5938890ea825----2-----------------------------------)

[Julian Alimin](https://medium.com/@julianalimin?source=post_page---post_responses--5938890ea825----2-----------------------------------)

[Jan 3](https://medium.com/@julianalimin/i-wonder-with-the-new-claude-plugins-if-there-are-already-some-templates-plugins-that-can-do-this-d84b1a2d702e?source=post_page---post_responses--5938890ea825----2-----------------------------------)

```
I wonder with the new Claude Plugins, if there are already some templates/plugins that can do this
```

1 reply

Reply

## More from Ilyas Ibrahim Mohamed

![The 4-Step Protocol That Fixes Claude Code’s Context Amnesia](https://miro.medium.com/v2/resize:fit:679/format:webp/0*KZIaMfx8DJoQLkO0.png)

[![Ilyas Ibrahim Mohamed](https://miro.medium.com/v2/resize:fill:20:20/1*dmbNkD5D-u45r44go_cf0g.png)](https://medium.com/@ilyas.ibrahim?source=post_page---author_recirc--5938890ea825----0---------------------125b2126_5d08_4c2b_96e6_84fd50d9f7e9--------------)

[Ilyas Ibrahim Mohamed](https://medium.com/@ilyas.ibrahim?source=post_page---author_recirc--5938890ea825----0---------------------125b2126_5d08_4c2b_96e6_84fd50d9f7e9--------------)

[**The 4-Step Protocol That Fixes Claude Code’s Context Amnesia**\\
\\
**Why prompt engineering alone can’t fix multi-agent coordination or context loss in Claude Code**](https://medium.com/@ilyas.ibrahim/the-4-step-protocol-that-fixes-claude-codes-context-amnesia-c3937385561c?source=post_page---author_recirc--5938890ea825----0---------------------125b2126_5d08_4c2b_96e6_84fd50d9f7e9--------------)

Nov 25, 2025

[A clap icon5\\
\\
A response icon1](https://medium.com/@ilyas.ibrahim/the-4-step-protocol-that-fixes-claude-codes-context-amnesia-c3937385561c?source=post_page---author_recirc--5938890ea825----0---------------------125b2126_5d08_4c2b_96e6_84fd50d9f7e9--------------)

![How to Build Production-Grade Systems with Claude Code](https://miro.medium.com/v2/resize:fit:679/format:webp/1*vv4KWIpuIJgu_rwIXrmH4Q.png)

[![Ilyas Ibrahim Mohamed](https://miro.medium.com/v2/resize:fill:20:20/1*dmbNkD5D-u45r44go_cf0g.png)](https://medium.com/@ilyas.ibrahim?source=post_page---author_recirc--5938890ea825----1---------------------125b2126_5d08_4c2b_96e6_84fd50d9f7e9--------------)

[Ilyas Ibrahim Mohamed](https://medium.com/@ilyas.ibrahim?source=post_page---author_recirc--5938890ea825----1---------------------125b2126_5d08_4c2b_96e6_84fd50d9f7e9--------------)

[**How to Build Production-Grade Systems with Claude Code**\\
\\
**Master Claude’s subagents coordination and delegate reviews and technical debt management seamlessly**](https://medium.com/@ilyas.ibrahim/how-to-build-production-grade-systems-with-claude-code-87f73dd311b9?source=post_page---author_recirc--5938890ea825----1---------------------125b2126_5d08_4c2b_96e6_84fd50d9f7e9--------------)

Dec 29, 2025

[A clap icon13](https://medium.com/@ilyas.ibrahim/how-to-build-production-grade-systems-with-claude-code-87f73dd311b9?source=post_page---author_recirc--5938890ea825----1---------------------125b2126_5d08_4c2b_96e6_84fd50d9f7e9--------------)

![Two Weeks into Swift Programming](https://miro.medium.com/v2/resize:fit:679/format:webp/50814f8da5bf3f0ecc414d5eeed8d40c98aa4a8f5a133d5030317044aa59e3b2)

[![Ilyas Ibrahim Mohamed](https://miro.medium.com/v2/resize:fill:20:20/1*dmbNkD5D-u45r44go_cf0g.png)](https://medium.com/@ilyas.ibrahim?source=post_page---author_recirc--5938890ea825----2---------------------125b2126_5d08_4c2b_96e6_84fd50d9f7e9--------------)

[Ilyas Ibrahim Mohamed](https://medium.com/@ilyas.ibrahim?source=post_page---author_recirc--5938890ea825----2---------------------125b2126_5d08_4c2b_96e6_84fd50d9f7e9--------------)

[**Two Weeks into Swift Programming**\\
\\
**I wrote my very first lines of code in Pascal — a language so strict and orderly it had already slipped out of industry use by the time I…**](https://medium.com/@ilyas.ibrahim/two-weeks-into-swift-programming-f97c143b6c3f?source=post_page---author_recirc--5938890ea825----2---------------------125b2126_5d08_4c2b_96e6_84fd50d9f7e9--------------)

May 19, 2025

[A clap icon5](https://medium.com/@ilyas.ibrahim/two-weeks-into-swift-programming-f97c143b6c3f?source=post_page---author_recirc--5938890ea825----2---------------------125b2126_5d08_4c2b_96e6_84fd50d9f7e9--------------)

![The Abundance Mirage: On the Promise of a Post-Work Future, the Rhetoric That Makes It Seem…](https://miro.medium.com/v2/resize:fit:679/format:webp/1*s7gIiaJX1bCg90zDLzed2Q.png)

[![Ilyas Ibrahim Mohamed](https://miro.medium.com/v2/resize:fill:20:20/1*dmbNkD5D-u45r44go_cf0g.png)](https://medium.com/@ilyas.ibrahim?source=post_page---author_recirc--5938890ea825----3---------------------125b2126_5d08_4c2b_96e6_84fd50d9f7e9--------------)

[Ilyas Ibrahim Mohamed](https://medium.com/@ilyas.ibrahim?source=post_page---author_recirc--5938890ea825----3---------------------125b2126_5d08_4c2b_96e6_84fd50d9f7e9--------------)

[**The Abundance Mirage: On the Promise of a Post-Work Future, the Rhetoric That Makes It Seem…**\\
\\
**In Stockton, California, in the winter of 2019, a woman named Laura received a debit card loaded with $500, with no strings attached, no…**](https://medium.com/@ilyas.ibrahim/the-abundance-mirage-on-the-promise-of-a-post-work-future-the-rhetoric-that-makes-it-seem-649bc324e39d?source=post_page---author_recirc--5938890ea825----3---------------------125b2126_5d08_4c2b_96e6_84fd50d9f7e9--------------)

Feb 20

[A clap icon4](https://medium.com/@ilyas.ibrahim/the-abundance-mirage-on-the-promise-of-a-post-work-future-the-rhetoric-that-makes-it-seem-649bc324e39d?source=post_page---author_recirc--5938890ea825----3---------------------125b2126_5d08_4c2b_96e6_84fd50d9f7e9--------------)

[See all from Ilyas Ibrahim Mohamed](https://medium.com/@ilyas.ibrahim?source=post_page---author_recirc--5938890ea825---------------------------------------)

## Recommended from Medium

![The Great Framework Showdown: Superpowers vs. BMAD vs. SpecKit vs. GSD](https://miro.medium.com/v2/resize:fit:679/format:webp/1*L-pvTnpXV-3uF9apsM3Tag.png)

[![Rick Hightower](https://miro.medium.com/v2/resize:fill:20:20/1*ayG9RqKzsG7gJLI0PEzHfg.jpeg)](https://medium.com/@richardhightower?source=post_page---read_next_recirc--5938890ea825----0---------------------13213e43_2177_4ce8_a605_10d224993787--------------)

[Rick Hightower](https://medium.com/@richardhightower?source=post_page---read_next_recirc--5938890ea825----0---------------------13213e43_2177_4ce8_a605_10d224993787--------------)

[**The Great Framework Showdown: Superpowers vs. BMAD vs. SpecKit vs. GSD**\\
\\
**A practitioner’s comparison of the leading agentic coding frameworks**](https://medium.com/@richardhightower/the-great-framework-showdown-superpowers-vs-bmad-vs-speckit-vs-gsd-360983101c10?source=post_page---read_next_recirc--5938890ea825----0---------------------13213e43_2177_4ce8_a605_10d224993787--------------)

Mar 16

[A clap icon344\\
\\
A response icon10](https://medium.com/@richardhightower/the-great-framework-showdown-superpowers-vs-bmad-vs-speckit-vs-gsd-360983101c10?source=post_page---read_next_recirc--5938890ea825----0---------------------13213e43_2177_4ce8_a605_10d224993787--------------)

![5 New Claude Code Slash Commands (That Are Making Workflows Better)](https://miro.medium.com/v2/resize:fit:679/format:webp/1*kd7AnDhTF_Em1jzUb4VQAw.png)

[![Joe Njenga](https://miro.medium.com/v2/resize:fill:20:20/1*0Hoc7r7_ybnOvk1t8yR3_A.jpeg)](https://medium.com/@joe.njenga?source=post_page---read_next_recirc--5938890ea825----1---------------------13213e43_2177_4ce8_a605_10d224993787--------------)

[Joe Njenga](https://medium.com/@joe.njenga?source=post_page---read_next_recirc--5938890ea825----1---------------------13213e43_2177_4ce8_a605_10d224993787--------------)

[**5 New Claude Code Slash Commands (That Are Making Workflows Better)**\\
\\
**If you have not tested the last few Claude Code updates, I understand. The rate at which Anthropic is shipping new features on Claude Code…**](https://medium.com/@joe.njenga/5-new-claude-code-slash-commands-that-are-making-workflows-better-7bd416a5859a?source=post_page---read_next_recirc--5938890ea825----1---------------------13213e43_2177_4ce8_a605_10d224993787--------------)

Mar 17

[A clap icon408\\
\\
A response icon7](https://medium.com/@joe.njenga/5-new-claude-code-slash-commands-that-are-making-workflows-better-7bd416a5859a?source=post_page---read_next_recirc--5938890ea825----1---------------------13213e43_2177_4ce8_a605_10d224993787--------------)

![10 Must-Have Skills for Claude (and Any Coding Agent) in 2026](https://miro.medium.com/v2/resize:fit:679/format:webp/1*5Nup6r8Erd-5lEhYbscyJA.png)

[![unicodeveloper](https://miro.medium.com/v2/resize:fill:20:20/0*-kqhhb24fzA5QqSY.jpeg)](https://medium.com/@unicodeveloper?source=post_page---read_next_recirc--5938890ea825----0---------------------13213e43_2177_4ce8_a605_10d224993787--------------)

[unicodeveloper](https://medium.com/@unicodeveloper?source=post_page---read_next_recirc--5938890ea825----0---------------------13213e43_2177_4ce8_a605_10d224993787--------------)

[**10 Must-Have Skills for Claude (and Any Coding Agent) in 2026**\\
\\
**The definitive guide to agent skills that change how Claude Code, Cursor, Gemini CLI, and other AI coding assistants perform in production.**](https://medium.com/@unicodeveloper/10-must-have-skills-for-claude-and-any-coding-agent-in-2026-b5451b013051?source=post_page---read_next_recirc--5938890ea825----0---------------------13213e43_2177_4ce8_a605_10d224993787--------------)

Mar 9

[A clap icon783\\
\\
A response icon9](https://medium.com/@unicodeveloper/10-must-have-skills-for-claude-and-any-coding-agent-in-2026-b5451b013051?source=post_page---read_next_recirc--5938890ea825----0---------------------13213e43_2177_4ce8_a605_10d224993787--------------)

![The Complete Guide to Claude Code: CLAUDE.md](https://miro.medium.com/v2/resize:fit:679/format:webp/1*4_bLN2_Of8H4z9xZwNxLFA.jpeg)

[![AI Advances](https://miro.medium.com/v2/resize:fill:20:20/1*R8zEd59FDf0l8Re94ImV0Q.png)](https://medium.com/ai-advances?source=post_page---read_next_recirc--5938890ea825----1---------------------13213e43_2177_4ce8_a605_10d224993787--------------)

In

[AI Advances](https://medium.com/ai-advances?source=post_page---read_next_recirc--5938890ea825----1---------------------13213e43_2177_4ce8_a605_10d224993787--------------)

by

[zhaozhiming](https://medium.com/@zhaozhiming?source=post_page---read_next_recirc--5938890ea825----1---------------------13213e43_2177_4ce8_a605_10d224993787--------------)

[**The Complete Guide to Claude Code: CLAUDE.md**\\
\\
**A comprehensive guide to the CLAUDE.md file in Claude Code, including how it is loaded, how to write it, best practices, and how it…**](https://medium.com/ai-advances/the-complete-guide-to-claude-code-claude-md-743d4cbac757?source=post_page---read_next_recirc--5938890ea825----1---------------------13213e43_2177_4ce8_a605_10d224993787--------------)

Mar 17

[A clap icon480\\
\\
A response icon4](https://medium.com/ai-advances/the-complete-guide-to-claude-code-claude-md-743d4cbac757?source=post_page---read_next_recirc--5938890ea825----1---------------------13213e43_2177_4ce8_a605_10d224993787--------------)

![MiroFish: Swarm-Intelligence with 1M Agents That Can Predict Everything](https://miro.medium.com/v2/resize:fit:679/format:webp/1*7Maye7fkhEXgyXIGLIDkpg.png)

[![Agent Native](https://miro.medium.com/v2/resize:fill:20:20/1*dt5tcaKMBhB6JboQ9lIEAA.jpeg)](https://medium.com/@agentnativedev?source=post_page---read_next_recirc--5938890ea825----2---------------------13213e43_2177_4ce8_a605_10d224993787--------------)

[Agent Native](https://medium.com/@agentnativedev?source=post_page---read_next_recirc--5938890ea825----2---------------------13213e43_2177_4ce8_a605_10d224993787--------------)

[**MiroFish: Swarm-Intelligence with 1M Agents That Can Predict Everything**\\
\\
**Spawning thousands of autonomous agents with unique personalities, memories and social connections in simulated world to predict any event.**](https://medium.com/@agentnativedev/mirofish-swarm-intelligence-with-1m-agents-that-can-predict-everything-114296323663?source=post_page---read_next_recirc--5938890ea825----2---------------------13213e43_2177_4ce8_a605_10d224993787--------------)

Mar 16

[A clap icon446\\
\\
A response icon12](https://medium.com/@agentnativedev/mirofish-swarm-intelligence-with-1m-agents-that-can-predict-everything-114296323663?source=post_page---read_next_recirc--5938890ea825----2---------------------13213e43_2177_4ce8_a605_10d224993787--------------)

![A Mental Model for Claude Code: Skills, Subagents, and Plugins](https://miro.medium.com/v2/resize:fit:679/format:webp/0*34KyACPiQmS8Sof2)

[![Level Up Coding](https://miro.medium.com/v2/resize:fill:20:20/1*5D9oYBd58pyjMkV_5-zXXQ.jpeg)](https://medium.com/gitconnected?source=post_page---read_next_recirc--5938890ea825----3---------------------13213e43_2177_4ce8_a605_10d224993787--------------)

In

[Level Up Coding](https://medium.com/gitconnected?source=post_page---read_next_recirc--5938890ea825----3---------------------13213e43_2177_4ce8_a605_10d224993787--------------)

by

[Dean Blank](https://medium.com/@blankdean?source=post_page---read_next_recirc--5938890ea825----3---------------------13213e43_2177_4ce8_a605_10d224993787--------------)

[**A Mental Model for Claude Code: Skills, Subagents, and Plugins**\\
\\
**I spent weeks confused by the feature ecosystem. Here is the mental model I wish I had from the start.**](https://medium.com/gitconnected/a-mental-model-for-claude-code-skills-subagents-and-plugins-3dea9924bf05?source=post_page---read_next_recirc--5938890ea825----3---------------------13213e43_2177_4ce8_a605_10d224993787--------------)

Mar 4

[A clap icon238\\
\\
A response icon3](https://medium.com/gitconnected/a-mental-model-for-claude-code-skills-subagents-and-plugins-3dea9924bf05?source=post_page---read_next_recirc--5938890ea825----3---------------------13213e43_2177_4ce8_a605_10d224993787--------------)

[See more recommendations](https://medium.com/?source=post_page---read_next_recirc--5938890ea825---------------------------------------)

[Help](https://help.medium.com/hc/en-us?source=post_page-----5938890ea825---------------------------------------)

[Status](https://status.medium.com/?source=post_page-----5938890ea825---------------------------------------)

[About](https://medium.com/about?autoplay=1&source=post_page-----5938890ea825---------------------------------------)

[Careers](https://medium.com/jobs-at-medium/work-at-medium-959d1a85284e?source=post_page-----5938890ea825---------------------------------------)

[Press](mailto:pressinquiries@medium.com)

[Blog](https://blog.medium.com/?source=post_page-----5938890ea825---------------------------------------)

[Privacy](https://policy.medium.com/medium-privacy-policy-f03bf92035c9?source=post_page-----5938890ea825---------------------------------------)

[Rules](https://policy.medium.com/medium-rules-30e5502c4eb4?source=post_page-----5938890ea825---------------------------------------)

[Terms](https://policy.medium.com/medium-terms-of-service-9db0094a1e0f?source=post_page-----5938890ea825---------------------------------------)

[Text to speech](https://speechify.com/medium?source=post_page-----5938890ea825---------------------------------------)

reCAPTCHA

Recaptcha requires verification.

[Privacy](https://www.google.com/intl/en/policies/privacy/) \- [Terms](https://www.google.com/intl/en/policies/terms/)

protected by **reCAPTCHA**

[Privacy](https://www.google.com/intl/en/policies/privacy/) \- [Terms](https://www.google.com/intl/en/policies/terms/)