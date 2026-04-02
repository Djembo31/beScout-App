---
name: metrics
description: Aggregiert Session-Metriken aus sessions.jsonl — zeigt Trends, Erfolgsrate, Corrections
---

# /metrics — Session-Metriken Dashboard

Liest `memory/metrics/sessions.jsonl` und zeigt aggregierte Metriken.

## Trigger
- Manuell: `/metrics`
- Optional: `/metrics last-7` (letzte 7 Tage), `/metrics all`

## Prozess

1. **Lies** `memory/metrics/sessions.jsonl`
2. **Aggregiere:**
   - Total Sessions
   - Avg Files Changed pro Session
   - Total Corrections (User-Korrekturen)
   - Corrections Trend (steigend/fallend/stabil)
   - Avg Commits pro Session
3. **Zeige Report:**
   ```
   ## Session-Metriken
   | Metrik | Wert | Trend |
   |--------|------|-------|
   | Sessions (gesamt) | N | — |
   | Avg Files/Session | N | ↑/↓/→ |
   | Total Corrections | N | ↑/↓/→ |
   | Avg Commits/Session | N | ↑/↓/→ |
   ```
4. **Insights:** Wenn Corrections steigen → "Mehr Korrekturen als letzte Woche. /reflect ausfuehren."

## Regeln
- Nur lesen, nichts schreiben
- Bei leerer JSONL: "Noch keine Metriken. Starte Sessions um Daten zu sammeln."
- Trend = Vergleich letzte 5 Sessions vs. vorherige 5
