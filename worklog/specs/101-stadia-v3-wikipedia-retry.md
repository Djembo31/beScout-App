# Slice 101 — Stadia v3: Wikipedia Retry mit Exponential Backoff

**Datum:** 2026-04-20
**Größe:** XS (1 File, Pattern-bekannt)
**CEO-Scope:** Nein (utility script, kein Money/Security)
**Approval:** S-Slice: true (Anil hat HOT-Task 1 via "a starten" approved)

## Ziel

`scripts/fetch-stadium-images.mjs` resilient gegen Wikipedia 429-rate-limiting machen, damit die 68 remaining non-TFF1 Stadia automatisch erfasst werden nach Cooldown.

## Betroffene Files

- `scripts/fetch-stadium-images.mjs` — User-Agent + retry-on-429 + exponential backoff + summary counters erweitern

## Acceptance Criteria

1. **User-Agent** gesetzt auf `BeScoutApp/1.0 (https://bescout.net; kx.demirtas@gmail.com)` (Wikimedia Policy requirement) — konsistent in allen `fetch()`-Calls via gemeinsame Constant.
2. **Retry-on-429**: bei `res.status === 429` exponential backoff 5s → 15s → 60s, max 3 retries. Zwischen Retries: `console.log` die Wartezeit.
3. **Retry-on-Network**: bei fetch-exception ebenfalls einmal retry mit 5s wait (transient errors).
4. **Fail-open**: Nach 3 failed retries → skip mit `❌ 429-blocked` message, Script läuft weiter (nicht abbrechen).
5. **Summary** am Ende zeigt zusätzlich `429-failed` count (neben downloaded/failed/skipped/alreadyExists).
6. **Keine Regression**: Happy-Path (200 OK) verhält sich identisch.

## Edge Cases

1. 429 auf Search → retry triggers, danach search erfolgreich → continue
2. 429 auf PageImages (nach erfolgreicher Search) → retry triggers, danach ok
3. 429 auf Download (nach erfolgreichem Metadata) → retry triggers, file saved
4. 429 nach 3 retries → skip, next club
5. 404 (page not found) → no retry, skip immediately (nicht retry-worthy)
6. Network timeout (fetch throws) → 1x retry mit 5s
7. 200 aber leeres response → `results.length === 0` → next search term (bereits gehandhabt)
8. Concurrent 429 auf verschiedenen Stages — jeder request retryed unabhängig

## Proof-Plan

- **Script-Run Output**: `worklog/proofs/101-stadia-v3-run.txt` (voller stdout/stderr von `node scripts/fetch-stadium-images.mjs --exclude-league=TFF1`)
- **Counter Vor/Nach**: `ls public/stadiums/*.jpg | wc -l` (67 baseline → target ≥100, realistisch 60-66 neue von 68 possible, ~7 "not found" erwartet)
- **Success-Kriterium**: mindestens 40 neue Stadion-Bilder heruntergeladen, 0 Script-Crashes

## Scope-Out

- Manual URLs für 7 historisch "not found" Stadia (Ennio Tardini, Galatasaray RAMS, Kasımpaşa, Kocaelispor, Samsunspor, Atalanta, Genoa) — separater Slice, manueller Datenerfassungs-Aufwand.
- TFF1 Stadia — CEO-Sperrgebiet laut Handoff 2026-04-22.
- Alternative Image-Quellen (Google Images, Unsplash) — post-Beta optimization.
- Retry-Limit configurable via CLI-Flag — YAGNI, default ist fine.

## Stage-Plan

- **SPEC** — dieses File ✅
- **IMPACT** — skipped (utility script only, kein DB/RPC/Service/Type touch)
- **BUILD** — `scripts/fetch-stadium-images.mjs` edit
- **PROVE** — Wait for Wikipedia cooldown (~22 min ab 18:10), dann Script-Run, Output nach `worklog/proofs/101-stadia-v3-run.txt`
- **LOG** — Commit + log.md entry, wenn success

## Pattern-Referenzen

- Retry-with-backoff Standard-Pattern: siehe z.B. `scripts/tm-rescrape-stale.ts` (existing retry logic)
- Wikipedia UA Policy: https://meta.wikimedia.org/wiki/User-Agent_policy
