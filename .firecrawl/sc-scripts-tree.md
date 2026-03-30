[Skip to content](https://github.com/anthropics/skills/tree/main/skills/skill-creator/scripts#start-of-content)

You signed in with another tab or window. [Reload](https://github.com/anthropics/skills/tree/main/skills/skill-creator/scripts) to refresh your session.You signed out in another tab or window. [Reload](https://github.com/anthropics/skills/tree/main/skills/skill-creator/scripts) to refresh your session.You switched accounts on another tab or window. [Reload](https://github.com/anthropics/skills/tree/main/skills/skill-creator/scripts) to refresh your session.Dismiss alert

{{ message }}

[anthropics](https://github.com/anthropics)/ **[skills](https://github.com/anthropics/skills)** Public

- [Notifications](https://github.com/login?return_to=%2Fanthropics%2Fskills) You must be signed in to change notification settings
- [Fork\\
11.5k](https://github.com/login?return_to=%2Fanthropics%2Fskills)
- [Star\\
104k](https://github.com/login?return_to=%2Fanthropics%2Fskills)


## Collapse file tree

## Files

main

Search this repository(forward slash)` forward slash/`

/

# scripts

/

Copy path

## Directory actions

## More options

More options

## Directory actions

## More options

More options

## Latest commit

[![zack-anthropic](https://avatars.githubusercontent.com/u/139395547?v=4&size=40)](https://github.com/zack-anthropic)[zack-anthropic](https://github.com/anthropics/skills/commits?author=zack-anthropic)

[skill-creator: drop ANTHROPIC\_API\_KEY requirement from description op…](https://github.com/anthropics/skills/commit/b0cbd3df1533b396d281a6886d5132f623393a9c)

Open commit details

3 weeks agoMar 6, 2026

[b0cbd3d](https://github.com/anthropics/skills/commit/b0cbd3df1533b396d281a6886d5132f623393a9c) · 3 weeks agoMar 6, 2026

## History

[History](https://github.com/anthropics/skills/commits/main/skills/skill-creator/scripts)

Open commit details

[View commit history for this file.](https://github.com/anthropics/skills/commits/main/skills/skill-creator/scripts) History

/

# scripts

/

Top

## Folders and files

| Name | Name | Last commit message | Last commit date |
| --- | --- | --- | --- |
| ### parent directory<br> [..](https://github.com/anthropics/skills/tree/main/skills/skill-creator) |
| [\_\_init\_\_.py](https://github.com/anthropics/skills/blob/main/skills/skill-creator/scripts/__init__.py "__init__.py") | [\_\_init\_\_.py](https://github.com/anthropics/skills/blob/main/skills/skill-creator/scripts/__init__.py "__init__.py") | [chore: export latest skills (](https://github.com/anthropics/skills/commit/3d59511518591fa82e6cfcf0438d68dd5dad3e76 "chore: export latest skills (#465)") [#465](https://github.com/anthropics/skills/pull/465) [)](https://github.com/anthropics/skills/commit/3d59511518591fa82e6cfcf0438d68dd5dad3e76 "chore: export latest skills (#465)") | last monthFeb 24, 2026 |
| [aggregate\_benchmark.py](https://github.com/anthropics/skills/blob/main/skills/skill-creator/scripts/aggregate_benchmark.py "aggregate_benchmark.py") | [aggregate\_benchmark.py](https://github.com/anthropics/skills/blob/main/skills/skill-creator/scripts/aggregate_benchmark.py "aggregate_benchmark.py") | [chore: export latest skills (](https://github.com/anthropics/skills/commit/3d59511518591fa82e6cfcf0438d68dd5dad3e76 "chore: export latest skills (#465)") [#465](https://github.com/anthropics/skills/pull/465) [)](https://github.com/anthropics/skills/commit/3d59511518591fa82e6cfcf0438d68dd5dad3e76 "chore: export latest skills (#465)") | last monthFeb 24, 2026 |
| [generate\_report.py](https://github.com/anthropics/skills/blob/main/skills/skill-creator/scripts/generate_report.py "generate_report.py") | [generate\_report.py](https://github.com/anthropics/skills/blob/main/skills/skill-creator/scripts/generate_report.py "generate_report.py") | [chore: export latest skills (](https://github.com/anthropics/skills/commit/3d59511518591fa82e6cfcf0438d68dd5dad3e76 "chore: export latest skills (#465)") [#465](https://github.com/anthropics/skills/pull/465) [)](https://github.com/anthropics/skills/commit/3d59511518591fa82e6cfcf0438d68dd5dad3e76 "chore: export latest skills (#465)") | last monthFeb 24, 2026 |
| [improve\_description.py](https://github.com/anthropics/skills/blob/main/skills/skill-creator/scripts/improve_description.py "improve_description.py") | [improve\_description.py](https://github.com/anthropics/skills/blob/main/skills/skill-creator/scripts/improve_description.py "improve_description.py") | [skill-creator: drop ANTHROPIC\_API\_KEY requirement from description op…](https://github.com/anthropics/skills/commit/b0cbd3df1533b396d281a6886d5132f623393a9c "skill-creator: drop ANTHROPIC_API_KEY requirement from description optimizer (#547)  improve_description.py now calls `claude -p` as a subprocess instead of the Anthropic SDK, so users no longer need a separate ANTHROPIC_API_KEY to run the description optimization loop. Same auth pattern run_eval.py already used for the triggering eval.  Prompts go over stdin (they embed the full SKILL.md body). Strips CLAUDECODE env var to allow nesting inside a Claude Code session. The over-1024-char retry is now a fresh single-turn call that inlines the too-long version rather than a multi-turn followup.  SKILL.md: dropped the stale \"extended thinking\" reference to match.") | 3 weeks agoMar 6, 2026 |
| [package\_skill.py](https://github.com/anthropics/skills/blob/main/skills/skill-creator/scripts/package_skill.py "package_skill.py") | [package\_skill.py](https://github.com/anthropics/skills/blob/main/skills/skill-creator/scripts/package_skill.py "package_skill.py") | [chore: export latest skills (](https://github.com/anthropics/skills/commit/3d59511518591fa82e6cfcf0438d68dd5dad3e76 "chore: export latest skills (#465)") [#465](https://github.com/anthropics/skills/pull/465) [)](https://github.com/anthropics/skills/commit/3d59511518591fa82e6cfcf0438d68dd5dad3e76 "chore: export latest skills (#465)") | last monthFeb 24, 2026 |
| [quick\_validate.py](https://github.com/anthropics/skills/blob/main/skills/skill-creator/scripts/quick_validate.py "quick_validate.py") | [quick\_validate.py](https://github.com/anthropics/skills/blob/main/skills/skill-creator/scripts/quick_validate.py "quick_validate.py") | [Update skill-creator and make scripts executable (](https://github.com/anthropics/skills/commit/1ed29a03dc852d30fa6ef2ca53a67dc2c2c2c563 "Update skill-creator and make scripts executable (#350)  - Add `compatibility` optional field to SKILL.md frontmatter spec - Add validation for `compatibility` field in quick_validate.py - Rename \"hyphen-case\" to \"kebab-case\" terminology in init_skill.py   and quick_validate.py - Update max skill name length from 40 to 64 characters - Make scripts executable (chmod +x) for accept_changes.py,   comment.py, extract_form_structure.py, add_slide.py, thumbnail.py,   and recalc.py  Co-authored-by: Claude Opus 4.6 <noreply@anthropic.com>") [#350](https://github.com/anthropics/skills/pull/350) [)](https://github.com/anthropics/skills/commit/1ed29a03dc852d30fa6ef2ca53a67dc2c2c2c563 "Update skill-creator and make scripts executable (#350)  - Add `compatibility` optional field to SKILL.md frontmatter spec - Add validation for `compatibility` field in quick_validate.py - Rename \"hyphen-case\" to \"kebab-case\" terminology in init_skill.py   and quick_validate.py - Update max skill name length from 40 to 64 characters - Make scripts executable (chmod +x) for accept_changes.py,   comment.py, extract_form_structure.py, add_slide.py, thumbnail.py,   and recalc.py  Co-authored-by: Claude Opus 4.6 <noreply@anthropic.com>") | last monthFeb 6, 2026 |
| [run\_eval.py](https://github.com/anthropics/skills/blob/main/skills/skill-creator/scripts/run_eval.py "run_eval.py") | [run\_eval.py](https://github.com/anthropics/skills/blob/main/skills/skill-creator/scripts/run_eval.py "run_eval.py") | [chore: export latest skills (](https://github.com/anthropics/skills/commit/3d59511518591fa82e6cfcf0438d68dd5dad3e76 "chore: export latest skills (#465)") [#465](https://github.com/anthropics/skills/pull/465) [)](https://github.com/anthropics/skills/commit/3d59511518591fa82e6cfcf0438d68dd5dad3e76 "chore: export latest skills (#465)") | last monthFeb 24, 2026 |
| [run\_loop.py](https://github.com/anthropics/skills/blob/main/skills/skill-creator/scripts/run_loop.py "run_loop.py") | [run\_loop.py](https://github.com/anthropics/skills/blob/main/skills/skill-creator/scripts/run_loop.py "run_loop.py") | [skill-creator: drop ANTHROPIC\_API\_KEY requirement from description op…](https://github.com/anthropics/skills/commit/b0cbd3df1533b396d281a6886d5132f623393a9c "skill-creator: drop ANTHROPIC_API_KEY requirement from description optimizer (#547)  improve_description.py now calls `claude -p` as a subprocess instead of the Anthropic SDK, so users no longer need a separate ANTHROPIC_API_KEY to run the description optimization loop. Same auth pattern run_eval.py already used for the triggering eval.  Prompts go over stdin (they embed the full SKILL.md body). Strips CLAUDECODE env var to allow nesting inside a Claude Code session. The over-1024-char retry is now a fresh single-turn call that inlines the too-long version rather than a multi-turn followup.  SKILL.md: dropped the stale \"extended thinking\" reference to match.") | 3 weeks agoMar 6, 2026 |
| [utils.py](https://github.com/anthropics/skills/blob/main/skills/skill-creator/scripts/utils.py "utils.py") | [utils.py](https://github.com/anthropics/skills/blob/main/skills/skill-creator/scripts/utils.py "utils.py") | [chore: export latest skills (](https://github.com/anthropics/skills/commit/3d59511518591fa82e6cfcf0438d68dd5dad3e76 "chore: export latest skills (#465)") [#465](https://github.com/anthropics/skills/pull/465) [)](https://github.com/anthropics/skills/commit/3d59511518591fa82e6cfcf0438d68dd5dad3e76 "chore: export latest skills (#465)") | last monthFeb 24, 2026 |
| View all files |

You can’t perform that action at this time.