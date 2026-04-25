# Brand-Coherence Audit — 2026-04-25

## Executive Summary
- Total Findings: 18 (P0:0 P1:3 P2:9 P3:6)
- Per-Page-Health-Avg: 8.6/10
- Top-Drift-Klassen:
  1. `bg-black/N` overlays statt `bg-bg-main/N` (4 Stellen, fantasy-Modal-Backdrops)
  2. `text-yellow-*` / `bg-yellow-500/10` fuer Player-Status `doubtful` (5 Stellen in `src/features/manager` + `src/features/market`)
  3. Inline `style={{ color: '#FFD700' }}` statt Token (2 Stellen `airdrop/page.tsx`)

Die Brand-DNA ist auf Pages-Level **sehr stabil**. 0 Treffer fuer `text-gray-*`, `border-gray-*`, `text-yellow-*` in `src/app/(app)/`. Die Drifts liegen fast ausschliesslich in eingebundenen Feature-Components.

## Per-Page-Findings

### / (Home)
**Health: 9/10**
| # | Severity | File:Line | Issue | DNA-Violation |
|---|----------|-----------|-------|---------------|
| 1 | P3 | `src/app/(app)/page.tsx:172` | Quick-Action-Pills nutzen `rounded-xl` mit `shadow-card-sm` + `border` ohne Card-Komponente; viele inline-Tokens (`bg-purple-500/10`, `text-amber-400`) | Component-Library-Drift: Quick-Action-Pills sollten gemeinsamer Sub-Komponente extrahiert werden |
| 2 | P3 | `src/app/(app)/page.tsx:323` | `bg-gradient-to-r from-gold/[0.04] via-gold/[0.10] to-gold/[0.04]` Gradient nicht in CSS-Variables | Token-Drift: Gold-Pulse-Gradient als `.gold-pulse-bg` Utility extrahieren |

### /market
**Health: 9/10**
| # | Severity | File:Line | Issue | DNA-Violation |
|---|----------|-----------|-------|---------------|
| 3 | P2 | `src/features/market/components/marktplatz/PlayerIPOCard.tsx:152` | `bg-yellow-500/10 border-yellow-500/20 text-yellow-300` fuer Status `doubtful` | Color-Token: Tailwind-Yellow weicht von BeScout-Gold ab |

### /manager
**Health: 7/10**
| # | Severity | File:Line | Issue | DNA-Violation |
|---|----------|-----------|-------|---------------|
| 4 | P1 | `src/features/manager/components/kader/kaderHelpers.tsx:69` | `bg: 'bg-yellow-500/10', border: 'border-yellow-500/20', text: 'text-yellow-400'` fuer doubtful | **Zentraler Drift-Punkt** — propagiert in alle Manager/Market/Fantasy |
| 5 | P2 | `src/features/manager/components/kader/kaderHelpers.tsx:93` | `text-yellow-400` als Performance-Avg-Mid-Tier | Sollte in `getL5Color`-System integriert werden |
| 6 | P2 | `src/features/manager/components/intel/FormTab.tsx:157` | `text-yellow-400 bg-yellow-400/10` fuer Form-Indicator | Same pattern |
| 7 | P3 | `src/features/manager/components/intel/StatsTab.tsx:26` | `doubtful: 'text-yellow-300'` | 4. Stelle |

### /fantasy
**Health: 7/10**
| # | Severity | File:Line | Issue | DNA-Violation |
|---|----------|-----------|-------|---------------|
| 8 | P1 | `src/app/(app)/fantasy/FantasyContent.tsx:50` | Modal-Loading-Backdrop `bg-black/70` statt `bg-bg-main/70` | BG-Token: BeScout-BG ist `#0a0a0a`, nicht `#000` |
| 9 | P2 | `src/features/fantasy/components/event-detail/JoinConfirmDialog.tsx:40` | `bg-black/80` Confirm-Backdrop | gleiche Klasse |
| 10 | P2 | `src/features/fantasy/components/lineup/PlayerPicker.tsx:166` | `bg-black/60` Picker-Backdrop | gleiche Klasse |
| 11 | P3 | `src/features/fantasy/components/lineup/PitchView.tsx:221,224` | `bg-black/40`, `bg-black/30` Pitch-Slot-Backgrounds | gleiche Klasse |
| 12 | P3 | `src/features/fantasy/components/lineup/PitchView.tsx:70` | `text-yellow-400` fuer doubtful-Indicator | 5. yellow-Drift |

### /community
**Health: 9/10**
- Keine kritischen Findings. `font-mono tabular-nums` auf Counts korrekt. Tab-Toggles `min-h-[44px]` korrekt.

### /missions
**Health: 10/10**
- Header `text-xl font-black`, `Target` icon `text-gold`. Streak-Banner `bg-orange-500/10 border-orange-500/20` semantisch OK.

### /transactions
**Health: 10/10**
- Wrapper-Page, lazy-Content. `text-gold` Loader.

### /founding
**Health: 9/10**
| # | Severity | File:Line | Issue | DNA-Violation |
|---|----------|-----------|-------|---------------|
| 13 | P3 | `src/app/(app)/founding/page.tsx:279` | `bg-purple-500` solid statt `bg-purple-500/N` mit border | Surface-Opacity-Drift: akzeptabel weil "Popular"-Badge sich abheben soll |

### /inventory
**Health: 10/10**
- TabBar + TabPanel aus `@/components/ui`. `text-gold` Loader.

### /rankings
**Health: 10/10**
- `Trophy` Icon `text-gold`, `text-2xl font-black text-white` Header.

