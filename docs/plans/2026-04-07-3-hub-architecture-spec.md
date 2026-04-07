# 3-Hub Architecture — Profile / Inventory / Missions Konsolidierung

**Datum:** 2026-04-07
**Status:** SPEC PHASE — Review durch Anil
**Autor:** Claude (Spec), Anil (Requirements)

---

## Kontext + Motivation

User-Items und Progress sind aktuell auf 4 Locations verteilt (Profile, Missions, Home, nirgends). Equipment ist orphan. Cosmetics sind versteckt. Mystery Box History wurde gebaut aber nie angezeigt. Daily Challenge + Score Road existieren doppelt auf Home + Missions.

**Ziel:** Saubere 3-Hub Trennung mit klarem User-Mental-Model:
- **Profile** = "Wer ich bin" (Identitaet, Stats, Trading-History)
- **`/inventory`** (NEU) = "Was ich habe" (Equipment, Cosmetics, Wildcards, MB History)
- **`/missions`** = "Was ich tue" (Missions, Challenges, Achievements, Score Road, Streaks)

---

## 1.1 Current State

### Feature Inventory (was kann User aktuell sehen + tun)

| # | Feature | Aktuell wo | User-Action |
|---|---------|-----------|-------------|
| F1 | Scout Card / Profil-Header (Stats, Rang, Avatar) | Profile | Public + Self anzeigen |
| F2 | Holdings / Portfolio (Top 5) | Profile/Trader Tab | Trade-Historie sehen |
| F3 | Trading Stats (PnL, Win Rate, Volume) | Profile/Trader Tab | Eigene Performance |
| F4 | Mastery Stars (per Spieler) | Profile/Trader Tab | Stars-Anzeige |
| F5 | Wildcards Balance | Profile/Trader Tab inline | Reine Anzeige (Balance-Zahl) |
| F6 | Recent Trades (5) | Profile/Trader Tab | Trade-History sehen |
| F7 | Manager Tab (Fantasy Stats) | Profile/Manager Tab | Manager Score, Fantasy Results |
| F8 | Analyst Tab (Research, Bounties) | Profile/Analyst Tab | Analyst Score, Track Record |
| F9 | Achievements (33 total, 15 featured) | Profile/Achievements Tab | Sammeln, Anzeigen |
| F10 | Score Progress (3 Dimensionen) | Profile/Achievements + jeder Dim-Tab inline | Anzeigen |
| F11 | Activity / Timeline (Transactions) | Profile/Timeline Tab | History scrollen |
| F12 | Wallet Card (Balance, Deposit) | Profile linke Sidebar | Reine Anzeige |
| F13 | Airdrop Score Card | Profile linke Sidebar | Anzeigen |
| F14 | Referral Card | Profile linke Sidebar | Self-only |
| F15 | Daily Challenge (Quizfrage) | **Home + Missions (DUPLICATE)** | Beantworten |
| F16 | Active Missions (MissionBanner) | Missions Page | Klicken, claimen |
| F17 | Score Road Card (volle Liste) | Missions Page | Milestones claimen |
| F18 | Score Road Strip (compact) | **Home (ZUSAETZLICH)** | Anzeigen |
| F19 | Streak Banner / Active Benefits | Missions + Home (StreakMilestoneBanner) | Anzeigen |
| F20 | Mystery Box CTA + Modal | Home + Missions (CTA in DailyChallengeCard) | Box oeffnen |
| F21 | Equipment Inventory | **❌ NIRGENDS** (nur EquipmentPicker beim Lineup-Build) | — |
| F22 | Cosmetics Sammlung | **❌ NIRGENDS** (nur passiv im ScoutCard fuer equipped) | — |
| F23 | Mystery Box History (letzte Drops) | **❌ NIRGENDS** (Service existiert, kein UI) | — |
| F24 | Hero Story Header | Home | Anzeigen |
| F25 | Quick Actions Bar (4 Links) | Home | Navigieren |
| F26 | Spotlight (Event/IPO/Holdings) | Home | Klicken |
| F27 | Top Movers (Portfolio + Global) | Home | Klicken |
| F28 | Market Pulse (Trending) | Home | Klicken |
| F29 | Most Watched | Home | Anzeigen |
| F30 | Next Event Card | Home Sidebar | Zur Fantasy |
| F31 | Active IPO Card | Home Sidebar | Zum Player |
| F32 | My Clubs Strip | Home Sidebar | Zum Club |
| F33 | Onboarding Checklist | Home (new user) | Tasks abhaken |
| F34 | Suggested Action Banner | Home | Anzeigen |

**Total:** 34 User-sichtbare Features.
**Duplikate:** F15 (Daily Challenge), F18 vs F17 (Score Road compact vs full), F19 (Streak Banner)
**Orphans:** F21 (Equipment), F22 (Cosmetics Sammlung), F23 (MB History)

### File Inventory

**Profile Hub** (12 Files, ~2.500 Lines)
| File | Lines | Rolle |
|------|-------|-------|
| `app/(app)/profile/page.tsx` | ~30 | Self-Profile Route |
| `app/(app)/profile/[handle]/page.tsx` | ~40 | Public-Profile Route |
| `app/(app)/profile/settings/page.tsx` | ~210 | Settings (separat) |
| `components/profile/ProfileView.tsx` | 200 | Hauptview, Tabs |
| `components/profile/hooks.ts` | ? | useProfileData (data aggregation) |
| `components/profile/ScoutCard.tsx` | ? | Profil-Header mit Cosmetics |
| `components/profile/TraderTab.tsx` | 398 | Holdings + Mastery + **Wildcards inline** |
| `components/profile/ManagerTab.tsx` | ? | Fantasy Stats |
| `components/profile/AnalystTab.tsx` | ? | Research/Bounty Stats |
| `components/profile/AchievementsSection.tsx` | ? | 33 Achievements + Score Progress |
| `components/profile/TimelineTab.tsx` | ? | Transactions History |
| `components/profile/RadarChart.tsx` | ? | 3-Dim Visualization |
| `components/profile/PredictionStatsCard.tsx` | ? | Predictions Stats |
| `components/profile/FollowListModal.tsx` | ? | Follower/Following Modal |
| `components/profile/ScoreProgress.tsx` | ? | Single-Dim Progress Bar |

**Missions Hub** (5 Files, ~600 Lines)
| File | Lines | Rolle |
|------|-------|-------|
| `app/(app)/missions/page.tsx` | 204 | Page Route |
| `components/missions/MissionBanner.tsx` | ? | Active Missions Liste |
| `components/missions/MissionHint.tsx` | ? | Mission Hint Card |
| `components/missions/MissionHintList.tsx` | ? | Hint List |
| `components/gamification/DailyChallengeCard.tsx` | ? | Daily Quiz |

