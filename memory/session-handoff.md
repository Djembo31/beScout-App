# Session Handoff
## Letzte Session: 2026-04-08 (Mittag → Abend, 17 Commits, alle offenen Punkte abgeschlossen + B1 Missions E2E)

## 🔖 NEXT SESSION KICKOFF — B2 Following Feed E2E

**Erstmal lesen:**
1. Diesen Handoff (du bist hier)
2. `memory/project_e2e_features.md` — 3 Features approved 2026-04-04
3. Der "B1 Missions E2E" Block unten in diesem File — zeigt das Audit-Pattern

**Pattern (von B1 bewaehrt):**
1. **Discovery** — Scan: existierender service/hook/component/page/migration code für Following Feed
2. **Reality Check** — was ist schon gebaut, was fehlt, was ist kaputt
3. **Report** → 3 gezielte Fragen an Anil (A/B/C Stil), damit er die Tiefe wählt
4. **Phase A-E** — implementieren basierend auf seiner Antwort (meist "alles/e")
5. **Live Test** als jarvis-qa via playwright
6. **Commits** — thematisch split, dann push

**Startpunkte für B2 Discovery:**
- Services: `src/lib/services/social.ts` (hat followUser + getUserStats — schon genutzt)
- Queries: `src/lib/queries/` — gibt es `useFollowing*` queries?
- Components: `src/components/` — gibt es FeedCard, FollowingFeed?
- Route: `src/app/(app)/feed/` oder wo? Oder unter community?
- DB: `user_follows` table existiert (siehe database.md: `following_id` column)

**QA Account (unveraendert):**
- Email: jarvis-qa@bescout.net / Handle: jarvisqa
- Password: `JarvisQA2026!` (e2e/mystery-box-qa.spec.ts:5)
- ~7.700 $SCOUT, 63 Tickets, 6 Tage Streak, 8 Holdings, 1 Manager-Lineup

**MCP Tools einsatzbereit:**
- `mcp__supabase__execute_sql` (project_id: `skzjfhvgccaeplydsunz`)
- `mcp__supabase__apply_migration` — für DB cleanup migrations
- `mcp__playwright__browser_*` — für Live E2E Tests

---

## TL;DR
Manager Team-Center Wave 0-5 ist KOMPLETT + auf prod verifiziert. CI ist nach monatelangem Rot-Stand **wieder grün**. Alle Handoff-Punkte dieser Session abgearbeitet. Keine offenen Krümel.

## Was wurde gemacht — 8 Commits, alle gepusht, alle auf prod

### Vor dieser Session bereits committed (Manager Team-Center Wave 0–5)
| Wave | Inhalt | Commits |
|------|--------|---------|
| 0 | Hook Extraction `useLineupBuilder` aus EventDetailModal | 8553968 + cae9326 |
| 1+2 | Foundation Skeleton + 3-Tab Hub + Kader Migration aus /market | 461d021, a80abb5, c0dadca, 27b36c3 |
| 3 | Aufstellen-Tab mit Direct Event Join | bbe6086, 4911ce0 |
| 4 | Historie-Tab + HistoryStats + W4.4 Cross-Tab | 8ee4c0f, 5777788 |
| 5 | Cleanup, Refactor, Tests, Code Review Polish | 9646ec2, cb4ce3f, 4a300c1, 9763f95, d9c1a5a |

Begleitend: `useLineupSave` Hook (9763f95) + 26 neue Unit-Tests (d9c1a5a).

### Diese Session — 8 Commits

**Phase 1: Visual QA + PageHeader-Fix + Test-Repairs**
- `d16b493` **fix(manager)** — PageHeader nextEvent aus useOpenEvents (war hardcoded null). Entdeckt in Visual QA, Pille 3 zeigte permanent "Kein Event" trotz aktivem Turkish Airlines Liga Event. **Auf prod verifiziert** nach Deploy.
- `fefd67c` **test(gamification)** — AchievementUnlockModal href-Erwartung auf `/missions` angepasst (post 3-hub refactor, Test hing der Code-Aenderung nach).
- `68461cb` **test(business-flows)** — FLOW-11 erlaubt jetzt `score_event_no_lineups_handling` Migration edge case (ended events mit `lineups=0 AND scored_at IS NOT NULL`).
- `81cc953` **docs(manager)** — PLAN GATE final abgehakt, Wave 0-5 Status-Tabelle, Visual QA + Cleanup Findings.

**Phase 2: Memory Hygiene**
- `08e039c` **docs(testing)** — Visual QA Playbook aus Draft 2026-04-07-qa-visual-3hub-refactor.md promoted nach `.claude/rules/testing.md`. 2 stale Drafts (2026-04-02) geloescht (waren bereits am 2026-04-03 PROMOTED + REVIEWED, haetten damals geloescht werden sollen). Learnings-Queue truncated.
- `6a2a5b6` **chore(memory)** — AutoDream v3 Consolidation (38 Sessions overdue): 5 Retros → neues semantisches `memory/semantisch/projekt/manager-team-center.md`, "Hardcoded null Anti-Pattern" promoted nach `memory/errors.md`, Wiki-Index aktualisiert.

