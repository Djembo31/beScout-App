# BeScout — Gamification Spezifikation v4.0 (FINAL)

> **Version:** 4.0 — Finale, implementierbare Referenz
> **Status:** Ersetzt ALLE vorherigen Gamification-Dokumente (v1, v2, v3)
> **Grundlage:** Eigene Architektur + ChatGPT Game-Design Review + Gemini Verhaltensökonomie-Analyse + Konkurrenz-Analyse (Sorare, Socios, OneFootball, FPL, Club-Apps) + Founder-Entscheidungen
> **Sprachen Pilot:** Türkisch, Deutsch, Englisch
> **Clubs Pilot:** 20 Vereine der TFF 1. Lig

---

## KAPITEL 0: WAS BESCOUT IST

### Kern-Identität (1 Satz)

**BeScout ist Fantasy-Football mit einem echtem Markt.**

Das sagt der User seinem Freund. Nicht "Reputationsplattform", nicht "Crypto-App", nicht "Fan-Tool". Fantasy-Football mit echtem Markt. Punkt.

### Was das bedeutet

Du stellst dein Team auf (Fantasy). Du kaufst und verkaufst Spieler-Karten mit einer In-App-Währung (Markt). Dein Score beweist ob du Ahnung hast — und er kann FALLEN.

Aber darunter liegt etwas Tieferes: **BeScout macht Fußball-Schauen besser**. Wenn du vor dem Spiel Predictions gestellt hast, schaust du anders. Aufmerksamer. Emotionaler. Du fieberst nicht nur mit deinem Team — du fieberst mit deiner EINSCHÄTZUNG. Das ist "Consumption Capital" (Stigler/Becker): Je mehr du durch BeScout lernst, desto mehr Freude hast du am Sport.

### Die 5 Design-Regeln

```
REGEL 1: SKILL ÜBER GRIND
Score steigt wenn du RECHT hast, nicht wenn du AKTIV bist.
100 falsche Predictions < 5 richtige Predictions.

REGEL 2: VERLUST ÜBER GEWINN
Score kann SINKEN. Rang kann FALLEN. Streak kann BRECHEN.
Das erzeugt mehr Engagement als jede Belohnung.
Verlustaversion (Kahneman/Tversky) ist der stärkste Trigger.
ABSOLUT ZENTRAL. Wer das nicht will, ist nicht unsere Zielgruppe.

REGEL 3: SOFORT ÜBER SPÄTER
Jede Aktion hat ein Ergebnis innerhalb von 24 Stunden.
Predictions lösen das Delayed-Feedback-Problem.

REGEL 4: SCOUTING ÜBER TRADING (Anti-Diablo-III)
Gute Predictions müssen IMMER mehr Score bringen als gute Trades.
Score-Ratio: 60% Predictions/Fantasy, 40% Trades.

REGEL 5: FAIRNESS ÜBER MONETARISIERUNG
Free User KANN alles erreichen. DPC = Vorteil, nicht Voraussetzung.
BSD kann mit echtem Geld gekauft werden — aber auch komplett verdient.
```

### BeScout als Plattform-Ökosystem

BeScout ist wie Amazon für Fußballvereine. Jeder Club hat seinen eigenen "Store" (DPCs, Events, Abos), aber die Plattform (Markt, Score, Fantasy) ist gemeinsam. Im Pilot: Alle 20 TFF 1. Lig Vereine.

---

## KAPITEL 1: EIN TAG AUF BESCOUT

### Spieltag (Samstag)

```
07:30 — PUSH (wenn User es erlaubt hat):
         "Spieltag! Sakaryaspor vs Kocaelispor, 19:00.
         Lineup-Lock: 18:30. Manager Score: 1.847 (Gold I)"

08:15 — USER ÖFFNET APP:
         ┌──────────────────────────────────────────────┐
         │  Scout Score                                  │
         │  Trader: 1.847 (Gold I)     🏷️ "Top Trader" │
         │  Manager: 2.103 (Gold III)                    │
         │  Analyst: 956 (Bronze III)                    │
         │  Gesamt-Rang: GOLD I (Median)     Top 28%    │
         │                                               │
         │  🔥 Login Streak: Tag 12                      │
         │  ⭐ Airdrop Score: 4.291 (+47 gestern)       │
         │                                               │
         │  📋 SPIELTAG HEUTE:                           │
         │  Sakaryaspor vs Kocaelispor, 19:00            │
         │  + 4 weitere TFF 1. Lig Spiele               │
         │  Lineup: ⚠️ Noch nicht gesetzt                │
         │  Predictions: 0/5 gestellt                    │
         └──────────────────────────────────────────────┘

08:17 — PREDICTIONS STELLEN (3 Klicks pro Prediction):
         "Barış: >1 Tor" → Confidence 75% → ✅ Gestellt
         "Sakaryaspor gewinnt" → Confidence 60% → ✅ Gestellt
         "Über 2.5 Tore" → Confidence 55% → ✅ Gestellt
         → Sofort: +3 Airdrop Score pro Prediction (+9 total)
         → Predictions sind PRIVAT — nur der User selbst sieht sie
         → Erst NACH Auflösung werden sie öffentlich sichtbar

08:22 — LINEUP SETZEN (separat von Predictions):
         5 Spieler aus TFF 1. Lig wählen (alle 20 Clubs)
         DPC-Besitz gibt Boost (×1.3 bis ×1.8 je nach Mastery)
         Captain wählen (×1.5 Punkte)
         → Sofort: +3 Airdrop Score

08:25 — MARKT CHECKEN:
         DPC-Preise scannen. Ahmet DPC günstig?
         → Kaufen für 1.200 BSD. Mastery Level 1 sofort.

08:30 — FEED CHECKEN:
         Mehmets Analyse lesen, liken
         Leaderboard: Rang 14 von 387 Sakaryaspor-Fans
         → App schließen. 15 Minuten. Zufrieden.

19:00 — SPIEL LÄUFT. User schaut. App bleibt zu.
         ABER: Er schaut ANDERS. "Barış, TRIFF!"

21:15 — PUSH: "Sakaryaspor 2-1! 🎉
         Lineup: 74 Punkte (Top 18%) → Manager +32
         Prediction ✅ Barış >1 Tor → Analyst +10
         Prediction ✅ Sakaryaspor gewinnt → Analyst +6
         Prediction ❌ Über 2.5 Tore → Analyst -3"
         → Predictions werden jetzt ÖFFENTLICH sichtbar

21:20 — USER ÖFFNET APP:
         Results-Screen mit Animation:
         ├── Lineup Breakdown (Punkte pro Spieler)
         ├── Prediction Results (2/3 richtig, Score +13)
         ├── DPC Markt: Barış DPC +15%
         ├── Leaderboard: Rang 14 → 11 (↑3!)
         └── Achievement: "Crystal Ball" 🏆
```

### Nicht-Spieltag (Dienstag)

```
12:00 — PUSH: "Markt-Prediction läuft morgen ab:
         'Barış DPC steigt >10% in 7 Tagen' — aktuell: +7%."

12:15 — USER ÖFFNET APP:
         ├── Markt-Predictions: 1 läuft noch
         ├── Neue Markt-Prediction stellen (max 3/Woche)
         ├── Feed: 2 neue Analysen lesen
         ├── Leaderboard: Stabil Rang 11
         └── DPC-Trading: Ahmet DPC +8% seit Kauf
         → 5 Minuten. Score bewegt sich trotzdem.
```