**Home Hub** (15+ Files)
| File | Lines | Rolle |
|------|-------|-------|
| `app/(app)/page.tsx` | 478 | Home Page |
| `app/(app)/hooks/useHomeData.ts` | ~250 | Data Aggregation |
| `components/home/HomeStoryHeader.tsx` | ? | Hero |
| `components/home/HomeSpotlight.tsx` | ? | Spotlight |
| `components/home/PortfolioStrip.tsx` | ? | Portfolio Strip |
| `components/home/TopMoversStrip.tsx` | ? | Movers |
| `components/home/StreakMilestoneBanner.tsx` | ? | Streak Banner |
| `components/home/SuggestedActionBanner.tsx` | ? | Suggested Action |
| `components/home/MostWatchedStrip.tsx` | ? | Watchlist |
| `components/home/OnboardingChecklist.tsx` | ? | Onboarding |
| `components/home/BeScoutIntroCard.tsx` | ? | New User Intro |
| `components/gamification/ScoreRoadStrip.tsx` | ? | **DUPLICATE Score Road compact** |

**Items / Gamification (cross-cutting)**
| File | Lines | Rolle |
|------|-------|-------|
| `lib/services/equipment.ts` | 92 | Equipment Service |
| `lib/queries/equipment.ts` | 37 | Equipment Hooks |
| `lib/services/cosmetics.ts` | ~150 | Cosmetics Service |
| `lib/queries/cosmetics.ts` | 42 | Cosmetics Hooks |
| `lib/services/mysteryBox.ts` | 71 | Mystery Box Service |
| `lib/queries/mysteryBox.ts` | 18 | Mystery Box Hooks |
| `lib/queries/events.ts` | ? | `useWildcardBalance` |
| `components/gamification/EquipmentPicker.tsx` | 209 | Lineup-Picker (BLEIBT) |
| `components/gamification/EquipmentBadge.tsx` | ? | Pitch-Badge (BLEIBT) |
| `components/gamification/MysteryBoxModal.tsx` | ? | Box Opening Modal |
| `components/gamification/ScoreRoadCard.tsx` | ? | Score Road full |
| `components/gamification/AchievementUnlockModal.tsx` | ? | Achievement Notification |
| `components/gamification/FanRankOverview.tsx` | ? | Rank Overview |

### Data Flow / Hooks

| Hub | Hooks |
|-----|-------|
| Profile | `useProfileData`, `useUserMasteryAll`, `useWildcardBalance`, `useBatchEquippedCosmetics`, `useScoreRoadClaims`, `useScoutScores` |
| Missions | `useTodaysChallenge`, `useChallengeHistory`, `useUserTickets`, `useScoreRoadConfig` |
| Home | `useHomeData` (aggregator: `useUser`, `useUserStats`, `useTodaysChallenge`, `useUserTickets`, etc.) |
| Items (orphan/new) | `useUserEquipment`, `useEquipmentDefinitions`, `useUserCosmetics`, `useEquippedCosmetics`, `useMysteryBoxHistory`, `useWildcardBalance` |

### External Links to /profile

22 Files greppen `/profile`:
- `/profile/[handle]` Public-Links (Community, Fantasy, Player Detail, Admin) — **bleiben unveraendert**
- `/profile` Self-Link (TopBar, ScoreRoadStrip, AchievementUnlockModal `?tab=overview`)
- `/profile/settings` (SideNav, ScoutCard) — bleibt eigene Route

**Kritisch:** AchievementUnlockModal linkt zu `/profile?tab=overview` — diesen Tab gibt es nicht (overview wurde nie implementiert), funktioniert aber als Default-Fallback.

### External Links to /missions

8 Files greppen `/missions`:
- Quick Action in Home Page
- DailyChallengeCard CTA (Home + Missions)
- SideNav NAV_MAIN

### Shared State (React Query Keys)

```
qk.equipment.{definitions, ranks, inventory}
qk.cosmetics.{user, equipped, batchEquipped}
qk.mysteryBox.history
qk.tickets.balance
qk.dailyChallenge.{today, history}
qk.gamification.{scores, scoreRoad}
qk.userStats.detail
```

Keine direkten Konflikte. Alle Hooks nutzen bereits unterschiedliche Keys.

---

## 1.2 Goals + Non-Goals + Anti-Requirements

### Goals
1. **`/inventory` Page bauen** — 4 Sektionen (Equipment, Cosmetics, Wildcards, MB History) mit klarer Navigation
2. **Profile entladen** — Wildcards raus, Cosmetics-Sammlung raus, Achievements raus, Score Road raus
3. **`/missions` zu Progress-Hub umbauen** — Achievements + Score Road (single source) + Streak Milestones einbauen
4. **Home entladen** — Score Road Strip raus, Daily Challenge raus, Streak Banner raus (alle bleiben in /missions)
5. **SideNav erweitern** — neuer "Inventar" Eintrag in NAV_MAIN

### Non-Goals
- Settings-Page redesign (bleibt wie sie ist)
- TopBar/SideNav Visual-Redesign (nur neuer Eintrag)
- Public Profile (`/profile/[handle]`) Redesign — bleibt wie es ist (oder zeigt nur das was Self-Profile zeigt minus self-only Sachen)
- Trader/Manager/Analyst Tab Logik aendern (nur Inhalt verschieben)
- Mystery Box Animation/Reveal aendern
- Equipment Scoring-Integration (kommt separat)
- Mobile-Bottom-Nav umbauen (`Inventar` kommt nur in SideNav, nicht BottomNav — sonst zu eng)

### Anti-Requirements
- KEINE doppelte Funktionalitaet — wenn Feature wandert, alte Stelle MUSS geloescht werden
- KEINE neuen npm Dependencies
- KEINE Aenderung der React Query Keys (nur Consumers)
- KEINE Loeschung von Public-Profile Tabs (Trader/Manager/Analyst bleiben)
- KEINE Aenderung der `/missions` URL
- KEIN neuer Tab im Profile — alles raus, nicht rein

---

## 1.3 Feature Migration Map

