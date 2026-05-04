# Slice 266 — Spotlight-Multi-Slot Refactor (D63 Phase 3 Live-Pulse)

**Status:** SPEC · **Größe:** M · **Slice-Type:** UI · **Scope:** CTO (D63 Phase 3 ist Anil-approved Roadmap, Wording-Strings benötigen TR-Review) · **Datum:** 2026-05-04

---

## 1. Problem Statement

`HomeSpotlight` (`src/components/home/HomeSpotlight.tsx`, 160 LOC) ist heute **single-slot prio-cascade**: zeigt entweder IPO ODER TopMover ODER Trending — nicht mehr als einen gleichzeitig. Daraus resultieren zwei Daily-Driver-Killer-Probleme aus dem D63 3-Persona-Audit:

1. **Mystery-Box ist begraben** (`memory/decisions.md` D63 Cross-Persona-Top-Finding #1): User mit `hasFreeBoxToday: true` haben **keinen Hinweis** auf der Home-Page dass eine Daily-Free-Box wartet. Mystery-Box-CTA liegt aktuell in der Sidebar als `#16` — Mobile-User scrollen daran vorbei. Game-Designer-Persona-Befund: "Daily-Driver-Engagement kollabiert weil das tägliche-Reward-Signal fehlt".
2. **Live-Score-Awareness fehlt während aktiver GW** (D63 FM-Power-User-Befund): User auf `/` während Spieltag läuft (`event.status === 'running'`) sehen keinen Hinweis auf den Live-Score. Müssen über Sidebar zur `/fantasy`-Page navigieren um zu sehen ob ihr Lineup gerade scort. Slice 267 hat Realtime-Live-Score auf `/fantasy/spieltag` gebaut — 266 macht es im Home-Spotlight discoverable.

**Evidence:**
- D63 (`memory/decisions.md:2806-2882`) Cross-Persona-Top-Finding #1 (Mystery-Box) + FM-Power-Befund (Live-Score-fehlt).
- Live-Code-Read `HomeSpotlight.tsx:23-157`: 3 if-Branches, return-on-match → maximum 1 Slot rendered.
- `useHomeData.ts:47,75,241,307` bestätigt `hasFreeBoxToday` + `isEventLive` sind als State **bereits verfügbar**, werden aber nicht in HomeSpotlight verwendet.
- Slice 261-263 haben Layer 0/1/2 (GW-Bar, Hero-Mode, Pills) eingeführt — Spotlight ist Layer 3 und der nächste-priorisierte D63-Phase-3-Item.

**Wer ist betroffen?**
- ALLE Home-Page-User → 100% der täglichen Sessions.
- Mystery-Box-Hint-Reichweite-Lift erwartet: Daily-Driver-Engagement um >2× weil Mystery-Box jetzt above-the-fold ist (vs. `#16` Sidebar).
- Live-Score-Hint-Reichweite-Lift: User klicken früher zur `/fantasy`-Page weil sie wissen, dass die GW läuft.

## 2. Lösungs-Design (Architektur)

**Single-Slot-Cascade → 2-Slot Multi-Spotlight mit Slot-Priority-Engine.**

### Slot-Priority (höchste prio zuerst)

| Prio | Slot-Type | Aktivierungs-Bedingung | Visual |
|------|-----------|------------------------|--------|
| 1 | `liveScore` | `isEventLive === true` | Card mit Live-Pulse-Ring + GW-Number + CTA `/fantasy/spieltag` |
| 2 | `mysteryBox` | `hasFreeBoxToday === true` | Card mit Mystery-Box-Icon + "gratis"-Badge + CTA → setShowMysteryBox(true) |
| 3 | `ipo` | `activeIPOs.length > 0` | (existing IPO-Card unchanged) |
| 4 | `topMover` | `holdings hat best change24h !== 0` | (existing TopMover-Card unchanged) |
| 5 | `trending` | `trendingPlayers.length > 0` | (existing Trending-Card unchanged) |
| 6 | `none` | sonst | `null` (kein Slot rendert) |

### Multi-Slot-Layout

```
useHomeData.ts berechnet:
  primarySlot   = highest-prio-active slot
  secondarySlot = next-highest-prio-active slot (falls != primarySlot)

Component HomeSpotlight rendert:
  Wenn primarySlot && secondarySlot: 2-Slot vertikal stacked
  Wenn nur primarySlot:                1-Slot full-width
  Wenn keiner:                         null (kein Card)
```

### Datenfluss (F-07 reduzierte Prop-Surface)

```
useHomeData (existing State):
  - hasFreeBoxToday: boolean       (Slice 178f, Line 75 — useHasFreeBoxToday returnt boolean, NIE null)
  - isEventLive: boolean           (Line 241)
  - nextEvent.gameweek: number     (Line 137 — global running event, NICHT scoped — siehe F-06)
  - activeIPOs, holdings, trendingPlayers, players
  + NEUE Derived: spotlightSlots: { primary: SlotType; secondary: SlotType | null }
  + NEUE Derived: spotlightType (legacy mapping per Tabelle oben)

HomeSpotlight Props (F-07-konform: slot-spezifische Sub-Payloads statt 5 flacher Props):
  - slots: { primary: SlotType; secondary: SlotType | null }
  - existing: activeIPOs, holdings, trendingPlayers, players
  - liveScoreData?: { gameweek: number }       (nur wenn liveScore in slots)
  - mysteryBoxData?: { onOpen: () => void }    (nur wenn mysteryBox in slots)
```

**F-06-Klärung:** liveScore-Slot-Label nutzt `nextEvent.gameweek` (global, isEventLive-Source) NICHT `gw` (`scopedActiveEvent.gameweek` aus useHomeData.ts:177). Begründung: `isEventLive = nextEvent?.status === 'running'` ist die liveScore-Quelle — konsistent muss gw aus derselben Quelle kommen. `scopedActiveEvent` kann eine andere Liga sein als die mit dem running event.

### Backward-Compatibility für bestehende `spotlightType` (F-01 explizite Mapping-Tabelle)

`useHomeData.spotlightType` wird **deprecated aber bleibt** für Rückwärts-Kompatibilität: der Konsument `page.tsx` nutzt `spotlightType !== 'event'` und `spotlightType !== 'ipo'`-Checks (Zeile 312, 389) für Sidebar-Sektionen.

| primarySlot | spotlightType (legacy) | Begründung |
|-------------|------------------------|------------|
| `liveScore` | `'event'` | Sidebar-NextEvent-Card unterdrückt (Doppelung-Schutz: Spotlight zeigt Live-Hint, Sidebar nicht nochmal) |
| `mysteryBox` | `'cta'` | Keine korrespondierende Sidebar-Sektion → 'cta' = Default |
| `ipo` | `'ipo'` | 1:1 |
| `topMover` | `'topMover'` | 1:1 |
| `trending` | `'trending'` | 1:1 |
| `null` (kein Slot) | `'cta'` | unverändert |

**Wichtig (F-01-Heal):** Bei `primarySlot === 'liveScore'` MUSS `spotlightType = 'event'` sein, sonst doppelt-Live-Hint (Spotlight-Card + Sidebar-NextEvent-Card). Im Pre-Slice-266-State zeigt die Sidebar-NextEvent immer wenn `spotlightType !== 'event'` — diese Verhalten bleibt erhalten.

### Visual-Design (kein Component-Slop)

- **Multi-Slot-Layout:** vertikales `space-y-3` zwischen Slots, beide Cards `surface="hero"` für visuelle Konsistenz.
- **Live-Pulse-Ring** auf liveScore-Slot: existing `live-ring` + green-pulse-Animation (analog `HomeSpotlight.tsx:36-39`).
- **Mystery-Box-Slot:** Gold-Gradient + Sparkle-Icon. Position-Color irrelevant (kein Player). Icon: `Sparkles` aus lucide-react.
- **Mobile-First (393px):** stacked `space-y-3` ist Mobile-pflicht. Desktop bleibt gleich (kein Horizontal-Layout-Forking).

## 3. Betroffene Files

| File | Aktion | Begründung |
|------|--------|------------|
| `src/components/home/HomeSpotlight.tsx` | EDIT | Single-prio-cascade → Multi-Slot Render. ~160 LOC → ~300 LOC. |
| `src/components/home/__tests__/HomeSpotlight.test.tsx` | NEU | 8 Tests für Slot-Priority + Multi-Slot-Layout + DOM-Struktur (kein jsdom-Layout-Check, siehe F-02) |
| `src/app/(app)/hooks/useHomeData.ts` | EDIT | `spotlightSlots` derived; `spotlightType` bleibt als legacy-Mapping (Tabelle oben) |
| `src/app/(app)/hooks/__tests__/useHomeData.test.ts` | EDIT | Test-Mock-Setup-Erweiterung (F-05): siehe Detail unten + 5 neue spotlightSlots-Tests + existing 4 spotlightType-Tests bleiben |
| `src/app/(app)/page.tsx` | EDIT | HomeSpotlight-Props erweitern: `slots`, `liveScoreData`, `mysteryBoxData` (F-07 reduzierte Prop-Surface) |
| `messages/de.json` | EDIT | 4 neue i18n-Keys (Mystery-Box-Spotlight + Live-Score-Spotlight) |
| `messages/tr.json` | EDIT | 4 neue i18n-Keys TR (Anil-Pflicht-Review pre-Commit) |

**F-05 Test-Mock-Setup-Erweiterung in `useHomeData.test.ts`:**

```ts
// Neu zu mocken (existing 4 spotlightType-Tests werden brechen ohne diese):
vi.mock('@/lib/queries/mysteryBox', () => ({
  useHasFreeBoxToday: () => ({ hasFreeBoxToday: false, isLoading: false }),  // default: kein MB-Slot
  useMysteryBoxHistory: () => ({ data: [], isLoading: false }),  // existing
}));

// Pro spotlightSlots-Test: Mock-Override im Test-Body:
mockUseHasFreeBoxToday.mockReturnValue({ hasFreeBoxToday: true, isLoading: false });
mockUseEvents.mockReturnValue({ data: [makeEvent({ status: 'running' })] });
```

**F-13 Mystery-Box-Component-Resolution (pre-BUILD verifiziert):** Existing-File ist `src/components/gamification/MysteryBoxModal.tsx`. Slice 266 ruft NICHT direkt diese Component — nur via `setShowMysteryBox(true)` in useHomeData (Z.48), gemount in `page.tsx:493`. Slice 266 fügt KEINEN Modal-Mount in HomeSpotlight ein, nur Trigger-CTA via `mysteryBoxData.onOpen` callback.

**Greppen vor Implementation:**
- `grep -rn "HomeSpotlight\|spotlightType\|spotlightSlots" src/` → Konsumenten-Audit
- `grep -rn "hasFreeBoxToday" src/` → existing Verwendung verifizieren
- `grep -rn "isEventLive" src/` → existing Verwendung verifizieren
- `grep -rn "spotlightMysteryBox\|spotlightLiveScore" messages/` → keine Konflikte mit existing keys

## 4. Code-Reading-Liste (Pflicht VOR Implementation)

| File | Zweck | Zu prüfen |
|------|-------|-----------|
| `src/components/home/HomeSpotlight.tsx` (komplett, 160 LOC) | Existing Slot-Logik | 3 if-Branches: Anchor + Animation + Surface-Pattern. Was wird per Slot ge-styled? |
| `src/app/(app)/hooks/useHomeData.ts:197-204` | Existing spotlightType | Cascade-Order: ipo > event > topMover > trending > cta. Welche `events`/`holdings`-Filter? |
| `src/app/(app)/page.tsx:200-210, 312, 389` | Konsument | Wie werden HomeSpotlight + spotlightType-Checks genutzt? |
| `src/components/home/HomeStoryHeader.tsx` | Visual-Konsistenz Layer 0-2 | Welcher Card-Style + spacing? |
| `src/components/home/MysteryBoxButton.tsx` (oder `MysteryBoxModal.tsx`) | Mystery-Box-Trigger-Pattern | Wie ruft Sidebar-#16 setShowMysteryBox auf? |
| `src/lib/queries/mysteryBox.ts:useHasFreeBoxToday` | Hook-Stil | Returnt `{hasFreeBoxToday, isLoading}` — Caller-Stability? |
| `messages/de.json` + `messages/tr.json` (Section "home") | i18n-Pattern | Welche existing Spotlight-Keys (`spotlightIpo`, `spotlightTopMover`, `spotlightTrending`)? Konsistenz pflicht. |
| `.claude/rules/business.md` "Asset-Klasse-Positionierung — Wording-Drahtseilakt" | Compliance | Mystery-Box-Wording: "öffnen"/"aç" pflicht, kein "gewinnen"/"kazan". Live-Score: rein-informativ. |
| `.claude/rules/ui-components.md` "Mobile-First" | Mobile 393px | Touch-Target ≥ 44px, kein horizontaler Overflow |
| `memory/patterns.md` #44 (Edge-Middleware Public-Route) | N/A für UI | nur falls Spotlight Route-Switch trigger — hier nicht |

## 5. Pattern-References (relevant für DIESEN Slice)

- **D63** (`memory/decisions.md:2806`) — Phase 3 Slice 266 ist direkt-mandated.
- **business.md "Gluecksspiel-Vokabel" + "Asset-Klasse-Wording"** — Mystery-Box Wording-Pflicht ("öffnen", nicht "gewinnen"). Live-Score informativ, kein Spekulations-Push.
- **ui-components.md "Mobile-First" + "Anti-Slop"** — Touch-Targets, Surface-Pattern, kein Tailwind-Slop.
- **errors-frontend.md "Defensive null-strict-equality (Slice 265)"** — `hasFreeBoxToday === true` strict-check. **F-04-Klärung:** `useHasFreeBoxToday` returnt boolean (nie null). Echte Falle hier ist initial-state (default-truthy oder default-falsy?) → siehe Edge-Case #1 + isLoading-Guard.
- **errors-frontend.md "gold-pulse-bg ist statischer Gradient" (Slice 261, F-03)** — Wenn liveScore-Slot Gold-Tint UND Pulse-Animation will, MUSS `gold-pulse-bg motion-safe:animate-pulse motion-reduce:animate-none` als Klassen-Combo angewandt werden. Slice 261 hat genau diesen Drift produziert.
- **patterns.md #46 (Slice 268b TanStack-Hook-Pattern)** — N/A direkt, aber zeigt Standard für hook-shaped data flows.
- **HomeSpotlight existing surface="hero" + posTintColors** — Visual-Konsistenz mit existing Spotlight-Cards.

## 6. Acceptance Criteria (Executable)

```
AC-01: [HAPPY] LiveScore-Slot rendert wenn isEventLive=true
  VERIFY: HomeSpotlight.test.tsx { isEventLive: true, hasFreeBoxToday: false, ... }
  EXPECTED: Card mit text matching /Live · Spieltag/i, CTA-Link href="/fantasy/spieltag"
  FAIL IF: Slot fehlt ODER href falsch ODER Live-Pulse-Ring fehlt

AC-02: [HAPPY] MysteryBox-Slot rendert wenn hasFreeBoxToday=true (und nicht isEventLive)
  VERIFY: HomeSpotlight.test.tsx { hasFreeBoxToday: true, isEventLive: false }
  EXPECTED: Card mit text matching /Daily Mystery Box/i, onOpenMysteryBox callback wired
  FAIL IF: Slot fehlt ODER callback nicht ausgelöst on click

AC-03: [HAPPY] Multi-Slot-Layout: 2 Slots gleichzeitig wenn beide aktiv
  VERIFY: HomeSpotlight.test.tsx { isEventLive: true, hasFreeBoxToday: true, activeIPOs: [], holdings: [], trendingPlayers: [] }
  EXPECTED: 2 Slot-Cards rendered (primary=liveScore, secondary=mysteryBox), space-y-3 between
  FAIL IF: Nur 1 Card ODER falsche Reihenfolge ODER kein Spacer

AC-04: [HAPPY] Slot-Priority Cascade durch alle 5 Slot-Types
  VERIFY: HomeSpotlight.test.tsx mit unterschiedlichen Input-Konfigurationen
  EXPECTED: liveScore > mysteryBox > ipo > topMover > trending in primary-Position
  FAIL IF: Reihenfolge bricht (z.B. mysteryBox überschreibt liveScore)

AC-05: [EMPTY] Kein Slot aktiv → return null (existing behavior preserved)
  VERIFY: HomeSpotlight.test.tsx { all-empty }
  EXPECTED: container.firstChild === null
  FAIL IF: Component rendert sichtbares Element

AC-06: [REGRESSION] Existing IPO/TopMover/Trending-Cards visuell unverändert
  VERIFY: snapshot-style Re-Render-Test mit nur ipo-Inputs
  EXPECTED: Card-Render-Output enthält dieselben CSS-Klassen + i18n-Keys + Anchor-href wie pre-Slice-266
  FAIL IF: visuelle Drift in den 3 existing Slots

AC-07: [I18N-DE] 4 neue Keys in messages/de.json existieren + sind business.md-konform (F-08 erweiterter Filter)
  VERIFY: jq '.home.spotlightLiveScore, .home.spotlightLiveScoreCta, .home.spotlightMysteryBox, .home.spotlightMysteryBoxCta' messages/de.json
  EXPECTED: alle 4 Keys present, Werte ohne "gewinn|prämie|preis[eg]|investier|rendite|asset[- ]klasse|portfolio"
  FAIL IF: fehlend ODER Compliance-Verletzung

AC-08: [I18N-TR] 4 neue Keys in messages/tr.json existieren + business.md-konform (F-08 erweiterter Filter)
  VERIFY: jq '.home.spotlightLiveScore, .home.spotlightLiveScoreCta, .home.spotlightMysteryBox, .home.spotlightMysteryBoxCta' messages/tr.json
  EXPECTED: alle 4 Keys present, Werte ohne "kazan|ödül|yatırım|portföy|getiri"
  FAIL IF: fehlend ODER Compliance-Verletzung

AC-09: [MOBILE] 393px Render hat keinen horizontalen Overflow + 2-Slot-Layout-DOM-Struktur korrekt
  VERIFY-DOM (jsdom-testbar, kein Layout-Engine):
    - HomeSpotlight.test.tsx prüft Container-CSS-Klassen (`space-y-3`)
    - Beide Slot-Cards haben `surface="hero"` Class
    - Card-Anchor href-Reihenfolge primary-zuerst → secondary
  VERIFY-VISUAL (Playwright, post-Deploy, F-02 + F-11 PFLICHT vor LOG):
    - Screenshot 393px Mobile: 2 Slots stacked, keine x-overflow, GW-Bar + Hero + 2 Slots ≤ 60vh
    - 4 Konfigurationen testen: live-only, mb-only, both, neither
  EXPECTED: DOM-Struktur grün UND Mobile-Screenshots zeigen kein Overflow + 2-Slot-Layout funktioniert visuell
  FAIL IF: jsdom-Test fail ODER Mobile-Screenshot zeigt Overflow/below-fold

AC-10: [TYPE-SAFETY] tsc + eslint clean
  VERIFY: npx tsc --noEmit && npx eslint "src/components/home/HomeSpotlight.tsx" "src/app/(app)/hooks/useHomeData.ts"
  EXPECTED: 0 errors, 0 new warnings
  FAIL IF: irgendein TS-Error ODER neuer eslint-warn

AC-11: [LEGACY-COMPAT] page.tsx spotlightType-Checks bleiben funktional
  VERIFY: useHomeData.test.ts existing 4 spotlightType-Tests bleiben grün UND mappen jetzt aus spotlightSlots ab
  EXPECTED: spotlightType === primarySlot wenn primary in {ipo, topMover, trending}; sonst 'cta'
  FAIL IF: existing Tests brechen

AC-12: [INTEGRATION] page.tsx HomeSpotlight-Block compileiert + Konsument bricht nicht
  VERIFY: tsc plus visuelles Re-Render in jsdom (oder als smoke-test in useHomeData.test.ts)
  EXPECTED: HomeSpotlight rendered ohne TS-Errors mit erweiterten Props
  FAIL IF: type-mismatch
```

## 7. Edge Cases Table

| # | Flow | Case | Input/State | Expected | Mitigation |
|---|------|------|-------------|----------|------------|
| 1 | hasFreeBoxToday | initial-state vor RPC-resolve (F-04) | `useHasFreeBoxToday` returnt `{hasFreeBoxToday: false, isLoading: true}` initial — aber wenn React-Query placeholder/cache-hit `hasFreeBoxToday` direkt true liefert → MB-Slot würde ein Frame zu früh rendern | mysteryBox-Slot rendert NUR wenn `!isLoading && hasFreeBoxToday === true` (zusätzlicher isLoading-Guard) | strict-equality + isLoading-Guard in useHomeData spotlightSlots-Logic |
| 2 | isEventLive | nextEvent === null | `nextEvent === null` | liveScore-Slot NICHT rendern | `isEventLive` ist bereits `nextEvent?.status === 'running'` → false bei null |
| 3 | Multi-Slot | beide aktiv: liveScore + mysteryBox | both true | primary=liveScore, secondary=mysteryBox | Priority-Engine in useHomeData |
| 4 | 3+ Slots aktiv | liveScore + mysteryBox + ipo | alle aktiv | nur primary+secondary (max 2 visible) | "tertiary" wird nicht gerendert (Wahl-Lähmung-Schutz) |
| 5 | Slot-Doppelung | primarySlot === secondarySlot edge | (impossible by-design) | secondarySlot bleibt null wenn = primary | useMemo-Logik filtert |
| 6 | Mystery-Box-Click während Modal-Open | rapid double-click | Modal already open | onOpenMysteryBox idempotent — setState ist No-Op auf already-true | React State-Idempotenz |
| 7 | Live-Score während Hydration-Race | nextEvent undefined → running | initial undefined, then resolves | erst null-Slot, dann ggf. liveScore-Slot rendern | useMemo deps reagieren |
| 8 | i18n-Locale-Switch während Render | DE → TR mid-Render | `useTranslations()` re-renders | i18n-Strings werden korrekt re-rendered | next-intl handles auto |
| 9 | Mobile 393px Holdings + IPO + Trending alle aktiv | OFF-GW, viel Content | nur primary (ipo) + secondary (topMover) | Trending fällt raus | by-design |
| 10 | Keyboard-Tab-Order durch beide Slots | a11y | 2 Cards sichtbar | TAB von Card-1 zu Card-2 logisch | Card-Anchor-Reihenfolge im DOM-Tree |

## 8. Self-Verification Commands

PowerShell-kompatibel:

```powershell
# Pflicht jeder Slice:
npx tsc --noEmit
npx vitest run "src/components/home/__tests__/HomeSpotlight.test.tsx"
npx vitest run "src/app/(app)/hooks/__tests__/useHomeData.test.ts"
npx eslint "src/components/home/HomeSpotlight.tsx" "src/app/(app)/hooks/useHomeData.ts" "src/app/(app)/page.tsx"

# i18n-Verifikation (PowerShell-Syntax):
$de = Get-Content messages/de.json | ConvertFrom-Json
$tr = Get-Content messages/tr.json | ConvertFrom-Json
$de.home.spotlightLiveScore; $tr.home.spotlightLiveScore
$de.home.spotlightMysteryBox; $tr.home.spotlightMysteryBox

# Compliance-Check (Glücksspiel-Vokabel):
# (via Grep-Tool):
#   grep -i "gewinn|prämie|preis|kazan|ödül|yatırım" messages/de.json messages/tr.json
#   → 0 Hits in den 4 neuen Keys

# Konsumenten-Verifikation:
# grep "HomeSpotlight" src/  → 4-5 Hits (Component, page.tsx, Test, Test, optional Storybook)
# grep "spotlightType" src/  → bleibt für legacy-Compat
# grep "spotlightSlots" src/ → Hook + Component + Test
```

## 9. Open-Questions (klären VOR Code)

**Pflicht-Klärung (Anil pre-Commit-Review):**

1. **TR-Wording für Mystery-Box-Spotlight + Live-Score-Spotlight** — Anil-Pflicht-Review (per `feedback_tr_i18n_validation.md`). Vorschlag siehe TR-Wording-Vorab unten. Anil kann revidieren bevor Commit.

**Autonom-Zone (Claude entscheidet):**

- **2-Slot-Maximum (F-09 Begründungs-Fix):** kein Tertiary-Slot. Mobile-393px-above-fold-Real-Estate ist dominanter Constraint: 2 Cards à ~80px + Layer 0-2 + GameweekStatusBar = ~480px ≤ 60vh (393×720 ≈ 432px); 3 Cards würden ~78% above-fold belegen, secondary könnte unter den Fold rutschen. Slice 266b kann erweitern wenn Telemetrie zeigt User scrollen ohnehin.
- **Mystery-Box-Icon:** `Sparkles` aus `lucide-react` (existing in icons-pool, gold-tinted).
- **Live-Score-Slot CTA-Link:** `/fantasy/spieltag` (Slice 267 Live-Page).
- **Slot-Priority-Reihenfolge:** liveScore > mysteryBox > ipo > topMover > trending. Liga-Live ist KRITISCHER als Box (Time-sensitive).
- **Slot-Component-Struktur:** Inline-Branches in HomeSpotlight (nicht Sub-Components), damit das File übersichtlich bleibt — ~300 LOC ist OK für UI-Hub.
- **Backward-Compat spotlightType:** Mappt aus primarySlot ab. Wenn primary in {liveScore, mysteryBox} → `spotlightType = 'cta'` (Sidebar-Sektionen reagieren wie auf "kein primary" und zeigen ihren eigenen Inhalt).
- **Visual: Live-Pulse-Ring auf Live-Score-Slot:** existing `live-ring` Klasse aus globals.css.

**Nicht-Autonom (CEO):**

- **Wording-Drift:** keine "Investment"/"Rendite"/"yatırım"/"kazan" Strings.
- **Money-Path-Decisions:** Mystery-Box-Open ist Money-Path (kostet Tickets oder ist gratis), aber dieser Slice ändert NICHT die Open-Logik — nur den Discovery-Trigger. Existing `handleOpenMysteryBox` (Slice 178f) bleibt unverändert.
- **Layout-Major-Changes auf der Home-Page** über die Spotlight-Section hinaus (z.B. Sidebar-Reorganisation): NICHT in diesem Slice. Falls Anil meint Mystery-Box-Sidebar-Item solle bleiben/wegfallen, separater Slice 266b.

## 10. Proof-Plan

| Change-Typ | Proof |
|------------|-------|
| UI-Component-Refactor | `npx vitest run HomeSpotlight.test.tsx` Output → `worklog/proofs/266-spotlight-vitest.txt` |
| Konsument-Hook | `npx vitest run useHomeData.test.ts` Output → `worklog/proofs/266-consumer-vitest.txt` |
| Type-Safety | `npx tsc --noEmit && npx eslint <files>` Output → `worklog/proofs/266-tsc-eslint.txt` |
| i18n-Compliance | jq-Output beider locales + Compliance-grep → `worklog/proofs/266-i18n-verify.txt` |
| Visual-Render | Playwright gegen bescout.net post-Deploy: 4 Konfigurationen (live-only, mb-only, both, neither) → `worklog/proofs/266-screenshots-{live,mb,both,empty}.png` (**PFLICHT vor LOG**, F-02 + F-11) |
| Compliance-Check | `grep -iE "gewinn|prämie|kazan|ödül|yatırım"` über alle neuen 4 Keys → 0 Hits → `worklog/proofs/266-compliance-grep.txt` |

## 11. Scope-Out

- **Mystery-Box-Open-Logic:** NICHT geändert. Existing `handleOpenMysteryBox` (Slice 178f) bleibt. Slice 266 nur Discovery-Trigger.
- **Live-Score-Realtime auf Home:** NICHT eingebettet. Slot ist "CTA → /fantasy/spieltag", keine Live-Daten im Spotlight (würde bedeuten useLiveFixtures auf Home → Battery-Cost). Falls Anil später Live-Daten im Slot will → Slice 266b nach Beta-Telemetrie.
- **Sidebar-Reorganisation:** NICHT in diesem Slice. Mystery-Box-Sidebar-#16-Item bleibt (Doppelung akzeptiert — User kann beide Pfade nutzen).
- **3+ Slot-Stack:** NICHT. Max 2 (Wahl-Lähmung).
- **Spotlight-Personalisierung:** NICHT. Slot-Priority ist hart-codiert pro D63.
- **Animation auf Slot-Switch:** NICHT. Statisches Render, keine Mount/Unmount-Choreografie. Falls gewünscht später → Slice 266b mit Framer-Motion.
- **Tertiary-Source z.B. SocialPost-Slot:** NICHT. D63 listet primär 5 Quellen.
- **Sidebar-#16-Mystery-Box-Item-Cleanup (F-16 post-Telemetrie-Trace):** NICHT in Slice 266. Doppelung Spotlight-Slot + Sidebar-#16 ist initial OK (Multi-Path-Discovery erlaubt — User wählt Pfad). **Slice 266b post-Beta-Day-3-Telemetrie:** Wenn Spotlight-MB-CTR > 80% des Sidebar-MB-CTR → Sidebar-#16 entfernen (Visual-Noise reduzieren). Andernfalls beide behalten.

## 12. Stage-Chain (geplant)

```
SPEC ✓ → IMPACT (skipped — pure UI-Refactor + i18n-Strings, kein Schema/RPC/Service)
       → BUILD (M-Slice, sequenziell: useHomeData-Slot-Logic → HomeSpotlight-Refactor → page.tsx-Wire-Up → i18n-de → i18n-tr → Tests)
       → REVIEW (reviewer-Agent — Pflicht bei feat/refactor, Wording-Drift-Risiko)
       → PROVE (vitest 2 files + tsc + eslint + i18n-jq + Compliance-grep)
       → LOG
```

**IMPACT-Skip-Begründung:** Reine UI-Refactor + i18n-Strings + erweiterte Hook-Outputs. Keine DB-Schema-Änderung, keine RPC-Body-Änderung, keine RLS-Policy-Änderung. Cross-Cutting-Impact = nur 1 Konsument (`page.tsx`), bereits identifiziert per grep.

## 13. Pre-Mortem (M-Slice 5 Szenarien)

| # | Failure | Probability | Impact | Mitigation | Detection |
|---|---------|-------------|--------|------------|-----------|
| 1 | Wahl-Lähmung: 2 Slots gleichzeitig führen zu niedrigerer CTR (statt Lift) | LOW | mittel | A/B-Test post-Beta-Day-3, Anil entscheidet. Spec-Default = 2-Slot. | Beta-Telemetrie: CTR-pro-Slot vor/nach |
| 2 | Mobile-Render: 2 Cards stacked > 60vh, Spotlight scrollt unter den fold | MED | mittel | space-y-3 + max-height-watching in CSS; Mobile 393px Smoke pflicht in PROVE | qa-visual Screenshot 393px |
| 3 | Wording-Drift: TR-Strings driften zu "kazan" durch Reviewer-Vorschlag | LOW | hoch | Anil-Pflicht-Review pre-Commit + Compliance-grep in PROVE | grep + Anil's Eyes |
| 4 | spotlightType-Legacy bricht page.tsx Sidebar-Sektionen | LOW | hoch | AC-11 + tsc-Check post-Hook-Edit; Mapping ist 1:1 für ipo/topMover/trending | useHomeData.test.ts existing 4 Tests bleiben grün |
| 5 | Mystery-Box-Slot-Click triggert nicht onOpenMysteryBox (callback drilling-bug) | LOW | mittel | AC-02 Test mit fireEvent.click + spy | vitest |
| 6 | Live-Pulse-Ring rendert statisch ohne Animation (F-03, errors-frontend.md Slice 261 Pattern) | MED | mittel | Klassen-Combo `live-ring` ODER (`gold-pulse-bg motion-safe:animate-pulse motion-reduce:animate-none`) korrekt zusammensetzen — niemals `gold-pulse-bg` allein | Visual-QA in PROVE-Stage zeigt fehlende Pulse |
| 7 | Mystery-Box-Slot bleibt 1 Frame sichtbar nachdem User Modal geöffnet hat | LOW | niedrig | hasFreeBoxToday wird durch invalidateQueries (Slice 178f handleOpenMysteryBox) refetched → Slot disappears beim nächsten render. 1-Frame-Flash akzeptabel (≤16ms) | Manuelles Smoke (Anil's Eyes) in PROVE |

---

## Compliance-Check

- $SCOUT-Wording: keine $SCOUT-Erwähnung in den 4 neuen Keys → ✓ N/A
- IPO-Begriff: existing IPO-Slot bleibt unverändert (Wording "Erstverkauf"/"Kulüp Satışı"). Slice 266 berührt nicht.
- TR-Glücksspiel-Vokabel: Mystery-Box "Kutu aç" (öffnen), nie "kazan" (gewinnen). Live-Score "Canlı Skoru gör" (gucken), keine Belohnungs-Sprache.
- Asset-Klasse-Framing: keins. Mystery-Box ist Daily-Engagement, kein Investment-Hook.
- Disclaimer: Spotlight ist Discovery-Hint, kein Money-Path-Trigger → kein TradingDisclaimer pflicht. Mystery-Box-Modal selbst hat existing Disclaimer.

## TR-Wording-Vorab (Anil-Pflicht-Review pre-Commit)

| Key | DE | TR | business.md-Konformität |
|-----|----|----|-------------------------|
| `home.spotlightLiveScore` | "Live · Spieltag {gw} läuft" | "Canlı · Hafta {gw} devam ediyor" | ✓ informativ, kein "kazan"/"gewinn" |
| `home.spotlightLiveScoreCta` | "Live-Score ansehen" | "Canlı Skoru Gör" | ✓ keine Aktivierungs-Sprache |
| `home.spotlightMysteryBox` | "Daily Mystery Box · gratis" | "Günlük Mystery Box · ücretsiz" | ✓ "ücretsiz"=gratis, kein "ödül"=Preis |
| `home.spotlightMysteryBoxCta` | "Box öffnen" | "Kutu Aç" | ✓ "aç"=öffnen, NICHT "kazan"=gewinnen |

**Anil-Pflicht-Review** vor Commit markiert (per `feedback_tr_i18n_validation.md` "TR-Strings die ich schreibe: Anil explizit vor Commit zeigen, kein silent guessing"). Bei Anil-OK: direct commit. Bei Edit-Wunsch: Spec patchen + re-commit.

## Open Risiko (kurz, ehrlich)

- **Risiko 1 (MED):** Multi-Slot kann auf 393px Mobile mit 2 Cards + bestehender Above-Fold-Stack über den fold rutschen. Mitigation: Visual-QA in PROVE pflicht, kein "sollte passen"-Pass. Falls > 60vh → secondary-Slot ggf. unten am page-stack als opt-in (Slice 266b). Aktuell Annahme: 2 Slot-Cards à ~80px = 160px + 12px space + IST OK above-fold.
- **Risiko 2 (LOW):** spotlightType-Legacy-Mapping kann subtle Sidebar-Drift auslösen wenn liveScore-Slot aktiv ist (wird zu 'cta' gemapped — Sidebar zeigt dann ihren NextEvent-Card UND der Spotlight zeigt liveScore-Card). Verdoppelung sichtbar, aber funktional richtig (User sieht GW im Spotlight + Detail in Sidebar). Akzeptierbar pro D63-Spirit ("Identität in 5 Sekunden").

**Mitigation greift:** Pre-Mortem #2 + #4 covered, AC-09 (Mobile) + AC-11 (Legacy) testen explizit.