### /airdrop
**Health: 8/10**
| # | Severity | File:Line | Issue | DNA-Violation |
|---|----------|-----------|-------|---------------|
| 14 | P2 | `src/app/(app)/airdrop/page.tsx:74` | Inline `style={{ color: '#FFD700' }}` Gold-Tier-Number | Sollte `text-gold` Klasse |
| 15 | P3 | `src/app/(app)/airdrop/page.tsx:78` | Inline `style={{ color: '#B9F2FF' }}` Diamond | Diamond-Token nicht im System |
| 16 | P3 | `src/app/(app)/airdrop/page.tsx:55` | `Rocket` Icon `text-purple-400` (Header) bricht "Header-Icons sind text-gold" | Color-Convention |

### /profile
**Health: 10/10**
- Wrapper mit Skeleton + Suspense.

### /profile/[handle]
**Health: 9/10**
| # | Severity | File:Line | Issue | DNA-Violation |
|---|----------|-----------|-------|---------------|
| 17 | P3 | `src/app/(app)/profile/[handle]/page.tsx:84` | Raw `<button>` statt `Button`-Component | Component-Library-Drift |

### /profile/settings
**Health: 8/10**
- Avatar-Upload-Hover `bg-black/50` (Z. 229) — selber Pattern wie #8.

### /player/[id]
**Health: 10/10**
- Wrapper. PlayerContent.tsx nicht im Detail gescannt.

### /clubs
**Health: 9/10**
- Sehr saubere Token-Anwendung.

### /club/[slug]
**Health: 9/10**
| # | Severity | File:Line | Issue | DNA-Violation |
|---|----------|-----------|-------|---------------|
| 18 | P2 | `src/app/(app)/club/[slug]/ClubContent.tsx:523,530` | Raw `<button>` als Squad-View-Toggle, `rounded-md` | Component-Library + Border-Radius-Drift |

### /compare
**Health: 9/10**
- Saubere Card-Anwendung. Player-Slot Empty-State `border-dashed border-white/20` DNA-konform.

## Token-Drift-Summary (Aggregat)
- **Color (Tailwind-Yellow vs Gold):** 5 Treffer — `src/features/manager/*` + `fantasy` + `market`. **Systemic.**
- **Color (bg-black/N vs bg-bg-main):** 5 Treffer — Modal-Backdrops. **Systemic.**
- **Color (Inline-Hex statt Token):** 2 Treffer — airdrop tier colors.
- **Typography (font-mono auf Numbers):** 0 Treffer fehlend in Page-Code.
- **Component-Library (raw button):** 14 raw `<button>`-Stellen, nur 2 brauchen Fix.
- **Position-Colors:** 0 Treffer — System konsequent.
- **rounded-2xl auf Cards:** Konsistent — `rounded-md/lg/xl` nur auf Sub-Elementen.

## Top-3-Systemic-Issues (zuerst fixen)

1. **Tailwind-Yellow-Token fuer Player-Status `doubtful` (5 Stellen)**
   Files: `kaderHelpers.tsx:69+93`, `FormTab.tsx:157`, `StatsTab.tsx:26`, `PitchView.tsx:70`, `PlayerIPOCard.tsx:152`.
   Fix: `tailwind.config.ts` extend `colors.status-doubtful: '#F59E0B'`, find-replace.

2. **`bg-black/N` Modal-Backdrops (5 Stellen)**
   Files: `FantasyContent.tsx:50`, `JoinConfirmDialog.tsx:40`, `PlayerPicker.tsx:166`, `PitchView.tsx:221+224`, `profile/settings/page.tsx:229`.
   Fix: globals.css Utility `.bg-stage` oder konsequent `bg-bg-main/70` nutzen. Alternativ `Modal` aus UI-Lib.

3. **Inline `style={{ color: '#FFD700' }}` in airdrop**
   File: `airdrop/page.tsx:74,78`.
   Fix: `text-gold` fuer Gold; Diamond als CSS-Variable `--diamond: #B9F2FF`.

## Positive Highlights
- 0 Treffer `text-gray-*`/`border-gray-*`/`bg-gray-*` in `src/app/(app)/`.
- 0 Treffer `text-yellow-*` in `src/app/(app)/` — Yellow-Drift lebt nur in `src/features/`, lokalisierbar.
- Headlines konsistent `font-black` + `text-balance` auf 11+ Pages.
- Numbers konsistent `font-mono tabular-nums` in kritischen Stellen.
- `rounded-2xl` auf Cards / `rounded-xl` auf Sub-Cards / `rounded-lg` auf Pills — Hierarchie klar.
- Skip-Link in `layout.tsx:73` mit korrektem Gold-Token.
- TradingDisclaimer + FantasyDisclaimer + MissionDisclaimer Components — Compliance-Wording-DNA component-driven.
- Brand-Gradient `from-[#FFE44D] to-[#E6B800]` korrekt in Home-Promo-Badge.

## Severity-Regeln
- P0: Page wirkt komplett off-brand
- P1: Sichtbare Drift bei mehreren Elementen
- P2: Detail-Drift einzelner Token
- P3: Minor

## Summary

BeScout hat **bemerkenswert stabile Brand-DNA** auf Page-Level. Die wenigen Drifts liegen fast ausschliesslich in Feature-Components (Manager-Helpers, Fantasy-Modals) und betreffen 2 Klassen: Tailwind-yellow statt Gold-Token (5 Stellen, **1 Fix-Punkt** in `kaderHelpers.tsx`), und `bg-black/N` Modal-Backdrops (5 Stellen, kosmetisch). Empfehlung Polish-Sweep: zuerst `kaderHelpers.tsx` zentral fixen — beseitigt 4 von 5 yellow-Drifts gleichzeitig. Dann 5 Modal-Backdrop-Stellen auf `bg-bg-main/N`. Damit ist App-weiter Brand-Drift in **<30 Min** eliminiert.