| # | Feature | Current | Target | Action |
|---|---------|---------|--------|--------|
| F1 | Scout Card | Profile | Profile (bleibt) | NONE |
| F2 | Holdings | Profile/Trader | Profile/Trader (bleibt) | NONE |
| F3 | Trading Stats | Profile/Trader | Profile/Trader (bleibt) | NONE |
| F4 | Mastery Stars | Profile/Trader | Profile/Trader (bleibt) | NONE |
| F5 | **Wildcards Balance** | Profile/Trader inline | `/inventory` Wildcards Section | **MOVE** |
| F6 | Recent Trades | Profile/Trader | Profile/Trader (bleibt) | NONE |
| F7 | Manager Tab | Profile | Profile (bleibt) | NONE |
| F8 | Analyst Tab | Profile | Profile (bleibt) | NONE |
| F9 | **Achievements** | Profile/Achievements Tab | `/missions` als Achievements Section | **MOVE** |
| F10 | Score Progress (per Dim) | Profile in jedem Tab | Profile in jedem Tab (bleibt) | NONE |
| F11 | Timeline | Profile | Profile (bleibt) | NONE |
| F12 | Wallet Card | Profile Sidebar | Profile Sidebar (bleibt) | NONE |
| F13 | Airdrop Score Card | Profile Sidebar | Profile Sidebar (bleibt) | NONE |
| F14 | Referral Card | Profile Sidebar | Profile Sidebar (bleibt) | NONE |
| F15 | **Daily Challenge** | Home + Missions (DUPLICATE) | `/missions` only | **DEDUPE** |
| F16 | Active Missions | Missions | Missions (bleibt) | NONE |
| F17 | Score Road Card (full) | Missions | Missions (bleibt) | NONE |
| F18 | **Score Road Strip (compact)** | Home | REMOVE (full version in /missions) | **REMOVE** |
| F19 | **Streak Milestone Banner** | Home | `/missions` (Single Source) | **MOVE** |
| F20 | Mystery Box CTA + Modal | Home + Missions | Beide bleiben (CTA bleibt sichtbar) | NONE |
| F21 | **Equipment Inventory** | NIRGENDS | `/inventory` Equipment Section | **CREATE** |
| F22 | **Cosmetics Sammlung** | NIRGENDS | `/inventory` Cosmetics Section | **CREATE** |
| F23 | **Mystery Box History** | NIRGENDS | `/inventory` MB History Section | **CREATE** |
| F24 | Hero Story Header | Home | Home (bleibt) | NONE |
| F25 | Quick Actions Bar | Home | Home (+ Inventar Link) | **ENHANCE** |
| F26 | Spotlight | Home | Home (bleibt) | NONE |
| F27 | Top Movers | Home | Home (bleibt) | NONE |
| F28 | Market Pulse | Home | Home (bleibt) | NONE |
| F29 | Most Watched | Home | Home (bleibt) | NONE |
| F30 | Next Event Card | Home | Home (bleibt) | NONE |
| F31 | Active IPO Card | Home | Home (bleibt) | NONE |
| F32 | My Clubs Strip | Home | Home (bleibt) | NONE |
| F33 | Onboarding Checklist | Home | Home (bleibt) | NONE |
| F34 | Suggested Action Banner | Home | Home (bleibt) | NONE |

**Summary:**
- **MOVE:** 3 Features (F5 Wildcards, F9 Achievements, F19 Streak Banner)
- **DEDUPE:** 1 Feature (F15 Daily Challenge)
- **REMOVE:** 1 Feature (F18 Score Road Strip — wird vollstaendig durch /missions abgebildet)
- **CREATE:** 3 Features (F21 Equipment, F22 Cosmetics, F23 MB History)
- **ENHANCE:** 1 Feature (F25 Quick Actions — neuer Inventar-Link)
- **NONE:** 26 Features (bleiben wie sie sind)

---

## 1.4 Blast Radius Map

### Change 1: Wildcards aus TraderTab raus

**File:** `src/components/profile/TraderTab.tsx`
- Remove: import `useWildcardBalance`, `WildCardsSection` function (Z. 350-372), Aufruf in render
- Remove: `Sparkles` icon import wenn nur dafuer genutzt

**Direct Consumers (Wildcards Hook):**
```bash
grep -r "useWildcardBalance" src/
→ src/components/profile/TraderTab.tsx (REMOVE)
→ src/features/fantasy/queries/events.ts (Hook-Definition — bleibt)
→ src/features/fantasy/index.ts (Re-Export — bleibt)
→ src/app/(app)/fantasy/__tests__/FantasyContent.test.tsx (test — bleibt)
```

**Impact:** TraderTab wird ~22 Lines kuerzer. Hook wird in `/inventory` neu importiert.

### Change 2: AchievementsSection aus Profile raus

**Files:**
- `src/components/profile/ProfileView.tsx` Z. 60-62 (TabBar Definition), Z. 179-184 (TabPanel) — REMOVE
- `src/components/profile/AchievementsSection.tsx` — MOVE nach `src/components/missions/AchievementsSection.tsx`
- `src/components/profile/hooks.ts` — `unlockedAchievements` aus Profile-Data raus, in Missions data rein

**Direct Consumers:**
```bash
grep -r "AchievementsSection" src/
→ src/components/profile/ProfileView.tsx (UPDATE: import path + remove tab)
```

**External Links:**
- `src/components/gamification/AchievementUnlockModal.tsx:56` linkt zu `/profile?tab=overview` (bleibt — fallback)
- Achievement Unlock-Notifications sollten zu `/missions` linken statt `/profile`

**Impact:** ProfileView verliert Tab. Missions Page bekommt neue Section. AchievementUnlockModal Link aktualisieren.

### Change 3: Score Road Strip aus Home raus

**File:** `src/app/(app)/page.tsx` Z. 38-41 (dynamic import), Z. 422-423 (render)

**Direct Consumers (ScoreRoadStrip):**
```bash
grep -r "ScoreRoadStrip" src/
→ src/app/(app)/page.tsx (REMOVE)
→ src/components/gamification/ScoreRoadStrip.tsx (Component — DELETE if no other consumers)
```

**Impact:** Home wird kuerzer. Component kann komplett geloescht werden (Strip wird nirgends sonst genutzt) — ALTERNATIVE: behalten als Re-Use Option fuer kleinere Anzeigeflaechen.

### Change 4: Daily Challenge aus Home raus

**File:** `src/app/(app)/page.tsx` Z. 33-36 (dynamic import), Z. 392-405 (render)
**File:** `src/app/(app)/hooks/useHomeData.ts` — `todaysChallenge`, `todaysAnswer`, `challengeLoading`, `handleChallengeSubmit`, `isSubmitting` raus

**Direct Consumers (useHomeData consumers):**
- Nur `app/(app)/page.tsx`

