# Home Screen Premium Redesign — Spec

**Datum:** 2026-04-05
**Scope:** Home Screen (`/`) visuelles Upgrade
**Ziel:** Von "AI-generated flat boxes" zu "Premium Fan-Engagement App"

---

## PHASE 1: SPEC

### 1.1 Current State

#### Problem-Diagnose (Visual Audit)
1. **Flat Box Syndrome** — Jede Section identisch: `bg-surface-minimal border-white/10 rounded-2xl`. Keine Tiefe, keine Hierarchie.
2. **Kein Hero-Moment** — Startseite beginnt mit "Guten Abend" in kleinem Text + 3 gleich grosse Stat-Boxen. Kein Bild, keine Emotion.
3. **Scout Cards versteckt** — Das Herzstuck (Spielerkarten) sind winzige Thumbnails in einem Horizontal-Scroller. Auf Mobile ~80px breit.
4. **Typografie monoton** — Alles aehnlich gross, aehnlich schwer. Keine klare Hierarchie zwischen Hero-Zahlen und Nebendaten.
5. **Zu viel gleichzeitig** — Founding Pass + Onboarding + Quick Actions + Spotlight + Portfolio + Events + Movers + Challenge + Clubs: alles gleichzeitig, gleich gewichtet.
6. **Kein Fussball-Charakter** — Koennte eine Krypto-Trading-App sein. Nichts sagt "Stadion", "Rasen", "Matchday".
7. **Desktop = Mobile gestreckt** — Nur eine Spalte auf 1440px, riesig viel Whitespace rechts.

#### Feature Inventory (50 Elemente, komplett)
Alle 50 Features bleiben erhalten. KEIN Feature wird entfernt oder verschoben.
Dieses Redesign aendert ausschliesslich VISUELLES: Layout, Spacing, Shadows, Gradients, Typography, Animations.

#### File Inventory
| Datei | Zeilen | Aenderungs-Typ |
|-------|--------|----------------|
| `src/app/(app)/page.tsx` | 452 | MODIFY (Layout-Struktur, CSS-Klassen) |
| `src/components/home/HomeStoryHeader.tsx` | 114 | MODIFY (Hero-Redesign) |
| `src/components/home/HomeSpotlight.tsx` | 211 | MODIFY (visuelles Upgrade) |
| `src/components/home/PortfolioStrip.tsx` | 112 | MODIFY (groessere Cards) |
| `src/components/home/TopMoversStrip.tsx` | 56 | MODIFY (visuelles Upgrade) |
| `src/components/home/helpers.tsx` | 166 | MODIFY (SectionHeader-Upgrade) |
| `src/components/home/BeScoutIntroCard.tsx` | 40 | MODIFY (visuelles Upgrade) |
| `src/components/home/OnboardingChecklist.tsx` | 71 | MINOR (Spacing) |
| `src/app/globals.css` | 277 | MODIFY (neue Keyframes, Gradients) |
| `tailwind.config.ts` | 49 | MODIFY (neue Tokens) |

#### Data Flow — KEINE Aenderung
- Alle Hooks, Services, Queries bleiben identisch
- `useHomeData` Hook: NICHT anfassen
- Query Keys: NICHT anfassen
- Kein neuer State, kein neuer Fetch

### 1.2 Goals + Non-Goals + Anti-Requirements

**Goals:**
1. Erster Eindruck sagt "Premium Fussball-App" — nicht "AI-generierte Trading-App"
2. Klare visuelle Hierarchie: Hero > Primary > Secondary (3 Levels)
3. Scout Cards als visueller Star — gross, leuchtend, mit Position-Glow
4. Stadion-Atmosphaere spuerbar (Gradient, Textur, Licht-Effekte)
5. Desktop nutzt volle Breite sinnvoll (2-Spalten-Layout)

**Non-Goals:**
- Neue Features bauen
- Daten-Flow oder Hooks aendern
- Andere Seiten (Market, Fantasy, Profile) redesignen
- Neue Komponenten wo bestehende reichen
- i18n-Keys aendern

**Anti-Requirements:**
- KEINE neuen npm-Dependencies (alles mit Tailwind + CSS)
- KEINE Aenderung an useHomeData oder anderen Hooks
- KEINE Aenderung an Business-Logik (conditional rendering bleibt identisch)
- KEIN Over-Engineering: Wenn eine CSS-Klasse reicht, kein React-State dafuer
- KEINE Animationen die Performance killen (kein JS-basiertes Animieren, nur CSS)

### 1.3 Feature Migration Map

