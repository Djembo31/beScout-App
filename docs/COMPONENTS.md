# BeScout - Component Library

> Alle wiederverwendbaren Components mit Verwendung.
> Ziel: Kein Component wird dupliziert. Alles ist shared.

---

## Player Components (`@/components/player/`)

### PlayerDisplay ⭐ Haupt-Component
**Datei:** `PlayerRow.tsx`
**Import:** `import { PlayerDisplay } from '@/components/player/PlayerRow'`

```tsx
// Compact: Listen, Rankings, Sidebar
<PlayerDisplay player={player} variant="compact" />
<PlayerDisplay player={player} variant="compact" rank={1} showSparkline />

// Standard: Trending, Übersichten (Card mit Stats-Bar + DPC Float)
<PlayerDisplay player={player} variant="standard" />
<PlayerDisplay player={player} variant="standard" showActions={false} />

// Detailed: Transferliste (+ PBT, Contract, Success Fee, Burn)
<PlayerDisplay player={player} variant="detailed" />
<PlayerDisplay
  player={player}
  variant="detailed"
  isWatchlisted={true}
  onWatch={() => toggleWatch(player.id)}
/>
```

| Prop | Typ | Default | Beschreibung |
|------|-----|---------|-------------|
| `player` | `Player` | required | Spieler-Objekt |
| `variant` | `compact \| standard \| detailed` | `standard` | Darstellungsvariante |
| `isWatchlisted` | `boolean` | - | Watchlist-Status |
| `onWatch` | `() => void` | - | Toggle-Handler (zeigt Star-Button) |
| `rank` | `number` | - | Rang-Nummer (nur compact) |
| `showSparkline` | `boolean` | `false` | Sparkline in compact |
| `showActions` | `boolean` | `true` | Buttons in standard/detailed |
| `className` | `string` | `''` | Zusätzliche CSS-Klassen |

### PlayerHoldingRow
**Datei:** `PlayerRow.tsx`
**Verwendung:** Portfolio-Tabelle (`<tr>` Element)

```tsx
<table>
  <tbody>
    <PlayerHoldingRow holding={holdingData} />
  </tbody>
</table>
```

### TrikotBadge
**Datei:** `PlayerRow.tsx`
**Verwendung:** Trikot-Icon mit Nummer, position-farbig

```tsx
<TrikotBadge number={7} pos="ATT" />
```

### PositionBadge
**Datei:** `index.tsx`
**Verwendung:** Farbiger Position-Tag

```tsx
<PositionBadge pos="MID" />          // Normal (28x28)
<PositionBadge pos="MID" size="sm" /> // Klein (20x20)
```

### StatusBadge
**Datei:** `index.tsx`
**Verwendung:** Spieler-Status (fit zeigt nichts)

```tsx
<StatusBadge status="injured" />  // Rotes "Verletzt"
<StatusBadge status="fit" />      // Zeigt nichts
```

### ScoreCircle
**Datei:** `index.tsx`
**Verwendung:** Kreisförmiger Performance-Score

```tsx
<ScoreCircle label="L5" value={72} size={36} />
```

### MiniSparkline
**Datei:** `index.tsx`
**Verwendung:** 7-Tage Preis-Verlauf als SVG

```tsx
<MiniSparkline values={[12, 14, 13, 15, 14, 16, 15]} width={80} height={24} />
```

### IPOBadge
**Datei:** `index.tsx`
**Verwendung:** IPO-Status Anzeige

```tsx
<IPOBadge status="live" progress={65} />
```

---

## UI Components (`@/components/ui/`)

### Card
```tsx
<Card className="p-6">
  <h3>Titel</h3>
  <p>Inhalt</p>
</Card>
```

### Button
```tsx
<Button variant="primary">Verpflichten</Button>
<Button variant="ghost" size="sm">Abbrechen</Button>
```

### StatCard
```tsx
<StatCard label="Portfolio" value="12.450" unit="BSD" change={+5.2} icon={Briefcase} />
```

### Modal (Pattern)
```tsx
// Aktuell inline in Pages definiert, noch nicht als shared Component extrahiert.
// TODO: Shared Modal Component erstellen
```

---

## Layout Components (`@/components/layout/`)

### SideNav
- Linke Navigation
- Collapsed/Expanded State
- Active Route Highlighting

### TopBar
- User Info
- BSD Balance
- Notifications Icon
- Search (Placeholder)

---

## Helper Functions (`@/lib/utils.ts`)

```tsx
import { fmtScout, cn } from '@/lib/utils';

fmtScout(12450)     // → "12.450"
fmtScout(1234567)   // → "1.234.567"
cn('base', condition && 'active')  // Conditional classNames
```

## Shared Helpers (`@/components/player/PlayerRow.tsx`)

```tsx
import { getContractInfo, getSuccessFeeTier } from '@/components/player/PlayerRow';

getContractInfo(18)  // → { dateStr: "Aug 2027", monthsLeft: 18, color: "text-white/60", urgent: false }
getSuccessFeeTier(500000)  // → { fee: 12000, label: "500K-1M", ... }
```

---

## Noch NICHT extrahiert (TODO)

Diese Components existieren nur lokal in Pages und sollten shared werden:

| Component | Aktuell in | Sollte werden |
|-----------|-----------|---------------|
| `IPOCardGrid` | market/page.tsx | `PlayerDisplay` + IPO-Variant? |
| `EventCard` | fantasy/page.tsx | `@/components/fantasy/EventCard` |
| `EventTableRow` | fantasy/page.tsx | `@/components/fantasy/EventTableRow` |
| `LineupBuilder` | fantasy/page.tsx | `@/components/fantasy/LineupBuilder` |
| `Modal` | inline überall | `@/components/ui/Modal` |
| `Tabs` | inline überall | `@/components/ui/Tabs` |
| `SearchInput` | market/page.tsx | `@/components/ui/SearchInput` |
