# Club-Seite als Storefront — Design

> Date: 2026-03-10
> Status: Approved
> Ansatz: B — 3-Tab mit Rich Overview (Landing Page)

---

## Vision

Die Club-Seite wird zur **Verkaufsplattform** fuer den Verein. Clubs nutzen BeScout wie Amazon — sie praesentieren ihre Spieler, verkaufen Abos, foerdern Fans durch Wettbewerbe, sammeln Meinungen durch Votes, und belohnen ihre Scouts. Fans fuehlen sich gehoert, haben eine Rolle als externe Scouts, und werden belohnt.

**Admin ist separat** (`/club/[slug]/admin`). Die Fan-Seite ist 100% Schaufenster.

## Business-Ziele pro Sektion

| Sektion | Club verdient durch | Fan bekommt |
|---------|-------------------|-------------|
| Aktive Angebote | DPC-Verkauf (IPO) | Spieler-Beteiligung |
| Kader-Preview | Kaufanreiz + Sammel-Trieb | Collection Progress |
| Mitmachen | Votes ($SCOUT) + Scouting-Zuarbeit | Gehoert werden + $SCOUT Rewards |
| Events | Fan-Engagement | Wettbewerb + Preise |
| Mitgliedschaft | Abo-Revenue | Early Access + Rabatte |
| Aktivitaet | Social Proof → mehr Kaeufer | FOMO + Zugehoerigkeit |

## Tabs

| Tab | Inhalt | Ziel |
|-----|--------|------|
| **Uebersicht** | Landing Page mit allen Sektionen | Verkaufen + Engagen |
| **Kader** | Spieler-Katalog mit Kauf-Flow | Spieler verkaufen |
| **Spielplan** | Fixtures + Ergebnisse | Information |

---

## Tab 1: Uebersicht (Landing Page)

### 1.1 Hero Banner

```
Stadium-Bild full-bleed + Club-Farb-Gradient
Logo (80px) + Name (UPPERCASE) + Liga + Stadt + Verifiziert-Badge
2 CTAs: Follow-Button + Abo-Badge
4 Stats: Scouts | 24h Volume | Spieler | Spieler kaufbar
```

Aenderungen vs aktuell:
- "Spieler kaufbar" als neue Metrik (Anzahl kaufbarer Spieler statt DPC-Float)
- Abo-CTA neben Follow
- Verifiziert-Badge prominenter (Trust-Signal)
- Club-Farb-Gradient staerker

### 1.2 Aktive Angebote

```
"Jetzt verfuegbar" Header
Horizontal scroll von IPO-Cards:
- Spieler-Foto + Name + Position
- Preis + Fill-Bar (verkauft/total)
- Countdown (Urgency-Timer)
- "Kaufen" Gold-CTA
Nur sichtbar wenn aktive IPOs vorhanden.
```

Daten: `activeIpos` + `players` (beides existiert via Market-Services)

### 1.3 Kader-Preview

```
Top 5 Trending Spieler (nach 24h Price Change)
Collection Badge: "Du besitzt 3 von 28 Spielern"
→ "Alle Spieler" Link zum Kader-Tab
```

Daten: `usePlayersByClub(slug)` + `useHoldings(userId)` — beides existiert

### 1.4 Mitmachen (Votes + Bounties + Scouting)

```
Scout-Profil Card:
- Scout-Rang + Analyst-Score + Report-Count
- Verdiente $SCOUT + Percentile

Offene Auftraege (Bounties, max 3):
- BountyCard (existiert) club-gefiltert
- Reward prominent

Abstimmungen (Votes + Polls, max 2):
- CommunityVoteCard / CommunityPollCard (existieren)
- Club-gefiltert

Top Scouts Leaderboard (Top 3):
- useTopScouts(clubId) — existiert
```

Reuse bestehender Components:
- `CommunityVoteCard` → existiert
- `CommunityPollCard` → existiert
- `BountyCard` → existiert
- `useTopScouts(clubId)` → existiert
- `getScoutingStatsForUser(userId)` → existiert
- `useActiveBounties(clubId)` → existiert
- `useClubVotes(clubId)` → existiert
- `useCommunityPolls(clubId)` → existiert

### 1.5 Wettbewerbe & Events

```
Naechste 2-3 offene Club-Events
EventCardView (aus Events-Tab Upgrade) reused
Club-gefiltert (event.clubId === club.id)
```

Reuse: `EventCardView` (gerade gebaut)

### 1.6 Mitgliedschaft

```
Tier-Vergleich: Bronze (500) | Silber (1.500) | Gold (3.000)
Benefits pro Tier mit Checkmarks
Aktueller Tier hervorgehoben wenn Mitglied
"Jetzt Mitglied werden" Gold-CTA / "Upgrade" wenn Bronze
```

Daten: `TIER_CONFIG` existiert in `clubSubscriptions.ts`, `useClubSubscription(userId, clubId)` existiert

### 1.7 Letzte Aktivitaet

```
Recent Trades: "ScoutKing92 hat Müller gekauft" (max 5)
Neue Follower: "+12 Scouts diese Woche"
Social Proof Feed
```

