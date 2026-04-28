# Slice 251 Wave 2.5 — Store-Konsumenten-Audit

**Source:** Pre-Wave-3-Probe (Explore-Agent, Read-Only)
**Slice:** 251 Spieltag Liga-Scope-Reform
**Date:** 2026-04-28
**Spec-AC:** AC-23

---

## Summary

- **Total Konsumenten:** 27 Files
- **reads-Liga: yes** — 3 Components (direkt Liga-Felder lesend)
- **reads-Liga: no** — 23 Components (nur Feature-State, keine Liga)
- **reads-Liga: unclear** — 1 Component (manuell zu ueberpruefen)

**Liga-Fields (Slice 251-Scope):**
- fantasyStore: fantasyCountry, fantasyLeague
- marketStore: selectedCountry, selectedLeague
- managerStore: kaderCountry, kaderLeague

---

## Konsumenten-Zusammenfassung nach Store

### useFantasyStore (5 Konsumenten)

| File | reads-Liga | Migration |
|------|------------|-----------|
| src/features/fantasy/hooks/useGameweek.ts | no | SKIP |
| src/features/fantasy/hooks/useEventActions.ts | no | SKIP |
| src/features/fantasy/hooks/useFantasyEvents.ts | no | SKIP |
| src/features/fantasy/store/fantasyStore.ts | Store-Def | – |
| src/features/fantasy/hooks/__tests__/useEventActions.test.ts | no | SKIP |

**Fantasy-Summary:** KEINE direkten Liga-Field-Reads. fantasyCountry/fantasyLeague sind tote Felder oder Consumer-Gap.

---

### useManagerStore (9 Konsumenten)

| File | reads-Liga | Liga-Felder | Migration |
|------|------------|-------------|-----------|
| src/features/manager/store/managerStore.ts | Store-Def | – | – |
| src/features/manager/components/aufstellen/AufstellenTab.tsx | no | selectedEventId | SKIP |
| src/features/manager/components/aufstellen/EventSelector.tsx | no | selectedEventId | SKIP |
| src/features/manager/components/kader/KaderTab.tsx | **yes** | **kaderCountry, kaderLeague** | **REPLACE** |
| src/features/manager/components/kader/PlayerDetailModal.tsx | no | kaderDetailPlayerId | SKIP |
| src/features/manager/components/historie/HistorieTab.tsx | no | historyTimeFilter | SKIP |
| src/features/manager/components/historie/HistoryEventCard.tsx | no | applyLineupTemplate | SKIP |
| src/features/manager/components/ManagerContent.tsx | no | activeTab | SKIP |
| src/features/manager/components/PageHeader.tsx | no | setSelectedEventId | SKIP |

**Manager-Summary:** 1 Component liest Liga-Felder direkt: KaderTab.tsx (Lines 106-109).

---

### useMarketStore (13 Konsumenten)

| File | reads-Liga | Liga-Felder | Migration |
|------|------------|-------------|-----------|
| src/features/market/store/marketStore.ts | Store-Def | – | – |
| src/features/market/components/MarketContent.tsx | no | tab | SKIP |
| src/features/market/hooks/useMarketData.ts | no | tab | SKIP |
| src/features/market/components/marktplatz/MarktplatzTab.tsx | **yes** | **selectedCountry, selectedLeague** | **REPLACE** |
| src/features/market/components/marktplatz/ClubVerkaufSection.tsx | **yes** | **selectedLeague** | **REPLACE** |
| src/features/market/components/marktplatz/TransferListSection.tsx | no | – | SKIP |
| src/features/market/components/marktplatz/TrendingSection.tsx | no | – | SKIP |
| src/features/market/components/marktplatz/ClubAccordion.tsx | no | filterPos, sortBy | SKIP |
| src/features/market/components/portfolio/BestandView.tsx | no | – | SKIP |
| src/features/market/components/portfolio/PortfolioTab.tsx | no | – | SKIP |
| src/features/market/components/shared/MarketFilters.tsx | no | filterState | SKIP |
| src/features/market/components/shared/TradeSuccessCard.tsx | unclear | – | PENDING |
| src/features/market/hooks/__tests__/useMarketData.test.ts | no | – | SKIP |

