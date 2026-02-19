# BeScout — Gamification & Ranking System

> **Zweck:** Verbindliche Spezifikation für Claude Code. Phasenweise Umsetzung nach User-Zahlen.
> **Prinzip:** Jede Phase muss eigenständig funktionieren. Nichts wird gebaut das "später cool wird".

---

## DIE KERN-EINSICHT

BeScout ist kein Spiel. Es ist eine **Reputationsplattform**.

Brawl Stars motiviert durch: "Ich bin besser im Kämpfen als du."
FIFA FUT motiviert durch: "Mein Team ist besser als deins."
BeScout motiviert durch: **"Ich verstehe Fußball besser als du."**

Jeder türkische Fan glaubt das von sich. BeScout gibt ihm zum ersten Mal einen BEWEIS — oder widerlegt ihn. Das ist der emotionale Kern. Nicht Punkte, nicht Badges, nicht Drops. Sondern: **Dein Score sagt dir die Wahrheit über dein Fußballwissen.**

Alles was folgt dient diesem einen Zweck.

---

## DER SCOUT SCORE — Das Herz des Systems

### Philosophie

Der Scout Score ist KEIN Erfahrungspunkte-System. Er ist ein **Skill-Rating**. Wie Elo im Schach, wie MMR in League of Legends, wie Trophäen in Brawl Stars. Er geht RAUF wenn du recht hast. Er geht RUNTER wenn du falsch liegst.

Das ist der fundamentale Unterschied zu jedem anderen Fan-Engagement-System. Sorare hat keinen Score der sinkt. Socios hat keinen Score der sinkt. FanDuel zeigt dir dein Ergebnis, aber es gibt keinen persistenten Skill-Wert.

BeScout sagt: **Du bist Scout-Rang Gold mit 1.847 Punkten. Du bist besser als 72% der Sakaryaspor-Fans. Letzte Woche warst du noch 78%.** Das tut weh. Und genau deshalb kommt der User zurück.

### Die 3 Dimensionen

Der Score besteht aus 3 unabhängigen Werten. Jeder misst eine andere Fähigkeit. Kein Durchschnitt, keine Gewichtung — drei separate Zahlen die zusammen dein Profil als Football-Mind definieren.

```
┌─────────────────────────────────────────────────────┐
│                    SCOUT SCORE                       │
│                                                      │
│  ┌─────────────┐ ┌─────────────┐ ┌─────────────┐   │
│  │   TRADER    │ │   MANAGER   │ │   ANALYST    │   │
│  │    1.847    │ │    2.103    │ │     956     │   │
│  │   ★★★★☆    │ │   ★★★★★    │ │   ★★★☆☆    │   │
│  │    Gold     │ │  Diamant    │ │   Silber    │   │
│  └─────────────┘ └─────────────┘ └─────────────┘   │
│                                                      │
│  Gesamt-Rang: GOLD          Top 28% deines Clubs    │
│  Airdrop-Multiplikator: 2.4x                        │
└─────────────────────────────────────────────────────┘
```

---

### TRADER SCORE — "Erkennst du Wert?"

Misst: Deine Fähigkeit, unterbewertete Spieler zu erkennen und zum richtigen Zeitpunkt zu handeln.

```
WAS IHN STEIGEN LÄSST:
├── Profitabler Trade (Verkauf > Kauf)
│   └── +10 bis +50 Punkte, skaliert mit Profit-Margin
├── DPC kaufen BEVOR Spieler Performance steigt
│   └── +20 Punkte ("Early Mover Bonus")
│   └── Gemessen: Kauf vor Spieltag an dem Spieler >7.0 Rating hat
├── IPO-Kauf eines Spielers der in den nächsten 30 Tagen >20% steigt
│   └── +30 Punkte ("IPO Scout Bonus")
└── Order ausgeführt die du vor >24h platziert hast
    └── +5 Punkte ("Patience Bonus")

WAS IHN SINKEN LÄSST:
├── Verlust-Trade (Verkauf < Kauf)
│   └── -10 bis -30 Punkte, skaliert mit Verlust
├── Panik-Verkauf (<24h nach Kauf mit Verlust)
│   └── -20 Punkte ("Panic Penalty")
├── Order läuft 7+ Tage ab ohne Ausführung
│   └── -5 Punkte ("Dead Order Penalty")
└── DPC verliert >30% Wert während du hältst (30-Tage-Fenster)
    └── -10 Punkte ("Bag Holder Penalty")

GEWICHTUNG:
├── Korrekte Einschätzung wird stärker belohnt als bestraft
├── Ratio: +40 Punkte Ø pro gutem Trade vs. -20 Ø pro schlechtem
├── Damit: 50% Win-Rate → Score stagniert
├── 60%+ Win-Rate → Score steigt
├── <40% Win-Rate → Score sinkt
└── Das belohnt GUTE Trader, nicht aktive Trader
```

