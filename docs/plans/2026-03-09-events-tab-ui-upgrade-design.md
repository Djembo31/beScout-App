# Fantasy Events Tab — Professional UI Upgrade

> Date: 2026-03-09
> Status: Approved
> Competitor Research: PokerStars, Sorare, DraftKings/FanDuel, EA FC UT

---

## Ziel

Events Tab auf das Qualitaetslevel des FixtureDetailModal bringen. Card/Row-Toggle, Fill-Bars, Urgency-Timer, Requirement-Badges, Premium-CTA. Mobile-First, 360px min.

## Bestehende Struktur (IST)

```
EventsTab.tsx (44Z) → 3 Zonen:
├── EventPulse (59Z) — 4-Stat Grid (Total, Open, LIVE, Joined)
├── EventSpotlight (115Z) — Horizontal scroll 200px cards (LIVE + Late-Reg)
└── EventBrowser (159Z) — Category pills + status-grouped EventCompactRows
    └── EventCompactRow (80Z) — Kompakte Zeile mit Type-Icon, Name, Meta

EventCard.tsx (179Z) — Existiert, wird NICHT genutzt
EventTableRow.tsx (103Z) — Existiert, wird NICHT genutzt
```

## Design (SOLL)

### 1. Card/Row Toggle

- **Mobile Default:** Card View (bessere Touch-Targets, engagement)
- **Desktop Default:** Row View (Information Density, Power-User)
- Toggle: `LayoutGrid` / `List` Icons, rechts neben Category-Pills
- Persistenz: `localStorage('bescout-events-view')`
- Typ: `ViewMode` existiert bereits in `types.ts` als `'cards' | 'table'`

### 2. EventCardView (NEU — ersetzt altes EventCard.tsx)

```
+------------------------------------------+
| [Type Badge + Tier]      [Urgency Timer] |
|                                          |
| EVENT NAME (font-black, line-clamp-2)    |
| Spieltag 15 · 6er · League              |
|                                          |
| [Requirement Chips — wenn vorhanden]     |
| 🔒 Gold+  ⚽ Min 3 DPC  📊 Level 5     |
|                                          |
| [Entry]    [Prize]     [Participants]    |
| GRATIS     500 $SCOUT  234 / 500        |
|                                          |
| [████████████████░░░░] 78%              |
|                                          |
| [     LINEUP ERSTELLEN (gold CTA)    ]  |
+------------------------------------------+
```

**Elemente (Prioritaet):**

1. **Header Row:** Type-Icon (links) + Tier-Badge (arena/club) + Urgency-Timer (rechts)
2. **Name:** `font-black text-sm line-clamp-2`
3. **Meta:** Format + Mode + League/Club (1 Zeile, `text-xs text-white/40`)
4. **Requirements Chips** (conditional, nur wenn Event Requirements hat)
5. **Stats Grid:** 3-col — Entry | Prize Pool | Fill (participants/max)
6. **Fill Bar:** Visueller Fortschritt (green → amber >80% → red >95%)
7. **CTA Button:** Full-width, gold gradient fuer Open, outline fuer Joined

**Fill Bar Colors (DraftKings-inspiriert):**
- 0-79%: `bg-green-500` (normal)
- 80-94%: `bg-amber-500` (filling up)
- 95-100%: `bg-red-500` (almost full / full)
- `maxParticipants === null`: Kein Fill-Bar, stattdessen Participant-Count

**Urgency Timer Colors (PokerStars-inspiriert):**
- > 24h: `text-white/40` (ruhig)
- 6-24h: `text-white/60` (normaler Countdown)
- 1-6h: `text-amber-400` (Achtung)
- < 1h: `text-red-400 animate-pulse` (Letzte Chance)
- `ended`: `text-white/25` "Beendet"

**Joined State:**
- Card border: `border-green-500/20`
- Subtle bg: `bg-green-500/[0.02]`
- CTA: Outline green mit "Lineup bearbeiten" oder "Ergebnisse"

### 3. Event Requirements Display

Events koennen Requirements haben (aus `FantasyEvent.requirements`):

```typescript
requirements: {
  dpcPerSlot?: number;      // Min DPC pro aufgestelltem Spieler
  minDpc?: number;          // Min DPC Gesamtbesitz
  minClubPlayers?: number;  // Min Spieler von einem Verein (Vereinswettbewerbe)
  minScoutLevel?: number;   // Min User-Level
  specificClub?: string;    // Nur Spieler dieses Vereins erlaubt
};
// Zusaetzlich bestehende Felder:
minSubscriptionTier?: string; // Club-Mitgliedschaft (bronze/silber/gold)
leagueId?: string;           // Nur Spieler dieser Liga
```

**Darstellung als Requirement Chips:**
- Kompakte Chips unterhalb des Event-Namens
- Nur anzeigen wenn mindestens 1 Requirement vorhanden
- Max 1 Zeile, overflow → `+N mehr` Chip (Tooltip/Popover bei Click)
- Chip-Style: `bg-white/[0.06] border border-white/[0.08] rounded-md px-1.5 py-0.5 text-xs`

**Chip-Mapping:**

