<!-- auto:handoff-start -->
# Session Handoff — Auto (2026-05-02 15:54)

> Dieser Block wird vom Stop-Hook aktualisiert. Manueller Rich-Content steht ausserhalb der Marker.

## Uncommitted Changes: 5 Files
```
 M .claude/settings.local.json
 M memory/session-handoff.md
?? worklog/audits/audit-stale-2026-05-02.md
?? worklog/audits/type-truth-2026-05-02.md
?? worklog/audits/wiring-2026-05-02.md
```

## Session Commits: 1
- ee31a628 feat(262): Home Hero-Mode-Detection + ManagerBlock (Phase 1 Identity-Foundation)

<!-- auto:handoff-end -->

---

# 🎯 Resume-Anker NÄCHSTE SESSION (post-2026-05-01) — Phase 1 Identity-Foundation gestartet, Slice 261 LIVE

**HEAD `3aae52c9` (+ `chore(session-end)` Folge-Commit)** Status: idle.

## Session 2026-05-01 Bilanz — Beta-Day-3 Live + Home-Redesign Phase 1 Start

| Slice | Status | Was |
|---|---|---|
| **268** M | ✅ live (Vortag) + Anil PROVE PASS heute | Cold-Start Cache-Mirror Wallet+Tickets — Mobile-Safari 5-Step-Verify ✓ |
| **261** S | ✅ live (commit `3aae52c9`) | Home Layer 0 Gameweek-Status-Bar — Phase 1 Identity-Foundation startet |

## Heute neu etabliert

**D63 (decisions.md): Home-Ultimate-Redesign-Plan — 5-Phasen-Roadmap**
- Vision: „BeScout-Identität in 5 Sekunden — Manager + Scout parallel above-the-fold"
- ~13 Slices über 5 Phasen (261-273): Identity-Foundation → Action-Layer → Live-Pulse → Discovery → Visual-Polish (Bilder)
- Kontextueller Hero: aktive GW = Manager-Block primär, Off-GW = Scout-Block primär, 0-Holdings = CTA-Block
- Anil-approved 2026-04-30, Phase 1 startet Slice 261

**D64 (decisions.md): Multi-Choice-Decisions Format — Spec-Iteration-Speedup**
- Bei ≥ 2 offenen CEO-Decisions: kompakte Tabelle mit Optionen-Buchstaben + CTO-Empfehlung
- Anil antwortet kompakt z.B. „A=b · B=a · C=ja"
- Empirisch: Slice 261 Spec-Iteration brauchte 3 Decisions, alle in 1 Round-Trip statt 3
- Anwendbar nur bei klar enumerierbaren Decisions, NICHT bei open-ended Strategy

**Slice 261 Lehrstoff (D62 Pay-Off bestätigt):**
- 2 Pre-Review-Iterationen haben mind. 1 BUILD-Revert + 1 Heal-Slice gespart
- Cold-Context-Reviewer fand Spec-Faktenfehler die Author durch Habit-Blindspots übersah:
  - TopBar `z-30` (Author dachte z-40+) → Bar muss non-sticky sein
  - DbEvent hat nur `league_id` (Author dachte `league` String) → Filter-Pattern korrigiert
  - `getTimeUntil` nicht locale-aware → ACs angepasst
  - `eventMapper.ts` schreibt `leagueId` heute NICHT → 1-Zeilen-Patch hinzugefügt
  - HomeStoryHeader `-mx-4 -mt-4` Edge-zu-Edge → Bar mountet INNERHALB Wrapper

**errors-frontend.md neuer Eintrag:** `gold-pulse-bg` ist statischer Gradient, Pulse-Animation braucht zusätzlich `motion-safe:animate-pulse`. Pattern-Source: `HomeSpotlight.tsx:311` (NextEvent-Card kombiniert beide).

## Anil-Action-Items für nächste Session

### Höchste Priorität — Phase 1 fortsetzen
1. **Slice 262 starten** — Hero-Mode-Detection-Hook + Manager-Block-Component (für aktive GW)
   - Spec-Anchor: D63 Hero-State-Matrix (Manager primär bei aktive GW, Scout primär off-GW, CTA bei 0-Holdings)
   - State-Source: `useHomeData()` Derived-Wert `heroMode: 'manager' | 'scout' | 'cta-new'`
   - D62-Pflicht: Reviewer-VOR-BUILD weiterhin Standard
2. **Slice 263 anschließen** — Liga-Rang-Pill + Streak-Risk + Scout-Block-Component (Off-GW)
   - Brauche neuen Service `getLeagueRank(userId, leagueId)` (existiert heute nicht)

### Wenn Phase 1 done
3. **Phase 2 Action-Layer starten** — ActionRequiredStack vor Spotlight (Captain/Lineup/Wildcard)

### Bei neuen Tester-Findings
4. **Friction-Punkte als Healer-Slice triagieren** — root-cause-first (kein Symptom-Reflex), Defense-in-Depth-Pattern

## Bei Resume — Erste-Action-Pfad

```
1. /clear (falls neue Session)
2. Lese diesen Resume-Anker
3. Lese worklog/active.md (status: idle)
4. git log --oneline -5 (Commits dieser Session)
5. Anil-Frage: „Slice 262 starten oder anderes Thema?"
6. Bei „262": SHIP-Loop SPEC mit D63 Hero-State-Matrix + D62 Reviewer-VOR-BUILD
```

# 📋 Vor-heute Resume-Anker (Beta-Day-3 Vormittag, 2026-05-01)

**HEAD `8756b5dd`** post-Sentry-Auto-Resolve-Commit. Status: idle.

## Session 2026-04-30 Abend Bilanz — Beta-Day-3 (5 Slices, 2 Reverts, 2 saubere Erfolge)

| Slice | Status | Was |
|---|---|---|
| **265** P1 | ❌ REVERTED (vorherige Session) | TopBar Wallet+Tickets localStorage-Mirror — broke Page-Render |
| **266** P1 | ❌ REVERTED diese Session | TopProgressBar NProgress-Style — broke Spieltag + Manager. Eigentliche Ursache war NICHT 266 sondern Slice 267 Map-Persist-Bug der parallel manifestierte. |
| **267** P0 EMERGENCY | ✅ live | **Map-Persist-Korruption Heal** — Defense-in-Depth Layer 4 in QueryProvider.tsx (`data instanceof Map/Set` deny) + Defensive Reconstruction in useFixtureDeadlines + Buster-Bump v1→v2-slice267. 9 Services generisch geschützt. |
| **268** M | ✅ live | **Cold-Start Cache-Mirror Wallet+Tickets** (Slice-265-done-right) — UID-keyed localStorage-Mirror mit `placeholderData` (NICHT initialData), `staleTime: 0`, AuthProvider clearCachedAllSlots SYNCHRON neben lsClear. 59/59 Tests grün. **Reviewer-VOR-BUILD-Stage zum ersten Mal architektonisch durchgezogen**. |

## Was heute verstanden wurde

**Slice 266 → Slice 267 → Slice 268 als Lehr-Sequenz:**

1. **Slice 266 wurde fälschlich revertet als Bug-Quelle.** Echter Bug war Slice 267 (Map-Persist) — Manifestation parallel mit Slice 266 hat Verwirrung erzeugt. Ohne Anil's Wut-Trigger ("lös mir endlich dieses fucking Problem") wäre ich auf der Slice-266-Spur geblieben.

2. **Anil's neuer Default-Standard etabliert** (`memory/feedback_root_cause_eifer.md`): root-cause-first, defense-in-depth, user-state-migration mit Buster-Bump, Pattern-Promotion ohne Aufforderung.

3. **Reviewer-VOR-BUILD-Pattern (D62) etabliert.** Bei Re-Doing-Reverted-Slices Reviewer-Agent **VOR** Code prüft die Spec — Slice 268 hatte 3 MINORs gefunden bevor Code geschrieben (15 min Spec-Edit statt 1-2h Code-Rewrite).

## Sentry-Status (post-Session)

**Pre-Slice-268 Issues (Release `909bc9b4`):**
- #11/#12/#13 (n.values is not a function, /manager) — **Auto-Resolved** via Commit `8756b5dd` Annotation. Slice 267 hat die Bug-Klasse generisch gefixt.
- #14 Timeout auf `/` (78 events, 1 user = 3rd Tester `cloud` iPhone iOS 18.5) — Pre-Slice-268. **Sollte stark reduziert** durch Slice 268 placeholderData-Mirror (instant-render statt 10s-Wait). **WATCH:** Ob neue Events post-Slice-268-Deploy entstehen.
- #10/#Z AbortError auf `/`, `/fantasy` — Mobile-Safari SDK-Quirks, `handled: yes` graceful-degraded.

**Sentry-Sample-Rate = 0.01** (1%). Wenn morgen Beta-Tester live sollen, erwägen → 1.0 (100%) bumpen für Beta-Day-3.

## Anil-Action-Items für morgen früh

### Höchste Priorität
1. **Live-Verify Slice 268** (5-Step Mobile-Safari Inkognito Test, siehe Spec Sektion 8):
   - Cold-Start warm-cache → Wallet+Tickets INSTANT (<200ms)?
   - Cold-Start no-cache → 4-9s Skeleton dann normal?
   - User-Switch User-A→User-B → keine Cross-User-Leaks?
   - SIGNED_OUT → bs_wallet_<uid>+bs_tickets_<uid> sofort entfernt?
   - Sentry-Watch 30s → 0 neue Errors?

2. **Wenn 1 PASS:** Pesmerga + 3rd Tester live einladen für Beta-Day-3 Echtzeit-Feedback.

3. **Wenn 1 FAIL:** Sofort Console-Output + Screenshot + Sentry-Issue-ID sammeln (NICHT raten/reverten ohne Beweis — Slice-265+266-Lehre).

### Optional
4. **Sentry-Sample-Rate 0.01 → 1.0** in Vercel Env-Vars für Beta-Day-3 (mehr Visibility bei echten Tester-Sessions).
5. **Issues #11/#12/#13 in Sentry-UI checken** — Sentry-Webhook sollte sie nach `8756b5dd` Deploy als resolved markieren. Wenn nicht: Issue-Status manuell setzen (3 Klicks).

## Bei Resume morgen — Erste-Action-Pfad

```
1. /clear (falls neue Session)
2. Lese diesen Resume-Anker
3. Lese worklog/active.md (status: idle)
4. git log --oneline -10 (heute 9 commits + 8756b5dd Sentry-Auto-Resolve)
5. Anil-Frage: "Hast du Slice 268 Live-Verify gemacht? PASS oder FAIL?"
6a. Bei PASS: Beta-Day-3 Tester live, Sentry-Sample-Rate-Bump erwägen, Real-Time-Feedback sammeln
6b. Bei FAIL: Console+Sentry Beweis sammeln, root-cause-first triage (NICHT Slice 268 reverten ohne Diagnose)
```

# 📚 Lessons Learned aus Session 2026-04-30 Abend (für patterns.md / errors-frontend.md candidates — bereits drin)

## Pattern #45 (patterns.md): Cold-Start UID-keyed Cache-Mirror
- Helper-Module + Hook-Augmentation + AuthProvider-Sync (3-Layer)
- placeholderData (NICHT initialData!) für Money-Path-Schutz
- UID-keyed Slots gegen Cross-User-Pollution

## Decision D62 (decisions.md): Reviewer-VOR-BUILD bei Re-Doing-Reverted-Slices
- Empirisch: 100% Hit-Rate bei Slice 268 (3 MINORs gefunden)
- Stage-Chain: SPEC → IMPACT → REVIEWER-VOR-BUILD → BUILD → REVIEWER-POST-BUILD → PROVE → LOG

## errors-frontend.md neu: TanStack v5 initialData vs placeholderData Decision-Tree
- `initialData` markiert als data persistiert, dataUpdatedAt = Date.now() → Money-Path-Risk
- `placeholderData` rendert UI ohne data zu persistieren, dataUpdatedAt = 0 → Money-Path geschützt

## errors-frontend.md (Slice 267): Map/Set-typed React-Query-Data + Persist/SSR
- Service-Layer NIEMALS Map direkt returnen wenn Persist/SSR involviert
- Defense-in-Depth Layer 4 in QueryProvider als generischer Schutz

---

# 📋 Vor-heute Resume-Anker (Beta-Day-2 Abend, 2026-04-30 vor dieser Session)