**Warum das funktioniert:** Es ist kein Aktivitäts-Score. Es ist ein SKILL-Score. Du kannst nicht grinden um ihn zu erhöhen — du musst tatsächlich gute Entscheidungen treffen. Das unterscheidet BeScout fundamental von jedem Punkte-System.

---

### MANAGER SCORE — "Kannst du ein Team aufstellen?"

Misst: Deine Fähigkeit, die richtigen Spieler für Fantasy-Lineups zu wählen.

```
WAS IHN STEIGEN LÄSST:
├── Fantasy Event Top 25% Platzierung
│   └── +10 bis +50 Punkte (Top 1% = +50, Top 10% = +30, Top 25% = +10)
├── Spieler in deinem Lineup hat Match Rating >8.0
│   └── +5 Punkte pro Spieler ("Good Pick Bonus")
├── Kapität deines Lineups ist Top-Scorer des Spieltags
│   └── +15 Punkte ("Captain's Call")
├── Lineup vor Deadline gesetzt (>2h vor Deadline)
│   └── +3 Punkte ("Prepared Manager")
└── 5 Spieltage in Folge Lineup gesetzt
    └── +10 Punkte ("Consistent Manager")

WAS IHN SINKEN LÄSST:
├── Fantasy Event Bottom 30% Platzierung
│   └── -10 bis -25 Punkte
├── Spieler in Lineup hat Match Rating <5.0
│   └── -3 Punkte pro Spieler ("Bad Pick")
├── KEIN Lineup gesetzt an aktivem Spieltag
│   └── -15 Punkte ("Absent Manager")
│   └── Das ist der stärkste Retention-Trigger: "Du verlierst Punkte wenn du nicht spielst"
└── Gleiche Lineup-Änderung in letzter Minute (<30 Min vor Deadline)
    └── -5 Punkte ("Panic Change") — nur wenn der geänderte Spieler besser performt
```

**Warum "Kein Lineup = Score sinkt" der wichtigste Mechani ist:** Das ist der Brawl-Stars-Trick. In Brawl Stars verlierst du Trophäen wenn du verlierst, aber du verlierst auch Relevanz wenn du nicht spielst. Bei BeScout: Jeden Spieltag wo du kein Lineup setzt, wirst du schlechter. Dein Rang fällt. Andere überholen dich. Das Push-Notification "⚠️ Spieltag morgen! Ohne Lineup verlierst du ~15 Manager-Punkte" ist der stärkste Retention-Trigger im gesamten System.

---

### ANALYST SCORE — "Wissen andere, dass du Ahnung hast?"

Misst: Deine Reputation als Content-Creator und Analyst in der Community.

```
WAS IHN STEIGEN LÄSST:
├── Post bekommt Likes
│   └── +1 Punkt pro Like (max +20 pro Post)
├── Analyse/Research bekommt Paywall-Käufe
│   └── +5 Punkte pro Kauf
├── Bounty erfolgreich abgeschlossen
│   └── +10 bis +30 Punkte (je nach Schwierigkeit)
├── Dein Post wird im "Top Analyses" Feed featured
│   └── +15 Punkte ("Featured Analyst")
├── Neuer Follower
│   └── +2 Punkte
└── Deine Spieler-Einschätzung in einem Post stellt sich als korrekt heraus
    └── +20 Punkte ("Prediction Confirmed")
    └── Gemessen: Du schreibst "Spieler X wird gegen Y stark spielen"
        → Spieler hat Rating >7.5 → Score-Bonus
    └── Das ist das KILLER-FEATURE für Analysten

WAS IHN SINKEN LÄSST:
├── Post bekommt Downvotes (>3 Downvotes)
│   └── -2 Punkte pro Downvote über 3
├── Post gelöscht (von Moderation oder selbst)
│   └── -5 Punkte
├── Bounty nicht abgeschlossen (angenommen aber nicht geliefert)
│   └── -15 Punkte ("Unreliable")
└── 30 Tage kein Content erstellt
    └── -10 Punkte ("Inactive Analyst")
    └── Sanfter als Manager-Penalty, weil Content-Erstellung höhere Hürde hat

BESONDERHEIT:
├── Analyst Score ist der langsamste der drei Scores
├── Er reflektiert REPUTATION, nicht einzelne Aktionen
├── Hoch = "Diese Person weiß wovon sie redet"
├── Manche User werden Analyst Score 0 haben und das ist OK
└── Nicht jeder muss Content erstellen. Manche sind reine Trader/Manager.
```

---

### RANG-SYSTEM