### Sommerpause / Länderspielpause

```
DAS PROBLEM: Keine Liga-Spiele = kein Fantasy = kein Spieler-Predictions.

LÖSUNG — 3 Aktivitäts-Ebenen die IMMER laufen:

1. MARKT-PREDICTIONS (laufen IMMER):
   ├── "Welche DPC steigt/fällt in 7 Tagen?"
   ├── Transfer-Predictions: "Welcher Spieler wechselt?"
   └── → Trader Score bewegt sich IMMER

2. COMMUNITY / CONTENT (laufen IMMER):
   ├── Analysen, Bounties, Polls
   └── → Analyst Score bewegt sich

3. SAISONALE EVENTS (BeScout-gesteuert):
   ├── "Transfer Window Challenge"
   ├── "Pre-Season Scout: Bewerte alle 20 Kader"
   ├── "New Talent IPO" (Neuzugänge)
   └── → Hält Loop am Leben

MANAGER SCORE IN DER PAUSE:
├── KEIN Absent-Penalty wenn keine Liga-Spiele
├── Manager Score ist "eingefroren"
└── Freundschaftsspiele/Pokal optional (halbe Wertigkeit)
```

---

## KAPITEL 2: DER SCOUT SCORE

### Architektur — 3 Dimensionen

```
┌─────────────────────────────────────────────────────────┐
│                     SCOUT SCORE                          │
│                                                          │
│  ┌───────────┐  ┌───────────┐  ┌───────────────┐       │
│  │  TRADER   │  │  MANAGER  │  │   ANALYST     │       │
│  │   1.847   │  │   2.103   │  │     956       │       │
│  │  Gold I   │  │ Gold III  │  │  Bronze III   │       │
│  └───────────┘  └───────────┘  └───────────────┘       │
│                                                          │
│  Gesamt-Rang: GOLD I (Median der 3)                     │
│  Titel: 🏷️ "Top Trader" (stärkste Dimension)           │
│  Airdrop Score: 4.291                                    │
└─────────────────────────────────────────────────────────┘
```

### Dynamische Titel

Der User bekommt automatisch einen Titel basierend auf seiner STÄRKSTEN Dimension. Der Titel ändert sich wenn sich die stärkste Dimension ändert.

```
TITEL-SYSTEM:

Stärkste Dimension = TRADER:
├── Bronze: "Rookie Trader"
├── Silber: "Smart Money"
├── Gold:   "Top Trader"
├── Diamant: "Market Shark"
├── Mythisch: "Trading Legend"
└── Legendär: "The Wolf"

Stärkste Dimension = MANAGER:
├── Bronze: "Rookie Manager"
├── Silber: "Taktiker"
├── Gold:   "Top Manager"
├── Diamant: "Mastermind"
├── Mythisch: "Fantasy Legend"
└── Legendär: "The Boss"

Stärkste Dimension = ANALYST:
├── Bronze: "Rookie Analyst"
├── Silber: "Sharp Eye"
├── Gold:   "Top Analyst"
├── Diamant: "Oracle"
├── Mythisch: "Prediction Legend"
└── Legendär: "The Prophet"

Bei Gleichstand: Titel der Dimension mit MEHR Score-Events (aktiver genutzt).
Titel ist sichtbar: Profil, Leaderboard, Feed-Posts, Predictions.
```

### Ränge

```
RANG         PUNKTE        BADGE
────────────────────────────────
Bronze I     0-299         🟤
Bronze II    300-599       🟤🟤
Bronze III   600-999       🟤🟤🟤
Silber I     1.000-1.399   ⚪
Silber II    1.400-1.799   ⚪⚪
Silber III   1.800-2.199   ⚪⚪⚪
Gold I       2.200-2.799   🟡
Gold II      2.800-3.399   🟡🟡
Gold III     3.400-3.999   🟡🟡🟡
Diamant      4.000-4.999   💎
Mythisch     5.000-6.999   🔮
Legendär     7.000+        👑

STARTWERT: 500 (Bronze II) pro Dimension
→ User hat sofort etwas zu verlieren. Das ist gewollt.

GESAMT-RANG: Median der 3 Einzel-Ränge
→ Gold / Gold / Bronze = Gesamt: Gold
→ Diamant / Bronze / Bronze = Gesamt: Bronze
→ Fair: Belohnt Balance
```

### 2.1 TRADER SCORE

Misst: Erkennst du Marktwert? Kaufst und verkaufst du zur richtigen Zeit?

```
STEIGT DURCH:                                           PUNKTE

Profitabler Trade (Verkauf > Kauf + Fees)               +10 bis +40
├── Skaliert mit Netto-Profit-Margin
├── Min Holding Period: 24h (Anti-Wash-Trading)
└── Nur realisierter Profit nach Fees

Markt-Prediction richtig                                +8 bis +15
├── Basis × Confidence × Schwierigkeit
└── DAS ist der tägliche Feedback-Loop für Trader

IPO Early Mover (Spieler steigt >15% in 30 Tagen)      +15
DPC kaufen <48h vor Match + Spieler Rating >7.0         +10


SINKT DURCH:                                            PUNKTE

Verlust-Trade                                           -8 bis -25
Markt-Prediction falsch                                 -5 bis -10
Panik-Verkauf (<24h nach Kauf mit Verlust)              -15
14 Tage kein Trade UND keine Markt-Prediction           -5

SCORE-RATIO: ~60% Predictions + ~40% echte Trades
```

### 2.2 MANAGER SCORE

Misst: Stellst du das richtige Team auf?

```
STEIGT DURCH:                                           PUNKTE

Fantasy Event Top-Platzierung                           +10 bis +40
├── Top 1%: +40, Top 10%: +25, Top 25%: +10

Lineup vor Deadline gesetzt (>2h)                       +3
5 Spieltage in Folge Lineup gesetzt                     +10


SINKT DURCH:                                            PUNKTE

Fantasy Event Bottom 30%                                -10 bis -20

KEIN Lineup an aktivem Spieltag:
├── Erste 30 Tage nach Signup: -5 (milder Newbie-Penalty)
├── Ab Tag 31: -10 (Standard-Penalty)
├── Push 4h vor Deadline (wenn User Push erlaubt hat)
└── DAS ist einer der stärksten Retention-Trigger

Spieler in Lineup hat Rating <4.5                       -3 pro Spieler

KEINE Penalties während Pausen (Länderspiel/Sommer)
```

### 2.3 ANALYST SCORE

Misst: Verstehst du Fußball? Hast du mit deinen Einschätzungen recht?

```
GRUNDPRINZIP:
├── Primär: Prediction-Accuracy (70%)
├── Sekundär: Content-Reputation (30%)
└── "Stiller Experte" (nie postet, immer richtig) > "Lauter Analyst" (viel postet, oft falsch)


STEIGT DURCH:                                           PUNKTE

Spieler/Match-Prediction richtig                        +8 bis +15
├── Basis(+10) × Confidence × Schwierigkeit

Prediction Streak (3+ richtige in Folge)                +5 Bonus/Prediction

Post bekommt Likes                                      +1 pro Like (max +15)
Bounty abgeschlossen                                    +10 bis +25
Neuer Follower                                          +2


SINKT DURCH:                                            PUNKTE

Prediction falsch                                       -5 bis -10
├── Basis(-6) × Confidence

Post mit >3 Downvotes                                   -2 pro Downvote über 3
30 Tage keine Prediction und kein Content               -8
```

