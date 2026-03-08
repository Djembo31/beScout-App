# Progressive Fixture Sync + Spielzeit-Anzeige — Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Cron synct Fixture-Ergebnisse progressiv (sobald einzelne Spiele fertig sind, nicht erst bei 10/10), und die UI zeigt Spielzeiten + korrekte Status an.

**Architecture:** Bestehenden Cron in Phase A (Live-Sync einzelner Fixtures) und Phase B (GW-Finalisierung) aufteilen. FixtureCard um Kickoff-Zeit erweitern. SpieltagBrowser von 2 auf 3 Gruppen (Beendet/Ausstehend/Anstehend).

**Tech Stack:** Next.js API Route, Supabase RPC, React Components, next-intl

---

## Task 1: Fix Breaking Status Checks

Zwei Stellen pruefen nur `'simulated'`, nicht `'finished'`. Das muss VOR dem Cron-Umbau gefixt werden.

**Files:**
- Modify: `src/components/fantasy/GameweekTab.tsx:33`
- Modify: `src/components/fantasy/GameweekTab.tsx:199`
- Modify: `src/lib/services/scoring.ts:382`

**Step 1: Fix GameweekTab — FixtureCard isSimulated**

In `src/components/fantasy/GameweekTab.tsx`, Line 33:

```typescript
// VORHER:
const isSimulated = fixture.status === 'simulated';

// NACHHER:
const isSimulated = fixture.status === 'simulated' || fixture.status === 'finished';
```

**Step 2: Fix GameweekTab — simulatedCount**

Same file, Line 199:

```typescript
// VORHER:
const simulatedCount = fixtures.filter(f => f.status === 'simulated').length;

// NACHHER:
const simulatedCount = fixtures.filter(f => f.status === 'simulated' || f.status === 'finished').length;
```

**Step 3: Fix scoring.ts — getFullGameweekStatus**

In `src/lib/services/scoring.ts`, Line 382:

```typescript
// VORHER:
const simulatedCount = gwFixtures.filter(f => f.status === 'simulated').length;

// NACHHER:
const simulatedCount = gwFixtures.filter(f => f.status === 'simulated' || f.status === 'finished').length;
```

**Step 4: Build check**

Run: `npx next build`
Expected: 0 errors

**Step 5: Commit**

```bash
git add src/components/fantasy/GameweekTab.tsx src/lib/services/scoring.ts
git commit -m "fix: include 'finished' status in fixture completion checks"
```

---

## Task 2: i18n — Neue Keys fuer Spielzeit + Status

**Files:**
- Modify: `messages/de.json`
- Modify: `messages/tr.json`

**Step 1: Add DE keys**

In `messages/de.json`, im `spieltag` Objekt nach `"browserUpcoming": "Anstehend"` einfuegen:

```json
"browserPending": "Ergebnis ausstehend",
"kickoffAt": "{date} · {time}",
"resultPending": "Ergebnis ausstehend"
```

**Step 2: Add TR keys**

In `messages/tr.json`, im `spieltag` Objekt nach dem entsprechenden `browserUpcoming`:

```json
"browserPending": "Sonuç bekleniyor",
"kickoffAt": "{date} · {time}",
"resultPending": "Sonuç bekleniyor"
```

**Step 3: Commit**

```bash
git add messages/de.json messages/tr.json
git commit -m "i18n: add fixture time and pending result keys"
```

---

## Task 3: FixtureCard — Kickoff-Zeit anzeigen

**Files:**
- Modify: `src/components/fantasy/spieltag/FixtureCard.tsx`

**Step 1: Add kickoff time display**

Ersetze den gesamten `FixtureCard` Return mit Kickoff-Zeit-Logik:

```typescript
'use client';

import React from 'react';
import { ChevronRight, Clock } from 'lucide-react';
import { useTranslations } from 'next-intl';
import type { Fixture } from '@/types';
import { getClub } from '@/lib/clubs';
import { ClubLogo } from './ClubLogo';
import { getStatusAccent } from './helpers';

type Props = {
  fixture: Fixture;
  onSelect: () => void;
};

/** Format played_at into short date + time: "Sa 08.03. · 14:00" */
function formatKickoff(playedAt: string | null): { date: string; time: string } | null {
  if (!playedAt) return null;
  const d = new Date(playedAt);
  if (isNaN(d.getTime())) return null;
  const days = ['So', 'Mo', 'Di', 'Mi', 'Do', 'Fr', 'Sa'];
  const day = days[d.getDay()];
  const dd = String(d.getDate()).padStart(2, '0');
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const hh = String(d.getHours()).padStart(2, '0');
  const min = String(d.getMinutes()).padStart(2, '0');
  return { date: `${day} ${dd}.${mm}.`, time: `${hh}:${min}` };
}

export function FixtureCard({ fixture, onSelect }: Props) {
  const t = useTranslations('spieltag');
  const homeClub = getClub(fixture.home_club_short) || getClub(fixture.home_club_name);
  const awayClub = getClub(fixture.away_club_short) || getClub(fixture.away_club_name);
  const isFinished = fixture.status === 'simulated' || fixture.status === 'finished';
  const totalGoals = (fixture.home_score ?? 0) + (fixture.away_score ?? 0);

  const kickoff = formatKickoff(fixture.played_at);
  const isPast = kickoff ? new Date(fixture.played_at!) < new Date() : false;
  const isPendingResult = !isFinished && isPast;

  const accent = getStatusAccent(fixture.status);

  return (
    <button
      onClick={onSelect}
      className={`w-full rounded-2xl bg-surface-base border ${accent.border} min-h-[88px] px-4 py-3 transition-colors active:scale-[0.98] group ${accent.glow}`}
    >
      {/* Top bar: status + kickoff time */}
      <div className="flex items-center gap-2 mb-2">
        <div className={`size-1.5 rounded-full shrink-0 ${accent.dot}`} />
        <span className="text-xs text-white/30 font-semibold">
          {isFinished
            ? t('browserFinished')
            : isPendingResult
            ? t('resultPending')
            : kickoff
            ? `${kickoff.date} · ${kickoff.time}`
            : t('browserUpcoming')}
        </span>
        {isPendingResult && (
          <Clock className="size-3 text-amber-400/60" aria-hidden="true" />
        )}
      </div>

      {/* Match row */}
      <div className="flex items-center gap-2">
        {/* Home */}
        <div className="flex-1 flex items-center gap-2 justify-end min-w-0">
          <span className="font-semibold text-xs truncate max-w-[60px]">{fixture.home_club_short || fixture.home_club_name}</span>
          <ClubLogo club={homeClub} size={36} short={fixture.home_club_short} />
        </div>

        {/* Score pill or kickoff */}
        <div className="shrink-0 w-[72px] flex justify-center">
          {isFinished ? (
            <div className="px-3 py-1.5 bg-gold/[0.06] border border-gold/10 rounded-lg">
              <span className="font-mono font-black text-xl tabular-nums score-glow">
                {fixture.home_score} <span className="text-white/25">-</span> {fixture.away_score}
              </span>
            </div>
          ) : isPendingResult ? (
            <div className="px-3 py-1.5 bg-amber-500/[0.06] border border-amber-500/10 rounded-lg">
              <span className="font-mono font-bold text-sm tabular-nums text-amber-400/70">? - ?</span>
            </div>
          ) : kickoff ? (
            <div className="px-3 py-1.5 bg-white/[0.03] border border-white/[0.06] rounded-lg">
              <span className="font-mono font-bold text-sm tabular-nums text-white/40">{kickoff.time}</span>
            </div>
          ) : (
            <span className="text-white/20 text-sm font-bold">vs</span>
          )}
        </div>

        {/* Away */}
        <div className="flex-1 flex items-center gap-2 min-w-0">
          <ClubLogo club={awayClub} size={36} short={fixture.away_club_short} />
          <span className="font-semibold text-xs truncate max-w-[60px]">{fixture.away_club_short || fixture.away_club_name}</span>
        </div>
      </div>

      {/* Bottom row: goal count + chevron */}
      <div className="flex items-center justify-between mt-2">
        <span className="text-xs text-white/20">
          {isFinished && totalGoals > 0 ? `${totalGoals} Tore` : ''}
        </span>
        <ChevronRight className="size-3.5 text-white/0 group-hover:text-white/30 transition-colors" aria-hidden="true" />
      </div>
    </button>
  );
}
```

**Step 2: Build check**

Run: `npx next build`
Expected: 0 errors

**Step 3: Commit**

```bash
git add src/components/fantasy/spieltag/FixtureCard.tsx
git commit -m "feat(spieltag): show kickoff time and pending-result status in FixtureCard"
```

---

## Task 4: SpieltagBrowser — 3 Gruppen

