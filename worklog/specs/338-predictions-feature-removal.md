# Slice 338 — Predictions-/Tippspiel-Feature komplett entfernen

**Status:** SPEC · **Größe:** L · **Slice-Type:** Migration + Service + UI + i18n + Tool (Cross-Domain Removal) · **Scope:** CEO-approved (Anil 2026-06-18) · **Datum:** 2026-06-18

> Dead-Feature-Removal nach 4-Achsen-Methodik (`errors-frontend.md` Slice 305): Code/Service · DB-Objekte · i18n-Keys · Tooling-Allowlists. Plus 5. Achse: path-scoped Rule-Doku (`fantasy.md` §Predictions).

---

## 1. Problem Statement

Das Fantasy-Tippspiel-/Predictions-Feature (User tippt Match-/Spieler-Ausgänge, bekommt Punkte, Consensus-Anzeige, Top-Predictors-Leaderboard) soll **komplett aus der App entfernt** werden.

**Evidence:** Anil-Entscheidung 2026-06-18 (Handoff-Anker Slice 338). **Daten-Befund (live verifiziert):** `predictions`-Tabelle = **1 Zeile** (1 Testuser, 2026-05-01, seither nichts), **0 eingehende FKs** → DROP sicher, kein echter User-Content. Polls bleiben unangetastet.

**Wer ist betroffen:** Niemand produktiv — Feature wird von Usern faktisch nicht genutzt (1 Testzeile in 7 Wochen). Removal reduziert Bundle, Wartungslast und Compliance-Fläche (Tippspiel = Glücksspiel-Nähe, das wir ohnehin nicht wollen — passt zu D-Entscheidung Polls-P4-Verwurf).

## 2. Lösungs-Design (Architektur)

**Was ändert sich:** Alle dedizierten Predictions-Artefakte werden gelöscht; alle geteilten Files werden vom Predictions-Bezug **entkoppelt** (nicht gelöscht). DB-Objekte werden in einer atomaren Migration gedroppt.

**Datenfluss vorher:** Fantasy-Tab „Mitmachen"/„Spieltag" rendert `PredictionsTab` → `usePredictions`/`predictions.queries.ts` → RPC `create_prediction`/`get_prediction_consensus`. Gameweek-Sync-Cron ruft `resolve_gameweek_predictions` → schreibt `predictions.status` + Notification `prediction_resolved`. Leaderboard zeigt `get_top_predictors_leaderboard`. Profil zeigt `PredictionStatsCard`/`AnalystTab`.

**Datenfluss nachher:** Predictions-Pfade existieren nicht mehr. Fantasy-Tabs ohne Predictions-Tab/-Hint. Gameweek-Sync-Cron ohne `resolve_gameweek_predictions`-Schritt. Notification-System ohne `prediction_resolved`-Typ. Leaderboards ohne `top_predictors`-Kategorie. Profil ohne Analyst-/PredictionStats-Anzeige.

**DB-Migration (atomar, `BEGIN; … COMMIT;`):**
```sql
DROP TABLE IF EXISTS predictions;                            -- ohne CASCADE (failt bei übersehener FK = Safety)
DROP FUNCTION IF EXISTS create_prediction(...);
DROP FUNCTION IF EXISTS get_prediction_consensus(...);
DROP FUNCTION IF EXISTS resolve_gameweek_predictions(...);
DROP FUNCTION IF EXISTS get_top_predictors_leaderboard(...);
-- notifications_type_check NEU ohne 'prediction_resolved'
ALTER TABLE notifications DROP CONSTRAINT notifications_type_check;
ALTER TABLE notifications ADD CONSTRAINT notifications_type_check CHECK (type = ANY (ARRAY[...ohne prediction_resolved...]));
```

## 3. Betroffene Files

### A. DEDIZIERTE Files — LÖSCHEN (exklusiv Predictions)

| File | Aktion |
|------|--------|
| `src/components/fantasy/PredictionsTab.tsx` | DELETE |
| `src/components/fantasy/PredictionCard.tsx` | DELETE |
| `src/components/fantasy/PredictionConsensusHint.tsx` | DELETE |
| `src/components/fantasy/CreatePredictionModal.tsx` | DELETE |
| `src/components/fantasy/ergebnisse/PredictionResults.tsx` | DELETE |
| `src/components/profile/PredictionStatsCard.tsx` | DELETE |
| `src/components/profile/AnalystTab.tsx` | DELETE (prüfen: exklusiv Predictions?) |
| `src/lib/services/predictions.ts` | DELETE |
| `src/lib/queries/predictions.ts` | DELETE |
| `src/features/fantasy/services/predictions.queries.ts` | DELETE |
| `src/features/fantasy/services/predictions.mutations.ts` | DELETE |
| Test-Files: `PredictionsTab.test.tsx`, `CreatePredictionModal.test.tsx`, `predictions.test.ts` (lib + features), `AnalystTab.test.tsx` | DELETE |

