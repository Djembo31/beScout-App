# Slice 149 Review — Club-Page Deep-Dive

**Verdict:** PASS (alle 4 MEDIUM inline gefixt + dead keys entfernt)
**Post-Fix-Verify:** TSC clean · 65/65 tests passing
**Reviewer:** reviewer-Agent (Cold-Context, read-only)
**Time-spent:** ~40 min Review + Primary-Claude inline fix

## Scope reviewed

- `src/lib/services/club.ts` — NEW: `getClubStanding()` + `ClubStanding` type
- `src/lib/queries/keys.ts` — NEW: `qk.clubs.standing`
- `src/lib/queries/misc.ts` — NEW: `useClubStanding()` hook
- `src/components/club/ClubStandingCard.tsx` — NEW component
- `src/components/club/ClubStatsBar.tsx` — Mobile-Layout: Form + Prestige in Row 2
- `src/app/(app)/club/[slug]/ClubContent.tsx` — useClubStanding + render
- `src/lib/services/__tests__/club.test.ts` — 4 neue Tests
- `messages/de.json` + `messages/tr.json` — 4 Label-Changes + neue standing*/form/scoutsCount keys

## Spec-Coverage

- [x] Issue 1: scouts→Fans (DE) / Taraftar (TR)
- [x] Issue 2: volume24h→Handel 24h / 24s İşlem
- [x] Issue 3: buyable→Im Erstverkauf / Kulüp Satışı'nda (AR-7 OK)
- [x] Issue 4: dpcFloat→Karten im Umlauf / Dolaşımdaki Kartlar
- [x] Issue 5: ClubStatsBar Mobile Row-Split (Form+Prestige auf eigener Row)
- [x] Issue 6: Tabellenplatz-Integration (Service + Hook + Component + Render)
- [ ] Issue 7: PlayerDisplay Fotos — NICHT im Diff. Spec sagt "Debug noetig", kein Code-Change vorgenommen.
       Data-Facts bestaetigen 36/36 image_url + CSP/remotePatterns OK. Proof via Playwright nach Deploy.

## Findings

### MEDIUM (inline gefixt)

| # | Location | Issue | Fix |
|---|----------|-------|-----|
| 1 | `ClubStandingCard.tsx:58` | i18n `.replace()`-Hack bricht bei Locale-Reorder. Funktioniert nur weil DE+TR zufällig Zahl-am-Anfang haben. | Separate Label-Keys `standingPlayedLabel: "Spiele"`/`"Maç"`, `standingPointsLabel: "Pkt"`/`"Puan"` ohne Platzhalter. |
| 2 | `ClubStandingCard.tsx:46-48` | Doppelte Punkt-Anzeige: `{standing.points}` → "68" + `t('standingPoints', {points})` → "68 Pkt". User sieht "68"/"68 Pkt" untereinander. | Grosse Zahl + nur Label `{t('standingPointsLabel')}` darunter. Dead keys `standingPoints`/`standingPlayed`/`standingRank`/`standingRecord`/`standingGoals`/`standingNoData` entfernt. |
| 3 | `ClubContent.tsx:133` | `useClubStanding` laeuft VOR `if (!user) return <PublicClubView/>`-Guard. RLS auf league_standings = authenticated-only → Public-User bekommt failing fetch, 5min invalid-cache. | Hook-Call nach `if (!user)`-Guard verschoben. Nur authenticated User queryt. |
| 4 | Form-Double-Source | `ClubStatsBar` + `ClubHero` rendern `formResults` (from fixtures). `ClubStandingCard` rendert `standing.form`. Zwei Quellen koennen driften. | `standing.form` wird jetzt VORRANG-Quelle: wenn vorhanden, liefert Hook es an ClubStatsBar + ClubHero statt `formResults`. Fallback auf fixtures-Quelle wenn Standing null. |

### LOW (Backlog)

- **#5** — `ClubStandingCard.tsx:23-26` Rank-Tone-Thresholds hardcoded (1 Gold, ≤4 Green, ≤6 Sky). Willkuerlich fuer Liga-spezifische Qualifikations-Plaetze. Post-Beta: Liga-specific thresholds.
- **#6** — W/D/L→S/U/N Pills ohne `aria-label`. Pre-existing in ClubHero + ClubStatsBar, nicht Slice-149-Regression. Follow-up Slice fuer Accessibility.
- **#7** — Dead i18n-Keys (gefixt inline durch Removal in #2).