**Impact:** Home wird kuerzer. useHomeData wird kuerzer. DailyChallengeCard bleibt im Code (nur Missions nutzt sie).

### Change 5: Streak Milestone Banner aus Home raus

**File:** `src/app/(app)/page.tsx` Z. 44 (dynamic import), Z. 425-428 (render)
**File:** `src/app/(app)/missions/page.tsx` — Streak Banner inline ersetzen durch `<StreakMilestoneBanner>` (oder eigene Variante)

**Direct Consumers (StreakMilestoneBanner):**
```bash
grep -r "StreakMilestoneBanner" src/
→ src/app/(app)/page.tsx (REMOVE)
→ src/components/home/StreakMilestoneBanner.tsx (Component — MOVE oder import aus /missions)
```

**Impact:** Home verliert Banner, Missions bekommt es. Component kann in `/components/missions/` umziehen.

### Change 6: NEUE `/inventory` Page

**Files (CREATE):**
- `src/app/(app)/inventory/page.tsx`
- `src/components/inventory/EquipmentSection.tsx`
- `src/components/inventory/CosmeticsSection.tsx`
- `src/components/inventory/WildcardsSection.tsx`
- `src/components/inventory/MysteryBoxHistorySection.tsx`
- `src/components/inventory/InventoryTabs.tsx` (Tab Switcher)

**Files (UPDATE):**
- `src/lib/nav.ts` — neuer NAV_MAIN Eintrag `{ label: 'inventory', href: '/inventory', icon: Package }`
- `messages/de.json`, `messages/tr.json` — neue Keys `inventory.*`

**Blast Radius:** Keine — neue Files, keine Consumers von alten Files betroffen.

### Change 7: Quick Actions Bar erweitern

**File:** `src/app/(app)/page.tsx` Z. 130-148 (Quick Actions Array)

Neuer Eintrag fuer `/inventory`. Aktuell 4 Buttons, dann 5. Auf Mobile bereits horizontal scrollbar.

---

## 1.5 Pre-Mortem

| # | Failure Scenario | Mitigation |
|---|-----------------|------------|
| 1 | **Doppelte Funktionalitaet:** Achievements bleiben in Profile UND tauchen in Missions auf | Wave 3 (Profile entladen) MUSS in derselben Welle wie Wave 2 (Missions umbauen) liegen — Move + Delete im selben Commit |
| 2 | **Externe Links brechen:** AchievementUnlockModal linkt auf `/profile?tab=overview` — der Tab existiert nicht mehr | Link aktualisieren auf `/missions#achievements` in derselben Wave |
| 3 | **Leere Inventory Sections:** Neuer User hat 0 Equipment + 0 Cosmetics + 0 Wildcards → leere Seite | Empty State pro Section: "Oeffne Mystery Boxes um X zu sammeln" mit CTA |
| 4 | **Mobile Tab-Bar zu eng:** 5 Inventory-Tabs + Profile-Bottom-Nav → overflow | Inventory Tabs als horizontal scrollbar (`flex-shrink-0`), Inventory NICHT in Bottom-Nav (nur SideNav) |
| 5 | **`useWildcardBalance` ist null** | Existing null-guard `if (wcBalance == null \|\| wcBalance === 0) return null` migriert mit |
| 6 | **Public-Profile bricht:** AchievementsSection wird removed, aber `/profile/[handle]` zeigte sie auch | Public-Profile zeigt aktuell denselben ProfileView — Achievements werden auch dort weg sein. Akzeptabel: Public Profile zeigt Stats ohne Achievements. |
| 7 | **Score Road Strip ist nirgends mehr sichtbar** | Strip wird removed, ScoreRoadCard (full) ist in /missions weiterhin da. Kein Verlust an Funktionalitaet, nur an Sichtbarkeit auf Home. |
| 8 | **Mystery Box History Type/Service Mismatch** | `getMysteryBoxHistory` Service existiert bereits — nur Hook + UI fehlen. Pruefen vor Implementation: Return-Type matched neue reward_types (equipment, bcredits) |
| 9 | **i18n Keys fehlen** | DE + TR JSON updates in derselben Wave wie Component-Erstellung |
| 10 | **Cosmetics-Equipped-Lookup verschwindet aus ScoutCard** | ScoutCard nutzt `useBatchEquippedCosmetics` (nur fuer Frame/Title-Display) — bleibt unveraendert. Cosmetics-Sammlung zu `/inventory` ist eine NEUE View, nicht ein Move. |

---

## 1.6 Invarianten + Constraints

### Invarianten (NICHT aendern)

1. Trader/Manager/Analyst Tab Logik (Holdings, Stats, Win Rate Berechnung) — bleiben byte-identical
2. Public Profile Route `/profile/[handle]` funktioniert weiter
3. ProfileView Props Interface bleibt kompatibel (`targetUserId`, `targetProfile`, `isSelf`)
4. Mystery Box Modal Workflow (Open → Reveal → Close) bleibt unveraendert
5. EquipmentPicker im Lineup-Builder bleibt unveraendert (Inventory ist andere View)
6. Score Road Claim-Logik bleibt in `ScoreRoadCard`
7. Achievement Tracking-Logik bleibt in `lib/achievements.ts`
8. NAV_MAIN Reihenfolge: Inventar zwischen `missions` und `club` (logisch nach Missions)
9. SideNav Mobile (Bottom Nav) bleibt 5-Items — Inventory NICHT in Bottom Nav
10. Daily Challenge bleibt funktional auf `/missions` (nur Home-Duplikat raus)

### Constraints

- **Max 10 Files pro Wave**
- **Move + Delete IM SELBEN Commit** (kein "wir machen alt-Cleanup spaeter")
- **Tests muessen gruen bleiben** — `vitest run` nach jeder Wave
- **`tsc --noEmit` 0 Errors** nach jedem Task
- **Keine neuen Components wo bestehende reichen** (z.B. ScoreRoadCard wird nicht neu gebaut)
- **i18n DE + TR muessen vollstaendig sein** vor Push
- **Self-Test Gate vor jedem Commit:** /inventory page einmal komplett durchklicken (alle 4 Tabs), /profile einmal durchklicken (5 → 4 Tabs), /missions einmal durchklicken (Achievements visible), Home einmal durchklicken (keine Score Road / Daily Challenge / Streak Banner mehr)

---

## 1.7 Akzeptanzkriterien

