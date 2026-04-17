# Spec 022 — B-03 UI-Mixing Verification (Doc-only, XS)

**Datum:** 2026-04-17 (late session 3 follow-up) / 2026-04-18 (Session 4 start)
**Slice-Groesse:** XS (Audit + Doku, kein Code-Change)
**CEO-Scope:** Nein (CTO-autonom)
**Stage-Chain:** SPEC → IMPACT(skipped — reine Verifikation) → BUILD(audit-ausgaben) → PROVE → LOG

## Ziel

Final-verifizieren, ob B-03 (UI-Mixing, Flow-Audit `memory/_archive/2026-04-meta-plans/walkthrough/05-blocker-b.md`) tatsaechlich GREEN ist, und den Residuen-Punkt aus `memory/next-session-briefing-2026-04-18.md` (Abschnitt 5 — "B-03 Verification") schliessen.

## Ausgangslage

Letzte Einschaetzung (late-briefing, Slice 011/013 Ende): *"B-03 (UI-Mixing) | GELB | GELB (nicht verifiziert — PlayerKPIs-Component existiert nicht mehr, TradingCardFrame bekommt priceChange24h als Prop — wahrscheinlich effektiv gruen)"*. Annahme stimmte nur teilweise: PlayerKPIs existiert weiterhin, TradingCardFrame ist clean.

Originaler B-03-Verdacht:
- PlayerKPIs berechnet L5-Score lokal
- TradingCardFrame berechnet Preis-Delta lokal

## Betroffene Files (read-only Audit)

- `src/components/player/index.tsx` — PlayerKPIs (Line 483-609)
- `src/components/player/PlayerRow.tsx` — nutzt PlayerKPIs (Line 215, 278)
- `src/features/market/components/shared/DiscoveryCard.tsx` — nutzt PlayerKPIs (Line 8)
- `src/components/player/detail/TradingCardFrame.tsx` — eigene Komponente
- `src/components/player/detail/PlayerHero.tsx` — Parent von TradingCardFrame (Line 79-83, 188)

## Acceptance Criteria

1. `PlayerKPIs` L5 kommt **ausschliesslich** aus Prop `player.perf.l5` (kein lokaler Re-Compute).
2. `PlayerKPIs` Floor entspricht **offiziellem Architektur-Pattern** aus `.claude/rules/trading.md` (`Math.min(...listings.map(l=>l.price)) : prices.floor ?? 0`).
3. `PlayerKPIs` PnL ist **reine UI-Arithmetik** auf zwei Props (Floor, avgBuyPrice) — keine Divergenz-Quelle zu DB.
4. `TradingCardFrame.priceChange24h` kommt als **Prop** in `CardBackData` (Line 19), kein lokaler Re-Compute. Parent (`PlayerHero.tsx:81`) liefert `player.prices.change24h` direkt.
5. Verdict dokumentiert in `worklog/proofs/022-audit-result.txt`.
6. Walkthrough-Status (Archiv) + `memory/next-session-briefing-2026-04-18.md` Entry Punkt 5 aktualisiert.

## Proof-Plan

- `worklog/proofs/022-player-kpis-extract.txt` — `head -150 PlayerKPIs` mit markierten Zeilen fuer Props-Usage
- `worklog/proofs/022-tradingcardframe-props.txt` — Interface + change-line 380
- `worklog/proofs/022-floor-rule.txt` — Extrakt aus `trading.md` mit Architektur-Regel
- `worklog/proofs/022-audit-result.txt` — Verdict mit Erklaerung

## Scope-Out (ausdruecklich NICHT in diesem Slice)

- Kein Refactor. Falls der Audit einen echten Drift findet → NEUE Slice 023 aufmachen, CEO informieren.
- Broader B-02 Return-Type-Audit (separater Residuen-Punkt).
- Club-Admin Per-Club Scoping (separater Residuen-Punkt).
- Kein Test-Write — hier wird keine neue Logik eingefuehrt.
