# Slice 458 — Dead-Feature-GC-Batch: D-13 (season_reset_scores) + D-10 (2. Mission-System)

**Slice-Type:** Migration (+ Frontend-Cleanup) · **Größe:** S · **Scope:** Dead-Feature-GC, tote Objekte (0 Caller/0 Consumer live-verifiziert). DROP irreversibel + Sec/CEO (season_reset_scores mutiert scout_scores = Money-Anker, aber unaufrufbar). Selbst, Reviewer-Pflicht, CEO-Apply (Anil: Dead-GC-Batch-Wahl 2026-06-29). **Batch → EINE gebündelte Verifikation** (Anil-Wunsch).

## 1. Problem (Evidence: Live-DB skzjfhvgccaeplydsunz, D87)
Zwei Dead-Feature-Befunde aus dem disease-register, beide reine Akkretion (R5 Bauen-auf-Vorrat ohne GC):
- **D-13 `season_reset_scores()`** — verwaiste Season-Reset-RPC. Body resettet `scout_scores` (trader soft, manager→500, analyst kein), aber: **0 statische Caller** (callers_in_other_fns=0, caller_fn-Query leer), **0 src/-Caller** (nur worklog/audits-Reports), **0 pg_cron**, ACL `{postgres,service_role}` (kein Client/anon). Lebender Zwilling = `soft_reset_season(text,date,date)` (verkabelt AdminLigaTab). Keine Trigger/Views.
- **D-10 komplettes 2. Mission-System (Scout Missions)** — `scoutMissions.ts` (Service, 4 Fns) + `useScoutMissions`/`useMissionProgress` (Hooks misc.ts) + Re-Export (index.ts) + 2 RPCs (`claim_scout_mission_reward`/`submit_scout_mission`, an `authenticated` granted, 0 Caller/Trigger/View) + 2 Tabellen (`scout_mission_definitions` 5 Rows, `user_scout_missions` 0 Rows). **0 Render** (grep über src/components/app/features = keine Component nutzt die Hooks/Service). „Unbewusste Zwei" neben lebendem `missions.ts` (4372 Rows, `useMissionHints`/`getUserMissions`).

## 2. Lösung (reine Subtraktion §0, gebündelt)
1 Migration (5 DROPs) + D-10-Frontend-Cleanup. Keine CASCADE (keine inbound FK/Trigger/View). `qk.missions.scout` BLEIBT (geteilt mit lebendem `useMissionHints` missions.ts:56); nur `qk.missions.progress` (exklusiv zu `useMissionProgress`) raus.

## 3. Betroffene Files
- `supabase/migrations/<ts>_slice_458_dead_feature_gc.sql` — DROP season_reset_scores() + claim_scout_mission_reward(uuid,uuid,integer) + submit_scout_mission(uuid,uuid,uuid,integer) + user_scout_missions + scout_mission_definitions.
- `src/lib/services/scoutMissions.ts` — **ganzes File löschen** (Types ScoutMission/UserScoutMission/Criteria/DIFFICULTY_STYLES leben nur hier, alle tot).
- `src/lib/queries/misc.ts` — Import-Zeile (getScoutMissions, getUserMissionProgress) + `useScoutMissions` + `useMissionProgress` raus.
- `src/lib/queries/index.ts` — `useScoutMissions, useMissionProgress` aus Re-Export-Zeile raus.
- `src/lib/queries/keys.ts` — `qk.missions.progress` raus (`scout` BLEIBT).
- `src/lib/__tests__/db-invariants.test.ts` — `user_scout_missions` + `scout_mission_definitions` aus EXPECTED_SENSITIVE.

## 4. Code-Reading (D87 erledigt)
1. ✅ season_reset_scores Body gezogen (mutiert scout_scores) + 0 Caller (statisch+pg_cron) + ACL service_role-only.
2. ✅ soft_reset_season = lebender Zwilling (3 args).
3. ✅ scoutMissions.ts gelesen (4 Fns) + Hooks misc.ts + Re-Export index.ts; grep src/ → 0 Component-Consumer.
4. ✅ qk.missions: scout geteilt (useMissionHints), progress exklusiv.
5. ✅ 2 scout-mission-RPCs: 0 Caller/Trigger/View, an authenticated granted (latentes A-02, GC schließt es).
6. ✅ FK/Trigger/View auf scout-mission-Tabellen = keine.

