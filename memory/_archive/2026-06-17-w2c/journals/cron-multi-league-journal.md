# Backend Journal: AR-26+34 Cron Multi-League activeLeagues-Loop

## Gestartet: 2026-04-14

### Verstaendnis
- **Was:** `src/app/api/cron/gameweek-sync/route.ts` auf activeLeagues-Loop umbauen. Statt `getLeagueId()` single-env-var, iterieren ueber alle aktiven Ligen aus DB und pro Liga die komplette Sync/Score-Pipeline.
- **Warum:** 114 Clubs in 6 Ligen (BL/PL/SA/LL/SL/BL2) haben `active_gameweek=1` forever — Fantasy-Events in diesen Ligen werden NIE gescored. Beta-Blocker.
- **Betroffene Files:**
  - `src/app/api/cron/gameweek-sync/route.ts` — main handler
  - `src/lib/footballApi.ts` — evtl. `getLeagueId()` bleibt (Fallback), plus neuer server-side helper
  - `src/lib/leagues.ts` — client-side Cache, NICHT fuer cron
- **Betroffene Services:** KEINE (pure Route-Aenderung, nutzt supabaseAdmin)
- **Risiken:**
  1. **Timeout:** Vercel Pro max 60s, Hobby 10s. Bei 7 Ligen seriell = zu lang. Loesung: `Promise.allSettled` parallel, aber dann risk von API-Football Rate-Limits (10 req/sec free tier).
  2. **API-Football Rate Limit:** Parallel-Calls muessen throttled. Besser: seriell pro Liga, pro Liga parallel fuer Fixtures. Aber Timeout!
  3. **Scoped Phase B / clone_events / advance_gameweek:** Muss pro Liga getrennt laufen mit `clubs.league_id = liga.id` Filter. Aktueller Code nutzt `clubsToProcess` = Minimum-GW-Clubs global, das ist falsch.
  4. **Step-Log / logStep:** Gameweek differs per league, logs muessen `league_id` oder `league_short` tracken.
  5. **DB-Filter league_id vs api_football_id:** `leagues` hat beide, `clubs` hat `league_id` FK. Nutze `league_id`.

### Source-of-Truth fuer aktive Ligen
- DB `leagues.is_active` evtl. inkonsistent (Migration 20260413180000 hat neue Ligen mit `is_active=false` eingefuegt).
- Audit-Doc J4B-01 sagt: 134 clubs in 7 leagues, alle nutzen `active_gameweek`.
- **Beste Heuristik:** `DISTINCT league_id FROM clubs WHERE league_id IS NOT NULL` + join `leagues.api_football_id IS NOT NULL`. Das ist resilient und matcht tatsaechlichen Bedarf.
- Fallback: Filter auch `is_active=true` kombinierbar wenn Daten clean sind.

### Entscheidungen

| # | Entscheidung | Warum |
|---|--------------|-------|
| 1 | **Parallel mit Promise.allSettled** pro Liga | Timeout-Risiko. 7 Ligen seriell = > 30s pro Run. Parallel mit error-isolation. |
| 2 | **Filter via JOIN clubs+leagues** | `leagues.is_active` evtl. falsch. Clubs-Existenz ist wahre Aktivitaet. |
| 3 | **Pro-Liga GW-Scoping:** Innere Pipeline nutzt `league.id` fuer `clubsToProcess` | Aktueller Code processed global, das verschmutzt Phase B fuer non-TFF1. |
| 4 | **`leagueId` → `leagueApiId` im Loop, `league.id` fuer DB-Filter** | Explizite Namensgebung: API-Football `apiFootballId` vs Supabase UUID `id`. |
| 5 | **Per-Liga gameweek statt global minGw** | AR-26 Bug ist genau dass `minGw=1` falsch picked, weil non-TFF1 auf Gw=1 haengen. Jeder Club bekommt jetzt seine eigene Liga-spezifische Gw. |
| 6 | **Rate-Limit:** max 3 gleichzeitige Ligen via Batching** | API-Football 10 req/sec. Bei 7 Ligen × ~10 fixtures ~70 API-Calls. Parallel aber nicht alle auf einmal. **Revidiert:** `Promise.allSettled` fuer alle 7 ist ok wenn jeder Liga-Block intern seriell laeuft (siehe aktuelle Architektur). |
| 7 | **Rueckgabe-Struktur:** `leagues: [{short, gameweek, result}]` | Pro-Liga Status im Response. |
| 8 | **getLeagueId() bleibt** | Andere Callers (`src/app/api/admin/sync-contracts/route.ts`) nutzen es — out-of-scope. |

### Verify Plan
- tsc --noEmit clean
- Output-Struktur: `{ success, leagues: [{ short, gameweek, ... }], duration_ms }`
- Keine breaking changes an cron_sync_log Table (existing step-log Pattern behalten, nur `league_short` als Detail)

### Fortschritt
- [ ] Task 1: Architektur-Refactor — Pro-Liga Pipeline-Funktion extrahieren
- [ ] Task 2: activeLeagues-Query + Promise.allSettled Loop
- [ ] Task 3: logStep um league_short erweitern
- [ ] Task 4: Rueckgabe-Struktur multi-league
- [ ] Task 5: tsc --noEmit verifizieren
- [ ] Task 6: Self-Review + AFTER Phase

### Runden-Log
- **Runde 1:** Start — erste Pass.
