# Slice 336 — Polls P3: Follower-Reichweite + Abo-2×-Gewicht bei Paid-Polls

**Slice-Type:** Migration + Service + UI · **Größe:** L · **CEO-Scope:** Ja (Stimmgewicht money-near; Scope freigegeben Anil 2026-06-18: Reichweite + Abo-2×, Fan-Rang deferred).

## 1. Problem (Canon §6, polls.md)
- **Follower** bringen heute NICHTS — neue Umfrage wird Followern nicht angezeigt/benachrichtigt (Events tun das schon, `createEvent` → club_followers).
- **Abo-2×-Gewicht** gilt nur bei Gratis-Votes (`cast_vote` v_weight=2 für Abonnenten), NICHT bei bezahlten Umfragen (`cast_community_poll_vote` zählt jede Stimme 1).

## 2. Lösung
**P3a Reichweite:** `createCommunityPoll`-Service benachrichtigt nach Erfolg Follower (best-effort, wie createEvent): source='club' → `club_followers` von club_id; source='user' → `user_follows` (following_id=created_by). Notification-Typ `poll_new`, reference_type 'poll' (Href existiert → /community?tab=aktionen).
**P3b Gewicht:** `cast_community_poll_vote` portiert die Abo-Gewicht-Logik aus `cast_vote` (identisch): `v_weight=2` wenn Voter aktiver club_subscription-Inhaber von `v_poll.club_id` (status='active' AND expires_at>now()). Gewicht wirkt auf **Tally** (`option votes += v_weight`, `total_votes += v_weight`) + wird in `community_poll_votes.weight` gespeichert. **Geld UNVERÄNDERT** (cost/creator_share pro echter Stimme, nicht Gewicht) — Money-Branches byte-identisch zur Live-Version (D87/156).

## 3. Files
| File | Änderung |
|------|----------|
| `supabase/migrations/20260618170000_slice_336_polls_social.sql` | community_poll_votes +weight · cast_community_poll_vote +weight-Logik · notifications_type_check +'poll_new' |
| `src/types/index.ts` | NotificationType +'poll_new' |
| `src/lib/services/communityPolls.ts` | createCommunityPoll → Follower-Notify (best-effort) |
| `src/lib/notifText.ts` | pollNewTitle/pollNewBody (de+tr) |
| `src/components/layout/NotificationDropdown.tsx` | getNotifIcon + getNotifColor case 'poll_new' |

## 4. Code-Reading (erledigt)
1. ✅ Live `cast_community_poll_vote` (pg_get_functiondef) — Money-Baseline, Tally `+1` → `+v_weight`.
2. ✅ `cast_vote` Abo-Weight (Migration 20260404192000 Z.129-141) — identische Port-Vorlage (club_subscriptions status=active+expires>now, LIMIT 1, weight=2).
3. ✅ `createEvent` Follower-Notify-Pattern (events.mutations.ts:80-93).
4. ✅ notifications_type_check (live) — +'poll_new'. getNotifHref reference_type 'poll' existiert (→/community?tab=aktionen).
5. ✅ NotificationDropdown getNotifIcon/getNotifColor — exhaustive switch, 'poll_new' Case Pflicht.
6. ✅ community_poll_votes cols (kein weight) → ADD.

## 5. Pattern-Refs
- errors-db.md „CREATE OR REPLACE PATCH-AUDIT" (156) — cast_community_poll_vote Body = live + nur weight additiv.
- errors-db.md „CHECK-Drift" (330/332/335) — notifications_type_check +'poll_new' VOR Notification-Write.
- errors-db.md „Transaction-Type/Notification 3-File-Sync" — neuer Notification-Typ: CHECK + Type-Union + Render-Map(Icon+Color).
- club-admin.md — Abo nur status='active' AND expires_at>now.
- AR-44 REVOKE/GRANT auf cast_community_poll_vote (CREATE OR REPLACE resettet Grants).

## 6. Acceptance Criteria
- AC-01 community_poll_votes.weight smallint default 1. VERIFY: information_schema.
- AC-02 cast_community_poll_vote: Abonnent → option+2/total+2/weight=2; Nicht-Abo → +1/weight=1. VERIFY: Money-Smoke (Rollback) mit Abo + ohne.
- AC-03 Geld unverändert: cost-Abzug + creator_share identisch egal Gewicht (nur Tally skaliert). VERIFY: Smoke Wallet-Delta == cost.
- AC-04 notifications_type_check +'poll_new'; createCommunityPoll schreibt poll_new an Follower. VERIFY: Service-Smoke / DB INSERT poll_new ok.
- AC-05 NotificationType +'poll_new', getNotifIcon/Color decken ab, tsc clean.
- AC-06 i18n pollNewTitle/Body de+tr; notifText resolved. VERIFY: node-Check.
- AC-07 AR-44 anon=false auf cast_community_poll_vote. VERIFY: has_function_privilege.

## 7. Edge Cases
| # | Fall | Erwartet |
|---|------|----------|
| 1 | User-Poll (club_id null) Abo | kein Gewicht (club_id null → weight 1) |
| 2 | Gratis-Poll (cost=0) Abonnent | Gewicht 2 wirkt auf Tally, kein Geld |
| 3 | Abo expired | weight 1 |
| 4 | Poll-Create 0 Follower | kein Notify, Poll ok |
| 5 | Notify-Fehler | best-effort, Poll-Create success unberührt |
| 6 | bestehende poll_votes ohne weight | DEFAULT 1 (Backfill via default) |

## 8. Self-Verify
```
mcp execute_sql: information_schema community_poll_votes.weight
Money-Smoke (BEGIN;…ROLLBACK;): Abo-Voter → tally+2/wallet-cost; Nicht-Abo → tally+1
node notifText pollNewTitle de+tr
tsc --noEmit · vitest communityPolls
```

## 9. Open-Q
- ✅ CEO: Reichweite + Abo-2× (Fan-Rang deferred). Gewicht = Tally-only, Geld pro echter Stimme (im Spec verankert).
- Autonom: Icon (Megaphone/Vote), Notify-Batching, weight-Spalte default.

## 10. Proof
- DB: weight-Spalte + cast-Signatur + REVOKE → 336-schema.txt
- Money-Smoke (Rollback): Abo tally+2 + Geld==cost; Nicht-Abo tally+1 → 336-weight-smoke.txt
- Notify: poll_new INSERT ok → in Smoke
- vitest + tsc

## 11. Scope-Out
- Fan-Rang-Gewicht/Auszahlung (P3c, deferred) · Early-Access/exklusive Mitglieder-Umfragen · P4 Teilnehmer-Auszahlung.

## 12. Stage-Chain
SPEC → IMPACT (in Spec §3) → BUILD (Migration → Type → Service → notifText → UI) → REVIEW (Money-Fokus cast-RPC) → PROVE (Money-Smoke) → LOG.

## 13. Pre-Mortem
1. Money-Branch-Drift: cast_community_poll_vote Body byte-identisch live + nur Tally `+1→+v_weight` + weight-Insert + weight-Decl. Money-Smoke Wallet-Delta==cost beweist.
2. CHECK-Drift: notifications_type_check +'poll_new' sonst 23514 beim Notify.
3. Exhaustive-Switch: NotificationType +'poll_new' ohne Icon/Color-Case → tsc/Runtime-Lücke.
4. AR-44 Grant-Reset bei CREATE OR REPLACE.
5. weight bei club_id null (User-Poll): Guard `IF v_poll.club_id IS NOT NULL`.
6. total_votes-Semantik: +v_weight (konsistent mit option-Tally für %-Rechnung).
