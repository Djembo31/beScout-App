# Slice 496 Review — D-39 anon /club Read-Gates

**Typ:** self-review (XS, gleiches `enabled:!!userId`-Gate-Pattern wie 495 + in-File-Precedent `useClubStanding(user ? clubId : undefined)` ClubContent.tsx:143; kein Money/Security-Verhalten)
**Verdict:** PASS

## Change (3 Files, 1 Muster)
1. `useClubData.ts:39` — `useClubRecentTrades(userId ? clubId : undefined, 5)` (`enabled:!!clubId` → false für anon).
2. `useClubData.ts:54` — News-useEffect `if (!clubId || !userId) return;` + deps `[clubId, userId]`.
3. `ClubContent.tsx:162` — `useEventPlayerPickRates(currentEventId, !!userId)` (Hook: `enabled: !!eventId && enabled`).

## Prüfung
- **Alle 3 RPCs `anon_exec=false` (Live-DB verifiziert)** → anon-Call scheiterte deterministisch (401). Gate verhindert den garantiert-scheiternden Call. Verhaltens-erhaltend: anon sah news/trades/pick-rates ohnehin nie (401→leer), sieht sie weiter nicht.
- **Precedent-Konsistenz:** identisches Muster wie `useClubStanding(user ? clubId : undefined)` (ClubContent.tsx:143, mit Kommentar „RLS blocks anon so query would fail + 5min invalid-cache") — ich vervollständige die in-File-Konvention für die 3, die sie verpassten.
- **authed unverändert:** userId present → alle 3 Argumente wie zuvor → Hooks feuern identisch. Kein authed-Regress.
- **exhaustive-deps:** News-Effect deps `[clubId, userId]` korrekt (beide gelesen). recent_trades/pick_rates via `enabled`-Arg → React-Query re-evaluiert bei userId-Change automatisch.
- **queryKey mit undefined clubId (recent_trades):** `qk.clubs.recentTrades(undefined!)` bei anon — identisch zum useClubStanding-Precedent, enabled:false → queryFn läuft nie, kein Fetch. Safe.
- **Kein Scope-Creep:** die übrigen useClubData-Hooks (bySlug/players/followers/holdings/fanRanking/…) 401'ten im sauberen anon-Walk NICHT → unberührt gelassen (bereits anon-safe oder eigen-gegated).

## Verifikation
- tsc --noEmit: exit 0
- vitest useClubData.test.ts + ClubContent.test.tsx: 44/44 passed
- Live anon /club Console (post-Deploy): siehe proof 496 (PROVE-Gate — Ziel: 0 der 3 401s).
