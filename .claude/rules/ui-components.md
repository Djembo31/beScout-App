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
- Loading: Skeleton Screens (nicht Spinner). Ausnahme: Loader2 fuer Actions
- Empty: hilfreiche Message mit CTA
- Error: mit Retry-Option (`retryCount` Pattern)
- Loading Guard: `if (loading) return <Loading />` VOR `if (!data) return <Empty />`

## Accessibility
- Icon-only Buttons: IMMER `aria-label`
- Dekorative Icons: IMMER `aria-hidden="true"`
- Expandable Controls: `aria-expanded` + `aria-controls`
- Inputs/Selects: `aria-label` oder `id`+`htmlFor`
- Error Messages: `role="alert"`

## Dark UI Opacity (auf #0a0a0a)
- **Min 5% opacity** fuer sichtbare Surfaces
- **3-4% Differenz** zwischen Surface-Leveln
- **Inset Top-Light:** `inset 0 1px 0 rgba(255,255,255,0.06)` auf Cards
- **Glow Shadows: 20-35%** fuer Position-Glows (8% = unsichtbar)
- **WCAG AA Kontrast:** white/50+ fuer lesbaren Text, white/40 = FAIL
- **Gold Buttons:** `from-[#FFE44D] to-[#E6B800]` Gradient statt flat

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
→ Component Registry in `CLAUDE.md` (PlayerDisplay, PlayerPhoto, L5 Tokens, PlayerKPIs)

## Mobile Tab-Bars
- `flex-shrink-0` (NIEMALS `flex-1`) + `overflow-x-auto` + `scrollbar-hide`
- Max ~5 chars pro Tab-Label auf Mobile

## Animations (globals.css)
- `anim-modal` (scale 0.95→1, 0.2s) — Modals
- `anim-fade` (opacity 0→1, 0.2s) — Overlays, Badges
- `anim-slide-left` (translateX -100%→0, 0.25s) — Mobile Drawer
- `anim-dropdown` (translateY -4px→0, 0.15s) — Dropdowns, Tooltips
- Button: `active:scale-[0.97]` ist im Base-Style (automatisch)

## Full-Screen Picker (statt Bottom-Sheet fuer >10 Items)
```tsx
<div className="fixed inset-0 z-50 bg-[#0a0a0a] flex flex-col">
  <div className="sticky top-0 ...">Header + Search</div>
  <div className="flex-1 overflow-y-auto divide-y divide-white/[0.06]">
    {items.map(item => <button className="w-full min-h-[44px] ..." />)}
  </div>
</div>
```

## Pitch-Darstellung (Fantasy + Match)
- Gruener Gradient + SVG Feldlinien + Sponsor-Banner oben/unten
- Position-farbige Spieler-Kreise mit Score-Badges
- Shared Style zwischen EventDetailModal (Builder) und FixtureDetailModal (View)