```
RÄNGE (gleich für alle 3 Dimensionen):

Rang         Punkte-Range    Visuell
──────────────────────────────────────
Bronze I     0 - 299         🟤
Bronze II    300 - 599       🟤🟤
Bronze III   600 - 999       🟤🟤🟤
Silber I     1.000 - 1.399   ⚪
Silber II    1.400 - 1.799   ⚪⚪
Silber III   1.800 - 2.199   ⚪⚪⚪
Gold I       2.200 - 2.799   🟡
Gold II      2.800 - 3.399   🟡🟡
Gold III     3.400 - 3.999   🟡🟡🟡
Diamant      4.000 - 4.999   💎
Mythisch     5.000 - 6.999   🔮
Legendär     7.000+          👑

STARTWERT: 500 (Bronze II)
├── Nicht bei 0, damit der User sofort "etwas hat" das er verlieren kann
├── Erste Session: Score bewegt sich durch Tutorial-Aktionen auf ~600-700
└── Nach 1 Woche: Aktive User bei ~800-1.200, Inaktive fallen auf 300-400

GESAMT-RANG:
├── = Niedrigster der 3 Einzel-Ränge
├── Warum niedrigster? Weil du ein KOMPLETTER Scout sein musst
├── Gold Trader + Gold Manager + Bronze Analyst = Bronze Gesamt
├── Das motiviert: "Ich muss meinen schwächsten Bereich verbessern"
├── Alternative (weniger hart): Median der 3 Ränge
└── Empfehlung Pilot: Median. Wechsel zu Minimum bei >1.000 Usern.
```

### SEASON RESET

```
WANN: Ende der Fußball-Saison (Mai/Juni)

WAS PASSIERT:
├── Trader Score: Soft Reset
│   ├── Überschuss über Rang-Minimum wird halbiert
│   ├── Beispiel: Gold III (3.400 Min) mit 4.200 Punkten
│   │   → Überschuss: 800, halbiert: 400
│   │   → Neuer Score: 3.800 (immer noch Gold III, aber knapp)
│   └── Motiviert: Wieder hochklettern, Season-Badge sichern
│
├── Manager Score: Hard Reset auf 500
│   ├── Neue Saison = neues Team = neues Lineup = bei Null
│   ├── Fairer Neustart für alle
│   └── Motiviert: Season-Rennen von Anfang an
│
├── Analyst Score: KEIN Reset
│   ├── Content-Reputation ist langfristig
│   ├── Deine Analysen von letzter Saison sind immer noch relevant
│   └── Prestige-Accumulator: Veteranen haben hohen Analyst Score

SEASON BADGE:
├── Jeder Rang den du am Saisonende hast wird als Badge archiviert
├── "Season 1: Gold Trader, Diamant Manager, Silber Analyst"
├── Permanent auf deinem Profil
├── Vergleichbar mit "Season X Legend" in Brawl Stars
└── → Founding Season Badges sind die wertvollsten (nie wieder erreichbar)
```

---

## DPC MASTERY — Emotionale Bindung an Spieler

### Philosophie

DPC Mastery ist NICHT Gamification. Es ist ein **Commitment-System**. Es misst wie tief deine Beziehung zu einem bestimmten Spieler ist. Es belohnt HALTEN statt Flippen. Es macht dich zum echten Scout dieses Spielers.

### Mastery-Level (1-5 im Pilot, erweiterbar auf 10)

```
LEVEL 1 — BESITZER
├── Erreicht durch: DPC kaufen
├── Sofort. Kein Grind.
└── Bedeutung: Du hast den Spieler auf dem Schirm.

LEVEL 2 — BEOBACHTER
├── Erreicht durch: DPC 7 Tage halten + 1 Fantasy-Einsatz
├── ~1 Woche nach Kauf
└── Bedeutung: Du verfolgst den Spieler aktiv.

LEVEL 3 — KENNER
├── Erreicht durch: 30 Tage halten + 3 Fantasy-Einsätze + 1 Analyse über den Spieler
├── ~1 Monat nach Kauf
└── Bedeutung: Du kennst den Spieler. Du hast eine Meinung.

LEVEL 4 — EXPERTE
├── Erreicht durch: 90 Tage halten + 10 Fantasy-Einsätze + Analyse mit 5+ Likes
├── ~3 Monate nach Kauf
└── Bedeutung: Andere respektieren dein Urteil über diesen Spieler.

LEVEL 5 — LEGENDE
├── Erreicht durch: 180 Tage halten + 20 Fantasy-Einsätze + Top 10% Mastery unter allen Holdern dieses Spielers
├── ~6 Monate nach Kauf
└── Bedeutung: Du bist DIE Referenz für diesen Spieler auf BeScout.

MASTERY BEI VERKAUF:
├── DPC verkauft → Mastery wird EINGEFROREN, nicht gelöscht
├── Im Profil sichtbar: "Ehemals Level 4 Experte für Barış Alper Yılmaz"
├── Wenn du die DPC zurückkaufst: Mastery-Timer setzt fort (nicht bei 0)
├── Aber: PBT-Berechtigung stoppt sofort bei Verkauf
└── → Verkauf hat Konsequenzen, aber löscht nicht deine Geschichte
```

