# Slice 458 Review — Dead-Feature-GC-Batch (D-13 + D-10)

**Reviewer:** Cold-Context reviewer-Agent (READ-ONLY) · **time-spent:** 14 min

## Verdict: CONCERNS → behoben
Core DROP + Frontend-Cleanup + Shared-Key-Preservation alle korrekt + live-verifiziert. Einziges echtes Finding = tote i18n-Keys (LOW) — **im Slice nachgezogen** (s.u.).

## Findings
| # | Severity | Location | Issue | Status |
|---|----------|----------|-------|--------|
| 1 | LOW (CONCERNS) | `messages/{de,tr}.json:350,5106-5107` | Tote i18n-Keys des gedroppten Features: `scoutMissions` (Label) + `scoutMissionReward`/`scoutMissionRewardBody` (Notification des toten RPC). 0 src/-Consumer, aber gegen GC-Geist (Schnitt-Regel). | ✅ behoben: 6 Keys (3×DE+3×TR) entfernt. **Vorher DB-Check:** 0 Live-Notifications mit diesen i18n_key/type (toter RPC emittierte nie, user_scout_missions=0) → dynamische Auflösung ausgeschlossen. JSON valide, DE/TR-Parität 63/63. |
| 2 | INFO (LOG) | `disease-register.md:26,103,106` | D-13/D-10 noch „offen" + dup-registry Z.26 listet D-10 „ungetrackt". | ✅ wird im LOG geflippt + Z.26 entfernt. |

## Caller/Consumer-Completeness (repo-weit, alle 5 Objekte)
**0 echte lebende Consumer übersehen.** `scoutMissions.ts` gelöscht (Glob not found), misc.ts/index.ts 0 Referenz. Einzige Treffer: Migrations-Historie (FP, greenfield-Order korrekt: DROP 200000 > CREATE), Proofs/Audits/Tracker (FP), `missions.ts:56` `qk.missions.scout` (lebend, korrekt erhalten), i18n-Leftover (Finding #1).

## Weitere Prüf-Achsen (alle ✅)
- **Geteilter Query-Key:** `qk.missions.scout` (keys.ts:204) bleibt, genutzt von `useMissionHints` (missions.ts:56); nur `qk.missions.progress` entfernt, 0 progress-Consumer im Repo. `qk.economy.missions` (separater Key) unangetastet.
- **Über-DROP:** sauber distinkt — `season_reset_scores()` (0 args) vs lebender `soft_reset_season(text,date,date)`; gedroppte `scout_mission_definitions`/`user_scout_missions` (scout_-Präfix) vs lebende `mission_definitions`(30)/`user_missions`(4397). Exakte RPC-Signaturen, kein Overload-Risiko. scout_scores-Tabelle NICHT gedroppt (nur die Fn).
- **tsc:** Exit 0, kein Barrel zeigt mehr auf entfernte Hooks.
- **db-invariants-Edit:** chirurgisch — genau die toten Einträge raus (EXPECTED_SENSITIVE + RPC-Shape-Map), ALLE lebenden Geschwister (`user_missions`, `mission_definitions`, `claim_mission_reward`, `mission_reward` tx-type) erhalten. Identische Failure-Menge vor/nach (6 INV, pre-existing).

## Positive
- Reine vollständige DROP-SQL (5 Statements, IF EXISTS), kein Stub (AR-43), kein REVOKE/GRANT nötig (DROP). Filename-Order korrekt.
- Vorbildlicher S453-Beweis-Standard: Caller-Enum per pg_proc + pg_cron (nicht naiver File-Grep). force-rollback-Smoke + Survivor-Gegenprobe.
- Bewusste Beibehaltung des geteilten `qk.missions.scout` dokumentiert + verifiziert korrekt.

## Knowledge-Capture (Reviewer-Lehre, übernommen)
**Dead-Feature-GC mit UI-Vergangenheit → i18n-Keys sind eine eigene Streich-Achse.** i18n-Keys tauchen in keinem tsc/src-grep auf → bei Feature-GC (nicht reine RPC) `grep <feature-camelCase> messages/*.json` als Pflicht-Schritt + DB-Check (notifications.i18n_key) vor Entfernen von Notification-Keys. → common-errors.md aufgenommen (S458).

## Summary
Chirurgischer Dead-Feature-GC: alle 5 Objekte korrekt gedroppt, geteilter Key bewusst erhalten, db-invariants präzise, 0 Consumer übersehen. CONCERNS (tote i18n-Keys) im Slice behoben. **Ein Senior merged das.**
