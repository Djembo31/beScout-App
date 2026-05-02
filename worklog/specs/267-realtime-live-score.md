# Slice 267 — Realtime-Live-Score im Spieltag

**Status:** SPEC v3 (D62 Pre-Review-Patches eingearbeitet, BUILD-ready) · **Größe:** M · **Slice-Type:** Migration + Service + UI + Cron · **Scope:** CEO-approved · **Datum:** 2026-05-02

> **Combo (Anil-greenlit 2026-05-02):**
> `Q1=Vercel-Cron · Q2=C-Adaptive · Q3=A-API-Confirm · Q4=G1-strict` + `P-Spieltag · F2-Liga-Scope · X1-Polling-60s-Fallback`
>
> **Reihenfolge:** Slice 267 (Backend+UI im Spieltag) → Slice 266 (HomeSpotlight Promo-Slot mit Live-Score-Deep-Link)
>
> **v1→v2-Heal:** context7-Verify (2026) hat 1 Architektur-Vereinfachung enthüllt — Vercel Pro Cron erlaubt sub-minute (`* * * * *`) → pg_cron-Komplexität fällt weg. Plus Capacity-Section neu (Sektion 0) mit verifizierten Plan-Limits.
>
> **v2→v3-Heal (D62 Pre-Review):** reviewer-Agent fand 1×P1 + 5×P2 + 3×MINOR. Alle 8 Patches eingearbeitet:
> - F-01 (P1): `spieltag.liveLabel` neu (nicht re-use `fantasy.liveLabel` — semantisch verschieden: Match-Status vs Player-Lock)
> - F-02 (P1): i18n-Audit-Command korrigiert (jq/python statt grep)
> - F-03 (P2): AC-16 für `league_id IS NULL`-Pre-Migration-Verify
> - F-04 (P2): Sektion 13b Definition-of-Done je Layer (D54-explizit)
> - F-05 (P2): AC-17 + Idempotency-Lock `WHERE status != 'finished'` in Cron-UPDATE
> - F-06 (P2): FixtureDetailModal 3-State-Branch-Tabelle
> - F-07 (P2): IMPACT §3 D46-Drift-Beschreibung korrigiert (canonical = features-Pfad, lib = 2-line-bridge)
> - F-08+F-09+F-10 (MINOR): Polling-Trigger-Hint, AC-18 maxDuration, Pre-Mortem #1 modernisiert
>
> **Pre-Spec-Discovery (2026-05-02):** Anil's natürliche Heimat von Live-Score ist der Spieltag — dort hat er den ganzen Frame schon gebaut (`SpieltagBrowser`, `FixtureCard`, `FixtureDetailModal` mit Score-Header + GoalTicker + 3 Tabs). HomeSpotlight ist **sekundärer Promo-Slot**, nicht primärer Anzeige-Ort.

---

## 0. Capacity-Sanity (verifiziert via context7 + API-Football-Doku, 2026-05-02)

**Plans:** Vercel Pro · Supabase Pro · API-Football Pro

| Resource | Plan-Limit | Slice-267-Bedarf | Auslastung |
|---|---|---|---|
| Vercel Cron Frequenz | sub-minute erlaubt (`* * * * *`) | 1×/Min Permanent | ✅ |
| Vercel Function Invocations | 1M/Monat free, $0.30/500K darüber | 43.200/Monat | 4% — kostet 0 € |
| Vercel Function maxDuration | 300s default · 800s Fluid Compute | <10s/Call | ✅ |
| Supabase Realtime Concurrent Connections | 500 | ~50 (Beta) · 1000 (Post-Beta-Risk) | 10% Beta · 200% Post-Beta-Risk |
| Supabase Realtime Messages/Monat | 5M frei · $2.50/1M overage | ~1M (G1-strict + F2-Liga-Scope) | 20% |
| Supabase Channels/Client | 100 | 1 (Liga-Scope-F2) | 1% |
| API-Football calls/day | 7.500 | ~250 (Q2-C) · 1440 (Q2-A worst) | 3% — 19% |
| API-Football calls/min | 450 | 1 | 0.2% |
| API-Football leagues | 30 | 7 (DE+TR+EU-Top-5) | 23% |

**Multi-League-Filter:** `/fixtures?live=39-204-78-203-140-135-78` — alle 7 Ligen in **1 Call**, nicht 7. Massive Effizienz-Win.

**Post-Beta-Scale-Cliff:** Bei 1000+ User parallel bricht Supabase Pro 500-Connections-Limit. Mitigation in Pre-Mortem #5 dokumentiert (Pro-no-spend-cap = 10K, oder Channel-Sharing-Architektur). Beta-50-User komfortabel safe.

---

## 1. Problem Statement

D63 Phase 3 „Live-Pulse" fordert Live-Score-Anzeige während laufenden Fixtures. **Heute existiert das Konzept im Type-Enum (`FixtureStatus = 'live'`, `src/types/index.ts:1525`) aber wird nirgendwo gesetzt** — nur in 1 Test-Mock (`src/lib/services/__tests__/predictions.test.ts:395`).

Konsequenz für User:
- `SpieltagBrowser` rendert Live-Spiele wie Pending-Result-Spiele — gleicher amber-„?-?"-Pill, kein Distinct-State
- `FixtureCard` zeigt während Live-Spiel kein Score, nur „?-?"
- `FixtureDetailModal` zeigt während Live-Spiel „vs" + Kickoff-Zeit (kein Score, kein Live-Indikator)
- HomeSpotlight kann keinen Live-Slot zeigen (Voraussetzung für Slice 266 Phase 3)

**Wer ist betroffen:** ALLE User während Bundesliga-Wochenenden / Süper-Lig-Spieltagen (Sa+So 13:30-23:00 UTC primär). Manager-Mode-User wollen Live-Score von Holdings-Spielern sehen, Scout-Mode-User wollen Live-Pulse für Discovery.