### 2.4 Prediction-Score-Routing

```
Jede Prediction zählt für GENAU EINEN Score:

MATCH-PREDICTION (Ergebnis, Tore, etc.)     → ANALYST SCORE (immer)
SPIELER-PREDICTION                          → ANALYST SCORE (immer)
MARKT-PREDICTION (DPC-Preis, Volumen)       → TRADER SCORE (immer)

FANTASY LINEUP ERGEBNIS                     → MANAGER SCORE (immer)
```

### 2.5 Newbie Protection (Erste 30 Tage)

Statt einem Recovery-System für alle User gibt es Schutz NUR für Newbies. Nach 30 Tagen: kein Schutz mehr. Du stehst zu deinem Score.

```
NEWBIE PROTECTION (Tag 1-30 nach Signup):

├── Absent-Penalty ist mild (-5 statt -10)
├── Prediction-Suggestions enthalten mehr leichte Optionen
├── Bei 5+ falschen Predictions in Folge:
│   ├── "Comeback Kid" Achievement möglich (+25 Bonus für 3 richtige danach)
│   ├── Push-Ton ist ermutigend statt drückend
│   └── Endet automatisch nach 3 richtigen in Folge
├── Score kann nicht unter 200 fallen (Sicherheitsnetz)
└── Sichtbar: "🛡️ Newbie Protection — noch X Tage"

NACH TAG 30:
├── Kein Schutz. Score kann bis 0 fallen.
├── Kein Recovery Mode.
├── Absent-Penalty voll aktiv (-10)
└── "Du bist jetzt ein echter Scout. Dein Score lügt nicht."
```

### 2.6 Season Reset

```
WANN: Ende der Fußball-Saison (Mai/Juni)

TRADER SCORE: Soft Reset
├── Überschuss über Rang-Minimum wird halbiert
└── Gold III (3.400) mit 4.200 → neuer Score: 3.800

MANAGER SCORE: Hard Reset auf 500
├── Neue Saison = neues Team = bei Null
└── Fairer Neustart

ANALYST SCORE: KEIN Reset
├── Reputation ist langfristig
└── Veteranen haben Prestige

SEASON BADGE: Permanentes Archiv auf Profil
└── "Season 1: Gold Trader 🏷️ Market Shark, Diamant Manager, Silber Analyst"
```

---

## KAPITEL 3: DIE PREDICTION ENGINE

### Was ist eine Prediction?

Eine strukturierte Vorhersage. Kein Freitext — vordefinierte Bedingungen, 3 Klicks. **Privat bis zur Auflösung** — kein anderer User sieht deine Prediction vorher. Erst wenn das Ergebnis feststeht, werden Predictions öffentlich. Das verhindert Nachahmer und erzeugt den "Aha!"-Moment bei Auflösung.

```
PREDICTION-TYPEN:

1. SPIELER-PREDICTION (→ Analyst Score):
   ├── Tore: 0 / 1 / 2+
   ├── Assists: 0 / 1+
   ├── Rating: >6.0 / >7.0 / >8.0
   ├── Clean Sheet (Keeper/Verteidiger): Ja / Nein
   ├── Karten: Gelb / Rot / Keine
   └── Minuten: >60 / Startet / Bank

2. MATCH-PREDICTION (→ Analyst Score):
   ├── Ergebnis: Heim / Unentschieden / Auswärts
   ├── Tore: Über 2.5 / Unter 2.5
   ├── Beide treffen: Ja / Nein
   └── Halbzeit-Ergebnis: Heim / Unentschieden / Auswärts

3. MARKT-PREDICTION (→ Trader Score):
   ├── DPC Preisänderung: >10% / >20% in 7 Tagen
   ├── Meistgehandelte DPC der Woche
   └── IPO ausverkauft innerhalb 48h: Ja / Nein
```

### Prediction-Mechanik

```
JEDE PREDICTION HAT:
├── Typ (Spieler / Match / Markt)
├── Bedingung (aus Dropdown, NICHT Freitext)
├── Confidence: 50-100% (Slider)
├── Deadline: Vor Spielbeginn oder Fenster-Ende
├── Sichtbarkeit: PRIVAT bis Auflösung, dann ÖFFENTLICH
└── Ergebnis: Richtig / Falsch / Ungültig

SCORING:

Richtig: +10 × (Confidence/100) × Schwierigkeit
Falsch:  -6  × (Confidence/100) × Schwierigkeit

Schwierigkeit (automatisch):
├── 0.5 = Leicht (Favorit gewinnt)
├── 1.0 = Mittel (ausgeglichenes Match)
└── 1.5 = Schwer (Außenseiter, seltenes Event)

LIMITS:
├── Max 5 Predictions pro Spieltag (alle Spiele zusammen)
├── Max 3 Markt-Predictions pro Woche
├── Min Confidence: 50%
├── Predictions <5min vor Deadline: halber Score
└── Ungültige Matches: Prediction storniert, kein Score-Effekt
```

### Predictions & Fantasy sind GETRENNT

```
WICHTIG: Predictions und Fantasy Lineup sind ZWEI SEPARATE SYSTEME.

├── Predictions werden im "Predictions"-Tab gestellt
├── Fantasy Lineup wird im "Fantasy"-Tab gesetzt
├── Keine automatischen Prediction-Vorschläge beim Lineup setzen
├── User entscheidet selbst was und wann er predicted
└── Das hält beide Systeme sauber und unabhängig

WARUM GETRENNT:
├── Einfacher zu verstehen ("Predictions = Vorhersagen, Fantasy = Team aufstellen")
├── User die nur Fantasy spielen werden nicht zu Predictions gedrängt
├── User die nur predicten haben ihren eigenen Flow
└── Weniger Complexity = besseres Onboarding
```

### Predictions im Profil

```
PROFIL-SEKTION "Predictions" (nach Auflösung öffentlich):

Season 1:
├── Gestellt: 47
├── Richtig: 29 (61.7%)
├── Bester Streak: 🔥 7
├── Stärke: Tor-Predictions (72%)
├── Schwäche: Match-Ergebnisse (48%)
└── Spieler-Expertise: "Barış-Kenner: 8/10 richtig"

→ PROFIL ERZÄHLT EINE GESCHICHTE
→ Andere sehen deine aufgelösten Predictions + Accuracy
→ DAS ist messbare, sichtbare Reputation
```

### Gambling-Abgrenzung

```
Gambling = Einsatz + Zufall + Preis

├── Einsatz: Predictions kosten NICHTS (0 BSD, 0 Geld) → fehlt
├── Preis: Score-Punkte haben keinen Geldwert
│   BSD-Reward für STELLEN (Aktion), nicht für RICHTIG-Haben
└── POST-$SCOUT RISIKO:
    ├── Airdrop Score → $SCOUT Menge → indirekter Wert
    ├── MUSS im Legal Opinion abgedeckt werden
    └── Anwalt-Bestätigung: NICHT VERHANDELBAR
```

