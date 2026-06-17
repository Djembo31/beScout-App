<!-- auto:handoff-start -->
# Session Handoff — Auto (2026-06-17 21:24)

> Dieser Block wird vom Stop-Hook aktualisiert. Manueller Rich-Content steht ausserhalb der Marker.

## Uncommitted Changes: 1 Files
```
?? worklog/audits/knowledge-2026-06-17.md
```

## Session Commits: 8
- 8cd83072 docs(session-end): DISTILL D90 (3-Schichten-Wissens-Kanon) + Handoff W3-fresh-start
- 72b22fc0 docs(knowledge): E0-W2c — Wissens-Welle abgeschlossen (cortex abgelöst, Stubs weg, ~95 ephemere Files archiviert)
- aa3bcbdd docs(knowledge): E0-W2b — Wissens-Basis migriert (18 Gold-Files → docs/knowledge/, 3-Schichten-Kanon)
- 3e9dd504 docs(session-end): DISTILL D89 (Option B Wissens-Heimat) + Handoff E0-W2b
- dd16715d feat(knowledge): E0-W2gov — Wissens-Governance verdrahtet (D88 + audit:knowledge)
- 4154ca5a docs(knowledge): E0-W2a — Wissens-Index (INDEX-first) + Skelett + Auto-Inject
- 1e66f4f7 docs(plan): E0 Operating-System + Wissens-Basis — Epic-Plan (Wellen 2-4)
- 72f394b4 docs(cockpit): E0 Welle 1 — MASTERPLAN + prio-TODO auto-gezeigt bei Session-Start

<!-- auto:handoff-end -->

---

# 🎯 RESUME-ANKER NÄCHSTE SESSION (2026-06-18 — E0 Welle 2 KOMPLETT, Start W3 frisch)

**Status: idle.** Vor Start: `git status --short --branch && git log --oneline -8`. Audit-Churn (`worklog/audits/*`) NIE committen (`knowledge-*.md`/`wiring-*.md` untracked = ok). HEAD = `<W2c-Commit oder neuer>` (E0-W2c = `72b22fc0`). `worklog/active.md` = idle.

## ⚡ NÄCHSTES STÜCK = E0-W3 (Hygiene) — frisch starten

E0 **Welle 2 (Wissens-Basis) ist KOMPLETT**: W2a (Index) + W2gov (Governance-Gate D88) + W2b (18 Gold-Files migriert, 3-Schichten-Kanon D90) + W2c (cortex abgelöst, ~95 ephemere Files archiviert). Wissens-Heimat steht: `docs/knowledge/{domain,decisions,lessons,research}/` + `INDEX.md` (Routing-SSOT, auto-injiziert) + `audit:knowledge`-Gate.

**W3-Worklist (Hygiene — 2 Teile):**
1. **Müll-Wachstum stoppen (Plan-W3):** `.gitignore` für `worklog/proofs/*.png` + e2e/qa-Screenshots + Binär-Beweise (lokal behalten, nicht committen). Proof-Konvention = Text (SQL/Test/grep) + optional 1 lokaler Screenshot. Quelle: `worklog/specs/E0-operating-system-knowledge-base.md` (Welle 3).
2. **Root-Vault-Hygiene (aus W2c bewusst hierher verschoben):** ~38 stale `memory/*.md` root-Files (`beta-*`, `phase3-*`, `audit_*`, `impact_*`, `operation-beta-ready`, `multi_league`, `pre-launch`, `bug-tracker`, `data-integrity-deep-dive`, `polish-sweep`, `current-sprint`, `working-memory`, `session-digest`, `feature-map`, `service-map`, `user-journeys`, `backlog`, `next-session-briefing-*`, `ar-counter`, `phase-1.3`) → `memory/_archive/`. **ACHTUNG (Reviewer-Lehre E0-W2c, jetzt Regel in `errors-infra.md`):** Broken-Ref-Grep MUSS die Live-Doku-Schicht abdecken — `repo memory/MEMORY.md` verlinkt viele davon (Sektionen „Beta-Launch-Operations" + „Project") → beim Archivieren MEMORY.md-Links mit-trimmen, sonst tote Pointer im geladenen Index. Frozen Records (`worklog/specs|proofs|reviews`, `_archive`) NICHT anfassen.

