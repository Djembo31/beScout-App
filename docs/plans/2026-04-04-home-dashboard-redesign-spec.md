# Home Dashboard Redesign — Orientierung fuer Neue

> Status: SPEC PHASE — Wartet auf Anil-Review
> Datum: 2026-04-04

## Problem

Neue User fuehlen sich verloren. Die Home-Seite zeigt 18 Sektionen, aber die meisten sind conditional — ohne Holdings, Events, Clubs, Streak sieht ein Neuer eine fast leere Seite mit ein paar Karten die er nicht versteht.

---

## 1.1 Current State — Feature Inventory

| # | Feature | Component | Condition | Neuer User sieht es? |
|---|---------|-----------|-----------|---------------------|
| 1 | Welcome Bonus Modal | WelcomeBonusModal | holdings=0 + balance>0 | JA (einmal) |
| 2 | Founding Pass Upsell | inline Link | !highestPass | JA |
| 3 | Hero Header (Greeting + PnL) | HomeStoryHeader | immer | JA (aber PnL=0, leer) |
| 4 | Quick Actions Bar | inline nav | showQuickActions | VIELLEICHT |
| 5 | Spotlight (IPO/Event/Trending) | HomeSpotlight | !playersLoading | JA (wenn IPO/Event existiert) |
| 6 | Onboarding Checklist | OnboardingChecklist | retention?.onboarding | JA (wenn retention aktiv) |
| 7 | Welcome Bonus Tip | NewUserTip | holdings=0 + balance>0 | JA |
| 8 | Portfolio Strip | PortfolioStrip | immer (aber leer) | JA (leer — "Kein Portfolio") |
| 9 | Top Movers (persoenlich) | inline | topMovers.length>0 | NEIN (keine Holdings) |
| 10 | Next Event Card | inline | nextEvent && spotlight!='event' | MANCHMAL |
| 11 | Live IPO Card | inline | activeIPOs.length>0 | MANCHMAL |
| 12 | Global Top Movers | TopMoversStrip | hasGlobalMovers | MANCHMAL |
| 13 | Most Watched Players | MostWatchedStrip | uid | JA (aber leer — kein Watchlist) |
| 14 | Score Road Strip | ScoreRoadStrip | uid | JA |
| 15 | Streak Milestone | StreakMilestoneBanner | retention?.streakMilestone | NEIN (Tag 1) |
| 16 | Suggested Action | SuggestedActionBanner | retention?.suggestedAction | VIELLEICHT |
| 17 | Daily Challenge | DailyChallengeCard | uid | JA |
| 18 | Market Pulse (Trending) | DiscoveryCard strips | trendingWithPlayers.length>0 | MANCHMAL |
| 19 | My Clubs | inline | followedClubs.length>0 | NEIN (kein Club gefolgt) |
| 20 | Sponsor Banner | SponsorBanner | immer | JA |

**Neuer User sieht effektiv:** Greeting (leer), Founding Pass Upsell, Welcome Bonus, evtl. Spotlight, leeres Portfolio, Score Road, Daily Challenge, Sponsor. Keine Orientierung WAS BeScout ist oder WO man anfaengt.

### File Inventory

| File | Lines | Zweck |
|------|-------|-------|
| src/app/(app)/page.tsx | 446 | Home Page orchestration |
| src/app/(app)/hooks/useHomeData.ts | ~180 | Data aggregation hook |
| src/components/home/HomeStoryHeader.tsx | ~110 | Greeting + PnL |
| src/components/home/HomeSpotlight.tsx | ~200 | Priority spotlight card |
| src/components/home/PortfolioStrip.tsx | ~100 | Holdings overview |
| src/components/home/TopMoversStrip.tsx | ~80 | Price movers horizontal |
| src/components/home/OnboardingChecklist.tsx | ~80 | Guided steps |
| src/components/home/MostWatchedStrip.tsx | ~80 | Watchlist players |
| src/components/home/StreakMilestoneBanner.tsx | ~60 | Streak celebration |
| src/components/home/SuggestedActionBanner.tsx | ~60 | Retention nudge |
| src/components/home/helpers.tsx | ~120 | Utilities |

### Data Flow

```
useHomeData() → usePlayers, useHoldings, useEvents, useUserStats,
                useTrendingPlayers, useTodaysChallenge, useChallengeHistory,
                useUserTickets, useHighestPass, getRetentionContext
```

Provider dependencies: AuthProvider (user), WalletProvider (balance), ClubProvider (followedClubs)

---

## 1.2 Goals + Non-Goals + Anti-Requirements