**Evidence:**
- D63 Roadmap Phase 3 Live-Pulse: „Realtime-Live-Score (Slice 267)"
- `FixtureStatus`-Type hat `'live'` (Slice 086 hat den Wert hinzugefügt, nicht implementiert)
- `gameweek-sync` Cron läuft 1×/Tag — final-stats only, keine Live-Updates
- `memory/session-handoff.md` 2026-05-02 Pre-Spec-Notes mit Pro-Plan-Constraints

## 2. Lösungs-Design (Architektur)

**3-Layer-Architektur:**

### Layer 1 — DB-Schema-Erweiterung
```sql
ALTER TABLE public.fixtures
  ADD COLUMN IF NOT EXISTS minute INTEGER NULL,
  ADD COLUMN IF NOT EXISTS last_live_update_at TIMESTAMPTZ NULL;

ALTER TABLE public.fixtures REPLICA IDENTITY FULL;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime' AND schemaname = 'public' AND tablename = 'fixtures'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.fixtures;
  END IF;
END $$;
```

### Layer 2 — Live-Score-Cron (NEUER Cron, NICHT bestehender gameweek-sync)
- Neue Route: `src/app/api/cron/live-score-sync/route.ts`
- Schreibmuster: API-Football `/fixtures?live=<league-ids-pipe>` → `fixtures.{home_score, away_score, minute, status, last_live_update_at}` UPDATE
- **Idempotency-Lock (F-05):** UPDATE-Statement enthält `WHERE status != 'finished'` — once-finished-always-finished, kein revert via API-flap. Bidirektional-Race ausgeschlossen.
- Status-Transition: `'scheduled' → 'live' (API liefert 1H/2H/HT/ET/BT/P/LIVE) → 'finished' (FT/AET/PEN)` — Q3-A API-Confirm-Pflicht. Source: API-Football `fixture.status.elapsed` (NICHT `time.minute`!) für `minute`-Wert (fantasy.md API-Quirk)
- Realtime-Broadcast erfolgt **automatisch** durch Postgres Logical Replication (REPLICA IDENTITY FULL + Publication)
- **Frequenz:** Q1-Vercel-Cron `* * * * *` (jede Minute, Vercel Pro erlaubt sub-minute, verifiziert context7 2026-05-02)
- **Quota-Schutz Q2-C-Adaptive:** Vor API-Call zuerst `SELECT 1 FROM fixtures WHERE played_at BETWEEN NOW()-15min AND NOW()+15min AND status IN ('scheduled','live') LIMIT 1` — bei 0 rows: skip API-Call, return early. Verhindert API-Quota-Bleeding off-window.

### Layer 3 — Frontend Realtime-Subscription + UI

**Service:** `src/lib/services/fixtures.ts` (canonical service) ergänzen mit `subscribeFixtureUpdates(leagueId, callback)` — Pattern aus `src/lib/queries/social.ts:46-84` (existing `useFollowingFeed` mit `postgres_changes` + 2s-Throttle).

**Hook:** `src/features/fantasy/hooks/useLiveFixtures.ts` (NEU) — kapselt Channel-Subscription pro Liga, Fallback-Polling 60s wenn Realtime fail.

**UI-Edits:**
1. `SpieltagBrowser.tsx` — neuer **„LIVE"-Bucket** ganz oben (zwischen header + finished/pending/upcoming), mit pulse-grün-Dot
2. `FixtureCard.tsx` — wenn `status='live'`: Score-Pill statt Kickoff-Zeit, „LIVE"-Badge mit pulse, Minute-Anzeige (`67'`)
3. `FixtureDetailModal.tsx` — Score-Header 3-State-Logic (F-06):

### FixtureDetailModal Score-Header — 3-State-Branch-Hierarchy (F-06 Patch)

| Status | Score-Display | Pill | Animation |
|--------|---------------|------|-----------|
| `scheduled` | `vs` (white/20) | `Spieltag {gw}` | none |
| `live` (NEW Slice 267) | `{home_score} - {away_score}` (gold-text + pulse-glow-layer) | `LIVE {minute}'` (vivid-green) | pulse |
| `simulated` / `finished` | `{home_score} - {away_score}` (gold-text) | `FULL TIME` | none |

**Branch-Hierarchy in Code:**
```ts
const isLive = fixture.status === 'live';                                           // Slice 267 NEU
const isSimulated = fixture.status === 'simulated' || fixture.status === 'finished'; // existing
// Render: isLive ? <ScoreLive/> : isSimulated ? <ScoreFinal/> : <Pending/>
```

**Pulse-Glow-Layer-Strategy:** Gleicher `goldTextStyle` wie isSimulated, plus zusätzlicher `motion-safe:animate-pulse` Wrapper auf Score-Container. Pulse-Color: vivid-green (live) — analog `pulse_dot` Pattern in SpieltagBrowser. KEIN Refactor des existing gold-text-Style.

### Datenfluss
```
API-Football  →  live-score-sync Cron  →  UPDATE fixtures
                                              ↓
                                    Postgres Logical Replication
                                              ↓
                                    supabase_realtime publication
                                              ↓
                       useLiveFixtures (postgres_changes UPDATE)
                                              ↓
                       setQueryData(qk.fantasy.fixtures, ...)
                                              ↓
                       SpieltagBrowser + FixtureCard + Modal re-render
```

## 3. Betroffene Files

