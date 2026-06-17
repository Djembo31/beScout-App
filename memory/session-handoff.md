<!-- auto:handoff-start -->
# Session Handoff — Auto (2026-06-18 00:11)

> Dieser Block wird vom Stop-Hook aktualisiert. Manueller Rich-Content steht ausserhalb der Marker.

## Uncommitted Changes: 2 Files
```
 M memory/session-handoff.md
?? worklog/audits/knowledge-2026-06-17.md
```

## Session Commits: 7
- ab8b406e docs(session-end): Handoff Polls-P1-Fresh-Start + DISTILL Legacy-Retire-Triage
- 0766987e chore(hygiene): E0-W3b — cortex-Trio retiren, Jarvis-Legacy abgewickelt
- 86d27bed docs(log): E0-W3 LOG — Hygiene-Slice geloggt, active.md idle, TODO neu priorisiert
- 4997531f chore(hygiene): E0-W3 — Binärmüll-Stop (.gitignore) + Root-Vault-Archivierung (16 stale Files)
- 8cd83072 docs(session-end): DISTILL D90 (3-Schichten-Wissens-Kanon) + Handoff W3-fresh-start
- 72b22fc0 docs(knowledge): E0-W2c — Wissens-Welle abgeschlossen (cortex abgelöst, Stubs weg, ~95 ephemere Files archiviert)
- aa3bcbdd docs(knowledge): E0-W2b — Wissens-Basis migriert (18 Gold-Files → docs/knowledge/, 3-Schichten-Kanon)

<!-- auto:handoff-end -->

---

# 🎯 RESUME-ANKER NÄCHSTE SESSION (Start: POLLS P1 — frisch, Money-Slice)

**Status: idle.** Vor Start: `git status --short --branch && git log --oneline -8`. Audit-Churn (`worklog/audits/*`) NIE committen (`knowledge-*.md`/`wiring-*.md` untracked = ok). HEAD = E0-W3b `0766987e` oder neuer (DISTILL-Commit). `worklog/active.md` = idle. **E0 (Operating-System) ist faktisch FERTIG** — die nächste Session baut wieder Produkt/Geld.

## ⚡ NÄCHSTES STÜCK = POLLS P1 („die fehlende Tür") — Money/CEO-Scope, SELBST bauen (Opus)

**Was & Warum:** `community_polls` kann gelesen/abgestimmt/abgebrochen werden, aber **es gibt KEINE Erstellung** (kein Service/RPC/UI) = „Hülle ohne Tür". Polls = **REIN-Geldmaschine** (Fan zahlt Vote → Verein/Creator verdient → Treasury), NICHT „Verein belohnt Teilnahme" (D86). Das ist das nächste große Geld-Stück nach den Treasury-RAUS-Kanälen (329-332).

**PFLICHT-LESE-REIHENFOLGE vor Spec:**
1. **`docs/knowledge/domain/polls.md`** (Kanon, D86) — §2 drei Spuren, §3 Identitäts-Grenze, §8 P1-Roadmap, §9 Current-State-Inventar. **Das ist die Wahrheit, NICHT neu erarbeiten.**
2. **`docs/knowledge/domain/treasury.md`** — REIN-Seite + Ledger-Pattern (Polls-Creator-Anteil → Treasury-Credit).
3. **D87-Pflicht (Money):** Live-`pg_get_functiondef('cast_community_poll_vote')` + `community_polls`-Schema (`mcp__supabase`/`list_tables`) **VOR** dem Problem-Statement lesen — nicht aus Migrations-Files annehmen.

