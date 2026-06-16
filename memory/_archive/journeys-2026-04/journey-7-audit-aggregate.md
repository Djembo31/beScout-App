---
name: Journey 7 — Aggregated Findings (Mission + Streak)
description: Round-1-Audit (READ-ONLY) aus Frontend/Backend/Business-Sicht. 2 LIVE-BROKEN CRITICAL Bugs aufgedeckt + Security-Gap (anon-grant). Format analog journey-5-findings-aggregate.md.
type: project
status: ready-for-healer
created: 2026-04-14
---

# Journey #7 — Aggregated Findings (Mission + Streak)

**Total: 34 Findings — 6 CRITICAL + 11 HIGH + 11 MEDIUM + 6 LOW**

Scope: `src/app/(app)/missions/page.tsx`, `src/components/missions/*`, `src/lib/services/missions.ts`, `src/lib/services/streaks.ts`, `src/lib/queries/missions.ts`, `src/lib/streakBenefits.ts`, `src/lib/retentionEngine.ts`, `src/components/gamification/DailyChallengeCard.tsx`, RPCs (`assign_user_missions`, `claim_mission_reward`, `record_login_streak`, `track_my_mission_progress`, `update_mission_progress`), Tabellen (`user_missions`, `mission_definitions`, `user_streaks`, `streak_config`, `streak_milestones_claimed`).

**Verteilung (Aggregat aus Frontend/Backend/Business-Perspektiven):**
- Frontend: 1C + 4H + 5M + 3L  (13)
- Backend:  4C + 4H + 4M + 2L  (14)
- Business: 1C + 3H + 2M + 1L  ( 7)

---

## 🚨 AKUT — 2 LIVE-BROKEN CRITICAL + 1 LIVE-EXPLOIT

### J7B-01 🚨 Streak-Milestone-Reward RACE CONDITION — 2 User haben doppelte Rewards kassiert (LIVE-EXPLOIT)

**Beweis (Live-DB `transactions` 2026-04-14):**
```sql
user_id=99b601d2 → 2× "3-Tage-Streak: 100 $SCOUT" @ 2026-03-15 22:58:48.117  AND 22:58:48.120 (Δ 3ms = parallel RPC-Call)
user_id=700c1316 → 2× "3-Tage-Streak: 100 $SCOUT" @ 2026-04-03  AND 2026-04-09 (Streak gefallen → neu aufgebaut → 2. Reward)
```

**Root Cause — `record_login_streak` (live pg_get_functiondef):**
```sql
-- 1. Kein Row-Lock auf user_streaks (kein FOR UPDATE):
SELECT * INTO v_row FROM user_streaks WHERE user_id = p_user_id;

-- 2. Milestone-Reward nur an current_streak=N geknuepft, KEINE claim-Table:
v_milestone_reward := CASE v_row.current_streak WHEN 3 THEN 10000 WHEN 7 THEN 50000 ... END;

-- 3. Reward wird geschrieben ohne Idempotency-Check:
IF v_milestone_reward > 0 THEN
  UPDATE wallets SET balance = balance + v_milestone_reward ...
END IF;
```

Zwei Angriffsvektoren:
- **Race-Condition:** 2 parallele RPC-Calls (z.B. Double-Login) → beide lesen dieselbe Row mit `current_streak=2` (gestern), beiden inkrementieren auf 3, beide triggern 100 $SCOUT.
- **Drop-and-Rebuild:** User lässt Streak verfallen, baut ihn wieder auf 3 Tage auf → bekommt Reward erneut. Legit, aber Gluecksspiel-Pattern (Loop-Exploit).

**Impact:**
- 200 $SCOUT bereits doppelt gemintet (2 User × 100 BSD — heute minimal, skaliert mit User-Anzahl)
- Exploit bei Beta-Launch mit 50 Comunio-Vets planbar (jeder User kann 500+ $SCOUT in 30 Tagen exploiten durch gewolltes Verfallen-Lassen)
- Es gibt eine Tabelle `streak_milestones_claimed` (idempotency-table) in `baseline_gamification.sql` — wird aber vom Live-RPC NICHT genutzt (Schema existiert, kein INSERT).

