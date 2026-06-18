---
title: Polls & Community-Monetarisierung — Vereins-Geldmaschine (Kanon)
created: 2026-06-17
updated: 2026-06-18
status: active
tags: [polls, community, monetization, treasury, poll_revenue, discovery, follower, fan-rank]
consult_when: Polls, Umfragen, poll_revenue, Verein→Treasury vs User→Wallet, Follower-Tor, Discovery, Identitätsgrenze Club-Admin, Bezug Verein/Spieler
verified-against: .claude/rules/community.md @ 2026-06-17 · Code-Stand Slices 333-337+339 @ 2026-06-18
---

# Polls & Community-Monetarisierung — Zielmodell (Kanon)

> **Kanon (WIE):** Umfragen (Polls) als Vereins-Geldmaschine + Fan-Stimme, inkl. Discovery (Suche/Filter) und sozialer Schicht (Follower/Abo/Fan-Rang). **WARUM-Entscheidung:** `memory/decisions.md` **D86**. Strategie-Session 2026-06-17.
>
> **Status (2026-06-18):** P1 Erstellung (Slice 333) + P2 Spieler-Bezug & Discovery (334) + P3 soziale Schicht Follower/Abo (336) + Fee 20/80 (337) **gebaut + live**. Offen: P3c Fan-Rang + P4 (Teilnehmer-Auszahl, §7). Referenz für alle künftigen Poll-/Discovery-Slices. **Beibezug Pflicht** (Anil: „darf nicht verloren gehen, wird unbedingt genutzt").
>
> **Geld-Richtung (zentral):** Polls sind eine **REIN-Mechanik** (Fan zahlt → Verein verdient → Treasury), NICHT „Verein belohnt Teilnahme". Querbezug: `domain/treasury.md` (REIN-Seite, Slices 329/330b).

---

## 1. Strategischer Kern — die Lücke, die wir schließen

Fans äußern überall ihre Meinung über Spieler/Vereine, aber **der Verein kann das nicht kanalisieren und nicht zu Geld machen.** Besonders zur **Transferzeit** sind Fans heiß und wollen mitreden („holt diesen Spieler!") — es fehlt der Draht zum Verein. **Genau diese Lücke schließen wir.**

- **Verein:** macht aus Fan-Meinung **Geld** (REIN → Treasury) + bekommt **Scouting-/Stimmungs-Daten**.
- **Fan:** fühlt sich **gehört** und **bestimmt mit**.
- **Skalen-Hebel (das B2B-Verkaufsargument):** Galatasaray ~35 Mio Fans. 1 % an Bord + voll teilnehmend = **350.000 zahlende Teilnehmer** = Geldmaschine.

**Geld-Richtung:** Polls sind **extractive = gewollt** (Fan zahlt, Verein/Creator verdient). Für Vereins-Polls ist das ein **REIN-Kanal in die Treasury** — KEIN RAUS. Gratis-Votes bleiben als „Fühl-dich-gehört"-Basis.

---

## 2. Die drei Anlege-Spuren

| Spur | Wer legt an | Im Namen von | Kosten Fan? | Geld an | Status heute |
|------|-------------|--------------|-------------|---------|--------------|
| **Gratis-Club-Vote** (`club_votes`) | Club-Admin | Verein | nein | niemand | ✅ existiert (`createVote`, `AdminVotesTab`) |
| **Bezahlte Vereins-Umfrage** | **Club-Admin** | **Verein (offiziell)** | ja | **Vereins-Treasury** | ✅ **gebaut** (Slice 333: `create_community_poll` `source='club'` → `poll_revenue` REIN-Credit; UI `CreatePollButton`/`CreatePollModal` in AdminVotesTab) |
| **Bezahlte User-Umfrage** | **User (ab 50 Followern)** | **eigener Name** | ja | **User-Wallet** | ✅ **gebaut** (Slice 333: `source='user'`, Follower-Tor 50; UI-Einstieg im Community-Feed) |

**Current-State-Befund (verifiziert 2026-06-18):** `community_polls` ist voll funktional: **erstellbar** (Slice 333, `create_community_poll`, Quellen-Identität `source` club/user, Follower-Tor 50, Geld-Routing keyt auf `source`), **mit Spieler-Anker** (Slice 334, `player_id`), **abstimmbar** (bezahlt, 80 % Creator / 20 % Plattform via `cast_community_poll_vote`, Slice 337; Abo-2×-Gewicht Slice 336), **abbrechbar** (nur Creator, 0 Votes). Die „Hülle ohne Tür" ist geschlossen.

---

## 3. Die Identitäts-/Autoritäts-Grenze (sicherheitskritisch)

> **Sich beziehen darf jeder. Im Namen des Vereins sprechen — und an dessen Kasse — nur ein Club-Admin.**

- **Bezug (Tag) ≠ Urheberschaft.** Ein User darf eine Umfrage auf einen Verein/Spieler **beziehen** (Thema), aber **niemals „im Namen des Vereins" erstellen**.
- **„Als der Verein auftreten"** (offiziell, Geld → Treasury) ist **nur verifiziertem Club-Admin** erlaubt.
- Sonst: Fan könnte Vereins-Umfrage fälschen oder Geld in/aus der Treasury umleiten → **hart verriegeln** (gleiche Klasse wie Events-`type`-Quellenmodell + Bounty-Quellen, `domain/treasury.md` §7).
- ✅ **Gelöst (Slice 333):** `community_polls.source` ('club'|'user') unterscheidet „offiziell vom Verein" von „User mit Vereins-Bezug"; `create_community_poll` verriegelt server-seitig (nur Club-Admin darf `source='club'`), Geld-Routing keyt auf `source` (club→Treasury, user→Wallet).

---

## 4. Bezug/Tags — Verein UND/ODER Spieler

Eine Umfrage (analog Bounties / bezahlte Research/Paywalls) kann sich beziehen auf:
- einen **Verein** (`club_id`), einen **Spieler** (`player_id`), oder **beides** (z. B. „Sollte Gala Spieler X holen?").

**✅ Gebaut (Slice 334):** `community_polls.player_id` (uuid NULL, FK players ON DELETE SET NULL) ergänzt; `create_community_poll` nimmt `p_player_id`, Picker in CreatePollModal, Spieler-Tag in CommunityPollCard.

---

## 5. Discovery — Suche + Filter (über Polls UND Paywalls)

Wenn es viele Umfragen, Polls und **Paywalls** (bezahlte Reports) gibt, müssen Fans sie **gezielt finden**:
- **filtern nach Verein** („alles über Gala"), **filtern nach Spieler** („alles über Talent X"), **suchen nach Stichwort/Thema**.

**Beispiel:** Ein Gala-Fan tippt seinen Lieblings-Stürmer an → sieht **alle Umfragen + bezahlten Reports zu genau dem Spieler** (und/oder zu Gala).

**✅ Gebaut (Slice 334):** Community-Feed hat jetzt eine **Anker-Chip-Leiste** (Verein- + Spieler-Anker aus dem pre-anchor-Set, §254-konform) die ALLE Feed-Typen filtert, + erweiterte Textsuche die Spieler-Name **und** Verein-Name über alle Typen matcht (live verifiziert 2026-06-18). Offen (P2b, Scope-Out): klickbare Card-Tags als Anker-Setzer + Einstieg von der Spieler-Detailseite.

**Merksatz:** *Jeder Inhalt kriegt zwei Anker — welcher Verein, welcher Spieler — und über genau die kann gesucht/gefiltert werden.*

---

## 6. Die soziale Schicht — Follower / Abonnenten / Fan-Rang

| Hebel | Rolle | Funktion | Status heute |
|-------|-------|----------|--------------|
| **Follower** (`club_followers`) | Reichweite (Lautsprecher) | **wer sieht es** + **Tor fürs User-Anlegen** (ab Schwelle) | ✅ **aktiv** — Follower-Tor 50 fürs User-Anlegen (333) + `poll_new`-Notification an ALLE Follower bei neuer Umfrage (336; Range-Loop gegen 1000-Cap, Slice 339) |
| **Abonnenten** (`club_subscriptions`) | Perks/Zugang | **doppeltes Stimmgewicht**, früherer/exklusiver Zugang | ✅ **2×-Gewicht jetzt auch bei Paid-Polls** (336, `community_poll_votes.weight`; Gewicht skaliert NUR Tally, NICHT Geld). Offen: Early/exklusiver Zugang |
| **Fan-Rang** (`fan_rankings`, *„evtl."*) | Treue-Status (Vereinsikonen) | Gewicht, exklusive Treue-Umfragen, **Anteil an Auszahlung** | ⚠️ existiert (6 Stufen), aber **fast wirkungslos** — **= P3c, noch offen** |

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

**P1 — Poll-Erstellung („die fehlende Tür") + Quelle/Identität** ✅ **DONE (Slice 333)**
- [x] `create_community_poll`-RPC + Service + Erstell-UI (Frage + 2–4 Optionen + Laufzeit).
- [x] **Autoritäts-/Quellen-Feld** `source` (analog Events-`type`): „offiziell vom Verein" vs „User". Server-seitig verriegelt.
- [x] **Geld-Routing:** Vereins-Umfrage → **Treasury** (REIN-Credit `poll_revenue`); User-Umfrage → User-Wallet. (Credit-Typ korrekt eingeführt, nicht der falsch angenommene `poll_reward`-DEBIT.)
- [x] **Follower-Tor** fürs User-Anlegen (Schwelle = 50).

**P2 — Bezug Spieler + Discovery** ✅ **DONE (Slice 334)**
- [x] `player_id` zu `community_polls`.
- [x] Filter/Suche **nach Verein + Spieler** über alle Feed-Typen (Anker-Chip-Leiste + erweiterte Suche). Research trägt Anker bereits.

**P3 — Soziale Schicht aktivieren** — Reichweite + Abo ✅ **DONE (Slice 336)**, Fan-Rang offen
- [x] **Follower** = Reichweite: `poll_new`-Notification an alle Follower (Range-Loop Slice 339).
- [x] **Abo-Perks bei Paid-Polls:** 2×-Gewicht (`community_poll_votes.weight`).
- [ ] **P3c — Fan-Rang** (evtl.): Treue-Gewicht / exklusive Treue-Umfragen / Auszahl-Gewichtung. + Abo Early/exklusiver Zugang. **← nächstes offenes Poll-Stück.**

**P4 — Auszahl-Idee an Teilnehmer** — **VERWORFEN (Anil 2026-06-18):** Lotterie (a)/Prediction (b) = Glücksspiel-Risiko, Mini-Reward (c) nicht verfolgt. Nicht wieder aufmachen ohne neue Anil-Ansage.

**Querbezug:** Hängt am **Club-Treasury** (`domain/treasury.md`, 329/330b — REIN-Seite) und an der **Fan-Reward-Engine** (`domain/treasury.md` §8). Identitäts-/Quellen-Verriegelung = gleiche Klasse wie Events-`type` (Slice 331) + 5-Quellen-Modell.

---

## 9. Current-State-Inventar (verifiziert 2026-06-18)

| Baustein | Stand |
|---|---|
| `community_polls` Tabelle | ✅ (question, options JSONB, cost_bsd, creator_earned, ends_at, club_id, created_by, status, total_votes, **`source`** [333], **`player_id`** [334]) |
| Poll anzeigen (`CommunityPollCard`) | ✅ Frage + Optionen-Balken (% erst nach Vote) + Kosten + Status-Chips + Cancel + **Spieler-Tag** (334) |
| Poll abstimmen (bezahlt) | ✅ `cast_community_poll_vote` (80/20, Slice 337) + **Abo-2×-Gewicht** (336, `community_poll_votes.weight`), `communityPolls.ts` |
| Poll abbrechen | ✅ nur Creator, nur bei 0 Votes |
| **Poll ERSTELLEN** | ✅ **`create_community_poll`** (333): `source` club/user, Follower-Tor 50, cost-Cap 1000 $SCOUT, Geld-Routing keyt auf `source`. UI `CreatePollModal`/`CreatePollButton` (2 Einstiege) + optionaler Spieler-Picker (334) |
| Gratis-Club-Vote erstellen | ✅ `createVote` / `AdminVotesTab` (Admin), 2×-Gewicht Bronze+ |
| Filter nach Verein/Spieler | ✅ **Anker-Chip-Leiste + Such-Match über alle Feed-Typen** (334), live verifiziert |
| Follower-Reichweite / Abo-Gewicht | ✅ `poll_new`-Notification an alle Follower (336, Range-Loop 339) + Abo-2× bei Paid-Polls (336) |
| Fan-Rang-Wirkung | ❌ existiert (6 Stufen), wirkungslos — **= P3c offen** |

---

## 10. Gesamtbild Community-Geldkanäle (Events · Bounties · Polls · Research) — 2026-06-17

Alle hängen an **denselben zwei Ankern: Spieler + Verein** → gemeinsame Discovery (Filter/Suche).

| Kanal | Form | Wer zahlt → wer verdient | Vereins-Treasury? |
|---|---|---|---|
| **Events** | Wettbewerb | Fan zahlt Entry → Gewinner | Club-Event: Prize aus Treasury (✅ Slice 331) |
| **Bounty** | **Nachfrage (Pull)** „ich zahle für eine Lieferung" | User-Bounty: User→User · **Club-Bounty: Verein→Erfüller** | Club-Bounty: Reward aus **Treasury** (✅ Slice 332) |
| **Poll** | Meinung | Fan zahlt Vote → **Verein/Creator** | Vereins-Poll: **REIN → Treasury** (D86, P1 offen) |
| **Research/Paywall** | **Angebot (Push)** „zahl, um meine Analyse zu lesen" | User→User, **80 % Autor / 20 % Plattform** | **NEIN — bleibt User-zu-User (Entscheidung A)** |

**Research ⇄ Bounty = dieselbe Münze:** Research = **Angebot** (Autor publiziert), Bounty = **Nachfrage** (Auftraggeber pullt). Beide getaggt an Spieler+Verein, beide im selben Scout-Wissens-Markt + Reputation-Flywheel.

**User-Bounty vs Club-Bounty:** User-Bounty = offenes Freitext-Gesuch, Reward aus **eigenem Wallet** (`create_user_bounty`, Escrow `locked_balance`). Club-Bounty = strukturiert (scouting-Typ, player/position/fixture/min_tier), Reward aus **Treasury** (Slice 332, Escrow bei Erstellung).

**Entscheidung A (Research, 2026-06-17):** Research bleibt **User-zu-User** (unabhängige Scout-Stimme = der Wert). Vereins-Geldkanäle = Polls + Events + Bounties. **Option B (offizielle Club-Paywall → Treasury)** ist später leicht nachrüstbar (`research_posts.club_id` existiert), aber **kein Vorrang**.

---

*Kanon-Doc (WIE). Entscheidung (WARUM) = D86. Querbezug Treasury = `domain/treasury.md`.*
