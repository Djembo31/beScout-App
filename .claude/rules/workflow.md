---
description: Spec-Driven Development
globs: "**/*"
---

## How I Work

Spec-Driven. Code lesen, nicht annehmen. Fertig heisst fertig — keine Restarbeit.

### Flow
1. **SPEC** — Aufgabe verstehen. Relevanten Code LESEN. Bei 3+ Files: `/spec` Skill.
2. **IMPLEMENT** — Exakt was in der Spec steht. Nichts extra.
3. **VERIFY** — tsc + Tests + Visual Check (bei UI). Beweis zeigen.

### Vor Code schreiben
- Betroffene Files + deren Consumers identifizieren (grep)
- Bestehende Patterns im Codebase finden (grep/read)
- Bei DB/RPC/Service-Aenderungen: `/impact` Skill
- Bei Library-Fragen: `context7` MCP
- Bei Architektur-Entscheidungen: `sequential-thinking` MCP
- "required -> optional" = Data Contract Change -> ERST alle Consumer greppen

### Waehrend Implementation
- NUR was definiert wurde. Neues Problem -> separater Task.
- Vor jeder Loeschung: grep nach allen Consumers.
- Bei Unsicherheit: Code lesen, nicht raten.
- Einfachste Loesung zuerst. Bestehenden Code nutzen > neu schreiben.

### Verification
| Aenderung | Beweis |
|-----------|--------|
| Jede | `tsc --noEmit` clean |
| Logik/Service | Betroffene Tests gruen |
| UI | Playwright Screenshot 390px |
| DB/RPC | SELECT Query mit echten Daten |
| i18n | DE + TR verifiziert |

### Agents (parallele isolierte Arbeit)
| Agent | Zweck |
|-------|-------|
| frontend | UI, Components (worktree) |
| backend | DB, RPCs, Services (worktree) |
| healer | Build/Test Errors fixen |
| reviewer | Code Review (read-only) |
| impact-analyst | Cross-cutting Analysis |

### Prinzipien
1. **Code lesen, nicht annehmen.** Jede Hypothese verifizieren.
2. **Einfachste Loesung zuerst.** 1 Feature bewegen < 8 Komponenten bauen.
3. **Exakt was gefragt.** Kein Bonus-Refactoring, kein Scope Creep.
4. **2x gescheitert -> STOP.** Andere Hypothese oder Hilfe holen.
5. **Messen vor optimieren.** Keine Performance-Aenderung ohne Baseline.
6. **Fertig = verifiziert.** "tsc clean" allein ist kein Beweis. "Sollte passen" ist kein Beweis.
