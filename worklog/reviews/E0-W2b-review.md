# Review — Slice E0-W2b (Wissens-Basis-Migration)

**Reviewer:** Cold-Context reviewer-Agent · **Datum:** 2026-06-17 · **Time-spent:** ~28 min

## verdict: PASS

Faithful-relocate sauber durchgezogen: Money-Kanon (treasury/polls) unverfälscht gegen D83/D86, Routing dicht (0 tote Links, 18/18 indexiert), Live-Pointer umgebogen, Decisions append-only konsolidiert, Stubs korrekt. Drei Findings = kosmetisch bzw. bewusst W2c. Nichts blockt den Merge.

## Findings
| # | Severity | Location | Issue | Fix | Status |
|---|----------|----------|-------|-----|--------|
| 1 | NIT | `domain/cross-domain-map.md:12` | Body „Last Updated 2026-03-26" ↔ Frontmatter `updated: 2026-06-17` | Body-Zeile ergänzen | ✅ GEFIXT (Body-Zeile „zuletzt erweitert 2026-06-17") |
| 2 | NIT | `.claude/rules/community.md` | kein Rück-Zeiger auf `domain/polls.md` (trading.md↔treasury.md ist beidseitig) | Zeiger in community.md | ⏭️ W2c (rules-Diät) |
| 3 | NIT | `INDEX.md:13` | treasury consult_when kürzer als Frontmatter | optional angleichen | ⏭️ optional (Spec Edge-Case §59 erlaubt) |

## Spec-Coverage (alle ACs ✅)
- AC1 18 Content-Files, alle 6/6 Frontmatter, audit 0 HARD · AC2 INDEX neue Pfade, keine Alt-Pfad-Reste, consult_when je Zeile · AC3 verified-against auf treasury/missions/equipment-realtime/cross-domain-map/fantasy (alle existent) · AC4 Alt-Pfade als Redirect-Stubs (Löschung W2c) · AC5 D28→D39 + D62/65/67 konsolidiert (append-only) · AC6 audit:knowledge:check grün (0/0).

## Money-Inhalt-Treue (KRITISCH — bestanden)
treasury.md + polls.md 1:1 gegen D83/D86: 1 $SCOUT=1 Cent ✓ · 100.000 SC=100% / max 10.000 SC=10% / 1 SC=MV/100.000 ✓ · CSF einmalig/aus Treasury/rein proportional/kein csf_multiplier ✓ · Polls=REIN nicht RAUS (inkl. poll_reward-DEBIT-Fehlannahme-Flag) ✓ · Fee-Splits deckungsgleich business.md ✓ · Bau-Stand 329-332 DONE konsistent.

## Learnings (kein Bug)
- „verified-against beidseitig verdrahten" — domain↔rule Rück-Zeiger (trading↔treasury Vorbild; community↔polls noch einseitig) → W2c-Checkliste.
- Bei Relocate aus dated memory-Files: Body-interne „Last Updated" mit Frontmatter `updated` synchronisieren (wiederkehrend bei Migration).
