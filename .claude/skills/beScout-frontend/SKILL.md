---
name: beScout-frontend
description: UI components, pages, hooks — design tokens, component registry, CSS patterns, i18n
---

# beScout-frontend Skill

UI implementation for BeScout. Dark Mode only, Mobile-First (360px), Next.js 14 App Router.
Every page: `'use client'`. Every component: Service Layer pattern. Every string: `t()`.

---

## Design Tokens (exakte Werte)

| Token | Wert | Usage |
|-------|------|-------|
| Background | `#0a0a0a` | Body, alle Screens |
| Gold | `var(--gold, #FFD700)` | `text-gold`, `bg-gold` |
| Button Gradient | `from-[#FFE44D] to-[#E6B800]` | Primary Buttons |
| Card Surface | `bg-white/[0.02]` | Card-Hintergrund |
| Card Border | `border border-white/10 rounded-2xl` | Card-Rahmen |
| Subtle Border | `border-white/[0.06]` | Divider, Sections |
| Inset Light | `inset 0 1px 0 rgba(255,255,255,0.06)` | Card box-shadow |
| Text Readable | `white/50+` | WCAG AA auf #0a0a0a (white/40 = FAIL) |
| Headlines | `font-black` (900) | Alle Ueberschriften |
| Numbers | `font-mono tabular-nums` | Preise, Stats, Counts |
| Positions | GK=emerald, DEF=amber, MID=sky, ATT=rose | Spieler-Positionen |

**Dark UI Opacity Rules:**
- Min 5% opacity fuer sichtbare Surfaces
- 3-4% Differenz zwischen Surface-Leveln
- Glow Shadows 20-35% fuer Position-Glows (8% = unsichtbar)

---

## Component Registry

IMMER pruefen ob ein Component existiert BEVOR du etwas Neues baust.

| Component | Import | Props/Zweck |
|-----------|--------|-------------|
| PlayerDisplay | `@/components/player/PlayerRow` | compact/card Modes |
| PlayerPhoto | `@/components/player/index` | `first`, `last`, `pos` (NICHT firstName!) |
| L5 Tokens | `@/components/player/index` | `getL5Color()`, `getL5Hex()`, `getL5Bg()` |
| PlayerKPIs | `@/components/player/index` | 8 Kontexte: portfolio/market/lineup/result/picker/ipo/search/default |
| Modal | `@/components/ui/index` | IMMER `open={true/false}` prop. BottomSheet auf Mobile |
| Card, Button | `@/components/ui/index` | Button hat `active:scale-[0.97]` |
| TabBar | `@/components/ui/TabBar` | Tabs + TabPanel |
| Loader2 | `lucide-react` | EINZIGER Spinner (nie custom divs) |
| EventDetailModal | `@/components/fantasy/EventDetailModal` | Fantasy Lineup Builder |
| ProfileView | `@/components/profile/ProfileView` | Shared Profil (4 Tabs) |
| SideNav/TopBar | `@/components/layout/` | Navigation + Search + Notifications |

**Import Map:**

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

---

## CSS Traps (KRITISCH)

### flex-1 auf Tabs
`flex-1` auf Tab-Buttons verursacht overflow auf iPhone.
**Fix:** `flex-shrink-0` + `overflow-x-auto` + `scrollbar-hide`.
Max ~5 chars pro Tab-Label auf Mobile.

### Dynamic Tailwind Classes
Tailwind JIT scannt NUR statische Strings. Dynamisch generierte Classes werden NICHT kompiliert.
```tsx
// FALSCH — wird nicht kompiliert:
<div className={`border-[${hexColor}]/40`} />

// RICHTIG — style-Attribut fuer dynamische Werte:
<div className="border-2" style={{ borderColor: hexColor }} />
```

### ::after/::before mit position: absolute
Elternelement MUSS `relative` haben. `overflow: hidden` allein reicht NICHT als Containing Block.

### Weitere CSS-Regeln
- `cn()` fuer classNames, NICHT Template Literals
- `size-*` statt `w-* h-*` bei quadratischen Elementen
- `text-balance` auf Headings, `text-pretty` auf Paragraphs
- `tabular-nums` auf alle numerischen Daten
- `transition-colors` statt `transition-all`
- `will-change` NUR temporaer, `backdrop-blur` max `sm` (4px)
- `100dvh` / `min-h-dvh` statt `100vh` / `min-h-screen`

---

## React Patterns (PFLICHT)

### 'use client'
Auf ALLEN Pages und Client-Components. Keine Ausnahme.

