<!-- auto:handoff-start -->
# Session Handoff — Auto (2026-06-26 08:29)

> Dieser Block wird vom Stop-Hook aktualisiert. Manueller Rich-Content steht ausserhalb der Marker.

## Uncommitted Changes: 4 Files
```
 M memory/session-handoff.md
 M worklog/active.md
 M worklog/notes/event-creator-liga-epic.md
?? worklog/specs/396-user-events-money-core.md
```

## Session Commits: 10
- dddff999 docs(tracker): Slice 395 DONE — Lineup-Reject-Coverage komplett reconciled (MASTERPLAN+TODO), Next-Pointer auf E-4
- cf973238 feat(fantasy): Lineup-Reject-Coverage komplett — 22 restliche rpc_save_lineup-Codes regel-spezifisch (DE/TR) [Slice 395]
- 52924411 docs(handoff): Wissen verdrahtet + SOFT-Findings als Heuristik-Artefakt verankert (kein echter Drift)
- 37bcf87f docs(learning): Wissen verdrahten 393/394 — Reject-Mapping + Observability-Tier-4
- 54399703 docs(tracker): Playwright-Bündel DONE + 393/394 reconciled — Next-Pointer auf E-4/Backlog
- 5a5e28dd docs(handoff): Session-Close 2026-06-26 — 393/394 DONE + E-3-Bündel-Playwright DONE, Resume-Anker auf E-4/Backlog
- cd300cc8 fix(auth): AuthProvider Profile-Load-Failure nach Sentry instrumentieren — war console-only (Slice 394)
- 2fbc4ab6 feat(events): E-3 Regel-Rejects regel-spezifisch — 9 Validator-Codes → eigene DE/TR-Toast-Meldung (Slice 393)
- c7e2cada docs(handoff): Session-Close 2026-06-26 — Slice 392 DONE, E-3-Regelsatz komplett, Resume-Anker auf Playwright-Bündel/E-4
- ed8e8019 docs(tracker): Slice 392 DONE — E-3-Regelsatz komplett, Stand auf MASTERPLAN+TODO reconciled

<!-- auto:handoff-end -->

---

# 🎯 RESUME-ANKER NÄCHSTE SESSION

**Status: active — Slice 396 (E-4a User-Events Geld-Kern) in SPEC, WARTET AUF ANIL-APPROVAL.** Vor Start: `git status --short --branch && git log --oneline -8`. Audit-Churn gitignored. Diesen Handoff IMMER zuerst lesen (Anil-Regel). **Teaching-Mode durchgehend (einfach erklären, 1-3 Sätze Klartext VOR Tools). Nie verfrüht „bereit/launch-ready" — nur mit Sign-Off + Evidenz ([[feedback_no_premature_ready]]). Schlecht gelöste Patterns proaktiv melden ([[feedback_report_design_smells]]).**

## 🔴 ERSTE AKTION (Anil-Auftrag, expliziert): Spec 396 mit FRISCHEM/KALTEM KOPF prüfen
- Anil will die **Spec `worklog/specs/396-user-events-money-core.md` neu mit kaltem Kopf gecheckt** haben, BEVOR irgendwas gebaut wird. Empfehlung: Cold-Context-**Reviewer-Agent auf die SPEC** (nicht Code — es gibt noch keinen) ODER selbst kritisch durchlesen gegen Modell D108 + Money-Regeln (§3) + treasury.md §7/§10 + die Live-RPC-Realität (Befund unten). Such nach: Lücken im Geldfluss, Zero-Sum-Bruch, Trigger-vs-RPC-Doppel-Escrow, source-CHECK-Vergessen, Rundungs-/Idempotenz-Löcher.
- **DANN** Anil die 3 offenen CEO-Mini-Fragen vorlegen (s.u.) → bei Freigabe `/impact` → BUILD (4 Wellen). **KEIN BUILD vor Anil-Approval** (Money/CEO §3).

## 📋 E-4a Slice 396 — Stand
- **Modell gelockt = D108** (`memory/decisions.md`): Geld-Modell B (dynamischer Pot aus Eintritten −5 % BeScout → Topf, optionaler Start-Pot aus Wallet, **Ersteller verdient nichts**), Start auch ohne volle Teilnehmerzahl, **`min_entries`** Ersteller-wählbar (sonst Absage+Refund), Auszahlung Ersteller-wählbar (Top-3/Winner-all, Reuse `RewardStructureEditor`), **Anti-Müll = admin-steuerbare Erstell-Gebühr → Topf** (kein Event-Limit), Typ `user` (5/0), Scope **öffentlich** zuerst.
- **Befund (Live-RPCs 2026-06-26, im Spec §1):** Event-Geld = 2 Ströme. ① Preis-Pot (treasury-escrow → `score_event` mintet → settle-refund) = **voll/zero-sum**. ② Eintritt = **nur halb gebaut**: `rpc_lock_event_entry` SPERRT nur, `rpc_unlock_event_entry`/`rpc_cancel_event_entries` lösen auf, **`score_event` fasst gesperrte Eintritte NIE an** → „Eintritt→Pot" existiert nicht (dormant; 208 Events alle ended, 0 Pool). **Diese fehlende Hälfte (Lock-on-join + Charge-at-settle) = E-4a-Kern.**
- **Spec-Wellen:** W1 Schema (type `user` + `min_entries` + `event_fee_config('user')` + `platform_event_config` Erstell-Gebühr-Config+Setter + treasury-source-CHECK widen `event_create_fee`/`event_entry_fee`) · W2 `create_user_event` (Gebühr→Topf + Seed-Escrow Wallet) · W3 dynamischer Entry-Pot-Settle (score_event user-Branch) + Trigger-user-Zweige + min_entries-Absage/Refund · W4 club-loser Wildcard-Fix (380-Vormerkung) + Wissens-Kopplung.
- **3 offene CEO-Mini-Fragen (Anil entscheidet vor BUILD):** (a) Event ganz ohne Geld (Entry=0 **und** Seed=0) erlauben oder ablehnen? *(Empf. ablehnen)* (b) Default-Erstell-Gebühr? *(Empf. 10 Cr = 1000 cents)* (c) Settle-Trigger nur Ersteller oder auch platform_admin? *(Empf. beide)*.
- **Live-functiondef VOR jedem RPC-Edit re-fetchen (D87)** — Bodies in dieser Session gelesen (rpc_lock_event_entry, score_event, create_user_bounty, trg_events_escrow_prize/prize_settle, rpc_cancel_event_entries, rpc_unlock_event_entry, rpc_save_lineup) aber vor Edit erneut ziehen (Drift). Reuse-Vorbilder: `create_user_bounty` (Wallet-Escrow), `set_liga_reward_config` (admin-Setter), `RewardStructureEditor` (Verteilungs-UI, für E-4b).

## ✅ Vorige Session (2026-06-26) — 395 DONE + E-4-Alignment
- **Slice 395 DONE** (`cf973238`/`dddff999`): Lineup-Reject-Coverage komplett (22 restliche `rpc_save_lineup`-Codes regel-spezifisch DE/TR, Reviewer PASS). rpc_save_lineup-Reject-Coverage damit komplett (nur dynamischer Toast-Kontext bleibt Folge-Slice via Throw-Refactor `lineups.mutations.ts:62`).
- **E-4-Alignment komplett** → D108 + Epic-Update + Spec 396. (393/394 davor DONE, E-3-Regelsatz komplett.)
- **Bekannt SOFT (Nightly, kein Blocker, NICHT echter Drift):** `audit:knowledge:check` flaggt `missions.md`/`reward-ranking.md` verify-drift — Artefakt der Datums-Heuristik (neue Migrationen berühren diese Domänen nicht; `verified-against` bewusst nicht blind gebumpt, §1).

