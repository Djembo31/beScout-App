---
paths:
  - "src/components/**"
  - "src/app/**/*.tsx"
---

## Mobile-First
- Touch Targets: min 44x44px (`min-h-[44px]`)
- Font-Size nie unter 16px (iOS Auto-Zoom)
- `100dvh` / `min-h-dvh` statt `100vh` / `min-h-screen`
- Bottom Nav: `padding-bottom: env(safe-area-inset-bottom)`
- Kein horizontaler Overflow
- Modals auf Mobile → Bottom Sheets
- `inputMode="numeric"` bei Zahlenfeldern

## States (IMMER alle implementieren)
- Hover, Active, Focus, Disabled
- Loading: Skeleton Screens (nicht Spinner)
- Empty: hilfreiche Message
- Error: mit Retry-Option

## Accessibility
- Icon-only Buttons: IMMER `aria-label`
- Dekorative Icons: IMMER `aria-hidden="true"`
- Expandable Controls: `aria-expanded` + `aria-controls`
- Inputs/Selects: `aria-label` oder `id`+`htmlFor`
- Error Messages: `role="alert"`

## Anti-Slop
- Keine zufaelligen Gradients, keine uebertriebenen Border-Radius
- Spacing: bestehende Patterns uebernehmen, nicht neu erfinden
- `cn()` fuer classNames, NICHT Template Literals
- `size-*` statt `w-* h-*` bei quadratischen Elementen
- `text-balance` auf Headings, `text-pretty` auf Paragraphs
- `tabular-nums` auf alle numerischen Daten
- `transition-colors` statt `transition-all`
- `will-change` NUR temporaer, `backdrop-blur` max `sm` (4px)

## Spieler-Darstellung
- IMMER `PlayerDisplay` aus `@/components/player/PlayerRow` (compact/card)
- IMMER `PlayerPhoto` aus `player/index.tsx` — NIEMALS inline img+fallback
- L5-Tokens: `getL5Color()`/`getL5Hex()`/`getL5Bg()` aus `player/index.tsx`

## Mobile Tab-Bars
- `flex-shrink-0` (NIEMALS `flex-1`) + `overflow-x-auto` + `scrollbar-hide`
