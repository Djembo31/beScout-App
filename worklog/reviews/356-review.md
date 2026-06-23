# Review — Slice 356 (Exklusive Treue-Umfragen)

**Reviewer:** reviewer-Agent (cold-context) · **Datum:** 2026-06-23 · **time-spent:** ~14 min

## verdict: REWORK → **geheilt → PASS**

Der Reviewer fand 1 CRITICAL (Money-Fee), das in diesem Slice geheilt wurde. Nach Heal + Live-Re-Verify ist der Slice merge-fähig.

## findings

| # | Severity | Location | Issue | Status |
|---|----------|----------|-------|--------|
| 1 | **CRITICAL** | migration:222 `cast_community_poll_vote` | **Fee-Split 70/30 statt CEO-approved 80/20.** `v_creator_share := (v_cost * 70)`. Ursache: Slice 343 rekonstruierte den RPC-Body aus der `slice_336`-Datei (vor 337) statt aus Live → revertierte 337s `80→70` still. Live war seit 18.06. fälschlich 70/30. Slice 356 erbte es via D87-Live-Reconstruction. | **GEHEILT** — Anil-approved (2026-06-23) auf 80/20. Migration `* 80`, re-applied, Live-Verify `fee_80_20_restored=true`, Money-Smoke `creator_share=800` bei cost=1000. |
| 2 | CONCERNS | errorMessages.ts | `/nicht.genug.bsd/i` nutzt `.`-Wildcard für Space — funktioniert, leicht fragil. | Akzeptiert (low-risk, `.` matcht Space korrekt). Backlog-NIT. |
| 3 | NIT | CommunityPollCard.tsx | `options as {label;votes}[]`-Cast — konsistent mit bestehendem JSONB-Pattern. | Kein Handlungsbedarf. |

## Reviewer-bestätigte Checkpoints (alle PASS)
1. Guard vor Wallet ✓ (Money-Smoke: Balance unverändert bei Reject).
2. Patches erhalten ✓ (337 Fee jetzt 80, 343 Gewicht, Treasury-Routing, transactions).
3. create-Overload gedroppt + AR-44 REVOKE/GRANT beide Funktionen + exclusive nur source='club' ✓.
4. Discriminated-Union throw bricht keinen Consumer ✓ (handleCastPollVote fängt via mapErrorToKey).
5. viewer_locked fail-closed, Ersteller nie gesperrt, Multi-Club-korrekt, kein Chunking-Risiko ✓.
6. i18n DE+TR business.md-konform (kein Securities/Glücksspiel) ✓. (TR-Anil-Review-Pflicht offen.)
7. Card-Lock Mobile-safe, Options korrekt disabled, kein Key-Leak ✓.

## one-line
Nach Fee-Heal: Ja — guard-before-wallet, fail-closed, AR-44-clean, voll verkabelt + getestet, Fee auf CEO-approved 80/20.

## Learnings (→ Knowledge Capture, LOG-Stage)
- **errors-db PATCH-AUDIT muss Konstanten prüfen, nicht nur Präsenz.** ILIKE-`%book_club_treasury%`/`%v_weight%` fängt keinen `* 70` vs `* 80`-Drift. Money-RPC-Audit MUSS Fee-Konstanten gegen trading.md asserten (`ILIKE '%* 80) / 100%'`).
- **Slice 343 war eine latente Live-Fee-Regression** (unabhängig von 356) — Ursache: Body aus Migrations-**Datei** (slice_336) statt **Live** functiondef rekonstruiert. D87-Verstoß. In 356 mitgeheilt.
