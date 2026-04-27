# Slice 232 — `spec: inline` Bypass Hard-BLOCK

**Status:** SPEC · **Größe:** XS · **Scope:** CTO · **Datum:** 2026-04-27

> Wave-3-Tooling Backlog (Slice 230 Handoff). `ship-spec-quality-gate.sh` skipped aktuell silent bei `spec: inline` ODER `spec: skipped` — kein Sicherheitsnetz gegen Bypass-Missbrauch. Slice 232 upgradet auf Hard-BLOCK falls Bypass keine Begründungs-Klammer `( ... )` enthält.

---

## 1. Problem Statement

`ship-spec-quality-gate.sh` aktueller Skip-Block:
```bash
case "$SPEC_FILE_REL" in
    ""|"—"|"-"|"inline"|"inline*"|"skipped*") exit 0 ;;
esac
```

Pattern matcht jede `spec: inline`-Zeile silent — auch nackt ohne Begründung. Das ist Bypass-Risiko: ein S/M-Slice mit `spec: inline` umgeht die ganze Spec-Quality-Gate ohne Self-Disziplin-Anker.

**Standard-konformer Bypass:** `spec: inline (Pattern-Wiederholung Slice 196)` — Klammer dokumentiert WARUM keine Spec-Datei. Slice 209/210/213 nutzen das Pattern legitim für XS-Trivial-Wiederholungen.

**Missbrauchs-Szenario:** Future-CTO (oder ich gestresst) tippt `spec: inline` plain — kein Audit-Trail, kein Reviewer-Anker. Slice 232 zwingt die Begründung.

**Wer ist betroffen, wie oft?** CTO (mich) bei jeder Spec-skipping-Entscheidung. Aktuell sind 4-6 historische `spec: skipped (...)`/`spec: inline (...)`-Einträge in active.md-History (Slice 209/210/213/etc.) — alle mit Begründung. Slice 232 codifiziert die de-facto-Convention als Hard-Rule.

## 2. Lösungs-Design (Architektur)

Skip-Block in `ship-spec-quality-gate.sh` umbauen von wildcard-glob auf strikte Detection:
- `spec: inline` plain (ohne `( ... )`) → **BLOCK exit 2**
- `spec: inline (any-reason)` → silent skip (legitime Bypass)
- `spec: skipped` plain → **BLOCK exit 2**
- `spec: skipped (any-reason)` → silent skip
- `spec: —` / leer → silent (idle-state, schon oben gefangen)
- `spec: worklog/specs/...` → normaler Spec-Pflicht-Check

Detection via Bash regex auf `$SPEC_FILE_REL`:
```bash
case "$SPEC_FILE_REL" in
    *"("*")"*) ;;          # hat Klammer → bypass-OK, weiterprüfen
    inline|skipped) BLOCK ;;
    inline*|skipped*) ;;   # genauer prüfen
esac
```

Tatsächlich einfacher: regex-Match auf `^(inline|skipped)( *\(.+\))?$`-Pattern.

**Wirkung:** Hard-BLOCK (exit 2) — der einzige Hard-BLOCK in diesem Hook. WARN-Check für Sektionen/Items bleibt davon unberührt (greift nur bei Spec-Datei-Pfaden).

## 3. Betroffene Files

| File | Aktion | Begründung |
|------|--------|------------|
| `.claude/hooks/ship-spec-quality-gate.sh` | EDIT | Skip-Block-Detection refinen |
| `worklog/specs/232-spec-inline-bypass-block.md` | NEU | Diese Spec |
| `worklog/active.md` | EDIT | Stage-Updates |
| `worklog/log.md` | EDIT | Slice-Eintrag |

**Vor diesem Slice greppt man:**
```bash
grep -n "inline\|skipped" .claude/hooks/ship-spec-quality-gate.sh   # Skip-Block finden
grep -rn "spec: inline\|spec: skipped" worklog/                     # historische Nutzung verifizieren
```

## 4. Code-Reading-Liste (Pflicht VOR Implementation)

