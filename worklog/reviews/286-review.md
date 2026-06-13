# Slice 286 Review — Cold-Load-Race LeagueScopeHeader/LeagueBar

**Reviewer:** Cold-Context-Agent (read-only)
**Verdict:** PASS
**Time-spent:** ~14 min

## Findings

| # | Severity | Location | Issue | Fix |
|---|----------|----------|-------|-----|
| 1 | NIT | `clubs/page.tsx:55` | `getLeaguesByCountry(filterCountry)` in useEffect (gated auf filterCountry) NICHT in Spec-Out-of-Scope gelistet. Genuin safe (Effect feuert erst nach User-Country-Select → Cache warm). | Spec-Enumeration unvollständig — in LOG als „click/effect-handler, cache-warm"-Kategorie notieren. Kein Code-Fix. |
| 2 | INFO | `leagues.ts:99-112` | emitCacheChange dual-path bestätigt: init (nach cacheReady=true) + refresh (delegiert an init → re-emit). Error-Pfad: kein emit (cacheReady bleibt false) — ehrliches No-Data-Signal. | Korrekt, kein Fix. |
| 3 | INFO | `leagueScopeStore.ts:220` | `getActiveLeagues()` Stage-3-Cascade ist auch Cache-Reader, läuft aber in `hydrateLeagueScope` gated auf `cachesReady` (ClubProvider:132). Nicht race-prone. | Korrekt out-of-scope. |

**Keine CRITICAL / keine REWORK.**

## Verifiziert

1. **useSyncExternalStore:** stabile Modul-Refs (kein Resubscribe-Storm), getServerSnapshot vorhanden (SSR=0==Client-initial=0, kein Hydration-Mismatch), primitiver number-Snapshot (Object.is stabil, kein Loop), kein setState-in-render. ✓
2. **Vollständigkeit:** alle 3 sichtbaren-Filter-useMemos abgedeckt. Out-of-scope (KaderTab self-heal via bestandItems, BestandView+clubs:55 click/effect-warm, CreateClubModal admin, leagueScopeStore gated) korrekt begründet. ✓
3. **emitCacheChange dual-path:** init + refresh beide gedeckt. ✓
4. **Layer-Sauberkeit:** leagues.ts framework-frei, Hook isoliert ('use client'), CountryBar/LeagueBar binden an Daten-Quelle statt ClubContext (Design-Ziel erfüllt). ✓
5. **Test-Mock-Expansion:** LeagueScopeHeader.test Mock erweitert; SpieltagTab/ClubProvider/leagueScopeStore rendern keine Hook-Konsumenten → brechen nicht. ✓
6. **Pattern-Abgleich:** neue Bug-Klasse (non-reaktiver Module-Cache + useMemo-stale-deps). Verletzt Slice 254 NICHT (length<=1-Guards korrekt erhalten für echte 1-Liga-Länder). Kein Slice-267-Map-Serialization-Issue. ✓

## Positive

- Root-Cause-Fix (reaktives Signal an der Daten-Quelle) statt Symptom-Patch. Textbook-korrektes useSyncExternalStore-Primitiv für „external mutable store → React".
- Saubere Layer-Trennung, Doc-Comments erklären das Warum inline.
- Out-of-scope-Konsumenten bewusst analysiert statt ignoriert.

## Learnings (für LOG → errors-frontend.md)

- **Neue Pattern-Klasse:** „Non-reaktiver Module-Cache + useMemo-stale-deps Cold-Load-Race". Async-geladener Module-Cache (leagues.ts/clubs.ts-Familie) in useMemo mit deps die sich bei cache-ready nicht ändern → Render captured leere Liste, recomputet nie → `length<=1 return null`-Guards kollabieren UI. Fix: Version-Counter + useSyncExternalStore-Hook als zusätzliche useMemo-dep.
- **Backlog:** `clubs.ts` hat dasselbe non-reaktive Pattern (`initClubCache`/`getClub`). Falls je ein render-time `useMemo(() => getClub(...))` entsteht → gleiche Race. Backlog-Notiz wert.
