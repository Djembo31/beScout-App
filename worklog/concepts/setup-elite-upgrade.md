# Setup-Elite-Upgrade — Claude-Code-Modernisierung + Hygiene

> **Auftrag (Anil 2026-06-16/17):** Setup auf Elite-Level mit voller Tool-Beherrschung. Hygiene (Docs zusammenführen, Müll raus, kein Widerspruch, EIN Workflow). Geprüfte Memory-Funktion (Hermes-Ansatz). Context-Management ohne Overhead. Alles durchdacht + prozesssicher. **Volles Mandat — nichts ist heilig.**
> **Faktenbasis:** Deep Research `walz06h0w` (10 adversarial-verifizierte Claims) + Setup-Inventur 2026-06-16.

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

| | Doku sagt | Realität | Elite-Soll |
|---|---|---|---|
| Hooks | 28 | **40** (+1 unregistriert) | begründbarer Kern (~15-20) |
| Skills | 22 | **26** | nur regelmäßig genutzte |
| Agents | 9 | **16** | dedup, ~8-10 |
| MCPs | 12 | **3 in `.mcp.json`** | Diskrepanz klären, nur genutzte |
| Autoload-Rules | — | **18 Files / 4.493 Zeilen** | verschlanken (Session-Overhead) |
| Memory-Files | — | **211** (davon 11 stale briefings ✅ weg) | Kern + Archiv |
| Worklog-Files | — | **696** | Archiv-Strategie |
| Workflow-Doc | — | **2 parallele** (workflow.md + workflow-reference.md) | EINS |

## 3. Die 5 Modernisierungs-Achsen

### Achse 1 — Setup-Verschlankung (Prinzip „minimal")
- **Hooks 40 → Kern:** Audit welche nie feuern / redundant / Wert < Latenz. Kandidaten raus, Rest dokumentiert mit „warum".
- **Skills 26 → Kern:** welche nie invoked? (superpowers-Override-Liste prüfen).
- **Agents 16 → ~8-10:** Duplikate mergen.
- **MCPs:** 3-vs-12 klären; nur genutzte aktiv (Output-Kosten).

### Achse 2 — Doku-Konsolidierung (EIN Workflow, kein Widerspruch)
- `workflow.md` + `workflow-reference.md` → **eins** (workflow.md ist neuer/größer = Basis; einzigartigen Inhalt aus -reference retten: Agent/MCP/Skill-Register, dann löschen).
- `CLAUDE.md` + `MEMORY.md`-Zahlen → Realität (40/26/16/MCP).
- Autoload-Rules 4.493 Zeilen → verschlanken (was muss WIRKLICH jede Session geladen sein vs. on-demand).

### Achse 3 — Memory + Context (Hermes-Ansatz, EINFACH + geprüft)
- **Kein Overengineering** (Research 0-3 refuted komplexe Memory-Arch). Prinzip: schlank, ein Index (MEMORY.md always-present), Rest on-demand.
- **Geprüft (Hermes-Stil):** Memory-Einträge sind cross-checked (verifiziert gegen Repo, nicht blind), Resume-Preflight (D81) bleibt Pflicht.
- **Context-Overhead senken:** Autoload-Budget definieren (CLAUDE.md + Rules unter X Zeilen); große Rules → on-demand statt always.

### Achse 4 — Müll-Räumung (Archiv-Strategie)
- ✅ 11 April-Briefings (Schritt 1 done).
- 27 verwaiste journey-Audits → `memory/_archive/`.
- 211 memory + 696 worklog → datierte Audit-/Proof-Artefakte > 30 Tage → Archiv (git-History bleibt).

### Achse 5 — Modell-Strategie (dokumentieren + leben)
- Sonnet 4.6 = Default für Routine-Slices (UI, Doku, Tests). Opus 4.8 = money/Trading/Security/Architektur/komplexe Migration. Haiku = triviale Mechanik.
- In CLAUDE.md als Routing-Regel verankern.

## 4. Reihenfolge (Impact-priorisiert)

1. **Müll-Räumung** (Achse 4) — sicher, sofort, schafft Übersicht.
2. **Doku-Konsolidierung** (Achse 2) — EIN Workflow, Zahlen-Drift weg → behebt „widersprüchlich".
3. **Setup-Audit + Verschlankung** (Achse 1) — Hooks/Skills/Agents/MCPs auf Kern.
4. **Context/Memory-Tuning** (Achse 3) — Autoload-Budget, Hermes-geprüftes Memory.
5. **Modell-Strategie** (Achse 5) — Routing-Regel.

## 5b. LEITSTERN — Karpathy-Minimalismus (Anil-Inspiration 2026-06-17)

Quelle: `github.com/multica-ai/andrej-karpathy-skills/CLAUDE.md` — eine CLAUDE.md aus NUR 4 Verhaltens-Prinzipien, kein Register/Mechanik. Leitsatz: **„bias toward caution over speed"**.

