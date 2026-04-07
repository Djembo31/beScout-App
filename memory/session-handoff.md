# Session Handoff
## Letzte Session: 2026-04-07 (Mittag–Abend)

## Was wurde gemacht (9 Commits auf main, alles gepusht)

### 1. Mystery Box Drop Rate Kalibrierung v1 — `eca67ae`
- Migration: `20260407120000_mystery_box_calibration_v1.sql`
- Strategie: Slight-positive EV (~+29% Return), Equipment-Achievement-Curve (50 Boxes fuer volles R1 Set)
- Verteilung: common 45% / rare 30% / epic 17% / legendary 6% / mythic 2%
- Common-Box: 95% Tickets, 5% Equipment R1 Chance (erste Idee)
- Legendary CR: 50-150, Mythic CR: 100-250 (klare Hierarchie)
- Monte Carlo (10k rolls) in DB bestaetigt Verteilung

### 2. 3-Hub Architecture Refactor — 5 Waves, 28 Files
Spec: `docs/plans/2026-04-07-3-hub-architecture-spec.md` (komplette SPEC + PLAN + EXECUTE)

| Wave | Commit | Scope |
|------|--------|-------|
| W1 | `7173186` | Profile entladen — Wildcards + Achievements raus |
| W2 | `f8f3b5b` | `/inventory` Page bauen — 4 Sections (Equipment, Cosmetics, Wildcards, MB History) |
| W3 | `f93cc2f` | `/missions` Progress-Hub — Achievements + StreakMilestoneBanner rein |
| W4 | `3e75561` | Home entladen — Daily Challenge + Score Road Strip raus + Inventar Quick Action |
| W5 | `3932d45` | Cleanup — orphan Files geloescht |

**Mental-Model-Trennung:**
- **Profile** = "Wer ich bin" (4 Tabs: Manager/Trader/Analyst/Timeline)
- **`/inventory`** = "Was ich habe" (4 Tabs: Equipment/Cosmetics/Wildcards/MB History)
- **`/missions`** = "Was ich tue" (Streak/DailyChallenge/Missions/ScoreRoad/Achievements/StreakMilestones)
- **Home** = "Was ist aktuell" (Hero/Quick Actions 5 Buttons/Spotlight/Portfolio/Movers/Sidebar)

**Paralleler Workflow:** Frontend Agent (worktree) baute W2 parallel waehrend main-Session W1 + W3 + W4-partial erledigte.

### 3. Visual QA (qa-visual Agent) — 14 Screenshots
- `e2e/qa-3hub.ts` — wiederverwendbares Playwright Script
- 4 Pages × Mobile (360) + Desktop (1280)
- Resultat: /inventory + /missions PASS, Profile PASS (Struktur), Home PASS (Conditional Renders)
- Gefunden: 4x HTTP 406 Errors auf Profile (real bug) — fuehrte zum Audit

### 4. airdropScore 406 Fix — `908f930`
- Root Cause: `AirdropScoreCard` ruft `.single()` auf `airdrop_scores` → 406 wenn User keine Row hat (jarvis-qa, neue User)
- Fix: `.single()` → `.maybeSingle()` in 2 Stellen (getAirdropScore, refreshAirdropScore refetch)
- React Strict Mode rendert useEffect 2x → 4 silent 406 Errors pro Profile-Load

### 5. `.single()` Audit — `d66f0f6` (23 Fixes in 12 Files)
Systematischer Audit nach airdropScore Fix. 34 `.single()` Calls gefunden:
- **11 INSERTs** mit `.select().single()` — bleiben (row garantiert)
- **23 SELECTs** mit moeglichen 0-rows → `.maybeSingle()`

Files gefixt: profiles.ts (2), referral.ts (3), players.ts (1), club.ts (6), trading.ts (3), clubChallenges.ts (1), fantasy/fixtures.ts (1), fantasy/scoring.queries.ts (1), fantasy/scoring.admin.ts (1), fantasy/events.mutations.ts (2), api/cron/gameweek-sync (1), app/(app)/player/[id]/page.tsx (1)

**928/928 Service-Tests grün nach Audit.**

