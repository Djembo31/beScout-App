# lessons/ — Bug-Klassen & Anti-Patterns

Übergreifende **Produkt-/Prozess-Lehren** und Bug-Klassen: was schiefging, warum, welche Regel es verhindert.

**Grenze zu `.claude/rules/errors-*.md` (wichtig, Plan §6):**
- Reines **Code-Pattern**, das beim Edit einer Domain auto-laden soll → bleibt `rule` (`errors-db/-frontend/-infra/-scraper.md`).
- **Cross-cutting Prozess-/Bug-Klassen-Lehre** (trifft mehrere Domains, eher „wie wir arbeiten") → `lessons/` mit Zeiger aus der rule. Kandidaten: Worktree-Escape, Silent-Fail-Klasse, Cron-Guard-Prinzip, Deploy-Health.

**Gehört hierher:** Silent-Fail-Observability · Worktree-Isolation-Escape · Migration-Workflow-Lehre · Stale-Reference-Self-Heal.

**Gehört NICHT hierher:** domain-spezifische Code-Patterns (bleiben rule) · Feature-Mechanik (`domain/`).

Front-matter Pflicht (siehe `../README.md`).
