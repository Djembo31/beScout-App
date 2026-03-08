# FixtureDetailModal Redesign — Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Redesign FixtureDetailModal from generic LiveScore clone to BeScout-branded investment-driving match experience with Goal Ticker, Ranking tab, MVP highlights, and Floor Prices.

**Architecture:** Replace current 2-tab (Formation/Players) modal with enhanced 2-tab (Ranking/Aufstellung) layout. Score Header gets carbon identity + Goal Ticker. Ranking tab becomes default (sorted by Rating DESC). Formation tab gets MVP glow, larger goal/assist badges, and match timeline. Floor prices loaded via bulk query on `players.floor_price`.

**Tech Stack:** React, TypeScript strict, Tailwind CSS (dark-only), next-intl, lucide-react, Supabase (read-only queries)

---

## Design Reference

Approved design: See above in this file (Problem + Lösung sections).
Screenshots: `fixture-modal-*.png` in project root.

## Critical Rules
- IMMER `PlayerPhoto` Component für Spielerfotos (nie inline img)
- `cn()` für classNames, `fmtScout()` für Zahlen
- Hooks VOR early returns (React Rules)
- `font-mono tabular-nums` auf ALLE Zahlen
- Touch-Targets min 44px
- `aria-label` auf alle interaktiven Elemente
- `aria-hidden="true"` auf dekorative Icons

---

### Task 1: i18n Keys (DE + TR)

**Files:**
- Modify: `messages/de.json` (spieltag namespace ~line 2795)
- Modify: `messages/tr.json` (spieltag namespace ~line 2787)

**Step 1: Add new keys to DE**

In `messages/de.json`, spieltag namespace, add/replace:
```json
"ranking": "Ranking",
"formation": "Aufstellung",
"goalTicker": "Tore",
"assist": "Vorlage",
"mvp": "MVP",
"starters": "Aufstellung",
"substitutes": "Eingewechselt",
"unused": "Nicht eingesetzt",
"matchTimeline": "Spielverlauf",
"goalEvent": "Tor",
"assistEvent": "Vorlage",
"cardEvent": "Karte",
"subEvent": "Wechsel",
"floorPrice": "Floor",
"showMore": "Mehr anzeigen",
"showLess": "Weniger"
```

**Step 2: Add same keys to TR**

```json
"ranking": "Sıralama",
"formation": "Kadro",
"goalTicker": "Goller",
"assist": "Asist",
"mvp": "MVP",
"starters": "İlk 11",
"substitutes": "Oyuna Giren",
"unused": "Forma Giymeyen",
"matchTimeline": "Maç Akışı",
"goalEvent": "Gol",
"assistEvent": "Asist",
"cardEvent": "Kart",
"subEvent": "Değişiklik",
"floorPrice": "Taban",
"showMore": "Daha fazla",
"showLess": "Daha az"
```

**Step 3: Build check**

