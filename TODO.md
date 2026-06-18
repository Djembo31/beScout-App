# BeScout — TODO (dynamisch, prio-geordnet)

> **Was als Nächstes, in Reihenfolge.** Wird bei Session-Start gezeigt (Hook). Begleiter: `MASTERPLAN.md` (das große Bild).
> Pflege: bei jedem Slice-Abschluss abhaken + neu priorisieren (Teil des Rituals). Erledigtes → `## ✅ Erledigt (letzte 10)`, dann archivieren.
> Prio: 🔴 P0 = jetzt · 🟡 P1 = als Nächstes · 🟢 P2 = Backlog. v1 — 2026-06-17, gemeinsam zu schärfen.

## 🔴 P0 — jetzt
- **Fan-Reward-Engine (Teil von E1) — FRE-3 als Nächstes.** FRE-1 (344 Leiter) ✅ · FRE-2 (345 Follow zählt +5) ✅ live. **FRE-3 = ein echtes neues Perk-Gate** (z. B. exklusiver Community-Zugang ab einer Fan-Stufe). Design-Entscheidung mit Anil offen (welcher Perk zuerst?). Plan = **D93**.

## 🟡 P1 — als Nächstes
- **Aufräum-Haken aus FRE-Investigation (2026-06-18):**
  - **`csf_multiplier` raus** aus `calculate_fan_rank` (D83: Treue läuft über die Engine, nicht den CSF-Bonus). Eigener kleiner Slice, kein Money-Effekt (CSF-Multiplier ist ohnehin gedeckelt/wirkungslos, W2-A).
  - **Fan-Rang aktualisiert verzögert** (nur nach Event-Scoring/Cron, kein Trigger auf Abo/Holdings/Follow — reward-ranking.md W2-A). Bei FRE-2 die recalc-Frage konkret entscheiden (vgl. D92 Re-Visit).
- **E0 Welle 4** — Historie abspecken (`git filter-repo`, mit Backup, eigener bewusster Schritt). LOW.

## 🟢 P2 — Backlog
- Polls P4 (User-Auszahl-Idee an Teilnehmer) — **VERWORFEN** (Anil 2026-06-18: Glücksspiel-Risiko). Nicht ohne neue Ansage.
- Fan-Reward-Engine Rest: FRE-3 echtes Perk-Gate · FRE-4 Airdrop (Club belohnt Top-Treue mit $SCOUT aus Treasury, Money, D92-MAX-Floor) · FRE-5 Club-Konfigurierbarkeit der Perks.
- Andere Event-Quellen (bescout/sponsor/user) — Plattform-Topf/Sponsor-Deposit/User-Wallet.
- TR-i18n Anil-Review: successFee, eventPrizeTreasuryInsufficient, bountyTreasuryInsufficient, bountyNotClubAdmin, Polls-`pollErr*`/`createPoll*` (Genauigkeit, kein Commit-Blocker).
- S7 Phase-3 Reste (E2): Leaderboard-Konsolidierung, Dormant-Features, Bridges (46). ⛔ players.club (API-Key gesperrt).

## ✅ Erledigt (letzte, dann archivieren)
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