| File | Zweck | Zu prüfen |
|------|-------|-----------|
| `.claude/hooks/ship-spec-quality-gate.sh` (Slice 231) | Aktuelle Skip-Block-Logik verstehen | Wo läuft Skip-Block? Nach welchem Filter steht er? |
| `worklog/active.md` | spec-Wert-Format inspizieren | Welcher Wert-Stil ist heute Convention (inline/skipped)? |
| `.claude/rules/errors-infra.md` "Shell case-statement wildcard promiskuoes" (Slice 145+146) | BLOCK-Hook-Detection sauber halten | Wildcards-Pattern dürfen nicht auf User-Input greifen |
| `.claude/hooks/ship-spec-gate.sh` | Vorbild für Hard-BLOCK-Hook | Wie schreibt man exit-2-Block-Message? |
| `worklog/log.md` Slice 209/210/213 | Legitime `spec: inline (...)`-Nutzung | Welche Begründungen sind kanonisch? |

## 5. Pattern-References

- `decisions.md` D52 — Wave-3-Tooling Standard-API. **Aber:** D52 sagt WARN-only. Slice 232 weicht ab (Hard-BLOCK), weil Bypass-Missbrauch ein anderes Problem-Klasse ist als Item-Quality. Begründung in active.md vermerken.
- `errors-infra.md` "Shell case-statement wildcard promiskuoes" (Slice 145+146) — 1:1 anwendbar. Detection darf nicht promiskuos sein. Pattern muss exakt anchorn.
- `decisions.md` D45 — Hooks > Text-Regeln. Slice 232 ist diese Philosophie in Reinform: Bypass-Convention ist Text-Regel, Slice 232 macht's zur Hook-Regel.

## 6. Acceptance Criteria

```
AC-01: [HAPPY] spec: worklog/specs/X.md → normaler Pflicht-Check (kein BLOCK)
  VERIFY: active.md auf Slice 231 (spec: worklog/specs/231-...md), Hook auf src/dummy.ts laufen
  EXPECTED: exit 0 (Layer 1+2 silent oder WARN nach Sektion-Status)
  FAIL IF: BLOCK exit 2

AC-02: [REGRESSION] spec: inline (Pattern-Wiederholung Slice 196) → silent skip
  VERIFY: active.md mock'en mit `spec: inline (XS Pattern-Wiederholung)`, Hook laufen
  EXPECTED: exit 0 silent
  FAIL IF: WARN/BLOCK ausgespuckt

AC-03: [REGRESSION] spec: inline plain → Hard-BLOCK exit 2
  VERIFY: active.md mock'en mit `spec: inline` (kein Klammer), Hook laufen
  EXPECTED: exit 2 + WARN-Message "Bypass ohne Begründung"
  FAIL IF: silent oder exit 0

AC-04: [HAPPY] spec: skipped (cosmetic XS) → silent skip
  VERIFY: active.md mock'en mit `spec: skipped (cosmetic)`, Hook laufen
  EXPECTED: exit 0 silent
```

## 7. Edge Cases

| # | Flow | Case | Input/State | Expected | Mitigation |
|---|------|------|-------------|----------|------------|
| 1 | Skip-Detection | `spec: inline()` (leere Klammer) | spec=`inline()` | OK silent? Oder BLOCK? | Pragmatisch: `()` zählt als Klammer-vorhanden → silent. Anil kann sich selbst sabotieren. |
| 2 | Skip-Detection | `spec: inline(no-space)` | spec=`inline(reason)` | Silent (Klammer da) | regex muss space-tolerant sein |
| 3 | Skip-Detection | `spec: skipped` mit trailing whitespace | spec=`skipped   ` | BLOCK | tr -d ' ' am Ende der Detection |
| 4 | Skip-Detection | `spec: SKIPPED` (uppercase) | spec=`SKIPPED` | BLOCK (case-sensitive ist OK, wir setzen lowercase als Convention) | Standard ist lowercase, Drift wird zur Block-Indikation |
| 5 | Idle-Bypass | `spec: —` (em-dash) | idle | silent (oben schon gefangen) | Bestehender SLICE-Check exit 0 |

## 8. Self-Verification Commands

