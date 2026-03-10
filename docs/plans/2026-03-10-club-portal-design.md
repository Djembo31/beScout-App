# Club Fan Portal — Design Doc

## Status: Design Approved
## Datum: 2026-03-10

## Entscheidungen (Brainstorming mit Anil)
- **Scope:** C — Full Club-Portal (Custom Layouts, Animated Header, Feature Showcase)
- **Prioritaet:** B — Premium visueller Wow-Effekt (Sales-Pitch Door-Opener)
- **Stadium-Bilder:** A — Echte Fotos, manuell pro Club beim Onboarding
- **Animation-Level:** B — Cinematic (Parallax, Counter, Scroll-Reveals, keine Particles)
- **Leere Sections:** B — Smart-Hide + Feature-Showcase Block

---

## Vision

Jede Club-Page fuehlt sich an wie die offizielle digitale Heimat des Vereins.
Ein Vereinsverantwortlicher oeffnet die Seite und denkt: "So will ich meinen Club im Internet sehen."
Ein Fan fuehlt Stolz und Zugehoerigkeit.

---

## 1. Club Color System (Foundation)

CSS Custom Properties pro Club, gesetzt als inline-style am Root-Container:

```css
--club-primary: #003DA5;    /* Adana Blau */
--club-secondary: #FF6600;  /* Adana Orange */
--club-glow: rgba(0,61,165,0.3);
```

Anwendung:
- Hero-Gradient Overlay
- Section-Header Icon-Farben
- Tab-Underline (active)
- Button-Fills (Folgen, Subscribe, CTAs)
- Progress-Bars (Collection, Events, FillBar)
- Card-Hover-Borders (subtle glow)
- Prestige-Badge Akzent

Folgen-Button in `--club-primary` statt globalem Gold.
Jeder Club MUSS sich visuell von jedem anderen unterscheiden.

---

## 2. Hero Section (Cinematic Redesign)

### Layout
- Full-width, `50vh` mobile / `45vh` desktop
- Stadium-Foto als Background (`object-fit: cover`)
- Parallax: Stadium scrollt mit `0.3x` Speed (`will-change: transform`)

### Overlays (3 Layer)
1. Diagonal Gradient: `primary_color 0%` -> `transparent 50%` -> `secondary_color 100%` (opacity ~35%)
2. Bottom Fade: `transparent 60%` -> `#0a0a0a 100%` (Lesbarkeit)
3. Subtle Vignette: `radial-gradient(transparent 50%, rgba(0,0,0,0.4))`

### Content (zentriert)
- Club-Logo: `100px` mobile / `140px` desktop
  - Subtle `box-shadow` Glow in `--club-primary`
  - Animated entrance: scale 0.8 -> 1.0 (0.3s ease-out)
- Club-Name: `font-black text-4xl` mobile / `text-5xl` desktop
  - Animated slide-up (0.4s, 100ms delay)
- Verified-Badge neben Name (golden shimmer animation)
- League + City als Subtitle (`text-white/60`)
- Stats-Row: Scouts | 24h Vol | Spieler
  - Zahlen zaehlen hoch beim Laden (counter animation, 0.6s)
  - Divider zwischen Stats (`border-white/20`)
- Folgen-Button: `bg-[var(--club-primary)]` mit weissem Text

### Desktop: Merged Stats-Bar
Stats-Bar (DPC Float, Perf L5, Spieler, Form, Prestige) als semi-transparenter Balken
am UNTEREN RAND des Heroes. `bg-black/40 backdrop-blur-md`. Verschmilzt visuell.

### Mobile: Separate Stats-Bar
Unterhalb des Heroes als eigene Section, kompakter.

---

## 3. Sponsor Banner (Aufgewertet)

- Horizontale Card mit `bg-white/[0.03] backdrop-blur-sm`
- Border: `border-[var(--club-secondary)]/20`
- Sponsor-Logo: `40px` Hoehe (statt ~20px aktuell)
- Label: "Offizieller Partner" (statt "Praesentiert von")
- Subtiler Shimmer-Effekt auf Logo (CSS `@keyframes shimmer`)

