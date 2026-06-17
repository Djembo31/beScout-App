<!-- auto:handoff-start -->
# Session Handoff — Auto (2026-06-17 20:45)

> Dieser Block wird vom Stop-Hook aktualisiert. Manueller Rich-Content steht ausserhalb der Marker.

## Uncommitted Changes: 2 Files
```
 M memory/session-handoff.md
?? worklog/audits/knowledge-2026-06-17.md
```

## Session Commits: 7
- aa3bcbdd docs(knowledge): E0-W2b — Wissens-Basis migriert (18 Gold-Files → docs/knowledge/, 3-Schichten-Kanon)
- 3e9dd504 docs(session-end): DISTILL D89 (Option B Wissens-Heimat) + Handoff E0-W2b
- dd16715d feat(knowledge): E0-W2gov — Wissens-Governance verdrahtet (D88 + audit:knowledge)
- 4154ca5a docs(knowledge): E0-W2a — Wissens-Index (INDEX-first) + Skelett + Auto-Inject
- 1e66f4f7 docs(plan): E0 Operating-System + Wissens-Basis — Epic-Plan (Wellen 2-4)
- 72f394b4 docs(cockpit): E0 Welle 1 — MASTERPLAN + prio-TODO auto-gezeigt bei Session-Start
- 7ee54574 docs(session-end): DISTILL D87 (Live-functiondef vor Spec) + Handoff + active cleanup

<!-- auto:handoff-end -->

---

# 🎯 RESUME-ANKER NÄCHSTE SESSION (2026-06-17 Nacht — E0 Welle 2 Kern DONE)

**Status: idle.** Vor Start: `git status --short --branch && git log --oneline -8`. Audit-Churn (`worklog/audits/*`) NIE committen (1× `knowledge-2026-06-17.md` untracked = ok). `worklog/active.md` = idle (E0-W2gov DONE). HEAD = `dd16715d`.

## ⚡ NÄCHSTES STÜCK = E0-W2b (kollaborativ, mit Anil)

E0 Welle 2 **Kern steht**: W2a (Wissens-Index `docs/knowledge/INDEX.md`) + W2gov (Lebenszyklus verdrahtet — D88 + `audit:knowledge` in pre-commit+nightly). **WICHTIG ab jetzt:** jede neue/migrierte Datei in `docs/knowledge/` braucht 6 Front-matter-Felder + INDEX-Zeile mit `consult_when`, sonst **blockt Pre-Commit** (`audit:knowledge:check` Step 7). Konvention: `docs/knowledge/README.md`.

**W2b-Worklist (2 Teile):**
1. **13 Gold-Files physisch migrieren** nach `docs/knowledge/<bucket>/` + auf Juni-Stand heben + `verified-against`-Anker setzen wenn Code beschrieben. Liste + Bucket-Vorschläge: `worklog/notes/E0-welle2-wissens-inventur.md` + `E0-welle2-memory-quality-assessment.md`.
2. **5 ⚠️-Dup-Entscheidungen GEMEINSAM klären** (bestimmen wohin Files wandern): (a) Treasury-Kanon (3 Orte: concept+D83+trading.md) (b) Polls-Dedup (`worklog/concepts/polls-...` vs `memory/project_polls_...`) (c) D28/D39 zusammenführen (d) D62/65/67 (e) `patterns.md` auflösen + Compliance `business.md`↔`wiki/compliance`. Volle ⚠️-Liste: Inventur-Note Sektion „Zur gemeinsamen Klärung".

**Danach:** W2c (~90 ephemere/leere memory-Files → `_archive/`, `cortex-index.md` ablösen) → W3 Hygiene (Screenshots gitignoren) → W4 Historie abspecken (mit Backup). Epic-Plan: `worklog/specs/E0-operating-system-knowledge-base.md`.

**Offen (LOW, Review E0-W2gov):** Orphan-Pfad-Casing/Trailing-Slash im Detektor härten vor W2b-Migration (`scripts/audit-knowledge.ts`).

**Pflicht-Ablauf (kollaborativ):** erst gemeinsam pro Dup-Entscheidung Bild + Beschluss (Teaching-Mode, Anil entscheidet) → dann migrieren → `pnpm audit:knowledge:check` grün halten → SHIP-Loop.

