# Next Session Briefing — 2026-04-23

> **Supersedes** the prior drafts (Session 3-Version + A0-Elim). This is the final Session-4-End-briefing.
> 2026-04-22 had 4 Sessions total — tally at end of this file.

## TL;DR (3 Sätze)

Anil möchte in der nächsten Session **detailliert auf die Club-Page und Club-Darstellung eingehen** (user request at Session-4-end). Scope to-be-defined — ist es die Discovery-Page `/clubs`, die einzelne Club-Page `/club/[slug]`, oder beide? Product-Direction-Session mit möglichen Spec-Fragen zu Layout, Sections, Mobile-UX, Club-Admin-View vs Public-View.

**Erste Aktion morgen:** Anil fragen welche **konkrete Club-Ansicht** er meint (Discovery `/clubs`, Single `/club/[slug]`, Admin `/club/[slug]/admin`) + **welche spezifischen Elemente** (Hero, Sections, Squad, Events, Offers). Dann Spec-Session vor Code.

---

## Club-Page Inventar (für Context)

### Discovery Page
- `src/app/(app)/clubs/page.tsx` — Liste aller Clubs mit Filter (Country/League), Follow/Activate, NextFixture
- Seit Slice 148 heute: played_at-ordering für GW-Konsistenz. Gençlerbirliği-Logo via Slice 148b auf Wikipedia-URL.

### Single Club Page `/club/[slug]`
- `src/app/(app)/club/[slug]/page.tsx` — Route Handler
- `src/app/(app)/club/[slug]/ClubContent.tsx` — Main Content-Orchestrator
- **Sections** (`src/components/club/sections/`):
  - `PublicClubView` — Non-Follower-View
  - `MembershipSection` — Follower-Status/CTA
  - `SquadPreviewSection` + `SquadOverviewWidget` — Spieler-Kader
  - `CollectionProgress` — Trading-Progress
  - `ClubEventsSection` — Events
  - `ActiveOffersSection` — Offers
  - `SpielplanTab` — Fixtures
  - `MitmachenSection` — CTAs
  - `RecentActivitySection` — Activity-Feed
  - `FeatureShowcase` — Feature-Highlights
- **Hero**: `src/components/club/ClubHero.tsx`
- **Stats**: `src/components/club/ClubStatsBar.tsx`
- **Fixtures**: `src/components/club/FixtureCards.tsx`

### Admin View
- `src/app/(app)/club/[slug]/admin/AdminContent.tsx` — Club-Admin-Panel
- `src/app/(app)/club/[slug]/admin/page.tsx` — Route

### Shared
- `src/components/club/ClubSkeleton.tsx` — Loading State

---

## Fragen zum Brainstorming (als Spec-Input)

1. **Welcher User-Context?** (Public Visitor vs Follower vs Active-Club-User vs Admin)
2. **Welches Device-Primary?** (Mobile 393px oder Desktop?)
3. **Welche Sektionen priorisieren?** (Squad, Events, Offers, Activity — Reihenfolge + Prominence)
4. **Wie Trading + Fantasy integrieren?** (Tabs vs Inline vs Sub-Route)
5. **Club-Branding:** Wie stark Club-Farben/Logo hochheben vs BeScout-Default-Theme?
6. **Mobile-Hero:** Klein halten für Content-Above-Fold oder Full-Width-Splash?
7. **CTA-Priorität:** Follow → Activate → Buy Card → Events Join — welcher Primary?

---

## Offene Items Layer 0 (unverändert)

| # | Task | Status |
|---|------|--------|
| A1 | 3 Beta-Tester organisieren | extern |
| A2 | 1 Deutsch-Türke für TR-Review | extern |
| A3 | Notion-Kanban manuell draggen | 5 min Anil (MCP blocked) |

A0+A4 heute erledigt (sb_secret revoke, Gençlerbirliği Logo).

---

## Backlog (Post Club-Page-Session ggf. weiter)

Siehe `memory/backlog.md` Layer 1 Neu-Items (B12-B15):
- B12 107 Orphans null-club-id Investigation (P2)
- B13 4 TM-mapped Orphans Direct-Profile-Lookup (P3)
- B14 LL Parse-Fail Investigation (P3)
- B15 153 TM-unmapped stale Players Discovery-Slice (P2)

---

## Session 2026-04-22 Total (4 Sessions)

| Session | Commits | Key-Deliverables |
|---------|---------|------------------|
| 1 (früh)        | 7  | Slices 137-140 + backlog.md 5-Layer |
| 2 (nachmittag)  | 8  | Slices 141/141b/142/143/144/144b/145 + Reviewer-Hook |
| 3 (spät)        | 10 | Slices 146/147/144c/144e + D15 + common-errors-optimize |
| **4 (abend)**   | **14** | **A0-Elim + 144d/f/g/h/148/148b + D16 + Scraper-null-pattern** |
| **Gesamt**      | **39** | |

## Session 4 Decisions/Patterns

- **D16 ARCHITECTURE:** Scraper-null-Policy — always write null on missing source field, never keep old
- **common-errors Section 9:** "Scraper null-Policy" Pattern
- **backlog.md:** 6 items marked done (B2, B6, B8-B11), 4 neu (B12-B15), A4 neu + done, A0 struck

## Data-Hygiene State (Final)

| metric | value |
|--------|-------|
| stale_total | 188 (aus 324, -42%) |
| null_club_id | 111 (war 119) |
| TFF1 | **Gold-Standard ✅** (3 non-mapped remain) |
| 217 | club_id UPDATEs applied (transfers) |
| /clubs | GW-Konsistenz fixed (played_at ordering) |
| Gençlerbirliği | Wikipedia-Logo live |

## Confidence der Übergabe

- ✅ 14 Commits gepusht, alle CI-grün
- ✅ active.md idle, status clean
- ✅ backlog.md refreshed mit Session-4-Stand
- ✅ memory/decisions.md + common-errors.md updated
- ✅ DISTILL Session-End durchgeführt
- ⚠️ A3 Notion-Kanban manual-drag (MCP-Integration-Scope fehlt)
- ⚠️ LL 3 parse-fails persistent (144h Scope-Out)