---

## 4. Tabs (Club-themed)

- Active-Underline in `var(--club-primary)` (statt Gold)
- Tab-Icons hinzufuegen: Uebersicht=LayoutGrid, Spieler=Users, Spielplan=Calendar

---

## 5. Next Match (Expanded)

Aktuell: kleine Textzeile. Neu:

- Full-width Card, `bg-gradient-to-r from-[var(--club-primary)]/10 to-transparent`
- Dark border: `border-white/10`
- Layout: [Club-Logo] — VS — [Gegner-Logo]
- Spieltag-Nummer + Datum + Stadion
- Countdown: "In X Tagen" (wenn <7 Tage)
- Pulsierender roter Dot + "LIVE" wenn Spiel laeuft
- Heim/Auswaerts-Badge farbig

---

## 6. Trending Spieler (Card Carousel)

Statt flacher Liste:

- Horizontal scrollable Cards (`overflow-x-auto snap-x`)
- Card-Groesse: ~160px breit, ~200px hoch
- Inhalt pro Card:
  - Player-Photo (oder Initialen-Fallback mit Position-Farbe)
  - Name (truncated)
  - Position-Badge (farbkodiert: GK=emerald, DEF=amber, MID=sky, ATT=rose)
  - L5 Score + 24h Change (mit Pfeil, gruen/rot)
- Card-Border: `hover:border-[var(--club-primary)]/40`
- Collection-Progress-Bar darueber in `--club-primary`
- "Alle anzeigen" Link rechts

---

## 7. Smart-Hide + Feature-Showcase

Sections ohne Daten werden ausgeblendet. Wenn >2 Sections leer:

### "Was dein Club bietet" Block
- 2x2 Grid mobile / 4-spaltig desktop
- Preview-Cards:
  1. **DPC Trading** — TrendingUp Icon + "Handle mit Spieler-Contracts"
  2. **Fantasy Events** — Trophy Icon + "Stelle dein Dream-Team auf"
  3. **Scout Community** — Search Icon + "Analysiere Spieler, verdiene Credits"
  4. **Club-Mitgliedschaft** — Crown Icon + "Exklusive Vorteile fuer Fans"
- Card-Background: subtle Club-Gradient (`from-[var(--club-primary)]/5 to-transparent`)
- CTA pro Card: "Entdecken" -> Link zur jeweiligen Seite

---

## 8. Membership (Premium Redesign)

- i18n-Key "club.subscribe" fixen -> "Abonnieren" / "Abone Ol"
- Tier-Cards mit farbigem Header:
  - Bronze: `from-amber-700 to-amber-900`
  - Silber: `from-slate-400 to-slate-600`
  - Gold: `from-yellow-400 to-yellow-600`
- Aktiver Tier: animierte Border (subtle pulse, 2s loop)
- Preis groesser (`text-2xl font-black`)
- Benefits mit Tier-farbigen Check-Icons statt generische Checkmarks
- CTA-Button in `--club-primary`

---

## 9. Letzte Ergebnisse (Aufgewertet)

- Gegner-Logo sichtbar (via `clubs` Join oder `/clubs/{slug}.png`)
- Score groesser und prominent (`font-mono text-lg font-bold`)
- W/D/L Badge groesser und farbiger (W=green-500, D=yellow-500, L=red-500)
- Heim/Auswaerts-Badge deutlicher

---

## 10. Letzte Aktivitaet (Aufgewertet)

- Player-Initialen-Avatar vor dem Namen
- "Jemand" -> "Ein Scout" (weniger anonym)
- Preis in `--club-primary` statt generischem Gold
- Kauf/Verkauf visuell unterscheiden (gruen/rot Icon)

---

## 11. Mitmachen (Smart-Hide)

- Wenn alle Werte 0: Section ausblenden (Smart-Hide)
- Wenn aktiv: Scout-Profil Metriken in `--club-primary`
- CTA: "Werde Scout" Button wenn noch kein Profil

