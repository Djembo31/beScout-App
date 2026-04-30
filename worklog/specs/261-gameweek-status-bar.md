# Slice 261 — Home Layer 0: Gameweek-Status-Bar (Spec-v2)

**Status:** SPEC v2 (post-D62-Pre-Review-REWORK) · **Größe:** S (5 Files, klar abgegrenzt) · **Slice-Type:** UI · **Scope:** CTO (Home-Redesign Phase 1) · **Datum:** 2026-05-01

> **v2.1-Changelog (post-Reviewer-2nd-Pass-CONCERNS):**
> - **P0-NEW-1 Fix (Mapper-Drift):** `useFantasyEvents`-Mapper liefert `leagueId` heute NICHT. CTO-Decision: BUILD enthält 1-Zeilen-Mapper-Patch in `src/features/fantasy/mappers/eventMapper.ts` nach Zeile 77 (`leagueId: clubLookup?.league_id ?? undefined`). Sauberer als Fallback-Pattern, FantasyEvent.leagueId wird Single-Source.
> - **P1-NEW-2 Fix:** AC-04 EXPECTED-Format ergänzt (`Xh Ym` für <24h, helper-konform).
> - **P2-NEW-3 Fix:** `helpers.ts` → `helpers.tsx` korrigiert.
>
> **v2-Changelog (post-Reviewer-Pre-Review-1st-Pass-REWORK):**
> - 4 P0-Fixes adressiert (z-index, league_id-Filter, locale-Decision, layout)
> - 6 P1-Fixes adressiert (Cold-Start-Skeleton, AC-09 realistic, multi-tab/bfcache, i18n-Audit-Command, DE-Wording-Codebase-konsistenz, Pre-Existing-Drift-Audit)
> - **B=b Scope-Erweiterung:** HomeSpotlight Event-Branch entfernt (Bar = primärer GW-Layer, Spotlight = Markt/IPO/Trending only)
> - Anil-Decisions: A=b („2d 4h" beide Locales), B=b (Bar ersetzt Spotlight-Event), C=ja (TR „Hafta 28")

---

## 1. Problem Statement

**Heute:** Home-Page hat keine GW-Awareness im oberen Bereich. GW-Deadline + Liga-Kontext nur in Sidebar (NextEvent-Card) oder Spotlight (Priority 2 Event-Slot) — beide conditional + scrollabhängig + redundant zueinander (3 Render-Layer für gleiche Info).

**Evidence:**
- FM-Power-User-Expert-Hat (Session 2026-04-30): „Persistent GW-Banner fehlt — FPL/Comunio haben oben permanent: GW28 · Deadline Sa 13:30. BeScout zeigt das nur als NextEvent-Card."
- Game-Designer-Expert-Hat: „Streak-Loss-Aversion + Captain-Pick-Reminder fehlen above-fold."
- Anil-Plan-Approval 2026-04-30: „kontextueller Hero" — Phase 1 Identity-Foundation startet mit GW-Bar.
- Reviewer-Pre-Review (D62, 2026-05-01): Bar wird primärer GW-Layer, Spotlight-Event-Branch wird entfernt (B=b Anil-Decision).

**Wer ist betroffen, wie oft?**
Alle aktiven Fantasy-User mit followed-Liga + aktiver GW. Täglich während GW-Cycle. Beta-Day-3 mit 3 Testern: mind. 1 testet `/fantasy`-Path → erlebt direkt: „Wann ist Deadline?" muss er googeln oder zu `/fantasy` navigieren.

## 2. Lösungs-Design (Architektur)

**Neue Component** `<GameweekStatusBar />` rendert **innerhalb** des `HomeStoryHeader`-Edge-zu-Edge-Wrappers, **vor** dem `<div className="relative z-10">`-Content. Das vermeidet Negative-Margin-Konflikt (P0-4) und nutzt den existing Stadium-BG als visuelle Hülle.

```
SICHTBAR wenn:
  user authentifiziert
  UND useLeagueScope().hydrated === true
  UND scopedLeagueId existiert
  UND mind. 1 Event in dieser Liga hat status ∈ {registering, late-reg, running}
NICHT SICHTBAR (return null) wenn:
  unauthenticated / hydrating / 0 scoped league / no active event
SKELETON-RESERVE (kein Layout-Shift) wenn:
  hydrated=false ODER events-loading (vor erstem cache-hit)
```

