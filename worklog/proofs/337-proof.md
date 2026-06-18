# Slice 337 — Proof (Polls-Fee 30/70 → 20/80)

## Money-Smoke (BEGIN;…ROLLBACK;, live)
Club-Poll cost=1000, Nicht-Abo-Voter:
```
result.creator_share = 800   (= 80% von 1000)
treasury_delta       = 800   (Vereins-Treasury REIN, source='club')
platform (implizit)  = 200   (20% Burn, = cost - creator_share)
```
→ 80/20 live bestätigt. weight=1 (kein Abo), Money ≠ Gewicht (336-Logik erhalten).

## Doc/i18n-Konsistenz
```
grep "70%|30%|70/30|30/70" (messages + business.md + trading.md + polls.md + treasury.md) | grep -i poll → 0 Treffer
```
Angepasst auf 80/20: createPollSubtitle/pollClubRevenueHint/pollPriceHint (de+tr) · business.md Fee-Tabelle · trading.md · polls.md §3/§9 · treasury.md Fee-Splits-Zeile.

## tsc / vitest
```
tsc --noEmit → exit 0
vitest wording-compliance + communityPolls(create+get) → 17 passed
```

## AR-44
cast_community_poll_vote: REVOKE PUBLIC+anon, GRANT authenticated (Migration §Ende). Body byte-identisch zu 336-Live, einzige Änderung `(v_cost*80)/100`.

## Edge
- cost=0 → creator_share=0 (unverändert). Bestehende Votes: historische 70%-Werte bleiben (kein Backfill, Vergangenheit korrekt).