## ✅ Diese Session (2026-06-17 Nacht) — E0 Operating-System Welle 2
- **E0-W2a** (`4154ca5a`): `docs/knowledge/` Skelett + `INDEX.md` (37→jetzt routing-Tabelle consult_when) + Session-Start-Pointer + DISTILL-Regel. **Option B** (frisch statt memory/ wiederbeleben) nach 2 Vorarbeits-Agents (Inventur 138 Brocken + memory/-Assessment: ⅔ leer/ephemer). → **D89**.
- **E0-W2gov** (`dd16715d`): Wissens-Lebenszyklus verdrahtet — **D88** + `scripts/audit-knowledge.ts` (intelligenter Detektor, markdown-bewusst, HARD blockt pre-commit / SOFT nightly) + `verified-against`-Konvention + SHIP-LOG/DoD-Kopplung. Deliberate-break-getestet. Reviewer fing Wiring-Self-Block (KNOWN_ORPHANS) → geheilt. Lehre in `errors-infra.md`.
- **Cockpit (W1)** war schon vor dieser Session da (`72f394b4`) — Anil hatte gefragt warum die Begrüßung „anders" sei; Antwort: funktioniert, ist eingebettet ins SHIP-Briefing.

## 💡 Money-Arbeit (pausiert während E0) — SSOTs nicht neu erarbeiten
- Treasury RAUS-Kanäle komplett (329-332). **Nächstes großes Money-Stück nach E0 = Polls (REIN-Geldmaschine, D86)** — `community_polls` hat KEINE Erstellung („Hülle ohne Tür"). Modell+Roadmap P1-P4: `docs/knowledge/domain/polls.md`.
- Money-Slice-Muster (bewährt 329-332): Live-functiondef VOR Spec (D87) · trigger-zentrisch (Escrow BEFORE INSERT + Settle BEFORE UPDATE OF status + Resync BEFORE UPDATE OF betrag) · Guard `ledger_net − offene withdrawals` unter `clubs FOR UPDATE` · `pg_get_constraintdef` gegen CHECK-Drift · force-rollback-Smokes.
- SSOTs: **D83** (`docs/knowledge/domain/treasury.md`) + **D86** (Polls). NIE neu erarbeiten.

## 🧠 WICHTIG fürs nächste Mal
- **Money-Slice-Muster (bewährt 329-332):** Live-functiondef = Baseline VOR Spec (D87) · trigger-zentrisch (Escrow BEFORE INSERT + Settle BEFORE UPDATE OF status + Resync BEFORE UPDATE OF betrag — letzteres Pflicht wenn Betrag editierbar, 331-Finding-#1) · Guard = `ledger_net − offene withdrawals` unter `clubs FOR UPDATE` · Grandfathering via `*_escrowed`-Flag · `pg_get_constraintdef` gegen Status/Type-Literale (CHECK-Drift) · force-rollback-Smokes (DO + RAISE).
- Money-/Polls-Konzept-SSOTs: **D83** (`docs/knowledge/domain/treasury.md`) + **D86** (`docs/knowledge/domain/polls.md`). NIE neu erarbeiten.

## ⚠️ STOLPERFALLEN / BACKLOG
1. **API-Football-Key gesperrt** — blockiert players.club + Live-Scores (Treasury/Polls brauchen ihn NICHT).
2. **events.status CHECK kennt kein 'cancelled'** → UI-„Absagen" broken → eigener Slice (Cancel + CHECK + Event-Prize-Refund-Zweig).
3. **bounty reward_cents-Max-Drift** (CHECK 100k vs RPC-Text 1M $SCOUT) + **`auto_close_expired_bounties` ohne getrackte Migration** (AR-43) → Backlog.
4. **TR-i18n Anil-Review-pflichtig:** successFee, eventPrizeTreasuryInsufficient, bountyTreasuryInsufficient, bountyNotClubAdmin (diese Session geschrieben, ungeprüft).
5. **Audit-Churn** (`worklog/audits/*`) — NIE committen. **session-handoff.md** = dieses File (committen OK).
