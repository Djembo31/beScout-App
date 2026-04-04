# Scout Missions E2E — Spec

**Datum:** 2026-04-04
**Status:** SPEC PHASE — Warte auf Anil-Alignment

---

## 1.1 Current State

### Feature-Inventar (was ein User SEHEN und TUN kann)

| # | Feature | Status | Wo |
|---|---------|--------|----|
| 1 | Missions-Page oeffnen | UI existiert | `/missions` |
| 2 | Tages-Missionen sehen + Progress | UI + Service existiert | MissionBanner |
| 3 | Wochen-Missionen sehen + Progress | UI + Service existiert | MissionBanner |
| 4 | Reward claimen bei fertiger Mission | UI + Service existiert | MissionBanner |
| 5 | Login-Streak sehen | UI existiert | Missions Page |
| 6 | Daily Challenge beantworten | UI + Service existiert | DailyChallengeCard |
| 7 | Score Road (Rang-Fortschritt) | UI existiert | ScoreRoadCard |
| 8 | Mystery Box oeffnen | UI + Service existiert | MysteryBoxModal |
| 9 | Mission-Hints in Kontexten | UI + Hook existiert | MissionHintList |
| 10 | Nav-Link zu Missions | Aktiv | SideNav + Home QA |

### File-Inventar

| Datei | Zeilen | Zweck |
|-------|--------|-------|
| `src/app/(app)/missions/page.tsx` | 187 | Missions Hub Page |
| `src/app/(app)/missions/loading.tsx` | 13 | Skeleton |
| `src/app/(app)/missions/error.tsx` | 41 | Error Boundary |
| `src/components/missions/MissionBanner.tsx` | 267 | Haupt-Missions-UI |
| `src/components/missions/MissionHint.tsx` | 59 | Kontext-Hint |
| `src/components/missions/MissionHintList.tsx` | 30 | Hint-Liste |
| `src/lib/services/missions.ts` | 148 | Mission Service |
| `src/lib/services/scoutMissions.ts` | 140 | Scout-Missions Service |
| `src/lib/queries/missions.ts` | 63 | useMissionHints Hook |
| `src/types/index.ts` (L1247-1286) | 40 | Mission Types |
| `src/lib/queries/keys.ts` (L157-161) | 5 | Query Keys |

### Datenfluss

```
User Action (Trade/Post/Fantasy/etc.)
  → Service (trading.ts, posts.ts, etc.)
    → triggerMissionProgress(userId, ['daily_trade', ...])
      → trackMissionProgress(userId, missionKey)
        → supabase.rpc('track_my_mission_progress')
          → update_mission_progress() [DB function]
            → UPDATE user_missions SET progress = progress + 1

User oeffnet /missions
  → MissionBanner → getUserMissions(userId)
    → supabase.rpc('assign_user_missions') [erstellt fehlende Missions]
    → getMissionDefinitions() [SELECT * FROM mission_definitions]
    → Merged: UserMissionWithDef[]

User claimt Reward
  → claimMissionReward(userId, missionId)
    → supabase.rpc('claim_mission_reward')
    → + Activity Log + Tickets + Notification (fire-and-forget)
```

### DB-Tabellen

- `mission_definitions` — 5 Rows geseedet (3 Trading + 2 Fantasy), RLS ON
- `user_missions` — Dynamisch per User, RLS ON

### Seeded Missions

| Key | Type | Titel | Target | Reward |
|-----|------|-------|--------|--------|
| `daily_trade` | daily | Taeglicher Handel | 1 | 50 $SCOUT |
| `weekly_5_trades` | weekly | 5 Trades diese Woche | 5 | 250 $SCOUT |
| `first_ipo_buy` | weekly | IPO Teilnahme | 1 | 150 $SCOUT |
| `daily_fantasy_entry` | daily | Fantasy-Event beitreten | 1 | 50 $SCOUT |
| `weekly_3_lineups` | weekly | 3 Lineups einreichen | 3 | 150 $SCOUT |

### Client-Side Tracking (was wann getriggert wird)

| Aktion | Mission Keys | Service |
|--------|-------------|---------|
| Trade Buy/Sell | `daily_trade`, `weekly_5_trades` | trading.ts |
| P2P Offer Accept | `daily_trade`, `weekly_5_trades` | offers.ts |
| IPO Buy | `first_ipo_buy`, `daily_trade`, `weekly_5_trades` | ipo.ts |
| Fantasy Join | `weekly_fantasy`, `daily_fantasy_entry` | useEventActions.ts |
| Lineup Submit | `weekly_3_lineups` | useEventActions.ts |
| Post Create | `create_post`, `community_activity` | posts.ts |
| Research Write | `write_research`, `community_activity` | research.ts |
| Follow User | `follow_user`, `social_activity` | social.ts |
| Vote in Poll | `daily_vote` | communityPolls.ts |
| Bounty Submit | `daily_submit_bounty`, `weekly_bounty_complete` | bounties.ts |
| Mystery Box | `open_mystery_box`, `daily_activity` | mysteryBox.ts |
| Daily Challenge | `complete_challenge`, `daily_activity` | dailyChallenge.ts |

