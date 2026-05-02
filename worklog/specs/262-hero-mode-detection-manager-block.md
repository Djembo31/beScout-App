# Slice 262 — Home Hero-Mode-Detection + Manager-Block (Spec-v2)

**Status:** SPEC v2 (post-Pre-Review-REWORK, Anil-Decisions A-E = CTO-Empfehlung) · **Größe:** M (5 produktive Files + 1 Test, eine Domain) · **Slice-Type:** UI · **Scope:** CTO (Home-Redesign Phase 1) · **Datum:** 2026-05-02

> **v2-Changelog (post-Reviewer-Pre-Review):**
> - **F-01 (P0):** `useHomeData` importiert `useLeagueScope` heute NICHT — explizit als BUILD-Step 1 dokumentiert.
> - **F-02 (P0):** Decision D umgestellt von „placeholderData explicit" → **„Persist-Cache reicht (~<50ms Cold-Start, akzeptieren)"**. `useEvents()` hat heute keinen `placeholderData`-Wiring; persist-cache aus Slice 261 füllt aus localStorage in <50ms. Kein extra Wiring nötig.
> - **F-03 (P0):** HomeStoryHeader Render-Tree explizit dokumentiert: Wrapper + Vignette + GameweekStatusBar bleiben IMMER persistent. ManagerBlock ersetzt nur den Greeting-bis-CTA-Inhalts-Bereich (`relative z-10` Body inside).
> - **F-04 (P1):** 0-Holdings + aktive GW = ManagerBlock adaptiert intern (Lineup-CTA prominent, Captain hidden bis Lineup gesetzt). KEIN neuer Mode.
> - **F-05 (P1):** TR-Greeting-Key entfernt. ManagerBlock zeigt firstName-Sub-Header analog Scout-Mode (existing pattern), GW-Number ist primärer Hero-Identifier. Keine 4. TR-Greeting-Variante.
> - **F-06 (P1):** `pickBarEvent` aus `GameweekStatusBar.tsx` in `helpers.tsx` extrahieren (shared-helper, single-source). Neuer Hook `useLineupWithPlayers(eventId, uid)` in `src/features/fantasy/queries/lineups.ts` mit `qk.fantasy.lineupWithPlayers(eventId, uid)`.
> - **F-07 (P1):** `getLineupWithPlayers` returnt `{ lineup, players }` — Object + Array, **kein Map** (verifiziert in `src/features/fantasy/services/lineups.queries.ts:107-169`). Slice 267 Map-Korruption-Risk hier nicht relevant.
> - **F-08 (P2):** AC-12 umformuliert zu Anil-Mobile-PROVE Slow-Motion-Recording.
> - **F-09 (P2):** Scout-Mode-Regression-Proof in §10 ergänzt.
>
> **Anil-Decisions (D64 Format) — alle = CTO-Empfehlung:**
> A=b · B=a · C=a · D=a · E=a

---

## 1. Problem Statement

**Heute:** HomeStoryHeader rendert immer **dasselbe Hero**: Portfolio-Wert (CR) + PnL% + Spieler-Count. Egal ob aktive GW läuft oder nicht. „BeScout-Identität in 5 Sekunden" (D63) verlangt aber kontextueller Hero — wenn aktive GW, dann Manager-Hub primär, sonst Scout-Hub.

**Evidence:**
- D63 Hero-State-Matrix (genehmigt 2026-04-30): „Aktive GW → Manager-Block primär, Off-GW → Scout-Block primär, 0-Holdings → CTA-Block."
- FM-Power-User-Persona (Session 2026-04-30): „Während GW will ich GW-Status + Lineup-Status + Captain sehen, nicht Portfolio-Schwankungen."
- Beta-Day-3 Tester: Slice 261 GW-Bar zeigt Awareness, aber Hero-Number darunter bleibt Portfolio → kognitive Dissonanz „warum Geld-Anzeige im Spieltag-Modus?"

