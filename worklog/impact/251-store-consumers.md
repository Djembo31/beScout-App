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

## Wave-3-Annex (Pre-BUILD-Audit-Erweiterung, 2026-04-29)

Probe Finding 1 + 3 (Fantasy-Page-Gap + Out-of-Scope-Pages) hier formell geschlossen via direkten Greps in `src/app/` und `src/components/`.

### Korrektur Finding 1: fantasyStore IST verwendet — am App-Level

**Probe-Behauptung:** `fantasyCountry/fantasyLeague` 0 Reads → DELETE-Strategie.

**Korrektur:** `src/app/(app)/fantasy/FantasyContent.tsx` liest beide Felder aktiv.

| File | Lines | Read-Type | Migration |
|------|-------|-----------|-----------|
| `src/app/(app)/fantasy/FantasyContent.tsx` | 98 | destructure `{ fantasyCountry, fantasyLeague, setFantasyCountry, setFantasyLeague }` | **REPLACE** |
| `src/app/(app)/fantasy/FantasyContent.tsx` | 118-123 | useEffect: country-change → reset league | Smart-Collapse → in Store |
| `src/app/(app)/fantasy/FantasyContent.tsx` | 127-136 | filteredGwEvents-Memo (Liga-Filter auf gwEvents) | bleibt — liest aus Store |
| `src/app/(app)/fantasy/FantasyContent.tsx` | 233-241 | CountryBar + LeagueBar UI | wird LeagueScopeHeader |

**Wave-6-Cleanup-Plan:** fantasyStore.fantasyCountry/fantasyLeague + setter werden REMOVED nachdem FantasyContent migriert ist. Nicht in Wave 3 löschen — Migration zuerst.

### Out-of-Scope-Pages: rankings + clubs nutzen lokales useState (kein Store)

| File | Liga-State | Pattern | Migration |
|------|------------|---------|-----------|
| `src/app/(app)/rankings/page.tsx` | `useState('')` filterCountry + filterLeague (L23-24) | Smart-Collapse `handleCountryChange` (L28-31) + CountryBar+LeagueBar (L43-48) + Props weiterreichen an `<PlayerRankings />` (L67) | **REPLACE** lokales State durch `useLeagueScope()` |
| `src/app/(app)/clubs/page.tsx` | `useState('')` filterCountry + filterLeague (L43-44) | Smart-Collapse + Single-League-Auto-Select useEffect (L57-63) + CountryBar+LeagueBar (L159-170) + filtering-logic (L83-95) | **REPLACE** lokales State durch `useLeagueScope()` — Single-League-Auto-Select kann in Store-Helper |

### TradeSuccessCard — SKIP confirmiert

`src/features/market/components/shared/TradeSuccessCard.tsx` Line 8 importiert `useMarketStore`, aber Line 56 liest nur `setTab` (kein Liga-Field). → SKIP, **kein Migration-Item**.

---

## Migration-Inventar (final, post-Annex)

### REPLACE (6 Konsumenten)

| Stelle | Liga-State-Quelle | Ziel |
|--------|-------------------|------|
| `src/app/(app)/fantasy/FantasyContent.tsx` | `useFantasyStore` | `useLeagueScope()` |
| `src/features/market/components/marktplatz/MarktplatzTab.tsx` | `useMarketStore` | `useLeagueScope()` |
| `src/features/market/components/marktplatz/ClubVerkaufSection.tsx` | `useMarketStore` | `useLeagueScope()` |
| `src/features/manager/components/kader/KaderTab.tsx` | `useManagerStore` | `useLeagueScope()` |
| `src/app/(app)/rankings/page.tsx` | lokales `useState` | `useLeagueScope()` |
| `src/app/(app)/clubs/page.tsx` | lokales `useState` | `useLeagueScope()` |

### CREATE (2 Files)

| Datei | Zweck |
|-------|-------|
| `src/features/shared/store/leagueScopeStore.ts` | Zustand-Store + localStorage + Cascade-Hydrate |
| `src/components/layout/LeagueScopeHeader.tsx` | Sticky `top-0 z-30` UI (CountryBar + LeagueBar wieder verwendet) |

### DELETE (Wave 6, NACH Wave 3 Migration grün)

- `fantasyStore.fantasyCountry`, `fantasyLeague`, `setFantasyCountry`, `setFantasyLeague`
- `marketStore.selectedCountry`, `selectedLeague`, `setSelectedCountry`, `setSelectedLeague`
- `managerStore.kaderCountry`, `kaderLeague`, `setKaderCountry`, `setKaderLeague`
- `LEAGUE_FALLBACK` Konstante (SpieltagTab.tsx:26-37)

### Datentyp-Brücke

Existing State nutzt `country: string` (Country-Code wie `'DE'`/`'TR'`) + `league: string` (League-Name wie `'Bundesliga'`/`'TFF 1. Lig'`). Spec-Solution-Pillar 1 spezifiziert `leagueId: UUID`. Store muss BEIDES bedienen:

```typescript
interface LeagueScopeState {
  // Primary identifiers
  leagueId: string | null;     // UUID aus leagues.id
  // Derived (für legacy String-Filter)
  leagueName: string;           // 'Bundesliga'
  countryCode: string;          // 'DE'
  // Setter-API
  setLeagueScope: (l: { id: string; name: string; country: string }) => void;
  setCountry: (code: string) => void;     // smart-collapse: leeret leagueId+leagueName
  resetToDefault: () => void;
}
```

Pages, die `c.league === filterLeague` filtern, lesen `leagueName`. Pages, die `league_id`-FK nutzen, lesen `leagueId`.

### Cache-Invalidation auf setLeagueScope

Per AC-13 + EC-13:

```typescript
queryClient.invalidateQueries({ queryKey: qk.events.leagueGw._def });
queryClient.invalidateQueries({ queryKey: qk.fantasy.gwFixtureInfo._def });
queryClient.invalidateQueries({ queryKey: qk.events.fixtures._def });
queryClient.invalidateQueries({ queryKey: qk.events.wildcardBalance._def }); // Slice 251 Wave 2
```

(query-key paths via `@/lib/queries/keys` — Wave 3 Track C verifiziert exakte Pfade)

### Cascade-Hydrate (3 Stufen)

1. **profile.favorite_club_id** → `getClub(...).league_id` (via `@/lib/clubs`)
2. **activeClub.league_id** (via `useClub()`)
3. **getActiveLeagues()[0].id** (via `@/lib/leagues`, alphabetisch)

Hydrate-Effect läuft im Store oder im LeagueScopeHeader-Provider. Skip-on-user-action (per EC-14).

---

**End of Annex**