| # | Feature | Action | Details |
|---|---------|--------|---------|
| 1-50 | Alle bestehenden Features | ENHANCE (visuell) | Nur CSS/Layout, keine Logik-Aenderung |

Da KEIN Feature verschoben/entfernt wird, entfaellt die klassische Migration Map. Stattdessen: **Visual Enhancement Map**:

| Section | Aktuell | Ziel | Aenderung |
|---------|---------|------|-----------|
| **Hero (Header + Stats)** | Flat text + 3 gleiche Boxen | Full-width Gradient-Banner, Portfolio als Hero-Zahl, Stats integriert | Komplett neues Layout + CSS |
| **Spotlight** | Flat Card mit Border | Elevated Card mit Glow + tiefem Schatten | CSS Upgrade |
| **Portfolio Strip** | ~80px Thumbnails | ~140px Cards mit Position-Border-Glow | Card-Groesse + Glow |
| **Event Card** | Flat purple-tinted Box | Elevated Card mit Gradient + live-Glow | CSS Upgrade |
| **Section Headers** | "MEIN SPIELERKADER" caps | Kleinere Caps + Accent-Line | CSS Upgrade |
| **Quick Actions** | 4 gleiche Buttons | 4 Buttons mit Icon-Glow | CSS Upgrade |
| **Desktop Layout** | 1 Spalte zentriert | Hero full-width, Content 2-spaltig | Grid-Aenderung |
| **Dividers** | `border-white/[0.06]` Linie | Gradient fade-out | CSS Replace |
| **Typography** | Gleichfoermig | 4 klare Levels: Hero/Primary/Secondary/Micro | Klassen-Aenderung |

### 1.4 Blast Radius

Gering. Aenderungen sind rein visuell (CSS-Klassen, Layout-Tailwind-Classes).

**Risiken:**
- Responsive Breakpoints koennten auf bestimmten Geraeten brechen
- Glow-Effekte koennten auf Low-End-Geraeten Performance kosten
- Desktop 2-Spalten koennte Content-Reihenfolge aendern (Accessibility)

**Mitigation:**
- Visual QA auf 390px (Mobile) + 1440px (Desktop) nach jeder Wave
- `motion-reduce:` Prefix auf alle Animationen
- Source-Order bleibt logisch (CSS Grid Order, nicht DOM-Umstellung)

### 1.5 Pre-Mortem

| # | Failure Scenario | Mitigation |
|---|-----------------|------------|
| 1 | "Sieht auf meinem iPhone anders aus" — Responsive bricht | Visual QA mit Playwright 390px nach JEDER Wave |
| 2 | Glow-Effekte unsichtbar auf manchen Screens | Immer Fallback: solide Border + erhoehte Opacity |
| 3 | Desktop 2-Spalten laesst Mobile kaputt aussehen | Mobile-First: erst Mobile perfekt, dann Desktop Grid |
| 4 | Performance-Einbruch durch Animationen | Nur CSS transform/opacity. Kein JS. `will-change` nur temporaer |
| 5 | "Sieht jetzt ueberladen aus" — zu viele Effekte | Restraint: Max 2 Glow-Elemente gleichzeitig sichtbar above the fold |

### 1.6 Invarianten + Constraints

**Invarianten:**
- Alle 50 Features bleiben funktional identisch
- Alle internen Links funktionieren
- Conditional Rendering Logik: NICHT anfassen
- Touch Targets bleiben min 44px
- WCAG AA Kontrast auf allen Texten

**Constraints:**
- Nur Tailwind + globals.css (keine neuen Dependencies)
- Max 10 Files pro Wave
- `useHomeData` Hook: READ-ONLY (keine Aenderung)
- Jede Wave: tsc clean + Playwright Screenshot 390px + 1440px
- Keine neuen Komponenten — bestehende erweitern

### 1.7 Akzeptanzkriterien

```
GIVEN: Eingeloggter User mit Holdings
WHEN: User oeffnet bescout.net
THEN: Hero-Section mit Stadion-Gradient sichtbar
  AND: Portfolio-Wert als groesste Zahl auf der Seite (text-4xl+)
  AND: Scout Cards im Portfolio-Strip mind. 140px breit mit Position-Glow
  AND: Klare 3-Level-Hierarchie erkennbar (Hero > Primary > Secondary)
  AND NOT: Flash of unstyled Content
  AND NOT: Layout-Shift waehrend Laden

GIVEN: Desktop User (1440px)
WHEN: User oeffnet bescout.net
THEN: Hero spannt volle Breite
  AND: Content-Bereich nutzt 2-Spalten-Layout
  AND NOT: Riesige leere Flaeche rechts

GIVEN: Mobile User (390px)
WHEN: User scrollt durch Home
THEN: Alle Sections korrekt gestapelt, kein horizontaler Overflow
  AND: Touch Targets mind. 44px
  AND: Portfolio-Strip horizontal scrollbar mit Snap
```

