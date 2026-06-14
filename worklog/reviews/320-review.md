# Slice 320 Review — cancel_club_subscription RPC

**Verdict: PASS (self-review)** · 2026-06-14 · XS, kein Money (auto_renew bool-Toggle).

Self-review begründet: Muster identisch zu Slice 317b (`apply_referral_code`, dort reviewer-Agent PASS) — RLS-Gap → SEC-DEFINER-RPC mit auth.uid(). Security-Checkliste unten.

## Security-Checkliste (SEC DEFINER)
- prosecdef=true, has_auth_guard=true (v_uid IS NULL → not_authenticated) ✓
- WHERE user_id = auth.uid() → kein Cross-User-Cancel ✓
- REVOKE PUBLIC+anon + GRANT authenticated (AR-44) ✓
- Discriminated Return (success-flag) ✓
- Kein Money/Balance, nur auto_renew bool ✓

## Coverage
- AC1 RPC-Logik (auth + WHERE active + GET DIAGNOSTICS 0→no_active) ✓
- AC2 REVOKE/GRANT + SEC DEFINER ✓
- AC3 Service RPC + throw-on-error + result.success ✓
- AC4 Test auf RPC-Mock, 28/28 grün, tsc clean ✓
- AC5 Live-Smoke: authenticated owner flippt auto_renew (RPC works) ✓

## Findings / Notes
- **Operator-Slip (kein Code-Bug):** Live-Smoke-DO-Block ohne BEGIN/ROLLBACK → committete den auto_renew-Flip der 1 aktiven Subscription. Sofort erkannt + restauriert (default=true, Feature war nie funktional → Original zwingend true). Data-Stand verifiziert original. Lehre: DB-Smokes IMMER in BEGIN/…/ROLLBACK (wie 316/317 profiles-Smokes), nie nackte DO-Blocks gegen Live-Daten.
- Feature dormant (0 UI-Consumer) — RPC ready für künftige Cancel-UI.
