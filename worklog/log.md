# Ship Log

Chronologische Liste aller abgeschlossenen Slices. Neueste oben.

Jeder Eintrag beginnt mit `H2-Header` `NNN | YYYY-MM-DD | Titel`, gefolgt von:
- Stage-Chain (SPEC → IMPACT → BUILD → PROVE → LOG)
- Files (git diff --stat summary)
- Proof (Pfad zu worklog/proofs/NNN-xxx.png|txt)
- Commit (hash)
- Notes (optional, 1-2 Saetze)

---

## 079c | 2026-04-20 morning | Audit-Fix 1000-row-cap (2 money-nahe Stellen)
- Stage-Chain: SPEC → BUILD → PROVE → LOG (IMPACT skipped — Return-Shape unverändert, identischer Pattern aus 079b)
- Files (3):
  - `src/lib/services/footballData.ts` (EDIT — `.limit(1000)` → `count:'exact', head:true`, `playersTotal` via count statt data.length)
  - `src/app/api/admin/sync-contracts/route.ts` (EDIT — `loadAllPlayers()` while-loop mit `.range()` wie /api/players)
  - `src/lib/services/__tests__/footballData.test.ts` (EDIT — Mock für `head:true` Query mit count-Parameter)
  - `.claude/rules/common-errors.md` (NIT — Pattern-Header "Slice 080" → "Slice 079b-emergency")
- Proof:
  - `npx tsc --noEmit` → clean
  - `npx vitest run src/lib/services/__tests__/footballData.test.ts` → 7/7 passing
  - `npx vitest run src/lib/services/` → 986/986 passing (kein Consumer-Break)
- Commit: TBD
- Notes:
  - **Trigger:** CTO-Reviewer Slice 079 Follow-up F0 — `.from('players')` ohne Pagination in Admin-Dashboard-Count + täglichem sync-contracts-Cron.
  - **Impact footballData.ts:** Admin-Mapping-Widget zeigte `playersTotal: 1000` (echte Zahl 4556). Nur Admin-Sicht-Täuschung, kein Client-Money.
  - **Impact sync-contracts.ts:** Täglicher Cron aktualisierte `contract_end` nur für ersten 1000 Players alphabetisch (bis ~"Crociata"). Players > Alpha-1000 (inkl. TFF-1-Lig Spieler mit `Ş/Ç/Ö` Nachnamen, relevanter Teil des Pilots) hatten stale contract_end → Market-Value-Kalkulation konservativ verzerrt.
  - **Scope-Out:** ~15 weitere `.from('players')` Hits in cron-routes (sync-players-daily, sync-injuries, sync-transfers, gameweek-sync, sync-transfermarkt-batch, players-csv) haben teilweise legitime `.eq()`-Filter. → F0-Audit-Queue für einzelne Evaluation.
  - **Lesson:** Pattern-bekanntheit aus Slice 079b hat diesen Fix auf 20min reduziert. Karpathy-Pattern (common-errors.md sofort dokumentieren) zahlt sich direkt aus.

---

## 079b-emergency | 2026-04-19 late | P0 /api/players PostgREST-Cap Money-Critical-Fix
- Stage-Chain: BUG-REPORT (Anil, test12) → INVESTIGATE → FIX → PROVE LIVE → LOG
- Files (3):
  - `src/app/api/players/route.ts` (EDIT — .range()-Pagination via while-loop)
  - `pnpm-lock.yaml` (SYNC — nach `pnpm install` für lhci/cli devDep)
  - `.claude/rules/common-errors.md` (Pattern verschärft: user-facing API-Routes nicht nur Scripts)
- Commits: `459da7b1` (fix) + `c1f7eac3` (lockfile+docs) + `94f78aab` (queue-update)
- Proof: `curl https://www.bescout.net/api/players | length → 4556` (vorher 1000)
- Notes:
  - **Anil repro:** test12 hat 16 Holdings in DB, UI zeigt nur 7. 11 GK-Cards im Home richtig, aber im Bestand nur 4.
  - Root cause: `/api/players` nutzte `supabaseServer.from().select().order()` ohne `.range()` — PostgREST-Cap 1000 rows. DB hat 4556 players.
  - Holdings auf Players mit `last_name` alphabetisch > 1000 (z.B. Sarıcalı 3701, Tutar 4191) wurden client-seitig nicht `dpc.owned`-enriched → in UI-Bestand-Filter `p.dpc.owned > 0` unsichtbar.
  - Impact für User mit Multi-Liga-Holdings: Money-critical. Nicht verkaufbar via UI.
  - **Pattern**: bereits in common-errors.md seit Slice 078 (tm-profile-local Loader), aber Audit-Regel nicht für user-facing API-Routes getriggert.
  - **Lesson für Polish-Sweep:** mindestens 2 Test-Accounts pro Page (einer mit Holdings verschiedener Ligen, einer New-User). Doku: `feedback_polish_multi_account.md`.

---

## 079 | 2026-04-19 | Home `/` Polish Pass 1+2 + Deploy-Healing (Phase 1/6 Core)
- Stage-Chain: SPEC → IMPACT(skipped, UI+1 seed-migration) → BUILD → PROVE (LIVE DE+TR) → LOG
- Files (8 distinct):
  - `messages/de.json` + `messages/tr.json` (Label-Keys, Empty-Slot-Keys, kazan→aldın/elde ettin)
  - `src/app/(app)/page.tsx` (balanceCents prop)
  - `src/components/home/HomeStoryHeader.tsx` (Balance-Pill + opacity fix + formatScout consistency)
  - `src/components/home/LastGameweekWidget.tsx` (Empty-Slot dashed-border + "Nicht besetzt")
  - `src/components/home/HomeSpotlight.tsx` (prize_pool=0 hide)
  - `src/components/home/MostWatchedStrip.tsx` (<2 Players hide)
  - `src/components/profile/ManagerTab.tsx` (F15 gamification namespace)
  - `src/lib/scrapers/transfermarkt-profile.ts` (parser-regression CI-fix)
  - `supabase/migrations/20260419120000_slice_079_mission_titles_disambiguate.sql`
  - `tsconfig.json` (**CRITICAL HEALING:** exclude scripts + tmp)
- Commits (5):
  - `907a417f` Pass 1 — Hero-Label + Mission + Empty-Slots
  - `ebb9012e` Pass 1.1 — Parser-Regression + TR-Compliance
  - `858fc16c` Healing — tsconfig scripts/tmp exclude
  - `5561835b` Pass 2 — Empty-States + Balance-Format
  - `26c98b1d` F15 — profile.fanRankStammgast namespace
  - `21224a74` DONE log
