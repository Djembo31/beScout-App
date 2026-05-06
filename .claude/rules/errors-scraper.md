---
description: Scraper/External-Data-Fehler — Transfermarkt, API-Football, HTML-Parsing
---

# Errors: Scraper / External Data

Stand: 2026-04-24 · Split aus `common-errors.md` (Slice 186). Siehe auch Slice-081 TM-Architektur.

## Silent Data-Corruption Patterns (siehe auch common-errors.md §1)

### External-API liefert historische Daten als „aktuelle" (Slice 275, 2026-05-06)

**Bug-Klasse:** Cron-Endpoint nutzt externe API ohne Date-Filter. API returnt scheinbar „aktuelle" Daten — bei genauem Hinsehen sind es ALLE historischen Episoden der ganzen Saison. Code mappt jede Row auf „aktuell" → massive Daten-Korruption.

**Symptom (Slice 275 Anil-Live-Bug):** `/injuries?league=78&season=2025` returnt **2647 results** für eine Liga (jede injury-Episode pro Fixture, ganze Saison). Cron hat alle als `players.status='injured'` geschrieben → 1862 false-positive (60-87% pro Top-Club als verletzt angezeigt).

**API-Smoking-Gun:**
- `/injuries?league=X&season=Y` → 2647 rows (Saison)
- `/injuries?league=X&season=Y&date=YYYY-MM-DD` → 48 rows (1 Match-Day)
- 55× Reduktion mit Date-Filter

**Detection (Pre-Cron-Deploy-Check):**
```bash
# API-Response-Size single-Liga, ohne Date-Filter
curl ".../injuries?league=X&season=Y" | jq '.results'
# Wenn > expected_active_injuries × 10: API liefert historische Records.

# Mit Date-Filter
TODAY=$(date -u +%Y-%m-%d)
curl ".../injuries?league=X&season=Y&date=$TODAY" | jq '.results'
# Realistische Größenordnung pro Match-Day.
```

**Fix-Pattern: Pro Liga × pro Distinct-Fixture-Date in Window iterieren.**

```ts
// Phase 0: Hole Distinct Fixture-Dates pro Liga in [-14d, +14d]
const windowStart = new Date(Date.now() - 14*24*60*60*1000).toISOString();
const windowEnd = new Date(Date.now() + 14*24*60*60*1000).toISOString();
const fixtureDatesByLeague = new Map<string, Set<string>>();

for (const league of activeLeagues) {
  const { data } = await supabaseAdmin.from('fixtures')
    .select('played_at')
    .eq('league_id', league.id)
    .gte('played_at', windowStart).lte('played_at', windowEnd)
    .not('played_at', 'is', null);
  const dates = new Set((data ?? []).map(r => r.played_at.slice(0, 10)));
  fixtureDatesByLeague.set(league.id, dates);
}

// Phase 1: Pro (Liga, Date) 1 API-Call
for (const league of activeLeagues) {
  const dates = fixtureDatesByLeague.get(league.id) ?? new Set();
  if (dates.size === 0) { stats.leagues_processed++; continue; } // Saisonpause
  for (const date of dates) {
    await sleep(API_RATE_LIMIT_MS);
    const r = await apiFetch(`/endpoint?league=${league.api_id}&season=${season}&date=${date}`);
    // ... process r.response
  }
}
```

**Quota-Math:** 7 Ligen × ~3-4 Match-Dates in 28d-Window = 21-28 calls/day = 0.4% von API-Football Pro 7500/day. Trade-off ist günstig.

**Recovery-Logic-Compatibility:** Pre-Slice-275 Recovery-Pattern (Spieler nicht in API-Response → fit) bleibt korrekt — funktioniert sogar besser, weil API-Response jetzt nur AKTUELLE Injuries enthält.

**Audit (post-Beta empfohlen):**
```bash
# Cron-Endpoints die Saison-Daten ohne Date/Fixture-Filter holen
grep -rn "season=" src/app/api/cron/ | grep -v "date=\|fixture=\|live=\|round=\|next="
```