**Phase 3: CI Resurrection** (CI war seit 2026-02 rot)
- `b88aa7c` **ci(vitest)** — Integration-Tests ausgeschlossen wenn `CI=true && !SUPABASE_SERVICE_ROLE_KEY`. 10 Glob-Pattern decken 16 Files ab (auth/rls-checks, boundaries, bug-regression, concurrency, contracts, db-invariants, flows, money, state-machines, unicode). Lokal bleibt alles wie vorher (2347 gruen).
- `868b8ce` **fix(services)** — 4 fire-and-forget `checkAndUnlockAchievements` Aufrufe in ipo.ts, trading.ts (2x), offers.ts hatten das Muster `.then(({fn}) => { fn(id); })` — das innere Promise wurde NICHT returned, outer `.catch` fing nur import-failures nicht den echten Call. Im CI ohne SUPABASE_SERVICE_ROLE_KEY griff `vi.mock` nicht zuverlaessig fuer dynamic imports → echter social.ts geladen → `getUserStats` Network Error → unhandled rejection → vitest exit 1. Fix: Body-Block → Expression (`.then(... => fn(id))`), outer catch greift jetzt. **CI nach diesem Commit zum ersten Mal gruen.**

### Findings

**Homepage 5 prod console errors** (AuthProvider loadProfile RPC Timeout + Wallet balance fetch Timeout) → **transient**. Beim 2. Check waren 0 Errors. Retry-Layer (3x fallback fuer AuthProvider, 3x fuer Wallet) fangen das sauber. Kein Code-Fix noetig. Supabase-Latenz-Swings, keine Auswirkung auf User-UX.

**Pre-existing ESLint Warnings** (7x, 5 in PitchView.tsx `<img>`, 2 in useLineupBuilder.ts exhaustive-deps) — intentional design decisions, non-blocking, nicht in dieser Session eingefuehrt.

## Build Status (final)
- `tsc --noEmit`: CLEAN
- vitest lokal (voll): **2347/2347 gruen** (170 Files)
- CI Pipeline: **lint ✓, build ✓, test ✓** auf SHA d1e2feb — **170/170 Files, 2346 Tests passed + 1 skipped, identisch zu lokal** (Integration-Tests laufen jetzt auch im CI seit SUPABASE_SERVICE_ROLE_KEY Secret gesetzt ist)
- ESLint manager+fantasy: 0 errors, 7 pre-existing warnings

## Stand jetzt — keine offenen Krümel

### Alle Handoff-Punkte dieser Session abgeschlossen
- ✅ Wave 5 T5.3 Visual QA Mobile + Desktop (6 Screenshots `qa-manager-{mobile,desktop}-{aufstellen,kader,historie}.png` im Repo-Root, gitignored als `/*.png`)
- ✅ Wave 5 T5.4 Final Cleanup (0 console.log, 0 TODO, 0 empty catches)
- ✅ PageHeader nextEvent Fix — prod-verifiziert
- ✅ 2 Test-Failures gefixt → lokal 2347/2347 gruen
- ✅ AutoDream Memory Consolidation (38 Sessions overdue → 0)
- ✅ /reflect Drafts-Queue (3 → 0: 2 stale geloescht, 1 promoted)
- ✅ Learnings-Queue truncated
- ✅ CI seit 2026-02 rot → **grün** nach 2 Commits (vitest config + fire-and-forget fix)
- ✅ Homepage errors investigiert → transient, kein Fix noetig

### Was koennte als naechstes kommen
- Keine kritischen offenen Punkte.
- Naechste Feature-Arbeit aus project_e2e_features.md: B2 Following Feed E2E, B3 Transactions History E2E.
- Onboarding ohne Club-Bezug (project_onboarding_multi_club.md).
- Chip/Equipment System (project_chip_equipment_system.md).

## B1 Missions E2E Audit + Polish (diese Session Nachmittag, 4 Commits)

**Discovery:** Backend + Components + DB Schema existieren komplett. Aber
6 Code-Call-Sites triggerten non-existent mission keys, 5 DB-Definitions
waren Dead-Duplicates ohne Code-Coverage, Market/Manager/Home fehlten
MissionHintList-Integration, und Claim-Notification crashte an CHECK
constraint.

**Phase A — Code→DB key alignment (3c23199):**
- `daily_trade` → `daily_trade_2` (4 trading.ts + 1 offers.ts + 1 ipo.ts)
- `weekly_5_trades` → `weekly_trade_5` (gleiche 6 stellen)
- `first_ipo_buy` entfernt (nicht in DB, system unterstuetzt kein onetime type)
- Plus: buyFromMarket/buyFromOrder/placeBuyOrder triggern jetzt zusaetzlich `daily_buy_1`, placeSellOrder triggert `daily_sell_1`

