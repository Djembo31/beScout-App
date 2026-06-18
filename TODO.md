# BeScout — TODO (dynamisch, prio-geordnet)

> **Was als Nächstes, in Reihenfolge.** Wird bei Session-Start gezeigt (Hook). Begleiter: `MASTERPLAN.md` (das große Bild).
> Pflege: bei jedem Slice-Abschluss abhaken + neu priorisieren (Teil des Rituals). Erledigtes → `## ✅ Erledigt (letzte 10)`, dann archivieren.
> Prio: 🔴 P0 = jetzt · 🟡 P1 = als Nächstes · 🟢 P2 = Backlog. v1 — 2026-06-17, gemeinsam zu schärfen.

## 🔴 P0 — jetzt
- **Anil-Wahl offen** — Fixes-Cluster (339/polls.md/340/341) + Polls P1-P3+Fee + Event-Cancel + Predictions (333-341) alle DONE. Nächster Slice = Anil-Entscheidung aus P1.

## 🟡 P1 — als Nächstes
- **Notify-Fan-out-Batching** (aus 339-Review-NIT#1): Follower-Notify `Promise.all` ist seit dem Cap-Fix (339) bei Mega-Club ein Concurrency-Storm. Vor echtem Galatasaray-Launch in Chunks (500er) oder serverseitige Fan-out-RPC. **Money-nah, Skalen-kritisch.**
- **Polls P3c — Fan-Rang** (deferred aus Slice 336): Fan-Rang (`fanRanking.ts`, 6 Stufen, „fast wirkungslos") als Gewicht/Auszahl-Anteil aktivieren + Abo Early-Access/exklusive Mitglieder-Umfragen. `polls.md` §6/§8. **Letztes Polls-Feature.**
- **E0 Welle 4** — Historie abspecken (`git filter-repo`, mit Backup, eigener bewusster Schritt). LOW.

## 🟢 P2 — Backlog
- Polls P4 (User-Auszahl-Idee an Teilnehmer) — **VERWORFEN** (Anil 2026-06-18: Glücksspiel-Risiko). Nicht ohne neue Ansage.
- Fan-Reward-Engine (E1) — Verein belohnt treue Fans.
- Andere Event-Quellen (bescout/sponsor/user) — Plattform-Topf/Sponsor-Deposit/User-Wallet.
- TR-i18n Anil-Review: successFee, eventPrizeTreasuryInsufficient, bountyTreasuryInsufficient, bountyNotClubAdmin, Polls-`pollErr*`/`createPoll*` (Genauigkeit, kein Commit-Blocker).
- S7 Phase-3 Reste (E2): Leaderboard-Konsolidierung, Dormant-Features, Bridges (46). ⛔ players.club (API-Key gesperrt).

## ✅ Erledigt (letzte, dann archivieren)
- 2026-06-18: **Fixes-Cluster** — Slice 339 (`.limit()`-Cap-Härtung getPlayerNames+Follower-Notify, Reviewer PASS) · polls.md §2-§9 Doku-Refresh (333-339) · Slice 340 (Bounty-Reward-Guard an CHECK, Money, Reviewer PASS, Boundary-Smoke) · Slice 341 (`auto_close_expired_bounties` getrackte Migration AR-43). Plus: Plan-Drift geheilt + Live-Verifikation 334-336.
- 2026-06-18: **Slice 338 Predictions-Removal** (Tippspiel-Feature komplett raus, 5 Achsen: Code 14 Files + DB-DROP + i18n + Tooling + Doku). Reviewer PASS, deploy→DROP, AC grün. `b15c69b5`.
- 2026-06-18: **Slice 337 Polls-Fee 30/70→20/80** (CEO-Fee-Change, Verein behält mehr). Self-Review PASS, Money-Smoke. `0f877843`.
- 2026-06-18: **Slice 336 Polls P3** (Follower-Reichweite-Notify + Abo-2×-Gewicht bei Paid-Polls; Fan-Rang deferred→P3c). Reviewer PASS, Money-Smoke. `60147794`.
- 2026-06-18: **Slice 335 Event-Cancel geld-sicher** (`cancel_event`-RPC + `events_status_check`+'cancelled' + Prize-Refund-Zweig + latenter Ticket-CHECK-Bug gefixt). Reviewer CONCERNS→geheilt.
- 2026-06-18: **Slice 334 Polls P2** (`community_polls.player_id` + 9-arg-RPC + Discovery: Anker-Chip-Filter + Suche Verein/Spieler über alle Feed-Typen). Reviewer PASS, DB live verifiziert.
- 2026-06-18: **Slice 333 Polls P1** (Erstellung + Quellen-Identität + Treasury-REIN-Routing `poll_revenue` + Follower-Tor 50). Reviewer PASS, force-rollback-Money-Smoke + Live-Playwright PASS. `5c674e3d`/`871ec47e`. → E1-Geldmaschine REIN-Seite eröffnet.
- 2026-06-17: **E0-W3b** (cortex-Trio retired: morning-briefing + 3 Alt-Commands + 3 tote Memory-Files weg) · **E0-W3 Teil1+A** (.gitignore-Binärstop + 16 memory-Files) · **E0 Welle 2 komplett** (Wissens-Basis W2a/gov/b/c).
- 2026-06-17: Treasury 329→330→330b→331→332 (RAUS-Kanäle komplett) · D86 Polls-Modell · D87 Live-functiondef-vor-Spec · Cockpit Welle 1.
