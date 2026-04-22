# Slice 144 — B3 TM-Squad-Page-Scraper (M)

**Datum:** 2026-04-22
**Slice-Größe:** M (4-5 Files, 3-4h)
**CEO-Scope:** Nein (Data-Import-Infrastruktur, keine Money/Security, no User-Visible-Behavior ändernd)

## Kontext

Aktueller TM-Scraper (`transfermarkt-search-batch` + `sync-transfermarkt-batch`) macht pro Player 2 Requests:
1. Search: `/schnellsuche?query=<name>` → Match-Scoring → `player_external_ids`
2. Profile: `/profil/spieler/<tm_id>` → MV + Contract + Nationality + Shirt

Bei ~5000 Playern → **~10.000 Requests / Sync-Zyklus**, Vercel-Hobby-Timeout hart, Cloudflare-Block greift bei Vercel-IPs, TM-Rate-Limit permanent gefährdet.

Slice 141b hat `club_external_ids(source='transfermarkt')` für alle 134 Clubs gefüllt (100% mapped). Damit lässt sich die Squad-Page-Strategie nutzen:

- **Neue Strategie:** Pro Club 1 Request auf `/<slug>/startseite/verein/<tm-club-id>` liefert komplette Kader-Liste (~25-70 Players pro Squad-Page) mit Shirt-Number, Position, Name, TM-Player-ID, und meist auch MV + Contract direkt in der Tabelle.
- **Einsparung:** 10.000 Player-Requests → 134 Club-Requests = **75× weniger Netzwerk-Last**.
- **Vorteil:** Garantierte Club-Zuordnung (kein Fuzzy-Match-Risk wie in Search), Zero-False-Positive-Risk für Cross-Club-Kontamination.

## Ziel (1 Satz)

Ein Scraper-Script / Route, die mittels TM-Squad-Page für jeden Club alle seine aktuellen Spieler identifiziert, mapped (`player_external_ids.source='transfermarkt'`) und — soweit in der Squad-Table verfügbar — MV + Contract-End + Shirt direkt aus der Squad-Page extrahiert, ohne pro Player eine separate Profile-Page zu öffnen.

## Betroffene Files

1. `src/lib/scrapers/transfermarkt-squad.ts` *(neu)*
   - `parseSquadTable(html, opts): SquadEntry[]`
   - `SquadEntry` type: `{ tmPlayerId, tmSlug, displayName, shirtNumber, positionCode, marketValue?, contractEnd? }`
   - Multi-anchor-Strategie (analog Slice 141b):
     - Primary: `table.items tbody tr` mit `class="odd|even"` — Table-Row-Parser
     - Per-row: regex auf `hauptlink > a href="/.../profil/spieler/<id>"` für Player-ID
     - shirt-number: `rn_nummer` td content
     - position: `class="posrela"` oder td[3] text ("Torwart", "Innenverteidiger", ...)
     - MV (optional): letzte td text "€ X.XXX Mio."
     - Contract (optional): zweitletzte td "30.06.2028"
   - Robustheit: erwartet min 5 tds pro Row, skipt malformed

2. `src/lib/scrapers/transfermarkt-squad.test.ts` *(neu)*
   - Mini-HTML-Fixture für Squad-Table (~5 players)
   - Edge-Cases: fehlende shirt, keiner MV, Leihspieler (abgesondert am Ende der Tabelle)

3. `scripts/tm-squad-scrape-local.ts` *(neu, lokal-ausführbar via Playwright)*
   - Lädt alle Clubs mit `club_external_ids(source='transfermarkt')`
   - Pro Club: Squad-Page fetchen, parseSquadTable, diff gegen DB:
     - **Neue Player:** INSERT `players` row + UPSERT `player_external_ids`. NULL-Defaults für unbekannte Fields; MV/Contract aus Squad-Table wenn vorhanden.
     - **Bekannte Player (via TM-ID-Match):** UPDATE shirt_number + (wenn neuer) MV/contract_end
     - **Club-Wechsel-Detection:** Player mit `players.club_id=X` aber in `tm-club-Y`-Squad → `club_id=Y` (entspricht Transfer). Gate: nur wenn letzter Player-Update > 24h oder explizit `--allow-transfers`.
     - **Retired/Loan-Out-Detection:** Player in DB mit `club_id=X` aber **nicht mehr** in TM-Squad-X → `players.last_squad_check` timestamp updaten (keine Deletion, nur Signal).
   - Args: `--league`, `--dry-run`, `--rate=2000` (ms), `--allow-transfers`
   - Rate-Limit default 2000ms (squad-pages sind schwerer als profile-pages, TM behandelt häufige squad-fetches strenger)

