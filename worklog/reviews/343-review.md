# Slice 343 — Review (Cold-Context-Reviewer-Agent)

**Verdict: PASS** · time-spent: 11 min · Money-RPC-Touch

## Findings

| # | Severity | Location | Issue | Fix |
|---|----------|----------|-------|-----|
| 1 | NITPICK | `fanRanking.ts:1-31` | Gewicht-Mapping lebt nur in der RPC (bewusst). `FAN_RANK_TIERS` (TS) kennt das Stimmgewicht nicht — wenn ein späterer Slice das Gewicht im UI surfacet, droht TS↔RPC-Drift (Klasse „Money-RPC Pricing-Formel Drift", Slice 108). Heute KEIN Bug (Gewicht nicht im UI). | Bei UI-Surfacing: `voteWeight` in `FanRankTierDef` + Test-Invariant gegen RPC-CASE (analog `SUCCESS_FEE_TIERS`). NICHT in 343. |
| 2 | NITPICK | `343…weight.sql:50-52` | Abo-Lookup selektiert `cs.tier`, prüft nur `IS NOT NULL` (Tier verworfen). `EXISTS` wäre klarer — aber byte-identisch zu 336 hat Vorrang (Money-Branch-Nähe). | Keine Änderung (bewusst byte-identisch). |

## Money-Branch-Diff (336 vs 343) — byte-identisch?

Zeile-für-Zeile verifiziert: v_cost/70%-Split, Wallet-Check, Wallet-Abzug, `book_club_treasury(poll_revenue)`, `club_poll_missing_club_id`-Guard, User-Poll `poll_earn`/`poll_vote_cost`-Doppel-INSERT, ELSE-Branch, `community_poll_votes`-INSERT (amount_paid=v_cost), Tally, RETURN-Shape — **ALLE identisch**. Einziger Diff = Weight-Block (DECLARE additiv `v_abo_weight`/`v_rank_weight`/`v_rank_tier`; `GREATEST(...)`). Slice-156-Silent-Revert-Falle nicht getreten.

## Fokus-Fragen

- **GREATEST korrekt?** Ja. Abo-Floor erhalten (`GREATEST(2,1)=2`), kein Stapeln (`GREATEST(2,3)=3` ≠ 6), NULL-Rang → `CASE ELSE 1`. Smoke S7/S8/S9 bestätigen.
- **Geld skaliert mit weight?** Nein. Nur `total_votes`/`option.votes`/`weight` tragen `v_weight`. Smoke S11 (weight=3, amount_paid=1000) beweist scharf.
- **Tier→Gewicht konsistent mit 6-Tier-Domäne?** Ja, CASE deckt alle 6 ab, kein Tippfehler (Smoke S1-S6 je Tier).
- **REVOKE/GRANT?** AR-44-konform, anon=false/auth=true.
- **Timestamp-Ordnung?** `…230000` > 337 `…180000` > 336 `…170000`; CREATE OR REPLACE gleiche Signatur → keine Ambiguity. Slice-326-Falle nicht getreten.

## Spec-Coverage
AC-01..08 alle durch Smoke/Grant-Verify grün (S1-S11 + TALLY=18 + Sektion A).

## Positive
- Money-Risiko-Vektor (Slice-156) doppelt abgesichert: Diff + Live-Smoke S11.
- Transaktionaler Smoke mit Leak-Verify (0 persistierte Rows) — kein Prod-Mutation-Risiko trotz Live-DB.
- Tally-Gesamt-Assertion (=18) fängt Off-by-one im Gewicht-Akkumulieren.
- MAX-Floor = richtige Wahl (verhindert stille Live-Abo-Perk-Regression, `feedback_root_cause_eifer`-Standard).

## Knowledge Capture
Kein neuer Bug → kein neuer `errors-*.md`-Eintrag. Saubere Anwendung bestehender Patterns (156/AR-44/326/108).

**Beide Findings = Nitpicks ohne Merge-Blocker. PASS.**