**Die 4 Prinzipien (an die Spitze unserer CLAUDE.md):**
1. **Think Before Coding** — Annahmen explizit, mehrere Interpretationen zeigen, einfacheren Weg vorschlagen, Verwirrung benennen.
2. **Simplicity First** — Minimum-Code, nichts Spekulatives. Selbstcheck: „Würde ein Senior das überkompliziert nennen?"
3. **Surgical Changes** — nur anfassen was nötig, eigenen Müll aufräumen, Nachbar-Code nicht „verbessern".
4. **Goal-Driven Execution** — Requests → verifizierbare Ziele, test-first.

**Anwendung auf BeScout (Geist übernehmen, nicht Leere):**
- **CLAUDE.md neu = Prinzipien-First.** Die 4 Verhaltens-Prinzipien nach oben. Stack/Import-Map/Hook-Listen → on-demand-Rules oder gestrichen. Karpathys Eleganz + unsere money-Gates, ohne Ballast dazwischen.
- **Reduktion ist das Maß für jede Achse:** Hooks/Skills/Agents/Rules nur behalten, wenn ein Senior „nicht überkompliziert" sagen würde.
- **Money-kritische Gates bleiben** (spec/proof/review/ceo) — das ist BeScouts legitimer Unterschied zu einem general-purpose-Setup, kein Ballast.

## 5. Prozesssicherheit
- Jede Achse = eigener Commit (rückrollbar).
- Verschlankung NICHT blind: vor jedem Hook/Skill/Agent-Removal „warum existierte das" + „was bricht" prüfen (D54-Familie).
- Nach Abschluss: CLAUDE.md/MEMORY.md spiegeln den NEUEN, schlankeren Stand exakt (kein Drift mehr).

---

## 6. Ausführung 2026-06-17 (Voll-autonom, alle 5 Achsen)

### Achse 4 — Müll-Räumung ✅ (Commit `f1a228d0`)
6 dated Audit-Subdirs (2026-04-25..05-05, beta-Phase persona/journey) + 2 stale Proofs → `worklog/_archive/`. **Bewusst NICHT bewegt:** 600+ slice-nummerierte SHIP-Proofs/Specs/Reviews — append-only Projektrecord, nicht im Context, Move = reine Churn (Karpathy: surgical). Self-renewing audit-cron-Outputs sind bereits gitignored.

### Achse 2 — Doku-Konsolidierung ✅ (Commit `ced8b2c7`)
- `workflow-reference.md` (305 Z.) → `workflow.md` gemerged (Evergreen: Arbeitsweise, Agent-Dispatch, 3 Gesetze, Session-Lifecycle). Stale Register-Tabellen gedroppt.
- `CLAUDE.md` 164→97 Z., Karpathy-Prinzipien-First, money-Gates prominent.
- **Kern-Fix:** SHIP-Loop 5→6 Stufen in CLAUDE.md (REVIEW war verschluckt) — Haupt-Widerspruch beseitigt.
- **Anti-Drift:** Register = SSOT-Pointer (settings.json / .mcp.json / Skill-/Agent-Tool) statt hardcoded Kopien. Killt die Drift-Klasse, die die 28/22/9-Falschstände erzeugte.

### Achse 1 — Setup-Verschlankung ✅ Audit-Ergebnis: Kern bereits schlank, KEIN Cull
„Verschlankung NICHT blind" + Research „kein Kahlschlag" angewandt. Befund nach Per-Item-Audit:
- **Hooks (39):** `pnpm audit:wiring:check` = 0 Drift, alle gewired. 18 „Orphans" sind allowlisted **mit explizitem Grund je Eintrag** (shared sourced libs, TM-Cloudflare-Workaround-Tools recurring, npm-Scripts via andere Pfade gewired). Keine toten Hooks.
- **Agents (15 + SHARED-PREFIX):** Keine echten Duplikate. Auditor-Agents (brand/ux/fantasy/fm/persona/qa) sind **distinkte Lenses**, gewired in `sweep-page`/`audit-beta-readiness`/`persona-walk`. Entfernen würde Skills brechen. Plan-Schätzung „16→8-10" war Redundanz-Illusion aus Doku-Drift.
- **Skills (26):** Alle aktuell. Superseded (`deliver`/`cto-review`/`eval-skill`) sind bereits entfernt. Kein toter Skill.
- **MCP:** „3 vs 12" ist **kein Bug** — `.mcp.json` = Projekt-Scope (3), weitere user-/session-level verbunden.
**Schluss:** Die „Fett"-Annahme war primär Doku-Drift (in Achse 2 behoben), nicht reale Redundanz. Elite = jedes Item begründet + dokumentiert, nicht Zahlen-Minimierung um ihrer selbst willen.

### Achse 3 — Context/Memory (Autoload-Budget)
Echter Overhead-Hebel: always-loaded `errors-*.md` ~2,2k Zeilen (frontend 1012 + db 695 + infra 461). → siehe Commit.

### Achse 5 — Modell-Strategie
Routing-Regel verankert → siehe Commit.

---

*Erstellt 2026-06-17. Ausgeführt 2026-06-17 (Setup-Upgrade voll-autonom). Danach: frische Session → Treasury-Fundament (D83).*
