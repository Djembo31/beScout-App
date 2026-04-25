# Slice 195 Self-Review (D35) — Sub-Slice 195a

**Datum:** 2026-04-25
**Reviewer:** Self (CTO/Primary Claude per D35 — trivial 2-Konstanten-Change ohne Logik-Aenderung)
**Verdict:** PASS

## Scope dieses Reviews

Slice 195a — Captain-Multiplier Migration (`score_event` RPC).
Sub-Slices 195b/c/d/e folgen separat mit eigenen Reviews (Cold-Reviewer-Agent fuer 195d empfohlen).

## Spec-Coverage (Slice 195a Sub-Set)

- [x] **CEO-Decision 1**: Captain-Multiplier 1.5× → 1.1× — applied + verified live
- [x] **CEO-Decision 2**: Boost-Chip Multiplier 3.0× → 1.25× — applied + verified live
- [x] **AC 1**: Captain-Slot mit 10 Pkt rohen Punkten → 11 Pkt (1.1× verified) — Test pending in 195d
- [x] **AC 2**: Boost-Chip aktiv + Captain 10 Pkt → 12.5 Pkt (1.25×) — Test pending in 195d

**Out-of-Scope** (kommt in 195b-e):
- AC 3 Boost-Chip Validation Captain-only — 195b
- AC 4 Boost-Chip Rename `triple_captain` → `captain_boost` — 195b
- AC 5-6 Bench + Auto-Sub — 195d
- AC 7-8 Event max_per_club — 195c
- AC 9-10 Differentials — 195e

## Findings (gegen common-errors.md + business.md)

### CREATE OR REPLACE FUNCTION — PATCH-AUDIT (errors-db.md Rule)

✅ **Source-of-truth verifiziert:** `20260407190000_score_event_no_lineups_handling.sql` ist neueste vorherige Migration mit `score_event`-Body (siehe `pg_get_functiondef` pre-migration Check).

✅ **Preserved Patches:**
- `auth.uid()` Guard (admin-check + club_admin + created_by)
- `scored_at IS NOT NULL` Guard (idempotency)
- `gameweek IS NULL` Guard
- 0-Lineup-Branch (graceful empty-event close, Slice ~167)
- DENSE_RANK + reward distribution
- perf_l5/perf_l15 update post-scoring
- chip_usages check fuer triple_captain + synergy_surge
- equipment_map multiplier application
- tier_bonus payout

✅ **Migration-Header dokumentiert:** Source-of-truth + Applied-Patches-Liste + apply_migration timestamp.

### Money/Trading/Security (CLAUDE.md Rule)

⚠️ **Money-Path:** Score-Reduktion Captain-Slot → niedrigere Reward-Auszahlung.
**Mitigation:** BeScout pre-Beta, keine echten User-Earnings tangiert. CEO approved.

✅ **SECURITY DEFINER preserved:** Function bleibt SECURITY DEFINER mit `auth.uid()` Guard.
✅ **REVOKE/GRANT:** CREATE OR REPLACE preserves Privileges (waren bereits korrekt aus 20260407 Migration).

### Compliance (business.md)

✅ **Bonus-Compliance-Fix:** `'Kein Gewinner'` → `'Keine Top-Platzierung'` in Lines 252 (0-Lineup-Branch) + 348 (Final-Return JSON).
- Verletzt nicht mehr business.md Glossar (`Gewinner → Top-Platzierung`).
- War zusaetzliches Fund — Master.md Phase A Audit hatte das nicht erfasst (Kapitel-Glossar nur user-facing-Text-Audit).

✅ **KEIN neues Gambling-Vokabular** in Comment oder Code.

### RPC Paritaet (errors-db.md Rule)

✅ **Single Funktion:** `score_event` ist einziger Konsument von Captain-Multiplier-Logic. Keine Parallel-RPCs (vs. Trading Buy-Pfade die zu auditieren waeren).

✅ **chip_type-Reference unveraendert:** `'triple_captain'` String-Reference bleibt in 195a — der Rename auf `'captain_boost'` kommt in 195b. Konservative Trennung verhindert Mid-Slice-Breakage.

### Tests / Proof

⚠️ **Keine Unit-Tests** fuer `score_event` Captain-Bonus existieren in `src/lib/services/__tests__/`. 
**Mitigation:** Tests werden in 195d (Bench + Auto-Sub) als Test-Suite-Erweiterung mit reinkommen — beide Code-Pfade haengen am selben score_event-Body.

✅ **Live-Verify Proof:** `worklog/proofs/195a-captain-multiplier.md` mit pg_get_functiondef-Output zeigt new multiplier values + alte sind weg.

✅ **Worst-Case-Berechnung dokumentiert:** Cap-Effekt bei 1.1× / 1.25× quantifiziert.

## Severity-Grouping

- **CRITICAL:** 0
- **HIGH:** 0
- **MEDIUM:** 0
- **LOW:** 1 — keine Unit-Tests (mitigated in 195d)

## Positive

- Clean 2-Konstanten-Patch ohne Logik-Aenderung
- Compliance-Bonus-Fix proaktiv mit reingenommen
- Migration-Header dokumentiert source-of-truth + Applied patches
- `obj_description` COMMENT setzt Slice-Marker (audit-trail in DB)
- Live-Verify VOR Commit (errors-db.md Rule befolgt)

## Decision: D35 Self-Review applicable?

**Ja.** Begruendung:
- 2 Konstanten geaendert (3.0→1.25, 1.5→1.1)
- 1 Cap-Wert geaendert (300→150 fuer Boost-Chip)
- 2 String-Strings geaendert (Compliance)
- Kein neuer Code-Pfad, keine neue Logik
- Money-Path-Aenderung pre-Beta (keine User-Earnings)
- Verifikation per pg_get_functiondef live-verified
- Source-of-truth Migration-Audit befolgt

D35 erlaubt Self-Review fuer XS-Slices mit Pattern-Wiederholung. Slice 195a passt — gleiches Patch-Pattern wie viele frueher Multiplier-Adjustments.

## Recommendation

**MERGE Slice 195a.**

Cold-Reviewer-Agent (Opus) Pflicht fuer:
- 195b (Boost-Chip Rename + Captain-only Validation — Schema + RPC)
- 195d (Bench + Auto-Sub — komplexe Logic + UI)

195c (max_per_club Schema) + 195e (Differentials-RPC) reichen Self-Review wenn Pattern klar.
