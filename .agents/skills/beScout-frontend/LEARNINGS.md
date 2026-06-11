# Learnings — beScout-frontend

> Kompiliert aus 91 Sessions. Jeder Eintrag ist ein echter Bug der uns Zeit gekostet hat.

## CRITICAL — Mobile & Layout

### flex-1 iPhone Overflow (3x aufgetreten)
`flex-1` auf Tab-Buttons → iPhone Safari rendert Tabs breiter als Viewport → horizontaler Scroll.
```tsx
// FALSCH:
<button className="flex-1">Tab</button>

// RICHTIG:
<button className="flex-shrink-0">Tab</button>
```
**Regel:** NIEMALS `flex-1` auf horizontal scrollbare Elemente. IMMER auf 393px testen.

### Dynamic Tailwind Classes
```tsx
// FALSCH: Tailwind JIT scannt NUR statische Strings — diese Klasse existiert nicht im Build
<div className={`border-[${color}]/40`}>

// RICHTIG: style-Attribut fuer dynamische Werte
<div className="border-2" style={{ borderColor: hexColor }}>
```

### Containing Block fuer Pseudo-Elements
`::after`/`::before` mit `position: absolute` → Eltern MUSS `relative` haben.
`overflow: hidden` allein reicht NICHT als Containing Block.

## HIGH — React Patterns

### Hooks vor Early Returns (IMMER)
```tsx
// FALSCH: React Rules Verletzung
if (!data) return <Skeleton />;
const theme = useTheme(); // CRASH — conditional Hook

// RICHTIG: Alle Hooks ZUERST
const theme = useTheme();
const t = useTranslations();
if (!data) return <Skeleton />;
```

### Loading Guard VOR Empty Guard
```tsx
// FALSCH: Zeigt "Keine Daten" waehrend Loading
if (data?.length === 0) return <Empty />;
if (isLoading) return <Skeleton />;

// RICHTIG: Loading zuerst pruefen
if (isLoading) return <Skeleton />;
if (!data?.length) return <Empty />;
```

### Modal open-Prop
Modal-Component braucht IMMER `open={true/false}` Prop. Ohne → permanent sichtbar oder unsichtbar.

### Cancellation Token in useEffect
```tsx
useEffect(() => {
  let cancelled = false;
  fetchData().then(d => { if (!cancelled) setData(d); });
  return () => { cancelled = true; };
}, [id]);
```

## MEDIUM — Components

### PlayerPhoto Props
Props heissen `first`, `last`, `pos` — NICHT `firstName`, `lastName`, `position`.

### Loader2 = einziger Spinner
`import { Loader2 } from 'lucide-react'` — KEINE custom div-Spinner.

### Component Registry ZUERST pruefen
Bevor du eine neue Component baust: CLAUDE.md Component Registry lesen.
Card, Button, Modal, TabBar, PlayerDisplay, PlayerPhoto, PlayerKPIs, EventDetailModal, ProfileView, SideNav, TopBar.

### Barrel-Exports bereinigen
Datei geloescht → Barrel-Export (`index.ts/tsx`) aktualisieren. Sonst Build-Fehler.

## i18n

### TR-Strings: Anil ZEIGEN vor Commit
Tuerkische Uebersetzungen die ich schreibe sind oft falsch. Neue TR-Strings explizit Anil zeigen.

### Keys in DE + TR gleichzeitig
Neuer i18n Key → IMMER in `messages/de.json` UND `messages/tr.json`. Vergessene Sprache → Runtime-Fehler.

### Null-Guard auf Zahlen
`floor_price`, `entry.rank`, `balance`, `quantity` — alles nullable. IMMER `?? 0` oder `fmtScout(val ?? 0)`.

## CSS

### Dark Mode Only
Background `#0a0a0a`. Text `white/50+` fuer WCAG AA. Card `bg-white/[0.02] border border-white/10 rounded-2xl`. Gold `var(--gold, #FFD700)`. Kein Light Mode.

### Positions-Farben
GK = emerald, DEF = amber, MID = sky, ATT = rose. Nutze `getL5Color(pos)`.

### Numbers
Preise, Stats, Counts: `font-mono tabular-nums`. IMMER.