## 5. Pattern-References
- §0 Subtraktion + Schnitt-Regel · R5 (Bauen-auf-Vorrat ohne GC) · S453 Writer/Caller-Enum (pg_proc + pg_cron, nicht File-Grep) · S457 (Dead-GC-Methodik: force-rollback-Smoke + Survivor-Gegenprobe) · geteilter Query-Key bleibt (nicht blind mitlöschen).

## 6. Acceptance Criteria
- AC1: nach Apply alle 5 Objekte weg (`to_regclass` NULL für 2 Tabellen, `pg_proc` count 0 für 3 Fns).
- AC2: lebende Gegenproben da: `soft_reset_season`, `get_user_missions`/`missions`-Tabelle, `scout_scores`, `qk.missions.scout`-Nutzer `useMissionHints` (missions.ts) unverändert.
- AC3: `scoutMissions.ts` existiert nicht mehr; kein Import davon irgendwo (grep 0).
- AC4: `qk.missions.progress` entfernt, `qk.missions.scout` bleibt; `npx tsc --noEmit` grün.
- AC5: `db-invariants.test.ts` enthält keine scout_mission-Tabellen mehr.
- AC6: force-rollback-Smoke: alle 5 DROPs fehlerfrei (keine Dependency), Survivor-Gegenprobe.

## 7. Edge Cases
| Fall | Verhalten |
|------|-----------|
| season_reset_scores doch von Cron gerufen | pg_cron-Query = leer → verifiziert nein |
| qk.missions.scout blind mitgelöscht | useMissionHints (missions.ts:56) bräche → bewusst BEHALTEN |
| versteckte inbound FK auf scout-mission-Tabellen | force-rollback-Smoke errort → fängt es VOR Apply |
| scout_mission_definitions 5 Rows = „benutzt"? | Definitionen ohne user-progress (user_scout_missions=0) + 0 Render = Seed ohne Konsument |
| RPC-Overload | identity_args exakt geholt → exakter DROP |
| tsc bricht durch entfernten Hook | kein Consumer (grep 0) → safe; tsc-Gate beweist |

## 8. Self-Verification
- Pre: `BEGIN; DROP (5×); SELECT Existenz + Survivor; ROLLBACK;` (RAISE-Report).
- Post-Apply: Existenz-Query (5 weg, Survivor da) + `npx tsc --noEmit` + `npx vitest run` (Regression).
- Render-Beweis: `grep -rn "scoutMission\|useScoutMissions\|useMissionProgress\|scout_mission" src/` → nach Cleanup nur noch Migration/Worklog.

## 9. Open-Questions
- Keine. CEO-Scope (Dead-GC-Batch-Wahl). season_reset_scores scout_scores-mutierend ABER unaufrufbar (0 Caller/cron/Client) → sicher. DROP = ich apply selbst nach Smoke + Reviewer.

## 10. Proof-Plan
`458-dead-feature-gc.txt`: force-rollback-Smoke (5 Objekte im Tx weg, Survivor da) + post-apply Existenz + grep-Render-Beweis + tsc/vitest.

## 11. Scope-Out
- `qk.missions.scout` + `useMissionHints` + lebendes `missions.ts`-System = NICHT anfassen.
- Andere Dead-Feature-GC (D-14/15/16 Ad-Revenue/Creator-Fund) = eigene Slices (Money/CEO).
- D-13/D-10 sind die letzten reinen Sec/CEO-DROP-GCs; D-14+ brauchen Money-Pfad-Analyse.

## 12. Stage-Chain
SPEC → IMPACT (skipped: 0 lebende Consumer beider Features, grep+DB-verifiziert) → BUILD (Migration + FE-Cleanup) → PROVE (force-rollback + post-apply + grep) → REVIEW (Reviewer: wirklich tot? geteilter qk korrekt erhalten?) → CEO-Apply → LOG.

## 13. Pre-Mortem
- „season_reset_scores wird doch gerufen" → 4-Wege-Caller-Check (pg_proc + pg_cron + src-grep + ACL kein-Client) alle negativ.
- „qk.missions.scout mitgelöscht bricht useMissionHints" → bewusst BEHALTEN, nur progress raus; tsc-Gate fängt.
- „Hook-Entfernung bricht tsc (versteckter Consumer)" → grep 0 Consumer; tsc-Gate beweist.
- „Über-DROP einer lebenden Tabelle/Fn" → exakte Namen/Signaturen + AC2-Survivor-Gegenprobe (soft_reset_season/scout_scores/missions).
- „scout_mission_definitions 5 Rows = Daten-Verlust" → Definitionen ohne Konsument (0 Render, user_scout_missions=0), git=Schema-Archiv.
