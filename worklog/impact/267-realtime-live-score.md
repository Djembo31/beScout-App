# IMPACT — Slice 267 Realtime-Live-Score

**Slice:** 267 · **Trigger:** Migration + Type-Erweiterung + neuer Cron + Realtime-Publication-Add → Cross-Domain
**Date:** 2026-05-02

---

## 1. DB-Schema-Impact

### Tabelle `fixtures` — additive Änderungen (kein Breaking)

| Aktion | Effekt | Risk |
|--------|--------|------|
| `ADD COLUMN minute INTEGER NULL` | Neue Spalte, nullable, default NULL | LOW — nullable, alle existing Reads tolerant |
| `ADD COLUMN last_live_update_at TIMESTAMPTZ NULL` | Neue Spalte, nullable | LOW — gleicher Grund |
| `ALTER TABLE ... REPLICA IDENTITY FULL` | WAL-Größe ×3-5 für fixtures | LOW — Tabelle ist klein (~500 rows/Saison) |
| `ALTER PUBLICATION supabase_realtime ADD TABLE fixtures` | Realtime-Broadcast aktiv | MED — Pflicht-Test dass keine PII auf falsche Channels broadcast |

### Existing Reads sind alle tolerant
Mapper in `src/features/fantasy/services/fixtures.ts:31-53` und `src/lib/services/fixtures.ts` casten explizit per Feld — neue Spalten sind opt-in, brechen nicht.

### Migration-Reihenfolge (idempotent)
```sql
-- Slice 267: Realtime-Live-Score Foundation
ALTER TABLE public.fixtures
  ADD COLUMN IF NOT EXISTS minute INTEGER NULL,
  ADD COLUMN IF NOT EXISTS last_live_update_at TIMESTAMPTZ NULL;

ALTER TABLE public.fixtures REPLICA IDENTITY FULL;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime'
      AND schemaname = 'public'
      AND tablename = 'fixtures'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.fixtures;
  END IF;
END $$;

COMMENT ON COLUMN public.fixtures.minute IS 'Slice 267: Live-Match-Minute (NULL = nicht-live oder pre-kickoff). Source: API-Football fixture.status.elapsed.';
COMMENT ON COLUMN public.fixtures.last_live_update_at IS 'Slice 267: Letzter live-score-sync-Cron-Update. Stale-Detection > 5min = Live-Cron offline.';
```

**Apply via:** `mcp__supabase__apply_migration` (database.md Pflicht — NIE `supabase db push`)

---

## 2. Type-Update Konsumenten-Liste

`src/types/index.ts:1525-1545` — `Fixture` Interface erweitern:

```ts
export type FixtureStatus = 'scheduled' | 'simulated' | 'live' | 'finished'; // unverändert

export interface Fixture {
  id: string;
  gameweek: number;
  // ... existing ...
  minute?: number | null;              // NEU — Slice 267
  last_live_update_at?: string | null; // NEU — Slice 267
}
```

### 19 Konsumenten der `Fixture`-Type (grep-verifiziert):

