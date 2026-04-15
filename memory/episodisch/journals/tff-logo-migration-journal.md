# Backend Journal: TFF Club-Logo-Migration (Multi-League Phase 1 Task 1)

## Gestartet: 2026-04-15

### Verstaendnis
- Was: 9 TFF-Clubs haben broken `/clubs/*.png` Logo-URLs → Migration auf api-sports.io CDN
- Betroffene Tabellen: `clubs` (UPDATE only, 9 Rows)
- Betroffene Services: keine direkten Service-Aenderungen — nur DB-Daten-Korrektur
- Risiken:
  - API-Sports hat kein Logo fuer Club (404) → HEAD-Check pflicht
  - Falsche `api_football_id` → vor UPDATE verifizieren
  - Rate-Limit (API-Football Pro: 10 req/sec, 9 Calls → null Problem)

### Strategie (Approach A — Empfohlen)
1. Pre-Flight: JSON-Snapshot der 9 Rows fuer Rollback
2. Script `scripts/fix-tff-logos.mjs` nach Muster von `import-league.mjs`:
   - `/teams?id={api_football_id}` → `response[0].team.logo` auslesen (authoritative)
   - HTTP-HEAD auf neue URL → 200 pflicht
   - UPDATE `clubs.logo_url` WHERE id = UUID
3. Verify-SQL: 0 Rows mit broken Logo in TFF 1. Lig
4. OPEN-FOUND: Slug-Typos `istaciospor` + `keciorenguru` dokumentieren, NICHT fixen (Route-Breaking)

### Entscheidungen
| # | Entscheidung | Warum |
|---|--------------|-------|
| 1 | Script statt Migration | API-Football-Roundtrip noetig (authoritative Logo-URL aus API) |
| 2 | Dry-Run-First | Pflicht per Briefing, zeigt 9 geplante Updates |
| 3 | ENV-Pfad: Main-Repo `C:/bescout-app/.env.local` | Worktree hat kein .env.local, Main hat alle Keys |
| 4 | Rollback als JSON, nicht SQL-Dump | Scope ist 9 Rows, JSON reversibel via UPDATE-Loop |

### Fortschritt
- [x] Rollback-JSON erstellen (im Script integriert — atomisch pro Run)
- [x] Script `scripts/fix-tff-logos.mjs` schreiben
- [x] Dry-Run: 9 geplante Updates verifizieren
- [x] Live-Run
- [x] Verify-SQL
- [ ] Commit + Output-Report

### Runden-Log

**Runde 1 — Dry-Run #1 (FAIL bei Reachability-Check):**
- Erwartet: HEAD 200 auf `https://media.api-sports.io/football/teams/3584.png`
- Tatsaechlich: HEAD 403 Forbidden (CDN blockt HEAD-Requests)
- Root-Cause: api-sports.io-CDN erlaubt nur GET (nicht HEAD). Curl zeigt: GET=200, HEAD=403.
- Fix: `httpHead()` → `GET` mit `Range: bytes=0-0` (minimal-byte-fetch). Accept 200 oder 206.

**Runde 2 — Dry-Run #2 (PASS):**
- Alle 9 Clubs: API-Football-Lookup OK, Reachability 206 (Partial), URL-Pattern korrekt
- API Calls: 9 (nur 1 pro Club via /teams?id={X})
- Rollback-File geschrieben

**Runde 3 — Live-Run (PASS):**
- 9/9 UPDATEs erfolgreich
- Post-Verify: all 9 Rows auf https://media.api-sports.io/football/teams/{id}.png

**Runde 4 — Independent Verify (PASS):**
- Verify 1: 0 TFF-Clubs mit non-https logo_url (down from 9 pre-migration)
- Verify 2: alle 9 Target-Clubs korrekt aktualisiert
- Verify 3: 20/20 TFF 1. Lig Clubs jetzt auf https:// (vorher 11/20)

### AFTER-Phase Checks
- [x] Types propagiert: N/A (Daten-Korrektur, kein Type-Change)
- [x] i18n komplett: N/A (keine UI-Text-Aenderung)
- [x] Column-Names korrekt: `logo_url`, `api_football_id` (verifiziert gegen `scripts/import-league.mjs:142,145`)
- [x] Alle Consumers aktualisiert: N/A — logo_url ist Anzeige-Feld, wird via next/image konsumiert, kein Service-Filter darauf
- [x] Service Layer eingehalten: Script nutzt Supabase Service-Role direkt (ist Admin-Op, nicht Client-Path)
- [x] Edge Cases bedacht:
  - CDN-HEAD-403 Quirk → GET-Range Fallback
  - API-Football 404 → Script aborted mit Rollback-File preserved
  - HEAD-Status 200 OR 206 akzeptiert
- [x] CHECK Constraints eingehalten: N/A (logo_url hat keinen CHECK)
- [x] RLS-Context: Service-Role bypasst RLS — Admin-Script, kein Client-Code
- [x] Rollback-Plan: JSON-Snapshot vor jedem UPDATE, reapplyable

### OPEN-FOUND (nicht im Scope, dokumentiert)
1. **Slug-Typo: `istaciospor` → sollte `istanbulspor` sein** (İstanbulspor, id 84c09600-...)
2. **Slug-Typo: `keciorenguru` → sollte `kecioerengucu` sein** (Keçiörengücü, id 40ccd992-...)
3. Beide NICHT im Scope — Slug-Aenderung ist Breaking-Change (potenziell Route-Key)
4. Empfehlung fuer separaten Task: `/impact` Check ob Slug als Route/URL-Param genutzt wird, dann gezielter Task dafuer.

### CDN-Reachability-Pattern (neu fuer LEARNINGS)
- `media.api-sports.io`: GET=200, HEAD=403. Viele Image-CDNs verhalten sich so.
- Reachability-Checks in Scripts: IMMER GET mit `Range: bytes=0-0` statt HEAD (robust gegen CDN-Quirks).

