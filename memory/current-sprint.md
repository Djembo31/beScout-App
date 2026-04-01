# Current Sprint — CLS Live

## Stand (2026-04-01, Session 277)
- **Tests:** tsc 0 Errors
- **Branch:** main
- **Migrations:** 299 (rpc_get_most_watched_players added)
- **Agent Team:** v3 + CLS v1.1 deployed (Constitution + Insight Pool + Direct Chaining + Boards)

## Erledigt (Session 277)

### Features (5 Pipeline Tests)
- **BES-49:** Most Watched Players Strip (Home) — RPC + Component + i18n — 31551e6, a184f4f
- **BES-58:** 24h Price Change Badge (DiscoveryCard) — 73d47e9
- **BES-59:** Notification Preferences Panel (Dropdown) — 6e1a90b
- **BES-60:** L5 Score Form Dots (Player Detail) — b2aec4b
- **BES-61:** Notification Badge (TopBar Bell) — 0ddf3bd

### CLS Deployment (12 Tasks + 5 Fixes)
- Constitution: 28 immutable principles (wiki/CONSTITUTION.md)
- Insight Pool: 15 global + 25 agent-local insights (JSON format)
- Context Boards: wiki/boards/ with live dashboard per feature
- All 7 HEARTBEATs: Pre-Flight + Retro + Scoring + Direct Chaining
- CTO Constitutional Validator
- Proactive Scan (SE + FE when idle)
- Cross-Agent Insight Reading (step 3b)
- Fixes: HARD RULES, Board-Updates for QA/CTO/CR, CodexReviewer CHECK WORK

### CLS Verification (BES-68)
- Context Board: CEO erstellt automatisch
- Direct Chaining: FE triggert QA + CodexReviewer selbst
- Insight Pool: FE aktualisiert Scores nach Task
- 7/8 CLS checkpoints passed
- CodexReviewer: adapter error (Codex CLI issue)

## Board Status
- 75 issues total, 69 done
- CLS operational: Learning D+ → B+, Communication C → A-
- 40 total insights across all agents
- 2 global insights at score 5 (rule-promotion candidates)

## Naechste Prioritaet
1. CLS mit 5-10 echten Tasks validieren (Score-Tracking)
2. CodexReviewer adapter fix (5x error in CLS test)
3. Proactive Scan testen (idle Heartbeat)
4. Rule promotion: insights #4 and #5 → permanent rules
5. Cleanup: docs/plans/bes26.json, bes27.json, bes28.json

## Bekannte Issues
- CodexReviewer Codex CLI broken (5 consecutive errors)
- CEO Auto-Wake braucht manchmal manuellen Trigger
- Board-Updates durch QA/CTO erst deployed, noch nicht live getestet
- Don't pre-create QA/CodexReview backlog issues — let engineers Direct Chain

## Blocker
- Keine