| Datei | Cast-Risiko | Notiz |
|---|---|---|
| `src/app/(app)/club/[slug]/ClubContent.tsx:55` | ✅ none | Nur Status-Read |
| `src/components/club/FixtureCards.tsx:9` | ✅ none | Liest Score+Status |
| `src/components/club/hooks/types.ts:1` | ✅ none | Type-Re-Export |
| `src/components/club/sections/PublicClubView.tsx:11` | ✅ none | Display-only |
| `src/components/club/sections/SpielplanTab.tsx:7` | ✅ none | Display-only |
| `src/components/community/CreateResearchModal.tsx:8` | ✅ none | DbFixture, separater Typ |
| `src/components/community/ScoutingEvaluationForm.tsx:6` | ✅ none | DbFixture |
| `src/components/fantasy/spieltag/fixture-tabs/shared.ts:1` | ✅ none | Tab-Props |
| `src/components/fantasy/spieltag/FixtureCard.tsx:6` | ⚠️ **EDIT** | Slice 267 Live-Render-Branch hier |
| `src/components/fantasy/spieltag/FixtureDetailModal.tsx:11` | ⚠️ **EDIT** | Live-Header hier |
| `src/components/fantasy/spieltag/SpieltagBrowser.tsx:6` | ⚠️ **EDIT** | Live-Bucket hier |
| `src/components/fantasy/spieltag/SpieltagPulse.tsx:8` | ✅ none | Aggregate-Props |
| `src/components/fantasy/spieltag/TopspielCard.tsx:6` | ✅ none | Display-only |
| `src/components/fantasy/spieltag/__tests__/FixtureDetailModal.test.tsx:6` | ⚠️ **EDIT** | Test-Mock erweitern |
| `src/components/fantasy/spieltag/__tests__/SpieltagPulse.test.tsx:6` | ✅ none | Mock unchanged |
| `src/components/fantasy/SpieltagTab.tsx:13` | ✅ none | Container-Props |
| `src/components/fantasy/__tests__/SpieltagTab.test.tsx:6` | ✅ none | Mock unchanged |
| `src/components/player/detail/UpcomingFixtures.tsx:8` | ✅ none | Future-fixtures only |
| `src/features/fantasy/services/fixtures.ts:2` | ⚠️ **EDIT** | Mapper-Erweiterung (minute + last_live_update_at) |

**Cross-Cutting-Edits:** 5 Files (Mapper + 3 UI + 1 Test) — alle innerhalb Slice-267-Scope, keine fremden Domains betroffen.

---

## 3. Service-Layer-Impact

### `src/features/fantasy/services/fixtures.ts` (canonical, einzige echte Implementation, F-07 Patch)
- ➕ Neue Funktion: `subscribeFixtureUpdates(leagueId: string, callback: (fixture: Fixture) => void): RealtimeChannel`
- Pattern-Source: `src/lib/queries/social.ts:46-84` (existing useFollowingFeed)
- Mapper-Erweiterung pflicht: `minute` + `last_live_update_at` in `getFixturesByGameweek`-Mapper + `getFixturesByClub`-Mapper aufnehmen, sonst Realtime-Updates kommen rein aber Frontend hat Mapper-stripped Felder
- Risk: Channel-Cleanup-Memory-Leak wenn useEffect-return fehlt → AC-14 deckt

### `src/lib/services/fixtures.ts` (Bridge-Re-Export, NICHT editieren)
- File ist 2-line: `export * from '@/features/fantasy/services/fixtures'` — automatisch up-to-date durch Re-Export
- Konsumenten (12 Files mit `from '@/lib/services/fixtures'`) sehen automatisch die neue `subscribeFixtureUpdates`-Funktion

**D46-Note korrigiert (F-07):** Es gibt KEIN Service-Duplicate — `lib/services/fixtures.ts` ist nur 2-line Bridge-Re-Export auf `features/fantasy/services/fixtures.ts`. Der ursprüngliche D46-Verdacht war falsch (durch unterschiedliche Import-Pfade in Konsumenten verursacht).

---

## 4. Cron-Impact

### Neue Route: `src/app/api/cron/live-score-sync/route.ts`
- **Schedule:** `* * * * *` (jede Minute, Vercel Pro erlaubt sub-minute, context7 verifiziert)
- **maxDuration:** Default 300s (1 Call ~5-10s, massiv unter Limit)
- **Auth:** `Bearer ${CRON_SECRET}`-Pattern wie alle anderen Crons
- **Q2-C-Adaptive Pre-Check:**
  ```sql
  SELECT 1 FROM fixtures
  WHERE played_at BETWEEN NOW() - INTERVAL '15 minutes' AND NOW() + INTERVAL '15 minutes'
    AND status IN ('scheduled', 'live')
  LIMIT 1
  ```
  Bei 0 rows: skip API-Call, return early (`{skipped: true, reason: 'no_live_window'}`).
