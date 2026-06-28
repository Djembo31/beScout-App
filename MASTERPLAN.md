# BeScout — MASTERPLAN

> **Die EINE Plan-Quelle.** Vision + Tracker-Architektur + alle offenen Wellen. Wird bei Session-Start gezeigt.
>
> **SSOT-Regel (Slice 433, Anti-Akkretion):** Pläne leben NUR hier. Status → `memory/session-handoff.md` · Historie → `worklog/log.md` · Warum → `memory/decisions.md` · Wissen/Evidenz → `docs/knowledge/`. **Keine Plan-Dubletten. Keine Referenz-Ketten zwischen operativen Trackern** — Referenzen gehören NUR in die Wissens-Heimat (`docs/knowledge`). Neuer Bedarf → diesen Plan erweitern, NIE einen zweiten anlegen.
>
> Pflege: bei Wellen-Fortschritt hier abhaken. Erledigtes → „✅ Geschafft", nicht löschen. KEIN Tages-Status hier (der lebt im Handoff).

## 🎯 Vision
B2B2C Fan-Engagement-Marktplatz für Fußballvereine. Fans verdienen mit ihrem Fußball-Wissen; Vereine monetarisieren + binden ihre Fanbase. Alle 7 Ligen Ziel-Standard. **Marktposition: Sorare einholen, BeScout zur Weltspitze.**

