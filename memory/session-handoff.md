# Session Handoff
## Letzte Session: 2026-03-18 (Session 241)
## Was wurde gemacht

### Performance Overhaul v2 (5 Phasen, KOMPLETT)
- P1-P5 komplett: Query Fundamentals, Service Layer, RPCs, React Rendering, Bundle
- Design + Plan Docs in `docs/plans/2026-03-18-performance-overhaul-v2-*`

### Query Key Integrity Fix
- 5 orphaned raw query keys → qk Factory, Invalidation erweitert
- Metadata photo_url → image_url fix

### API-Football Data Integrity (Audit + Fix)
- Scoring unified (Rating×10 + scaleFormulaToRating Fallback)
- cron_recalc_perf: total_minutes, total_saves, matches aggregiert
- 5 defensive Guards (Ghost Starter, Grid, Position, Name-Disambig, Ambiguity)
- DB Reparatur: 15 excess Starters, 252 Formula-Scores skaliert

### Spieler-Daten Recovery
- 56 fehlende Spieler aus orphaned API-Stats erstellt + External-IDs registriert
- 700 Stats zugeordnet (704 → 4 Orphans)
- last_appearance_gw auf allen Spielern korrigiert (131 → 0 Gaps)
- L5/L15 + Season Stats komplett neu berechnet (663 Spieler)

### Match Timeline: Alle GWs anzeigen
- getPlayerMatchTimeline zeigt ALLE Club-Fixtures (played/bench/not_in_squad)
- MatchTimeline + TradingCardFrame Card Back konsistent aktualisiert
- Nur Fakten, kein Raten bei Abwesenheitsgrund

### Reward-Treppe Fix
- Aktiver Tier zeigte Tier-MAX (300K) statt echten Marktwert (100K) → gefixt

## NAECHSTE SESSION: Pricing & Market Architecture (KRITISCH)

### Problem (Session 241 Analyse)
- 0 aktive Orders, 0 aktive IPOs, nur 47 je gehandelte Spieler
- Floor Price ist synthetisch (MV/10), nicht marktbasiert
- 351 Spieler haben Floor der nicht zum aktuellen MV passt
- User kann nicht erkennen ob Angebote/Gesuche existieren
- Kein klares "verfuegbar ab X" vs "letzter Preis" vs "noch nie gehandelt"

### Was gebaut werden muss (Anils Vision)
- **Preis-Anzeige Hierarchie:** MIN(Sell-Orders, IPO) → Last Trade → "Noch kein Handel"
- **Markt-Indikatoren:** IPO aktiv, X Angebote, X Gesuche, Kein Angebot
- **Betrifft:** ALLE Componenten (PlayerRow, PlayerHero, Card, Market, Home, Fantasy)
- **Betrifft:** Order Flow, Buy/Sell Flow, Geld-Transfer, Reward-Berechnung
- **MUSS volle Pipeline:** Brainstorming → Impact → Spec → Plan → Execution
- **KEIN Quick Fix** — ultrathink, alles aufeinander abgestimmt

## Offene Arbeit
1. **Pricing & Market Architecture** ← NAECHSTE PRIORITAET
2. Admin i18n Rest (~80 Strings)
3. Stripe (wartet auf Anils Account)
4. 4 verbleibende orphaned fixture_player_stats

## Blocker
- Keine