**Polls-P1-Scope (aus polls.md §8, jeder Punkt einzeln CEO/Money):**
- [ ] `create_community_poll`-RPC + Service + Erstell-UI (Frage + 2–4 Optionen + Laufzeit).
- [ ] **Autoritäts-/Quellen-Feld** (analog Events-`type`, Slice 331): „offiziell vom Verein" vs „User". Nur Club-Admin darf offiziell-vom-Verein anlegen (Identitäts-Grenze §3, sicherheitskritisch).
- [ ] **Geld-Routing:** Vereins-Umfrage → Creator-Anteil als **REIN-Credit in die Treasury** (neuer Ledger-Typ `poll_revenue`); User-Umfrage → User-Wallet (wie heute). **⚠️ FALLE:** vorgehaltener Ledger-Typ `poll_reward` war als **DEBIT/RAUS** gedacht (falsche Annahme) — Polls sind REIN, korrekten **Credit**-Typ einführen.
- [ ] **Follower-Tor** fürs User-Anlegen (Schwelle TBD = Anil-Frage).

**Money-Slice-Muster (bewährt 329-332) — anwenden:** Live-`pg_get_functiondef` VOR Spec (D87) · trigger-zentrisch (Escrow BEFORE INSERT + Settle BEFORE UPDATE OF status + Resync BEFORE UPDATE OF betrag wenn editierbar) · Guard `ledger_net − offene withdrawals` unter `clubs FOR UPDATE` · Grandfathering via `*_escrowed`-Flag · `pg_get_constraintdef` gegen CHECK-Drift · force-rollback-Smokes (DO + RAISE). **/impact ZUERST** (RPC+Schema-Change). **Compliance:** Wording user-facing (kein „gewinnen/Preis" — `business.md`), TR-i18n Anil-Review-pflichtig.

## 💰 Money-SSOTs — NIE neu erarbeiten
- **D83** → `docs/knowledge/domain/treasury.md` (WIE Treasury) · **D86** → `docs/knowledge/domain/polls.md` (WIE Polls). `memory/decisions.md` = WARUM. INDEX.md routet via `consult_when`.
- Grundgrößen: 1 $SCOUT = 1 Cent · 1 SC = MV/100.000 € · Fee-Split Polls 30 % Platform / 70 % Creator (Vote heute via `cast_community_poll_vote`).

## ✅ Diese Session (2026-06-17) — E0 Welle 3 abgeschlossen
- **E0-W3** (`4997531f`/`86d27bed`): `.gitignore`-Binärstop + 16 verwaiste `memory/*.md` → `_archive/2026-06-17-w3` (root 58→42). KONSERVATIV (Gruppe B/C unangetastet). Reviewer PASS.
- **E0-W3b** (`0766987e`): cortex-Trio retired — `morning-briefing.sh` + Commands `/done`/`/status`/`/switch` + 3 tote Memory-Files weg; inject-context/pattern-check entkernt. Reviewer PASS. Lehre → `errors-infra.md` (Legacy-Retire-Triage).
- **DISTILL:** Infra-Lesson „Legacy-Tooling retiren: erst klassifizieren, dann löschen" → `errors-infra.md` (kein neues D — geplante Hygiene-Ausführung).

## ⚠️ STOLPERFALLEN / BACKLOG
1. **API-Football-Key gesperrt** — blockiert players.club + Live-Scores (Polls braucht ihn NICHT).
2. **events.status CHECK kennt kein 'cancelled'** → UI-„Absagen" broken → eigener Slice (Cancel + CHECK + Event-Prize-Refund-Zweig).
3. **bounty reward_cents-Max-Drift** (CHECK 100k vs RPC-Text 1M $SCOUT) + **`auto_close_expired_bounties` ohne getrackte Migration** (AR-43) → Backlog.
4. **TR-i18n Anil-Review-pflichtig:** successFee, eventPrizeTreasuryInsufficient, bountyTreasuryInsufficient, bountyNotClubAdmin (frühere Session geschrieben, ungeprüft).
5. **E0-Reste (LOW, optional):** W3-Teil-2 Root-Vault-Notizen (`wiki-*.md`, `_HOME.md` + ~20 weitere stale root-`memory/*.md`) noch nicht archiviert · W4 Historie-Rewrite (`git filter-repo`, mit Backup, separat) · `patterns.md`/`errors.md`-Dup (W2b-#5) · `audit-knowledge.ts` Orphan-Pfad-Härtung. Kein Blocker für Polls.
6. **Audit-Churn** (`worklog/audits/*`) — NIE committen. **session-handoff.md** = committen OK.