---

## 12. Scroll-Animations (Cinematic Layer)

### Entrance Animations
- Hero: Logo fades + scales in (0.3s), Name slides up (0.4s, 100ms delay), Stats counter (0.6s)
- Sections: fade-in + translateY(20px -> 0) beim Scrollen
- Stagger: 50ms pro Element innerhalb einer Section

### Implementation
- `IntersectionObserver` mit `threshold: 0.1`
- CSS Classes: `.animate-reveal` (initial hidden) -> `.revealed` (visible)
- Zahlen-Counter: custom hook `useCountUp(target, duration)`

### Performance
- `will-change: transform` nur auf Hero-Parallax
- `prefers-reduced-motion`: ALLE Animationen deaktiviert
- GPU-beschleunigt via `transform: translate3d()`
- Keine JavaScript-Scroll-Listener fuer Parallax -> CSS `background-attachment: fixed` oder Intersection-based

---

## 13. Bugfixes (Sofort, unabhaengig vom Redesign)

- [ ] `club.subscribe` -> i18n-Key uebersetzen (DE + TR)
- [ ] `club.statusLive` -> i18n-Key uebersetzen (DE + TR)
- [ ] Sponsor-Link bei Adana fehlt (nur Sakaryaspor hat ihn)

---

## Betroffene Files

### Hauptkomponente
- `src/app/(app)/club/[slug]/ClubContent.tsx` (1348 Zeilen — wird aufgeteilt)

### Section-Components (alle in `src/components/club/sections/`)
- `ActiveOffersSection.tsx` (80 Z)
- `SquadPreviewSection.tsx` (79 Z) -> wird zu Card-Carousel
- `MitmachenSection.tsx` (222 Z)
- `ClubEventsSection.tsx` (87 Z)
- `MembershipSection.tsx` (118 Z)
- `RecentActivitySection.tsx` (51 Z)
- `CollectionProgress.tsx` (34 Z)

### Neue Files
- `src/components/club/ClubHero.tsx` — Cinematic Hero (aus ClubContent extrahiert)
- `src/components/club/ClubStatsBar.tsx` — Stats-Bar (aus ClubContent extrahiert)
- `src/components/club/sections/FeatureShowcase.tsx` — Smart-Hide Showcase
- `src/components/club/sections/NextMatchCard.tsx` — Expanded Match Card
- `src/hooks/useCountUp.ts` — Counter Animation Hook
- `src/hooks/useScrollReveal.ts` — IntersectionObserver Scroll Reveal Hook

### i18n
- `messages/de.json` — fehlende Keys
- `messages/tr.json` — fehlende Keys

### Types
- `src/types/index.ts` — ggf. ClubTheme Interface

---

## Nicht im Scope
- 3D-Stadion-Teaser (Phase 2)
- Fan-Wall / Social-Feed (Phase 2)
- Custom Layouts pro Club-Typ (Phase 2)
- Demo-Daten Modus (`?demo=true`) (separates Feature)
- Admin-Dashboard Redesign
- Club Discovery Page Redesign

---

## Abnahme
- [ ] `npx next build` -> 0 errors
- [ ] `npx vitest run` -> all pass
- [ ] Screenshot Desktop: Adana Demirspor (Blau/Orange Theme sichtbar)
- [ ] Screenshot Desktop: Sakaryaspor (Gruen Theme sichtbar)
- [ ] Screenshot Mobile 360px: Adana Demirspor
- [ ] Screenshot Mobile 360px: Sakaryaspor
- [ ] Parallax smooth auf Desktop (kein Jank)
- [ ] Counter-Animation spielt beim Scrollen
- [ ] Leere Sections ausgeblendet, Feature-Showcase sichtbar
- [ ] i18n Keys "club.subscribe" und "club.statusLive" uebersetzt
- [ ] `prefers-reduced-motion` deaktiviert Animationen
- [ ] Clubs mit/ohne Stadium-Foto sehen beide gut aus
