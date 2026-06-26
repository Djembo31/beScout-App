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

> **✅ 2026-06-25 eingebaut (Anil-Wunsch → §3b + E-3):** Builder soll „einfach, aber mächtig" werden — beliebige Bedingungen für die „wildesten Kombinationen": **Altersgrenze** (gezielte Talent-Förderung), **Nationalität**, **min-X-vom-Verein** (E-3a), **max-Spieler-eines-Vereins für Nicht-Vereins-Events** (Wettbewerbsverzerrung verhindern — existiert als `max_per_club`), **Equipment-Reward ja/nein**, Teilnehmerzahl/Preispool/Typ/Liga (existieren). Builder **user-/creator-zentriert** statt globales Formular. **Architektur-Entscheidung: Weg B (Regel-Liste, JSONB) — D107.** Claude-Ergänzungen übernommen: Marktwert-Deckel pro Karte, Positions-Quote, Alters-*fenster*, min/max pro Nationalität.

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

---

## 3b. Bedingungs-System — „einfach, aber mächtig" (Anil-Entscheid 2026-06-25, D107)

**Ziel:** Aus „wer die teuersten Karten hat, gewinnt" ein **Skill-Spiel** machen. Ein Event soll beliebig zugeschnitten werden können („U21 + nur Süper Lig + nur Stürmer", „nur TR-Spieler unter 5 Mio €", „min. 5 Gala-Spieler + nur Follower") — die „wildesten Kombinationen" sind der Reiz. Für Fans = echtes Scouten statt Geld-ausgeben; für Vereine = Bindungs-Werkzeug (eigene Talente fördern, Treue belohnen).

### Zwei getrennte Töpfe (NIE vermischen)
| Topf | Frage | Beispiele | Sitz | Form |
|---|---|---|---|---|
| **Eintritts-Türsteher** | *Wer darf teilnehmen?* | Follower-Pflicht · Fan-Rang (`min_fan_rank_tier`) · Abo · Stufe | `rpc_lock_event_entry` | **feste Spalten** (Geld-/Eintritts-Pfad bleibt simpel + auditierbar) |
| **Aufstellungs-Regel** | *Welche Karten dürfen ins Lineup?* | Liga · **Alter** · **Nationalität** · min/max-pro-Verein · **Marktwert-Deckel** · **Position** | `rpc_save_lineup` | **Regel-Liste (JSONB `lineup_rules`)** = Weg B |

### Weg B — Regel-Liste statt Spalte-pro-Regel
EIN JSONB-Feld `lineup_rules` auf `events` hält eine Liste typisierter Bedingungen:
```jsonc
[ {"type":"age_max","value":21},
  {"type":"nation_in","value":["TR","DE"]},
  {"type":"min_per_own_club","value":5},
  {"type":"mv_max_eur","value":5000000} ]
```
EIN generischer Validator-Block im RPC liest sie ab. **Neue Regel-Art = kein Schema-Change**, nur neuer Validator-Fall + eine Builder-Zeile. Strenge Server-Validierung Pflicht (whitelisted Regel-Typen, Wert-Bounds, **fail-closed** bei unbekanntem Typ) — JSONB im Lineup-Pfad → Reviewer-Pflicht.