**Fix-Owner:** Backend-Migration (**CEO-Approval Trigger #1: Geld-relevant**). → **AR-50**
- Fix: `INSERT INTO streak_milestones_claimed (user_id, milestone) ON CONFLICT DO NOTHING RETURNING ...` vor Wallet-Credit. Wenn `NOT FOUND` (schon geclaimt) → Reward-Skip.
- Plus: `SELECT * INTO v_row FROM user_streaks WHERE user_id = p_user_id FOR UPDATE;` (Row-Lock)

---

### J7B-02 🚨 `assign_user_missions` GRANTED TO anon + KEIN auth.uid()-Guard (SECURITY DEFINER leak)

**Beweis:**
```sql
-- live privileges (has_function_privilege):
proname='assign_user_missions' → anon=TRUE, authenticated=TRUE
-- live function body:
CREATE OR REPLACE FUNCTION public.assign_user_missions(p_user_id uuid)
  SECURITY DEFINER
  -- KEIN "IF auth.uid() IS DISTINCT FROM p_user_id" Guard!
  ...
  INSERT INTO user_missions (user_id, mission_id, period_start, period_end, target_value, reward_cents)
  SELECT p_user_id, v_def.id, ...
```

**Root Cause:**
- Migration `20260404190000_missions_club_id_rpcs_rls.sql:279` hat nur GRANT, aber KEIN REVOKE-Block fuer anon (AR-44-Muster aus J4).
- Funktion nimmt `p_user_id UUID` direkt ohne Guard — **anon kann user_missions-Rows fuer jede User-ID erzeugen**.

**Impact:**
- Anon-DoS: massenhafte `assign_user_missions(random_uuid)` Calls → `user_missions`-Table wird mit Garbage befuellt (Stack: INSERT pro Mission-Def × Anzahl Calls).
- User-Enumeration: Attacker probt User-IDs mit `assign_user_missions(uuid)` → Response `SETOF user_missions` leaks Existenz + Club-Zugehoerigkeit (club-specific missions).
- Claim-Pfad selbst ist durch `auth.uid()`-Check in `claim_mission_reward` sicher, aber INSERT-Pfad ist offen.

**Fix-Owner:** Backend-Migration (**CEO-Approval Trigger #2: Security-Break / External Systems**). → **AR-51**
- Fix: `REVOKE EXECUTE FROM anon` (analog AR-44 Template) + optional `IF auth.uid() IS DISTINCT FROM p_user_id THEN RAISE EXCEPTION ...`. Da `assign_user_missions` idempotent ist, kann auch Wrapper wie `assign_my_missions()` ohne Param eingefuehrt werden (`auth.uid()` intern — analog `track_my_mission_progress`).

---

### J7F-01 🚨 Missions-Page Streak kommt aus LOCALSTORAGE statt DB — Source-of-Truth-Divergenz

**Beweis (`src/app/(app)/missions/page.tsx:20,64`):**
```ts
import { getLoginStreak } from '@/components/home/helpers';
...
const streak = useMemo(() => getLoginStreak().current, []);
```

`getLoginStreak` (in `src/components/home/helpers.tsx:149-156`) liest aus `localStorage.getItem('bescout-login-streak')`. 

Vergleich Home (`useHomeData.ts:94-120`):
```ts
// Home ruft ECHTES RPC auf:
import('@/lib/services/streaks').then(({ recordLoginStreak }) => {
  recordLoginStreak(userId).then(result => {
    setStreak(result.streak);  // DB-authoritativ
    localStorage.setItem(STREAK_KEY, JSON.stringify({ current: result.streak, lastDate: ... }));
  })
})
```

**Impact:**
- User oeffnet `/missions` direkt (Deep-Link, Notification-Tap, Back-Button aus /home) **OHNE vorher /home zu besuchen** → `localStorage` ist leer → `streak=0` → **alle Streak-Benefits (Daily Tickets, Mystery Box Discount, Fantasy Bonus Labels) verschwunden**.
- User sieht "0 Tage" trotz 30-Tage-Streak in DB. Streak-Milestone-Banner rendert nicht. Benefit-Labels sind leer.
- **Passiert JEDEM User der ueber Push-Notification "Mission-Reward claim" auf /missions springt OHNE vorher /home gesehen zu haben.**

**Fix-Owner:** Frontend (autonom). → **FIX-01**
- Missions-Page MUSS `recordLoginStreak(uid)` selbst aufrufen ODER via React-Query-Hook lesen (`useUserStreak`). 
- Alternative: zentrales `useLoginStreak` Hook mit `useEffect` das `recordLoginStreak` einmalig ruft und via queryClient teilt.

---

## Cross-Audit Overlaps

| Bug | FE | BE | Business |
|-----|----|----|----------|
| Streak-Source-of-Truth Drift | J7F-01 (localStorage), J7F-02 (race) | — | — |
| Mission-Titles hardcoded DE (nicht i18n) | J7F-03 | J7B-12 | J7Biz-01 |
| RPC-Wording "$SCOUT" leak in Transactions | — | J7B-08 | J7Biz-03 |
| Mission Claim Modal fehlt / CTA nur unten | J7F-04 | — | — |
| Streak-Benefits Labels hardcoded DE | J7F-05 | — | J7Biz-05 |
| Migration-Drift RPCs (Body nicht in Files) | — | J7B-03 | — |
| Realtime Publication fehlt (user_missions/streaks) | J7F-08 | J7B-09 | — |
| Disclaimer fehlt auf /missions mit $SCOUT-Rewards | — | — | J7Biz-02 |
| Wording Belohnung/Reward Mix | J7F-09 | — | J7Biz-04 |

---

## Autonome Beta-Gates (Healer jetzt, kein CEO)

### Group A — P0 Integrity + Type/Source Fix

| ID | Severity | File | Fix | Ursprung |
|----|----------|------|-----|----------|
| FIX-01 | CRITICAL | `src/app/(app)/missions/page.tsx:64` | `getLoginStreak()` durch `recordLoginStreak(uid)` Aufruf ersetzen (via dedicated hook `useLoginStreak(uid)` mit React Query, stale 60s) | J7F-01 |
| FIX-02 | HIGH | `src/lib/services/missions.ts:141` | `triggerMissionProgress(userId, keys)` — `userId` Param ist toter Code (internal RPC nutzt `auth.uid()`). Entweder Signatur bereinigen oder `p_user_id` als Assertion nutzen (validate `userId === auth.uid()` clientseitig). Derzeit ruft `mysteryBox.ts:75` mit leerem String `''` auf (harmlos, aber Smell) | J7B-11 |
| FIX-03 | HIGH | `src/components/missions/MissionBanner.tsx:54,76` | Silent `catch { /* comment only */ }` → mindestens `console.error` + optional Toast bei Claim-Fail (User sieht sonst keine Fehlermeldung wenn `claim_mission_reward` throws) | J7F-06 |
| FIX-04 | HIGH | `src/components/missions/MissionBanner.tsx:253-261` | Claim-Button hat **keinen Loading-Spinner** (nur "...") und **keinen Confirm** bei > 10k $SCOUT. Bei slow-4G kein visuelles Feedback, User klickt doppelt. Fix: `Loader2` statt "..." + ggf. haptic-feedback via `navigator.vibrate(50)` | J7F-04 |
| FIX-05 | HIGH | `src/components/missions/MissionBanner.tsx:73` | `setBalanceCents(result.new_balance)` wird NUR bei `result.success` aktualisiert, aber **Tickets + Notifications werden fire-and-forget geladen via `creditTickets` (10-50 Tickets)**. React Query invalidation fehlt: nach Claim Tickets-Badge im TopBar stale bis reload. Fix: `queryClient.invalidateQueries({ queryKey: qk.tickets.balance(uid) })` | J7F-07 |

### Group B — i18n + Locale + UX Polish

| ID | Severity | File | Fix | Ursprung |
|----|----------|------|-----|----------|
| FIX-06 | HIGH | `src/lib/streakBenefits.ts:73-82` | `getStreakBenefitLabels` fallback ist deutsch-hardcoded (`+5 Tickets/Tag`, `+5% Fantasy-Bonus`). Der Callsite `/missions/page.tsx:66` ruft OHNE `t`-Parameter auf → TR User sieht DE Labels! Fix: `getStreakBenefitLabels(streak, t)` mit `useTranslations('gamification.streak')` | J7F-05 |
| FIX-07 | HIGH | `src/components/missions/StreakMilestoneBanner.tsx:31-32` | Hardcoded `milestone.labelDe` + `milestone.benefitDe` — TR User sieht deutschen Milestone-Banner. Fix: `useLocale()` → `labelTr`/`labelDe` conditional oder `t()` aus i18n-namespace | J7F-05 |
| FIX-08 | HIGH | `src/components/gamification/DailyChallengeCard.tsx:154` | Hardcoded `challenge.question_de` — DB-Schema hat nur `question_de` (keine `_tr`), aber TR User sieht deutschen Frage-Text. Stopgap: `t('noTrTranslation')` Fallback ODER Migration fuer `question_tr` (CEO-Approval separat) | J7F-10 |
| FIX-09 | MEDIUM | `messages/de.json` + `messages/tr.json` | Mission-Keys fehlen TR-Equivalente fuer: `dailyMissions`, `weeklyMissions`, `allDone`, `openCount`, `hintTitle`, `hintReward`, `streakDays` — alle sind DE `"Tages-Missionen"` statt TR `"Günlük Görevler"`. Aktuell in TR-File aber wegen hardcodedem `labelDe`/`label_de` Aufruf nicht durchgereicht | J7F-11 |
| FIX-10 | MEDIUM | `src/components/missions/MissionBanner.tsx:139-141` | `+{fmtScout(centsToBsd(unclaimedReward))} CR` — "CR" ist user-facing Kuerzel mit eigener Semantik. Konsolidieren auf entweder Credits oder $SCOUT einheitlich (AR-32 Kontext-fehlerhaft) | J7F-09 |
| FIX-11 | MEDIUM | `src/components/missions/MissionBanner.tsx:145` | Hack-Code: `tm('allDone').toLowerCase() === 'alle erledigt!' ? '' : ''` — leere String-Manipulation mit Dead Branch. Refactor: Conditional-Render `{totalCompleted === missions.length ? <span>{tm('allDone')}</span> : <span>{tm('openCount', {count})}</span>}` | J7F-12 |
| FIX-12 | MEDIUM | `src/app/(app)/missions/page.tsx:1-47` | Dynamic-Imports sind gut, aber **alle haben `ssr: false`** ohne `Suspense` oder Error-Boundary-Fallback. Bei Netzwerk-Fail hängt das Skeleton infinite. Next.js error.tsx fängt nur Render-Errors, nicht Load-Errors | J7F-13 |
| FIX-13 | MEDIUM | `src/components/missions/MissionBanner.tsx:115` | `if (loading \|\| missions.length === 0) return null;` — Empty-State wird UNSICHTBAR. User sieht nix, wenn keine Missions (z.B. neuer User VOR assign_user_missions-Call). Pattern verletzt `ui-components.md`: "Empty: hilfreiche Message mit CTA" | J7F-14 |

### Group C — Backend / RPC Hardening

| ID | Severity | File | Fix | Ursprung |
|----|----------|------|-----|----------|
| FIX-14 | HIGH | `src/lib/services/missions.ts:53-54` | `_missionsCache.delete(userId); throw error;` — Der cache-clear auf Error ist gut, aber **Error wird geworfen als raw SupabaseError**. J1/J2 mapErrorToKey-Pattern fehlt → UI zeigt z.B. "Nicht authentifiziert" (aus `assign_user_missions`) als raw text. Fix: `mapErrorToKey` analog J1-J3 | J7B-13 |
| FIX-15 | HIGH | `src/lib/services/missions.ts:86` | `claimMissionReward: if (error) return { success: false, error: error.message };` — schluckt Error statt throw, aber `error.message` ist DE-Key (`auth_uid_mismatch: Nicht berechtigt`). UI zeigt raw-i18n-Key. Fix: i18n-key-mapping in Caller ODER `throw new Error(mapRPCError(error))` + mapErrorToKey in Banner | J7B-06 |
| FIX-16 | MEDIUM | `src/lib/services/missions.ts:31-33` | `_missionsCache` hat 60s Cooldown global → bei gleichzeitigen Tabs ODER nach Claim (das invalidiert via `invalidateMissionData` = no-op!) bleibt Cache stale. Fix: `queryClient.invalidateQueries({queryKey: qk.missions.scout, 'hints', uid})` auf erfolgreichen Claim auslösen | J7B-14 |
| FIX-17 | LOW | `src/components/missions/MissionBanner.tsx:45-62` | `useEffect` setzt `loading=false` in `finally`, aber Component rendert `null` wenn `missions.length===0`. Wenn Netzwerk-Fail, bleibt `loading=true` bei `cancelled=true` (Cleanup) → **keine Fehleranzeige**. Fix: Error-State eintragen | J7F-14 |

**Total autonome Fixes: 17** (1 CRITICAL + 6 HIGH + 8 MEDIUM + 2 LOW)

**Healer-Strategie:**
- **Healer A (P0 Streak-Source + Claim-UX):** FIX-01 (DB-Streak-Hook), FIX-03 (error-handling), FIX-04 (loader), FIX-05 (invalidate tickets) — ~1.5h
- **Healer B (i18n-Sweep):** FIX-06, FIX-07, FIX-08 (question_tr migration falls moeglich), FIX-09, FIX-10, FIX-11 — ~2h
- **Healer C (Backend Hardening):** FIX-14, FIX-15, FIX-16, FIX-17, FIX-02, FIX-12, FIX-13 — ~2h

---

## CEO-Approval-Triggers (AR-50..AR-57)

**8 CEO-Approval-Items:**

| ID | Trigger | Severity | Item |
|----|---------|----------|------|
| **AR-50** | **🚨 Geld-Migration + Live-Exploit** | **CRITICAL P0** | Streak-Milestone Re-Claim-Prevention. Live haben 2 User bereits 200 $SCOUT doppelt kassiert (Race + Drop-and-Rebuild). Fix: `streak_milestones_claimed` INSERT vor Wallet-Credit + `FOR UPDATE` Lock auf `user_streaks`. Tabelle `streak_milestones_claimed` existiert bereits im Schema (baseline 2026-03-31) aber wird vom RPC NICHT genutzt. |
| **AR-51** | **🚨 Security-Break + External Systems** | **CRITICAL P0** | `assign_user_missions` hat KEIN `auth.uid()` Guard UND ist GRANTED TO anon. Anon kann fuer beliebige User-IDs user_missions-Rows erzeugen (DoS + User-Enumeration). REVOKE-Block fehlt in `20260404190000_missions_club_id_rpcs_rls.sql`. Fix: REVOKE + Auth-Guard oder Wrapper `assign_my_missions()` ohne p_user_id. |
| **AR-52** | Geld-Migration (Migration-Drift) | HIGH | `record_login_streak` RPC Body lebt nur im Live-DB (`pg_get_functiondef`), in den Migrations nicht im File-System gefunden. Full-Sweep aus AR-43 (J5) ist fuer Streak-RPCs noch NICHT durch. Stub-Policy Verletzung + Greenfield-Reset unmoeglich. |
| **AR-53** | Geld-Migration | HIGH | Migration 20260404190000 ruft `REVOKE ALL ON FUNCTION public.update_mission_progress() FROM PUBLIC, authenticated, anon` aber **keine** der anderen RPCs (`assign_user_missions`, `claim_mission_reward`, `track_my_mission_progress`, `record_login_streak`) haben explizite REVOKE+GRANT Bloecke. Bei naechstem `CREATE OR REPLACE` Reset drohen anon-grants (AR-44-Pattern). Full REVOKE-Sweep fuer Mission+Streak-RPCs. |
| **AR-54** | Compliance-Wording | CRITICAL | **30 aktive Mission-Definitions + 7 deactivated = 37 Rows mit `title`+`description` HARDCODED deutsch in DB**. TR User sieht `"Kaufe 1 Scout Card"` statt `"1 Scout Card Satın Al"`. Schema-Erweiterung: `title_tr`, `description_tr` + Migration mit Translations. Ohne das ist TR-i18n schlichtweg defekt fuer Missions. |
| **AR-55** | Compliance-Wording | HIGH | Mission-Transaction-Beschreibungen nutzen `$SCOUT` + DE: `'3-Tage-Streak: 100 $SCOUT'`, `'Mission-Belohnung: ' \|\| v_mission.reward_cents \|\| ' Cents'` (Migration-File) vs. live RPC `'Mission: ' \|\| v_def.title`. (a) `$SCOUT` darf laut business.md nicht user-facing sein (nur "Credits"). (b) Transactions-Description wird im Activity-Log user-facing gerendert. Fix: neutrale Wording `'Streak-Reward: 3 Tage'` + `'Mission: <title>'`. Locale-Handling: Description-Translation-Key statt DE-Text im DB-Row. |
| **AR-56** | Compliance-Wording | HIGH | `FantasyDisclaimer` + `TradingDisclaimer` existieren (J4 AR-33), aber **Missions-Page hat KEINEN Disclaimer** obwohl $SCOUT-Rewards ausgezahlt werden. Gleich wie J5 AR-47 (Mystery Box Disclaimer gefordert). Disclaimer-Draft + CEO-Sign-off fuer `/missions` + `MissionBanner`. |
| **AR-57** | Architektur-Lock-In | MEDIUM | `mission_definitions` hat `club_id NULLABLE` = global, sonst club-spezifisch. Aber `assign_user_missions` gibt club-missions zurück wenn user-follows-club. Edge-Case: Club-Admin erstellt Mission, User folgt spät dem Club → Mission erscheint mit voller Period, nicht pro-rated. Plus: **Keine Tabelle `mission_progress`** existiert — tracking läuft direkt auf `user_missions.progress`. Architektur-Doku fuer Mission-Scoping + Progress-Track. |

---

## VERIFIED OK (Live 2026-04-14)

| Check | Beweis |
|-------|--------|
| `user_missions` UNIQUE `(user_id, mission_id, period_start)` | `user_missions_user_id_mission_id_period_start_key` (CHECK: kein Double-INSERT moeglich) |
| `claim_mission_reward` hat `auth.uid() IS DISTINCT FROM p_user_id` Guard + `FOR UPDATE` Lock | ✅ verifiziert |
| `claim_mission_reward` checkt `status='completed'` via `SELECT FOR UPDATE` | ✅ Double-Claim DB-seitig verhindert |
| `claim_mission_reward` UNIQUE-Constraint + FOR UPDATE = kein Race bei Claim | ✅ 0 duplicate claims in DB |
| `track_my_mission_progress` nutzt `auth.uid()` (nicht `p_user_id`) | ✅ Wrapper sicher |
| `update_mission_progress` REVOKED from anon+authenticated+public | ✅ korrekt (`anon_execute=false`) |
| `record_login_streak` hat `auth.uid()` Guard | ✅ `IF auth.uid() IS DISTINCT FROM p_user_id THEN RAISE EXCEPTION` |
| `record_login_streak` Idempotency bei `last_login_date = v_today` | ✅ returns mit `already_today=true`, kein Doppel-Reward fuer selben Tag |
| `user_streaks` RLS: `users_read_own_streak` SELECT | ✅ User liest nur eigenen Streak |
| `mission_definitions` RLS: 4 Policies (SELECT + admin INSERT/UPDATE/DELETE) | ✅ |
| `notifications` CHECK constraint erlaubt `reference_type='mission'` (seit 2026-04-08) | ✅ Migration 20260408170000 |
| Streak-Benefits DB-Config stimmt mit TS-Fallback ueberein | ✅ `streak_config` = 7 Tiers, matched `streakBenefits.ts` |
| Fee-Split Transparenz: `mission_reward` ist 100% User (kein Platform/PBT/Club Fee) | ✅ `business.md` Licensing Phase 1 compliant |

---

## LEARNINGS (Drafts fuer common-errors.md)

1. **Idempotency fuer Milestone-Rewards nicht optional** — `record_login_streak` credited milestone-reward BASIEREND auf `current_streak` ohne Claimed-Tracking. 2 Live-User haben doppelte 100 $SCOUT kassiert (1× Race, 1× Drop-and-Rebuild). **Regel:** Jede RPC die Milestones belohnt MUSS `INSERT ... ON CONFLICT DO NOTHING RETURNING` auf einer `*_claimed` Tabelle haben BEVOR Wallet credit. (J7B-01)

2. **SECURITY DEFINER + p_user_id UUID = Broken By Default** — Auch wenn Funktion "nur idempotent writes" macht: ohne `auth.uid() IS DISTINCT FROM p_user_id` Guard kann anon beliebige User-IDs triggern. Plus: `assign_user_missions` leaked Club-Zugehoerigkeit ueber Return-Shape. **Regel:** Jede RPC mit `p_user_id UUID` Parameter MUSS Auth-Guard haben. Alternative: Wrapper ohne Param, intern `auth.uid()`. (J7B-02)

3. **Client-State darf NIE Source-of-Truth fuer Gamification sein** — Missions-Page liest Streak aus `localStorage.getItem('bescout-login-streak')`. Home schreibt nach RPC-Call. User der /missions VOR /home oeffnet sieht `streak=0`. **Regel:** Alle Gamification-Werte (Streak, Tickets, Score) MUESSEN via React-Query aus DB kommen. localStorage darf nur OPTIMISTIC-UI-Mirror sein, nicht Fallback. (J7F-01)

4. **i18n-Inhalte in DB-Row-Values = TR-i18n defekt** — 37 `mission_definitions` haben `title`/`description` DEUTSCH in einer einzigen Spalte. Es gibt KEIN `title_tr`. TR User sieht DE. **Regel:** Schema fuer Multi-Locale Inhalte MUSS `_de`/`_tr` (oder JSONB `translations`) haben. Migration pflicht. (J7B-12)

5. **Fallback-Funktion mit hardcoded DE-Strings kaschiert i18n-Bug** — `getStreakBenefitLabels` hat optional `t`-Parameter und DE-Fallback. `/missions/page.tsx` ruft OHNE `t` → Fallback → TR User sieht DE. **Regel:** Hardcoded-Language-Fallbacks sind ein Anti-Pattern. Fallback MUSS key zurückgeben (z.B. `'streak.tickets'`), Component rendered. (J7F-05)

6. **Dynamic Import mit `.catch()` aber ohne Error-UI = Silent Failure** — `MissionBanner.tsx:54` hat `catch {}` ohne Error-Message. `claim_mission_reward` wirft → Banner bleibt schweigend. User versteht nicht warum Button nichts tut. **Regel:** `ui-components.md`: Error-State SICHTBAR, nie `.catch(() => {})` mit leerer Body. (J7F-06)

7. **`CREATE OR REPLACE FUNCTION` ohne REVOKE-Block ist Zeitbombe** — Wenn Mission-RPCs per Fix-Migration neu-deployed werden (bei jedem Behavior-Change), drohen sie anon-grants (Default). AR-44-Template aus J4 greift hier noch nicht. (J7B-03, J7B-04)

8. **Leere `userId`-Parameter in Service-Methoden = Toter Code + Smell** — `openMysteryBox` ruft `triggerMissionProgress('', [...])` mit leerem String. Funktioniert weil RPC intern `auth.uid()` nutzt, aber Signatur ist irreführend. **Regel:** Signatur-Parameter die nicht verwendet werden bereinigen ODER als Identity-Assertion `assert(userId === currentUser.id)` nutzen. (J7B-11)

9. **MissionBanner ohne Empty-State + CTA verletzt UX-Standard** — Wenn User 0 Missionen hat (neuer User VOR `assign_user_missions`-Call, oder alle expired) zeigt Banner NIX (`return null`). User versteht nicht warum Missions nicht da sind. **Regel:** `ui-components.md`: Empty mit CTA "Logge dich ein um Missionen zu erhalten" oder Auto-Trigger. (J7F-14)

---

## Recommended Healer-Strategie

**Parallel 3 Worktrees:**
- **Healer A (P0 Integrity + Claim UX):** FIX-01 (DB-Streak-Hook), FIX-03 (error-state), FIX-04 (loader in claim button), FIX-05 (invalidate tickets after claim), FIX-13 (empty-state CTA) — ~1.5h
- **Healer B (i18n + Locale):** FIX-06 (streakBenefitLabels with t), FIX-07 (StreakMilestone locale), FIX-09 (messages fill), FIX-10 (CR vs Credits), FIX-11 (hack-code refactor) — ~1.5h
- **Healer C (Backend Contract):** FIX-02 (signature cleanup), FIX-14 (mapErrorToKey), FIX-15 (raw-i18n-key-leak fix), FIX-16 (cache invalidate), FIX-17 (error handling) — ~1.5h

**CEO-Approvals (8 Items):** SOFORT **AR-50** (live-exploit Streak-Reward 2 Duplikate, skaliert mit Userzahl), **AR-51** (anon-grant auf assign_user_missions = Security-Break), dann AR-54 (TR-i18n komplett kaputt fuer Missions), dann Rest. Analog J4/J5 Schnellbahn.

**Reviewer-Pass nach Healer-Phase.**

**Scope-Vergleich:**
- J5 (Mystery Box): 35 Findings — kleines Feature, 2 AKUT
- J4 (Fantasy): 71 Findings — großes Feature, mehrere critical
- **J7 (Missions+Streak): 34 Findings — fokussiertes Feature, 2 AKUT Live-Broken, 1 Live-Exploit-Funde (duplicated $SCOUT-Minting in production).** 

Besondere Red-Flags bei J7:
- 2 User haben bereits doppelte Streak-Rewards kassiert (manifester Bug, nicht nur "Potential")
- 1 anon-Grant-Lücke (assign_user_missions) ohne auth.uid-Guard — AR-44-Muster nicht durchgesetzt
- TR-i18n fuer Mission-Titles/Descriptions IST defekt — nicht "koennte" sondern "ist"
- Source-of-Truth-Divergenz Streak localStorage vs DB manifestiert bei Deep-Link-User