- **API-Call:** `GET /fixtures?live=<league-ids-pipe>` mit aktiven Liga-IDs aus `clubs.league_id` DISTINCT

### `vercel.json` Eintrag-Liste post-267:
```diff
  "crons": [
    { "path": "/api/cron/gameweek-sync", "schedule": "0 6 * * *" },
+   { "path": "/api/cron/live-score-sync", "schedule": "* * * * *" },
    ... 12 weitere bestehende Crons ...
  ]
```
**Vercel Pro Limits:** 40 Crons total, 14 nach Slice 267 = 35% genutzt. ✅

### Cost-Impact
| Resource | Worst-Case | Cost |
|---|---|---|
| Vercel Function Invocations | 1 × 1440/Tag × 30 = 43.200/Monat | 0 € (4% des 1M-free-Tiers) |
| Vercel Active CPU | <10s × 43.200 = 120 CPU-min/Monat | ~0 € (under fluid-compute headroom) |
| API-Football Calls | Q2-C: ~250/Tag, Q2-A worst: 1440/Tag | 0 € (3-19% des 7.500/Tag Pro-Limits) |

---

## 5. Realtime-Subscription-Impact

### Neue Channel-Pattern
- **Channel-Topic:** `live-fixtures-${leagueId}` (1 Channel pro Liga, F2-Liga-Scope)
- **Filter:** `event: 'UPDATE', schema: 'public', table: 'fixtures', filter: 'league_id=eq.${leagueId}'`
- **Throttle:** 2s analog social.ts (verhindert UI-Thrashing bei rapid-Updates)

### Concurrent-Connections-Impact
- Beta (50 User × 1 Channel) = 50 connections — 10% von 500 (Pro-Limit)
- Liga-Switch (LeagueScopeStore-Change) = unsubscribe + resubscribe → max 1 active/User

### Channel-Lifecycle
- Mount Spieltag-Page → useLiveFixtures(leagueId) → channel.subscribe()
- Unmount / Liga-Switch → useEffect-cleanup → supabase.removeChannel(channel)
- AC-14 verifiziert kein Memory-Leak

---

## 6. RLS-Policy-Impact

`fixtures` hat bereits RLS enabled (Migration `20260331_baseline_fantasy.sql:266`). 

**Verifikation pflicht (Wave 1 BUILD):**
```sql
SELECT policyname, cmd FROM pg_policies WHERE tablename = 'fixtures';
```
Erwartung: SELECT-Policy für `authenticated` (öffentliche Sport-Daten). Falls UPDATE/DELETE-Policies existieren: prüfen dass Cron-service_role-bypass funktioniert (service_role bypassed RLS automatisch).

**Realtime + RLS:** Supabase Realtime checkt RLS bei jedem Subscribe-Event — wenn User eine fixture-Row nicht SELECT'en darf, kommt der UPDATE-Event nicht. Da fixtures public-readable ist: kein Risk.

---

## 7. Cache-Invalidation-Impact

### `qk.fixtures` Tree (existing)
```
qk.fixtures.recentMinutes
qk.fixtures.recentScores
qk.fixtures.byClub(cid)
qk.fixtures.next
qk.fixtures.nextByClub
qk.fixtures.nextForClub(cid, count)
```

### Neuer Key Slice 267
```
qk.fixtures.live(leagueId)
```

### Realtime-Update-Strategie
- Bei UPDATE-Event von realtime-channel: `setQueryData<Fixture[]>(qk.fixtures.byGameweek(gw), prev => prev.map(f => f.id === payload.id ? {...f, ...payload} : f))`
- Plus Root-Prefix-Invalidation bei Status-Transition `live → finished`: `invalidateQueries({ queryKey: ['fixtures'] })` damit Browser-Bucket umgruppiert (errors-frontend.md Root-Prefix-Pattern)

