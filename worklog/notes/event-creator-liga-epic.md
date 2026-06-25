# Event- / Creator- / BeScout-Liga-Epic — Zielbild & Roadmap

> **Status:** 🟡 Zielbild abgestimmt (Anil 2026-06-25), Bau noch nicht begonnen.
> **Warum/Was:** `memory/decisions.md` **D104**. **Wie/Reihenfolge:** dieses File.
> **Lebendes Dokument** — Anil ergänzt/ändert hier frei (Reihenfolge, Details, neue Bedingungen).
> Code-Ist-Stand verifiziert via Live-RPCs am 2026-06-25 (`rpc_lock_event_entry`, `rpc_save_lineup`, `events`-Spalten).

---

## ✍️ PLATZ FÜR ANILS ERGÄNZUNGEN (hier reinschreiben, ich baue es ein)
- (z. B. „bei Sponsor-Events soll … ", „Equipment-Gewinn heißt konkret … ", „Reihenfolge: erst X")
-
-

---

## 0. Begriffs-Klarstellung — „Liga" eindeutig machen (Anil-Entscheid 2026-06-25)

**Wurzel der Verwirrung:** Das Wort „Liga" steckt heute doppelt im Code und meint zwei verschiedene Dinge:
- **Fußball-Liga** (Bundesliga, Süper Lig, Premier League) — gruppiert die **Spieler-Karten** (`clubs.league_id`).
- **Bestehende Punkte-/Elo-„Liga"** (`is_liga_event`, `close_monthly_liga`, `monthly_liga_*`) — eine Bestenliste **der Nutzer** (wer ist bester Scout). Hat mit Fußball-Ligen nichts zu tun.

**Optimiertes Modell (so bauen):**
1. **„Liga" = AUSSCHLIESSLICH Fußball-Liga.** User-facing + Code-Begriff künftig nur noch dafür.
2. **Der Nutzer-Wettbewerb heißt → „BeScout-Saison"** (Anil-Wahl). Seine Ranglisten lesen sich „BeScout-Saison — Bundesliga" (pro Liga) und „BeScout-Saison — Gesamt" (global), je Monat/Saison. Das ist das, was heute fälschlich „Liga" heißt (`is_liga_event`/`monthly_liga_*`) → bei E-2 begrifflich umziehen.

**Jedes Event hat künftig DREI getrennte Eigenschaften (heute in „Liga-Event" verknüllt):**
| Frage | Eigenschaft | Slice |
|---|---|---|
| Aus welcher **Fußball-Liga** darf aufgestellt werden? | `league_id` + „offen" | E-1 |
| Zählt es für die **BeScout-Saison — und wie stark?** | (alt `is_liga_event` → umbenennen: voll vs. gedeckelt) | E-2 |
| Wer ist **Creator / zahlt den Topf?** | `type` (bescout/club/user/sponsor) | existiert |

**Falle Frage 1 vs. Frage 2:** Heute mischt der eine `is_liga_event`-Schalter beides (Fußball-Liga-Sinn + Wertungs-Stärke). Bei E-2 sauber in zwei Achsen trennen, sonst zählt das System die falschen Dinge zusammen.

---

## 1. Das Zielbild in einem Satz
Events kommen von **Creatorn** (BeScout / Verein / User / Sponsor). Jeder Creator zahlt den Preis-Pool, kassiert die Eintritts-Einnahmen (BeScout immer mit Anteil). Die **kostenlose BeScout-Liga** läuft **pro Liga** (Aufstellung nur aus dieser Liga) **und global**; **Creator-Events** zählen nur minimal/gedeckelt in die Liga und dürfen ihre Liga-Bindung selbst wählen.

## 2. Die vier Creator-Sorten
| Creator | zahlt Pot | Beispiel | Besonderheit |
|---|---|---|---|
| **BeScout** | BeScout | Liga-Event, Ticket-Event, Special | Liga gratis; Ticket-Events = Tickets einlösen → Credits/Equipment/Tickets; Special = höherer Ticket-Preis, Credits-Gewinn |
| **Verein** | Vereinstopf | Gala: 1000 Cr Pool, „5 Gala-Spieler + Follower" | fördert eigene SC + Follower; auch „nur Abonnenten" möglich (Fan-Rang) |
| **User** | User-Wallet | 1 Event „nur Freunde" + 1 „für alle" | Scope friends/public |
| **Sponsor** | Sponsor | offenes Event, keine Liga-Grenze | darf Liga-Bindung weglassen → alle Ligen mischbar |

**Geldfluss:** Eintritt (Tickets/Credits) → Fee-Split: **BeScout-Anteil + Creator-Kasse + Preis-Pool**. (Skelett existiert: `event_fee_config` + `rpc_lock_event_entry.fee_split`.)

## 3. Liga & Länder (die Kern-Regel)
- **BeScout-Liga-Event** = an **eine Liga** gebunden → Lineup nur aus dieser Liga. **Wertung pro Liga UND global.**
- **Alle anderen Events** wählen beim Erstellen: **„nur Liga X"** oder **„offen / alle Ligen"**.
- **Land** = nur Gruppierung/Filter über der Liga; fürs Aufstellen zählt die Liga.

## 4. Code-Ist-Stand (Audit 2026-06-25)
**✅ Existiert + erzwungen:** Eintritt Tickets/Credits (`currency`/`ticket_cost`) · Fee-Split inkl. BeScout-Anteil (`event_fee_config`) · Abo-Gate (`min_subscription_tier`) · Gamification-Stufe (`min_tier`) · Club-Scope · nur eigene SC + max-pro-Verein + Salary-Cap + Wildcards (`rpc_save_lineup`) · Liga-Wertung voll vs. 25 % (`is_liga_event`) · Monats-/Saison-Abschluss.

**❌ Fehlt (= Roadmap):** Liga-Bindung der Aufstellung · Wertung pro Liga · „min. X Spieler vom Verein" · Follower-Pflicht · Fan-Rang-Gate auf Events · Creator-Typ „User" + Scope „friends" + User-Pot-Einzahlung · Ticket-Events voll verdrahtet (Equipment-Gewinn) · Sponsor-Creator-Flow.

---

## 5. Roadmap (Vorschlag-Reihenfolge — umstellbar)

> Jede Zeile = grober Slice. Größe/Money-Scope geschätzt. „Money/CEO" = ich baue selbst + Reviewer-Pflicht (§3). Reihenfolge nach Abhängigkeit + Wert.

**E-1 · Liga-Bindung der Aufstellung** ✅ DONE (Slice 380, 2026-06-25) *(Größe M, kein Money)*
Echte `events.league_id`-Spalte (nullable, NULL=offen, kein Backfill — Bestand bleibt offen). `rpc_save_lineup` prüft: bei gebundenem Event müssen alle Lineup-Spieler (Starter+Bank) aus der Liga kommen (`player_not_in_event_league`, fail-closed bei club_id NULL). Erstell-UI: Liga-Auswahl + „Offen / alle Ligen" im **Platform-Admin** (cache-reaktiv). Reviewer PASS, Live-Smoke AC3-AC7. Proof `worklog/proofs/380-league-binding.txt`.
- **E-1b** ✅ **DONE (Slice 382, 2026-06-25)** *(M, kein Money)*: Lineup-Picker-Liga-Vorfilter (User sieht nur erlaubte Liga-Spieler + Hinweis „Nur {Liga}-Spieler", spiegelt RPC-Gate exakt via `clubId→clubs.league_id`) + Club-Admin-Liga-Picker (alle Ligen + Offen, CEO). Neues `FantasyEvent.boundLeagueId` (≠ Vereins-`leagueId`). Nebenbei: S200 (Events-Read-Query zog `league_id` nicht) + pre-existing 380-CI-Rot (EDITABLE_FIELDS-Counts) gefixt. Reviewer REWORK→GEHEILT (S333-Namespace). Proof `worklog/proofs/382-picker-filter.txt`. Offen: UI-Playwright post-Deploy.

**E-2 · BeScout-Saison: Wertung pro Liga (zusätzlich zu global)** *(Money/CEO — Entscheid D106)*
**Anil-Entscheid (D106):** pro-Liga zahlt **echte Rewards**, aber **Preispool/Beträge admin-anpassbar** (nicht hardcodiert 500k/250k/100k). **Gestuft:**
- **E-2a** ✅ **DONE (Slice 381, 2026-06-25)** *(M, kein Money)*: user-facing Rename „Liga"→„BeScout-Saison" (rankings.title + EventCard-Badge + ScoutCard-Label; DB-Spalten unverändert, D105) + **Pro-Liga-Ranglisten-Anzeige**. Neue read-only RPC `rpc_get_season_ranking(p_league_id, p_limit)` = `SUM(lineups.total_score)` über `is_liga_event`-Events (NULL=Gesamt / UUID=pro Liga, E-1 `events.league_id`); Trader/Analyst global. Neues Widget `LeagueSeasonLeaderboard` (Umschalter Gesamt/Pro Liga). Reviewer PASS. Live: Gesamt=30, Demo-Seed Bundesliga-Board=3 (money-neutral, Topf unverändert), leere Liga=0. Proof `worklog/proofs/381-season-rpc.txt`. KEINE Payout-Änderung. **Offen: UI-Playwright post-Deploy.** Demo-Event `96946116-1651-4fd2-aa65-76afa07f5832` = permanenter E2E-Beweis.
- **E-2b** ✅ **DONE (Slice 383, 2026-06-25)** *(L, Money/CEO)*: Pro-Liga-**Payout**. `close_monthly_liga` zahlt ZUSÄTZLICH (CEO Anil) je aktive Liga die Manager-Top-3 — Ranking = exakt das `rpc_get_season_ranking`-Aggregat (Display==Payout), nur manager-Dim (trader/analyst global). Neue Config-Tabelle `liga_reward_config` (PRO LIGA EINZELN einstellbar, Default 100k/50k/25k cents, fehlend=Default) + `get_liga_reward_config`/`set_liga_reward_config` (platform_admin-Gate) + AdminLigaTab-Editor. `league_id` additiv auf snapshots/winners + UNIQUE `NULLS NOT DISTINCT`. EIN zero-sum Debit deckt global+pro-Liga, Deckungs-Check VOR Lock, Idempotenz erhalten. Reviewer **PASS** (3 NIT). Money-Smoke AC1-AC10 force-rollback PASS. Migration `20260625200000`. **Offen: UI-Playwright post-Deploy (AC11).** Knowledge: errors-db S383.
- **Befund (Live 2026-06-25):** `scout_scores` ist NICHT pro Liga (3 globale Werte). `monthly_liga_snapshots`/`_winners` ohne league_id. close_monthly_liga rankt global, Top-3/Dim aus Topf (zero-sum). → per-Liga = neue (Nutzer,Liga)-Achse nötig.

**E-3 · Teilnahme-Bedingungen erweitern** *(je XS-S, teils Money-nah)*
- (a) „min. X Spieler vom Verein" (Gegenstück zu `max_per_club`) — in `rpc_save_lineup`.
- (b) Follower-Pflicht — Gate in `rpc_lock_event_entry`.
- (c) Fan-Rang-Gate auf Events (`min_fan_rank_tier`, wie bei Polls/Posts) — in `rpc_lock_event_entry`.
- (Abo-Gate + Stufen-Gate existieren schon.)

**E-4 · User-Events** *(Größe L, Money/CEO — User zahlt Pot aus Wallet)*
Creator-Typ „user" in DB-Type + CHECK · Scope „friends"/„public" · Erstell-Flow echt in DB (heute nur Toast) · Pot-Escrow aus User-Wallet (Muster wie User-Bounty `create_user_bounty`/Settle). Compliance: Credits = Phase-1-Spielgeld (ok); echtes Geld bleibt Phase 3.
- **Vormerkung aus 380-Review (vereinslose Events):** Sobald Events ohne `club_id` existieren, muss der Track-F-Wildcard-Lookup in `rpc_save_lineup` von `club_id → clubs.league_id` auf `COALESCE(events.league_id, club→league)` umgestellt werden — sonst `invalid_event_no_league` bei clublosem + league-gebundenem Event mit Wildcard. Heute kein Treffer (alle Events haben club_id).

**E-5 · Ticket-Events voll verdrahten** *(Größe M)*
BeScout-Ticket-Events: Tickets-Eintritt → Gewinn Credits/**Equipment**/Tickets. Eintritt existiert; Reward-Auszahlung + Equipment-Gewinn prüfen/bauen. (Hängt mit Ticket-Sinn zusammen — siehe „Tickets"-Frage aus dieser Session.)

**E-6 · Creator-/Sponsor-Flow vereinheitlichen** *(Größe L, Money/CEO)*
„Creator" als sauberes Oberkonzept: Pot-Einzahlung + Einnahmen-in-Creator-Kasse + BeScout-Anteil generisch für alle vier Sorten. Sponsor-Erstell-Flow. (Teils Paid-Fantasy-Phase-4-gated — mit Credits/Tickets jetzt baubar, echtes Geld später.)

**E-7 · Aufräumen sichtbarer Altlasten** *(Größe XS-S)*
„Predictions" (nur noch Daily-Challenge-Typ) + Event-Type-Drift (DB kennt 4 Typen, Feature-Layer 5 inkl. `creator`) angleichen. Was Anil noch in der UI „falsch sieht" hier sammeln.

---

## 6. Offene Fragen (vor dem jeweiligen Slice klären)
- **E-2:** Reward-Höhe pro Liga vs. global — gleicher Pot je Liga, oder ein Gesamt-Pot aufgeteilt? (Money/CEO-Entscheid.)
- **E-3a:** „min. X vom Verein" — fixe Zahl je Event oder Prozent der Aufstellung?
- **E-5:** Was genau ist „Equipment-Gewinn"? (Chips? Cosmetics?) — Anil konkretisiert.
- **E-6:** Darf ein User/Sponsor an seinen Events **mitverdienen** (Eintritt > Pot), oder ist der Eintritt gedeckelt auf den Pot? (Compliance/Glücksspiel-Nähe prüfen.)

## 7. Hinweis zur Abgrenzung (nicht jetzt bauen)
- **Echtes Geld / Cash-Out = Phase 2/3** (Lizenz). Hier alles in **Tickets/Credits** (Phase-1-Spielgeld, D99).
- Paid-Fantasy-Flag (`PAID_FANTASY_ENABLED`/`scout_events_enabled()`) bleibt, bis Lizenz steht.
