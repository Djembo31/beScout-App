# Session Handoff (2026-04-22 00:00)

## Session-End 2026-04-22 — Slice 133 DONE + Rollback-Drill pausiert

**Headline:** /clubs player-count war kaputt (23% der Wahrheit durch PostgREST-Row-Cap). In einer Session identifiziert, gefixt, live verifiziert auf bescout.net. Follow-UX parallel optimistic gemacht. 4 Beta-Blocker gleichzeitig erledigt.

### Commits diese Session (chronologisch)
1. `fd4a2282` — Slice 133: `/clubs` player-count chunking + follow optimistic (Code + Tests + Specs/Impact/Proofs)
2. `e3f537d8` — Slice 133 Post-Deploy-Proof (Playwright gegen bescout.net, 11/11 Clubs OK)

### Decisions etabliert diese Session (`memory/decisions.md`)
- **D8** PROCESS — Bug-Triage mit **DB-Truth-First** bei UI-Daten-Anomalien (SQL vor Code-Walk, in Slice 133 90s statt 15min)

### Code-Rules erweitert (`.claude/rules/common-errors.md`)
- **PostgREST 1000-row cap — Section um Slice 133 erweitert:** `.limit(N)` ist **KEIN** Override-Path. Auch mit `.limit(10000)` cappt PostgREST bei ~1000 Rows. Nur `.range()`-Chunking funktioniert. Audit-Grep für vierstellige Limit-Calls hinzugefügt.

### Test-Infrastruktur bestätigt
- Synthetic-Suite (`pnpm run test:synthetic`) mit `--workers=3 --fully-parallel` Override funktioniert: 3 Profile parallel in 1.3 Min statt ~3 Min seriell. 0 pageerrors. CSP-Sentry-Fix aus voriger Session hält.
- Smoke-Suite (`pnpm run test:smoke`) 10 Flows grün in 9.4s gegen bescout.net.

## /clubs-Fix im Detail (für Blame-Historie)

**Problem (aus Screenshot):** Alle Süper-Lig-Clubs zeigten 2-10 Spieler (real 20-47). Follow-Click hatte spürbare Latenz bei Fans-Counter und „Deine Vereine" Section.

**Root-Cause #1 (Data):** `getClubsWithStats` in `src/lib/services/club.ts` hatte `.limit(10000)` — aber der Supabase/PostgREST-Setup cappt trotzdem bei ~1000 Rows, egal was im Code steht. 4232 non-stale Player-Rows × 23.6% = ~1000, was die UI-Zahlen exakt erklärt hat. Pattern-Klasse: Slice 079b.

**Root-Cause #2 (UX):** `ClubProvider.toggleFollow` machte `await toggleFollowClub` + `await getUserFollowedClubs` **vor** jeder State-Update. Kein Optimistic. 500ms–2s Latenz auf Mobile 4G bis UI reagiert. Detail-Page (`useClubActions`) hatte das längst richtig gelöst, Provider hinkte hinterher.

**Fix:**
- Chunking via `.range(offset, offset+999)`-Loop für `players` + `club_followers` Queries, explicit error-throw pro Chunk
- Optimistic Add/Remove im Provider mit Revert-on-error, neuer optionaler `clubData: DbClub` Parameter (backward-compatible)
- Lokaler Card-Counter in `/clubs/page.tsx` bewegt vor dem await, Revert in catch

**Evidenz (live auf bescout.net):**

| Club | Vor Fix | Nach Fix | DB |
|---|---:|---:|---:|
| Beşiktaş | 2 | **20** ✅ | 20 |
| Galatasaray | 8 | **35** ✅ | 35 |
| Eyüpspor | 9 | **47** ✅ | 47 |
| Alanyaspor | 7 | **33** ✅ | 33 |
| (11/11 geprüfte Clubs OK) | | | |

## Rollback-Drill: PAUSIERT, nicht abgeschlossen

**Stand vor der Unterbrechung:**
- Pre-Flight clean: Vercel CLI 51.7.0, aktueller Prod-Deploy `9hzarqely` (nun abgelöst durch `remoqy2gi` + Slice 133), Rollback-Target `a37bbvqj9` als Fallback ermittelt
- Intentional-Bug-Plan war: `🧪`-Emoji an `welcomeTitle` in `messages/de.json` → Push → warten auf Deploy → `vercel rollback` mit Timer → Proof-File

**Warum pausiert:** Anil meldete den /clubs-Bug mittendrin. Fix hatte höhere Priorität (Beta-Blocker). Drill verschoben auf frische Session.

**Offen für nächste Session:**
- D3 („Rollback-Drill Pflicht vor Beta-Start") gilt weiter
- Drill-Plan in `memory/beta-rollback-runbook.md` (Section „Test-Prozedur VOR Beta-Start")
- Die 2 Prod-Pushes heute sind KEIN Drill-Ersatz — echter Drill braucht den `vercel rollback` Command mit Timing, das war nicht Teil des heutigen Flows

## Anil-Action-Items (unverändert aus Vorsession)

1. **3 Tester kontaktieren** (Phase 3b, `memory/beta-testplan.md` + DM-Templates in `memory/beta-testing-runbook.md`)
2. **Deutsch-Türke** für TR-Review nach Phase 3b (TR-String-Dump in `qa-screenshots/synthetic/profile-c-tr-locale/tr-strings.txt`, 1203 Zeilen)
3. **Vercel-Cron-UI-Check:** Bestätigen dass alle 6 Crons in https://vercel.com/bescouts-projects/bescout-app/settings/cron-jobs registriert + grün. (Confirmed Pro-Plan via `maxDuration=300` Nutzung)
4. **Sentry-Alerts Setup** (20 Min · `memory/beta-sentry-alerts-runbook.md`)
5. **Rollback-Drill** (20 Min · `memory/beta-rollback-runbook.md` — pausiert seit heute Abend)
6. **Invite-Liste 10-20 Pilot-Fans** für Phase 5
7. **Alten `sb_secret_vT7ae…`** in Supabase Dashboard revoken (neuer ist live-proven)

## Offene Beta-Blocker-Liste (Code-Seite)

**Gefixt heute:** ✅ /clubs player-count, ✅ /clubs follow-optimistic (beide live auf bescout.net)

**Offen:** Keine bekannten Code-Blocker. Nächste Priorität wäre nur ein neuer Report aus den Tester-Calls.

## Stash (alt)

- `stash@{0}: On main: slice122-parallel-wip` — existiert seit mindestens der Vorsession. Slice 122 ist seit Tagen live (Commit `57fc87…` Market-Dashboard). Anil sollte bei Gelegenheit entscheiden: `git stash show stash@{0}` anschauen + droppen, oder ignorieren. Ich fasse ihn nicht autonom an.

## Next-Session-Start

```
git log --oneline -10
cat worklog/log.md | head -30       # Slice 133 details
cat memory/decisions.md | head -30  # D8 als aktueller Kontext
pnpm run beta:metrics               # Aktuelle Beta-Zahlen
```

Dann entscheiden: Drill jetzt ODER Tester-Outreach ODER neue Beta-Blocker falls User-Reports.

## 🔒 Feature-Freeze aktiv

Jeder neue Slice gegen die Frage: „Bewegt das den Launch um einen Tag vor?"
Heute: Ja — `/clubs` zeigte falsche Zahlen auf Landing-Discovery, das war Vertrauens-Killer.