**Datenfluss (vor):** Home → useEvents → memo `nextEvent` → in 2 Layern gerendert (Spotlight Priority-2 + Sidebar NextEvent-Card).

**Datenfluss (nach):** Home → `<GameweekStatusBar />` self-contained → liest `useLeagueScope()` (SSOT) + `useFantasyEvents()` (mapped FantasyEvent[] mit `leagueId`) + `useUser()` → derived `barEvent` (erstes registering|late-reg|running event der scoped league) → render compact bar mit Liga-Logo + GW-Number + Liga-Name + Status + Countdown. **Spotlight zeigt KEINEN Event mehr** (Priority-2-Branch entfernt → Spotlight = IPO|TopMover|Trending|null). **Sidebar-NextEvent-Card bleibt** (B=b nur Spotlight ersetzen, nicht Sidebar).

**State-Sources (alle existing):**
- `useLeagueScope()` — leagueId/leagueName/countryCode (SSOT)
- `useFantasyEvents()` — mapped FantasyEvent[]. **WICHTIG (v2.1):** Mapper in `eventMapper.ts:18-79` setzt `leagueShort/leagueLogoUrl/leagueCountry` aber HEUTE NICHT `leagueId`. BUILD enthält Mini-Patch in eventMapper.ts (1 Zeile nach Zeile 77): `leagueId: clubLookup?.league_id ?? undefined`. Damit wird FantasyEvent.leagueId Single-Source und Filter `e.leagueId === scopedLeagueId` funktioniert clean.
- `getTimeUntil()` — bereits in `@/components/home/helpers.tsx` (Anil-Decision A=b: hardcoded „2d 4h" akzeptiert für beide Locales, FPL-Konvention)

**Component-Shape:**
```tsx
type GameweekStatusBarProps = {}; // self-contained
function GameweekStatusBar(): JSX.Element | null;
```

**Layout-Mount-Pattern (P0-4 Fix):**
```tsx
// HomeStoryHeader.tsx wird umgebaut, Bar als ersten child render:
<div className="relative -mx-4 -mt-4 lg:-mx-6 lg:-mt-6 px-4 pt-6 pb-6 lg:px-6 lg:pt-8 lg:pb-8 bg-hero-stadium overflow-hidden">
  <GameweekStatusBar /> {/* NEW — innerhalb Edge-zu-Edge-Wrapper */}
  <div className="absolute inset-0 bg-hero-vignette pointer-events-none" />
  <div className="relative z-10">
    {/* existing greeting/hero-number/pills */}
  </div>
</div>
```

Bar **non-sticky** (P0-1 Fix): Bar scrollt mit der Page. TopBar bleibt persistent. Dies vermeidet z-index-Konflikt (TopBar ist `z-30`, hätte mit Bar geclasht). FPL/Comunio haben Bar auch non-sticky innerhalb Hero — Konvention-konsistent.

**Visual:**
- Höhe: **44px Mobile / 48px Desktop** (P2-1 Fix: ui-components.md min-44px touch-target)
- BG: kleines `linear-gradient(90deg, ...)` Pill innerhalb Hero, Liga-spezifisch + leichter Glow
- Layout: `[Liga-Logo 24px] · Spieltag 28 · Süper Lig · ⏰ 2d 4h    →`
- Bei Deadline `<6h`: `gold-pulse-bg` Animation + roter Countdown-Text + `motion-reduce:animate-none` (P3-2)
- Bei `running` (Live-GW): Gold-Pulse + 🔴 LIVE-Badge statt Countdown, zeigt `getTimeUntil(ends_at)`
- Klick → `<Link href="/fantasy" prefetch={false}>` (P3-1: kein Background-Prefetch). Code-Reading verifiziert ob `/fantasy/spieltag` als Route existiert; falls ja → dorthin
- `aria-live="polite"` auf Countdown-Span (P3-3)

**Spotlight-Edit (B=b Scope):**
`src/components/home/HomeSpotlight.tsx` Priority-2-Branch (Zeilen 77-117 „Active Fantasy Event") entfernen. Component-Cascade wird auf 4 Priorities (IPO → eigene Top-Mover → Trending → null). Existing-Test (falls vorhanden) anpassen.

## 3. Betroffene Files

| File | Aktion | Begründung |
|------|--------|------------|
| `src/components/home/GameweekStatusBar.tsx` | NEU | Component selbst |
| `src/components/home/HomeStoryHeader.tsx` | EDIT | Mount Bar als ersten child innerhalb Edge-zu-Edge-Wrapper |
| `src/components/home/HomeSpotlight.tsx` | EDIT | Priority-2-Event-Branch entfernen (B=b Scope) |
| `src/features/fantasy/mappers/eventMapper.ts` | EDIT | 1-Zeilen-Patch nach Zeile 77: `leagueId: clubLookup?.league_id ?? undefined` (P0-NEW-1 Fix v2.1) |
| `messages/de.json` | EDIT | i18n-Keys (`home.gwBar.*`) |
| `messages/tr.json` | EDIT | TR-Keys, Anil-Pflicht-Review (Hafta 28 + Canlı + kalan süre) |

**Keine Änderung:** `src/app/(app)/page.tsx` (Mount erfolgt im HomeStoryHeader, page-level unverändert).

**Vor BUILD greppt man:**
```bash
grep -rn "useFantasyEvents\|useEvents" src/components/home/  # State-Source bestätigt
grep -rn "starts_at\|ends_at\|gold-pulse-bg\|LIVE" src/components/home/  # P1-6 Pre-Existing-Drift-Audit
grep -rn "<HomeSpotlight" src/  # Spotlight-Konsumenten — nur 1: page.tsx
```

## 4. Code-Reading-Liste (PFLICHT VOR Implementation)

| File | Zweck | Zu prüfen |
|------|-------|-----------|
| `src/components/layout/TopBar.tsx:119` | z-index-Wahrheit | TopBar ist `z-30`, Bar muss non-sticky sein (P0-1) |
| `src/components/home/HomeStoryHeader.tsx:45` | Edge-zu-Edge-Wrapper | `-mx-4 -mt-4 lg:-mx-6 lg:-mt-6` — Bar mountet INNERHALB (P0-4) |
| `src/types/index.ts:701-743` | DbEvent vs FantasyEvent | `DbEvent.league_id?` vs `FantasyEvent.leagueId` — welcher Hook liefert was? |
| `src/features/fantasy/hooks/useFantasyEvents.ts` | useFantasyEvents-Signatur | Returns FantasyEvent[]. Hook existiert (verifiziert in 2nd-Review). |
| `src/features/fantasy/mappers/eventMapper.ts:18-79` | event-mapper Realität | `leagueShort/leagueLogoUrl/leagueCountry` werden gesetzt, `leagueId` heute NICHT. v2.1 BUILD-Patch: 1 Zeile nach Zeile 77. |
| `src/features/fantasy/hooks/useGameweek.ts` | Slice 254 Heal-v2 + bfcache-Pattern | `pageshow`-Listener aus Zeilen 38-48 — Bar nicht eigene Variante, verlässt sich auf parent useEvents-staleTime |
| `src/features/shared/store/leagueScopeStore.ts:147` | hydrated-Trigger | `hydrateFromCascade` — wird im ClubProvider getriggert? Skeleton-Reserve nötig (P1-1) |
| `src/lib/queries/events.ts` | useEvents-Signature | staleTime 1min ist OK für Bar (bewusster Trade-Off vs. Realtime, P1-3) |
| `src/components/home/HomeSpotlight.tsx:77-117` | Priority-2-Event-Branch | Vollständig entfernen (B=b Scope) |
| `src/components/home/HomeStoryHeader.tsx:1-148` | bestehender Hero | Mount-Punkt für Bar, BG-Pattern verstehen |
| `src/components/home/helpers.tsx` | getTimeUntil | hardcoded Format-Switch: ≥24h → `Xd Yh`, <24h → `Xh Ym`. AC-04 berücksichtigt das. A=b „2d 4h" / „4h 30m" akzeptiert |
| `messages/de.json` (search „Spieltag\|spieltag") | DE-Wording-Codebase | Konvention bestätigt: „Spieltag" (de.json:69, 252, 3833) — Open-Q #2 erledigt |
| `messages/tr.json` (search „Hafta") | TR-Wording-Codebase | „Hafta" Konvention bestätigt (de.json:2846, 3971, 4644) — Anil-approved |
| `.claude/rules/errors-frontend.md` Liga/Context-Switch + Cache-Invalidation | Slice 254 Bug-Klasse | Stateless-Component, kein Init-Effect |
| `.claude/rules/ui-components.md` Mobile-First + Sticky | Touch-Target 44px + safe-area + animation-rules | min-44px, motion-reduce |

## 5. Pattern-References

- **`errors-frontend.md` Liga/Context-Switch State-Reset (Slice 254)** — Stateless-Render-from-Hooks-Pattern, kein Pin-Risk via Init-Effect.
- **`errors-frontend.md` Cache-Invalidation Root-Prefix (Slice 254)** — leagueScopeStore invalidiert `['events']` automatisch → Bar refetched bei Liga-Switch ohne eigenen Code.
- **`errors-frontend.md` Hardcoded German addToast/Error-Strings (Slice 196 Track B)** — Bar wirft keine Toasts (read-only-render), aber Audit-CI im Self-Verification adden.
- **`errors-frontend.md` Missing i18n-Key bei neuer CTA-Component (Slice 198)** — Audit-Command in § 8 mit `grep -oE` über ALL keys.
- **`errors-frontend.md` Polish-Audit Pre-Existing-Code-Drift (Slice 200a)** — Code-Reading erweitert um existing GW-Awareness-Search (P1-6).
- **`patterns.md` Slice 254 prevContextRef-Pattern** — relevant ABER nicht angewendet weil Bar stateless ist (kein manualOverride).
- **`ui-components.md` Mobile-First** — min-44px, sticky+safe-area, motion-reduce.
- **`ui-components.md` Tailwind data-* Variants nur auf Tailwind-Utilities (Slice 181)** — wenn `gold-pulse-bg` als data-state-Variant verwendet → in @layer utilities-Pflicht prüfen.
- **`EventCategoryCards.tsx` Visual-Pattern** — Multi-Layer-Gradient-Inspiration (Stadium-Photo erst Phase 5).
- **`business.md` Wording-Compliance** — kein Money-Path, kein IPO-Wording. TR-Pflicht: kein „kazan*". Bar = neutral.

## 6. Acceptance Criteria (Executable)

```
AC-01: [HAPPY] User mit followed-Liga + aktiver GW sieht Bar
  VERIFY: Login als Test-User mit followed Süper Lig + aktive Süper-Lig-GW (status='registering')
  EXPECTED: Bar oben sichtbar mit "[Logo] Spieltag 28 · Süper Lig · 2d 4h"
  FAIL IF: Bar nicht sichtbar / falsche GW / falsche Liga

AC-02: [EMPTY] User ohne scoped Liga sieht KEINE Bar (return null)
  VERIFY: Login als New-User (leagueScope hydrated mit leagueId=null)
  EXPECTED: GameweekStatusBar rendert null, Hero direkt am Top, kein Layout-Shift
  FAIL IF: Leere Bar oder JS-Error oder Skeleton-Permanent

AC-03: [LOADING] Während leagueScope.hydrated=false sieht User Skeleton-Reserve
  VERIFY: Cold-Start Mobile-Safari Inkognito → Hard-Refresh → erste 200-500ms beobachten
  EXPECTED: 44px-Höhe Skeleton (bg-bg-main / surface-minimal) → Pop-In zur echten Bar OHNE Layout-Shift
  FAIL IF: null während hydration → Hero springt nach unten beim Mount der Bar

AC-04: [URGENT] Deadline <6h triggert gold-pulse-bg + roter Countdown
  VERIFY: SQL set events.starts_at = now() + 5h für scoped league, status='late-reg', Mobile-Safari Login
  EXPECTED: Bar mit gold-pulse-bg-Animation + Countdown-Text Format `Xh Ym` (z.B. "4h 30m", helper-konform für <24h) in text-red-400 + motion-reduce honored
  FAIL IF: Kein Pulse / falsche Farbe / Animation läuft trotz prefers-reduced-motion / falsches Format

AC-05: [LIVE] Status='running' zeigt LIVE-Badge + ends_at-Countdown
  VERIFY: Mock event.status='running', ends_at=now()+2h, Login
  EXPECTED: Bar mit "🔴 LIVE" Badge + Countdown zu ends_at (2h 0m), gold-pulse-bg
  FAIL IF: Zeigt starts_at / kein LIVE-Badge

AC-06: [I18N-DE] Deutsche Strings korrekt
  VERIFY: locale='de', Bar sichtbar
  EXPECTED: "Spieltag 28 · Süper Lig · 2d 4h" — Codebase-Konsistenz "Spieltag" (de.json:69+252+3833)
  FAIL IF: Raw i18n-key, oder "GW28", oder englischer Fallback

AC-07: [I18N-TR] Türkische Strings korrekt + business.md-konform
  VERIFY: locale='tr', Bar sichtbar
  EXPECTED: "Hafta 28 · Süper Lig · 2d 4h" — Anil-approved Hafta + neutral „d/h"
  FAIL IF: kazan/yatırım/kar-Wörter, oder "Spieltag"-Fallback

AC-08: [MOBILE] 393px kein Overflow bei pathologischem Liga-Name
  VERIFY: Chrome DevTools 393px width, Login mit followed "TFF 1. Lig" + GW100 + ⏰ 5d 23h
  EXPECTED: Liga-Name truncate-with-ellipsis (zuerst), GW-Nummer + Countdown pflicht-sichtbar
  FAIL IF: Horizontal-scroll oder content abgeschnitten

AC-09: [REGRESSION-Liga-Switch] Liga-Switch via /fantasy aktualisiert Bar auf Home
  VERIFY: User followed in 2 Ligen mit aktiven GWs.
    1. Login → Home → Bar zeigt Süper Lig
    2. Navigate to /fantasy → Liga-Selector → switch zu Bundesliga
    3. Navigate back to / (Home)
  EXPECTED: Bar zeigt jetzt Bundesliga-GW (oder verschwindet wenn Bundesliga keine aktive GW hat)
  FAIL IF: Bar bleibt auf Süper Lig stale (Slice-254-Bug-Klasse-Regression)
  NOTE: Liga-Selector ist nicht auf Home gemounted (LeagueScopeHeader fehlt) → Test via /fantasy roundtrip

AC-10: [CLICK] Klick auf Bar navigiert zu /fantasy
  VERIFY: Click auf Bar
  EXPECTED: router.push('/fantasy') (oder '/fantasy/spieltag' wenn Pfad existiert — Code-Reading)
  FAIL IF: Kein Navigation / falscher Pfad

AC-11: [SPOTLIGHT-DEPRECATION] Spotlight zeigt KEINEN Event mehr (B=b Scope)
  VERIFY: User mit aktiver GW + KEINE aktive IPO + KEINE Holdings
  EXPECTED: Spotlight returnt null oder zeigt Trending (4. Priority) — NICHT Event-Card mehr
  FAIL IF: Event-Card erscheint im Spotlight (B=b nicht implementiert)
```

## 7. Edge Cases Table

| # | Flow | Case | Input/State | Expected | Mitigation |
|---|------|------|-------------|----------|------------|
| 1 | Render | unauth user | `useUser().user === null` | Bar = null | Top-level guard `if (!uid) return null` |
| 2 | Render | leagueScope hydrating | `hydrated === false` | 44px-Skeleton (NICHT null) | P1-1 Fix: Skeleton-Reserve gegen Layout-Shift |
| 3 | Render | leagueId existiert aber events array empty | filter ergibt empty | Bar = null | Render-guard nach Filter |
| 4 | Render | events alle ended/scoring | filter ergibt 0 active | Bar = null | Same — render-guard |
| 5 | Time | starts_at in past, status='registering' | data-bug | `getTimeUntil` returns "0m" → Bar zeigt fallback-Text "Anmeldung läuft" | i18n-Key `gwBar.deadlinePassedFallback` |
| 6 | Time | ends_at in past, status='running' | data-bug | LIVE-Badge ohne Countdown ODER fallback-Text | Same fallback-Pattern |
| 7 | Locale | locale='tr' formatTimeUntil-Output | `2d 4h` (A=b: hardcoded, OK in beiden) | Same in DE+TR | Anil-Decision A=b dokumentiert als FPL-Konvention |
| 8 | Multi-Liga | user followed 3 Ligen, 2 aktiv | scoped via useLeagueScope | Bar zeigt nur scoped Liga (SSOT) | leagueScopeStore drive Liga-Wahl |
| 9 | z-index | TopBar z-30 + Bar in Hero | non-sticky Bar scrollt mit Page | TopBar bleibt sticky drüber | P0-1 Fix: non-sticky Bar |
| 10 | Liga-Switch | leagueScope.setLeagueScope() | invalidates ['events'] | Bar refetched automatisch | Slice 254 Pattern, kein eigener Invalidation-Code |
| 11 | Multi-Tab | Tab A: GW wird LIVE; Tab B: Bar zeigt stale Deadline | useEvents.staleTime=1min | bis 60s Drift acceptable | Bewusster Trade-Off statt Realtime — Slice 267-Phase-3 add Realtime later |
| 12 | bfcache | Safari swipe back von /fantasy → / | Bar mit stale events-Cache | useGameweek.ts pageshow-Pattern triggert leagueGw-invalidate | Bar verlässt sich auf existing pattern, kein eigener Listener |

## 8. Self-Verification Commands

```bash
# Pflicht
npx tsc --noEmit

# Component-Mount-Verify (innerhalb HomeStoryHeader, nicht page.tsx)
grep -n "GameweekStatusBar" src/components/home/HomeStoryHeader.tsx

# Spotlight-Edit-Verify (B=b Scope)
grep -n "Active Fantasy Event\|Priority 2:" src/components/home/HomeSpotlight.tsx
# EXPECTED: 0 results post-BUILD (Event-Branch entfernt)

# i18n-Audit (Slice 198 Pattern: ALL keys, nicht nur 3 hardcoded)
grep -oE "t[A-Za-z]*\(\s*['\"]([a-zA-Z]+\.[a-zA-Z]+\.[a-zA-Z]+|[a-zA-Z]+\.[a-zA-Z]+)" \
  src/components/home/GameweekStatusBar.tsx \
  | sed -E "s/.*['\"]//" | sort -u | while read key; do
    de_path=$(echo "$key" | sed 's/\./\\\./g')
    grep -q "\"${key##*.}\"" messages/de.json messages/tr.json || echo "MISSING: $key"
  done

# Hardcoded-DE-addToast-Audit (Slice 196 Track B)
grep -E "addToast\(['\"][A-ZÄÖÜ]" src/components/home/GameweekStatusBar.tsx
# EXPECTED: 0 results (Bar wirft keine Toasts, defensiv-Audit)

# Pattern-Compliance: kein useState/useEffect für leagueId/activeGw (Slice 254)
grep -E "useState|useEffect" src/components/home/GameweekStatusBar.tsx | grep -E "league|gw|active"
# EXPECTED: 0 results — Bar ist stateless

# Mobile-Visual-Check post-Deploy (Anil-pflicht)
# Open https://bescout.net auf Mobile-Safari (393px) → Bar sichtbar im Hero?
# DevTools Network: prefetch-Calls zu /fantasy NICHT konstant (Link prefetch=false)

# motion-reduce-Verify
grep "motion-reduce:animate-none\|motion-safe:" src/components/home/GameweekStatusBar.tsx
# EXPECTED: ≥1 (gold-pulse-bg muss motion-reduce honoren)
```

## 9. Open-Questions

**Pflicht-Klärung VOR BUILD:**
1. ~~DE-Wording: „Spieltag" vs „GW"~~ — **Erledigt:** Codebase-Konvention bestätigt (de.json:69, 252, 3833 → „Spieltag"). P1-5 Findings aufgelöst.
2. ~~TR-Wording: „Hafta" vs alternative~~ — **Erledigt:** Anil-approved „Hafta" (Codebase-konsistent: tr.json:2846, 3971, 4644).
3. ~~Countdown-Format: locale-aware vs „2d 4h"~~ — **Erledigt:** Anil-A=b: „2d 4h" beide Locales, FPL-Konvention.
4. ~~GW-Layer-Konsolidierung: alle 3 oder Bar ersetzt~~ — **Erledigt:** Anil-B=b: Bar ersetzt Spotlight-Event-Branch, Sidebar-Card bleibt.

**Bleibende Code-Reading-Aufgabe (kein Anil-Input):**
- Bar-Klick → `/fantasy` oder `/fantasy/spieltag` ? Code-Reading der Routes klärt im BUILD.
- ~~`useFantasyEvents()` leagueId-Verfügbarkeit~~ — **Erledigt:** 2nd-Review verifizierte `eventMapper.ts:18-79` setzt `leagueId` heute NICHT. v2.1-BUILD-Plan: 1-Zeilen-Mapper-Patch nach Zeile 77 (`leagueId: clubLookup?.league_id ?? undefined`).

**Autonom-Zone (CTO):**
- Component-File-Struktur (Sub-Helpers extrahieren wenn >120 Zeilen)
- Naming der i18n-Keys (`home.gwBar.*` Namespace)
- BG-Gradient-Werte (orientiere mich an EventCategoryCards bescout-Pattern)
- Truncation-Strategy bei Liga-Name (CSS `truncate` oder `line-clamp-1`)
- Skeleton-Style (matche Hero-BG dezent, nicht laut)

**Nicht-Autonom-Zone:**
- Liga-Rang-Anzeige → SCOPE-OUT (Slice 263)
- Stadium-Photo-BG → SCOPE-OUT (Slice 270, Phase 5)
- Captain-Action-Required → SCOPE-OUT (Slice 264, Phase 2)

## 10. Proof-Plan

| Artefakt | Pfad |
|----------|------|
| Mobile 393px bescout.net Bar sichtbar (Süper Lig user) | `worklog/proofs/261-mobile-bar-visible.png` |
| Mobile 393px bescout.net Bar NICHT sichtbar (new user) | `worklog/proofs/261-mobile-bar-empty.png` |
| Desktop 1280px Bar sichtbar | `worklog/proofs/261-desktop-bar.png` |
| Desktop 1280px Spotlight ohne Event-Card (B=b verify) | `worklog/proofs/261-spotlight-no-event.png` |
| Cold-Start Skeleton-Reserve (DevTools throttling 3G + Hard-Refresh, GIF/Video) | `worklog/proofs/261-cold-start-skeleton.gif` |
| AC-09 Liga-Switch-Roundtrip (Süper Lig → BL via /fantasy → zurück Home) | `worklog/proofs/261-liga-switch.gif` |
| i18n-Audit DE+TR Keys-Existence Output | `worklog/proofs/261-i18n-audit.txt` |
| tsc-clean + grep-pattern + addToast-audit | `worklog/proofs/261-tsc-grep.txt` |

## 11. Scope-Out

| Item | Wo | Begründung |
|------|----|-----------| 
| Liga-Rang-Pill in Bar | Slice 263 | Brauche `getLeagueRank(userId, leagueId)` Service der heute nicht existiert. |
| Stadium-Photo-BG der Liga | Slice 270 (Phase 5) | Asset-Pipeline (SDXL `/stadiums/<liga>_bar.webp`). Phase 1 Gradient-only. |
| Multi-Liga-Liga-Selector innerhalb Bar | NICHT — `useLeagueScope` SSOT | leagueScopeStore reset triggert refetch (Slice 254 Pattern). |
| Captain-Action-Required-Pill | Slice 264 (Phase 2 Action-Layer) | Eigener Layer 2 mit ActionRequiredStack. |
| Realtime-Channel auf events.status | Phase 3 | useEvents.staleTime=1min reicht für Beta (bewusster Trade-Off) |
| Streak-Risk-Warning | Slice 263 | Hero-Layer-1 Pill, nicht Bar-Layer-0 |
| LeagueScopeHeader auf Home mounten | NICHT in 261 | Phase 2+ Decision (eigener Slice falls Anil's Test-Findings es zeigen) |
| Sidebar-NextEvent-Card entfernen | NICHT (Anil B=b: nur Spotlight ersetzen) | Sidebar bleibt — eigener Slice falls später konsolidiert werden soll |
| Feature-Flag `home-gw-bar` PostHog | NICHT in 261 | P2-3: optional, Beta-acceptable ohne Flag (Bar ist read-only) |

## 12. Stage-Chain (geplant)

```
SPEC v2 ✓
  → Re-Review (D62 2nd-Pass, kurz ~10 min auf v2-Diff)
  → IMPACT skipped (Begründung unten)
  → BUILD solo (S-Size, klar abgegrenzt; kein parallel-dispatch)
  → REVIEW Code-Reviewer-Agent post-BUILD (D13)
  → PROVE Mobile-Screenshot bescout.net + AC-09 Liga-Switch + DE+TR + AC-11 Spotlight-Verify + Cold-Start-Skeleton-Demo
  → LOG
```

**Skip-Begründung IMPACT:** Kein cross-cutting impact. Component liest existing Hooks (useEvents/useFantasyEvents, useLeagueScope), schreibt nichts. Mount in 1 Component (HomeStoryHeader). Spotlight-Edit ist Read-only-Branch-Removal (kein Service-Layer-Impact). i18n-Keys neu (kein Conflict). Cache-Invalidation läuft via Slice 254 Pattern automatisch. Money-Path: nein.

## 13. Pre-Mortem (7 Szenarien)

| # | Failure | P | Impact | Mitigation | Detection |
|---|---------|---|--------|------------|-----------|
| 1 | Bar pinnt auf Liga A nach Switch zu Liga B | LOW | hoch (Slice 254 Bug-Klasse Regression) | Stateless-Component, Slice 254 root-prefix-invalidate | AC-09 Test + grep-Pattern in Self-Verification |
| 2 | TR-Wording „Hafta" Drift bei Push | LOW | mittel (TR-User-Verwirrung) | Anil-approved, Codebase-konsistent | TR-Locale-Tester-Round |
| 3 | events.starts_at in DB null → getTimeUntil crash | LOW | hoch (Bar wirft Error) | Null-Guard `if (!event.starts_at) return null` vor render | Edge-Case #5 explicit getestet |
| 4 | Bar rendert während hydrated=false → Layout-Flash | MED | niedrig (visuelle Glitch) | P1-1 Fix: Skeleton-Reserve 44px | Cold-Start-Test Mobile-Safari Inkognito (AC-03) |
| 5 | Spotlight-Edit (B=b) bricht andere Render-Pfade | LOW | mittel | Spotlight-Konsumenten-grep ergab nur 1 (page.tsx). Branch-removal isoliert. | AC-11 Test + visual diff Spotlight |
| 6 | Cache-Pollution durch frequente Liga-Switches | LOW | niedrig | useEvents.staleTime=1min limitiert Refetch-Frequenz | Network-Tab-Verify im PROVE |
| 7 | Multi-Tab GW-Status-Drift (Tab B stale 60s nach Tab A LIVE) | MED | niedrig (acceptable für Beta) | Bewusster Trade-Off, Phase 3 add Realtime | Edge-Case #11 dokumentiert, kein Bug-Fix in 261 |

---

## Compliance-Check

- $SCOUT-Wording: **N/A** (Bar zeigt nur GW + Deadline)
- IPO/Erstverkauf: **N/A**
- TR-Glücksspiel-Vokabel: **kein „kazan*"** — verwende „Hafta", „Canlı", „kalan süre" (alle neutral, business.md-konform)
- Asset-Klasse-Framing: **N/A**
- TradingDisclaimer: **nicht nötig** (kein Money-Path)
- Spotlight-Edit (B=b) Compliance: **N/A** (Event-Branch hatte keinen Money/Wording-Risk, Removal ist neutral)

## TR-Wording-Vorab (Anil-Pflicht-Review)

| Key | DE | TR | business.md-Konformität |
|-----|----|----|-------------------------|
| `home.gwBar.label` | „Spieltag {n}" | „Hafta {n}" | ✓ Codebase-konsistent (Anil-approved) |
| `home.gwBar.live` | „Live" | „Canlı" | ✓ neutral |
| `home.gwBar.deadlinePassedFallback` | „Anmeldung läuft" | „Kayıt sürüyor" | ✓ keine kazanmak/yatırım |
| `home.gwBar.skeletonAriaLabel` | „Spieltag-Status lädt" | „Hafta durumu yükleniyor" | ✓ |
| `home.gwBar.linkAriaLabel` | „Zum Spieltag" | „Hafta'ya git" | ✓ |

**Anil-Pflicht-Review** vor Push markiert (zeige ich nach BUILD vor Commit).

## Open Risiko (kurz, ehrlich)

Verbleibendes Hauptrisiko: **`useFantasyEvents` mapper liefert leagueId möglicherweise NICHT** — Code-Reading im BUILD klärt. Falls nicht, Fallback via `getClub(club_id)?.league_id` ist verfügbar (kein Blocker, nur 5 Zeilen mehr Code).

Sonst: Pure Read-Only-UI-Component, kein Money, kein Schema, kein Cron — geringes Failure-Risiko nach den 4 P0-Fixes.