---

## KAPITEL 4: DAS EVENT-SYSTEM

### Architektur — 4 Event-Typen

BeScout ist wie Amazon für Vereine. Das Event-System steuert die Nachfrage nach DPCs und bindet Fans an ihre Clubs. Es gibt 4 Event-Typen mit unterschiedlichen Zwecken:

```
┌──────────────────────────────────────────────────────────────────┐
│                        EVENT-HIERARCHIE                          │
│                                                                  │
│  1. BESCOUT STANDARD EVENTS                                     │
│     └── Jeder Spieltag der TFF 1. Lig = 1 Standard Fantasy Event│
│     └── Laufen automatisch, sind der Kern-Loop                  │
│     └── Bestimmen den Manager Score                             │
│                                                                  │
│  2. BESCOUT SPECIAL EVENTS                                      │
│     └── Von BeScout kuratiert (z.B. "Derby Week", "Saisonstart")│
│     └── Leichter Einfluss auf Score (Bonus, kein Malus)         │
│     └── Erzeugen Buzz und Viralität                             │
│                                                                  │
│  3. SPONSOR EVENTS                                              │
│     └── Gesponserte Events (z.B. "Hisense Prediction Challenge")│
│     └── BSD-Preise, Sponsor-Badges                              │
│     └── Revenue-Stream für BeScout                              │
│                                                                  │
│  4. CLUB EVENTS                                                 │
│     └── Vom Club erstellt (im Pilot: manuell durch Founder)     │
│     └── Spieler-/Club-spezifisch                                │
│     └── STEUERN DIE NACHFRAGE NACH SPEZIFISCHEN DPCs           │
│     └── Das Amazon-Prinzip: Jeder Club promotet seine "Produkte"│
└──────────────────────────────────────────────────────────────────┘
```

### 1. BeScout Standard Events

```
WAS: Automatische Fantasy-Events für jeden TFF 1. Lig Spieltag.

FREQUENZ: Jeder Spieltag (ca. 34 pro Saison, 10 Spiele pro Spieltag)

MECHANIK:
├── Alle 20 Clubs spielen → alle User können Lineup stellen
├── 5 Spieler aus ALLEN 20 Clubs wählen (liga-weit)
├── Standard Fantasy Scoring (Tore, Assists, Clean Sheets etc.)
├── Ergebnis bestimmt Manager Score (+10 bis +40 / -10 bis -20)
└── Leaderboard pro Club + Liga-weit

SCORE-EINFLUSS: VOLL (steigt UND sinkt)
```

### 2. BeScout Special Events

```
WAS: Von BeScout kuratierte Themen-Events.

BEISPIELE:
├── "Derby Week" — Extra-Punkte für Derby-Predictions
├── "Saisonstart Challenge" — 10 Predictions über Saisonstart
├── "Transfer Window" — Predictions über Transfers (Sommerpause)
├── "Top Scorer Race" — Wer wird Torschützenkönig?
├── "Aufstiegs-Endspurt" — Letzte 5 Spieltage Special Event

FREQUENZ: 1-2 pro Monat (saisonal angepasst)

SCORE-EINFLUSS: LEICHT (Bonus bei Teilnahme, kein Malus bei Nicht-Teilnahme)
├── +5 Airdrop Score für Teilnahme
├── +10-25 Analyst Score bei guter Performance
├── BSD-Rewards für Top-Platzierungen
└── Keine Score-Strafe wenn nicht teilgenommen
```

### 3. Sponsor Events

```
WAS: Events die von Sponsoren finanziert werden.

BEISPIELE:
├── "Hisense Prediction Challenge" — Predictions mit Sponsor-Branding
├── "Pepsi Best XI" — Lineup der Woche, Sponsor-Badge
├── "Türk Telekom Scout Award" — Monatlicher Top-Scorer Prize

FREQUENZ: Abhängig von Sponsoring-Deals

MECHANIK:
├── Standard-Predictions/-Fantasy, aber mit Sponsor-Branding
├── Extra BSD-Preise (finanziert durch Sponsor)
├── Sponsor-Badge (temporär, für Event-Teilnehmer)
└── Sponsor sieht Engagement-Daten (anonymisiert)

SCORE-EINFLUSS: KEINER auf Scout Score
├── Nur BSD-Rewards und Badges
├── Airdrop Score +3 für Teilnahme
└── Kein Einfluss auf Trader/Manager/Analyst
```

### 4. Club Events

```
WAS: Vom Club erstellte Events, die GEZIELT die Nachfrage
nach bestimmten Spieler-DPCs steuern.

DAS AMAZON-PRINZIP:
Wenn 20 Clubs auf BeScout sind und Galatasaray launcht,
verlieren kleine Clubs Aufmerksamkeit. Club Events sind der
Ausgleich: Jeder Club kann seine "Produkte" (DPCs) promoten.

BEISPIELE:
├── "Barış Week" — Alle Predictions über Barış geben doppelt BSD
│   → DPC-Nachfrage für Barış steigt
├── "Neuzugang Challenge" — IPO eines neuen Spielers + Event
│   → Treibt IPO-Verkäufe
├── "Captain's Choice" — Wer soll Captain sein? Fan-Vote
│   → Engagement mit Club-DPCs
├── "Clean Sheet Challenge" — Keeper/Verteidiger DPCs im Fokus
│   → Nachfrage für Defensiv-DPCs steigt

FREQUENZ: Club entscheidet (im Pilot: Founder erstellt manuell)

SCORE-EINFLUSS: LEICHT
├── +5-10 Analyst Score bei guter Performance
├── Extra BSD-Rewards (aus Club-Budget oder BeScout-Budget)
├── DPC-Mastery-Bonus: +1 extra Fantasy-Einsatz wenn Event-DPC im Lineup
└── Kein Score-Malus bei Nicht-Teilnahme

IM PILOT: Alle Events werden manuell durch den Founder erstellt.
PHASE 2+: Club-Dashboard mit Self-Service Event-Erstellung.
```

---

## KAPITEL 5: FANTASY — DAS HYBRID-MODELL

```
FREE LINEUP (für JEDEN User):
├── Wähle 5 Spieler aus ALLEN 20 TFF 1. Lig Clubs
├── Keine DPC nötig — jeder kann mitspielen
├── Standard Fantasy Scoring basierend auf Match-Daten
├── Manager Score steigt/sinkt basierend auf Platzierung
└── Einstiegshürde = NULL

DPC BOOST (für DPC-Besitzer):
├── Spieler in Lineup den du als DPC besitzt:
│   ├── Mastery 1-2: Fantasy-Punkte ×1.3
│   ├── Mastery 3-4: Fantasy-Punkte ×1.5
│   └── Mastery 5: Fantasy-Punkte ×1.8
├── Manager Score Bonus: +2 Extra pro besessenen Lineup-Spieler
└── Mastery-Progress: +1 Fantasy-Einsatz

LINEUP-REGELN:
├── 5 Spieler pro Lineup (liga-weit, alle 20 Clubs)
├── 1 Captain: Punkte ×1.5
├── Deadline: 30 Minuten vor Spielbeginn
├── Auto-Lineup: System setzt Best Available
│   ABER: Auto-Lineup gibt nur 80% der Punkte
└── Kein Tausch nach Deadline
```