### Was Mastery bringt

```
PBT-BERECHTIGUNG (Player Bound Treasury):
├── Level 1-2: Kein PBT
├── Level 3: Standard-Anteil
├── Level 4: 3x Anteil
├── Level 5: 10x Anteil
└── → Top-Scouts bekommen relevante Beträge, Flipper bekommen nichts

AIRDROP-MULTIPLIKATOR:
├── Jedes Mastery-Level addiert zum Airdrop Score
├── Level 1: +10, Level 2: +25, Level 3: +50, Level 4: +100, Level 5: +200
├── 10 DPCs auf Level 3 = +500 Airdrop-Punkte
└── → Langfristiges Halten wird massiv belohnt

PROFIL-PRESTIGE:
├── "Kader-Stärke" = Summe aller Mastery-Level
├── Kader-Stärke 47 (12 DPCs, Ø Level 3.9)
├── Sichtbar auf Profil neben Scout Score
└── → "Ich habe einen stärkeren Kader als du" — Sammel-Instinkt

CONTENT-AUTORITÄT:
├── Wenn du Level 4+ bist und über diesen Spieler schreibst:
│   → Post bekommt "Expert" Badge
│   → Wird höher im Feed gerankt
│   → Analyst Score Bonus x1.5 für Likes auf diesen Post
└── → Mastery macht dich zur Autorität für "deine" Spieler
```

---

## AIRDROP SCORE — Die Meta-Ebene

### Philosophie

Der Airdrop Score ist das EINZIGE was im Pilot echten zukünftigen Wert hat. BSD ist wertlos. DPCs sind wertlos. Aber der Airdrop Score bestimmt wie viel $SCOUT du bekommst wenn der Token launcht. Er ist die Brücke zwischen "Prestige jetzt" und "Geld später".

### Berechnung

```
AIRDROP SCORE = 
    (Scout Score Komponente)
  + (Mastery Komponente)
  + (Activity Komponente)
  + (Multiplier)

SCOUT SCORE KOMPONENTE:
├── Trader Rang × Faktor:  Bronze=1, Silber=2, Gold=4, Diamant=8, Mythisch=16, Legendär=32
├── Manager Rang × gleicher Faktor
├── Analyst Rang × gleicher Faktor
└── Beispiel: Gold Trader (4) + Diamant Manager (8) + Silber Analyst (2) = 14 Basis-Punkte
    → Täglicher Airdrop-Zuwachs: 14 Punkte/Tag (bei aktivem Login)

MASTERY KOMPONENTE:
├── Summe aller DPC Mastery-Levels × 10
├── Beispiel: 8 DPCs mit Mastery 1,1,2,2,3,3,4,5 = 21 × 10 = 210
└── → Einmaliger Bonus + täglicher Zuwachs von 5% des Werts

ACTIVITY KOMPONENTE:
├── Login Streak: Tag × 2 (Tag 1: +2, Tag 7: +14, Tag 30: +60)
├── Fantasy Lineup gesetzt: +5 pro Spieltag
├── Trade ausgeführt: +3 pro Trade
├── Content erstellt: +10 pro Post, +20 pro Analyse mit >5 Likes
├── Referral: +100 pro eingeladenen aktiven User (muss 7 Tage aktiv sein)
└── → Belohnt konsistente Aktivität, nicht einzelne Spikes

MULTIPLIER:
├── Founding Scout (erste 50 User): 3x auf ALLES
├── Early Adopter (User 51-500): 2x auf ALLES
├── Club Abo Bronze: 1.2x
├── Club Abo Silber: 1.5x
├── Club Abo Gold: 2x
└── → FOMO-Mechanik: Je früher du dabei bist, desto mehr kriegst du

SICHTBARKEIT:
├── Airdrop Score ist PROMINENT auf Home und Profil
├── Leaderboard: "Top Airdrop Scores — Sakaryaspor"
├── Täglicher Zuwachs wird angezeigt: "+47 heute"
├── Vergleich: "Du bist im Top 15% deines Clubs"
└── → User sieht jeden Tag seine "Airdrop-Ernte" wachsen
```

### Warum der Airdrop Score funktioniert

Er löst das Prestige-Problem. BSD ist wertlos — ja. Aber der Airdrop Score hat ein VERSPRECHEN dahinter. Es ist wie Aktienoptionen die vielleicht nie was wert sind, aber das VIELLEICHT reicht als Motivation. Besonders bei türkischen Fans die gerne spekulieren.

Gleichzeitig kann es NICHT garantiert werden. Die Communication muss klar sein: "Dein Airdrop Score bestimmt deinen Anteil wenn $SCOUT launcht. Wann und ob $SCOUT launcht, hängt von der Entwicklung der Plattform ab." Keine Versprechen, keine Garantien, aber eine transparente Formel.

---

## LEADERBOARD — Social Competition

