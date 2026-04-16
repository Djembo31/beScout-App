# 003 — CHECK Constraint → TS Union Alignment (A-05)

## Ziel
INV-18 hinzufuegen: Fetched Live-DB CHECK-Constraint-Values fuer kritische Money-Tabellen und vergleicht sie mit hard-coded erwarteten Sets. Findet Drifts wo TS Werte kennt die DB nicht erlaubt (→ INSERT crash) oder DB Werte akzeptiert die TS nicht kennt (→ UI "unknown"-Display).

## Klassifizierung
- **Slice-Groesse:** S (1 Test-Addition, read-only, keine Code-Fixes)
- **Scope:** CTO-autonom (Audit-Test + Doku, kein Money/Security-Change)
- **Scope-Tuning:** Slice findet Drifts, FIXT sie aber NICHT. Der Fix erzeugt neuen Slice pro Drift (wenn relevant).

## Betroffene Files
| Pfad | Aktion | Begruendung |
|------|--------|-------------|
| `src/lib/__tests__/db-invariants.test.ts` | EDIT — INV-18 hinzufuegen | Bestehendes Harness, Pattern ist gesetzt |

## Acceptance Criteria
1. INV-18 fetched `transactions.type`, `orders.status`, `orders.side`, `offers.status`, `offers.side`, `events.status`, `players.position`, `user_stats.tier`, `research_posts.call`, `research_posts.category`, `lineups.captain_slot`, `club_subscriptions.tier` CHECK-Werte aus `pg_constraint`.
2. Test vergleicht jede mit einem hardcoded `expected: readonly string[]` im Test.
3. Output: jede Constraint → `{ table, column, only_in_db: [...], only_in_expected: [...] }`.
4. Test **passiert** wenn die erwarteten Werte die DB-Werte als Superset enthalten (DB ⊆ Expected). D.h. TS darf mehr kennen (future-proof), aber nicht weniger.
5. Test **failt** wenn DB Werte hat, die Expected nicht kennt — das waere ein echter UI-Display-Gap.
6. Proof: Output in `worklog/proofs/003-check-alignment.txt`.
7. tsc clean.

## Edge Cases
1. **Hinzugefuegte CHECK-Werte in DB** — Wenn eine Migration einen Wert hinzufuegt (z.B. neuer transaction-type), INV-18 schlaegt fehl → Hinweis den Test zu aktualisieren. Ist gewollt.
2. **Entfernte TS-Werte** — Wenn TS shrink-t, INV-18 passt, weil Expected ⊇ DB bleibt. Kein False-Negative.
3. **Case-Sensitivity** — Werte wie 'Rookie'/'Amateur' (capitalized). Vergleich ist string-exact.
4. **Numerische Werte** — `post_votes.vote_type` ist SMALLINT 1/-1, `user_founding_passes.migration_bonus_pct` ist INT-Array. Ausserhalb Scope (nur String-Enums).
5. **Composite CHECKs** — z.B. `events.chk_tournament_no_paid_entry` ist keine enum-Liste. Nicht betroffen.
6. **Dynamisch erzeugte Values** (z.B. `validate_reward_structure`) — ignorieren, nur `ANY (ARRAY[...])`-Pattern parsen.

## Proof-Plan
- Test-Output nach `worklog/proofs/003-check-alignment.txt`.
- Der Output zeigt EXPLIZIT alle Drifts pro Tabelle — das ist der Backlog fuer Folge-Slices.

## Scope-Out
- **KEINE Fixes** der gefundenen Drifts. Jeder Drift-Fix = eigener Slice (moeglicherweise CEO-Scope bei Money-Tabellen).
- **KEINE auto-generated TS-Union aus DB.** Zu komplex, waere eigener Toolkit-Slice.
- **KEINE Tests fuer CHECK constraints die NICHT enum-artig sind** (char_length, BETWEEN, etc.).
- **KEINE test-Integration fuer CI.** INV-Tests sind live-DB, CI-excluded nach bestehender Convention.

## Stages
- SPEC — dieses File (aktuell)
- IMPACT — **skipped** (Grund: Test-Only Addition, keine Consumer aussser Test selbst)
- BUILD — INV-18 schreiben
- PROVE — vitest run → Output nach Proof
- LOG — Eintrag, Drifts als Folge-Backlog dokumentieren
