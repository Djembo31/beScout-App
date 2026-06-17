# Polls & Community-Monetarisierung — Zielmodell

> **Zweck:** Das konsolidierte Ziel-Modell für Umfragen (Polls) als Vereins-Geldmaschine + Fan-Stimme, inkl. Discovery (Suche/Filter) und der sozialen Schicht (Follower/Abo/Fan-Rang). Entstanden aus der Strategie-Session 2026-06-17 (Anil, in Korrektur meines ersten Missverständnisses).
>
> **Status:** Zielbild — Vision geklärt, Bau offen. Referenz für alle künftigen Poll-/Discovery-Slices. **Beibezug Pflicht** (Anil: „darf nicht verloren gehen, wird unbedingt genutzt").
>
> **Korrektur-Hinweis:** Ersetzt die falsche Formulierung in `csf-club-treasury-model.md` §8 („Polls: Verein belohnt Teilnahme / Umkehrung"). Polls sind KEINE RAUS-Mechanik (Verein zahlt Fans), sondern eine **REIN-Mechanik** (Fan zahlt → Verein verdient → Treasury).

---

## 1. Strategischer Kern — die Lücke, die wir schließen

Fans äußern überall ihre Meinung über Spieler/Vereine, aber **der Verein kann das nicht kanalisieren und nicht zu Geld machen.** Besonders zur **Transferzeit** sind Fans heiß und wollen mitreden („holt diesen Spieler!") — es fehlt der Draht zum Verein. **Genau diese Lücke schließen wir.**

- **Verein:** macht aus Fan-Meinung **Geld** (REIN → Treasury) + bekommt **Scouting-/Stimmungs-Daten**.
- **Fan:** fühlt sich **gehört** und **bestimmt mit**.
- **Skalen-Hebel (das B2B-Verkaufsargument):** Galatasaray ~35 Mio Fans. 1 % an Bord + voll teilnehmend = **350.000 zahlende Teilnehmer** = Geldmaschine.

**Geld-Richtung (WICHTIG):** Polls sind **extractive = gewollt** (Fan zahlt, Verein/Creator verdient). Für Vereins-Polls ist das ein **REIN-Kanal in die Treasury** — KEIN RAUS. Gratis-Votes bleiben als „Fühl-dich-gehört"-Basis.

---

## 2. Die drei Anlege-Spuren

| Spur | Wer legt an | Im Namen von | Kosten Fan? | Geld an | Status heute |
|------|-------------|--------------|-------------|---------|--------------|
| **Gratis-Club-Vote** (`club_votes`) | Club-Admin | Verein | nein | niemand | ✅ existiert (`createVote`, `AdminVotesTab`) |
| **Bezahlte Vereins-Umfrage** | **Club-Admin** | **Verein (offiziell)** | ja | **Vereins-Treasury** | ⚠️ Tabelle + Vote da, **Erstellung fehlt komplett** |
| **Bezahlte User-Umfrage** | **User (ab Follower-Schwelle)** | **eigener Name** | ja | **User-Wallet** | ⚠️ Tabelle + Vote da, **Erstellung fehlt komplett** |

**Current-State-Befund (verifiziert 2026-06-17):** `community_polls` kann **gelesen, abgestimmt (bezahlt, 70 % Creator / 30 % Plattform via `cast_community_poll_vote`), abgebrochen** werden — aber **es gibt KEINE Erstellung** (kein Service, keine RPC, keine UI). Die „Hülle ohne Tür". Einzige existierende Poll-Erstellung = Gratis-Club-Vote (Admin).

---

## 3. Die Identitäts-/Autoritäts-Grenze (sicherheitskritisch)

> **Sich beziehen darf jeder. Im Namen des Vereins sprechen — und an dessen Kasse — nur ein Club-Admin.**

- **Bezug (Tag) ≠ Urheberschaft.** Ein User darf eine Umfrage auf einen Verein/Spieler **beziehen** (Thema), aber **niemals „im Namen des Vereins" erstellen**.
- **„Als der Verein auftreten"** (offiziell, Geld → Treasury) ist **nur verifiziertem Club-Admin** erlaubt.
- Sonst: Fan könnte Vereins-Umfrage fälschen oder Geld in/aus der Treasury umleiten → **hart verriegeln** (gleiche Klasse wie Events-`type`-Quellenmodell + Bounty-Quellen).
- Heute fehlt das Feld, das „**offiziell vom Verein**" von „**User mit Vereins-Bezug**" unterscheidet (`community_polls` hat nur `created_by` + `club_id`).

---

## 4. Bezug/Tags — Verein UND/ODER Spieler

Eine Umfrage (analog Bounties / bezahlte Research/Paywalls) kann sich beziehen auf:
- einen **Verein** (`club_id`),
- einen **Spieler** (`player_id`),
- **beides** (z. B. „Sollte Gala Spieler X holen?").

**Heute:** `community_polls` hat nur `club_id`, **keinen `player_id`**. Bounties + Research tragen `player_id` bereits → Vorlage vorhanden.

---

## 5. Discovery — Suche + Filter (über Polls UND Paywalls)

Wenn es viele Umfragen, Polls und **Paywalls** (bezahlte Reports) gibt, müssen Fans sie **gezielt finden**:
- **filtern nach Verein** („alles über Gala"),
- **filtern nach Spieler** („alles über Talent X"),
- **suchen nach Stichwort/Thema**.

**Beispiel:** Ein Gala-Fan tippt seinen Lieblings-Stürmer an → sieht **alle Umfragen + bezahlten Reports zu genau dem Spieler** (und/oder zu Gala). Creator/Verein bekommt Reichweite genau bei den richtigen Fans.

**Heute:** Community-Feed hat Typ-Filter (`all/posts/rumors/research/bounties/votes/news`) + Textsuche, aber **NICHT nach Spieler oder Verein**. → die zwei Anker (Verein + Spieler) fehlen als Filter-Achse.

**Merksatz:** *Jeder Inhalt kriegt zwei Anker — welcher Verein, welcher Spieler — und über genau die kann gesucht/gefiltert werden.*

---

## 6. Die soziale Schicht — Follower / Abonnenten / Fan-Rang

| Hebel | Rolle | Funktion | Status heute |
|-------|-------|----------|--------------|
| **Follower** (`club_followers`) | Reichweite (Lautsprecher) | **wer sieht es** (Verteilung an Follower) + **Tor fürs User-Anlegen** (ab Schwelle) | existiert, bringt heute **NICHTS** |
| **Abonnenten** (`club_subscriptions`) | Perks/Zugang (zahlende Stammkundschaft) | **doppeltes Stimmgewicht**, früherer/exklusiver Zugang | 2×-Gewicht nur bei **Gratis-Votes**, nicht bei Paid-Polls |
| **Fan-Rang** (`fan_rankings`, *„evtl."*) | Treue-Status (Vereinsikonen) | Bevorzugung der Loyalsten: Gewicht, exklusive Treue-Umfragen, **Anteil an Auszahlung** | existiert (6 Stufen), aber **fast wirkungslos** (CSF-Bonus gerade entfernt) |

**Beispiel (alle drei):** Gala startet „Welche Position verstärken?" → erreicht 35 Mio **Follower** → **Gold-Abos** stimmen mit 2× Gewicht / sehen zuerst → **Vereinsikonen** bekommen am Ende einen Anteil aus dem Topf.

---

## 7. Offene Idee (noch nicht entschieden) — „Mehrheit der User auszahlen"

Anil: „es sollte eine Möglichkeit geben, wo auch die Mehrheit der User ausgezahlt werden kann?" Drei Lesarten:
- **(a) Lotterie/Topf:** Teil der Einnahmen wird unter Teilnehmern verlost/verteilt → Mitmach-Anreiz.
- **(b) „Recht behalten":** Wer für das stimmt, was der Verein am Ende **wirklich tut**, wird belohnt (prediction-artig).
- **(c) Mini-Teilnahme-Reward:** jeder Teilnehmer kriegt eine Kleinigkeit zurück.
- Fan-Rang könnte die Verteilung **gewichten**. → Entscheidung wenn wir drankommen.

---

## 8. ToDos / abgeleitete Slice-Roadmap

> Mehrere Slices. Reihenfolge-Vorschlag; jeder einzeln Money/CEO-Scope.

**P1 — Poll-Erstellung („die fehlende Tür") + Quelle/Identität** *(Kern, ohne das geht nichts)*
- [ ] `create_community_poll`-RPC + Service + Erstell-UI (Frage + 2–4 Optionen + Laufzeit).
- [ ] **Autoritäts-/Quellen-Feld** (analog Events-`type`): „offiziell vom Verein" vs „User". Nur Club-Admin darf offiziell-vom-Verein anlegen.
- [ ] **Geld-Routing:** offizielle Vereins-Umfrage → Creator-Anteil in die **Treasury** (REIN-Credit, neuer Ledger-Typ z. B. `poll_revenue`); User-Umfrage → User-Wallet (wie heute). **Achtung:** vorgehaltener Ledger-Typ `poll_reward` war als **DEBIT** (RAUS) gedacht (falsche Annahme) — Polls sind REIN; korrekten Credit-Typ einführen.
- [ ] **Follower-Tor** fürs User-Anlegen (Schwelle TBD).

**P2 — Bezug Spieler + Discovery**
- [ ] `player_id` zu `community_polls` (zusätzlich zu `club_id`).
- [ ] Filter/Suche **nach Verein + Spieler** über Polls **und** Paywalls (Research) — Feed-Filter erweitern; optional auf Spieler-/Vereins-Seite ausspielen.

**P3 — Soziale Schicht aktivieren**
- [ ] **Follower** = Reichweite: Vereins-/Creator-Umfrage an Follower ausspielen/benachrichtigen. (Follow endlich mit Funktion.)
- [ ] **Abo-Perks bei Paid-Polls:** 2×-Gewicht / Early Access / exklusive Mitglieder-Umfragen.
- [ ] **Fan-Rang** (evtl.): Treue-Gewicht / exklusive Treue-Umfragen / Auszahl-Gewichtung.

**P4 — Auszahl-Idee an Teilnehmer** (offene Entscheidung §7: a/b/c).

**Querbezug:** Hängt am **Club-Treasury** (329/330b — REIN-Seite) und an der **Fan-Reward-Engine** (`csf-club-treasury-model.md` §9). Identitäts-/Quellen-Verriegelung = gleiche Klasse wie Events-`type` (Slice 331) + 5-Quellen-Modell.

---

## 9. Current-State-Inventar (verifiziert 2026-06-17)

| Baustein | Stand |
|---|---|
| `community_polls` Tabelle | ✅ (question, options JSONB, cost_bsd, creator_earned, ends_at, club_id, created_by, status, total_votes) — **kein player_id** |
| Poll anzeigen (`CommunityPollCard`) | ✅ Frage + Optionen-Balken (% erst nach Vote) + Kosten + Status-Chips + Cancel |
| Poll abstimmen (bezahlt) | ✅ `cast_community_poll_vote` (70/30), `communityPolls.ts` |
| Poll abbrechen | ✅ nur Creator, nur bei 0 Votes |
| **Poll ERSTELLEN** | ❌ **fehlt komplett** (kein Service/RPC/UI) |
| Gratis-Club-Vote erstellen | ✅ `createVote` / `AdminVotesTab` (Admin), 2×-Gewicht Bronze+ |
| Filter nach Verein/Spieler | ❌ (nur Typ-Filter + Textsuche) |
| Follower-Funktion / Fan-Rang-Wirkung | ❌ (existieren, aber wirkungslos) |

---

*Strategie-Session 2026-06-17. Vision geklärt, Bau offen. Decision-Log: `memory/decisions.md` D86.*