---

## 8. i18n-Impact

| Key | DE | TR | Pflicht |
|---|---|---|---|
| `spieltag.browserLive` | „LIVE" | „CANLI" | ✅ Anil-pre-confirm |
| `spieltag.liveLabel` | „LIVE" | „CANLI" | ✅ |
| `spieltag.minute` | `{minute}'` | `{minute}'` | ✅ universell |

**Pre-Build-Audit korrigiert (F-02 Patch):**
```bash
# Korrekte namespace-aware Verify per python (matched JSON-Struktur, NICHT t()-Konsumenten):
for k in browserLive liveLabel minute; do
  for f in messages/de.json messages/tr.json; do
    python -c "import json; d=json.load(open('$f')); exit(0 if '$k' in d.get('spieltag',{}) else 1)" 2>/dev/null \
      && echo "OK: spieltag.$k in $f" \
      || echo "MISSING: spieltag.$k in $f"
  done
done
```
Erwartung: 6 OK-Lines (3 keys × 2 locales). Bei MISSING → React-Render-Crash bei TR/DE-User.

**Cross-Namespace-Doppel-Key-Check (F-01 Lehre):**
- `liveLabel` existiert bereits in `fantasy`-Namespace (DE Z. 938: `"liveLabel": "LIVE"`, TR Z. 938: `"liveLabel": "CANLI"`) für `FantasyPlayerRow.tsx:204` Player-Lock-Indicator.
- Slice 267 fügt `liveLabel` in `spieltag`-Namespace hinzu — **gewollt parallel** für semantisch verschiedene Konzepte (Match-Status vs Player-Lock). KEIN Last-Wins-Drift weil verschiedene Namespaces.
- Wording-Drift-Risk akzeptiert: Wenn Anil später „LIVE" → „JETZT" für einen Namespace ändern will, muss er beide bewusst syncen (oder bewusst auseinander driften lassen).

---

## 9. Test-Impact

### Erweiterte Tests
- `src/components/fantasy/spieltag/__tests__/FixtureCard.test.tsx` — Live-Render-Cases (status='live' + minute=67 + score=1:0, status='live' + minute=NULL, status='live' + score=NULL)
- `src/lib/services/__tests__/fixtures.test.ts` (NEU oder EDIT) — `subscribeFixtureUpdates` mit channel-mock
- `src/components/fantasy/spieltag/__tests__/SpieltagBrowser.test.tsx` (NEU?) — Live-Bucket sichtbar wenn ≥1 Live-Fixture, hidden bei 0

### Existing Tests
- `src/components/fantasy/spieltag/__tests__/FixtureDetailModal.test.tsx` — Mock erweitern um minute-Field, sonst tsc-Fehler
- `src/components/fantasy/__tests__/SpieltagTab.test.tsx` — Mock unchanged (consumes Container-level)

---

## 10. Side-Effects-Audit (potenziell überraschend)

| # | Side-Effect | Probability | Mitigation |
|---|---|---|---|
| 1 | `gameweek-sync` (existing 1×/Tag) und `live-score-sync` (1×/Min) schreiben gleiches Fixture konkurrent | LOW (gameweek-sync läuft 06:00 UTC, live-window ~13-23h) | Last-Write-Wins akzeptabel — gameweek-sync schreibt Final-State, live-score-sync schreibt In-Progress |
| 2 | Realtime-Broadcast von `fixtures` triggert auch Subscriber außerhalb Spieltag (z.B. Player-Detail-Page mit UpcomingFixtures) | LOW (UpcomingFixtures nicht subscribed, nur Initial-Fetch) | UpcomingFixtures bleibt non-realtime — kein Refactor in Slice 267 |
| 3 | Cron-Quota-Bleeding bei Vercel-Hobby-Downgrade-Szenario (D36-Pattern) | LOW (Pro-Plan bestätigt 2026-05-02) | Pre-Push-Check `grep '"\* \* \* \* \*"' vercel.json` — nur Pro-Plan-OK |
| 4 | Bundle-Size: useLiveFixtures + neuer Channel-Pattern erhöht /fantasy-Bundle | LOW (~3-5 KB inkrementell) | bundle-budget.json check post-build |
| 5 | Browser-WS-Reconnect-Storm bei Tab-Wake-from-Sleep | MED | TanStack Query refetchOnReconnect handled, Polling-Fallback X1 als Defense |
| 6 | i18n-Key-Drift in TR (Slice 263-Lehre) | MED | Pre-Build i18n-Audit (Sektion 8) |