**Files:**
- Modify: `src/components/fantasy/spieltag/SpieltagBrowser.tsx`

**Step 1: Rewrite with 3 groups**

```typescript
'use client';

import React, { useState, useMemo } from 'react';
import { ChevronDown, ChevronUp, Clock } from 'lucide-react';
import { useTranslations } from 'next-intl';
import type { Fixture } from '@/types';
import { FixtureCard } from './FixtureCard';

type Props = {
  fixtures: Fixture[];
  onSelect: (fixture: Fixture) => void;
};

export function SpieltagBrowser({ fixtures, onSelect }: Props) {
  const ts = useTranslations('spieltag');
  const [showFinished, setShowFinished] = useState(true);

  const now = useMemo(() => new Date(), []);

  const finished = useMemo(() =>
    fixtures
      .filter(f => f.status === 'simulated' || f.status === 'finished')
      .sort((a, b) => new Date(b.played_at ?? 0).getTime() - new Date(a.played_at ?? 0).getTime()),
    [fixtures]
  );

  const pendingResult = useMemo(() =>
    fixtures
      .filter(f => f.status !== 'simulated' && f.status !== 'finished' && f.played_at && new Date(f.played_at) < now)
      .sort((a, b) => new Date(b.played_at ?? 0).getTime() - new Date(a.played_at ?? 0).getTime()),
    [fixtures, now]
  );

  const upcoming = useMemo(() =>
    fixtures
      .filter(f => f.status !== 'simulated' && f.status !== 'finished' && (!f.played_at || new Date(f.played_at) >= now))
      .sort((a, b) => new Date(a.played_at ?? '9999').getTime() - new Date(b.played_at ?? '9999').getTime()),
    [fixtures, now]
  );

  if (fixtures.length === 0) return null;

  return (
    <section className="space-y-3">
      {/* Finished group */}
      {finished.length > 0 && (
        <div>
          <button
            onClick={() => setShowFinished(!showFinished)}
            className="flex items-center gap-1.5 px-1 pb-1.5 w-full text-left"
          >
            <div className="size-1.5 rounded-full bg-green-500" />
            <span className="text-xs font-bold text-green-500 uppercase tracking-wider">{ts('browserFinished')}</span>
            <span className="text-xs text-white/20 font-mono tabular-nums">{finished.length}</span>
            {showFinished ? (
              <ChevronUp className="size-3 text-white/20 ml-auto" aria-hidden="true" />
            ) : (
              <ChevronDown className="size-3 text-white/20 ml-auto" aria-hidden="true" />
            )}
          </button>
          {showFinished && (
            <div className="space-y-2">
              {finished.map(f => (
                <FixtureCard key={f.id} fixture={f} onSelect={() => onSelect(f)} />
              ))}
            </div>
          )}
        </div>
      )}

      {/* Pending result group */}
      {pendingResult.length > 0 && (
        <div>
          <div className="flex items-center gap-1.5 px-1 pb-1.5">
            <Clock className="size-3 text-amber-400" aria-hidden="true" />
            <span className="text-xs font-bold text-amber-400 uppercase tracking-wider">{ts('browserPending')}</span>
            <span className="text-xs text-white/20 font-mono tabular-nums">{pendingResult.length}</span>
          </div>
          <div className="space-y-2">
            {pendingResult.map(f => (
              <FixtureCard key={f.id} fixture={f} onSelect={() => onSelect(f)} />
            ))}
          </div>
        </div>
      )}

      {/* Upcoming group */}
      {upcoming.length > 0 && (
        <div>
          <div className="flex items-center gap-1.5 px-1 pb-1.5">
            <span className="text-xs font-bold text-sky-400 uppercase tracking-wider">{ts('browserUpcoming')}</span>
            <span className="text-xs text-white/20 font-mono tabular-nums">{upcoming.length}</span>
          </div>
          <div className="space-y-2">
            {upcoming.map(f => (
              <FixtureCard key={f.id} fixture={f} onSelect={() => onSelect(f)} />
            ))}
          </div>
        </div>
      )}
    </section>
  );
}
```

**Step 2: Build check**

Run: `npx next build`
Expected: 0 errors

**Step 3: Commit**

```bash
git add src/components/fantasy/spieltag/SpieltagBrowser.tsx
git commit -m "feat(spieltag): 3 fixture groups — finished, pending result, upcoming"
```

---

## Task 5: Cron Phase A — Progressive Fixture Sync

