# Current Sprint — Jarvis Cortex v1

## Stand (2026-04-10, Session Ende — Market Polish + Bestand Tab)
- **Tests:** tsc CLEAN
- **Branch:** main (20 Commits diese Session gepusht)
- **Migrations:** 55 (1 neu: market_polish_dpc_to_scout_card_and_sponsors)
- **CI:** Build + Lint green, Tests haben pre-existierende Failures (nicht von dieser Session)

## Erledigt 2026-04-10 (Market Polish Sweep)

### Polish Pass 1 (Commit 4d4f4cc)
- DB: Mission-Texte "DPC" → "Scout Card" (3 Rows in mission_definitions)
- DB: 21 Platzhalter-Sponsoren deaktiviert (Visa, Adidas, Nike etc.)
- Code: Waehrungslabel "bC" → "CR" einheitlich (6 Stellen, 5 Dateien)
- Code: HOT-Badge von allen ClubCards entfernt

### Bestand-Tab — Neuer Default in "Mein Kader" (12 Commits)
- Portfolio-Header: Gesamtwert + SC-Count + P&L
- Spieler-Zeilen: KaderPlayerRow-Pattern (FormBars + L5 rechts oben)
- Positions-Streifen links (border-l-2, pos-tinted)
- Club-Logos neben Club-Name
- Trikotnummer (#XX) + Alter
- Icons: Pitch-SVG (Spiele), ⚽ (Tore), AssistIcon/blauer Schuh (Assists)
- StatusBadge (injured/suspended/doubtful)
- Position-Filter (PosFilter multi-select) + Club-Filter mit SC-Counts
- Pos-Counts passen sich an Club-Filter an
- Sell-Button ($): 3 Zustaende (rot=Nachfrage, gold=gelistet, grau=normal)
- Sell-Button oeffnet KaderSellModal direkt (kein Navigieren noetig)
- Nachfrage-Erkennung: Direct P2P Offers + Open Public Bids + Buy Orders
- Unit-Fix: floorMap ist BSD nicht Cents

### Globale Fixes
- FormBars: Reihenfolge oldest→newest (links→rechts) in getRecentPlayerScores
- Betrifft: Kader, Bestand, TransferList, FantasyPlayerRow

### Test-Daten erstellt (fuer QA)
- 4 P2P-Offers in offers-Tabelle (Eingehend/Ausgehend/Offen/Verlauf)
- 1 Sell-Order in orders-Tabelle (Szumski auf Transferliste)

## Naechste Session (Prioritaet)
1. **Watchlist von Mein Kader → Marktplatz verschieben** (Anil-Entscheidung)
2. **Marktplatz-Tab im Detail durchgehen** (Club Verkauf / Von Usern / Trending)
3. Danach: Fantasy (#3), Player Detail (#4), Profile (#5), Inventory (#6)

## Offene Punkte (Backlog)
- **FormBars Enrichment:** Gelb/Rot-Karten, Bank, Kader-Status visuell differenzieren (DB+RPC+Component Refactor) → memory/project_formbars_enrichment.md
- **Cross-Source Buy-Routing:** Automatisch guenstigste Quelle waehlen beim Kauf (IPO vs Transferliste) — aktuell getrennte Flows
- **Market Buy = 1 SC only:** Hardcoded im RPC, Bulk-Buy vom Markt nicht moeglich
