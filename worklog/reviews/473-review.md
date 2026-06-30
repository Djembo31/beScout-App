# Review — Slice 473 leagueScopeStore SSR-safe (self-review)

**Typ:** self-review (XS, SSR-Init-Timing-Fix; kein Money/Security/Filter-Logik-Change) · **Datum:** 2026-06-30

## Kontext
472-Live-Walk fand React #418 (5×) + #423 (voller Root-Re-Render) auf JEDER authed Page → LCP-Win zunichte. Root-Cause Code+Runtime bestätigt: `leagueScopeStore.ts:141` `const initialPersisted = readFromStorage()` seedet Store-Init aus localStorage bei Modul-Init. Server (kein window) → `leagueName=''`; Client → cached `'Süper Lig'` (localStorage verifiziert: `{leagueName:"Süper Lig",countryCode:"TR",...}`). 472 SSRt erstmals den authed Shell (Liga-Selektor rendert `leagueName`) → First-Render-Divergenz.

## Änderung
1. `leagueScopeStore.ts`: Modul-Init-Seed entfernt; Store init = Server-Defaults (null/''/''). Neue `hydrateFromStorage()`-Action liest+validiert localStorage (idempotent, no-op wenn Scope schon gesetzt).
2. `ClubProvider.tsx`: Client-Mount-Effect `useEffect(() => hydrateFromStorage(), [])` — läuft post-mount (First-Render server==client) und vor der Cascade (declared earlier → persisted manual pick gewinnt via bestehendem „scope already set → skip"-Guard in hydrateFromCascade).
3. Tests: 4 Persistenz/EC-03-Tests auf expliziten `hydrateFromStorage()`-Trigger umgestellt (Verhalten identisch, nur client-getriggert statt Modul-Init) + 1 neuer Regressions-Test (populated localStorage → Init bleibt leer).

## Selbst-Check (gegen errors-frontend.md, performance.md, §0)
- **SSR-Korrektheit:** Store init jetzt deterministisch identisch server/client → First-Render-Match → kein #418/#423 mehr (Live-Walk = definitiver Beweis, pending).
- **Verhaltens-Erhalt:** persisted pick gewinnt weiter (hydrateFromStorage vor Cascade); EC-03-Corruption-Cleanup erhalten (jetzt via Action statt Modul-Init); Cascade-Stages 1-3 unverändert.
- **Schnitt-Regel (§0):** kein zweiter Weg — der EINE localStorage-Read wandert von Modul-Init in die Action, nicht dupliziert. readFromStorage()/writeToStorage() unverändert.
- **Sibling-Scan:** `localStorage.getItem`-grep über src → nur leagueScopeStore liest bei Modul-Init; alle anderen in useEffect/Handler/lazy-Init → kein Whack-a-Mole.
- **Flash-Tradeoff:** kurzes Fenster Store=leer (mount→hydrateFromStorage-Effect, ~1 Tick) → Selektor zeigt kurz „Alle Ligen" dann Pick. Korrekt + nötig für SSR-Sicherheit; Content kommt eh async via React Query (Skeleton-Phase überdeckt). Im Walk visuell prüfen.
- **Money/Security:** nicht berührt (reine Init-/Hydration-Timing; Filter-Logik, setLeagueScope, Invalidation unverändert).

## Verdict (self): PASS für Merge — **Gate = Live-Re-Walk** (Console #418/#423-frei + Liga-Selektor korrekt + 472-LCP-Win messbar). Build: tsc 0 · 18/18 leagueScope (inkl. Regressions-Test) · 30/30 Provider+Header.

## Learning (Knowledge-Capture nach Live-Bestätigung)
- **errors-frontend.md neue Klasse:** „Zustand/Store-Init aus localStorage bei MODUL-Init = SSR-Hydration-Mismatch." Server (kein window) → Default; Client → cached. Latент bis ein SSR-Pfad den Store-Wert im First-Render rendert (hier von 472 aktiviert). Fix: Store init = Server-Default, persisted Read in Client-Mount-Effect. **Detektor-Lücke:** `grep "const x = localStorage"` + Zustand-`persist()`-grep verfehlen `const x = readFromStorage()` (Funktionsaufruf-Wrapper) → Sibling-Scan muss `localStorage.getItem` über ALLE Store/Module-Top-Level abdecken, nicht nur direkte Zuweisung/Middleware.
