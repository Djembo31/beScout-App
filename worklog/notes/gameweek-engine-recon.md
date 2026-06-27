# Gameweek-Engine Recon — Fork-Vorlage (read-only, 2026-06-27)

**Auftrag (Anil):** Live-`pg_get_functiondef`-Mapping der GW-Lifecycle-Funktionen + Money-Pfad + Inkohärenz-Karte → CEO-Fork-Entscheid „GW-Lifecycle per-Liga?". **Kein Code-Change.** D87 (functiondef vor Annahme) eingehalten.

Projekt: `skzjfhvgccaeplydsunz` (beScout-App). Quellen: live functiondef + live Daten-Proben.

---

## TL;DR für den Entscheid

**Der Money-Pfad ist sicher.** `score_event` rechnet liga-korrekt (resolved Event→Liga via `COALESCE(events.league_id, clubs.league_id)`, filtert Scores nach `gameweek + league_id`). **Kein aktives Geld-Leck, keine Dringlichkeit.** Was hier ansteht ist **Integritäts-/Klarheits-Schuld** (D111-Wurzel #1 „von allem zwei"), kein Money-Bug.

**Die Daten sagen schon eindeutig: der Gameweek IST de-facto ein Liga-Konzept.** Der Code hat sich nur nie dazu *bekannt* — er trägt noch eine vestigiale Per-Club-Spalte, eine Per-Club-Orchestrator-Signatur und eine globale 1..38-Status-View. Der Fork ist faktisch: **zum Per-Liga-Modell committen (konsolidieren) ODER den halb-migrierten Zustand lassen.**

---

## Die 3 Funktionen — Live-Realität

| Funktion | Typ | Scope | GW-Quelle |
|---|---|---|---|
| `sync_fixture_scores(p_gameweek)` | RPC (SEC DEFINER) | **GLOBAL** alle 7 Ligen, per GW-**Nummer** | schreibt `player_gameweek_scores` für ALLE Fixtures mit der GW-Nummer, denorm `league_id` pro Fixture korrekt (D113) |
| `score_event(p_event_id)` | RPC (SEC DEFINER), **Money-Minter** | **einzelnes Event**, Liga via `COALESCE(event.league_id, club.league_id)` | event.gameweek; liest pgs + fps **liga-gefiltert** → korrekt |
| `getFullGameweekStatus()` | TS-Query | **GLOBAL 1..38** | mischt ALLER Ligen Fixtures/Events in 38 Eimer, **kein Liga-Filter** |
| `finalizeGameweek(clubId, gw)` | TS-Orchestrator | **per-CLUB** (lädt `events WHERE club_id`) | scored Club-Events → `set_active_gameweek` |
| `set_active_gameweek(p_club_id, p_gameweek)` | RPC (SEC DEFINER) | **per-LIGA!** (trotz `p_club_id`-Signatur) | `UPDATE clubs … WHERE league_id` (ALLE Clubs) + `UPDATE leagues` |
| Cron `gameweek-sync` | API-Route | Per-Club-Decision + **Dual-Write** beide Spalten | 2 Advance-Stellen (Z.416, Z.1741), beide schreiben clubs+leagues |

---

## Money-Pfad (score_event) — verifiziert sicher

`score_event` mintet an 4 Sinks, alle Event-scoped: `tier_bonus` (Wallet), `fantasy_reward` (Rang-Ausschüttung), `book_platform_treasury('event_entry_fee', …)` (3× FLOOR-Rest/0-Gewinner/User-Fee). Liga-Auflösung:
```sql
v_event_league := COALESCE(v_event.league_id, (SELECT league_id FROM clubs WHERE id = v_event.club_id));
-- dann: pgs.league_id = v_event_league UND fps via fixtures.league_id = v_event_league
```
**Faktum:** `events.league_id` ist **209/210 NULL** → die D113-Denorm-Spalte auf events ist praktisch ungenutzt, Liga wird über `clubs.league_id` aufgelöst (zuverlässig). Money-Mathe ist liga-korrekt. **Der Fork berührt das Minting NICHT.**

---

## Die Inkohärenz — strukturell, nicht Daten-Drift

**Daten sind AKTUELL sauber** (Proben):
- `clubs.active_gameweek` == `leagues.active_gameweek` für jede Liga (distinct_club_gws = 1/Liga). BL/2BL/SL = 34, PL/LaLiga/SerieA/TFF1 = 38.
- Sauber NUR weil **3 Stellen den Dual-Write per Konvention machen** (cron ×2 + `set_active_gameweek`). Vergisst ein künftiger Writer eine Spalte → stiller Drift. Genau D111-Wurzel #1.

**3 strukturelle Risse:**

### Riss 1 — Zwei Spalten für ein Konzept (`clubs.active_gameweek` + `leagues.active_gameweek`)
Zwei SSOTs, per Hand synchron gehalten. `getActiveGameweek(clubId)` liest `clubs`, `getLeagueActiveGameweek(leagueId)` liest `leagues`. Dual-Write-Fragilität an jedem Writer. = „von allem zwei".

### Riss 2 — finalize ist Per-Club, advance ist Per-Liga (REAL, nicht theoretisch)
`finalizeGameweek(clubId, gw)` lädt + scored **nur `events WHERE club_id = clubId`**, ruft dann `set_active_gameweek` das die **GANZE Liga** advanced. **Bundesliga hat 2 Clubs mit Events** (Live-Probe) → einen Club finalisieren advanced die Liga über die un-gescorten Events des anderen Clubs hinweg. Aktuell harmlos (alle Events scored, Saisonende), aber latent scharf sobald 2 Clubs/Liga unabhängig laufen.

### Riss 3 — Status-View global 1..38, ignoriert Per-Liga-Max
`getFullGameweekStatus()` loopt hart `1..38` **global**: (a) Phantom-GW 35–38 für 34-Wochen-Ligen (BL/2BL/SL, seit Slice 421 bekannt), (b) mischt 7 Ligen in geteilte GW-Eimer (GW20-Eimer summiert BL-GW20 + PL-GW20 + … als wäre es einer). Auch der `set_active_gameweek`-Guard `p_gameweek > 38` ist GW-Nummer-uniform statt `> max_gameweeks(league)`.

---

## Der eigentliche Entscheid: 1 Frage, 3 kohärente Folgen

**„Ist der Gameweek ein Per-Liga-Konzept (Clubs erben ihn), ja/nein?"**

Die Evidenz sagt überwältigend **JA** (set_active_gameweek verhält sich schon liga-weit, Daten uniform/Liga, max_gameweeks ist per-Liga). Bekennt man sich dazu, folgen alle 3 Risse kohärent:

| Fork | Per-Liga-Antwort (CTO-Empfehlung) | Aufwand | Risiko |
|---|---|---|---|
| **A — Spalten** | `clubs.active_gameweek` DROPpen, `leagues` = SSOT. `getActiveGameweek(clubId)` → resolve club→league. Dual-Write-Fragilität WEG. | Migration + ~2 Reader + cron-Advance entschlacken | niedrig (Daten schon uniform; Money liest es nicht) |
| **B — finalize** | `finalizeGameweek` liga-scoped: loop ALLE Events der Liga für GW, dann 1× advance. Signatur `(leagueId, gw)`. | TS-Orchestrator + Consumer (AdminGameweeksTab) | mittel (Money-nah: scored Events → selbst, §3) |
| **C — Status + Guard** | `getFullGameweekStatus(leagueId)` 1..`max_gameweeks`; `set_active_gameweek`-Guard `> max_gameweeks`. | TS-Query + 2 Admin-Consumer + RPC-Guard | niedrig (Display + Guard) |

**Alternative (Status quo / Gegen-These):** den halb-migrierten Zustand lassen. Begründung wäre: Phase-1-Spielgeld, Launch-Reset pending, „läuft ja". Kosten: die Fragilität bleibt, der nächste Spieltag-Builder stolpert wieder über zwei Spalten + globale View.

---

## Umsetzungs-Reihenfolge (falls Per-Liga gewählt)
C (niedrig, autonom-fähig) → A (Migration, Money liest's nicht) → B (Money-nah, selbst + Zero-Sum + functiondef vor Spec). Jeder ein eigener SHIP-Slice. B berührt `score_event`-Aufrufer (nicht die RPC selbst) → PATCH-AUDIT der Orchestrator-Logik, Score-Invarianz-Smoke wie Slice 419.

## Scope-Out / offene Notizen
- `events.league_id` 209/210 NULL: die D113-Denorm wird nicht genutzt (Auflösung via club). Separat entscheidbar: Backfill + nutzen ODER Spalte als Reserve dokumentieren. Nicht Teil dieses Forks.
- `simulate_gameweek(gw)` (Test-Pfad) nicht auditiert — separat falls relevant.