**Wer ist betroffen, wie oft?** Alle aktiven Fantasy-User mit followed-Liga + aktiver GW. Während GW-Cycle (mind. 1× / Woche) wechselt der Hero-Mode für mind. 2-3 Tage.

## 2. Lösungs-Design (Architektur)

### 2.1 BUILD-Step 1: Import-Add (F-01)

`useHomeData` importiert HEUTE NICHT `useLeagueScope`. Pflicht-Add:

```ts
// src/app/(app)/hooks/useHomeData.ts top
import { useLeagueScope } from '@/features/shared/store/leagueScopeStore';
```

### 2.2 Shared-Helper Extraction (F-06)

`pickBarEvent` lebt heute lokal in `GameweekStatusBar.tsx:34-50`. Slice 262 extrahiert nach `src/components/home/helpers.tsx`:

```ts
// helpers.tsx (NEU)
import { getClub } from '@/lib/clubs';
import type { DbEvent } from '@/types';

export const ACTIVE_STATUSES: ReadonlyArray<DbEvent['status']> = ['registering', 'late-reg', 'running'];

export function pickScopedEvent(events: DbEvent[], leagueId: string): DbEvent | null {
  const candidates = events.filter((e) => {
    if (!ACTIVE_STATUSES.includes(e.status)) return false;
    if (e.league_id === leagueId) return true;
    if (!e.club_id) return false;
    return getClub(e.club_id)?.league_id === leagueId;
  });
  if (candidates.length === 0) return null;
  candidates.sort((a, b) => {
    if (a.status === 'running' && b.status !== 'running') return -1;
    if (b.status === 'running' && a.status !== 'running') return 1;
    return new Date(a.starts_at).getTime() - new Date(b.starts_at).getTime();
  });
  return candidates[0];
}
```

`GameweekStatusBar.tsx` importiert `pickScopedEvent` aus `helpers.tsx` und entfernt lokale Definition (Single-Source-of-Truth).

### 2.3 Neuer Derived-Wert `heroMode` in `useHomeData()`

```ts
type HeroMode = 'manager' | 'scout' | 'cta-new';

// in useHomeData (innerhalb der existing-Hook):
const { leagueId: scopedLeagueId, hydrated: leagueScopeHydrated } = useLeagueScope();

const scopedActiveEvent = useMemo(() => {
  if (!scopedLeagueId || !leagueScopeHydrated) return null;
  return pickScopedEvent(events as DbEvent[], scopedLeagueId);
}, [events, scopedLeagueId, leagueScopeHydrated]);

const heroMode: HeroMode = useMemo(() => {
  if (scopedActiveEvent) return 'manager';
  if (holdings.length > 0) return 'scout';
  return 'cta-new';
}, [scopedActiveEvent, holdings.length]);
```

**Hinweis (F-04):** `heroMode='manager'` deckt auch 0-Holdings+aktiveGW (D63-Konsistenz). ManagerBlock adaptiert intern: bei `holdings.length === 0` zeigt es Lineup-CTA prominent + Captain-Block hidden bis Lineup gesetzt (cascading). Slice 262 NICHT-Scope: kombinierter Manager+Scout-CTA-Layout (Slice 263).

### 2.4 Neuer Hook `useLineupWithPlayers` (F-06)

```ts
// src/features/fantasy/queries/lineups.ts (existing file, +1 export)
import { getLineupWithPlayers } from '../services/lineups.queries';

export function useLineupWithPlayers(eventId: string | undefined, userId: string | undefined) {
  return useQuery({
    queryKey: qk.fantasy.lineupWithPlayers(eventId, userId),
    queryFn: () => getLineupWithPlayers(eventId!, userId!),
    enabled: !!eventId && !!userId,
    staleTime: 60_000,  // Lineup-Status changes seltener als GW-State
  });
}
```