4. `src/lib/services/scrapers.ts` oder Extension in existing scraper-service *(evtl.)*
   - Helper `getClubsForSquadSync(): Array<{clubId, tmId, slug}>` — Datenbank-Query
   - Helper `upsertPlayerFromSquadEntry(entry, clubId, existingMap)` — Kapselt Insert/Update-Logik

5. `supabase/migrations/YYYYMMDD_player_last_squad_check.sql` *(neu, ADD COLUMN)*
   - `ALTER TABLE players ADD COLUMN last_squad_check TIMESTAMP WITH TIME ZONE` — Signal für "zuletzt in TM-Squad gesehen", hilft Retired/Loan-Out-Detection
   - Kein DEFAULT, NULL = nie squad-gescraped (backward-compat)

## Acceptance Criteria

1. `parseSquadTable(html)` returnt für eine TM-Galatasaray-Squad-Page ≥ 20 valide Player-Entries mit non-null tmPlayerId + tmSlug + displayName
2. Mindestens 80% der Entries haben `shirtNumber != null` (TM zeigt Shirt für alle aktiven Kader-Spieler)
3. Script-Run auf Süper-Lig (18 Clubs) mapped ≥ 95% der Spieler deren Rolle "aktive Saison" (MV>0 oder last_appearance_gw>0) ist, in < 60s ohne Rate-Limit-Errors
4. Keine Cross-Club-Contamination: wenn Script Player X im Club Y findet, darf er NICHT gleichzeitig als `players.club_id=Z ≠ Y` stehen bleiben — entweder `--allow-transfers` setzt club_id=Y oder Transfer wird gelogt + skipped
5. Idempotent: Zweiter Run ohne `--allow-transfers` ändert keine DB-Rows (kein-Op bei identischem Squad-State)
6. Tests: 27+5=32 vitest-cases grün, inkl. edge-case-fixtures für Leihspieler-Sektion + fehlende MV/Contract
7. `last_squad_check` Column wird bei jedem Match aktualisiert (auch bei unchanged), Retired-Detection-Signal

## Edge Cases

1. **Leihspieler (am Ende der Squad):** TM zeigt Leihspieler-Section abgesondert mit Header "Leihspieler" — parseSquadTable entscheidet ob diese als `club_id=<verleiher>` oder `club_id=<leiher>` zählen. Empfehlung: **als Squad-Member dieses Clubs werten** (sie spielen dort diese Saison).
2. **Mehrfach-Position:** "Außenstürmer, Offensives Mittelfeld" — speichere nur erste Position (primary)
3. **U19-Callups:** Junge Spieler die temporär in Profi-Squad. TM listet sie in Profi-Squad → akzeptieren. Das Slice-141-U19-Filter gilt nur für Club-Ebene, nicht Spieler.
4. **Malformed Row (no hauptlink):** skip row, log to stats, don't abort
5. **Empty Squad-Page (HTTP 200 aber 0 Players):** Cloudflare-Challenge-Page-Detection (parseSquadTable returnt []) → abort, re-try mit höherem rate-limit, max 3 retries
6. **TM down / 503 / 429:** exponential backoff 2s → 5s → 15s, dann abort mit exit-code 1
7. **MV=0 in Table:** TM zeigt "-" für unbekannt — skip MV-Update, behalte existing DB-value
8. **Contract-End vergangen:** TM zeigt abgelaufene Verträge "30.06.2024" — still parse, caller entscheidet was damit
9. **Slug-Drift:** TM ändert Club-Slug (z.B. "galatasaray-istanbul" → "galatasaray"). Unser Script nutzt `club_external_ids.external_id` als ID, slug ist decorative.
10. **shirt_number Konflikt:** Neuer Player kommt mit Shirt #10, bestehender DB-Player hat auch Shirt #10 im gleichen Club. Policy: TM ist Ground-Truth, UPDATE den konfliktierenden Player auf NULL + Warn-Log.

