<!-- auto:handoff-start -->
# Session Handoff — Auto (2026-06-17 16:50)

> Dieser Block wird vom Stop-Hook aktualisiert. Manueller Rich-Content steht ausserhalb der Marker.

## Uncommitted Changes: 2 Files
```
 M memory/session-handoff.md
 M worklog/active.md
```

## Session Commits: 4
- a5c27519 feat(treasury): Slice 332 — Club-Bounties ans Treasury (Reward-Escrow bei Erstellung)
- 13404dc1 docs(decision): D86 — Polls = Vereins-Geldmaschine (REIN) + Discovery + soziale Schicht
- e912431a feat(treasury): Slice 331 — Events ans Treasury (Prize-Escrow statt Minting)
- 785e88b7 feat(treasury): Slice 330b — Saldo Debit-Reconcile + Kontoauszug

<!-- auto:handoff-end -->

---

# 🎯 RESUME-ANKER NÄCHSTE SESSION (2026-06-17 Abend — Treasury RAUS-Kanäle DONE)

**Status: idle.** Vor Start: `git status --short --branch && git log --oneline -8`. Audit-Churn (`worklog/audits/*`) NIE committen. `worklog/active.md` = idle (332 DONE).

## ⚡ NÄCHSTES GROSSES STÜCK = Anil wählt (Empfehlung: Polls)

Treasury **RAUS-Kanäle sind komplett** (329 Fundament → 330 CSF → 330b Saldo/Kontoauszug → 331 Events → 332 Club-Bounties, alle live + force-rollback-verifiziert). Drei Optionen:

1. **POLLS (EMPFOHLEN — REIN-Geldmaschine, größtes B2B-Stück, D86).** Fan zahlt → **Verein verdient → Treasury**. **Befund: `community_polls` hat KEINE Erstellung** (kein Service/RPC/UI — „Hülle ohne Tür"; nur lesen/abstimmen/abbrechen existiert). Volles Modell + Roadmap **P1-P4: `worklog/concepts/polls-engagement-monetization-model.md`**. P1 = Erstellung + Identität/Quelle (Verein offiziell→Treasury via NEUEM Credit-Typ `poll_revenue` / User→Wallet, Follower-Tor) · P2 = Spieler-Bezug + Discovery (Filter Verein/Spieler) · P3 = soziale Schicht · P4 = „User auszahlen"-Idee (offen).
2. **Fan-Reward-Engine** (Verein belohnt treue Fans; `csf-club-treasury-model.md` §9; `fan_rankings.csf_multiplier` dormant bereit).
3. **Andere Event-Quellen** (bescout/sponsor/user-Events minten noch; brauchen Plattform-Topf/Sponsor-Deposit/User-Wallet).

**Pflicht-Ablauf (Money/CEO):** erst **Bild aufbauen** (Teaching-Mode, Analogien, KEINE Spec ohne Anil-Verständnis) → bei RPC-Berührung **D87: Live-`pg_get_functiondef` ZUERST** → SPEC → IMPACT → BUILD selbst → REVIEW (Cold-Context) → PROVE (force-rollback) → LOG.

## ✅ Diese Session (2026-06-17 Abend) — Treasury-Serie + Polls-Modell
- **329-332** (5 Slices): Treasury-Fundament + CSF + Saldo-Reconcile/Kontoauszug + Events ans Treasury + Club-Bounties ans Treasury. Alle trigger-zentrisch (Escrow-bei-Erstellung-Muster), nur Club-Quelle, fail-safe Guard. Details: `worklog/log.md`.
- **D86** Polls-Modell (REIN-Geldmaschine) komplett konzipiert + Konzept-Doc + korrigierte die falsche „RAUS"-Annahme im CSF-Doc.
- **D87** Live-functiondef-vor-Spec (2× falsche Prämisse aus alten Files vermieden ab jetzt).
- **Teaching-Mode verschärft** (feedback_teaching_mode.md): erst Konzept einfach aufbauen, dann Optionen — Anil soll bewusst entscheiden, nie raten.
- **3 latente CHECK-Drift-Bugs** gefunden (transactions.type/liquidation [gefixt 330] · events.status/'cancelled' [geflaggt, UI-Cancel broken] · bounties.status/'completed' [gefixt 332]). Pattern in errors-db.md.

## 🧠 WICHTIG fürs nächste Mal
- **Money-Slice-Muster (bewährt 329-332):** Live-functiondef = Baseline VOR Spec (D87) · trigger-zentrisch (Escrow BEFORE INSERT + Settle BEFORE UPDATE OF status + Resync BEFORE UPDATE OF betrag — letzteres Pflicht wenn Betrag editierbar, 331-Finding-#1) · Guard = `ledger_net − offene withdrawals` unter `clubs FOR UPDATE` · Grandfathering via `*_escrowed`-Flag · `pg_get_constraintdef` gegen Status/Type-Literale (CHECK-Drift) · force-rollback-Smokes (DO + RAISE).
- Money-/Polls-Konzept-SSOTs: **D83** (`csf-club-treasury-model.md`) + **D86** (`polls-engagement-monetization-model.md`). NIE neu erarbeiten.

## ⚠️ STOLPERFALLEN / BACKLOG
1. **API-Football-Key gesperrt** — blockiert players.club + Live-Scores (Treasury/Polls brauchen ihn NICHT).
2. **events.status CHECK kennt kein 'cancelled'** → UI-„Absagen" broken → eigener Slice (Cancel + CHECK + Event-Prize-Refund-Zweig).
3. **bounty reward_cents-Max-Drift** (CHECK 100k vs RPC-Text 1M $SCOUT) + **`auto_close_expired_bounties` ohne getrackte Migration** (AR-43) → Backlog.
4. **TR-i18n Anil-Review-pflichtig:** successFee, eventPrizeTreasuryInsufficient, bountyTreasuryInsufficient, bountyNotClubAdmin (diese Session geschrieben, ungeprüft).
5. **Audit-Churn** (`worklog/audits/*`) — NIE committen. **session-handoff.md** = dieses File (committen OK).
