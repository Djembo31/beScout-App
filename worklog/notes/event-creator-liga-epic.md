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

**E-1 · Liga-Bindung der Aufstellung** *(Größe M, kein Money)*
Echte `events.league_id`-Spalte + Restriktions-Flag („eine Liga" / „offen"). `rpc_save_lineup` prüft: bei gebundenem Event müssen alle Lineup-Spieler aus der Liga kommen. Erstell-UI: Liga-Auswahl + „offen"-Option. → Fundament für alles Liga-bezogene.

**E-2 · Wertung pro Liga (zusätzlich zu global)** *(Größe M-L, Money/CEO — mehr Gewinner = mehr Payout)*
Monats-/Saison-Abschluss + `scout_scores`/Rankings nach Liga partitionieren. Rankings-UI: Umschalter „Pro Liga / Global". Baut auf E-1.

**E-3 · Teilnahme-Bedingungen erweitern** *(je XS-S, teils Money-nah)*
- (a) „min. X Spieler vom Verein" (Gegenstück zu `max_per_club`) — in `rpc_save_lineup`.
- (b) Follower-Pflicht — Gate in `rpc_lock_event_entry`.
- (c) Fan-Rang-Gate auf Events (`min_fan_rank_tier`, wie bei Polls/Posts) — in `rpc_lock_event_entry`.
- (Abo-Gate + Stufen-Gate existieren schon.)

**E-4 · User-Events** *(Größe L, Money/CEO — User zahlt Pot aus Wallet)*
Creator-Typ „user" in DB-Type + CHECK · Scope „friends"/„public" · Erstell-Flow echt in DB (heute nur Toast) · Pot-Escrow aus User-Wallet (Muster wie User-Bounty `create_user_bounty`/Settle). Compliance: Credits = Phase-1-Spielgeld (ok); echtes Geld bleibt Phase 3.

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
