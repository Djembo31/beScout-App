# Active Slice

```
status: idle
slice: 422
title: FantasyPlayerRow Club-Identität (eigen + Gegner) aus zuverlässiger Quelle (UUID/aufgelöstes Logo statt Freitext/Short) — DONE
size: S
stage: LOG (DONE)
spec: worklog/specs/422-fantasyplayerrow-club-identity-uuid.md
impact: skipped (reines UI-Prop-Routing entlang vorhandener NextFixtureInfo.opponentLogoUrl + UserDpcHolding.clubId; kein DB/Service/Mapper-Change)
proof: worklog/proofs/422-club-identity.txt (+ 422-event-player-list-live.png BOSTAN→Konyaspor, 422-bay-collision-fixtures.png)
review: worklog/reviews/422-review.md (PASS, Finding #1 gefixt)
proof-summary: tsc 0 + 110 Tests + DB-Vorher/Nachher (294/4472 stale, Amine Adli Bournemouth→Leverkusen, BAY doppelt same-league) + Live bescout.net: Melih Bostan rendert „Konyaspor"+Logo+SL-Badge statt stale „Sakaryaspor". Commit 7e81487e.
```

## Zuletzt

- **Slice 421** (2026-06-27) — Welle 2.4 Per-Liga-GW-Max-Routing + GameweekSelector-Orphan gelöscht (S, PASS).
- **Slice 420** (2026-06-27) — Welle 2.3 Heim/Auswärts + FDR über Club-UUID (S, PASS).
- **Slice 419/419b** (2026-06-27) — Welle 2.1+2.2 player_gameweek_scores fixture-gebunden + score_event liga-bewusst (PASS).

## Plan (422)

Faktenbasiert (DB-Probe skzjfhvgccaeplydsunz 2026-06-27): eigenes Logo für **294/4472 Spieler (6,6 %)** falsch (stale `players.club`-String ≠ `club_id`-Logo) + Gegner-Logo BAY-Kollision (S276). Beide → UUID/aufgelöste Quelle. 1 Komponente + 2 Aufrufer, kein DB-Change.

Nächstes (CTO-Empf. nach 422): Admin-38-Hardcodes (gemeldeter Smell) → dann Ranking-Konsolidierung scout_scores↔user_stats (money-nah, CEO-Quelle-Entscheid) ODER Welle 3 (CEO-Architektur-Fork).