**Market-Summary:** 2 Components lesen Liga-Felder direkt: MarktplatzTab.tsx + ClubVerkaufSection.tsx.

---

## Liga-Felder: Read-Zugriff Statistik

### fantasyStore
- fantasyCountry: 0 Reads (UNUSED)
- fantasyLeague: 0 Reads (UNUSED)

### marketStore
- selectedCountry: 1 Read (MarktplatzTab.tsx:73)
- selectedLeague: 2 Reads (MarktplatzTab.tsx:73, ClubVerkaufSection.tsx:58)

### managerStore
- kaderCountry: 1 Read (KaderTab.tsx:106)
- kaderLeague: 1 Read (KaderTab.tsx:108)

---

## Wave 3 Track C: Spec vs. Audit

### Spec (AC-23)
- 4 zentrale Page-Konsumenten: /fantasy, /market, /manager, /rankings
- Impact-Analyst: +1 (/clubs/page.tsx)
- Erwartet: 5 Page-Level Liga-Konsumenten

### Audit-Ergebnis
- /market: FOUND (MarktplatzTab.tsx) ✓
- /manager: FOUND (KaderTab.tsx in Manager-Page) ✓
- /fantasy: MISSING (nur Event-State, keine Liga) ✗
- /rankings: OUT OF SCOPE (nicht in features/) ?
- /clubs/page.tsx: OUT OF SCOPE (app-root level) ?

### Zusatz-Befund
- ClubVerkaufSection.tsx ist Sub-Component mit Liga-Read (nicht in Spec gezaehlt)
- Implications: Sub-Component inventory muss aktualisiert werden

---

## Kritische Findings für Wave 3

### Finding 1: Fantasy-Page Gap
**Status:** Fantasy-Page liest KEINE Liga-Felder. Spec behauptet 4-5 Page-Konsumenten, aber /fantasy scheint Liga-Scope aus URL zu beziehen (nicht aus Store).

**Action:** Vor Wave 3 klarmaachen, ob fantasyCountry/fantasyLeague getroffen werden oder ob sie Candy sind.

### Finding 2: Sub-Component Liga-Reads
**Status:** ClubVerkaufSection.tsx (Sub-Component in Marktplatz) liest selectedLeague direkt.

**Action:** Spec-Annex mit "Sub-Component Liga-Consumer" erstellen.

### Finding 3: Out-of-Scope Components
**Status:** /rankings und /clubs/page.tsx liegen außerhalb der Probe (nicht in features/). Sie sind möglicherweise auch Liga-Konsumenten.

**Action:** Wave 3 Probe muss src/app/ und src/components/ durchsuchen.

---

## Migration Path (Wave 3)

### Zu konsolidieren: 3 Components

1. **src/features/market/components/marktplatz/MarktplatzTab.tsx**
   - Before: const { selectedCountry, setSelectedCountry, selectedLeague, setSelectedLeague } = useMarketStore();
   - After: const { selectedCountry, setSelectedCountry, selectedLeague, setSelectedLeague } = useLeagueScope();

2. **src/features/market/components/marktplatz/ClubVerkaufSection.tsx**
   - Before: const { selectedLeague } = useMarketStore();
   - After: const { selectedLeague } = useLeagueScope();

3. **src/features/manager/components/kader/KaderTab.tsx**
   - Before: const kaderCountry = useManagerStore(s => s.kaderCountry); const setKaderCountry = useManagerStore(s => s.setKaderCountry);
   - After: const { selectedCountry: kaderCountry, setSelectedCountry: setKaderCountry } = useLeagueScope();

### Nicht konsolidieren: 23 Components
- Alle other Consumer nutzen Store nur für Feature-State (Event, Filter, Modal, Tab-State) — keine Ande'ng noetig.

---

## Probe-Constraints

- Scope: nur src/features/{fantasy,market,manager}/ (AC-23 explicit)
- Dynamic Access: Spread-ops, computed properties → koennte Liga-Access verstecken (marked unclear)
- Transitive Reads: Liga ueber Props → konservative Schaetzung

**Total Coverage:** 27 Files vollstaendig gelesen/gegreppet.

---

**End of Report**
