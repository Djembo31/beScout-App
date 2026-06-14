# Slice 320 — cancel_club_subscription RPC (S7 Phase-2 P1-Demo: Club #4)

**Slice-Type:** Migration + Service
**Größe:** XS
**Datum:** 2026-06-14
**CEO-Scope:** Grenzwertig (SECURITY DEFINER, aber kein Money — toggelt nur `auto_renew` bool). Self-Review mit Security-Checkliste; Pattern identisch zu Slice 317b (dort reviewer-Agent PASS).

## 1. Problem-Statement (Evidence: S7-Registry P1-Demo Club #4, live-verifiziert 2026-06-14)

`cancelSubscription` (`clubSubscriptions.ts:133`) macht direkten RLS-`.update({auto_renew:false})` auf `club_subscriptions`. Live-RLS hat **nur SELECT-Policies** (Users read own + Admins read club), **keine UPDATE-Policy** → der Update wird stumm geblockt (0 rows, kein Error) = Silent-No-Op. Zusätzlich swallowt der Service den (nie kommenden) Fehler. Feature ist DORMANT (0 Production-Consumer, nur Tests).

## 2. Lösungs-Design

Wie Slice 317b (RLS-Gap → SEC-DEFINER-RPC): neuer RPC `cancel_club_subscription(p_club_id)` (auth.uid()-basiert, läuft als postgres → kann updaten), discriminated Return. Service ruft RPC + throw-on-error. Signatur `cancelSubscription(userId, clubId)` bleibt (API-Stabilität); userId wird ignoriert (RPC nutzt auth.uid()).

## 3. Betroffene Files
- `supabase/migrations/20260614xxxxxx_slice_320_cancel_club_subscription_rpc.sql` — NEU.
- `src/lib/services/clubSubscriptions.ts` — cancelSubscription → RPC.
- `src/lib/services/__tests__/clubSubscriptions.test.ts` — Mock auf RPC.

## 4. Code-Reading-Liste (erledigt)
- `clubSubscriptions.ts:133` cancelSubscription + RLS pg_policy (nur SELECT). ✓
- Spalten auto_renew/updated_at/status/user_id/club_id existieren. ✓
- 0 Production-Consumer (nur Test). ✓

## 5. Pattern-References
- Slice 317b `apply_referral_code` (identisches RLS-Gap→RPC-Muster).
- `database.md` „RLS `.update()` stumm blockiert → IMMER RPC"; AR-44 REVOKE/GRANT.
- `database.md` Return-Shape Discriminated Union (success-flag).

## 6. Acceptance Criteria
- **AC1:** RPC `cancel_club_subscription(uuid)`: auth.uid()-Guard, UPDATE auto_renew=false WHERE user_id=auth.uid() AND club_id=p AND status='active'; 0 rows → {success:false,error:'no_active_subscription'}; sonst {success:true}.
- **AC2:** REVOKE PUBLIC+anon + GRANT authenticated, SECURITY DEFINER.
- **AC3:** Service ruft RPC, throw on supabase-error, return result.success.
- **AC4:** Test auf RPC-Mock umgestellt; tsc clean; clubSubscriptions-Tests grün.
- **AC5:** Live-Smoke (SET ROLE authenticated): cancel setzt auto_renew=false (ROLLBACK).

## 7. Edge Cases
| Fall | Verhalten |
|------|-----------|
| Keine aktive Sub | {success:false, no_active_subscription} |
| auth.uid() null | {success:false, not_authenticated} |
| Cross-club id | WHERE-Filter → 0 rows → no_active_subscription |
| RLS (alt) blockte | jetzt via SEC DEFINER updatebar |

## 8. Self-Verification
- `pg_get_functiondef` post-apply (auth-guard + REVOKE).
- `CI=true pnpm exec vitest run src/lib/services/__tests__/clubSubscriptions.test.ts` + tsc.
- Live-Smoke ROLLBACK.

## 9. Open-Questions — keine.

## 10. Proof-Plan
`worklog/proofs/320-cancel-subscription-rpc.txt`: pg_get_functiondef + ACL + tsc + vitest + Live-Smoke.

## 11. Scope-Out
- Keine UPDATE-RLS-Policy für direkten Client-Update (RPC ist der Pfad).
- Keine Subscription-Cancel-UI-Verkabelung (dormant; separat).

## 12. Stage-Chain
SPEC ✓ → IMPACT (inline §4) → BUILD → REVIEW (self, Security-Checkliste) → PROVE → LOG.

## 13. Pre-Mortem
1. updated_at fehlt → verifiziert vorhanden. 2. CREATE OR REPLACE Privileg-Reset → REVOKE/GRANT-Block. 3. Test mockt noch Table → auf rpc umstellen.
