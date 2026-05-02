# Slice 264 — ActionRequiredStack (Phase 2 Action-Layer Start) — Spec v2

**Status:** SPEC v2 (post-Pre-Review REWORK, alle 12 Findings adressiert + Decision K NEU) · **Größe:** S→M (8 Files, eine Domain) · **Slice-Type:** UI · **Scope:** CTO autonom · **Datum:** 2026-05-02

> **v2-Changelog (post-Reviewer-Pre-Review REWORK):**
> - **P0-1:** `useHomeData` Return erweitert um `locksAtIso` (Primitive, entkoppelt Stack vom DbEvent-Type)
> - **P0-2:** Mount-Position präzisiert: DIREKT nach HomeStoryHeader, VOR ScoutCardStats (page.tsx Z.144→Z.151)
> - **P0-3:** TR-Wording „Hafta {n} · {countdown} içinde" (parallel zu Slice 263 ManagerPill „in {time}"). DE „Spieltag {n} · in {countdown}"
> - **P0-4:** EC-09 Defense-Note für gw-Default
> - **P1-1:** URGENT_THRESHOLD_MS aus helpers.tsx exportiert + GameweekStatusBar refactored (Decision I)
> - **P1-2:** ManagerBlock-Pills downgraden (kein gold-pulse-bg + animate-pulse) wenn Stack ggf. URGENT (Decision J)
> - **P1-3:** Captain-Card UX-Compromise dokumentiert (kein Deep-Link → Backlog 264c)
> - **P1-4:** EC-08 status=running + locks_at past → Stack hidden
> - **P2-1..4:** Visual-Spec, AC-11 weg, TR „SADECE {countdown}", Long-String-Proof
> - **Decision K (NEU):** Countdown-Differentiator GameweekStatusBar (starts_at, „startet in") vs Stack (locks_at, „Deadline in") als bewusste Inkonsistenz

---

## 1. Problem Statement

**Heute (post-Slice-263):** ManagerBlock zeigt Lineup-Pulse-Pill + Captain-Pill als kompakte Status-Indikatoren. ABER: User der Home öffnet während aktive GW läuft + Lineup leer → sieht nur kleine gelbe Pulse-Pill. Visual-Weight unzureichend für Pflicht-Action mit Deadline.

**Evidence:**
- D63 Phase 2 Action-Layer: „ActionRequiredStack vor Spotlight"
- Game-Designer-Persona: „Captain-Reminder fehlt above-fold prominent"
- FM-Power-User: FPL-Vergleich „You haven't set your team yet — deadline in 4h 23m"

## 2. Lösungs-Design

### 2.1 ActionRequiredStack-Component

`src/components/home/ActionRequiredStack.tsx` — Stack von prominenten Action-Cards. Render-Branches:

```
heroMode !== 'manager'                               → null
locksAtIso === null                                  → null (defensive)
hasLineup === true AND hasCaptain === true           → null (alles erfüllt)
status === 'running' AND now > locks_at              → null (gelockt, kein actionable State)
                                                       (EC-08, P1-4 Fix)
sonst → Render Card-Stack
```

### 2.2 Card-Style (P2-1 Konkret-Spec)

Analog Founding-Upsell-Link Pattern (`page.tsx:160-173`). Card = `Link` mit folgendem Layout:

```tsx
<Link href="/fantasy?tab=lineup" prefetch={false} className={cn(
  "flex items-center gap-3 px-4 py-3.5 rounded-2xl border min-h-[64px]",
  "transition-colors",
  isUrgent
    ? "border-red-400/30 bg-red-500/[0.06] motion-safe:animate-pulse motion-reduce:animate-none"
    : "border-gold/25 bg-gold/[0.04] hover:bg-gold/[0.06]"
)}>
  <div className="size-10 rounded-xl bg-gold/10 border border-gold/20 flex items-center justify-center shrink-0">
    <Users className="size-5 text-gold" aria-hidden="true" />
  </div>
  <div className="flex-1 min-w-0">
    <div className="flex items-center gap-2 mb-0.5">
      <span className="text-sm font-black uppercase tracking-wide">{t('lineupTitle')}</span>
      {isUrgent && <UrgentBadge countdown={countdown} />}
    </div>
    <span className="text-[12px] text-white/55">{t('lineupSubtitle', { n: gw, countdown })}</span>
  </div>
  <ArrowRight className="size-5 text-gold shrink-0" aria-hidden="true" />
</Link>
```