### B. GETEILTE Files — ENTKOPPELN (Predictions-Bezug raus, File bleibt)

| File | Entkopplung |
|------|-------------|
| `src/lib/services/notifications.ts` | `prediction_resolved`-Typ aus Union + `TYPE_TO_CATEGORY`-Mapping |
| `src/components/layout/NotificationDropdown.tsx` | `prediction_resolved`-Rendering/Icon-Zweig |
| `src/lib/notificationDeepLink.ts` | `prediction_resolved`-Deeplink-Zweig |
| `src/types/index.ts` | Prediction-Types (`PredictionType`, `PredictionStatus`, `MatchCondition`, `PlayerCondition`, NotificationType-Member) |
| `src/lib/queries/keys.ts` | `prediction*`-Query-Keys |
| `src/lib/queries/index.ts` | Predictions-Barrel-Re-Export |
| `src/components/providers/QueryProvider.tsx` | evtl. Persist-Allowlist Prediction-Key |
| `src/lib/services/leaderboards.ts` | `top_predictors`-Kategorie + `getTopPredictorsLeaderboard` |
| `src/features/fantasy/services/scoring.admin.ts` | `resolve_gameweek_predictions`-Aufruf |
| `src/app/api/cron/gameweek-sync/route.ts` | `resolve_gameweek_predictions`-Aufruf |
| `src/components/fantasy/index.ts` | `export { PredictionsTab }` |
| `src/components/fantasy/ergebnisse/index.ts` | `export { PredictionResults }` |
| `src/components/fantasy/MitmachenTab.tsx` | PredictionsTab-Einbindung |
| `src/components/fantasy/SpieltagTab.tsx` | Prediction-Bezug |
| `src/components/fantasy/ErgebnisseTab.tsx` | PredictionResults-Einbindung |
| `src/components/fantasy/EventCommunityTab.tsx` | Prediction-Bezug |
| `src/components/fantasy/ergebnisse/PersonalResults.tsx` | Prediction-Bezug |
| `src/components/community/PostCard.tsx` | Prediction-Post-Typ-Zweig |
| `src/components/onboarding/OnboardingChecklist.tsx` | Prediction-Checklist-Item |
| `src/components/help/Glossary.tsx` | Prediction-Glossar-Eintrag |
| `src/components/profile/...` (Tab-Host) | AnalystTab/PredictionStatsCard-Einbindung |

### C. DB

| Objekt | Aktion |
|--------|--------|
| Tabelle `predictions` | DROP (1 Zeile, 0 FK) |
| RPC `create_prediction` | DROP |
| RPC `get_prediction_consensus` | DROP |
| RPC `resolve_gameweek_predictions` | DROP |
| RPC `get_top_predictors_leaderboard` | DROP |
| CHECK `notifications_type_check` | RECREATE ohne `prediction_resolved` |

### D. i18n / Tooling / Doku

| File | Aktion |
|------|--------|
| `messages/de.json` (~50 Keys) | Predictions-exklusive Keys löschen (pro Key grep-verifiziert) |
| `messages/tr.json` (~16 Keys) | dito |
| `scripts/boundary-check.ts` | Prediction-Allowlist-Eintrag |
| `scripts/add-i18n-keys-batch9.js` | nur prüfen (Einmal-Script, evtl. ignorierbar) |
| `scripts/orphan-component-detector.ts` / `wiring-check.ts` | KNOWN_ORPHANS/Allowlist Prediction-Einträge |
| `.claude/rules/fantasy.md` | §Predictions-Block löschen (5. Achse) |
| `src/lib/__tests__/db-invariants.test.ts` | Prediction-Invariante prüfen/anpassen |
| `src/lib/services/__tests__/leaderboards.test.ts`, `scoring-v2.test.ts`, `SpieltagTab.test.tsx`, `MitmachenTab.test.tsx`, `PostCard.test.tsx` | Prediction-Asserts entkoppeln |

