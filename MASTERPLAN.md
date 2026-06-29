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

- **K1 — Tracker auf die Architektur bringen:** ✅ **Slice 439 (2026-06-28):** 3 tote Tracker-Dubletten (root `session-handoff.md`, `docs/TODO.md`, `docs/WORKFLOW.md`) + 8 verwaiste `worklog/notes/`-Artefakte (290/291/292, 326-preflight, 365-e2e-findings, E0-wissens-inventur, workflow-ballast/-efficiency) gelöscht (853 Z., 0 dangling refs verifiziert, `audit:dup` grün). **Plan-Korrektur (faktenbasiert, Grep-belegt):** die übrigen ~13 `worklog/notes/`-Plan-Docs sind **NICHT wegwerfbar** — sie sind lebende Wissens-Anker (`event-creator-liga-epic`→D104-D108, `mock2pro-plan/-audit`→D111, `406b-map`→D112, `gameweek-recon`→D115, `358-treasury-epic`→treasury.md, `357`/`365-drift`/`366`/`401`/`348-roadmap`/`E0-quality`→decisions). → **verschoben nach K2** (Migration MIT Referenz-Umbiegung), nicht Blind-Löschung. *(Die K1-Annahme „14 Docs falten+löschen" war naiv — Referenz-Ketten-Krankheit, die der Plan selbst verbietet.)*
- **K2 — EINE Wissens-Heimat (Epic, 6 Wellen — Recon 2026-06-29):** Ist-Stand = 3 Skill-Trees + 3 Wissens-Heimaten + Dubletten. Ziel `docs/knowledge/` = SSOT.
  - **K2.1** Skill-Trees → EINE Heimat: ✅ **Slice 442** — `.agents/skills/` (85, stale) + `bencium-…/` (embedded Git-Repo, verwaist, nicht aktive Skill-Quelle) weg; `.claude/skills/` (18) bleibt kanonisch.
  - **K2.2** memory-Müll-GC: ✅ **442:** leeres `semantisch/`. ✅ **443 (K2.2b):** 4 verbrauchte Multi-Liga-Backfill/Seed-Scripts (alle 2026-04-15, 0 Verdrahtung) + 5 Daten (`debug-payload` 220K + `rollback_*`) + `test.rtf` weg (−11.817 Z., 435-Nachzug). ⬜ **K2.2c:** `beta-*`-Docs (12, referenziert in auditor/errors-infra/beta-metrics) — Beta abgebrochen D111, aber Infrastruktur-Refs → eigenes Urteil.
  - **K2.3 — docs-root-Konsolidierung (18 Files; 4-Agent-Recon 2026-06-29 live-verifiziert).** *Plan-Scope-Korrektur: NICHT „4 Dubletten" — 3 Krankheiten: (a) invertierte Wahrheit (kanon. `domain/vision.md` Stand-April ÄLTER als die „veralteten" Root-Docs Stand-24.-Apr → un-routbar), (b) heimatlose Cluster (Legal/Sales/Scaling/Gamification-Design = 0 kanon. Heimat), (c) „FINAL"-Lügen (gamification-v4/SYSTEM-DESIGN-v2 tragen „SSOT"-Header, sind aber überholt).* CEO (Anil): **Wellen, voll nach `knowledge/` kanonisieren.**
    - **A** ✅ **Slice 444:** 7 superseded gelöscht (briefing · Context_Pack_v8 · final-report-v3 · STATUS · ROADMAP · SECURITY-AUDIT · ARCHITECTURE), 0 einzigartiger Wert (SSOT=handoff/MASTERPLAN/disease-register §2/git), 0 dangling. docs/ root 17→10.
    - **B** ✅ **Slice 445:** `domain/vision.md`⬆️ (Asset-Positionierung/Demand-Pools/Timing/Differenzierung, Wording geheilt) + 🆕`research/gtm-strategy.md` (5 Personas/90-Tage-Plan/Club-Targeting A-D/ARR+Exit) +2 INDEX. `VISION.md`+`strategy-2026-04-24` gelöscht (behebt „invertierte Wahrheit": kanon. Heimat war älter als Quell-Docs). 9 lebende Refs umgebogen, 0 dangling.
    - **C** ✅ **Slice 447:** 🆕`decisions/legal-classification.md` (Securities/E-Geld/Glücksspiel + CSF-Vertrag + Lizenz-Matrix [Malta/CASP/MGA aus .docx] + 10 Anwalts-Fragen) + 🆕`research/sales-playbook.md` (Setup-Fees/Monatspreise + 9 Objection-Skripte + Ziel-Clubs + Supply-Strategie) +2 INDEX. 4 Quell-Docs gelöscht, CONCEPT-DPC-Refs umgebogen (trading/treasury/decisions → git-History), 0 dangling. Reviewer PASS. **„500-Cap"-Annahme → kanonisch 10.000 SC korrigiert.** `success_fee_platform_bps` = offene CEO-Frage. Smell gemeldet: `product-map.md:55` Polls 70/30→80/20 (eigener Slice).
    - **D** ✅ **Slice 448:** 🆕`lessons/gamification-design-principles.md` (5 Design-Regeln+Verhaltensökonomie+Ticket-/Cosmetics-Balancing+Mystery-Box-Legal+„entworfen-nicht-gebaut": dyn.Titel/Newbie/Season-Reset/Live-Gam) + 🆕`research/scaling.md` (Schwellen/Migrations-Pfad/Service-Interfaces/Kosten) +2 INDEX; Amazon-FOMO-Pitch→`gtm-strategy`. 3 Quell-Docs gelöscht, 0 lebende dangling, knowledge:check HARD 0. Reviewer PASS — Soll-Ist-Caveat „Engagement mintet noch Credits statt Tickets-only" (→reward-ranking §3) geheilt. **docs/ root 5→2** (nur noch Welle-E-Files).
    - **E** ✅ **Slice 449:** `COMPONENTS` + `player-card-system` **gelöscht** (kein Harvest) — Faktencheck (Code live verifiziert): beide = driftende Dubletten, KEINE heimatlosen Quellen. Registry-Wahrheit = CLAUDE.md §6 + Code-Barrel-Exports; Card-System lebt im Code (`PlayerKPIs` index.tsx:533 + `PlayerDisplay` variant `compact|card`). Drift: variant 3-statt-2, unit=BSD, Modal/SearchInput-TODOs obsolet, Positionsfarben ≠ §6, Predictions/338+Mastery/D102. git=Archiv, KEIN Rettungs-File (würde neuen Drift schaffen). **docs/ root 2→0 → K2.3 KOMPLETT (A-E, 18→0).**
  - **K2.4** `wiki/` (21) → `docs/knowledge/`: Competitor-Analysen (Sorare/Comunio/…) → `research/`, Produkt → `domain/` (autodream-Agent-Kopplung beachten).
  - **K2.5** 18 Plan-Anker (13 notes + 5 plans) + `disease-register` → `docs/knowledge` MIT Ref-Umbiegung (`decisions`/`INDEX`/`treasury`/`session-handoff`, sonst dangling).
  - **K2.6** Memory-Modell-Entscheidung [CEO]: `memory/`-Vault (1.3MB, Obsidian, getrackt) vs Auto-Memory (`MEMORY.md`, pro Session geladen) → 1 Modell.
- **K3 — `docs/plans/`:** ✅ **Slice 441 (2026-06-29):** 142 historische März/April-Feature-Specs (2.9 MB, done-features) + 2 one-off Writer-Scripts + 3 `bes*.json` gelöscht (git=Archiv, CEO-Entscheid; `bes*.json`-Perf-Tasks → W6 gefaltet). 5 referenzierte Anker behalten → K2 (147→5).
- **K4 — root entrümpeln:** ✅ **Slice 440 (2026-06-29):** 16 Müll-Dateien gelöscht (3× 0-Byte Heredoc-Reste `Current`/`Date:`/`Scope:`, `clean_orphan.py`, 7× qa-Snapshot/State, 2× qa-Log, 2× `supabase_dump`, `vitest-output.txt`; −4612 Z.) + `.gitignore`-Prävention (QA-Output self-renewing-Block). `.audit-mutation-race-baseline` + `AGENTS.md` als legit behalten; `bencium-…-skill/`-Plugin-Dir → K2.
- **K5 — Workflow Phase 3 (Engine zu Ende schlanken):** ✅ FIX-Pass-2 (436: 32→28 Hooks) · ✅ `workflow.md` 539→420 (437) · ✅ Auditor-Agents 4→2 (438: generischer Linsen-Auditor + qa-visual, CEO-Entscheid voll-merge, 15→13 Agents) · ⬜ `audit:dup` WARN→BLOCK nach FP=0-Bake (zeit-gegatet, läuft passiv). **→ K5 / Werkzeug-Elite Teil 2 bis auf den passiven BLOCK-Flip KOMPLETT.**
- **K6 — `src/types/index.ts` (2329 Z. Mono-File)** nach Domäne splitten. *(LOW, kann später.)*
- **K7 — History/Decisions archivieren:** `log.md` < Slice 400 + `decisions.md` < D100 → `_archive/` (Lade-/Token-Last raus).

### TEIL B — Code/DB-Heilung (das Engineering; Money-Wellen = §3 selbst, Live-functiondef vor Spec, Zero-Sum, Reviewer-Pflicht)

- **W0 — DB-Security [§3, Triage fertig]:** `get_club_dashboard_stats(text)` (D-12, tot) DROP · 2 Recon-RPCs (`security_definer_audit`, `rls_policy_matrix`) admin-only · `anon` REVOKE (9 Trigger + ~10 Kalkulatoren + 3 Leaderboard-RPCs) · 81 permissive Policies mergen + 26 unused Index + 51 FK-Index. *(Verifiziert: kein aktiver Leak; Migration wartet auf Anil-Go.)*
- **W1 — Trading** ✅ KOMPLETT (403-418)
- **W2 — Spieltag/Scoring** ✅ KOMPLETT (419-429) · ⚠️ **Rest D-01:** `cron_process_gameweek` + `admin_resync_gw_scores` schreiben alte Shape (`ON CONFLICT player_id,gameweek`) → **`42P10` beim nächsten echten GW** (Off-Season maskiert).
- **W3 — Events/Aufstellung [§3]:** Bench in `holding_locks`-INSERT (schließt „1 Karte in N Events") · Lineup-Datenmodell: Slot-Zeilen + DB-`UNIQUE(lineup_id,player_id)` statt 16 Spalten · Entry/Lineup entkoppeln.
- **W4 — Follow:** Discovery-Liste (`clubs/page.tsx`) in React Query + `useToggleFollowClub.onSettled` · `fanRanking`-Freshness · 2 Voting-Systeme `club_votes`→`community_polls`.
- **W5 — Money/State:** EIN kanonischer `formatBalance` (statt `formatScout` 0-dez ↔ `fmtScout` 2-dez) · OffersTab-Heal · Freshness-Self-Heal · Dead-Feature-GC (Ad-Revenue/Creator-Fund/`getMyAdPayouts`).
- **W6 — Performance/Architektur:** Above-the-fold RSC + `prefetchQuery`/`HydrationBoundary` · Auth aus kritischem Render-Pfad · Query-Wasserfall reduzieren. **+ Player-Detail-Perf (ex-`bes26/27/28`, via K3/441):** 5 Player-Detail-Components `React.memo`+`useCallback` · staleTime entschärfen (Over-Refetch) · server-side Percentiles-RPC (ersetzt client `usePlayers()`, das ALLE ~632 Spieler lädt).
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
- **Workflow-Reset** Phase 1 (Ballast-Schnitt 431) + Phase 2 (Anti-Akkretions-Engine + Operating-Agreement 432) + Phase 3 Signal-Detektor `audit:dup` (434, D117 — §0-Schnitt-Regel maschinell, WARN-first; Dogfood-Fund D-33). *(Werkzeug-Elite Teil 2: Scripts-GC 435 + Hook-FIX 436 + workflow.md-Slim 437 + Auditor-Merge 438 [4→2] DONE; offen nur der zeit-gegatete `audit:dup` BLOCK-Flip nach FP=0-Bake.)*
