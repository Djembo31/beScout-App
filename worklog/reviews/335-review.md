# Slice 335 — Cold-Context-Review (Money)

**Verdict: CONCERNS → geheilt** · reviewer-agent (cold context, Money-Fokus)

## Findings + Resolution

| # | Severity | Location | Issue | Resolution |
|---|----------|----------|-------|------------|
| 1 | MAJOR | migration §3 `cancel_event` | Reused `rpc_cancel_event_entries` nutzt eigenen Discriminator `{ok,error}`; cancel_event prüfte `v_refund->>'ok'` NICHT vor `UPDATE status='cancelled'` → Silent-Cast Money-Path, nicht fail-closed. | **GEFIXT** — Guard `IF COALESCE(v_refund->>'ok','false') <> 'true' THEN RETURN {success:false,error}` vor Status-Flip. Live re-applied (slice_335c) + Happy-Smoke re-verifiziert grün. |
| 2 | MINOR | `trg_fn_event_status_unlock_holdings` Interaktion | rpc_cancel_event_entries löscht holding_locks; der bestehende AFTER-UPDATE-Trigger (status) löscht sie nochmal. Benigner No-Op, kein Money/Escrow-Impact. | **Dokumentiert** (kein Code-Change). Zweiter DELETE trifft 0 Rows. |
| 3 | MINOR | `events.mutations.ts` `cancelEvent` | `data as {...}`-Cast ohne `!data`-Guard → null-Body (error=null+data=null) würfe TypeError statt sauberem Error. | **GEFIXT** — `if (!data) return {success:false,error:'cancel_failed'}` vor Cast (wie lockEventEntry). + Test ergänzt. |

## One-Line
Ja — ein Senior merged diesen Money-Slice nach Finding #1: Trigger-Erhalt, Escrow-Round-Trip, FOR-UPDATE-Race-Schutz, Auth-Gate, CHECK-Fix, DE/TR-i18n alle korrekt.

## Bestätigte Money-Achsen (Reviewer)
- Trigger-Erhalt (Slice 156): 'ended'-Logik byte-identisch zu 331-Live, cancelled-Zweig additiv, prize_escrowed-Reset korrekt.
- Geld-Korrektheit: voller prize_pool-Refund bei cancelled, Treasury-Round-Trip (escrow==refund), kein Mint/Burn-Leak.
- Atomarität: FOR UPDATE-Lock, refund→status-Reihenfolge, kein Doppel-Refund (Idempotenz via Status-Guard).
- Auth/Security: auth.uid()-Guard club_admins OR platform_admins, AR-44 REVOKE/GRANT, anon gesperrt.
- CHECK-Drift: ticket_transactions_source_check +'event_entry_refund' vollständig; transactions 'event_entry_unlock' bereits gedeckt.

## Post-Heal Verify
- Happy-Money-Smoke (Rollback) nach Heal: {success,refunded_count:1}, treasury +50000, ticket +100, status cancelled, escrowed false.
- vitest events-cancel 5/5 (inkl. #3-Guard-Test) · tsc clean.