**Pflicht-Grep vor Slice-Ende:** `grep -rniE "[Pp]rediction|vorhersage|tipp" src/ messages/ scripts/ .claude/rules/` → nur noch erlaubte Residuen (z.B. `tipp` in „Tipps/Hinweise" — pro Treffer prüfen).

## 4. Code-Reading-Liste (Pflicht VOR Implementation)

| # | File | Zweck | Zu prüfen |
|---|------|-------|-----------|
| 1 | LIVE `pg_get_functiondef` der 4 RPCs | DB-Wahrheit | Signaturen (Argument-Typen) für exaktes DROP |
| 2 | LIVE `notifications_type_check`-Def (erhoben) | CHECK-Recreate | Vollständige Typliste ohne `prediction_resolved` |
| 3 | `src/lib/services/notifications.ts` | NotificationType-Union + TYPE_TO_CATEGORY | Wo `prediction_resolved` referenziert? Andere Konsumenten? |
| 4 | `src/types/index.ts` | Prediction-Types + NotificationType | Welche Types exklusiv? Wird `MatchCondition` o.ä. woanders genutzt? |
| 5 | `src/lib/services/leaderboards.ts` | `top_predictors`-Kategorie | Ist Kategorie ein Enum-Wert? Wo wird sie iteriert/gerendert? |
| 6 | `src/app/api/cron/gameweek-sync/route.ts` | Cron-Step-Reihenfolge | Ist `resolve_gameweek_predictions` ein eigener Step? Fehlerbehandlung? |
| 7 | `src/features/fantasy/services/scoring.admin.ts` | Admin-Scoring-Flow | Wird resolve im SpieltagTab-Flow aufgerufen? |
| 8 | `src/components/fantasy/MitmachenTab.tsx` + `index.ts` | Tab-Host | Wie ist PredictionsTab eingehängt (Tab-Array, Lazy-Import)? |
| 9 | `src/components/profile/AnalystTab.tsx` | Exklusivitäts-Check | Ist der ganze Tab Predictions oder zeigt er auch anderes (Scout-Scores)? |
| 10 | `src/components/community/PostCard.tsx` | Post-Typ-Zweig | Gibt es einen `prediction`-Post-Typ in der DB/Community? |
| 11 | `src/lib/notificationDeepLink.ts` | Deeplink-Map | `prediction_resolved`-Zielroute — entfällt sauber? |
| 12 | `.claude/rules/fantasy.md` §Predictions | Doku-Drift | Block-Grenzen für sauberes Löschen |

## 5. Pattern-References

- `errors-frontend.md` **„Dead-Feature-Removal — 4 Residuen-Achsen" (Slice 305)** — die zentrale Methodik: Code+DB+i18n+Tooling, plus DROP-TABLE-Diligence + `DROP … IF EXISTS` ohne CASCADE.
- `errors-frontend.md` **„Service-Duplicate bei parallelem BE+FE-Dispatch" (Slice 199, D46)** — `getTopPredictorsLeaderboard` existiert dupliziert in `leaderboards.ts` UND `predictions.queries.ts`; beim Entkoppeln beide Pfade fassen.
- `errors-frontend.md` **„i18n shared vs. exklusiv" (Slice 305 Achse 3)** — pro Key grep, shared Keys (z.B. `confidence`, `correct`) behalten.
- `errors-frontend.md` **„Barrel-Exports bereinigen wenn Files gelöscht werden"** — `fantasy/index.ts` + `ergebnisse/index.ts`.
- `workflow.md` **D81 L-Slice-mit-DROP-Preflight** — Pre-Drop-Grep deckt src/+scripts/+messages/+.claude/+worklog/ ab; erst DROP wenn alle Reader/Writer umgestellt.
- `errors-db.md`/`fantasy.md` **Spieltag-Lifecycle** — Cron-Step-Entkopplung darf `close→simulate→score→clone→advance` nicht brechen.

## 6. Acceptance Criteria (Executable)

```
AC-01: [HAPPY] Fantasy-Bereich rendert ohne Predictions-Tab/-Hint
  VERIFY: Playwright bescout.net /fantasy → Tabs auflisten
  EXPECTED: Kein "Mitmachen→Tippspiel"/"Vorhersage"-Tab; restliche Tabs funktionieren
  FAIL IF: Raw-i18n-Key, fehlender Tab-Crash, leerer Bereich

AC-02: [HAPPY] Gameweek-Sync-Cron läuft ohne resolve_gameweek_predictions
  VERIFY: grep -n "resolve_gameweek_predictions" src/app/api/cron/gameweek-sync/route.ts src/features/fantasy/services/scoring.admin.ts
  EXPECTED: 0 Treffer
  FAIL IF: Treffer (Cron würde 42883 undefined function werfen)

AC-03: [DB] predictions-Tabelle + 4 RPCs existieren nicht mehr
  VERIFY: SELECT to_regclass('public.predictions'); + pg_proc-Query auf die 4 Namen
  EXPECTED: NULL + 0 rows
  FAIL IF: Tabelle/RPC noch da

AC-04: [DB] notifications_type_check ohne prediction_resolved, mit allen anderen
  VERIFY: pg_get_constraintdef(notifications_type_check)
  EXPECTED: prediction_resolved fehlt; poll_new/poll_vote/event_* etc. weiter vorhanden
  FAIL IF: prediction_resolved noch drin ODER anderer Typ verloren

AC-05: [REGRESSION] Notification mit anderem Typ insertbar
  VERIFY: Test-Insert notifications type='poll_new' (rollback)
  EXPECTED: Erfolg
  FAIL IF: CHECK-Violation (Recreate hat Typ verloren)

AC-06: [EMPTY] grep-Sweep nach Removal sauber
  VERIFY: grep -rniE "[Pp]rediction|vorhersage" src/ messages/ scripts/ .claude/rules/
  EXPECTED: 0 (oder nur dokumentierte erlaubte Residuen)
  FAIL IF: vergessener Import/Key/Ref

AC-07: [REGRESSION] tsc + vitest grün
  VERIFY: npx tsc --noEmit && CI=true pnpm exec vitest run
  EXPECTED: 0 Errors, alle Tests grün
  FAIL IF: Type-Error durch entfernten Type/Import, roter Test

AC-08: [I18N-DE/TR] Keine MISSING_MESSAGE / Orphan-Keys
  VERIFY: node-Check + Live-Console-Scan auf /fantasy /profile
  EXPECTED: keine MISSING_MESSAGE, keine raw keys
  FAIL IF: TR/DE zeigt rohen Key

AC-09: [MOBILE] Fantasy + Profile 393px ohne Layout-Break nach Tab-Removal
  VERIFY: Playwright iPhone-16-Viewport
  EXPECTED: saubere Tab-Leiste, kein Overflow
  FAIL IF: leerer Slot, abgeschnittene Leiste

AC-10: [REGRESSION] Leaderboard rendert ohne top_predictors-Kategorie
  VERIFY: /profile o.ä. Leaderboard-Ansicht
  EXPECTED: restliche Kategorien funktionieren
  FAIL IF: leere Kategorie-Pille, Crash

AC-11: [TOOLING] orphan/wiring/boundary-check grün ohne Prediction-Allowlist-Leichen
  VERIFY: pnpm audit:wiring:check (+ orphan-detector)
  EXPECTED: grün, keine excused-Einträge auf gelöschte Files
  FAIL IF: Allowlist zeigt auf nicht-existente Datei
```

## 7. Edge Cases Table

| # | Flow | Case | Expected | Mitigation |
|---|------|------|----------|------------|
| 1 | DB-DROP | Übersehene eingehende FK | DROP failt (ohne CASCADE) | Pre-Check 0 FK erhoben; IF EXISTS ohne CASCADE |
| 2 | NotificationType | Bestehende Zeile mit type='prediction_resolved' in notifications | CHECK-Recreate failt wenn alte Zeilen existieren | Pre-Migration: `SELECT count(*) FROM notifications WHERE type='prediction_resolved'` → falls >0 erst löschen/migrieren |
| 3 | Cron | gameweek-sync mid-flight während Deploy | resolve-Step entfällt, Rest läuft | Step sauber entfernen, nicht no-op-stub lassen |
| 4 | AnalystTab | Tab zeigt auch nicht-Prediction-Inhalt | Nicht löschen, nur Prediction-Teil entkoppeln | Code-Reading #9 entscheidet DELETE vs. ENTKOPPELN |
| 5 | i18n | Key shared (z.B. `confidence`, `correct`, `points`) | Behalten | Pro Key `grep -rn "key" src/` → nur löschen wenn 0 verbleibend |
| 6 | Type | `MatchCondition`/`PlayerCondition` woanders importiert | Nur löschen wenn exklusiv | grep vor Delete |
| 7 | PostCard | Community-Post-Typ `prediction` in DB-Daten vorhanden | Graceful: unbekannter Typ → Default-Render statt Crash | Default-Branch behalten |
| 8 | Leaderboard | Persistierter Cache mit top_predictors-Key | Stale-Key ignoriert, kein Crash | Buster-Bump falls Key persistiert |
| 9 | Barrel | Vergessener Re-Export → Build-Break | tsc fängt es | Beide index.ts sofort mit-editieren |
| 10 | Deeplink | Alte Notification verlinkt prediction_resolved | Deeplink-Default (kein Crash) | notificationDeepLink Default-Fallback |

## 8. Self-Verification Commands

```bash
# DB
SELECT to_regclass('public.predictions');                                     -- NULL erwartet
SELECT proname FROM pg_proc WHERE proname ILIKE '%prediction%' OR proname ILIKE '%predictor%';  -- 0 rows
SELECT pg_get_constraintdef(oid) FROM pg_constraint WHERE conname='notifications_type_check';
SELECT count(*) FROM notifications WHERE type='prediction_resolved';           -- VOR Migration: muss 0 sein
# Code
npx tsc --noEmit
CI=true pnpm exec vitest run
grep -rniE "[Pp]rediction|vorhersage" src/ messages/ scripts/ .claude/rules/   -- 0 / dokumentierte Residuen
# i18n namespace-aware
node -e "const m=require('./messages/de.json'); /* prüfe gelöschte keys weg + shared da */"
# Tooling
pnpm audit:wiring:check
```

## 9. Open-Questions

**Pflicht-Klärung (Anil):**
1. `AnalystTab` — falls er **auch** Scout-Score/Analyse zeigt (nicht nur Predictions): nur Prediction-Teil raus oder ganzer Tab? → Code-Reading #9 klärt; bei Mehrdeutigkeit Anil fragen.
2. Top-Predictors-Leaderboard war eine sichtbare Kategorie — ersatzlos streichen ist OK (keine Migration nötig)? → Default: ja, ersatzlos (Anil-Removal-Intent).

**Autonom-Zone (CTO):**
- Reihenfolge der Code-Entkopplung, Test-Anpassungen, Barrel-Cleanup.
- Welche i18n-Keys exklusiv (grep-entschieden).
- Migration-Datei-Naming + atomare Struktur.

**Nicht-Autonom (CEO):** DROP selbst ist bereits Anil-approved. Keine Wording-Änderung (nur Entfernung).

## 10. Proof-Plan

| Artefakt | Inhalt |
|----------|--------|
| `worklog/proofs/338-db-drop.txt` | Vorher/Nachher: predictions/RPCs/CHECK-Query (DROP-Diligence + Post-DROP NULL) |
| `worklog/proofs/338-grep-sweep.txt` | `grep -rniE "[Pp]rediction…"` = 0/Residuen-Doku |
| `worklog/proofs/338-tsc-vitest.txt` | tsc clean + vitest grün |
| `worklog/proofs/338-fantasy-screenshot.png` | Playwright bescout.net /fantasy ohne Predictions-Tab (nach Deploy) |
| `git diff --stat` | Datei-Lösch-/Edit-Summe |

## 10a. Scope-Erweiterung (Anil 2026-06-18) + DB-Diligence-Ergänzung

**Community-Research-Kategorie „Prediction" auch raus** (Anil-Entscheidung): `PostCategory 'Prediction'`, Label `cat_prediction`/`catPrediction`, CATEGORIES-Einträge in `PostCard`/`EventCommunityTab`/player-`CommunityTab`, CHECK `chk_posts_category`. Verifiziert: **0 Posts mit category='Prediction'** → Recreate sicher. Vollständige Stellen-Karte: `worklog/impact/338-*.md` Sektion B.

**Zusätzliche DB-CHECKs (alle Pre-Count = 0, Recreate sicher):** `notifications_reference_type_check` (-`'prediction'`), `chk_posts_category` (-`'Prediction'`) — zusätzlich zum bekannten `notifications_type_check` (-`'prediction_resolved'`). **Bewusst NICHT angefasst (chirurgisch, anderes Feature / dormant):** `score_events_event_type_check` (`prediction_correct/wrong` → dormant nach RPC-Drop, kein Writer mehr), `ticket_transactions_source_check` (`live_prediction`), `daily_challenges_question_type_check` + `ChallengeType 'prediction'`.

## 11. Scope-Out

- **Polls** — bleiben komplett unangetastet (REIN-Geldmaschine).
- **Challenge-Quiz `ChallengeType 'prediction'`** — eigenes Feature, bleibt.
- **`score_events`/`ticket_transactions`-CHECK-Werte** — dormant belassen (nicht-anfassen = chirurgisch).
- **Fantasy-Events/Lineups/Scoring (non-Prediction)** — bleiben; nur die Prediction-Verzahnung raus.
- **`getPlayerNames`/Follower-Notify `.limit()`-Härtung** (334/336-NIT) → eigener Mini-Slice (Scope-Out).
- **Historie-Rewrite (E0 W4)** → separat.

## 12. Stage-Chain (geplant)

```
SPEC → IMPACT (file: 338) → BUILD (Code-Entkopplung zuerst, dann Migration zuletzt) → REVIEW (reviewer-Agent PFLICHT — Cross-Domain+DROP) → PROVE (DB-Query + grep + tsc/vitest + Playwright) → LOG (+ Knowledge-Flywheel falls neue Falle)
```
Kein Skip. IMPACT = eigenes File (Cross-Domain Pflicht). Reviewer Pflicht (L + DROP).

## 13. Pre-Mortem (≥5)

| # | Failure | Prob | Impact | Mitigation | Detection |
|---|---------|------|--------|------------|-----------|
| 1 | CHECK-Recreate verliert einen Notification-Typ → alle Notifications mit dem Typ failen beim Insert | MED | hoch (Notifications app-weit) | Vollständige Typliste aus Live-Def kopieren, nur `prediction_resolved` entfernen; AC-05 Test-Insert | Live: neue Notification eines anderen Typs failt → Sentry |
| 2 | Bestehende `notifications`-Zeilen mit type='prediction_resolved' → ALTER ADD CONSTRAINT failt (NOT VALID nötig) | MED | mittel (Migration bricht) | Edge #2: pre-count; falls >0 alte Zeilen DELETE in selber TX | Migration-Fehler 23514 |
| 3 | resolve_gameweek_predictions-DROP, aber Cron ruft RPC noch → 42883 undefined function bei nächstem GW-Sync | MED | hoch (Gameweek-Scoring bricht) | Code-Entkopplung VOR DB-DROP deployen; AC-02 grep=0 | Cron-Log Fehler, Sentry |
| 4 | Geteilten Type (`MatchCondition`/NotificationType) gelöscht, aber noch importiert → tsc-Break / Runtime | MED | mittel | grep vor Delete; tsc-Gate; AC-07 | tsc rot |
| 5 | i18n shared-Key (`confidence`/`correct`/`points`) versehentlich gelöscht → MISSING_MESSAGE in anderem Feature | MED | mittel | Pro Key grep, nur exklusive löschen; AC-08 Live-Scan | Live-Console MISSING_MESSAGE |
| 6 | AnalystTab war nicht exklusiv → ganzer Profil-Tab weg, der auch Anderes zeigte | LOW | mittel | Code-Reading #9 vor Delete; Open-Question #1 | Profil-Tab fehlt sichtbar |
| 7 | Tooling-Allowlist zeigt auf gelöschte Datei → audit:wiring rot in CI | LOW | niedrig | Achse 4: Allowlists mit-bereinigen; AC-11 | CI lint-job rot |
| 8 | Persistierter React-Query-Cache mit prediction-Key → Rehydrate-Smell | LOW | niedrig | Key-Removal + ggf. Buster-Bump | Console-Warning |

---

## Compliance-Check

Reine **Entfernung**, kein neues user-facing Wording. Entfernt sogar Glücksspiel-nahe Tippspiel-Mechanik (positiv für SPK/MASAK-Fläche). Kein $SCOUT/IPO/Asset-Wording berührt. **TR:** nur Key-Löschung, keine neuen Strings.

## Open Risiko

Gefährlichster Punkt: die `notifications_type_check`-Recreate (Pre-Mortem #1/#2) und die Cron-Entkopplung-vor-DROP-Reihenfolge (#3). Mitigation: Code-Deploy vor DB-DROP, vollständige Typliste, atomare Migration mit Pre-Count-Guard, Reviewer-Pflicht.