---

## KAPITEL 6: DPC MASTERY

```
LEVEL 1 — BESITZER: Sofort bei Kauf
LEVEL 2 — BEOBACHTER: 7 Tage + 1 Fantasy-Einsatz (~1 Woche)
LEVEL 3 — KENNER: 30 Tage + 3 Fantasy-Einsätze + 1 Prediction
           PBT-berechtigt, Expert-Badge auf Predictions
LEVEL 4 — EXPERTE: 90 Tage + 10 Fantasy-Einsätze + 3 richtige Predictions
           PBT 3x, Predictions prominent im Feed
LEVEL 5 — LEGENDE: 180 Tage + 20 Fantasy-Einsätze + Top 10% Mastery
           PBT 10x, "Master Scout" Tag

BEI VERKAUF:
├── Mastery EINGEFROREN (nicht gelöscht)
├── Profil: "Ehemals Level 4 für Barış"
├── Rückkauf: Timer setzt fort
└── PBT stoppt sofort
```

---

## KAPITEL 7: AIRDROP SCORE

$SCOUT wird erwähnt, aber nicht als Hauptversprechen. Fokus auf Gameplay.

```
DOPPELFUNKTION:

1. TOKEN-HINWEIS (subtil):
   "Dein Airdrop Score bestimmt deinen $SCOUT-Anteil — wenn $SCOUT launcht."
   → Kein Countdown. Kein Hype. Nur eine Info-Zeile.

2. LIVE-UTILITY (sofort, DAS ist der Fokus):
   Score > 500:    Early IPO Zugang (6h vor öffentlichem IPO)
   Score > 1.000:  "Insider" Badge
   Score > 2.500:  Stimme zählt 2x bei Community-Votes
   Score > 5.000:  Beta Features
   Score > 10.000: "OG Scout" Badge (permanent)
   Top 10 im Club: "Club Wall of Fame" (permanent)

BERECHNUNG (nightly batch, 02:00):

Airdrop Score = Scout + Mastery + Activity × Multiplier

Scout-Komponente:
├── Pro Dimension: Rang × Faktor
│   Bronze=1, Silber=2, Gold=4, Diamant=8, Mythisch=16, Legendär=32
├── Täglicher Zuwachs = Summe der 3 Rang-Faktoren
└── Beispiel: Gold(4)+Gold(4)+Silber(2) = 10/Tag

Mastery-Komponente:
├── Summe aller DPC Mastery-Levels × 10
└── Beispiel: 8 DPCs, Levels 1,2,2,3,3,4,4,5 = 240 (einmalig + 5%/Tag)

Activity-Komponente:
├── Login +5, Prediction +3, Lineup +5, Trade +3, Content +5
├── Referral +100 (User 7 Tage aktiv)
└── WEEKLY CAP: Max 500 aus Activity (Anti-Farm)

Multiplier:
├── Founding Scout (erste 50): 3x
├── Early Adopter (51-500): 2x
├── Club Abo Bronze: 1.2x, Silber: 1.5x, Gold: 2x
```

---

## KAPITEL 8: BSD-ÖKONOMIE

### Kern-Prinzipien

```
1. DPCs kosten NUR BSD (kein echtes Geld im Pilot)
2. BSD kann mit echtem Geld GEKAUFT werden (beschleunigt, gatekeept nicht)
3. BSD kann auch komplett VERDIENT werden (Free-to-Play bleibt möglich)
4. User-zu-User DPC-Trading ist ab Pilot LIVE
5. Ökonomie-Ziel: 1-2 Monate sparen für Rare DPC = KNAPPHEIT
```

### BSD-Quellen

```
STARTER: 1.000 BSD (einmalig)

TÄGLICHE QUELLEN (aktiver User):
├── Login: 20 BSD
├── Predictions gestellt (bis 5): 10 BSD/Stück = max 50 BSD
├── Fantasy Lineup gesetzt: 30 BSD
├── Trade ausgeführt: 20 BSD/Trade (max 3/Tag = 60 BSD)
├── Content gepostet: 30 BSD
├── Prediction richtig: 20 BSD/Stück
└── BSD = Belohnung für AKTIONEN, Score = Belohnung für ERGEBNISSE

Ø AKTIV: 100-200 BSD/Tag
SEHR AKTIV: 250-350 BSD/Tag
MAX: ~400 BSD/Tag

WEEKLY CAP: 5.000 BSD (Anti-Bot)

WÖCHENTLICHE BONI:
├── Login Streak Tag 7: 100 BSD
├── 5 Spieltage Lineup: 150 BSD
└── Fantasy Top 10%: 200 BSD

Ø USER/MONAT: 3.000-6.000 BSD
SEHR AKTIV/MONAT: 8.000-12.000 BSD
```

### BSD mit echtem Geld kaufen

```
BSD-SHOP (im Pilot):
├── 1.000 BSD = ~€1
├── 5.000 BSD = ~€4.50 (10% Bonus)
├── 15.000 BSD = ~€12 (20% Bonus)
├── 50.000 BSD = ~€35 (30% Bonus)
└── Zahlung: Kreditkarte, Google Pay, Apple Pay

WARUM DAS FAIR IST:
├── BSD-Käufer beschleunigen, haben aber keinen Skill-Vorteil
├── DPC-Besitz gibt Fantasy-Boost, aber Free User kann trotzdem gewinnen
├── Score steigt NUR durch Können, nicht durch BSD-Kauf
├── BSD kaufen = mehr DPCs = mehr Mastery = mehr Airdrop Score
│   ABER: Score (Trader/Manager/Analyst) bleibt skill-basiert
└── Sorare-Fehler vermieden: Dort ist Geld = Pflicht. Hier = Beschleuniger.
```

### BSD-Senken

```
DPC IPO: Common 500-800, Rare 1.500-2.500, Epic 4.000-6.000,
         Legendary 10.000-15.000, Mythic 25.000-50.000
Club Abo: Bronze 500/Mo, Silber 1.500/Mo, Gold 3.000/Mo
Trading Fee: 6% (BSD wird VERNICHTET)
Paywall Content: 50-200 BSD
Paid Polls: 20-100 BSD

BALANCE-CHECK:
├── Aktiver User verdient ~5.000 BSD/Monat (ohne Kauf)
├── 1 Common DPC: Sofort mit Starter-Balance
├── 1 Rare: ~1 Monat sparen (oder ~€2.50 kaufen)
├── 1 Epic: ~2 Monate (oder ~€5)
├── 1 Legendary: ~3 Monate (oder ~€12)
├── 1 Mythic: ~8 Monate (oder ~€35)
└── → KNAPPHEIT. DPCs sind Prestige-Objekte.
```

### Monitoring (ab Phase 2)

```
├── BSD Erzeugung/Woche vs Vernichtung/Woche
├── Ziel-Ratio: 1.2-1.5 (leicht inflationär)
│   <1.0 = Deflation → Sinks reduzieren
│   >2.0 = Inflation → Quellen reduzieren
├── DPC-Auslastung (% mindestens 1x gekauft)
│   <20% = Problem. >80% = neue Tranchen.
└── Trading Volume/Tag muss mit User-Zahl steigen
```

