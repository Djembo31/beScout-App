# Slice 141 — TM-Club-ID-Discovery-Script (Pre-Condition für B3)

**Datum:** 2026-04-22
**Slice-Größe:** S (3 Files, 1-2h)
**CEO-Scope:** Nein (Discovery-Only, kein Money/Security, keine User-Sichtbarkeit)

## Kontext

Backlog-Item B3 (TM-Squad-Page-Scraper) braucht `club_external_ids(source='transfermarkt', external_id=<tm-club-id>)` für alle 134 Clubs — aktuell 0 Rows. Ohne diese Mapping-Tabelle lässt sich keine `https://www.transfermarkt.de/<slug>/startseite/verein/<id>` URL konstruieren.

**Block:** TM-Search-basierter Lookup scheitert an Cloudflare-Block von Vercel-IPs (siehe common-errors.md "Cloudflare-Block für Vercel-IPs"). Lokal von Anils PC funktioniert's.

**Strategie:** Player-Profile ableiten. Wir haben 3.922 `player_external_ids(source='transfermarkt')`. Für jeden Club nehmen wir 1-3 Player, fetchen deren TM-Profile-HTML, parsen den "aktuelles Verein"-Block → TM-Club-ID → UPSERT in `club_external_ids`.

## Ziel (1 Satz)

Nach einmaligem Run auf Anils lokalem PC sind **≥ 130 von 134** Clubs in `club_external_ids(source='transfermarkt')` eingetragen — B3-Pre-Condition erfüllt.

## Betroffene Files

1. `src/lib/scrapers/transfermarkt-profile.ts`
   - Neue Funktion `parseCurrentClubTmId(html: string): { tmClubId: number; clubName: string; slug: string } | null`
   - HTML-Pattern: `<a href="/<slug>/startseite/verein/<tm-club-id>"` im Data-Header-Block (nur AKTUELLER Verein, nicht Leihgeber)

2. `src/lib/scrapers/transfermarkt-profile.test.ts`
   - 3 Test-Cases für `parseCurrentClubTmId`:
     - Standard-Profil mit Current-Club
     - Vereinsloser Spieler (kein aktueller Club → return null)
     - Leih-Fall (Main-Club bevorzugt, nicht Leihgeber)

3. `scripts/tm-club-id-discovery.ts` *(neu)*
   - Lokaler Runner via `npx tsx scripts/tm-club-id-discovery.ts`
   - Flow:
     1. Lade alle Clubs + ihre Player mit `source='transfermarkt'`-Mapping
     2. Pro Club: bis zu 3 Player-TM-IDs probieren (erste Success bricht Loop)
     3. Fetch `https://www.transfermarkt.de/spieler/profil/spieler/<tm-player-id>` mit realistic User-Agent
     4. Parse HTML → `parseCurrentClubTmId()`
     5. Fuzzy-Match `parsedClubName` vs `clubs.name` (normalized: lowercase + stripDiacritics + Array-Intersect mindestens 1 Wort) → Guard gegen False-Positives (z.B. Leihgeber-Ambiguität)
     6. UPSERT `club_external_ids { club_id, source:'transfermarkt', external_id: tmClubId.toString() }`
     7. Rate-Limit 500ms zwischen Requests
     8. Progress-Log pro Club + Summary am Ende (mapped / skipped / mismatched / errors)

## Acceptance Criteria

1. `parseCurrentClubTmId` findet TM-Club-ID aus HTML-Sample eines bekannten Spielers (z.B. Edin Visca / Başakşehir) korrekt
2. `parseCurrentClubTmId` returnt `null` bei vereinslosem Spieler (kein `/startseite/verein/` Link im Data-Header-Block)
3. `npx vitest run src/lib/scrapers/transfermarkt-profile.test.ts` alle Tests grün
4. Script läuft lokal bei Anil durch (7 Ligen × ~20 Clubs × 1 Player-Fetch ≈ 134 Requests × 500ms = ~1.5 min)
5. Nach Run: `SELECT COUNT(*) FROM club_external_ids WHERE source='transfermarkt'` ≥ 130
6. Fuzzy-Match-Guard verhindert False-Positive: wenn parsedClubName keine Wort-Überlappung mit clubs.name hat → NICHT upserten, Log als `skip_mismatch`
7. Idempotent: Zweiter Run fügt keine Duplikate ein (UPSERT auf `(club_id, source)`)