Daten: Trades via `activity_log` oder `trades` table, club-gefiltert

---

## Tab 2: Kader (Spieler-Katalog)

### Collection Progress

```
Fortschrittsbalken: "3 von 28 Spielern"
"Vervollstaendige deine Sammlung"
```

### 3 View-Modi

| Modus | Default | Inhalt pro Spieler |
|-------|---------|-------------------|
| **Kompakt** | Mobile | Foto + Name + Pos + L5 + Preis + Pfeil |
| **Detail** | Desktop | + Rating + Spiele + Stats + Trend + Kauf-CTA |
| **Karten** | Toggle | Card-Grid mit Foto + Stats + Kauf-Button |

View-Toggle: localStorage (`bescout-squad-view`)

### Position-Gruppen

GK → DEF → MID → ATT, jeweils collapsible mit Count.
Positions-Farben: GK=emerald, DEF=amber, MID=sky, ATT=rose (existiert)

### Pro Spieler

- Foto (PlayerPhoto — existiert)
- Name + Position
- Floor Price / IPO-Preis (sichtbar!)
- L5 Performance Score
- 24h Trend (Pfeil + Prozent)
- Besitz-Badge ("Dein Spieler" wenn Holdings > 0)
- "Kaufen" CTA (fuehrt zum Player-Detail oder direkt IPO)

### Sort + Filter

- Sort: L5 Score | Preis | Name
- Filter: Position | Nur kaufbar | Nur meine
- Reuse: Position-Filter-Pills Pattern (wie ClubAccordion)

### Reuse

- `PlayerDisplay` (compact/card) — existiert, braucht Preis-Prop
- `PlayerPhoto` — existiert
- `PlayerKPIs` — existiert (8 Kontexte, braucht evtl. neuen "catalog" Kontext)
- `ClubAccordion` Filter-Logik — existiert, wird adaptiert

---

## Tab 3: Spielplan (minimal)

Bleibt wie er ist. Einzige Ergaenzung:
- Naechstes Spiel prominent oben mit Countdown
- FixtureDetailModal bei Klick (mobileFullScreen, existiert)

---

## Club Discovery `/clubs`

### Featured Club (Spotlight)

```
Full-width Banner fuer Club mit meisten aktiven IPOs
"12 Spieler verfuegbar · 3 IPOs aktiv"
[Entdecken] CTA
```

### Enhanced ClubCard

Bestehende ClubCard + zwei neue Signale:
- "X Spieler kaufbar" Count
- "IPO aktiv" Badge wenn laufende IPOs

### Filter + Sort

- Suche (existiert)
- Liga-Filter (existiert)
- Sort NEU: Beliebteste | Meiste Spieler | Aktive Angebote

### Layout

- "Deine Vereine" horizontal scroll (wenn Follower > 0)
- "Alle Vereine" Grid (1→2→3 col responsive)

---

## Betroffene Files

### Neu (Overview Sektionen)
- `src/components/club/sections/ActiveOffersSection.tsx`
- `src/components/club/sections/SquadPreviewSection.tsx`
- `src/components/club/sections/MitmachenSection.tsx`
- `src/components/club/sections/ClubEventsSection.tsx`
- `src/components/club/sections/MembershipSection.tsx`
- `src/components/club/sections/RecentActivitySection.tsx`
- `src/components/club/sections/CollectionProgress.tsx`
- `src/components/club/SquadCatalog.tsx` (Kader-Tab Rewrite)
- `src/components/club/FeaturedClubBanner.tsx`

### Stark geaendert
- `src/app/(app)/club/[slug]/ClubContent.tsx` (1683Z → Refactor in Sektionen)
- `src/app/(app)/clubs/page.tsx` (226Z → Featured Club + enhanced Cards)

### Leicht geaendert
- `src/components/club/ClubCard.tsx` (Market) — "Spieler kaufbar" Badge
- `messages/de.json` — ~30 neue Keys
- `messages/tr.json` — ~30 neue Keys

### Reuse (kein neuer Code)
- `CommunityVoteCard`, `CommunityPollCard`, `BountyCard`
- `EventCardView`, `FillBar`, `UrgencyTimer`
- `PlayerDisplay`, `PlayerPhoto`, `PlayerKPIs`
- `useTopScouts`, `useActiveBounties`, `useClubVotes`, `useCommunityPolls`
- `usePlayersByClub`, `useClubSubscription`, `getScoutingStatsForUser`

---

## Nicht im Scope

- Admin-Seite (separat, kein Redesign)
- Neues Scouting-System (existiert schon, wird nur surfaced)
- Kauf-Flow Redesign (nutzt existierenden Player-Detail / IPO-Flow)
- DB-Aenderungen (alle Daten existieren schon)
- Push Notifications fuer Club-Events
- Club-Forum / Chat

---

## Referenzen

- Competitor Research: `.claude/research/club-page-competitive-intel.md`
- Internal Analysis: Agent deep-dive (Session 214)
- Design System: `CLAUDE.md`
- Existing Components: `src/components/club/`, `src/components/community/`