`UrgentBadge`: kleine inline-Pill mit roter Background-Farbe + countdown-text.

### 2.3 Card-Render-Reihenfolge

**Card 1 — Lineup** (sichtbar wenn `!hasLineup`):
- Title: „AUFSTELLUNG FEHLT" / „KADRO EKSİK"
- Subtitle: „Spieltag {n} · in {countdown}" / „Hafta {n} · {countdown} içinde"
- CTA: Link `/fantasy?tab=lineup`

**Card 2 — Captain** (sichtbar wenn `hasLineup && !hasCaptain`):
- Title: „KAPITÄN FEHLT" / „KAPTAN EKSİK"  
- Subtitle: „Verdoppelt deinen besten Score" / „En iyi puanını ikiye katlar"
- CTA: Link `/fantasy?tab=lineup` (UX-Compromise — kein Captain-Deep-Link, P1-3)

### 2.4 URGENT-Threshold

`URGENT_THRESHOLD_MS = 6 * 60 * 60 * 1000` (6 Stunden). **Decision I (NEU):** aus `src/components/home/helpers.tsx` exportieren, GameweekStatusBar.tsx refactored um zu importieren.

URGENT-Branch wenn `countdownMs < URGENT_THRESHOLD_MS`:
- Border: `red-400/30` (statt `gold/25`)
- Background: `red-500/[0.06]`
- `motion-safe:animate-pulse motion-reduce:animate-none`
- UrgentBadge sichtbar mit „SADECE {countdown}" / „NUR {countdown}"

### 2.5 Mount-Position (P0-2 Fix)

In `src/app/(app)/page.tsx`:
- **DIREKT nach** `<HomeStoryHeader>` (Z.144)
- **VOR** `<ScoutCardStats>` (Z.151)
- Begründung: Pflicht-Action mit Deadline > statistische Anzeige > Upsell

```
<HomeStoryHeader />           ← Z.122-144
<ActionRequiredStack />       ← NEU Slice 264 (DIREKT hier)
<ScoutCardStats />            ← Z.151
<BeScoutIntroCard />          ← Z.154 (conditional)
... existing chain
<HomeSpotlight />             ← Z.184-193
```

Stack rendert eigenes `<div>` → automatischer space-y-Abstand vom Wrapper (`space-y-8 md:space-y-10` Z.118). Kein explicit `mt-6` (P2-2).

### 2.6 Props-Interface (P0-1 Fix — Primitive)

```ts
type ActionRequiredStackProps = {
  heroMode: 'manager' | 'scout' | 'cta-new';
  gw: number;
  hasLineup: boolean;
  hasCaptain: boolean;
  locksAtIso: string | null;  // NEU — entkoppelt von DbEvent-Type
  status: import('@/types').DbEvent['status'] | null;  // für EC-08 (running + locked)
};
```

ActionRequiredStack derived `countdownMs` aus `locksAtIso`. Wenn null → return null.

### 2.7 useHomeData-Erweiterung (P0-1 Fix)

Return-Block erweitern um:
```ts
locksAtIso: scopedActiveEvent?.locks_at ?? null,
scopedActiveEventStatus: scopedActiveEvent?.status ?? null,
```

Page.tsx destructured + reicht an Stack weiter.

**Wichtig:** `scopedActiveEvent` wird NICHT als Object exportiert — nur 2 Primitives (`locksAtIso`, `scopedActiveEventStatus`). Entkoppelt + Test-mockbar.

### 2.8 ManagerBlock-Pill-Downgrade (Decision J, P1-2 Fix)

