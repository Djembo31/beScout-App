# docs/knowledge/ — die eine Wissens-Heimat

> **Ein Ort pro durablem Wissen.** Routing: [`INDEX.md`](INDEX.md) (consult_when). Diese 4 Buckets trennen nach Frage:

| Bucket | Frage | Beispiel |
|---|---|---|
| [`domain/`](domain/) | Wie funktioniert X? | Treasury-Geldfluss, Polls-Mechanik, Fantasy-Scoring |
| [`decisions/`](decisions/) | Warum so? | „warum SQL statt PostHog", „warum Escrow-bei-Erstellung" |
| [`lessons/`](lessons/) | Welche Bug-Klasse/Anti-Pattern? | Silent-Fails, Worktree-Escape, Cron-Guard |
| [`research/`](research/) | Was sagt die Außenwelt? | Wettbewerber, Markt, Claude-Code-Fähigkeiten |

## Abgrenzung zu bestehenden Wissens-Orten (NICHT migrieren)
- **`.claude/rules/*.md`** = path-scoped Autoload-Code-Patterns (laden beim Domain-Edit). Bleiben. `lessons/` enthält **Produkt-/Prozess-Lehren**, nicht reine Code-Patterns. Bei Überlapp: Code-Pattern → rule, übergreifende Lehre → lessons (+ Zeiger).
- **`memory/decisions.md`** = chronologisches Decisions-Log (D1–D87). Bleibt SSOT; `decisions/` ergänzt thematisch nur, wenn ein Thema eine eigene Seite verdient.
- **`worklog/`** = Slice-Artefakte (specs/reviews/proofs) + `concepts/` (Arbeits-Konzepte). Reife, durable Konzepte wandern nach `domain/`.
- **`wiki/`** = Produkt-Wiki (Anil-kuratiert). Bleibt; `research/` zeigt darauf.
- **`memory/session-handoff.md`** = Tages-Status. KEIN durables Wissen — eigenes „Haus".

## Front-matter-Pflicht (jede Datei in den 4 Buckets)
```yaml
---
title: <Titel>
created: <YYYY-MM-DD>
updated: <YYYY-MM-DD>
status: active | superseded
tags: [<thema>, ...]
consult_when: <Auslöser-Stichworte — identisch zur INDEX-Zeile>
verified-against: <pfad/zur/code-quelle> @ <YYYY-MM-DD>   # NUR domain-Files die Code/DB beschreiben
---
```
`audit:knowledge` (Pre-Commit) erzwingt die 6 Pflicht-Felder HART. `verified-against` ist optional, aber für `domain/`-Files, die ableitbare Wahrheit beschreiben (RPC-Verhalten, Spalten, Fees), **dringend empfohlen** — der Detektor flaggt SOFT, wenn die Code-Quelle seit dem Verify-Datum in git geändert wurde (= „Wissen könnte gedriftet sein, re-verifizieren"). Das ist die kodifizierte Form von D87.

## Korrektheit (ist gespeichertes Wissen wahr?)
- Wissen, das man aus Code/DB **ableiten** kann, wird NICHT als Prosa dupliziert (das driftet) — entweder auf die Live-Quelle zeigen oder mit `verified-against` ankern.
- Beim Anlegen/Migrieren eines `domain/`-Files, das Code beschreibt: gegen die **Live-Realität** prüfen (RPC via `pg_get_functiondef`, nicht alte Migrations-Datei — D87), dann `verified-against` setzen.

## Korrektur & Erweiterung (Regeln pro Bucket)
- **`decisions/` = append-only.** Eine Entscheidung wird nie still überschrieben. Überholt → `status: superseded` + Link zum Nachfolger. Das „warum es falsch war" hat eigenen Wert.
- **`domain/` · `lessons/` · `research/` = überschreiben mit Spur.** Korrektur → Inhalt fixen + `updated` hochsetzen. War die alte Aussage **sachlich falsch** (echtes Missverständnis, nicht nur veraltet) → eine Zeile „**Korrektur \<datum\>:** vorher X, jetzt Y, weil Z" oben behalten.
- **Erweiterung:** gleiche Datei wenn gleiches Thema, neue Datei wenn neues Thema. `consult_when` in Datei UND `INDEX.md` immer mitziehen.

## Pflege-Regel (workflow.md / DISTILL + LOG)
Neues durable Wissen → (1) Datei im richtigen Bucket mit Front-matter, (2) Zeile in `INDEX.md` mit `consult_when`. Sonst gilt es als verloren. **Code-Kopplung (LOG-Stufe):** Wenn ein Slice eine Domain ändert, deren `domain/`-File existiert → im selben Slice mit-updaten (`updated`/`verified-against`). Drift entsteht, weil Code- und Wissens-Änderung getrennt passieren — wir koppeln sie.
