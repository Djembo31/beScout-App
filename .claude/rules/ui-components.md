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

## Tooltip-Pattern (Slice 225 — codifiziert nach Phase-A-Re-Audit 2026-04-27)

**Entscheidungs-Tree:**

```
Tooltip benoetigt?
├─ Education / Edutorial (User muss verstehen WAS/WARUM)?
│   → Mobile-Pflicht (393px-Touch hat KEIN Hover)
│   → Discoverability (User muss wissen Tooltip existiert)
│   → A11y Screen-Reader-Konform
│   ⇒ InfoTooltip (`@/components/ui` → `<InfoTooltip text="..." />`)
│
└─ Trivialer Hint (Icon-Disambiguierung, collapsed-NavItem-Name)?
    → Desktop-Hover reicht
    → Discoverability nicht kritisch
    → A11y via aria-label parallel
    ⇒ HTML-native `title="..."`
```

**InfoTooltip-Eigenschaften** (`src/components/ui/index.tsx:184-216`):
- Click-to-toggle (Mobile + Desktop)
- `?`-Icon-Button mit aria-label + aria-expanded (A11y)
- Click-outside-close via mousedown-Listener
- `anim-dropdown` Animation
- Popover-Content `w-[min(13rem,calc(100vw-2rem))]` viewport-clipped (Mobile-safe)

**Pattern-Beispiele:**

```tsx
// Education-Tooltip (Mobile-pflicht, Discoverability) — Slice 225 Migration
<span className="inline-flex items-center gap-1">
  <span className="text-white/40 font-semibold">{t('communityLabel')}:</span>
  <InfoTooltip text={t('sentimentLabel')} />
</span>

// Counter mit aria-label statt title= (kein visueller Tooltip noetig
// weil InfoTooltip daneben Education liefert)
<span aria-label={t('sentimentBullish', { count })}>
  <TrendingUp aria-hidden="true" /> {bullish}
</span>

// Trivialer Hint (Icon-only Button, Desktop-Hover-OK)
<button title={t('expandRow')} aria-label={t('expandRow')}>
  <ChevronDown />
</button>
```

**Anti-Pattern (verboten ab Slice 225 fuer Education-Tooltips):**
- `<div title={t('floorPriceTooltip')}>{t('floorPrice')}</div>` — Mobile-User sieht das **nie**
- `<span title={t('sentimentBullish')}>` — wenn Tooltip Education ist, Mobile-User sieht es **nie**

**Migration-History (Pattern-Drift behoben):**
- Slice 216 K-RR-1 (`CommunityValuation` Floor-Preis) — Slice 225 migriert
- Slice 222 K-RR-2 (`BuyConfirmModal` Sentiment-Block) — Slice 225 migriert

**Audit-CI-Detector (post-Beta empfohlen):**
```bash
# Education-Tooltip-Drift: title= mit Education-i18n-Key
grep -rnE 'title=\{t\([^)]*Tooltip|title=\{t\([^)]*Label' src/components/ src/features/ \
  | grep -v 'collapsed\|expand\|aria-label'
```

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