---

## KAPITEL 9: CLUB-REVENUE

### BeScout als Amazon für Vereine

```
Jeder der 20 TFF 1. Lig Clubs hat auf BeScout:
├── Eigene DPCs (Spieler-Karten)
├── Eigenes Club-Leaderboard
├── Eigene Club-Events (im Pilot: vom Founder erstellt)
├── Eigene Club-Abos (Free/Bronze/Silber/Gold)
└── Eigene Sponsor-Flächen (21 Slots pro Club)

REVENUE-STREAMS FÜR JEDEN CLUB:

1. DPC IPO: 90% → Club, 10% → BeScout
2. Trading Fees: 6% pro Trade → 3.5% BeScout, 1.5% PBT, 1% Club
3. Club-Abo: 80% → Club, 20% → BeScout
4. Content/Polls: 70-80% → Creator/Club, 20-30% → BeScout
5. Sponsor-Placements: Revenue nach Vereinbarung

NACHFRAGE-STEUERUNG DURCH EVENTS:
├── Ohne Events: Große Clubs dominieren (Galatasaray > Sakaryaspor)
├── Mit Club Events: Jeder Club kann Nachfrage für SEINE DPCs steigern
├── "Barış Week" → Barış DPC Nachfrage ↑ → Trading Volume ↑ → Fees ↑
└── Das hält auch kleine Clubs relevant auf der Plattform
```

---

## KAPITEL 10: CLUB-ABO

```
FREE (Standard):
├── ALLE Kern-Features (Fantasy, Predictions, Trading, Score)
├── Voller Scout Score + Airdrop Score (Basis)
├── Login Streak, Achievements, Leaderboard
└── MUSS sich KOMPLETT anfühlen. Free ≠ eingeschränkt.

BRONZE (500 BSD/Mo):
├── 1.2x Airdrop-Multiplikator
├── Trading Fee: 5.5% statt 6%
├── 1 Streak Shield/Monat
└── Bronze-Profil-Rahmen

SILBER (1.500 BSD/Mo):
├── 1.5x Airdrop-Multiplikator
├── Trading Fee: 5%
├── 2 Streak Shields/Monat
├── Silber-Rahmen (animiert)
└── PBT-Bonus: 1.5x

GOLD (3.000 BSD/Mo):
├── 2x Airdrop-Multiplikator
├── Trading Fee: 4.5%
├── 3 Streak Shields/Monat
├── Gold-Rahmen (Partikel-Effekt)
├── PBT-Bonus: 2x
├── "Patron" Tag
└── 6h Vorsprung bei neuen IPOs

BEZAHLUNG IM PILOT: NUR BSD (kein echtes Geld für Abos)
```

---

## KAPITEL 11: LEADERBOARD, STREAK, ACHIEVEMENTS

### Leaderboard

```
PILOT (20 Clubs):
├── 20 CLUB-LEADERBOARDS (eins pro Club)
│   "Sakaryaspor Scout Ranking", "Kocaelispor Scout Ranking" etc.
├── Sortiert nach Gesamt Scout Score
├── Echtzeit-Update
├── Zeigt: Rang, Name, Titel, Score, Trend (↑↓), Badge
└── Liga-weites Leaderboard ("TFF 1. Lig Top Scouts")

Phase 2: + Rang-Leaderboard + Private Mini-Leagues (FPL-Lernen)
Phase 3: + Club-vs-Club Leaderboard
Phase 4: + Friends + Global Hall of Fame
```

### Login Streak

```
MECHANIK:
├── Login + mindestens 1 Aktion
├── Streak bricht bei 1 Tag Pause
├── Streak Shield: 1x/Monat Free, mehr mit Abo

BELOHNUNGEN:
├── Tag 1-6: +5 Airdrop/Tag
├── Tag 7: +50 Airdrop + 100 BSD
├── Tag 8-13: +7/Tag
├── Tag 14: +75 Airdrop + 200 BSD
├── Tag 15-29: +10/Tag
├── Tag 30: +150 Airdrop + 500 BSD + "Dedicated Scout" Badge
├── Tag 60: +300 Airdrop + "Committed Scout" Badge
└── Tag 90: +500 Airdrop + "Iron Will" Badge (permanent)
```

### Achievements (15 im Pilot)

```
ONBOARDING:
├── "First Scout"     — Erste DPC gekauft
├── "Game Day"        — Erstes Fantasy Lineup gesetzt
├── "Crystal Ball"    — Erste Prediction gestellt

TRADING:
├── "Smart Money"     — Erster profitabler Trade
├── "10x Trader"      — 10 Trades abgeschlossen
├── "Treuer Sammler"  — Scout Card 30 Tage gehalten

FANTASY:
├── "Lineup Master"   — 5 Spieltage in Folge Lineup gesetzt
├── "Podium"          — Top 3 in Fantasy Event
├── "Champion"        — #1 in Fantasy Event

PREDICTIONS:
├── "Oracle"          — 5 Predictions in Folge richtig
├── "Sharp Mind"      — Accuracy >65% (min 20 Predictions)

COMMUNITY:
├── "Voice Heard"     — Post mit 5+ Likes
├── "Scout Network"   — 3 aktive Referrals

PRESTIGE:
├── "Founding Scout"  — Unter den ersten 50 Usern (PERMANENT)
└── "Gold Standard"   — Gold-Rang in mindestens 1 Dimension
```

---

## KAPITEL 12: ONBOARDING — DIE ERSTEN 5 MINUTEN

```
SPRACHEN: Türkisch, Deutsch, Englisch (User wählt bei Start)

SCHRITT 1 — REGISTRIERUNG (30 Sek):
├── Google Sign-In / Apple Sign-In / Email
├── Benutzername
└── → Sofort drin. Minimale Friction.

SCHRITT 2 — CLUB WÄHLEN (15 Sek):
├── "Welchem Club gehört dein Herz?"
├── 20 TFF 1. Lig Club-Logos als Grid
├── Multi-Club möglich (1 Primary, Rest Secondary)
└── → Bestimmt: Leaderboard-Zuordnung, DPC-Empfehlungen

SCHRITT 3 — SCOUT SCORE ERKLÄRUNG (30 Sek):
├── "BeScout ist Fantasy-Football mit echtem Markt."
├── "Dein Scout Score zeigt wie gut du bist. Er steigt und SINKT."
├── "Score: 500. Top Scouts: 2.400+."
├── "Je besser du bist, desto mehr profitierst du."
└── → 4 Sätze. Fertig. Kein $SCOUT-Hype.

SCHRITT 4 — ERSTE PREDICTION (60 Sek):
├── Nächster Spieltag anzeigen
├── 3 Match-Optionen (Heim/Unentschieden/Auswärts)
├── Confidence-Slider → ✅
└── → Erster Hook: User wartet auf Ergebnis

SCHRITT 5 — STARTER-DPC (120 Sek):
├── 1.000 BSD Willkommensbonus
├── Top 5 Spieler des gewählten Clubs
├── Quick-Buy (1 Klick) → Mastery 1 sofort
└── Überspringbar

SCHRITT 6 — LINEUP (90 Sek, wenn Spieltag nah):
├── Auto-vorgeschlagen: 5 Spieler (inkl. gekaufte DPC)
├── Captain wählen
├── → "Lineup gesetzt! ✅"
└── → User hat: 1 Prediction, 1 DPC, 1 Lineup, Score 500

SCHRITT 7 — NEWBIE PROTECTION HINWEIS:
├── "🛡️ Du hast 30 Tage Newbie Protection."
├── "In dieser Zeit ist dein Score geschützt."
└── "Danach bist du auf dich allein gestellt."

TOTAL: <5 Minuten. Alles hat eine Konsequenz die in <48h kommt.
```

