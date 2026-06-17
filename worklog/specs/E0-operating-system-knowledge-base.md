# E0 — Operating-System + Wissens-Basis (Epic-Plan)

> **Zweck:** Ein gesundes, mitwachsendes Betriebssystem fürs Arbeiten: Plan immer sichtbar, Wissen nie verloren, sauber getrennt, kein Müll. Inspiriert von Hermes (`C:\Users\Anil\smart-money-radar`), kombiniert mit BeScouts Stärken (path-scoped Autoload + SHIP-Loop).
> **Anil-Entscheidungen (2026-06-17):** Voll konsolidieren + verstreutes Wissen GEMEINSAM neu/sauber formulieren (einstimmig, strukturiert). Hygiene inkl. Historie-Rewrite. Teaching-Mode + Qualität (kein dirty code) durchziehen.
> **Status:** Welle 1 (Cockpit) ✅ DONE (Commit 72f394b4). Wellen 2-4 = fokussierte Folge-Session, kollaborativ.

## Ziel-Architektur — 4 „Häuser", je 1 Frage, 1 Ort

| Frage | Haus | Inhalt |
|---|---|---|
| **Wohin + was als Nächstes?** | `MASTERPLAN.md` + `TODO.md` (root) | ✅ Welle 1. Auto-gezeigt (ship-session-start.sh). |
| **Wo stehen wir jetzt?** | `memory/session-handoff.md` | Tages-Status/Resume. Lean (archive-not-delete). |
| **Was wissen wir, dauerhaft?** | `docs/knowledge/INDEX.md` + Tiefen-Dateien | NEU (Welle 2). Mit `consult_when`. |
| **Was darf nicht verloren gehen (Flow)?** | `INBOX.md` | NEU (klein, Drift-Fang). |

**Behalten (BeScout-Stärke):** `.claude/rules/*.md` path-scoped Autoload (errors-*.md beim Domain-Edit) + SHIP-Loop + Cold-Context-Reviewer (Schutz gg. dirty patterns). Das Cockpit/Wissens-Index ERGÄNZT, ersetzt nicht.

## Wissens-Taxonomie (Hermes-Muster) — `docs/knowledge/`
```
docs/knowledge/
  INDEX.md          ← auto-injiziert, jede Zeile: [Titel](pfad) — consult_when: <Auslöser>
  domain/           ← wie funktioniert X (Treasury, Polls, Trading, Fantasy, Scoring…)
  decisions/        ← warum-Entscheidungen (aus memory/decisions.md zerlegt, pro Thema)
  lessons/          ← Bug-Klassen/Anti-Patterns (Überlappung mit errors-*.md prüfen!)
  research/         ← externe Recherche (Claude-Code-Fähigkeiten, Libs…)
```
**Front-matter Pflicht je Datei:** `title · created · updated · tags · status(active|superseded) · consult_when`.

## Welle 2 — Wissens-Basis aufbauen (KOLLABORATIV, der Kern)
1. **Inventur:** alles verstreute durable Wissen sammeln — Quellen: `worklog/concepts/*` (4) · `memory/decisions.md` (87 D's) · `.claude/rules/*` (Patterns) · `memory/*.md` (Vault) · `wiki/`.
2. **Gemeinsam durchgehen + neu formulieren:** pro Wissens-Brocken zusammen entscheiden — durable? wohin (domain/decisions/lessons/research)? wie sauber phrasieren? `consult_when`-Auslöser definieren. Einstimmig + konsistent.
3. **INDEX.md bauen** + Auto-Inject (ship-session-start.sh erweitern, wie Cockpit).
4. **decisions.md** → pro-Thema-Dateien in `decisions/` (oder Index-Tabelle, je Aufwand beim Durchgehen).
5. **Regel verankern (workflow.md):** jedes neue durable Wissen → INDEX-Eintrag + consult_when (Teil des Slice-Rituals/DISTILL).
6. **Doppelungen auflösen:** `.claude/rules/errors-*` (Code-Patterns, path-scoped) vs `lessons/` — klare Grenze ziehen (Code-Pattern bleibt rule, Produkt-/Prozess-Lehre → lessons).

## Welle 3 — Hygiene (Müll-Wachstum stoppen)
- `.gitignore`: `worklog/proofs/*.png`, e2e/qa-Screenshots, Binär-Beweise → lokal behalten, nicht committen. (Text-Beweise bleiben.)
- Proof-Konvention anpassen: Proof = Text (SQL/Test-Output/grep) + optional 1 lokaler Screenshot (nicht committed).
- `log.md`/Handoff: archive-not-delete bei Bloat (Hermes-Lesson `doc-hygiene-bloat-staleness`).

## Welle 4 — Historie abspecken (RISKANT, mit Backup)
- **Vorher:** voller Backup-Clone (`git clone --mirror`), Anil informiert, Beta-Deploy-Pipeline geprüft (Vercel/CI an Commit-Hashes?).
- `git filter-repo` (o. BFG): alte Screenshots/Binär-Blobs aus der Historie entfernen (.git 887 MB → klein).
- Force-Push + alle Klone neu (nur Anil + CI betroffen, kein Team).
- **Eigener, bewusster Schritt** — NICHT mit anderen Wellen mischen.

## Sequenzierung (Vorschlag)
Welle 1 ✅ → **Welle 2 (kollaborativ, größter Wert + Aufwand)** → Welle 3 (schnell, sicher) → Welle 4 (separat, mit Backup). Danach erst Polls (E1) — dann ist das große Feature von Tag 1 sauber getrackt.

## Definition-of-Done
- Session-Start zeigt Plan + ToDo + Wissens-Index automatisch.
- Jedes durable Wissen hat genau EINEN Ort + consult_when + Index-Eintrag.
- Keine Binär-Beweise mehr in neuen Commits; .git abgespeckt.
- workflow.md/DISTILL erzwingt Erfassung + Verlinkung (kein verlorenes Wissen mehr).

---
*Anil: voll konsolidieren, gemeinsam, gesund mitwachsend. Welle 2 ist der kollaborative Kern — fokussierte Session.*