| File | Aktion | Begründung |
|------|--------|------------|
| `supabase/migrations/<ts>_slice_267_fixtures_realtime.sql` | NEU | Schema + Replication + Publication |
| `src/app/api/cron/live-score-sync/route.ts` | NEU | Sub-minute Live-Score-Sync |
| `vercel.json` | EDIT | Neuen Cron-Eintrag (siehe CEO-Decision Q1) |
| `src/lib/services/fixtures.ts` | EDIT | `subscribeFixtureUpdates()` ergänzen |
| `src/features/fantasy/hooks/useLiveFixtures.ts` | NEU | Channel-Subscription + Polling-Fallback |
| `src/lib/queries/keys.ts` | EDIT | `qk.fixtures.live(leagueId)` (Top-Level-Namespace, NICHT `qk.fantasy.fixtures.*`) |
| `src/components/fantasy/spieltag/SpieltagBrowser.tsx` | EDIT | Live-Bucket oben |
| `src/components/fantasy/spieltag/FixtureCard.tsx` | EDIT | Live-Render-Branch + Minute-Anzeige |
| `src/components/fantasy/spieltag/FixtureDetailModal.tsx` | EDIT | Score-Header Live-Mode |
| `src/components/fantasy/spieltag/helpers.ts` | EDIT | `getStatusAccent('live')` Variant |
| `src/types/index.ts` | EDIT | `Fixture.minute?: number \| null`, `Fixture.last_live_update_at?: string \| null` |
| `messages/de.json` + `messages/tr.json` | EDIT | `spieltag.browserLive`, `spieltag.liveLabel` (NEU — semantisch verschieden zu existing `fantasy.liveLabel` Player-Lock-Indicator), `spieltag.minute` |
| `src/components/fantasy/spieltag/__tests__/FixtureCard.test.tsx` | EDIT | Live-Render-Cases |
| `src/lib/services/__tests__/fixtures.test.ts` | EDIT | `subscribeFixtureUpdates` Mock-Test |

**Vor diesem Slice greppt man:**
- `grep -rn "useFollowingFeed\|postgres_changes" src/` — Realtime-Pattern-Konsumenten
- `grep -rn "FixtureStatus\|'live'" src/types/ src/lib/ src/components/fantasy/` — alle Stellen die Live-Status erwarten/setzen sollten
- `grep -rn "from '@/types'.*Fixture" src/` — alle Konsumenten der `Fixture`-Type

## 4. Code-Reading-Liste (Pflicht VOR Implementation)

| File | Zweck | Zu prüfen |
|------|-------|-----------|
| `src/lib/queries/social.ts:34-90` | Existing Realtime-Pattern (Goldstandard) | 2s-Throttle-Pattern + Channel-Cleanup-useEffect-return |
| `supabase/migrations/20260408220000_activity_log_realtime.sql` | Idempotente Realtime-Migration | IF NOT EXISTS-Block für publication, Comment-Style |
| `supabase/migrations/20260415030400_ar53_j6_realtime_publications.sql` | Multi-Tabellen-Publication-Migration | Pattern für `user_stats + user_follows` |
| `src/app/api/cron/gameweek-sync/route.ts:1-120` | Existing Cron-Pattern | Auth + ENV-Checks + StepResult + apiFetch + Position-Mapping |
| `src/components/fantasy/spieltag/SpieltagBrowser.tsx` (komplett, 80 Zeilen) | Gruppen-Render-Logic | Wie wird `finished/pending/upcoming` gefiltert + sortiert? |
| `src/components/fantasy/spieltag/FixtureCard.tsx` | Status-Render-Branches | `isFinished/isPendingResult/upcoming` — wo Live-Branch einbauen? |
| `src/components/fantasy/spieltag/helpers.ts` | `getStatusAccent` | Welche Color-Schemes existieren? Live = grün-pulse? |
| `src/components/fantasy/spieltag/FixtureDetailModal.tsx:519-537` | Score-Header `isSimulated`-Branch | Wie Live-Mode integrieren ohne Refactor-Big-Bang? |
| `.claude/rules/errors-db.md` § "PostgREST nested-select Auth-Race" | Realtime-Auth-Race-Pattern | Anwendbar auf Channel-Subscription? |
| `.claude/rules/errors-frontend.md` § "Map/Set-typed React-Query-Data" | Persist/SSR-Drift | useLiveFixtures Cache-Strategy darf keine Map returnen |
| `.claude/rules/database.md` § "Migration Workflow" | mcp__supabase__apply_migration Pflicht | NIE `supabase db push` |
| `.claude/rules/fantasy.md` § "API-Football Integration" | API-Quirks | `time.elapsed` (NICHT `time.minute`!), Status-Mapping FT/AET/PEN |

## 5. Pattern-References

- `decisions.md` D44 — Map/Set persist-cache-Pattern (gilt für `useLiveFixtures`-Return-Shape)
- `patterns.md` #28 — Realtime-Subscription-Cleanup (Channel-removeChannel in useEffect-return)
- `errors-db.md` § "Trigger+GUC-Invariant-Enforcement" — NICHT relevant hier (kein Invariant), aber zur Erinnerung dass Cron-Writes idempotent sein müssen
- `errors-db.md` § "CREATE OR REPLACE FUNCTION — PATCH-AUDIT PFLICHT" — N/A (keine RPC), aber `mcp__supabase__apply_migration` Pflicht (database.md Section)
- `errors-frontend.md` § "Cache-Invalidation: Root-Prefix vs enumerated Keys" — `qk.fantasy.fixtures` ist enumerated, neuer `qk.fantasy.liveFixtures` braucht Root-Prefix-Konsistenz
- `errors-frontend.md` § "Defensive null-strict-equality bei optional-resolved Hook-Daten" — `fixture.minute === null` strict, nicht `!fixture.minute` (Slice 265 Lehre)
- `fantasy.md` § "API-Football Integration" — `time.elapsed` ist Source-of-Truth für Minute
- `business.md` — KEIN Compliance-Risiko (Score-Anzeige ist plain Sport-Daten, kein Money/Trading-Wording)

## 6. Acceptance Criteria

