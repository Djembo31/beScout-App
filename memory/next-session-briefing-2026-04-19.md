# Next-Session Briefing (2026-04-19)

> Erstellt Ende Session 2026-04-18.
> **Ersetzt den vorigen Briefing-Stand** (next-session-briefing-2026-04-18.md).
> Stop-Hook liefert parallelen technischen Handoff in `memory/session-handoff.md`.

---

## TL;DR — wo wir stehen

**Heute gelaufen:** 24 Slices (044-068, kumulativ). Zwei Wellen:
- **Security + TR-i18n + Verify** (044-058): Pilot-Ready-Hardening abgeschlossen. 14/14 notification-RPCs auf structured i18n, 5 Security-Guards, Ledger reconciled. Live-Verify GREEN auf bescout.net.
- **Data-Integrity Phase 1+2 Start** (059-068): Audit-Baseline + Duplikate-Prevention + Logo-Normalisierung + **3 autonome Sync-Pipelines** für Player-Daten deployed.

**Kritischer Follow-Up:** Cron-Frequenz-Review. Ich hatte die Crons auf daily/hourly gesetzt aus Copy-Paste-Muster. CEO hat zu Recht kritisiert: Transfermarkt-Market-Values ändern sich nur 2-3× pro Jahr (Transferfenster). Tägliches Polling ist Ressourcen-Verschwendung + Cloudflare-Risiko.

**Baseline Data-Quality (via `get_player_data_completeness()`):**
- 0/7 Ligen auf Gold-Tier
- 21 Bronze-Violations (<95%) — INV-34 ratcheted (darf nur sinken)
- Worst: Serie A 68.3% market_value + contract
- Best: 2. Bundesliga 92.9% contract

---

## Was läuft autonom ab sofort

**4 Vercel-Crons aktiv seit 2026-04-18:**

| Cron | Schedule | Aktion | Expected-Impact |
|------|----------|--------|-----------------|
| `sync-players-daily` | 03:00 UTC | API-Football /players refresh 134 Clubs | 538 nationality+photo-Gaps gefüllt |
| `transfermarkt-search-batch` | jede Stunde :30 | Name-Search für 3938 unmapped players | ~30 neue tm-Mappings/h → 5.5d Full-Discovery |
| `sync-transfermarkt-batch` | alle 2h :00 | Profile-Scrape 50 players → market_value + contract_end | ~600 scrapes/Tag |
| `gameweek-sync-trigger` | alle 30 min | Match-Stats (existing) | goals/assists |

**Erster Run:** morgen 03:00 UTC (player-sync), dann rolling ab :30.

---

## Offene Entscheidungen (User-Input nötig)

### D1 — Cron-Frequenz korrigieren (PRIORITY: JETZT)

CEO sagt: "reicht doch alle 4 Monate oder vertue ich mich? warum täglich?"
Analyse bestätigt: Transfermarkt-Updates kommen 2-3×/Jahr + ad-hoc. Daily ist Overkill.

**Vorschlag (Slice 069):**
| Cron | Alt | Neu |
|------|-----|-----|
| `sync-transfermarkt-batch` | alle 2h | **1× pro Woche (Sonntag 04:00) + missing_only** |
| `transfermarkt-search-batch` | stündlich | **high-freq 2 Wochen bis Discovery-Coverage, dann 1×/Woche** |
| `sync-players-daily` | täglich | **unverändert** (API-Football günstig) |

**Plus:** Admin-Manual-Trigger-Button "Full Market-Value-Refresh" für 3×/Jahr CEO-getriggered Deep-Refresh.

**Effekt:** Transfermarkt-Load von ~2000/Tag auf ~80/Woche (25× weniger). Cloudflare-Risiko = null.

**User-Entscheidung fehlt:** (a) Cron wöchentlich, CEO manual 3×/Jahr — ODER — (b) Komplett aus Cron, nur manual.

### D2 — Launch-Strategie für Ligen

Liga-Coverage ist ungleich (Serie A 68% market_value, 2. Bundesliga 92%).

