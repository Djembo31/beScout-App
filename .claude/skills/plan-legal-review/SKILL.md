---
name: plan-legal-review
description: Legal/Compliance-Hat Review eines Plans/Features. Nutze bei Features mit user-facing Text die Money/Trading/Fantasy/IPO/$SCOUT berühren. Prüft Wording (Securities + Glücksspiel), Licensing-Phase, Geofencing, Disclaimer. Output PASS/NEEDS_WORDING_FIX/BLOCK.
---

# /plan-legal-review — Legal-Hat Review

Pflicht bei jedem Feature mit user-facing Text im Money/Trading/Fantasy/IPO-Space.

## Verbotene Begriffe (Full Liste in `.claude/rules/business.md`)

### Securities-Terminologie (SPK/MiCA Red-Flag)
| Verboten | DE Ersatz | TR Ersatz |
|----------|-----------|-----------|
| Investment | Platform Credit | Platform Credit |
| ROI / Profit / Rendite | — streichen | — streichen |
| Dividende / Gewinn (invest) | Reward / Belohnung | Ödül |
| Ownership | Sammlung / Kader | Koleksiyon / Kadro |
| IPO (user-facing) | Erstverkauf | Kulüp Satışı |
| Orderbuch | Angebots-Tiefe | Teklif Derinliği |
| Trader (Rolle) | Sammler / Scout | Koleksiyoncu / Scout |
| "guaranteed returns" | — komplett streichen | — komplett streichen |

### Glücksspiel-Vokabel (StGB §284, MASAK)
| Verboten | DE Ersatz | TR Ersatz |
|----------|-----------|-----------|
| Prize / Prämie | Reward | Ödül |
| Preisgeld / Preispool | Rewards-Pool | Ödül Havuzu |
| gewinnen | sammeln, erhalten | topla, al |
| Gewinner | Top-Platzierung | Üst Sıralama |
| kazan* (TR Fantasy) | topla, elde et | — |

## 4 Legal-Fragen

### 1. Welche Licensing-Phase?
- Phase 1 (jetzt): Scout Card Trading, Free Fantasy, Votes, Events — OK
- Phase 3 (nach CASP): $SCOUT Token Cash-Out, Exchange — NICHT BAUEN
- Phase 4 (nach MGA): Paid Fantasy Entry, Turniere mit Preisen — NICHT BAUEN

### 2. Geofencing-Tier?
- TIER_FULL (EU): alles
- TIER_CASP (EU ohne Gaming): Trading ja, Paid Fantasy nein
- TIER_FREE (DE/FR/AT/UK): Free only
- TIER_RESTRICTED (TR): Content + Free Fantasy only
- TIER_BLOCKED (USA/China/OFAC): kein Zugang

### 3. Disclaimer auf User-facing Pages?
- **$SCOUT/DPC-Seite:** `TradingDisclaimer` Component
- **Fantasy-Page/Modal:** `FantasyDisclaimer` Component
- Pflicht auf JEDER Seite mit Trading/Fantasy/Rewards

### 4. Money-Logic CEO-approved?
- Fee-Splits verändert? → CEO-Gate
- Neue Revenue-Quelle? → CEO-Gate
- Kill-Switch bei Cap? → z.B. BSD-Sales stopp bei EUR 900K

## Output-Format

```
VERDICT: PASS | NEEDS_WORDING_FIX | BLOCK

Phase: <1|3|4> (<OK|NICHT BAUEN>)
Geofencing: <TIER>
Disclaimer: <vorhanden|fehlt>
Money-Logic CEO: <approved|not-approved>

Wording-Violations:
- <zeile oder "keine">

Next-Action: <konkret>
```

## Auto-Grep vor Review

```bash
# Securities-Red-Flags in user-facing Strings
grep -iE "investment|roi|profit|rendite|dividende|\\bgewinn\\b|ownership" messages/*.json <spec>

# Glücksspiel-Red-Flags
grep -iE "gewinn|prämie|preis[eg]|\\bwin\\b|\\bprize\\b|kazan" messages/*.json <spec> | grep -v "gewinnLabel"

# IPO im user-facing
grep -E "\\bIPO\\b" messages/*.json | grep -v "admin"
```

Treffer → neutralisieren nach Tabelle oben, neu prüfen.

## Reinvestment-Anti-Pattern (SPK Red-Flag)

NIEMALS:
- Post-Event-Reward-Modal mit Trading-CTA ("Aufstocken", "Güçlendir")
- Nach Reward direkt "Karte kaufen"-Button
- "Reinvest your winnings"

Neutrale CTAs: "Schließen", "Zum Kader", "Kapat", "Kadroya Git"
