# Slice 286 — Cold-Load-Race: LeagueScopeHeader/LeagueBar rendern leer

**Slice-Type:** UI + Service (lib)
**Größe:** M
**CEO-Scope:** Nein (kein Money/Security/Breaking — reaktiver Render-Fix)
**Datum:** 2026-06-13

---

## 1. Problem-Statement (Evidence)

Entdeckt bei Slice-285-Verifikation (`worklog/proofs/285-rankings-header.md`, Nebenbefund).

Der Liga-Filter (`CountryBar` + `LeagueBar` im `LeagueScopeHeader`) rendert **app-weit
komplett leer** bei **Hard-Navigation / Hard-Refresh / PWA-Cold-Start**. DOM-verifiziert
auf bescout.net (jarvis-qa): `[data-testid="league-scope-header"]` → `childCount: 0`,
`buttonCount: 0` auf /rankings UND /clubs. Bei warmer SPA-Navigation: 9 Buttons korrekt.

**Root-Cause-Kette:**
1. `ClubProvider.tsx:167` rendert Children sofort, ohne Gating auf `cachesReady`.
2. `initLeagueCache()` (`leagues.ts:46`) ist async (DB-Load) → `leagueCache` zunächst leer.
3. Race-prone useMemos lesen den Cache beim ersten Render (leer) und recomputen NIE,
   weil der Cache-Load kein Re-Render mit geänderten deps triggert:
   - `LeagueScopeHeader.tsx:52` `useMemo(() => getCountries(locale), [locale])`
   - `FantasyContent.tsx:108` `useMemo(() => getCountries(locale), [locale])`
   - `LeagueBarShared.tsx:30` `useMemo(() => getAllLeaguesCached()…, [country])`
4. Leere Liste → `CountryBar.tsx:22` / `LeagueBarShared:38` `if (length <= 1) return null`
   → Bar verschwindet komplett.

**Impact:** Liga-Filter unsichtbar bei Cold-Load (auf Mobile/PWA häufig) → User kann nicht
nach Liga filtern. Potenzieller Beta-Blocker (Live-Beta).

## 2. Lösungs-Design

**Reaktives Cache-Ready-Signal** in `leagues.ts` (statt non-reaktivem Module-State):
- Version-Counter + Listener-Set + `subscribeLeagueCache()` + `getLeagueCacheVersion()`.
- `emitCacheChange()` am Ende von `initLeagueCache()` UND `refreshLeagueCache()`.
- React-Hook `useLeagueCacheVersion()` via `useSyncExternalStore` (React-18-stable,
  SSR-safe mit getServerSnapshot=getLeagueCacheVersion → 0 auf Server).
- Jede race-prone useMemo bekommt `cacheVersion` als zusätzliche dep → recomputet wenn
  Cache ready wird → `getCountries`/`getAllLeaguesCached` liefern Daten → Bars rendern.

Warum nicht `useClub().loading` als dep: `CountryBar`/`LeagueBarShared` liegen in
`src/components/ui/` (generische, wiederverwendbare Layer) — sollen nicht von ClubContext
abhängen. Das Signal gehört an die Daten-Quelle (`leagues.ts`). Cleaner + deckt alle Caller.

Warum nicht ClubProvider gated rendern: würde GANZE App hinter Cache-Load blockieren
(Render-Verzögerung für alle Seiten) — zu invasiv für ein Filter-Bar-Problem.

## 3. Betroffene Files

| File | Änderung | Begründung |
|------|----------|------------|
| `src/lib/leagues.ts` | + Version-Counter, `subscribeLeagueCache`, `getLeagueCacheVersion`, `emitCacheChange()` in init+refresh | Reaktive Quelle des Cache-Ready-Signals |
| `src/lib/hooks/useLeagueCacheVersion.ts` (NEU) | `useSyncExternalStore`-Hook | React-Bindung an die Subscription |
| `src/components/layout/LeagueScopeHeader.tsx` | `cacheVersion` in useMemo:52 deps | CountryBar-Quelle /rankings+/clubs |
| `src/app/(app)/fantasy/FantasyContent.tsx` | `cacheVersion` in useMemo:108 deps | CountryBar-Quelle /fantasy |
| `src/components/ui/LeagueBarShared.tsx` | `cacheVersion` in useMemo:30 deps | LeagueBar-Quelle app-weit |