### Regel-Katalog (Start — erweiterbar)
| Regel-Typ | Bedeutung | Quelle |
|---|---|---|
| `age_max` / `age_min` / Alters-*fenster* | gezielte Talent-Förderung (U21, 18–23) | Anil |
| `nation_in` / max-pro-Nation | „wildeste Kombi", Anti-Verzerrung übers Land | Anil + Claude |
| `min_per_own_club` | Gegenstück zu `max_per_club` (Gala: „min. 5 eigene") | Anil (E-3a) |
| `max_per_club` | **existiert** (`max_per_club`) — gegen „ganze Mannschaft = alle hohe Punkte" | da |
| `mv_max_eur` | Marktwert-Deckel pro Karte = Underdog-Event | Claude |
| `position_quota` | „min. 2 DEF" / „nur ATT" | Claude |

### Creator-zentrierter Builder (statt globalem Formular)
Gleicher Bau-Kern, Optionen **nach Creator gefiltert**: **User** → Tickets/Gratis + Scope „Freunde"; **Verein** → + Follower-/Fan-Rang-Gate + Vereinstopf; **Sponsor** → Liga-Bindung optional (alle Ligen mischbar). Eigener Schritt (E-4/E-6), erst durch Regel-Liste sauber möglich. Heutiger User-Builder (`CreateEventModal.tsx`) ist nur ein Toast (Mock) — wird echter Builder.

### Builder-Pflicht: Echtzeit-Treffer-Anzeige
Der Builder MUSS beim Setzen einer Bedingung zeigen „~X Spieler / ~Y Nutzer erfüllen das" — sonst baut der Ersteller versehentlich ein **totes Event** (Über-Filterung → niemand qualifiziert). Wichtigste UX-Sicherung gegen leere Events.

---

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
- **E-2b** ✅ **DONE (Slice 383, 2026-06-25)** *(L, Money/CEO)*: Pro-Liga-**Payout**. `close_monthly_liga` zahlt ZUSÄTZLICH (CEO Anil) je aktive Liga die Manager-Top-3 — Ranking = exakt das `rpc_get_season_ranking`-Aggregat (Display==Payout), nur manager-Dim (trader/analyst global). Neue Config-Tabelle `liga_reward_config` (PRO LIGA EINZELN einstellbar, Default 100k/50k/25k cents, fehlend=Default) + `get_liga_reward_config`/`set_liga_reward_config` (platform_admin-Gate) + AdminLigaTab-Editor. `league_id` additiv auf snapshots/winners + UNIQUE `NULLS NOT DISTINCT`. EIN zero-sum Debit deckt global+pro-Liga, Deckungs-Check VOR Lock, Idempotenz erhalten. Reviewer **PASS** (3 NIT). Money-Smoke AC1-AC10 force-rollback PASS + **AC11 UI-Playwright post-Deploy live PASS** (Card 7 Ligen, Write-Pfad `set_liga_reward_config`, 0 Console-Errors). **AC1-AC12 alle PASS, voll-DONE.** Migration `20260625200000`. Knowledge: errors-db S383.
- **Befund (Live 2026-06-25):** `scout_scores` ist NICHT pro Liga (3 globale Werte). `monthly_liga_snapshots`/`_winners` ohne league_id. close_monthly_liga rankt global, Top-3/Dim aus Topf (zero-sum). → per-Liga = neue (Nutzer,Liga)-Achse nötig.

**E-3 · Teilnahme-Bedingungen erweitern** *(je XS-S, teils Money-nah · Architektur = §3b / D107)*
> **Umgestellt 2026-06-25 (D107):** statt 3 Einzel-Spalten jetzt zwei Töpfe — Türsteher = feste Spalten, Aufstellungs-Regeln = JSONB `lineup_rules`-Regel-Liste (Weg B). Reihenfolge unten = Vorschlag.
- **E-3-Türsteher** ✅ **DONE (Slice 384, 2026-06-25)** *(M, Money-nah)*: (b) **Follower-Pflicht** (`events.requires_follow`) + (c) **Fan-Rang-Gate** (`events.min_fan_rank_tier`, 6-Tier-CHECK) — beide in `rpc_lock_event_entry`, nur bei club_id, fail-closed, VOR jeder Geldbewegung. Spiegelt Poll-356. PATCH-AUDIT 8/8, force-rollback Money-Smoke AC1-AC7 (kein Geld bei Reject) + UI-live beide Builder. Builder-Felder „Nur Follower" + „Mindest-Fan-Rang" (Platform DE-hardcoded + Club-Admin t()). Reviewer PASS. Proof `worklog/proofs/384-money-smoke.txt`. (Abo- + Stufen-Gate existierten schon.)
- **E-3-Regel-Liste-Fundament** ✅ **DONE (Slice 385, 2026-06-25)** *(M, Money-nah)*: JSONB-Spalte `events.lineup_rules` + generischer Validator in `rpc_save_lineup` (Weg B, fail-closed bei unbekanntem type, Wert-Bounds VOR ::int-Cast, läuft VOR INSERT+Wildcard-Move) + Pilot-Regel **min_per_own_club** (E-3a, **feste Zahl** — CEO-Entscheid Anil 2026-06-25, deckt sich mit max_per_club). Read-Pfad (3 Selects + /api/events `*` + DbEvent + FantasyEvent + Mapper + LineupRule-Type), Write-Pfad (createEvent + EDITABLE_FIELDS ×2 + Klon + minPerOwnClub-Serialisierung), Builder-Input beide Admins, Fehler→Toast + i18n DE/TR. PATCH-AUDIT live, force-rollback-Smoke AC-1..AC-7 PASS (AC-6: 0 Ressourcen-Move bei Reject), 142 vitest + tsc clean, Reviewer **PASS** (3 NIT). Migration `20260625220000`. Knowledge: fantasy.md Bedingungs-Tabelle + Zwei-Töpfe-Note. **Offen: AC-12 UI-Playwright post-Deploy.**
- **E-3-Regel-Erweiterungen** (je winziger Folge-Slice, kein Schema-Change):
  - `age_max`/`age_min` ✅ **DONE (Slice 386, 2026-06-25)** *(S, Money-nah)*: Alters-Fenster, jeder aufgestellte Spieler **Starter + Bank** muss `players.age <= / >= N` (fail-closed bei age NULL, Scope-Spiegel E-1-Liga). **Fundament-Fix:** Wert-Bound von global `1..11` (385) auf **pro Regeltyp** gezogen (age 14..50, min_per_own_club 1..11) — der globale Bound war ein latenter Bug, der jede Nicht-Zähl-Regel blockiert hätte. Serialisierung von „ein Feld" auf echte Regel-Liste generalisiert (385-Verlust-Falle behoben). Force-rollback 15/15 ACs + PATCH-AUDIT, Reviewer PASS (2 NIT). Migration `20260625230000`. Knowledge: fantasy.md + errors-db.md (S386 Bound-pro-Typ-Pattern).
  - `position_quota` ✅ **DONE als `min_per_position` (Slice 388, 2026-06-26)** *(S, Money-nah)*: Min-pro-Position (Formations-Steuerung — CEO-Entscheid Anil, Max wäre redundant zur Formation). Zählt **Starter** nach `players.position` (Startelf-Slots server-seitig nicht positions-validiert → players.position = Wahrheit; ATT-Spieler im DEF-Slot zählt als ATT). Positions-geschlüsselte Regel-Shape `{type,position,value}`, LineupRule→Union. Force-rollback 13/13 (inkl. players.position-Beweis), Reviewer PASS (2 NIT). Migration `20260626120000`. Knowledge: fantasy.md (Scope-Divergenz Starter-only vs age Starter+Bank) + errors-db S386/S388.
  - `mv_max_eur` ✅ **DONE (Slice 389, 2026-06-26)** *(S, Money-nah)*: Marktwert-Deckel pro Karte = Underdog-Event. Jede aufgestellte Karte **Starter + Bank** `players.market_value_eur <= N EUR`. **CEO-Entscheide (Anil):** MV=0 → **fail-closed** (Integrität, Trade-off: 491 echte Jugend ausgeschlossen → Backlog Re-Scrape der 32 Mis-Scrapes) + Eingabe in **Mio. €** (DB speichert EUR, `Math.round(×1e6)`). **Faktenkorrektur:** `market_value_eur` ist nie NULL, echter Edge = MV=0 (621/13,6 %). **Fundament-Fix:** `v_rule_value` INT→**BIGINT** + Bound 1..1e9 (EUR-Großwerte hätten `::INT`-Cast crashen lassen). Force-rollback 13/13 (inkl. AC-5b 2e9→Reject, AC-4 MV=0→Reject), Reviewer PASS (2 NIT). Migration `20260626130000`. Knowledge: fantasy.md (Regel 4 + BIGINT) + errors-db S389.
  - `mv_min_eur` + `max_per_position` ✅ **DONE (Slice 390, 2026-06-26)** *(M, Money-nah)*: Star-Event (MV ≥ N, Starter+Bank, fail-closed MV=0) + Max-pro-Position (≤ N Starter/Position, Spiegel 388, teilt Positions-Zweig). force-rollback 14/14, Reviewer PASS (2 NIT). Migration `20260626140000`. Knowledge fantasy.md (Regeln 5+6) + errors-db S390.
  - **✅ nationality-Normalisierung DONE (Slice 391, 2026-06-26)** *(M, Schema)*: generierte Spalte `players.nationality_iso` (ISO via `normalize_nationality()` IMMUTABLE, Port von countryNameToIso.ts, GENERATED ALWAYS STORED — zero-drift/zero-trigger/zero-backfill, CEO-Entscheid Anil). Coverage 100 % (unmapped=0), Türkei-Bucket 762 vereint. Reviewer PASS (3 NIT). Migration `20260626150000`. Räumt den S390-Blocker.
  - **✅ `nation_in` + `max_per_nation` DONE (Slice 392, 2026-06-26)** *(M, Money-nah)*: auf `nationality_iso`. `nation_in` (Whitelist, Array-Wert `{type,values:[ISO,…]}`, **Starter + Bank**, eigener Validator-Zweig mit `CONTINUE` VOR numerischem `^[0-9]+$`-Guard [erster Nicht-Zahl-Typ, sonst BIGINT-Crash], Element-Sanity 2..6, fail-closed bei `''`) + `max_per_nation` (Zahl, Spiegel max_per_club, **Starter-only**, `GROUP BY nationality_iso WHERE <>''`, Bound 1..11). **UI:** durchsuchbarer Multi-Select `NationMultiSelect` (Full-Screen-Picker, Flag-Chips), Optionen = feste kuratierte `FOOTBALL_NATIONS` (**CEO-Entscheid Anil** via AskUserQuestion: kuratiert statt DB-distinct; daten-informiert Kern n≥10 + bekannte = 61 Codes), Namen via `Intl.DisplayNames` + Override GB-Subdivisionen/XK. force-rollback **17/17** (inkl. AC-5b kein-values→sauberer invalid, AC-3 fail-closed, AC-9b leere ISO ungezählt), Reviewer **PASS** (2 NIT). Migration `20260626160000`. Knowledge fantasy.md (Regeln 7+8) + errors-db S392. **Offen: gebündelter Playwright (386/388/389/390/392).**
  - offen nach 392: Builder „Bedingung hinzufügen ▾" + Echtzeit-Treffer-Anzeige (§3b, E-4/E-6). **E-3-Regelsatz damit komplett** (min_per_own_club/age/min+max_per_position/mv_max/mv_min/nation_in/max_per_nation).
- **Datenbedarf (Daten-Check 2026-06-25, Slice 386):** `players.age` 99,4% · `nationality` 95,5% (168 Länder) · `market_value_eur` 86,4% · `position` 100% (GK/DEF/MID/ATT) — alle Folge-Regeln baubar.

**E-4 · User-Events** *(Größe L, Money/CEO — User zahlt Pot aus Wallet)*

### ✅ E-4a GEBAUT — Slice 396 DONE (2026-06-26), Modell V3
> **⚠️ V3-KORREKTUR beim BUILD (Anil):** Der „Start-Pot/Seed"-Mechanismus unten (V1/V2) wurde verworfen („Schrott — Ersteller legt Pot vor + wartet → hat nix"). **Gebautes Modell V3:** KEIN Seed · Ersteller zahlt NUR die Erstell-Gebühr (50 Cr) → Topf · **Pot = Σ Teilnehmer-Eintritte** (`event_fee_config('user')=0/0`, KEIN 5 %-Schnitt) · BeScout verdient nur über die Erstell-Gebühr · Ersteller spielt mit = zahlt Eintritt. Migrationen 170000/170100/170200/revoke_public_ar44; force-rollback AC1-AC11 + Zero-Sum diff=0; Reviewer PASS. Kanon: `decisions.md` D108 V3 + `treasury.md` Slice 396. **NÄCHSTER: E-4b (Builder-UI).**