### AC1: `/inventory` Page erreichbar
```
GIVEN: User ist eingeloggt
WHEN: User klickt "Inventar" in SideNav
THEN: Navigiert zu /inventory
  AND: 4 Tabs sichtbar (Equipment, Cosmetics, Wildcards, MB History)
  AND: Default-Tab = Equipment
  AND: Page laedt < 1s
```

### AC2: Equipment Section
```
GIVEN: User hat Equipment in user_equipment Tabelle
WHEN: User oeffnet /inventory → Equipment Tab
THEN: Grid zeigt alle Items, gruppiert nach Equipment-Typ × Rang
  AND: Stack-Counts sichtbar bei Duplikaten (z.B. ×3)
  AND: Position-Badges (ATT/MID/DEF/GK/ALL) sichtbar
  AND: "Equipped" Badge wenn Item in einem Lineup angelegt
  AND NOT: Items mit consumed_at sind sichtbar
GIVEN: User hat 0 Equipment
THEN: Empty State "Oeffne Mystery Boxes um Equipment zu sammeln"
  AND: CTA-Button "Mystery Box oeffnen" → Home oder Missions
```

### AC3: Cosmetics Section
```
GIVEN: User hat Cosmetics in user_cosmetics Tabelle
WHEN: User oeffnet Cosmetics Tab
THEN: Grid zeigt alle Items, gruppiert nach Category (Avatar, Frame, Banner, Title)
  AND: "Equipped" Badge auf aktiv genutzten Items
GIVEN: 0 Cosmetics
THEN: Empty State "Schliesse Achievements ab oder oeffne Mystery Boxes"
```

### AC4: Wildcards Section
```
GIVEN: User hat Wildcards (wcBalance > 0)
WHEN: User oeffnet Wildcards Tab
THEN: Karte zeigt: Balance, "Use in Fantasy" Link → /fantasy
GIVEN: wcBalance == 0
THEN: Empty State "Du hast keine Wildcards" + Link zur Erklaerung
```

### AC5: Mystery Box History Section
```
GIVEN: User hat Mystery Box History
WHEN: User oeffnet MB History Tab
THEN: Timeline letzte 20 Drops, neueste oben
  AND: Jeder Drop zeigt: Rarity-Badge, Reward-Type, Wert, Datum
  AND: Equipment-Drops zeigen Equipment-Name + Rang
GIVEN: 0 History
THEN: Empty State "Oeffne deine erste Mystery Box"
```

### AC6: Profile entladen
```
GIVEN: User oeffnet /profile
THEN: 4 Tabs sichtbar (Manager/Trader/Analyst + Timeline)
  AND NOT: Achievements Tab (wurde nach /missions verschoben)
  AND NOT: Wildcards Section in TraderTab
GIVEN: User klickt Trader Tab
THEN: Holdings, Stats, Mastery, Recent Trades sichtbar
  AND NOT: Wildcards Section
```

### AC7: Missions als Progress Hub
```
GIVEN: User oeffnet /missions
THEN: Streak Banner sichtbar (oben)
  AND: Daily Challenge sichtbar
  AND: Active Missions sichtbar (MissionBanner)
  AND: Achievements Section sichtbar (NEU — von Profile verschoben)
  AND: Score Road Card sichtbar
  AND: Mystery Box CTA bleibt erreichbar
```

### AC8: Home entladen
```
GIVEN: User oeffnet /
THEN: Hero Header, Spotlight, Quick Actions, Portfolio, Top Movers, Sidebar (Next Event/IPO/MB CTA/My Clubs) sichtbar
  AND NOT: Daily Challenge Card (verschoben nach /missions)
  AND NOT: Score Road Strip (verschoben nach /missions)
  AND NOT: Streak Milestone Banner (verschoben nach /missions)
  AND: Quick Actions Bar enthaelt neuen "Inventar" Eintrag
```

### AC9: Navigation
```
GIVEN: User klickt SideNav
THEN: NAV_MAIN zeigt Inventar zwischen Missions und Club
  AND: Aktuelle Route highlighted bei /inventory
GIVEN: Mobile Bottom Nav
THEN: 5 Items wie vorher (KEIN Inventar in BottomNav)
```

### AC10: External Links bleiben funktional
```
GIVEN: AchievementUnlockModal triggered
WHEN: User klickt CTA
THEN: Navigiert zu /missions (nicht /profile?tab=overview)
GIVEN: User klickt eine Profile-Avatar-Verlinkung in Community
THEN: Navigiert zu /profile/[handle] (Public Profile bleibt funktional)
```

---

## SPEC GATE Checklist

- [x] Current State komplett (34 Features nummeriert)
- [x] Migration Map fuer JEDES Feature ausgefuellt (34/34)
- [x] Blast Radius fuer jede Aenderung gegreppt (7 Changes)
- [x] Pre-Mortem mit 10 Szenarien
- [x] Invarianten + Constraints definiert
- [x] Akzeptanzkriterien fuer 10 betroffene User-Flows
- [x] **Anil hat die Spec reviewed und abgenommen** (2026-04-07)

---

# PHASE 2: PLAN

## 2.1 Wave Design

5 Waves. Max 10 Files/Wave. Move + Delete im gleichen Commit.

| Wave | Zweck | Files | Depends on |
|------|-------|-------|-----------|
| **W1** | Profile entladen (Wildcards + Achievements raus) | 5 | — |
| **W2** | `/inventory` Page bauen | 9 | — (parallel moeglich zu W1) |
| **W3** | `/missions` Progress-Hub umbauen | 6 | W1 (Achievements verschoben) |
| **W4** | Home entladen + Quick Actions erweitern | 4 | W2 (Inventory existiert) |
| **W5** | Cleanup + Verify | 4 | W1-W4 |

**Total: ~28 Files** ueber 5 Waves.

---

## 2.2 Tasks

### Wave 1 — Profile entladen

**Ziel:** Wildcards Section + Achievements Tab aus Profile raus. ProfileView hat am Ende 4 Tabs.

#### Task 1.1 — Wildcards aus TraderTab entfernen

**Files:**
- MODIFY: `src/components/profile/TraderTab.tsx`

**Steps:**
1. Remove import `useWildcardBalance` (Z. 13)
2. Remove import `Sparkles` (nur fuer Wildcards genutzt) — pruefen ob noch woanders benoetigt
3. Remove `WildCardsSection` function (Z. 350-372)
4. Remove `<WildCardsSection userId={userId} />` aus dem Render-Tree (suchen)
5. Verify: `npx tsc --noEmit`
6. Verify: `npx vitest run src/components/profile/__tests__/TraderTab.test.tsx` (falls existiert)