`src/components/home/ManagerBlock.tsx` — Lineup-Pill (Z.93-105 in current code) bekommt:
- ENTFERNT: `gold-pulse-bg motion-safe:animate-pulse motion-reduce:animate-none`
- BEHALTEN: gold-Border, Link, Touch-Target, Wording

Begründung: Stack übernimmt Pulse-Aufmerksamkeit. Pill ist Status-Indikator („nicht gesetzt"), Stack ist Action-CTA („setze jetzt"). Doppelte Pulse → konkurriert visuell.

Captain-Pill bleibt unverändert (kein Pulse heute, nur AlertCircle-Icon).

## 3. Betroffene Files

| File | Change | Begründung |
|------|--------|-----------|
| `src/components/home/ActionRequiredStack.tsx` | NEU | Stack-Component (~140 LoC) |
| `src/components/home/__tests__/ActionRequiredStack.test.tsx` | NEU | 10-12 Tests |
| `src/app/(app)/page.tsx` | +Mount + 4 Props (heroMode, locksAtIso, scopedActiveEventStatus, gw via destructure) | Mounting (DIREKT nach HomeStoryHeader) |
| `src/app/(app)/hooks/useHomeData.ts` | +`locksAtIso` + `scopedActiveEventStatus` derives + Return | Primitives für Stack |
| `src/components/home/helpers.tsx` | +`URGENT_THRESHOLD_MS` export | Shared-Helper (Decision I) |
| `src/components/home/GameweekStatusBar.tsx` | -lokale Konstante Z.32, +Import aus helpers | Drift-Prevention |
| `src/components/home/ManagerBlock.tsx` | -`gold-pulse-bg motion-safe:animate-pulse motion-reduce:animate-none` aus Lineup-Pill | Decision J Pill-Downgrade |
| `src/app/(app)/hooks/__tests__/useHomeData.test.ts` | +Mocks für Return-Felder | Test-Compat |
| `messages/de.json` | +7 Keys home.actionStack.* | i18n DE |
| `messages/tr.json` | analog mit „içinde"-Variante | i18n TR (P0-3) |

**Größe:** S→M (10 Files, eine Domain. Trotz Pattern-Reuse mit Slice 261-263 grenzwertig zu M weil Cross-File-Touch in 4 home-Components).

## 4. Code-Reading-Liste (vollzogen)

| File | Resultat |
|------|----------|
| `useHomeData.ts:141-150, 284-309` | `scopedActiveEvent` lokal aber nicht exportiert (P0-1) |
| `page.tsx:113-193` | 5 Components zwischen Header und Spotlight (P0-2) |
| `GameweekStatusBar.tsx:32` | `URGENT_THRESHOLD_MS = 6 * 60 * 60 * 1000` lokal definiert (P1-1 Quelle) |
| `ManagerBlock.tsx:93-105` | Lineup-Pulse-Pill mit `gold-pulse-bg` + `motion-safe:animate-pulse` (P1-2 Pill-Downgrade-Target) |
| `helpers.tsx` | Aktueller Export: pickScopedEvent, pickNextScopedEvent, getTimeUntil. URGENT_THRESHOLD_MS noch nicht da (Decision I extract) |
| `types/index.ts:701-724` | DbEvent.locks_at: string (non-null), DbEvent.status: 6 Status-Strings |
| `messages/de.json:440-453` | home.manager + home.scoutHero etabliert. home.actionStack ist neu (kein Konflikt) |
| `page.tsx:160-173` | Founding-Upsell-Link als Card-Style-Vorbild (P2-1) |

## 5. Pattern-References

- **D63** Phase 2 Action-Layer Start
- **D62** Reviewer-VOR-BUILD (4. Slice in Folge — Pattern bewährt)
- **Slice 254** Stateless-Component
- **Slice 261** URGENT_THRESHOLD_MS Source (jetzt shared)
- **Slice 263** F-06 Shared-Helper-Extraction-Pattern (analog für URGENT_THRESHOLD_MS, Decision I)
- **Slice 263** Visual-Decision-Pattern (TR „içinde"/„sonra" — Konsistenz)
- **errors-frontend.md** Liga/Context-Switch State-Reset