### Struktur

```
PILOT (50-500 User):

1 LEADERBOARD: Club-basiert
├── "Sakaryaspor Scout Ranking"
├── Rang 1-50 (oder wie viele User es gibt)
├── Sortiert nach: Gesamt Scout Score
├── Zeigt: Rang, Name, Score, Trend (↑↓), Rang-Badge
├── Update: Echtzeit (bei 50-500 Usern kein Performance-Problem)
└── Das ist das EINZIGE Leaderboard im Pilot

WARUM NUR EINS:
├── Bei 50 Usern bist du Rang 23 — das ist persönlich, greifbar
├── Mehrere Leaderboards verwässern die Competition
├── "Ich will unter die Top 10 meines Clubs" ist ein klares Ziel
├── Bei 50 Usern kennen sich die Leute (kleine Community)
└── → Social Pressure: "Ahmet hat mich überholt, das geht nicht"
```

```
NACH 500+ USERN — Erweiterung:

2. RANG-LEADERBOARD:
├── Nur User im gleichen Rang (alle Gold-Trader, alle Silber-Manager)
├── "Du bist Rang 34 von 89 Gold-Tradern"
├── → Motiviert: "Ich bin der beste Gold-Trader"
└── → Zeigt: Wer steht kurz vor Aufstieg/Abstieg

3. LIGA-LEADERBOARD (erst bei >5 Clubs):
├── Club vs. Club: "Welcher Club hat die beste Community?"
├── Club-Score = Ø Scout Score der Top 20 Fans
├── → Tribal Competition: "Sakaryaspor-Fans sind schlauer als Kocaelispor-Fans"
└── → Club-Identität stärkt Plattform-Nutzung

4. FREUNDES-LEADERBOARD (erst bei >1.000 Usern):
├── Du vs. Leute denen du folgst
├── Push: "Mehmet hat dich im Trader Score überholt!"
└── → Persönlichste Form der Competition
```

### Leaderboard-Benachrichtigungen

```
PUSH-TRIGGER:
├── "Du bist von Rang 12 auf 18 gefallen" (Verlust = stärkster Trigger)
├── "Mehmet hat dich überholt" (wenn du ihm folgst)
├── "Du bist 47 Punkte von den Top 10 entfernt" (Near-Miss)
├── "Neuer Spieltag morgen — dein Manager Score fällt ohne Lineup!" (Preventive)
└── "Du hast heute +83 Scout Score verdient — Rang 9 → Rang 7!" (Reward)

NICHT PUSH:
├── Tägliche Score-Zusammenfassung (In-App Notification, nicht Push)
├── Wöchentlicher Airdrop Score Report (In-App)
└── Leaderboard-Änderungen von Usern die du nicht folgst
```

---

## LOGIN STREAK — Der tägliche Anker

```
MECHANIK:
├── Login = App/Website öffnen und mindestens 1 Aktion ausführen
│   (Nicht nur öffnen — mindestens: Lineup checken, 1 Trade ansehen, 1 Post liken)
├── Counter: Tag 1, Tag 2, ... Tag 7, Tag 14, Tag 30, Tag 60, Tag 90
├── Streak bricht bei 1 Tag Pause
│   → Fällt auf 0 zurück
│   → ABER: "Streak Shield" — 1x pro Monat darf Streak nicht brechen (Auto-Used)
│   → Kommt automatisch mit Silber-Abo. Gold-Abo: 2 Shields/Monat.

BELOHNUNGEN:
├── Tag 1-6: Airdrop Score +5/Tag
├── Tag 7: Airdrop Score +50 (Bonus-Woche)
├── Tag 8-13: +7/Tag
├── Tag 14: +75 (Bonus-2-Wochen)
├── Tag 15-29: +10/Tag
├── Tag 30: +150 (Bonus-Monat) + "Dedicated Scout" Badge
├── Tag 60: +300 + "Committed Scout" Badge
├── Tag 90: +500 + "Iron Will" Badge (permanent, selten)
└── BSD-Rewards zusätzlich: Tag 7: 100 BSD, Tag 14: 200, Tag 30: 500

STREAK VERLOREN:
├── Push: "⚠️ Dein 23-Tage-Streak ist vorbei."
├── "Du hast 230 Airdrop-Punkte verloren die du morgen hättest bekommen können."
├── "Starte neu — Tag 1 beginnt mit deinem nächsten Login."
└── → Loss Aversion: "23 Tage umsonst" tut weh genug um morgen wiederzukommen
```

---

## ACHIEVEMENTS — Meilensteine

### Pilot-Set (15 Stück, nicht mehr)

Jedes Achievement ist eine klare, einmalige Handlung mit permanentem Badge.

