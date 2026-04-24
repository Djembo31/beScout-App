# Slice 178c — subscribe_to_club Idempotency-Konsolidierung

## Ziel
`subscribe_to_club` erhaelt `p_idempotency_key TEXT DEFAULT NULL`. Mit Key → generic Slice-178-Infrastructure. Ohne Key → bestehender 151c.2 inline-60s-Fallback.

## Files
- `supabase/migrations/20260424030000_slice_178c_subscribe_to_club_idempotency.sql` NEU
- `src/lib/services/clubSubscriptions.ts` — `subscribeTo(userId, clubId, tier, idempotencyKey?)`
- `src/lib/services/__tests__/clubSubscriptions.test.ts` — assert p_idempotency_key: null

## AC
1. `pronargs=4`, alte 3-arg via DROP gone.
2. Generic-path: `check_or_reserve_dedup_key` NACH tier-validation, VOR FOR-UPDATE-lock.
3. Key-NULL-path: inline-60s (started_at-based) bleibt aktiv.
4. Completion-UPDATE auf request_dedup_keys nur wenn Key gesetzt.
5. Alle 151c.2-Guards 1:1 erhalten.
6. AR-44 REVOKE/GRANT renewed.
7. tsc clean, 27/27 tests pass.

## Proof
worklog/proofs/178c-subscribe.txt — signature + regex-audit + preserved-guards + tests.

## Scope-Out
- Client-side Key-generation: 178d.
- End-to-end retry-test mit client-JWT: 178d.
