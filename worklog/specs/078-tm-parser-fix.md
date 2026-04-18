# Slice 078 — TM Parser Fix (Markup-Change seit 2026-04)

**Datum:** 2026-04-20
**Stage:** SPEC → BUILD → PROVE
**Size:** XS (1 File + 1 Test-File)
**CEO-Scope:** Nein — Data-Quality-Fix, kein User-Impact-Change

## Ziel

`parseMarketValue` aktualisieren, damit neues TM-Markup (`data-header__market-value-wrapper`) korrekt geparst wird. ~433 Stamm-/Rotationsspieler haben fälschlich MV=0 obwohl TM echte Werte zeigt (z.B. Morgan Rogers €80M).

## Warum

Sanity-Check (5 Stichproben aus Premier League + Serie A):

| Player | TM (echt) | DB | Parser vor Fix |
|---|---|---|---|
| Morgan Rogers | € 80,00 Mio. | 0 | null |
| Ezri Konsa | € 40,00 Mio. | 0 | null |
| Ollie Watkins | € 30,00 Mio. | 0 | null |
| Matty Cash | € 22,00 Mio. | 0 | null |
| Jean Butez | € 8,00 Mio. | 0 | null |

Root cause: TM hat 2026-04 das Markup umgestellt.
- Alt: `data-header__box--marketvalue` + `€ X Mio.` (€ vor Zahl)
- Neu: `data-header__market-value-wrapper` + `X,XX <span class="waehrung">Mio. €</span>`

Alte Regex findet den Block nicht → `null` → DB behält 0.

## Files

1. **`src/lib/scrapers/transfermarkt-profile.ts`** (EDIT)
   - `parseMarketValue` bekommt primary-Regex für neues Markup + fallbacks für altes Markup
   - `parseContractEnd` bleibt unverändert (funktioniert weiter)

2. **`src/lib/scrapers/transfermarkt-profile.test.ts`** (NEW)
   - Regression-Guard mit 5 echten HTML-Fixtures aus `tmp/tm-sanity/`
   - Deckt Mio-Format, Tsd-Format (synthetisch), altes Markup (synthetisch), kein Markup (null)

3. **`scripts/tm-parser-sanity.ts`** (NEW, Debug-Tool)
   - Live-Check vor/nach Rerun, HTML-Dump

4. **`scripts/tm-parser-verify.ts`** (NEW, Offline-Test-Runner)

## Acceptance Criteria

- **AC1** 5/5 offline-Verify (`tsx scripts/tm-parser-verify.ts`) passed
- **AC2** `npx vitest run src/lib/scrapers/` passed
- **AC3** tsc --noEmit clean
- **AC4** Nach Full-Rerun: `get_player_data_completeness()` zeigt MV-Pct deutlich höher (Erwartung: alle 7 Ligen >= 95% Stammkader-MV)

## Edge Cases

- Player mit MV=0 bei TM (real) → Parser returnt 0 (via plain-match fallback) ✓
- Neues Markup fehlt (offline/404) → alter Fallback kickt in
- Malformed Zahl → `parseFloat` returnt `NaN` → `Number.isFinite` guard
- `Tsd.` statt `Mio.` (synth Test) → faktor 1_000

## Proof-Plan

1. `worklog/proofs/078-parser-verify.txt` — offline 5/5
2. `worklog/proofs/078-vitest.txt` — Regression-Test run
3. `worklog/proofs/078-before-completeness.json` — DB-Stand vor Rerun
4. `worklog/proofs/078-after-completeness.json` — DB-Stand nach Rerun
5. `worklog/proofs/078-rerun-log.txt` — Script-Output mit updated-Count

## Scope-Out

- Full residential-proxy Integration (Phase 3 laut Chat)
- Cron-Reaktivierung (bleibt manual-only bis Proxy)
- parseSearchResults in `transfermarkt-search.ts` (separater Check, falls Bedarf)
