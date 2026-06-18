# Slice 338 Proof — Predictions-Feature-Removal

## Code-Proof (vor Commit)

### tsc clean
`npx tsc --noEmit` → 0 Errors.

### vitest (betroffene Files)
`CI=true npx vitest run scoring-v2 SpieltagTab MitmachenTab AnalystTab PostCard` → **69/69 passed** (nach PostCard-`toHaveLength`-Fix 4→3).

### Diff-Stat
54 Files, **+490 / −3664** (netto −3174 Zeilen). 14 Files gelöscht (dediziert), 1 Migration neu.

### Removal-Sweep (AC-06)
```
src/        : clean (nur ChallengeType 'prediction' — bewusst behalten, anderes Feature)
messages/   : clean (0)
scripts/    : nur add-i18n-keys-batch9.js (historisches Einmal-Seed — erlaubtes Residuum, NIT#1)
.claude/rules/: errors-frontend.md:979 + testing.md:144-205 (historische Lern-Doku-Beispiele — erlaubte Residuen, NIT#2) + fantasy.md paths-Glob GEFIXT
```
de/tr-Key-Parität: **0 only-de / 0 only-tr** (node-Check).

### DB-Diligence (live, vor DROP — Achse 2 Pre-Counts ALLE 0)
| Objekt | Wert | Daten |
|--------|------|-------|
| predictions | DROP | 1 Testzeile (2026-05-01), 0 eingehende FKs |
| notifications type='prediction_resolved' | CHECK -1 | 0 Rows |
| notifications reference_type='prediction' | CHECK -1 | 0 Rows |
| posts category='Prediction' | CHECK -1 | 0 Rows (Analyse:1, Meinung:8, News:1) |

## DB-Proof (nach Apply — AC-03/04/05)

Migration `slice_338_remove_predictions` via `mcp__supabase__apply_migration` → `{"success":true}`.
**Deploy-Reihenfolge eingehalten (Pre-Mortem #3):** Code-Push b15c69b5 → Vercel-Deploy `success` (verifiziert) → DANN DB-DROP.

| Check | Ergebnis |
|-------|----------|
| AC-03 predictions-Tabelle | `NULL (gone)` ✓ |
| AC-03 prediction-RPCs | `0 (gone)` ✓ |
| AC-04/05 notifications_type_check | prediction_resolved weg, poll_new/event_scored/creator_fund_payout erhalten ✓ |
| AC-04/05 notifications_reference_type_check | prediction weg, research/poll/club/system erhalten ✓ |
| AC-04/05 chk_posts_category | Prediction weg, Analyse/Meinung/News erhalten ✓ |

Containment-Proof gegen die Live-`pg_get_constraintdef`-Definitionen (kein versehentlich verlorener Wert).