### DB-Trigger Tracking (parallel, Server-seitig)

| Trigger | Mission Keys |
|---------|-------------|
| `fn_analyst_score_on_post` | `daily_post`, `weekly_3_posts` |
| `fn_analyst_score_on_research` | `weekly_research` |
| `trg_fn_research_unlock_gamification` | `daily_unlock_research` |
| `trg_fn_follow_gamification` | `weekly_follow_3` |

---

## KRITISCHE LUECKEN

### L1: RPCs nicht in Migrations (Severity: HOCH)

4 RPCs werden vom Service aufgerufen, existieren aber in KEINER Migration:
- `assign_user_missions(p_user_id)` — Mission-Zuweisung
- `claim_mission_reward(p_user_id, p_mission_id)` — Reward Auszahlung
- `track_my_mission_progress(p_mission_key, p_increment)` — Client Wrapper
- `update_mission_progress(user_id, mission_key, increment)` — Internal (von Triggers)

**Vermutung:** Manuell im Supabase Dashboard angelegt. Nicht reproduzierbar.

### L2: RLS Policies fehlen (Severity: HOCH)

RLS ist auf beiden Tabellen aktiviert, aber KEINE Policies in Migrations:
- `mission_definitions`: Braucht SELECT fuer authenticated
- `user_missions`: Braucht SELECT/INSERT/UPDATE fuer eigene Rows

**Ohne Policies:** `getMissionDefinitions()` gibt leeres Array zurueck.
**RPCs mit SECURITY DEFINER** umgehen RLS — daher funktioniert der RPC-Pfad evtl.

### L3: Community-Missions nicht geseedet (Severity: MITTEL)

5 Mission-Keys werden von DB-Triggers getrackt, haben aber KEINE mission_definitions:
- `daily_post`, `weekly_3_posts`, `weekly_research`, `daily_unlock_research`, `weekly_follow_3`

### L4: ~12 Client-Mission-Keys ohne Definitionen (Severity: NIEDRIG)

Keys wie `create_post`, `daily_vote`, `follow_user`, etc. werden getriggert aber es gibt keine Definitionen. `track_my_mission_progress` duerfte still no-oppen.

---

## 1.2 Goals + Non-Goals

### Goals
1. Missions-Page funktioniert E2E: Anzeigen, Progress, Claimen, Reward landet in Wallet
2. Alle 4 RPCs in Migrations erfasst (reproduzierbar)
3. RLS Policies fuer mission_definitions + user_missions erstellt
4. Community-Missions geseedet (damit DB-Trigger nicht ins Leere laufen)
5. Visuelles Ergebnis: User sieht aktive Missions, Fortschritt aktualisiert sich

### Non-Goals
- Scout Missions (scoutMissions.ts) — separates Feature, nicht in diesem Scope
- Mystery Box / Daily Challenge / Score Road debuggen — existieren bereits
- Neue Mission-Typen erfinden — erstmal das Bestehende zum Laufen bringen
- Admin-UI fuer Missions verbessern — funktioniert bereits

### Anti-Requirements
- KEINE neuen Components bauen — alles existiert bereits
- KEINE neuen Mission-Keys erfinden — nur fehlende Definitionen seeden
- KEINE Aenderung der bestehenden Tracking-Logik in Services

---

## 1.3 Feature Migration Map

| # | Feature | Current | Target | Action |
|---|---------|---------|--------|--------|
| 1 | Missions Page | /missions (existiert) | /missions | VERIFY + FIX |
| 2 | MissionBanner | Component (existiert) | Component | VERIFY |
| 3 | Mission RPCs | Manuell in DB? | Migration | ENSURE (create if missing) |
| 4 | RLS Policies | Fehlen | Migration | CREATE |
| 5 | Trading Missions (3) | Geseedet | Geseedet | VERIFY |
| 6 | Fantasy Missions (2) | Geseedet | Geseedet | VERIFY |
| 7 | Community Missions (5) | FEHLEN | Geseedet | CREATE |
| 8 | Mission Hints | Component + Hook | Component + Hook | VERIFY |

---

## OFFENE FRAGE AN ANIL

Bevor ich weitermache — eine entscheidende Frage:

**Kannst du bescout.net/missions oeffnen und mir sagen was du siehst?**

- A) Missions werden angezeigt mit Progress → RPCs existieren, wir muessen nur polishen
- B) Seite ist leer / Fehler → RPCs fehlen in der DB, wir muessen alles bauen
- C) Seite laedt aber zeigt "Keine aktiven Missionen" → RPCs existieren, aber Missions sind nicht zugewiesen

Das bestimmt ob wir Wave 1 (RPCs erstellen) brauchen oder direkt zu Wave 2 (Seeden + Polish) springen.
