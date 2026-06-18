# Active Slice

```
status: idle
slice: 334
title: ✅ DONE — Polls P2 (player_id-Bezug + Discovery Anker-Filter)
stage: LOG complete
spec: worklog/specs/334-polls-p2-player-anchor-discovery.md
impact: worklog/impact/334-polls-p2-player-anchor.md
proof: worklog/proofs/334-proof.md
review: worklog/reviews/334-review.md
```

## Zuletzt

- **Slice 333** (2026-06-18) — Polls P1 (L, Money/CEO). PASS. `community_polls` erstellbar, Geld-Routing keyt auf `source`.
- **Slice 334** (2026-06-18) — Polls P2 (L, KEIN Money-Path). Scope: Anker-Filter-Chips + alle Typen (Anil-Freigabe). IMPACT: MitmachenSection = safe (optional-Feld), Picker Modal-intern.

## Plan (BUILD-Reihenfolge)

1. Migration: player_id-Spalte + create_community_poll (9-arg) + REVOKE/GRANT.
2. Types: DbCommunityPoll.player_id, CreateCommunityPollParams.playerId, CommunityPollWithCreator.player_name/player_position.
3. Service: createCommunityPoll (p_player_id) + getCommunityPolls (player-name-resolve).
4. CreatePollModal: optionaler Spieler-Picker (usePlayerNames intern).
5. CommunityFeedTab: Suche erweitern (player+club) + Anker-Chip-Leiste.
6. CommunityPollCard: optionaler Spieler-Tag.
7. i18n de+tr (community-Namespace).
8. Tests anpassen.

## Nächstes Money-Stück (Polls-Roadmap, D86 §8)
- **P3** — soziale Schicht (Follower-Reichweite, Abo-2×-Gewicht bei Paid-Polls, Fan-Rang).
- **P4** — Auszahl-Idee an Teilnehmer (offen, §7).