**Out:** `KaderTab:249` (self-healt via `bestandItems`-dep), `BestandView:239` (Click-Handler,
Cache ready), `CreateClubModal` (Admin, niedrige Prio). Optional als Backlog-Notiz.

## 4. Code-Reading-Liste (VOR Implementation)

| File | Zweck | Frage |
|------|-------|-------|
| `src/lib/leagues.ts:46-95` | init/refresh-Flow | ✅ `cacheReady`-Flag + module-state, kein Emit. Wo `emitCacheChange()` einhängen |
| `src/components/providers/ClubProvider.tsx:89-100` | Cache-Init-Trigger | ✅ Promise.all([initClubCache, initLeagueCache]) → setCachesReady |
| `src/components/ui/CountryBar.tsx:22` | null-Guard | ✅ `length<=1 return null` — bestätigt warum leer |
| `src/components/ui/LeagueBarShared.tsx:30-38` | useMemo + null-Guard | ✅ `getAllLeaguesCached()` in useMemo([country]) + `length<=1 return null` |
| `src/app/(app)/fantasy/FantasyContent.tsx:108` | eventCountries-Quelle | ✅ eigene useMemo, eigener Race |
| React `useSyncExternalStore` SSR-Verhalten | getServerSnapshot | Bestätigen: 3. Arg → 0 auf Server, kein Hydration-Mismatch (cacheVersion bei SSR=0, Client initial=0 → match) |

## 5. Pattern-References

- errors-frontend.md „TanStack v5: initialData vs placeholderData für Cold-Start" (Slice 268) — gleiche Familie „Cold-Start-State-Race".
- errors-frontend.md „Liga/Context-Switch State-Reset via prevRef" (Slice 254) — `CountryBar length<=1 return null` ist der Slice-254-„Filter-as-audience-choice"-Guard; hier ist die leere Liste aber Cache-Race, nicht Result-Filter.
- errors-frontend.md „Map/Set-typed React-Query-Data" (Slice 267) — Defense-in-Depth-Reconstruction-Denkweise.

## 6. Acceptance Criteria

- **AC-1 [HAPPY/COLD-LOAD]:** Nach Hard-Navigation (`page.goto`) auf /rankings ist der
  Liga-Header sichtbar (CountryBar + LeagueBar mit Buttons), sobald Cache geladen.
  VERIFY: Playwright `page.goto('/rankings')` → warte → `[data-testid=league-scope-header]`
  `buttonCount >= 6`. FAIL-IF: childCount 0 nach Cache-Load.
- **AC-2 [CROSS-PAGE]:** Gleiches Verhalten auf /clubs + /fantasy (Cold-Load → Header füllt sich).
  VERIFY: Playwright je Page. FAIL-IF: leer.
- **AC-3 [REGRESSION-WARM]:** Warme SPA-Navigation weiterhin korrekt (keine Doppel-Render,
  kein Flicker-Loop). VERIFY: Klick-Nav → 9 Buttons. FAIL-IF: leer/doppelt/Endlos-Recompute.
- **AC-4 [SSR]:** Kein Hydration-Mismatch-Warning in Console (cacheVersion SSR=0 == Client-initial=0).
  VERIFY: Console 0 hydration-errors. FAIL-IF: „Text content did not match" o.ä.
- **AC-5 [BUILD]:** `pnpm exec tsc --noEmit` grün + bestehende Tests grün
  (LeagueScopeHeader.test.tsx, FantasyContent.test.tsx, leagueScopeStore.test.ts).

## 7. Edge Cases

