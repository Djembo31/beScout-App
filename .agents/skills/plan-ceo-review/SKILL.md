---
name: plan-ceo-review
description: CEO-Hat Review eines Plans/Features aus Business-Perspektive. Nutze NACH /spec aber VOR /deliver oder /ship BUILD. Prüft 5 CEO-Fragen (Wer zahlt? Value? Moat? Compliance? Priorität?). Output PASS/CONCERN/REJECT mit Begründung.
---

# /plan-ceo-review — CEO-Hat Review

Anil trägt Business-Perspektive explizit. Codex nimmt diese Perspektive ein NACH Spec, VOR Build.

## 5 CEO-Fragen

### 1. Wer zahlt dafür?
- Club (B2B-Sales-Paket)
- Fan (B2C — Scout Card, Event-Entry, IPO)
- Platform implicit (via Fee-Split 3.5%+1.5%+1%)
- Keiner → Kosten-Feature, rechtfertigen!

### 2. Was bringt es konkret?
User-facing Value in 1 Satz: "Wir bauen X damit Y (Fan/Club) Z tut."
Wenn Satz nicht formulierbar → Feature unklar, spec zurückschicken.

### 3. Moat?
- Kopierbar in 1 Woche? → kein Moat
- Community/Daten/Content-Moat? → gut
- Erste-Mover in lokalem Markt? → okay

### 4. Compliance-Risk?
Check gegen `.Codex/rules/business.md`:
- **Licensing-Phase korrekt?** (Phase 1 Credits, Phase 3 nach CASP, Phase 4 nach MGA)
- **Wording:** Investment/ROI/Profit/Rendite VERBOTEN
- **Glücksspiel:** gewinn*/prize/prämie VERBOTEN
- **Fee-Split stimmt?** (Trading 3.5+1.5+1%, IPO 10+5+85%, etc.)
- **Kill-Switch bei Revenue-Caps?** (EUR 900K für BSD)

### 5. Priorität vs. andere Kanban-Items?
- CRITICAL-Compliance zuerst
- P0 Blocker zuerst
- Fantasy vs. Trading Balance

## Output-Format

```
VERDICT: PASS | CONCERN | REJECT

1. Payment: <Antwort>
2. Value: <1-Satz-Aussage>
3. Moat: <Begründung>
4. Compliance: <PASS/Details>
5. Priority: <Ranking-Hinweis>

Begründung: <2-3 Sätze>
```

## Verboten (ist anderer Skill)

- Code-Review → `/cto-review`
- Style-Review → Reviewer-Agent
- Performance-Opinion → `.Codex/rules/performance.md`
- Edge-Case-Enumeration → `/plan-qa-review`

## Auto-Checks vor Review

```bash
# Wording-Grep im Feature-Text
grep -iE "investment|roi|profit|rendite|gewinn|prämie|preis[eg]" <spec-file>

# Licensing-Phase-Check
grep -E "paid|bezahl|ödeme|real money" <spec-file>
```

Keine Treffer = PASS-Vorprüfung OK.