**Anil-Direktive Session-Ende 2026-04-30:** "passt, wir setzen morgen bei b an!" — bezieht sich auf **Option B** aus der Audit-Empfehlung: **architektonischer Provider-Cascade-Refactor** (Smoking-Gun #3 ECHTER Fix).

## Bei `/clear` morgen früh — lese in dieser Reihenfolge

1. `worklog/active.md` — `status: idle`, HEAD `f4dbcd33`
2. Diese Datei (Resume-Anker oben + System-Audit-Sektion unten)
3. `git log --since="2026-04-30 00:00" --oneline` (16 commits heute, davon 2 reverts)
4. `worklog/log.md` Top 6 Einträge (259→264, je full Stage-Chain)
5. **Bug-Liste** (Sektion unten "Anil-gemeldete Symptome heute")

## Was heute passiert ist (Beta-Day-2, 6 Slices + 1 Revert)

| Slice | Status | Was |
|---|---|---|
| **259** P0 EMERGENCY | ✅ live | SW Cache-Pollution Heal — Smoking-Gun #1 (1899 stale → 0 verifiziert) |
| **260** P1 | ✅ live | Auth-Hydrate Hardening — Smoking-Gun #5 + #7 (sessionStorage→localStorage + idle-callback) |
| **261** P2 | ✅ live | TanStack Persist-Cache — Smoking-Gun #6 (3-Layer-Defense Allowlist) |
| **262** P3 | ✅ live | Middleware Public-Route-Bail-Out — Smoking-Gun #4 |
| **263** P0 | ✅ live | loadProfile Mobile-Safari Timeout-Bump (3s→10s, 8s→15s, 5s→12s) |
| **264** P0 | ✅ live | AuthGuard Architektur-Refactor — Smoking-Gun #3 (TEIL-fix) |
| **265** P1 | ❌ REVERTED | TopBar Wallet+Tickets Cold-Start Mirror — broke generelle Page-Render |

## Anil-gemeldete Symptome heute (chronologisch)

1. **Vormittag (vor 259):** "Initial Load funktioniert schrott — jedes Mal Refresh nötig damit App lädt. Nach Refresh OK." → Slice 259 SW-Heal
2. **Nach 259+260 deploy:** "selbes schroot verhalten bei incognito fenster auf safari! 1 alle, 2 muss reload machen mehrmals, 3 skeleton" + Sentry-Console "loadProfile RPC slow Timeout" → Slice 263 Timeout-Bump + Slice 264 AuthGuard-Refactor
3. **Nach 263+264 deploy:** "schon deutlich besser, aber beim kalt start home hat geladen, geld und tickets waren nicht geladen, konnte auch nicht klicken bzw navigieren, musste wieder refreshen, danach ging es"
4. **Nach 265 deploy (BROKE):** "irgendwas ist schief gegangen, die seiten laden nicht mehr die contents, und nach dem ersten start kam Geld und Tickets nicht und ein refresh hat da nichts gebracht" → Slice 265 REVERT

## Verbleibende Bugs (Beta-Day-3 Backlog)

**Symptom #3 (post-264, vor 265-Revert):** Cold-Start zeigt Page sichtbar aber Wallet+Tickets leer + Click-Navigation queued. Wahrscheinliche Ursache: **Mobile-Safari Initial Query-Storm** — viele parallele queries beim Mount, Connection-Pool exhausted, kritische queries (wallet, tickets) hängen in queue. Kann nach 5-15s Refresh nötig.

**Smoking-Gun #3 nur TEIL-gefixed:** Slice 264 hat AuthGuard-Block entfernt, aber **Provider-Cascade selbst** ist noch sequentiell:
```
AuthProvider → loadProfile (10s timeout) → setProfile/setPlatformRole/setClubAdmin (3 setStates)
ClubProvider → wartet auf user → initClubCache + initLeagueCache (parallel) → followedClubs query → activeClub hydration → leagueScopeHydrated cascade
```
Alles **sequentiell statt parallel**.

## 🎯 Option B — Morgen's Plan (Architektur-Refactor)

**Slice 266 P0 — Provider-Cascade Parallelisieren** (~4-6h, Reviewer-Pflicht)

**Konkrete Hypothese was zu fixen ist:**
1. **`(app)/layout.tsx` Mount-Order**: Aktuell `<TourProvider><BackgroundEffects /><SideNav /><TopBar /><AuthGuard>{children}</AuthGuard></TourProvider>`. TopBar+SideNav sind außerhalb AuthGuard und feuern eigene Queries (useWallet, useUserTickets, useFollowedClubs, useNotifications) — alle gegated auf `user?.id`. Beim Mount: AuthProvider lädt user (10s), parallel feuern TopBar/SideNav-Queries sobald user da ist. Auf Mobile-Safari: Connection-Pool-Limit → queue.
2. **Lösungsansatz A:** Stagger queries — kritische zuerst (wallet, holdings, profile), non-kritische in idle-callback (notifications, sponsors, equipment-defs, mystery-box-drop-rates).
3. **Lösungsansatz B:** Server-Component RSC Auth-Hydrate — `get_auth_state` als Server-Action im RootLayout, dehydrate via `<HydrationBoundary>` → Client kriegt Profile sofort, kein 10s wait.
4. **Lösungsansatz C:** Persist-Cache erweitert um wallet+tickets via SAFE Pattern (per-user-keyed mit User-Switch-Detect-Cascade — was Slice 265 versuchte aber broke). Slice-265-Bug muss FIRST diagnosed sein.

**Empfohlener Sub-Plan:**
- **Slice 265 Post-Mortem ZUERST** — was hat Slice 265 BROKEN? Browser-Console-Output von Anil's Test fehlt. Hypothesen:
  - `initialData` + `initialDataUpdatedAt: 0` + `enabled: !!userId` + Key-Wechsel `['wallet', 'no-user']` → `['wallet', uid]` Race
  - lsClear-Loop mit `localStorage.length` während Modifikation (sollte safe sein wegen `keysToRemove`-Array)
  - Konflikt mit Slice 261 persist-cache (wallet ist USER_SCOPED denied)
  - TypeScript-cast `as DbWallet` mit minimal-shape — runtime-OK aber TopBar-consumer könnte NumTick-loop triggern?
- **Slice 266 Fokus:** Cold-Start-UX endgültig. Ansatz B (RSC Auth-Hydrate) ist sauberer als A (Stagger). Aber RootLayout-Touch-Risk wenn Anil parallel Home-Arbeiten macht.

## System-Audit Findings (Open Risiken — defer post-Beta wenn nicht akut)

1. **gcTime 24h** (Slice 261) — Memory-Bloat-Risk Tab-stayer, bis 500MB
2. **localStorage-Bloat** (260+261) — Mobile-Safari ~5MB quota, kein monitor
3. **User-Switch-Detect-Cascade** (260) — queryClient.clear() + persist-clear in 1s window
4. **Provider-Cascade sequentiell** (#3 nur teilgelöst) — Slice 266
5. **Test-Coverage-Gap** — kein Mobile-Safari-Simulation, keine Network-Stress-Tests

## Tech-Side-Status

- **Beta-Phase-Tracker:** Phase D, Anil-Mensch-Action-Block (3 Tester live, Tech-Block weg)
- **Findings_open:** P0=0 (alle gefixt), P1=1 (kalt-start Wallet leer — Slice 266 Backlog), P2=4 (Audit-Findings open), P3=3
- **Vercel:** HEAD `f4dbcd33` Live (post-Revert)
- **Sentry Production:** 0 unresolved letzte 2h post-Revert verifiziert
- **3rd Tester:** `cloud` (f3267e0d-149c) signed up 2026-04-30 08:34 UTC, has profile, signed-in iPhone Safari iOS 18.7

## Bei Resume morgen — Erste-Action-Pfad

```
1. /clear (falls neue Session)
2. Lese diesen Resume-Anker
3. Frage Anil: "Wie war Slice-264-Stand bei euch im Test gestern Abend? Refresh-Bug erledigt? Welche Bugs noch sichtbar?"
4. Slice 265 Post-Mortem (15-30 min):
   a. git show d76007f8 (revert-source) anschauen
   b. Hypothesen mit context7 TanStack-Query v5 verifizieren (initialData+enabled-Race)
   c. Browser-Test in Safari mit Slice-265-Code-temporär-applied → DevTools Console
5. Slice 266 SPEC schreiben: Provider-Cascade Refactor
   - Ansatz wählen (A Stagger | B RSC-Hydrate | C Persist-Mirror-mit-Mitigations)
   - CEO-Approval falls RSC Money-Path-betreffend
6. SPEC → IMPACT → BUILD (Reviewer-Agent VORHER, nicht nachher diesmal!) → PROVE → LOG
```

# 📚 Lessons Learned aus Beta-Day-2 (für Wiki / patterns.md candidate)

## Anti-Pattern: Quick-Fix-Cascade unter Live-User-Druck

**Was passiert ist:** Anil-Bug-Report → Deep-Dive identifiziert 7 Smoking-Guns → 6 Slices in 6 Stunden → Slice 265 broke (1 revert).

**Pattern:** Wenn Live-User auf Production testen und Reports kommen rein, ist der Reflex "schnell fix-forward". Aber: jeder Slice nach #4 hat exponentiell mehr Cross-Cutting-Risk weil vorherige Slices Architekturänderungen sind.

**Lehre für die Zukunft:**
1. **Erste 1-2 Slices** (P0 Emergency): fix-forward OK, akzeptiertes Risk
2. **Slice 3+:** Reviewer-Agent **VORHER** in spec-stage, nicht nach. Plus Live-Verify-on-actual-Mobile.
3. **Slice 5+:** STOP, audit, dann strategic refactor. Nicht weiter quick-fixes.
4. **Live-User ≠ Test-Env:** Sentry-Sample-Rate aufdrehen für Beta. Behavior-Tests mit echtem mobile-emulation.

## Pattern: Slice 265 Live-User-Bug-ohne-Diagnose

**Was passiert ist:** Slice 265 implementiert localStorage-Mirror für wallet/tickets. Tests 49/49 grün. Pushed. Anil testet → "Seiten laden nicht mehr die contents". Revert ohne Diagnose-Daten (kein Console-Output, kein Screenshot, keine Stack-Trace).

**Lehre:** Bei Live-User-Bug-Reports ZUERST Beweise sammeln (Console F12, Screenshot, optional Sentry-Event), DANN revert/fix. Das macht den Bug morgen findbar.

**Konkret morgen:** Slice 265 Code in git show — manuell durchsehen, hypothesen-getestet auf Test-Page deployen (NICHT Production), Console-Output capturen, dann gezielt fix.

---

# 📋 Vor-Heute Resume-Anker (Beta-Day-1, 2026-04-29 abends)

**HEAD `42badf34`** post-Slice-260 Live-Verify-Push. Status: idle.

**Bei `/clear` morgen früh — lese in dieser Reihenfolge:**
1. `worklog/active.md` — `status: idle`
2. Diese Datei (Resume-Anker oben + Day-2 Summary unten)
3. `git log --oneline -8` (heute 5 commits)
4. `worklog/log.md` Top 2 Einträge (260, 259)

## Was heute passiert ist (Beta-Day-2)

| Zeit | HEAD | Slice | Was |
|---|---|---|---|
| Vormittag | `d4583303` + `c3305fd4` | **259 P0 EMERGENCY** | Anil-Report "Initial Load funktioniert schrott — Refresh nötig". Deep-Dive identifizierte SW Supabase-REST stale-while-revalidate-Cache als Smoking-Gun #1 (URL-keyed ohne JWT → cross-auth-pollution). Fix subtraktiv: REST-Cache raus, CACHE_NAME v3→v4, catch-all-filter. Live-Verify gegen bescout.net: **1899 stale Supabase-REST-Responses → 0**. |
| Nachmittag | `5412ac43` + `30ec7dd9` + `42badf34` | **260 P1** | Auth-Hydrate Hardening (Smoking-Gun #5 + #7). AuthProvider+ClubProvider sessionStorage→localStorage (cross-tab warm cache). User-Switch-Detect-Block (Cross-User-Pollution-Schutz mit Sentry-Breadcrumb). Welcome-Bonus + ActivityLog in `requestIdleCallback`. Provider-Tests 25/25, Reviewer PASS. Live-Verify: AuthProvider-Chunk + Layout-Chunk haben Slice-260-Markers in deployed JS. |

## Tester-State Update

| Tester | Wallet | Status |
|---|---|---|
| **Anil** | 2M CR ✓ | Bekommt 1-time PWA-Update-Event next visit (skipWaiting + clients.claim für SW v4 + lsClear-falls-nötig). Danach permanent stabilisiert. |
| **Pesmerga** | 2M CR ✓ | Same — 1-time-update next visit. Plus: display_name + favorite_club via Settings nachholen. |
| **3rd Tester** | TBD | Frischer Account → baseline-clean experience direkt mit SW v4 + saubere localStorage. Bei Signup: 2M CR via SQL-Template (siehe unten). |

## Action-Items für morgen

### Höchste Priorität
1. **3rd Tester signup checken** — falls heute angekommen, 2M CR via SQL geben (Template unten)
2. **Live-Behavior Anil + Pesmerga** — Refresh-Bug weg? Sentry quiet?
3. **Sentry-Health-Watch** — heute 0 unresolved errors letzte 2h verifiziert post-Deploy

### Open Backlog (post-Beta nicht heute)
4. **Slice 261 P2** — TanStack `persistQueryClient` mit localStorage + Server-Component RSC `get_auth_state` Auth-Hydrate. RootLayout-Touch → Beta-Day-3-Risk zu hoch ohne 24h Soak von Slice 259/260 zuerst.
5. **Slice 262 P3** — Middleware Public-Route-Bail-Out + Admin-Checks aus Middleware in RSC-Layout. Edge-Function-Test-Aufwand, post-Beta.
6. **Pattern-Promotion in errors-frontend.md** — die 3 patterns.md-Einträge (#40 SW-Cache-Strategie, #41 Cross-Tab-Cache, #42 idle-callback) könnten optional auch als errors-frontend.md/errors-pwa.md Detection-Patterns crossfiled werden. Optional cleanup.

### Optional Cleanup (Day-2-Reste)
7. **handle_new_user_wallet() Function** ist orphan im Schema seit Slice 258 v2 (von gestern). Cleanup-Slice optional.

## SQL-Template: 3rd Tester 2M CR (für morgen)

```sql
-- Replace <UID> mit der auth.users.id des 3rd Testers (find via email):
SELECT id FROM auth.users WHERE email = '<email>';

-- Dann atomic UPDATE + transactions:
BEGIN;
UPDATE wallets SET balance = 200000000 WHERE user_id = '<UID>';
INSERT INTO transactions (user_id, type, amount, description, balance_after)
VALUES ('<UID>', 'admin_adjustment', 200000000 - <current_balance>,
        'Beta-Tester Initial-Balance 2M CR (Anil-Direktive 2026-04-29)', 200000000);
COMMIT;
```

## Kritische Befunde Beta-Day-2 für Knowledge

**Bug-Klasse-Pattern:**
> **Service Worker Cache muss JWT-aware sein oder authenticated-Endpoints überhaupt nicht cachen** (Slice 259):
> Cache-API keyed by URL only. Cachen authenticated Endpoints (Supabase REST) → cross-auth-pollution + stale-on-first-load + cross-user-leak-Risiko. Symptom-Decoder: User-Report "Refresh fixt App-Load" → SW serviert stale Anon-Response → background-fetch füllt Cache → 2. Load fresh.

**Promoted in:** memory/patterns.md #40, #41, #42 + memory/decisions.md D61.

## Tech-Side-Status post-Day-2 Beta

- **Beta-Phase-Tracker:** Phase D, last_signoff: FAIL (Anil-Mensch-Action-Block, NICHT Tech)
- **Findings_open:** P0=0 (Slice 259 closed), P1=0 (Slice 260 closed), P2=0, P3=0
- **Vercel:** 5 commits live in main (`d4583303 c3305fd4 5412ac43 30ec7dd9 42badf34`)
- **Sentry Production:** 0 unresolved last 2h post-Deploy verified ✓
- **Cron-Health:** All 7 Ligen healthy
- **Audit-Pipeline:** 10 Tools daily nightly-audit
- **Knowledge:** patterns.md +3 (#40/41/42) + decisions.md D61

## Bei Resume morgen — Erste-Action-Pfad

```
1. /clear (falls neue Session)
2. Lese diesen Resume-Anker
3. Frage Anil: "Hat sich Refresh-Bug erledigt? Beta-Tester aktiv?"
4. Optional Slice 261 P2 starten (TanStack persist) NUR wenn 24h Soak von 259/260 ohne Sentry-Drift
5. Sonst: Beta-Tester-Watch-Mode + Reactive auf Anil-Direktive
```

---

# Vor-Heute Resume-Anker (Beta-Day-1, 2026-04-29 abends)

> Dieser Block dokumentiert was gestern Abend für heute geplant war — heute durchgeführt mit Slice 259+260.

**HEAD `37c78d28`** post-Slice-258 EMERGENCY-Fix. Status: idle.

**Bei `/clear` morgen früh — lese in dieser Reihenfolge:**
1. `worklog/active.md` — `status: idle`
2. Diese Datei (Resume-Anker oben)
3. `git log --oneline -8` (heute 11 Commits)
4. `worklog/log.md` Top 4 Einträge (256, 257, 258 + Pre-256-Stand)

## Was heute passiert ist (3 Slices in 1 Tag)

| Zeit | HEAD | Slice | Was |
|---|---|---|---|
| Vormittag | `a73b0e1a` | **256** | StalePipelineBanner Cron-Health UI-Sentinel — User-facing Detection-Communication. 3-Layer (Service+Hook+Banner) auf /fantasy + /market. 12 Tests. Pattern-Wiederholung MissionBanner Slice 161. |
| Mittag | `39d561ff` | **257** | Hardening-Bundle — F-4 nightly-audit cron-health in aggregate + F-8 rotate-secret escapeRegex + D60-Hook ship-verify-completeness-gate.sh. Schließt Slice-256-Backlog. |
| Abend | `37c78d28` | **258 EMERGENCY P0** | Signup-Bug 13-Tage-latent gefixt. Pesmerga signup blockiert mit FK-Violation 23503 (wallets→profiles). Root: Slice 002 fügte FK ohne Baseline-Trigger-Drop. v1 Auto-Profile-Trigger → v2 Heal (Drop für Wizard-Restore). |

## Tester-State (für morgen wichtig)

| Tester | Email | Profile-ID | Wallet | Onboarding | Notes |
|---|---|---|---|---|---|
| **Anil** | kemal_demirtas@gmx.de | `557d1145-3397-465e-8ea0-e2c602c0de6b` | **2M CR** ✓ | Done (alter Account seit Feb) | Voller Funktions-Tester |
| **Pesmerga** | pesmerga@gmx.de | `ef2257c0-700e-4148-8d33-c7d1f2264d78` | **2M CR** ✓ | **SKIPPED** (durch v1-Trigger Profile auto-erstellt mit handle=`user_ef2257c0`) | display_name=NULL, favorite_club=NULL — soll via Settings nachholen. Anil-Decision Option A: belassen, kein Wizard-Re-Run. |
| **3rd Tester** | (TBD) | — | — | Wartet auf Signup | Wizard läuft post-v2 KORREKT — bei seiner Anmeldung 2M CR per admin_adjustment-tx aufladen. |

## Action-Items für morgen

### Höchste Priorität
1. **3rd Tester signup checken** — sobald angemeldet: 2M CR via SQL geben (Template unten)
2. **Live-Behavior von Anil + Pesmerga checken** — sind Bugs aufgetaucht? Sentry quiet?
3. **Pesmerga reminder** — Settings → display_name + favorite_club ergänzen

### Open Backlog (aus Slice 257 LOG)
4. **Live-Verify Slice 256 StalePipelineBanner** — Mock-Drift via Supabase-MCP (UPDATE leagues SET active_gameweek = X WHERE id = '<TFF1>'), Banner sichtbar prüfen, Dismiss-Persistence cross-Page
5. **Reviewer-254-P2#1** — Optional Slice 258 wenn Anil das UX-Trade-Off (Manual-GW-Override-per-Liga-Memory) anders haben will

### Optional Cleanup
6. **handle_new_user_wallet() Function** ist orphan im Schema seit Slice 258 v2. Cleanup-Slice optional post-Beta (kein Effekt, nicht eilig).

## SQL-Template: 3rd Tester 2M CR (für morgen)

```sql
-- Replace <UID> mit der auth.users.id des 3rd Testers (find via email):
SELECT id FROM auth.users WHERE email = '<email>';

-- Dann atomic UPDATE + transactions:
BEGIN;
UPDATE wallets SET balance = 200000000 WHERE user_id = '<UID>';
INSERT INTO transactions (user_id, type, amount, description, balance_after)
VALUES ('<UID>', 'admin_adjustment', 200000000 - <current_balance>,
        'Beta-Tester Initial-Balance 2M CR (Anil-Direktive 2026-04-29)', 200000000);
COMMIT;
```

## Kritische Befunde für Knowledge

**Bug-Klasse-Pattern (errors-db.md Kandidat):**
> "FK-Add ohne Baseline-Trigger-Drop" — Slice 002 fügte wallets→profiles FK hinzu (2026-04-16) aber ließ Supabase-Baseline-Default-Trigger `on_auth_user_created_wallet` aktiv. Trigger inserted Wallet aus auth.users → FK requires profile first → 23503 Signup-500. Latent 13 Tage weil 0 echte Real-Signups in dem Zeitraum (alle 124 existing profiles vor 2026-04-16). Erste Real-User-Signup-Versuche heute deckten Bug auf.

**Lehre:** Bei FK-Adds auf zentralen User-Tables (wallets, profiles, holdings) MUSS man pre-existing Baseline-Trigger checken die Insertion-Order erzwingen. Audit-Command:
```sql
SELECT t.tgname, pg_get_triggerdef(t.oid) FROM pg_trigger t
JOIN pg_class c ON c.oid = t.tgrelid
JOIN pg_namespace n ON n.oid = c.relnamespace
WHERE n.nspname IN ('public', 'auth') AND NOT t.tgisinternal
  AND c.relname IN ('users', '<targeted_table>');
```

Pattern-Promotion-Backlog (für Slice 259 oder spätere autodream-Konsolidierung):
- common-errors.md "Silent Latent Bugs after FK-Add" Section
- errors-db.md "Baseline-Trigger Drop Pflicht bei FK-Constraints"

## Tech-Side-Status post-Day-1 Beta

- **Beta-Phase-Tracker:** Phase D, last_signoff: FAIL (war Anil-Action-Block, jetzt aktiv durchläuft)
- **Findings_open:** P0=0 (Slice 258 closed), P1=0, P2=0 (Live-Verify 256 backlog), P3=0
- **Vercel:** Latest deploy `dpl_84Ktd6...` (HEAD 3b87c5c7 = Slice 257). Slice 258 ist DB-only, kein Vercel-Deploy nötig.
- **Sentry Production:** 0 unresolved last 24h (vor Beta-Empfang gemessen).
- **Cron-Health:** All 7 Ligen healthy. StalePipelineBanner silent für Tester.
- **Audit-Pipeline:** 10 Tools daily nightly-audit (cron-health jetzt mit explicitem Auto-Issue-Title via Slice 257 F-4).

## Bei Resume morgen — Erste-Action-Pfad

```
1. /clear (falls neue Session)
2. Lese diesen Resume-Anker
3. Frage Anil: "Hat sich der 3. Tester registriert?"
4a. Wenn JA: SQL-Template oben → 2M CR aufladen → bestätigen
4b. Wenn NEIN: warten auf Signal
5. Frage Anil: "Sentry/Sessions checken oder direkt zu nächstem Slice?"
6. Optional: Live-Verify 256 (Mock-Drift) ODER neuer Slice 259 (Pattern-Promotion + Cleanup-orphan-function)
```

## Knowledge-Status

**Decisions** (memory/decisions.md):
- D58 Wave-Bridge-Cleanup-Pflicht (Slice 251)
- D59 BeScout-Character-Spec, kein FPL-Klon (Slice 253)
- D60 Wave-Verify-Re-Switch-Pflicht (Slice 255)
- (Optional D61 Kandidat morgen: "FK-Add ohne Baseline-Trigger-Drop" Bug-Klasse → memory/decisions.md PROCESS oder common-errors.md)

**Patterns** (errors-frontend.md neu seit Session 2026-04-29):
- "Liga/Context-Switch State-Reset via prevRef" (Slice 254)
- "Cache-Invalidation: Root-Prefix vs enumerated Keys" (Slice 254)
- "Filter-as-audience-choice vs Filter-as-result-filter" (Slice 254)

**Hooks**:
- 35 hooks insgesamt (war 34 vor heute)
- NEU heute: `ship-verify-completeness-gate.sh` (Slice 257 D60-Implementation)

---

# Vor-Heute Resume-Anker (Slice 256-Backlog) — gestern abend nicht mehr aktuell

**Bei `/clear`:** Lese in dieser Reihenfolge:
1. `worklog/active.md` — `status: idle`, HEAD `d4c1c0a9`
2. Diese Datei (Top-Block + Slice-256-Backlog unten)
3. `git log --oneline -10` (8 commits diese Session)
4. `worklog/log.md` Top 4 Einträge (255 / 254 / 253 / 252)
5. `memory/decisions.md` D59 + D60 (NEU diese Session)
6. `worklog/reviews/255-review.md` (Slice 256 Backlog-Items)

## Was diese Session erreicht hat (chronologisch, ~6 Stunden)

| Phase | HEAD | Slice | Was |
|---|---|---|---|
| Vormittag | `b8179270` | **252 PR #36 MERGED** | Wave 6 Cleanup — legacy Liga-State entfernt (fantasyStore + marketStore + managerStore + LEAGUE_FALLBACK) |
| Vormittag | `78516af1` | Smoke-fix | Step-4 Tab-Fallback + 25s Buffer (Issue #25 Master-Tracker closed) |
| Mittag | `d2326606` | **253** | Money-Path-CEO-Decisions WONT-FIX — D59 PRODUCT-Decision "BeScout-Character-Spezifikation, kein FPL-Klon" |
| Nachmittag | `e5c03e56` + `36679510` | **254 v1+v2** | Fantasy-Deep-Dive 5-Layer-Kaskade + 3 Frontend-Heals (useGameweek + leagueScopeStore + FantasyContent) + v2-Heal Init-Effect entfernt nach Live-Verify Re-Switch-Bug |
| Nachmittag | `0451690b` | 254 LOG | 3 Pattern-Promotions in errors-frontend.md |
| Spätnachmittag | (operations) | Cron-Reanimation | Anil rotated Service-Role-Key (3-Iter-Drama wegen `\n`-suffix-Drift), Vercel auf Pro-Plan, gameweek-sync via curl: 37s Run, alle 7 Ligen advanced (TFF1 28→38 Saison-End, BL/SL/BL2 30→32, SA 33→35, LL 32→33) |
| Abend | `d4c1c0a9` | **255** | Workflow-Hardening 4-Layer-Architektur (Detection / Operations / Process / Test-Infra) |

## Slice 256 Backlog (Anil-Direktive: nahtlos weitermachen)

Aus `worklog/reviews/255-review.md` Reviewer-Findings + Slice 255 Defered-Item:

| Pri | Item | Source |
|---|---|---|
| **P2** | **StalePipelineBanner UI-Sentinel** auf /fantasy + /market — client-side Hook + RPC für Drift-Detection mit anon-key. Komplexität >30min, in Slice 255 defered. | Slice 255 Item 5 (defered) |
| **P2** | **F-4 cron_health in aggregate-Detection-Step** — `nightly-audit.yml:215-234` aggregate-Step erweitern damit Auto-Issue-Title `cron-health` explizit nennt (statt im "new audit-report files"-Noise verschluckt). | Reviewer 255 F-4 |
| **P3** | **F-8 keyName-Regex-Escape** in `rotate-secret.ts:55` — `key.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')` vor RegExp-Construction. Defensive Code-Hygiene. | Reviewer 255 F-8 |
| **P3** | **D60 Hook-Implementation** `ship-verify-completeness-gate.sh` — warnt wenn `worklog/proofs/<slice>-postdeploy-verify.md` für State-Switch-Slice nicht alle 3 Phasen (fresh / forward / re-switch) dokumentiert. | D60 Re-Visit-Trigger |
| **P3** | **Reviewer 254 P2 #1 Manual-GW-Override-Concern** — User picks GW=15 in BL → Liga-Switch zu TR überschreibt manuelle Wahl. Bewusste UX-Trade-Off, aber: bei Liga-Switch B→A zurück gibt es kein "remember". Optional second useRef für tracking ob `selectedGameweek` von User manuell ODER auto gesetzt wurde. | Reviewer 254 P2 #1 |
| Future | **`scripts/cron-health-check.ts` Severity-Tuning** post-Beta — wenn Beta 5+ Wochen läuft ohne False-Positives, drift>=2 von HIGH auf MEDIUM downgraden. | D52 Iteration |

## Bei /clear Resume-Pfad

```
1. worklog/active.md → status: idle, HEAD d4c1c0a9
2. Diese Datei → Resume-Anker oben + Slice-256-Backlog
3. git log --oneline -10 (Session-Commits)
4. worklog/reviews/255-review.md (Reviewer-Concerns für Slice 256)
5. /ship new "Slice 256 Cron-Health-UI-Sentinel + Reviewer-Followups"
   ODER pick einzeln je nach Lust:
   - StalePipelineBanner (UI-fokus, ~1-2h)
   - F-4 nightly-audit aggregate (Process-fokus, 15min)
   - F-8 + D60-Hook (Hardening-Bundle, 30min)
```

## Tech-Side-Status post-Slice-255

**Beta-Phase-Tracker `worklog/beta-phase.md`:**
- phase: D
- last_signoff: FAIL (Anil-Mensch-Action-Block, NICHT Tech)
- findings_open: P0=0, P1=0, P2=0, P3=0
- ceo_pending: 0 (Slice 253 D59 alle WONT-FIX)
- wont_fix: 6 (FM-RR-1, BRAND-NEU-1, FM-NEU-5, FANTASY-NEU-1, F-09 BPS, UX-20 Membership)

**Audit-Pipeline (10 Tools):**
- silent-fail, stale, orphan, type-truth, mutation-race, i18n, compliance, wiring, **cron-health (NEU Slice 255)**, rpc-security
- Daily 03:00/04:00 UTC im nightly-audit.yml

**Pre-Push-Hook entblockt** post-Slice-255 — integrationGlobs erweitert um 6 Service-Test-Files die Live-Supabase brauchen (heute 22-Test-Fail-Episode).

**4-Layer-Workflow-Hardening live:**
1. **Detection:** audit:cron-health daily
2. **Operations:** pnpm rotate-secret atomic-sync
3. **Process:** D60 Re-Switch-Pflicht
4. **Test-Infra:** integrationGlobs

**Money-Path:** alle 3 ceo_pending → wont_fix per D59 (BeScout ist nicht FPL-Klon).

## Anil-Mensch-Action (einziger Beta-READY-Blocker)

- 3 Beta-Tester organisieren (Templates fertig in `memory/beta-tester-recruitment-templates.md`)
- TR-Native-Reviewer organisieren
- `memory/beta-tester-list.md` schreiben (.gitignore-Pflicht)

---

## Session 2026-04-29 12:00-14:50 UTC — Wave 3 Live-Verify ALL-PASS + Slice 252 Wave 6 PR #36

**Stand 2026-04-29 14:50 UTC:** Wave 3 Live-Verify komplett, Wave 6 Cleanup-PR offen.

### Was diese Session ablief
1. Routine `wave-3-live-verify` (trig_01GpLLssvCemqUQCbEkLa5KC) feuerte 00:36 UTC, lief 9 min, ended `run_once_fired` — **hat aber kein Output persistiert** (kein Verify-File, kein PR, kein Issue mit `wave-3-postdeploy-fail`-Label). Re-Trigger via `RemoteTrigger run` API zeigte Trigger-Config unverändert.
2. **Manual Live-Verify durch Primary-Claude** via Playwright MCP + Supabase MCP gegen `bescout.net` (HEAD `e1d17f94`). Alle 7 V-Steps PASS. Report `worklog/proofs/251-wave-3-postdeploy-verify.md` + 2 Mobile-Screenshots committed in `7264dc25`.
3. **Slice 252 Wave 6 Cleanup** (chore, post-Verify-Action laut Routine-Briefing): Branch `slice/251-wave-6-cleanup` mit 8 Files (+17/-99). PR #36 offen.

### Verify-Results (alle PASS)
- **V-1** Cascade Stage 1: TFF1 set per favorite_club, no Hydration-Mismatch
- **V-2** Atomic Liga-Switch: BL→TFF1→BL atomar, Network-Refetch je Switch
- **V-3** Async-Liga-Cycle: BL=GW30, TFF1=GW28 (natürliche DB-Daten), kein MIN-Aggregation-Drift
- **V-4** Mobile 393px: 6 Country-Pills, min-h 44px, kein viewport overflow
- **V-5** Cross-Page-Persistence: localStorage v1 hält über /market /fantasy /clubs /rankings
- **V-6** anon→login Edge: Cascade-Caller R-02 setzt Liga sofort post-Login
- **V-7** Single-League-Auto-Select: ES → La Liga atomar applied

### Slice 252 Wave 6 PR #36 — was er deletet
- `fantasyStore.fantasyCountry/.fantasyLeague` + Setter
- `marketStore.selectedCountry/.selectedLeague` + Setter (clubVerkaufLeague KEEPS)
- `managerStore.kaderCountry/.kaderLeague` + Setter
- `SpieltagTab.tsx`: LEAGUE_FALLBACK + availableLeagues/selectedLeagueId/activeLeague/hasMultipleLeagues + dead Liga-Selector-Button + ADMIN-Row-Restructure
- `SpieltagTab.test.tsx`: "TFF 1. Lig" Badge-Test entfernt
- `leagueScopeStore.ts` JSDoc: References zu deleted Symbols neu formuliert

### tsc + vitest (alle grün)
- `npx tsc --noEmit` clean
- `CI=true pnpm exec vitest run` 3084/3084 + 1 skip + 13 todo
- Pre-commit-Hooks (audit:type-truth/stale/wiring): GREEN
- Pre-push-Hook (full vitest 4:25 min): GREEN

### Anil-Action-Items
1. **PR #36 reviewen + mergen:** https://github.com/Djembo31/beScout-App/pull/36 — saubere chore-Commit, alle Tests grün
2. **Post-Merge:** Smoke gegen bescout.net (Issue #25 Master-Tracker-Klasse separat)
3. **Routine-Reliability untersuchen:** `wave-3-live-verify` hat output-loss, vor zukünftigen Routine-Trigger-Designs CTO-Backlog für Diagnose

### CTO-Backlog post-Slice-252
- **Routine-Output-Loss Investigation:** warum `wave-3-live-verify` (Run #1 + Run #2 retrigger) keinen Push/PR/Issue hinterließ — vermutlich kein Push-Permission oder mid-execution-Abbruch ohne Output. Wichtig für zukünftige Auto-Verify-Routines.
- **Backlog vom Wave 3 Live-Verify Bonus-Findings:**
  1. AuthProvider-Slow-Warning post-Login (pre-existing, kein Wave-3-Bug)
  2. /fantasy `eventCountries` filtert dynamisch — UX-Counterintuitiv für End-User wenn Liga-Scope = TFF1 (DE-Bundesliga unsichtbar). Backlog UX-NEU für Wave 4+.

### Bei `/clear` — Resume-Pfad
1. `worklog/active.md` (idle, **HEAD nach Stash-Drop noch sauber**)
2. `git log --oneline -5` zeigt: 7264dc25 (Verify-Proofs) + 2886d69a (Stop-Hook chore) + e1d17f94 (D58) + ...
3. `gh pr view 36` für Slice 252 Status
4. Wenn Anil "merge PR 36" sagt: `gh pr merge 36 --squash --auto` ODER manuell mit `gh pr merge 36 --squash`
5. Nach Merge: localStorage `bescout-league-scope-v1` muss live weiter funktionieren (es ist nur DELETE von toten Stores, keine Behavior-Changes)

---

## Slice 251 Spieltag Liga-Scope-Reform — Wave 3 LIVE (Session-Ende 2026-04-29 ~01:36)

**Stand:** Wave 1 + Wave 2 + Wave 3 alle LIVE in main. HEAD `5cb28200`. Manual-Verify post-Deploy ist scheduled in **1 Stunde** als remote-agent.

### Wave 3 Track C — was steht

- **Commits (4):** `687bcb91` feat (Track C 18 files +1742/-152) → `55f52417` chore (PROVE+LOG) → `66842611` fix (ClubProvider Test-Mock-Heal) → `5cb28200` fix (INV-25 WHITELIST drift Wave-2-Track-F-Debt)
- **NEU:** `src/features/shared/store/leagueScopeStore.ts` (209 lines, 17 Tests, versioned localStorage `bescout-league-scope-v1` + 3-Stage Cascade + Smart-Collapse + 5-Key Cache-Invalidate + EC-03 silent-reset) + `src/components/layout/LeagueScopeHeader.tsx` (103 lines, 5 Tests, Sticky/non-sticky-Wrapper)
- **MIGRATE 8 Konsumenten:** FantasyContent + MarktplatzTab + ClubVerkaufSection + KaderTab + rankings/page + clubs/page (6 Briefing) + TransferListSection + TrendingSection (2 D54-driven)
- **R-02 Heal:** ClubProvider.tsx +39 (Cascade-Caller useEffect mit 4 Guards + 9 deps)
- **F-01/F-02 Heal post-Reviewer-REWORK:** useGameweek-Bridge `activeClub?.league_id` → `useLeagueScope(s => s.leagueId)` + dashboardStats `events.filter` → `filteredGwEvents.filter`
- **Tests:** 22/22 store+header grün lokal; CI nach INV-25-Fix grün
- **Wave-2-Drift-Audit:** Worktree-Base 4cef6b95 (vor Wave 2). Rebase auf main HEAD f867cd44 sauber (1 active.md-Konflikt + 1 Bonus-Edit SpieltagTab leagueId-prop von activeClub-bridge auf leagueScopeId)

### Spec/Impact/Review/Proof

- **Spec:** `worklog/specs/251-spieltag-liga-scope-reform.md`
- **Impact:** `worklog/impact/251-store-consumers.md` (Annex 2026-04-29: 6 REPLACE + 2 CREATE D54 + 4 DELETE Wave 6 + Datentyp-Brücke leagueId/leagueName/countryCode)
- **Pre-Review-Memo:** `worklog/reviews/251-wave-3-pre-review.md` (frontend-Agent Self-Audit)
- **Review:** `worklog/reviews/251-wave-3-review.md` (cold-context reviewer-Agent: REWORK → PASS post-Heal F-01+F-02; Race-Condition-Audit + Wave-2-Drift-Audit + 7 Manual-Verify-Pflichten post-Deploy)
- **Proof:** `worklog/proofs/251-wave-3-track-c.txt`
- **Journal:** `memory/episodisch/journals/251-wave3-track-c-leaguescope-journal.md`

### DISTILL — neue Decision (D58)

`memory/decisions.md` D58: **Wave-Bridge-Cleanup-Pflicht in Multi-Wave-Slices** — bei Multi-Wave-L-Slices wo eine Wave Bridge-Code via Hook/Prop einführt, MUSS die nachfolgende Wave (die den finalen Mechanismus implementiert) den Bridge-Code aktiv ersetzen. Spec-Sektion 1.4 Migration-Map muss „Wave-X-Bridge?"-Spalte enthalten. Pre-Review-Memo muss „Migration-Surface beyond Konsumenten"-Sektion enthalten. Pattern-Familie D43→D46→D54→D58 („Existenz ≠ Verwendung", jetzt mit Time-Axis innerhalb Multi-Wave-Slice).

### Routine: wave-3-live-verify (in 1h)

Remote agent geschedult als one-shot, fires `2026-04-29T00:36:00Z` (~02:36 Berlin):
- **ID:** `trig_01GpLLssvCemqUQCbEkLa5KC`
- **URL:** https://claude.ai/code/routines/trig_01GpLLssvCemqUQCbEkLa5KC
- **Aufgabe:** 7 Manual-Verify-Steps (V-1 Cascade-Stage-1, V-2 atomar Liga-Switch, V-3 async-Cycle BL=10/TFF1=8, V-4 Mobile 393px, V-5 Cross-Page-Persistence, V-6 anon→login Edge, V-7 single-league-auto-select) gegen bescout.net mit jarvis-qa-Login
- **Output:** strukturierter Report `worklog/proofs/251-wave-3-postdeploy-verify.md`
- **Branching:**
  - All-PASS (oder PASS+SKIP-V-3) → automatisch Wave-6-Cleanup-PR draften (delete fantasyStore.fantasyCountry/fantasyLeague + marketStore.selected* + managerStore.kader* + LEAGUE_FALLBACK)
  - 1+ FAIL → GH-Issue mit `wave-3-postdeploy-fail` Label öffnen

### Bei `/clear` — Resume-Pfad

1. `worklog/active.md` (idle, **5cb28200** HEAD) — Wave 3 KOMPLETT-Block oben
2. `worklog/log.md` Top-Eintrag (251 Wave 3) + Slice 251 Wave 1+2-Einträge
3. `memory/decisions.md` D58 (Wave-Bridge-Cleanup-Pflicht — Pattern-Familie D43/D46/D54/D58)
4. Diese Datei (Resume-Anker)
5. Routine-Status checken: `RemoteTrigger get trig_01GpLLssvCemqUQCbEkLa5KC` ODER ggf. `worklog/proofs/251-wave-3-postdeploy-verify.md` (falls Routine schon gelaufen)
6. Falls Routine PASS: Wave-6-Cleanup-PR-Draft reviewen + mergen
7. Falls Routine FAIL: GH-Issue triagieren, ggf. Slice 252+ Heal-Wave

### Backlog post-Wave-3 (CTO-Tracking)

- **i18n-Migration `errors.rpcNoResponse`:** Wave-2-Track-F-Debt aus INV-25-Heal — `rpc_no_response` als KNOWN_KEYS + DE/TR i18n-Key, dann WHITELIST-Eintrag entfernen.
- **Wave 4 Track D + E:** SpieltagTab-Reform (LEAGUE_FALLBACK weg + selectedLeagueId-State weg + Sponsor-Match-Topspiel-Logic) + SaisonRangTab als 5. Fantasy-Tab.
- **Wave 5 Track G:** PlayerPicker UX-Filter (CEO-Decision Variante B lenient mit Warning-Pill).
- **Wave 6 Cleanup:** in der Routine in 1h auto-gedrafted falls Wave 3 PASS.
- **F-03 Hydration-Mismatch monitor:** falls Anil oder Routine in Console mismatch-Warnings sieht → Zustand `persist`-middleware migrieren.
- **F-05 anon→login Edge:** falls Routine-V-6 FAIL → ClubProvider-useEffect erweitern um anon→login-Trigger.

### Was Wave 3 NICHT abdeckt (per Spec)

Wave 3 ist Frontend-SSOT-Konsolidierung. Wave 4+ bringt:
- Spieltag-UI-Reform (Track D)
- SaisonRangTab (Track E)
- PlayerPicker UX-Filter (Track G)
- Wave-6-Cleanup (legacy Liga-Felder weg)

---

## Vorheriges (archiviert)

## Slice 251 Spieltag Liga-Scope-Reform — Wave 1 + Wave 2 LIVE

**Stand Session-Ende 2026-04-28 (post-Wave-2):** Wave 1 + Wave 2 sind komplett live in main + Anil hat alle 4 Migrations applied (Wave 1: leagues.active_gameweek-Backfill + Wave 2: 3 wildcards-Migrations).

### Was steht (Wave 1 + Wave 2 cumulative)
- **Wave 1 Track A** (Cron + Service-SSOT): Commit `71f4efb2` + active.md idle `4cef6b95`. Migration `20260428175547_slice_251_leagues_active_gameweek_backfill.sql` applied.
- **Wave 2 Track B** (Service-Layer Liga-Scope): Commit `62bbcb29`. 6 Code + 1 Pre-Review-Memo. 43/43 Tests grün.
- **Wave 2 Track F** (Wildcards Composite-PK + 4 RPCs): Commits `7563761b` + `46df861d` + `91e60a44`. 13 Files. 6/6 Tests grün. 3 Migrations applied: `20260428120000`, `20260428120500`, `20260428121000`.
- **Wave 2 chore**: Commit `f867cd44` (PROVE + LOG + Pre-Wave-3-Probe + Reviewer-Output).
- **HEAD: f867cd44** auf origin/main.
- **Tests:** tsc clean + vitest 49/49 (43 fixtures + 6 wildcards) post-merge.
- **Reviewer:** REWORK → Healer 6 Fixes (2 P0 + 3 P1 + 1 P2) → PASS-mit-Anil-Action.

### Nächste Session — Wave 3 Briefing

**Wave 3 Track C** = useLeagueScope-Store + 5-Page-Migration (cross-domain L-Slice).

**KRITISCH — Spec-Update vor BUILD:** Pre-Wave-3-Probe (`worklog/impact/251-store-consumers.md`) fand:
- **fantasyStore.fantasyCountry/fantasyLeague sind UNUSED** (0 Reads im gesamten Code) → Wave 3 Track C kann LÖSCHEN statt MIGRATE
- **3 echte Reads-Liga: yes** Konsumenten: `MarktplatzTab.tsx`, `ClubVerkaufSection.tsx`, `KaderTab.tsx`
- **23 reads-Liga: no** (Feature-state-only, SKIP)
- **1 unclear** (`TradeSuccessCard.tsx` — vor Wave 3 manuell verifizieren)
- Spec 1.4 listet 5 Page-Konsumenten: `/fantasy`, `/market`, `/manager`, `/rankings`, `/clubs/page.tsx` — Pre-Wave-3-Probe deckte nur features/ ab, `/rankings` + `/clubs/page.tsx` als Pages out-of-scope für Probe → Wave 3 muss expliziten Audit dieser 2 zusätzlichen Pages tun.

**Reviewer Wave-3-Voraussetzungen (aus `worklog/reviews/251-wave-2-review.md`):**
1. ✅ Track F Migrations applied — Anil bestätigt
2. ⚠ Empfohlene Verify-Smokes (manual-run im Supabase-Dashboard SQL-Editor):
   ```sql
   -- Composite-PK Verify
   SELECT a.attname FROM pg_index i JOIN pg_attribute a
     ON a.attrelid=i.indrelid AND a.attnum=ANY(i.indkey)
   WHERE i.indrelid='public.user_wildcards'::regclass AND i.indisprimary;
   -- Expected: 2 rows (user_id, league_id)

   -- RPC-Body Verify
   SELECT pg_get_functiondef('public.earn_wildcards(uuid,int,text,uuid,uuid,text)'::regprocedure)
     ILIKE '%auth.uid() IS NOT NULL%' AND
     pg_get_functiondef('public.earn_wildcards(uuid,int,text,uuid,uuid,text)'::regprocedure)
     ILIKE '%invalid_league%';
   -- Expected: TRUE
   ```

**Wave 3 Plan-Skizze:**
- **NEU**: `src/features/shared/store/leagueScopeStore.ts` (Zustand mit localStorage-Persistence)
- **NEU**: `src/components/layout/LeagueScopeHeader.tsx` (Sticky Header sticky top-0 z-30)
- **MIGRATE**: 3 reads-Liga Konsumenten + 2 Pages (rankings, clubs/page.tsx)
- **DELETE**: fantasyStore.fantasyCountry/fantasyLeague (UNUSED, Pre-Wave-3-Probe)
- **DELETE**: marketStore.selectedCountry/selectedLeague + managerStore.kaderCountry/kaderLeague (REPLACE durch SSOT)
- **Cascade**: profile.favorite_club_id → clubs.league_id → ggf. activeClub.league_id → first active league
- **Cache-Invalidation**: setLeagueScope triggert invalidate von qk.events.leagueGw + qk.events.wildcardBalance + qk.fantasy.gwFixtureInfo

**Worktree-Strategy für Wave 3:**
- 1 Worktree für Track C (Frontend cross-page) — kein Backend-Konflikt
- Optional: Track D (Spieltag-Reform) + Track E (SaisonRang-Tab) parallel als Wave 4, NICHT in Wave 3

### Token-Budget-Lehre Wave 2
- Diese Session (Wave 2 + Heal + Merge): ~750k-800k Tokens (Plan + 3 Agents + Reviewer + Healer + Merge + Push)
- Wave 3 braucht frische Session — `/clear` empfohlen vor Start.

### Bei `/clear` Resume-Pfad

1. `worklog/active.md` (idle, **f867cd44** ist HEAD)
2. `worklog/beta-phase.md` (Phase D, last_signoff: FAIL — Anil-Action-Block)
3. Diese Datei (Resume-Anker, DAS hier — **Wave 3 Briefing-Block oben**)
4. `worklog/log.md` Top 2 Einträge (251 Wave 2 + 251 Wave 1)
5. `worklog/specs/251-spieltag-liga-scope-reform.md` (komplette Spec, vor allem 1.4 Migration-Map + Pillar 1-5)
6. `worklog/impact/251-store-consumers.md` (Pre-Wave-3-Probe Findings — pflicht-Read vor Track C BUILD)
7. `git log --oneline -8` (Wave 1 + Wave 2 = 6 commits)

---

## Vorheriger Stand (vor Wave 2 — archiviert)

**Stand Session-Ende 2026-04-28:** Wave 1 BUILD fertig, wartet auf Migration-Apply durch Anil + Merge.

### Was steht
- **Audit:** `worklog/audits/spieltag-liga-architektur-2026-04-28.md` (14 Findings, 6 P0)
- **Spec:** `worklog/specs/251-spieltag-liga-scope-reform.md` (L-Slice, 7 Tracks, 13 Sektionen, 24 ACs, 16 Edge-Cases) — Anil-Approved
- **Impact:** `worklog/impact/251-spieltag-liga-scope.md` (4 Refinements eingespielt: clubs/page als 5. Konsument, Wave 1 Backfill, Pre-Wave-3-Probe, Track F minimal Frontend)
- **Worktree:** `.claude/worktrees/agent-aec73207c3b95a285` Branch `slice/251-wave-1-track-a` (15 Files, +190/-39, NICHT committed)
- **Reviewer-Verdict:** PASS with CONCERNS · Bridge ✓ gefixt (FantasyContent.tsx:83) · Pattern-Promotion ✓ in common-errors.md §0 (4. Mitigation-Layer) · Review-File ✓ persistiert
- **Tests:** 73+6+12 = 91 grün im Worktree, tsc clean

### CEO-Decisions (alle 4 approved)
1. Liga-Default = `profile.favorite_club.league` Cascade
2. Wildcards pro-Liga (Track F)
3. Lineup-Eligibility Pre-Verify ergab P2 (UX-Falle, kein Money-Path-Bug) — Track G refit zu PlayerPicker-Filter Wave 5
4. Topspiel = Sponsor-Match-Logic

### Anil-Action vor Wave-2-Start (PFLICHT)
1. **Migration manuell applien** im Supabase-Dashboard SQL-Editor:
   ```sql
   UPDATE public.leagues l
   SET active_gameweek = sub.min_gw
   FROM (
     SELECT league_id, MIN(active_gameweek) AS min_gw
     FROM public.clubs
     WHERE league_id IS NOT NULL AND active_gameweek IS NOT NULL
     GROUP BY league_id
   ) sub
   WHERE l.id = sub.league_id
     AND COALESCE(l.active_gameweek, -1) IS DISTINCT FROM sub.min_gw;
   ```
2. **Verify** (erwartet: 0 Rows):
   ```sql
   SELECT l.id, l.name, l.active_gameweek, MIN(c.active_gameweek)
   FROM leagues l LEFT JOIN clubs c ON c.league_id = l.id
   WHERE l.is_active = true GROUP BY l.id, l.name, l.active_gameweek
   HAVING l.active_gameweek != MIN(c.active_gameweek)
      AND MIN(c.active_gameweek) IS NOT NULL;
   ```
3. Anil sagt "applied" → Primary-Claude merged Worktree → main + Stage PROVE/LOG → Wave 2 starten (Track B ‖ Track F parallel in 2 neuen Worktrees)

### Nächste Session — Erste Action
1. Diesen Handoff-Block lesen
2. `worklog/active.md` lesen (slice 251, stage build-pending-apply)
3. Anil fragen: "Migration applied?" — wenn ja: merge + Wave 2. Wenn nein: nur drüber sprechen.
4. Wave 2 = Track B Service-Layer (`getFixturesByGameweek(gw, leagueId)` + Service-Tests) ‖ Track F Wildcards Composite-PK + RPCs (`get_wildcard_balance(uid, leagueId)` etc.)

### Wave-2-Briefing-Skizze (für nächste Session)

**Track B Backend-Agent (Worktree):**
- `getFixturesByGameweek(gw)` → `(gw, leagueId?)` mit `.eq('league_id', leagueId)`
- `pickTopspiel(fixtures, clubId)` → `(fixtures, clubId, leagueId, sponsorClubId?)` Sponsor-Match-Priorität
- `dashboardStats` Update in FantasyContent (events → filteredGwEvents)
- 3 Konsumenten: SpieltagTab.tsx:81, events.mutations.ts:133, fixtures.ts:316
- Tests: fixtures.test.ts (5 Tests), events-v2.test.ts, lib-services-fixtures.test.ts
- AC-22-Cross-Check: Cron Dual-Write läuft korrekt nach 1 GW-Cycle

**Track F Backend-Agent (paralleler Worktree):**
- Migration: `user_wildcards` PK von `(user_id)` → `(user_id, league_id)` Composite. ADD league_id NULLABLE → Backfill split per Cascade-Default-Liga (rest-handling) → ALTER PK
- 3 RPCs: `get_wildcard_balance(p_user_id, p_league_id)`, `earn_wildcards(...,p_league_id)`, `spend_wildcards(...,p_league_id)`. AR-44 REVOKE-Block pflicht.
- `rpc_save_lineup` Z.359+364: `event.club.league_id` reinholen + an spend/earn passen (CREATE OR REPLACE-Migration)
- `refund_wildcards_on_leave(p_user_id, p_event_id)`: gleiche league-id Lookup
- Frontend Read: `useWildcardBalance(uid, leagueId)` Hook erweitern + qk.events.wildcardBalance(uid) → (uid, leagueId)
- AC-24 Backfill-Sum-Smoke: pre/post Sum-Diff = 0

**Wave 2.5 Pre-Wave-3-Probe** (parallel zu Wave 2 als Read-Only-Audit-Task):
- 26 Sub-Components in `src/features/<market|manager|fantasy>/` per grep auf Liga-Reads klassifizieren
- Output: `worklog/impact/251-store-consumers.md` mit Annotation "Reads-Liga: yes/no/transient" pro File
- Sonst Wave 3 Track C scope-creept

### Token-Budget-Lehre Session 2026-04-28
- Diese Session hat ~850k Tokens verbraucht (Audit + 3 Agents + Spec + Impact + Wave 1 BUILD + Reviewer + Bridge + Pattern-Promotion)
- Wave 2 + 3 brauchen frischen Context — `/clear` vor Start, Handoff-Block oben dient als Restart-Punkt

---

# Resume-Anker (2026-04-28 — Tech-Cleanup-Session: 4 Slices D52-Refinement-Wave + GH-Issue-Cleanup, autonom)

**Wenn `/clear` oder Token-Limit:** Lese in dieser Reihenfolge:
1. `worklog/active.md` — `status: idle`, HEAD `f412b396`
2. `worklog/beta-phase.md` — Phase D, last_signoff: FAIL (Anil-Action-Block, NICHT Tech), last_phase_run aktualisiert
3. Diese Datei (Resume-Anker, Top-Block — DAS hier)
4. `git log --oneline -10` (4 Slices = 9 commits diese Session + 1 chore-phase-tracker)
5. `worklog/log.md` Top 4 Einträge (242 / 240 / 241 / 238)
6. Dann ggf. älterer Resume-Anker (2026-04-27→28 unten)

## Session-End 2026-04-28 — 4 Slices D52 Refinement-Wave + 7 GH-Issues batch-closed

**Anil-Direktive im Verlauf der Session:**
1. "weiter im handoff, mit voller konzentration, fokus und eifer!" → Slice 238 (Triage echter Drift)
2. "autonom weiter, bis du erschöpft bist" → Slices 241 + 240 + 242 + GH-Issue-Cleanup + Phase-Tracker
3. "mache alle updates und sicherungen für den clear, wir machen dann nahtlos weiter" → DIESE Pre-Clear-Vorbereitung

## 4 Slices — was diese Session erreicht hat

**Slice 238** — silent-fail-audit Chunked-Detection + Test-File-Skip (XS, Tool, **D52 Refinement #2**). Triage echter Drift im baseline 93/103/196:
- +1 HIGH `wallet.ts:241` war FALSE-POSITIVE: Code IST chunked (`CHUNK=100`, for-loop), Audit-Window (-2/+3) fand CHUNK-Statement 8 Zeilen oberhalb nicht.
- +2 MEDIUM `__tests__/club-most-owned-batch.test.ts:64,286` waren Test-File-Mock-Pattern (Pattern 4 hatte keinen test-skip wie Pattern 1).
- Fix: Pattern 1 lookback -2 → -10 + Pattern 4 test-file-skip analog Pattern 1/7/8.
- Drift: -28 total / -17 HIGH / -11 MEDIUM. Bonus: ganze Klasse pre-existing for-loop-CHUNK-false-positives in src/lib/services/* die seit Slice 088+092 unsichtbar geflagged waren.
- Baseline 196/93/103 → 168/76/92. CI-Gate exit 0. 7/7 ACs PASS. Commit 630c15a6.

**Slice 241** — errors-infra.md Knowledge-Capture (XS, Doc, Knowledge-Flywheel-Pflicht). 4 Lehren aus Slice 234 review.md codifiziert:
1. Spec-Drift-im-Drift-Heal-Anti-Pattern (D54-Slice hatte F-01/F-07 in eigener Spec)
2. MSYS Git Bash `tr '[:upper:]' '[:lower:]'` ist NICHT UTF-8-aware → LC_ALL=C.UTF-8 + dual-Pattern
3. Issue-Closing != Bug-Resolved → Master-Tracker für recurring Failure-Klassen (Issue #25)
4. settings.json-Edit > 3 Hooks → IMPACT-Stage-Pflicht (Cross-Cutting wie DB-Migration)
- 1 Section erweitert (Shell/Hooks) + 3 NEU (Cross-Cutting/Operational). 6/6 ACs PASS. 9 Slice-234-Refs. Commit a7198f5e.

**Slice 240** — TM-Once-Off-Scripts Triage (XS, Doc/File-Move, **D54 Allowlist-Cleanup**). 13 KNOWN_ORPHANS triagiert:
- ARCHIVE (5): tm-club-id-discovery (S141 Phase-B done), tm-squad-scrape-local (S144 Phase-B done), tm-html-inspect (debug-helper), fix-bug-004 (BUG-004 done), fix-migration-history (Migration-Repair done) → `scripts/archived/2026-04-28-once-off/`
- KEEP (8): operational manual-tools (tm-parser-sanity/verify, tm-profile-local, tm-rescrape-stale, tm-search-local, tm-search-scrape-unknown, enrich-nationality-tm, verify-nationality-coverage)
- DELETE (0): Archive ist sicherer (git mv preserves history)
- KNOWN_ORPHANS in wiring-check.ts: 14→10 entries. 0 Production-Refs auf archived. README.md mit Restore-Anleitung. 6/6 ACs PASS. Commit e1294307.
- Bonus-Discovery: tm-html-inspect.mjs war pre-Slice-240 nicht in KNOWN_ORPHANS-allowlist (latent silent allowlist-drift) — resolved de-facto via Archive.

**Slice 242** — orphan-component-detector Allowlist (XS, Tool, **D52 Refinement #3**). KNOWN_ORPHANS-Mechanism analog wiring-check.ts:
- 4 entries: 3 test-only fixtures (FollowBtn, HomeSkeleton, ManagerOffersTab) + 1 deferred (CommunityValuation Slice 227 @experimental)
- Stats erweitert: realDrift + knownAllowlisted parallel ausgegeben
- Drift: 13 → 9 real-drift (50% Issue-Noise-Reduktion in nightly-audit-Pipeline)
- 9 echte unused-Components weiter sichtbar — Slice 239 Anil-Wire-Plan-Wave kann sich auf 9 statt 13 fokussieren. 7/7 ACs PASS. Commit 475854bd.

## GitHub-Issue-Cleanup (Master-Tracker-Pattern)

**7 stale Issues batch-closed via Comment + Master-Tracker-Reference:**
- #22 (Audit-Findings 2026-04-27): silent-fail GREEN, orphan REDUCED, i18n GREEN, tr-strings PENDING-ANIL
- #26-29-31 (Smoke-Failures): gleiche Bug-Klasse wie #25 → Master-Tracker-Pattern
- #30 (Audit-Findings 2026-04-28 orphan): superseded durch Slice 242 Allowlist

**Nur Issue #25** (Master-Tracker bescout.net /market Player-Link Timeout) bleibt OPEN — designed-state.

## Pipeline-Status (alle 10 Commits gepusht)

HEAD: `f412b396 chore(beta-phase): last_phase_run 2026-04-28 — Slice 238/240/241/242 + 5 GH-Issues batch-closed`

```
f412b396 chore(beta-phase) last_phase_run 2026-04-28
6d2fc61a chore(242) active idle
475854bd feat(242) orphan-detector Allowlist (D52 #3)
60611af5 chore(240) active idle
e1294307 docs(240) TM-Scripts Triage 5 archive
f866d892 chore(241) active idle
a7198f5e docs(241) errors-infra Knowledge-Capture 4 Lehren
5d83839e chore(238) active idle
630c15a6 feat(238) silent-fail Chunked + Test-Skip (D52 #2)
056dcfc0 docs(handoff) Pre-Clear VORHERIGE Session
```

## Cumulative Tech-Side-Stand post-Slice-242

**Audit-Tools (5) gehärtet via D52-Pattern:**
| Tool | Status | Drift |
|------|--------|-------|
| `silent-fail-audit` | GREEN | baseline 76 HIGH / 92 MEDIUM (war 93/103 vor Slice 238) |
| `audit-stale-check` | GREEN | 0 stale-candidates (Slice 223 Foundation) |
| `orphan-component-detector` | 9 real-drift | 4 allowlisted (Slice 242 NEU), 9 echte unused warten auf Slice 239 |
| `type-truth-audit` | GREEN | 0 risk-patterns (Slice 229 Foundation) |
| `wiring-check` | GREEN | 10 known-allowlisted, 0 real-drift (Slice 234 + 240) |

**Knowledge-Flywheel:**
- `errors-infra.md` 4 NEU Lehren codifiziert (Slice 241)
- `decisions.md` D52 jetzt 6× live appliziert (Slice 223/229/237/238/240/242)
- `.claude/learnings-queue.jsonl` aktiv (capture-correction live seit Slice 234)

**Phase-Tracker:** `worklog/beta-phase.md` last_phase_run aktualisiert. Phase D, last_signoff FAIL. Findings_open: alle NULL.

## Was bleibt — alles nicht-autonom (Anil/Mensch oder Live-Test)

**Slice 239** — 9 echte unused-Components Wire-Plan-Wave:
- DpcMasteryCard, GameweekScoreBar, LimitOrderModal, PlayerImagePlaceholder, TradeSuccessEffect (5 in player/detail/)
- HoldingsSection, IPOBuySection, TransferBuySection (3 in player/detail/trading/)
- BuyOrderModal (1 in features/market/components/shared/)
- Pro Component: Anil entscheidet delete / wire / defer

**Issue #25 Smoke-Code-Fix** (Player-Link-Timeout):
- Browser-Auth-Fail / Selector-Drift / DB-Empty / Cold-Start
- Braucht Live-Test gegen bescout.net (CTO kann nicht autonom)
- M-Slice — könnte echter Beta-Blocker sein

**Money-Path-CEO-Approvals:**
- FANTASY-NEU-1 (FPL 60min-Rule, Money-Path Scoring)
- F-09 BPS-Bonus (pre-existing)
- UX 20 MembershipSection Confirm (pre-existing)

**Anil-Mensch-Block (einziger Beta-READY-Blocker):**
- 3 Beta-Tester organisieren (Templates fertig in `memory/beta-tester-recruitment-templates.md`)
- TR-Native-Reviewer organisieren
- `memory/beta-tester-list.md` schreiben (.gitignore-pflicht)
- TR-Wording-Reviews: Slice 200a/202/208/224 Strings

## Bei `/clear` Resume-Pfad

1. `worklog/active.md` (idle, **f412b396** ist HEAD)
2. `worklog/beta-phase.md` (Phase D, last_phase_run 2026-04-28, last_signoff FAIL — Anil-Action-Block)
3. Diese Datei Top-Block (DIESER Resume-Anker)
4. `worklog/log.md` Top 4 Einträge (242/240/241/238) + Top vorher (237/235/234/233/232/231)
5. `git log --oneline -12` (10 Commits diese Session + 2 vorherige)
6. `git worktree list` (sollte nur main sein)
7. **Nächster sinnvoller Slice:** abhängig von Anil-Direktive — autonom-ROI ist erschöpft.
   - Wenn "Slice 239" → Anil entscheidet pro Component delete/wire/defer (interaktiv)
   - Wenn "Smoke-Triage" → Live-Test gegen bescout.net (Anil + ich gemeinsam)
   - Wenn "Anil-Action" → 3 Tester organisieren (Mensch-Action)
   - Wenn "neue Idee" → Brainstorming via /spec

## D52-Pattern-Familie — 6× live appliziert

D52 ("Wave-3-Tooling iterativ-tightenen, lieber locker starten + tighten"):
- **Slice 223** audit-stale-check.ts (D48-Catcher) — Initial-Foundation
- **Slice 229** type-truth-audit.ts — Iteration 17→0 false-positives
- **Slice 237** silent-fail-audit Comment-Skip — 3 false-pos weg
- **Slice 238** silent-fail-audit Chunked + Test-Skip — 28 false-pos weg ⭐ (größter Single-Fix)
- **Slice 240** TM-Scripts KNOWN_ORPHANS-Triage — Allowlist-Cleanup
- **Slice 242** orphan-component-detector Allowlist — Mechanism + 4 entries

Tooling-Foundation ist gehärtet. Audit-Pipeline läuft jetzt mit minimal-Noise + maximal-Signal.

---

# Vorherige Sessions (archiviert)

# Resume-Anker (2026-04-27→28 — System-Wiring-Session: 6 Slices, Self-Improvement-Loop + Drift-Prevention enforced + 2× Workflow-Live-Test)

**Wenn `/clear` oder Token-Limit:** Lese in dieser Reihenfolge:
1. `worklog/active.md` — `status: idle`, HEAD `88df306d`
2. `worklog/beta-phase.md` — Phase D, last_signoff: FAIL (Anil-Action-Block, NICHT Tech)
3. Diese Datei (Resume-Anker, Top-Block — DAS hier)
4. `git log --oneline -14` (6 Slices = 14 commits diese Session)
5. `worklog/log.md` Top 6 Eintraege (231 → 237)
6. `memory/decisions.md` D53 + D54 (NEU diese Session)
7. `.claude/rules/workflow.md` Section 3a (Definition-of-Done je Slice-Type)

## Session-End 2026-04-27→28 — 6 Slices, Workflow architektonisch enforced

**Anil-Direktive im Verlauf der Session:**
1. "weiter nahtlos im handoff, mit voll diziplin und fokus"
2. "2+3, danach 4" → Slices 231 + 232 (Wave-3-Tooling-Trio komplett)
3. "haben wir noch gaps?" + GSD-Reference → Slice 233 Vorschlag akzeptiert
4. "j" → Slice 233 Self-Improvement-Loop (D53)
5. **"Plan-Mode + Ultrathink, vollständige Arbeit"** → Slice 234 L-Slice D54
6. "wir starten mit 3 und testen dabei unseren neuen Workflow" → Slice 235 (i18n)
7. "b" → Anil-Approval Option B (Kadro + Sahip Wording)
8. "empfehlung" → Slice 237 Comment-Skip-Heuristik
9. "bereite alles für einen clear vor" → Diese Pre-Clear-Vorbereitung

## 6 Slices — was diese Session erreicht hat

**Slice 231** — Spec-Quality-Gate Item-Count-Layer-2 (XS, Hook). Reviewer-Lücke aus Slice 212 nach 19 Slices geheilt. Layer 2 prüft Item-Counts pro Slice-Größe (XS=3, S=6, M=6/8, L=10) für Code-Reading + Edge-Cases + ACs. 3 BUILD-Discoveries: UTF-8 `\b`-Bug, Tabellen-Header-Rollback, AC-Code-Block-Pattern.

**Slice 232** — `spec: inline`/`skipped` Bypass Hard-BLOCK (XS, Hook). Erste Hard-BLOCK-Erweiterung. Plain bypass ohne Begründungs-Klammer → BLOCK exit 2. Wave-3-Tooling-Backlog komplett.

**Slice 233** — Nightly Audit Self-Improvement-Loop (S, GHA, **D53**). **Erste autonome Schleife** in BeScout. nightly-audit.yml mit 11 Audit-Steps + Smoke + Auto-Issue-Pipeline. Daily 03:00/04:00 UTC. Live-Run #25011352539 verified.

**Slice 234** — System-Wiring Recovery + Drift-Prevention (L, Hook, **D54**, **Plan-Mode + Ultrathink**). 6 Phasen:
- HEAL: 8 Hooks registriert (capture-correction, inject-context-on-compact, morning-briefing, pattern-check, quality-gate-v2, run_tests_on_change, session-retro, track-file-changes), 1 archived (quality-gate.sh), 1 deleted (inject-learnings.sh). **Knowledge-Flywheel war 19 Tage tot** (capture-correction.sh env-var-Bug + nicht registriert) → JETZT live, queue.jsonl wächst.
- PREVENT: scripts/wiring-check.ts (NEU, 230 Zeilen) + ship-tool-wiring-gate.sh (NEU, BLOCK exit 2 bei orphan-Tool).
- ARCHITEKTUR: Slice-Type-Header pflicht in _TEMPLATE.md + Layer-3 DoD-Hook.
- LIVE-VERIFY: Run #25018867677, 11 Audit-Steps SUCCESS, Issue-Dedupe verified.
- 14 stale Smoke-Issues batch-closed, Master-Tracker #25 erstellt.
- Reviewer-Agent CONCERNS (11 Findings) → PASS post-Heal-Wave.

**Slice 235** — i18n 7 fehlende TR-Keys (XS, **i18n**, **1. Workflow-Live-Test** unter D54-Enforcement). Anil-Approval Option B: Kadro + Sahip. "Kadroda değil" identisch zu existing `formBars.notInSquad` (Bonus-Konsistenz). Alle Hooks silent.

**Slice 237** — silent-fail-audit Comment-Skip-Heuristik (XS, **Tool**, D52 Refinement, **2. Workflow-Live-Test**). Comment-Skip-Regex am Loop-Top fängt 3 false-positives in JSDoc-Comments (scripts/type-truth-audit.ts:12,132,140). Baseline 92→93 HIGH (transparent: 3 false-pos weg + 1 echter Drift dokumentiert).

## Pipeline-Status (alle 14 Commits gepusht)

HEAD: `88df306d chore(237): active idle nach Slice 237 — silent-fail Comment-Skip live`

```
88df306d chore(237) active idle
fbeb085b feat(237) silent-fail Comment-Skip
5b96108a chore(235) active idle
9ed8cb02 feat(235) i18n TR-Keys
be8d627c docs(234) proof AC-09 + Issue-Dedupe live-verified
90070827 chore(234) active idle
68717459 feat(234) System-Wiring L-Slice D54
26df79ba chore(233) active idle
e3ad904b feat(233) Nightly Audit Loop D53
7ce44068 docs(handoff) Session-End 2026-04-27 — VORHERIGE Session
```

## System-Status: läuft autonom

**Daily-Cron-Loop (Slice 233+234 D53+D54):**
- 03:00 UTC: nightly-audit.yml → 11 Audit-Steps (silent-fail, stale, orphan, type-truth, mutation-race, i18n, rpc-security, tr-strings, **compliance**, **wiring**, **findings-to-slices Pipeline**)
- 04:00 UTC: bescout.net Smoke-Test
- Issue-Dedupe via gh listForRepo + Comment-Update (max 1 Issue/Tag)

**13 Vercel-Crons** (Daten-Sync): gameweek-sync, sync-players-daily, sync-injuries, sync-standings, sync-fixtures-future, sync-transfers, calculate-mv-trends, calculate-trade-volume-7d, etc.

**3 GHA-Workflows on-Event:** ci.yml (push), post-deploy-smoke.yml (deploy success), post-push-deploy-watchdog.yml (push, D36-Detection)

**Pre-Commit-Hooks aktiv (alle architektonisch enforced):**
- ship-spec-gate (BLOCK Edit ohne Slice)
- ship-spec-quality-gate Layer 1+2+3 (WARN)
- ship-spec-quality-gate Bypass-BLOCK (`spec: inline` plain)
- ship-cto-review-gate (BLOCK feat ohne Reviewer-File)
- ship-proof-gate (BLOCK feat ohne Proof)
- **ship-tool-wiring-gate (BLOCK feat bei orphan-Tool)**

**Knowledge-Flywheel reaktiviert:**
- capture-correction.sh feuert auf UserPromptSubmit, fängt Korrekturen (Keywords: nein, falsch, stattdessen, hör auf, korrektur etc.) in `.claude/learnings-queue.jsonl`
- queue.jsonl hat aktuell 4 Test-Korrekturen aus Slice 234 Build-Test
- /reflect Skill kann jetzt Drafts erzeugen aus queue
- /promote-rule Skill für Anil-Approval-Pipeline

## Was steht offen — Backlog priorisiert

**Tech-Backlog (CTO-autonom, sofort actionable):**
- **Slice 238** — Triage echter Drift (+1 HIGH in-without-chunking + 2 MEDIUM error-check entstanden 2026-04-26→27, transparent in baseline 93/103)
- **Slice 240** — TM-Once-Off-Scripts cleanup (13 orphan TM-Scripts klassifizieren: archive/delete/keep)
- **Slice 241** — errors-infra.md Knowledge-Capture (4 Lehren aus Slice 234 Reviewer-Heal)

**Tech-Backlog (braucht Anil-Decision):**
- **Slice 239** — orphan 13 Components Wire-Plan (CommunityValuation, DpcMasteryCard, GameweekScoreBar, LimitOrderModal, etc.) — pro Component delete/wire/defer
- **Smoke-Code-Fix** — Issue #25 Master-Tracker, Player-Link-Timeout `e2e/beta-smoke.spec.ts:37`. Mögliche Causes: Auth-Fail / Selector-Drift / DB-Empty. Could be echter Beta-Blocker.

**Money-Path-CEO-Decisions (Anil-only):**
- FANTASY-NEU-1 (FPL 60min-Rule, Money-Path Scoring)
- F-09 BPS-Bonus (pre-existing CEO-pending)
- UX 20 MembershipSection Confirm-Step

**Anil-Mensch-Block (einziger Beta-READY-Blocker):**
- 3 Beta-Tester organisieren (Templates fertig in `memory/beta-tester-recruitment-templates.md`)
- TR-Native-Reviewer
- `memory/beta-tester-list.md` schreiben (.gitignore-pflicht)

## Bei `/clear` Resume-Pfad

1. `worklog/active.md` (idle, **88df306d** ist HEAD)
2. `worklog/beta-phase.md` (Phase D, last_signoff: FAIL — Anil-Action-Block, NICHT Tech)
3. Diese Datei (Resume-Anker)
4. `worklog/log.md` Top 6 Einträge (231/232/233/234/235/237)
5. `memory/decisions.md` D53 + D54 (Build-without-Wire architektonisch enforced)
6. `.claude/rules/workflow.md` Section 3a (Definition-of-Done je Slice-Type)
7. `git worktree list` (sollte nur main sein)
8. **Nächster sinnvoller Slice:** Anil-Direktive abhängig.
   - Wenn "weiter" → Slice 238 (Triage echter Drift, XS, autonom)
   - Wenn "Smoke-Triage" → Slice 235er Code-Fix (Issue #25, M-Slice, kann Beta-Blocker sein)
   - Wenn Wire-Plan → Slice 239 (Anil entscheidet pro Component)

## Workflow-Live-Test — was Slice 234 D54 in der Praxis macht

**Beobachtung Slice 235 + 237:** alle Hooks silent wie designed.

| Hook | Slice 235 (i18n) | Slice 237 (Tool) |
|------|------------------|------------------|
| Layer-1+2 (Sektionen + Items) | silent ✓ | silent ✓ |
| Layer-3 (Slice-Type-DoD) | silent ✓ (Spec hat tr.json/de.json) | silent ✓ (Spec hat Wiring-Sektion) |
| ship-tool-wiring-gate | nicht-relevant | silent ✓ (Edit auf existing Tool) |
| ship-cto-review-gate | review-File ✓ | review-File ✓ |
| ship-proof-gate | proof-File ✓ | proof-File ✓ |
| capture-correction | kein Trigger ("b"-Antwort) | kein Trigger |

**Verdict:** Workflow funktioniert. Discipline ist architektonisch enforced statt durch Memory.

## Pattern-Familie etabliert

**D43 → D46 → D54** ("Existenz ≠ Verwendung"):
- D43 (Slice 192/200): Type-Truth-Drift — Silent-Cast / nested-select
- D46 (Slice 207/227/228): Orphan-Component-Production-Code
- **D54 (Slice 234): Build-without-Wire — Hooks/Scripts/NPM-Scripts**

Cross-cutting: Tool/Component/Audit kann existieren ohne im echten Workflow zu sein. Enforcement-Architektur (D45 Hooks > Text-Regeln) erzwingt Discipline.

## Bonus-Discoveries diese Session

1. **capture-correction.sh hatte env-var-Bug** (las `CLAUDE_USER_PROMPT` statt JSON-stdin) — 19 Tage tot ohne dass jemand merkte. Slice 234 fixt + UTF-8-tolerant via LC_ALL=C.UTF-8 + dual-Pattern (Slice 234 Reviewer-F-04).
2. **silent-fail-audit-Heuristik fängt eigene Audit-Tool-JSDoc** — Slice 237 globaler Comment-Skip löst es retro + future-proof.
3. **Issue-Dedupe via gh listForRepo + title-startsWith** — Slice 234 implementiert + Run #25018867677 verified Comment-Update statt Duplicate.
4. **Slice 234 hat 14 stale Smoke-Issues batch-closed** — aber Master-Tracker #25 sichtbar gehalten (Reviewer-F-08 HIGH-Concern adressiert: Issue-Closing != Bug-Resolved).

---

# Vorherige Sessions (archiviert)

# Resume-Anker (2026-04-27 — 8-Slice-Marathon: Re-Audit-Heal-Wave + Wave-3-Tooling-Trio)

**Wenn `/clear` oder Token-Limit:** Lese in dieser Reihenfolge:
1. `worklog/active.md` — `status: idle`, HEAD `7463600c`
2. `worklog/beta-phase.md` — Phase D, last_signoff: FAIL, **alle findings_open NULL**
3. Diese Datei (Resume-Anker, Top-Block)
4. `git log --oneline -16` (8 Slices = 16 commits diese Session)
5. `worklog/log.md` Top 8 Eintraege (223 bis 230)
6. `memory/decisions.md` D51 + D52 (NEU 2026-04-27)

## Session-End 2026-04-27 — 8 Slices in Folge, Tech-Side maximal sauber + Audit-Methodik gehärtet

**Anil-Direktive im Verlauf der Session:**
1. "weiter im handoff" → Slice 223 D48-Catcher-Tool
2. "A" → Slice 223 (CTO-Empfehlung Wave-3-Tooling)
3. "B" → Targeted Phase-A-Re-Audit (3 Agents auf Slice-222-Diff)
4. **"DU HAST DAS VOLLE KOMANDO; arbeite autonom"** → Slices 224 + 225 + 226 (Re-Audit-Heal-Wave)
5. "C, den rest übernimmst du autonom" → Slice 227 CommunityValuation-Defer
6. "übernehme das visual check" → Visual-Check + ORPHAN-NEU-1 Discovery
7. "autonom weiter" → Slices 228 + 229 + 230 Wave-3-Tooling-Trio
8. "bereite alles für einen clear bereit" → Pre-Clear-Vorbereitung (diese Datei)

## Pipeline-Status (alle 16 Commits gepusht)

HEAD: `7463600c chore(230): active idle nach Slice 230 — Wave-3-Tooling-Trio komplett (223+228+229+230)`

**Wave 1 — Wave-3-Tooling-Foundation:**
- 223 `audit-stale-check.ts` — D48-Catcher automatisiert + 2 echte Drifts gefangen (F-07/F-11 reklassifiziert)

**Wave 2 — Re-Audit-Heal-Wave nach Targeted Phase-A-Re-Audit (9 NEU Findings → 7 healed + 1 deferred + 1 wont-fix):**
- 224 Sentiment-Wording-Heal — 3 Findings (P1+P1+P3) Wurzel-Fix · business.md Verbots-Register erweitert
- 225 InfoTooltip-Migration — UX-NEU-2/3/4 + Slice 216 Pattern-Drift geheilt · ui-components.md Tooltip-Pattern-Decision-Tree codifiziert
- 226 Sentiment-Bar 3-Segment — FM-NEU-4 closed · FM-NEU-3 deferred (post-Beta) · FM-NEU-5 wont-fix
- 227 CommunityValuation @experimental — ORPHAN-NEU-1 (Visual-Check Discovery) deferred + decisions.md D46 erweitert (Component-Achse)

**Wave 3 — Wave-3-Tooling-Trio (CTO autonom, Anil-Direktive "autonom weiter"):**
- 228 `orphan-component-detector.ts` — D46-Component-Achse automatisiert + 13 echte Orphans entdeckt
- 229 `type-truth-audit.ts` — D43 Static-Pattern-Detection (3 Bug-Klassen)
- 230 `ship-phase-tracker-reminder.sh` — Slice 214 Reviewer-Backlog erfüllt

## Tech-Side ist FERTIG — null open Findings

Phase-Tracker (`worklog/beta-phase.md`):
```yaml
phase: D
last_signoff: FAIL (HARD-NO-GO Trial Slice 217 + last_signoff_verdict 2026-04-27 aktualisiert)
last_phase_run: 2026-04-27 (Targeted Phase-A Re-Audit + Heal-Wave)
findings_open: P0=0, P1=0, P2=0, P3=0   # ALLE NULL
deferred: 4 (POSTHOG-NEU-1, FM-RR-2, FM-NEU-3, ORPHAN-NEU-1)
ceo_pending: 3 (FANTASY-NEU-1, F-09 BPS, UX 20 MembershipSection)
wont_fix: 3 (FM-RR-1, BRAND-NEU-1, FM-NEU-5)
stale: 2 (TR-NEU-1, FM-RR-3)
signoff_questionable: 2 (Page-Health-Score, Persona-Score-numerisch)
```

## Wave-3-Tooling — 4 Tools + 4 Patterns automatisiert

| Tool | npm-Script | Pattern | Slice |
|------|-----------|---------|-------|
| `scripts/audit-stale-check.ts` | `audit:stale` | D48 Audit-Stale-Catcher | 223 |
| `scripts/orphan-component-detector.ts` | `audit:orphan` | D46 Orphan-Component | 228 |
| `scripts/type-truth-audit.ts` | `audit:type-truth` | D43 Silent-Cast / nested-select / missing-error | 229 |
| `.claude/hooks/ship-phase-tracker-reminder.sh` | (Stop-Hook) | findings_open Counter-Update Reminder | 230 |

## Neue Decisions in `memory/decisions.md` (DISTILL diese Session)

- **D51** PROCESS: Targeted Phase-A-Re-Audit nach Money-Path-UI-Edits Pflicht
  - Begründung: Slice 222 → Re-Audit-Wave produzierte 9 echte NEU Findings aus 10-Lines-Diff
  - Self-Review-D35-Limit: erkennt Code-Pattern-Konsistenz, NICHT Compliance/Mobile-UX/Domain-Mechanik

- **D52** PROCESS: Wave-3-Tooling — Detection-Tool pro Bug-Klasse-Pattern
  - Standardisierte API: `audit:*` npm-script + Markdown-Report + Exit-Code-Switch + Negative-Test-Pflicht
  - Heuristik-Refinement-Lehre: lieber locker starten + iterativ tightenen (Slice 229: 17→0 false-positives)

## Knowledge-Flywheel — codifizierte Lehren

1. **business.md Verbots-Register erweitert** (Slice 224)
   - "unter-/überbewertet" + "düşük/yüksek değerli" + "Position/pozisyon" als Securities-Drift verboten
   - CI-Guard-grep-Block ergänzt

2. **ui-components.md Tooltip-Pattern-Decision-Tree** (Slice 225)
   - Education → InfoTooltip (Mobile-friendly + A11y)
   - Trivial-Hint → `title=` (Desktop-Hover-OK)
   - Anti-Pattern dokumentiert + Migration-History (Slice 216 + 222)

3. **decisions.md D46 erweitert um Component-Achse** (Slice 227)
   - "Audit-Quality-Drift Pattern-Familie": Worktree-Escape + Service-Duplicate + Orphan-Component
   - Cross-cutting: "Code-Existenz ≠ Code-Im-Render-Tree"
   - Audit-Methodik-Hardening: import-trace-Pflicht vor P1-Klassifikation

## Visual-Check Discovery — `CommunityValuation` orphan production-code

- Visual-Check 2026-04-27 entdeckte: `CommunityValuation` exported via barrel-index, nirgends importiert
- **Slice 216 K-RR-1 + Slice 225 InfoTooltip-Migration** wurden auf totes Component appliziert (User sah es nie)
- **Anil-Decision Option C:** Defer mit `@experimental` JSDoc + Backlog-Eintrag
- **Wire-Plan:** bei Skala >20 active-scouts auf Player-Detail Community-Tab wiren, sonst Slice 230+ delete
- **Audit-Methodik-Bug:** Phase-A-Re-Audit hatte Component nicht import-trace-verified → falsche P1-Klassifikation
- **Slice 228 `orphan-component-detector.ts` verhindert das in Future** (CI-gate-ready)

## Bonus-Discovery: 13 echte Orphans im Codebase

Slice 228 erstes Run zeigte:
- `CommunityValuation` (Slice 227 known)
- `DpcMasteryCard`, `GameweekScoreBar`, `LimitOrderModal`, `PlayerImagePlaceholder`, `TradeSuccessEffect`
- `HoldingsSection`, `IPOBuySection`, `TransferBuySection`
- `BuyOrderModal` ("aus Beta entfernt AR-11" — File-Leiche, sollte gelöscht werden)
- `FollowBtn`, `HomeSkeleton`, `ManagerOffersTab` (test-only used)

**Cleanup-Wave Slice 231+ pendiert** — jeder Component eigene Decision (delete/wire/defer). Nicht autonom, weil Wire-Plan-Dialog mit Anil pro Component möglich.

## Zwischen heute und Beta-GO steht NUR noch

**1 Anil-Mensch-Action:** 3 Tester organisieren mit fertigen Templates.

```
1. memory/beta-tester-recruitment-templates.md → 3 Personen, Templates anpassen
2. 3× DM/Email schicken
3. Bei Zusage: memory/beta-tester-list.md (private, .gitignore)
4. memory/beta-onboarding.md TODO-Stellen ersetzen
5. Zoom-Calls (~30min × 3)

Erwartete Mensch-Zeit: 3-4h verteilt über 3-7 Tage.
```

## Anil-Action vor Beta-Verify (gesammelt diese Session + vorheriger)

**Mensch-only-Blocker (Anil):**
- 3 Beta-Tester organisieren (Templates fertig, ~30min)
- TR-Native-Reviewer organisieren
- `memory/beta-tester-list.md` schreiben (private, .gitignore-Pflicht)
- TR-Wording-Review der Slice 224 NEU-Keys: `sentimentLabel/Bullish/Bearish/Neutral` ("güçlü/zayıf buluyor" / "kararsız")
- Visual-Verify auf bescout.net post-deploy (Mobile 393px Tap-Test):
  - `/market` BuyConfirmModal Sentiment-`?`-Icon
  - Player-Detail CommunityValuation Floor-Preis-`?`-Icon (technisch deployed aber Component ist orphan — Verify zeigt nichts; Wire-Plan pending)

**Money-Path-CEO-Decisions (Anil-only):**
- FANTASY-NEU-1 (FPL 60min-Rule, Money-Path Scoring-Algorithm-Change)
- F-09 BPS-Bonus (pre-existing Money-Path)
- UX 20 MembershipSection Confirm (pre-existing Money-Risk)

**Wire-Plan-Decisions (Anil entscheidet):**
- 13 Orphan-Components aus Slice 228 — pro Component delete/wire/defer
- `CommunityValuation` Wire-Plan: bei Skala >20 active-scouts oder löschen?

## Backlog post-Beta (wenn Skala)

- **Slice 231+ Orphan-Cleanup-Wave** (13 Components, jeweils delete/wire/defer Decision)
- **Slice 240+ PostHog-Instrumentation** (track-Events für login/first_trade/first_lineup/first_post)
- **Slice 241+ Mobile-Touch-Tooltip-Wave** (D46-Migration auf restliche `title=`-Stellen)
- **Slice 242+ Watchlist-Standalone-Page** (Feature, kein Bug)
- **FM 10.2/10.3** Airdrop Personal-Score-History + Friends-Filter (braucht Skala >5 Tester)
- **Holdings-RPC-Migration** (PostgREST → SECURITY DEFINER, Performance)
- **L5-Data-Drift Backfill** (11% Players ohne perf_l5)
- **D43-M-Slice:** Live-DB-`pg_get_functiondef`-Type-Verify-Tool (analog Slice 229 Static-Variante)
- **D49-Slice 232+:** PLAYER_SELECT_COLS-Sync-Audit-Tool

## Wave-3-Tooling Backlog (CTO-autonom, niedrig prio)

- Hook-Item-Count-Validation (`ship-spec-quality-gate.sh` prüft aktuell nur Sektion-Existenz, nicht ≥-counts)
- `spec: inline` Bypass Hard-BLOCK (aktuell warn-only)

## Bei /clear oder Token-Limit Resume-Pfad

1. `worklog/active.md` (idle, **7463600c** ist HEAD)
2. `worklog/beta-phase.md` (Phase D, alle findings_open NULL, last_signoff_verdict aktualisiert 2026-04-27)
3. Diese Datei Top-Block
4. `worklog/log.md` Top 8 Eintraege (223 → 230)
5. `git log --oneline -16` zeigt komplette Session-Cascade
6. `git worktree list` (sollte nur main sein)
7. `memory/decisions.md` D51 + D52 (DISTILL 2026-04-27)
8. **Nächster sinnvoller Slice:** abhängig von Anil-Direktive — autonom-ROI ist erschöpft, was übrig ist braucht entweder Anil (Money-Path, Wire-Plans) oder Skala (>20 User für Tools wie FM 10.2/10.3).

## System-Foundation funktioniert (Slice 211-230 cumulative)

Live & autonom:
- ✅ `ship-phase-gate.sh` UserPromptSubmit-Hook warnt bei "Beta-fertig"-Claims ohne Sign-Off-PASS
- ✅ `ship-spec-quality-gate.sh` PreToolUse-Hook warnt bei Spec-Pflicht-Sektionen-Lücken
- ✅ `ship-cto-review-gate.sh` Pre-Commit-Hook blockt feat/fix ohne Reviewer-File
- ✅ `ship-phase-tracker-reminder.sh` (Slice 230 NEU) Stop-Hook reminded findings_open Update
- ✅ `scripts/audit-stale-check.ts` (Slice 223) audit-stale CI-gate
- ✅ `scripts/orphan-component-detector.ts` (Slice 228) orphan CI-gate
- ✅ `scripts/type-truth-audit.ts` (Slice 229) type-truth CI-gate
- ✅ `scripts/findings-to-slices.ts` Pipeline auto-generiert Slice-Stubs
- ✅ `/auto-beta-ready` Skill orchestriert Phase A-D-Loop
- ✅ Phase-Tracker als SoT, Hooks lesen davon

**Trial-Run-Verdict (Slice 217):** System produziert ehrliches HARD-NO-GO bei realem Stand. **Foundation lügt nicht.**

---

# Vorherige Sessions (archiviert)

# Resume-Anker (2026-04-26 — 14-Slice-Marathon + Self-Healing-Loop-Foundation)

**Wenn `/clear` oder Token-Limit:** Lese in dieser Reihenfolge:
1. `worklog/active.md` — `status: idle`, HEAD `bb5e12cb`
2. `worklog/beta-phase.md` — Phase D, last_signoff: FAIL, **alle findings_open auf 0**
3. `memory/current-sprint.md` — vollständiger Stand 2026-04-26 (Slice 208-222)
4. Diese Datei (Resume-Anker, Top-Block)
5. `git log --oneline -20` (14 Slices in einer Session)
6. `worklog/log.md` Top 14 Eintraege (208 bis 222)

## Session-End 2026-04-26 — 14 Slices in Folge, Tech-Side maximal sauber

**Anil-Direktive im Verlauf der Session:**
1. "weiter im handoff" → Slice 208 FM 6.2 Trend-Sparkline
2. "weiter" → 209 Audit-Stale-Cleanup
3. "weiter" → 210 UX 17 airdrop isError
4. **"mit der SPEC steht und fällt alles, agent soll nicht blind sein"** → Slice 211 Spec-Foundation-Uplift D50
5. "weiter" → 212 Spec-Quality-Gate-Hook
6. "A" → 213 QuickActionPills
7. **"ich höre fertig aber dem ist nicht so, System soll sich selbst heilen, autonom"** → Slice 214 Auto-Beta-Ready Self-Healing-Loop
8. "los" → 7 Background-Agents dispatched + Live-Test
9. "re run" → Slice 215 Phase-C Re-Run
10. "3" → Slice 217 Sign-Off-Trial-Run → HARD-NO-GO (System lügt nicht)
11. "ja" → Slice 216 P1-Wave-Heal (3 P1 → 0)
12. **"volle Entscheidungsgewalt, führe aus"** → Slice 218 Test-Mock-Repair, 219 Onboarding-Doc + Recruitment-Templates, 220 Smoke+Sentry+PostHog Verifies
13. "weiter" → Slice 222 P2-Bundle Reklassifizierung (alle findings_open → 0)
14. **"/done"** → Session-End

(Detail siehe vorheriger Resume-Anker — durch Slice 223+ obsoleted)