---

## KAPITEL 13: ANTI-MANIPULATION

```
PILOT (20 Clubs, manuell):
├── Founder sieht alles (manuelle Review)
├── Alle Trades/Predictions/Score-Changes geloggt
├── BSD Weekly Cap: 5.000
├── Prediction <5min vor Deadline: halber Score
└── Kein automatisiertes System nötig

PHASE 2 (500-2.000):
├── Counterparty-Tracking (>50% Trades mit gleichem Partner → Flag)
├── Score Velocity Check (>200/Tag → Review)
├── Downvote Rate-Limit (10/Tag)
├── Min 24h Holding für Trade-Score
└── Free Streak Shield 1x/Monat

PHASE 3 (2.000-10.000):
├── Reputation-gewichtete Votes (Gold+ = 2x)
├── Trade Liquidity Threshold
├── Prediction Difficulty Auto-Calibration
├── Smurf Detection (Device)
└── Churn-Warnsignale

PHASE 4 (10.000+):
├── ML Anomaly Detection
├── Referral Ring Detection
├── Automated Score Rollback
└── Community Reporting + Moderation Queue
```

---

## KAPITEL 14: NOTIFICATIONS

```
USER WÄHLT SELBST (in Settings):

OPTIONEN:
├── "Alles" — Alle relevanten Notifications
├── "Wichtiges" — Nur Spieltag-Ergebnisse + Streak-Gefahr
├── "Minimal" — Nur Score-Meilensteine
├── "Aus" — Keine Push Notifications
└── Default: "Wichtiges"

NOTIFICATION-TYPEN (priorisiert):

PRIO 1: Spieltag-Ergebnis
"Sakaryaspor 2-1! Lineup Top 18%. 2/3 Predictions ✅. Score +32."

PRIO 2: Streak-Gefahr
"🔥 12-Tage-Streak endet morgen Mitternacht!"

PRIO 3: Score/Rang-Änderung
"Du bist auf Rang 11 aufgestiegen!" / "⚠️ Manager Score auf Silber III."

PRIO 4: Spieltag-Reminder (4h vor Deadline)
"Lineup noch nicht gesetzt!"

PRIO 5: Prediction aufgelöst
"✅ Barış >1 Tor: RICHTIG. Analyst +12."

PRIO 6: Markt-Bewegung
">15% Preisbewegung bei deiner Barış-DPC."

NEWBIE-MODUS (erste 30 Tage):
├── Ton ist ermutigend statt drückend
├── "Neuer Spieltag — frische Chance!"
└── Keine Verlust-Warnungen (reduziert Angst)
```

---

## KAPITEL 15: TECHNISCHE ARCHITEKTUR

### Event-Bus

```
EVENTS (jede User-Aktion emittiert 1 Event):

DPC_PURCHASED   { userId, dpcId, playerId, price, source: "ipo"|"market" }
DPC_SOLD        { userId, dpcId, playerId, price, profit }
PREDICTION_MADE { userId, predictionId, type, target, condition, confidence }
PREDICTION_RESOLVED { predictionId, result: "correct"|"wrong"|"void" }
LINEUP_SET      { userId, eventId, playerIds, captainId }
FANTASY_RESULT  { userId, eventId, rank, percentile, points }
POST_CREATED    { userId, postId, type }
POST_LIKED      { postId, likerId, authorId }
LOGIN           { userId, streakDay }
MATCH_RESULT    { fixtureId, playerRatings[], goals[], assists[] }
REFERRAL_ACTIVATED { referrerId, referredId }
BSD_PURCHASED   { userId, amount, realMoneyAmount, currency }
EVENT_CREATED   { eventId, type, clubId, createdBy }

LISTENER:
├── ScoreService      → Update Trader/Manager/Analyst
├── PredictionService → Resolve, calculate Score impact, make public
├── MasteryService    → Update DPC Mastery levels
├── AirdropService    → Update Airdrop Score (nightly batch)
├── AchievementService→ Check conditions
├── LeaderboardService→ Update Rankings (20 Clubs + Liga-weit)
├── StreakService      → Update Login Streak
├── NewbieService      → Check Newbie Protection status
├── BSDService         → Credit/Debit BSD
├── NotificationService→ Trigger Push (respecting user settings)
├── EventService       → Manage 4-tier event system
└── AnalyticsService   → Track retention
```

### DB-Schema (Kern)

```sql
-- Scout Score
scout_scores: user_id, trader_score, manager_score, analyst_score,
              active_title, strongest_dimension, updated_at

-- Score History (Append-Only)
score_history: id, user_id, dimension, old_value, new_value, delta,
              reason, event_type, event_id, created_at

-- Predictions (PRIVAT bis resolved)
predictions: id, user_id, type, target_id, condition, confidence,
            deadline, result (pending/correct/wrong/void),
            score_impact, is_public (default false),
            resolved_at, created_at

-- Events (4-Tier System)
events: id, type (standard/special/sponsor/club), club_id,
       title, description, start_date, end_date,
       score_influence (full/light/none),
       sponsor_id, created_by, created_at

-- DPC Mastery
dpc_mastery: user_id, dpc_id, player_id, level, started_at,
            days_held, fantasy_uses, predictions_correct

-- Airdrop Score
airdrop_scores: user_id, total_score, scout_component,
               mastery_component, activity_component,
               multiplier, calculated_at

-- Login Streaks
login_streaks: user_id, current_streak, longest_streak,
              last_active_date, shields_remaining

-- Achievements
user_achievements: user_id, achievement_id, unlocked_at

-- BSD Ledger (Append-Only)
bsd_transactions: id, user_id, amount, type (credit/debit),
                 reason, reference_id, is_real_money_purchase,
                 created_at

-- Newbie Protection
user_protection: user_id, signup_date, protection_active,
                protection_ends_at, score_floor (200)

-- Notification Preferences
notification_prefs: user_id, level (all/important/minimal/off),
                   updated_at

-- User Clubs (Multi-Club Support)
user_clubs: user_id, club_id, is_primary, joined_at
```

---

## KAPITEL 16: PHASENPLAN

