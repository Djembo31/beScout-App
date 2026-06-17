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
---
```

## Pflege-Regel (workflow.md / DISTILL)
Neues durable Wissen → (1) Datei im richtigen Bucket mit Front-matter, (2) Zeile in `INDEX.md` mit `consult_when`. Sonst gilt es als verloren. Bei Update: `updated` + ggf. `status: superseded` + Nachfolger verlinken.
