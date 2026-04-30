# Slice 261 Code-Review (post-BUILD)

**Verdict:** PASS
**Time-spent:** ~22 min
**Files-read:** 10
**Reviewer:** reviewer-Agent (Cold-Context, post-BUILD)
**Datum:** 2026-05-01

> Note: `261-review.md` existiert für anderen Track (TanStack Persist-Cache, 2026-04-30, nicht durchgezogen). Dieses File ist Slice-261 post-BUILD-Review für die Home Layer 0 Gameweek-Status-Bar.

---

## Findings

### P0/P1: Keine

### P2 (Minor)

**P2-1: `gold-pulse-bg` ist statischer Gradient — AC-04 „Pulse" cosmetisch leicht abweichend** → **FIXED inline (Patch nach Reviewer-Output)**
- `gold-pulse-bg` (globals.css:124-126) ist nur background-image, kein @keyframes. „Pulse"-Effekt im NextEvent-Card kommt durch zusätzliche `motion-safe:animate-pulse`-Klasse.
- Bar ohne diese Klasse → statischer Gold-Tint, kein Pulsen bei urgent/running.
- **Fix angewendet:** `motion-safe:animate-pulse` zusätzlich gesetzt in GameweekStatusBar.tsx Z. 97. Pulse jetzt visible bei Deadline <6h und LIVE. tsc re-verified clean.

**P2-2: Skeleton mountet innerhalb `<div className="relative z-10">` — Mount-Position-Drift zur Spec**
- Spec-Snippet § 2 zeigte Bar VOR vignette-overlay, Code-Reality Bar IN z-10-Wrapper.
- Code-Reality ist BESSER (Bar klar über vignette).
- Kein Bug, kein Action.

### P3 (Nice-to-have, alle positive)

- Skeleton-Höhe matched Bar-Höhe (44/48px) → 0 CLS Risk
- `alt=""` auf Image semantisch korrekt + leagueDisplayName-Span sichtbar
- pickBarEvent Sort-Logic deterministisch (running > registering, dann starts_at ASC)

---

## Strengths

- **Stateless-Component-Pattern (Slice 254 Heal-v2) sauber umgesetzt**: 0 useState, 0 useEffect für leagueId/activeGw. Liga-Switch via root-prefix-invalidation funktioniert automatisch.
- **Filter-Pattern saubererer als Spec**: `useEvents()` (DbEvent[]) + `e.league_id || getClub-Fallback` direkt — kein Mapper-Indirection. Mapper-Patch in eventMapper.ts:80 ist trotzdem live für FantasyEvent-Konsumenten (Single-Source).
- **Edge-Cases vollständig**: EC-1 unauth, EC-2 hydrating-skeleton, EC-3/4 empty, EC-5/6 starts_at/ends_at past, EC-9 z-index non-sticky, EC-10 Liga-Switch.
- **i18n vollständig DE+TR**: alle 5 keys, business.md-konform (kein kazan*/yatırım/kar).
- **Touch-Target ui-components.md-konform**: min-h-[44px] lg:min-h-[48px].
- **Performance-Hygiene**: `prefetch={false}`, `memo`-Wrap, kein eigener Realtime-Channel, `tabular-nums`.
- **A11y solide**: aria-label Link + Skeleton, aria-live=polite Countdown, aria-hidden auf dekorativen Icons.
- **Spec-Compliance hoch**: Layout-Mount innerhalb HomeStoryHeader ✓, Spotlight Priority-2 entfernt ✓, page.tsx nextEvent-prop weg ✓, Mapper-Patch ✓.
- **HomeSpotlight-Edit chirurgisch**: 50 Zeilen weg + Imports bereinigt + Comment-Trail erklärt B=b-Decision.

---

## Verdict-Begründung

**PASS** weil alle 4 P0 + 6 P1 + 1 P0-NEW aus den 2 Pre-Reviews im Code adressiert sind. 6/6 Self-Verification-Audits PASS, tsc clean. P2-1 inline-gefixt. Stateless-Pattern verhindert Slice-254-Bug-Klasse. Compliance + Money-Path + Securities-Wording alle clean.

---

## Recommended Next Step

**Commit + Push freigegeben.**

PROVE-Phase nach Deploy:
- Mobile 393px bescout.net Bar sichtbar (Süper Lig user)
- Cold-Start Skeleton-Reserve (DevTools 3G + Hard-Refresh)
- AC-09 Liga-Switch-Roundtrip (/fantasy → /)
- DE+TR Locale-Switch
- AC-11 Spotlight-no-Event-Card

---

## Knowledge-Captures (post-Commit, später)

**Pattern-Bestätigung (`memory/patterns.md`):**
- Stateless-Render-from-Hooks für context-aware Components (Slice 254 Heal-v2 angewendet auf Slice 261). Keine init-useEffect mit setLocalState. Direktes Hook-Read + Filter im Render-Body. Liga-Switch via parent-cache-invalidation triggert refetch automatisch.

**Errors-Eintrag (`errors-frontend.md` CSS/Tailwind-Section):**
- `gold-pulse-bg` ist statischer Gradient ohne keyframes. Pulse-Effekt braucht ZUSÄTZLICH `motion-safe:animate-pulse`-Klasse. Pattern-Source: HomeSpotlight.tsx:311 (NextEvent-Card kombiniert beide). Slice 261 P2-1 zeigte Drift.
