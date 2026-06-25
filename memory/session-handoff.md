<!-- auto:handoff-start -->
# Session Handoff — Auto (2026-06-25 17:35)

> Dieser Block wird vom Stop-Hook aktualisiert. Manueller Rich-Content steht ausserhalb der Marker.

## Uncommitted Changes: 1 Files
```
 M memory/session-handoff.md
```

## Session Commits: 8
- f6dfa18c docs(proof): Slice 381 — UI-Playwright post-Deploy ALLE PASS (DE/TR Header, Mobile, Pro-Liga-Board befüllt)
- 0532cc21 feat(rankings): E-2a — BeScout-Saison Begriffs-Umzug + Pro-Liga-Ranglisten-Anzeige (Slice 381)
- 305a4889 docs(handoff): Session-Close 2026-06-25 — E4 zu, E5 gestartet, E-1 (380) DONE, next = E-2a
- a437244c docs(decision): D106 — BeScout-Saison Wertung pro Liga (echte Rewards, anpassbarer Pool, gestuft)
- 90c3c587 feat(events): E-1 — Fußball-Liga an die Event-Aufstellung binden (Slice 380)
- dd23faca docs(decision): D105 — "Liga"=Fußball / Nutzer-Wettbewerb="BeScout-Saison" + E4 abgeschlossen
- 4bc4444e docs(trackers): E5 Event-/Creator-/BeScout-Liga-Epic (D104) in MASTERPLAN+TODO+Handoff verankert
- ecc083da docs(decision): D104 — Event-/Creator-/BeScout-Liga-Zielbild + Roadmap

<!-- auto:handoff-end -->

---

# 🎯 RESUME-ANKER NÄCHSTE SESSION

**Status: idle. HEAD = `a437244c`.** Vor Start: `git status --short --branch && git log --oneline -8`. Audit-Churn gitignored. **CI grün, Push normal, main == origin/main, tsc clean.** Alles committet & gepusht. Diesen Handoff IMMER zuerst lesen (Anil-Regel). **Teaching-Mode durchgehend (einfach erklären, 1-3 Sätze Klartext VOR Tools). Nie verfrüht „bereit/launch-ready" — nur mit Sign-Off + Evidenz ([[feedback_no_premature_ready]]). Launch-Sequenz: Test-IPOs (wegwerfbar) → User-Tests → großer Start MIT Reset ([[project_launch_sequence_reset]]).**

## 🎯 HIER ANKNÜPFEN — E5 E-2a: BeScout-Saison (Rename + Pro-Liga-Ranglisten-Anzeige)

**➡️ NÄCHSTER SLICE = E-2a (M, KEIN Money).** ZUERST lesen: `worklog/notes/event-creator-liga-epic.md` (Section 0 + E-2) + `memory/decisions.md` **D104** (Event-Modell) + **D105** (Liga=Fußball / „BeScout-Saison") + **D106** (E-2-Entscheid: echte Rewards pro Liga, **anpassbarer Preispool**, gestuft).

**E-2a-Scope (gestuft per D106):**
1. **Begriffs-Umzug:** user-facing „Liga" für den NUTZER-Wettbewerb → **„BeScout-Saison"** (`is_liga_event`/`monthly_liga_*` betreffen den Nutzer-Wettbewerb, NICHT die Fußball-Liga — D105). Zwei Achsen entwirren: Fußball-Liga-Bindung (= E-1 `events.league_id`, schon gebaut) vs. Wertungs-Stärke (= altes `is_liga_event`-Flag).
2. **Pro-Liga-Ranglisten ANZEIGEN** + Umschalter „Pro Liga / Gesamt". **KEINE Payout-Änderung** (das ist E-2b).

**🔑 Design-Kern (Live-Audit 2026-06-25, NICHT neu erheben):**
- `scout_scores` ist **NICHT** pro Liga — nur 3 globale Werte/Nutzer (trader/manager/analyst) + season_start_*. `monthly_liga_snapshots`/`_winners` haben **keine** league_id. `close_monthly_liga(p_month)` rankt global über 4 Dim (trader/manager/analyst/overall=Median), Top-3/Dim aus Plattform-Topf (hardcodiert 500k/250k/100k cents, zero-sum debit, Deckungs-Check+RAISE).
- **Pro-Liga = neue (Nutzer,Liga)-Achse nötig.** Sauberster Weg dank E-1: **Manager-Dim pro Liga aus liga-gebundenen Events ableiten** (`events.league_id` → `lineups.total_score`/Event-Punkte je Liga über den Zeitraum). **Trader/Analyst bleiben global** (Handel/Research nicht liga-spezifisch). → E-2a-Spec muss die Ableitung exakt definieren (read-only Aggregat, kein scout_scores-Umbau).
- Rankings-UI: 7 Boards in `src/components/rankings/` (`rankings/page.tsx`); nur `PlayerRankings` filtert heute nach Fußball-Liga; User-Boards (Global/Friends/Club/Monthly/SelfRank) sind global. `getMonthlyLeaderboard` `scoutScores.ts:216` liest `monthly_liga_snapshots` (bei Verkabelung swallow→throw heilen).
- **E-2b später (L, Money/CEO):** `close_monthly_liga` pro Liga + **konfigurierbare Reward-Struktur** (neue Tabelle/Spalten statt hardcodiert) + Deckungs-Check + Idempotenz. Live-functiondef VOR Spec (D87), Reviewer-Pflicht.

### ✅ Diese Session (2026-06-25) — E4 zu, E5 gestartet, E-1 gebaut
- **E4 abgeschlossen** (`dd23faca`): Money-Modell-Glattzug DONE (366→379b). Einziger Rest T-1 Cold-Start = **Launch-Prep, kein Code-Blocker** (gehört in die Test-IPO/Reset-Phase).
- **D105** (`dd23faca`): „Liga" = nur Fußball; Nutzer-Wettbewerb = „BeScout-Saison"; jedes Event = 3 Achsen (Liga-Bindung E-1 · Wertungs-Stärke E-2 · Creator-Typ).
- **✅ E-1 DONE — Slice 380** (`90c3c587`): `events.league_id` (nullable, NULL=offen, **kein Backfill** — Bestand offen) + `rpc_save_lineup` additiver Liga-Gate (Starter+Bank ⊆ Event-Liga, JOIN clubs fail-closed bei club_id NULL → `player_not_in_event_league`). `save_lineup` = nur Wrapper (kein Paritäts-Bug). Money byte-identisch (D87-Baseline). TS-Plumbing + Platform-Admin-Liga-Select (cache-reaktiv) + DE/TR. Reviewer PASS (2 NIT). Live-Smoke AC3-AC7 PASS (`worklog/proofs/380-league-binding.txt`). Migration `20260625180000`. `is_liga_event` unangetastet.
- **D106** (`a437244c`): E-2-Entscheid (s.o.).
- **Offene Folge-Slices aus E-1:** **E-1b** = Lineup-Builder-Picker-Vorfilter (User sieht nur erlaubte Spieler) + Club-Admin-Liga-Picker (E-1 hat Picker nur im Platform-Admin). **E-4-Vormerkung (380-Review):** Track-F-Wildcard-Lookup in `rpc_save_lineup` nutzt `club_id→clubs.league_id`; bei künftigen vereinslosen Events auf `COALESCE(events.league_id, club→league)` umstellen (heute kein Treffer, alle Events haben club_id).
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

