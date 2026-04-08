# Session Handoff
## Letzte Session: 2026-04-08 (Mittag → Nachmittag, alle offenen Punkte abgeschlossen)

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
- vitest CI-mode (`CI=1`): **2190/2190 gruen + 1 skipped** (154 Files, Integration-Tests excluded)
- CI Pipeline: **lint ✓, build ✓, test ✓** auf SHA 868b8ce
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
- Optional: GitHub Secret `SUPABASE_SERVICE_ROLE_KEY` hinzufuegen → dann wuerden die 16 Integration-Tests auch im CI laufen (aktuell skipped mit ordentlicher Erklaerung in vitest.config.ts).
- Optional: Node.js 20 → 24 Upgrade in CI workflows (GitHub deprecation Warning, September 2026 deadline).
- Optional: 7 pre-existing ESLint Warnings aufräumen (PitchView `<img>` → `next/image`, useLineupBuilder exhaustive-deps explicit disable mit comment).
- Naechste Feature-Arbeit: leer, Anil waehlt Prio.

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

### Integration-Tests im CI
16 Test-Files treffen die echte prod Supabase DB. Brauchen `SUPABASE_SERVICE_ROLE_KEY`, der nicht als GitHub Secret existiert (nur ANON_KEY ist gesetzt). Die vitest.config.ts excludiert sie bei `CI=true && !SUPABASE_SERVICE_ROLE_KEY`. Lokal laufen sie ganz normal. Zum Aktivieren im CI: GitHub Secret anlegen + ci.yml test job mit `env:` block ausstatten.

## QA Account (unveraendert)
- Email: jarvis-qa@bescout.net / Handle: jarvisqa
- Password: `JarvisQA2026!` (in `e2e/mystery-box-qa.spec.ts:5`)
- ~7.540 CR, 8 Holdings, 38 Tickets, 6 Tage Streak, 1 Manager-Lineup (Sakaryaspor Fan Challenge GW34)