**Reference:** Slice 275 `worklog/specs/275-sync-injuries-date-filter.md`. Pattern-Familie mit Slice 081 „Scraper Default-Poisoning" (gleiche Bug-Klasse: external-source liefert nicht das was wir denken, silent-fail in DB).



### Scraper Default-Poisoning (Slice 081, TM)
- Parser-Fallback-Werte (MV=500K/8M + contract=2025-07-01) erscheinen auf vielen Spielern identisch — sehen aus wie echte Daten.
- Detect: `GROUP BY market_value_eur, contract_end HAVING COUNT(*) >= 4`.
- Mitigation: `players.mv_source` (`unknown|transfermarkt_verified|transfermarkt_stale|manual_csv|api_football`). Cluster auf `_stale` setzen, **nicht** MV ueberschreiben.
- Guard: INV-36/37/38. Re-Scraper: `scripts/tm-rescrape-stale.ts`.

### External-Site Scraper-Regex Drift (Slice 078, TM)
- Fremde Site aendert Markup → Regex matcht nicht → parser `null` → Daten-Luecke waechst silent.
- Beispiel: TM 2026-04 MV-Container umbenannt, 433 Stammspieler mit MV=0.
- Regel: Externe HTML-Parser brauchen Regression-Tests mit echten Fixtures. Template: `src/lib/scrapers/transfermarkt-profile.test.ts`.
- Entity-Drift: `€` / `&#8364;` / `&euro;` — nie auf trailing `€` matchen.

### Cloudflare-Block fuer Vercel-IPs (Slice 075, TM)
- TM Cloudflare blockiert Vercel-Datacenter-IPs → HTTP 200 mit leerem Challenge-HTML. Lokaler curl liefert volles HTML.
- Debug-Mode `?debug=true`: `debug_trace[].parsed=0` = Block bestaetigt.
- Workaround: CSV-Import-UI, Residential-Proxy, TM Partner-API.

### Script mit hart-coded state-check (Phase B Hot-Fix)
- Script akzeptiert Flag `--mv-source=unknown` aber intern `if (fresh.mv_source !== 'transfermarkt_stale') skip` hart-codiert → silent skip.
- Fix: Flag-Wert in Variable, ALLE Hart-Code-Referenzen ersetzen.

## HTML-Parsing Patterns

### Nested-tr + non-greedy regex → mid-row cutoff (Slice 144)
- TM Squad-Page rendert pro Zeile nested `<table class="inline-table">` mit eigenen `<tr>`s.
- Regex `/<tr class="(?:odd|even)">([\s\S]*?)<\/tr>/g` stoppt am ERSTEN inneren `</tr>`, nicht am aeusseren squad-row-`</tr>`. Shirt+Name+Position matched (frueh), MV+Nationality verloren.
- Fix: tr-depth-counter state machine:
  ```ts
  const step = /<tr[\s>]|<\/tr>/g;
  step.lastIndex = start;
  let depth = 1;
  while ((m = step.exec(html)) !== null) {
    if (m[0] === '</tr>') { depth--; if (depth === 0) { cursor = m.index; break; } }
    else depth++;
  }
  ```
- Regel: Bei nested-Element-Parsing (HTML-Rows, JSON, XML) IMMER depth-counter statt non-greedy regex.

### HTML-Attribut-Order-Sensitivity (Slice 144)
- TM rendert `<img ... title="Türkei" alt="Türkei" class="flaggenrahmen" />` — title VOR class.
- Regex `/class="flaggenrahmen[^"]*"[^>]*title="([^"]+)"/` matched nur wenn class vor title → 0% coverage.
- Fix: 2-step extraction. Match ganzes Tag via class-anchor, dann extrahiere title innerhalb.
- Regel: HTML-Attribute-Matching NIEMALS auf Reihenfolge verlassen.

