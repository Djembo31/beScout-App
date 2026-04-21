# ⛔ BETA-FREEZE — Bots nicht starten

**Seit 2026-04-21 (Slice 129) / Feature-Freeze aktiv.**

## Grund
Bot-Templates in `agent.ts` (Fan-Archetype, Analyst, Trader, Lurker) sind alle **hart auf DE**. Jeder `runBotSession()` postet DE-Strings in die **Production-DB** (`posts` + `post_votes`). Türkische User sehen dann DE-Posts in der Community-Feed auf `/community`.

TR-Audit vom 2026-04-21 fand 10 DE-Bot-Posts in der Community (siehe `memory/beta-tr-locale-findings.md` Bug 2).

## Cleanup gemacht
Slice 129 (2026-04-21):
- 105 Bot-Posts gelöscht
- 129 Votes auf Bot-Posts gelöscht
- 29 Bot-Votes auf Human-Posts gelöscht
- Bot-Profiles behalten (50) → stehen weiter in Rankings-Listen

## Was nicht laufen darf vor Beta-Launch

```bash
# DIESE COMMANDS NICHT AUSFÜHREN bis Beta durch ist:
npx tsx e2e/bots/ai/run.ts --setup
npx tsx e2e/bots/ai/run.ts --all
npx tsx e2e/bots/ai/run.ts --smart 15
npx tsx e2e/bots/ai/run.ts --batch 1-10
npx tsx e2e/bots/ai/run.ts --qa 10
npx tsx e2e/bots/ai/run.ts --survey 20
npx tsx e2e/bots/ai/run.ts --bot 5
```

Jeder dieser Commands schreibt wieder DE-Posts in die Production-DB.

## Was erlaubt bleibt

- **Synthetic-Suite** (`pnpm run test:synthetic`) — macht keine Bot-Session, nur Read-Only-Scans.
- **Smoke-Suite** (`pnpm run test:smoke`) — keine Writes in `posts`.

## Nach Beta-Launch

2 Optionen:
1. **Bot-Templates bilingual machen** (3h): Templates als `{de: ..., tr: ...}` + Bot-Locale aus Config (türkische Bot-Namen → tr, deutsche → de).
2. **Bots weiterhin offline** bis echte Community-Traction.

Entscheidung post-Beta.