```
AC-01: [HAPPY-DB] Migration appliziert sauber via mcp__supabase__apply_migration
  VERIFY: SELECT relreplident FROM pg_class WHERE relname = 'fixtures'
  EXPECTED: 'f' (FULL)
  FAIL IF: 'd' (default, nur pkey)

AC-02: [HAPPY-DB] fixtures in supabase_realtime publication
  VERIFY: SELECT tablename FROM pg_publication_tables
          WHERE pubname='supabase_realtime' AND schemaname='public' AND tablename='fixtures'
  EXPECTED: 1 row
  FAIL IF: 0 rows

AC-03: [HAPPY-DB] minute-Column existiert
  VERIFY: SELECT column_name, data_type, is_nullable FROM information_schema.columns
          WHERE table_name='fixtures' AND column_name='minute'
  EXPECTED: minute / integer / YES
  FAIL IF: 0 rows

AC-04: [HAPPY-CRON] live-score-sync Cron schreibt status='live' bei laufendem Fixture
  VERIFY: Cron-Run gegen Test-Fixture mit API-Football-Status='1H' (1st Half)
  EXPECTED: UPDATE fixtures SET status='live', minute=<X>, home_score=<Y>, away_score=<Z>, last_live_update_at=NOW()
  FAIL IF: status bleibt 'scheduled' oder Update wird gedroppt

AC-05: [HAPPY-RT] Frontend empfängt Realtime-Update
  VERIFY: Browser DevTools Network-Tab WS-Frames während simuliertem UPDATE in fixtures
  EXPECTED: WS-Frame mit fixture-row + status='live' + neue minute/score
  FAIL IF: kein WS-Frame oder NULL-Felder

AC-06: [HAPPY-UI] FixtureCard zeigt LIVE-Badge bei status='live'
  VERIFY: bescout.net/fantasy mit Test-Fixture status='live', minute=67, home_score=1, away_score=0
  EXPECTED: Card mit grün-pulse-Dot, „LIVE"-Pill, „1 - 0"-Pill, „67'"-Minute
  FAIL IF: Card rendert wie pending-result (amber, „?-?")

AC-07: [HAPPY-UI] SpieltagBrowser zeigt Live-Bucket oben
  VERIFY: bescout.net/fantasy mit ≥1 Live-Fixture in current GW
  EXPECTED: „LIVE"-Section ganz oben (über Finished/Pending/Upcoming), grün-pulse-Header, Count-Badge
  FAIL IF: Live-Fixture fällt in Finished oder Pending oder Upcoming Bucket

AC-08: [HAPPY-UI] FixtureDetailModal zeigt Live-Header bei status='live'
  VERIFY: Click auf Live-FixtureCard → Modal öffnet
  EXPECTED: Score-Header pulse-glow, „LIVE 67'"-Badge statt „FULL TIME", aktueller Score 1:0
  FAIL IF: Modal zeigt „vs" oder „FULL TIME"

AC-09: [EDGE-NULL] Status='live' aber minute=NULL (Cron-Race zwischen Status-Set und Minute-Update)
  VERIFY: Test-Fixture-Snapshot mit status='live', minute=NULL
  EXPECTED: Card zeigt „LIVE" ohne Minute (defensive `minute === null` check, kein Fallback-„0'")
  FAIL IF: Card zeigt „0'" oder crash

AC-10: [EDGE-RT-FAIL] Realtime-Channel-Fail → Polling-Fallback aktiv
  VERIFY: Network-DevTools Realtime blockieren → fetchFixtures-Polling alle 60s
  EXPECTED: Polling läuft, Score-Updates kommen mit max 60s Delay
  FAIL IF: kein Polling, Score frozen

AC-11: [I18N-DE] „LIVE"-Label DE
  VERIFY: messages/de.json
  EXPECTED: „LIVE" (engl. universell, kein Übersetzungsbedarf — analog SofaScore/Kicker)
  FAIL IF: „Live-Spiel" oder andere DE-Variante (Anil-Pflicht-Klärung)

AC-12: [I18N-TR] „LIVE"-Label TR
  VERIFY: messages/tr.json
  EXPECTED: „CANLI" (TR-Standard für „live", keine kazan*/yatırım-Drift)
  FAIL IF: „Live" (untranslated) oder anderes Wording

AC-13: [MOBILE-393] FixtureCard 393px Live-Layout
  VERIFY: Playwright iPhone16-393px mit Live-Fixture
  EXPECTED: LIVE-Badge + Score-Pill + Minute passen in 88px-Card-Höhe ohne Truncation
  FAIL IF: Overflow oder Layout-Shift

AC-14: [LOAD] Realtime-Subscription Memory-Leak-frei
  VERIFY: Mount/Unmount SpieltagBrowser 10× → Network-Tab WS-Connections-Count
  EXPECTED: 1 active WS-Connection nach Final-Mount, 0 nach Unmount
  FAIL IF: ≥2 WS-Connections (Channel-Cleanup-Bug)

AC-15: [REGRESSION] Bestehende non-live-Fixtures unverändert
  VERIFY: Spieltag mit nur scheduled/finished Fixtures
  EXPECTED: SpieltagBrowser rendert ohne Live-Bucket (count=0 → null), bestehende Cards unverändert
  FAIL IF: Visuelle Drift in scheduled/finished Cards

AC-16: [DATA-INTEGRITY] Alle existing fixtures haben league_id NOT NULL (F-03 Patch)
  VERIFY: SELECT COUNT(*) FROM fixtures WHERE league_id IS NULL
  EXPECTED: 0
  FAIL IF: >0 — Pre-Slice Backfill nötig, sonst Realtime-Filter `league_id=eq.X` schließt diese rows silent aus

AC-17: [REGRESSION-RACE] live-score-sync respektiert 'finished'-Lock (F-05 Patch)
  VERIFY: Setze fixture status='finished' manuell. Trigger live-score-sync mit API-Mock-Response status='1H'.
  EXPECTED: status bleibt 'finished', minute UNCHANGED. Cron-Logic skipt finished rows via `WHERE status != 'finished'`.
  FAIL IF: status revertiert auf 'live' — bidirektional-Race-Bug.

AC-18: [PERF-CRON] live-score-sync runtime <30s p95 (F-09 Patch)
  VERIFY: cron_sync_log.duration_ms p95 nach 1h Live-Window
  EXPECTED: <30000ms
  FAIL IF: >60000ms (würde maxDuration-default in höherer Last brechen)
```

