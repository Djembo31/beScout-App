---
title: Gamification Design-Prinzipien — 5 Regeln, Verhaltensökonomie, Engagement-Währungen
created: 2026-06-29
updated: 2026-06-29
status: active
tags: [gamification, design-principles, verhaltensökonomie, tickets, cosmetics, retention, mystery-box]
consult_when: Gamification-Design-Entscheidung, neue Reward-/Retention-Mechanik, Verlustaversion/Score-sinkt-Begründung, Skill-über-Grind, Ticket-Balancing (Quellen/Senken), Cosmetics-Rarity/Social-Currency, Mystery-Box-Lootbox-Legal, Newbie-Protection/Season-Reset/dynamische-Titel (entworfen, nicht gebaut)
---

# Gamification Design-Prinzipien

> **Kanonische Design-Philosophie-Heimat** (konsolidiert 2026-06-29 aus `docs/bescout-gamification-v4-FINAL.md` + `docs/SYSTEM-DESIGN-v2.md` → git-History, Slice 448 K2.3-D).
> **Was hier steht:** das *Warum* hinter der Gamification — Prinzipien, Verhaltensökonomie, Balancing-Logik, bewusst-entworfene-aber-noch-nicht-gebaute Mechaniken.
> **Was NICHT hier steht** (kanonisch woanders, kein Duplikat §0): die *gebaute* Mechanik — 3-Dim-Elo/Ränge/Mastery/Streaks/Achievements → [domain/reward-ranking.md](../domain/reward-ranking.md) · Spieltag/Scoring → [domain/fantasy.md](../domain/fantasy.md) · Mystery-Box/Chips realtime → [domain/equipment-realtime.md](../domain/equipment-realtime.md) · Missions → [domain/missions.md](../domain/missions.md) · Geld-Kreislauf → [domain/treasury.md](../domain/treasury.md).
> **Wording-Heilung:** Quell-Docs nutzten BSD/bCredits/DPC + einen Echtgeld-Shop → geheilt auf **Credits** (Pilot = wertloses Spielgeld, D99) + **Scout Card**. Die Predictions-Engine als konkrete Mechanik ist **entfernt (Slice 338)**; die Prinzipien dahinter leben in Fantasy/Trading/Analyst weiter.

## Die 5 Design-Regeln (Kern-Philosophie)

Die Reihenfolge *ist* die Priorität. Bei Konflikt gewinnt die niedrigere Nummer.

**1 · Skill über Grind.** Der Score steigt, wenn du *recht hast* — nicht, wenn du *aktiv bist*. 100 schlechte Einschätzungen < 5 gute. Aktivität gibt Engagement-Währung (Tickets), Ergebnis gibt Score. Die beiden nie vermischen.

**2 · Verlust über Gewinn (ABSOLUT ZENTRAL).** Der Score kann **sinken**, der Rang **fallen**, die Streak **brechen**. Verlustaversion ist der stärkste Engagement-Trigger — stärker als jede Belohnung. Wer einen Score will, der nie sinkt, ist nicht die Zielgruppe. → schärfster Unterschied zu Sorare/FPL (Punkte dort nur kumulativ).

**3 · Sofort über Später.** Jede Aktion hat ein Ergebnis in <24h. Verzögertes Feedback tötet Retention. (Im Quell-Design lösten das Predictions; heute liefert der Spieltag-Scoring-Zyklus + Trading den schnellen Loop.)