---

## 11. Rückwärts-Kompatibilität

### Migration-Rollback
- Schema additive (ADD COLUMN IF NOT EXISTS) — kein Backfill, kein Breaking
- Rollback-Script trivial: `ALTER TABLE fixtures DROP COLUMN IF EXISTS minute, DROP COLUMN IF EXISTS last_live_update_at; ALTER TABLE fixtures REPLICA IDENTITY DEFAULT; ALTER PUBLICATION supabase_realtime DROP TABLE fixtures;`
- Cron-Removal: vercel.json-Eintrag löschen + redeploy

### Frontend-Rollback
- Type-Felder optional (`?: number | null`) → existing Mapper bleiben tolerant
- UI-Edits: Live-Bucket nur sichtbar wenn `liveFixtures.length > 0` — bei Cron-Off + Realtime-Off rendert wie pre-Slice-267

### Production-Rollout-Order
1. Migration appliziert (DB hat neue Cols, Realtime-Pub aktiv)
2. Frontend mit Type-Update + UI-Edits deployed (rendert Live-Bucket leer wenn 0 live-Fixtures)
3. Cron deployed + erste Cron-Runs schreiben minute/last_live_update_at
4. Frontend zeigt Live-State

**Kein Big-Bang.** Bei jedem Schritt ist System weiterhin funktional.

---

## 12. Audit-Verify post-Migration

Nach `mcp__supabase__apply_migration` ausführen:

```sql
-- Pre-Migration-Verify (F-03 Patch — League-Filter-Risk):
SELECT COUNT(*) FROM fixtures WHERE league_id IS NULL;
-- Erwartung: 0. Wenn >0: Backfill-Slice vor 267 ODER Filter-Strategie überdenken
-- (Realtime-Filter `league_id=eq.X` würde NULL-Rows silent ausschließen).

-- Schema-Verify
SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_name = 'fixtures' AND column_name IN ('minute', 'last_live_update_at');
-- Erwartung: 2 rows, beide nullable=YES

-- Replication-Verify
SELECT relreplident FROM pg_class WHERE relname = 'fixtures';
-- Erwartung: 'f' (FULL)

-- Publication-Verify
SELECT tablename FROM pg_publication_tables
WHERE pubname = 'supabase_realtime' AND schemaname = 'public' AND tablename = 'fixtures';
-- Erwartung: 1 row

-- RLS-Verify (Pflicht-Check, errors-db.md)
SELECT policyname, cmd FROM pg_policies WHERE tablename = 'fixtures';
-- Erwartung: ≥1 SELECT-Policy für authenticated/anon
```

---

## Verdict

**Impact-Analyse PASS für Slice 267 BUILD.**

- Cross-Domain-Files: 5 (innerhalb Slice-Scope)
- Breaking Changes: 0
- Migration-Risk: LOW (additive)
- RLS-Risk: 0 (existing fixtures-Policies bleiben)
- Bundle-Risk: LOW (~3-5 KB)
- Quota-Risk: 0 (alle 3 Pläne <20% Auslastung)
- Post-Beta-Scale-Risk: dokumentiert in Pre-Mortem #5

**Wave-Dispatch greenlit.** Wave 1 + Wave 2 parallel-Worktree, Wave 3 nach Wave 1+2 merge.