## 7. Edge Cases Table

| # | Flow | Case | Input/State | Expected | Mitigation |
|---|------|------|-------------|----------|------------|
| 1 | Realtime-Update | `status='live', minute=NULL` | Cron-Race | Card zeigt „LIVE" ohne Minute (`minute === null` strict-check) | F-04-Pattern aus Slice 265 |
| 2 | Realtime-Update | `home_score=NULL, status='live'` | Cron-Init-Race | Card zeigt „LIVE 0:0" mit `home_score ?? 0` Fallback | API-Football liefert 0:0 bei Kickoff garantiert, NULL nur bei DB-Race |
| 3 | Status-Transition | `live → finished` Übergang | Final-Whistle | Card flip von Live-Bucket zu Finished-Bucket animiert | React-Query setQueryData triggert Re-Sort |
| 4 | Channel-Cleanup | Liga-Switch während Live | LeagueScopeStore-Change | Alte Liga-Channel unsubscribed, neue subscribed | useEffect-cleanup + dep-array auf `leagueId` |
| 5 | Pro-Plan-Limit | >500 concurrent connections (1000 User) | Beta-Skala-Bruch | Realtime fail → Polling-Fallback aktiv | useLiveFixtures detektiert WS-Disconnect, switcht auf 60s-Polling |
| 6 | Multi-Liga-Live | DE + TR + ES gleichzeitig live | Sa 17:00 UTC | 3 separate Channels, unabhängig updated | Liga-Scope-F2 Pattern, kein Cross-Liga-Channel |
| 7 | Stale-Cache | User öffnet Spieltag nach 5min Pause | Tab im Hintergrund | Initial-Fetch zeigt last-known State, Realtime-Sub holt aktuellen | TanStack Query refetchOnWindowFocus + Realtime sync |
| 8 | Goal-Update | `home_score 0→1` während User Modal offen | Live-Goal | FixtureDetailModal-Header animiert Score-Increment | setQueryData fires re-render, anim-fade auf Score-Number |
| 9 | Cron-Failure | live-score-sync 502 von API-Football | API-Outage | DB-State frozen, UI zeigt last-known Score, Realtime ruht | OK — graceful degrade, kein bleeding-edge-Bug |
| 10 | Concurrent-Updates | 2 Crons schreiben gleiches Fixture race | Cron-Overlap | Last-write-wins, kein Lock nötig | Cron-Singleton via Vercel-Lock oder pg_advisory_lock |
| 11 | Status-Drift | API liefert FT, DB hat 'live' | FT-erkannt | Cron schreibt status='finished' + REPLICA-broadcast → UI flip | Edge-2 (live→finished) covers |

## 8. Self-Verification Commands

```bash
# Pflicht jeder Slice:
npx tsc --noEmit
pnpm exec vitest run src/components/fantasy/spieltag/__tests__/FixtureCard.test.tsx
pnpm exec vitest run src/lib/services/__tests__/fixtures.test.ts

# DB-Schema-Verify (post-Migration):
mcp__supabase__execute_sql "SELECT relreplident FROM pg_class WHERE relname = 'fixtures'"
mcp__supabase__execute_sql "SELECT tablename FROM pg_publication_tables WHERE pubname='supabase_realtime' AND tablename='fixtures'"
mcp__supabase__execute_sql "SELECT column_name FROM information_schema.columns WHERE table_name='fixtures' AND column_name IN ('minute','last_live_update_at')"

# Cron-Verify (post-Deploy):
curl -H "Authorization: Bearer $CRON_SECRET" https://bescout.net/api/cron/live-score-sync
mcp__supabase__execute_sql "SELECT id, status, minute, home_score, away_score, last_live_update_at FROM fixtures WHERE status='live' LIMIT 5"

# Realtime-Verify (browser DevTools):
# 1. Open https://bescout.net/fantasy in Chrome
# 2. Network → WS → filter realtime.supabase.co
# 3. Manuel UPDATE fixtures SET minute=70 WHERE id='<live-fixture>' via mcp__supabase__execute_sql
# 4. WS-Frame sollte fixture-payload mit minute=70 enthalten

# Konsumenten-Audit:
grep -rn "useFollowingFeed\|postgres_changes" src/  # Existing pattern users
grep -rn "from '@/types'.*Fixture" src/  # Type-Konsumenten

# Bundle-Size-Check (post-build):
pnpm run size  # Check fantasy-route doesn't break budget
```

## 9. Open-Questions (CEO-Decisions — alle Anil-greenlit 2026-05-02)

**Status:** ✅ Q1+Q2+Q3+Q4 alle confirmed. Bleibt unten als Audit-Trail.

### Q1 — Cron-Frequenz für `live-score-sync` ✅ Vercel-Cron

**Problem:** Vercel Pro Cron hat sub-hourly Limit (kürzeste Frequenz = `0 * * * *`). Live-Score braucht aber sub-minute (idealerweise alle 30-60s während Spiel).

**Optionen:**
- **A — pg_cron in Supabase** (Recommended): Supabase Pro hat `pg_cron` + `http`-Extension out-of-box. Sub-minute möglich (`*/1 * * * *`). SQL-Function ruft Vercel-Webhook via http_post.
  - ✅ Sub-minute support, sauber, kein external-Service
  - ❌ http-extension muss enabled sein (verifizieren), Latency Supabase→Vercel
