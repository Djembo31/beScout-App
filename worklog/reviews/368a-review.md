# Review — Slice 368a (Scout-Card-Wertmodell Kanon, Doc/Decision)

**Reviewer-Agent (Cold-Context, read-only) · 2026-06-24**

## Verdict: PASS

Money-Kanon-Doku widerspruchsfrei + merge-fähig. D100 supersedet D99 Punkt 4 sauber per ID-Verweis ohne D99/D83-Kern zu berühren; `treasury.md §1b`, `.claude/rules/trading.md` und der Spec-functiondef-Claim sind durchgängig konsistent und am Live-Code belegt; INDEX-Range == max-D (D100).

## Findings (beide NIT, non-blocking)

| # | Sev | Location | Issue | Status |
|---|-----|----------|-------|--------|
| 1 | NIT | `decisions.md` D99 Pkt 4 | Superseded Satz „Data-Drift-Fix … MV/10 neu setzen" steht inline ohne Marker; wer nur D99 liest, sieht verworfene Anweisung als aktiv. | ✅ GEFIXT — Inline-Marker `→ SUPERSEDED durch D100` gesetzt. |
| 2 | NIT | Spec §1 / treasury §1b | „Money-Risiko gering" stützt sich auf `buy_player_sc`-functiondef (178a-Migration); ideal wäre post-358 Live-functiondef (D87). Pricing-Logik unverändert, Aussage hält. | ⏭️ Für 368b/c: Live-`pg_get_functiondef` als Code-Reading-Item #1 (steht in Spec §4). |

## Belege (Reviewer)
- D100 supersedes nur D99 Pkt-4-Sub, nicht den Phasenmodell-Kern. Korrekt isoliert.
- 3-Wege-Konsistenz D100 (WARUM) ↔ treasury §1b (WIE) ↔ trading.md (Code-Regel), je mit Cross-Verweis.
- `MV/10` (cents) = `MV/1.000` (Credits) = `MV/100.000` (€-ICO-Peg) — dieselbe Zahl, kein 100×-Drift.
- Compliance: kein Rendite-Framing; €-Bezug nur intern/ICO-markiert; CSF „auf richtiger Basis erklären".
- `buy_player_sc`: `ORDER BY price ASC LIMIT 1` → kauft Orderbuch, nicht ipo/floor → Entlastungs-Claim belegt.

**One-Line:** Ja — ein Senior würde diese Money-Doku-Änderung so mergen.
