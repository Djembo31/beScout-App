# BeScout — Quick Reference

B2B2C Fan-Engagement-Plattform. Clubs verkaufen Scout Cards, starten Events/Votes,
verteilen $SCOUT-Credits. Pilot: Sakaryaspor (TFF 1. Lig).

## Stack
Next.js 14 (App Router) | TypeScript strict | Tailwind (Dark Mode only) |
Supabase (PostgreSQL + Auth + Realtime) | TanStack React Query v5 | Zustand v5 |
next-intl (Cookie bescout-locale) | lucide-react

## Design Tokens
| Token | Wert | Usage |
|-------|------|-------|
| Background | `#0a0a0a` | Body, alle Screens |
| Gold | `var(--gold, #FFD700)` | `text-gold`, `bg-gold` |
| Button Gradient | `from-[#FFE44D] to-[#E6B800]` | Primary Buttons |
| Card Surface | `bg-white/[0.02]` | Card-Hintergrund |
| Card Border | `border border-white/10 rounded-2xl` | Card-Rahmen |
| Subtle Border | `border-white/[0.06]` | Divider, Sections |
| Inset Light | `inset 0 1px 0 rgba(255,255,255,0.06)` | Card box-shadow |
| Text Readable | `white/50+` | WCAG AA auf #0a0a0a |
| Headlines | `font-black` (900) | Alle Ueberschriften |
| Numbers | `font-mono tabular-nums` | Preise, Stats, Counts |
| Positions | GK=emerald, DEF=amber, MID=sky, ATT=rose | Spieler-Positionen |

## Component Registry (pruefen bevor neu gebaut)
| Component | Import | Props/Zweck |
|-----------|--------|-------------|
| PlayerDisplay | `player/PlayerRow.tsx` | compact/card Modes |
| PlayerPhoto | `player/index.tsx` | `first`, `last`, `pos` (NICHT firstName) |
| L5 Tokens | `player/index.tsx` | `getL5Color()`, `getL5Hex()`, `getL5Bg()` |
| PlayerKPIs | `player/index.tsx` | 8 Kontexte: portfolio/market/lineup/result/picker/ipo/search/default |
| Modal | `ui/index.tsx` | IMMER `open={true/false}` prop. BottomSheet mobile |
| Card, Button | `ui/index.tsx` | Button hat `active:scale-[0.97]` |
| TabBar | `ui/TabBar.tsx` | Tabs + TabPanel |
| Loader2 | `lucide-react` | EINZIGER Spinner (nie custom divs) |
| EventDetailModal | `fantasy/EventDetailModal.tsx` | Fantasy Lineup Builder |
| ProfileView | `profile/ProfileView.tsx` | Shared Profil (4 Tabs) |
| SideNav/TopBar | `layout/` | Navigation + Search + Notifications |

## Import Map
| Was | Import |
|-----|--------|
| Types | `@/types` |
| Services | `@/lib/services/[name]` |
| UI Components | `@/components/ui/index` (cn, Card, Button, Modal) |
| Player Components | `@/components/player/index` (PlayerPhoto, getL5Color) |
| Query Keys | `@/lib/queryKeys` (qk.*) |
| Supabase Client | `@/lib/supabaseClient` |
| i18n | `next-intl` (useTranslations) |
| Icons | `lucide-react` |

## Code Conventions
- `'use client'` alle Pages
- Types in `types/index.ts`, UI in `ui/index.tsx`
- `cn()` classNames, `fmtScout()` Zahlen
- Component -> Service -> Supabase (NIE direkt)
- DE Labels, EN Code. i18n: `t()` mit `messages/{locale}.json`
- Hooks VOR early returns. Loading Guard VOR Empty Guard.
- `Array.from(new Set())` statt `[...new Set()]`
- Geld IMMER als BIGINT cents (1,000,000 = 10,000 $SCOUT)

## Top 10 DONT
1. `flex-1` auf Tabs -> iPhone overflow -> `flex-shrink-0` nutzen
2. `[...new Set()]` -> strict TS Fehler -> `Array.from(new Set())`
3. Supabase direkt in Components -> Service Layer nutzen
4. Hooks nach early return -> React Rules Verletzung
5. Leere `.catch(() => {})` -> mindestens `console.error`
6. Dynamic Tailwind `border-[${var}]/40` -> `style={{ borderColor: hex }}`
7. Modal ohne `open` prop -> IMMER `open={true/false}`
8. `::TEXT` auf UUID beim INSERT -> Column-Type respektieren
9. `staleTime: 0` -> `invalidateQueries` nach Writes nutzen
10. Raw query keys `['foo']` -> IMMER `qk.*` Factory nutzen

## Business (Compliance-Critical)
- $SCOUT = Platform Credits (NIEMALS: Investment, ROI, Profit, Ownership)
- Scout Card = Digitale Spielerkarte (kein Eigentum, keine Anlage)
- Code-intern: "dpc" in Variablen/DB-Columns bleibt (nur UI umbenannt)
- Fee-Split Trading: 6% (Platform 3.5% + PBT 1.5% + Club 1%)
- Fee-Split IPO: 85% Club, 10% Platform, 5% PBT

## Rules (auto-loaded)
`common-errors.md` (DB columns, constraints) | `business.md` (compliance) | `workflow.md` (how I work)