**Optionen:**
- (a) Launch alle 7 Ligen gleichzeitig, mit Coverage-Badge pro Liga
- (b) Launch nur komplette Ligen (Bundesliga + 2. Bundesliga + Süper Lig), Rest post-Full-Coverage
- (c) Launch Sakaryaspor-Pilot only (Minimum-Scope), Rest post-Beta

### D3 — 7 api_football_id Collisions manuell review

Nach Slice 061 Backfill blieben 7 Drift-Cases wo 2 Players denselben api_football_id claimen. Das sind Daten-Inkonsistenzen in external_ids-Table.

**Options:**
- (a) CEO durchschaut + entscheidet welche der 2 Players legitim ist, andere kriegt NULL
- (b) Ich baue Admin-UI "Resolve Mapping Conflict" (Slice 071)

### D4 — Post-Discovery: Players ohne findbare tm-id

Nach Slice 068 Discovery-Run (läuft 5.5d) wird es Players geben die KEINE Transfermarkt-Entsprechung haben (z.B. obscure TFF-Jugendspieler). Wie behandeln wir die?

**Options:**
- (a) "Kein Marktwert verfügbar" UI-state (transparent)
- (b) Fallback-Value (Durchschnitt der Position/Liga) — fragil
- (c) Admin-manual-Input-Field im Player-Detail (Slice 072)

---

## Priorisierte Optionen für morgen

### Option A — Data-Pipeline-Optimierung (empfohlen Start)

**Slice 069: Cron-Frequenz-Fix + Manual-Trigger**
- Vercel-Cron Schedule umschreiben (Slice 069)
- Admin-Endpoint `/api/admin/trigger-full-transfermarkt-refresh` (CEO-auth)
- Button im AdminSettingsTab
- Dauer: **30-60 Min**

**Slice 071: Cron-Results-Health-Check**
- SQL-Query: wie viele neue Mappings gefunden nach 1. Run?
- Falls <20: Debug (blocked? wrong selector? 403?)
- Falls 20-30: OK, weiter rolling
- Dauer: **15 Min**

### Option B — User-Trust-Features

**Slice 070: User-facing Freshness-Badge**
- Relative-Time-Component ("vor 2h", "vor 3 Tagen")
- Color-coded: grün <24h, gelb 1-7d, rot >7d
- Integration in Player-Detail, Market-Card, Portfolio-Row
- +2 i18n keys (DE+TR)
- Dauer: **1.5h**

**Slice 073: Admin Data-Quality-Dashboard**
- Component: Live-Coverage-Matrix pro Liga
- Calls `get_player_data_completeness()`
- Shows: Bronze/Silver/Gold-Status, missing-count per Feld, last-sync-timestamp
- Integration in Platform-Admin-Tab (owner-only)
- Dauer: **1.5h**

### Option C — Database-Architecture (nice-to-have)

**Slice 066: Stadium Master-Table**
- `stadiums(id, name, city, capacity, opened_year, image_url)` table
- FK von clubs (N clubs können shared stadium haben)
- Migration-Path: move aus clubs.stadium string
- Dauer: **2h**

**Slice 074: player_history Tracking**
- Table für Market-Value + Contract-End History
- Trigger: bei UPDATE in players → insert history-row
- Analytics: Price-Trajectory charts post-Beta
- Dauer: **2h**

### Option D — Komplett-andere Arbeit

Du kannst auch **nichts davon** machen und etwas ganz anderes:
- Neue Feature bauen (Fantasy, Bounty, Events)
- Marketing-Page polish
- Beta-Launch-Vorbereitung

---

## Health-Checks für Session-Start morgen

**1. Cron-Sync-Log prüfen:**
```sql
SELECT step, status, details, duration_ms, created_at
FROM cron_sync_log
WHERE step IN ('sync-players-daily', 'transfermarkt-search-batch', 'sync-transfermarkt-batch')
  AND created_at > NOW() - interval '24 hours'
ORDER BY created_at DESC;
```

**2. Data-Quality-Progress:**
```sql
SELECT jsonb_pretty(public.get_player_data_completeness());
```
→ Vergleiche mit Baseline (21 Bronze-Violations, 0 Gold).

