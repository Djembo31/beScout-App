# Slice 485 — D-04 (W3): lineups DB-Integrität (Bench-FKs + Distinctness-Trigger)

**Slice-Type:** Migration · **Größe:** L (Architektur/CEO-Scope, money-adjacent) · **Welle:** Mock→Pro W3 · **Scope:** §3 selbst + Reviewer

## 1. Problem-Statement (live verifiziert)
`lineups`-Integrität lebt 100% im 27k-`rpc_save_lineup` (root-cause #2, D111). Zwei DB-Lücken:
- (a) **`bench_gk/o1/o2/o3` ohne FK→players** — die 12 Starter-Slots haben FK, die 4 Bench-Spalten NICHT (live `pg_constraint`-Listing bestätigt). Referenzielle Integritäts-Lücke (Orphan-Bench möglich).
- (b) **Kein DB-Constraint gegen denselben Spieler in >1 Slot — Integrität lebt NUR im RPC.** Der RPC validiert die volle 16-Slot-Distinctness bereits **graceful**: Starter via `v_seen` (RETURN `{ok:false,'duplicate_player'}`) **+ separate Bench-Schleife** (RETURN `{ok:false,'bench_duplicate'/'bench_overlaps_starter'}`, mig `20260626160000:187-188`, S455). Aber kein DB-Level-Enforcement → Direkt-Writes / Nicht-RPC-Writer / künftige Writer können Doppel-Spieler erzeugen.

> **KORREKTUR (Reviewer R1, HIGH):** Die ursprüngliche Prämisse „RPC prüft nur 12 Starter, Bench NICHT" war eine **Fehllesung** — ich stoppte bei der `v_seen`-Starter-Schleife und übersah die separate Bench-Validierungs-Schleife. Der RPC erzwingt die volle 16-Slot-Invariante bereits. Der Trigger ist damit ein **reiner DB-Backstop** (Defense-in-Depth für Nicht-RPC-Writes), KEINE RPC-Lücken-Schließung. Migration bleibt korrekt + wertvoll (Register-Kern = „Integrität lebt nur im RPC" → jetzt auch DB-enforced).

**Daten-Realität (read-only):** 447 Lineups · **0 Doppel-Spieler** · **0 befüllte Bench** · **0 Orphan-Bench** → beide Constraints additiv ohne Cleanup applizierbar.

## 2. Lösungs-Design (Defense-in-Depth, additiv, kein RPC-Touch, D-20-Wide-Column behalten)
1. **4 FK** `bench_* → players(id)` (plain REFERENCES, spiegelt die Starter-Slot-FK-Definition).
2. **Trigger** `trg_lineups_player_distinct` BEFORE INSERT/UPDATE (D39-Pattern, wie `prevent_player_ghost_insert`): prüft alle **16 Slots** (Starter + Bench) mutually distinct → `RAISE 'duplicate_player'` (reuse RPC-Error-Code → bestehende i18n `duplicatePlayer` DE+TR, kein Roh-Leak). GUC-Escape `bescout.allow_lineup_dup` für Bulk-Migrationen. `SET search_path='public'`.
- **Atomizität verifiziert:** RPC schreibt beide Pfade (INSERT + UPDATE-ELSE) in EINER Anweisung mit allen 16 Slots → BEFORE-Trigger feuert einmal auf finaler Row, kein transienter Zwischen-Dup → keine Regression.
- **Trigger = reiner DB-Backstop** für Direkt-/Nicht-RPC-Writes (der RPC erzwingt dieselbe 16-Slot-Invariante bereits graceful). Defense-in-Depth, kein zweiter Weg — schließt den Register-Kern „Integrität lebt 100% im RPC" auf DB-Ebene. Für legitime RPC-Writes feuert der Trigger NIE (RPC produziert immer distinct).

## 3. Betroffene Files
- `supabase/migrations/20260630190000_slice_485_lineup_integrity.sql` (4 FK + Trigger-Fn + Trigger).
- Kein Service-/Type-/RPC-Change. (RPC-Bench-Distinctness-Refinement = getrackter Follow-up, s. §11.)

## 4. Code-Reading-Liste (erledigt, D87 live)
1. Live `lineups`-Schema + `pg_constraint`: 12 Starter-FK ✓, 0 Bench-FK, UNIQUE(event,user), kein Distinctness-Constraint. ✓
2. Live `rpc_save_lineup` (27k, **ganzer Body**): Starter-Distinctness `v_seen` → RETURN `{ok:false,'duplicate_player'}` (Z.142, KEIN RAISE) + **separate Bench-Schleife** → RETURN `{ok:false,'bench_duplicate'/'bench_overlaps_starter'}` (Z.187-188) = volle 16-Slot-Distinctness graceful; atomarer INSERT + UPDATE-ELSE. ✓ (R1-Korrektur: initial nur die Starter-Schleife gelesen.)
3. `mapErrorToKey`/i18n: `duplicate_player`→`duplicatePlayer` (DE/TR vorhanden, messages 999/3681). ✓
4. `db-invariants.test.ts:1353`: guardet RPC-`'duplicate_player'`-Check → bleibt grün (RPC unberührt). ✓
5. errors-db D39 (Trigger+GUC-Invariant-Pattern) + S189 (ghost-prevention Trigger als Vorlage). ✓
6. Daten-Check: 447/0/0/0 (dup/bench/orphan). ✓