- **B — External Trigger** (cron-job.org / Github Actions): External cron pinged Vercel-Webhook alle 60s.
  - ✅ Frei (Github Actions free-tier reicht), bewährt
  - ❌ Extra-Service, Github Actions hat 5min-Granularität
- **C — Vercel Cron `0 * * * *` + Live-Window-Polling-from-DB** (Sub-Optimum): Hourly Sync, Frontend pollt nur DB.
  - ✅ Einfachst, kein neuer Service
  - ❌ Score 1h-stale, kein „Live" wert
- **D — Supabase Edge Function mit eigenem Scheduler**: Edge Function pollt API-Football, schreibt DB.
  - ✅ Sub-minute möglich
  - ❌ Neue Runtime-Familie, mehr Maintenance

**Anil-Greenlight 2026-05-02:** **Vercel Pro Cron `* * * * *`** — context7 hat verifiziert dass Vercel Pro sub-minute erlaubt. Keine Supabase-Extensions, keine externe Trigger, einfacher Pfad.

### Q2 — Live-Window: Permanent-Polling oder Schedule? ✅ C-Adaptive

**Problem:** Cron-Calls kosten API-Football-Quota (10000 calls/day Pro). Permanent `*/1 * * * *` = 1440 calls/day. Live-Window Sa+So 13:00-23:00 + Mi 18:30-23:00 ≈ 25h/Woche × 60 = 1500 calls/Woche. Off-Window 0 calls.

**Optionen:**
- **A — Permanent every-minute** während GW-Active: 1440 calls/day × ~3 Live-Tage/Woche = 4320 calls/Woche. Wasteful aber dumm-simple.
- **B — Schedule-based** (Recommended): Cron läuft nur während Live-Window-Hours UTC. Hard-coded oder via `fixtures.played_at`-aware-Detection.
- **C — Adaptive** (over-engineered): Cron checkt zuerst „gibt's Live-Fixtures?" → bei ja: full-poll, bei nein: skip. SQL-light.

**Anil-Greenlight:** **C-Adaptive** — DB-Query zuerst, API nur bei Live-Window. Schützt API-Football-Quota auch bei Cron-Misfire.

### Q3 — Status-Transition-Logic: Cron oder DB-Trigger? ✅ A API-Confirm

**Problem:** Wer setzt `status='scheduled' → 'live'`? Beim Kickoff (`played_at <= NOW()`) ohne API-Confirm? Oder erst wenn API-Football „1H" liefert?

**Optionen:**
- **A — API-Confirm-Pflicht** (Recommended): Status nur geändert wenn API-Football status in `['1H','2H','HT','ET','BT','P','LIVE']`. Kein „Phantom-Live" durch Kickoff-Slip.
- **B — Time-based**: `status='live'` wenn `played_at <= NOW() AND played_at + 110min >= NOW() AND status != 'finished'`. Schneller aber falsch wenn Spiel verschoben.
- **C — Hybrid**: Kickoff-Time setzt status='live', API-Confirm bestätigt + setzt minute. Bei API-NoMatch nach 10min: revert auf 'pending'.

**Anil-Greenlight:** **A — API-Confirm** — kein „Phantom-Live", API ist Single-Source-of-Truth. Pending-Result-Bucket fängt verschobene Spiele weiterhin.

### Q4 — Granularität-Refinement: Score-only oder auch Goal-Events? ✅ G1-strict

**Combo-Decision war G1 (Score-only)**. Aber: GoalTicker im FixtureDetailModal lebt von Goal-Events. Heute werden Goals erst nach Final-Whistle via fixture_player_stats geladen.

**Optionen für Slice 267:**
- **G1-strict** (Recommended für 267): Nur Score realtime. GoalTicker bleibt Final-Stats-only (kein Refactor). Trade-off: User sieht Live-Score aber Goal-Names erst post-Match.
- **G1-extended** (Slice 267b post-Beta): Goal-Events auch realtime. fixture_player_stats braucht Realtime-Publication zusätzlich. Mehr Work, aber „echtes" Live-Erlebnis.

**Anil-Greenlight:** **G1-strict** — Score-only realtime in 267, Goal-Events als 267b post-Beta geschnitten. Beta-Pflicht: nur Score-Mover.

**Autonom-Zone (CTO entscheidet):**
- Component-Struktur (Sub-Components, Inline-Helpers)
- Test-Strategie-Detail (welche Edge-Cases als separate Tests)
- LIVE-Badge-Color-Choice (grün-pulse vs. gold-pulse) — Empfehlung: vivid-green analog SofaScore
- Throttle-Window für Channel (default 2s analog social.ts)
- Polling-Fallback-Trigger-Logic (F-08 Patch): empfohlen `channel.subscribe((status) => ...)` mit `status='CHANNEL_ERROR'` oder `'TIMED_OUT'` triggert 60s-Polling. NICHT navigator.onLine (detects WAN-disconnect, nicht Realtime-Channel-Disconnect).

**Nicht-Autonom-Zone (Anil-CEO-pflicht):**
- Q1-Q4 oben
- Wording „LIVE" / „CANLI" — Anil verifiziert TR
- Cron-Frequenz-final-Pick (kostet API-Football-Quota)

## 10. Proof-Plan

