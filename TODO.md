# BeScout — TODO (dynamisch, prio-geordnet)

> **Was als Nächstes, in Reihenfolge.** Wird bei Session-Start gezeigt (Hook). Begleiter: `MASTERPLAN.md` (das große Bild).
> Pflege: bei jedem Slice-Abschluss abhaken + neu priorisieren (Teil des Rituals). Erledigtes → `## ✅ Erledigt (letzte 10)`, dann archivieren.
> Prio: 🔴 P0 = jetzt · 🟡 P1 = als Nächstes · 🟢 P2 = Backlog. v1 — 2026-06-17, gemeinsam zu schärfen.

## 🔴 P0 — jetzt
- **Polls P2** (E1) — Spieler-Bezug + Discovery: `player_id` zu `community_polls` + Filter/Suche nach Verein+Spieler über Polls UND Research/Paywalls. **KEIN Money-Path** (leichter als P1), Schema-Change → /impact zuerst. Konzept: `docs/knowledge/domain/polls.md` §5/§8/§10. Resume-Anker: `memory/session-handoff.md`. (Frische Session — Anil-Entscheidung 2026-06-18.)

## 🟡 P1 — als Nächstes
- **Pre-existing Fix:** `events.status` CHECK kennt kein 'cancelled' → UI-„Absagen" broken (Cancel + CHECK + Event-Prize-Refund-Zweig bündeln).
- **Polls P3** — soziale Schicht (Follower-Reichweite-Ausspielung · Abo-2×-Gewicht bei Paid-Polls · Fan-Rang). `polls.md` §6/§8.
- **E0 Welle 4** — Historie abspecken (`git filter-repo`, mit Backup, eigener bewusster Schritt).

## 🟢 P2 — Backlog
- Polls P4 (User-Auszahl-Idee an Teilnehmer, offene Entscheidung §7).
- Fan-Reward-Engine (E1).
- Andere Event-Quellen (bescout/sponsor/user) — Plattform-Topf/Sponsor-Deposit/User-Wallet.
- bounty `reward_cents`-Max-Drift (CHECK 100k vs RPC-Text 1M).
- `auto_close_expired_bounties` als getrackte Migration (AR-43).
- TR-i18n Anil-Review: successFee, eventPrizeTreasuryInsufficient, bountyTreasuryInsufficient, bountyNotClubAdmin.
- S7 Phase-3 Reste (E2): Leaderboard-Konsolidierung, Dormant-Features, Bridges. ⛔ players.club (API-Key).

## ✅ Erledigt (letzte, dann archivieren)
- 2026-06-18: **Slice 333 Polls P1** (Erstellung + Quellen-Identität + Treasury-REIN-Routing `poll_revenue` + Follower-Tor 50). Reviewer PASS, force-rollback-Money-Smoke + Live-Playwright PASS. `5c674e3d`/`871ec47e`. → E1-Geldmaschine REIN-Seite eröffnet.
- 2026-06-17: **E0-W3b** (cortex-Trio retired: morning-briefing + 3 Alt-Commands + 3 tote Memory-Files weg) · **E0-W3 Teil1+A** (.gitignore-Binärstop + 16 memory-Files) · **E0 Welle 2 komplett** (Wissens-Basis W2a/gov/b/c).
- 2026-06-17: Treasury 329→330→330b→331→332 (RAUS-Kanäle komplett) · D86 Polls-Modell · D87 Live-functiondef-vor-Spec · Cockpit Welle 1.