**4 · Können über Markt (Anti-„Pay-to-Win").** Gutes Scouten/Aufstellen muss *immer* mehr Score bringen als gutes Traden. Ziel-Gewichtung ~60 % Fantasy/Analyst : 40 % Trading. Verhindert, dass Kapital den Skill schlägt — der Sorare-Fehler.

**5 · Fairness über Monetarisierung.** Ein Free-User *kann alles erreichen*. Scout-Card-Besitz ist **Vorteil, nicht Voraussetzung**. (Phase 1: Credits = wertloses Spielgeld, kein Echtgeld-Kauf-Pfad — der „BSD-Shop" aus dem Quell-Doc ist NICHT kanonisch, D99. Ein etwaiger Echtgeld-On-Ramp wäre Phase-2-Thema und müsste „beschleunigt, gatekeept nicht" bleiben.)

## Verhaltensökonomie-Fundament

- **Consumption Capital (Stigler/Becker):** Je mehr ein User durch BeScout über Fußball *lernt*, desto mehr Freude hat er am Konsum (Spiele schauen). Eine Einschätzung abzugeben verändert, *wie* man schaut — aufmerksamer, emotional investierter. Engagement-Mechaniken sollen Lernen belohnen, nicht nur Klicks.
- **Verlustaversion (Kahneman/Tversky):** Verluste werden ~2× stärker gewichtet als gleich große Gewinne. Darum erzeugen „Score sinkt" + „Streak in Gefahr" + „Rang-Abstieg" mehr Rückkehr als „+X gewonnen". Genutzt in: Absent-Penalty, sinkender Elo, Streak-Bruch.
- **Knappheit:** Prestige-Objekte (seltene Cards, Legendary-Cosmetics) müssen *teuer in Zeit* sein. „1-2 Monate sparen für ein Rare" ist Design-Absicht, kein Bug.

## Engagement-Währungen — die Design-Trennung

Zwei getrennte Währungen, bewusst nie vermischt:

| | **Credits** (Wirtschaft) | **Tickets** (Engagement) |
|---|---|---|
| Zweck | Scout-Card-Handel, Erstverkauf, Abos, Research | Event-Eintritt, Boosts, Mystery-Box |
| Herkunft | Verdient (Trading, CSF, Rewards) | Engagement (Login, Missions, Streaks) |
| Cash-Bezug | Phase 1 wertloses Spielgeld (D99) | NIE Cash-Wert, nicht handelbar |
| Warum getrennt | Geld-Kreislauf sauber + deflationär halten | tägliche Motivation, ohne Credits zu „drucken" |

**Designregel (Soll):** Engagement-Belohnungen (Missions/Streaks/Achievements) sollen **Tickets + Cosmetics, niemals Credits** geben — sonst bräuchte das Geld eine Quelle und würde die Treasury-Deflation brechen.

> **Ist-Stand-Caveat (bewusster Soll-Ist-Gap):** Die *gebaute* Engine mintet aktuell noch Credits ($SCOUT) für Missions (`claim_mission_reward` 25-400), Streak-Milestones (100-5.000) und Score-Road (`claim_score_road` 200-20.000) — kanonisch in [domain/reward-ranking.md](../domain/reward-ranking.md) §3 (Minting-Schicht). Nur Daily Challenge, Achievements und Mastery sind heute schon Tickets-only. In Phase 1 ist das tolerierbar (Credits = wertloses Spielgeld, D99); die Soll-Regel ist das Migrationsziel, kein Ist-Stand.

### Ticket-Balancing (Quellen/Senken)

Referenz-Mengen aus dem Design (exakte Zahlen = Balancing nach Live-Daten):

- **Quellen:** Daily Login 5 · Daily Challenge 10-25 · Missions 15-100/Woche · Rang-Aufstieg 50-500 · Score-Road-Milestone 25-200 · Streak-Milestone 10-75 · Achievement-Unlock 20-100 · Mystery-Box 5-50.
- **Senken:** BeScout-Event 10-50 · Club-Event 5-30 · Lineup-Boost 25 · Re-Entry 20 · Captain-Switch 15 · Live-Prediction 10 · Premium-Emote 5.

**Der Kreislauf:** täglich einloggen → Tickets verdienen → an Events teilnehmen → Tickets ausgeben → morgen wiederkommen. Engagement hebt den Rang, Rang gibt mehr Tickets (Aufstiegs-Bonus), mehr Tickets = mehr Events = besserer Manager-Rang. Selbstverstärkend.

### Cosmetics als Social Currency

Cosmetics (Rahmen, Titel, Profil-Effekte, Badges, Emotes) sind **nicht handelbar, ohne Cash-Wert** — rein Status. Rarity-Stufen: Common → Rare → Epic → Legendary.

Sie wirken nur als Social Currency, wenn sie **überall sichtbar** sind (8 Flächen): Leaderboard · Community-Posts · Trading-Orderbuch (Vertrauenssignal) · Club-Page (Top-Fans) · Profil + Vitrine · Event-Teilnehmerliste · Live-Match-Thread · Social-Notifications. Logik: Allgegenwart → Signaling → Exklusivität (saisonal begrenzt) → Wettbewerb („ich will den Rahmen vom #1").

### Mystery-Box — Lootbox-Legal-Argument

Die Mystery-Box enthält **nur Tickets + Cosmetics** → keine Glücksspiel-Regulierung anwendbar, weil: (1) kein monetärer Gewinn-Wert, (2) Tickets/Cosmetics nicht handelbar + ohne Cash-Wert, (3) kein Echtgeld zum Öffnen nötig (durch Engagement verdient), (4) keine „Pay-to-Open"-Mechanik, (5) kein Sekundärmarkt. → Detail-Einordnung [decisions/legal-classification.md](../decisions/legal-classification.md).

## Entworfen, aber (noch) nicht gebaut — Design-Referenz

Diese Mechaniken sind im Quell-Design ausgearbeitet, aber **nicht in Prod**. Als Blaupause bei künftigem Bau — nicht als Ist-Stand lesen:

- **Dynamisches Titel-System** — Titel nach der *stärksten* Dimension, ändert sich mit ihr. 3 Dim × 6 Stufen = 18 Titel (Trader: Rookie → Smart Money → Top Trader → Market Shark → Trading Legend → „The Wolf"; Manager analog → „The Boss"; Analyst → „The Prophet"). Bei Gleichstand: Dimension mit mehr Score-Events.
- **Newbie Protection (Tag 1-30)** — milder Absent-Penalty, Score-Floor 200, „Comeback Kid" nach Pechsträhne, ermutigender Push-Ton. Nach Tag 30: kein Schutz, „Score lügt nicht". Senkt Frühchurn, ohne den „Score sinkt"-Kern zu verwässern.
- **Season-Reset-Politik (pro Dimension)** — Trader *soft* (Überschuss über Rang-Minimum halbiert) · Manager *hard* auf 500 (neue Saison, neues Team) · Analyst *kein* Reset (Reputation ist langfristig) + permanentes Season-Badge-Archiv. Die Asymmetrie ist Absicht: belohnt je Dimension das richtige Verhalten.
- **Live-Gamification (Spieltag, Realtime)** — Live-Predictions/Captain-Switch/Lineup-Boost/Emotes gegen Tickets während des laufenden Spiels. Höchster Sofort-Loop (Regel 3), aber Realtime-Kosten → spätes Scale-Thema (→ [research/scaling.md](../research/scaling.md)).

## Gebaut & kanonisch (kein Duplikat hier)

3-Dim-Elo (Trader/Manager/Analyst), Ränge, Mastery, Streaks, 33 Achievements, Mystery-Box-Engine, Fan-Rang × CSF → [domain/reward-ranking.md](../domain/reward-ranking.md), [domain/fantasy.md](../domain/fantasy.md), [domain/equipment-realtime.md](../domain/equipment-realtime.md), [domain/missions.md](../domain/missions.md). Die Score-Mechanik ist seit Slice 419 **fixture-gebunden** (D113) und seit 427-429 **GW-per-Liga** (D115) — die festen Score-Tabellen aus dem Quell-Doc (+10/+40 etc.) sind damit überholt.