| Layer | Proof-Artefakt | Path |
|-------|---------------|------|
| DB-Schema | `mcp__supabase__execute_sql` Outputs (relreplident, publication, columns) | `worklog/proofs/267-db-schema.txt` |
| Cron | curl-Output gegen `/api/cron/live-score-sync` mit Test-Fixture-State-Before/After | `worklog/proofs/267-cron-execution.txt` |
| Realtime | Browser WS-Frame-Screenshot (Chrome DevTools Network) | `worklog/proofs/267-realtime-ws-frame.png` |
| UI | Playwright-Screenshot bescout.net/fantasy mit Live-Fixture (393px + 1280px) | `worklog/proofs/267-spieltag-live-mobile.png` + `267-spieltag-live-desktop.png` |
| Modal | FixtureDetailModal Live-Header Screenshot | `worklog/proofs/267-modal-live.png` |
| Tests | `pnpm exec vitest run src/components/fantasy/spieltag/` Output | `worklog/proofs/267-vitest.txt` |
| Bundle | `pnpm run size` Pre/Post-Vergleich | `worklog/proofs/267-bundle-size.txt` |

## 11. Scope-Out

- **Goal-Events realtime (Goal-Ticker live während Match)** → Slice 267b post-Beta. Begründung: G1-strict-Combo, kleinerer Slice.
- **Live-Score in HomeSpotlight als Promo-Slot** → Slice 266 (Spotlight-Multi-Slot). Begründung: 267 baut Foundation, 266 nutzt sie.
- **Push-Notification bei Live-Goal** → Post-Beta Slice. Begründung: Notif-System hat eigene Architektur, getrennt schneiden.
- **Live-Lineup-Updates (Sub-In/Sub-Out realtime)** → Slice 267c post-Beta. Begründung: GoalTicker analog, MatchTimeline lebt von Final-Stats.
- **Player-Stats realtime im Modal Ranking-Tab** → Post-Beta Slice. Begründung: Riesen-Datenmenge, getrennte Realtime-Schicht.
- **Realtime-Score auf Player-Detail-Page (`/player/[id]`)** → Post-Beta Slice. Begründung: anderer Konsument, getrennt.

## 12. Stage-Chain (geplant)

```
SPEC v1 (this) → CEO-Approval Q1-Q4
   ↓
IMPACT (Pflicht — Schema-Migration + neuer Cron + Realtime-Publication)
   ↓
BUILD (parallel-Worktree-Dispatch):
   ├─ backend-Agent: Migration + Cron + service-erweitern
   ├─ frontend-Agent: useLiveFixtures + Spieltag-UI-Edits + i18n
   └─ test-writer-Agent: vitest-Cases für FixtureCard + service
   ↓
REVIEW (Pflicht — reviewer-Agent, M-Slice + Cross-Domain)
   ↓
PROVE (DB-schema + Cron-curl + WS-Screenshot + Mobile + Modal)
   ↓
LOG
```

**Wave-Plan (innerhalb Slice 267, nicht separate Slices):**
- **Wave 1 — Backend:** Migration applizieren + Cron-Route + service-extend + Type-Updates
- **Wave 2 — Frontend:** useLiveFixtures-Hook + Spieltag-UI-Edits + i18n
- **Wave 3 — Tests + Proof:** vitest + Playwright-Screenshots + Bundle-Check

## 13. Pre-Mortem (≥ 5 Szenarien — M-Slice empfohlen)

| # | Failure | Probability | Impact | Mitigation | Detection |
|---|---------|-------------|--------|------------|-----------|
| 1 | **Vercel Cron-Schedule rejected by Hobby-Plan** (D36-Pattern) — obsolet weil Pro-Plan bestätigt, aber Pre-Push-Check pflicht falls Plan-Downgrade | LOW (Pro-bestätigt 2026-05-02) | hoch (Cron läuft nicht, Live-Score frozen) | Pre-Push: `grep '"\* \* \* \* \*"' vercel.json` + `mcp__vercel__list_deployments` post-push verify Commit-SHA in Liste | `vercel deploy --prod --yes` foreground statt silent push wenn Plan-State unsicher |
| 2 | **Realtime-Channel-Memory-Leak** bei Liga-Switch | HIGH | mittel (Browser-Memory wachsend, Performance-Drift) | useEffect-cleanup mit `supabase.removeChannel(channel)` (analog social.ts), dep-array exact `[leagueId]` | Chrome DevTools Performance-Memory-Snapshot, AC-14 |
| 3 | **API-Football-Quota-Bruch** (10000/day Pro) durch Permanent-Polling | LOW (mit Q2-C-Adaptive), HIGH (mit Q2-A) | hoch (Cron-401, kein Update für Rest des Tages) | Q2-C Adaptive (skip wenn keine Live-Fixtures), monitoring `cron_sync_log.api_calls_today` | Cron-Logs, API-Football-Dashboard-Quota-Anzeige |
| 4 | **REPLICA IDENTITY FULL Performance-Hit** auf fixtures-Tabelle | LOW | mittel (DB-WAL-Größe ×3-5, aber fixtures ist klein ~500 rows/Saison) | Post-Migration `pg_database_size('postgres')` Vorher/Nachher messen, falls >100% Wachstum: revert | Supabase-Dashboard → Database → Reports |
| 5 | **Pro-Plan-Realtime-Connection-Limit-Bruch** bei 1000+ User parallel post-Beta | LOW (Beta), HIGH (Scale) | hoch (Realtime-fail, Frontend-Polling-Fallback eskaliert DB-Load) | F2 Liga-Scope-Channels statt Per-User. Polling-Fallback X1 als Defense. Pro-Plan upgrade-pfad documented. | Realtime-Errors in Sentry, Supabase-Dashboard Realtime-Connections-Graph |
| 6 | **Status-Drift-Race**: Cron schreibt 'live' während gameweek-sync schreibt 'finished' | MED | mittel (UI flackert finished→live→finished) | Cron-Logic prioritär: 'finished' überschreibt 'live' nicht reversibel. CHECK-Constraint? Application-level Lock-Order. | Sentry-Race-Logs, manuelle Test-Race-Simulation |
| 7 | **WS-Disconnect-Race**: Browser geht in Sleep-Mode → reconnect-Storm bei Wake | MED | niedrig (TanStack Query handled mit refetchOnReconnect) | Polling-Fallback X1 als Backup. Channel-resubscribe in useEffect. | Network-Tab WS-Reconnect-Pattern |
| 8 | **i18n-Missing-Key-Crash** bei Slice-262/263-Lehre repeat | LOW (durch Pre-Build-Audit) | mittel (Render-Crash) | Vor Commit: `grep "spieltag.browserLive\|spieltag.liveLabel\|spieltag.minute" messages/de.json messages/tr.json` | Sentry-Error „MISSING_TRANSLATION", Pre-Build-Hook |