## 🚀 Nordstern: E-MOCK2PRO (D111, seit 2026-06-26)
Beta abgebrochen (zu viele Fehler, nichts lief sauber zusammen). Ganze Codebase auf Profi-/Sorare-Niveau, **Domäne für Domäne** — einmal anfassen, dann fertig. Feature-Bau + Liga pausiert bis durch. **Fundament solide — KEIN Neubau** (D111-Verdikt). 3 Grund-Ursachen: Teil-Konsolidierung („von allem zwei") · Datenmodelle ohne erzwungene Integrität · Client-only-Architektur. **Master-Ursache über ALLE Ebenen** (Voll-Audit `wf_82fc04e4-733`): *„immer anhängen, nie konsolidieren" (R1)* — Gegenkraft verankert in `workflow.md` §0.

## 🗂️ Tracker-Architektur — 1 SSOT pro Ebene (damit es nicht nachwächst)
| Ebene (updatet) | DIE Quelle | Regel |
|---|---|---|
| Aktueller Slice | `worklog/active.md` | 1 Slice, ephemer |
| Status „wo jetzt" | `memory/session-handoff.md` | einzige laufende Stand-Quelle |
| **Plan „was / Reihenfolge"** | **`MASTERPLAN.md` (hier)** | einzige Plan-Quelle |
| Historie „was getan" | `worklog/log.md` | append; < Slice 400 archiviert |
| Warum (ADRs) | `memory/decisions.md` | append; < D100 archiviert |
| Wissen / Evidenz | `docs/knowledge/` (+ INDEX) | EINZIGE Referenz-Heimat |

---

## 📋 DER PLAN — Konsolidierungs-Wellen (Reihenfolge = Prio)

### TEIL A — Meta/Doc-Cleanup (risikoarm, git = Archiv, ZUERST)
*Behebt die Doc-/Wissens-Akkretion (Ist-Stand gemessen 2026-06-28). Löschen, nicht „sicherheitshalber behalten".*

- **K1 — Tracker auf die Architektur oben bringen:** dead `session-handoff.md` (root, letzte Änderung 2026-03-28) löschen · `docs/TODO.md` + `docs/WORKFLOW.md` (Dubletten zu root-TODO / `.claude/rules/workflow.md`) löschen · die ~14 Plan-Docs in `worklog/notes/` (`mock2pro-plan`/`-audit`, `348-pro-stand-roadmap`, `*-epic`, `*-prep`, `*-findings`, `gameweek-recon`) hierher falten + löschen.
- **K2 — EINE Wissens-Heimat:** `docs/knowledge/` = SSOT. `wiki/` (21) + `memory/semantisch/` (3, D89-tot) + wertvolle `docs/`-root-Docs reinmigrieren; **versionierte Dubletten** (`…Context_Pack_v8`, `SYSTEM-DESIGN-v2`, `…report-v3`, `…gamification-v4-FINAL`) auf je 1 aktuelle ziehen, Rest löschen. `disease-register` → hierher (= verifizierte Evidenz). Memory-Modell klären (Projekt-Vault vs Auto-Memory: 1 Modell).
- **K3 — `docs/plans/` (147 Dateien):** Specs offener Wellen behalten, Rest archivieren/löschen.
- **K4 — root entrümpeln:** 6× `qa-*-snapshot.md` + `after-join-state.md` + `test.rtf` → `worklog/` oder gitignore.
- **K5 — Workflow Phase 3 (Engine zu Ende schlanken):** ✅ FIX-Pass-2 (Slice 436: `auto-lint`+`run_tests_on_change` CUT · `pre-commit-guard`→`.husky` · `pattern-check`→`session-retro` · `spec-gate` §3-dokumentiert; 32→28 Hooks) · ⬜ `workflow.md` 521→schlank · ⬜ Auditor-Agents 4→1-2 · ⬜ `audit:dup` WARN→BLOCK nach FP=0-Bake.
- **K6 — `src/types/index.ts` (2329 Z. Mono-File)** nach Domäne splitten. *(LOW, kann später.)*
- **K7 — History/Decisions archivieren:** `log.md` < Slice 400 + `decisions.md` < D100 → `_archive/` (Lade-/Token-Last raus).

### TEIL B — Code/DB-Heilung (das Engineering; Money-Wellen = §3 selbst, Live-functiondef vor Spec, Zero-Sum, Reviewer-Pflicht)

- **W0 — DB-Security [§3, Triage fertig]:** `get_club_dashboard_stats(text)` (D-12, tot) DROP · 2 Recon-RPCs (`security_definer_audit`, `rls_policy_matrix`) admin-only · `anon` REVOKE (9 Trigger + ~10 Kalkulatoren + 3 Leaderboard-RPCs) · 81 permissive Policies mergen + 26 unused Index + 51 FK-Index. *(Verifiziert: kein aktiver Leak; Migration wartet auf Anil-Go.)*
- **W1 — Trading** ✅ KOMPLETT (403-418)
- **W2 — Spieltag/Scoring** ✅ KOMPLETT (419-429) · ⚠️ **Rest D-01:** `cron_process_gameweek` + `admin_resync_gw_scores` schreiben alte Shape (`ON CONFLICT player_id,gameweek`) → **`42P10` beim nächsten echten GW** (Off-Season maskiert).
- **W3 — Events/Aufstellung [§3]:** Bench in `holding_locks`-INSERT (schließt „1 Karte in N Events") · Lineup-Datenmodell: Slot-Zeilen + DB-`UNIQUE(lineup_id,player_id)` statt 16 Spalten · Entry/Lineup entkoppeln.
- **W4 — Follow:** Discovery-Liste (`clubs/page.tsx`) in React Query + `useToggleFollowClub.onSettled` · `fanRanking`-Freshness · 2 Voting-Systeme `club_votes`→`community_polls`.
- **W5 — Money/State:** EIN kanonischer `formatBalance` (statt `formatScout` 0-dez ↔ `fmtScout` 2-dez) · OffersTab-Heal · Freshness-Self-Heal · Dead-Feature-GC (Ad-Revenue/Creator-Fund/`getMyAdPayouts`).
- **W6 — Performance/Architektur:** Above-the-fold RSC + `prefetchQuery`/`HydrationBoundary` · Auth aus kritischem Render-Pfad · Query-Wasserfall reduzieren.
- **W7 — Design-System [Sweep, zuletzt]:** Card/Button-Primitive durchziehen (411 Hand-Surfaces) · Token-Vereinheitlichung.

**Querschnitt-Konsolidierungen (in die Wellen verteilt):** Score-SSOT (`scout_scores`+`user_stats`+`bescout_scores`(tot) → 1 Quelle, W2) · 3 Kauf-RPCs angleichen + `credit_pbt` kanonisieren (W1/W5) · 2 Mission-Systeme (`scout_missions` tot → löschen, W4) · `players.club` String→UUID (⛔ blockiert auf API-Football-Key, W2/W3).

**Verifizierte Evidenz aller Code/DB-Punkte:** Audit `wf_82fc04e4-733` (61 Agents, live gegen DB) → **34 neue + 32 bekannte Krankheiten**, Register = `docs/knowledge/disease-register` (nach K2 dorthin; aktuell `worklog/notes/disease-register.md`).

---

## 📍 Status
→ `memory/session-handoff.md` (einzige Stand-Quelle — NICHT hier duplizieren).

## ✅ Geschafft (Epics — knapp; Detail in `log.md`/`decisions.md`)
- **E0** Operating-System + Wissens-Basis (Cockpit · `docs/knowledge` + Governance D88/D90 · Hygiene).
- **E1** Money/Reward: Treasury-Fundament (329-332) + Polls-Geldmaschine (333-356) + Fan-Reward-Engine (FRE-1/2/3/5).
- **E3** Plattform-Treasury KOMPLETT — REIN 5/5 (357-365) + RAUS 3/3 (376-378), real durchflossen (402).
- **E5** Event-/Creator-/Liga-Modell bis Slice 400 (Liga-Bindung · Saison-Payout · Regelsatz komplett · User-Events e2e).
- **Mock→Pro** Welle 1 (Trading 403-418) + Welle 2 (Spieltag/Scoring 419-429) e2e.
- **Workflow-Reset** Phase 1 (Ballast-Schnitt 431) + Phase 2 (Anti-Akkretions-Engine + Operating-Agreement 432) + Phase 3 Signal-Detektor `audit:dup` (434, D117 — §0-Schnitt-Regel maschinell, WARN-first; Dogfood-Fund D-33). *(Werkzeug-Elite Teil 2: Scripts-GC 435 + Hook-FIX-Pass-2 436 [32→28 Hooks, compliance/i18n-Enforcement-Lücke geschlossen] DONE; offen: `workflow.md`-Slim · Auditor 4→1-2 · `audit:dup` BLOCK-Flip.)*