| Case | Erwartung |
|------|-----------|
| Cache-Load schlägt fehl (fail-open in ClubProvider) | leagueCache bleibt leer → Header bleibt leer (kein Crash). emitCacheChange feuert trotzdem (refresh-Pfad) — akzeptabel, Daten fehlen real. |
| Locale-Wechsel nach Cache-ready | useMemo([locale, cacheVersion]) recomputet via locale-dep — unverändert korrekt. |
| Mehrfaches emitCacheChange (init + refresh) | Idempotent — Version inkrementiert, useMemos recomputen, getCountries deterministisch. Kein Loop (Daten stabil). |
| anon-User (kein ClubProvider-Cascade) | initLeagueCache läuft trotzdem (ClubProvider mountet immer) → Header füllt sich. |
| useSyncExternalStore SSR | getServerSnapshot=0, Client initial=0 → kein Mismatch. |

## 8. Self-Verification Commands

```bash
# Alle race-prone useMemos haben cacheVersion-dep:
grep -nE "getCountries|getAllLeaguesCached" src/components/layout/LeagueScopeHeader.tsx \
  src/app/\(app\)/fantasy/FantasyContent.tsx src/components/ui/LeagueBarShared.tsx
# Erwartung: jede useMemo-Zeile hat cacheVersion in deps.

# Subscription + emit in leagues.ts:
grep -nE "emitCacheChange|subscribeLeagueCache|getLeagueCacheVersion|cacheVersion" src/lib/leagues.ts

# tsc + Tests:
pnpm exec tsc --noEmit
CI=true pnpm exec vitest run src/components/layout/__tests__ src/app/\(app\)/fantasy/__tests__ src/features/shared/store/__tests__
```

## 9. Open-Questions

- **Autonom-Zone (Claude):** Hook-Datei-Pfad, Subscription-Implementierung, dep-Platzierung.
- **Keine CEO-Zone** — kein Money/Security/Wording.
- **Geklärt (Anil):** „Slice 286 jetzt fixen" + Root-Cause-Fix bevorzugt.

## 10. Proof-Plan

- `pnpm exec tsc --noEmit` + vitest Output → `worklog/proofs/286-cache-race.md`
- Post-Deploy Playwright Cold-Load (`page.goto`) /rankings + /clubs + /fantasy →
  Screenshots + DOM-buttonCount-Verify → in Proof-Doc. (Der entscheidende Test:
  Hard-Nav, nicht warme SPA-Nav.)

## 11. Scope-Out

- KEIN ClubProvider-Gating (zu invasiv).
- KEINE Umstellung von leagueCache auf zustand (größerer Refactor — Subscription reicht).
- KaderTab/BestandView/CreateClubModal nicht angefasst (self-healing/safe/Admin).
- KEINE Änderung an `CountryBar`/`LeagueBar` null-Guards (`length<=1` bleibt korrekt für
  echte 1-Liga-Länder wie England→nur PL).

## 12. Stage-Chain (geplant)

SPEC → IMPACT (inline, Konsumenten gelistet) → BUILD → REVIEW (Cold-Context-Reviewer —
cross-cutting, kein Self-Review) → PROVE (Cold-Load-Screenshots) → LOG +
common-errors.md-Pattern (neue Bug-Klasse „non-reaktiver Module-Cache + useMemo-stale-deps").

## 13. Pre-Mortem (M — optional, hier sinnvoll)

1. **useSyncExternalStore Hydration-Mismatch** → getServerSnapshot=0 == client-initial=0 mitigiert. Verify AC-4.
2. **Endlos-Recompute-Loop** falls emitCacheChange wiederholt feuert → Daten stabil, getCountries deterministisch; emit nur bei init(1×)+refresh(selten). Kein setState im Render.
3. **Vergessener Konsument** → Self-Verify-grep + Cold-Load-Test je Page (rankings/clubs/fantasy) fängt es.
4. **Test-Breakage** durch neuen Hook-Import in LeagueScopeHeader → vitest-Mock für useLeagueCacheVersion ggf. nötig (mock leagues.ts subscription). Reviewer-Check.
5. **SSR/'use client'** — LeagueBarShared+LeagueScopeHeader sind 'use client'; useSyncExternalStore OK. leagues.ts bleibt framework-frei (Hook in separater Datei).
