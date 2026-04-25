# ⚠️ BETA-FREEZE-PARTIAL — Bots traden, posten nicht

**Seit 2026-04-25 (Slice 194):** Trading-Phasen aktiv, Community-Phasen weiter disabled.

**Original-Freeze: 2026-04-21 (Slice 129).** Vollstaendig bis Slice 194.

## Slice 194 Update (2026-04-25)
- **Aktiv:** Trading (IPO/Market/P2P), Lineup-Submit, Mission-Claim, Mystery-Box, Watchlist, Following
- **Disabled:** `createPost`, `votePost` (in `agent.ts` mit `if (false &&...)` gemutet)
- **Bot-Budgets:** 10x hochgezogen (avg ~70k $SCOUT) fuer realistic P2P-Trading-Volume
- **Erlaubte Commands:**
  ```bash
  npx tsx e2e/bots/ai/run.ts --setup          # 50 Bot-Accounts anlegen
  npx tsx e2e/bots/ai/run.ts --bot 5          # Single bot
  npx tsx e2e/bots/ai/run.ts --batch 1-10     # Batch
  npx tsx e2e/bots/ai/run.ts --smart 15       # Market-aware Selection
  npx tsx e2e/bots/ai/run.ts --qa 10          # QA-Mode
  ```

## Original-Grund (Slice 129)
Bot-Templates in `agent.ts` (Fan-Archetype, Analyst, Trader, Lurker) sind alle **hart auf DE**. Jeder `runBotSession()` postet DE-Strings in die **Production-DB** (`posts` + `post_votes`). Türkische User sehen dann DE-Posts in der Community-Feed auf `/community`.

TR-Audit vom 2026-04-21 fand 10 DE-Bot-Posts in der Community (siehe `memory/beta-tr-locale-findings.md` Bug 2).

## Cleanup gemacht
Slice 129 (2026-04-21):
- 105 Bot-Posts gelöscht
- 129 Votes auf Bot-Posts gelöscht
- 29 Bot-Votes auf Human-Posts gelöscht
- Bot-Profiles behalten (50) → stehen weiter in Rankings-Listen

## Was nicht laufen darf vor Beta-Launch (post-Slice-194)

```bash
# Survey-Mode noch nicht freigeschaltet (Posts-Trigger):
npx tsx e2e/bots/ai/run.ts --survey 20      # POSTS DE in DB
npx tsx e2e/bots/ai/run.ts --all            # full pipeline mit posts
```

Alles andere ist nach Slice 194 freigegeben (Community-Phase im Code gemutet).

## Was erlaubt bleibt

- **Synthetic-Suite** (`pnpm run test:synthetic`) — macht keine Bot-Session, nur Read-Only-Scans.
- **Smoke-Suite** (`pnpm run test:smoke`) — keine Writes in `posts`.

## Nach Beta-Launch

2 Optionen:
1. **Bot-Templates bilingual machen** (3h): Templates als `{de: ..., tr: ...}` + Bot-Locale aus Config (türkische Bot-Namen → tr, deutsche → de).
2. **Bots weiterhin offline** bis echte Community-Traction.

Entscheidung post-Beta.