## Proof-Plan

- `worklog/proofs/144-squad-parser-vitest.txt` — vitest Tests für parseSquadTable
- `worklog/proofs/144-dry-run-sl.log` — Script dry-run für Süper-Lig mit Diff-Stats (neu/update/retired/transfer)
- `worklog/proofs/144-db-verify.txt` — SQL Query: Count von Players mit last_squad_check NOT NULL vs total; avg shirt_number coverage
- `worklog/proofs/144-comparison.txt` — Side-by-side squad-page player count vs current DB-Kader-Size für 3 Clubs (Gala/Bayern/Real Madrid)

## Scope-Out

- **Scheduling / Cron-Integration:** Lokal-only für Phase 1. Vercel-Cron-Integration via Proxy ist separater Slice nach Proof-of-Concept stabil.
- **Bulk-Transfer-Update (saisonal):** `--allow-transfers` existiert als Flag, aber Club-Wechsel-Review-Flow (via Admin-UI) ist separater Slice.
- **Fallback bei Squad-Parse-Fail:** Kein automatischer Fallback auf alte transfermarkt-search-batch. Wenn Squad-Page scheitert, loggen + weiter mit nächstem Club.
- **Injury-Daten:** Bleibt bei API-Football (sync-injuries). TM squad-page hat keine reliable injury-info.
- **Contract-Renewal-Detection:** Wenn TM einen neuen Contract-End zeigt, überschreiben wir den alten. Kein History-Log. Transfer-History lebt weiter in `player_transfers`.
- **Profile-Page-Redundanz:** Wenn eine Info nur via Profile-Page verfügbar ist (nationality, date_of_birth), bleibt der separate `sync-transfermarkt-batch` für diese Data zuständig. Squad-Scraper deckt nur Squad-Table-Data ab.

## Impact-Analyse

**Erforderlich (3 Module).**

Consumer-Inventur:
- `players` Table Writes: Aktuell 6 Services schreiben (sync-transfermarkt-batch, transfermarkt-search-batch, sync-players-daily, sync-injuries, csv-import via admin-ui, manual). Der neue squad-scraper ist additiv (shirt/MV/contract), keine Breaking-Change für andere Writer.
- `player_external_ids`: Aktuell 4346 api_football_squad + 3922 transfermarkt + 1331 api_football_fixture + 56 api_football_orphan_recovery. Script fügt neue transfermarkt-Rows für unmappte Players hinzu, aktualisiert nicht existing.
- `last_squad_check` Column: additiv, nullable, keine Breaking-Change.

Side-Effects:
- Keine RLS-Änderungen
- Keine neuen RPCs
- Cron-Integration skipped (lokal-only Phase 1)
- `cron_sync_log` Audit-Row pro Script-Run für Monitoring

Migration-Plan:
- `last_squad_check TIMESTAMPTZ` ADD COLUMN. Existing rows NULL. Index nicht nötig.

## Klassifizierung nach CEO-Approval-Matrix

- Kein Money-Flow
- Kein Security-Shift (service-role-Writes lokal)
- Keine User-Visible-Behavior-Change
- Breaking-Change nur für künftige sync-transfermarkt-batch-Runs (wenn wir den deprecaten — kein Scope dieser Slice)
- → CTO-Entscheidung, kein CEO-Approval nötig

## Follow-up Backlog-Items

- **144b**: Admin-UI-Tab "Squad-Status" — zeigt pro Club: last_squad_check, squad_size_tm vs squad_size_db, Alerts bei Drift
- **144c**: Cron-Integration für squad-scraper (braucht Vercel-Pro oder Proxy-Service, oder lokaler Cron auf Anils Maschine)
- **144d**: Bulk-Transfer-Review-Flow in Admin (verbose `--allow-transfers` mit UI-Approval statt CLI-Flag)