```
ONBOARDING (3):
├── "First Scout"       — Erste DPC gekauft
├── "Game Day"          — Erstes Fantasy Lineup gesetzt
├── "Analyst Debut"     — Ersten Post geschrieben

TRADING (3):
├── "Smart Money"       — Erster profitabler Trade (Verkauf > Kauf)
├── "10x Trader"        — 10 Trades abgeschlossen
├── "Diamond Hands"     — DPC 30 Tage gehalten

FANTASY (3):
├── "Lineup Master"     — 5 Spieltage in Folge Lineup gesetzt
├── "Podium"            — Top 3 in einem Fantasy Event
├── "Champion"          — #1 in einem Fantasy Event

COMMUNITY (3):
├── "Voice Heard"       — Post mit 5+ Likes
├── "Scout Network"     — 3 User durch Referral eingeladen (die 7+ Tage aktiv sind)
├── "Bounty Hunter"     — Ersten Bounty abgeschlossen

PRESTIGE (3):
├── "Founding Scout"    — Unter den ersten 50 Usern (PERMANENT, nie wieder erreichbar)
├── "Gold Standard"     — Gold-Rang in mindestens 1 Dimension erreicht
├── "Complete Scout"    — Silber+ in ALLEN 3 Dimensionen
```

### Achievement-Design-Regeln

```
REGELN:
├── Keine Achievements die durch Grinding erreichbar sind ("Logge 100 Tage ein")
│   → Streaks sind Login-Streak-Sache, nicht Achievement-Sache
├── Jedes Achievement hat genau EINE Bedingung, nicht "A + B + C"
│   → Ausnahme: Prestige-Achievements (dürfen komplex sein, weil selten)
├── Achievements werden NICHT angekündigt bevor sie erreicht sind
│   → Discovery-Moment: "Oh, ich habe ein Achievement bekommen!"
│   → AUSNAHME: "Founding Scout" wird VOR dem Pilot kommuniziert (FOMO)
├── Maximaler Airdrop-Bonus pro Achievement: +50 Punkte
└── Achievement-Pop-up: Kurz, befriedigend, nicht nervig
```

---

## CLUB-ABO — Beschleuniger, nicht Paywall

### Pilot-Design

```
FREE (Standard):
├── Alle Kern-Features (Trading, Fantasy, Community)
├── Voller Scout Score
├── Voller Airdrop Score (Basis)
├── Login Streak
├── Achievements
└── → Free muss sich KOMPLETT anfühlen, nicht kastriert

BRONZE (500 BSD/Monat):
├── Alles Free PLUS:
├── 1.2x Airdrop-Multiplikator
├── 1 Streak Shield/Monat
├── Bronze-Rahmen um Profilbild
├── Trader-Rabatt: 5.5% Trading Fee statt 6%
└── → Für Fans die "ein bisschen mehr" wollen

SILBER (1.500 BSD/Monat):
├── Alles Bronze PLUS:
├── 1.5x Airdrop-Multiplikator
├── 2 Streak Shields/Monat
├── Silber-Rahmen (animiert)
├── Trader-Rabatt: 5% Trading Fee
├── PBT-Bonus: 1.5x auf PBT-Ausschüttung
├── Exklusives Silber-Leaderboard (nur Abo-User)
└── → Für aktive Fans die die Plattform ernst nehmen

GOLD (3.000 BSD/Monat):
├── Alles Silber PLUS:
├── 2x Airdrop-Multiplikator
├── 3 Streak Shields/Monat
├── Gold-Rahmen (Partikel-Effekt)
├── Trader-Rabatt: 4.5% Trading Fee
├── PBT-Bonus: 2x
├── "Patron" Tag neben dem Namen
├── 6h Vorsprung bei neuen IPOs
└── → Für die 1-3% Top-Fans. Status-Symbol.

PILOT-REALITÄT:
├── BSD ist kostenlos verdient → Abo "kostet" nichts echtes
├── Conversion wird künstlich hoch sein (vielleicht 20-30%)
├── Das ist OK — es testet ob User den WERT des Abos verstehen
├── Post-$SCOUT: Abo kostet echtes Geld → Conversion fällt auf 3-5%
├── Wichtig: Die Abo-Struktur muss bei 3-5% Conversion immer noch sinnvoll sein
└── → Abo darf NICHT notwendig sein um Spaß zu haben
```

---

## PHASENPLAN — Was wann gebaut wird

### PHASE 1: PILOT (50-500 User)

Alles oben Beschriebene, ABER in Minimal-Ausführung:

