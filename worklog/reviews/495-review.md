# Slice 495 Review — anon /club resolveExpiredResearch-Gate

**Typ:** self-review (XS, dokumentiertes `enabled:!!userId`-Gate-Pattern, kein Money/Security-Verhalten)
**Verdict:** PASS

## Change
`src/components/club/hooks/useClubData.ts` — der fire-and-forget `resolveExpiredResearch()`-Effect bekommt `if (!userId) return;` + deps `[]`→`[userId]`.

## Prüfung gegen common-errors / patterns
- **Auth-Gate für auth-gated Mutation (korrekt):** Live-DB verifiziert `resolve_expired_research` = `anon_exec=false` → anon-Call scheitert deterministisch. Gate verhindert den garantiert-scheiternden Call. Kein Verhaltens-Change für authed.
- **Sole-Resolution-Path erhalten:** Live-DB verifiziert **kein pg_cron** fährt die RPC → der Client-Trigger ist der einzige Auflösungspfad. Das Gate entfernt ihn NICHT, es beschränkt ihn auf authed (die ihn ohnehin schon triggerten). Auflösung läuft unverändert bei jedem authed Club-Besuch.
- **exhaustive-deps korrekt:** `[userId]` — Effect feuert wenn userId verfügbar wird (authed Mount ODER Login-while-on-page). Für anon bleibt userId `undefined` → Effect-Body no-op. Kein Lint-Verstoß (userId ist die einzige gelesene Variable).
- **Hooks vor early returns:** Der `if (!userId) return` steht INNERHALB des useEffect-Bodys, nicht vor Hook-Aufrufen → keine Rules-of-Hooks-Verletzung (der Hook wird immer aufgerufen).
- **60s-Modul-Debounce (`_resolvePromise`/`_resolveTimestamp` in research.ts) unberührt** — greift für authed weiter; für anon war er wirkungslos (error→`_resolvePromise=null`→neuer Call je Mount), jetzt gar kein Call.

## Scope-Disziplin
- `get_club_news_teasers` (throwt ebenfalls anon permission-denied, `anon_exec=false`) NICHT angefasst — CEO-Produktentscheid (soll anon Club-News sehen?), separat P2. Kein Scope-Creep.
- Lazy-cron-Architektur-Smell (Maintenance-Mutation an /club-Mount + kein Cron) als P2 geparkt, nicht mit-refactored.

## Verifikation
- tsc --noEmit: exit 0
- vitest useClubData.test.ts: 27/27 passed
- Live-Console (anon /club post-Deploy): siehe proof 495 (PROVE-Gate).