**NICHT in W3 (separat):** W4 Historie abspecken (`git filter-repo`, mit Backup, eigener bewusster Schritt). `patterns.md`/`errors.md`-Dup-Auflösung (W2b-Klärpunkt #5, offen). `autodream`-Agent-Redesign (Premise von docs/knowledge abgelöst, nur gebannert).

**Offen (LOW, aus W2gov-Review):** Orphan-Pfad-Casing/Trailing-Slash im Detektor härten (`scripts/audit-knowledge.ts`).

## ✅ Diese Session (2026-06-17) — E0 Welle 2b + 2c
- **E0-W2b** (`aa3bcbdd`): 18 Gold-Files → `docs/knowledge/` (3-Schichten-Kanon **D90**, Anil-Entscheidung). Money-Kanon (`treasury.md`/`polls.md`) selbst gemacht (§3), Reviewer 1:1 gegen D83/D86 bestätigt. 4 Parallel-Agents (faithful-relocate). INDEX = Routing-SSOT. Alt-Originale → Stubs. Decisions-Merge D28→D39 + D62/65/67. Reviewer PASS.
- **E0-W2c** (`72b22fc0`): cortex-index abgelöst (4 Consumer repointet) · 18 Stubs entfernt · 71 ephemere Files → `_archive/2026-06-17-w2c/` · learnings/ KORREKT behalten (Reviewer-Catch). Reviewer CONCERNS→geheilt: Money-SSOT-Nav-Pointer (MASTERPLAN/TODO/handoff) auf docs/knowledge umgebogen. Lehre → `errors-infra.md`.
- **DISTILL:** D90 (3-Schichten-Kanon). D88/D89 aus Vorsession.

## 💰 Money-Arbeit (pausiert während E0) — SSOTs NIE neu erarbeiten
- Treasury RAUS-Kanäle komplett (329-332). **Nächstes großes Money-Stück nach E0 = Polls (REIN-Geldmaschine, D86)** — `community_polls` hat KEINE Erstellung („Hülle ohne Tür"). Kanon+Roadmap P1-P4: **`docs/knowledge/domain/polls.md`**.
- **Kanon-SSOTs:** **D83** → `docs/knowledge/domain/treasury.md` (WIE) · **D86** → `docs/knowledge/domain/polls.md` (WIE). decisions.md = WARUM. NIE neu erarbeiten.
- **Money-Slice-Muster (bewährt 329-332):** Live-`pg_get_functiondef` VOR Spec (D87) · trigger-zentrisch (Escrow BEFORE INSERT + Settle BEFORE UPDATE OF status + Resync BEFORE UPDATE OF betrag, letzteres Pflicht wenn Betrag editierbar) · Guard `ledger_net − offene withdrawals` unter `clubs FOR UPDATE` · Grandfathering via `*_escrowed`-Flag · `pg_get_constraintdef` gegen CHECK-Drift · force-rollback-Smokes (DO + RAISE).

## ⚠️ STOLPERFALLEN / BACKLOG
1. **API-Football-Key gesperrt** — blockiert players.club + Live-Scores (Treasury/Polls brauchen ihn NICHT).
2. **events.status CHECK kennt kein 'cancelled'** → UI-„Absagen" broken → eigener Slice (Cancel + CHECK + Event-Prize-Refund-Zweig).
3. **bounty reward_cents-Max-Drift** (CHECK 100k vs RPC-Text 1M $SCOUT) + **`auto_close_expired_bounties` ohne getrackte Migration** (AR-43) → Backlog.
4. **TR-i18n Anil-Review-pflichtig:** successFee, eventPrizeTreasuryInsufficient, bountyTreasuryInsufficient, bountyNotClubAdmin (diese Session geschrieben, ungeprüft).
5. **Audit-Churn** (`worklog/audits/*`) — NIE committen. **session-handoff.md** = dieses File (committen OK).
