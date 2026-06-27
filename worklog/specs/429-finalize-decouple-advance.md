# Slice 429 — finalizeGameweek entkoppeln: Score ≠ Advance (GW-Fork 3/3, B)

**Status:** SPEC · **Größe:** M · **Slice-Type:** Service · **Scope:** CEO-approved (Anil 2026-06-28, „Entkoppeln Score≠Advance") · **Datum:** 2026-06-28

> Teil 3/3 GW-Lifecycle-Per-Liga-Fork. Riss 2 (finalize club-scoped, advance league-wide). Recon `worklog/notes/gameweek-engine-recon.md`. Money-NEUTRAL: entfernt einen Advance-Write, `score_event`-Minting unberührt.

---

## 1. Problem Statement

`finalizeGameweek(clubId, gw)` (manueller Admin-Pfad: SpieltagTab + via `simulateGameweekFlow` AdminGameweeksTab) scored die Events **eines** Clubs und ruft dann `setActiveGameweek` → das seit Slice 428 die **ganze Liga** vorrückt. **Bug (money-relevant):** Ein Bundesliga-Club-Admin (2 Clubs mit Events, Live) finalisiert seinen Club → Liga-GW springt → die un-gescorten Events des **anderen** Clubs für diesen GW werden vom GW-Marker übersprungen = **verwaiste, un-gemintete Rewards**.

**Kontext (verifiziert):** Der Cron `gameweek-sync` ist die echte automatisierte Scoring+Advance-Engine (`score_event` Z.1559, seit 428 liga-kohärent). Der manuelle `finalizeGameweek` dupliziert ihn als Override/Test-Tool. **CEO-Entscheid Anil: Entkoppeln** — manueller Finalize = nur scoren; Liga-Advance bleibt bei Cron (automatisch) + expliziter `setActiveGameweek`-Admin-Aktion (AdminSettings, seit 428 liga-weit).

## 2. Lösungs-Design

`finalizeGameweek` verliert Schritt 5 (Advance). Bleibt: Events laden → scoren (empty→close, sonst `scoreEvent`) → `createNextGameweekEvents` (Klon prepare-ahead, harmlos) → Cache-Bust. **`setActiveGameweek`-Aufruf raus.** `score_event` (Minting) komplett unberührt → money-neutral.

`GameweekFlowResult.nextGameweek` bleibt `gameweek + 1` (= GW, zu dem Events geklont wurden) — Type unverändert. Consumer dürfen es NICHT mehr als „neuer aktiver GW" behandeln:
- `AdminGameweeksTab` Z.49: `setActiveGw(result.nextGameweek)` → **re-fetch `getActiveGameweek(selectedClubId)`** (zeigt DB-Wahrheit = unveränderter GW statt falschem Sprung).
- `SpieltagTab` handleFinalize: nutzt `nextGameweek` nicht → kein Change (außer ggf. i18n-Label-Truthfulness, in BUILD geprüft).

`simulateGameweekFlow` (importProgressiveStats + finalizeGameweek) erbt das Verhalten automatisch — der ganze manuelle Pfad wird score-only.

## 3. Betroffene Files

| File | Aktion | Begründung |
|------|--------|------------|
| `src/features/fantasy/services/scoring.admin.ts` | EDIT | `finalizeGameweek` Schritt 5 (setActiveGameweek) raus + Doc |
| `src/app/(app)/bescout-admin/AdminGameweeksTab.tsx` | EDIT | `setActiveGw(result.nextGameweek)` → re-fetch getActiveGameweek |
| `src/components/fantasy/SpieltagTab.tsx` | EDIT (cond.) | nur falls Finalize-Label/Confirm „advance/nächster Spieltag" verspricht |
| `messages/{de,tr}.json` | EDIT (cond.) | Label-Truthfulness falls obiges |
| `src/lib/services/__tests__/scoring-v2.test.ts` | EDIT | „advances gameweek"-Test invertieren (setActiveGameweek NICHT aufgerufen) |

**Grep:** `finalizeGameweek`/`simulateGameweekFlow` Consumer = SpieltagTab (finalize+sim) + AdminGameweeksTab (sim). Beide identifiziert.

## 4. Code-Reading-Liste (Pflicht VOR Implementation)

| File | Zweck | Zu prüfen |
|------|-------|-----------|
| `scoring.admin.ts:212-304` | finalizeGameweek + simulateGameweekFlow | Schritt 5 isolierbar? Return-Shape? |
| `AdminGameweeksTab.tsx:43-60` | sim-Consumer | wie result.nextGameweek genutzt (setActiveGw) |
| `SpieltagTab.tsx:183-212` | finalize+sim-Consumer | nextGameweek-Nutzung (keine) + Button/Confirm-Label |
| `scoring-v2.test.ts:353-477` | finalize-Tests | „advances gameweek"-Assert (Z.437) invertieren |
| `.claude/rules/fantasy.md` „Spieltag-Lifecycle" | ADR-012 | „nur über Admin SpieltagTab", kein Einzel-Event-Scoring |
| Recon `gameweek-engine-recon.md` | Fork B | Decouple-Begründung |

## 5. Pattern-References

- Recon Fork B — Decouple statt liga-scoped (Anil-Entscheid).
- `fantasy.md` Spieltag-Lifecycle (close→simulate→score→clone→advance) — advance wird aus dem MANUELLEN Pfad gelöst, bleibt im Cron.
- Slice 428 — set_active_gameweek/Cron sind die kanonischen Advance-Pfade (leagues=SSOT).
- `errors-frontend.md` „Display-Anker aus Source-of-Truth" (S368b) — AdminGameweeksTab zeigt DB-Wahrheit (re-fetch) statt optimistischem Sprung.

## 6. Acceptance Criteria

```
AC-01: [REGRESSION] finalizeGameweek ruft setActiveGameweek NICHT mehr
  VERIFY: scoring-v2.test.ts — setActiveGameweek nicht aufgerufen nach finalizeGameweek
  EXPECTED: 0 Aufrufe
  FAIL IF: setActiveGameweek('club', gw+1) aufgerufen

AC-02: [HAPPY] Scoring + Clone unverändert
  VERIFY: scoring-v2.test.ts — score_event für Events mit entries, createNextGameweekEvents aufgerufen
  EXPECTED: eventsScored korrekt, nextGwEventsCreated > 0
  FAIL IF: Scoring/Clone gebrochen

AC-03: [REGRESSION] Money-Pfad unberührt
  VERIFY: git diff scoring.admin.ts → keine Änderung an scoreEvent / score_event-Call / Notification-Block
  EXPECTED: nur Schritt-5-Removal
  FAIL IF: scoreEvent-Logik berührt

AC-04: [DISPLAY] AdminGameweeksTab springt nicht falsch vor
  VERIFY: Code — nach sim re-fetch getActiveGameweek statt setActiveGw(nextGameweek)
  EXPECTED: activeGw = DB-Wahrheit (unverändert)
  FAIL IF: setActiveGw(result.nextGameweek) bleibt

AC-05: [REGRESSION] tsc + volle finalize/events-Tests grün
  VERIFY: tsc --noEmit + vitest scoring-v2 + events-v2 + SpieltagTab + AdminEventsTab
  EXPECTED: alle grün
  FAIL IF: Bruch
```

## 7. Edge Cases

| # | Flow | Case | Expected | Mitigation |
|---|------|------|----------|------------|
| 1 | finalize | leere GW (0 Events) | eventsScored 0, kein advance, kein crash | bestehend |
| 2 | finalize | Event-Score fehlschlägt | errors gefüllt, kein advance (eh raus) | Schritt-5-Removal |
| 3 | AdminGameweeksTab | getActiveGameweek re-fetch wirft | non-throw (returns 1) — 428-Vertrag | getActiveGameweek graceful |
| 4 | SpieltagTab | finalize button-label | falls „advance" → neutralisieren | BUILD-Check |
| 5 | simulateGameweekFlow | import+finalize | score-only, kein advance | erbt von finalize |

## 8. Self-Verification Commands

```bash
npx tsc --noEmit
CI=true npx vitest run src/lib/services/__tests__/scoring-v2.test.ts src/lib/services/__tests__/events-v2.test.ts src/components/fantasy/__tests__/SpieltagTab.test.tsx
grep -n "setActiveGameweek" src/features/fantasy/services/scoring.admin.ts  # 0 erwartet (import + call weg)
grep -n "result.nextGameweek\|setActiveGw" src/app/(app)/bescout-admin/AdminGameweeksTab.tsx
```

## 9. Open-Questions

**Pflicht-Klärung:** keine — Decouple entschieden (Anil).
**Autonom-Zone:** AdminGameweeksTab re-fetch vs remove setActiveGw (→ re-fetch, truthful); i18n-Label-Tweak nur falls aktiv irreführend.
**Nicht-Autonom:** keine (money-neutral, kein RLS/Wording-Risk).

## 10. Proof-Plan

| Change-Typ | Proof |
|------------|-------|
| Service (Removal) | `vitest run scoring-v2` (AC-01 invert + AC-02 scoring intact) + tsc + `git diff --stat` → `worklog/proofs/429-vitest.txt` |
| Display | Code-grep AdminGameweeksTab re-fetch (AC-04) |

## 11. Scope-Out

- Liga-scoped finalize (alle Clubs) → verworfen (Anil: Decouple).
- `nextGw > 38`-Hardcode in `createNextGameweekEvents:234` → eigener kleiner Fix (gleiche 38-Klasse wie 427/428-Guard), nicht hier.
- Globale Events (club_id NULL) Lifecycle → Cron-Domäne, nicht finalize.
- AdminGameweeksTab „Sim & Score"-UX-Redesign (separater Advance-Button) → optional Folge.

## 12. Stage-Chain (geplant)

```
SPEC → IMPACT (skipped: Removal eines Advance-Calls, kein Schema/Contract/Money-Flow-Change) → BUILD → REVIEW (reviewer-Agent, money-nahe Domäne) → PROVE (vitest + diff) → LOG
```

## 13. Pre-Mortem

| # | Failure | Prob | Impact | Mitigation | Detection |
|---|---------|------|--------|------------|-----------|
| 1 | Anderer Pfad verließ sich auf finalize-advance | LOW | mittel | Cron hat eigene Advance-Logik (separater Pfad); nur manueller Admin-Pfad betroffen | grep finalizeGameweek-Consumer (2, beide UI) |
| 2 | AdminGameweeksTab zeigt nach sim weiter falschen GW | LOW | niedrig | re-fetch getActiveGameweek (DB-Wahrheit) | AC-04 |
| 3 | scoring-v2-Test bleibt auf altem advance-Assert → CI rot | MED | niedrig | AC-01 Test invertiert | vitest |
| 4 | i18n-Label verspricht weiter „advance" → irreführend | LOW | niedrig | BUILD-Label-Check (Edge #4) | grep messages |
| 5 | createNextGameweekEvents-Klon ohne advance = Events für GW der nie aktiv wird | LOW | niedrig | Klon ist prepare-ahead, Cron/Admin advanced später → Events werden dann aktiv | bestehend |

## Compliance-Check
Kein user-facing $SCOUT/IPO/Reward-Wording-Change. Money-neutral (Removal eines Advance-Writes, scoreEvent unberührt). → n/a.

## Open Risiko
Gering. Money-neutral (kein Minting-Change). Einziges Risiko: ein übersehener Consumer der finalize-advance erwartet — durch 2-Consumer-Grep + Cron-Trennung (eigener Advance) abgedeckt.