**3. New Transfermarkt-Mappings:**
```sql
SELECT COUNT(*) FROM player_external_ids WHERE source='transfermarkt' AND created_at > NOW() - interval '24 hours';
```
→ Sollte 30-700 Range (depending on search-hit-rate).

**4. Market-Value Coverage:**
```sql
SELECT 
  COUNT(*) FILTER (WHERE market_value_eur > 0) AS has_mv,
  COUNT(*) FILTER (WHERE market_value_eur IS NULL OR market_value_eur = 0) AS missing_mv
FROM players WHERE shirt_number IS NOT NULL;
```
→ Baseline: 3405 has / 1038 missing. Should shrink.

---

## Pending Pipeline-Items (nicht akut)

Aus `memory/data-integrity-deep-dive-2026-04-18.md`:

- **Slice 062b** Non-numeric api_football_ids auf NULL (8 cases wo external_id non-numeric war)
- **Slice 065b** 76 Clubs ohne lokales Stadium-Asset → CEO/Admin nachträgt URL via UI (Slice 067 geliefert, Daten-Fill offen)
- **Slice 068b** Player-Search-Scoring post-live: welche Scoring-Thresholds sind optimal? Sampling nach 1. Run.

---

## Heutige Commits-Reference (alle auf main)

```
a56c9da9 feat(admin): Slice 067 — Club-Assets Override UI
fc2ca816 feat(club): Slice 065 — Stadium-Image Fallback-Chain
8436afe0 feat(scraper): Slice 068 — Transfermarkt Name-Search
e5d417dc feat(data): Slice 062 — Club-Logo Canonical + INV-35
5a598f17 feat(data): Slice 061 — Backfill api_football_id + Sync-Trigger
f94d2c89 feat(data): Slice 060 — UNIQUE api_football_id
b92ee250 feat(data): Slice 059 — Data-Quality-Audit + INV-34 Baseline
b8a9b440 feat(scraper): Slice 064 — Transfermarkt Market-Value Scraper
02d8b288 feat(cron): Slice 063 — Daily Player-Sync-Pipeline
7ae8ec71 test(verify): Slice 058 — P7-Rest Re-Verify GREEN
7f3cebbf feat(i18n): Slice 057 — TR-Initiative 14/14
944693a1 fix(rls): Slice 056 — pbt_* TO authenticated
d8771b4d feat(i18n): Slice 055 — TR-i18n Social/Admin + 4 Bug-Fixes
444d82bf feat(i18n): Slice 054 — TR-i18n Money-RPCs
7fb137ae perf(orders): Slice 053 — refetchInterval 30s
4612bdfd refactor(player): Slice 052 — playerMath DRY
e002d00f fix(i18n): Slice 051 — Error-Chains Community
d7123c87 refactor(services): Slice 050 — OperationResult type
b4c33b36 feat(test): Slice 049 — INV-23 Coverage
f2809047 feat(i18n): Slice 048 — TR-i18n Foundation + Pilot
fc1124f6 fix(notifications): Slice 047 — Historische Wording
c01c0691 feat(money): Slice 046 — Ledger-Health + INV-33
42690cbc feat(rls): Slice 045 — RLS-Matrix + INV-32
e96f34e1 feat(rpc): Slice 044 — A-02 Body-Audit + INV-31
```

---

## Empfohlener Session-Start morgen

1. **Lies diesen Brief** (2 min)
2. **Cron-Health-Check** (SQL Query #1 oben, 1 min) → wie viele Runs erfolgreich?
3. **Data-Quality-Progress** (Query #2) → Bronze-Violations runtergegangen?
4. **Entscheidung D1** (Cron-Frequenz): Slice 069 oder Cron-Disable?
5. **Dann eine Option A/B/C** — je nach Budget + Energie-Level

Falls Pipeline nicht wie geplant lief: Debug-Slice direkt anschließen (HTTP 403? Parser-Bug? Rate-Limit?).

---

**Ende Briefing.** Alles committed, active.md idle, tsc clean, 33/33 INV-Tests grün.