**Phase B — DB cleanup (701c071):**
- Migration `missions_deactivate_dead_duplicates`: 5 Definitions auf active=false:
  - weekly_3_posts (duplicate zu create_post)
  - weekly_research (duplicate zu write_research)
  - daily_visit_players (braeuchte page-visit tracking)
  - weekly_diverse (braeuchte holdings diversity counter)
  - weekly_follow_3 (braeuchte weekly follow counter)
- Resultat: 30 → 25 active mission_definitions

**Phase C — Fehlende Triggers + HintList Rollout (929eeca):**
- posts.ts createPost: daily_post zusaetzlich
- research.ts unlockResearch: daily_unlock_research + community_activity
- streaks.ts: KEIN client-trigger (record_login_streak RPC ruft intern
  update_mission_progress('daily_login') via SECURITY DEFINER — client-side
  waere Doppel-Increment, nur im Kommentar dokumentiert)
- MissionHintList integriert:
  - Market (context="trading"): nach TabBar, vor TabPanels
  - Manager (context="fantasy"): zwischen PageHeader und TabBar
  - Home (context="fantasy"): bedingt auf !isNewUser (weil new user bereits
    OnboardingChecklist als strukturierte Fortschrittsliste sehen)

**Phase E — Live Test Findings (be63858):**
- Claim Flow E2E durchgezogen als jarvis-qa
- **Bug entdeckt:** Claim von daily_login reward crashte an
  `notifications_reference_type_check` (erlaubte 10 types, 'mission' fehlte)
- **Fix:** Migration `notifications_allow_mission_reference` — CHECK extended
  um 'mission' als 11. erlaubten reference_type
- Verifiziert nach Fix:
  - claim daily_login: wallet 755000 → nope noch nicht, claim erfolgte vor Fix
  - claim weekly_fantasy: wallet 755000 → 770000 cents (+150 $SCOUT)
  - mission_notif_count: 0 → 1 (Notification erstellt)
  - 0 Console-Errors
- MissionHintList verifiziert live:
  - /manager: "Fantasy-Event beitreten +50", "Top 3 Platzierung +250" sichtbar
  - /market: "Kaufe 1 DPC +35", "Verkaufe 1 DPC +35" sichtbar (NEUE triggers live!)
  - /: keine Hints (jarvis-qa ist onboarding 1/5 = new user, by design)

## Wichtige Dateien fuer naechste Session
- `docs/plans/2026-04-07-manager-team-center-plan.md` — vollstaendiger Wave 0-5 Status
- `memory/semantisch/projekt/manager-team-center.md` — AutoDream-Verdichtung der kompletten Migration
- `memory/errors.md` — Hardcoded null Anti-Pattern neu
- `.claude/rules/testing.md` — Visual QA Playbook neu
- `vitest.config.ts` — CI integration-test exclusion logic

## Architektur-Notizen

### Hardcoded null Anti-Pattern (promoted zu errors.md)
Wenn ein Component-Prop existiert, MUSS er in der Implementation real verbunden sein. `nextEvent={null}` ist keine neutrale Default — es ist eine semantische Luege gegenueber dem User. Symptom: Component rendert aber zeigt permanent Empty-State.

### Dynamic Import + fire-and-forget Promise Pattern (CI trap)
```ts
// FALSCH (unhandled rejection):
import('@/lib/services/X').then(({ fn }) => {
  fn(userId);  // ← NEW PROMISE, NICHT returned, outer .catch greift nicht
}).catch(err => console.error(...));

// RICHTIG:
import('@/lib/services/X').then(({ fn }) =>
  fn(userId)  // ← returned, outer .catch greift
).catch(err => console.error(...));
```
Lokal lief die falsche Version weil echter DB-Call erfolgreich war. Im CI ohne env vars crashte `vi.mock` bei dynamic imports nicht zuverlaessig → echter service geladen → Network error → vitest exit 1.

### Wave 5 T5.1 — Plan-Abweichung legitim
Plan sah Loeschung von `intel/{Stats,Form,Markt}Tab.tsx` vor (Logik in PlayerDetailModal kopieren). Tatsaechlich: dynamic-imported als shared deps. DRY > Plan-Treue.

### Integration-Tests im CI (active seit d1e2feb)
16 Test-Files treffen die echte prod Supabase DB. Brauchen `SUPABASE_SERVICE_ROLE_KEY` — jetzt als GitHub Secret gesetzt (Session 2026-04-08). `ci.yml` test job bekommt via `env:` block alle drei Supabase vars (URL + ANON_KEY + SERVICE_ROLE_KEY). Volle 170/170 Files laufen im CI, identisch zu lokal. Die defensive exclusion in `vitest.config.ts` (`CI=true && !SUPABASE_SERVICE_ROLE_KEY`) bleibt als Fallback fuer PRs von forks oder kuenftige Umgebungen ohne Secret.

## QA Account (unveraendert)
- Email: jarvis-qa@bescout.net / Handle: jarvisqa
- Password: `JarvisQA2026!` (in `e2e/mystery-box-qa.spec.ts:5`)
- ~7.540 CR, 8 Holdings, 38 Tickets, 6 Tage Streak, 1 Manager-Lineup (Sakaryaspor Fan Challenge GW34)