## 6. Acceptance Criteria

| # | AC | VERIFY |
|---|-----|--------|
| AC-01 | Stack rendert null wenn `heroMode !== 'manager'` | RTL test |
| AC-02 | Stack rendert null wenn `hasLineup && hasCaptain` | RTL test |
| AC-03 | Stack rendert null wenn `locksAtIso === null` | RTL test |
| AC-04 | Stack rendert null wenn `status === 'running' AND now > locks_at` (EC-08) | RTL test mit Date.now mock |
| AC-05 | Lineup-Card rendert wenn `!hasLineup` | RTL test |
| AC-06 | Captain-Card rendert nur wenn `hasLineup && !hasCaptain` (cascading) | RTL test |
| AC-07 | URGENT-Branch wenn `countdownMs < URGENT_THRESHOLD_MS (6h)` (red-Border + animate-pulse) | RTL test mit time-mock |
| AC-08 | Default-Branch wenn `countdownMs >= 6h` (gold-Border, kein Pulse) | RTL test |
| AC-09 | Lineup-Card Tap → Link `/fantasy?tab=lineup` | RTL test |
| AC-10 | Captain-Card Tap → Link `/fantasy?tab=lineup` (UX-Compromise) | RTL test |
| AC-11 | Mobile 393px: Card-Width = 100% Container, Touch-Targets ≥44px | qa-visual |
| AC-12 | Position: DIREKT nach HomeStoryHeader Z.144, VOR ScoutCardStats Z.151 | grep page.tsx |
| AC-13 | TR-Locale: „Kadro eksik", „Hafta {n} · {countdown} içinde", „Kaptan eksik", „SADECE {countdown}" | Anil-PROVE |
| AC-14 | URGENT_THRESHOLD_MS exportiert aus helpers.tsx, GameweekStatusBar importiert (Decision I) | grep |
| AC-15 | ManagerBlock Lineup-Pill OHNE `gold-pulse-bg`/`animate-pulse` (Decision J) | grep ManagerBlock.tsx |

## 7. Edge Cases

| # | Szenario | Erwartet |
|---|----------|----------|
| EC-01 | scopedActiveEvent.locks_at === null (sollte non-null sein) | Stack rendert null defensive |
| EC-02 | countdownMs = 0 (Deadline gerade abgelaufen, status = registering/late-reg) | URGENT-Branch, „SADECE 0m" — User kann ggf. noch Late-Reg machen |
| EC-03 | countdownMs > 14 Tage | Default-Branch, Card sichtbar ohne URGENT |
| EC-04 | Liga-Switch | Stack re-rendert via heroMode + locksAtIso props (deps-stable) |
| EC-05 | Mid-Deadline-Crossing (countdown sinkt durch 6h-Threshold) | URGENT-Branch erscheint dynamisch — countdownMs ist props-derived, re-render bei nächstem Refetch |
| EC-06 | hasLineup && !hasCaptain (nur Captain-Card) | Lineup-Card hidden, Captain-Card prominent |
| EC-07 | Manager-Mode + 0 Holdings + aktive GW | Stack sichtbar mit Lineup-Card. ManagerBlock-Pill bleibt parallel (downgraded ohne Pulse, Decision J) |
| EC-08 (NEU, P1-4) | `status === 'running'` AND `now > locks_at` (Live-GW, Lineup gelockt) | Stack komplett hidden — Lineup nicht mehr änderbar, Captain auch nicht. Kein actionable State. |
| EC-09 (NEU, P0-4) | heroMode === 'manager' Guarantees gw >= 1 | Stack rendert nur in Manager-Mode → scopedActiveEvent garantiert vorhanden → gw >= 1. Keine separate Defense nötig. |
| EC-10 | Native iOS-Safari Animation-Performance | `motion-safe:animate-pulse motion-reduce:animate-none` honoriert prefers-reduced-motion |

## 8. Self-Verification Commands