### Goals
1. Neuer User versteht in 5 Sekunden was BeScout ist und was er tun kann
2. Klarer visueller Unterschied zwischen "Neuer User" und "Aktiver User" Dashboard
3. Jede Sektion erklaert sich selbst — kein Vorwissen noetig
4. Natuerlicher Uebergang: je mehr der User macht, desto mehr verwandelt sich die Seite

### Non-Goals
- Neue Features bauen (IPO, Trading etc. bleiben wie sie sind)
- Navigation/SideNav aendern
- Backend/RPC Aenderungen
- Performance-Optimierung (kein Messen noetig — rein visuell)

### Anti-Requirements
- KEINE neuen Komponenten wo bestehende reichen (OnboardingChecklist existiert!)
- KEIN Entfernen von Features fuer aktive User
- KEIN "Tutorial Mode" oder separater Flow — gleiche Seite, verschiedene Zustaende
- KEINE neuen Queries oder API Calls

---

## 1.3 Feature Migration Map

| # | Feature | Action | Details |
|---|---------|--------|---------|
| 1 | Welcome Bonus Modal | STAYS | Wie bisher |
| 2 | Founding Pass Upsell | MOVE | Weiter runter (nicht erste Sache die Neue sehen) |
| 3 | Hero Header | ENHANCE | Neuer User: "Willkommen bei BeScout" + 1-Liner was es ist. Aktiver User: wie bisher |
| 4 | Quick Actions Bar | ENHANCE | Neuer User: mit Erklaertext pro Action. Aktiver User: wie bisher |
| 5 | Spotlight | STAYS | Funktioniert bereits gut |
| 6 | Onboarding Checklist | MOVE | HOCH — direkt nach Hero fuer Neue. Prominenter. |
| 7 | Welcome Bonus Tip | MERGE | In Onboarding Checklist integrieren (redundant als eigenstaendige Sektion) |
| 8 | Portfolio Strip | ENHANCE | Neuer User: "Dein Portfolio ist noch leer" + CTA zum Markt |
| 9-11 | Movers + Events + IPO | STAYS | Conditional, funktionieren |
| 12-16 | Global Movers, Watched, Score, Streak, Suggested | STAYS | Conditional, funktionieren |
| 17 | Daily Challenge | STAYS | Gutes Engagement fuer alle |
| 18 | Market Pulse | STAYS | Conditional, funktioniert |
| 19 | My Clubs | STAYS | Conditional |
| 20 | Sponsor | STAYS | Wie bisher |
| NEW | "Was ist BeScout?" Intro-Card | CREATE | NUR fuer Neue (holdings=0). 3-4 Saeulen: Trading, Fantasy, Community, Scouting. Verschwindet wenn User aktiv wird. |

---

## 1.4 Blast Radius Map

Aenderungen betreffen NUR:
- `src/app/(app)/page.tsx` — Reihenfolge + Conditional-Logik
- `src/components/home/HomeStoryHeader.tsx` — Neuer-User-Variante
- `src/components/home/OnboardingChecklist.tsx` — Prominentere Darstellung
- `src/components/home/PortfolioStrip.tsx` — Leerzustand verbessern

Neue Datei:
- `src/components/home/BeScoutIntroCard.tsx` — Intro fuer Neue

Keine Consumer-Aenderungen noetig — alle Komponenten behalten ihre Props.

---

## 1.5 Pre-Mortem

| # | Failure | Mitigation |
|---|---------|------------|
| 1 | Aktive User sehen ploetzlich anderes Layout | Alle Aenderungen hinter `isNewUser` Guard (holdings=0) |
| 2 | Intro-Card verschwindet nie | Klare Bedingung: holdings.length === 0. Erster Kauf → weg |
| 3 | Onboarding Checklist fehlt bei manchen Usern | retention?.onboarding Fallback: hardcoded Default-Items |
| 4 | i18n Keys fehlen fuer neue Texte | DE + TR Keys in DEMSELBEN Commit |
| 5 | Seite wird langsamer durch neue Komponente | BeScoutIntroCard ist statisch, kein Query, kein dynamic() noetig |

---

## 1.6 Invarianten + Constraints

**Invarianten:**
- Aktive User (holdings > 0) sehen IDENTISCHES Dashboard wie vorher
- Alle bestehenden Links, CTAs, Navigation unveraendert
- useHomeData Hook — Interface aendert sich NICHT

**Constraints:**
- Max 5 Files geaendert pro Wave
- Kein neuer React Query Hook
- Kein neues Backend/RPC
- i18n: DE + TR in jedem Commit

---

## 1.7 Akzeptanzkriterien

### Neuer User (holdings=0)
```
GIVEN: Neuer User mit 0 Holdings
WHEN: User oeffnet Home
THEN: Sieht "Willkommen bei BeScout" Hero + Erklaerung
  AND: Sieht BeScoutIntroCard mit 3-4 Plattform-Saeulen
  AND: Sieht Onboarding Checklist prominent (direkt nach Intro)
  AND: Sieht Quick Actions mit Erklaertext
  AND: Founding Pass Upsell ist NICHT das erste Element
  AND NOT: Leere Sektionen ohne Kontext
```