### NITPICK

- **#8** — `getClubStanding` nutzt `ORDER BY season DESC LIMIT 1` ohne Season-Guard. Nach Saisonwechsel 2025→2026 kann Silent-Stale-Bug entstehen. Low-prio.
- **#9** — Dynamic-Tailwind `style={{ borderColor }}` korrekt (matches CLAUDE.md Regel).

## Reviewer-Checks

### 1. getClubStanding Service — PASS
- Error-Handling: `throw new Error(error.message)` (Slice 143-Pattern)
- Return-Shape: snake_case → camelCase korrekt gemappt
- NULL-Handling: `.maybeSingle()` + `if (!data) return null`
- PostgREST 1000-row cap: N/A (`.limit(1)`)
- Tests: 4 tests decken happy/null/form-null/error

### 2. ClubStandingCard — PASS nach Fix #1+#2
- Rendering-Logik: Parent-hide bei null, OK
- Mobile 393px: `grid-cols-3` mit `p-2.5` = ~105px/cell, passt
- i18n: Split-Label-Pattern angewandt (#1), keine Dead Keys mehr (#7)

### 3. ClubStatsBar Mobile Layout Fix — PASS
- Architektonisch richtig: 3 stats Row 1 (`flex-1 min-w-0`), Form+Prestige Row 2 (conditional)
- 393px: ~117px/cell, tight aber OK. Row 2 `flex-1` Form + `flex-shrink-0` Prestige
- Visual-Proof aussteht via Playwright

### 4. i18n Breaking-Change-Check — PASS
- `scouts`: 2 Consumer (ClubHero + ClubStatsBar), beide Club-Seite
- `volume24h`: 2 Consumer, beide Club-Seite
- `dpcFloat`: 2 Consumer, beide Club-Seite
- `buyable`: 1 Consumer (ClubHero)
- `airdrop.scouts` (Line 2446) UNBEREUHRT — anderer Namespace
- Kein Breaking-Consumer uebersehen

### 5. useClubStanding Hook — PASS (nach Fix #3)
- staleTime FIVE_MIN OK fuer Daily-Cron-Source
- Keine Invalidation noetig (read-only)

### 6. Business-Compliance — PASS
- "Im Erstverkauf" / "Kulüp Satışı'nda" erfuellt AR-7
- "Fans" statt "Scouts" — CEO-Entscheidung respektiert
- "Handel 24h" — kein Securities-Red-Flag laut business.md Glossar
- "Karten im Umlauf" — neutrale Terminologie, SPK-safe
- Standings = sportlich, kein Money-Disclaimer noetig

## Positive

- Test-Coverage sauber (4 neue Tests, alle Branch-Paths)
- Query-Key Convention eingehalten (qk.clubs.standing)
- Service-Error-Throw-Pattern (Slice 143-Doktrin)
- snake_case→camelCase Mapping explizit
- Dynamic-Tailwind Style-Prop korrekt
- Mobile-Layout-Fix minimal-invasiv (nur JSX-Restructure)
- Migration-safe (Zero DB-Changes, Slice 074 Table reused)
- AR-7 Compliance pixelgenau
- Scope-Drift: keiner, Implementation = Spec

## Learnings

- Pattern: i18n Split-Label statt `.replace()` auf interpolierten String — hinzufuegen zu common-errors.md §6
- Pattern: Query-Hook vor Auth-Guard → Public-User-Noise. Hooks entweder `enabled: !!userId` ODER nach `if (!user)` placen — hinzufuegen zu common-errors.md §5
- Multi-Source-UI Form: eine canonical bestimmen, andere als Fallback oder separates Label

## Final Verdict

**REWORK → PASS nach Inline-Fix** der 4 MEDIUM-Findings. Alle Fixes <5 Zeilen Code-Change pro Stelle. LOW + NITPICK werden als Backlog dokumentiert, blockieren nicht.
