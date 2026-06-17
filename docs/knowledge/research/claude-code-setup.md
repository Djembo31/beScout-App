---
title: Claude-Code Elite-Setup — Research-Distillat + Ausführung
created: 2026-06-16
updated: 2026-06-17
status: active
tags: [research, claude-code, setup, karpathy, tooling]
consult_when: Claude-Code-Fähigkeiten, Setup-Prinzipien, Karpathy-Minimalismus, Hooks/Skills/Agents/MCP-Strategie, Autoload-Budget
---

# Setup-Elite-Upgrade — Claude-Code-Modernisierung + Hygiene

> **Auftrag (Anil 2026-06-16/17):** Setup auf Elite-Level mit voller Tool-Beherrschung. Hygiene (Docs zusammenführen, Müll raus, kein Widerspruch, EIN Workflow). Geprüfte Memory-Funktion (Hermes-Ansatz). Context-Management ohne Overhead. **Volles Mandat — nichts ist heilig.**
> **Faktenbasis:** Deep Research `walz06h0w` (10 adversarial-verifizierte Claims) + Setup-Inventur 2026-06-16. **WARUM-Entscheidung:** D84.

## 1. Research-Distillat (verifizierte Elite-Prinzipien)

**Bestätigt (✓):**
- **Bewusst minimal** — jeder Hook/Skill/MCP/Agent braucht erklärbaren Grund (2-1).
- **Hooks = Determinismus** (Gates die das Modell nicht umschreibt), Skills = Guidance (3-0).
- **MCP nur wenn genutzt** — Tool-*Output* frisst Kontext (2-1).
- **Modell-Strategie:** Sonnet 4.6 Daily Driver (80-90 %), Opus 4.8 für money/Architektur/Security/Race-Conditions (3-0). Preise: Opus $5/$25, Sonnet $3/$15, Haiku $1/$5 per Mtok.
- **Spec-aware Review** = eigene Bug-Klasse (3-0). Parallel-Subagents in eigenen Worktrees (3-0). Cross-Model-Review in 3 Eskalations-Stufen, Start bei Level 1 (3-0).

**Widerlegt (✗) — NICHT übertreiben:**
- ❌ „Nur 3 Hooks" (1-2) → begründbarer Kern, kein Kahlschlag.
- ❌ „Komplexe 3-Schichten-pre-declared Memory-Architektur" (**0-3**) → Memory einfach + geprüft halten.
- ❌ „Recursive Subagents 5 Levels deep" (0-3) → existiert nicht.

## 2. IST-Stand (Inventur 2026-06-16) vs. Elite

| | Doku sagte | Realität | Elite-Soll |
|---|---|---|---|
| Hooks | 28 | **40** (+1 unregistriert) | begründbarer Kern (~15-20) |
| Skills | 22 | **26** | nur regelmäßig genutzte |
| Agents | 9 | **16** | dedup, ~8-10 |
| MCPs | 12 | **3 in `.mcp.json`** | Diskrepanz klären, nur genutzte |
| Autoload-Rules | — | **18 Files / 4.493 Zeilen** | verschlanken |
| Memory-Files | — | **211** | Kern + Archiv |
| Worklog-Files | — | **696** | Archiv-Strategie |
| Workflow-Doc | — | **2 parallele** | EINS |

## 3. Die 5 Modernisierungs-Achsen + LEITSTERN Karpathy

**5 Achsen:** (1) Setup-Verschlankung, (2) Doku-Konsolidierung (EIN Workflow), (3) Memory+Context (Hermes, einfach+geprüft), (4) Müll-Räumung, (5) Modell-Strategie.

**Karpathy-Minimalismus (Quelle `github.com/multica-ai/andrej-karpathy-skills`):** Leitsatz **„bias toward caution over speed"**. 4 Prinzipien (jetzt CLAUDE.md §1): Think Before Coding · Simplicity First · Surgical Changes · Goal-Driven Execution. **Money-kritische Gates bleiben** (spec/proof/review/ceo) — BeScouts legitimer Unterschied, kein Ballast.

## 4. Ausführung 2026-06-17 (voll-autonom, alle 5 Achsen)

- **Achse 4 — Müll-Räumung** ✅ (`f1a228d0`): dated Audit-Subdirs + stale Proofs → `worklog/_archive/`. 600+ slice-nummerierte SHIP-Proofs bewusst NICHT bewegt (append-only Record, Move = Churn).
- **Achse 2 — Doku-Konsolidierung** ✅ (`ced8b2c7`): `workflow-reference.md` → `workflow.md` gemerged. `CLAUDE.md` 164→97 Z., Karpathy-First. **Kern-Fix:** SHIP-Loop 5→6 Stufen (REVIEW war verschluckt). **Anti-Drift:** Register = SSOT-Pointer statt hardcoded Kopien (killt die 28/22/9-Drift-Klasse).
- **Achse 1 — Verschlankung** ✅ Audit-Ergebnis: Kern bereits schlank, KEIN Cull. „Fett"-Annahme war Doku-Drift (Achse 2 behoben), keine reale Redundanz. Hooks/Agents/Skills alle begründet + gewired.
- **Achse 3 — Context/Memory:** echter Hebel = always-loaded `errors-*.md` ~2,2k Zeilen → path-scoped on-demand.
- **Achse 5 — Modell-Strategie:** Routing-Regel in CLAUDE.md §8 verankert.

---

*Erstellt + ausgeführt 2026-06-17. Entscheidung = D84. Nachfolge: Operating-System E0 (Cockpit + Wissens-Basis) — diese Datei ist die Vorgeschichte dazu.*
