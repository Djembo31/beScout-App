# Slice 336 — Pre-Review-Memo (Self-Audit)

## ACs (DB live bewiesen)
- AC-01 weight smallint/NOT NULL/default 1: ✅.
- AC-02 Gewicht: ✅ Money-Smoke — Abonnent weight=2 (option+2/total+2), Nicht-Abo weight=1 (+1). option0=3, total=3.
- AC-03 Geld unverändert: ✅ sub_wallet_delta=1000 (=cost, NICHT 2000), nosub=1000, creator_share=700 beide. Gewicht skaliert NUR Tally.
- AC-04 notif poll_new: ✅ CHECK +'poll_new', Live-INSERT poll_new/reference_type 'poll' OK.
- AC-05 Type+Render: ✅ NotificationType +'poll_new', getNotifIcon/Color + TYPE_TO_CATEGORY (exhaustive Record fing fehlenden Eintrag), tsc clean.
- AC-06 i18n: ✅ notifTemplates pollNewTitle/Body de+tr.
- AC-07 AR-44: ✅ cast anon=false/auth=true.

## Money-Korrektheit (Reviewer-Fokus)
- cast_community_poll_vote Body = live pg_get_functiondef 2026-06-18. NUR additiv: v_weight-Decl, Abo-Block (identisch zu cast_vote: club_subscriptions status=active+expires>now, LIMIT 1, weight=2, nur wenn club_id NOT NULL), Tally `+1→+v_weight`, total_votes `+1→+v_weight`, weight-Insert, RETURN +weight.
- **Geld-Branches BYTE-IDENTISCH:** Wallet-Abzug (v_cost), Treasury-Credit (v_creator_share), transactions-Inserts, source-Routing, Defense-in-Depth-Guard (club ohne club_id → RAISE) — unverändert. amount_paid/creator_share/platform_share in community_poll_votes = echte Stimme (nicht gewichtet).
- Smoke beweist: Gewicht ≠ Geld.

## Reviewer-Fokus / Risiken
1. **Money-Branch-Erhalt (156):** Bitte gegenprüfen dass kein Geld-Pfad degradiert (besonders source='club' Treasury + source='user' Wallet).
2. **Gewicht-Semantik:** weight nur Tally + total_votes; %-Anzeige bleibt konsistent (beide skaliert). club_id-null (User-Poll) → weight 1 (Guard).
3. **CHECK-Drift:** notifications_type_check +'poll_new' VOR Notify (sonst 23514).
4. **Follower-Notify best-effort:** createCommunityPoll fire-and-forget, Poll-Create-Erfolg unberührt bei Notify-Fehler. club_followers.user_id / user_follows.follower_id (following_id=Creator) — Spalten verifiziert.
5. **Notification-Typ 4-Punkt-Sync:** CHECK + NotificationType + getNotifIcon/Color + TYPE_TO_CATEGORY alle bedient.
6. **AR-44** auf cast (CREATE OR REPLACE Grant-Reset).

## Scope
- Fan-Rang deferred (Anil). Keine Drift.