---

## PHASE 2: PLAN

### Design-Sprache: "Stadium Noir"

Die visuelle Identitaet in 5 Saetzen:
1. **Dunkel wie eine Flutlicht-Nacht** — #0a0a0a als Basis, Licht kommt nur von Akzenten
2. **Gold wie der Pokal** — #FFD700 sparsam, nur fuer Hero-Zahlen und CTAs
3. **Position-Farben als Energie** — GK Emerald, DEF Amber, MID Sky, ATT Rose: Glows, nicht flat Badges
4. **Tiefe statt Flachheit** — Cards schweben, Schatten erzeugen Raum, Glows erzeugen Fokus
5. **Stadion-Atmosphaere** — Subtiler Rasen-Gradient im Hero, Textur statt leere Flaeche

### Wave-Uebersicht

| Wave | Zweck | Files | Risiko |
|------|-------|-------|--------|
| 1 | Design Foundation — neue Tokens, Keyframes, Gradients | globals.css, tailwind.config.ts | Gering (nur CSS) |
| 2 | Hero Section — Stadion-Gradient, Hero-Zahl, integrierte Stats | HomeStoryHeader.tsx, helpers.tsx | Mittel (Layout-Change) |
| 3 | Card Showcase — groessere Portfolio-Cards mit Glow | PortfolioStrip.tsx, TopMoversStrip.tsx | Mittel (Sizing) |
| 4 | Elevation + Hierarchy — Spotlight, Events, Sections aufwerten | HomeSpotlight.tsx, page.tsx | Mittel (viele Klassen) |
| 5 | Desktop Layout + Polish — 2-Spalten, Micro-Interactions | page.tsx, BeScoutIntroCard.tsx | Hoch (responsive) |

---

### Wave 1: Design Foundation

**Files:** `globals.css`, `tailwind.config.ts`
**Risiko:** Gering — nur neue Tokens/Keyframes, keine bestehenden aendern

**Neue Design Tokens (tailwind.config.ts):**
```
backgroundImage:
  'hero-stadium': 'radial-gradient(ellipse at 50% 0%, rgba(34,197,94,0.08) 0%, transparent 60%)'
  'hero-vignette': 'radial-gradient(ellipse at 50% 50%, transparent 40%, rgba(0,0,0,0.4) 100%)'
  'card-glow-gold': 'radial-gradient(ellipse at 50% -20%, rgba(255,215,0,0.10) 0%, transparent 70%)'

boxShadow:
  'hero-stat': '0 0 0 1px rgba(255,255,255,0.06), inset 0 1px 0 rgba(255,255,255,0.04)'
  'card-elevated': '0 8px 32px rgba(0,0,0,0.6), 0 2px 8px rgba(0,0,0,0.4), inset 0 1px 0 rgba(255,255,255,0.06)'
```

**Neue Keyframes (globals.css):**
```css
/* Counter animation for hero numbers */
@keyframes number-reveal { from { opacity: 0; transform: translateY(8px); } to { opacity: 1; transform: translateY(0); } }
.anim-number { animation: number-reveal 0.6s cubic-bezier(0.16, 1, 0.3, 1) both; }

/* Subtle glow pulse for live elements */
@keyframes glow-breathe { 0%, 100% { opacity: 0.6; } 50% { opacity: 1; } }
.anim-glow-breathe { animation: glow-breathe 3s ease-in-out infinite; }

/* Staggered card entrance */
.card-stagger-1 { animation-delay: 0ms; }
.card-stagger-2 { animation-delay: 80ms; }
.card-stagger-3 { animation-delay: 160ms; }
.card-stagger-4 { animation-delay: 240ms; }
.card-stagger-5 { animation-delay: 320ms; }
.card-stagger-6 { animation-delay: 400ms; }
```

**DONE means:**
- [ ] Neue Tokens in tailwind.config.ts kompilieren (tsc clean)
- [ ] Neue Keyframes in globals.css syntaktisch korrekt
- [ ] Bestehende Styles NICHT veraendert
- [ ] `npx tsc --noEmit` 0 errors

---

### Wave 2: Hero Section — "Stadium Noir"

**Files:** `HomeStoryHeader.tsx`, `helpers.tsx`
**Abhaengigkeit:** Wave 1 (neue Tokens)

**Aenderungen HomeStoryHeader.tsx:**

VORHER:
```
Greeting text (sm) + Name (2xl font-black)
3 separate Stat-Boxen (Portfolio / PnL / Holdings) gleich gross
```