```
IMPLEMENTIEREN:
├── Scout Score (3 Dimensionen, Echtzeit-Berechnung)
├── Rang-System (Bronze I bis Legendär)
├── 1 Club-Leaderboard (Gesamt Scout Score, Echtzeit)
├── DPC Mastery (Level 1-5)
├── Airdrop Score (Formel, tägliche Berechnung, prominent angezeigt)
├── Login Streak (Counter, Streak Shield, BSD-Rewards)
├── 15 Achievements
├── Club-Abos (Free/Bronze/Silber/Gold)
├── Profil: Score-Display, Rang, Mastery, Kader-Stärke, Airdrop Score

NOTIFICATIONS (Push):
├── "Spieltag morgen — ohne Lineup verlierst du Manager-Punkte"
├── "Du bist von Rang X auf Y gefallen"
├── "Dein Login Streak ist bei Tag 6 — morgen gibt es den Wochen-Bonus"
├── "[Name] hat dich im Leaderboard überholt"
└── "Dein Trader Score ist auf 498 — unter 500 fällst du auf Bronze III!"

DB-SCHEMA (Kern):
├── scout_scores: user_id, trader_score, manager_score, analyst_score, updated_at
├── score_history: user_id, dimension, old_value, new_value, reason, event_type, created_at
├── dpc_mastery: user_id, dpc_id, player_id, level, started_at, days_held, fantasy_uses, content_count
├── airdrop_scores: user_id, total_score, scout_component, mastery_component, activity_component, multiplier
├── login_streaks: user_id, current_streak, longest_streak, last_login, shields_remaining
├── achievements: user_id, achievement_id, unlocked_at
└── leaderboard_snapshots: club_id, user_id, rank, score, snapshot_date
```

### PHASE 2: EARLY GROWTH (500-2.000 User)

Nur implementieren wenn Phase 1 D30 Retention > 25% zeigt.

```
HINZUFÜGEN:
├── Rang-Leaderboard (Du vs. gleichrangige User)
├── Erweiterte Achievements (+10 neue, total 25)
├── DPC Mastery Level 6-7 (für älteste User)
├── Season Reset (erster Reset am Saisonende)
├── Season Badges (permanent)
├── PBT-Ausschüttung (wöchentlich, Mastery 3+ berechtigt)
├── Wöchentliche Score-Zusammenfassung (In-App)
└── "Prediction Confirmed" für Analyst Score (Post-Matching mit Match-Daten)
```

### PHASE 3: GROWTH (2.000-10.000 User)

Nur implementieren wenn Wachstum und Retention es rechtfertigen.

```
HINZUFÜGEN:
├── Liga-Leaderboard (Club vs. Club)
├── Freundes-Leaderboard
├── Scout Pass (4-Wochen-Zyklen, Free + Premium Track)
│   ├── 20 Tiers
│   ├── Pass-XP durch Score-Aktionen verdient
│   ├── Premium = Club-Abo Silber/Gold
│   └── Rewards: BSD, Cosmetics, Airdrop-Boosts
├── Tägliche Quests (3 Stück, aus Pool gezogen)
│   ├── 1x Trading-bezogen
│   ├── 1x Fantasy-bezogen
│   ├── 1x Community-bezogen
│   └── Alle-3-Bonus: Extra Airdrop Score
├── Wöchentliche Quests (5 Stück)
├── Scout Drops (Variable Rewards)
│   ├── Trigger: Login Streak Tag 7, Pass Tier, Fantasy Top 10%
│   ├── Inhalt: NUR kosmetisch + BSD (keine DPCs)
│   └── Rarity-Animation beim Öffnen
├── DPC Mastery Level 8-10
├── Profil-Rahmen (aus Pass, Achievements, Abo)
└── Erweiterte Achievements (total 40)
```

### PHASE 4: SCALE (10.000+ User)

```
HINZUFÜGEN:
├── Club Events (Club erstellt über Dashboard)
│   ├── Event-Slots nach Club-Tier
│   ├── Match Day Events, Community Challenges
│   └── Algorithmus: Max 3 Events pro User prominent
├── Thematische Scout Passes (Transfer Window, Derby, Champion)
├── Branching Paths im Pass (Trader vs. Manager vs. Analyst Track)
├── Geschichtete Leaderboards (Club → Liga → Rang → Global)
├── Global Hall of Fame (Top 100 weltweit)
├── Scout Drops mit Cosmetics die sichtbar sind (genug User für Social Proof)
├── Advanced Achievements (total 60+)
├── Dynamische Quests (generiert aus Live-Spieler-Daten und Events)
└── PBT Concentration-Modell (Mastery 5+ only, Tier-gewichtet)
```

---

## TECHNISCHE ARCHITEKTUR

### Event-Bus (von Anfang an)

Jede User-Aktion emittiert ein Event. Systeme reagieren asynchron. Kein System weiß vom anderen.

