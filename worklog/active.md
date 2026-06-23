# Active Slice

```
status: idle
slice: 357
title: ✅ DONE — Plattform-Treasury Topf-Fundament (E3-1)
stage: LOG complete
size: L
slice-type: Migration + Service + UI (Money-Infra, CEO-Scope §3)
spec: worklog/specs/357-platform-treasury-foundation.md
impact: skipped (neue isolierte Tabellen, 0 bestehende Consumer)
proof: worklog/proofs/357-money-smoke.txt
proof-extra: 357-rpc.txt + 357-vitest.txt; UI-Playwright post-Deploy
review: worklog/reviews/357-review.md (PASS, 2 NIT accepted)
next: E3-2 Fees REIN (Trading zuerst, eine Quelle/Slice; CEO-Frage voller Auffang vs. Teil-Burn/Cap)
```

## Ergebnis Slice 357

- Echtes Plattform-Konto (BeScout-Topf) als Fundament — Mirror Club-Treasury 329 minus tenant-id, Single-Pot.
- `platform_treasury` (Singleton-Lock-Anker) + `platform_treasury_ledger` (append-only).
- 3 RPCs: `book_platform_treasury` (Saldo=SUM unter Singleton-`FOR UPDATE`, Variante A, REVOKE-only) + `get_platform_balance()` + `get_platform_treasury_ledger()` (platform-admin-guarded, AR-44).
- Append-only via generischem 329-Trigger. RLS 0-Policies (Definer-Only).
- Service +2 Fn (Pre-Cast-Guard S168) · AdminTreasuryTab „Plattform-Topf"-Card · i18n DE+TR.
- **Topf live bei 0** (kein Backfill — verbrannte Fees nie gebucht). Fees REIN = Slice 2.
- Money-Smoke grün: Kette 1000/1500/1200, append/delete/bad-source/noauth geblockt, RLS/Grants verifiziert.

## Zuletzt

- **Slice 356** — Exklusive Treue-Umfragen + 80/20-Fee-Heal (M).
- **Slice 355** — Audit-Churn gitignoren (XS).