## Edge Cases

1. **Player ohne aktuellen Verein** (verletzt/vereinslos): parseCurrentClubTmId → null → Script probiert nächsten Player
2. **Leih-Verhältnis**: TM zeigt "ausgeliehen an" und "Stammverein" — wir nehmen den aktuell aktiven Verein (in der Saison spielend). Regex matcht den ersten `/startseite/verein/` Link im `data-header` Block.
3. **Alle 3 Player eines Clubs scheitern** → Log `club <name>: all_players_exhausted`, Club bleibt unmapped
4. **TM Cloudflare-Challenge trotz lokalem Run**: wenn Response kein erkennbares Profile-HTML → Abort mit Exit-Code 1, damit Anil es nicht unbemerkt falsch laufen lässt
5. **Rate-Limit Hit (429)**: exponential backoff 2s → 5s → 15s → abort
6. **Fuzzy-Match False-Positive**: Vergleich Normalized-Name (lowercase, diacritics-stripped, TR `ı→i`) muss ≥ 1 Wort-Token überlappen. Bei Mismatch → skip statt blind upsert.
7. **clubs.name vs TM-Name** unterscheiden sich oft (z.B. "Bayern München" vs "FC Bayern München") → Token-basierte Überlappung reicht, nicht exact-match
8. **Existing api_football_id im `club_external_ids`** → UPSERT on (club_id, source) — unique-constraint muss `(club_id, source)` sein (prüfen, sonst Insert-on-conflict Fehler)

## Proof-Plan

- `worklog/proofs/141-script-run.txt` — lokaler Script-Output mit Summary (mapped / skipped / mismatched)
- `worklog/proofs/141-db-verify.txt` — SQL-Query:
  ```sql
  SELECT
    (SELECT COUNT(*) FROM club_external_ids WHERE source='transfermarkt') AS tm_mapped,
    (SELECT COUNT(*) FROM clubs) AS total_clubs;
  ```
- `worklog/proofs/141-vitest.txt` — `npx vitest run src/lib/scrapers/transfermarkt-profile.test.ts` Output

## Scope-Out

- **B3 selbst** (TM-Squad-Page-Scraper): neuer Slice nach Abschluss von 141. Braucht eigene Spec mit Rate-Limit-Strategie + Fallback-Pfade.
- **Vercel-Cron-Integration**: Script bleibt lokal-only. Kein Vercel-Deploy. Falls später nötig: Proxy-Service oder lokaler Cron bei Anil.
- **Player-Profile-Parser für MV/Contract**: unverändert, bestehende Funktionen bleiben.
- **Auto-Retry-Orchestrator**: Wenn Clubs > 4 unmapped bleiben, Anil re-runt manuell mit `--only-unmapped` Flag (im Script vorbereitet, aber nicht CI-getriebener Retry).
- **Sakaryaspor-Ausnahme**: Wenn TM-Cloudflare-Block auch lokal greift (Anil-IP variiert), Fallback = CSV-Input (`scripts/tm-club-id-discovery.ts --csv=tm-club-ids.csv`). Spec deckt das nicht ab, nur hinzufügbar wenn nötig.

## Impact-Analyse

**Skipped.** Begründung:
- Keine Service/RPC/Query-Hook-Änderung
- Nur additive Parser-Funktion + neuer isolierter Script unter `scripts/`
- `club_external_ids`-Writes: bestehender Consumer ist `src/app/api/cron/sync-transfermarkt-batch/route.ts` — liest `source='transfermarkt'` **optional** (nutzt bei Vorhandensein, sonst Search-Fallback). Additiv ≠ Breaking.
- Keine neuen RLS-Policies (bestehende greifen)

## Klassifizierung nach CEO-Approval-Matrix

- **Kein Money-Flow:** reines Discovery
- **Kein Security-Shift:** Script nutzt Service-Role-Key lokal, kein neuer RPC
- **Kein Breaking-Change:** additive Mapping-Einträge
- **Kein User-Visible-Behavior-Change:** Script läuft offline, keine UI
- → CTO-Entscheidung, kein CEO-Approval nötig. Dispatch direkt BUILD.