NACHHER:
```
Full-width Hero Container:
  - Background: hero-stadium Gradient (subtiler Rasen-Schein von oben)
  - Padding: py-8 px-4
  
  Greeting (text-sm text-white/40 uppercase tracking-widest)
  Name (text-3xl md:text-4xl font-black) — GROSS, dominant
  
  Portfolio-Wert als HERO-ZAHL:
    - text-4xl md:text-5xl font-mono font-bold text-gold
    - textShadow: gold-glow
    - "Credits" Label darunter (text-xs text-white/30)
    - anim-number Entrance
  
  Stats-Row darunter (PnL + Holdings) — kleiner, sekundaer:
    - Inline, text-sm, keine eigene Box
    - PnL mit Farbe (green/red) + Pfeil-Icon
    - Holdings als "8 Spieler" Text
  
  Streak + Tier Badge rechts oben (absolut positioniert)
```

**Aenderungen helpers.tsx:**
- SectionHeader: Accent-Line links (3px Gold-Border) statt nur Text
- Kleineres `text-xs uppercase tracking-widest text-white/40` fuer Label

**DONE means:**
- [ ] Hero zeigt Stadion-Gradient-Hintergrund
- [ ] Portfolio-Wert ist die groesste Zahl (text-4xl+)
- [ ] Stats sind integriert (keine separaten Boxen)
- [ ] Name ist dominant sichtbar
- [ ] Playwright Screenshot 390px: Hero above the fold, kein Overflow
- [ ] Playwright Screenshot 1440px: Hero volle Breite
- [ ] tsc clean

---

### Wave 3: Card Showcase — "Deine Sammlung leuchtet"

**Files:** `PortfolioStrip.tsx`, `TopMoversStrip.tsx`
**Abhaengigkeit:** Wave 1 (neue Shadows/Glows)

**Aenderungen PortfolioStrip.tsx:**

VORHER: ~80px breite Mini-Thumbnails, horizontal scroll
NACHHER:
```
Card-Breite: w-[160px] md:w-[180px] (verdoppelt)
Card-Hoehe: explizit, Platz fuer:
  - Spieler-Foto (size-16, rounded-xl, mit Positions-Border-Glow)
  - Name (font-bold, truncate)
  - Position Badge (bestehend)
  - Preis in Gold (font-mono text-lg)
  - 24h Change (text-xs)

Card-Container:
  - bg-surface-base → bg-surface-elevated
  - shadow-card-sm → shadow-card-md
  - border: 1px solid mit Position-Farbe bei 15% Opacity
  - border-left-2 in voller Position-Farbe (subtiler Akzent)
  
Horizontal Scroll:
  - scroll-snap-type: x mandatory
  - Jede Card: scroll-snap-align: start
  - Gap: gap-3
  - card-entrance Animation mit Stagger (.card-stagger-N)
  
Leerer Zustand:
  - Groessere CTA-Card mit Gold-Gradient-Background
```

**Aenderungen TopMoversStrip.tsx:**
- Cards: shadow-card-sm + subtle Position-Tint im Hintergrund
- Change-Prozent groesser (text-lg font-bold)
- TrendingUp/Down Icons mit Position-Farbe statt generic weiss

**DONE means:**
- [ ] Portfolio-Cards mindestens 160px breit
- [ ] Position-Farbe als Border-Glow sichtbar auf jeder Card
- [ ] Horizontal Scroll mit Snap funktioniert
- [ ] Card-Entrance-Animation bei erstem Laden
- [ ] Mobile 390px: mindestens 2 Cards sichtbar, kein Overflow
- [ ] tsc clean

---

### Wave 4: Elevation + Hierarchy

**Files:** `HomeSpotlight.tsx`, `page.tsx` (CSS-Klassen)
**Abhaengigkeit:** Wave 1-3

**Aenderungen HomeSpotlight.tsx:**
- Container: `shadow-card-elevated` statt `shadow-card-sm`
- Live-Event: Subtiler `anim-glow-breathe` auf dem Border
- IPO-Spotlight: `shadow-glow-live` (bereits vorhanden, aktivieren)
- Event-Spotlight: Gradient intensiver, Prize-Zahl in Gold mit Glow

**Aenderungen page.tsx (CSS-Klassen-Update):**
- Founding Pass Card: `bg-gradient-to-r from-gold/[0.06] to-transparent` + `shadow-glow-gold` (subtil)
- Event Card (rechte Spalte): `shadow-card-md` + `border-purple-500/20`
- IPO Card: `shadow-card-md` + `border-green-500/20`
- Divider Lines: Von `border-white/[0.06]` zu `bg-gradient-to-r from-transparent via-white/[0.06] to-transparent h-px` (Gradient Fade)
- Quick Actions: Icon bekommt `shadow-[0_0_12px_rgba(COLOR,0.3)]` (Glow pro Farbe)
- Section-Abstaende: `space-y-8 md:space-y-10` (mehr Luft)