```
PHASE 1 — PILOT (20 TFF 1. Lig Clubs):

BUILD:
 1. Scout Score (3 Dimensionen, steigt/sinkt, dynamische Titel)
 2. Prediction Engine (Spieler, Match, Markt — privat bis Auflösung)
 3. Fantasy Hybrid (Free Lineup + DPC Boost, liga-weit)
 4. Event-System (4-Tier: Standard automatisch, Rest manuell)
 5. Rang-System (Bronze I – Legendär)
 6. 20 Club-Leaderboards + Liga-Leaderboard
 7. DPC Mastery (Level 1-5)
 8. Airdrop Score (Berechnung + Live-Utility, subtiler $SCOUT Hinweis)
 9. Login Streak (Counter, Shield, Rewards)
10. 15 Achievements
11. Club-Abos (Free/Bronze/Silber/Gold — BSD only)
12. Onboarding (5 Min, 3 Sprachen, Social Login)
13. Push Notifications (User wählt Level in Settings)
14. BSD-Ökonomie (Quellen, Senken, Weekly Cap, Echtgeld-Kauf)
15. User-zu-User DPC-Trading (ab Tag 1 live)
16. Newbie Protection (30 Tage)
17. Sommerpause/Länderspielpause-Handling
18. Event-Bus (synchron)

MESSEN:
├── D1, D7, D30 Retention
├── Predictions/User/Woche
├── Fantasy-Teilnahmerate
├── Trades/User/Woche
├── BSD Erzeugung vs Vernichtung
├── BSD Echtgeld-Käufe (Revenue)
├── Score-Verteilung
├── Prediction-Accuracy Ø (Ziel: 45-55%)
├── Event-Teilnahmerate (Standard vs Special vs Club)
├── NPS
└── Organisches Wachstum (Referral-Rate)

KILL-KRITERIEN:
├── D7 Retention < 20%
├── 0 Trades/Woche organisch
├── 0 Fantasy-Lineups nach Spieltag 2
├── Prediction-Accuracy Ø > 75% (zu leicht)
├── Prediction-Accuracy Ø < 35% (zu schwer)
└── NPS < 20


PHASE 2 (500+ User) — NUR bei positiven Daten:
├── Private Mini-Leagues (FPL-Lernen — HÖCHSTE PRIORITÄT)
├── Chips/Power-Ups (Prediction Boost, Score Shield, Captain's Pick)
├── Club-Dashboard (Self-Service Event-Erstellung)
├── PBT-Ausschüttung (wöchentlich, Mastery 3+)
├── Season Reset + Season Badges
├── Erweiterte Achievements (+10, total 25)
├── DPC Mastery Level 6-7
├── Voting für Gold-Abo (wenn Club-Partnership steht)
├── Anti-Manipulation Basis
└── Wöchentliche Score-Zusammenfassung

PHASE 3 (2.000+ User) — NUR bei Wachstum:
├── Scout Pass (4-Wochen-Zyklen, 20 Tiers)
├── Daily Missions / Quests
├── Year-End Wrap-Up (shareable, Social Media)
├── Club-vs-Club Leaderboard
├── Freundes-Leaderboard
├── Prediction Difficulty Auto-Calibration
├── Customizable Profil-Elemente
├── Reale Rewards (Club-abhängig)
├── DPC Mastery Level 8-10
└── Prädiktive Churn-Intervention

PHASE 4 (10.000+) — NUR bei bewiesenem PMF:
├── On-Chain Scout Passport
├── Global Hall of Fame
├── ML Anomaly Detection
├── Full Avatar System
├── Dynamic Quests (aus Live-Daten)
└── Cross-Club Events (Club-Dashboard)
```

---

## KAPITEL 17: WAS BESCOUT EINZIGARTIG MACHT

```
vs. SORARE:
├── BeScout Score SINKT. Sorare-Punkte nie.
├── BeScout ist Free-to-Play mit echtem Markt. Sorare ist Pay-to-Win.
├── BeScout hat Predictions. Sorare nicht.
├── BeScout hat Community/Content. Sorare ist rein transaktional.

vs. SOCIOS/CHILIZ:
├── BeScout hat SKILL-Element. Socios belohnt nur BESITZ.
├── BeScout hat täglichen Loop. Socios hat 2 Polls/Monat.
├── BeScout bedient 2. Liga. Socios nur Top-Clubs.

vs. ONEFOOTBALL:
├── BeScout hat DPC-Trading. OneFootball nicht.
├── BeScout hat Fantasy. OneFootball nicht.
├── BeScout ist Club-First. OneFootball ist generisch.

vs. FPL:
├── BeScout Score SINKT. FPL hat keinen persistenten Score.
├── BeScout hat echten Markt. FPL hat kein Trading.
├── BeScout hat Predictions. FPL nicht.
├── BeScout bedient TFF 1. Lig. FPL nur Premier League.

vs. CLUB-APPS:
├── BeScout hat Skill-Score. Club-Apps haben generische Badges.
├── BeScout ist Multi-Club-Plattform. Club-Apps sind Einzelclub.
├── BeScout hat Markt-Ökonomie. Club-Apps haben keine.

WAS NUR BESCOUT HAT:
🏆 Score der SINKT
🏆 3 Score-Dimensionen mit dynamischen Titeln
🏆 4-Tier Event-System (Standard/Special/Sponsor/Club)
🏆 DPC Mastery (6 Monate → Expert Status)
🏆 Hybrid Fantasy (Free + DPC Boost)
🏆 Plattform-Ökosystem für Vereine (Amazon-Modell)
🏆 Predictions privat bis Auflösung
🏆 TFF 1. Lig Fokus (Nische die niemand bedient)
```

---

## ZUSAMMENFASSUNG DER FOUNDER-ENTSCHEIDUNGEN

```
Diese Entscheidungen sind FINAL und nicht verhandelbar:

✅ Kern-Identität: "Fantasy-Football mit echtem Markt"
✅ Täglicher Loop: Alle Aktivitäten gleichwertig
✅ Score SINKT: Absolut zentral. Wer das nicht will = nicht unsere Zielgruppe.
✅ DPCs: Nur BSD. Kein echtes Geld für DPCs im Pilot.
✅ BSD: Mit echtem Geld kaufbar. Beschleunigt, gatekeept nicht.
✅ Trading: User-zu-User ab Pilot live.
✅ Events: 4-Tier (Standard/Special/Sponsor/Club). Pilot: manuell.
✅ Predictions ↔ Fantasy: GETRENNT. Keine automatische Kopplung.
✅ Predictions: PRIVAT bis Auflösung. Dann öffentlich.
✅ $SCOUT: Erwähnen, nicht Hauptversprechen. Fokus auf Gameplay.
✅ Sprachen: Türkisch, Deutsch, Englisch.
✅ Onboarding: Google/Apple Sign-In + Email.
✅ Gesamt-Rang: Median der 3 Dimensionen.
✅ Titel: Dynamisch, basierend auf stärkster Dimension.
✅ Startwert: 500 pro Dimension (Bronze II).
✅ Clubs Pilot: 20 (alle TFF 1. Lig Vereine).
✅ Event-Erstellung Pilot: Manuell durch Founder.
✅ Club-Abo: BSD only im Pilot.
✅ Recovery: Nur Newbies (30 Tage). Danach kein Schutz.
✅ Absent-Penalty: Mild für Newbies (-5), voll nach 30 Tagen (-10).
✅ Push Notifications: User wählt Level in Settings.
```

---

*Dieses Dokument ist die finale, verbindliche Gamification-Referenz für BeScout.*
*Version 4.0 ersetzt ALLE vorherigen Versionen (v1, v2, v3).*
*Bei Widersprüchen mit anderen Dokumenten gilt DIESES.*