Run: `npx next build 2>&1 | tail -5`
Expected: Build succeeds (i18n keys don't break build, just need to exist)

**Step 4: Commit**

```bash
git add messages/de.json messages/tr.json
git commit -m "i18n: add fixture modal redesign keys (DE + TR)"
```

---

### Task 2: Floor Price Bulk Service

**Files:**
- Modify: `src/lib/services/fixtures.ts` (append new function after existing exports)

**Step 1: Add `getFloorPricesForPlayers` function**

At the end of `fixtures.ts`, add:
```typescript
/** Bulk-fetch floor prices for a list of player IDs.
 *  Returns Map<playerId, floorPriceCents>. Players without DPCs are omitted. */
export async function getFloorPricesForPlayers(playerIds: string[]): Promise<Map<string, number>> {
  if (playerIds.length === 0) return new Map();
  // floor_price is already on the players table (maintained by triggers)
  const { data } = await supabase
    .from('players')
    .select('id, floor_price')
    .in('id', playerIds)
    .gt('floor_price', 0);
  const map = new Map<string, number>();
  for (const row of data ?? []) {
    map.set(row.id, row.floor_price);
  }
  return map;
}
```

**Step 2: Build check**

Run: `npx next build 2>&1 | tail -5`
Expected: Build succeeds

**Step 3: Commit**

```bash
git add src/lib/services/fixtures.ts
git commit -m "feat(fixtures): add bulk floor price query for player IDs"
```

---

### Task 3: Score Header Redesign + Goal Ticker

**Files:**
- Modify: `src/components/fantasy/spieltag/FixtureDetailModal.tsx` (lines 384-475)

**Context to read first:**
- `src/components/fantasy/spieltag/ClubLogo.tsx` — ClubLogo component API
- `src/app/globals.css` line 408 — `.score-glow` class

**Step 1: Restructure Modal layout**

The Modal currently wraps everything in `<div className="max-h-[80vh] overflow-y-auto">`. Change to split the header (sticky) from scrollable content:

```tsx
<Modal open={isOpen} title="" onClose={onClose} size="lg">
  {/* Score Header — fixed, not scrolling */}
  <div className="relative overflow-hidden" style={{
    background: 'linear-gradient(180deg, rgba(255,255,255,0.03) 0%, transparent 100%)',
    boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.06)',
  }}>
    {/* ... score block ... */}
    {/* ... goal ticker ... */}
  </div>
  {/* Tabs + Content — scrollable */}
  <div className="max-h-[65vh] overflow-y-auto">
    {/* tabs + content */}
  </div>
</Modal>
```

**Step 2: Rewrite Score Block**

Replace lines 388-456 with new score header:
- Carbon gradient background: `linear-gradient(180deg, rgba(255,255,255,0.03) 0%, transparent 100%)` + `inset 0 1px 0 rgba(255,255,255,0.06)`
- Club-Logos: `size={56}` mobile (was 64), remove `max-w-[100px]` truncation → use `text-center text-sm leading-tight` and allow 2 lines
- Score: Add gold gradient text via inline style: `background: linear-gradient(180deg, #FFE44D, #E6B800)`, `WebkitBackgroundClip: 'text'`, `WebkitTextFillColor: 'transparent'`
- Keep club color radial gradients but more subtle (opacity 10 instead of 20)

**Step 3: Build Goal Ticker**

Add a new `GoalTicker` section between score block and tabs. Build goals array from stats:

```tsx
// Build goal events from stats (goals > 0)
const goalEvents = useMemo(() => {
  const events: { playerId: string | null; name: string; goals: number; clubId: string; pos: string }[] = [];
  for (const s of stats) {
    if (s.goals > 0) {
      events.push({
        playerId: s.player_id,
        name: s.player_last_name || '?',
        goals: s.goals,
        clubId: s.club_id,
        pos: s.player_position,
      });
    }
  }
  // Sort: home goals first, then by goals DESC
  return events.sort((a, b) => {
    if (a.clubId === fixture.home_club_id && b.clubId !== fixture.home_club_id) return -1;
    if (a.clubId !== fixture.home_club_id && b.clubId === fixture.home_club_id) return 1;
    return b.goals - a.goals;
  });
}, [stats, fixture.home_club_id]);
```

Render as horizontal scroll strip:
```tsx
{goalEvents.length > 0 && (
  <div className="flex gap-2 px-4 py-2 overflow-x-auto scrollbar-hide snap-x snap-mandatory border-t border-white/[0.06]">
    {goalEvents.map((evt, i) => (
      <Link
        key={i}
        href={evt.playerId ? `/player/${evt.playerId}` : '#'}
        className="flex items-center gap-1.5 px-3 py-2 bg-gold/[0.06] border border-gold/15 rounded-xl shrink-0 snap-start min-h-[44px] hover:bg-gold/10 transition-colors active:scale-[0.97]"
        aria-label={`${evt.name}, ${evt.goals} ${evt.goals === 1 ? ts('goalEvent') : ts('goalTicker')}`}
      >
        <span className={`size-1.5 rounded-full ${getPosDotColor(evt.pos)}`} aria-hidden="true" />
        <span className="text-xs font-bold text-gold">{evt.name}</span>
        {evt.goals > 1 && <span className="text-[10px] font-mono font-bold text-gold/70 tabular-nums">x{evt.goals}</span>}
      </Link>
    ))}
  </div>
)}
```

Note: Import `Link` from `next/link`, `useMemo` from React, `getPosDotColor` from helpers.

**Step 4: Build check + visual verify**

Run: `npx next build 2>&1 | tail -5`
Then open modal in browser and verify header looks correct.

**Step 5: Commit**

```bash
git add src/components/fantasy/spieltag/FixtureDetailModal.tsx
git commit -m "feat(fixture-modal): score header carbon identity + goal ticker"
```

---

### Task 4: Ranking Tab (New Default)

**Files:**
- Modify: `src/components/fantasy/spieltag/FixtureDetailModal.tsx`

**Context to read first:**
- `src/components/player/index.tsx` — PlayerPhoto props
- `src/lib/services/fixtures.ts` — `getFloorPricesForPlayers` (Task 2)
- Existing `TeamStatsList` function (lines 291-334) — will be replaced

**Step 1: Change tab state default + labels**

Change line 354:
```tsx
const [detailTab, setDetailTab] = useState<'ranking' | 'formation'>('ranking');
```

Change line 360:
```tsx
setDetailTab('ranking');
```

Update tab rendering (lines 459-475):
```tsx
{(['ranking', 'formation'] as const).map(tab => (
  <button
    key={tab}
    onClick={() => setDetailTab(tab)}
    aria-pressed={detailTab === tab}
    className={`px-4 py-2 rounded-lg text-sm font-bold transition-colors min-h-[44px] ${
      detailTab === tab
        ? 'bg-gold/15 text-gold border border-gold/20'
        : 'text-white/35 hover:text-white/55 hover:bg-white/[0.04] border border-transparent'
    }`}
  >
    {tab === 'ranking' ? ts('ranking') : ts('formation')}
  </button>
))}
```

**Step 2: Add floor price loading**

Add state + useEffect for floor prices:
```tsx
const [floorPrices, setFloorPrices] = useState<Map<string, number>>(new Map());

// Load floor prices when stats arrive
useEffect(() => {
  if (stats.length === 0) return;
  const playerIds = stats.map(s => s.player_id).filter((id): id is string => !!id);
  if (playerIds.length === 0) return;
  let cancelled = false;
  getFloorPricesForPlayers(playerIds).then(map => {
    if (!cancelled) setFloorPrices(map);
  });
  return () => { cancelled = true; };
}, [stats]);
```

Import `getFloorPricesForPlayers` from `@/lib/services/fixtures`.

**Step 3: Build ScoutRow component**

Replace `TeamStatsList` with new `RankingList`:

```tsx
function RankingList({ stats, label, color, floorPrices, mvpId }: {
  stats: FixturePlayerStat[];
  label: string;
  color: string;
  floorPrices: Map<string, number>;
  mvpId: string | null;
}) {
  const [showUnused, setShowUnused] = useState(false);

  // Split into groups
  const starters = stats.filter(s => s.is_starter && s.minutes_played > 0)
    .sort((a, b) => (b.rating ?? 0) - (a.rating ?? 0));
  const subs = stats.filter(s => !s.is_starter && s.minutes_played > 0)
    .sort((a, b) => (b.rating ?? 0) - (a.rating ?? 0));
  const unused = stats.filter(s => s.minutes_played === 0);

  const renderRow = (s: FixturePlayerStat) => {
    const rating = s.rating ?? s.fantasy_points / 10;
    const isMvp = s.id === mvpId;
    const floorCents = s.player_id ? floorPrices.get(s.player_id) : undefined;

    return (
      <Link
        key={s.id}
        href={s.player_id ? `/player/${s.player_id}` : '#'}
        className={cn(
          'flex items-center gap-2 px-2.5 py-2.5 rounded-xl text-xs transition-colors min-h-[44px]',
          'hover:bg-white/[0.04] active:scale-[0.97] active:bg-white/[0.06]',
          isMvp ? 'bg-gold/[0.06] border border-gold/20 shadow-[0_0_12px_rgba(255,215,0,0.08)]' : 'bg-white/[0.02]'
        )}
        aria-label={`${s.player_first_name} ${s.player_last_name}, Rating ${rating.toFixed(1)}`}
      >
        <div className="relative flex-shrink-0">
          <PlayerPhoto
            imageUrl={s.player_image_url}
            first={s.player_first_name}
            last={s.player_last_name}
            pos={s.player_position as Pos}
            size={36}
          />
          {isMvp && <Crown aria-hidden="true" className="absolute -top-2 -right-1.5 size-4 text-gold drop-shadow-[0_0_4px_rgba(255,215,0,0.5)]" />}
        </div>
        <span className={`px-1.5 py-0.5 rounded text-[10px] font-bold flex-shrink-0 ${posColor(s.player_position)}`}>
          {s.player_position}
        </span>
        <span className="font-semibold truncate min-w-0 flex-1">
          {(s.player_first_name || '?').charAt(0)}. {s.player_last_name || '?'}
        </span>
        <span className="text-white/25 font-mono text-[10px] tabular-nums flex-shrink-0">{s.minutes_played}&apos;</span>
        {s.goals > 0 && <span className="text-gold font-bold flex-shrink-0" aria-label={`${s.goals} Tore`}>⚽{s.goals > 1 ? `×${s.goals}` : ''}</span>}
        {s.assists > 0 && <span className="text-sky-400 font-bold flex-shrink-0" aria-label={`${s.assists} Vorlagen`}>🅰️{s.assists > 1 ? `×${s.assists}` : ''}</span>}
        {s.yellow_card && <span className="w-2 h-2.5 bg-yellow-400 rounded-[1px] flex-shrink-0" aria-label="Gelbe Karte" />}
        {s.red_card && <span className="w-2 h-2.5 bg-red-500 rounded-[1px] flex-shrink-0" aria-label="Rote Karte" />}
        <span
          className="px-1.5 py-0.5 rounded-md text-[10px] font-black tabular-nums min-w-[2rem] text-center flex-shrink-0"
          style={ratingHeatStyle(rating)}
        >
          {rating.toFixed(1)}
        </span>
        {floorCents != null && floorCents > 0 && (
          <span className="text-[10px] font-mono text-white/30 tabular-nums flex-shrink-0">
            {fmtScout(floorCents / 100)}
          </span>
        )}
        <ChevronRight aria-hidden="true" className="size-3.5 text-white/15 flex-shrink-0" />
      </Link>
    );
  };

  return (
    <div>
      {/* Team header */}
      <div className="flex items-center gap-2 mb-2">
        <div className="w-[3px] h-4 rounded-full" style={{ backgroundColor: color }} />
        <span className="text-xs font-black uppercase tracking-wider" style={{ color }}>{label}</span>
      </div>

      {/* Starters */}
      {starters.length > 0 && (
        <>
          <div className="text-[10px] text-white/20 font-bold uppercase tracking-widest mb-1 px-1">{ts('starters')}</div>
          <div className="space-y-1">{starters.map(renderRow)}</div>
        </>
      )}

      {/* Substitutes */}
      {subs.length > 0 && (
        <>
          <div className="text-[10px] text-white/20 font-bold uppercase tracking-widest mt-3 mb-1 px-1">{ts('substitutes')}</div>
          <div className="space-y-1">{subs.map(renderRow)}</div>
        </>
      )}

      {/* Unused — collapsed */}
      {unused.length > 0 && (
        <>
          <button
            onClick={(e) => { e.preventDefault(); setShowUnused(!showUnused); }}
            className="text-[10px] text-white/15 font-bold uppercase tracking-widest mt-3 mb-1 px-1 hover:text-white/30 transition-colors"
            aria-expanded={showUnused}
          >
            {ts('unused')} ({unused.length}) {showUnused ? '▲' : '▼'}
          </button>
          {showUnused && (
            <div className="space-y-0.5">
              {unused.map(s => (
                <div key={s.id} className="flex items-center gap-2 px-2.5 py-1.5 text-[10px] text-white/20">
                  <span className={`px-1 py-0.5 rounded text-[10px] font-bold opacity-40 ${posColor(s.player_position)}`}>{s.player_position}</span>
                  <span>{(s.player_first_name || '?').charAt(0)}. {s.player_last_name || '?'}</span>
                </div>
              ))}
            </div>
          )}
        </>
      )}
    </div>
  );
}
```

Import: `Crown`, `ChevronRight` from `lucide-react`, `Link` from `next/link`, `fmtScout` from utils, `cn` from utils.

**Step 4: Wire Ranking tab into render**

Find the MVP player (highest rating across both teams):
```tsx
const mvpPlayer = useMemo(() => {
  if (stats.length === 0) return null;
  return stats.reduce((best, s) => {
    const rating = s.rating ?? s.fantasy_points / 10;
    const bestRating = best.rating ?? best.fantasy_points / 10;
    return rating > bestRating ? s : best;
  });
}, [stats]);
```

Replace the `detailTab === 'players'` branch (line 659-663) → `detailTab === 'ranking'`:
```tsx
detailTab === 'ranking' ? (
  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
    <RankingList stats={homeStats} label={fixture.home_club_name} color={homeColor} floorPrices={floorPrices} mvpId={mvpPlayer?.id ?? null} />
    <RankingList stats={awayStats} label={fixture.away_club_name} color={awayColor} floorPrices={floorPrices} mvpId={mvpPlayer?.id ?? null} />
  </div>
) : (
  /* formation tab unchanged for now */
)
```

**Step 5: Remove old `TeamStatsList`**

Delete the `TeamStatsList` function (lines 291-334) — fully replaced by `RankingList`.

**Step 6: Build check + visual verify**

Run: `npx next build 2>&1 | tail -5`

**Step 7: Commit**

```bash
git add src/components/fantasy/spieltag/FixtureDetailModal.tsx
git commit -m "feat(fixture-modal): ranking tab with MVP highlight, floor prices, scout rows"
```

---

### Task 5: Formation Tab Enhancements

**Files:**
- Modify: `src/components/fantasy/spieltag/FixtureDetailModal.tsx` (PlayerNode function, lines 106-142)

**Step 1: Enhance PlayerNode with MVP glow, assist badge, card badges**

Replace the `PlayerNode` function:

Key changes:
- Accept `isMvp` prop
- If `isMvp`: add `card-gold-frame mvp-crown-glow` classes to photo wrapper
- GoalBadge: increase `size` from 15 to 20, add gold shadow if goals > 0
- Add Assist badge (sky, bottom-left) if assists > 0: small "A" circle
- Add Card badges (top-left): yellow/red square
- Torschützen get gold ring shadow: `shadow-[0_0_12px_rgba(255,215,0,0.4)]`
- Assist providers get sky ring shadow: `shadow-[0_0_8px_rgba(56,189,248,0.25)]`

```tsx
function PlayerNode({ stat, isMvp }: { stat: FixturePlayerStat; isMvp?: boolean }) {
  const rating = stat.rating ?? stat.fantasy_points / 10;
  const hasGoals = stat.goals > 0;
  const hasAssists = stat.assists > 0;

  return (
    <div className="flex flex-col items-center relative w-[52px] md:w-[60px] lg:w-[72px]">
      {/* Rating badge */}
      <div
        className="absolute -top-1.5 -right-1 md:-top-2 md:-right-2 z-20 min-w-[1.5rem] md:min-w-[1.7rem] px-1 py-0.5 rounded-md text-[10px] md:text-xs font-mono font-black text-center shadow-lg border border-white/[0.08] tabular-nums"
        style={ratingHeatStyle(rating)}
      >
        {rating.toFixed(1)}
      </div>

      {/* Card badges — top-left */}
      {(stat.yellow_card || stat.red_card) && (
        <div className="absolute -top-1 -left-1 z-20">
          {stat.red_card ? (
            <div className="w-2.5 h-3.5 bg-red-500 rounded-[2px] shadow-lg" aria-label="Rote Karte" />
          ) : (
            <div className="w-2.5 h-3.5 bg-yellow-400 rounded-[2px] shadow-lg" aria-label="Gelbe Karte" />
          )}
        </div>
      )}

      {/* Player photo with position ring + MVP/goal/assist glow */}
      <div className={cn(
        'relative rounded-full',
        getRingFrameClass(stat.player_position),
        'shadow-[0_0_12px_rgba(0,0,0,0.5)]',
        isMvp && 'card-gold-frame mvp-crown-glow',
        hasGoals && !isMvp && 'shadow-[0_0_12px_rgba(255,215,0,0.4)]',
        hasAssists && !hasGoals && !isMvp && 'shadow-[0_0_8px_rgba(56,189,248,0.25)]',
      )}>
        <PlayerPhoto
          imageUrl={stat.player_image_url}
          first={stat.player_first_name}
          last={stat.player_last_name}
          pos={stat.player_position as Pos}
          size={36}
          className="md:size-10 lg:size-12"
        />
        <GoalBadge goals={stat.goals} size={20} className="-bottom-0.5 -right-1.5" />
        {/* Assist badge — bottom-left */}
        {hasAssists && (
          <div className="absolute -bottom-0.5 -left-1.5 z-10 size-5 rounded-full bg-sky-500 flex items-center justify-center shadow-lg" aria-label={`${stat.assists} Vorlage${stat.assists > 1 ? 'n' : ''}`}>
            <span className="text-[8px] font-black text-white">{stat.assists > 1 ? stat.assists : 'A'}</span>
          </div>
        )}
      </div>

      {/* Name */}
      <div className="text-[10px] md:text-xs mt-1 font-bold text-center truncate max-w-full text-white/80 drop-shadow-[0_1px_2px_rgba(0,0,0,0.8)]">
        {stat.player_last_name || '?'}
      </div>

      {/* Stats row — desktop only */}
      <div className="hidden md:flex items-center justify-center gap-0.5 text-[10px] text-white/30">
        <span className="tabular-nums">{stat.minutes_played}&apos;</span>
        {hasGoals && <span className="text-gold font-bold">{stat.goals}G</span>}
        {hasAssists && <span className="text-sky-400 font-bold">{stat.assists}A</span>}
      </div>
    </div>
  );
}
```

**Step 2: Pass `isMvp` from FormationHalf**

Update `FormationHalf` to accept `mvpId` prop and pass to PlayerNode:
```tsx
function FormationHalf({ stats, teamName, color, isHome, formation, logo, mvpId }: {
  // ... existing props ...
  mvpId: string | null;
}) {
  // ... existing code ...
  {players.map(s => <PlayerNode key={s.id} stat={s} isMvp={s.id === mvpId} />)}
}
```

And from the render call, pass `mvpId={mvpPlayer?.id ?? null}` to both FormationHalf calls.

**Step 3: Build check**

Run: `npx next build 2>&1 | tail -5`

**Step 4: Commit**

```bash
git add src/components/fantasy/spieltag/FixtureDetailModal.tsx
git commit -m "feat(fixture-modal): MVP glow, assist badges, card badges on pitch"
```

---

### Task 6: Match Timeline (replaces Substitutions list)

**Files:**
- Modify: `src/components/fantasy/spieltag/FixtureDetailModal.tsx` (lines 586-631, substitutions section)

**Step 1: Build timeline events from stats + substitutions**

Create a merged timeline from goals, cards, and substitutions:

```tsx
type TimelineEvent = {
  minute: number;
  extra?: number;
  type: 'goal' | 'assist' | 'yellow' | 'red' | 'sub';
  playerName: string;
  playerName2?: string; // for subs: player in
  clubId: string;
};

const timelineEvents = useMemo(() => {
  const events: TimelineEvent[] = [];
  // Note: We don't have per-goal minutes from fixture_player_stats.
  // Substitutions have minutes. Goals/cards only have totals.
  // For now, timeline shows substitutions with minutes + summary of goals/cards without minutes.
  for (const sub of substitutions) {
    events.push({
      minute: sub.minute,
      extra: sub.extra_minute ?? undefined,
      type: 'sub',
      playerName: sub.player_out_last_name || sub.player_out_name?.split(' ').pop() || '?',
      playerName2: sub.player_in_last_name || sub.player_in_name?.split(' ').pop() || '?',
      clubId: sub.club_id,
    });
  }
  return events.sort((a, b) => a.minute - b.minute || (a.extra ?? 0) - (b.extra ?? 0));
}, [substitutions]);
```

**Step 2: Render timeline UI**

Replace the substitutions section (lines 586-631) with:

```tsx
{timelineEvents.length > 0 && (
  <div className="relative z-10 mt-4 pt-3 border-t border-white/[0.08]">
    <div className="text-[10px] font-black text-white/20 uppercase tracking-[0.2em] text-center mb-2.5">{ts('matchTimeline')}</div>
    <div className="relative pl-6">
      {/* Vertical timeline line */}
      <div className="absolute left-2.5 top-0 bottom-0 w-px bg-white/[0.08]" aria-hidden="true" />
      <div className="space-y-1.5">
        {(showAllTimeline ? timelineEvents : timelineEvents.slice(0, 6)).map((evt, i) => {
          const isHomeSub = evt.clubId === fixture.home_club_id;
          const accentColor = isHomeSub ? homeColor : awayColor;
          return (
            <div key={i} className="flex items-center gap-2 text-xs relative">
              {/* Timeline dot */}
              <div className="absolute -left-[14px] size-2 rounded-full border border-white/20 bg-[#0a0a0a]" style={{ borderColor: accentColor }} aria-hidden="true" />
              <span className="text-white/25 font-mono font-bold tabular-nums w-9 text-right flex-shrink-0">
                {evt.minute}&apos;{evt.extra ? `+${evt.extra}` : ''}
              </span>
              {evt.type === 'sub' && (
                <>
                  <span className="text-red-400/80 text-[10px]" aria-hidden="true">▼</span>
                  <span className="text-white/40 truncate">{evt.playerName}</span>
                  <span className="text-white/15" aria-hidden="true">→</span>
                  <span className="text-emerald-400/80 text-[10px]" aria-hidden="true">▲</span>
                  <span className="text-white/70 font-semibold truncate">{evt.playerName2}</span>
                </>
              )}
            </div>
          );
        })}
      </div>
      {/* Show more/less toggle */}
      {timelineEvents.length > 6 && (
        <button
          onClick={() => setShowAllTimeline(!showAllTimeline)}
          className="text-[10px] text-white/25 hover:text-white/40 font-bold mt-2 ml-4 transition-colors"
        >
          {showAllTimeline ? ts('showLess') : `${ts('showMore')} (${timelineEvents.length - 6})`}
        </button>
      )}
    </div>
  </div>
)}
```

Add state: `const [showAllTimeline, setShowAllTimeline] = useState(false);`

**Step 3: Build check**

Run: `npx next build 2>&1 | tail -5`

**Step 4: Commit**

```bash
git add src/components/fantasy/spieltag/FixtureDetailModal.tsx
git commit -m "feat(fixture-modal): match timeline replaces flat substitutions list"
```

---

### Task 7: Cleanup + Final Polish

**Files:**
- Modify: `src/components/fantasy/spieltag/FixtureDetailModal.tsx`
- Modify: `src/components/fantasy/SpieltagTab.tsx` (tab label rename: "Paarungen" → "Spiele" if requested)

**Step 1: Remove dead code**

- Delete old `TeamStatsList` function if not already removed
- Clean up unused imports
- Ensure all `tabular-nums` are on numeric values
- Verify all interactive elements have `aria-label`

**Step 2: Tab rename in SpieltagTab**

User asked: "spieltag → spiele". Check if this means renaming the tab in FantasyContent.tsx:
- In `messages/de.json`: Change `"tabFixtures": "Paarungen"` → `"tabFixtures": "Spiele"`
- In `messages/tr.json`: Change `"tabFixtures": "Eşleşmeler"` → `"tabFixtures": "Maçlar"`

**Step 3: Final build check**

Run: `npx next build 2>&1 | tail -5`
Expected: 0 errors, 0 warnings

**Step 4: Commit**

```bash
git add -A
git commit -m "chore(fixture-modal): cleanup dead code, rename Paarungen to Spiele"
```

---

### Task 8: Quality Gate

**Step 1: Build**
Run: `npx next build`
Must be green.

**Step 2: Visual verification**
Take Playwright screenshots of:
- Modal with finished fixture (GW29, ERZ 8:1 MAN)
- Ranking tab (desktop + mobile 375px)
- Formation tab (desktop + mobile 375px)
- Goal Ticker scrolling
Compare against design spec.

**Step 3: Accessibility audit**
Run: `/fixing-accessibility` on `FixtureDetailModal.tsx`

**Step 4: Baseline UI check**
Run: `/baseline-ui` on `FixtureDetailModal.tsx`

**Step 5: Motion performance**
Run: `/fixing-motion-performance` on `FixtureDetailModal.tsx`

**Step 6: Final commit if fixes needed**

---

## File Summary

| File | Action | Task |
|------|--------|------|
| `messages/de.json` | Modify | 1, 7 |
| `messages/tr.json` | Modify | 1, 7 |
| `src/lib/services/fixtures.ts` | Modify (append) | 2 |
| `src/components/fantasy/spieltag/FixtureDetailModal.tsx` | Major rewrite | 3, 4, 5, 6, 7 |
| `src/components/fantasy/SpieltagTab.tsx` | Minor (tab label) | 7 |

## Not in Scope
- "DPC kaufen" Button im Modal (Link zu Player Detail reicht)
- Live-Match-Updates (SPI-Budget)
- Preis-Impact nach Spiel
- Dritter Tab
- New CSS classes (reuse existing: `score-glow`, `card-gold-frame`, `mvp-crown-glow`)