```
EVENTS:
├── DPC_PURCHASED { userId, dpcId, playerId, price, source: "ipo"|"market" }
├── DPC_SOLD { userId, dpcId, playerId, price, profit }
├── FANTASY_LINEUP_SET { userId, eventId, playerIds, captainId }
├── FANTASY_RESULT { userId, eventId, rank, percentile, points }
├── POST_CREATED { userId, postId, type: "post"|"analysis", playerIds }
├── POST_LIKED { postId, likerId, authorId }
├── POST_DOWNVOTED { postId, voterId, authorId }
├── BOUNTY_COMPLETED { userId, bountyId, reward }
├── LOGIN { userId, streak_day }
├── MATCH_RESULT { fixtureId, playerRatings[] }
└── REFERRAL_ACTIVATED { referrerId, referredId }

LISTENER:
├── ScoreService.onEvent(event) → Update Trader/Manager/Analyst Score
├── MasteryService.onEvent(event) → Update DPC Mastery
├── AirdropService.onEvent(event) → Update Airdrop Score
├── AchievementService.onEvent(event) → Check Achievement Conditions
├── LeaderboardService.onEvent(event) → Update Rankings
├── StreakService.onEvent(event) → Update Login Streak
├── NotificationService.onEvent(event) → Trigger Push/In-App
└── AnalyticsService.onEvent(event) → Track für Retention-Analyse

PILOT-IMPLEMENTIERUNG:
├── "Async" = synchrone Funktionsaufrufe (bei 50 Usern egal)
├── Alle Listener als Supabase Edge Functions ODER Next.js API Routes
├── Event-Log Tabelle: event_type, payload, processed_at
├── Bei Scale (10k+): Echte Queue (BullMQ, Inngest, Trigger.dev)
└── Wichtig: Event-Struktur JETZT richtig definieren, auch wenn Implementierung synchron
```

### Score-Berechnung

```
PILOT:
├── Score-Änderung wird bei jedem Event sofort berechnet
├── Neue Zeile in score_history
├── scout_scores Tabelle wird direkt upgedated
├── Leaderboard = View auf scout_scores, kein Cache nötig bei 50 Usern
└── Einfach, schnell, korrekt

SCALE:
├── Score-Änderung wird Event-basiert in Queue geschrieben
├── Worker berechnet Score-Updates batch-weise (alle 30 Sekunden)
├── Leaderboard = Materialized View, Refresh alle 5 Minuten
├── Airdrop Score = Nightly Batch-Job (nicht Echtzeit)
└── Score-History = Append-Only (für Audit-Trail und Replay)
```

### Airdrop Score Berechnung

```
PILOT:
├── Nightly Cron Job (02:00 Uhr)
├── Berechnet für jeden User:
│   ├── Scout Score Komponente (basierend auf aktuellem Rang)
│   ├── Mastery Komponente (Summe aller Mastery Levels)
│   ├── Activity Komponente (Login Streak, Trades, Fantasy, Content vom Vortag)
│   ├── Multiplier (Founding Scout, Abo-Tier)
│   └── → Schreibt in airdrop_scores Tabelle
├── Täglicher Zuwachs wird beim nächsten Login angezeigt:
│   "Gestern: +47 Airdrop Score (Scout: +14, Mastery: +21, Activity: +12)"
└── Leaderboard sortiert nach airdrop_scores.total_score
```

---

## ZUSAMMENFASSUNG: Was bei Launch stehen muss

```
MINIMUM VIABLE GAMIFICATION (Pilot):

1. Scout Score          ← 3 Dimensionen, steigt UND sinkt, Elo-artig
2. Rang-System          ← Bronze I bis Legendär, visuelle Badges
3. 1 Club-Leaderboard   ← Echtzeit, prominent auf Home
4. DPC Mastery (1-5)    ← Commitment-System, nicht Grind
5. Airdrop Score        ← Die Meta-Motivation, transparent, prominent
6. Login Streak         ← Täglicher Anker, Streak Shield, Push
7. 15 Achievements      ← Meilensteine, Discovery-Moment
8. Club-Abos            ← Beschleuniger, Airdrop-Multiplikator
9. Push Notifications   ← Score sinkt, Rang fällt, Streak Gefahr, Spieltag
10. Event-Bus           ← 1 Aktion → viele Systeme reagieren

NICHT BEI LAUNCH:
├── Scout Pass (Phase 3)
├── Quests (Phase 3)
├── Scout Drops (Phase 3)
├── Club Events (Phase 4)
├── Profil-Rahmen/Cosmetics (Phase 3)
├── Mehrere Leaderboards (Phase 2-4)
├── PBT-Ausschüttung (Phase 2)
├── Thematische Passes (Phase 4)
└── Dynamische Quests (Phase 4)

KILL-KRITERIEN NACH 4 WOCHEN:
├── D7 Retention < 20% → Score-Loop funktioniert nicht
├── 0 Trades/Woche → Markt-Mechanik kaputt
├── 0 Fantasy-Lineups → Fantasy unwichtig
├── Kein organischer Zuwachs → kein virales Potential
└── Bei Kill-Kriterium: Analysieren WARUM, nicht blind Features draufwerfen
```

---

*Dieses Dokument ist die Gamification-Spezifikation für Claude Code. Es wird phasenweise implementiert. Keine Phase wird gestartet bevor die vorherige validiert ist.*
