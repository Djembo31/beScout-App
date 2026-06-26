# Active Slice

```
status: idle
slice: 402
title: Treasury-RAUS e2e real bewiesen — echte Monats-Liga-Auszahlung (Mai 2026) — DONE
size: S (Money/CEO — Live-RPC-Vollzug, kein Code-Change; CEO-approved Anil 2026-06-26)
stage: LOG (DONE)
spec: inline (Vollzugs-Plan, s. notes/401-e2e-enforcement-audit.md Punkt B + Treasury-Epic RAUS-Block)
impact: Live-DB State-Change (echte Wallets + Topf-Debit + Snapshots/Winners), permanent, idempotent-gesperrt
proof: worklog/proofs/402-raus-liga-payout.txt (Vorher/Nachher Zero-Sum-Reconcile)
review: self-review (Money — Zero-Sum-Reconcile IST der Review; RPC byte-identisch zur 376-Baseline, kein Code-Change)
```

## Inline-Spec (Money/CEO, CEO-approved)
**Ziel:** Der einzige substantielle e2e-Gap aus Audit 401 — Treasury-RAUS (376/377/378) bewiesen-korrekt aber nie real gelaufen (0 Ledger-Rows). 1× echte `close_monthly_liga('2026-05-01')` auf Live → erste echte `monthly_liga`-Debit-Row + winners + Zero-Sum.
**Vorab (D87):** Live-`pg_get_functiondef` gelesen; aktive Season „2025/26" existiert; Topf 500.183 Cr deckt erwartete ~35.750 Cr Auszahlung (34.000 global + 1.750 Bundesliga-Manager).
**ACs:** (1) RPC ok:true + total_paid_cents; (2) Topf-Saldo_neu = Saldo_alt − total_paid; (3) Σ neue liga_reward-Tx = total_paid; (4) genau 1 neue monthly_liga-Debit-Row = total_paid; (5) winners/snapshots-Rows > 0. = Zero-Sum bewiesen.
**Smells (Backlog, Launch-relevant):** (a) globale Dims zahlen fix nach Rang ohne Mindest-Delta>0; (b) overall+3 Einzel-Dims überschneiden (User kann 4× kassieren).

## Zuletzt
- **Slice 402** (2026-06-26) — Treasury-RAUS e2e real, IN ARBEIT.
- **Slice 401** (2026-06-26) — e2e-Audit + 400-Rest + Tracker-Heal, DONE (`213f626c`).
- **Slice 400** (2026-06-26) — E-7 creator-Drift-Cleanup, DONE.
