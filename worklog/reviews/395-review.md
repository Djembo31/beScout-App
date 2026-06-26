# Review — Slice 395 (Lineup-Reject-Coverage komplett)

**Reviewer:** Cold-Context-Agent · **Datum:** 2026-06-26 · **time-spent:** ~9 min

## Verdict: PASS

## Findings

| # | Severity | Location | Issue | Fix |
|---|----------|----------|-------|-----|
| 1 | NIT | `errors.lineupRuleInvalid` (de/tr.json:3701) vs `fantasy.lineupRuleInvalid` (977) | Gleicher Key-Name in **zwei** Namespaces (`fantasy` aus 393, `errors` neu aus 395). KEIN JSON-Last-Wins-Bug (getrennte Objekte), `mapErrorToKey` resolved korrekt in `errors`. Nur Verwechslungsgefahr für künftige Editoren. | Optional künftig disjunkter Name (`lineupRuleMisconfigured`). Nicht merge-blockierend — **bewusst nicht geheilt** (Rename + Re-Verify nicht gerechtfertigt für low-confidence-Kosmetik). |
| 2 | NIT | de.json:977 vs 3701 | Wording-Divergenz `fantasy`-Variante (User-Aktion) vs `errors`-Variante (Admin-Defekt). Beide kontextrichtig. | Keine Aktion. |

## One-Line
Ja — Senior merged das: sauberes Passthrough+Regex-Muster, Regex ohne Wildcard-Drift verankert, KNOWN_KEYS-vor-ERROR_MAP garantiert kein Frühschluck, DE+TR vollständig + compliance-konform.

## Verifizierte Prüfpunkte
1. **Abdeckung:** alle 22 Codes auf 14 Keys, kein Über-Match (Anker auf exakte snake_case-Literale statt `.*`).
2. **ERROR_MAP-Reihenfolge:** neue Regex (106–111) VOR `/not.found/`; KNOWN_KEYS-Passthrough wird ohnehin zuerst geprüft → strukturell immun.
3. **Namespace-Kollision:** kein In-Object-Duplicate; 13 der 14 Keys je 1× in `errors`; `lineupRuleInvalid`-Dopplung über Namespaces = Nit #1.
4. **Compliance:** keine Securities-/Glücksspiel-Begriffe; `notEnoughDpc`-Reuse nutzt D99-Wording „Scout Cards". TR idiomatisch.
5. **Scope-Out:** dynamischer Kontext korrekt als Folge-Slice (393-Präzedenz).

## Gate
Review-File exists + verdict PASS → weiter zu LOG. 2 NITs als Backlog/akzeptiert dokumentiert.