| Requirement | Icon | Label | Farbe |
|------------|------|-------|-------|
| `minSubscriptionTier` | Lock | "Gold+", "Silber+" | Gold/Silber/Bronze Akzent |
| `minScoutLevel` | TrendingUp | "Level 5+" | `text-purple-400` |
| `dpcPerSlot` | Layers | "Min 3 DPC/Slot" | `text-sky-400` |
| `minDpc` | Wallet | "Min 50 DPC" | `text-sky-400` |
| `minClubPlayers` | Users | "Min 5 von Club" | `text-green-400` |
| `specificClub` | Building2 | Club-Name | `text-green-400` |
| `leagueId` | Globe | Liga-Name | `text-amber-400` |

**CompactRow:** Requirements als einzelne Icons (ohne Text) am rechten Rand, vor dem Chevron.

### 4. Enhanced EventCompactRow

Bestehende CompactRow verbessern (NICHT ersetzen):

```
| [Type] | Name + Meta         | [Req Icons] [Fill] [Status] > |
|  Icon  | Spieltag 15 · 6er   | 🔒 ⚽      ██░ 78% | LIVE > |
```

- **Mini Fill-Bar:** 40px breit, 3px hoch, gleiche Farblogik wie Card
- **Requirement Icons:** Nur Icons (kein Text), max 3, bei >3 ein `+N` Badge
- **Timer:** Ersetzt bisherigen `formatCountdown` mit Urgency-Farben
- **Left border:** Beibehalten (Type-Color), aber sauberer via CSS class statt inline

### 5. Enhanced EventSpotlight

- Karten-Breite: 200px → 260px (mehr Inhalt)
- Fill-Bar hinzufuegen (mini, 2px)
- Urgency-Timer mit Farbe
- Requirement-Icons (max 2) in der Karte
- Wenn Joined: gruener Border-Accent

### 6. EventPulse (minimal)

Bleibt wie es ist — funktioniert gut. Einzige Aenderung:
- Requirement-gefiltert: Zeige `eligible` Count (Events wo User alle Requirements erfuellt)

### 7. Category Pills Enhancement

Bestehende Pills beibehalten, erweitern um:
- **"Fuer mich" Pill** (erster nach "Alle"): Filtert nur Events wo User alle Requirements erfuellt
- Icon: `CheckCircle2`, Farbe: `text-green-500`

---

## Betroffene Files

### Neu
- `src/components/fantasy/events/EventCardView.tsx` — Neue Premium-Card
- `src/components/fantasy/events/RequirementChips.tsx` — Shared Requirement-Display
- `src/components/fantasy/events/FillBar.tsx` — Shared Fill-Bar Component
- `src/components/fantasy/events/UrgencyTimer.tsx` — Timer mit Farblogik

### Geaendert
- `src/components/fantasy/events/EventBrowser.tsx` — Card/Row Toggle + "Fuer mich" Filter
- `src/components/fantasy/events/EventCompactRow.tsx` — Mini Fill-Bar + Req Icons + Urgency
- `src/components/fantasy/events/EventSpotlight.tsx` — Breitere Karten + Fill + Urgency + Reqs
- `src/components/fantasy/events/EventPulse.tsx` — Eligible Count
- `src/components/fantasy/EventsTab.tsx` — ViewMode State durchreichen
- `messages/de.json` — ~15-20 neue Keys
- `messages/tr.json` — ~15-20 neue Keys

### Loeschen
- `src/components/fantasy/EventCard.tsx` — Ersetzt durch EventCardView
- `src/components/fantasy/EventTableRow.tsx` — Ersetzt durch enhanced CompactRow

---

## Nicht im Scope

- Paid Events (Phase 3/4 — CASP/MGA)
- Event-Favoriten/Pinning (EA FC Pattern — Backlog)
- Division System (Sorare Pattern — Backlog)
- Real-time Fill Updates via Realtime (Overkill fuer Pilot)
- Sort-Optionen (spaeter wenn >20 Events)
- Neue DB-Aenderungen (Requirements-Felder existieren bereits)

---

## Design-Entscheidungen

| Entscheidung | Gewaehlt | Alternative | Grund |
|-------------|----------|-------------|-------|
| Card default mobile | Card | Row | Engagement + Touch (Sorare/EA FC) |
| Row default desktop | Row | Card | Information Density (PokerStars/DK) |
| Fill Bar | DraftKings-Style | Nur Text | Visuell sofort erfassbar |
| Urgency Timer | 4-Tier Farben | Nur Countdown | PokerStars Late-Reg ist effektiv |
| Requirements | Chips auf Card, Icons auf Row | Eigene Sektion | Scanbar, nicht ueberladen |
| "Fuer mich" Filter | Pill | Eigener Tab | Leichtgewichtig, keine Route |

---

## Referenzen

- Competitor Research: `.claude/research/event-lobby-ui-patterns-intel.md`
- FixtureDetailModal (Qualitaets-Referenz): `spieltag/FixtureDetailModal.tsx`
- Design System: `CLAUDE.md` → Design System Sektion
- ADR-041: Full-Screen Modal