### Hooks VOR early returns
React Rules of Hooks: ALLE Hooks muessen VOR dem ersten `return` stehen.
```tsx
// RICHTIG:
const { data, isLoading } = useQuery(...)
const t = useTranslations('ns')
if (isLoading) return <Loading />
if (!data) return <Empty />

// FALSCH — Hook nach return:
if (isLoading) return <Loading />
const t = useTranslations('ns')  // React Rules Verletzung!
```

### Loading Guard VOR Empty Guard
```tsx
if (isLoading) return <Skeleton />     // ERST Loading
if (!data || data.length === 0) return <Empty />  // DANN Empty
return <Content data={data} />          // DANN Content
```

### Array.from statt Spread
```tsx
// FALSCH — strict TS Fehler:
[...new Set(items)]

// RICHTIG:
Array.from(new Set(items))
Array.from(map.keys())
```

### Null-Safe Closures
`const uid = user.id` snapshotten VOR async Aufrufen.

### Cancellation Token in useEffect
```tsx
useEffect(() => {
  let cancelled = false
  fetchData().then(d => { if (!cancelled) setData(d) })
  return () => { cancelled = true }
}, [dep])
```

### Weitere React-Regeln
- `Modal` braucht IMMER `open={true/false}` prop
- `PlayerPhoto` Props: `first`/`last`/`pos` (NICHT firstName/lastName)
- NIEMALS leere `.catch(() => {})` — mindestens `console.error`
- `floor_price ?? 0` — IMMER Null-Guard auf optionale Zahlen
- Barrel-Exports bereinigen wenn Dateien geloescht werden
- Component -> Service -> Supabase (NIEMALS Supabase direkt in Components)
- Geld IMMER als BIGINT cents (1,000,000 = 10,000 $SCOUT)
- `fmtScout()` fuer Zahlen-Formatierung
- React Query: `staleTime` min 30s, `invalidateQueries` nach Writes, `qk.*` Factory Keys
- `<button>` NICHT in `<Link>` wrappen (invalid HTML)

---

## Mobile-First (360px Baseline)

- Touch Targets: min 44x44px (`min-h-[44px]`)
- Font-Size nie unter 16px (iOS Auto-Zoom)
- Bottom Nav: `padding-bottom: env(safe-area-inset-bottom)`
- Kein horizontaler Overflow
- Modals auf Mobile -> Bottom Sheets
- `inputMode="numeric"` bei Zahlenfeldern
- Full-Screen Picker statt Bottom-Sheet fuer Listen >10 Items

---

## States (IMMER alle implementieren)

| State | Pattern |
|-------|---------|
| Loading | Skeleton Screens (nicht Spinner). Loader2 nur fuer Actions |
| Empty | Hilfreiche Message mit CTA |
| Error | Mit Retry-Option (`retryCount` Pattern) |
| Disabled | Visuell + funktional |
| Hover/Active/Focus | Immer definiert |

---

## Accessibility

- Icon-only Buttons: IMMER `aria-label`
- Dekorative Icons: IMMER `aria-hidden="true"`
- Expandable Controls: `aria-expanded` + `aria-controls`
- Inputs/Selects: `aria-label` oder `id`+`htmlFor`
- Error Messages: `role="alert"`
- Spieler-Anzeigen MUESSEN Link zu `/player/[id]` haben (Ausnahme: Picker-UIs)

---

## Animations (globals.css)

| Name | Effekt | Dauer | Verwendung |
|------|--------|-------|-----------|
| `anim-modal` | scale 0.95->1 | 0.2s | Modals |
| `anim-fade` | opacity 0->1 | 0.2s | Overlays, Badges |
| `anim-slide-left` | translateX -100%->0 | 0.25s | Mobile Drawer |
| `anim-dropdown` | translateY -4px->0 | 0.15s | Dropdowns, Tooltips |

Button `active:scale-[0.97]` ist im Base-Style (automatisch).

---

## i18n

- Library: `next-intl`, Hook: `useTranslations('namespace')`
- Cookie: `bescout-locale`
- Messages: `messages/{locale}.json` (DE + TR)
- ALLE user-sichtbaren Strings MUESSEN `t()` nutzen
- Deutsche UI-Labels, englische Code-Variablen/Kommentare
- Namespace in JSON pruefen mit `node -e "require('./messages/de.json').ns.key"` (grep Zeilennummern koennen in 4000-Zeilen-Dateien irrefuehren)

---

## Learnings

-> Lies `LEARNINGS.md` VOR Task-Start
-> Schreibe neue Erkenntnisse als DRAFT in `memory/learnings/drafts/`