**3-Level Hierarchie sichtbar:**
| Level | Elemente | Behandlung |
|-------|----------|------------|
| Hero | Header + Spotlight | Gradient-BG, grosse Type, Glow |
| Primary | Portfolio, Events, Founding Pass | shadow-card-md, border-accent, elevated surface |
| Secondary | Movers, Clubs, Challenge, Sponsor | shadow-card-sm, standard surface, kleiner Type |

**DONE means:**
- [ ] 3 Hierarchie-Levels visuell unterscheidbar
- [ ] Spotlight hat spuerbaren Depth-Effekt
- [ ] Dividers sind Gradient-Fades (nicht harte Linien)
- [ ] Keine ueberladenen Effekte (max 2 Glows above the fold)
- [ ] tsc clean

---

### Wave 5: Desktop Layout + Polish

**Files:** `page.tsx`, `BeScoutIntroCard.tsx`
**Abhaengigkeit:** Wave 1-4
**Risiko:** HOCH — responsive Layout-Aenderung

**Desktop 2-Spalten Layout (page.tsx):**
```
Ab lg (1024px+):
  Hero Section: volle Breite (col-span-2)
  
  Content-Grid: lg:grid lg:grid-cols-[1fr_340px] lg:gap-8
    Left (Main):
      - Spotlight
      - Portfolio Strip
      - Top Movers
      - Market Pulse
      - Global Movers
    Right (Sidebar, sticky):
      - Next Event Card
      - Active IPO Card
      - Daily Challenge
      - My Clubs
      - Score Road
      - Sponsor
  
  Mobile: bleibt Single Column (bestehende Reihenfolge)
```

**BeScoutIntroCard.tsx:**
- 4 Pillar-Cards: Subtle Icon-Glow + `shadow-card-sm`
- Hover: `hover:shadow-card-md hover:border-gold/20 transition-all`

**Micro-Interactions (globals.css):**
- Portfolio-Wert: `anim-number` bei Page-Load
- Cards: `card-entrance` mit Stagger bei erstem Laden
- Hover auf Player-Cards: `hover:translate-y-[-2px] hover:shadow-card-md transition-all duration-200`
- Active-State: bestehender `active:scale-[0.97]` bleibt

**DONE means:**
- [ ] Desktop 1440px: 2-Spalten sichtbar, Sidebar sticky
- [ ] Mobile 390px: Single Column, identisch zu vorher (nichts gebrochen)
- [ ] Tablet 768px: Graceful Transition (1 oder 2 Spalten je nach Content)
- [ ] Micro-Animations smooth (60fps, nur transform/opacity)
- [ ] `motion-reduce:` Prefix auf allen neuen Animationen
- [ ] Playwright Screenshot 390px: komplett sauber
- [ ] Playwright Screenshot 1440px: professionell, kein verschwendeter Platz
- [ ] tsc clean

---

## Referenz-Benchmarks

| Aspekt | Sorare | OneFootball | BeScout Ziel |
|--------|--------|-------------|--------------|
| Hero | Card-Stack mit Depth | Hero-Image + Neon Accent | Stadion-Gradient + Gold Hero-Zahl |
| Cards | Layered Stacks, Elevation | Content-Cards flat | Position-Glow Cards mit Elevation |
| Accent | Blue dominant | Neon Green (10%) | Gold sparsam + Position-Farben |
| Typography | Druk Condensed Caps | Bold + Clean | Outfit Black + Mono fuer Zahlen |
| Emotion | Card Rarity Glow | Breaking News Energy | Stadion-Atmosphaere + Sammler-Stolz |

---

## Zusammenfassung

**5 Waves, 10 Files, 0 neue Features, 0 neue Dependencies.**

Das Redesign transformiert das SELBE Home mit dem SELBEN Code in eine visuell hochwertige Erfahrung durch:
1. Stadion-Gradient Hero (Emotion)
2. Groessere leuchtende Scout Cards (Produkt-Star)
3. 3-Level Hierarchie (Klarheit)
4. Depth + Glow statt Flat Boxes (Premium)
5. Desktop 2-Spalten (Platz nutzen)

Ergebnis: Ein User der bescout.net oeffnet denkt "Wow, das sieht professionell aus" — nicht "Das ist eine AI-App".
