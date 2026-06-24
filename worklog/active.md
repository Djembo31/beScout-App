# Active Slice

```
status: idle
slice: 365
title: ✅ DONE — Bounty-Fee REIN in den Plattform-Topf (E3-2e, LETZTE Fee-Quelle)
stage: LOG complete
size: S
slice-type: Migration (Money-RPC) + Test
spec: worklog/specs/365-bounty-fee-rein.md
impact: skipped (additive Inline-Buchung, 0 Consumer-Contract-Change, kein Schema-Shape-Change)
proof: worklog/proofs/365-money-smoke.txt (PASS — pot_delta=50, zero_sum=t, rollback sauber)
review: worklog/reviews/365-review.md (PASS, 1 NIT optional/nicht umgesetzt)
next: **E3 Slice 2 „Fees REIN" KOMPLETT (5/5).** Nächster = E3 Slice 3 Monats-Liga e2e (RAUS-Kanal), dann Slice 4 BeScout-Events, Slice 5 Wettkampf-Darstellung. Anker: worklog/notes/358-platform-treasury-epic.md.
```

## Kontext

- **Epic E3 Plattform-Treasury (D96), Slice 2 „Fees REIN", Teil 4/5 = Research.** Anker `worklog/notes/358-platform-treasury-epic.md`.
- **Muster 1:1 aus 360 (Single-Path):** Inline `IF v_platform_fee > 0 THEN PERFORM book_platform_treasury('credit','research',v_platform_fee,p_research_id,'Research-Fee'); END IF;` NACH transactions-INSERT, VOR success-RETURN in `unlock_research`.
- **Live-verifiziert (D87, 2026-06-24):** Body gelesen — Fee-Konstante `(v_price * 80) / 100` intakt (20 % Plattform), `'research'` im source-CHECK erlaubt → keine CHECK-Migration. `book_platform_treasury(text,text,bigint,uuid,text)` bestätigt. AR-44 anon=false/auth=true. Policy D98 (100 % Auffang) approved.
- **Smoke-Setup:** live 0 research_posts mit Preis → Temp-Post + Temp-Wallets in der BEGIN…ROLLBACK-Txn anlegen.

## Zuletzt

- **Slice 363** ✅ — Polls-Fee REIN (E3-2c, 7d029401): `cast_community_poll_vote`→'poll', beide source-Branches, Zero-Sum bewiesen.
- **Slice 360** ✅ — IPO-Fee REIN (E3-2b, 81ec6e0b).
- **Slice 358** ✅ — Trading-Fees REIN (E3-2a).
- **Slice 357** ✅ — Topf-Fundament (E3-1).