```bash
# AC-12 Mount-Position
grep -B1 -A1 "<ActionRequiredStack" src/app/\(app\)/page.tsx
# erwartet: vor ActionRequiredStack: HomeStoryHeader-Close, danach: ScoutCardStats

# AC-14 Shared-Helper
grep -n "URGENT_THRESHOLD_MS" src/components/home/helpers.tsx \
  src/components/home/GameweekStatusBar.tsx \
  src/components/home/ActionRequiredStack.tsx

# AC-15 Pill-Downgrade
grep -E "gold-pulse-bg|animate-pulse" src/components/home/ManagerBlock.tsx
# erwartet: KEIN Treffer in Lineup-Pill (nur evtl. Captain-CTA falls Pattern dort separat)

# i18n
for key in "lineupTitle" "lineupSubtitle" "lineupCta" "captainTitle" "captainSubtitle" "captainCta" "urgentBadge"; do
  for locale in de tr; do
    grep -q "\"${key}\"" "messages/${locale}.json" || echo "MISSING: home.actionStack.$key in $locale"
  done
done

# tsc + tests
pnpm exec tsc --noEmit
CI=true pnpm exec vitest run src/components/home/__tests__/
```

## 9. CTO-Decisions (autonom)

| # | Entscheidung | Rationale |
|---|--------------|-----------|
| A | Wildcard SCOPE-OUT → Slice 264b | Wildcard ist optional, semantisch nicht „required" |
| B | locks_at statt starts_at als Deadline | FPL-Convention, Lineup-pflicht-Deadline |
| C | URGENT_THRESHOLD_MS = 6h reuse | Konsistenz mit Slice 261 GameweekStatusBar |
| D (P0-2 Fix) | Mount-Position: DIREKT nach HomeStoryHeader Z.144, VOR ScoutCardStats Z.151 | Pflicht-Action > statistische Anzeige |
| E | Stack hidden bei beiden erfüllt | UX-clean |
| F (P2-1 Fix) | Card-Style mit konkretem Code-Snippet (analog Founding-Upsell-Link) | Konsistenz mit existing Card-Pattern |
| G (P0-3 + P2-3 Fix) | TR-Wording „içinde" + „SADECE {countdown}", DE-Pendant „in {countdown}" + „NUR {countdown}" | Native-TR-konform, parallel Slice 263 |
| H | i18n-Sub-Namespace home.actionStack.* | grep verifiziert 0 Konflikte |
| I (NEU, P1-1) | URGENT_THRESHOLD_MS shared in helpers.tsx, GameweekStatusBar refactored | F-06 Shared-Helper-Pattern (Slice 263) |
| J (NEU, P1-2) | ManagerBlock Lineup-Pill downgraden (kein Pulse) | Stack übernimmt Pulse, Pill bleibt Status-Indikator |
| K (NEU, P1-3 + P0-3) | Countdown-Differentiator dokumentiert: GameweekStatusBar (starts_at, „startet in") vs Stack (locks_at, „Deadline in") | Bewusste Inkonsistenz — StatusBar=GW-Awareness, Stack=Lineup-Action |
| L (P1-3) | Captain-Card linkt auf `/fantasy?tab=lineup` (kein Deep-Link) | UX-Compromise. Backlog: Slice 264c Captain-Deep-Link |

## 10. i18n-Keys (P0-3 + P2-3 final)

| Key | DE | TR |
|-----|-----|-----|
| `home.actionStack.lineupTitle` | „Aufstellung fehlt" | „Kadro eksik" |
| `home.actionStack.lineupSubtitle` | „Spieltag {n} · in {countdown}" | „Hafta {n} · {countdown} içinde" |
| `home.actionStack.lineupCta` | „Lineup wählen" | „Kadroyu seç" |
| `home.actionStack.captainTitle` | „Kapitän fehlt" | „Kaptan eksik" |
| `home.actionStack.captainSubtitle` | „Verdoppelt deinen besten Score" | „En iyi puanını ikiye katlar" |
| `home.actionStack.captainCta` | „Kapitän wählen" | „Kaptan seç" |
| `home.actionStack.urgentBadge` | „NUR {countdown}" | „SADECE {countdown}" |

