# Slice 245 — Deferred-Items Re-Eval-Reminder-Hook

**Größe:** XS
**Slice-Type:** Hook
**Datum:** 2026-04-28
**Bezug:** docs/test.rtf #6 (Findings → Slice-Stub-Pipeline läuft, aber niemand prüft "was ist deferred wegen falschem Grund?". 4 deferred Items in beta-phase.md — keiner re-evaluiert sie automatisch. ORPHAN-NEU-1 wurde defer'd "bei Skala >20 active-scouts" — aber wer triggert die Re-Evaluation bei N=21?)

## 1.1 Problem-Statement

`worklog/beta-phase.md` `deferred:` Sektion hat 4 Items mit Re-Eval-Triggers in Prosa-Form:
- POSTHOG-NEU-1 — "post-3-Tester-Beta, wenn Skala >20 User"
- FM-RR-2 — "post-Beta" (Feature)
- FM-NEU-3 — "post-Beta wenn Skala >20 User"
- ORPHAN-NEU-1 — "bei Skala >20 active-scouts auf Player-Detail Community-Tab"

**Niemand prüft die.** Bei N=21 active-scouts triggert keine Wiederbelebung von ORPHAN-NEU-1. Findings sammeln sich silent als ewig-deferred-Leichen.

**Evidenz aus Repo:**
- `worklog/beta-phase.md:25-29` — deferred-Items sind plain-Text-Bullets ohne machine-readable Trigger.
- Keine grep-Treffer auf "deferred" in `.claude/hooks/`.
- Anil-Quote: *"4 deferred Items in beta-phase.md — keiner re-evaluiert sie automatisch."*

## 1.2 Lösungs-Design

**Stop-Hook `ship-deferred-reeval-reminder.sh`** — periodischer Reminder-Layer:

- Triggert bei Stop (Session-Ende).
- Liest `worklog/beta-phase.md` `deferred:` Sektion.
- State-File `.claude/state/deferred-reeval-last-shown` (Unix-Timestamp).
- Wenn `now - last_shown > 7 Tage` ODER deferred-Items-Count != cached_count → WARN-Block mit Items.
- Update timestamp + cached_count nach Print.

**Bewusst Iteration 1 (Reminder, kein Auto-Eval):**
- Iteration 2 braucht structured trigger-format + DB/PostHog-Polling — komplex, post-Beta.
- Reminder reicht: erhöht Decision-Friction → bei nächstem Stop sieht CTO/Anil die Liste → manuelle Re-Eval-Decision möglich.
- Pattern-Wiederholung von **Slice 230 ship-phase-tracker-reminder.sh** (Stop-Hook-Reminder, gleiche Architektur).

## 1.3 Betroffene Files

- `.claude/hooks/ship-deferred-reeval-reminder.sh` (NEU)
- `.claude/settings.json` (Stop-Hook-Registration)
- `.claude/state/deferred-reeval-last-shown` (auto-erzeugt beim ersten Run, wird in `.gitignore` erfasst weil State)

## 1.4 Code-Reading-Liste (VOR Implementation)

| File | Zweck | Frage |
|------|-------|-------|
| `.claude/hooks/ship-phase-tracker-reminder.sh` | Pattern-Reference Slice 230 | Welche Stop-Hook-Struktur ist etabliert? |
| `worklog/beta-phase.md` | Source-of-Truth deferred-Items | Wie ist YAML-Block aufgebaut? Format der Bullet-Items? |
| `.claude/settings.json` | Hook-Registration | Wo Stop-Hooks anhängen? |
| `.gitignore` | State-File-Ignorance | Ist `.claude/state/` schon ignored? |

## 1.5 Pattern-References

- **Slice 230 ship-phase-tracker-reminder.sh** — Stop-Hook-Reminder-Pattern, gleicher Architektur-Slot.
- **D54** (Slice 234) — Build-without-Wire-Verbot. Hook + Registration + State-File werden alle in 1 Slice committed (kein orphan).
- **D45** (Hooks > Text-Regeln) — architektonische Enforcement statt Memory.
- **Slice 232 Bypass-Hard-BLOCK** — gleiche `set -e`-Mechanik (hier nicht BLOCK, nur WARN-print).