**Files:**
- Modify: `src/app/api/cron/gameweek-sync/route.ts`

This is the largest change. The match-day check (Lines 197-234) gets replaced with a check for any fixtures past `played_at`. The pipeline splits into Phase A (sync finished fixtures) and Phase B (GW finalization, only when all done).

**Step 1: Replace match-day check (Lines 197-234)**

Replace the `todayFixtures` check block with:

```typescript
    // ---- 3b. Check for processable fixtures (past played_at OR all already finished) ----
    const { data: unfinishedFixtures } = await supabaseAdmin
      .from('fixtures')
      .select('id, played_at')
      .eq('gameweek', activeGw)
      .neq('status', 'finished')
      .limit(1);

    if (!unfinishedFixtures || unfinishedFixtures.length === 0) {
      // All fixtures already 'finished' in DB — check if GW finalization is needed
      const { data: unscoredEvents } = await supabaseAdmin
        .from('events')
        .select('id')
        .in('club_id', clubsToProcess.map(c => c.id))
        .eq('gameweek', activeGw)
        .is('scored_at', null)
        .limit(1);

      if (!unscoredEvents || unscoredEvents.length === 0) {
        await logStep(activeGw, 'already_complete', 'skipped', { reason: 'All fixtures finished, all events scored' });
        return NextResponse.json({ status: 'skipped', reason: 'GW already fully processed', gameweek: activeGw, duration_ms: Date.now() - runStart });
      }
      // Fixtures done but events not scored — fall through to Phase B
    } else {
      // There are unfinished fixtures — check if any have played_at in the past
      const { data: pastUnfinished } = await supabaseAdmin
        .from('fixtures')
        .select('id')
        .eq('gameweek', activeGw)
        .neq('status', 'finished')
        .lt('played_at', new Date().toISOString())
        .limit(1);

      if (!pastUnfinished || pastUnfinished.length === 0) {
        // All unfinished fixtures are in the future — nothing to sync
        await logStep(activeGw, 'no_past_fixtures', 'skipped', { reason: 'No fixtures past kickoff yet' });
        return NextResponse.json({ status: 'skipped', reason: 'No fixtures past kickoff', gameweek: activeGw, duration_ms: Date.now() - runStart });
      }
    }
```

**Step 2: Modify API fixture check (Lines 237-270) — allow partial**

Replace the `allDone` check:

```typescript
    // ---- 4. Check API fixtures ----
    const { result: fixtureCheck } = await runStep(
      'check_api_fixtures',
      async () => {
        const apiFixData = await apiFetch<ApiFixtureResponse>(
          `/fixtures?league=${leagueId}&season=${season}&round=Regular Season - ${activeGw}`,
        );

        const total = apiFixData.response.length;
        const finished = apiFixData.response.filter((f) =>
          FINISHED_STATUSES.has(f.fixture.status.short),
        ).length;

        return {
          total,
          finished,
          allDone: total > 0 && total === finished,
          apiData: apiFixData,
        };
      },
    );

    if (!fixtureCheck || fixtureCheck.finished === 0) {
      await logStep(activeGw, 'check_fixtures', 'skipped', {
        total: fixtureCheck?.total ?? 0,
        finished: fixtureCheck?.finished ?? 0,
      });
      return NextResponse.json({
        skipped: true,
        gameweek: activeGw,
        reason: `No finished fixtures on API (${fixtureCheck?.finished ?? 0}/${fixtureCheck?.total ?? 0})`,
        steps,
      });
    }

    const apiFixData = fixtureCheck.apiData;
    const allFixturesDone = fixtureCheck.allDone;
    await logStep(activeGw, 'check_fixtures', 'success', {
      total: fixtureCheck.total,
      finished: fixtureCheck.finished,
      allDone: allFixturesDone,
    });
```

**Step 3: Filter to only NEW finished fixtures in Step 5 mapping**

After loading mappings (Line 367), add a filter to find which fixtures are newly finished:

```typescript
    // ---- 5b. Identify newly finished fixtures (API=FT, DB!=finished) ----
    const dbFinishedIds = new Set<string>();
    {
      const { data: alreadyFinished } = await supabaseAdmin
        .from('fixtures')
        .select('id')
        .eq('gameweek', activeGw)
        .eq('status', 'finished');
      for (const f of alreadyFinished ?? []) {
        dbFinishedIds.add(f.id as string);
      }
    }

    // Filter API data to only finished fixtures whose DB counterpart is NOT yet finished
    const finishedApiFixtureIds = new Set(
      apiFixData.response
        .filter(f => FINISHED_STATUSES.has(f.fixture.status.short))
        .map(f => f.fixture.id)
    );

    const newlyFinishedFixtures = mappings.fixtures.filter(f =>
      !dbFinishedIds.has(f.id) && finishedApiFixtureIds.has(f.api_fixture_id)
    );

    if (newlyFinishedFixtures.length === 0 && !allFixturesDone) {
      await logStep(activeGw, 'no_new_fixtures', 'skipped', { alreadyFinished: dbFinishedIds.size });
      return NextResponse.json({
        skipped: true,
        gameweek: activeGw,
        reason: `No newly finished fixtures (${dbFinishedIds.size} already done)`,
        steps,
      });
    }
```

**Step 4: Change Step 6 (fetch_stats) to only process newlyFinishedFixtures**

In the fetch_stats step (Line 429), change:

```typescript
// VORHER:
for (const fixture of mappings.fixtures) {

// NACHHER:
const fixturesToProcess = newlyFinishedFixtures.length > 0 ? newlyFinishedFixtures : [];
for (const fixture of fixturesToProcess) {
```

**Step 5: Phase B guard — only run finalization when allFixturesDone**

Wrap Steps 8-12 (score_events through recalc_perf, Lines 867-1082) in a guard:

```typescript
    // ============================================
    // PHASE B: GW Finalization (only when ALL fixtures done)
    // ============================================
    if (allFixturesDone) {
      // ... existing Steps 8-12 (score_events, resolve_predictions, dpc_of_week, clone_events, advance_gameweek, recalc_perf)
    } else {
      steps.push({ step: 'phase_b_skipped', status: 'skipped', details: { reason: `${fixtureCheck.finished}/${fixtureCheck.total} finished` }, duration_ms: 0 });
      await logStep(activeGw, 'phase_b_skipped', 'skipped', {
        finished: fixtureCheck.finished,
        total: fixtureCheck.total,
      });
    }
```

**Step 6: Build check**

Run: `npx next build`
Expected: 0 errors

**Step 7: Commit**

```bash
git add src/app/api/cron/gameweek-sync/route.ts
git commit -m "feat(cron): progressive fixture sync — Phase A syncs individual results, Phase B finalizes GW"
```

---

## Task 6: Verify End-to-End

**Step 1: Manual cron trigger test**

Call the cron with a test to see Phase A working:

```bash
curl -H "Authorization: Bearer $CRON_SECRET" https://bescout.app/api/cron/gameweek-sync
```

Expected response: Phase A imports newly finished fixtures, Phase B skipped if not all done.

**Step 2: DB verification**

```sql
-- Check that finished fixtures now have status='finished' in DB
SELECT status, count(*) FROM fixtures WHERE gameweek = 29 GROUP BY status;
-- Expected: some 'finished', some 'scheduled'

-- Check fixture_player_stats exist for finished fixtures
SELECT f.status, count(fps.id)
FROM fixtures f
LEFT JOIN fixture_player_stats fps ON fps.fixture_id = f.id
WHERE f.gameweek = 29
GROUP BY f.status;
```

**Step 3: UI verification**

Navigate to Fantasy > Spieltag 29:
- Finished fixtures show scores in gold pill
- "Ergebnis ausstehend" fixtures show "? - ?" in amber
- Upcoming fixtures show kickoff time
- SpieltagBrowser has correct 3-group split

**Step 4: Final commit (if any fixes needed)**

---

## Summary of All Changed Files

| File | Change Type | What |
|------|-------------|------|
| `src/components/fantasy/GameweekTab.tsx` | Fix | Add `'finished'` to status checks (2 places) |
| `src/lib/services/scoring.ts` | Fix | Add `'finished'` to `getFullGameweekStatus()` |
| `messages/de.json` | i18n | 3 new keys (browserPending, kickoffAt, resultPending) |
| `messages/tr.json` | i18n | 3 new keys (browserPending, kickoffAt, resultPending) |
| `src/components/fantasy/spieltag/FixtureCard.tsx` | Feature | Kickoff time display + pending result state |
| `src/components/fantasy/spieltag/SpieltagBrowser.tsx` | Feature | 3 groups (finished/pending/upcoming) |
| `src/app/api/cron/gameweek-sync/route.ts` | Feature | Phase A/B split, progressive sync |