**DONE means:**
- [ ] `grep "WildCardsSection" src/components/profile/TraderTab.tsx` → 0 Treffer
- [ ] `grep "useWildcardBalance" src/components/profile/TraderTab.tsx` → 0 Treffer
- [ ] tsc 0 errors
- [ ] Tests gruen (Profile/Trader)

#### Task 1.2 — AchievementsSection aus ProfileView entfernen

**Files:**
- MODIFY: `src/components/profile/ProfileView.tsx`
- MODIFY: `src/components/profile/hooks.ts` (oder `useProfileData.ts`) — `unlockedAchievements` State entfernen

**Steps:**
1. Remove `const AchievementsSection = dynamic(...)` (Z. 23)
2. Remove `{ id: 'achievements' as const, label: t('tabAchievements') }` aus `tabDefs` (Z. 60)
3. Remove `<TabPanel id="achievements">` Block (Z. 179-184)
4. Remove `unlockedAchievements` destructure from `useProfileData`
5. Remove `unlockedAchievements` state + fetch from `useProfileData` hook
6. Verify: `npx tsc --noEmit`
7. Verify: `npx vitest run src/components/profile/__tests__/ProfileView.test.tsx`

**DONE means:**
- [ ] Profile zeigt 4 Tabs (3 Dim + Timeline)
- [ ] AchievementsSection import in ProfileView.tsx: 0
- [ ] tsc 0 errors
- [ ] Profile Test gruen

#### Task 1.3 — ProfileView Tests updaten

**Files:**
- MODIFY: `src/components/profile/__tests__/ProfileView.test.tsx`

**Steps:**
1. Remove alle `achievements` Tab-Assertions
2. Verify: `npx vitest run src/components/profile/__tests__/ProfileView.test.tsx`

**DONE means:**
- [ ] Test gruen
- [ ] Kein Verweis auf `achievements` Tab in Profile-Tests

---

### Wave 2 — `/inventory` Page bauen

**Ziel:** Standalone `/inventory` Page mit 4 Sektionen + Navigation-Eintrag.

#### Task 2.1 — Navigation erweitern

**Files:**
- MODIFY: `src/lib/nav.ts`
- MODIFY: `messages/de.json` — add `nav.inventory = "Inventar"`
- MODIFY: `messages/tr.json` — add `nav.inventory = "Envanter"`

**Steps:**
1. In `NAV_MAIN` neuer Eintrag nach `missions`: `{ label: 'inventory', href: '/inventory', icon: Package }`
2. Import `Package` von lucide-react
3. i18n Keys hinzufuegen (DE + TR)
4. Verify: `npx tsc --noEmit`

**DONE means:**
- [ ] SideNav zeigt "Inventar" zwischen "Missions" und "Club"
- [ ] Mobile Bottom-Nav unveraendert (5 Items)
- [ ] tsc 0 errors

#### Task 2.2 — `/inventory` Page Route

**Files:**
- CREATE: `src/app/(app)/inventory/page.tsx`
- MODIFY: `messages/de.json`, `messages/tr.json` — `inventory.*` keys

**Steps:**
1. Create client component mit Package icon + h1
2. 4 Tabs via TabBar: Equipment / Cosmetics / Wildcards / Mystery Box
3. `useSearchParams` fuer `?tab=equipment` Deep-Link Support
4. Dynamic imports fuer 4 Sections (SSR false, loading skeleton)
5. i18n Keys: `inventory.pageTitle`, `inventory.pageSubtitle`, `inventory.tabEquipment`, `inventory.tabCosmetics`, `inventory.tabWildcards`, `inventory.tabHistory`
6. Verify: `npx tsc --noEmit`
7. Smoke: `localhost:3000/inventory` rendert ohne Errors

**DONE means:**
- [ ] Page rendert mit 4 Tabs
- [ ] Deep-Link `?tab=cosmetics` funktioniert
- [ ] tsc 0 errors

#### Task 2.3 — EquipmentSection Component

**Files:**
- CREATE: `src/components/inventory/EquipmentSection.tsx`

**Steps:**
1. Nutze `useUserEquipment(uid)` + `useEquipmentDefinitions()` + `useEquipmentRanks()`
2. Gruppiere Items nach `equipment_key + rank` (wie EquipmentPicker Z. 92-108)
3. Grid Layout (2 cols mobile, 3-4 cols desktop)
4. Card pro Item: Icon + Name + Position-Badge + Rank-Badge + Multiplier + Stack-Count + "Equipped" Badge (wenn `equipped_event_id` gesetzt)
5. Empty State: "Oeffne Mystery Boxes um Equipment zu sammeln" + CTA-Button → `/missions`
6. Position-Farben aus `EQUIPMENT_POSITION_COLORS` (bestehend in rarityConfig.ts)
7. Icons aus `EQUIPMENT_ICONS` (bestehend in EquipmentPicker.tsx) — oder duplizieren/extrahieren
8. i18n Keys: `inventory.equipment.*`

**DONE means:**
- [ ] Section rendert User-Equipment als Grid
- [ ] Empty State funktioniert
- [ ] Stack-Count + Equipped-Badge korrekt
- [ ] tsc 0 errors

#### Task 2.4 — CosmeticsSection Component

**Files:**
- CREATE: `src/components/inventory/CosmeticsSection.tsx`

**Steps:**
1. Nutze `useUserCosmetics(uid)` + `useEquippedCosmetics(uid)`
2. Gruppiere nach `category` (Avatar / Frame / Banner / Title)
3. Grid pro Kategorie mit Section-Header
4. Card pro Item: Preview + Name + Rarity-Badge + "Equipped" Badge
5. Empty State: "Schliesse Achievements ab oder oeffne Mystery Boxes"
6. i18n Keys: `inventory.cosmetics.*`

**DONE means:**
- [ ] Section rendert User-Cosmetics grouped by category
- [ ] Equipped-State korrekt angezeigt
- [ ] tsc 0 errors

#### Task 2.5 — WildcardsSection Component

**Files:**
- CREATE: `src/components/inventory/WildcardsSection.tsx`

**Steps:**
1. Nutze `useWildcardBalance(uid)` (import aus `@/features/fantasy/queries/events` oder `@/lib/queries/events`)
2. Zeige Balance-Karte mit Icon, Zahl, Erklaerung
3. "Use in Fantasy" CTA-Button → `/fantasy`
4. Empty State wenn Balance 0: "Du hast noch keine Wildcards"
5. i18n Keys: `inventory.wildcards.*`

**DONE means:**
- [ ] Balance korrekt angezeigt
- [ ] CTA funktioniert
- [ ] Empty State bei 0
- [ ] tsc 0 errors