## 🎯 SESSION-CLOSE 2026-06-26 (spät, sauber) — E-3-Regelsatz KOMPLETT

**4 Slices komplett geliefert + gepusht** (389 mv_max, 390 mv_min+max_pos, 391 nationality_iso, **392 nation_in+max_per_nation**) — alle Reviewer PASS, force-rollback grün, Knowledge verdrahtet, main == origin/main, working tree clean. **Letzter HEAD = `ed8e8019`.**
- **DISTILL geprüft:** alle Lehren = Code-Patterns/Feature (BIGINT-Overflow, GENERATED-Spalte zero-drift, TS↔SQL-Drift, **Array-Regel-Zweig mit CONTINUE vor numeric guard**) → in `errors-db.md` S389/S390/S391/**S392** + `fantasy.md` (Regeln 4/5/6/**7/8**) verdrahtet. **Kein neuer `D<n>`** (alles in D104/D107-Scope; die Picker-Quelle „kuratiert statt DB-distinct" ist ein CEO-Produkt-Detail, in Spec/Epic festgehalten, kein Strategiewechsel). Arbeitsweise-Memory aktiv: [[feedback_report_design_smells]].
- **➡️ NÄCHSTE SESSION = der gebündelte Playwright-Durchlauf** (s. Resume-Anker oben, Z.28-31) ODER E-4. Beides offen, Anil-Wahl.

## 📦 (vorige Session) — E-3-Regel-Erweiterungen 386/387/388

**Diese Session (2026-06-26) — 3 Slices + UI-Verify, alle gepusht, CI grün. HEAD = `6b7330da`.**
- **✅ Slice 386 (`aa8f695a`):** E-3 **Alters-Fenster** (`age_min`/`age_max`, Starter+Bank, fail-closed bei age NULL). **Fundament-Fix:** Wert-Bound von global `1..11` (385-Bug) auf **pro Regeltyp** gezogen. 15/15 force-rollback, Reviewer PASS, **AC-13 UI-live PASS** (beide Builder).
- **✅ Slice 387 (`1b894543`):** Compliance-Fix `kazanılır`→`elde edilir` (MASAK-Verstoß aus Slice 374, CI war seit 374 rot). wording-compliance 9/9 grün.
- **✅ Slice 388 (`7cabc155`):** E-3 **Min-pro-Position** (`min_per_position`, Formations-Steuerung — CEO Min statt Max). Zählt **Starter nach `players.position`** (Startelf-Slots server-seitig NICHT positions-validiert → ATT-Spieler im DEF-Slot zählt als ATT). Positions-geschlüsselte Regel `{type,position,value}`, LineupRule→Union. 13/13 force-rollback, Reviewer PASS, **AC-13 UI-live PASS** (beide Builder).
- **➡️ NÄCHSTER = E-3-Regel-Erweiterung `nation_in`/max-pro-Nation** (Daten: nationality 95,5%, 168 Länder; mehr UI = Multi-Select) **ODER `mv_max_eur`** (Underdog; MV 86,4%, **Null-Edge entscheiden** = fail-closed vs durchlassen) **ODER `max_per_position`** (trivial, Spiegel von 388) **ODER E-4 User-Events** (L, Money/CEO). Muster = 386/388 (Validator-Branch + JSONB-Serialisierung, kein Schema-Change). Money-nah → Live-functiondef VOR Spec (D87), force-rollback-Smoke, Reviewer-Pflicht.
- **Daten-Check (verifiziert 2026-06-26):** players.age 99,4% · nationality 95,5% · market_value_eur 86,4% · position 100% — alle Folge-Regeln baubar.
- **Scope-Divergenz merken (fantasy.md/errors-db S388):** min_per_own_club + min_per_position = **Starter-only** (Komposition); age = **Starter+Bank** (Eignung).

---

## (vorige) HIER ANKNÜPFEN — E-3-Regel-Erweiterungen ODER E-4 (Anil-Wahl)
- **✅ Slice 385 DONE (`107282d1`):** D107 Topf 2. `events.lineup_rules` (jsonb) + generischer Validator in `rpc_save_lineup` (Weg B: fail-closed bei unbekanntem type, Wert-Bounds 1..11 mit Regex-Guard VOR `::INT`-Cast, läuft VOR INSERT+Wildcard-Move) + Pilot-Regel `min_per_own_club` (feste Zahl, CEO-Entscheid Anil — deckt sich mit `max_per_club`). Read (3 Selects+`*`+DbEvent+FantasyEvent+Mapper+`LineupRule`-Type), Write (createEvent+EDITABLE_FIELDS 26→27/25→26+Klon+minPerOwnClub-Serialisierung), Builder-Input beide Admins, Toast+i18n DE/TR. Migration `20260625220000`. Knowledge fantasy.md (Bedingungs-Tabelle + Zwei-Töpfe-Note). Reviewer 3 NIT (kosmetisch/Scope-Out, `385-review.md`).
- **✅ AC-12 UI post-Deploy ERLEDIGT (2026-06-25):** Club-Admin-Builder (`/club/sakaryaspor/admin`→Events→Neues Event) live verifiziert via browser_evaluate — Label „Min. Spieler vom eigenen Verein" rendert (i18n `t()` aufgelöst), **kein MISSING_MESSAGE / Raw-Key-Leak** (S333), Input `type=number min1 max11 inputMode=numeric placeholder="Keine Regel"`, 0 Console-Errors. Platform-Builder = identische Komponente, Label DE-hardcoded (MISSING_MESSAGE strukturell unmöglich). → **Slice 385 AC-1..AC-12 ALLE PASS, voll-DONE.** (Headless: Klick-Overlay + Screenshot-Quirk → DOM-Evaluate als konklusiver Beweis; PNGs gitignored.)
- **➡️ NÄCHSTER SLICE = E-3-Regel-Erweiterungen** (je winziger Folge-Slice, KEIN Schema-Change dank JSONB — nur neuer CASE-Zweig im Validator + Builder-Feld + Toast-i18n): `age_max`/`age_min`/Alters-Fenster · `nation_in`/max-pro-Nation · `mv_max_eur` (Underdog) · `position_quota`. **VOR Bau: Daten-Check** — Alter/Geburtsdatum + Nationalität müssen auf `players` verfügbar sein (`market_value_eur` existiert); sonst Scraper/Spalte-Slice zuerst. ODER **E-4 User-Events** (L, Money/CEO). Money-nah → Live-functiondef VOR Spec (D87), force-rollback-Smoke, Reviewer-Pflicht. Pattern-Vorbild = Slice 385 (Validator-Block-Mechanik + JSONB-Serialisierung im Form).
- Anker: `worklog/notes/event-creator-liga-epic.md` §3b/§5 (E-3-Block) + `decisions.md` **D107**.

## ✅ Diese Session (2026-06-25 spät) — D107 festgehalten + E-3 Türsteher (384) DONE
- **NEUE ARCHITEKTUR D107 (`memory/decisions.md` + `event-creator-liga-epic.md` §3b, INDEX-Range D1–D107):** Event-Bedingungen = **zwei Töpfe**. (1) **Eintritts-Türsteher** (wer darf rein: Follower/Fan-Rang/Abo/Stufe) = **feste Spalten** in `rpc_lock_event_entry`. (2) **Aufstellungs-Regeln** (welche Karten ins Lineup: Alter/Nation/min-vom-Verein/Marktwert/Position) = **JSONB `lineup_rules`-Regel-Liste** (Weg B, EIN generischer Validator in `rpc_save_lineup`, neue Regel = kein Schema-Change). Creator-zentrierter Builder + Echtzeit-Treffer-Anzeige. Anil-Wunsch „einfach aber mächtig, wildeste Kombinationen". Anil hat Weg B + Claude-Ideen (MV-Deckel, Positions-Quote, Alters-Fenster, max-pro-Nation) freigegeben.
- **✅ Slice 384 DONE (`7bf23383`+`f56019c2`):** E-3 **Türsteher** (Topf 1). `events.requires_follow` (BOOLEAN) + `events.min_fan_rank_tier` (TEXT, 6-Tier-CHECK) + 2 Gate-Blöcke in `rpc_lock_event_entry` (Spiegel Poll-356), nur bei club_id, fail-closed, VOR Geld. PATCH-AUDIT 8/8, force-rollback Money-Smoke AC1-AC7 (kein Geld bei Reject), UI-live beide Builder (0 Console-Errors, kein MISSING_MESSAGE), Reviewer PASS (2 NIT bewusst nicht geheilt — s. `384-review.md`). Migration `20260625210000`. **Nebenwissen:** Follow-INSERT triggert `club_followers_recalc_fan_rank` (S345) → erzeugt fan_rankings-Zeile (im Smoke berücksichtigt).

> _(Stale-Anker „E-3 Regel-Listen-Fundament" entfernt — das ist Slice 385, jetzt DONE; aktueller Anker steht oben unter „HIER ANKNÜPFEN — E-3-Regel-Erweiterungen ODER E-4".)_

**✅ AC11 (UI Playwright post-Deploy) ERLEDIGT (2026-06-25):** Liga-Tab live verifiziert — „Pro-Liga-Rewards"-Card rendert alle 7 Ligen (Default 1000/500/250), neuer „Monat abschließen"-Text, 0 Console-Errors (kein MISSING_MESSAGE). Write-Pfad `set_liga_reward_config` live bewiesen (Bundesliga #1→2000 gespeichert, „(Default)" verschwand, Test-Zeile danach gelöscht). Proof `383-money-smoke.txt` §E + `383-admin-liga-rewards.png`. → **Slice 383 voll-DONE, AC1-AC12 alle PASS.** (Winner-Liga-Badge erst sichtbar nach erstem echten Monatsabschluss — kein offener Punkt.)

### ✅ Diese Session (2026-06-25) — E-2b (383) DONE
- **✅ E-2b DONE — Slice 383:** Pro-Liga-Payout. `close_monthly_liga` CREATE OR REPLACE (gegen Live-Baseline D87): globaler 4-Dim-Block byte-identisch (Konstanten 500k/250k/100k + overall-Median + Idempotenz, PATCH-AUDIT S356), NEU Pro-Liga-Manager-LOOP NACH global / VOR Coverage — Ranking = exakt `rpc_get_season_ranking`-Aggregat (Display==Payout), nur manager-Dim (trader/analyst global). **CEO-Entscheid (AskUserQuestion):** (1) **zusätzlich** zum globalen Payout (Doppel-Payout gewollt), (2) Beträge **pro Liga einzeln**, (3) Default **100k/50k/25k cents** (→ D106 Umsetzung dokumentiert).
  - Schema additiv: Config-Tabelle `liga_reward_config` (league_id×rank1/2/3 cents, CHECK monoton ≥0, fehlend=Default, RLS 4 Ops) + `league_id` auf `monthly_liga_snapshots/_winners` + UNIQUE **`NULLS NOT DISTINCT`** (globale NULL-Idempotenz erhalten). Globaler Winner-Insert auf `league_id IS NULL` eingeschränkt (S383-Pattern).
  - RPCs: `get_liga_reward_config` (Helper) + `set_liga_reward_config` (platform_admin-Gate, AR-44) + `get_monthly_liga_winners` DROP+CREATE additiv `league_id`/`league_name`. Frontend: Service/Hooks + AdminLigaTab Reward-Editor + Winner-Liga-Badge (Admin DE-hardcoded, S196-exempt).
  - **EIN zero-sum Debit** deckt global+pro-Liga; Coverage-Check VOR Lock; Idempotenz erhalten. Reviewer **PASS** (3 NIT). Money-Smoke AC1-AC10 force-rollback PASS (Zero-Sum pot_delta=debit=total_paid=3.675.000; AC5 Display==Payout; AC7 Config wirkt; AC8 insufficient_treasury→0 Persistenz). Migration `20260625200000`. Proof `383-money-smoke.txt`. Knowledge errors-db **S383**.
  - **Keine geseedeten Live-Artefakte** (Smokes BEGIN…ROLLBACK; Topf live unverändert).

### ✅ Diese Session (2026-06-25) — E-2a (381) + E-1b (382) gebaut, beide DONE
- **✅ E-2a DONE — Slice 381** (`0532cc21`+`f6dfa18c`): BeScout-Saison Begriffs-Umzug (user-facing „Liga"→„BeScout-Saison": `rankings.title`, `fantasy.seasonBadge` EventCard-Badge, `profile.scoutCardSeasonLabel`; DB-Spalten unverändert, D105) + **Pro-Liga-Ranglisten-Anzeige**. Neue read-only RPC `rpc_get_season_ranking` (SEC DEFINER, JSONB, anon-gesperrt) + Service `getSeasonRanking` (throw) + Hook `useSeasonRanking` + Widget `LeagueSeasonLeaderboard` (Umschalter Gesamt/Pro Liga, `useLeagueScope`-SSOT). KEINE Payout-Änderung. Reviewer PASS (2 NIT). **UI LIVE PASS** (DE „BeScout-Saison"/TR „BeScout Sezonu", Mobile 393px, Gesamt-Board=30, Pro-Liga Bundesliga=312/268/240, leere Liga=Empty). Migration `20260625190000`. Knowledge: `bescout-liga.md` Update-Block.
  - **Geseedetes Demo-Event (permanent, NICHT aufräumen):** `96946116-1651-4fd2-aa65-76afa07f5832` (Bundesliga, is_liga_event, ended, prize_pool=0 → money-neutral, Topf unberührt 50.003.397). 3 Lineups jarvisqa 312 / bot001 268 / bot002 240. **Seed-Lehre:** Demo-Lineups brauchen echte Spieler-Slots ODER total_score NACH dem Scoring-Cron nachsetzen (Cron nullt scorelose Lineups; scored_at-gegated → hält).
- **✅ E-1b DONE — Slice 382** (`6ec80cdf`+`5879ade1`): Lineup-Picker-Liga-Vorfilter (zeigt nur Liga-Spieler + Hinweis „Nur {Liga}-Spieler", spiegelt `rpc_save_lineup`-Gate exakt via `clubId→clubs.league_id`, fail-closed, Starter+Bank) + Club-Admin-Liga-Picker (alle Ligen + Offen, CEO). Neues `FantasyEvent.boundLeagueId` (= `events.league_id`, getrennt von Vereins-`leagueId`). Reviewer REWORK→GEHEILT (S333: leagueBinding-Keys nach `admin`-Namespace verschoben). **Club-Admin-Select LIVE PASS** (Label „Liga-Bindung", kein MISSING_MESSAGE, 7 Ligen+Offen). Picker-Filter = Reviewer-Logik-verifiziert (Live-Walk braucht offenes liga-gebundenes Event + Multi-Liga-Holdings = Folge-Verify offen).
  - **🔴 2 latente Bugs nebenbei gefixt:** (a) **S200** — Events-Read-Query (`events.queries.ts`, 3 Selects) zog `league_id` nicht → `boundLeagueId` immer null → Filter inaktiv; ergänzt. (b) **Pre-existing CI-Rot aus 380** — `EDITABLE_FIELDS`-Count-Assertions (upcoming 23→24, registering 22→23) seit `league_id`-Addition stale (CI rot, nur in CI sichtbar); nachgezogen.
- **Offene Folge-Slices:** **E-2b** (jetzt, s.o.) · **E-1b-Picker-Live-Walk** (Logik abgesichert) · **E-4-Vormerkung (380-Review):** Track-F-Wildcard-Lookup `club_id→clubs.league_id`; bei künftigen vereinslosen Events auf `COALESCE(events.league_id, club→league)` umstellen (heute kein Treffer).
- **Keine geseedeten Live-Artefakte aus 380** (Smoke war BEGIN…ROLLBACK).

## ✅ E3 Plattform-Topf — REIN komplett (5/5) + RAUS 3/3
- **REIN (Fees, voller Auffang 100% D98, je Zero-Sum live):** Trading 358 · IPO 360 · Polls 363 · Research 364 · Bounty 365 (+P2P).
- **RAUS (Escrow/Debit aus Topf, Zero-Sum, `score_event`/`close_monthly_liga` minten nicht mehr netto):** Monats-Liga 376 · **BeScout-Events 377** · **special-Events 378**.
- **Event-Geldquellen:** club ✅ bescout ✅ special ✅ | **sponsor** (Deposit-Pfad fehlt = eigener größerer Slice) / **creator** (Phase 4) minten weiter.
- **Money-Muster (Pflicht künftige RAUS):** Live-`pg_get_functiondef` VOR Spec (D87) · Escrow-Trigger-zentrisch · inline Deckungs-Check unter Singleton-Row-Lock (`book_platform_treasury` hat KEINEN Negativ-Guard) · D103 Hard-Gate (`RAISE` bei Unterdeckung) · Refund-source/Halter nach `OLD.type` (S377) · force-rollback-Smokes · Reviewer-Pflicht. Quelle: treasury.md §7/§10 + errors-db.md S377.

### ✅ Diese Session (2026-06-25 Nachmittag/Abend) — 377 + 378 + ALLE Reste erledigt
- **377** (`26b15576`): BeScout-Events (`type='bescout'`) aus Topf. 3 Event-Trigger (escrow BEFORE INSERT / settle BEFORE UPDATE OF status / resync BEFORE UPDATE OF prize_pool,type) um `type='bescout'`→`platform_treasury`-Zweig erweitert. CEO-Entscheid (AskUserQuestion): **Escrow-bei-Erstellung** (Spiegel 331), `score_event` unangetastet. Zwei-Treasury-Resync (type-Switch club↔bescout). 8/8 force-rollback PASS, Reviewer PASS. Proof `377-money-smoke.txt`.
- **378** (`f5db42b9`): special-Events (`type='special'`) aus Topf — platform-Zweig auf `type IN ('bescout','special')`, eigene Ledger-source `special_event` (CHECK-Widen + AdminTreasuryTab-Label + i18n DE „Sonder-Event"/TR „Özel Etkinlik"), Refund-source nach Halter `OLD.type`. bescout-Regression-safe (source-CASE, AC-06 empirisch). 9/9 force-rollback PASS, Reviewer PASS. Proof `378-money-smoke.txt`.
- **🔑 Credentials entsperrt (`cc7eb8f9`):** `ali@test.bescout.de` Passwort → **`123456`** (SQL-bcrypt) + zu `platform_admins` (superadmin). **Live-Login gegen GoTrue verifiziert.** Ein Login = Plattform-Admin (`/bescout-admin`) **UND** Sakaryaspor-Club-Admin. Echte Anil-Konten (`djembo31@gmx.de`/`bescout@gmx.de`) unangetastet. **Gate-Wahrheit:** `/bescout-admin` = `platform_admins`-Mitgliedschaft (NICHT `top_role='Admin'`). Details + Reset-Rezept: memory `reference_qa_test_credentials`.
- **Rest #1 Topf-Card-Visual (357) ✅:** Treasury-Card live gerendert (Saldo 500.032,97 Credits, REIN/RAUS/Kontoauszug). Proof `worklog/proofs/357-topf-card-de.png` (lokal, PNGs gitignored).
- **Rest #2 Bounty-Approval-UI (370) ✅:** E2E live — ali approved jarvis-Submission im Club-Admin-UI (`/club/sakaryaspor/admin`→Aufträge→Prüfen→Genehmigen). bounty→completed, submitter +1900 (95%), **Topf +100 source `bounty`**, ali-Wallet unverändert (Escrow), Zero-Sum. Proof `worklog/proofs/370-bounty-ui-approve.txt`.
- **Rest #3 U-1 (371):** war schon VOLL-DONE (AC1/AC2 live PASS `26245d48`), stale „OFFEN"-Vermerk reconciled.

### ✅ 2 neue Funde — BEIDE ERLEDIGT (Session 2026-06-25 spät)
- **✅ Slice 379 (`ff9a238e`):** `credit_tickets` 400 „post_create". Live-Fund = DREI unabhängig gedriftete Gate-Flächen (credit_tickets-Allowlist + spend_tickets-Allowlist + CHECK `ticket_transactions_source_check`) auf 16-Wert-Union (RPC-Legacy ∪ TS TicketSource) gezogen. Mitgefangen: research_publish/research_rating (still 400) + chip_refund (war RPC-erlaubt, scheiterte am CHECK). AC1-AC5 live PASS. Knowledge errors-db.md **S379**. Migration `20260625160000`.
- **✅ Slice 379b (`54b90a15`):** Bounty-Review-Wallet-Hinweis. Live-RPC `approve_bounty_submission` (D87): Admin-Wallet wird NUR bei `!is_user_bounty && !treasury_escrowed` belastet (TODO-Notiz war ungenau). Hinweis-Gate exakt darauf + `treasury_escrowed` zu Type+Service-Selects. 3-Zweig-Test PASS, tsc 0. Kein Money-Seam (Settle-Trigger flippt escrowed bei completed). Scope-Out: neutraler „aus dem Topf gedeckt"-Text = optionaler Folge-Slice (bräuchte DE+TR).

### Geseedete Live-Artefakte (permanent, NICHT aufräumen — E2E-Beweis)
- **378-Bounty-UI:** Sakaryaspor-Bounty `723397eb-5ba2-4b3e-abeb-cb82f682b57e` = completed; jarvis-Submission `6615b41e-8720-461d-8095-397c835f23cd` = approved (+1900); Topf-Eintrag `bounty:100`. Topf live **50.003.397 cents**.
- Actor-IDs: ali `aaaaaaaa-0005-4000-a000-000000000005` (Plattform+Club-Admin) · jarvis-qa `535bbcaf-f33c-4c66-8861-b15cbff2e136` (Manager) · Project `skzjfhvgccaeplydsunz`.

### 📌 Frühere Anker (Referenz, bei Bedarf)

### ✅ Diese Session (2026-06-24 spät) — 371 + 372 DONE
- **371 ✅ VOLL-DONE** (`26245d48`): Live-Playwright AC1/AC2 PASS — Header zeigt nach Poll-Vote (11.708,27→11.698,27) + Research-Unlock (→11.688,27) SOFORT −10 CR ohne Reload, DB-reconciled. Pattern S371 in errors-frontend.md.
- **372 ✅ VOLL-DONE** (`4a7c868f` Fix + `264d4ac5` LOG): BuyModal-Hänger „Saldo wird aktualisiert…" gefixt (E4-Rest C / war 368c-F3). **Root-Cause war NICHT „Tippen vs +/−" (Timing-Artefakt)**, sondern: `useIsBalanceFresh` zeitbasiert (`<30s`) + Modal-Open triggert keinen Wallet-Refetch (Query schon via TopBar gemountet, `staleTime:0`) → stale bleibt für immer stale → Button dauerhaft disabled. Fix: `useWallet.refetch` exponiert + BuyForm-`useEffect`-Self-Heal bei `balanceStale`. Money byte-identisch. Reviewer PASS. **Live Vorher/Nachher bewiesen** (Tiren-Modal: 43s+ stuck → ~3s Self-Heal) + echter Buy reconciled. Pattern S372 → errors-frontend.md.

### Geseedete Live-Artefakte (permanent, NICHT aufräumen — E2E-Beweis)
- **Topf-Ledger (append-only):** Stand zuletzt + 372-Buy = letzter Eintrag `trading:35` (Tiren-Buy). 370-Bestand: bounty 50 · ipo 500 · poll 400+200 · research 400+200 · trading 1512+35.
- **371-VERIFY (consumed):** Poll `4415ed77…` (jarvis voted, Option A), Research `90a1bcbc…` (jarvis unlocked). 370er: Polls `d8737497…`/`c39609f3…`, Research `42ea702d…`/`ef06557d…`, Bounty `ee25724d…` (alle nailoku).
- **372-Buy:** jarvis-qa hält jetzt **1× Muhammed Tiren** (`05f7a1a2-e70b-4327-accd-5f90f84d6f7e`); dessen 10-CR-Order (`17b3842d…`, @bot001) ist **filled**. Verbleibende kaufbare Sell-Orders: Sarıcalı `886d0013…` @125 · Crociata `157a1a78…` @550.
- **3 offene IPOs** (Hatayspor, `kede5`): Rakhim `e4784b96…` @50 · Yiğit `b51dd4be…` @100 · Muhammed Gönülaçar `8f715d63…` @125.
- Actor-IDs: jarvis-qa `535bbcaf-f33c-4c66-8861-b15cbff2e136` (~11.678 CR nach 372-Buy) · nailoku `b6c51aae-d950-4009-b68d-f1c93efa5fcf` · kede5 (Admin) `3c580b9e-1cf0-4c14-8f9e-e0ce1bb46f9f`. Project-ID `skzjfhvgccaeplydsunz`. Login `jarvis-qa@bescout.net` / `JarvisQA2026!`.

### 🔑 Seed-Rezept (wiederverwendbar für ③ Poll / ④ Research / ⑤ Bounty) — codifiziert in `.claude/rules/testing.md`
Money-RPC via Supabase-MCP `execute_sql` callen + `auth.uid()`-Guard umgehen durch JWT-sub-Impersonation in DERSELBEN Transaktion:
```sql
SELECT set_config('request.jwt.claim.sub','<acting_user_uuid>', true);
SELECT <money_rpc>(<acting_user_uuid>, …);  -- guard sieht auth.uid()=acting_user
```
Mehrere Acting-User im `DO $$ … $$`-Block (PERFORM set_config + INSERT INTO temp). Playwright gegen bescout.net, Login `jarvis-qa@bescout.net` / `JarvisQA2026!` (oft schon eingeloggt).

---
## 📦 Ältere Anker (368-Serie alle DONE + E3/Sessions — Referenz, bei Bedarf)

**Slice 368e DONE (D101, committet):** Markteintritt-Modell. Erster IPO = eingefrorener Eintritt (`players.ipo_price`, set-once-Trigger `trg_set_initial_listing` setzt beide Spalten); spätere IPOs = aktueller IPO-Preis (live aus aktiver `ipos`-Row). Trigger `trg_sync_player_ipo_price` ENTFERNT. Daten repariert (MV>0 → MV/10; MV=0 + aktive-IPO unangetastet; IPO-lose `ilp=NULL` Sentinel-Restore). Reader → eine Quelle `prices.ipoPrice`; Portfolio-% → `avg_buy_price`. Toter `getFirstIpoPrice`-Pfad weg. Money byte-identisch (Display-only, D87). Reviewer CONCERNS→MEDIUM-Sentinel-Burn geheilt. **OFFEN: post-Deploy Playwright** (RewardsTab „Dein Einstieg" == TradingTab „Markteintritt" == PriceChart-Linie; PlayerIPOCard aktueller IPO-Preis unverändert; ≥2 Spieler DE+TR). **DROP `initial_listing_price` = eigener Folge-Slice** (Reader=0, Type+Mapper ruhend). Migration `20260624200000`.

### Älterer Anker (368c, DONE):

**E4 = Money-Modell-Glattzug + Mock→Pro-Härtung (D99). Plan-Anker `worklog/notes/366-e4-money-model-cleanup-epic.md`.** Stand:
- ✅ **Schritt 1 — D99 ratifiziert** (`b52e8b09`): Naming **„Credits"** jetzt · Einheit **1 Credit = 100 cents** · Phasen **1/2/3** · Pricing **1 Card = MV/1.000 Credits**. SSOT = **D99**.
- ✅ **Schritt 2 — Doc-Glattzug** (Slice 366, `eba47650`): ~40+ Stellen + Skills auf D99; `grep $SCOUT|BSD messages/` = 0.
- ✅ **Schritt 3 / T-3 — Slice 367 Diamond-Hands** (`7b650a4f`): Rename „Treuer Sammler" + Hold-Logik aus `holdings.created_at` + Konfetti-Gate. Reviewer PASS.

### 🔑 NEU diese Session (2026-06-24): Slice 368 KOMPLETT REFRAMED — alte Prämisse war FALSCH
**Die Handoff-Annahme „368 = ipo_price auf MV/10 nachziehen" ist VERWORFEN.** Anil-Klärung deckte auf: `ipo_price` ist **NICHT** an den MV gekoppelt — es ist der **Preis, den der Verein beim Erstverkauf festlegt** (orientiert sich am MV, darf abweichen, danach eingefroren). Der MV ist nur **Referenz**. „ipo_price auf MV/10 zwingen" wäre der Fehler, nicht der Fix (genau das tat Slice 114 im April).

**→ Festgehalten als `D100` (`memory/decisions.md`) — supersedes D99 Punkt 4.** Das Wertmodell = **vier getrennte Zahlen**, die nie verschmelzen dürfen:
1. **Erstverkaufspreis/Eintritts-Anker** (`ipo_price`) = Vereinspreis, MV-entkoppelt, eingefroren. Bezugspunkt der Preisentwicklung.
2. **Aktueller Marktpreis** (Orderbuch/`last_price`/`floor_price`) = Angebot/Nachfrage.
3. **Marktwert-Referenz** (`market_value_eur`) = Transfermarkt, Cron-aktualisiert, NUR Kontext.
4. **CSF** = im Reward, aus MV-Wachstum, auf richtiger Basis erklären.

**Schlüssel-Funde aus der Live-Discovery (NICHT neu investigieren):**
- `buy_player_sc` kauft über das **Orderbuch** (niedrigste offene Sell-Order, `v_order.price`), NICHT über ipo/floor/last → die 4 Zahlen sind heute fast nur **Anzeige-Werte** = geringes Money-Risiko.
- 96/3.935 Spieler haben `ipo_price ≠ MV/10` — **0 mit aktiver IPO, 0 mit offener Order** → per D100 **KEIN Bug, kein Daten-UPDATE**.
- Echter historischer Vereins-Eintrittspreis ist durch Slice 114 überschrieben (in `initial_listing_price` nur unzuverlässig erhalten) → **nicht rekonstruierbar**. Anzeige-Anker bestehender Spieler = **`ipos.price` der Erst-IPO, sonst „—"** (Anil-Entscheid).
- `floor_price` wird user-facing IMMER als „günstigstes Angebot" gelabelt — auch wenn `recalc_floor_price` ihn aus dem **letzten Verkaufspreis** ableitet (keine offene Order). Quelle nie sichtbar; Labels uneinheitlich („Floor"/„Marktpreis"/„Markt Floor"). = die irreführende Stelle.
- ipoPrice & MV stehen im `RewardsTab.tsx:60-83` verwechselbar nebeneinander („Dein Einstieg" Cr | „Aktueller Marktwert" €).

✅ **368a DONE** (`b6b63c67`): Kanon festgehalten — D100 + INDEX-Range D1–D100 + `treasury.md §1b` + `.claude/rules/trading.md`-Korrektur (alte „Fix=MV/10"-To-Do raus). Reviewer PASS, kein Code/kein Daten-UPDATE. **Spec der ganzen Serie: `docs/plans/2026-06-24-scout-card-value-model-spec.md`.**

✅ **368b DONE** (`17306c09`): RewardsTab-Anzeige-Wahrheit. „Dein Einstieg" liest jetzt echten **Erst-IPO-Preis** (`ipos.price`, frühestes Row) via neuem `getFirstIpoPrice`+`useFirstIpoPrice` statt `players.ipo_price` (Slice-114-vergiftet); kein IPO → **„—" nur im Einstieg-Feld** (MV+Meilensteine bleiben — Anil-Entscheid). +2 InfoTooltips (MV-Referenz vs. Eintritts-Anker). **CSF-Tooltips DE+TR von € → Credits** (user-facing € verboten). Reviewer **PASS** (2 LOW, #1 Service-Test gefixt). tsc 0, 133 Tests. Spec `worklog/specs/368b-scout-card-display-truth.md`. **✅ Visueller Proof live verifiziert** (Owusu Kwabena bescout.net Mobile 393px: „Dein Einstieg" = **461 CR** = echte Erst-IPO statt alt 400; MV 400K€ separat; Meilensteine in CR ohne €; `worklog/proofs/368b-rewardstab-with-ipo.png`).

✅ **368c DONE** (Reviewer PASS, 3 LOW): Floor manipulationssicher + transparent. CEO-Entscheid (Anil): symmetrisches Preis-Band **min=Anker÷3, max=Anker×3** → neue `get_price_floor = get_price_cap/9`; `place_sell_order` lehnt Lowball mit `minPriceExceeded` ab (Live-Smoke: 100<333 reject, 333/500 pass, 4000 maxCap). Schon vorhandener Schutz live-bestätigt (Selbst-Handel/Reziprok-Ping-Pong/20-24h/10-h/Cap/Club-Admin). `PlayerHero.floorSource` → Sublabel quellen-ehrlich (offene Order→„Günstigstes Angebot"/keine→„Letzter Verkauf"). Alle Floor-Labels user-facing → „Marktpreis"/„Piyasa Fiyatı". Money-Pfad (buy/Fees/Topf) byte-identisch. AR-44-Fix: get_price_floor anon REVOKEd. **AC7 Playwright-Sublabel offen post-Deploy.** Sybil-Ring (3+ Accounts) = bewusst eigener späterer Slice (braucht Identitäts-Signale, Phase-2).

### ✅ Diese Session (2026-06-24 nachmittag): E2E-Trading-Härtung + Preis-Wahrheit
- **368c live-verifiziert** (jarvis-qa, bescout.net): Preis-Band reject/pass, Floor-Quelle-Sublabel beide Richtungen, Buy-Orderbuch (günstigste zuerst, Floor-Bewegung), Sell-Lifecycle, P2P-Offer — alle PASS. Funde in `worklog/notes/368c-e2e-trading-findings.md`.
- **368d DONE** (BuyModal „Gesamt"-Wahrheit, Reviewer PASS): Menge/Preis an aktive Order gebunden, 3×11=33-Lüge weg. Money-Flow unberührt. (committet diese Session.)
- **🔴 ANIL-FLAGGED PREIS-BUG + DATEN-FIX:** 500K-Spieler zeigte 10–11 statt 500. Ursache: kaputte Seed-Preise + **drei** driftende „Einstiegs"-Spalten (`ipo_price`/`ipos.price`/`initial_listing_price`). Sofort-Fix (CEO-approved „grobe Ausreißer"): **19 Spieler → MV/1000** (ipo+ipos+last+floor), Douglas live = 500 ✅. **Overreach (offengelegt):** `initial_listing_price` 2964 Zeilen → MV/1000 (war breit kaputt) → 648 Mismatches.
- **← NÄCHSTER: Slice 368e — Einstiegspreis-SSOT** (`worklog/specs/368e-entry-price-ssot.md`, Anil: „Strukturproblem grundsätzlich angehen"). `ipo_price` = EINE Quelle; alle 3 Spalten angleichen + UI-Reader (TradingTab/RewardsTab/useManagerData) umstellen + `initial_listing_price` deprecaten + Re-Drift-Guard. **Spec wartet auf Approval. Offene Anil-Qs (§7):** Portfolio-Basis (ipo vs avg_buy_price), DROP-Timing, RewardsTab-368b-Umkehr bestätigen. **/impact (17 Reader) vor BUILD. Money → Reviewer Pflicht.**
- **Danach (gestapelt):** 369 `/api/push→500` beim Order-Fill (live bestätigt) · 368-Label-Rest (F1/F2 + ~11 „Floor"-Keys + 2 hardcoded, `368c-e2e-trading-findings.md`) · F3 BuyModal getippte-Menge-Hänger · 370 E2E ②–⑤.
- **Residual QA-State:** jarvisqa hält 3 Douglas-Cards, Douglas last/floor=500. Orderbuch/Offers aufgeräumt.

**367-Follow-ups (non-blocking, aus Reviewer):** F#1 „ohne zu verkaufen"-Semantik — Teilverkauf resettet `created_at` NICHT (nur Full-Sell auf qty=0) → mit Anil klären ob Description entschärfen. F#2 Regression-Tests für Hold-Logik (Buy→kein Unlock / 31d→Unlock). F#3 DPC-Mastery-Leaderboard (`mastery.ts`) zeigt weiter geseedetes `hold_days`-Mock → eigener Mock→Pro-Slice.

**Geseedete Live-Artefakte (E2E ①, permanent):** demo-admin 4 Cards Douglas Willian, jarvis 1 Card, 1 Trade-Tx, Pot 35 Cents (source 'trading').

## ✅ E3 „Fees REIN" KOMPLETT (5/5 + P2P) — Trading 358 · IPO 360 · Polls 363 · Research 364 · Bounty 365
> Alle Plattform-Fee-Ströme fließen real in den BeScout-Topf (voller Auffang 100 %, D98, je Zero-Sum live bewiesen). Topf live bei 35 Cents.

## ➡️ DANACH (zurückgestellt): E3 Slice 3 — Monats-Liga e2e (erster RAUS-Kanal)
- `close_monthly_liga` zahlt Rewards per `debit` aus dem Topf (statt Minting) + Deckungs-Check + Idempotenz. Lebt heute, mintet 34.000/Mt, 0 Snapshots. UI: Live-Standing + Cron + `overall`-Median-Fix. Preflight `357-preflight-monthly-leaderboard.md`. Plan `358-platform-treasury-epic.md`. Money-Muster: Live-`pg_get_functiondef` VOR Spec (D87).

## ✅ SESSION 2026-06-24 — Slice 357 E3-1 Topf-Fundament (Money, CEO-Scope)
- **Slice 357** — Plattform-Treasury Topf-Fundament. Mirror Club-Treasury 329 minus tenant-id, Single-Pot. Tabellen + 3 RPCs + Append-only-Trigger (329 wiederverwendet) + RLS 0-Policies + Service +2 Fn + AdminTreasuryTab-Card + i18n DE+TR. **Topf live bei 0, kein Backfill.**
- **Money-Smoke grün:** Buchungskette 1000/1500/1200 (kein Race), append/delete/bad-source/no-auth alle geblockt, RLS/Grants verifiziert. Reviewer **PASS** (2 NIT accepted). 9 Service-Tests grün. Proofs `worklog/proofs/357-*`.
- **DISTILL D97** (ARCHITECTURE): Topf-Saldo = SUM-on-read (Variante A, kohärent mit Club-Treasury) statt gecachter Saldo (B); Revisit B bei Millionen Ledger-Zeilen (Lock-Row existiert → lokaler Umstieg). CEO-approved.
- **Offen:** UI-Card Playwright-Verify gegen bescout.net **nach Deploy** (Vercel baut von main) — noch nicht abgenommen.

## ✅ SESSION 2026-06-23 (Abend) — Slice 356 Exklusive Treue-Umfragen + Money-Heal
- **Slice 356** — Exklusive Treue-Umfragen (`community_polls.min_fan_rank_tier`-Tor): create-Param (nur source='club'), Vote-Guard VOR Wallet (fail-closed), Service `viewer_locked` pro Poll/Betrachter (multi-club), Card-Schloss-Teaser + Create-Selector, i18n DE+TR. Silent-Fail-Fix: `castCommunityPollVote` wirft jetzt bei !success (vorher false-success-Toast). → **Polls-Roadmap KOMPLETT** ((c) Abo-Early-Access von Anil gestrichen).
- **🔴 Live-Money-Heal (Reviewer-Fund, Anil-approved):** Poll-Fee lief seit Slice 343 fälschlich **70/30** statt CEO-approved **80/20** (343 rekonstruierte Body aus `slice_336`-Datei statt Live → 337-Patch still revertiert). Zurück auf 80/20, live-verifiziert (creator_share=800 bei cost=1000). Pattern → errors-db.md (PATCH-AUDIT muss **Konstanten** prüfen, nicht nur Präsenz).
- **Reviewer:** REWORK→geheilt (`worklog/reviews/356-review.md`). **Proof:** `356-rpc.txt` + `356-money-smoke.txt` (Reject→Wallet unverändert; Pass→80/20) + 27 vitest.
- **Prozess:** TR-i18n-Abnahme-Regel (`feedback_tr_i18n_validation`) auf Anil-Wunsch entfernt — TR-Strings nicht mehr vor Commit zeigen.
- DISTILL geprüft: Learnings in errors-db.md (Konstanten-Audit) + polls.md (Feature). Kein neuer `D<n>` nötig (Bug-Fix-/Feature-Klasse, kein Strategiewechsel).

## ✅ SESSION 2026-06-23 (Fortsetzung) — Workflow-Effizienz + 349-Heilung
- **Slice 352** — Workflow-Effizienz #1+#2+#3: `ship-status-gate.sh` log.md-Injection 5→1; Ops/Tooling-Slice-Spur in `workflow.md`; **`errors-frontend.md` → Navigator (78 Z., always-loaded) + `errors-frontend-detail.md` (on-demand, non-matching glob)**. Anil-Alignment: path-scopen verworfen (.tsx-Kollaps = Safety-Regression).
- **Slice 353** — `errors-db.md` (787→73) + `errors-infra.md` (538→66) gleiche Navigator-Mechanik (2 Parallel-Agents). **DISTILL D95** (Navigator+Detail-Architektur). 3 Domains: ~90% weniger always-loaded Context/Edit, 0 Pattern-Verlust.
- **Slice 354** — **349 Live-Verify fand Prod-Bug + gefixt:** Club-Fan-Board „Treueste Fans" war im **Error-State** — `getClubFanLeaderboard` Embed `profiles!inner` ohne FK `fan_rankings→profiles` (FK ging nur auf auth.users). Fix = additiver FK→profiles (Migration `20260623210000`, kanonisch=scout_scores), 0 src/-Änderung, Re-Verify 38 Fans live PASS. **349 jetzt voll-DONE.** Plus **Stale-Tracker-Prävention** (s.u.).

## 🛡️ STALE-TRACKER-KLASSE ABGESTELLT (Slice 354 — Anil-Auftrag)
- **Ursache:** Epic-Sub-Tracker (`s7-phase3-remaining.md`, `348-pro-stand-roadmap.md`) werden von KEINEM Close-Out-Ritual angefasst → driften (348/349 waren nicht abgehakt).
- **Fix (3-teilig):** (1) `.husky/pre-commit` `[TRACKER-RECONCILE]`-Reminder feuert bei „neuer ## NNN in log.md gestaged" (non-blocking, weil semantisch); (2) `workflow.md` LOG-Step „Tracker-Kopplung"; (3) `s7-phase3-remaining.md` Stand-Quellen-Header + `reconciled-through-slice: 354`.
- **Heißt für nächste Session:** beim Slice-LOG erinnert der Hook an MASTERPLAN/TODO/s7-Tracker — reconcilen, nicht ignorieren (außer reine Doku/Meta-Slices).

## 🎯 NÄCHSTER TRACK (Anil-Wahl, frei fortsetzbar)
- **(A) Polls-Reste:** exklusive Treue-Umfragen (`min_fan_rank`) · Abo-Early-Access (kleine Money-Slices).
- **(C) S7-Aufräumen** (Block-SSOT `worklog/s7-phase3-remaining.md`): Monthly-Liga-Board (tot) · `scout_scores`↔`user_stats`-Konsolidierung · Dormant-Hygiene (Research/Voting/Creator-Fund/Wildcard) · Bridges (46). ⛔ `players.club` blockiert (API-Football-Key — Anil-Action).

## 📦 ÄLTERE SESSION 2026-06-23 (Vormittag) — 348/350/351
- **Slice 348** — `csf_multiplier` komplett raus (Code+RPC+Spalte), 0 Money-Effekt (liquidate_player proportional_v3 seit 330).
- **Slice 350** — CI-grün + Push-Fix (D94: Pre-Push=schneller Gate, volle Tests=CI). **Slice 351** — Knowledge-Coupling-Gate (D45).

## ⚙️ NEUE WORKFLOW-REALITÄT (D94 — wichtig!)
- **Push geht wieder normal** (kein `--no-verify` nötig). Falls ein Push doch mal „failed to push some refs" zeigt ohne `remote:`-Meldung: das ist der Transport-Bruch — `git push --no-verify` als Notfall, dann Pre-Push-Hook-Laufzeit prüfen.
- **Pre-Push prüft nur noch `audit:silent-fail:check`** (~5s). Volle Tests laufen in CI (test-job). Ein echter Testfehler erscheint jetzt in CI (~2,5 min + Mail = echtes Signal), nicht mehr lokal vor Push. Bei money-/komplexen Slices ggf. `CI=true pnpm exec vitest run` bewusst lokal fahren vor Push.
- **Bei neuem Silent-Fail-HIGH/MEDIUM:** `.audit-baseline.json` bewusst nachziehen (Report-Diff: neuer echter Bug fixen vs. bestehend re-baseline), sonst CI rot bei JEDEM Push. Pattern in `errors-infra.md` (Slice 350).

## ✅ ZULETZT FERTIG: FRE-5 / Slice 347 (Club-konfigurierbare Fan-Rang-Schwellen, Money-nah)
- Neue Tabelle `club_fan_rank_thresholds` (1 Zeile/Club, monotoner CHECK, 4-Op-RLS Writes-nur-via-RPC). Fehlende Zeile = Plattform-Default 10/25/40/55/70.
- `calculate_fan_rank`-Rewrite gegen **Live-Baseline (D87)** — nur Tier-CASE liest Config; alle Patches erhalten (Follow +5, ELO, csf). Helper `get_club_fan_rank_thresholds` (Default-Single-Source). Write-RPC `set_club_fan_rank_thresholds` (Club-Admin ODER `top_role='Admin'`-Gate, Validierung, **Sofort-Recalc aller Club-Fans** = Money-Tally-Frische).
- Frontend: AdminFansTab Config-UI (5 Inputs, Live-Validierung), FanRankLadder dynamische Schwellen, `getFanRankByScore` entfernt. Service get/set + DEFAULT. i18n DE+TR (9 Keys, namespace-geprüft).
- **Schutz-Grenze:** Gewicht-Mapping Tier→Faktor bleibt GLOBAL (Club verschiebt nur, wer qualifiziert).
- Reviewer PASS (Finding #1 Platform-Admin-Gate gefixt). Proof: Backend AC1-AC8 live + UI-Playwright AC9/AC10 (0 Console-Errors). `worklog/proofs/347-thresholds-smoke.txt`, `e2e/qa-347-fanrank-thresholds.ts`.
- **NÄCHSTES Money-Stück = Anil-Wahl:** Polls-Reste (b exklusive Treue-Umfragen · c Abo-Early-Access) ODER neuer Treasury/REIN-Block. NICHT Airdrop (Coin-Phase). Backlog: csf_multiplier-Removal (D93) · recalculateFanRank swallow→throw.

## ✅ ZULETZT FERTIG: FAN-REWARD-ENGINE FRE-1/2/3 (2026-06-18) — Plan = **D93**
„E1" im MASTERPLAN = ganzes Money-Epic; die Fan-Reward-Engine ist ein Teil davon, Schritte = **FRE-1…FRE-5**.
- **FRE-1 / Slice 344** (`4afd47e6`+`6e53a770`): Fan-Rang-**Leiter sichtbar** + Perk-Katalog (`fanRankPerks.ts`, Mirror Poll-Gewicht 343). Reine UI. Liegt auf Club-Page Tab **„Mehr"** (RevealSection). Live-Proof bescout.net.
- **FRE-2 / Slice 345** (`027b4cdf`): **Follow zählt** (+5 in `calculate_fan_rank`, monoton, cap 100) + Trigger `club_followers_recalc_fan_rank` (best-effort, sofort-Recalc). Money-nah (Fan-Rang→Poll-Gewicht); Abo-Floor (D92) live intakt. Force-rollback-Smoke grün.
- **FRE-3 / Slice 346** (`d3c4f561`): **Exklusive Vereins-Beiträge** ab Fan-Stufe + gesperrte Vorschau (🔒). **RLS-SELECT-Policy auf `posts` ersetzt** (war `USING(true)`) → Fan-Rang-Lese-Gate; `get_club_news_teasers` (SECURITY DEFINER) maskiert content. Neu: `fan_rank_tier_rank(text)` (Mirror FAN_RANK_TIERS), `posts.min_fan_rank_tier`. Kein Content-Leak (Row-Hide + Maskierung), Live-RLS-Smoke grün, Community-Feed + Club-Page post-Deploy regress-frei. Feature **ruhend** bis erste exklusive News (0 club_news live).

## 🎯 NÄCHSTER ARBEITSBLOCK
- ✅ **Erledigt diese Session:** 349 Live-Verify (+ Prod-FK-Bug gefixt, 354) UND alle 3 Workflow-Effizienz-Tracks (352/353). → aktueller offener Stand steht oben unter „🎯 NÄCHSTER TRACK" (Polls-Reste ODER S7-Aufräumen).
- **Slice 351 Gate aktiv:** Knowledge-Content ändern → `updated:`=heute Pflicht; neue `D<n>` → INDEX-Range mitziehen (sonst pre-commit blockt).
- **FRE-4 Airdrop bleibt deferred** (echte-Coin-/CASP-Phase, D93). Nicht resurrecten.
- Quellen: Treasury-WIE `docs/knowledge/domain/treasury.md`; Polls-WIE `docs/knowledge/domain/polls.md`; Score/Fan-Rank-WIE `docs/knowledge/domain/reward-ranking.md`. Pre-Push/CI-Realität: **D94** + `errors-infra.md` (Slice 350).

## 🧮 FAN-RANG-MECHANIK (kurz, für nächste Polls-/csf_multiplier-Slices) — Quelle: live `calculate_fan_rank`
- total_score 0–100 = event×0,30 + dpc×0,25 + abo×0,20 + community×0,15 + streak×0,10, +ELO-Boost (Login-Streak), **+5 Follow (FRE-2)**, cap 100.
- Tier-Schwellen sind seit **FRE-5 / Slice 347 club-konfigurierbar** (`club_fan_rank_thresholds`), Default: Stammgast 10 · Ultra 25 · Legende 40 · Ehrenmitglied 55 · Vereinsikone 70. Tier-Lineal DB-seitig = `fan_rank_tier_rank(text)` (0..5).
- **Recalc-Latenz:** Event-Scoring/Cron + (Un)Follow-Trigger + Schwellen-Save-Recalc (FRE-5). Weiterhin KEIN Trigger auf Abo/Holdings. Bei neuem money-/zugangs-relevantem Gate → recalc-on-read oder Recalc-on-save prüfen (D92-Familie).

## 🔧 BACKLOG (aus FRE-Reviews, je eigener kleiner Slice)
- **csf_multiplier raus** aus `calculate_fan_rank` (D83/D93) — kein Money-Effekt (gedeckelt/wirkungslos).
- Teaser-RPC `get_club_news_teasers` oberes LIMIT-Cap (`LEAST(...,50)`) — 346-NIT#3.
- `posts`-INSERT-Policy `club_admins`-Härtung (Nicht-Admin kann club_news mit fremder club_id einfügen) — pre-existing, 346-Scope-Out.
- cross-user Batch-Notify ohne locale → DE für alle (342-NIT#1, seit 336).
- TR-i18n-Unidiomatik (kein Commit-Blocker; nur Compliance hart).

**Muster:** Money-nah/Schema → **/impact + Live-functiondef ZUERST (D87)**. UI/Service → Mobile 393px + DE/TR namespace-aware (333-Falle: Live-Render-Console auf MISSING_MESSAGE prüfen). Reviewer-Pflicht. Pre-Push fährt VOLLE vitest-Suite (~6 min). **TR-Genauigkeit kein Commit-Blocker** (nur Compliance hart). **Teaching-Mode DURCHGEHEND + EINFACH — jede Antwort an Anil startet mit 1-3 Sätzen Klartext VOR Tools, keine Abkürzungs-/Tabellen-Wände, bei Zögern STOPP+erklären** (`feedback_teaching_mode`, 4× gemahnt). **Abhängige FE-Arbeit NICHT in Worktree-Agent dispatchen bevor Backend committed ist** (FRE-3-Lehre: Agent blockte, weil uncommitted Service nicht im Worktree).

## 💰 Money-SSOTs — NIE neu erarbeiten
- **D83** → `docs/knowledge/domain/treasury.md` (WIE Treasury) · **D86** → `docs/knowledge/domain/polls.md` (WIE Polls). `memory/decisions.md` = WARUM. INDEX.md routet via `consult_when`.
- Grundgrößen: 1 $SCOUT = 1 Cent · 1 SC = MV/100.000 € · Fee-Split Polls 20/80.
- **`calculate_fan_rank`-Body lebt NUR live** — `20260330_streak_benefits_rpcs.sql` ist stale, NIE als Baseline (errors-db.md PATCH-AUDIT, FRE-2-Lehre).

## ⚠️ STOLPERFALLEN
1. **API-Football-Key gesperrt** — blockiert players.club + Live-Scores (Engine braucht ihn NICHT).
2. **Audit-Churn** (`worklog/audits/*`) — NIE committen. **session-handoff.md** = committen OK.
3. **RLS posts SELECT** ist seit 346 ein Fan-Rang-Gate (war `USING(true)`) — bei künftigen posts-Read-Änderungen beachten: öffentliche Beiträge = `min_fan_rank_tier IS NULL`-Zweig.

> Crash-Recovery-Blöcke 2026-06-23 (3×) entfernt — Recovery erfolgreich in Folge-Session, Phase-A-Hygiene committet.

