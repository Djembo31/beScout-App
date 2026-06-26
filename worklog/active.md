# Active Slice

```
status: idle
slice: 403
title: Welle 1.2 — buy_from_ipo Idempotency-Key (Doppelkauf-Schutz Erstverkauf) [Money/CEO] — DONE
size: S (Money — Migration + Service + 2 Hooks; Blueprint S178a-f, byte-identische Money-Math)
stage: LOG (DONE)
spec: worklog/specs/403-welle1-ipo-idempotency.md
impact: skipped (Consumer = ipo.ts-Service + 2 Buy-Hooks + 3 Test-Files, in Spec §3 vollständig gegreppt; kein Cross-Domain)
proof: worklog/proofs/403-money-smoke.txt
proof2: worklog/proofs/403-vitest.txt (97/97, tsc 0) — Money-Smoke: Zero-Sum=0, Replay=selbe trade, AC-01..06 PASS
review: worklog/reviews/403-review.md — PASS (2 NIT, kein Handlungsbedarf)
```

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
