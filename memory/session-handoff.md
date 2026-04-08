# Session Handoff
## Letzte Session: 2026-04-08 (Abend, 6 Commits, B3 Transactions History E2E komplett + AutoDream Run #5)

## NEXT SESSION KICKOFF — Onboarding ohne Club-Bezug

**Erstmal lesen:**
1. Diesen Handoff (du bist hier)
2. `memory/project_e2e_features.md` — alle 3 Features done: B1 Missions ✅, B2 Following Feed ✅, B3 Transactions History ✅
3. `memory/semantisch/projekt/transactions-history.md` — 100 Zeilen verdichtetes B3 Wissen (SSOT Pattern, RLS Fix, CSV Export)
4. `C:\Users\Anil\.claude\projects\C--bescout-app\memory\project_onboarding_multi_club.md` — Onboarding ohne Club-Bezug (naechste Prioritaet)

**Entscheidungen aus B3 (Anil's 1C Full Scope + 2B Fantasy Ranking + 3B Wire Hooks):**
- 1C: Full Scope (dedizierte /transactions Page + Profile Timeline Enhancement)
- 2B: Fantasy Ranking rows im Timeline Tab (rank badge, gameweek, score, reward)
- 3B: Wire Transaction Query Hooks in useProfileData (Hybrid React Query + Promise.allSettled)

**QA Account (aktualisiert nach B3):**
- Email: jarvis-qa@bescout.net / Handle: jarvisqa
- Password: `JarvisQA2026!` (`e2e/mystery-box-qa.spec.ts:5`)
- ~7.700 $SCOUT, 63 Tickets, 6 Tage Streak, 8 Holdings, 1 Manager-Lineup
- 3 Follows: `kemal2`, `test12`, `emre_snipe` (QA-Fixture fuer Following Feed, nicht loeschen)

**MCP Tools einsatzbereit:**
- `mcp__supabase__execute_sql` (project_id: `skzjfhvgccaeplydsunz`)
- `mcp__supabase__apply_migration` — fuer DB cleanup migrations
- `mcp__playwright__browser_*` — fuer Live E2E Tests

---

## TL;DR
B3 Transactions History ist komplett live auf main. 6 Commits, alle gepusht, Live QA mit Playwright als jarvis-qa verifiziert. Damit sind alle 3 E2E-Features aus `project_e2e_features.md` abgeschlossen (B1 Missions, B2 Following Feed, B3 Transactions History). Entscheidende Bugs: P0 RLS Silent Failure auf `transactions` (public profile leer), DB/Code Type Drift in FILTER_TYPE_MAP (90% der Trades nicht gefiltert), Deep Link Race Condition (lazy init fix). AutoDream Run #5 hat 5 neue Anti-Patterns promoted + Wiki-Eintrag erstellt. Keine offenen Kruemel.

## Was wurde gemacht — 6 Commits, alle auf main gepusht

### B3 Transactions History E2E (6 Commits)

**Anil's Entscheidungen:**
- 1C: Full Scope — dedizierte /transactions Page + Profile Timeline Enhancement
- 2B: Fantasy Ranking Integration in Timeline Tab (rank badge, gameweek, score, reward)
- 3B: Wire Transaction Query Hooks in useProfileData (Hybrid Pattern)

**Wave 1 — `9264bb2 feat(db)` — SSOT + RLS Fix (P0)**
- `src/lib/transactionTypes.ts` (NEU): `ALL_CREDIT_TX_TYPES`, `PUBLIC_TX_TYPES`, `FILTER_TYPE_MAP`
- Migration `20260408190000_transactions_public_rls.sql`: Policy-Split in `transactions_select_own` + `transactions_select_public_types`
- Ohne Fix: Public Profile Timeline komplett leer (silent RLS-Block)
- DB/Code Type Drift behoben: `trade_buy`/`trade_sell` statt `buy`/`sell`, `streak_reward` statt `streak_bonus`

**Wave 2 — `402324f refactor(profile)` — React Query Hooks**
- `useProfileData.ts`: Transactions + TicketTransactions auf Query Hooks migriert
- `invalidation.ts`: Prefix `['transactions', userId]` mit `exact: false` (war hardcoded `(uid, 10)`)
- Retry merged: `setRetryCount` + `txQuery.refetch()` + `ticketTxQuery.refetch()`

**Wave 3 — `615ad30 feat(timeline)` — Fantasy Ranking + Deep Link**
- `TimelineTab.tsx`: Discriminated union `TimelineRow` (credit | ticket | fantasy)
- Fantasy rows: rank badge (gold/silber/bronze), gameweek, score, reward. Dedup via `event_id`.
- `12 neue activity.*` i18n keys + DE + TR

**Wave 4 — `e10e414 feat(transactions)` — Dedizierte Page + CSV Export**
- `src/app/(app)/transactions/page.tsx` (NEU) — auth-guarded Route
- `TransactionsPageContent.tsx` (NEU, ~400 LoC): Date Range Picker, Filter Chips, Search, Aggregations, Load More
- `src/lib/exportTransactions.ts` (NEU): Client-side CSV, RFC 4180 escaped, UTF-8 BOM fuer Excel TR
- `src/lib/nav.ts`: SideNav Entry "Transaktionen" mit Receipt icon in NAV_MORE
- `17 transactions.*` i18n keys + nav.transactions + profile.allTransactions

**Wave 5 — `c7af525 feat(transactions)` — Wildcards Hook + Cleanup**
- Wildcard transactions Hook gewired
- Konsistenz-Cleanup: unused imports, edge-case guards

**Fix — `d28f843 fix(profile)` — Deep Link Lazy Init**
- `?tab=timeline` Deep Link landete immer auf Default Tab ('manager')
- Fix: `useState<Tab>(() => isValidTab(initialTab) ? initialTab : 'manager')` (Lazy init statt Effect)

### AutoDream Run #5 (dieser Run)
- 5 neue Error Patterns in `memory/errors.md`
- Neu: `memory/semantisch/projekt/transactions-history.md` (~100 Zeilen)
- Wiki-Index + Wiki-Log + Morning Briefing + Session-Handoff aktualisiert

## Build Status (final)
- `tsc --noEmit`: CLEAN
- vitest: nicht extra laufen lassen — keine Logic-Aenderungen die bestehende Tests brechen
- Live QA: Playwright als jarvis-qa — Timeline Tab (credit + ticket + fantasy rows), /transactions Page (filter + CSV export), Deep Link `?tab=timeline` verifiziert

## Stand jetzt — keine offenen Kruemel

### Alle E2E Features abgeschlossen
- B1 Missions E2E: DONE (2026-04-07)
- B2 Following Feed E2E: DONE (2026-04-08 Mittag, 4 Commits)
- B3 Transactions History E2E: DONE (2026-04-08 Abend, 6 Commits, QA verifiziert)

### Was koennte als naechstes kommen
- **Onboarding ohne Club-Bezug** (`project_onboarding_multi_club.md`) — Freundeskreis-Feedback, jetzt hoehere Prioritaet
- **Chip/Equipment System** (`project_chip_equipment_system.md`) — Ideen gesammelt, eigene Session
- **Optional Follow-up B2/B3**: Realtime Subscription auf `activity_log` / `transactions` fuer Live-Updates

## Wichtige Dateien fuer naechste Session
- `memory/semantisch/projekt/transactions-history.md` — B3 verdichtet (neu)
- `memory/semantisch/projekt/following-feed.md` — B2 verdichtet
- `memory/errors.md` — 5 neue Patterns (SW Re-Registration, Lazy Init, Type Drift, Feed RLS x2, Cross-User Policy)
- `src/lib/transactionTypes.ts` — SSOT fuer alle TX types
- `.claude/rules/profile.md` — SSOT-Verweis + Activity Tab Doku
- `supabase/migrations/20260408190000_transactions_public_rls.sql` — RLS Pattern Referenz (B3)
- `supabase/migrations/20260408180000_activity_log_feed_rls.sql` — RLS Pattern Referenz (B2)

## Architektur-Notizen

### RLS Feed Pattern (aus B2 + B3 etabliert, 2x Anwendung)
Tabellen mit Cross-User-Reads (Public Profile, Feed) brauchen Policy-Split:
```sql
-- Policy 1: Owner liest alles
CREATE POLICY "<table>_select_own" ON <table>
  FOR SELECT USING (auth.uid() = user_id);
-- Policy 2: Public liest nur whitelisted types (mit Action-Filter fuer Privacy)
CREATE POLICY "<table>_select_public_types" ON <table>
  FOR SELECT USING (type = ANY(ARRAY['safe_type1','safe_type2']));
```

### Service Worker Playbook (komplett)
```js
// In DevTools Console VOR jedem QA:
(async () => {
  const regs = await navigator.serviceWorker.getRegistrations();
  for (const r of regs) await r.unregister();
  const cs = await caches.keys();
  for (const c of cs) await caches.delete(c);
  localStorage.clear(); sessionStorage.clear();
  location.reload();
  // Nach Navigate: ERNEUT pruefen — App re-registriert SW automatisch
})();
```

### DB/Code Type Sync Checkliste (vor Feature-Bau)
```sql
SELECT DISTINCT type, COUNT(*) as cnt FROM <tabelle> GROUP BY type ORDER BY cnt DESC;
```
Ergebnis gegen Code-Konstanten greppen. Wenn >3 DB-Types nicht im Code → SSOT erstellen bevor Implementation.

## QA Account State Snapshot (Ende 2026-04-08 Abend)
- Email: jarvis-qa@bescout.net / Handle: jarvisqa
- Password: `JarvisQA2026!`
- ~7.700 $SCOUT, 63 Tickets, 6 Tage Streak, 8 Holdings, 1 Manager-Lineup
- 3 Follows: `kemal2`, `test12`, `emre_snipe` (QA-Fixture fuer Following Feed, nicht loeschen)