### Aktiver User (holdings>0)
```
GIVEN: Aktiver User mit Holdings
WHEN: User oeffnet Home
THEN: Dashboard ist IDENTISCH zu vorher
  AND: Kein BeScoutIntroCard sichtbar
  AND: Kein zusaetzlicher Erklaertext
  AND NOT: Regressions in PnL, Spotlight, Events, Portfolio
```

### Uebergang
```
GIVEN: Neuer User kauft ersten DPC
WHEN: User kehrt zum Home zurueck
THEN: BeScoutIntroCard ist verschwunden
  AND: Portfolio Strip zeigt Holding
  AND: Dashboard verwandelt sich in aktive Variante
```

---

## SPEC GATE

- [x] Current State komplett (20 Features nummeriert)
- [x] Migration Map fuer JEDES Feature
- [x] Blast Radius: 4 bestehende + 1 neue Datei
- [x] Pre-Mortem mit 5 Szenarien
- [x] Invarianten + Constraints
- [x] Akzeptanzkriterien fuer Neuer/Aktiver/Uebergang

---

## PHASE 2: PLAN

### Vorhandene i18n Keys (REUSE — kein Neuerfinden)
- `welcomeGreeting`: "Willkommen, {name}!"
- `welcomeSubtitle`: "Verdiene Credits durch Trading, Fantasy-Turniere und Analysen."
- `welcomeFantasy`, `welcomeBuyPlayers`, `welcomeCommunity`
- `emptyPortfolioTitle`: "Starte mit deinem ersten Spieler"
- `storyNoHoldings`: "566 Spieler warten — starte mit deinem ersten Scout Card"

Neue Keys noetig: ~4 (IntroCard Saeulen-Beschreibungen)

### Wave 1: BeScoutIntroCard + i18n (CREATE)

**Files:**
- CREATE `src/components/home/BeScoutIntroCard.tsx`
- MODIFY `messages/de.json` (4 neue Keys in `home` namespace)
- MODIFY `messages/tr.json` (4 neue Keys in `home` namespace)

**Steps:**
1. BeScoutIntroCard: 4 Saeulen (Trading, Fantasy, Community, Scouting) — je Icon + Titel + 1-Zeiler + CTA Link
2. Nutzt bestehende Icons aus lucide-react, Card aus ui/index, Link aus next/link
3. i18n Keys: `introTrading`, `introFantasy`, `introCommunity`, `introScouting` + Descriptions
4. `npx tsc --noEmit`
5. Playwright Screenshot 390px

**DONE means:**
- [ ] Komponente rendert 4 Saeulen mit Icons + Text + Links
- [ ] DE + TR i18n Keys vorhanden und korrekt
- [ ] tsc 0 errors
- [ ] Visuell geprueft bei 390px

### Wave 2: page.tsx Integration (WIRE)

**Files:**
- MODIFY `src/app/(app)/page.tsx` — Reihenfolge + isNewUser Guard

**Steps:**
1. `const isNewUser = holdings.length === 0;`
2. Neuer User sieht: Hero → BeScoutIntroCard → OnboardingChecklist → Quick Actions (mit Erklaertext) → Spotlight → Daily Challenge → Sponsor
3. Founding Pass Upsell NACH IntroCard (nicht ganz oben)
4. Aktiver User: exakt wie bisher (null Aenderung wenn holdings>0)
5. `npx tsc --noEmit`
6. Playwright Screenshot 390px — Neuer User View
7. Verifizieren: Aktiver User View IDENTISCH

**DONE means:**
- [ ] Neuer User sieht IntroCard + prominente Checklist
- [ ] Aktiver User sieht identisches Dashboard
- [ ] Founding Pass Upsell nicht mehr ganz oben fuer Neue
- [ ] tsc 0 errors
- [ ] Playwright: beide Varianten visuell geprueft

### Wave 3: Verify + Cleanup

**Steps:**
1. Self-Review: alle geaenderten Files lesen
2. 9-Punkt Checkliste
3. Playwright Mobile (390px) + Desktop (1280px) Screenshots
4. Akzeptanzkriterien aus Spec durchgehen (Neuer/Aktiver/Uebergang)
5. Commit + Push

---

## PLAN GATE

- [x] 2 Waves, jeweils eigenstaendig shippbar
- [x] Max 3 Files pro Wave
- [x] Jeder Task hat DONE Checkliste
- [x] Kein Backend, kein neuer Query
- [ ] Anil hat den Plan reviewed
