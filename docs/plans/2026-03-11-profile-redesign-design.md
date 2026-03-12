# Profile Redesign — Design Document

> **Expert Team:** Engineering, Data Layer, UX, Product Manager, Soccer App Specialist
> **Datum:** 11.03.2026 (Session #225)

## Problem

Das Profil ist ein **Informations-Tsunami**: 1200px Hero auf Mobile, 13 Sektionen im Overview Tab, 5 Sidebar-Cards VOR dem Hauptinhalt (800px Scroll-Steuer), keine Engagement-Loops sichtbar (MissionBanner gebaut aber nie eingebunden), keine klare Identität ("bin ich Trader, Manager oder Analyst?"), Settings mischt 4 Concerns.

## Ziel

Profil wird von "retrospektiver Daten-Dump" zu "täglicher Engagement-Fläche" umgebaut:
- Header: 1200px → **~250px** auf Mobile
- Überblick: 13 → **5 Sektionen**
- Sidebar auf Mobile: **eliminiert**
- MissionBanner: **endlich sichtbar**
- Public Profiles: 2 → **4 Tabs**
- Settings: **eigene Route**

## Design-Referenz

- **Sorare:** Gallery-Owner Identity, Showcase-Konzept
- **FPL:** "Overall Rank #X" als primäre Identität, Saisonverlauf-Graph
- **Kickbase:** Portfolio als Squad, Liga-Tabellen-Ranking
- **FotMob:** Progressive Disclosure, Horizontal-Scroll Cards
- **Duolingo:** Streak als Retention-Mechanik, Missions sichtbar
- **PokerStars + Sorare:** BeScout Design-DNA (Dark + Gold)

---

## A. Header: Fan Identity Card (~250px Mobile)

### Vorher (1200px+)
Avatar (96px) + Name + Verified + Plan + Founding Pass + Handle + Portfolio Value (hero gold) + Bio + Top Post Card + RangBadge + FoundingScout + Followers/Following + Club + Abo + Member-since + DimensionRangStack + Scout Stats Row (reports, hit-rate, rating, bounties) + Action Buttons

### Nachher (~250px)

```
┌──────────────────────────────────────────────┐
│ [Avatar 48px]  Name [✓] [Plan]  [FoundPass]  │  48px
│                @handle · 234 Follower         │  20px
├──────────────────────────────────────────────┤
│  ▲ Trader      ▲ Manager     ▲ Analyst       │
│  Gold II       Silber I      Platin          │  72px
│  [====▲====]  [===▲=====]  [======▲===]     │
├──────────────────────────────────────────────┤
│ 🏆 #847        💰 12.4K bC    🔥 14 Tage    │  44px
│ Gesamtrang     Portfolio      Streak          │
├──────────────────────────────────────────────┤
│ [Folgen] [Teilen] / [Bearbeiten] [⚙️]        │  40px
└──────────────────────────────────────────────┘
Tab Bar: Überblick | Kader | Statistiken | Aktivität  44px
```

### Was RAUSFLIEGT aus Header
| Element | Wohin |
|---------|-------|
| Bio | Expandierbarer "Mehr anzeigen" Toggle unter Handle |
| Top Post | Statistiken Tab |
| DimensionRangStack | Ersetzt durch kompakte 3-Bars im Header selbst |
| Scout Stats Row (reports, hit-rate, etc.) | Statistiken Tab |
| Member-since | In expandierbarer Bio-Sektion |
| Club + Abo Badge | Bleibt, aber kompakter (neben Follower) |
| FoundingScoutBadge | Bleibt nur als kleines Icon neben RangBadge |

### Stats Ribbon (3 Kern-Metriken)
- **Gesamtrang** — `#847` (oder "—" wenn kein Rang). Das FPL-equivalent.
- **Portfolio** — `12.4K bC` (compact format). Fussball-Fans verstehen "Kaderwert".
- **Streak** — `🔥 14 Tage`. Duolingo-Mechanik. Daten aus `userStats`.

---

## B. Tab-Architektur

### Vorher
| Tab | Wer | Inhalt |
|-----|-----|--------|
| Overview | Alle | 13 Sektionen |
| Portfolio | Self | Holdings by Club |
| Activity | Alle | Flat Transaction List |
| Settings | Self | Profile + Account + Notifications + Danger Zone |

### Nachher
| Tab | Key | Wer | Zweck |
|-----|-----|-----|-------|
| **Überblick** | `overview` | Alle | Tägliche Engagement-Fläche |
| **Kader** | `squad` | Alle | Holdings + Mastery (öffentlich ohne Preise) |
| **Statistiken** | `stats` | Alle | Alle "Wie gut bin ich?"-Daten |
| **Aktivität** | `activity` | Alle | Transaction Feed MIT Filtern |

**Settings** → `/profile/settings` (eigene Route, ⚙️ Icon im Header)

### Neue ProfileTab Union Type
```typescript
type ProfileTab = 'overview' | 'squad' | 'stats' | 'activity';
// 'settings' entfällt als Tab, wird eigene Route
```

---

## C. Tab-Inhalte

### Überblick (5 Sektionen statt 13)

1. **Adaptive "Nächste Aktion" Card** — passt sich an User-State an:
   - 0 Holdings → "Scout deinen ersten Spieler" CTA
   - Offene Missionen → "2 Missionen offen — 500 bCredits warten"
   - Fantasy aktiv → "GW16 läuft — du bist #12"
   - Alles erledigt → "Score Road: noch 120 Punkte bis Gold I"

2. **MissionBanner** — `<MissionBanner />` (existiert, nie eingebunden)

3. **Portfolio Pulse** — eine Card: Kaderwert + 7-Tage-Veränderung + Top 3 Holdings kompakt

4. **Letzte Aktivität** — 5 Items kompakt (nicht der volle Feed), "Alle anzeigen" → Activity Tab

5. **Achievements Highlight** — 3 zuletzt freigeschaltete Badges. "Alle X Erfolge" → Stats Tab

### Kader (vorher: Portfolio, jetzt öffentlich)

1. **Kader-Header** — Kaderwert + P&L + Sort-Buttons (Wert/P&L/Position)
2. **Holdings by Club** — gruppiert, sortierbar, mit PlayerDisplay
3. **DPC Mastery** — Top 5 Mastery-Level (aus Overview hierher verschoben)
4. **Öffentlich:** Zeigt Spieler + Menge, OHNE Preise/P&L für non-self

### Statistiken (alles "Wie gut bin ich?" an einem Ort)

1. **Track Record** (aus Overview verschoben) — Hit-Rate, Calls, Verified Scout Badge
2. **Research Earnings** (aus Overview verschoben) — 4 Stat-Cards
3. **Expert Badges** (aus Sidebar verschoben) — 6 Badges mit Progress
4. **Achievements Grid** (aus Overview verschoben) — Vollständig, expandierbar
5. **Fantasy Results** (aus Overview verschoben) — Summary + Event-Liste
6. **Prediction Stats** (aus Overview verschoben) — Accuracy Stats
7. **Score Road** (aus Overview verschoben) — Gamification Milestones
8. **Earnings Breakdown** (aus Overview verschoben) — 11 Earning Types
9. **Trading History** (aus Overview verschoben) — Letzte Trades
10. **Top Post** (aus Header verschoben) — Pinned Research

### Aktivität (mit Filtern)

1. **Filter Chips** — `Alle | Trades | Fantasy | Missionen | Belohnungen`
2. **Transaction Feed** — gruppiert nach Tag, wie gehabt
3. **Load More** — Pagination bleibt

---

## D. Sidebar-Strategie

### Mobile (< 1024px)
**Komplett entfernt.** Inhalte umverteilt:
- Wallet Balance → Compact im Header Stats Ribbon (oder Overview)
- Scout Scores T/M/S Circles → durch Header 3-Bars ersetzt
- Airdrop Score → Overview Tab (compact card)
- Referral → Overview Tab (small CTA)
- Cosmetics → Statistiken Tab
- Expert Badges → Statistiken Tab

### Desktop (≥ 1024px)
**Maximal 2-3 Cards:**
- Wallet Card (self-only)
- Airdrop Score Card (compact)
- Referral Card (self-only)

---

## E. Settings → Eigene Route

**Route:** `/profile/settings`
**Zugang:** ⚙️ Icon im Header (statt Tab)
**Inhalt:** Unverändert (Profile Section + Account + Notifications + Danger Zone)

---

## F. Neue i18n Keys (DE)

```json
{
  "profile": {
    "squad": "Kader",
    "stats": "Statistiken",
    "nextAction": "Nächste Aktion",
    "nextActionBuy": "Scout deinen ersten Spieler",
    "nextActionMissions": "{count} Missionen offen",
    "nextActionFantasy": "Event aktiv — du bist #{rank}",
    "nextActionScoreRoad": "Noch {points} Punkte bis {tier}",
    "portfolioPulse": "Kader-Puls",
    "streakLabel": "Streak",
    "recentActivity": "Letzte Aktivität",
    "viewAllActivity": "Alle anzeigen",
    "achievementHighlights": "Letzte Erfolge",
    "viewAllAchievements": "Alle {count} Erfolge",
    "filterAll": "Alle",
    "filterTrades": "Trades",
    "filterFantasy": "Fantasy",
    "filterMissions": "Missionen",
    "filterRewards": "Belohnungen",
    "squadValue": "Kaderwert",
    "totalRank": "Gesamtrang",
    "moreBio": "Mehr anzeigen",
    "lessBio": "Weniger"
  }
}
```

---

## G. Nicht im Scope

- Elo-Dreieck Badge (Triangle Visualization) → Phase 2
- Saisonverlauf Chart (Elo-over-time) → Phase 2
- Kader-Showcase Formation View → Phase 2
- "Beste Calls" Shelf → Phase 2
- Saison-Karte (Shareable Image) → Phase 2
- Weekly Recap / Push Notification → Phase 2
- OG Meta Tags für Public Profiles → Phase 2
- Collection Completeness per Club → Phase 2

---

## H. Betroffene Files

| File | Aktion |
|------|--------|
| `src/types/index.ts` | ProfileTab Union Type ändern |
| `src/components/profile/ProfileView.tsx` | Header komprimieren, Sidebar-Strategie, Tab-Routing |
| `src/components/profile/ProfileOverviewTab.tsx` | 13→5 Sektionen, neue Components |
| `src/components/profile/ProfilePortfolioTab.tsx` | → wird ProfileSquadTab, öffentlich |
| `src/components/profile/ProfileActivityTab.tsx` | Filter Chips hinzufügen |
| `src/components/profile/ProfileStatsTab.tsx` | NEU — konsolidiert Stats |
| `src/app/(app)/profile/page.tsx` | Settings-Tab entfernen |
| `src/app/(app)/profile/settings/page.tsx` | NEU — Settings eigene Route |
| `messages/de.json` | Neue Keys |
| `messages/tr.json` | Neue Keys |

---

## Abnahme

- [ ] `npx next build` → 0 errors
- [ ] Header auf Mobile ≤ 280px (visuell prüfen)
- [ ] Sidebar auf Mobile nicht sichtbar
- [ ] MissionBanner im Überblick-Tab sichtbar
- [ ] Kader-Tab für öffentliche Profile sichtbar (ohne Preise)
- [ ] Settings nur über ⚙️ erreichbar, nicht als Tab
- [ ] Activity-Tab hat Filter Chips
- [ ] Alle 4 Tabs für Public Profiles sichtbar
- [ ] Min font-size: 11px in allen geänderten Files
- [ ] `text-[9px]` und `text-[10px]` → `text-[11px]` (font compliance)