Neuer qk-Key in `src/lib/queries/keys.ts:391+`:
```ts
lineupWithPlayers: (eventId: string | undefined, uid: string | undefined) =>
  ['fantasy', 'lineupWithPlayers', eventId, uid] as const,
```

### 2.5 Neue Component `<ManagerBlock />`

`src/components/home/ManagerBlock.tsx`:
- GW-Number-Headline („Spieltag 28") als primärer Hero-Identifier
- firstName-Sub-Header (analog Scout-Mode, kein neuer Greeting-Key — F-05)
- 2-Pill-Reihe: Lineup-Status + Captain-Status
- Adaptive bei 0-Holdings: Lineup-CTA prominent, Captain hidden bis Lineup gesetzt (F-04)
- Streak-Pill + Tier-Badge bleiben (Identity-Continuity, AC-09)
- Liga-Rang-Pill OUT-OF-SCOPE (Slice 263)
- Live-Score-Widget OUT-OF-SCOPE (Slice 267)

### 2.6 HomeStoryHeader Render-Tree (F-03 — explizit)

**Manager-Mode:**
```
<div Wrapper -mx-4 -mt-4 lg:-mx-6 lg:-mt-6 ... bg-hero-stadium>     ← unverändert
  <Vignette />                                                       ← unverändert
  <div className="relative z-10">                                    ← unverändert
    <GameweekStatusBar />                                            ← bleibt sichtbar oben
    <ManagerBlock {...props} />                                      ← REPLACES Greeting+Hero+Pills+CTA
  </div>
</div>
```

**Scout-Mode (Default, status quo):**
```
<div Wrapper>                                                        ← unverändert
  <Vignette />                                                       ← unverändert
  <div className="relative z-10">
    <GameweekStatusBar />                                            ← unverändert
    /* Greeting + Hero Number + Pills + Story + 0-Holdings-CTA */    ← unverändert (0-Diff)
  </div>
</div>
```

**cta-new-Mode:** = Scout-Mode mit existing 0-Holdings-CTA-Branch (HomeStoryHeader.tsx:135-146 bestehend, 0-Diff in Slice 262 — wird Slice 263 als CTA-Block ausgebaut).

**Refactor-Pattern in HomeStoryHeader.tsx:**

```tsx
function HomeStoryHeaderInner({ heroMode, gw, hasLineup, hasCaptain, captainName, ...rest }: HomeStoryHeaderProps) {
  // ...existing state (greeting, portfolioTick, etc.)

  return (
    <div className="relative -mx-4 -mt-4 lg:-mx-6 lg:-mt-6 ...">
      <div className="absolute inset-0 bg-hero-vignette ..." />
      <div className="relative z-10">
        <GameweekStatusBar />
        {heroMode === 'manager' ? (
          <ManagerBlock
            firstName={rest.firstName}
            streak={rest.streak}
            shieldsRemaining={rest.shieldsRemaining}
            userStats={rest.userStats}
            gw={gw}
            hasLineup={hasLineup}
            hasCaptain={hasCaptain}
            captainName={captainName}
            holdingsCount={rest.holdingsCount}
          />
        ) : (
          <>{/* existing Greeting + Hero + Pills + Story + 0-CTA */}</>
        )}
      </div>
    </div>
  );
}
```

## 3. Betroffene Files (final)

| File | Change | Begründung |
|------|--------|-----------|
| `src/app/(app)/hooks/useHomeData.ts` | +Import useLeagueScope, +`scopedActiveEvent` memo, +`heroMode` memo, +`useLineupWithPlayers` call (conditional auf scopedActiveEvent), +`hasLineup`/`hasCaptain`/`captainName` derives, +Return-Fields | Single-Source für Hero-Mode |
| `src/components/home/helpers.tsx` | +`pickScopedEvent` + `ACTIVE_STATUSES` export (extrahiert aus GameweekStatusBar) | Shared-Helper gegen Drift |
| `src/components/home/GameweekStatusBar.tsx` | -lokale `pickBarEvent`, +Import `pickScopedEvent` aus helpers (rename) | Single-Source-Konsumption |
| `src/components/home/HomeStoryHeader.tsx` | +Props (heroMode, gw, hasLineup, hasCaptain, captainName), Dispatcher-Branch | Mode-aware Render-Tree |
| `src/components/home/ManagerBlock.tsx` | NEU — Manager-Hub-Component | Hero-Variante für aktive GW |
| `src/components/home/__tests__/ManagerBlock.test.tsx` | NEU — Render-Tests | DoD UI |
| `src/components/home/__tests__/helpers.test.tsx` | +Tests für `pickScopedEvent` | Shared-Helper-Coverage |
| `src/features/fantasy/queries/lineups.ts` | +`useLineupWithPlayers` Hook | TanStack-cached Lineup-Status |
| `src/lib/queries/keys.ts` | +`qk.fantasy.lineupWithPlayers` | Query-Key |
| `messages/de.json` | +5 Keys unter `home.manager.*` | i18n DE |
| `messages/tr.json` | +5 Keys unter `home.manager.*` | i18n TR (Anil-approved E=a) |
| `src/app/(app)/page.tsx` | (eventuell — falls HomeStoryHeader-Props wachsen, Adapter) | Props-Wiring |

**Größe-Klassifikation:** M bestätigt (5+1+1+1+1 = 9 Files, eine Domain Home).

## 4. Code-Reading-Liste (vollzogen, dokumentiert)

| File | Was geprüft | Resultat |
|------|-------------|----------|
| `src/app/(app)/hooks/useHomeData.ts` | useLeagueScope-Import-Status | NICHT importiert → BUILD-Step 1 (F-01) |
| `src/components/home/HomeStoryHeader.tsx` | Wrapper-Struktur | Outer-Div mit `-mx-4 -mt-4` + Vignette + `relative z-10`-Body. ManagerBlock ersetzt nur Body-Inhalt (F-03). |
| `src/components/home/GameweekStatusBar.tsx` | `pickBarEvent`-Pattern | Filter `e.league_id === leagueId` ODER `getClub(club_id)?.league_id === leagueId`. Extrahieren als shared-helper (F-06). |
| `src/features/fantasy/services/lineups.queries.ts:107-169` | `getLineupWithPlayers` Return-Shape | `{ lineup: DbLineup, players: LineupSlotPlayer[] }` — Object + Array. **Kein Map** (Slice 267 Risk N/A). LineupSlotPlayer hat `slotKey`, `playerId`, `score`, `player.firstName/lastName/position/club/perfL5/imageUrl`. |
| `src/features/fantasy/queries/lineups.ts` | Existing `useLineupScores` als Pattern-Vorlage | useQuery + qk-Key + staleTime — neuer Hook `useLineupWithPlayers` analog gebaut. |
| `src/lib/queries/keys.ts:391-408` | `qk.fantasy.*` Namespace | qk.fantasy.lineupSnapshot existiert (event+uid). `lineupWithPlayers` als neuer Key analog. |
| `src/types/index.ts:701-724` | `DbEvent` Schema | `league_id?: string \| null` (nullable, Comment: derive via club_id wenn missing). Filter-Pattern in pickScopedEvent passt. |
| `messages/tr.json:299-323` | TR-Greeting-Patterns | `"greeting": "Tekrar hoş geldin"` + `"welcomeGreeting": "Hoş geldin, {name}!"`. „Selam" wäre 4. Variante → F-05 entfernt. |
| `supabase/migrations/20260331_baseline_fantasy.sql:208` | `lineups.captain_slot` Schema | Slot-Token `'gk'`/`'def1'` etc., NICHT direkt Player-ID — F-07 verlangt `getLineupWithPlayers` für Name-Resolution. |

## 5. Pattern-References

- **D63** Home-Redesign Hero-State-Matrix
- **D62** Reviewer-VOR-BUILD (jetzt Spec v2 nach Pre-Review-Iteration)
- **D64** Multi-Choice-Decisions-Format (A-E geantwortet)
- **Slice 254** Stateless-Component-Pattern: ManagerBlock hat KEINEN lokalen State der mit Liga-Switch driften könnte
- **errors-frontend.md „Liga/Context-Switch State-Reset"**: Pflicht-Anwendung
- **errors-frontend.md „Cache-Invalidation Root-Prefix"**: bei Lineup-Mutation `['fantasy']` invalidieren (existing Pattern in lineup.mutations)
- **errors-frontend.md „Map/Set-typed React-Query-Data"**: F-07 verifiziert — getLineupWithPlayers returnt kein Map, kein Risk
- **Slice 261**: `pickBarEvent` Filter-Pattern (extrahiert in F-06)

## 6. Acceptance Criteria

| # | AC | VERIFY |
|---|-----|--------|
| AC-01 | `useHomeData()` returnt `heroMode: 'manager' \| 'scout' \| 'cta-new'` | `grep -n "heroMode" src/app/(app)/hooks/useHomeData.ts` zeigt Derived + Return |
| AC-02 | `heroMode='manager'` wenn `pickScopedEvent(events, scopedLeagueId)` ≠ null | Vitest mit mock-events array |
| AC-03 | `heroMode='cta-new'` wenn keine scopedActiveEvent UND `holdings.length === 0` | Vitest |
| AC-04 | `heroMode='scout'` als Default (Off-GW + ≥1 Holdings) | Vitest |
| AC-05 | HomeStoryHeader rendert ManagerBlock wenn `heroMode='manager'`, GameweekStatusBar bleibt sichtbar oberhalb in **gleicher Position wie Scout-Mode** | DOM-check (Wrapper persistent + GW-Bar sichtbar in beiden Modi) |
| AC-06 | ManagerBlock zeigt GW-Number-Headline („Spieltag 28") + firstName-Sub-Header | RTL render test |
| AC-07 | ManagerBlock zeigt Lineup-CTA wenn `hasLineup === false`, Lineup-OK-Pill wenn `true` | RTL test |
| AC-08 | ManagerBlock zeigt Captain-CTA wenn `hasCaptain === false` (=`captain_slot IS NULL` ODER Lineup nicht gesetzt), sonst Captain-Pill mit captainName aus `getLineupWithPlayers().players[i].player.firstName + lastName` (slotKey === captain_slot) | RTL test |
| AC-09 | Streak-Pill (≥2) + Tier-Badge bleiben in ManagerBlock sichtbar | DOM-check |
| AC-10 | TR-Locale rendert „Hafta 28" + „Kadro hazır"/„Kadroyu seç" + „Kaptan: …"/„Kaptan seç" | Manuelle Anil-Review (E=a vorab approved) |
| AC-11 | Mobile 393px: ManagerBlock kein horizontaler Overflow, Touch-Targets ≥44px | qa-visual screenshot |
| AC-12 | Liga-Switch (A=aktive GW → B=keine GW) zeigt zwischen Frame N und N+1 NICHT 'cta-new'-Default mit weißem Block. | Anil-Mobile-PROVE Slow-Motion-Recording 60fps, Frame-für-Frame. (Nicht Vitest.) |
| AC-13 | 0-Holdings + aktive GW: ManagerBlock zeigt Lineup-CTA prominent, Captain-Block hidden bis Lineup gesetzt (F-04) | Vitest + RTL |
| AC-14 | `pickScopedEvent` ist in `helpers.tsx` exportiert, `GameweekStatusBar.tsx` importiert (kein lokales `pickBarEvent` mehr) | grep + tsc |

## 7. Edge Cases

| # | Szenario | Erwartetes Verhalten |
|---|----------|---------------------|
| EC-01 | `leagueScopeHydrated=false` | `scopedActiveEvent=null` → heroMode='scout' (default), GameweekStatusBar zeigt eigenes Skeleton |
| EC-02 | Cold-Start mit Persist-Cache (D=a) | useEvents füllt aus localStorage <50ms. heroMode evaluiert nach Cache-Hit. Erste 50ms heroMode='scout' (default). Akzeptiert. |
| EC-03 | Liga gewechselt (A=aktive GW, B=keine) | scopedLeagueId aktualisiert via leagueScopeStore → scopedActiveEvent re-memo'd → heroMode switched. useLineupWithPlayers refetched mit neuer eventId (oder disabled wenn null). |
| EC-04 | User mit Holdings nur in Liga A, scopedLeagueId=B (aktive GW in B) | heroMode='manager' (D63-konform). ManagerBlock adaptiert: 0 Holdings in current Liga → Lineup-CTA prominent (F-04). |
| EC-05 | Aktive GW + 0 Lineup gesetzt (`getLineupWithPlayers === null`) | hasLineup=false, hasCaptain=false. ManagerBlock zeigt Lineup-CTA stark, Captain-Block hidden. |
| EC-06 | Aktive GW + Lineup gesetzt, `captain_slot=NULL` | hasLineup=true, hasCaptain=false. Lineup-OK-Pill grün, Captain-CTA gelb (FOMO-Trigger). |
| EC-07 | Aktive GW + Lineup + Captain | hasLineup=true, hasCaptain=true. captainName resolved aus players[i] mit slotKey===captain_slot. Beide Pills grün. |
| EC-08 | useLineupWithPlayers-Query failed (Network) | Fallback: `data === undefined` → hasLineup=false, hasCaptain=false (gleicher Branch wie 0-Lineup). Kein Render-Crash. logSilentCatch via getLineupWithPlayers throw → React-Query retry. |
| EC-09 | `registering`-only vs `running` | Beide ACTIVE_STATUSES → heroMode='manager'. Live-Score-Differenzierung erst Slice 267. |
| EC-10 | Multi-Tab: Tab A in Manager-Mode, Tab B switched Liga via leagueScopeStore | leagueScopeStore ist Zustand-Store (nicht persistiert per Tab) — Tab B switch propagiert NICHT zu Tab A. Tab A bleibt in alten Liga. **Akzeptabel** für Slice 262 (existing Verhalten). |
| EC-11 | Slot-zu-Player-Lookup für Captain: `players.find(p => p.slotKey === captain_slot)` returnt undefined | captainName fallback `''` → Captain-Pill zeigt "Kapitän: " (leer) → Anti-Pattern. Fix: defense-in-depth — wenn captain_slot != null UND player not found, hasCaptain=false (treat as no-captain). |

## 8. Self-Verification Commands

```bash
# AC-01: heroMode export check
grep -n "heroMode" src/app/\(app\)/hooks/useHomeData.ts

# AC-02..04: Logik-Branch coverage
grep -nE "heroMode\s*=\s*'(manager|scout|cta-new)'" src/app/\(app\)/hooks/useHomeData.ts

# AC-05: Dispatcher-Pattern in HomeStoryHeader, GW-Bar persistent
grep -nE "heroMode\s*===\s*'manager'|<GameweekStatusBar" src/components/home/HomeStoryHeader.tsx

# AC-10: i18n-Keys vorhanden in beiden Locales
for key in "home.manager.gwLabel" "home.manager.lineupSet" "home.manager.lineupCta" "home.manager.captainSet" "home.manager.captainCta"; do
  for locale in de tr; do
    grep -q "\"${key#*.}\"" "messages/${locale}.json" || echo "MISSING: $key in $locale"
  done
done

# AC-14: pickScopedEvent extrahiert
grep -n "pickScopedEvent" src/components/home/helpers.tsx src/components/home/GameweekStatusBar.tsx

# F-01: useLeagueScope import
grep -n "useLeagueScope" src/app/\(app\)/hooks/useHomeData.ts

# Tests grün
pnpm exec vitest run src/components/home/__tests__/ManagerBlock.test.tsx \
                     src/components/home/__tests__/helpers.test.tsx \
                     src/app/\(app\)/hooks/__tests__/useHomeData.test.ts

# tsc clean
pnpm exec tsc --noEmit
```

## 9. Anil-Decisions (D64) — RESOLVED

| # | Frage | Decision | Resolution-Note |
|---|-------|----------|-----------------|
| **A** | Hero-Mode-Switch-Architektur | **b** (HomeStoryHeader = Dispatcher) | Wrapper-Continuity, GW-Bar bleibt persistent |
| **B** | heroMode-Source | **a** (Derived in useHomeData) | useHomeData hat alle Inputs nach F-01-Fix |
| **C** | Manager-Block-Scope | **a** (Minimal: GW + Lineup + Captain) | Slice 263+267 fügen Rest |
| **D** | Cold-Start-Strategie | **a** (Persist-Cache reicht ~<50ms) | Reviewer-Korrektur (war ursprünglich „c", Wiring-Annahme falsch) |
| **E** | TR-Wording | **a** (Tabelle akzeptiert, **OHNE** Greeting-Key — F-05) | Existing Pattern „Hoş geldin" bleibt für Scout, Manager nutzt firstName-Sub-Header |

**TR-Wording (final, post-F-05):**

| Key | DE | TR |
|-----|-----|-----|
| `home.manager.gwLabel` | „Spieltag {n}" | „Hafta {n}" |
| `home.manager.lineupSet` | „Aufstellung gesetzt" | „Kadro hazır" |
| `home.manager.lineupCta` | „Aufstellung wählen" | „Kadroyu seç" |
| `home.manager.captainSet` | „Kapitän: {name}" | „Kaptan: {name}" |
| `home.manager.captainCta` | „Kapitän wählen" | „Kaptan seç" |

(Keine `home.manager.greetingPrefix` — firstName analog Scout-Mode genutzt.)

## 10. Proof-Plan

| Proof-Typ | Artefakt | Kommando |
|-----------|----------|----------|
| Unit-Tests grün | `worklog/proofs/262-tests.txt` | `pnpm exec vitest run src/components/home/__tests__/ManagerBlock.test.tsx src/components/home/__tests__/helpers.test.tsx src/app/\(app\)/hooks/__tests__/useHomeData.test.ts > worklog/proofs/262-tests.txt 2>&1` |
| tsc clean | `worklog/proofs/262-tsc.txt` | `pnpm exec tsc --noEmit > worklog/proofs/262-tsc.txt 2>&1` |
| Mobile-393px Manager-Mode | `worklog/proofs/262-manager-393.png` | qa-visual gegen bescout.net post-Deploy (User mit aktive GW in scoped Liga) |
| **Mobile-393px Scout-Mode (Regression-Proof, F-09)** | `worklog/proofs/262-scout-393.png` | qa-visual gegen bescout.net (Liga ohne aktive GW ODER Liga-Switch zu inaktiver) — Greeting + Hero-Number + Pills + Story unverändert vs. Slice-261-pre-Diff |
| Liga-Switch Flicker-Test (F-08) | `worklog/proofs/262-liga-switch.mp4` | Anil-Mobile-PROVE Slow-Motion-Recording 60fps, Liga-Switch-Tap, Frame-für-Frame |

## 11. Scope-Out (explizit NICHT drin)

- Liga-Rang-Pill → Slice 263
- Streak-Risk-Indikator (Loss-Aversion) → Slice 263 + 265
- Live-Score-Widget mit Realtime-Channel → Slice 267
- ActionRequiredStack (Captain-FOMO als separater Stack) → Slice 264
- Mystery-Box-Promotion in Hero → Slice 264+
- 0-Holdings + Aktive GW = kombinierter Manager+Scout-CTA-Layout → Slice 263 (Slice 262 hat NUR ManagerBlock-internal-Adaptation)
- Cache für `getPlayerPriceChanges7d` → Slice 268 (live)
- Multi-Tab-Cross-Tab-Liga-Switch (EC-10 akzeptiert)

## 12. Stage-Chain (geplant)

```
SPEC v1 → REVIEWER-VOR-BUILD (REWORK 3xP0+4xP1+2xP2)  ✅ DONE
       → SPEC v2 (alle 9 Findings eingearbeitet, Anil-Decisions)  ✅ JETZT
       → IMPACT (skipped — kein DB/RPC/Service-Refactor, nur consume + neuer Hook + Component)
       → BUILD
       → REVIEW (Cold-Context-Reviewer-Agent gegen Spec v2)
       → PROVE (vitest + tsc + qa-visual + Anil Mobile-PROVE 2 Modi)
       → LOG
```

## 13. Pre-Mortem (5 Szenarien — final post-Reviewer)

| # | Was schief gehen könnte | Mitigation |
|---|-------------------------|-----------|
| PM-1 | `useLineupWithPlayers`-Query schlägt fehl (Network/RLS) → Render-Crash | EC-08 + EC-11: Defensive Default `hasLineup=false`/`hasCaptain=false`, kein throw, getLineupWithPlayers wirft → React-Query retry |
| PM-2 | heroMode wechselt zu früh (events-Cache leer als „kein active GW" interpretiert) → Manager-Mode unsichtbar während GW läuft | F-02-Decision D=a: Persist-Cache füllt useEvents <50ms aus localStorage. Akzeptabel. Alternative bei Drift: PM-2-Watch via Sentry-Custom-Event „heroMode-flicker-cnt". |
| PM-3 | Manager-Mode rendert in Liga ohne aktive GW (false-positive) | `pickScopedEvent`-Filter (extrahiert in helpers, getestet in helpers.test.tsx) — gleicher Source wie GameweekStatusBar (F-06). Drift ausgeschlossen durch Single-Source. |
| PM-4 | TR-Wording falsch („Kadro hazır" Possessive-Suffix) → Anil-Reject post-BUILD | E=a vorab approved. Bei Anil-Reject post-BUILD: 1-File-Edit messages/tr.json, kein Code-Touch. |
| PM-5 | HomeStoryHeader-Refactor bricht Scout-Mode (Status-quo) durch versehentliche Body-Änderung | F-09: Scout-Mode-Regression-Proof als 2. PROVE-Step. Plus: Tests für Scout-Branch unverändert. |
| PM-6 (NEU) | `pickBarEvent` → `pickScopedEvent` Rename in GameweekStatusBar bricht Slice 261 (live!) | F-06: GameweekStatusBar-Edit ist 1 Import + 1 Rename. tsc fängt das. Plus: Slice 261 hat eigene Tests die mitlaufen. |

## 14. Notes

- D62-Pflicht erfüllt: Reviewer-VOR-BUILD hat 7 Findings vor BUILD-Start gefangen (3xP0 hätten sicher Revert ausgelöst — F-01 Import-fehlt = silent heroMode='scout'-always; F-02 Wiring-Annahme falsch; F-03 Wrapper-Bruch).
- D63-Continuity: Slice 263 erweitert ManagerBlock um Liga-Rang + StreakRisk + Scout-Block-Component.
- Compliance: ManagerBlock bleibt im Manager-Register (keine Asset-Klasse-Sprache). „Kapitän" ist Football-Manager-Standard, kein Trading-Vokabular.
- post-Slice-262 Knowledge-Capture-Kandidat: shared-helper-extraction-Pattern (F-06) als common-errors.md-Eintrag wenn anderer Slice ähnlich Duplicate-Logic-Drift-Risk hat.
