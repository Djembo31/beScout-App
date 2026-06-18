# Slice 336 — Proof (Polls P3: Reichweite + Abo-2×-Gewicht)

## DB (live, skzjfhvgccaeplydsunz)
```
community_poll_votes.weight = smallint, NOT NULL, default 1
cast_community_poll_vote: anon=false, authenticated=true (AR-44)
notifications_type_check ILIKE '%poll_new%' = true
```

## AC-02/03 — Gewicht-Money-Smoke (BEGIN;…ROLLBACK;)
Club-Poll cost=1000, Voter1=Gold-Abonnent des Vereins, Voter2=kein Abo, beide Option 0:
```
sub_result   = {success, weight:2, total_votes:2, cost:1000, creator_share:700}
nosub_result = {success, weight:1, total_votes:3, cost:1000, creator_share:700}
option0_votes = 3   (2 + 1)
total_votes   = 3
sub_wallet_delta   = 1000   (= cost, NICHT 2000 → Geld unabhängig vom Gewicht)
nosub_wallet_delta = 1000
```
→ Gewicht skaliert NUR die Stimmen (Tally + total_votes), Geld bleibt pro echter Stimme. ✓

## AC-04 — poll_new Notification (Live-INSERT, Rollback)
```
INSERT notifications (type='poll_new', reference_type='poll') → INSERT_OK
```

## AC-05/06 — Code/i18n
```
NotificationType +'poll_new'; getNotifIcon(Megaphone)+getNotifColor(amber)+TYPE_TO_CATEGORY('social')
  → tsc --noEmit exit 0 (exhaustive Record fing fehlenden Eintrag)
notifTemplates pollNewTitle/Body de+tr → node-Check OK
vitest communityPolls (create+get) → 8 passed
```

## Reviewer
worklog/reviews/336-review.md → PASS, 2 NIT (dokumentiert/Backlog).

## OFFEN (post-Deploy)
Live-Playwright: Abo-2×-Gewicht in der UI sichtbar (Gold-Abo-Konto stimmt → Balken +2) + Follower-Notification-Anzeige. QA-Konto gated (kein Gold-Abo des Test-Vereins) → DB-Smoke + Service-Test decken ab. Backlog: Follower-Notify `.limit()` bei Mega-Clubs (NIT#2).