## 11. Proof-Plan

| Proof | Artefakt |
|-------|----------|
| Tests grün | `worklog/proofs/264-tests.txt` |
| tsc clean | `worklog/proofs/264-tsc.txt` |
| Mobile-393 Stack URGENT (countdown <6h) | `worklog/proofs/264-stack-urgent.png` |
| Mobile-393 Stack Default (countdown >6h) | `worklog/proofs/264-stack-default.png` |
| Stack hidden (alle Actions erfüllt) | `worklog/proofs/264-stack-hidden.png` |
| Position-Check page.tsx | `worklog/proofs/264-position-check.png` |
| ManagerBlock Lineup-Pill ohne Pulse (Decision J) | `worklog/proofs/264-pill-downgrade.png` |
| Long-TR-String (PM-4 / P2-4) | `worklog/proofs/264-long-string-tr.png` |

## 12. Scope-Out

- **Wildcard-Card** → Slice 264b (Wildcard ist optional)
- **Captain-Deep-Link** → Slice 264c (kein existing Deep-Link, UX-Compromise akzeptiert)
- **Streak-Risk** → Slice 265 (Server-State pflicht)
- **Mission-Progress** → Slice 265
- **Mystery-Box täglich gratis** → eigener Slice post-Phase-2

## 13. Stage-Chain

```
SPEC v1 → Pre-Review REWORK 4xP0+4xP1+4xP2
       → SPEC v2 (jetzt, alle 12 Findings adressiert + Decisions I/J/K)
       → IMPACT skipped
       → BUILD
       → Cold-Context Review post-BUILD
       → PROVE
       → LOG
```

## 14. Pre-Mortem (S/M-Slice = 6 Szenarien)

| # | Was schief gehen könnte | Mitigation |
|---|-------------------------|-----------|
| PM-1 | Stack rendert in Scout-Mode | AC-01 Test, props-derived |
| PM-2 | URGENT-Badge bleibt nach Deadline-Crossing | countdownMs ist props-derived aus locksAtIso, re-render bei nächstem Refetch |
| PM-3 | Visual-Doppelung mit ManagerBlock-Lineup-Pill | Decision J Pill-Downgrade — Pill ohne Pulse, Stack bekommt Pulse-Aufmerksamkeit |
| PM-4 | TR-Wording zu lang für Mobile-Card | qa-visual Long-String-Test (P2-4) |
| PM-5 | Mount-Position falsch | AC-12 Self-Verify mit grep |
| PM-6 | i18n-Konflikt | Decision H grep-verifiziert |
| PM-7 (NEU) | URGENT_THRESHOLD_MS-Refactor bricht Slice 261 GameweekStatusBar | Tests + Self-Verify, Slice 261 hat eigene Tests die mitlaufen |

## 15. Notes

- **Slice 264b Backlog:** Wildcard-Card als optionaler Hint mit `useWildcardBalance` Hook + Show-Condition `wildcardBalance > 0 && heroMode === 'manager'`.
- **Slice 264c Backlog:** Captain-Deep-Link in `/fantasy?tab=lineup&action=captain` — braucht Lineup-Page-Patch.
- **D63 Phase 2 Roadmap:** Slice 265 = Streak-Risk + Mission-Progress (Server-State, IMPACT-Pflicht).
- **D62 Pattern bewährt:** 4. Slice in Folge mit Pre-Review-VOR-BUILD. Hat 4 P0-Findings vor BUILD gefangen (useHomeData-Drift, Mount-Position, TR-Wording-Falle, Defense-Note).
- **Compliance:** Action-Stack im Football-Manager-Register. Kein Asset-Klasse-Vokabular.
- **Slice-Größe-Drift:** Spec v1 sagte S, v2 wuchs zu „S→M" durch Decision I (URGENT_THRESHOLD_MS-Extract → 2 zusätzliche Files) + Decision J (ManagerBlock-Edit) + P0-1 (useHomeData-Edit). Akzeptabel weil alle Edits trivial (1-3 Zeilen pro File).
