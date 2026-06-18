<!-- auto:handoff-start -->
# Session Handoff — Auto (2026-06-18 14:47)

> Dieser Block wird vom Stop-Hook aktualisiert. Manueller Rich-Content steht ausserhalb der Marker.

## Uncommitted Changes: 3 Files
```
 M memory/session-handoff.md
?? worklog/audits/knowledge-2026-06-17.md
?? worklog/audits/knowledge-2026-06-18.md
```

## Session Commits: 10
- b77c1b43 feat(db): Slice 343 — Polls P3c Fan-Rang → Stimmgewicht (MAX mit Abo-Floor)
- 27e0a121 docs(session-end): Handoff-Auto-Block aktualisiert (Stop-Hook)
- 3a4511ca docs(session-end): Fixes-Cluster + Verifikation geloggt, Handoff-Anker auf P3c, D91
- 92fc9105 fix(services): Slice 342 — Poll-Follower-Notify Concurrency-Storm → gebündelte Batches
- 5320929b docs(plan): TODO nach Fixes-Cluster bereinigen (339-341 erledigt, P2-Dubletten raus)
- 4a826b0e chore(db): Slice 341 — auto_close_expired_bounties als getrackte Migration (AR-43)
- 908c6ece docs(knowledge): polls.md verified-against auf parsebaren Pfad zurücksetzen
- 27ce56b7 fix(db): Slice 340 — create_user_bounty Reward-Guard an bounties_reward_cents_check angleichen
- 79301710 docs(knowledge): polls.md §2-§9 auf Code-Stand 333-339 — Current-State-Drift heilen
- f56eaf18 fix(services): Slice 339 — PostgREST-1000-Cap-Härtung (getPlayerNames + Follower-Notify)

<!-- auto:handoff-end -->

---

# 🎯 RESUME-ANKER NÄCHSTE SESSION

**Status: idle.** Vor Start: `git status --short --branch && git log --oneline -8`. Audit-Churn (`worklog/audits/*`) NIE committen. HEAD = Slice 343 oder neuer (`b77c1b43`). `worklog/active.md` = idle. **Polls P1-P3 + Fee (333-337) + P3c Fan-Rang-Gewicht (343) + Event-Cancel (335) + Predictions-Removal (338) + Fixes-Cluster (339-342) alle DONE — live + gepusht/applied.**

## ✅ ZULETZT FERTIG: SLICE 343 — POLLS P3c FAN-RANG → STIMMGEWICHT (2026-06-18)
- `cast_community_poll_vote`: `weight = MAX(Abo-Gewicht, Fan-Rang-Gewicht)`. Fan-Rang Ultra/Legende 2×, Ehren/Ikone 3×, sonst 1×. **Tally-only, Geld byte-identisch zu 336.** Abo-Floor (MAX) verhindert Regression der Live-2× → **D92** (Blaupause für Reward-Konsolidierung).
- Reviewer PASS (Money-Branch-Diff Zeile-für-Zeile byte-identisch), DB-Smoke 13/13 (inkl. Money-Invariante: weight=3 aber amount_paid=1000). `polls.md` §6/§8/§9 + `reward-ranking.md` W2-A mit-aktualisiert.
- **Polls-Geldmaschine inkl. Fan-Rang-Gewicht damit KOMPLETT.**

## 🎯 NÄCHSTER SLICE = ANIL-WAHL (keine Vorfestlegung)
- **Polls-Rest (je eigener Slice):** (b) exklusive Treue-Umfragen (`min_fan_rank`-Tor — Schema + Vote-/Sichtbarkeits-Guard + **recalc-on-read** weil Fan-Rang dann ein Zugangstor steuert, vgl. D92 Re-Visit) · (c) Abo Early-Access (Zeitfenster) · UI-Surfacing des eigenen Gewichts (Backlog, heute auch Abo-2× still).
- **Fan-Reward-Engine** (E1) — nächster großer Money-Block (Verein belohnt treue Fans, Treasury §8). **D92 = MAX-Floor-Muster hier wiederverwenden.**
- **E0-W4** — Historie git filter-repo (mit Backup, separat). LOW.
- **Polls P4 (Teilnehmer-Auszahlung) = VERWORFEN** (Anil 2026-06-18, Glücksspiel-Risiko). Nicht ohne neue Ansage.