### Modell-Alignment (V1/V2, 2026-06-26, → D108) — durch V3 ersetzt (s.o.)
- **Geld-Modell B (dynamischer Pot):** Jeder Teilnehmer zahlt Eintritt (Credits) → **5 % BeScout → Plattform-Topf**, Rest **wächst den Pot**. Optionaler **Start-Pot** aus Ersteller-Wallet (Anreiz). **Ersteller verdient nichts** (fee_config `user` = platform 500 / beneficiary 0). Jeder Eintritt finanziert seinen eigenen Pot-Anteil → **zero-sum, kein Minting**.
- **Start auch ohne volle Teilnehmerzahl:** Pot = was tatsächlich reinkam (kein fester Vorab-Pool).
- **Mindest-Teilnehmerzahl (`events.min_entries`, neu):** Ersteller-wählbar (leer = egal). Nicht erreicht bis Deadline → **Absage + voller Refund** (Eintritte + Start-Pot).
- **Auszahlung:** Ersteller wählt Verteilung (Top-3 / Winner-all / custom) → bestehende `reward_structure` (JSONB) + Reuse `RewardStructureEditor` (Templates top3/top5/winner/top10 + 100 %-Check).
- **Anti-Müll:** **Erstell-Gebühr, admin-steuerbar** (BeScout-Admin) → Topf. Kein Event-Limit (Anil-Entscheid). Default-Höhe admin-setzbar.
- **Typ:** sauberer `user` (nicht das gedriftete `creator` — fee_config-`creator`-Zeile [5/5, „verdient mit"] ist orphan + widerspricht Modell B; mit aufräumen). „Creator" bleibt Oberkonzept, kein DB-Typ.
- **Scope:** **öffentlich** zuerst (Freunde/privat = späterer Slice).
- **Erstellen darf:** jeder eingeloggte User (Defaults: Bounds wie User-Bounty 500–100.000 cents, harte Server-Validierung).

### 🔎 Ist-Befund (Live-RPCs 2026-06-26) — der eigentliche Neubau
Zwei getrennte Geld-Ströme heute: **① Preis-Pot** (treasury-escrow → `score_event` mintet Gewinner → Rest-Refund an Quelle) ist **voll + zero-sum**. **② Eintritt** ist **nur halb gebaut**: `rpc_lock_event_entry` **sperrt** den Eintritt (+ rechnet `fee_split` aus), `rpc_unlock_event_entry`/`rpc_cancel_event_entries` **lösen die Sperre wieder auf** — aber **`score_event` fasst die gesperrten Eintritte NIE an**. Die Verbindung **„Eintritt → Pot" existiert nicht** (dormanter Pfad, alle Live-Events liefen Tickets/gratis). **→ Diese fehlende Hälfte (Eintritt abbuchen → 5 % Topf, Rest → Pot → Gewinner) ist der E-4-Kern.**

### Decomposition
- **✅ E-4a (Geld-Kern, L, Money/CEO) DONE — Slice 396 (V3):** Typ `user` + `event_fee_config('user',0,0)` + `events.min_entries` + `platform_event_config`-Singleton + `set_user_event_create_fee` + `create_user_event` (Gebühr→Topf, **KEIN Seed**) + **Entry-Pot-Settle** (`score_event` user-Zweig: Pot=Σ Eintritte, charge, **kein 5 %-Schnitt**, FLOOR-Rest→Topf) + `cancel_user_event` (Absage/Refund) + Wildcard-Fix (380-Vormerkung erledigt). scout_events_enabled=true (B1). Reviewer PASS, force-rollback Zero-Sum diff=0. Latente Bugs mitgefixt (event_entry_lock/fantasy_reward/chk_event_type im CHECK).
- **✅ E-4b Teil 1 (UI, M) DONE — Slice 397:** echter Builder (entmockt `CreateEventModal`) → `create_user_event` via `createUserEvent`-Service + `useCreateUserEvent`-Hook; Typ-Union `'user'`; Credit-Eintritt im `JoinConfirmDialog` entkoppelt von `PAID_FANTASY_ENABLED`; Reward-Presets (winner/top3/top5); 11 Reject-Codes (S393). LIVE bewiesen, Reviewer PASS.
- **✅ E-4b Teil 2 (UI, M, money-nah) DONE — Slice 399:** (1) **Discovery** `creator`→`user` in `EventCategoryCards` + `EventBrowser` (Design-Smell-Fix, 0 Prod-`creator`-Events, D108-konform, CEO-bestätigt). (2) **F2/F3 currency-fix** 🎟-Chip in `EventCardView` + `EventDetailHeader` nur bei `currency='tickets'` (kein cents-Leak bei scout). (3) **Cancel-UI** `cancelUserEvent`+`useCancelUserEvent` (S371) + Button im `EventDetailModal` (Creator-Gate `type='user' && createdBy===userId && status∈{registering,late-reg}`) + AlertDialog → `cancel_user_event`. (4) **Admin-Gebühr** `setUserEventCreateFee`/`getUserEventCreateFee` + Number-Input in `AdminEventFeesSection`. (5) **min_entries** Mapper+Type+3 Select-Listen (S200) + Card-Chip. Reviewer PASS, AC1-AC6 **live PASS** gegen bescout.net, 0 Console-Errors. Money-Logik unverändert (396-RPCs eingefroren). **E-4 KOMPLETT.** Live-Pot-Vorschau = bereits durch bestehenden `userEventEntryFeeHint` („Reward-Pool wächst mit jedem Eintritt") abgedeckt. **Scope-Out → E-7:** Freiform-Reward-Editor + orphan `event_fee_config('creator')`-DB-Cleanup + `getTypeStyle('creator')`-case.
- **✅ Vormerkung aus 380-Review (vereinslose Events) ERLEDIGT in 396 (W4):** Track-F-Wildcard-Lookup in `rpc_save_lineup` auf `COALESCE(events.league_id, club→league)` umgestellt (fail-closed bei NULL), Bestandsverhalten club-Events unverändert.

**E-5 · Ticket-Events voll verdrahten** *(Größe M)*
BeScout-Ticket-Events: Tickets-Eintritt → Gewinn Credits/**Equipment**/Tickets. Eintritt existiert; Reward-Auszahlung + Equipment-Gewinn prüfen/bauen. (Hängt mit Ticket-Sinn zusammen — siehe „Tickets"-Frage aus dieser Session.)

**E-6 · Creator-/Sponsor-Flow vereinheitlichen** *(Größe L, Money/CEO)*
„Creator" als sauberes Oberkonzept: Pot-Einzahlung + Einnahmen-in-Creator-Kasse + BeScout-Anteil generisch für alle vier Sorten. Sponsor-Erstell-Flow. (Teils Paid-Fantasy-Phase-4-gated — mit Credits/Tickets jetzt baubar, echtes Geld später.)

**E-7 · Aufräumen sichtbarer Altlasten** *(Größe XS-S)*
- **✅ creator-Drift-Nachzügler DONE — Slice 401:** e2e-Audit fand die 12. Fläche, die Slice 400 übersah — toter `creator`-Key in `AdminEventFeesSection.tsx:20` (`Record<string,…>`-Map = tsc-unsichtbar, DB-CHECK creator-frei → unerreichbar). Entfernt → „restlos" jetzt wirklich vollständig.
- **✅ creator-Drift-Cleanup DONE — Slice 400:** deprecated Event-Typ `creator` (D108) restlos über 11 Flächen entfernt (beide Type-Unions, getTypeStyle/TYPE_CONFIG, EventCategoryCards/EventBrowser counts, eventMapper No-op-Ternary, i18n DE+TR, Test, tote creatorId/creatorName-Felder) + DB-DELETE `event_fee_config('creator')`-Waisenzeile + `chk_event_type` auf event_fee_config verengt (= events_type_check). tsc 0, vitest 8/8, money byte-identisch, Reviewer PASS. Migration `20260626180000`. **Offen E-7-Rest:** „Predictions" ist KEIN Smell (lebende ChallengeType-Frageart, nicht anfassen).
„Predictions" (nur noch Daily-Challenge-Typ) + Event-Type-Drift (DB kennt 4 Typen, Feature-Layer 5 inkl. `creator`) angleichen. Was Anil noch in der UI „falsch sieht" hier sammeln.

---

## 6. Offene Fragen (vor dem jeweiligen Slice klären)
- **E-2:** Reward-Höhe pro Liga vs. global — gleicher Pot je Liga, oder ein Gesamt-Pot aufgeteilt? (Money/CEO-Entscheid.)
- **E-3a:** „min. X vom Verein" — fixe Zahl je Event oder Prozent der Aufstellung? (Claude-Empfehlung: **fixe Zahl** — deckt sich mit `max_per_club`, einfacher, rundungsfrei. Final-Entscheid offen.)
- **E-3-Reihenfolge:** Türsteher (b+c) zuerst oder Regel-Liste-Fundament (E-3a) zuerst? (vor erstem Slice festlegen)
- **E-5:** Was genau ist „Equipment-Gewinn"? (Chips? Cosmetics?) — Anil konkretisiert.
- **E-6:** Darf ein User/Sponsor an seinen Events **mitverdienen** (Eintritt > Pot), oder ist der Eintritt gedeckelt auf den Pot? (Compliance/Glücksspiel-Nähe prüfen.)

## 7. Hinweis zur Abgrenzung (nicht jetzt bauen)
- **Echtes Geld / Cash-Out = Phase 2/3** (Lizenz). Hier alles in **Tickets/Credits** (Phase-1-Spielgeld, D99).
- Paid-Fantasy-Flag (`PAID_FANTASY_ENABLED`/`scout_events_enabled()`) bleibt, bis Lizenz steht.