#### Task 2.6 — MysteryBoxHistorySection Component

**Files:**
- CREATE: `src/components/inventory/MysteryBoxHistorySection.tsx`
- MODIFY: `src/lib/queries/mysteryBox.ts` — neuer Hook `useMysteryBoxHistory(uid, limit)`

**Steps:**
1. Pruefen: `getMysteryBoxHistory` Service existiert (in `lib/services/mysteryBox.ts`)
2. Add Hook `useMysteryBoxHistory(userId, limit = 20)` mit `staleTime: 30s`
3. Component: Timeline Liste, neueste oben
4. Jeder Eintrag: Rarity-Badge (farbig), Reward-Type Icon, Value-Display (Tickets / Equipment Name + Rank / bCredits / Cosmetic), `opened_at` formatted date
5. Empty State: "Oeffne deine erste Mystery Box"
6. i18n Keys: `inventory.history.*`

**DONE means:**
- [ ] Letzte 20 Drops angezeigt
- [ ] Alle 4 Reward-Types korrekt gerendert (tickets / equipment / bcredits / cosmetic)
- [ ] Empty State bei 0
- [ ] tsc 0 errors

---

### Wave 3 — `/missions` Progress-Hub

**Ziel:** Achievements von Profile importieren, Streak Banner von Home importieren, /missions wird zentrale Progress-Seite.

**Dependency:** W1 muss committet sein (Achievements wurde aus Profile entfernt).

#### Task 3.1 — AchievementsSection nach /components/missions verschieben

**Files:**
- MOVE: `src/components/profile/AchievementsSection.tsx` → `src/components/missions/AchievementsSection.tsx`
- MODIFY: Interne Imports bleiben wie sie sind (nutzt `@/lib/achievements`, `@/components/profile/ScoreProgress`)
- **KEEP:** `ScoreProgress` bleibt unter `components/profile/` — wird von AchievementsSection weiterhin importiert (kein zirkulaerer Import)

**Steps:**
1. `git mv` File von profile nach missions
2. Pruefen: `import ScoreProgress from '@/components/profile/ScoreProgress'` bleibt gueltig
3. Verify: `npx tsc --noEmit`

**DONE means:**
- [ ] File liegt unter `components/missions/AchievementsSection.tsx`
- [ ] tsc 0 errors
- [ ] Kein import aus alter Location

#### Task 3.2 — StreakMilestoneBanner nach /components/missions verschieben

**Files:**
- MOVE: `src/components/home/StreakMilestoneBanner.tsx` → `src/components/missions/StreakMilestoneBanner.tsx`

**Steps:**
1. `git mv`
2. Pruefen ob Home-spezifische Imports drin sind (falls ja, extract)
3. Verify: `npx tsc --noEmit`

**DONE means:**
- [ ] File verschoben
- [ ] Kein Home-spezifischer Import
- [ ] tsc 0 errors

#### Task 3.3 — Missions Page Layout erweitern

**Files:**
- MODIFY: `src/app/(app)/missions/page.tsx`

**Steps:**
1. Add import `AchievementsSection` from `@/components/missions/AchievementsSection` (dynamic)
2. Add import `StreakMilestoneBanner` from `@/components/missions/StreakMilestoneBanner` (dynamic)
3. Fetch `unlockedAchievements` + `userStats` (bisher in useProfileData) — neuer local state oder nutze `useUserStats(uid)` + `useUnlockedAchievements(uid)` (pruefen ob Hook existiert)
4. Fetch `retention.streakMilestone` — pruefen wie Home das macht (useRetentionEngine?)
5. Render-Order:
   ```
   1. Streak Banner + Benefits (bestehend)
   2. StreakMilestoneBanner (NEU, wenn vorhanden)
   3. DailyChallengeCard (bestehend)
   4. MissionBanner (bestehend)
   5. ScoreRoadCard (bestehend)
   6. AchievementsSection (NEU)
   ```
6. Verify: `npx tsc --noEmit`
7. Smoke: `/missions` rendert alle 6 Sections

**DONE means:**
- [ ] Missions Page zeigt 6 Sections
- [ ] Achievements claimable
- [ ] tsc 0 errors

#### Task 3.4 — AchievementUnlockModal Link updaten

**Files:**
- MODIFY: `src/components/gamification/AchievementUnlockModal.tsx` (Z. 56)

**Steps:**
1. Change `href="/profile?tab=overview"` → `href="/missions"`
2. Verify: `npx tsc --noEmit`

**DONE means:**
- [ ] Link zeigt auf /missions
- [ ] tsc 0 errors

#### Task 3.5 — Missions Tests updaten (wenn vorhanden)

**Files:**
- MODIFY: `src/app/(app)/missions/__tests__/*.tsx` (falls existiert)

**Steps:**
1. Pruefen ob Tests fuer `/missions` existieren
2. Wenn ja: Assertions fuer AchievementsSection + StreakMilestoneBanner hinzufuegen
3. Verify: `npx vitest run`

**DONE means:**
- [ ] Tests gruen (falls vorhanden)

---

### Wave 4 — Home entladen + Quick Actions erweitern

**Ziel:** Daily Challenge + Score Road Strip + Streak Banner aus Home raus. Quick Actions Bar bekommt Inventar-Link.

**Dependency:** W2 muss committet sein (Inventory existiert als Link-Target).

#### Task 4.1 — Home Page Imports + Renders aufraeumen

**Files:**
- MODIFY: `src/app/(app)/page.tsx`

**Steps:**
1. Remove dynamic imports:
   - `DailyChallengeCard` (Z. 33-36)
   - `ScoreRoadStrip` (Z. 38-41)
   - `StreakMilestoneBanner` (Z. 44)
2. Remove Renders:
   - DailyChallengeCard Block (Z. 392-405)
   - ScoreRoadStrip Block (Z. 422-423)
   - StreakMilestoneBanner Block (Z. 425-428)
3. Quick Actions Array (Z. 130-148): Eintrag `Missions` bleibt, neuer Eintrag `Inventar` hinzufuegen mit Icon `Package`, Farbe `text-emerald-400`, `bg-emerald-500/10 border-emerald-400/20`
4. Verify: `npx tsc --noEmit`

**DONE means:**
- [ ] Home zeigt keine Daily Challenge, kein Score Road Strip, kein Streak Milestone Banner
- [ ] Quick Actions hat 5 Buttons (Buy, Fantasy, Missions, Inventar, Community)
- [ ] tsc 0 errors

