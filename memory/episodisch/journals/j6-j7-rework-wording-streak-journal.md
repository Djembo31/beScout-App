# Frontend Journal: J6+J7 Rework — Wording-Sweep + Streak-Migration

## Gestartet: 2026-04-14
## Reviewer-Findings (Commit 0501ae6) → Rework

### Verstaendnis
- ISSUE 1: 22+ user-facing Treffer gegen AR-17 Kapitalmarkt-Glossar (Portfolio, Trader, Einzahlen)
  → Files: messages/de.json, messages/tr.json
- ISSUE 2: Streak Source-of-Truth — useHomeData + useProfileData rufen noch `getLoginStreak()` Legacy
  → Files: src/app/(app)/hooks/useHomeData.ts, src/components/profile/hooks/useProfileData.ts (+ src/components/home/helpers.tsx pruefen)

### Risiken
- Wording-Sweep: Konsumenten-Code muss noch Keys auflösen (Grep nach `t('portfolioValue')` etc.). KEINE Key-Renames — nur VALUES anpassen.
- TR-Strings sind Schwachpunkt — analog zum AR-17 Glossar (Koleksiyon, Kadro, Scout, Koleksiyoncu).
- Streak: useLoginStreak Hook muss in Hook-Context aufrufbar sein, sonst Hybrid mit Doku.

### Entscheidungen
| # | Entscheidung | Warum |
|---|--------------|-------|
| 1 | Nur VALUES aendern, KEINE Keys umbenennen | Code-intern bleibt "portfolio" wie business.md sagt |
| 2 | Heuristik anwenden: Invest-Framing → Sammlung/Kader; Spieler-Kader-Kontext → Kader | AR-17 Tabelle |
| 3 | "Einzahlen"/"deposit" entfernen wenn moeglich (Phase 1 = closed economy, kein Cash-In) | business.md |
| 4 | useHomeData + useProfileData → useLoginStreak Hook (beide sind Custom-Hooks selbst) | Hook-in-Hook OK |
| 5 | helpers.tsx → KEIN Hook-Context (sync helper), bleibt localStorage-Fallback mit Doku | Sync-only fuer Server-Render |

### Fortschritt
- [ ] DE: Portfolio-Sweep (Invest-Framing → Sammlung; Kader-Kontext → Kader)
- [ ] DE: Trader-Sweep (Score/Dimensions/Tabs)
- [ ] DE: Einzahlen-Removal
- [ ] TR: Portfolio-Sweep (Koleksiyon/Kadro)
- [ ] TR: Trader-Sweep (Scout/Koleksiyoncu)
- [ ] TR: Yatır-Removal
- [ ] useHomeData: getLoginStreak → useLoginStreak
- [ ] useProfileData: getLoginStreak → useLoginStreak
- [ ] helpers.tsx: Doku-Kommentar warum Hybrid
- [ ] tsc CLEAN
- [ ] vitest green

### Runden-Log