---

## 13b. Definition-of-Done je Layer (D54-explizit, F-04 Patch)

Slice 267 ist Multi-Type (Migration + Service + UI + Cron + i18n). Workflow.md §3a verlangt explizite DoD je Type.

**Migration:**
- [ ] `mcp__supabase__apply_migration` applied (`supabase db push` ist verboten, database.md)
- [ ] `pg_get_functiondef`-Verify N/A (keine RPC), aber Schema-Verify per `information_schema.columns`
- [ ] AC-01-03 grün: `relreplident='f'`, publication-add, columns existieren
- [ ] RLS-Policies-Liste verifiziert (siehe IMPACT §6, AC-Verify-Block)

**Service (`src/features/fantasy/services/fixtures.ts` canonical):**
- [ ] `subscribeFixtureUpdates()` in `useLiveFixtures`-Hook konsumiert (D54: kein orphan-Export)
- [ ] Mapper-Erweiterung `minute` + `last_live_update_at` in `getFixturesByGameweek` + `getFixturesByClub` (sonst Realtime-Updates kommen rein, Mapper-stripped Felder)
- [ ] vitest grün für FixtureCard + service-mock

**Cron (`src/app/api/cron/live-score-sync/route.ts`):**
- [ ] `vercel.json` `crons`-Array Eintrag hinzugefügt (D54: kein orphan-Cron)
- [ ] Auth-Check `Bearer ${CRON_SECRET}` Pattern wie alle anderen Crons
- [ ] Q2-C-Adaptive Pre-Check `SELECT 1 FROM fixtures WHERE played_at BETWEEN ...` vor API-Call
- [ ] Idempotency `WHERE status != 'finished'` in UPDATE (F-05)
- [ ] `cron_sync_log` writes vom ersten Run sichtbar (Failure-Path: Auto-Issue via existing GHA-Workflow)
- [ ] curl gegen Live-URL post-Deploy success
- [ ] AC-18 Runtime <30s p95 erfüllt (F-09)

**UI (FixtureCard / SpieltagBrowser / FixtureDetailModal):**
- [ ] Alle 3 Components in Spieltag-Page-Render-Tree (existing Import-Chain bleibt — keine neuen Imports nötig, nur Edits)
- [ ] Playwright-Screenshot 393px + Modal-Screenshot
- [ ] Mobile-Pflicht: kein Overflow bei LIVE-Pill + Minute + Score in 88px-Card
- [ ] AC-13 grün

**i18n (3 neue Keys):**
- [ ] DE + TR komplett (siehe TR-Wording-Vorab Tabelle)
- [ ] business.md-konform (Score = Sport-Daten, KEIN money-Wording)
- [ ] Pre-Build-Audit per `jq` (siehe IMPACT §8 Korrektur F-02) — keine missing keys
- [ ] Anil-Pflicht-Review markiert vor Beta-Verify

**Hook (`useLiveFixtures`):**
- [ ] Channel-Cleanup in useEffect-return verifiziert (AC-14, kein Memory-Leak)
- [ ] Polling-Fallback-Trigger via `channel.subscribe(status => ...)` (F-08)
- [ ] Liga-Switch (LeagueScopeStore-Change) → unsubscribe + resubscribe

**Type:**
- [ ] `Fixture.minute?: number | null` + `Fixture.last_live_update_at?: string | null` in `src/types/index.ts`
- [ ] tsc clean nach Type-Update (alle 19 Konsumenten tolerant — IMPACT §2 verifiziert)

---

## Compliance-Check

- ✅ KEIN $SCOUT/Money-Wording involved (Score = Sport-Daten)
- ✅ KEIN IPO-Begriff
- ✅ KEIN TR-Glücksspiel-Vokabel — „CANLI" ist neutral
- ✅ KEIN Asset-Klasse-Framing
- N/A — TradingDisclaimer (kein Money-Path)

## TR-Wording-Vorab

| Key | DE | TR | business.md-Konformität |
|-----|----|----|-------------------------|
| `spieltag.browserLive` | „LIVE" | „CANLI" | ✓ neutral |
| `spieltag.liveLabel` | „LIVE" | „CANLI" | ✓ neutral |
| `spieltag.minute` | „{minute}'" | „{minute}'" | ✓ universell, Apostroph-Notation |

**Anil-Pflicht-Review** vor Commit markiert (Q1-Q4 + TR-Strings).

## Open Risiko (kurz)

**Realtime ist neu-Kategorie für Spieltag.** Der existing GoalTicker + Score-Header lebt von Final-Stats — Live ist ein paralleler Pfad, nicht Drop-In-Replacement. Risk: Visual-Inkonsistenz wenn Live-Score-Pulse anders aussieht als Final-Score-Gold. Mitigation: gleicher gold-text-Style, nur zusätzlicher pulse-Glow-Layer bei Live.

**Pro-Plan-Limits** sind Beta-safe (50 User + Liga-Scope-Channels = ~5 channels), Scale (1000+) erfordert Pattern-Review zukünftig. Nicht in Slice 267 lösen — dokumentieren in Open-Backlog.

**API-Football-Quota** ist der einzige harte Cost-Treiber. Q2-C-Adaptive ist Pflicht, nicht Optional.