#### Task 4.2 — useHomeData aufraeumen

**Files:**
- MODIFY: `src/app/(app)/hooks/useHomeData.ts`

**Steps:**
1. Remove state + hooks die nur von entfernten Sections genutzt werden:
   - `todaysChallenge`, `todaysAnswer`, `challengeLoading` (Daily Challenge)
   - `handleChallengeSubmit`, `isSubmitting` (Daily Challenge)
2. **BEHALTEN:**
   - `retention.streakMilestone` — wird nun nur noch in /missions benoetigt, Home holt es nicht mehr
3. Remove `useTodaysChallenge` + `useChallengeHistory` imports (wenn nur hier genutzt)
4. Verify: `npx tsc --noEmit`
5. Verify: `npx vitest run src/app/(app)/hooks/__tests__/useHomeData.test.ts`

**DONE means:**
- [ ] useHomeData return-object ist schlanker
- [ ] Keine Daily Challenge State mehr
- [ ] tsc 0 errors
- [ ] Tests gruen

#### Task 4.3 — Mystery Box Modal Reveal Link erweitern

**Files:**
- MODIFY: `src/components/gamification/MysteryBoxModal.tsx`

**Steps:**
1. Pruefen: Gibt es nach Reveal einen "Schauen" oder "Weiter" Button?
2. Wenn ja: Button "Im Inventar ansehen" hinzufuegen → Link zu `/inventory?tab=equipment` (wenn Equipment-Drop) oder `/inventory?tab=history` (fuer andere)
3. Verify: `npx tsc --noEmit`

**DONE means:**
- [ ] Reveal zeigt Link zu /inventory
- [ ] Link-Ziel haengt von Reward-Type ab (equipment → equipment tab)
- [ ] tsc 0 errors

---

### Wave 5 — Cleanup + Final Verify

**Ziel:** Alte Files loeschen (nur wenn Grep 0 Treffer), finales Integrationstesting.

#### Task 5.1 — ScoreRoadStrip loeschen

**Files:**
- DELETE: `src/components/gamification/ScoreRoadStrip.tsx`

**Steps:**
1. Final Grep: `grep -r "ScoreRoadStrip" src/` → muss 0 sein
2. Wenn 0 → DELETE
3. Verify: `npx tsc --noEmit`

**DONE means:**
- [ ] File geloescht
- [ ] 0 Grep-Treffer
- [ ] tsc 0 errors

#### Task 5.2 — Alte AchievementsSection + StreakMilestoneBanner Paths checken

**Steps:**
1. Grep: `grep -r "components/profile/AchievementsSection" src/` → muss 0 sein
2. Grep: `grep -r "components/home/StreakMilestoneBanner" src/` → muss 0 sein
3. Wenn 0 → (files wurden bereits per `git mv` verschoben, keine DELETE noetig)

**DONE means:**
- [ ] 0 Grep-Treffer auf alte Paths

#### Task 5.3 — Full Integration Smoke Test

**Steps:**
1. `npx tsc --noEmit` — clean
2. `npx vitest run` — alle Tests gruen
3. Manueller Smoke-Test (mit jarvis-qa@bescout.net):
   - [ ] Home oeffnen: kein Daily Challenge, kein Score Road Strip, kein Streak Banner, Quick Actions hat 5 Buttons
   - [ ] `/inventory` oeffnen: 4 Tabs, jeder Tab rendert (mit oder ohne Daten)
   - [ ] `/missions` oeffnen: Streak Banner + Daily Challenge + Missions + Score Road + Achievements
   - [ ] `/profile` oeffnen: 4 Tabs (Manager/Trader/Analyst/Timeline), kein Achievements Tab, kein Wildcards in Trader Tab
   - [ ] Achievement Unlock Modal triggern (wenn moeglich) → Link geht zu /missions
   - [ ] Mystery Box oeffnen → "Im Inventar ansehen" Button sichtbar → funktioniert

#### Task 5.4 — SideNav Counter (optional)

**Files:**
- MODIFY: `src/components/layout/SideNav.tsx`

**Steps:**
1. Optional: Badge am Inventar-Link mit Item-Counter (`useUserEquipment` length + `useUserCosmetics` length)
2. Nur wenn > 0 anzeigen
3. Verify: `npx tsc --noEmit`

**DONE means:**
- [ ] Badge zeigt Counter (optional)
- [ ] tsc 0 errors

---

## 2.3 Agent-Dispatch Regeln

| Task | Agent? | Begruendung |
|------|--------|-------------|
| 1.1 Wildcards Remove | **selbst** | Destructive Change, Risiko fuer TraderTab Tests |
| 1.2 Achievements Remove | **selbst** | Aendert Tab-Struktur, Data-Flow |
| 1.3 Profile Tests | **selbst** | klein |
| 2.1 Nav | **selbst** | klein, 3 Files |
| 2.2 Inventory Page | `frontend` agent | klar definiert, isolierte Datei |
| 2.3 EquipmentSection | `frontend` agent | klare Props, einfaches UI |
| 2.4 CosmeticsSection | `frontend` agent | klar definiert |
| 2.5 WildcardsSection | `frontend` agent | trivial |
| 2.6 MB History Section | `frontend` agent | klar definiert, braucht Hook-Extension |
| 3.1 Move Achievements | **selbst** | `git mv`, kein Build-Work |
| 3.2 Move Streak Banner | **selbst** | `git mv` |
| 3.3 Missions Layout | **selbst** | Integration-Task, komplex |
| 3.4 Link Update | **selbst** | trivial |
| 4.1 Home Cleanup | **selbst** | Destructive, Dependencies |
| 4.2 useHomeData Cleanup | **selbst** | State + Test Update |
| 4.3 MB Modal Link | **selbst** | trivial |
| 5.x Cleanup | **selbst** | Verification nur |

**Optional:** Wave 2 (Sections) koennte komplett parallel an `frontend` Agent gehen, wenn Zeit drueckt. Alle anderen Waves mache ich selbst.

---

## PLAN GATE Checklist

- [x] Jede Wave ist eigenstaendig shippbar
- [x] Max 10 Files pro Wave (max 9 in W2)
- [x] Move und Change in getrennten Waves (W1 remove, W3 import move)
- [x] Jeder Task hat "DONE means" Checkliste
- [x] Agent-Tasks sind vollstaendig spezifiziert
- [ ] **Anil hat den Plan reviewed** ← jetzt

---

**Naechster Schritt:** Anil reviewt den Plan → wenn approved → Phase 3 (EXECUTE) Wave 1 startet.