## 5. Pattern-References
- errors-db **D39** (BEFORE-OP-Trigger + GUC-Escape + RAISE) · **S189** (prevent_player_ghost_insert Vorlage).
- §0/§3: DB-Backstop ergänzt RPC (kein Ersatz), kein zweiter Weg — Trigger + RPC-Check zielen auf dieselbe Invariante.
- database.md AR-44: Trigger-Funktion exempt von REVOKE-Pflicht (trotzdem REVOKE PUBLIC/anon für Hook + Hygiene).

## 6. Acceptance Criteria
- AC1: 4 FK `bench_*→players` existieren (`pg_constraint`). VERIFY: SQL.
- AC2: Trigger `trg_lineups_player_distinct` BEFORE INSERT/UPDATE existiert + Fn-Body hat alle 16 Slots. VERIFY: functiondef.
- AC3 (Negativ Starter): UPDATE bestehendes Lineup `slot_def1 = slot_gk` → RAISE `duplicate_player`, Rollback. VERIFY: force-rollback.
- AC4 (Negativ Bench — die neue Abdeckung): UPDATE `bench_gk = slot_gk` → RAISE `duplicate_player`. VERIFY: force-rollback.
- AC5 (Positiv No-op): UPDATE eines Bestands-Lineups auf identische Slots → passt (RPC-Daten trigger-valide, 0 Regression). VERIFY: force-rollback.
- AC6 (FK Negativ): `bench_gk = '<non-existent uuid>'` → FK-Violation. VERIFY: force-rollback.
- AC7 (FK Positiv + Bench nutzbar): `bench_gk = '<valider, im Lineup distinct player>'` → passt. VERIFY: force-rollback.
- AC8 (GUC-Escape): `SET LOCAL bescout.allow_lineup_dup='true'` + Dup-UPDATE → passt. VERIFY: force-rollback.
- AC9: db-invariants unverändert (RPC-Check-Invariant grün, RPC unberührt). VERIFY: vitest-Subset / kein neuer Fail.

## 7. Edge Cases
| Fall | Verhalten |
|------|-----------|
| Mehrere leere Slots (NULL) | unnest WHERE s IS NOT NULL → NULLs ignoriert, kein false-Dup |
| Alle 11 Starter distinct + leere Bench | passt (Standard) |
| Bench == Starter (invalide) | RAISE duplicate_player (neue DB-Abdeckung) |
| Bench == Bench | RAISE duplicate_player |
| RPC-Write (immer 12 Starter distinct) | Trigger passt (kein Regress, 447/0 Beleg + No-op-Smoke) |
| Bulk-Migration nötig | GUC-Escape bescout.allow_lineup_dup |
| Spieler-Hard-Delete referenziert in Bench | FK NO ACTION blockt (wie Starter-Slots) |

## 8. Self-Verification
- `mcp__supabase__apply_migration` → `pg_constraint`-Listing (4 FK + Trigger) + functiondef
- force-rollback-Smoke AC3-AC8 (BEGIN…ROLLBACK, RAISE-Capture via EXCEPTION-Block)
- `npx vitest run src/lib/services/__tests__/lineups.test.ts` (RPC-Pfad unberührt)

## 9. Open-Questions
- Keine Pflicht-Klärung. RPC-Bench-Distinctness-Graceful-Error = bewusster Follow-up (§11), nicht Blocker (Bench unbenutzt, Trigger deckt DB-Ebene).

## 10. Proof-Plan
`worklog/proofs/485-lineup-integrity.txt`: apply-Result + constraint/functiondef-Listing + force-rollback AC3-AC8 (jeweils Block/Pass) + vitest lineups + Daten-Baseline 447/0/0/0.

## 11. Scope-Out (getrackt, §0)
- ~~RPC `v_all_slots` Bench-Distinctness~~ **GESTRICHEN (R1, HIGH):** war Phantom-Debt — der RPC validiert die Bench bereits graceful (`bench_duplicate` + `bench_overlaps_starter`, beide in errorMessages.ts KNOWN_KEYS + useEventActions.ts gemappt). Kein realer Gap → KEIN Follow-up. (Anti-§0: Phantom-Schuld hätte eine Session unnötig in den 25k-Money-RPC geroutet.)
- Orphan-Typ `Lineup` (types/index.ts) = D-20-Hygiene, separat.
- Normalisierung (lineup_slots-Tabelle) = D-20 „behalten" (CEO 2026-06-29), NICHT hier.

## 12. Stage-Chain
SPEC → IMPACT (skipped: additive Constraints, kein Consumer-Contract-Change) → BUILD (Migration) → REVIEW (reviewer, money-adjacent DB-Integrität) → PROVE (apply+force-rollback+functiondef+vitest) → LOG.

## 13. Pre-Mortem (L-Pflicht ≥5)
1. **Trigger regressiert legit RPC-Writes** → No-op-Smoke (AC5) + 447/0-Beleg + atomare-Write-Verifikation entkräften. Sollte ein Bestands-Lineup wider Erwarten failen → STOP, Daten-Recheck.
2. **Bench-FK-Add scheitert an Orphan-Bench** → 0 Orphan-Bench verifiziert; ALTER validiert gegen 0 Rows.
3. **Trigger-Error nicht i18n-gemappt** → `duplicate_player` reuse → bestehende `duplicatePlayer`-Keys, kein Roh-Leak (verifiziert).
4. **Transienter Zwischen-Dup im RPC trippt Trigger** → beide Write-Pfade atomar (1 Statement, alle Slots) verifiziert → ausgeschlossen.
5. **GUC-Escape vergessen → Bulk-Migration blockt** → Escape `bescout.allow_lineup_dup` eingebaut.
6. **Pre-commit AR-44-Hook blockt CREATE FUNCTION** → REVOKE PUBLIC/anon-Block (trotz Trigger-Fn-Exemption) ergänzt.