- Proof: worklog/proofs/079-{baseline,pass1,pass2}/ + 079-home-functional.md
- Notes:
  - **CRITICAL Insight:** Slice 077/077b/078 waren 2 Tage nicht deployed wegen
    `tsconfig.json` include `**/*.ts` + scripts/*.ts → playwright-import.
    `tsc --noEmit` lokal clean, Vercel `next build` fail. Fix unblocked 4
    Slices retrospektiv. Pattern dokumentiert in common-errors.md.
  - **Functional testing mandatory** (Anil 2026-04-19): memory/feedback_polish_functional_pflicht.md
  - DE↔TR Round-Trip durch Settings geprüft, beide locales verified
  - 6 Click-Through Flows + 3 Cross-Page Nav bestätigt (Mystery Box Modal,
    Notifications, Hero→Manager, Quick-Actions, Player-Detail, Club-Page)
  - Phase 1/6: Home DONE. Nächste Page: `/market`.

---

## 078 | 2026-04-19 | TM Parser Fix (Markup-Change 2026-04) + Loader Pagination-Fix
- Stage-Chain: SPEC → IMPACT(skipped, no DB/Service/RPC) → BUILD → PROVE → LOG
- Files (8):
  - `src/lib/scrapers/transfermarkt-profile.ts` (EDIT — neue primary-Regex für `data-header__market-value-wrapper`, legacy-Fallbacks beibehalten)
  - `src/lib/scrapers/transfermarkt-profile.test.ts` (NEW — 10 Regression-Tests mit echten HTML-Fixtures)
  - `scripts/tm-profile-local.ts` (EDIT — full-scan Pagination via `.range()`)
  - `scripts/tm-parser-sanity.ts` (NEW — Live-Check-Tool)
  - `scripts/tm-parser-verify.ts` (NEW — Offline-Verify mit gespeicherten HTMLs)
  - `scripts/tm-html-inspect.mjs` (NEW — DOM-Debug-Tool)
  - `worklog/specs/078-tm-parser-fix.md` (NEW)
  - `worklog/proofs/078-*.txt` (5 Proof-Files)
- Proof: worklog/proofs/078-after-completeness.txt
- Commit: (pending)
- Notes:
  - Root cause: TM hat 2026-04 von `data-header__box--marketvalue` auf `data-header__market-value-wrapper` umgestellt. Altes Format `€ X Mio.` (€ vor Zahl), neues `X,XX <span class="waehrung">Mio. €</span>` (€ nach Zahl in span).
  - Sanity-Check: 5/5 Stammspieler (Morgan Rogers €80M, Ezri Konsa €40M, Ollie Watkins €30M, Matty Cash €22M, Jean Butez €8M) wurden in DB mit MV=0 geführt.
  - Rerun (24 min): 267 MV-Updates, 0 errored. STAMM+ROTATION MV-Lücken 433 → 234 (-46%).
  - Größte Gewinner: Serie A +17pp (69→86%), La Liga +12pp (72→84%), Premier +7pp (78→85%).
  - Verbleibende 234 Lücken = meist echte TM-Nullwerte (Youngsters ohne MV-Assessment). Via CSV-Import (Slice 076) lösbar.

---

## 077b | 2026-04-19 | All-Leagues TM Sweep + Profile-Loader Fix
- Stage-Chain: BUILD (loader-fix) → PROVE → LOG (follow-up zu 077)
- Files (2):
  - `scripts/tm-profile-local.ts` (MODIFIED — loader chunked via clubs+players, umgeht PostgREST 1000-row-Limit)
  - `worklog/proofs/077b-all-leagues-sweep.txt` (NEW — Sweep-Statistik aller 7 Ligen)
- Proof: worklog/proofs/077b-all-leagues-sweep.txt
- Commit: (siehe git log)
- Notes:
  - 5 weitere Ligen sequenziell durchgelaufen (Serie A → La Liga → PL → BuLi → 2. BuLi) ~2h Laufzeit.
  - Biggest contract-wins: Serie A +16.6pp, La Liga +12.6pp, Premier League +7.8pp.
  - api_mapping_pct auf >=98.9% ueber ALLE 7 Ligen nach Sweep.
  - MV nicht verbessert — vorhandene Daten bereits in players-Tabelle aus frueheren Syncs.
  - Gold Tier noch nicht erreicht. Naechster Schritt: CSV-Import der MV-Luecken (~20-80 Players je Liga).

## 077 | 2026-04-19 | TM Local Scraper (Cloudflare-Workaround)
- Stage-Chain: SPEC(inline) → IMPACT(skipped, scripts only) → BUILD → PROVE → LOG
- Files (3):
  - `scripts/tm-search-local.ts` (NEW — Playwright search → player_external_ids INSERT)
  - `scripts/tm-profile-local.ts` (NEW — Playwright profile → players MV/contract UPDATE)
  - `worklog/proofs/077-tm-local-scraper-results.txt` (NEW — Run-Statistik TFF 1. Lig)
- Proof: worklog/proofs/077-tm-local-scraper-results.txt
- Commit: (siehe git log)
- Notes:
  - TFF 1. Lig: mapped 471 → 598 (+127), contract_pct 70.2 → 77.6, MV stagniert bei 70.2 weil 81 Players TM-mv=0.
  - Query-Order-Bug gefunden: Cron-Code nutzt `${last_name} ${first_name}` + TM-Search scheitert bei tuerk. Diacritics. Script nutzt `${first_name} ${last_name}` → Matches finden.
  - Cloudflare-Block wurde nicht getriggert weil Local-IP statt Vercel-Datacenter.
  - 2 Runs + 1 Profile-Run, 0 errored, ~18min total Laufzeit.

## 076 | 2026-04-18 | Manual CSV-Import (Transfermarkt-Block-Workaround)
- Stage-Chain: SPEC → IMPACT(skipped) → BUILD → PROVE → LOG
- Files (7):
  - `src/app/api/admin/players-csv/export/route.ts` (NEW — Admin-auth, returns CSV mit 6 columns)
  - `src/app/api/admin/players-csv/import/route.ts` (NEW — POST JSON, validate + batch .update())
  - `src/app/(app)/bescout-admin/AdminCSVImportTab.tsx` (NEW — Export-Btn + File-Upload + Preview + Apply)
  - `src/app/(app)/bescout-admin/BescoutAdminContent.tsx` (Tab-Registration `csv_import` mit FileSpreadsheet-Icon)
  - `messages/de.json` + `tr.json` (17 Keys, TR Anil-approved)
  - `worklog/specs/076-manual-csv-import.md` (NEW)
- Proof: (post-deploy)
- Commit: 78d1d412
- Notes: **Workaround für Slice 075 Cloudflare-Block**. Admin-Flow: (1) Export → CSV mit `player_id, full_name, club, position, market_value_eur, contract_end`, (2) Fill mv+contract extern (aus Comunio/SofaScore/eigenes Abo), (3) Upload → Parse (native CSV-Parser mit Comma+Semicolon-Support, BOM-strip, quoted-field-handling) → Preview 5 rows → Apply → bulk .update().eq() in 50er Chunks. **Validation: UUID-regex player_id, integer>=0 mv, YYYY-MM-DD contract_end, pre-filter existing IDs.** Result-Display mit updated/errored/validation_errors counts. Performance via Slice 075 UPDATE-pattern → kein CHECK-Violation-Bug. Scope-out: papaparse-Dependency, Auto-Detect Format, Historical-Log.

---

## 075 | 2026-04-18 | Cron Performance-Refactor + 2 Healing-Fixes
- Stage-Chain: SPEC → BUILD → PROVE → LOG (3 iterations für healing)
- Commits: e0c9abb2 (main) + 089ef0f9 (pre-filter fix) + ae03ebeb (UPDATE statt UPSERT)
- Files (4):
  - `src/app/api/cron/sync-injuries/route.ts` (Batch-Refactor: 60s timeout → **28s** measured)
  - `src/app/api/cron/sync-players-daily/route.ts` (UPDATE-pattern statt UPSERT: 300s timeout → **52s** measured, 4074 players updated)
  - `src/app/api/cron/transfermarkt-search-batch/route.ts` (debug-Mode + threshold-Parameter)
  - `.claude/rules/common-errors.md` (3 neue Patterns: Postgres ON CONFLICT CHECK-Validation, Vercel Cron-Limits, Cloudflare-Block)
- Proof: Live-Trigger via Playwright: sync-injuries 28s/1805 updates, sync-players-daily 52s/4074 updates
- Notes: **3 Healing-Iterationen nötig.** Refactor-1 sync-injuries + sync-players-daily mit batch-upsert → players-daily failed 5019/5019 wegen CHECK `dpc_total <= max_supply`. Healing-1 pre-filter existing api_football_ids → STILL 4074/4074 failed weil Postgres ON CONFLICT DO UPDATE **validates INSERT-tuple-defaults BEFORE routing** (Postgres-gotcha dokumentiert). Healing-2: echtes `.update().eq()` statt `.upsert()` — funktioniert. **Transfermarkt-Scraping debug:** 0/10 players found on Vercel, `curl` vom local PC findet 10 matches = Cloudflare-Block für Vercel-Datacenter-IPs. Workaround = Proxy oder Partner-API. **Gold-Standard nicht erreicht:** Market-Value + Contract-End kommen aus TM, sync-players-daily brachte 50 neue Stammkader (shirt_number) ohne TM-Data → TFF 1. Lig Contract+MV von 80.8% auf 70.2% gesunken. **Nächste Slice 076 muss Proxy oder alternative Datenquelle sein.**

---

## 074 | 2026-04-18 | sync-standings Manual-Only + league_standings table
- Stage-Chain: SPEC → IMPACT(skipped) → BUILD → PROVE → LOG
- Files (7):
  - `supabase/migrations/20260418140000_slice_074_league_standings.sql` (NEW — RLS + UNIQUE + 2 indexes)
  - `src/app/api/cron/sync-standings/route.ts` (NEW — 7 calls/run)
  - `src/app/api/admin/trigger-cron/[name]/route.ts` (Whitelist +sync-standings)
  - `src/app/(app)/bescout-admin/AdminDataSyncTab.tsx` (7. Card Trophy)
  - `messages/de.json` + `messages/tr.json` (3 Keys, TR Anil-approved)
  - `worklog/specs/074-sync-standings.md` (NEW)
- Proof: (post-deploy `074-deploy-status.txt`)
- Commit: eb0e6521
- Notes: **Liga-Tabelle authoritative via API-Football.** API-Response-Struktur: `league.standings` = Array of Groups of Entries (flat-processed, multi-group support für UEFA-Tournaments falls irgendwann relevant). **form-Feld "WWDWL"** für Fantasy-UI-Indikatoren "Welche Clubs in Form?". **Future UI-Use-Cases:** Club-Page "Platz X, Y Punkte" + Event-Context "Tabellen-3. vs Tabellen-15". Upsert via `(league_id, club_id, season)` UNIQUE → rank-Changes zwischen Runs = last-write-wins. Pro-Quota-Impact: 7 Calls × wöchentlich = 30/Monat (0.013%). Migration via mcp__supabase__apply_migration.

---

## 073 | 2026-04-18 | sync-fixtures-future Manual-Only Cron
- Stage-Chain: SPEC → IMPACT(skipped) → BUILD → PROVE → LOG
- Files (6):
  - `src/app/api/cron/sync-fixtures-future/route.ts` (NEW — 7 calls/run, UPSERT via api_fixture_id UNIQUE)
  - `src/app/api/admin/trigger-cron/[name]/route.ts` (Whitelist +sync-fixtures-future)
  - `src/app/(app)/bescout-admin/AdminDataSyncTab.tsx` (6. Card CalendarClock)
  - `messages/de.json` + `messages/tr.json` (3 Keys, TR Anil-approved)
  - `worklog/specs/073-sync-fixtures-future.md` (NEW)
- Proof: (post-deploy `073-deploy-status.txt`)
- Commit: 9d0b0a58
- Notes: **KEINE Migration** (fixtures-Tabelle + api_fixture_id UNIQUE bestehen). Gameweek-Parse aus API-round `"Regular Season - 30"` via regex. Status-Mapping: FT/AET/PEN→finished, 1H/2H/ET→live, HT→halftime, PST→postponed, CANC/ABD→cancelled. **INSERT-vs-UPDATE Detection:** Pre-query existing via api_fixture_id → entscheidet Insert oder Update (nur bei Änderung → `fixtures_unchanged` Counter). **Use-Cases:** Neue Saison-Onboarding (2660 Rows), Mid-Season Liga-Backfill, Spielverlegungs-Propagierung. **Manual-Only** wegen Hobby-Plan. 7 API-Calls × seltene Trigger → 0.01% Pro-Quota.

---

## 072 | 2026-04-18 | sync-transfers Manual-Only + player_transfers table
- Stage-Chain: SPEC → IMPACT(skipped) → BUILD → PROVE → LOG
- Files (8):
  - `supabase/migrations/20260418130000_slice_072_player_transfers.sql` (NEW table + RLS + 2 indexes)
  - `src/app/api/cron/sync-transfers/route.ts` (NEW — 134 calls/run, manual-only)
  - `src/app/api/admin/trigger-cron/[name]/route.ts` (Whitelist +sync-transfers)
  - `src/app/(app)/bescout-admin/AdminDataSyncTab.tsx` (5. Card ArrowRightLeft)
  - `messages/de.json` + `messages/tr.json` (3 Keys, TR Anil-approved)
- Proof: (post-deploy `072-deploy-status.txt` + `072-rls.txt`)
- Commit: dacfe6f4
- Notes: **Hobby-Plan-Kompatibilität**: KEIN vercel.json-Entry (sonst wäre 7. Cron-Job bei Hobby 2-Limit). Admin triggert ad-hoc nach Transferfenster-Ende (Jan + Jul-Aug). **Side-Effect bei IN-Transfer zu mapped Club:** `players.club_id` wird aktualisiert — redundant mit sync-players-daily aber ad-hoc. **Orphan-Transfers** (destination nicht in DB z.B. 3. Liga): `team_in_id=NULL` + `team_in_api_football_id` erhalten für Future-Mapping. **API-Quota:** 134 Calls × 2-3× jährlich = ~400/Jahr (0.1% Monat-Pro-Quota). Migration via mcp__supabase__apply_migration. Local migration file für Greenfield-Reset geschrieben (AR-43 Stub-Verbot).

---

## 071 | 2026-04-18 | gameweek-sync Phase-A-Skip (Schedule-3x-Rollback)
- Stage-Chain: SPEC → IMPACT(skipped) → BUILD → PROVE(partial) → LOG
- Files (2):
  - `vercel.json` (Schedule blieb bei `0 6 * * *` nach Rollback)
  - `src/app/api/cron/gameweek-sync/route.ts` (**Phase-A-Skip LIVE** + var-hoisting)
- Proof: `worklog/proofs/071-vercel-diff.txt` + `071-route-diff.txt` + Vercel deploy success dca2c359 at 2026-04-18 post-rollback
- Commits: 7a097ea2 (Slice) + dca2c359 (Healing)
- Notes: **Phase-A-Skip LIVE:** Wenn alle DB-fixtures `status='finished'` aber events ungescored → kein `/fixtures?...&round=` API-Call mehr (saved 7 Calls/Run pro events-only-Pfad). Refactor: `let allFixturesDone` + `let skipPhaseA` hochgezogen, plus 5 Phase-A-Artifacts hoisted (statsResult, importResult, dedupedStats, ghostsRemoved, fixturesToProcess) mit explicit type aliases (PlayerStatRow, StatsResult). Phase A in `if (!skipPhaseA)` gewrappt. tsc clean, next build clean. **Schedule-Optimierung 3× täglich ZURÜCKGEROLLT:** `0 6,14,22 * * *` triggerte Vercel-Cron-Plan-Limit (deploy state=failure, redirect zu `vercel.com/docs/cron-jobs/usage-and-pricing`). Vercel-Plan muss geklärt werden (Pro erlaubt 40 Jobs + beliebige Frequenz, aber Multi-Trigger-Syntax könnte plan-abhängig sein). Offen für Slice 071b: 3 separate Cron-Entries ODER Schedule-Bypass via Vercel-Plan-Upgrade. **Late-Match-Latenz bleibt 8h aktuell.**

---

## 070 | 2026-04-18 | Sync-Injuries-Cron — kritischste Pre-Launch-Lücke geschlossen
- Stage-Chain: SPEC → IMPACT(skipped) → BUILD → PROVE → LOG
- Files (8):
  - `supabase/migrations/20260418120000_slice_070_player_injuries.sql` (NEW — 3 cols + CHECK)
  - `src/app/api/cron/sync-injuries/route.ts` (NEW — 7 calls/run, recovery-logic, status-mapping)
  - `vercel.json` (Cron-Entry: täglich 12:00 UTC)
  - `src/app/(app)/bescout-admin/AdminDataSyncTab.tsx` (4. Card mit HeartPulse)
  - `src/app/api/admin/trigger-cron/[name]/route.ts` (Whitelist erweitert)
  - `messages/de.json` + `messages/tr.json` (3 Keys, TR Anil-approved)
- Proof: `worklog/proofs/070-deploy-status.txt` — Deploy success 09:38:31Z, Endpoints 401/400 (auth+whitelist live), DB-Schema verified, CHECK constraint aktiv
- Commit: dbf98f4e
- Notes: Migration via `mcp__supabase__apply_migration` (NIE supabase db push). API-Football Pro-Tier 7500/day → 7 Calls/Tag (0.1% Quota). Status-Mapping: `Questionable→doubtful`, `Missing Fixture+suspend-keywords→suspended`, sonst `injured`. Recovery-Guard: nur wenn ALLE 7 Ligen erfolgreich (verhindert Mass-Fit bei API-Outage). gameweek-sync `doubtful` (von last_appearance_gw) bleibt unangetastet — injury hat Priorität. Final Live-Test: Anil triggert via Admin → Data Sync → Verletzungen.

---

## 069 | 2026-04-18 | Cron-Frequenz-Fix + Manual-Trigger-Button + Deploy-Healing
- Stage-Chain: SPEC → IMPACT(skipped) → BUILD → PROVE → LOG
- Files:
  - `vercel.json` (3 neue Cron-Entries)
  - `src/app/api/admin/trigger-cron/[name]/route.ts` (NEW — Admin-Auth-Proxy)
  - `src/app/(app)/bescout-admin/AdminDataSyncTab.tsx` (NEW — UI mit 3 Manual-Trigger)
  - `src/app/(app)/bescout-admin/BescoutAdminContent.tsx` (Tab-Registration)
  - `messages/de.json` + `messages/tr.json` (19 Keys, TR Anil-approved)
  - **Healing:** `src/lib/scrapers/transfermarkt-profile.ts` + `src/lib/scrapers/transfermarkt-search.ts` (NEW — extracted from route.ts)
  - **Healing:** `src/app/api/cron/sync-transfermarkt-batch/route.ts` + `src/app/api/cron/transfermarkt-search-batch/route.ts` (remove Named-Exports)
  - **Healing:** `src/components/layout/NotificationDropdown.tsx` + `src/lib/__tests__/playerMath.test.ts` (ESLint disable-comment fix)
  - `.claude/rules/common-errors.md` (2 neue Patterns)
- Proof: `worklog/proofs/069-vercel-diff.txt` + `worklog/proofs/069-deploy-status.txt` (Deploy success 08:55:05Z, Endpoints existieren)
- Commits: 37f2f0d6 (Slice) + 5f48aa0d (Healing) + d18daac9 (Docs)
- Notes: **Kritisches Post-Mortem-Fund:** Deploy-Pipeline war SEIT Slice 064 (2026-04-18) kaputt — 11 Vercel-Deploys in Serie gefailt. Root-Cause: Named-Exports (`parseMarketValue`/`parseSearchResults` etc.) in `route.ts` verletzen Next-14-App-Router Type-Constraint + ESLint-disable-Comments referenzierten nicht-registrierte `@typescript-eslint/no-explicit-any` Rule. `tsc --noEmit` clean, aber `next build` fail. Slice 069 ist de-facto ein **Pipeline-Rescue** — nach Healing sind endlich alle Slices 064-069 live. Cron-Schedules per CEO-Decision: sync-players-daily Montag 03:00 UTC, sync-transfermarkt-batch 4x jaehrlich (1. Jan/Mai/Sep), transfermarkt-search-batch taeglich 02:30 UTC (manuell deaktivieren nach 2 Wochen). Admin-UI neuer Tab "Data Sync" mit 3 Manual-Trigger-Buttons. Final Live-Test (Screenshot + Manual-Trigger-Response) = CEO in bescout.net Admin-Panel.

---

## 058 | 2026-04-18 | P7-Rest Re-Verify auf bescout.net (Slices 044-057)
- Stage-Chain: SPEC(inline) → BUILD(Playwright MCP) → PROVE → LOG
- Files: `worklog/proofs/058-verify-report.md` + 3 Screenshots
- Proof: **VERDICT GREEN** — 0 Regressions, 14 Slices live verified auf bescout.net. Notifications-Dropdown zeigt i18n-keys korrekt ("Aufstieg: Elite!" tierPromotionLevel + "Scout-Tipp... 10 Credits" tipReceivedNotif). 0 raw "Trader"/"BSD" user-facing. Player-Detail lädt mit pbt-authenticated-only policy (Slice 056). Profile + Market + Timeline alle 0 console-errors.
- Commit: 7ae8ec71
- Notes: Re-Verify-Slice nach 14 deployed Slices. Bestaetigt dass Slice 044-057 keine Regressions auf live verursacht haben. Nicht verifiziert: Mobile 393px, Club-Admin Revenue-Tab (jarvis-qa hat kein admin), Push-Notifications Empfang, echter TR-Locale-Switch — alle kosmetisch / Beta-Feature. **Pilot-Readiness: GREEN fuer alle heute implementierten Hardening-Slices.**

---

## 057 | 2026-04-18 | notify_watchlist_price_change i18n — TR-Initiative 14/14 ✅
- Stage-Chain: SPEC(inline) → IMPACT(schema-check) → BUILD → PROVE → LOG
- Files:
  - `supabase/migrations/20260418200000_slice_057_notify_watchlist_price_change_i18n.sql` (NEW)
  - `messages/de.json`, `messages/tr.json` — +2 Keys (priceAlertDownBody, priceAlertUpBody für Resolver-Convention)
- Proof: 14/14 notification-RPCs schreiben structured i18n (Query `body ~ 'i18n_key'`). DE+TR 4880 keys. tsc clean.
- Commit: 7f3cebbf
- Notes: Ersetzt AR-59 async-client-resolve-Pattern. Trigger liest player_name direkt via NEW.first_name+last_name statt playerNameCache-client-roundtrip. DE-Fallback title+body gefuellt. Resolver-Convention braucht {key}Body — priceAlertDownBody/priceAlertUpBody als Duplikate von priceAlertBody hinzugefuegt. **TR-i18n Initiative abgeschlossen: 14/14 notification-RPCs migriert.**

---

## 056 | 2026-04-18 | pbt_* Policies TO authenticated (Nitpick 045)
- Stage-Chain: SPEC(inline) → IMPACT(grep) → BUILD → PROVE → LOG
- Files:
  - `supabase/migrations/20260418190000_slice_056_pbt_tighten_to_authenticated.sql` (NEW)
  - `src/lib/__tests__/db-invariants.test.ts` — INV-32 Allowlist-Reason updated
- Proof: Policies jetzt `TO authenticated` (war `{public}`). Kein Frontend-Consumer aus anon-Kontext. 31/31 INV-Tests gruen, tsc clean.
- Commit: 944693a1
- Notes: Nitpick-Follow-Up aus Slice 045 Review. pbt_treasury + pbt_transactions hatten SELECT `USING (true) TO public` → anon konnte Treasury-State lesen. Jetzt nur authenticated. Transparenz-by-design bleibt fuer eingeloggte User gegeben.

---

## 055 | 2026-04-18 | TR-i18n Social/Admin RPCs + message-Column Bug-Fixes (048c)
- Stage-Chain: SPEC → IMPACT(live-query) → BUILD → PROVE → LOG
- Files:
  - `supabase/migrations/20260418180000_slice_055_tr_i18n_social_admin_rpcs.sql` (NEW) — 8 RPCs migriert
  - `messages/de.json`, `messages/tr.json` — je +16 neue notifTemplates keys (total 4878 each)
  - `worklog/specs/055-048c-tr-i18n-social-admin-rpcs.md`, `worklog/proofs/055-i18n-verify.txt`
- Proof: 13/14 notification-RPCs schreiben structured i18n. 4 Latent-Bugs gefixt (message→body). tsc clean, 31/31 INV-Tests gruen.
- Commit: d8771b4d
- Notes: 048c Follow-Up. TR-i18n Initiative komplett (ausser notify_watchlist_price_change - AR-59 async-pattern). Migriert: accept_mentee, admin_delete_post, claim_scout_mission_reward, refresh_user_stats, request_mentor, subscribe_to_scout, sync_level_on_stats_update, verify_scout. Latent-Bug-Fixes (4 RPCs hätten 42703 geworfen): accept_mentee, request_mentor, claim_scout_mission_reward, verify_scout auf body-Column umgestellt. BSD→Credits in claim_scout_mission_reward + subscribe_to_scout-error nebenbei.

---

## 054 | 2026-04-18 | TR-i18n Money-Path RPCs (048b Follow-Up)
- Stage-Chain: SPEC → IMPACT(live-query) → BUILD → PROVE → LOG
- Files:
  - `supabase/migrations/20260418170000_slice_054_tr_i18n_money_rpcs.sql` (NEW) — 4 RPCs migriert
  - `messages/de.json`, `messages/tr.json` — je +10 neue notifTemplates keys
  - `worklog/specs/054-048b-tr-i18n-money-rpcs.md`, `worklog/proofs/054-i18n-verify.txt`
- Proof: 4 RPCs + reward_referral (Slice 048) = 5 RPCs schreiben structured i18n. DE+TR synchron 4862 keys. tsc clean, 31/31 INV-Tests gruen.
- Commit: 444d82bf
- Notes: 048b Follow-Up. Migriert: award_dimension_score (rangUp/Down), send_tip (tipReceivedNotif), calculate_ad_revenue_share (adRevenuePayout), calculate_creator_fund_payout (creatorFundPayout). Bug-Fixes nebenbei: send_tip v_receiver_name → v_sender_name rename + BSD→Credits in 2 Notification-Bodies. Rest (9 RPCs) als 048c Follow-Up.

---

## 053 | 2026-04-18 | B-01 Realtime-Orders refetchInterval Polling
- Stage-Chain: SPEC → IMPACT(inline) → BUILD → PROVE → LOG
- Files:
  - `src/lib/queries/orders.ts` (+2 Zeilen refetchInterval + Doc-Comment)
  - `src/lib/__tests__/playerMath.test.ts` (tsc-Type-Fix aus Slice 052 — asPlayer helper)
  - `worklog/specs/053-b01-realtime-orders-polling.md`
- Proof: Orderbook-Queries nutzen jetzt aktives 30s-Polling waehrend Tab fokussiert. tsc clean, playerMath 9/9 Tests gruen.
- Commit: 7fb137ae
- Notes: XS-Slice Variante-2 #10/10 FINAL. Briefing war stale (sagte 2min staleTime), tatsaechlich bereits 30s seit Slice 008. Einziger verbliebener Gap war refetchInterval fuer aktive User — jetzt geschlossen. Realtime-Subscription als 053b post-Beta (wenn Live-Usage das verlangt). **VARIANTE-2 KOMPLETT ABGESCHLOSSEN 10/10.**

---

## 052 | 2026-04-18 | B-03 UI-Mixing-Extraktion (playerMath)
- Stage-Chain: SPEC → IMPACT(grep) → BUILD → PROVE → LOG
- Files:
  - `src/lib/playerMath.ts` (NEW) — computePlayerFloor + computeHoldingPnL
  - `src/lib/__tests__/playerMath.test.ts` (NEW) — 9 Unit-Tests
  - `src/components/player/index.tsx, PlayerRow.tsx`, `src/features/market/components/marktplatz/WatchlistView.tsx`, `src/features/market/hooks/useMarketData.ts` — 4 Call-Sites angepasst
  - `worklog/specs/052-b03-ui-mixing-extraction.md`, `worklog/proofs/052-playermath-tests.txt`
- Proof: 4 Floor-Price-Duplikationen eliminiert, 9/9 neue Unit-Tests gruen, tsc clean. Kein visueller Regression.
- Commit: 4612bdfd
- Notes: S-Slice Variante-2 #9/10. TradingCardFrame hat KEINE Floor-Math-Duplikation (grep-confirmed, pure presentation) → out-of-scope. Extraction folgte DRY + Testability Principles.

---

## 051 | 2026-04-18 | B-06 Error-Chains Community + Fantasy (J3-Pattern)
- Stage-Chain: SPEC → IMPACT(grep-audit) → BUILD → PROVE → LOG
- Files:
  - `src/components/community/hooks/useCommunityActions.ts` (7 locations fixed)
  - `src/components/community/ReportModal.tsx` (1 location + imports)
  - `worklog/specs/051-b06-error-chains-community-fantasy.md`, `worklog/proofs/051-error-chain-audit.txt`
- Proof: Fantasy bereits compliant. Community: 7 raw err.message leaks → tErrors(mapErrorToKey(normalizeError(err))) resolved. tsc clean, 72/72 useCommunityActions tests gruen.
- Commit: e002d00f
- Notes: S-Slice Variante-2 #8/10. J3-Pattern (Trading, 2026-04-14) analog auf Community angewandt. i18n-Key-Leak-Klasse geschlossen fuer community-Consumer. result.error + catch-blocks beide resolved.

---

## 050 | 2026-04-18 | B-02 Service Return-Type Konsistenz + OperationResult Refactor
- Stage-Chain: SPEC → IMPACT(grep) → BUILD → PROVE → LOG
- Files:
  - `src/types/index.ts` — neuer shared `OperationResult = {success, error?}` type
  - `src/lib/services/club.ts, fanWishes.ts, posts.ts, platformAdmin.ts, bounties.ts, contentReports.ts` — 10 inline-casts ersetzt
  - `worklog/specs/050-b02-service-return-type-audit.md`, `worklog/proofs/050-audit-report.txt`
- Proof: 10 Money-Path Services gespotcheckt alle aligned. 10 inline `{ success, error? }`-casts auf `OperationResult` refactored. 31/31 INV-Tests gruen, tsc clean.
- Commit: d7123c87
- Notes: S-Slice Variante-2 #7/10. Audit ergab NO DRIFT in Money-Path — dann Refactor fuer maintenance-friendliness nachgeschoben. Reduced inline-type-noise. Coverage durch TSC + INV-23 + INV-32 mehrfach layered.

---

## 049 | 2026-04-18 | A-07 RPC-Response-Shape-Audit Coverage Expansion
- Stage-Chain: SPEC → IMPACT(live-diff) → BUILD → PROVE → LOG
- Files:
  - `src/lib/__tests__/db-invariants.test.ts` (+3 entries, +1 EXCLUDED) — INV-23 Whitelist erweitert
  - `worklog/specs/049-a07-rpc-response-shape-audit.md`, `worklog/proofs/049-inv23-vitest.txt`
- Proof: 94 service-called RPCs identifiziert, 3 missing aus INV-23 zu whitelist addiert (get_club_balance, rpc_get_player_percentiles) + 1 zu EXCLUDED (rpc_get_user_social_stats). INV-23 gruen.
- Commit: b4c33b36
- Notes: S-Slice Variante-2 #6/10. Coverage 76 → 78 Shape-guarded RPCs. Mystery-Box-Bug-Klasse erweitert geschuetzt. Scope-Out: 17 non-jsonb RPCs (scalar returns) + Audit-Helper-Verbesserung fuer non-literal-jsonb_build (Slice 007b).

---

## 048 | 2026-04-18 | TR-i18n Notifications Foundation + reward_referral Pilot
- Stage-Chain: SPEC → IMPACT(inline) → BUILD → PROVE → LOG
- Files:
  - `supabase/migrations/20260418160000_slice_048_notifications_i18n_columns.sql` (NEW) — add i18n_key + i18n_params columns
  - `supabase/migrations/20260418160100_slice_048_reward_referral_i18n.sql` (NEW) — Pilot RPC migriert
  - `src/types/index.ts` — DbNotification + i18n_key + i18n_params
  - `src/components/layout/NotificationDropdown.tsx` — resolveTitle/resolveBody generalisiert (if notif.i18n_key → tNotifTpl)
  - `messages/de.json` + `messages/tr.json` — 4 neue notifTemplates keys (beide synchron 4852 keys)
  - `worklog/specs/048-tr-i18n-notifications-foundation.md` + `worklog/proofs/048-schema-after.txt`
- Proof: Schema deployed, reward_referral schreibt i18n_key+params (verifiziert via pg_get_functiondef). 31/31 INV-Tests gruen, NotificationDropdown test gruen, tsc clean.
- Commit: f2809047
- Notes: L-Slice gesplittet in 048 (Foundation + 1 Pilot) + 048b (Money-Path RPCs) + 048c (Social/Admin). Variante-2 Position #5/10. Backwards-compatible: title/body bleiben gefuellt als DE-Fallback, Client bevorzugt i18n_key wenn vorhanden. Erweitert bestehendes AR-59-Pattern (price_alert) auf generischen Key-Lookup.

---

## 047 | 2026-04-18 | Historische Notifications Wording umschreiben
- Stage-Chain: SPEC → IMPACT(inline) → BUILD(data-migration) → PROVE → LOG
- Files:
  - `supabase/migrations/20260418150000_slice_047_notifications_wording_rewrite.sql` (NEW) — 4 UPDATE statements
  - `worklog/specs/047-historische-notifications-wording.md`, `worklog/proofs/047-before-after.txt`
- Proof: BEFORE 45 Trader + 3 BSD → AFTER 0/0. 52 Sammler + 5 Credits total. 263 Gesamt-Rows unveraendert.
- Commit: fc1124f6
- Notes: XS-Slice Variante-2 #4/10. Komplementiert Slice 043 (RPC-Bodies gefixt). Migration idempotent via REPLACE + WHERE LIKE. Nicht-Scope: `message`-Column-Bug in accept_mentee/request_mentor-Bodies (diese RPCs haben im INSERT notifications-columns eine non-existing `message` col — aber die RPCs sind nicht live-callable, werden silent bei ersten Call fehlschlagen. Separater Slice 047b wenn ueberhaupt.).

---

## 046 | 2026-04-18 | A-04 Live-Ledger-Health Reconciliation + INV-33
- Stage-Chain: SPEC → IMPACT(live-query) → BUILD(data-migration) → PROVE → LOG
- Files:
  - `supabase/migrations/20260418140000_slice_046_ledger_reconciliation.sql` (NEW) — 69 compensating welcome_bonus tx-rows fuer Dev-Accounts
  - `src/lib/__tests__/db-invariants.test.ts` (+80 lines) — INV-33 mit pagination-based wallet vs tx-sum drift-check
  - `worklog/specs/046-a04-ledger-health.md`, `worklog/proofs/046-ledger-query.txt`, `worklog/proofs/046-inv33-vitest.txt`
- Proof: 69 drift Users → 0 drift. 124/124 balanced. Total reconciled 2,887,052 $SCOUT (= 288M cents). INV-33 gruen, 31/31 INV-Tests grun. tsc clean.
- Commit: c01c0691
- Notes: Variante-2 Slice #3/10. Szenario B (N drift) statt Szenario A (0 drift). Alle 69 drift-User sind Dev/Test/Demo (bot001-050, test*, demo-*, elif_mgr, jarvisqa, k_dmrts). Kein produktiver User betroffen (Beta-Launch noch nicht live). Drift entstand pre-Slice-022 als Welcome-Bonus direkt in wallets.balance ohne transactions-row geschrieben wurde. Fix: compensating transactions-row mit created_at < MIN(existing_tx) — INV-16 bleibt gruen (last-balance_after unveraendert). INV-33 faengt zukuenftige drift-Klasse (wallet-mutation ohne tx-log).

---

## 045 | 2026-04-18 | A-03 RLS-Matrix komplett (INV-32)
- Stage-Chain: SPEC → IMPACT(inline) → BUILD → PROVE → LOG
- Files:
  - `supabase/migrations/20260418130000_slice_045_rls_matrix_audit.sql` (NEW) — Audit-RPC `get_rls_policy_matrix()`
  - `src/lib/__tests__/db-invariants.test.ts` (+180 lines) — INV-32 mit EXPECTED_PUBLIC (60) + EXPECTED_SENSITIVE (56) Listen
  - `worklog/specs/045-a03-rls-matrix-komplett.md`, `worklog/proofs/045-matrix-{before,after}.txt`, `worklog/proofs/045-inv32-vitest.txt`
- Proof: 120 public Tables auditiert, 60 qual=true allowlisted, 56 sensitive-blocklist protected, 0 violations. 30/30 INV-Tests gruen.
- Commit: 42690cbc
- Notes: Variante-2 Slice #2/10. INV-32 erweitert INV-26 (8 Tables) auf komplette Matrix. Reviewer PASS. Future-Follow-Up (non-blocking): `pbt_treasury`/`pbt_transactions` Policies `TO PUBLIC` — anon kann Treasury lesen. Post-Slice-Polish-Thema (falls Business Transparenz auf authenticated beschraenken will). Sonst: 120 Tables entsprechen Erwartungen (urspruenglich 114 geschaetzt, Live-Count: 120).

---

## 044 | 2026-04-18 | A-02 Vollstaendiger auth.uid() Body-Audit + INV-31
- Stage-Chain: SPEC → IMPACT(live-DB-scan) → BUILD → PROVE → LOG
- Files:
  - `supabase/migrations/20260418120000_slice_044_auth_uid_body_audit.sql` (NEW) — 3 Body-Guards (accept_mentee, request_mentor, subscribe_to_scout) + REVOKE authenticated award_dimension_score + neue Audit-RPC get_security_definer_user_param_audit()
  - `supabase/migrations/20260418120100_slice_044_part2_cancel_scout_subscription.sql` (NEW) — Part-2 Body-Guard cancel_scout_subscription (Audit-during-fix entdeckt)
  - `src/lib/__tests__/db-invariants.test.ts` (+70 lines) — INV-31 komplette SECURITY-DEFINER-Matrix
  - `worklog/specs/044-a02-auth-uid-body-audit.md`, `worklog/impact/044-a02-auth-uid-body-audit.md`, `worklog/proofs/044-{audit-before,audit-after,inv31-vitest}.txt`
- Proof: Audit 74 RPCs, 0 needs_fix. INV-31 gruen. INV-21 weiterhin gruen (kein Regression).
- Commit: e96f34e1
- Notes: Variante-2 Slice #1/10. Reviewer PASS mit 2 Nitpicks (anon-grant auf Audit-RPC = defensiv ok, Spec-Pfad-Drift korrigiert). Slice 005 hatte A-02 partiell (4 RPCs) gefixt, Slice 044 schliesst Klasse komplett. 5 Kategorie-A Exploit-RPCs gehaertet (accept_mentee, request_mentor, subscribe_to_scout, cancel_scout_subscription mit AR-44-Body-Guard; award_dimension_score REVOKE authenticated alignt mit Intent aus src/lib/services/scoutScores.ts:109). 41 loose_guard+authenticated RPCs als "client-only" dokumentiert, scope-out für Slice 044b. Audit-RPC self-documenting Pattern — Breakdown: 41/15/5/4/3/2/2/2 = 74.

---

## 040 | 2026-04-17 | ClubProvider.test.tsx CI-flake Fix
- Stage-Chain: BUILD → PROVE → LOG
- Files: `src/components/providers/__tests__/ClubProvider.test.tsx` (waitFor timeout 5000ms)
- Proof: 5/5 local gruen
- Commit: tba
- Notes: Slice 038 CI-run scheiterte an diesem Test (waitFor default 1000ms CI-slow). 3 waitFor-Calls auf `{timeout: 5000}` umgestellt.

---

## 043 | 2026-04-17 | Compliance-Wording Trader→Sammler + BSD→Credits
- Stage-Chain: SPEC → IMPACT(DB-audit) → BUILD → PROVE → LOG
- Files:
  - `supabase/migrations/20260417210000_trader_bsd_wording_compliance.sql` (NEW)
  - `worklog/specs/043-trader-bsd-wording-fix.md` (NEW)
  - `worklog/proofs/043-rpc-bodies-after.txt` (NEW)
- Proof: award_dimension_score has_sammler=true/has_trader_literal=false; send_tip has_credits=true/has_bsd=false.
- Commit: tba
- Notes: Slice 032 Flow 13 fand 2 Wording-Verstoesse in Notifications. Root: hardcoded DE-Strings in DB-RPCs (UI rendert 1:1 ohne Client-i18n). award_dimension_score: 'Trader' label → 'Sammler' (business.md Securities-Glossar). send_tip: "BSD" → "Credits" in 3 Stellen (2 Errors + Notification-Body). Historische Daten nicht umgeschrieben.

## 042 | 2026-04-17 | EventSummaryModal PUNKTE=0 Race-Fix
- Stage-Chain: SPEC → IMPACT(grep) → BUILD → PROVE → LOG
- Files:
  - `src/features/fantasy/hooks/useScoredEvents.ts` (+`e.userPoints != null` filter)
  - `src/features/fantasy/mappers/eventMapper.ts` (Number coerce auf userPoints/Rank/Reward)
  - `worklog/specs/042-event-summary-race-fix.md` + `worklog/proofs/042-{fix,fantasy-no-modal.png}` (NEW)
- Proof: tsc clean, fantasy 103/103.
- Commit: tba
- Notes: Slice 032 Flow 12 Modal zeigte PUNKTE=0 trotz Top-3 470. Race: useScoredEvents triggert Modal sofort, useLineupScores ist async → event.userPoints=undefined. Plus Postgres NUMERIC kommt als String ("470.00") via PostgREST → Number-coerce defensive. Live-verify aktuell nicht moeglich (BeScout Classic war GW 35, current=30) — defensive Fix.

## 041 | 2026-04-17 | event-entry RPCs Wrapper-Pattern Doku
- Stage-Chain: SPEC → BUILD → PROVE → LOG
- Files:
  - `supabase/migrations/20260417200000_event_entry_wrapper_doc.sql` (NEW — 5 COMMENT stmts)
  - `.claude/rules/common-errors.md` (+Public-Wrapper+Internal-RPC Pattern)
  - `worklog/specs/041-event-entry-wrapper-doc.md` + `worklog/proofs/041-comments-applied.txt` (NEW)
- Proof: 5/5 COMMENTs gesetzt — Slice 032b Flow 10 finding (rpc_lock_event_entry direct-call 403) ist by-design dokumentiert.
- Commit: tba
- Notes: Kein bug, nur doku. Pattern: lock_event_entry(p_event_id) wrapper injiziert auth.uid() → rpc_lock_event_entry(p_event_id, p_user_id) internal. REVOKE authenticated auf inner verhindert auth-to-other-user-Exploit. common-errors.md Eintrag erklaert Audit-Pattern + Unterschied zu Slice 035 internal-helper.

## 039 | 2026-04-17 | user_achievements 409 race — upsert ignoreDuplicates
- Stage-Chain: SPEC → IMPACT(grep) → BUILD → PROVE → LOG
- Files:
  - `src/lib/services/social.ts` (insert → upsert+ignoreDuplicates)
  - `worklog/specs/039-user-achievements-upsert-race.md` (NEW)
  - `worklog/proofs/039-{fix,live-verify}.txt` (NEW)
- Proof: `worklog/proofs/039-live-verify.txt` — Live-Buy auf bescout.net post-deploy: 0 console-errors (vorher 7×409 user_achievements UNIQUE in Slice 038 verify).
- Commit: e18b634d
- Notes: 5 Caller (trading×2, offers, ipo, useProfileData) fire checkAndUnlockAchievements parallel. Concurrent SELECT identisch → beide INSERT → 409. Fix: upsert mit `onConflict: 'user_id,achievement_key', ignoreDuplicates: true`. Race-loser hat data=null → kein Push in newUnlocks → Notification/Ticket-dedup automatisch. social-tests 37/37, tsc clean.

## 037 | 2026-04-17 | 8 transactions.type Drifts Cleanup — INV-30 Allowlist EMPTY
- Stage-Chain: SPEC → IMPACT(inline) → BUILD → PROVE → LOG
- Files:
  - `supabase/migrations/20260417190000_transactions_type_drift_cleanup.sql` (NEW)
  - `src/lib/transactionTypes.ts` (+event_entry_unlock, +scout_subscription)
  - `src/lib/activityHelpers.ts` (mappings fuer 8 types — alt+neu beide gemappt)
  - `messages/de.json` + `messages/tr.json` (+2 neue labels)
  - `src/lib/__tests__/db-invariants.test.ts` (INV-18 snapshot +6, INV-30 allowlist EMPTY)
  - `worklog/specs/037-transactions-type-drift-cleanup.md` (NEW)
  - `worklog/proofs/037-result.txt` (NEW)
- Proof: db-invariants 28/28 gruen incl. INV-30 ohne Allowlist; lib-suite 1332/1332.
- Commit: tba (close-commit)
- Notes: 2× RPC-Rename (poll_earning→poll_earn, research_earning→research_earn) + 6× CHECK extended (vote_fee, ad_revenue_payout, creator_fund_payout, event_entry_unlock, scout_subscription, scout_subscription_earning). INV-30 Allowlist jetzt LEER — alle 9 known drifts gefixt. Live-DB-Migration durch via apply_migration.

## 036 | 2026-04-17 | sync_event_statuses 42501 — Internal-Helper + pg_cron
- Stage-Chain: SPEC → IMPACT(inline) → BUILD → PROVE → LOG
- Files:
  - `supabase/migrations/20260417180000_sync_event_statuses_internal_cron.sql` (NEW — 3 RPCs + cron schedule)
  - `src/app/api/events/route.ts` (sync-call entfernt)
  - `worklog/specs/036-sync-event-statuses-grant-fix.md` (NEW)
  - `worklog/proofs/036-{pre-state,cron-run,logs-clean}.txt` (NEW)
- Proof: `worklog/proofs/036-logs-clean.txt` — 5/5 cron-runs succeeded (jede Minute), 0× permission-denied seit Migration.
- Commit: 1e73eeca
- Notes: /api/events route hat sync_event_statuses mit anon-key client gerufen → 42501. Pattern analog Slice 035: `_sync_event_statuses_internal()` ohne guards (service_role only), public wrapper behaelt admin-guard, `cron_sync_event_statuses()` wrapper mit pre/post counts fuer monitoring, pg_cron schedule alle 1 min. API-Route entlasten (cron handhabt sync). Manueller Test 15:02 success=true, Cron seit 15:04 alle 5 Runs gruen.

## 035 | 2026-04-17 | trg trade_refresh auth_uid_mismatch — Internal-Helper Fix
- Stage-Chain: SPEC → IMPACT(inline DB-audit) → BUILD → PROVE → LOG
- Files:
  - `supabase/migrations/20260417170000_refresh_airdrop_score_trigger_internal.sql` (NEW)
  - `worklog/specs/035-trg-trade-refresh-investigation.md` (NEW)
  - `worklog/proofs/035-verdict.md` (NEW)
- Proof: `worklog/proofs/035-verdict.md` — Live-Buy 14:52 → seller bot-037 airdrop_updated 14:52:56 (vorher NULL trotz mehrerer Trades).
- Commit: tba (close-commit)
- Notes: AR-44 guard in `refresh_airdrop_score` trippte im trigger-context (auth.uid()=buyer ≠ p_user_id=seller). Trigger fing exception silent → seller-Stats nie aktualisiert. Fix: Internal-Helper-RPC ohne guard (REVOKE all, GRANT service_role only). Public wrapper behaelt AR-44 guard fuer client-Calls. Pattern dokumentiert fuer common-errors.md.

## 032b | 2026-04-17 | Phase 7 Mutating-Flows Resume — 3/3 GREEN
- Stage-Chain: SPEC → IMPACT(skipped) → BUILD(verify-only) → PROVE → LOG
- Files:
  - `worklog/specs/032b-phase7-mutating-flows-resume.md` (NEW)
  - `worklog/proofs/032b-verdict.md` (NEW — Final tabelle Phase 7)
- Proof: `worklog/proofs/032b-verdict.md` — alle 3 Mutating-Flows live verifiziert auf bescout.net.
- Commit: tba (mit close-commit)
- Notes: Flow 6 Sell (place sell @ 1000c → cancel symmetric, status='cancelled'), Flow 7 P2P-Offer (escrow 500c balance/locked symmetric, total wallet konstant), Flow 10 Event-Join (lock_event_entry → entry created, unlock → deleted). Findings: rpc_lock_event_entry direkter Call 403 (Wrapper-Permission-Doku), Modal-Display PUNKTE=0 vs Top-3 470 (UI-Inconsistency). Kein neuer Money-Bug. Phase 7 abgeschlossen, Pilot-Ready Money-Path GREEN.

## 038 | 2026-04-17 | P1 credit_tickets reference_id UUID-Drift + Sanitization
- Stage-Chain: SPEC → IMPACT(inline grep-audit) → BUILD → PROVE → LOG
- Files:
  - `src/lib/services/social.ts` (achievement-key in description statt reference_id)
  - `src/lib/services/tickets.ts` (sanitizeReferenceId helper + JSDoc-hardening)
  - `src/lib/services/__tests__/tickets.test.ts` (drift-lock test)
  - `worklog/specs/038-credit-tickets-uuid-fix.md` (NEW)
  - `worklog/proofs/038-{audit,tsc-vitest,live-verify,marktplatz-pre-buy.png}.{txt,png}` (NEW)
- Proof: `worklog/proofs/038-live-verify.txt` — Live-Buy auf bescout.net post-deploy: 0× credit_tickets 22P02, Wallet exact decrement, second clean trade_buy.
- Commit: 93eed6ba
- Notes: Achievement-Hook in social.ts:522 passte Achievement-Key (string) als p_reference_id (UUID-Spalte) → 22P02 silent crash → Achievement-Tickets seit unbekannt nie gutgeschrieben. Discovered via Slice 034 Live-Buy (14× console-errors). Fix lokal, dann Service-Layer gehaerted: sanitizeReferenceId regex-check verhindert Regression auf social.ts oder neue Caller (gilt fuer creditTickets + spendTickets). CI rerun nach flaky ClubProvider-test. Bonus-Finding: 7× 409 user_achievements UNIQUE-Violations bei wiederholtem Buy → separater Slice 039 (Achievement-Hook upsert-handling).

## 034 | 2026-04-17 | P0 buy_player_sc transactions.type Drift + INV-30 Guard
- Stage-Chain: SPEC → IMPACT(inline DB-Audit) → BUILD → PROVE → LOG
- Files:
  - `supabase/migrations/20260417160000_buy_player_sc_transactions_type_fix.sql` (NEW)
  - `supabase/migrations/20260417160100_get_rpc_transaction_inserts.sql` (NEW Audit-Helper)
  - `src/lib/__tests__/db-invariants.test.ts` (+INV-30 Test)
  - `worklog/specs/034-buy-player-sc-transactions-type-fix.md` (NEW)
  - `worklog/proofs/034-{rpc-body-after,inv30,tsc-vitest,live-buy.png,live-buy}.{txt,png}` (NEW)
- Proof: `worklog/proofs/034-live-buy.txt` — Live-Buy 1 SC Bozkurt: Wallet 799350→798290 (-1060), Holdings 9→10, transactions zeigt `type=trade_buy`, end-to-end auf bescout.net.
- Commit: 0ed500a9
- Notes: buy_player_sc schrieb `'buy'`/`'sell'` statt `'trade_buy'`/`'trade_sell'` → CHECK violation → silent HTTP 400. RPC-Body via apply_migration sofort gefixt + AR-44 REVOKE/GRANT. INV-30 scant alle RPC-Bodies, gleicht type-Strings gegen CHECK ab, meldet Drifts. 9 Slice-037-Followups dokumentiert in Allowlist (poll_earning, vote_fee, ad_revenue_payout, etc). Folge-Findings: (a) credit_tickets 400 fuer Achievement-Tickets (Achievement-Keys statt UUID als reference_id) — Slice 038, (b) Wallet-Header stale nach Buy (UI-Refresh-Bug) — Folge.

## 033 | 2026-04-17 | P0 BuyConfirmModal Money-Display-Drift (Faktor-100-Bug)
- Stage-Chain: SPEC → IMPACT(inline) → BUILD → PROVE → LOG
- Files:
  - `src/features/market/components/MarketContent.tsx` (Inline-Logik → Helper)
  - `src/features/market/components/marketContent.priceCents.ts` (NEW Helper)
  - `src/features/market/components/__tests__/marketContent.priceCents.test.ts` (NEW, 8 Lock-Tests)
  - `src/types/index.ts` (JSDoc-Annotation auf Listing.price)
  - `worklog/specs/033-money-unit-drift-audit.md` (NEW)
  - `worklog/proofs/033-{bug-trace,grep-audit,tsc-vitest,buymodal-fixed.png,mutations}.{txt,png}` (NEW)
- Proof: worklog/proofs/033-buymodal-fixed.png (Live: Burak Çoban 484,31 CR matched Liste + DB-cents/100)
- Commit: 79f244d3
- Notes: Listing.price ist BSD/CR (via centsToBsd in enriched.ts), wurde aber als priceCents an BuyConfirmModal weitergegeben → Modal teilte erneut durch 100 → Anzeige 100x zu klein. RPC haette korrekte cents abgezogen → User-Vertrauensbruch latent. Maskiert nur durch separate RPC-Crashes (Slice 034/035 pending). Audit zeigte: nur 1 Drift-Site existierte, alle anderen Money-UI korrekt.

## 032 | 2026-04-17 | Phase 7 Part 2 — Read-only Flows GREEN, Mutating PAUSED
- Stage-Chain: SPEC → IMPACT(skipped) → BUILD(verify-only) → PROVE(partial) → LOG(partial)
- Files: `worklog/specs/032-phase7-verify-remaining-flows.md` (NEW), 5 Screenshots in worklog/proofs/032-flow-*.png
- Proof: 4/4 Read-only GREEN (Wallet 03, Events 09, Result-Modal 12, Notifications 13). Mutating Flows (5/6/7/10) PAUSED durch P0-Findings.
- Commit: 79f244d3 (gebuendelt mit 033)
- Notes: Flow 5 (Buy from Market) deckte 4 Bugs auf — 1 Display-Drift (gefixt in 033), 3 RPC-/Trigger-Bugs (Slices 034/035/036 pending). Flow 12 zeigte zusaetzlich UI-Inconsistency: Modal "PUNKTE=0" trotz Top-3 Score 470. Flow 13 zeigte Wording "Trader: Aufstieg" + "BSD Tipp" (Compliance-Findings, separat). Slice wird nach 034/035 fortgesetzt.

## 031 | 2026-04-17 | Session 4 Wrapup (Briefing + MEMORY Refresh)
- Stage-Chain: SPEC → IMPACT(skipped) → BUILD(edit) → PROVE → LOG
- Files:
  - `memory/next-session-briefing-2026-04-18.md` (+45/-14 — Slice 030 row + Verify-Details + Verbleibende 8 Flows)
  - `C:/Users/Anil/.claude/projects/C--bescout-app/memory/MEMORY.md` (user-level, Project-Section aktualisiert)
  - `worklog/specs/031-session-4-wrapup.md` (NEW)
  - `worklog/proofs/031-diff.txt` (NEW)
- Proofs:
  - `worklog/proofs/031-diff.txt`
- Commit: 16dc17bf
- Notes: Session 4 Abschluss-Update. Briefing refreshed nach Slice 030 (Phase 7 Verify GREEN — 7 DB-Checks + 7 UI-Flows, 0 Bugs, 0 Regressions). Slice-Tabelle im Briefing erweitert, Verify-Ergebnis-Section neu, Offene-Punkte-Liste restrukturiert: Phase 7 hat jetzt "verified" + "verbleibend"-Split (Flow 1/2/4/8/11/14/15 verified, Flow 3/5/6/7/9/10/12/13 offen fuer naechste Session). MEMORY.md Project-Section aktualisiert: 21 → 30 Slices, Block B 3/5 → 5/5 gruen, CEO-FUs + Phase 7 durch. Fantasy-Integritaet als eigener Bullet-Point. Keine Code/Test-Impact — pure Doc.

---

## 030 | 2026-04-17 | Phase 7 Verify: Touched Flows + DB Invariants (GREEN)
- Stage-Chain: SPEC → IMPACT(inline) → BUILD(E2E test run) → PROVE → LOG
- Files:
  - `worklog/specs/030-phase7-verify-touched-flows.md` (NEW)
  - `worklog/proofs/030-db-checks.txt` (NEW — 7/7 DB-Checks GREEN)
  - `worklog/proofs/030-ui-e2e.txt` (NEW — 7 Flows verifiziert via Playwright)
  - `worklog/proofs/030-verdict.md` (NEW — Final GREEN)
- Proofs:
  - `worklog/proofs/030-verdict.md` (Verdict GREEN)
- Commit: fd00cf1e
- Notes: Full-Verification Deploy bescout.net nach Session 3+4. Part A DB: cron score-pending-events 13/13 succeeded runs, 0 holdings zombies (Trigger 025), rpc_save_lineup Body-Scan alle 9 B4-Reject-Keys live, cron_score_pending_events active/scheduled/LIMIT50, holdings_auto_delete_zero trigger registered, handles k_demirtas/kemal frei, 16 transaction-types alle in activityHelpers gemappt. Part B UI via Playwright MCP + jarvis-qa@bescout.net: Login, Home (19 SCs, 6.949 CR), /transactions (44 Eintraege keine Raw-Leaks, Filter-Bar, CSV), /manager?tab=kader (keine qty=0), /player/[id] (0 errors), RPC direct-call via fetch (auth-chain OK, event_not_found first-check response), Logout (auth-cookie + bs_user + bs_profile wiped → /login). Keine Bugs gefunden. Softwarestand bescout.net GREEN. Restliche 8 Flows (nicht von Session 3+4 touchiert) fuer naechste Session.

---

## 029 | 2026-04-17 | Doc-Refresh Session 4 (common-errors + Briefing)
- Stage-Chain: SPEC → IMPACT(skipped — reine Doku) → BUILD(edit) → PROVE → LOG
- Files:
  - `.claude/rules/common-errors.md` (+88 Zeilen — 5 neue Pattern-Sektionen)
  - `memory/next-session-briefing-2026-04-18.md` (komplett-Rewrite — aktueller Stand Ende Session 4)
  - `worklog/specs/029-doc-refresh-session-4.md` (NEW)
  - `worklog/proofs/029-diff.txt` (NEW — diff stat)
- Proofs:
  - `worklog/proofs/029-diff.txt` (2 Files, 185/-123 Zeilen)
- Commit: 0995ef08
- Notes: Knowledge-Flywheel-Pflege nach 6 Slices (023-028). 5 neue Patterns in common-errors.md: (1) Server-Validation Pflicht fuer Money/Fantasy-RPCs (Slice 023), (2) pg_cron Wrapper-RPC Fail-Isolation per-Item BEGIN/EXCEPTION (Slice 024), (3) Holdings Zombie-Row Auto-Delete-Trigger als Alternative zu N RPC-Patches (Slice 025), (4) Transaction-Type → activityHelpers-Sync nach jedem neuen `INSERT INTO transactions` (Slice 027), (5) auth.users DELETE NO-ACTION-FK-Pre-Cleanup-Audit-Pattern via pg_constraint (Slice 028). Briefing-File komplett geupdated: B4/B5 gruen, alle CEO-FUs durch, Post-Deploy-Verify-Checklist (7 Punkte), Observations (Briefing-Self-Correction 2x in Session 4). Keine tsc/Test-Impact (pure doc). XS Slice analog 022/026.

---

## 028 | 2026-04-17 | Dev-Accounts Cleanup (k_demirtas + kemal)
- Stage-Chain: SPEC → IMPACT(inline — FK-Audit + Row-Counts 44+ Tables) → BUILD(DELETE) → PROVE → LOG
- Files:
  - `worklog/specs/028-dev-accounts-cleanup.md` (NEW)
- Proofs:
  - `worklog/proofs/028-fk-audit.txt` (FK-Map auf auth.users — CASCADE vs NO ACTION)
  - `worklog/proofs/028-before-counts.txt` (Row-Counts 44+ NO-ACTION-Tables gepruft, nur user_tickets mit 2 rows)
  - `worklog/proofs/028-delete-sql.txt` (ausgefuehrte DELETE-Statements)
  - `worklog/proofs/028-after-state.txt` (Post-Verify: alle counts=0, handles_free=true)
- Commit: e45a26b2
- Notes: CEO approved "einfach löschen, bei bedarf lege ich die neu an" 2026-04-17. Uids `eebba1ae-8f30-4ef0-9dcd-84a5f49fbf3c` (k_demirtas/Djembo) + `1c02ad43-074d-4a4d-b611-a3fba9c7f931` (kemal). 2-Step-Cleanup: (1) `DELETE FROM user_tickets WHERE user_id IN (...)` (2 rows, NO-ACTION-FK Blocker), (2) `DELETE FROM auth.users WHERE id IN (...)` cascades zu profiles + wallets + 30+ auto-clean Tables. Von 44+ gepruften user-FK-Tabellen hatte nur user_tickets Rows (welcome-ticket-grants). Kein Trading/Content/Follow etc. Reine Legacy-Wallet+Auth-Rows. Kein Migration-File committed — einmaliger Cleanup, Rollback nicht moeglich (auth.users mit hashed password nicht restorable ohne Backup). handles `k_demirtas` + `kemal` wieder frei fuer Neu-Registrierung via Supabase Auth.

---

## 027 | 2026-04-17 | activityHelpers TR-i18n (4 fehlende transaction-types)
- Stage-Chain: SPEC → IMPACT(inline — live-DB Audit ergab 4 fehlende types statt 10 im briefing) → BUILD → PROVE → LOG
- Files:
  - `src/lib/activityHelpers.ts` (+12 Zeilen, je 4 Branches in getActivityIcon/Color/LabelKey)
  - `messages/de.json` (+4 Keys im `activity` namespace: subscription, adminAdjustment, tipSend, offerExecute)
  - `messages/tr.json` (+4 Keys analog, CEO-approved TR-Labels)
  - `worklog/specs/027-activityhelpers-tr-i18n.md` (NEW)
- Proofs:
  - `worklog/proofs/027-diff.txt` (3 Files, 22 +/- 2)
  - `worklog/proofs/027-tsc.txt` (clean)
  - `worklog/proofs/027-tests.txt` (activityHelpers 17/17)
- Commit: 010b0811
- Notes: Briefing-Korrektur: Live-DB-Audit (SELECT DISTINCT type FROM transactions) ergab **4** unlokalisierte types (subscription/admin_adjustment/tip_send/offer_execute), nicht 10 wie Briefing behauptete. Die uebrigen 28 activityHelpers-Keys hatten bereits DE+TR-Labels. TR-Labels explizit CEO-approved 2026-04-17 per `feedback_tr_i18n_validation.md`. Icons/Colors: subscription→Users/gold (Club-Abo), admin_adjustment→Settings/purple (System), tip_send→Coins/rose (Outflow), offer_execute→CircleDollarSign/gold (Trading). Kein DB-Change. Existing rows behalten raw type, aber UI rendert via `t(getActivityLabelKey(row.type))` nun translated Label. Kein Data-Migration noetig.

---

## 026 | 2026-04-17 | footballData Client-Access Audit (Doc-only, XS)
- Stage-Chain: SPEC → IMPACT(skipped — reine Verifikation) → BUILD(audit) → PROVE → LOG
- Files:
  - `worklog/specs/026-footballdata-client-access-audit.md` (NEW — XS Spec)
  - `worklog/proofs/026-grep-client-access.txt` (NEW — alle .from() Call-Sites)
  - `worklog/proofs/026-rls-policies.txt` (NEW — RLS-Enforcement-Pruefung)
  - `worklog/proofs/026-fill-source.txt` (NEW — 334 formation-Rows Quelle)
  - `worklog/proofs/026-verdict.txt` (NEW — Final GREEN)
- Proofs:
  - `worklog/proofs/026-verdict.txt` (Final Verdict GREEN)
- Commit: aa67e2a0
- Notes: CTO-autonomer Audit-Slice. Briefing Session-3 Punkt 4 ("footballData.ts Client-Access auf server-only Tabellen") geschlossen. Verdict **GREEN**: (a) Alle Client-Reads auf Tabellen mit public SELECT-Policy — legitim. (b) Alle Writes via Admin-RPCs (`admin_map_*`, `admin_import_gameweek_stats`). (c) Silent-Dead-Code in `footballData.ts:549-553` (`supabase.from('fixtures').update(...)` — RLS blockt silent, fixtures hat keine UPDATE-Policy) ohne User-Impact, weil Cron-Route `src/app/api/cron/gameweek-sync/route.ts:826-831` die 334 formation-Rows via `supabaseAdmin` (service_role, RLS bypass) parallel fuellt. (d) Kein AUTH-08-Klasse-Drift: die betroffenen Tabellen (fixtures, fixture_player_stats, player_gameweek_scores) sind public-by-design, nicht in INV-26 SENSITIVE_TABLES. Cleanup (Dead-Code entfernen) out-of-scope — cosmetic, kein Security-Wert. Analog Slice 022 (B-03 UI-Mixing Verification) als Doc-only XS.

---

## 025 | 2026-04-17 | Holdings Auto-Delete-Zero (Trigger Approach)
- Stage-Chain: SPEC → IMPACT(inline in Chat — Pre-Research) → BUILD → PROVE → LOG
- Files:
  - `supabase/migrations/20260417150000_holdings_auto_delete_zero.sql` (NEW — Trigger-Fn `delete_zero_qty_holding()` + Trigger `holdings_auto_delete_zero` AFTER UPDATE OF quantity FOR EACH ROW WHEN NEW.quantity=0)
  - `src/lib/__tests__/db-invariants.test.ts` (+INV-29: body-scan `delete_zero_qty_holding` DELETE-branch + live zero-count)
  - `worklog/specs/025-holdings-auto-delete-zero.md` (NEW)
- Proofs:
  - `worklog/proofs/025-trigger-listing.txt` (2 non-internal triggers auf holdings, beide enabled)
  - `worklog/proofs/025-trigger-body.txt` (Function + Trigger Definition + Semantik)
  - `worklog/proofs/025-smoke-test.txt` (Live-Test PASS — INSERT qty=5 → UPDATE qty=0 → Row DELETED)
  - `worklog/proofs/025-zombie-count.txt` (0 zombies before + after, 513 total holdings)
  - `worklog/proofs/025-tsc.txt` (clean)
  - `worklog/proofs/025-tests.txt` (db-invariants 27/27 inkl. INV-29)
- Commit: 95c498ae
- Notes: CEO approved (b) Trigger-Approach 2026-04-17. Pre-Research ergab **briefing-Korrektur**: nur 3 decrement-RPCs betroffen (accept_offer, buy_from_order, buy_player_sc) — `buy_from_ipo` macht NUR Increment, war faelschlich in briefing. Zero Zombies live (513 holdings, alle qty>=1) → Slice ist reines Future-Proofing. Trigger-Approach statt 3x RPC-Patch: zero-touch auf kritische Money-RPCs, future-proof (neue Decrement-RPCs "just work"). CHECK (quantity >= 0) bleibt unveraendert — Trigger bridged UPDATE→DELETE atomisch. Smoke-Test gegen Live-DB bestaetigt Mechanismus (UUID `c8775934-c9ac-4048-b0c5-474021f2cdba` INSERT → UPDATE qty=0 → count=0 after). Trigger-Granularitaet: `AFTER UPDATE OF quantity` + `WHEN (NEW.quantity=0)` — feuert nur bei echten qty=0-Updates, keine Nebenwirkung auf andere UPDATEs (updated_at etc.). Rollback: `DROP TRIGGER + DROP FUNCTION` — seiteneffektfrei.

---

## 024 | 2026-04-17 | B5 Event Scoring Automation (pg_cron, Option c)
- Stage-Chain: SPEC → IMPACT → BUILD → PROVE → LOG
- Files:
  - `supabase/migrations/20260417130000_cron_score_pending_events.sql` (NEW — wrapper-RPC `cron_score_pending_events()` mit idempotenter Event-Scoring-Loop + AR-44 Block)
  - `supabase/migrations/20260417140000_cron_schedule_score_pending.sql` (NEW — cron.schedule `*/5 * * * *` + Audit-Helper `get_cron_job_schedule(text)` + AR-44 Block)
  - `src/lib/__tests__/db-invariants.test.ts` (+ INV-28: body-fragments + cron-job schedule/active via get_rpc_source + get_cron_job_schedule)
  - `worklog/specs/024-b5-event-scoring-automation.md` (NEW)
  - `worklog/impact/024-b5-event-scoring-automation.md` (NEW)
- Proofs:
  - `worklog/proofs/024-cron-before.txt` (4 jobs aktiv vor apply)
  - `worklog/proofs/024-cron-after.txt` (5 jobs aktiv inkl. score-pending-events */5 * * * *)
  - `worklog/proofs/024-rpc-body.txt` (cron_score_pending_events Body)
  - `worklog/proofs/024-dry-run.txt` (`{success:true, scored:0, skipped:0, errored:0}` — RPC-Compile + Query-Pfad + JSONB-Return OK, keine faelligen events)
  - `worklog/proofs/024-tsc.txt` (clean)
  - `worklog/proofs/024-tests.txt` (db-invariants 26/26 inkl. INV-28)
- Commit: 948f09f2
- Notes: CEO approved (c) pg_cron 2026-04-17. Wrapper findet events mit `status='ended' OR (status='running' AND ends_at <= NOW())` AND `scored_at IS NULL` AND `gameweek IS NOT NULL` — ORDER BY ends_at ASC LIMIT 50. Per-event BEGIN/EXCEPTION-Block fuer Fail-Isolation (ein Crash blockt nicht Batch). `score_event` bereits idempotent via `scored_at IS NOT NULL` Guard + `no_player_game_stats` Early-Exit, keine Body-Aenderung. Neuer Audit-Helper `get_cron_job_schedule(text)` analog zu Slice 023's `get_rpc_source` — service_role-only (AR-44 REVOKE/GRANT korrekt), exclusiv fuer INV-28 genutzt. Bestehender `event-status-sync` cron (15min) bleibt unveraendert — transitioniert weiter `running → ended`, unser neuer cron scort dann `ended + scored_at=NULL`. Worst-case Delay: gameweek-sync 30min + score-cron 5min = ~35min zwischen Event-Ende und User-Reward. Rollback: `SELECT cron.unschedule('score-pending-events')` — Wrapper-RPC darf bleiben (seiteneffektfrei).

---

## 023 | 2026-04-17 | B4 Lineup Server-Validation (Strict-Reject)
- Stage-Chain: SPEC → IMPACT → BUILD → PROVE → LOG
- Files:
  - `supabase/migrations/20260417110000_save_lineup_formation_validation.sql` (NEW — erweitert rpc_save_lineup um 9 neue Error-Keys + Formation-Allowlist + AR-44 Block)
  - `supabase/migrations/20260417120000_audit_helper_rpc_source.sql` (NEW — get_rpc_source helper fuer CI-Body-Scan, service_role only, AR-44 Block)
  - `src/lib/services/__tests__/lineups.test.ts` (+9 it(...) Cases: invalid_formation, gk_required, invalid_slot_count_{def|mid|att}, extra_slot_for_formation, captain_slot_empty, wildcard_slot_invalid, wildcard_slot_empty)
  - `src/lib/__tests__/db-invariants.test.ts` (+INV-27: rpc_save_lineup body-scan via get_rpc_source — verifiziert alle 9 neuen Error-Keys + 2 Allowlist-Samples + preservation der bestehenden checks)
  - `worklog/specs/023-b4-lineup-server-validation.md` (NEW)
  - `worklog/impact/023-b4-lineup-server-validation.md` (NEW)
- Proofs:
  - `worklog/proofs/023-rpc-before.txt` (alter Body, keine Formation-Validation)
  - `worklog/proofs/023-rpc-after.txt` (neuer Body-Presence-Scan 11/11 TRUE + Grant-Matrix kein anon/PUBLIC)
  - `worklog/proofs/023-tsc.txt` (clean)
  - `worklog/proofs/023-tests-lineups.txt` (lineups.test.ts 29/29 = 20 original + 9 B4)
  - `worklog/proofs/023-tests-invariants.txt` (db-invariants.test.ts 25/25 inkl. INV-27)
- Commit: a7fd95d4
- Notes: CEO approved (a) Strict-Reject am 2026-04-17. Neue Stage-Order im RPC: Pos 6.5a..j nach v_all_slots-Build und vor duplicate_player-Check. Billige Early-Exit-Checks (Formation/GK/Slot-Count/Captain/Wildcard-Empty) vor teuren DB-Joins (insufficient_sc SELECT + salary_cap SELECT). Formation-Allowlist: 3 11er (`1-4-3-3`, `1-4-4-2`, `1-3-4-3`) + 5 7er (`1-2-2-2`, `1-3-2-1`, `1-2-3-1`, `1-3-1-2`, `1-1-3-2`) = 8 IDs aus `src/features/fantasy/constants.ts`. Kein Client-Code-Change (Consumer senden bereits valide IDs). Neue Helper-RPC `get_rpc_source` ist service_role-only (AR-44 REVOKE/GRANT korrekt), wird ausschliesslich von INV-27 genutzt. Rollback via `_rpc_body_snapshots`.

---

## 022 | 2026-04-18 | B-03 UI-Mixing Verification (Doc-only, XS)
- Stage-Chain: SPEC → IMPACT(skipped — reine Verifikation) → BUILD(audit) → PROVE → LOG
- Files:
  - `worklog/specs/022-b03-ui-mixing-verification.md` (NEW — XS Spec)
  - `worklog/proofs/022-player-kpis-extract.txt` (NEW)
  - `worklog/proofs/022-tradingcardframe-props.txt` (NEW)
  - `worklog/proofs/022-floor-rule.txt` (NEW)
  - `worklog/proofs/022-audit-result.txt` (NEW — Final Verdict)
  - `worklog/proofs/022-tsc.txt` (NEW — tsc clean, 0 Zeilen)
  - `memory/next-session-briefing-2026-04-18.md` (Residuen-Punkt 5 → GREEN + Proof-Links)
- Proofs:
  - `worklog/proofs/022-audit-result.txt` (Verdict GREEN + Begruendung)
  - `worklog/proofs/022-tsc.txt` (clean)
- Commit: 5ce2de5c
- Notes: CTO-autonomer Audit-Slice. Verdict **B-03 = GREEN**: (a) TradingCardFrame konsumiert `priceChange24h` als Prop aus `CardBackData` (Line 19/380), PlayerHero.tsx:81 liefert `player.prices.change24h` direkt durch — kein lokaler Preis-Delta-Compute. (b) PlayerKPIs bezieht L5 als Prop (`player.perf.l5`), Floor folgt system-weitem Architektur-Pattern aus `.claude/rules/trading.md` ("Floor Price Client-seitig berechnen: `Math.min(...sellOrders.map(o => o.price))`") mit 6 konsistenten Call-Sites (useMarketData, WatchlistView, MarketContent, KaderTab, PlayerRow, PlayerKPIs). (c) PnL/PnLPct sind reine UI-Arithmetik auf zwei Props (Floor + avgBuyPrice + quantity) — kein DB-Equivalent existiert per-User, kein Drift-Vektor. Keine Code-Aenderung erforderlich. Walkthrough-Archive (`memory/_archive/2026-04-meta-plans/walkthrough/05-blocker-b.md`) bleibt unveraendert (Archiv). B-03-Residuum in `next-session-briefing-2026-04-18.md` Punkt 5 als GREEN markiert.

---

## 021 | 2026-04-17 | Orders RLS Tighten (CEO Option 2, Seal)
- Stage-Chain: SPEC → IMPACT(inline — Slice 020 war Prep, orders Services bereits RPC-basiert) → BUILD → PROVE → LOG
- Files:
  - `supabase/migrations/20260417070100_orders_rls_tighten.sql` (NEW — DROP orders_select (qual=true), CREATE orders_select_own_or_admin via auth.uid() OR club_admin OR platform_admin)
  - `src/lib/__tests__/db-invariants.test.ts` (INV-26 EXPECTED_PERMISSIVE entfernt `orders.orders_select`)
  - `src/lib/__tests__/auth/rls-checks.test.ts` (NEW AUTH-16 Test: user cannot read other user's orders)
- Proofs:
  - `worklog/proofs/021-rls-before.txt` (vorher: qual=true)
  - `worklog/proofs/021-rls-after.txt` (nachher: auth.uid() = user_id OR admin-check)
  - `worklog/proofs/021-tsc.txt` (clean)
  - `worklog/proofs/021-tests.txt` (db-invariants 24/24 + auth/rls-checks 16/16, inkl. AUTH-16 new = 40 total)
- Commit: 71953052
- Notes: AUTH-08-Klasse vollstaendig geschlossen. Orderbook-UX weiterhin verfuegbar via `get_public_orderbook` RPC (Slice 020). Regulaere User sehen nur eigene Orders direct (Cancel-Button, social.ts:308 self-count). Club-Admin + Platform-Admin behalten Fan-Analytics-Zugriff via policy-branches — analog holdings_select_own_or_admin (Slice 014). INV-26 jetzt scharf ohne whitelist fuer orders. Kein Realtime-Publication fuer orders (pruefung via migrations-grep). Kein INSERT/UPDATE/DELETE Policy noetig — alle Mutationen via SECURITY DEFINER RPCs (place_sell_order, place_buy_order, buy_from_order, cancel_order).

---

## 020 | 2026-04-17 | Orders Anonymize via Handle-Projection (CEO Option 2, Prep)
- Stage-Chain: SPEC → IMPACT(inline — 8 UI-Consumers + 3 Services + 9 Prop-Types gemappt) → BUILD → PROVE → LOG
- Files (24 total):
  - DB: `supabase/migrations/20260417070000_get_public_orderbook_rpc.sql` (NEW — SECURITY DEFINER, AR-44 REVOKE/GRANT, handle via LEFT JOIN profiles, is_own via COALESCE)
  - Types: `src/types/index.ts` (new `PublicOrder` type; `Listing` — replaced `sellerId` with `isOwn: boolean` + `sellerHandle: string | null`)
  - Services: `src/lib/services/trading.ts` (3 reads via rpc('get_public_orderbook'): getSellOrders, getAllOpenSellOrders, getAllOpenBuyOrders)
  - Queries: `src/lib/queries/orders.ts`, `src/lib/queries/enriched.ts` (PublicOrder[] throughout, sellerId removed)
  - Market UI: BestandView, BuyOrdersSection, MarktplatzTab, PortfolioTab, TransferListSection, MarketSearch (DbOrder[] → PublicOrder[], o.user_id → o.is_own / o.handle)
  - Player Detail UI: BuyModal, TradingTab, OrderbookDepth, OrderbookSummary, SellModal, usePlayerTrading, usePlayerDetailData, HoldingsSection, BuyConfirmation
  - Manager: KaderTab.tsx (l.sellerId === userId → l.isOwn)
  - Tests: TradingTab.test.tsx, usePlayerDetailData.test.ts, useMarketData.test.ts (mock shapes updated)
- Proofs:
  - `worklog/proofs/020-diff-stat.txt` (25 files, 136/136 +/-)
  - `worklog/proofs/020-tsc-step3.txt` (clean, 0 Bytes)
  - `worklog/proofs/020-tests.txt` (24/24 test files, 306/306 tests gruen — market + player/detail + services + queries)
  - `worklog/proofs/020-rpc-sanity.txt` (RPC Call mit 3-Row-Output verified, Grant-Matrix bestaetigt)
- Commit: 59051b08
- **Split-Entscheidung (operational CTO):** Slice 020 = Prep (RPC + Service-Switch + UI-Migration). RLS bleibt qual=true in diesem Slice — verhindert Deploy-Race (RLS-Tighten ohne Code-Deploy = Markt tot 10-30min). Slice 021 tightens RLS + entfernt INV-26 whitelist + fuegt AUTH-16 Test hinzu — nach Verify-Deploy dieses Slices.
- Notes: CEO Option 2 approved (2026-04-17 chat, Slice 019 Finding). Neue `get_public_orderbook(p_player_id, p_side)` RPC projiziert Orders mit `handle` (via LEFT JOIN profiles) und `is_own` (COALESCE(o.user_id = auth.uid(), false)). `user_id` NICHT mehr im Cross-User-Response. Services nutzen RPC, direct `.from('orders').select(user_id,...)` fuer cross-user Reads entfernt. UI-Consumers: `order.user_id === uid` → `order.is_own`, `profileMap[order.user_id]?.handle` → `order.handle`, `@{order.user_id.slice(0,8)}` Fallback → `@{order.handle ?? t('anonSeller')}`. `Listing.sellerId` → `Listing.isOwn + sellerHandle` (KaderTab + enriched.ts). Interne RPC-Lookups in trading.ts (`.from('orders').select('user_id,player_id')` fuer Seller-Notification) bleiben unveraendert — authenticated user liest eigene Order (RLS qual=true heute + tightened RLS future = both OK fuer self-reads). PlayerDetail profileMap nur noch fuer trades buyer/seller-lookup (orders haben handle). Trades-Cache-Helper `queryClient.setQueryData(qk.orders.byPlayer,...)` auf PublicOrder[].

---

## 019 | 2026-04-17 | INV-26 qual=true Regression-Guard (AUTH-08 Klasse)
- Stage-Chain: SPEC → IMPACT(inline — Pattern aus Slice 004/005 wiederverwendet) → BUILD → PROVE → LOG
- Files:
  - `supabase/migrations/20260417060000_audit_helper_rls_qual.sql` (NEW — `get_rls_policy_quals(p_tables text[])` SECURITY INVOKER Audit-RPC, AR-44 REVOKE/GRANT)
  - `src/lib/__tests__/db-invariants.test.ts` (+ INV-26: scant 8 sensible Tabellen auf qual='true' / qual=NULL SELECT-Policies, EXPECTED_PERMISSIVE-Whitelist fuer intentionale public-policies)
- Proofs:
  - `worklog/proofs/019-diff.txt` (1 Migration + 1 Test-Block, 73 Zeilen)
  - `worklog/proofs/019-tsc.txt` (clean)
  - `worklog/proofs/019-tests.txt` (db-invariants 24/24 gruen inkl. INV-26)
  - `worklog/proofs/019-rpc-sanity.txt` (RPC-Output: 14 Policies, 2 qual=true whitelisted, 0 violations)
- Commit: 61d2438c
- **CEO-Aufmerksamkeit erforderlich:** INV-26 hat `orders.orders_select` mit `qual='true'` gefunden — gleiche AUTH-08-Klasse wie Slice 014 Holdings. Orderbook ist typisch public-by-design (Market-Maker), aber `user_id`-Exposure ist die Frage: (a) keep-public, in INV-26 EXPECTED_PERMISSIVE belassen. (b) Anonymize via handle-projection, neuer Slice mit RLS-Tighten + Service-Projection. Aktuell als TODO im Test whitelisted mit CEO-Decision-Kommentar — Test gruen, aber Fund dokumentiert.
- Notes: Pattern etabliert (Slice 004 `get_rls_policy_coverage`, Slice 007 `get_rpc_jsonb_keys`, Slice 005 `get_auth_guard_audit`). INSERT-policies mit qual=NULL bewusst ignoriert (USING applies zu row-being-inserted, WITH CHECK restricts payload). `user_stats.Anyone can read stats` explicit in Whitelist (Leaderboard-Public-Design). Test scannt: holdings, transactions, ticket_transactions, activity_log, user_stats, wallets, orders, offers.

---

## 018 | 2026-04-17 | Public-Profile Holdings Fetch-Gate (Slice 014 follow-up)
- Stage-Chain: SPEC → IMPACT(inline, XS-Change) → BUILD → PROVE → LOG
- Files:
  - `src/components/profile/hooks/useProfileData.ts` (Line 91 gated: `isSelf ? getHoldings(targetUserId) : Promise.resolve([])`)
- Proofs:
  - `worklog/proofs/018-diff.txt` (1 Zeile)
  - `worklog/proofs/018-tsc.txt` (clean)
  - `worklog/proofs/018-tests.txt` (profile/**: 54/55 gruen, 1 skipped nicht-bezogen)
- Commit: 0b087e32
- Notes: CTO-autonomous Follow-Up zu Slice 014. Nach RLS-Tighten liefert `getHoldings(otherUserId)` auf Non-Admin-Public-Profile-Views immer `[]` — reine Network-Call-Verschwendung. Gate analog `getMyPayouts`-Pattern in derselben `Promise.allSettled`. Portfolio-Tab ist UI-seitig self-only laut profile.md — kein Verhaltensaenderung. Admin-Oversight ueber Admin-Panel, nicht Profile-Page (das war auch vor-014 der Fall, Regression neutral). Network-Savings: 1 Call pro Public-Profile-Visit.

---

## 017 | 2026-04-17 | Player Detail Query-Defer (B3, Flow-Audit Flow 8)
- Stage-Chain: SPEC → IMPACT(inline — 1 Hook-File, keine Service/DB-Change) → BUILD → PROVE → LOG
- Files:
  - `src/components/player/detail/hooks/usePlayerDetailData.ts` (belowFoldReady state + 300ms timeout, 8 Query-Aufrufe auf deferred-gate umgestellt via undefined-propagation / active-param)
- Proofs:
  - `worklog/proofs/017-diff.txt` (61 Zeilen diff, 1 File)
  - `worklog/proofs/017-tsc.txt` (leer = clean)
  - `worklog/proofs/017-tests.txt` (usePlayerDetailData.test.ts: 8/8 passed)
  - `worklog/proofs/017-query-count.md` (Before/After Tabelle: 15 initial → 7 initial auf Trading-Tab, −53%)
- Commit: 13cdf352
- Notes: B3 von Block B. Bug-Klasse: 15-19 parallele Queries auf `/player/[id]` uebersteigen Browser-Concurrency-Limit (6), 9+ Queries warten in zweiter Welle = 200-500ms Latenz-Penalty auf 4G. Fix: `belowFoldReady` Pattern (bekannt aus `useHomeData` 800ms, `useCommunityData` 500ms) mit 300ms delay — Hero + Trading-Actions sofort, Info-Layer (Counter, Badges, Mastery, Timeline, Trades, Research, LiquidationEvent) deferred. Critical-Path: Player, HoldingQty, Watchlist, SellOrders, ActiveIPO, OpenBids, PBT = 7 Queries initial. Nach 300ms: 8 deferred Queries in zweiter Welle (wieder ueber 6-Limit, aber zu diesem Zeitpunkt ist Hero bereits gerendert — UX-Win ist vor allem Time-to-First-Render). Tab-gated Queries (Performance/Community) unveraendert. Null-Safety bereits etabliert (alle Consumer nutzen `?? []`, `?? null`). Post-Deploy Playwright-Messung gegen bescout.net = Phase 7 (separate).

---

## 016 | 2026-04-17 | Transactions Pagination (B2, Flow-Audit Flow 14)
- Stage-Chain: SPEC → IMPACT(inline — Consumers gecheckt, neue Infinite-Hooks parallel zu alten) → BUILD → PROVE → LOG
- Files:
  - `src/lib/services/tickets.ts` (getTicketTransactions offset-Default-Param, `.range()` statt `.limit()`)
  - `src/lib/queries/keys.ts` (neue Query-Keys: `transactions.infinite`, `tickets.transactionsInfinite`)
  - `src/lib/queries/misc.ts` (neue Hook `useInfiniteTransactions`)
  - `src/lib/queries/tickets.ts` (neue Hook `useInfiniteTicketTransactions`)
  - `src/lib/queries/index.ts` (Barrel-Export `useInfiniteTransactions`)
  - `src/components/transactions/TransactionsPageContent.tsx` (Umstellung auf Infinite-Hooks, Load-More-Button mit Loader2-Spinner, tc('loadMore') common-i18n-Key)
- Proofs:
  - `worklog/proofs/016-diff.txt` + `016-diff-stat.txt` (6 Files, 75 insertions / 13 deletions)
  - `worklog/proofs/016-tsc.txt` (leer = clean)
  - `worklog/proofs/016-service-tests.txt` (wallet-v2 + tickets: 40/40 gruen)
  - `worklog/proofs/016-profile-tests.txt` (profile/**: 54/55 gruen, 1 skipped nicht 016-related)
  - `worklog/proofs/016-render-check.md` (8 Edge-Cases statisch verifiziert: 0 Tx, <50, =50, 120+10, Filter-aktiv, Doppel-Click, Initial-Error, Page-N-Error)
- Commit: 9efb5983
- Notes: B2 von Block B. Bug-Klasse: 200-Row-Upfront-Load ohne Pagination skalierte nicht fuer Heavy-User. Fix: Neue `useInfinite*`-Hooks parallel zu den alten (alte bleiben fuer Profile Timeline-Tab mit fixer Top-50-Anzeige unveraendert). Pagination via `.range(offset, offset+pageSize-1)` auf `transactions` + `ticket_transactions`. `getNextPageParam` returned `undefined` wenn `lastPage.length < pageSize` — verhindert Infinite-Loop bei exakt-pageSize-Responses. Load-More-Button fetched nur die Queries die noch `hasNextPage=true` haben, Loader2-Spinner mit `isFetchingNextPage`-Guard. Common-i18n-Key `loadMore` existierte bereits, kein Message-Change. Scope-Out: Server-Side Filter, echte Server-Aggregation (earned/spent Total via RPC) = CEO-Scope, Infinite-Scroll via IntersectionObserver, Page-Error-Toast. Profile-Tests (useProfileData, ProfileView) blieben gruen weil alte Hook-Signaturen unveraendert.

---

## 015 | 2026-04-17 | Logout React Query Cache Clear (B1, Flow-Audit Flow 15)
- Stage-Chain: SPEC → IMPACT(skipped — 1-File AuthProvider-Edit, kein DB/RPC/Service) → BUILD → PROVE → LOG
- Files:
  - `src/components/providers/AuthProvider.tsx` (clearUserState: queryClient.clear() unconditional statt nur bei SIGNED_OUT, 5 Zeilen inkl. Kommentar)
- Proofs:
  - `worklog/proofs/015-diff.txt` (git diff: 1 File, 5 Zeilen)
  - `worklog/proofs/015-tsc.txt` (leer = clean)
  - `worklog/proofs/015-tests.txt` (auth/rls + db-invariants: 38/38 gruen)
  - `worklog/proofs/015-flow-trace.md` (6 Szenarien Vorher/Nachher, identifiziert Szenario 3 — Grace-Period-Expire — als tatsaechlichen Bug-Fix)
- Commit: b2079826
- Notes: B1 von Block B (flow-audit Restrisiken). Bug-Klasse: Cache-Clear war an `event === 'SIGNED_OUT'` gated — bei Silent-Token-Expire laeuft aber `clearUserState(event='INITIAL_SESSION')` via Grace-Period-Timer-Expire. Folge: Cache von User 1 bleibt, User 2 auf same tab sieht stale data (insbesondere Queries ohne user-id im Key). Fix: `queryClient.clear()` unconditional in clearUserState. Andere 5 Szenarien unveraendert (Szenario 1/2/6 clearen wie gehabt, Szenario 4 ist no-op bei leerem Cache, Szenario 5 nutzt weiter invalidate statt clear). Kein Playwright-E2E (Grace-Period-Expire ohne Auth-Harness nicht reproduzierbar) — Code-Flow-Trace als Equivalent. CEO-autonom per explizitem Briefing-Freigabe-Commit f0c9bdc7.

---

## 014 | 2026-04-17 | Holdings RLS Tighten (AUTH-08, CEO-approved Option 2)
- Stage-Chain: SPEC → IMPACT(inline) → BUILD → PROVE → LOG
- Files:
  - `supabase/migrations/20260417050000_holdings_rls_tighten.sql` (NEW, DROP alte Policy + CREATE neue own-or-admin Policy)
  - `supabase/migrations/20260417050100_get_player_holder_count_rpc.sql` (NEW, SECURITY DEFINER RPC fuer cross-user holder-count, AR-44 REVOKE/GRANT)
  - `src/lib/services/wallet.ts` (getPlayerHolderCount nutzt jetzt RPC statt direkte count-Query)
  - `src/lib/services/__tests__/wallet-v2.test.ts` (3 tests auf mockSupabaseRpc statt mockSupabaseCount)
  - `.claude/rules/common-errors.md` (neues Pattern "RLS Policy qual=true auf sensiblen Tabellen" dokumentiert)
- Proofs:
  - `worklog/proofs/014-policy-before.txt` (alte Policy: qual=true)
  - `worklog/proofs/014-policy-after.txt` (neue Policy: own | club_admin | platform_admin + RPC sanity check)
  - `worklog/proofs/014-auth-tests.txt` (AUTH-* Suite 15/15 gruen inkl. AUTH-08)
  - `worklog/proofs/014-inv-tests.txt` (INV-19 + INV-20 gruen)
  - `worklog/proofs/014-wallet-tests.txt` (wallet-v2 25/25 gruen)
- Commit: ae2d66e
- Notes: AUTH-08 geschlossen. CEO-approved Option 2 (2026-04-17 chat): partial tighten statt strict-own-only oder keep-as-is. Portfolio-Privacy fuer regulaere User wiederhergestellt; Club-Admin Fan-Analytics + Platform-Admin Sicht bleiben funktional via policy-branch statt RPC-wrap. Nur 1 Produktions-Consumer (`getPlayerHolderCount`) brach und wurde via SECURITY DEFINER RPC umgehoben. Public-Profile `getHoldings(targetUserId)` liefert jetzt `[]` bei fremdem Profil — kein UI-break (Portfolio-Tab ist isSelf-only laut profile.md), nur minor eager-fetch waste (Optimization-Slice separat). Scope-Out: per-club-scoping fuer Club-Admins, column-level avg_buy_price redaction, fetch-gate in useProfileData. common-errors.md um qual=true Pattern erweitert (neu nach Slice 005 A-02 Eintrag).

---

## 013 | 2026-04-17 | Players NFC Normalize (TURK-03)
- Stage-Chain: SPEC → IMPACT(inline) → BUILD → PROVE → LOG
- Files:
  - `supabase/migrations/20260417040000_players_nfc_normalize.sql` (NEW, idempotent UPDATE)
- Proofs:
  - `worklog/proofs/013-before-after.txt` (byte-diff target row + global count)
  - `worklog/proofs/013-tests.txt` (TURK-* Suite 10/10 gruen)
- Commit: 5b88ba3
- Notes: 1 Row in NFD-dekomposierter Form gefixt. `T. İnce` (id=bb44cdb4-...) hatte `last_name` bytes `49 cc 87 6e 63 65` (`I` + U+0307 combining dot + `nce`) waehrend alle anderen İ-Spieler in NFC-Form sind (U+0130 single codepoint, bytes `c4 b0`). Test TURK-03 failed weil JS `String.prototype.includes('İ')` strict Codepoint-Compare ist — SQL `ILIKE` matched beide Formen bereits. Fix: `UPDATE players SET ... = normalize(x, NFC)` idempotent. Kein UX-Impact, nur byte-Kodierung geaendert. Scope-Out: Clubs/Profiles/Research etc. — keine Drift dort (TURK-06/TURK-07 gruen). Import-Path-Analyse nicht im Scope (einmalige Drift, 1 Row). NFC-CHECK-Constraint als Prevention falls Drift wiederkehrt, separater Slice.

---

## 012 | 2026-04-17 | Zero-Qty Holding Cleanup (INV-08, EDGE-17)
- Stage-Chain: SPEC → IMPACT(inline) → BUILD → PROVE → LOG
- Files:
  - `supabase/migrations/20260417030000_cleanup_zero_qty_holding.sql` (NEW, 1 DELETE)
- Proofs:
  - `worklog/proofs/012-before-after.txt` (1 Row vor, 0 Rows nach; Daten-Safety-Notiz)
  - `worklog/proofs/012-tests.txt` (db-invariants + boundaries/edge-cases: 43/43 gruen)
- Commit: c958c6a
- Notes: Einmalige Data-Cleanup. 1 Orphan-Row (jarvisqa/Livan Burcu, quantity=0, avg_buy_price=10000, erstellt 2026-04-15) geloescht via Migration. Kein Value-Impact (0 DPCs = 0 SC). INV-08 + EDGE-17 jetzt gruen. **Root-Cause NICHT gefixt — CEO-Scope:** Trading-RPCs (`buy_player_sc`, `accept_offer`, `buy_from_order`, `buy_from_ipo`) dekrementieren `holdings.quantity` via UPDATE statt DELETE-when-zero. Dokumentiert im Proof als Follow-Up (RPC-Fix + CHECK `quantity > 0` gemeinsam). Erste neue quantity=0-Row nach diesem Slice = Beweis fuer CEO-Fix-Dringlichkeit.

---

## 011 | 2026-04-17 | Locked-Balance Test Coverage Gap (INV-07/MF-WAL-04/MF-ESC-04)
- Stage-Chain: SPEC → IMPACT(inline) → BUILD → PROVE → LOG
- Files:
  - `src/lib/__tests__/db-invariants.test.ts` (INV-07 erweitert)
  - `src/lib/__tests__/money/wallet-guards.test.ts` (MF-WAL-04 erweitert)
  - `src/lib/__tests__/money/escrow.test.ts` (MF-ESC-04 erweitert)
- Proofs:
  - `worklog/proofs/011-diff.txt` (git diff: 3 Files, 93 LOC)
  - `worklog/proofs/011-tests.txt` (3 target tests gruen, INV-07 + MF-WAL-04 + MF-ESC-04)
- Commit: abf9b0b
- Notes: Test-Gap-Fix, kein DB/Code-Change. Alle 3 Tests pruefen jetzt auch `bounties WHERE is_user_bounty=true AND status='open' AND created_by=<user>` als Lock-Quelle (Escrow-Pattern aus `bounties.ts:246`). jarvisqa (user 535bbcaf..., locked_balance=50000, 1 open user-bounty, 0 orders, 0 offers) ist jetzt korrekt als legitime Escrow erkannt. Scope-Out: Exakt-Summen-Check (locked_balance == Σ escrow sources), holding_locks fuer Fantasy — separate Slices.

---

## 010 | 2026-04-17 | INV-25 Service-Throw-Key Coverage (B-02 sub-class)
- Stage-Chain: SPEC → IMPACT(inline) → BUILD → PROVE → LOG
- Files:
  - `src/lib/__tests__/error-keys-coverage.test.ts` (NEW, 171 LOC)
- Proofs:
  - `worklog/proofs/010-inv25.txt` (2 tests passed)
  - `worklog/proofs/010-diff.txt` (scan inventory + drift-class doc)
- Commit: e19f9c2
- Notes: Statischer CI-Regression-Guard gegen den Drift-Pattern "Service wirft neuen Key, KNOWN_KEYS nicht erweitert, Consumer faellt silent auf errors.generic". Scannt `src/lib/services` + `src/features/*\/services` nach literal `throw new Error('<identifier>')`, assertert Coverage via `mapErrorToKey`-Pass-through-Branch ODER `INV25_WHITELIST` (namespace-spezifisch, consumer-resolved). Aktueller Stand: 60 Service-Files, 32 Call-Sites, 14 distinct keys, 13 in KNOWN_KEYS, 1 whitelisted (insufficient_wildcards → fantasy namespace resolved by useEventActions.ts:173). Zweiter Test schuetzt gegen stale Whitelist-Eintraege. Scope-Out: Expression-Form-Throws, Component-/API-Route-Throws, broader B-02 Return-Type-Audit. B-02 Status bleibt GELB (nur error-Kanal-Drift geschlossen).

---

## 009 | 2026-04-17 | Error-States Community/Fantasy (B-06)
- Stage-Chain: SPEC → IMPACT(inline) → BUILD → PROVE → LOG
- Files:
  - `src/components/admin/hooks/useClubEventsActions.ts` (+ `mapErrorToKey, normalizeError` import, +`tErrors` Namespace, 6 Error-Setter-Stellen gehaertet)
  - `src/components/fantasy/CreatePredictionModal.tsx` (+ imports, +`tErrors`, 2 Error-Setter gehaertet)
- Proofs:
  - `worklog/proofs/009-diff.txt` (git diff: 2 Files)
  - `worklog/proofs/009-tsc.txt` (empty = clean)
  - `worklog/proofs/009-tests.txt` (events-v2 + events: 77/77 green)
- Commit: 9835025
- Notes: Defensive Haertung gegen i18n-Key-Leak-Klasse (common-errors.md J1/J3). 8 Error-Setter-Stellen in 2 Consumer-Files umgestellt von `err.message` / `result.error` direkt → `tErrors(mapErrorToKey(normalizeError(...)))`. Pattern aus `features/fantasy/hooks/useEventActions.ts:187` (canonical J3-Fix). Community/Fantasy Service-Side (Bounties, Wildcards, Lineups, Offers) war bereits J3 gehaertet — B-06 war Consumer-Seitige Lueckenschliessung. Scope-out: `src/app/(auth)/login/page.tsx` x4 Auth-Exposures (vendor-Text, separate Error-Klasse, eigener Slice). Blocker-Status: B-06 geschlossen. Verbleibend: B-02, B-03, B-04, B-05.

---

## 008 | 2026-04-17 | Floor-Price-Drift eliminieren (B-01)
- Stage-Chain: SPEC → IMPACT(inline) → BUILD → PROVE → LOG
- Files:
  - `src/lib/queries/orders.ts` (staleTime 2*60_000 → 30_000 auf `useAllOpenOrders` + `useAllOpenBuyOrders` + Begruendungs-Kommentar)
  - `src/features/market/hooks/useMarketData.ts` (Tot-Fallback `?? p.prices.referencePrice` entfernt, Fallback-Chain dokumentiert)
- Proofs:
  - `worklog/proofs/008-staletime-diff.txt` (git diff: 2 Files, 14 LOC)
  - `worklog/proofs/008-tsc.txt` (empty = clean)
  - `worklog/proofs/008-tests.txt` (977/977 service tests green)
- Commit: c1869bf (+ hotfix 9a1dc32 — useMarketData test consolidation)
- Notes: Cross-User Drift-Fenster von 2min auf 30s reduziert — user sieht stale Sell-Order max. 30s nach Fremduser-Fill (vorher 2min), dann auto-Refetch via React Query. Self-Action-Drift unverändert 0s (Post-Mutation-Invalidation via `qk.orders.all` in `features/market/mutations/trading.ts:71+87`). Kein Money-Impact (Floor ist display-only; `buy_player_sc` revalidiert FOR UPDATE gegen DB). Kanonische Fallback-Chain jetzt konsistent zu `enriched.ts:74` (`floorFromOrders ?? prices.floor ?? 0`); `referencePrice`-Fallback war dead-code post-enrichment, entfernt. Scope-Out: Realtime-Subscription auf orders-Tabelle fuer 0s-Drift — separater Slice. Performance-Impact im Pilot-Volume (~10-50 active users) akzeptabel.

---

## 007 | 2026-04-17 | RPC Response Shape Audit (A-07)
- Stage-Chain: SPEC → IMPACT(inline) → BUILD → PROVE → LOG
- Files:
  - `supabase/migrations/20260417020000_audit_helper_rpc_jsonb_keys.sql` (new, Helper-RPC `get_rpc_jsonb_keys(text)`)
  - `src/lib/__tests__/db-invariants.test.ts` (+225 Zeilen, INV-23 + 68-RPC Whitelist)
  - `src/lib/services/mysteryBox.ts` (`cosmeticName` entfernt — dead field, RPC emits only `cosmeticKey`)
  - `src/types/index.ts` (`cosmetic_name?` aus `MysteryBoxResult` entfernt)
  - `src/app/(app)/hooks/useHomeData.ts` (pass-through `cosmetic_name` entfernt)
  - `src/components/gamification/MysteryBoxModal.tsx` (Fallback-Chain bereinigt)
  - `src/components/inventory/MysteryBoxHistorySection.tsx` (Fallback-Chain bereinigt)
  - `src/lib/services/__tests__/smallServices.test.ts` (Mock-Fixture angepasst)
- Proofs: `worklog/proofs/007-rpc-shape-audit.txt` (116 RPCs tabelliert), `worklog/proofs/007-inv23.txt` (vitest green)
- Commit: 6b50212
- Notes: A-07 schließt Blocker-A komplett. Audit-Helper parsed plpgsql-Body mit echtem Paren/String/Comment-Tokenizer (kein Regex) und extrahiert Top-Level `jsonb_build_object`/`json_build_object` Keys. INV-23 lockt 68 Service-konsumierte RPCs (alle Money-Pfade inkl. Trading/IPO/Offers/Liquidation/Mystery) gegen Service-Cast-Drift (AR-42-Klasse: camelCase RPC vs snake_case Cast → silent `undefined`). 1 echte Drift gefunden und behoben: `cosmeticName` in mysteryBox.ts war seit RPC-Deploy tot (RPC emits nur `cosmeticKey`), Consumer-Fallback-Chain hat es kompensiert → User-visible Behavior UNVERAENDERT. 2 RPCs (admin_delete_post, update_community_guidelines) in RPC_SHAPE_EXCLUDED dokumentiert wegen string-literal-cast Returns. Pre-existing INV-07/INV-08 failures (Holdings/Wallet Data-Drift) nicht Scope 007 — separater Data-Cleanup.

---

## 006 | 2026-04-17 | ALL_CREDIT_TX_TYPES ⊇ DB alignment (A-05 Follow-up)
- Stage-Chain: SPEC → IMPACT(skipped) → BUILD → PROVE → LOG
- Files: `src/lib/transactionTypes.ts` (+10 canonical DB types), `src/lib/__tests__/db-invariants.test.ts` (+INV-22)
- Proof: `worklog/proofs/006-inv22.txt` — 28 DB types, all in TS
- Commit: (pending)
- Notes: TS Union war subset drift vs DB (fehlten: admin_adjustment, order_cancel, offer_execute, liga_reward, mystery_box_reward, tip_send, subscription, founding_pass, referral_reward, withdrawal). Pragmatischer Fix: ADD (keep TS-extras fuer activityHelpers compat), KEINE removals. INV-22 guard'd. activityHelpers-Labels+Icons fuer neue DB-types: separater CEO-Slice (TR-i18n).

---

## 005 | 2026-04-17 | Auth-Guard Hardening (A-02)
- Stage-Chain: SPEC → IMPACT(inline) → BUILD → PROVE → LOG
- Files:
  - `supabase/migrations/20260417000000_auth_guard_hardening.sql` (4 RPCs hardened)
  - `supabase/migrations/20260417010000_audit_helper_auth_guard.sql` (INV-21 helper)
  - `src/lib/__tests__/db-invariants.test.ts` (+55 Zeilen, INV-21)
- Proofs: `worklog/proofs/005-{before,after}-grants.txt`, `005-inv21.txt`
- Commit: (pending)
- Notes: 4 SECURITY DEFINER RPCs hatten authenticated+p_user_id+kein auth.uid() (A-02 exploit class, P3-22 in phase3-db-audit). Fix: REVOKE authenticated + defense-in-depth body guard (`IF auth.uid() IS NOT NULL AND auth.uid() IS DISTINCT FROM p_user_id THEN RAISE`). Cron (service_role) bleibt funktional. Client nutzt Wrapper (lock_event_entry, refresh_my_airdrop_score) unveraendert. INV-21 meta-test: 193 SECURITY DEFINER geprueft, 0 violations. CEO-approved 2026-04-17.
- Severity: [HIGH] rpc_lock_event_entry + renew_club_subscription (fremdes Wallet/Tickets deduct), [MED] check_analyst_decay (Score-Penalty auf fremde User), [LOW] refresh_airdrop_score (recompute).

---

## 004 | 2026-04-16 | RLS Policy Coverage Audit (A-03)
- Stage-Chain: SPEC → IMPACT(skipped) → BUILD → PROVE → LOG
- Files:
  - `supabase/migrations/20260416250000_audit_helper_rls_coverage.sql` (new, Helper-RPC `get_rls_policy_coverage()`)
  - `src/lib/__tests__/db-invariants.test.ts` (+80 Zeilen, INV-19 + INV-20)
- Proof: `worklog/proofs/004-rls-coverage.txt`
  - INV-19: 120 RLS-tables, 4 whitelisted zero-policy, 0 violations
  - INV-20: 14 critical money/trading tables, 0 coverage drifts
- Commit: (pending)
- Notes: Zwei Guards gegen die "RLS enabled + 0 policies" Silent-Fail-Klasse (common-errors Session 255). Whitelist = 4 server-only-Tabellen (`_rpc_body_snapshots`, `club_external_ids`, `player_external_ids`, `mystery_box_config`). Folge-Investigation: `footballData.ts` nutzt regularen Client auf `club_external_ids` + `player_external_ids` → wahrscheinlich nur von API-Routes gecalled (service-role). Visual-QA waere noetig um zu bestaetigen dass KEIN Browser-Path sie direkt liest.

---

## 003 | 2026-04-16 | CHECK Constraint → TS Alignment (A-05)
- Stage-Chain: SPEC → IMPACT(skipped) → BUILD → PROVE → LOG
- Files:
  - `supabase/migrations/20260416240000_audit_helper_check_enum_values.sql` (new, Audit-Helper-RPC)
  - `src/lib/__tests__/db-invariants.test.ts` (+145 Zeilen, INV-18)
- Proof: `worklog/proofs/003-check-alignment.txt` — 14 Constraints checked, 0 drifts
- Commit: (pending)
- Notes: INV-18 lockt 14 Money/Identity-CHECK-Enums als Snapshot (transactions.type, orders.*, offers.*, events.*, players.position, user_stats.tier, research_posts.*, lineups.captain_slot, club_subscriptions.tier, user_founding_passes.tier). Jede Schema-Aenderung an einer dieser triggert Fail → Reminder TS/UI syncen. Audit-Helper-RPC `get_check_enum_values(text)` als public SECURITY INVOKER, REVOKE anon/GRANT auth nach AR-44-Template.
- Follow-up-Backlog (aus Recherche, nicht in diesem Slice gefixt): `src/lib/transactionTypes.ts` hat Drift zu DB (`buy`/`sell` statt `trade_buy`/`trade_sell`, `poll_earning` statt `poll_earn`, `scout_subscription_earning` statt `subscription`, fehlt `admin_adjustment`/`order_cancel`/`offer_execute`/`liga_reward`/`mystery_box_reward`/`tip_send`/`founding_pass`/`referral_reward`/`withdrawal`). Fix-Slice spaeter (CEO-Scope: Money-Labels).

---

## 002 | 2026-04-16 | Wallet Profile FK + Orphan Cleanup
- Stage-Chain: SPEC → IMPACT(inline) → BUILD → PROVE → LOG
- Files: `supabase/migrations/20260416230000_wallets_profile_fk_cascade.sql` (new, 68 lines), `src/lib/__tests__/db-invariants.test.ts` (+44 lines, INV-17)
- Proofs:
  - `worklog/proofs/002-migration-before.txt` — 2 orphans, 0 FK
  - `worklog/proofs/002-migration-after.txt` — 0 orphans, CASCADE FK live
  - `worklog/proofs/002-inv17.txt` — INV-16 + INV-17 beide gruen
- Commit: (pending)
- Notes: CEO-approved Option B (modified). Orphan 1 (`9e0edfed` taki.okuyucu@gmx.de, abandoned signup, 1M balance, 0 activity) → DELETE. Orphan 2 (`862c96a1` testtrading@bescout.test, 2 tx, 0 trades/holdings) → Profile-Backfill mit is_demo=true. FK `wallets_user_id_profiles_fkey` auf profiles(id) ON DELETE CASCADE. Zukuenftige profile-deletes cascaden Wallet automatisch. INV-17 als permanenter Regression-Guard.

---

## 001 | 2026-04-16 | Wallet-Konsistenz-Check (Blocker A-04)
- Stage-Chain: SPEC → IMPACT(skipped) → BUILD → PROVE → LOG
- Files: `src/lib/__tests__/db-invariants.test.ts` (+87 Zeilen, INV-16 hinzugefuegt)
- Proof: `worklog/proofs/001-wallet-invariant.txt` — 127 Wallets geprueft, 124 mit Transactions, 0 Violations
- Commit: (pending)
- Notes: Invariante `wallets.balance == latest transactions.balance_after` haelt live. Ledger-Drift-Risiko aus Blocker A-04 damit fuer Pilot-DB verifiziert, kein Folge-Fix noetig. Health-Check bleibt als Regression-Guard dauerhaft.
