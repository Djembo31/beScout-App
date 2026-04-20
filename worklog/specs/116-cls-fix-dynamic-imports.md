# Slice 116 — CLS-Fix: loading Skeletons für dynamic imports

## Ziel (1 Satz)
CLS 0.14 (Slice 109) / 0.11 (Slice 107 /market) unter 0.1 bringen durch fixed-height `loading`-Skeletons für alle inline `dynamic()` Imports ohne Layout-Reservation.

## Root-Cause (aus Slice 107 Proof)

`worklog/proofs/107-trace-after.md`:
> /market CLS 0.11 nach Slice 107 (vorher 0.00). Wahrscheinlich Layout-Shift beim Mount von club_followers-Daten durch template.tsx-Persistenz (Slice 104) + reduzierten Re-Mounts.

Slice 109 führte auf /home CLS 0.14 ein.

**Core-Pattern:** `dynamic(() => import(...), { ssr: false })` ohne `loading`-Prop rendered während Lazy-Chunk-Load **nichts** (Width × 0), nach Mount füllt sich mit echtem Content → massiver Layout-Shift.

## Fix-Strategie

Für JEDEN `dynamic({ ssr: false })` Call:
- **Inline-Components** (in Page-Flow): `loading: () => <div className="h-X bg-surface-minimal animate-pulse" />` mit empirisch ermittelter Höhe
- **Modals** (position:fixed, kein Layout-Impact): `loading: () => null` explizit (verhindert default-spinner der auch shift verursacht)

## Betroffene Files (6 Pages)

| File | Components | Fix |
|------|-----------|-----|
| `src/app/(app)/page.tsx` (/home) | 7 dynamic imports | 5 Skeletons (NewUserTip h-20, OnboardingChecklist h-72, MissionHintList h-28, MostWatchedStrip h-44, FollowingFeedRail h-52) + 2 Modals loading:null |
| `src/features/market/components/MarketContent.tsx` | 3 dynamic imports | 1 Skeleton (MissionHintList h-28) + 2 Modals loading:null |
| `src/app/(app)/club/[slug]/ClubContent.tsx` | 1 dynamic import | SponsorBanner h-16 Skeleton |
| `src/features/manager/components/kader/KaderTab.tsx` | 1 dynamic import | SponsorBanner h-16 Skeleton |
| `src/app/(app)/community/page.tsx` | 6 dynamic imports | 2 Skeletons (SponsorBanner h-16, MissionHintList h-28) + 4 Modals loading:null |
| `src/app/(app)/player/[id]/PlayerContent.tsx` | 3 dynamic imports (Modals) | 3× loading:null |

## Skeleton-Höhen (empirisch)

| Component | Höhe | Logik |
|-----------|------|-------|
| NewUserTip | h-20 | ~80px — kompakte Tip-Card |
| SponsorBanner | h-16 | ~64px — Banner-Standard |
| MissionHintList | h-28 | ~112px — 1-2 Hints |
| OnboardingChecklist | h-72 | ~288px — 5-Step Liste |
| MostWatchedStrip | h-44 | ~176px — Horizontal Scroll mit Cards |
| FollowingFeedRail | h-52 | ~208px — Rail mit Club-Logos + Posts |

Fallback-Ansatz: `bg-surface-minimal` (deutlich weniger auffällig als bg-white/[0.02]) + `animate-pulse` (motion-reduce disabled).

## Acceptance Criteria

1. Alle 21 betroffenen `dynamic({ ssr: false })` Calls haben `loading:` Prop.
2. Inline-Components haben fixed-height (h-X), Modals haben `loading: () => null`.
3. tsc clean.
4. vitest 131/131 PASS.
5. Post-Deploy CLS < 0.1 auf /home (primäres Target).
6. Keine visuellen Regressions bei Real-Content-Mount.

## Proof-Plan

- `worklog/proofs/116-tsc-vitest.txt` — clean + 131 PASS
- `worklog/proofs/116-cls-trace-before.md` — aus Slice 107/109 Proofs referenziert (pre-fix Baseline)
- `worklog/proofs/116-cls-trace-after.md` — post-Deploy Chrome DevTools Trace (Session-Out, via Parallel-Terminal oder next session)

## Edge Cases

1. **Slow network**: Skeleton bleibt länger visible → längere Animation-Pulse. User-Erwartung "loading" → OK.
2. **Cached chunk**: `loading` rendert vermutlich 0-1 Frames → minimal visible, aber verhindert Shift.
3. **Height-Mismatch**: falls Component später höher/kleiner als Skeleton → Rest-Shift. Akzeptabel solang <0.05.
4. **Prefers-reduced-motion**: `motion-reduce:animate-none` disabled pulse → statisches Skeleton.

## Scope-Out

- PlayerDetailModal Sub-Tabs (StatsTab/FormTab/MarktTab) — im Modal-Scope, kein page-CLS
- ManagerContent PlayerDetailModal — modal
- Complex conditional renders (`{isNewUser && ...}`) — größerer Refactor, separater Slice
- Image-Dimension-Audit — separates Ticket
- Font-swap-audit — separates Ticket

## Messung Post-Deploy

Nach Deploy via Chrome DevTools MCP (wenn Browser frei):
```
1. new_page url=https://bescout.net, isolatedContext="cls-qa-after"
2. Login
3. emulate viewport=393x852, Slow 4G, cpuThrottle=4
4. navigate /home
5. performance_start_trace autoStop=true reload=true
6. performance_analyze_insight CLSCulprits
7. Target: CLS < 0.1, zero Layout-Shift-Culprits in Top-3
```

Alternativ: Lighthouse-Audit via `mcp__chrome-devtools__lighthouse_audit`.

Falls CLS >0.1 bleibt → Phase 2: Image-Dim-Audit + Conditional-Render-Refactor.