### 6. AutoDream Run #2 — `606da92`
- 5 Retros verdichtet
- Neue Wiki-Seite: `memory/semantisch/projekt/architecture-3hub.md`
- Regel in `common-errors.md` + `memory/errors.md` gepromoted (`.single()` → `.maybeSingle()` Pattern) — ab jetzt auto-loaded fuer alle Agents
- Neuer Draft: `memory/learnings/drafts/2026-04-07-qa-visual-3hub-refactor.md`
- Session-Counter zurueckgesetzt

## Build Status
- `tsc --noEmit`: CLEAN
- Tests: 928/928 Service-Tests, Profile-Tests, useHomeData-Tests — ALLE grün
- 9 Commits auf main gepusht, Vercel Auto-Deploy laeuft

## Offen (P3 — naechste Session)

### UX Issue (entdeckt durch QA)
1. **Quick Actions Bar nur sichtbar wenn Onboarding abgeschlossen** — Early-Stage User (wie jarvis-qa 1/5) sieht den Inventar-Link NIE auf Home. Code in `src/app/(app)/page.tsx`: `showQuickActions = !!uid && (!retention?.onboarding || retention.onboarding.every(i => i.completed))`. Fix: einfach `const showQuickActions = !!uid;` → 1-File Change.

### Tech Debt (P3)
2. **DB-Tests (5 Failures)** — ended Events ohne `scored_at`. Nach GW33 Sync sollten 4 davon gefixt sein → pruefen.
3. **Manager Desktop Layout** — IntelPanel unter Pitch statt side-by-side (Spec-Abweichung).
4. **KaderTab Cleanup** — wird noch von Market referenziert. Cleanup wenn Market redesigned wird.
5. **Equipment Inventar Screen Enhancement** — erste Version durch /inventory da, aber koennte detaillierte Equipment-Detail-View bekommen (Long-press?).

### Deploy Verification
6. **bescout.net Deploy verifizieren** — nach 9 Commits (inkl. alle Fixes): Home + /inventory + /missions + /profile durchklicken, alle 406 Errors weg, Inventar-Link sichtbar (nach UX Fix #1).

## Architektur-Notizen fuer naechste Session

### 3-Hub Pattern etabliert
- Profile / /inventory / /missions sind jetzt saubere Hubs mit klaren Verantwortlichkeiten
- Content-Dumping war das Root-Problem — nicht fehlende Features
- **Key Rule:** Features gehoeren in genau einen Hub. Wenn sich ein Feature "unpassend" anfuehlt, deutet das auf Hub-Konfusion hin.

### .single() vs .maybeSingle() — jetzt auto-loaded Rule
- `.claude/rules/common-errors.md` laedt bei jeder Session
- Regel: "Existiert dieser Datensatz garantiert?" → NEIN → `.maybeSingle()`
- Audit-Trigger: HTTP 406 in Visual QA → systematisch `grep -r .single\(\) src/` durchgehen
- 34 → 11 verbleibende `.single()` (alle INSERT/UPDATE mit RETURNING, korrekt)

### Memory Infrastructure
- AutoDream Session-Counter bei 0 (nach Run #2)
- Learnings Draft wartet auf Promotion: `memory/learnings/drafts/2026-04-07-qa-visual-3hub-refactor.md` (Multi-Page QA Patterns)
- `/promote-rule` Skill bei Bedarf

## QA Account (unveraendert)
- Email: jarvis-qa@bescout.net / Handle: jarvisqa
- Password: `JarvisQA2026!` (in `e2e/mystery-box-qa.spec.ts:5`)
- ~7.540 CR, 8 Holdings, 7 Equipment Items (fire_shot R1+R2, iron_wall R3, banana_cross R1, cat_eye R2, captain R1+R4)
- Onboarding 1/5, Streak 5 Tage
- 0 Rows in `airdrop_scores`, `user_cosmetics`, Wildcards (das hat die 406er aufgedeckt)

## Wichtige Dateien fuer naechste Session
- `docs/plans/2026-04-07-3-hub-architecture-spec.md` — Full Spec (SPEC+PLAN+EXECUTE)
- `memory/semantisch/projekt/architecture-3hub.md` — Verdichtung
- `e2e/qa-3hub.ts` — QA Script wiederverwendbar
- `.claude/rules/common-errors.md` — jetzt mit Supabase Client Section