### DE-EN Name-Drift in Fuzzy-Match (Slice 141b)
- TM zeigt deutsche Club-Namen: "AC Mailand" statt AC Milan, "SSC Neapel" statt Napoli.
- Fuzzy-Match via Token-Overlap scheitert bei fremdsprachigen Umbenennungen ohne Token-Gemeinsamkeit.
- Fix-Patterns: (1) Manuell-Fill bekannte Drift-Cases. (2) Multi-Language-Dictionary als 3rd Fuzzy-Fallback. (3) TM-Slug als sekundaere Signal-Quelle.
- Regel: Scraper auf lokalisierten Websites brauchen Locale-Drift-Handling.

### URL-based Canonical-ID statt Fuzzy-Match (Slice 141b)
- Wenn externe Quelle stabile URL-Pfad-ID hat (`/startseite/verein/<id>`), nutze ID als Primary-Key.
- Slug kann driften (Rebrand), ID bleibt stabil ueber Jahre.
- Pattern: `/href="\/([a-z0-9-]+)\/startseite\/verein\/(\d+)"/` liefert slug + ID; ID ist canonical.

### Scraper null-Policy: always write null statt old-value keep (Slice 144g — D16)
- Parser returnt `null` wenn Source-Feld fehlt. Policy MUSS sein: write `null` to DB, nicht alten Wert belassen.
- Anti-Pattern: `if (contract !== null) updates.contract_end = contract` — bei null keep-old = data-liar.
- Fix-Pattern: `updates.contract_end = contract` — always write, `null` = honest "source has no current value".
- Regel: Fuer ALLE scraper-consumers die DB-Write machen: null-return from parser = null-Write to DB.
- Audit: `grep -rn "if.*!==.*null.*updates\." scripts/`.

## Player-Matching Patterns

### Cross-Club-Contamination via API-Football (Slice 081d)
- Club hat 62 Spieler (realistisch ~30). Duplikate haben 0 Appearances + Name+Contract-Match zu echten Spielern anderer Clubs.
- Detect: SELF-JOIN auf `(first_name, last_name, contract_end)` + `club_id <> club_id` + target `last_appearance_gw = 0`.
- Fix: `club_id = NULL` (nicht DELETE — reversibel, kein FK-Cascade). Guard: INV-39.

### TM Player-Matching Trikot-Check (Phase B)
- Name-based TM-Search liefert false-positives bei identischen Namen (z.B. "Bara Ndiaye").
- Fix: Nach name+club scoring (≥30), scrape TM-Profile + compare `shirt_number`. Mismatch bei beiden NOT NULL → SKIP. Match oder one-sided NULL → accept.
- Impact: Threshold 50→30 (Recall↑), 0 shirt-mismatches in ~1000 Runs.
- Parser: `parseShirtNumber` in `src/lib/scrapers/transfermarkt-profile.ts`.

### Unknown-with-existing-Mapping Trap (Phase B)
- Players mit `mv_source='unknown'` aber EXISTING `player_external_ids` (source='transfermarkt') sind scrape-ready, nie verifiziert.
- Detect:
  ```sql
  SELECT COUNT(*) FROM players p
  JOIN player_external_ids pe ON pe.player_id=p.id AND pe.source='transfermarkt'
  WHERE p.mv_source='unknown' AND (p.matches>0 OR p.last_appearance_gw>0);
  ```
- Workflow: `npx tsx scripts/tm-rescrape-stale.ts --mv-source=unknown --league="<name>"`.

## External-API Quirks

### API-Football
- Substitution: `time.elapsed` (NICHT `time.minute`!), `player`=OUT, `assist`=IN.
- Null guards: `evt.player?.id` und `evt.assist?.id` koennen null sein.
- `grid_position` kann kaputt sein: fehlende GK-Row, Duplikate, >11 Starters.
- KEINE Market Values → nur Transfermarkt.
