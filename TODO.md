# BeScout — TODO (dynamisch, prio-geordnet)

> **Was als Nächstes, in Reihenfolge.** Wird bei Session-Start gezeigt (Hook). Begleiter: `MASTERPLAN.md` (das große Bild).
> Pflege: bei jedem Slice-Abschluss abhaken + neu priorisieren (Teil des Rituals). Erledigtes → `## ✅ Erledigt (letzte 10)`, dann archivieren.
> Prio: 🔴 P0 = jetzt · 🟡 P1 = als Nächstes · 🟢 P2 = Backlog. v1 — 2026-06-17, gemeinsam zu schärfen.

## 🔴 P0 — jetzt
- **⚠️ E4 Money-Modell-Glattzug + Mock→Pro-E2E-Härtung (D99) — IN ARBEIT (Anil-Prio 2026-06-24).** Plan-Anker `worklog/notes/366-e4-money-model-cleanup-epic.md`.
  - ✅ **Schritt 1: D99-OFFEN ratifiziert** (Commit b52e8b09) — Naming „Credits" jetzt/$SCOUT=ICO-Coin · Phasen 1/2/3 · CASP=schnellster sicherer Weg (Route Anwalt) · Pricing 1 Card=MV/1.000 Credits (kein 100×-Widerspruch).
  - ✅ **Schritt 2: Doc-Glattzug** (Slice 366, Commit eba47650) — ~40 Stellen + Skills + SYSTEM-DESIGN auf D99; messages $SCOUT/BSD=0; tsc grün. Proof `366-drift-grep.txt`.
  - **Schritt 3: E2E-Sweep + Bug-Fixes** (`worklog/notes/365-e2e-findings.md`): ✅ **367 T-3 Diamond-Hands** (Rename „Treuer Sammler" + Hold-Logik holdings.created_at statt Mock-Seed + Konfetti-Gate; Reviewer PASS, Commit 7b650a4f). **← NÄCHSTER: 368 P-4 ipo_price-Data-Drift** (Money/CEO: Nicht-Top-Spieler per `MV/10 cents` neu setzen) → 369 T-2 push-500 → 370 E2E-Sweep ②–⑤. T-1 leerer Markt = Produkt-Entscheid (eigener Slice). 367-Follow-ups: F#1 „ohne verkaufen"-Semantik (Anil) · F#2 Hold-Regression-Tests · F#3 Mastery-Leaderboard-Mock.
  - **Follow-up (eigener Compliance-Sweep):** messages eventCurrency/Tickets „Währung/para birimi"-Labels (pre-existing, kein Drift). SSOT = **D99**.
- **E3 Plattform-Treasury (D96), Money/CEO-Scope, selbst bauen (§3) — IM BAU (nach E4 fortsetzen):** ✅ **Slice 1 Topf-Fundament (357)** + ✅ **Slice 2 „Fees REIN" KOMPLETT (5/5):** Trading (358) · IPO (360) · Polls (363) · Research (364) · **Bounty (365)** — `buy_player_sc`+`buy_from_order`→'trading', `accept_offer`→'p2p', `buy_from_ipo`→'ipo', `cast_community_poll_vote`→'poll' (beide source-Branches club+user), `unlock_research`→'research', `approve_bounty_submission`→'bounty' (EINE Buchung deckt alle 3 Zahlungspfade), inline `book_platform_treasury`, **voller Auffang 100 % (D98, CEO-approved)**, Zero-Sum je Quelle live bewiesen. **← NÄCHSTER: Slice 3 Monats-Liga e2e** (erster RAUS-Kanal: `close_monthly_liga` zahlt Rewards per `debit` aus dem Topf + Deckungs-Check + Idempotenz). Dann 4 BeScout-Events → 5 Wettkampf-Darstellung. **Plan-Anker: `worklog/notes/358-platform-treasury-epic.md`** (+ WARUM D96/D98 + WIE treasury.md §10). Money-Muster: Live-`pg_get_functiondef` der Fee-RPCs VOR Spec (D87).
- **✅ ERLEDIGT (Slice 359): `accept_offer` side='sell' repariert** — `offer_buy` in `transactions_type_check` + Invariant-Test reconciled (inkl. 330-Drift pbt_liquidation/success_fee). P2P-Sell-Offers funktionieren wieder. Frontend/i18n war schon da.
- **(C) E2/S7-Pro-Aufräumen** (nachgelagert, Teile wandern in E3): `scout_scores`↔`user_stats`-Konsolidierung · Dormant-Hygiene (Research/Voting/Creator-Fund/Wildcard) · Bridges (46). Monthly-Liga-Board + Ranking-Konsolidierung sind jetzt E3 Slice 3/5. ⛔ `players.club` blockiert (API-Football-Key). Tracker: `worklog/s7-phase3-remaining.md` + `worklog/notes/348-pro-stand-roadmap.md`.
- Backlog aus 346-Review: Teaser-RPC oberes LIMIT-Cap (`LEAST(...,50)`) · posts-INSERT-Policy `club_admins`-Härtung (pre-existing).

## 🟡 P1 — als Nächstes
- **Aufräum-Haken aus FRE-Investigation (2026-06-18):**
  - ✅ **`csf_multiplier` raus** — erledigt Slice 348 (aus TS + RPC + DROP COLUMN).
  - **Fan-Rang aktualisiert verzögert** (nur nach Event-Scoring/Cron, kein Trigger auf Abo/Holdings — reward-ranking.md W2-A). Follow zählt seit FRE-2 (345) mit Recalc-Trigger; Abo/Holdings noch verzögert. Bei Bedarf recalc-Frage konkret entscheiden (vgl. D92 Re-Visit).
- **E0 Welle 4** — Historie abspecken (`git filter-repo`, mit Backup, eigener bewusster Schritt). LOW.

## 🟢 P2 — Backlog
- Polls P4 (User-Auszahl-Idee an Teilnehmer) — **VERWORFEN** (Anil 2026-06-18: Glücksspiel-Risiko). Nicht ohne neue Ansage.
- FRE-4 Airdrop (Club belohnt Top-Treue mit $SCOUT) — **erst in der echten-Coin-Phase** (Phase 3 nach CASP, ADR-026 post-Pilot). Nicht in der jetzigen Phase bauen.
- Andere Event-Quellen (bescout/sponsor/user) — Plattform-Topf/Sponsor-Deposit/User-Wallet.
- TR-i18n Anil-Review: successFee, eventPrizeTreasuryInsufficient, bountyTreasuryInsufficient, bountyNotClubAdmin, Polls-`pollErr*`/`createPoll*` (Genauigkeit, kein Commit-Blocker).
- S7 Phase-3 Reste (E2): Leaderboard-Konsolidierung, Dormant-Features, Bridges (46). ⛔ players.club (API-Key gesperrt).

## ✅ Erledigt (letzte, dann archivieren)
- 2026-06-23: **Slice 356 / Polls P3c-(b)** — Exklusive Treue-Umfragen: `community_polls.min_fan_rank_tier` (NULL=offen, CHECK 6-Tier) · `create_community_poll` +Param (nur source='club') · `cast_community_poll_vote` Vote-Guard VOR Wallet (gespeicherter Rang, fail-closed) · Service `viewer_locked` pro Poll/Betrachter (multi-club) · Card-Schloss-Teaser + Create-Tier-Selector · Discriminated-Union-Fix (Vote-Service wirft jetzt bei !success — vorher silent false-success). **+ Money-Fee-Heal: 343-Bug 70/30 → CEO-approved 80/20.** Reviewer REWORK→geheilt, Money-Smoke (Reject-vor-Wallet + creator_share=800), 27 vitest grün. (b) done, (c) Abo-Early-Access gestrichen → Polls-Roadmap komplett. — Club-konfigurierbare Fan-Rang-Schwellen (neue Tabelle `club_fan_rank_thresholds` pro Club + Helper + `calculate_fan_rank`-Rewrite gegen Live-Baseline + Write-RPC mit Admin-Gate + Sofort-Recalc + AdminFansTab-UI + dynamische Leiter). Money-nah; Schutz-Grenze: Gewicht-Mapping bleibt global. Reviewer PASS (Finding #1 Platform-Admin-Gate gefixt), Backend AC1-AC8 live + UI-Playwright AC9/AC10. 2 Patterns → errors-db.md. `b2ff32ba`.
- 2026-06-18: **FRE-3 / Slice 346** — Exklusive Vereins-Beiträge ab Fan-Stufe + gesperrte Vorschau (🔒). RLS-Lese-Gate (ersetzt `USING(true)`) + SECURITY-DEFINER-Teaser-RPC (content-Maskierung) + Tier-Lineal + Admin-Selektor + Anzeige. Security: kein Content-Leak (doppelt), Live-RLS-Smoke grün, 4 Policies intakt. Reviewer PASS.
- 2026-06-18: **FRE-2 / Slice 345** — Follow zählt als Einstiegssignal in den Fan-Rang (+5, monoton, cap 100) + Recalc-Trigger bei (Un)Follow. Migration byte-identisch zur Live-Baseline (D87) + additiver Block. Money-nah, Abo-Floor (D92) verifiziert intakt. Reviewer PASS, force-rollback-Smoke grün.
- 2026-06-18: **FRE-1 / Slice 344** — Fan-Rang-Leiter sichtbar + Perk-Katalog (Plattform-Default). 6-Stufen-Leiter + Fortschritt + Poll-Gewicht je Stufe (Mirror 343), rendert auch ohne Rang. Reine UI, keine Geld-Formel. Reviewer PASS, Live-Proof bescout.net. `4afd47e6`/`6e53a770`. → Start der Fan-Reward-Engine.
- 2026-06-18: **Slice 343 Polls P3c** — Fan-Rang → Poll-Stimmgewicht (`MAX(Abo, Fan-Rang)`, Ultra/Legende 2× / Ehren/Ikone 3×). Tally-only, Geld unberührt. Reviewer PASS, DB-Smoke 13/13. D92 (MAX-Floor). → Polls-Geldmaschine komplett.
- 2026-06-18: **Slice 342** — Notify-Fan-out-Batching (100er-Chunks, Concurrency-Storm geschlossen). Reviewer PASS.
- 2026-06-18: **Fixes-Cluster** — Slice 339 (`.limit()`-Cap-Härtung getPlayerNames+Follower-Notify, Reviewer PASS) · polls.md §2-§9 Doku-Refresh (333-339) · Slice 340 (Bounty-Reward-Guard an CHECK, Money, Reviewer PASS, Boundary-Smoke) · Slice 341 (`auto_close_expired_bounties` getrackte Migration AR-43). Plus: Plan-Drift geheilt + Live-Verifikation 334-336.
- 2026-06-18: **Slice 338 Predictions-Removal** (Tippspiel-Feature komplett raus, 5 Achsen: Code 14 Files + DB-DROP + i18n + Tooling + Doku). Reviewer PASS, deploy→DROP, AC grün. `b15c69b5`.
- 2026-06-18: **Slice 337 Polls-Fee 30/70→20/80** (CEO-Fee-Change, Verein behält mehr). Self-Review PASS, Money-Smoke. `0f877843`.
- 2026-06-18: **Slice 336 Polls P3** (Follower-Reichweite-Notify + Abo-2×-Gewicht bei Paid-Polls; Fan-Rang deferred→P3c). Reviewer PASS, Money-Smoke. `60147794`.
- 2026-06-18: **Slice 335 Event-Cancel geld-sicher** (`cancel_event`-RPC + `events_status_check`+'cancelled' + Prize-Refund-Zweig + latenter Ticket-CHECK-Bug gefixt). Reviewer CONCERNS→geheilt.
- 2026-06-18: **Slice 334 Polls P2** (`community_polls.player_id` + 9-arg-RPC + Discovery: Anker-Chip-Filter + Suche Verein/Spieler über alle Feed-Typen). Reviewer PASS, DB live verifiziert.
- 2026-06-18: **Slice 333 Polls P1** (Erstellung + Quellen-Identität + Treasury-REIN-Routing `poll_revenue` + Follower-Tor 50). Reviewer PASS, force-rollback-Money-Smoke + Live-Playwright PASS. `5c674e3d`/`871ec47e`. → E1-Geldmaschine REIN-Seite eröffnet.
- 2026-06-17: **E0-W3b** (cortex-Trio retired: morning-briefing + 3 Alt-Commands + 3 tote Memory-Files weg) · **E0-W3 Teil1+A** (.gitignore-Binärstop + 16 memory-Files) · **E0 Welle 2 komplett** (Wissens-Basis W2a/gov/b/c).
- 2026-06-17: Treasury 329→330→330b→331→332 (RAUS-Kanäle komplett) · D86 Polls-Modell · D87 Live-functiondef-vor-Spec · Cockpit Welle 1.
