# Review — Slice 450 (K2.4: wiki/ → docs/knowledge/ Harvest-Konsolidierung)

**Reviewer:** Cold-Context-Agent (Batch über Harvest A+B+C + Delete D/E) · **time-spent:** 18 min

## Verdict: PASS

> „Yes — a senior would merge this: textbook harvest→canon-check→delete, 0 of 13 stale values leaked into the harvested content, 0 dangling routing links, 0 runtime coupling, and the two hardest compliance traps (CASP-CONTESTED, 'Earning=Positionierung not payout') handled exactly right."

## Findings

| # | Severity | Location | Issue | Fix |
|---|----------|----------|-------|-----|
| 1 | LOW | equipment-system-Löschung | Optionaler Mikro-Harvest gedroppt: 5 Kosmetik-Typnamen (Feuerschuss/Bananen Flanke/Eiserne Mauer/Katzenauge/Kapitän) + R1–R4-Multiplikator-Tabelle (1.05–1.25) sind in **weder** equipment-realtime.md **noch** fantasy.md (grep=0). Recon-§1-Überanspruch („fantasy.md trägt 1.05–1.25x-Range") nicht wörtlich wahr. Akzeptabel: DB (`equipment_definitions`/`equipment_ranks`) = SSOT, Recon markierte „B-Mikro (optional)". | LOG-Note ODER 6-Zeilen-Referenztabelle in equipment-realtime.md. Kein Blocker. |
| 2 | NIT | INDEX.md (business-model-Auflösung) | Kein `consult_when` trägt „Geschäftsmodell"/„Business-Model"-Keyword. Sub-Topics findbar, literale Query nicht. | „Geschäftsmodell/Business-Model" zu treasury/product-map consult_when. |
| 3 | NIT | session-handoff.md:63 | K2.4-Roadmap-Zeile trägt noch „(autodream pflegt wiki → Kopplung beachten)" — Recon §6 + grep widerlegen (non-issue). | Im Tracker-Reconcile droppen. |

## canon-stale-check (0 von 13 in geernteten Files)

| # | Stale-Wert | Ergebnis | Evidenz |
|---|---|---|---|
| 1 | Pricing „MV/10 linear" / Slice-114-Backfill | **0** | nur `MV/100.000` (legal §75) = korrekt D83/D100; treasury.md:52 Baseline „MV-ENTKOPPELT". |
| 2 | Fees=Burn/deflationär | **0 (geheilt)** | competitors.md:33 BeScout-Spalte „Zirkuläre Treasury … kein Burn"; :11 loggt Heal; „deflationär" nur über Sorare. |
| 3 | Polls 30/70 | **0** | nicht im Scope. |
| 4 | P2P 3% | **0** | nicht präsent (Sorares 6,5% = Competitor-Fakt). |
| 5 | Gamification-Tiers 4000/7000 | **0** | nicht präsent. |
| 6 | CASP 147K | **0** | legal §6.1:214 = €181.000. |
| 7 | „$SCOUT=Credits" | **0 (geklärt)** | competitors:18 + legal:24 D99-korrekte Trennung. |
| 8 | Predictions live | **0** | fantasy.md:167-169 = entfernt Slice 338. |
| 9 | Beta-Snapshot | **0** | bescout-overview/product-roadmap gelöscht, nicht geerntet. |
| 10 | „Keine CASP-Lizenz" | **CONTESTED markiert** | legal §6.2:241 „bewusst offen, nicht entschieden". |
| 11 | „Süper Lig statt TFF1"-Shift | **0** | legal §6.2:224 „superseded D1 … NICHT übernommen". |
| 12 | Founding-Pass-Drift | **0** | nicht geerntet. |
| 13 | BSD/„Scout Credits" | **0** | legal:22 „Legacy BSD" code-intern; competitors durchgehend „Credits". |

## Verlust-Check (3 von 7 Dedup-Deletions spot-checked)
- **scout-cards → treasury.md:** VOLL gedeckt (ipo_price eingefroren/entkoppelt, Floor-Kaskade, Orderbuch, Liquidation; treasury.md:46-57,143).
- **fantasy-tournaments → fantasy.md:** gedeckt; Bonus: stale „Predictions live" korrekt als entfernt.
- **equipment-system → equipment-realtime.md:** Architektur gedeckt; nur optionales Kosmetik-Detail gedroppt → Finding #1.

## INDEX-Routing-Integrität
0 dangling wiki/-Links (3 historische Provenienz-Notizen zeigen AUF den neuen Kanon). Alle 7 alten Routing-Keywords über existierende INDEX-Zeile findbar (1 Keyword-Lücke „Geschäftsmodell" → Finding #2).

## Compliance/Wording
- Beide Register-Docs tragen „Internes Register — Asset/Invest erlaubt, user-facing nur Utility"-Header.
- competitors.md:18 D99-Disziplin „Earning = Positionierung, nicht Live-Auszahlung" (feedback_no_premature_ready).
- CASP korrekt CONTESTED, nicht entschieden.

## Positiv
- Stale-Heal proaktiv + geloggt (competitors.md:11 nennt die überschriebenen Alt-Werte).
- Runtime-Safety geschlossen: 0 root-wiki/ in `.claude/agents/` (autodream), `scripts/`, `src/`; Hook-Regex nach Entfernung valide.
- Token-Allokation = 100% verifiziert; CSF §5.3 / success_fee_platform_bps korrekt als OPEN CEO-Frage belassen.

## Learnings
- **Pattern (consolidation-review):** Wenn Recon „covered in file X" behauptet → file X nach dem konkreten Wert greppen, nicht der Behauptung trauen (fing Equipment-Überanspruch, Finding #1).
- Kein neuer error-class-Eintrag (Docs-Slice, kein Code/Money-Verhalten; einziger Code-Touch = Hook syntaktisch intakt).
