# Slice NNN — <Titel>

**Status:** SPEC · **Größe:** XS | S | M | L · **Scope:** CTO | CEO-approved | CEO-pending · **Datum:** YYYY-MM-DD

> Dies ist der **Master-Spec-Template** (Slice 211). Jeder Slice startet mit einer Kopie dieser Sektionen. Pflicht-Sektionen je nach Slice-Größe sind in `.claude/rules/workflow.md` SPEC-Stage definiert.
>
> **XS-Mindest-Pflicht:** 1, 3, 4, 6, 8, 10 (6 Sektionen).
> **S/M-Voll-Pflicht:** 1-13 (alle 13 Sektionen).
> **L-Voll-Pflicht:** 1-13 + Pre-Mortem ≥ 5 Szenarien + Wave-Plan.

---

## 1. Problem Statement

Was ist heute kaputt oder fehlt? 1-3 Sätze. Plus Evidence (Screenshot-Pfad, Audit-Item-Nummer, Anil-Quote, Sentry-Issue-ID, User-Report).

**Wer ist betroffen, wie oft?** Nicht weglassen — User-Impact ist der Trigger für Severity-Wahl.

## 2. Lösungs-Design (Architektur)

WAS ändert sich, WARUM (nicht WIE — das kommt unten). Datenfluss vor und nach Change. Neue Types/Interfaces als exakte TypeScript-Shape. Neue DB-Objects als exakte SQL-Signatur.

Bei kleinen Slices (XS/S): 2-5 Sätze. Bei M/L: vollständige Architektur-Skizze mit Trade-offs.

## 3. Betroffene Files

| File | Aktion | Begründung |
|------|--------|------------|
| `path/to/file.ts` | NEU \| EDIT \| DELETE | Warum dieser File? |

**Vor diesem Slice greppt man:** `grep -rn "<symbol>" src/` — alle Consumer-Stellen müssen identifiziert sein.

## 4. Code-Reading-Liste (Pflicht VOR Implementation)

**Diese Sektion ist die wichtigste — der Agent ist intelligent, aber er weiß nicht WAS er lesen MUSS.** Liste die Files die er VOR Code lesen MUSS, mit konkreter Frage was zu prüfen ist.

| File | Zweck | Zu prüfen |
|------|-------|-----------|
| `src/lib/services/<related>.ts` | Existing Pattern verifizieren | Wie macht's der Vorgänger? |
| `supabase/migrations/<latest>.sql` | DB-Schema-Wahrheit | Welche Columns existieren? CHECK-Constraints? |
| `worklog/specs/<related>.md` | Vorbild-Spec | Welcher Pattern-Stil ist etabliert? |
| `.claude/rules/<errors-X>.md` | Bekannte Fallen | Welche gilt für DIESEN Slice? |

**Mindest-Items:**
- XS: ≥ 3 Items (Pattern-Source + 1 Reference + 1 Rule)
- S/M: ≥ 6 Items
- L: ≥ 10 Items inkl. DB-Schema-Verifikation per `pg_get_functiondef`

## 5. Pattern-References (relevant für DIESEN Slice)

Welche existing Patterns / Decisions / Common-Errors gelten? Pointer mit IDs.

- `decisions.md` D<n> — kurze Begründung warum relevant
- `patterns.md` #<n> — anzuwendendes Pattern
- `errors-frontend.md` "<Pattern-Title>" — bekannte Falle
- `business.md` "<Compliance-Block>" — Wording-Pflicht
- `database.md` "<Column-Block>" — Schema-Wahrheit

**Begründung pro Reference (1 Satz max).** Nicht copy-paste alle 38 Patterns — nur die ECHT relevanten.

## 6. Acceptance Criteria (Executable, nicht Prosa)

```
AC-NN: [CATEGORY] [Description]
  VERIFY: [Exact command, URL path, or DB query]
  EXPECTED: [Exact result — what you see/get]
  FAIL IF: [What would indicate a bug]
```

**Mandatory Coverage je nach Slice-Größe** (siehe `/spec` Skill Sektion 1.5):
- HAPPY (Standard-Flow), EMPTY, ERROR, NULL, CONCURRENT, MOBILE, I18N-DE, I18N-TR, LOADING, PENDING, REGRESSION
- XS: ≥ 3 ACs (Happy + Mobile + I18N reicht für trivial-Pattern-Wiederholung)
- S/M: ≥ 6 ACs (mindestens 1 pro Categorie)
- L: alle 11 Categorien

## 7. Edge Cases Table

| # | Flow | Case | Input/State | Expected | Mitigation |
|---|------|------|-------------|----------|------------|
| 1 | ... | null/undefined input | ... | ... | ... |
| 2 | ... | 0 rows from DB | ... | ... | ... |
| 3 | ... | network timeout | ... | ... | ... |

**Walk durch jeden Flow + frage** für JEDE Cell:
- Was wenn Input null/undefined/0/empty-string/empty-array?
- Was wenn DB 0 Rows / 1 Row / 1000 Rows?
- Was wenn User unauthenticated / wrong-role?
- Was wenn Network-fail / timeout / 500?
- Was wenn Double-Click / Retry?
- Was wenn Stale-Cache zwischen Read und Write?