```bash
# Bash syntax-check
bash -n .claude/hooks/ship-spec-quality-gate.sh

# Smoke 1: Aktuelle Slice 231 Spec → kein BLOCK
echo '{"file_path":"src/dummy.ts"}' | bash .claude/hooks/ship-spec-quality-gate.sh; echo "EXIT=$?"

# Smoke 2: Mock-active.md mit `spec: inline` plain → BLOCK exit 2
mkdir -p /tmp/spec-test
cp worklog/active.md /tmp/spec-test/active-real.md
sed -i 's|spec:.*|spec: inline|' worklog/active.md
echo '{"file_path":"src/dummy.ts"}' | bash .claude/hooks/ship-spec-quality-gate.sh; echo "EXIT=$?"
cp /tmp/spec-test/active-real.md worklog/active.md  # Restore

# Smoke 3: Mock-active.md mit `spec: inline (reason)` → silent
sed -i 's|spec:.*|spec: inline (test-reason)|' worklog/active.md
echo '{"file_path":"src/dummy.ts"}' | bash .claude/hooks/ship-spec-quality-gate.sh; echo "EXIT=$?"
cp /tmp/spec-test/active-real.md worklog/active.md  # Restore
```

## 9. Open-Questions

**Pflicht-Klärung:** Keine — Detection ist deterministisch.

**Autonom-Zone:**
- Detection-Pattern (regex vs case-statement)
- Block-Message-Wortlaut
- Trailing-whitespace-Handling

**Nicht-Autonom:** Keine Money-Path. Hook-Refinement.

## 10. Proof-Plan

| Change-Typ | Proof |
|------------|-------|
| Workflow / Hook | AC-Audit-Block: 4 Smokes (HAPPY-with-spec, BLOCK-inline-plain, OK-inline-with-reason, OK-skipped-with-reason) → `worklog/proofs/232-hook-smoke.txt` |

## 11. Scope-Out

- **WARN-statt-BLOCK-Variante** (graduelles Rollout) → nicht. Anil's Direktive ist Hard-BLOCK falls missbraucht. Begründungs-Klammer ist eindeutige Detection.
- **Auto-Begründung-Inferenz** (Hook errät Begründung aus active.md history) → nein, zu komplex.
- **Slice 233+ Pre-Mortem-Szenario-Count bei L** → separater Slice falls Bedarf.

## 12. Stage-Chain

```
SPEC → IMPACT (skipped: hook-only)
     → BUILD
     → REVIEW (self-review D35: XS-Pattern-Wiederholung Slice 212+231 + gleicher Hook)
     → PROVE (4 Smokes mit Mock-active.md)
     → LOG
```

## 13. Pre-Mortem (kurz)

| # | Failure | Probability | Impact | Mitigation | Detection |
|---|---------|-------------|--------|------------|-----------|
| 1 | Hard-BLOCK feuert false-positive bei legitime `spec: inline (...)` | LOW | hoch (Anil blockiert) | Smoke 3 mit echten reason-Strings, regex space-tolerant | Anil meldet Block, ich rolle zurück |
| 2 | Detection promiskuoes (Slice 145 Pattern) bei Edge-cases wie `inline-spec` | MED | mittel | exact-match `^inline$` und `^inline(\s*\(.+\)\s*)?$` — kein wildcard | Smoke 4 mit exotischen Werten |
| 3 | Hook BLOCK aber active.md kann nicht editiert werden (Block-Loop) | LOW | hoch (Stuck) | Hook skipped meta-File-Edits (`worklog/*` schon im Skip-Filter) → active.md-Edit erlaubt | Smoke 5: editiere active.md mit `spec: inline` → keine Block |
| 4 | Restoring von Test-active.md schlägt fehl, leaked invalid State | LOW | hoch | Smoke nutzt git stash + commit als safety-net, nicht raw-sed | TestProtokoll mit git status nach jedem Schritt |

---

## Compliance-Check

Nicht relevant.

## Open Risiko

**Risk:** Hard-BLOCK ist die erste BLOCK-Hook-Erweiterung in diesem File. Falls Detection False-Positive feuert (z.B. komische `spec: inline /home/path`-Drift), kann ich aktiv arbeiten nicht. **Mitigation:** Sehr enge regex-Definition. Falls Bug: schneller Fix-Weg via direkten Hook-Edit (Hook skipped `.claude/*` selbst, also kein Block-Loop).
