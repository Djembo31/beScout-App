[Sitemap](https://heeki.medium.com/sitemap/sitemap.xml)

[Open in app](https://play.google.com/store/apps/details?id=com.medium.reader&referrer=utm_source%3DmobileNavBar&source=post_page---top_nav_layout_nav-----------------------------------------)

Sign up

[Sign in](https://medium.com/m/signin?operation=login&redirect=https%3A%2F%2Fheeki.medium.com%2Fcollaborating-with-agents-teams-in-claude-code-f64a465f3c11&source=post_page---top_nav_layout_nav-----------------------global_nav------------------)

[Medium Logo](https://medium.com/?source=post_page---top_nav_layout_nav-----------------------------------------)

Get app

[Write](https://medium.com/m/signin?operation=register&redirect=https%3A%2F%2Fmedium.com%2Fnew-story&source=---top_nav_layout_nav-----------------------new_post_topnav------------------)

[Search](https://medium.com/search?source=post_page---top_nav_layout_nav-----------------------------------------)

Sign up

[Sign in](https://medium.com/m/signin?operation=login&redirect=https%3A%2F%2Fheeki.medium.com%2Fcollaborating-with-agents-teams-in-claude-code-f64a465f3c11&source=post_page---top_nav_layout_nav-----------------------global_nav------------------)

![](https://miro.medium.com/v2/resize:fill:32:32/1*dmbNkD5D-u45r44go_cf0g.png)

# Collaborating with agents teams in Claude Code

[![Heeki Park](https://miro.medium.com/v2/resize:fill:32:32/1*qWa2zSEqLngw89H0ghJ7zQ.jpeg)](https://heeki.medium.com/?source=post_page---byline--f64a465f3c11---------------------------------------)

[Heeki Park](https://heeki.medium.com/?source=post_page---byline--f64a465f3c11---------------------------------------)

Follow

15 min read

·

Mar 12, 2026

226

2

[Listen](https://medium.com/m/signin?actionUrl=https%3A%2F%2Fmedium.com%2Fplans%3Fdimension%3Dpost_audio_button%26postId%3Df64a465f3c11&operation=register&redirect=https%3A%2F%2Fheeki.medium.com%2Fcollaborating-with-agents-teams-in-claude-code-f64a465f3c11&source=---header_actions--f64a465f3c11---------------------post_audio_button------------------)

Share

I have been building a lot lately. It has me thinking how the lines between product management, software engineering, and user experience testing are blurring. I start by documenting requirements for the product, refining until I think I have a decent start. Then I build, ensuring that the requirements are met. Finally, I test the user experience, iterating until I think I hit the mark. Yet as I’m building, I add more ideas to the backlog. The cycle seems to keep going, and I often have trouble keeping up with my backlog of ideas.

Press enter or click to view image in full size

![](https://miro.medium.com/v2/resize:fit:700/1*7sfEsp1lSdtJkUmQ7v7LBA.png)

Product delivery lifecycle

In my [last blog post](https://heeki.medium.com/using-spec-driven-development-with-claude-code-4a1ebe5d9f29) on using spec-driven development with Claude Code, I covered approaches for being more effective with agentic coding. In order to keep up with that backlog of ideas, I have been thinking about how to scale productivity by introducing more parallelism into the workflow.

I also see organizations think about using coding agents as digital workers to increase scale. Those digital workers can act autonomously on behalf of developers, taking assigned issues, understanding existing code bases, planning an implementation strategy, executing said implementation, scanning for security issues, producing documentation, and ultimately submitting a pull request for human review.

In this blog post, I document my experiments of attempting to scale with [agent teams](https://code.claude.com/docs/en/agent-teams) in Claude Code. I cover where I saw distinct advantages, where I hit some sharp edges, and where I found myself to be the bottleneck. I then summarize my experiences as food for thought as you embark on your own experimentation journey. And finally, I tease a little of what I have been building and hope to share in my next post.

### Defining agent teams

Before I cover my experience, it is worth covering the difference between subagents and agent teams. While both allow for parallelizing work, they operate differently. Anthropic [documentation](https://code.claude.com/docs/en/agent-teams) states it succinctly.

> Subagents only report results back to the main agent and never talk to each other. In agent teams, teammates share a task list, claim work, and communicate directly with each other.

Press enter or click to view image in full size

![](https://miro.medium.com/v2/resize:fit:1000/0*QvC4Ug67jVyqlUqR)

Orchestrating teams of Claude Code sessions (from Anthropic documentation)

Candidly, for most of what I’m doing, I imagine subagents are sufficient both in terms of complexity and time. Most of my issues averaged 4–6 requirements with a few going up to 10. Most team-based implementations took less than 15 minutes. I am sure that a main agent could have reasoned through the same task list, spawned the appropriate subagents, and completed in comparable overall time.

Regardless, this experimentation helped me understand how to potentially use it at broader scale. Let’s dive into my development process and how I applied both agent teams and subagents.

### Digging into the development process

Let’s look in more detail at the cycle above with product management, software development, and testing. At a high-level, this is what that process looks like for me.

Press enter or click to view image in full size

![](https://miro.medium.com/v2/resize:fit:700/1*ngBkKaSLYlzy5rww7jXZSQ.png)

Product delivery lifecycle applied with GitHub and Claude Code

**Product management**

I start by spending time defining the requirements for a particular feature request. I use the following prompt in Claude Code to help me generate detailed documentation, providing a high-level summary, context for the request, a set of requirements each with a list of expected behaviors, optional implementation notes, acceptance criteria, and out of scope items. This is effectively my specification. While I could have Claude Code automatically submit the issue, I instead have it write to a file locally so that I can review it first and then submit manually. #human-in-the-loop

```
Create documentation for a Github issue for this project. This issue will be assigned to a Claude Code agent team.
Write the issue as a markdown file under tmp/issues and name it with the following convention: ###-issue-name.md (where ### is the issue number).
Prefix each of the requirements with "R#: <requirement-name>"

OVERVIEW:
Describe what should be completed.

REQUIREMENTS:
1. Description of a requirement
2. Description of a requirement
3. Description of a requirement
4. Description of a requirement
```

**Software development engineer** I move next to the implementation for which I give the first pass to an agent team. I use the following prompt to kick off the agent team.

```
Create an agent team to work on this Github issue: <github-issue-url>
Create a feature branch with a worktree that matches the issue markdown under tmp/issues but without the .md extension.
Implement and test all the requirements in the issue, ensuring that there are no regressions.
Update all SPECIFICATIONS.md with the latest design decisions.
Update all README.md with the latest implementation details but ensure that no sensitive or account specific information is included.
If the implementation satisfies all the requirements and passes all tests, prepare a pull request but do not submit the pull request until it is reviewed.
```

With agent teams, the team lead reasons through task dependencies and creates a shared task list. It then spawns named teammates which then claim and complete tasks. Each of them works through its tasks and has awareness of implementation inter-dependencies.

Press enter or click to view image in full size

![](https://miro.medium.com/v2/resize:fit:1000/1*oqfMlBf7-S5VXogHbGBQkw.png)

Claude Code agent teams with tmux

**User experience tester** After the agent team completes the initial implementation, the team lead shuts down all the teammates. At this point, I interactively test the implemented features and iterate on the experience. I validate the backend functionality and spend a fair amount of time tweaking the frontend.

Herein lies an interesting interplay between all three roles. As I validate the backend functionality and test the user experience, I instruct Claude Code to make updates, which it either does directly for smaller tasks or spawns subagents for larger tasks. As these updates are implemented, I view those changes in the frontend and confirm that the experience meets my expectations. Furthermore, throughout the process, I think of other feature requests or enhancements, which I then document as a new issue. The lines have blurred between these traditionally distinct roles.

![](https://miro.medium.com/v2/resize:fit:695/1*ETpyeaWQl2AoHo_sx0TwDA.png)

Not-so-linear interplay between product management, software development, and testing

That’s the high-level experience. Now let’s dig into _how_ I do this.

### Setting up the basic developer environment

My setup is primarily three tools: Claude Code, GitHub CLI, and tmux. The basic installation is simply as follows:

```
brew install claude-code gh tmux
```

Claude Code, of course, takes center stage in this post. In my Claude Code [settings](https://gist.github.com/heeki/da9659ad86472015ab76e5974fb2859b#file-03-claude-settings-json), I enable agent teams and direct usage with Bedrock. While I have a Pro subscription, I was curious to monitor token usage across models during my recent development efforts. I also updated the hooks and status line. As such, window tabs get highlighted when my attention is required, and the status bar gives me useful information on repository, branch, model, files, and context window consumption. Shout out to my friend, Adam, who [posted](https://www.linkedin.com/posts/adamw42_ive-been-having-a-lot-of-fun-integrating-activity-7425565536555778048-h0Mn/) about his customizations and gave me these ideas. I used Claude to iterate on the theme so that I looked exactly how I wanted.

GitHub CLI is useful for when Claude Code is working on my feature requests. It simplifies the process for pulling issues, which I use as the specification for feature requests. It also makes it easy to submit pull requests after completing an implementation.

Tmux is a force multiplier for terminal productivity. In my tmux [settings](https://gist.github.com/heeki/da9659ad86472015ab76e5974fb2859b#file-02-tmux-conf), I install the tmux package manager, install themes, setup pane behavior, and update the status bar. I try to avoid using the mouse as much as possible, using keyboard shortcuts for everything. When navigating in tmux, I use a variety of [commands](https://gist.github.com/heeki/da9659ad86472015ab76e5974fb2859b#file-01-tmux-md) for managing the windows.

iTerm2 has been my terminal for the last 15+ years, and it has served me well. However, when making the aforementioned customizations, I had trouble getting the required Nerd font packages to correctly render symbols in neovim. I spent a few hours troubleshooting with both Claude and Gemini and both were not able to resolve the issue. I eventually followed a suggestion to try an alternate terminal. I landed on [Ghostty](https://ghostty.org/), which rendered my full development stack properly.

In the process of that troubleshooting, I also ended up switching from [ohmyzsh](https://github.com/ohmyzsh/ohmyzsh) to [starship.rs](https://starship.rs/) for customizing my shell. I erroneously thought ohmyzsh was causing cold start issues in my shell, which was then causing coordination problems with agent teams. That ended up not being the case, but I ended up liking the new customizations and stuck with it.

### Navigating tmux

I used to primarily use sessions for swapping between workflows. In that model, I had a few sessions, each with a single window.

Press enter or click to view image in full size

![](https://miro.medium.com/v2/resize:fit:700/1*TkTvBp-vgxNvfLmMfgSuGg.png)

I liked this approach because I could name each session with the target feature or use case. Whenever I wanted to swap to a different use case, I would just `ctrl+b <s>` and then select the appropriate session.

```
tmux
<ctrl+b> <s>                    (open up sessions list)
:rename-session -t 0 feature-1  (rename the default session "feature-1")
:new-session -s feature-2       (start another session named "feature-2")
```

This approach worked fine when I was not context switching too frequently. However, with Claude Code, I find that context switch a lot more, so I wanted a faster way to work. I transitioned to using windows where each window has a set of panes relevant for the use case.

Press enter or click to view image in full size

![](https://miro.medium.com/v2/resize:fit:700/1*_VHnn0bbv9k5AKIFPr4edA.png)

tmux session, windows, and panes

I like this approach now, as I can quickly swap to windows back and forth and easily see which windows require my attention with the aforementioned customizations.

```
tmux
<ctrl+b> <s>                    (open up sessions list)
:rename-session -t 0 project    (rename the default session "project")
<ctrl+b> <c>                    (create a new window)
<ctrl+b> <n>                    (move to the next window)
<ctrl+b> <p>                    (move to the previous window)
<ctrl+b> <#>                    (move to window #)
```

Ok, let’s apply these to accelerating productivity with Claude Code.

### Building with Claude Code agent teams inside tmux

I could create a [startup script](https://tmuxai.dev/tmux-startup-script/) to automatically create the dev environment, but I don’t know if I yet have a set configuration yet. If there is one, it might look something like this.

Press enter or click to view image in full size

![](https://miro.medium.com/v2/resize:fit:700/1*jVpQcJvp-i4XtVS1oJz-Fw.png)

Typical tmux setup with the latest project

When working on a feature, I checkout a branch, which sets the entire repository to that branch: `git checkout -b 003-add-memory-resource`. This keeps each window and pane consistent with the working code.

In window 2, I start with the initial software development engineer prompt above. Claude Code then creates an agent team with a team lead and three teammates. When it completes the work, the team lead shuts down the teammates.

In window 1, I run the backend in pane 2 and run the frontend in pane 3. I bring up the frontend in my browser and test out the user experience and validate that the functionality works as expected.

Press enter or click to view image in full size

![](https://miro.medium.com/v2/resize:fit:700/1*HZ3YuDQPm-uOd3Nqbt9SUQ.png)

Claude Code agent team in tmux window 2

In window 3, I sometimes might do side exploration. I do that on the side because I don’t want to pollute the main context in window 2. With this setup, I can quickly switch between windows with `<ctrl+b> <n|p|#>`.

## Get Heeki Park’s stories in your inbox

Join Medium for free to get updates from this writer.

Subscribe

Subscribe

Remember me for faster sign in

What if I want to scale my work across multiple feature requests?

### Increasing parallelism with git worktrees

Remember, when I checkout a branch, the whole repository operates on that branch. Enter git worktrees, which enable me to work on multiple branches simultaneously. It enables that by effectively mounting a branch to a specific directory.

```
git worktree add -b <branch-name> <path>
git worktree add -b 003-add-memory-resource .claude/worktrees/003-add-memory-resource
```

At the root of the repository, I am on the main branch. After running the command above and changing the directory to `.claude/worktrees/003-add-memory-resource`, I am on the feature branch.

Press enter or click to view image in full size

![](https://miro.medium.com/v2/resize:fit:700/1*1x8bigI1Tpgrw33c3xqKnQ.png)

Working on multiple feature branches with git worktrees

I can also have Claude Code manage the worktree automatically.

```
claude --worktree 003-add-memory-resource
```

Claude Code automatically creates the worktree and operates out of that directory. Changes are committed to that branch. After completing the work for the feature request, the worktree can automatically be cleaned up when exiting the Claude Code session.

Note that I can start it without specifying the directory. Without specifying the directory, it will generate a directory name, reminiscent of how docker creates container names.

Press enter or click to view image in full size

![](https://miro.medium.com/v2/resize:fit:1000/1*mnmR5DHDWurAoNLjuMqbpQ.png)

Multiple agent teams working in parallel on separate feature requests

So this is _how_ you can use agent teams for parallel development work, but should you? As I often say, just because you _can_, doesn’t mean you _should_.

### Considerations with worktrees

**Remember your directory context.** When adding a worktree, it is like mounting the branch of a freshly cloned repository into a directory. In my case, I don’t commit my deployment configurations into the repository. This means that on a fresh worktree, I need to update the environment configuration, install the dependencies, initialize the development database, and ensure that the backend and frontend are both started from _the correct sub-directory_.

```
# operating in window 1
cd .claude/worktrees/003-add-memory-resource
# split into pane 1 and pane 2
<ctrl+b> <%>
# change to the backend directory
cd backend
# install python dependencies
make install
# setup environment
cp <source> etc/environment.sh
# run the fastapi backend
make run
# split into pane 2 and 3
<ctrl+b> <">
# change to the frontend directory
cd frontend
# install node dependencies
make install
# setup environment
cp <source> etc/environment.sh
# run the vite server
make dev
# add window 2
<ctrl+b> <c>
# start claude in an existing worktree
claude
```

I say correct sub-directory because on more than one occasion, I was running the backend and frontend in window 1 on the main branch, while I was making updates via Claude Code in window 2 on the feature branch. I would keep probing Claude Code on why I wasn’t seeing the updates. #duh

**Set your branch and worktree in your IDE accordingly.** Similar to above, if using VS Code or forked derivative, you can swap to a worktree. You are given the option to swap the current window to the worktree or to open a new window. I often chose a new window, as this allows me to look at gitignored files from my main branch. This includes environment configurations and various notes that I take during the implementation.

Similar to the terminal, remember the branch or worktree context for each of your IDE windows, as you could easily be looking at the wrong window.

**Be mindful of parallelism when committing to overlapping files.** In my case, the backend is a simple, monolithic FastAPI application, and the frontend is a fairly simple, monolithic Vite server. When I spun up three agent teams, each working on a separate issue, they wrote and updated code to satisfy the requirements. However, because they were updating a monolithic code base, the branches had a fair amount of merge conflicts.

Press enter or click to view image in full size

![](https://miro.medium.com/v2/resize:fit:700/1*FXMwFpfk8jcDkeoBHqAKfQ.png)

Sample visualization of each branch with hypothetical merge conflicts

Because I ended up reviewing and testing the output of each team serially, I reviewed each pull request, made appropriate subsequent commits, merged the pull request into main, and then rebased the next pull request from main. Say what?

Press enter or click to view image in full size

![](https://miro.medium.com/v2/resize:fit:700/1*2UHlsCv0hEUDKB270mqucg.png)

Sample visualization of each branch, merged to main, then rebased with merge conflicts resolved

The rebase basically stashes the current branch’s changes, resets the feature branch to the tip of main, and then reapplies the current branch’s changes. Merge conflict resolution happens during this process. Fortunately, Claude Code can handle merge conflict resolution, so that alleviated this challenge a little. I like the rebase approach because it maintains a linear commit history. Otherwise, the commit history shows parallel and sometimes prolonged divergent paths.

### Considerations with agent teams

**Agent teams are an experimental feature.** I ran into a bunch of wonky behavior while I was testing. I initially found that the teammates were not receiving any messages from the team lead. That led to completely updating my developer environment, as I described above. I also found that sometimes teammates get stuck and the team lead loses track of them. As such, the sub-task would get stuck, and I had to prompt the team lead to restart work on a sub-task in a new teammate. That created scenarios where there were way more tmux panes than were necessary. It got cluttered real fast.

**Permissions requests can get unwieldy with agent teams.** I started by requiring my approval for all permissions requests and over time started enabling certain commands automatic access using `.permissions.allow[]` in my settings file. For actions that are not already captured in that allow list, the permissions request bottleneck gets amplified with multiple teammates now requesting access via the team lead. Yes, you can respond by saying to not ask again for that particular action again, but there are some actions that don’t give you that option.

It was with agent teams that I jumped off the deep end and used this:

```
claude --dangerously-skip-permissions
claude --dangerously-skip-permissions --worktree <###-issue-name>
```

I don’t recommend this. Instead, I recommend being more rigorous with the allow list, ensuring that you are explicitly intentional about which actions you allow or deny with Claude Code.

**Be mindful of cost implications from increased token usage.** The [documentation](https://code.claude.com/docs/en/agent-teams#token-usage) states that agent teams “use significantly more tokens than a single session”. This is because each teammate gets its own context window, which means more potential context usage. For example, if I have a team lead and three teammates, each loading 10k as initialization context, that’s 40k token usage over what would have been just 10k in a single session. Note that this is true for both agent teams and [subagents](https://code.claude.com/docs/en/sub-agents), as [documentation](https://code.claude.com/docs/en/features-overview#compare-similar-features) shows that both use their own context window.

### Considerations with Claude Code

**Don’t prompt directly in Claude Code.** This isn’t for everyone, but I found this to be helpful. Instead of typing directly into Claude Code, I write out my prompts in an IDE before copy/pasting. This has two key benefits.

1. It creates impedance that forces me to slow down. These tools already create so much acceleration. By slowing down, I am more thoughtful about what I really want to accomplish. Consider the speed of texting versus handwriting a letter. That impedance leads to more thoughtfulness.
2. It gives me a full log of interactions for each of my features. I save them into structured files like `prompts_issue_003.md`. I can both learn from them and possibly feed them back to Claude Code to create skills.

**Update your documentation regularly.** After completing a feature request, I always tell Claude Code to update documentation before committing.

```
Update all SPECIFICATIONS.md with the latest design decisions.
Update all README.md with the latest implementation details but ensure that no sensitive or account specific information is included.
After updating documentation, commit the latest changes.
```

**Generate skills after productive sessions.** After a long session of iterating on a feature request, I sometimes ask Claude Code to generate a skill to codify those learnings. I see skills as a future of where organizational best practices are codified and scaled for developer use.

**Consider model choice and effort.** This is something that I am thinking about more but have yet to actually do in practice. Not all tasks require Opus 4.6 with high effort. The `/model` selector itself makes it clear that Opus is most capable for complex work, Sonnet is best for everyday tasks, and Haiku is fastest for quick answers. Each model can be adjusted for the amount of effort (or thinking): low, medium, high. That said, when I’m in the flow, I am not thinking about token usage and efficiency. I’m focused on the task at hand.

### Conclusion

Most of my feature requests are fairly simple. The agent team typically completes the first pass implementation within 15–20 minutes. Afterwards, I could spend a few hours iterating and refining the implementation before submitting the pull request.

This is not a failure of the agent team’s implementation. This is a failure of specification. I often don’t know exactly how I want aspects of the feature to be implemented. It isn’t until I am iterating on the feature request that certain aspects of the desired experience surface.

As a single developer, this is one pushback against the parallelism of running many agent teams in parallel. However, for larger organizations with many developers working on many independent, non-overlapping feature requests, the parallelism can be a powerful accelerator.

So again, just because you _can_, doesn’t mean you _should_.

I am curious to explore more with skills and harness engineering. I also started playing with Claude Code [remote control](https://code.claude.com/docs/en/remote-control) after a friend, Sam, shared about his experiences in a group chat. Lastly, I have been exploring ideas with agent platforms and have been building a prototype to that end. Stay tuned for my next post, where I plan to share details and design tradeoffs of what I have been building with this setup.

### Resources

- [https://code.claude.com/docs/en/agent-teams](https://code.claude.com/docs/en/agent-teams)
- [https://code.claude.com/docs/en/remote-control](https://code.claude.com/docs/en/remote-control)
- [https://github.com/tmux/tmux/wiki](https://github.com/tmux/tmux/wiki)
- [https://starship.rs/](https://starship.rs/)
- [https://git-scm.com/book/id/v2/Git-Branching-Rebasing](https://git-scm.com/book/id/v2/Git-Branching-Rebasing)

[Agentic Ai](https://medium.com/tag/agentic-ai?source=post_page-----f64a465f3c11---------------------------------------)

[Genai](https://medium.com/tag/genai?source=post_page-----f64a465f3c11---------------------------------------)

[Claude Code](https://medium.com/tag/claude-code?source=post_page-----f64a465f3c11---------------------------------------)

[Software Development](https://medium.com/tag/software-development?source=post_page-----f64a465f3c11---------------------------------------)

[Software Engineering](https://medium.com/tag/software-engineering?source=post_page-----f64a465f3c11---------------------------------------)

226

226

2

[![Heeki Park](https://miro.medium.com/v2/resize:fill:48:48/1*qWa2zSEqLngw89H0ghJ7zQ.jpeg)](https://heeki.medium.com/?source=post_page---post_author_info--f64a465f3c11---------------------------------------)

[![Heeki Park](https://miro.medium.com/v2/resize:fill:64:64/1*qWa2zSEqLngw89H0ghJ7zQ.jpeg)](https://heeki.medium.com/?source=post_page---post_author_info--f64a465f3c11---------------------------------------)

Follow

[**Written by Heeki Park**](https://heeki.medium.com/?source=post_page---post_author_info--f64a465f3c11---------------------------------------)

[1.7K followers](https://heeki.medium.com/followers?source=post_page---post_author_info--f64a465f3c11---------------------------------------)

· [21 following](https://heeki.medium.com/following?source=post_page---post_author_info--f64a465f3c11---------------------------------------)

Principal Solutions Architect @ AWS. Opinions are my own. [https://linktr.ee/heekipark](https://linktr.ee/heekipark)

Follow

## Responses (2)

![](https://miro.medium.com/v2/resize:fill:32:32/1*dmbNkD5D-u45r44go_cf0g.png)

Write a response

[What are your thoughts?](https://medium.com/m/signin?operation=register&redirect=https%3A%2F%2Fheeki.medium.com%2Fcollaborating-with-agents-teams-in-claude-code-f64a465f3c11&source=---post_responses--f64a465f3c11---------------------respond_sidebar------------------)

Cancel

Respond

[![Milos Zivkovic](https://miro.medium.com/v2/resize:fill:32:32/1*421m4FcEmm2KBeiI-JT_yw.jpeg)](https://zivce.medium.com/?source=post_page---post_responses--f64a465f3c11----0-----------------------------------)

[Milos Zivkovic](https://zivce.medium.com/?source=post_page---post_responses--f64a465f3c11----0-----------------------------------)

[Mar 13](https://zivce.medium.com/how-does-this-work-at-scale-85c9d025a7d6?source=post_page---post_responses--f64a465f3c11----0-----------------------------------)

```
How does this work at scale? For a single feature it's okay but what if I spin up 10 worktrees and need to keep up with all of them. Also if I have some preconditions or work across several repos it gets even harder.
```

1

Reply

[![Sebastian Buzdugan](https://miro.medium.com/v2/resize:fill:32:32/1*hzuxWxBCnUf_4QBdE7NWng.png)](https://medium.com/@sebuzdugan?source=post_page---post_responses--f64a465f3c11----1-----------------------------------)

[Sebastian Buzdugan](https://medium.com/@sebuzdugan?source=post_page---post_responses--f64a465f3c11----1-----------------------------------)

[Mar 13](https://medium.com/@sebuzdugan/funny-how-claude-code-ends-up-being-half-pm-half-pair-programmer-half-qa-curious-how-youre-4516f2df1cca?source=post_page---post_responses--f64a465f3c11----1-----------------------------------)

```
funny how claude code ends up being half pm, half pair programmer, half qa… curious how you’re keeping the backlog sane while agents keep suggesting new stuff
```

Reply

## More from Heeki Park

![Using spec-driven development with Claude Code](https://miro.medium.com/v2/resize:fit:679/format:webp/1*VOzPHcHIvwhHGi3HYRXplA.png)

[![Heeki Park](https://miro.medium.com/v2/resize:fill:20:20/1*qWa2zSEqLngw89H0ghJ7zQ.jpeg)](https://heeki.medium.com/?source=post_page---author_recirc--f64a465f3c11----0---------------------82429e29_3b5d_481b_a23b_2a70ba840d2e--------------)

[Heeki Park](https://heeki.medium.com/?source=post_page---author_recirc--f64a465f3c11----0---------------------82429e29_3b5d_481b_a23b_2a70ba840d2e--------------)

[**Using spec-driven development with Claude Code**\\
\\
**I no longer write code by hand. I wouldn’t call myself a proper software development engineer by trade, nor have I deployed large-scale…**](https://heeki.medium.com/using-spec-driven-development-with-claude-code-4a1ebe5d9f29?source=post_page---author_recirc--f64a465f3c11----0---------------------82429e29_3b5d_481b_a23b_2a70ba840d2e--------------)

Feb 28

[A clap icon543\\
\\
A response icon14](https://heeki.medium.com/using-spec-driven-development-with-claude-code-4a1ebe5d9f29?source=post_page---author_recirc--f64a465f3c11----0---------------------82429e29_3b5d_481b_a23b_2a70ba840d2e--------------)

![Building an MCP server as an API developer](https://miro.medium.com/v2/resize:fit:679/format:webp/1*3DLMsLCND04Ie-vSAiqvpw.png)

[![Heeki Park](https://miro.medium.com/v2/resize:fill:20:20/1*qWa2zSEqLngw89H0ghJ7zQ.jpeg)](https://heeki.medium.com/?source=post_page---author_recirc--f64a465f3c11----1---------------------82429e29_3b5d_481b_a23b_2a70ba840d2e--------------)

[Heeki Park](https://heeki.medium.com/?source=post_page---author_recirc--f64a465f3c11----1---------------------82429e29_3b5d_481b_a23b_2a70ba840d2e--------------)

[**Building an MCP server as an API developer**\\
\\
**Anthropic released MCP at the end of November 2024. It took a few months for it to catch on, but my, oh my, it feels like the community is…**](https://heeki.medium.com/building-an-mcp-server-as-an-api-developer-cfc162d06a83?source=post_page---author_recirc--f64a465f3c11----1---------------------82429e29_3b5d_481b_a23b_2a70ba840d2e--------------)

May 14, 2025

[A clap icon646\\
\\
A response icon6](https://heeki.medium.com/building-an-mcp-server-as-an-api-developer-cfc162d06a83?source=post_page---author_recirc--f64a465f3c11----1---------------------82429e29_3b5d_481b_a23b_2a70ba840d2e--------------)

![Understanding OAuth2 and implementing identity-aware MCP servers](https://miro.medium.com/v2/resize:fit:679/format:webp/1*fJMjJzmSTruaoESiCD41nA.png)

[![Heeki Park](https://miro.medium.com/v2/resize:fill:20:20/1*qWa2zSEqLngw89H0ghJ7zQ.jpeg)](https://heeki.medium.com/?source=post_page---author_recirc--f64a465f3c11----2---------------------82429e29_3b5d_481b_a23b_2a70ba840d2e--------------)

[Heeki Park](https://heeki.medium.com/?source=post_page---author_recirc--f64a465f3c11----2---------------------82429e29_3b5d_481b_a23b_2a70ba840d2e--------------)

[**Understanding OAuth2 and implementing identity-aware MCP servers**\\
\\
**As excitement with MCP continues to build, folks are looking at how to leverage MCP and are considering deployment patterns for their…**](https://heeki.medium.com/understanding-oauth2-and-implementing-identity-aware-mcp-servers-221a06b1a6cf?source=post_page---author_recirc--f64a465f3c11----2---------------------82429e29_3b5d_481b_a23b_2a70ba840d2e--------------)

Jun 6, 2025

[A clap icon414\\
\\
A response icon6](https://heeki.medium.com/understanding-oauth2-and-implementing-identity-aware-mcp-servers-221a06b1a6cf?source=post_page---author_recirc--f64a465f3c11----2---------------------82429e29_3b5d_481b_a23b_2a70ba840d2e--------------)

![Getting started with Bedrock AgentCore Runtime](https://miro.medium.com/v2/resize:fit:679/format:webp/1*quHa_8_eChuHpfyJ6JzYYg.png)

[![AWS in Plain English](https://miro.medium.com/v2/resize:fill:20:20/1*6EeD87OMwKk-u3ncwAOhog.png)](https://aws.plainenglish.io/?source=post_page---author_recirc--f64a465f3c11----3---------------------82429e29_3b5d_481b_a23b_2a70ba840d2e--------------)

In

[AWS in Plain English](https://aws.plainenglish.io/?source=post_page---author_recirc--f64a465f3c11----3---------------------82429e29_3b5d_481b_a23b_2a70ba840d2e--------------)

by

[Heeki Park](https://heeki.medium.com/?source=post_page---author_recirc--f64a465f3c11----3---------------------82429e29_3b5d_481b_a23b_2a70ba840d2e--------------)

[**Getting started with Bedrock AgentCore Runtime**\\
\\
**At the AWS Summit in New York this year, Amazon announced a new set of services for building, deploying, and operating your AI agents under…**](https://heeki.medium.com/getting-started-with-bedrock-agentcore-runtime-3eaae1f517cc?source=post_page---author_recirc--f64a465f3c11----3---------------------82429e29_3b5d_481b_a23b_2a70ba840d2e--------------)

Aug 12, 2025

[A clap icon129](https://heeki.medium.com/getting-started-with-bedrock-agentcore-runtime-3eaae1f517cc?source=post_page---author_recirc--f64a465f3c11----3---------------------82429e29_3b5d_481b_a23b_2a70ba840d2e--------------)

[See all from Heeki Park](https://heeki.medium.com/?source=post_page---author_recirc--f64a465f3c11---------------------------------------)

## Recommended from Medium

![Claude Can Now Create Complex Diagrams — I Tested 21 Prompts (Goodbye Canva!)](https://miro.medium.com/v2/resize:fit:679/format:webp/1*WCR7uhfrlz1ct08xTRzOYA.png)

[![AI Software Engineer](https://miro.medium.com/v2/resize:fill:20:20/1*RZVWENvZRwVijHDlg5hw7w.png)](https://medium.com/ai-software-engineer?source=post_page---read_next_recirc--f64a465f3c11----0---------------------3f465ef0_bd32_463a_b281_ba3e2f0f20f8--------------)

In

[AI Software Engineer](https://medium.com/ai-software-engineer?source=post_page---read_next_recirc--f64a465f3c11----0---------------------3f465ef0_bd32_463a_b281_ba3e2f0f20f8--------------)

by

[Joe Njenga](https://medium.com/@joe.njenga?source=post_page---read_next_recirc--f64a465f3c11----0---------------------3f465ef0_bd32_463a_b281_ba3e2f0f20f8--------------)

[**Claude Can Now Create Complex Diagrams — I Tested 21 Prompts (Goodbye Canva!)**\\
\\
**We have come along with Canva, but now Claude's new update does the job faster.**](https://medium.com/@joe.njenga/claude-can-now-create-sophisticated-diagrams-charts-goodbye-canva-600d8c524b1c?source=post_page---read_next_recirc--f64a465f3c11----0---------------------3f465ef0_bd32_463a_b281_ba3e2f0f20f8--------------)

Mar 12

[A clap icon985\\
\\
A response icon10](https://medium.com/@joe.njenga/claude-can-now-create-sophisticated-diagrams-charts-goodbye-canva-600d8c524b1c?source=post_page---read_next_recirc--f64a465f3c11----0---------------------3f465ef0_bd32_463a_b281_ba3e2f0f20f8--------------)

![10 Must-Have Skills for Claude (and Any Coding Agent) in 2026](https://miro.medium.com/v2/resize:fit:679/format:webp/1*5Nup6r8Erd-5lEhYbscyJA.png)

[![unicodeveloper](https://miro.medium.com/v2/resize:fill:20:20/0*-kqhhb24fzA5QqSY.jpeg)](https://medium.com/@unicodeveloper?source=post_page---read_next_recirc--f64a465f3c11----1---------------------3f465ef0_bd32_463a_b281_ba3e2f0f20f8--------------)

[unicodeveloper](https://medium.com/@unicodeveloper?source=post_page---read_next_recirc--f64a465f3c11----1---------------------3f465ef0_bd32_463a_b281_ba3e2f0f20f8--------------)

[**10 Must-Have Skills for Claude (and Any Coding Agent) in 2026**\\
\\
**The definitive guide to agent skills that change how Claude Code, Cursor, Gemini CLI, and other AI coding assistants perform in production.**](https://medium.com/@unicodeveloper/10-must-have-skills-for-claude-and-any-coding-agent-in-2026-b5451b013051?source=post_page---read_next_recirc--f64a465f3c11----1---------------------3f465ef0_bd32_463a_b281_ba3e2f0f20f8--------------)

Mar 9

[A clap icon783\\
\\
A response icon9](https://medium.com/@unicodeveloper/10-must-have-skills-for-claude-and-any-coding-agent-in-2026-b5451b013051?source=post_page---read_next_recirc--f64a465f3c11----1---------------------3f465ef0_bd32_463a_b281_ba3e2f0f20f8--------------)

![Claude Code Agent Skills 2.0: From Custom Instructions to Programmable Agents](https://miro.medium.com/v2/resize:fit:679/format:webp/1*9aRn7FV0j269CYc44Rti1g.png)

[![Towards AI](https://miro.medium.com/v2/resize:fill:20:20/1*JyIThO-cLjlChQLb6kSlVQ.png)](https://pub.towardsai.net/?source=post_page---read_next_recirc--f64a465f3c11----0---------------------3f465ef0_bd32_463a_b281_ba3e2f0f20f8--------------)

In

[Towards AI](https://pub.towardsai.net/?source=post_page---read_next_recirc--f64a465f3c11----0---------------------3f465ef0_bd32_463a_b281_ba3e2f0f20f8--------------)

by

[Rick Hightower](https://medium.com/@richardhightower?source=post_page---read_next_recirc--f64a465f3c11----0---------------------3f465ef0_bd32_463a_b281_ba3e2f0f20f8--------------)

[**Claude Code Agent Skills 2.0: From Custom Instructions to Programmable Agents**\\
\\
**Skills are no longer instructions. They are programs.**](https://medium.com/@richardhightower/claude-code-agent-skills-2-0-from-custom-instructions-to-programmable-agents-ab6e4563c176?source=post_page---read_next_recirc--f64a465f3c11----0---------------------3f465ef0_bd32_463a_b281_ba3e2f0f20f8--------------)

Mar 9

[A clap icon365\\
\\
A response icon6](https://medium.com/@richardhightower/claude-code-agent-skills-2-0-from-custom-instructions-to-programmable-agents-ab6e4563c176?source=post_page---read_next_recirc--f64a465f3c11----0---------------------3f465ef0_bd32_463a_b281_ba3e2f0f20f8--------------)

![Using spec-driven development with Claude Code](https://miro.medium.com/v2/resize:fit:679/format:webp/1*VOzPHcHIvwhHGi3HYRXplA.png)

[![Heeki Park](https://miro.medium.com/v2/resize:fill:20:20/1*qWa2zSEqLngw89H0ghJ7zQ.jpeg)](https://heeki.medium.com/?source=post_page---read_next_recirc--f64a465f3c11----1---------------------3f465ef0_bd32_463a_b281_ba3e2f0f20f8--------------)

[Heeki Park](https://heeki.medium.com/?source=post_page---read_next_recirc--f64a465f3c11----1---------------------3f465ef0_bd32_463a_b281_ba3e2f0f20f8--------------)

[**Using spec-driven development with Claude Code**\\
\\
**I no longer write code by hand. I wouldn’t call myself a proper software development engineer by trade, nor have I deployed large-scale…**](https://heeki.medium.com/using-spec-driven-development-with-claude-code-4a1ebe5d9f29?source=post_page---read_next_recirc--f64a465f3c11----1---------------------3f465ef0_bd32_463a_b281_ba3e2f0f20f8--------------)

Feb 28

[A clap icon543\\
\\
A response icon14](https://heeki.medium.com/using-spec-driven-development-with-claude-code-4a1ebe5d9f29?source=post_page---read_next_recirc--f64a465f3c11----1---------------------3f465ef0_bd32_463a_b281_ba3e2f0f20f8--------------)

![The Complete Guide to Claude Code: CLAUDE.md](https://miro.medium.com/v2/resize:fit:679/format:webp/1*4_bLN2_Of8H4z9xZwNxLFA.jpeg)

[![AI Advances](https://miro.medium.com/v2/resize:fill:20:20/1*R8zEd59FDf0l8Re94ImV0Q.png)](https://ai.gopubby.com/?source=post_page---read_next_recirc--f64a465f3c11----2---------------------3f465ef0_bd32_463a_b281_ba3e2f0f20f8--------------)

In

[AI Advances](https://ai.gopubby.com/?source=post_page---read_next_recirc--f64a465f3c11----2---------------------3f465ef0_bd32_463a_b281_ba3e2f0f20f8--------------)

by

[zhaozhiming](https://medium.com/@zhaozhiming?source=post_page---read_next_recirc--f64a465f3c11----2---------------------3f465ef0_bd32_463a_b281_ba3e2f0f20f8--------------)

[**The Complete Guide to Claude Code: CLAUDE.md**\\
\\
**A comprehensive guide to the CLAUDE.md file in Claude Code, including how it is loaded, how to write it, best practices, and how it…**](https://medium.com/@zhaozhiming/the-complete-guide-to-claude-code-claude-md-743d4cbac757?source=post_page---read_next_recirc--f64a465f3c11----2---------------------3f465ef0_bd32_463a_b281_ba3e2f0f20f8--------------)

Mar 17

[A clap icon480\\
\\
A response icon4](https://medium.com/@zhaozhiming/the-complete-guide-to-claude-code-claude-md-743d4cbac757?source=post_page---read_next_recirc--f64a465f3c11----2---------------------3f465ef0_bd32_463a_b281_ba3e2f0f20f8--------------)

![Anthropic Says Engineers Won’t Exist in a Year. It’s Also Paying Them $570K Today.](https://miro.medium.com/v2/resize:fit:679/format:webp/0*pCwEDHqMVXcuzna_)

[![The Latency Gambler](https://miro.medium.com/v2/resize:fill:20:20/1*wMFzQ6KVGegm1kaMnFxANw.jpeg)](https://medium.com/@kanishks772?source=post_page---read_next_recirc--f64a465f3c11----3---------------------3f465ef0_bd32_463a_b281_ba3e2f0f20f8--------------)

[The Latency Gambler](https://medium.com/@kanishks772?source=post_page---read_next_recirc--f64a465f3c11----3---------------------3f465ef0_bd32_463a_b281_ba3e2f0f20f8--------------)

[**Anthropic Says Engineers Won’t Exist in a Year. It’s Also Paying Them $570K Today.**\\
\\
**The most honest job posting in tech history might also be the most revealing thing about where the industry actually stands.**](https://medium.com/@kanishks772/anthropic-says-engineers-wont-exist-in-a-year-it-s-also-paying-them-570k-today-5ee2a673f1ef?source=post_page---read_next_recirc--f64a465f3c11----3---------------------3f465ef0_bd32_463a_b281_ba3e2f0f20f8--------------)

Mar 11

[A clap icon447\\
\\
A response icon16](https://medium.com/@kanishks772/anthropic-says-engineers-wont-exist-in-a-year-it-s-also-paying-them-570k-today-5ee2a673f1ef?source=post_page---read_next_recirc--f64a465f3c11----3---------------------3f465ef0_bd32_463a_b281_ba3e2f0f20f8--------------)

[See more recommendations](https://medium.com/?source=post_page---read_next_recirc--f64a465f3c11---------------------------------------)

[Help](https://help.medium.com/hc/en-us?source=post_page-----f64a465f3c11---------------------------------------)

[Status](https://status.medium.com/?source=post_page-----f64a465f3c11---------------------------------------)

[About](https://medium.com/about?autoplay=1&source=post_page-----f64a465f3c11---------------------------------------)

[Careers](https://medium.com/jobs-at-medium/work-at-medium-959d1a85284e?source=post_page-----f64a465f3c11---------------------------------------)

[Press](mailto:pressinquiries@medium.com)

[Blog](https://blog.medium.com/?source=post_page-----f64a465f3c11---------------------------------------)

[Privacy](https://policy.medium.com/medium-privacy-policy-f03bf92035c9?source=post_page-----f64a465f3c11---------------------------------------)

[Rules](https://policy.medium.com/medium-rules-30e5502c4eb4?source=post_page-----f64a465f3c11---------------------------------------)

[Terms](https://policy.medium.com/medium-terms-of-service-9db0094a1e0f?source=post_page-----f64a465f3c11---------------------------------------)

[Text to speech](https://speechify.com/medium?source=post_page-----f64a465f3c11---------------------------------------)

reCAPTCHA

Recaptcha requires verification.

[Privacy](https://www.google.com/intl/en/policies/privacy/) \- [Terms](https://www.google.com/intl/en/policies/terms/)

protected by **reCAPTCHA**

[Privacy](https://www.google.com/intl/en/policies/privacy/) \- [Terms](https://www.google.com/intl/en/policies/terms/)