XS: ≥ 3 Edge-Cases. S/M: ≥ 6. L: ≥ 10.

## 8. Self-Verification Commands

**Was kann der Agent (oder ich) selbst laufen lassen post-Implementation?**

```bash
# Pflicht jeder Slice:
npx tsc --noEmit
npx vitest run <related-test-file>

# Slice-spezifisch:
grep -rn "<new-symbol>" src/  # Konsumenten verifizieren
sed -n '<line>,<line>p' <file>  # Spot-Check
mcp__supabase__execute_sql "SELECT ... FROM ... LIMIT 5"  # DB-Smoke
```

**Bei Money-Path zusätzlich:**
- `pg_get_functiondef('public.<rpc>'::regprocedure)` — RPC-Body verifizieren
- `SELECT policyname, cmd FROM pg_policies WHERE tablename = 'X'` — RLS-Check
- `SELECT count(*) FROM transactions WHERE user_id = '<test-uid>' AND created_at > NOW() - INTERVAL '5 min'` — kein Doppel-Buchung

## 9. Open-Questions (klären VOR Code)

Was MUSS der Agent klären bevor er Code schreibt? Was ist Autonom-Zone?

**Pflicht-Klärung (Agent-Frage zurück bei Unklarheit):**
1. ...
2. ...

**Autonom-Zone (Agent entscheidet):**
- Component-Struktur (Sub-Components, Inline-Helpers)
- Naming (sofern bekannte Patterns nicht verletzt)
- Test-Strategie-Detail (welche Edge-Cases als separate Tests)
- Refactoring-Tiefe (sofern in Spec-Scope)

**Nicht-Autonom-Zone (Anil-CEO-pflicht):**
- Money-Path-Decisions
- RLS-Policy-Aenderungen
- Wording-Drift business.md
- Neue Crons (Vercel-Plan-Limit)

## 10. Proof-Plan

**Welches Artefakt beweist dass es funktioniert?**

| Change-Typ | Proof |
|------------|-------|
| Service / RPC | `npx vitest run <test>` Output als `worklog/proofs/NNN-vitest.txt` |
| UI-Change | Playwright-Screenshot gegen `bescout.net` als `worklog/proofs/NNN-screenshot.png` |
| DB-Schema | `SELECT` Query-Output als `worklog/proofs/NNN-query.txt` |
| Security | RLS/Grant-Listing als `worklog/proofs/NNN-pg-policies.txt` |
| Bug-Fix | Vorher/Nachher-Vergleich (Screenshot oder Log) |
| Refactor ohne Behavior-Change | Tests grün + `git diff --stat` Output |
| Workflow / Skill / Hook | AC-Audit-Block-Output (`grep -c <pattern>` per AC) |

**Verboten als Proof:** "sollte passen" / "tsc clean" allein / "Pattern ist wie anderswo".

## 11. Scope-Out

Was ist explizit NICHT in diesem Slice (geht in welchem Folge-Slice)?

- Item X → Slice <NNN+M> (Begründung)
- Item Y → Post-Beta-Backlog (Begründung)

**Begründung:** Verhindert Scope-Creep. Wenn Anil im Reviewer-Loop "ach mach gleich auch X" sagt, ist X explizit raus → neuer Slice.

## 12. Stage-Chain (geplant)

```
SPEC → IMPACT (skipped/file/...) → BUILD → REVIEW (reviewer-Agent | self-review D35) → PROVE → LOG
```

Mit Begründung pro Skip.

## 13. Pre-Mortem (5+ Szenarien — bei L-Slice Pflicht, sonst optional)

"Es ist 1 Woche später. Dieser Change hat etwas gebrochen. Was ist passiert?"

| # | Failure | Probability | Impact | Mitigation | Detection |
|---|---------|-------------|--------|------------|-----------|
| 1 | ... | HIGH/MED/LOW | hoch/mittel/niedrig | ... | Wie würden wir's merken? |

**Pull-Sources:** common-errors.md, errors-db/frontend/infra/scraper.md, decisions.md, eigene Erfahrung mit ähnlichen Slices.

---

## Compliance-Check (Pflicht bei Money-Path / User-facing Wording)

- $SCOUT-Wording-Drift? Kein "Investment / ROI / Profit" user-facing.
- IPO-Begriff user-facing? Stattdessen "Erstverkauf" / "Kulüp Satışı".
- TR-Glücksspiel-Vokabel? Kein "kazan*" / "gewinn*" — neutral übersetzen.
- Asset-Klasse-Framing? Kein "Investiere in" / "Rendite" / "Asset-Klasse".
- Disclaimer auf Page mit $SCOUT/DPC? TradingDisclaimer-Component eingebunden?

## TR-Wording-Vorab (bei i18n-Strings)

| Key | DE | TR | business.md-Konformität |
|-----|----|----|-------------------------|
| `namespace.key` | "..." | "..." | ✓ keine kazanmak/yatırım/kar |

**Anil-Pflicht-Review** vor Beta-Verify markiert.

## Open Risiko (kurz, ehrlich)

Was kann diesen Slice wirklich gefährden? 1-3 Sätze. Welche Mitigation greift?
