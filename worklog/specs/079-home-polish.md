# Slice 079 — Home `/` Polish Pass (Phase 1 Start)

**Datum:** 2026-04-19
**Phase:** Phase 1 Core (1/6)
**Size:** M (1 Page, ~10 home/* components, 513 Zeilen page.tsx)
**CEO-Scope:** UX-Entscheidungen bei Section-Reorder / Section-Removal → Anil approves

## Ziel

Home-Page User-Test-ready machen. Systematisches Durchgehen des Polish-Rubrics (aus `.claude/rules/ui-components.md`), alle States sauber, Mobile 393px overflow-frei, A11y clean, DE+TR keine raw-Keys.

## Warum

Phase 1 startet mit Home (höchste User-Test-Frequenz). Slice polish-sweep 2026-04-09 hat Track A/B/C done, seitdem ~30 neue Slices → Regression möglich. Fokus diesmal: **UX-Details** statt nur Visual.

## Files (Home Scope)

**Primary:**
- `src/app/(app)/page.tsx` (513 Zeilen)
- `src/app/(app)/hooks/useHomeData.ts`

**Home Components (9):**
- `HomeStoryHeader.tsx`
- `HomeSpotlight.tsx`
- `BeScoutIntroCard.tsx`
- `ScoutCardStats.tsx`
- `LastGameweekWidget.tsx`
- `TopMoversStrip.tsx`
- `MostWatchedStrip.tsx` (dynamic)
- `OnboardingChecklist.tsx` (dynamic)
- `helpers.tsx` (formatPrize, getTimeUntil, SectionHeader)

**Embedded (via dynamic):**
- `NewUserTip`, `SponsorBanner`, `MysteryBoxModal`, `WelcomeBonusModal`, `MissionHintList`, `FollowingFeedRail`

## Polish-Rubric (aus `ui-components.md`)

Pro Section durchgehen:

### A. States
- [ ] **Loading** — Skeleton-Screens (nicht Spinner) für alle async Sections
- [ ] **Empty** — jede Liste/jeder Strip hat einen Empty-State mit CTA
- [ ] **Error** — ErrorState Pattern mit Retry (aktuell nur bei playersError)
- [ ] **Loading Guard** — vor `!data` prüfen

### B. Mobile 393px (iPhone 16)
- [ ] Kein horizontaler Overflow
- [ ] Touch Targets min 44×44px (buttons, links)
- [ ] Font-Size min 16px (iOS Auto-Zoom)
- [ ] Tab-bars mit `flex-shrink-0` + `overflow-x-auto` (keine `flex-1`)

### C. A11y
- [ ] Icon-only Buttons haben `aria-label`
- [ ] Dekorative Icons haben `aria-hidden="true"`
- [ ] Error-Messages haben `role="alert"`
- [ ] Focus-Ring sichtbar (nicht outline:none)

### D. Dark-UI Opacity
- [ ] Surfaces min 5% opacity auf #0a0a0a
- [ ] Text white/50+ (nicht white/40 — WCAG FAIL)
- [ ] Position-Glows 20-35% (nicht 8% "unsichtbar")

### E. i18n
- [ ] DE + TR beide geprüft
- [ ] Keine raw-Key-Leaks (`setError(err.message)`-Pattern prüfen)
- [ ] Compliance-Wording: keine "Investment/Profit/ROI", keine "gewinnen"-TR

### F. Performance
- [ ] Jede Query hat `staleTime` ≥30s
- [ ] `keepPreviousData: true`
- [ ] Dynamic Imports für >500-Zeilen-Components
- [ ] `React.memo` nur wenn gemessen notwendig

### G. Flow / UX
- [ ] Golden Path: eingeloggt → sieht Home mit Daten
- [ ] New-User Path: holdings=0 → OnboardingChecklist + Empty-States
- [ ] Logged-out: redirect zu `/welcome` (nicht leere Home)
- [ ] Double-Click auf MysteryBox-Open → Modal opened only once
- [ ] Navigation zu allen Links getestet

### H. Anti-Slop
- [ ] `cn()` statt Template Literals für classNames
- [ ] `tabular-nums` auf alle Zahlen
- [ ] `size-*` statt `w-* h-*`
- [ ] `text-balance` auf Headings, `text-pretty` auf Paragraphs

### I. Compliance (business.md)
- [ ] $SCOUT = "Platform Credits" (nie "Token"/"Investment")
- [ ] Scout Card = "Digitale Spielerkarte"
- [ ] TradingDisclaimer vorhanden
- [ ] IPO user-facing = "Erstverkauf" (DE) / "Kulüp Satışı" (TR)

## Acceptance Criteria

- **AC1** Alle 9 Rubrik-Punkte (A-I) für jede Section explizit abgehakt
- **AC2** `npx tsc --noEmit` clean
- **AC3** Screenshot Mobile 393px + Desktop 1280px nach Deploy gegen bescout.net
- **AC4** Keine Console-Errors/Warnings in jarvis-qa Session
- **AC5** New-User Flow (holdings=0) + Existing-User Flow beide funktionieren
- **AC6** DE + TR beide explizit durchgeklickt (Cookie `bescout-locale=tr`)

## Edge Cases

- `playersError && players.length === 0` → ErrorState full-page (bereits implementiert, prüfen)
- `loading=true` → HomeSkeleton (existing)
- `showWelcomeBonusModal` + `showMysteryBox` gleichzeitig triggern — Modal-Stacking?
- `nextEvent` null → kein Live-IPO-Banner, kein Countdown
- Offline (network down) → sollte Skeletons zeigen, nicht crashen
- Race: wallet-balance kommt nach players-fetch → pnl-Display blinkt?
- `followedClubs` sehr groß (>10) → MyClubs-Section Overflow?

## Proof-Plan

1. `worklog/proofs/079-home-desktop.png` — Screenshot Desktop nach Deploy
2. `worklog/proofs/079-home-mobile.png` — Screenshot Mobile 393px nach Deploy
3. `worklog/proofs/079-home-mobile-tr.png` — Mobile TR-Locale
4. `worklog/proofs/079-home-findings.md` — Checkliste mit "gefunden / gefixt / deferred"
5. `worklog/proofs/079-home-tsc.txt` — tsc clean

## Scope-Out (separate Slices)

- Neue Home-Features (Top Mover 7d RPC — immer noch deferred)
- Onboarding-Redesign → `/welcome` + `/onboarding` (Slice 085+ in Phase 5)
- Modals (MysteryBox, WelcomeBonus) — eigene Polish-Slices
- Performance Bundle-Optimierung — wird gemessen bevor optimiert
- FollowingFeedRail → separater Slice wenn Social-Phase 3

## Workflow

1. **jarvis-qa Playwright auf bescout.net** (aktueller Stand, was sieht der User heute?)
2. Findings-Liste schreiben → AC1 Rubrik abarbeiten
3. Fixes inkrementell, 1 Section nach der anderen
4. tsc nach jedem File
5. Deploy, dann Playwright-Verify Mobile + Desktop
6. Commit + LOG
