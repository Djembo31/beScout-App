# Active Slice

```
status: idle
slice: 363
title: ✅ DONE — Polls-Fee REIN in den Plattform-Topf (E3-2c)
stage: LOG complete
size: S
slice-type: Migration (Money-RPC) + Test
spec: worklog/specs/363-poll-fee-rein.md
impact: skipped (additive Inline-Buchung, 0 Consumer-Contract-Change, kein Schema-Shape-Change)
proof: worklog/proofs/363-money-smoke.txt
review: worklog/reviews/363-review.md (PASS, 2 NIT kosmetisch)
next: E3-2d weitere Fee-Quellen REIN — Research (unlock_research→'research') ODER Bounty (approve_bounty_submission→'bounty'). Anker worklog/notes/358-platform-treasury-epic.md §Slice 2.
```

## Kontext

- **Epic E3 Plattform-Treasury (D96), Slice 2 „Fees REIN", Teil 3/5 = Polls.** Anker `worklog/notes/358-platform-treasury-epic.md`.
- **Muster 1:1 aus 358/360:** Inline `IF v_platform_share > 0 THEN PERFORM book_platform_treasury('credit','poll',v_platform_share,p_poll_id,'Umfrage-Fee'); END IF;` NACH source-if/else, VOR `ELSE v_creator_share:=0...` in `cast_community_poll_vote`.
- **Live-verifiziert (D87, 2026-06-24 frische Session):** Body gelesen — Fee-Konstante `(v_cost * 80) / 100` intakt, `'poll'` im source-CHECK erlaubt → keine CHECK-Migration. `book_platform_treasury(text,text,bigint,uuid,text)`-Signatur bestätigt. Policy D98 (100 % Auffang) approved.

## Zuletzt

- **Slice 362** ✅ — platformAdmin chunked/paginated Reads (1e3c9abc): getAllClubs.player_count Live-Bug (4472 vs 1000-Cap) + 5 HIGH silent-fail geklärt, Baseline 170/77/93.
- **Slice 361** ✅ — AdminTreasuryTab Promise.allSettled → logSilentRejects (890926cc).
- **Slice 360** ✅ — IPO-Fee REIN Plattform-Topf (E3-2b, 81ec6e0b).
- **Slice 359** ✅ — accept_offer side='sell' repariert ('offer_buy' in CHECK).