## 1.6 Acceptance Criteria

```
AC-01: Hook-Datei .claude/hooks/ship-deferred-reeval-reminder.sh existiert + executable.
AC-02: settings.json Stop-Hook-Block enthält den Hook (registriert).
AC-03: Hook liest deferred-Items aus worklog/beta-phase.md (4 Items aktuell).
AC-04: Hook nutzt State-File .claude/state/deferred-reeval-last-shown.
AC-05: Erster Run printet WARN-Block + erzeugt State-File.
AC-06: Zweiter Run innerhalb 7 Tagen → silent (kein Output).
AC-07: Bei "leerem" deferred-Block → silent (kein Lärm wenn nichts deferred).
AC-08: .gitignore enthält .claude/state/ oder explizit .claude/state/deferred-reeval-last-shown.
```

## 1.7 Edge Cases

| Case | Verhalten |
|------|-----------|
| beta-phase.md fehlt | Hook silent exit 0 (kein Crash) |
| deferred-Block fehlt komplett | silent |
| State-File korrupt (kein gültiger Timestamp) | re-init mit aktuellem now, einmaliger WARN |
| Items-Count geändert (deferred wurde modifiziert) | trigger force-print unabhängig vom 7-Tage-Timer |
| State-Dir fehlt | mkdir -p, dann weiter |
| Hook stört andere Stop-Hooks | exit 0 immer (auch bei Internal-Errors) |

## 1.8 Self-Verification Commands

```bash
# Smoke-Test: erster Run printet
rm -f .claude/state/deferred-reeval-last-shown
bash .claude/hooks/ship-deferred-reeval-reminder.sh
# erwartet: WARN-Block mit 4 Items

# Smoke-Test: zweiter Run silent
bash .claude/hooks/ship-deferred-reeval-reminder.sh
# erwartet: kein Output

# Force-Trigger via Items-Count-Change
sed -i 's/POSTHOG-NEU-1/POSTHOG-NEU-1-test/' worklog/beta-phase.md
bash .claude/hooks/ship-deferred-reeval-reminder.sh
# erwartet: WARN-Block (count-change)
git checkout worklog/beta-phase.md  # revert
```

## 1.9 Open-Questions / Autonom-Zone

**Pflicht-Klärung:** keine — XS Hook ohne CEO-Scope.

**Autonom-Zone (CTO):**
- Reminder-Intervall: 7 Tage (gewählt — wöchentliche Cadence ist Standard für Backlog-Reviews)
- WARN-Format: ähnlich Slice 230 ship-phase-tracker-reminder
- State-File-Format: plain Unix-Timestamp + items-count auf 2 Zeilen

## 1.10 Proof-Plan

- `worklog/proofs/245-deferred-reeval-smoke.txt` — Live-Run mit erstem-Print + zweitem-Silent + Force-Trigger

## 1.11 Scope-Out

- **Iteration 2 structured-trigger-format** (z.B. `trigger: posthog.events.beta_user_count >= 20`) → post-Beta
- **DB-Polling oder PostHog-API für echte Re-Eval** → post-Beta (M-Slice)
- **GitHub-Issue-Auto-Creation bei Match** → post-Beta

## 1.12 Stage-Chain (geplant)

SPEC → IMPACT (skipped: Hook-only) → BUILD → REVIEW (self-review D35: Pattern-Wiederholung Slice 230) → PROVE → LOG

## 1.13 Pre-Mortem (XS optional)

- **Risiko:** Hook produziert spam jeden Stop → Mitigation: 7-Tage-Cooldown + count-change-Trigger.
- **Risiko:** Hook crashes → andere Stop-Hooks brechen → Mitigation: `set +e` + `exit 0` immer am Ende.