## 🔧 KLEINE BACKLOG-FUNDE — alle erledigt diese Session
- ~~`getPlayerNames` + Follower-Notify ohne `.limit()`~~ → **Slice 339** (Range-Loop).
- ~~`polls.md` §9 stale~~ → **§2-§9 refresht** (333-339).
- **NEU offen:** cross-user Batch-Notify nutzt `notifText` ohne locale → DE für alle Follower (342-NIT#1, pre-existing seit 336). Backlog: i18n-KEY in DB (`notifications.i18n_key`) + Client-resolve.

**Muster:** Money-nah/Schema → **/impact ZUERST**. UI/Service → Mobile 393px + DE/TR. Reviewer-Pflicht. Pre-Push fährt VOLLE vitest-Suite (~6 min) → bei UI/i18n vorher Compliance- + betroffene Component-Tests laufen (337-Lehre). **TR-Genauigkeit kein Commit-Blocker** (nur Compliance hart). **Teaching-Mode DURCHGEHEND** (`feedback_teaching_mode`).

## 💰 Money-SSOTs — NIE neu erarbeiten
- **D83** → `docs/knowledge/domain/treasury.md` (WIE Treasury) · **D86** → `docs/knowledge/domain/polls.md` (WIE Polls). `memory/decisions.md` = WARUM. INDEX.md routet via `consult_when`.
- Grundgrößen: 1 $SCOUT = 1 Cent · 1 SC = MV/100.000 € · **Fee-Split Polls 20 % Platform / 80 % Creator (Slice 337, war 30/70)**.

## ✅ Diese Session (2026-06-18 Abend) — Fixes-Cluster + Plan-Heal + Verifikation
- **Auftakt — Stale-Status gefangen:** Briefing/MASTERPLAN/TODO zeigten Polls P2/Event-Cancel/Polls P3 als offen, obwohl 334/335/336 längst DONE (DB-verifiziert). Plan-Files entdriftet (`12125018`). Lehre: Anti-Pattern #4 lebt — Briefing-Stand IMMER gegen git/DB prüfen.
- **Live-Verifikation 334-336:** 334 Discovery (Anker-Chips + Verein/Spieler-Suche) gegen bescout.net re-bestätigt; `admin.clubPollSection*`-MISSING als stale Pre-Deploy widerlegt. 335/336 sind account/data-gated (jarvisqa: platform_admin=0/club_admin=0/active_subs=0, keine cancelbaren Events, keine aktive Club-Poll) → **DB-bewiesen abgehakt (Anil: „db beweis reicht", keine Prod-Fixtures fabriziert)** = D91.
- **Slice 339** (`f56eaf18`): PostgREST-1000-Cap-Härtung (getPlayerNames + Follower-Notify, Range-Loop, exportierter `fetchAllFollowerIds`). Reviewer PASS, 9/9 + 62/62.
- **polls.md §2-§9 Refresh** (`79301710`/`908c6ece`): Current-State auf 333-339.
- **Slice 340** (`27ce56b7`): create_user_bounty Reward-Guard an CHECK 500–100000 angeglichen (Money; Anil-Wert: Max 1.000 $SCOUT). D87 zeigte: Live-RPC hatte „1M"-Guard längst nicht mehr. Reviewer PASS, Boundary-Money-Smoke (BEGIN/ROLLBACK) grün.
- **Slice 341** (`4a826b0e`): auto_close_expired_bounties als getrackte Migration (AR-43), byte-identisch.
- **Slice 342** (`92fc9105`): Notify-Fan-out-Batching (339-NIT#1) — `notifyPollFollowers` in 100er-Chunks via createNotificationsBatch. Reviewer PASS, 11 + 68 Tests.
- **Knowledge:** errors-db.md CHECK-Drift-Familie um umgekehrte Richtung (RPC-Guard an CHECK angleichen) ergänzt.
- **DISTILL:** **D91** (PROCESS) — gated-UI-Verifikation → DB-Proof akzeptieren, keine Prod-Money-Fixtures fabrizieren. Code-Lehren → errors-db.md. Money-Werte → business.md/Slice-Specs.

## ⚠️ STOLPERFALLEN / BACKLOG
1. **API-Football-Key gesperrt** — blockiert players.club + Live-Scores (Polls braucht ihn NICHT).
2. ~~events.status 'cancelled'~~ → **erledigt Slice 335**.
3. ~~bounty reward_cents-Drift + auto_close_expired_bounties AR-43~~ → **erledigt Slice 340 + 341**.
4. **TR-i18n (Genauigkeit kein Blocker mehr, 2026-06-18):** offene unidiomatik-Kandidaten (successFee, eventPrizeTreasuryInsufficient, bountyTreasuryInsufficient, bountyNotClubAdmin, Polls-`pollErr*`/`createPoll*`) — User-korrigieren später; nur Compliance prüfen, kein Anil-Review-Stopp.
5. **E0-Reste (LOW, optional):** W3-Teil-2 Root-Vault-Notizen (`wiki-*.md`, `_HOME.md` + ~20 weitere stale root-`memory/*.md`) noch nicht archiviert · W4 Historie-Rewrite (`git filter-repo`, mit Backup, separat) · `patterns.md`/`errors.md`-Dup (W2b-#5) · `audit-knowledge.ts` Orphan-Pfad-Härtung. Kein Blocker für Polls.
6. **Audit-Churn** (`worklog/audits/*`) — NIE committen. **session-handoff.md** = committen OK.
