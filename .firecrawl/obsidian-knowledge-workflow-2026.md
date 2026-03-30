# Knowledge workflow 2026 updates: Obsidian, Claude

2026\. February 28

4 minute read



Last big change to my personal workflow was to [switch to Joplin](https://polgarp.com/blog/Switching-from-evernote-to-joplin/) some time ago. I’ve been generally quite happy with using an open-source tool, as it has made me less concerned about my data becoming inaccessible due to company changes. But my notes were still in a database rather than files (and I’m slowly turning back to files to retain control, a good article on this topic: [File over app](https://stephango.com/file-over-app)). Plus, I’ve been using Claude Code more and more, and wanted it to have more direct access to my stash of saved articles. MCP-based solutions are just too cumbersome and expensive for such a simple usecase.

## Joplin -> Obsidian [Permalink](https://polgarp.com/blog/Knowledge-workflow-2026-updates/\#joplin---obsidian "Permalink")

To fit my file-system-based + data ownership requirements, I ended up switching to Obsidian. It’s a tool I’ve read a lot of people praising, and after a brief testing period, I’ve been gradually switching my note-taking flows one by one.

The process to migrate from Joplin to Obsidian is fairly simple:

1. Set up your new Obsidian vault.
   - I’m syncing it through Dropbox simply by creating my vault in a synced folder. I’m not using my notes on mobile, but the [Remotely Save](https://remotelysave.com/) plugin would work if I wanted to.
   - I’ve added a few plugins to make my life easy:
     - [Find orphaned images](https://github.com/josmarcristello/Obsidian-Find-Orphaned-Images): to clean up the trash images from webclips (like all those useless Substack avatars)
     - [Local backup](https://github.com/velviagris/obsidian-local-backup): to have a proper backup besides Dropbox syncing
     - [Local images plus](https://github.com/Sergei-Korneev/obsidian-local-images-plus): to download images when clipping from the  web, to make sure that when an article disappears, I still have the full article with all the imagery
     - [Tag wrangler](https://github.com/pjeby/tag-wrangler): to make managing tags easier
     - [Omnnisearch](https://github.com/scambier/obsidian-omnisearch): faster search results
2. Export Joplin notebooks with the “Markdown + Front matter” option
   - I’ve started with my webclips folder, as it’s quite chunky (2500+ notes), and needed some tidying up.
3. Tidy up the exported folder. The pro/con of working with files: import is just copying files, but clean up is up to the user
   - On Mac, the filenames were truncated, which caused problems for some weird note titles, and images which were disconnected from the original files in the process - I fixed as much as I could with scripts, the rest I’ll just fix as I go
   - Moved the images and other files in a separate \_resources folder to the note folder and updated note files with the image locations
   - Updated tags: Joplin accepted tags with spaces, Obsidian doesn’t like that, so more scripts to help with that

A thing I notice is how Obsidian is better at nurturing my data-hoarding hobby, for once, tag management is much nicer. In Joplin (and even earlier in Evernote), I let my tagging grow organically, but now I spent some time in structuring my tags better, which also helps in organising how I think about topics.

## Pocket -> Instapaper [Permalink](https://polgarp.com/blog/Knowledge-workflow-2026-updates/\#pocket---instapaper "Permalink")

Last year, after Mozilla decided to close [Pocket,](https://getpocket.com/home) I ended up with a stash of over 4000 “read-it-later” links. Besides using [Instapaper,](https://www.instapaper.com/) I’m also saving fewer things to my reading backlog - both curating things faster and throwing away uninteresting things. Meanwhile, I’m reading through the past items, relying on Obsidian’s better tagging and web clipper tools, plus on Claude to help with some of the more tedious reviews, like articles broken up to multiple pages.

## Claude Code [Permalink](https://polgarp.com/blog/Knowledge-workflow-2026-updates/\#claude-code "Permalink")

After testing multiple agentic tools, I settled on using & subscribing to Claude Code, opting for learning one tool in depth, rather than multiple ones superficially.

I’m still figuring out the best approach. I’m sometimes chatting with Claude on the web for quick questions, using Claude Code from the terminal most of the time ( [Ghostty](https://ghostty.org/) is great), and opening VSCode to see files and make edits. Generally, the terminal feels the fastest and most information-dense.

How I use Claude Code is all over the place: making side projects, exploring creative ideas, organizing and researching information. Like this week, I’ve made a simple command to summarise YouTube videos with timelines to explore (I like to read much more than to watch a long-form video). A lot of things I’ve considered hard or time-consuming in the past turned into something to pick up and finish between my morning yoga and the first meeting of the day, removing the need to learn uninteresting things or go through tedious processes.

In many ways this interaction (or maybe better described as meta-interaction) reminds me of modern mobile games: the energy mechanism (the tokens might run out), the sorta slot-machine like waiting for results (though Opus 4.6 is much more consistent than earlier versions), the easy to enter a flow state (“Huh, I’ve been working on this problem for 4 hours now?”).

The cognitive exhaustion / decision fatigue after a longer session is the most interesting effect I observed sofar. But I also feel more energised, with much of the tedium removed from making things.

It’s fun, but needs mindfulness on how to use responsibly - just because results are easy, sometimes the goal was not to get easy results in the first place. Kinda like how having a “2nd brain” in notes makes people do more thinking instead of doing, having such tools can make people doing more (instead of thinking).

My current rule of thumbs with using agentic systems as a tool are:

- If I intend something I make to be read / used by humans, I should craft ideas, words, and pixels myself as much as possible. If that’s not feasible, I’ll build a separate and appropriate workflow to establish systems and not just launch rapid-fire slop.
- Spend more social and 2nd brain time (here is how Obsidian helps) to balance out agentic time.

#### Comments

giscus

Loading comments…

## You May Also Enjoy

## [Brain fry and the automation trap](https://polgarp.com/blog/brain-fry-and-the-automation-trap/)

2026\. March 15

1 minute read



When Using AI Leads to “Brain Fry”:

## [e49 The power of stepping back](https://polgarp.com/newsletter/the-power-of-stepping-back/)

2026\. March 14

5 minute read



The best ideas and most creative solutions don’t just happen in the depth of work, but often in the between steps. By taking a step back from the work we oft...

## [AI lacks intentionality](https://polgarp.com/blog/AI-lacks-intentionality/)

2025\. October 28

2 minute read



Intention is at the core of designing products. Product design is the rendering of intent.

## [e48 Combating groupthink](https://polgarp.com/newsletter/Combating-groupthink/)

2025\. August 25

5 minute read



Products and teams can fail not only if they are not aligned, but also if they are too aligned. In this case, being in agreement is more important than consi...

Enter your search term...