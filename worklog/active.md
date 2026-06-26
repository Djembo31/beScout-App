# Active Slice

```
status: active
slice: 404
title: Welle 1.1 — Markt-Tab Kauf order-gebunden („was du siehst = was du zahlst") [Money-Trust UI]
size: L (UI cross-component — Markt-Buy auf order-gebundene Pipeline, geteilte Order-Quelle useSellOrders)
stage: PROVE (vitest 298 ✅ + tsc 0; UI-Playwright post-Deploy OFFEN)
spec: worklog/specs/404-welle1-market-buy-order-bound.md
impact: skipped (Consumer in Spec §3 gegreppt; kein RPC/Migration, kein Cross-Domain — reine UI/Routing-Konsolidierung)
proof: worklog/proofs/404-vitest.txt
review: worklog/reviews/404-review.md — PASS (1 NIT konsistenz-bewusst belassen, 1 INFO=pre-existing Player-Detail-Shape-Bug→405)
```

## Inline-Notiz (Welle 1.1)
Markt-Tab zeigte `floor`, kaufte cheapest-foreign via `buy_player_sc` (Anzeige≠Abbuchung), qty hart 1. Fix = order-gebundene Pipeline wie Player-Detail: günstigste Fremd-Order via `useSellOrders` (geteilte Quelle), Preis+Menge daran gebunden, Kauf via `buy_from_order`. Listenpreis exkludiert eigene Orders → Liste==Modal==Kauf. KEINE RPC/Money-Math-Änderung. Scope-Out: BuyConfirmation.tsx est-total (→405), 1.3/1.4/1.5.

## Inline-Notiz (Welle 1 Start)
**Welle 1 — Trading & Kaufprozess** (Mock→Pro, D111). Slice 403 = Plan-Punkt 1.2. Kern-Smell der Welle = „von allem zwei"; 1.2 schließt das Idempotenz-Loch im Erstverkauf (einziger der 3 Kauf-RPCs ohne `idempotency_key`) end-to-end. CEO-Architektur-Gabelung 1.4 (Orderbuch `orders` vs `offers` = ein Buch?) wird VOR Slice 1.4 separat geklärt.

## Inline-Spec (Money/CEO, CEO-approved)
**Ziel:** Der einzige substantielle e2e-Gap aus Audit 401 — Treasury-RAUS (376/377/378) bewiesen-korrekt aber nie real gelaufen (0 Ledger-Rows). 1× echte `close_monthly_liga('2026-05-01')` auf Live → erste echte `monthly_liga`-Debit-Row + winners + Zero-Sum.
**Vorab (D87):** Live-`pg_get_functiondef` gelesen; aktive Season „2025/26" existiert; Topf 500.183 Cr deckt erwartete ~35.750 Cr Auszahlung (34.000 global + 1.750 Bundesliga-Manager).
**ACs:** (1) RPC ok:true + total_paid_cents; (2) Topf-Saldo_neu = Saldo_alt − total_paid; (3) Σ neue liga_reward-Tx = total_paid; (4) genau 1 neue monthly_liga-Debit-Row = total_paid; (5) winners/snapshots-Rows > 0. = Zero-Sum bewiesen.
**Smells (Backlog, Launch-relevant):** (a) globale Dims zahlen fix nach Rang ohne Mindest-Delta>0; (b) overall+3 Einzel-Dims überschneiden (User kann 4× kassieren).

## Zuletzt
- **Slice 402** (2026-06-26) — Treasury-RAUS e2e REAL bewiesen (Zero-Sum), DONE (`ba53bb46`).
- **D109/D110** (2026-06-26) — Reward-Smells CEO-akzeptiert + e2e-Audit-Methode (`b4a10eb1`).
- **Slice 401** (2026-06-26) — e2e-Audit + 400-Rest + Tracker-Heal, DONE (`213f626c`).

Nächstes (frische Session): **(C) S7 Mock→Pro** (3 TOTER-CODE aktivieren/löschen) ODER Event-Backlog (E-5/E-6). Kanon: `memory/session-handoff.md` zuerst lesen.
