# Slice 457 Review — D-11 Dead-Scoring-Modell GC

**Reviewer:** Cold-Context reviewer-Agent (READ-ONLY) · **time-spent:** 14 min

## Verdict: CONCERNS
Die gefährliche Achse (Caller-Completeness + Over-DROP) ist **vollständig sauber** — kein lebender Reader/Writer übersehen, kein versehentlicher Über-DROP. Die Migration selbst ist merge-/shippreif. Die einzigen offenen Punkte waren **Tracking/Bookkeeping** (disease-register D-11 noch nicht als geheilt markiert) — vor Commit-Close behoben (s. unten).

## Findings
| # | Severity | Location | Issue | Status |
|---|----------|----------|-------|--------|
| 1 | CONCERNS | `disease-register.md:104` + `:145` | D-11 stand noch auf `🟠 offen`, fehlte in „Geheilt"-Liste. §0-Universal-DoD (Schnitt-Regel) = Konsolidierung muss als geheilt getrackt sein, sonst Slice unfertig. | ✅ behoben: D-11 → `✅ geheilt S457` + Geheilt-Liste-Eintrag. |
| 2 | NIT | `disease-register.md:151` | „Migration-vs-Live-DB-Reconciliation"-Linse nannte `award_score_points` als Orphan-Beispiel — jetzt gedroppt, stale. | ✅ behoben: auf `(D-07, D-12)` gekürzt + „gelöst S457". |
| 3 | NIT | `session-handoff.md` + `454-*` | Listen D-11 als Residual „später" — Tracker-Reconcile im LOG. | ✅ wird im LOG abgeräumt (handoff = Stand-SSOT). |

## Caller-Completeness (repo-weit, alle 3 Objekte + camelCase + scripts/e2e/messages)
**0 echte Reader/Writer übersehen.** Einzige src/-Hits = Cron-Step-Label-Strings (`runStep('score_events', …)`/`logStep`) + 1 Test-Kommentar — alle referenzieren den Cron-STEP, nicht die Tabelle. `award_score_points`-Grep liefert **keinen einzigen src/-Treffer** (auch kein `.rpc('award_score_points')`). `scripts/`/`e2e/`/`messages/`/`src/types/` = 0 Treffer. camelCase-Varianten = 1 Hit in `memory/_archive/` (archivierte Doku, kein Code). gamification.md-Scrub bestätigt. Historische Migrationen (baseline_gamification CREATE + slice_338-Kommentar) = git-Archiv, bleiben absichtlich.

## Weitere Prüf-Achsen
- **Über-DROP:** Sicher. Exakte 6-arg-Signatur `(uuid,text,integer,text,uuid,text)` → nur dieser Overload. `bescout_scores`/`score_events` distinkt von lebenden `scout_scores`/`score_history`/`score_road_claims`/`user_stats`. Kein Wildcard/CASCADE → inbound-FK hätte hart geerrort (force-rollback bewies: kein Dependency-Error). Reihenfolge Fn→score_events→bescout_scores korrekt.
- **db-invariants.test.ts:** Korrekt editiert. `bescout_scores` raus aus EXPECTED_PUBLIC (lebendes `scout_scores` bleibt); `score_events` raus aus EXPECTED_SENSITIVE (lebende `score_history`+`score_road_claims` bleiben). Case C toleriert verwaiste Einträge ohnehin silent → Scrub = Hygiene wie vom Code-Kommentar verlangt.
- **greenfield/db-reset:** Unkritisch. Baseline-CREATE läuft vor 29.06-DROP; `DROP IF EXISTS` idempotent; keine spätere Migration re-created/referenziert die Objekte.

## Positive
- Lehrbuch-saubere Subtraktion (§0): 3 Objekte raus + alle 3 Doc/Test-Scrub-Achsen mitgenommen, Money-Anker unberührt.
- Force-rollback-Smoke VOR Apply (Dependency-Probe + Survivor-Gegenprobe) = genau der Proof-Standard der Schnitt-Regel.
- Migration-Header dokumentiert Live-D87-Recon inline.

## Prozess-Mini-Lehre (Draft-würdig)
Bei Dead-Object-GC ist die disease-register-Heilmarkierung **Teil der DoD, nicht des LOG** — sonst trifft der Reviewer am REVIEW-Gate ein Register, das dem Code widerspricht. Empfehlung: Register-Update VOR Reviewer-Dispatch.

## Summary
Migration technisch wasserdicht: Caller-Completeness sauber, kein Über-DROP, Scrubs korrekt, greenfield-sicher. CONCERNS nur wegen Tracking-Schuld → vor Commit-Close behoben. **Ein Senior merged die Migration so.**
