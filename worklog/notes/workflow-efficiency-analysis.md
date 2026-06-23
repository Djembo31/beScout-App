# Workflow-Effizienz-Analyse + Optimierungs-Tracks (2026-06-23)

> Trigger: Anil — „haben wir Overhead? bauen/managen wir Context bewusst + optimiert für maximale Effizienz?" Evidenzbasierte Analyse (gemessen, nicht Bauchgefühl). Diese 3 Tracks bewusst auf frische Session vertagt (Safety-kritisch, nicht am Ende einer langen Session).

## ✅ ALLE 3 TRACKS ERLEDIGT (Slice 352, 2026-06-23 frische Session)
- **#2 DONE:** `ship-status-gate.sh` — log.md-Injection 5 Einträge → 1 (git log 5→3). Redundanz zu `git log` raus.
- **#3 DONE:** `workflow.md` — schlanke **Ops/Tooling-Slice-Spur** definiert (Hook/GHA/Tool/Doc ohne Money/Security: inline-Spec + Smoke-Proof + self-review). `**Größe:** XS` bleibt für Hook-Kompatibilität.
- **#1 DONE:** errors-frontend.md → **Navigator (78 Z., always-loaded) + errors-frontend-detail.md (1038 Z., on-demand)**. ~92% weniger Token/.tsx-Edit, 41 Patterns 1:1 erhalten (Heading-Diff verifiziert). **Anil-Entscheidung:** „feiner path-scopen" verworfen nach Code-Reading (i18n/CSS/Modal/React kollabieren auf `.tsx` → Path-Split würde Patterns verstecken = Safety-Regression). Gewählt: Navigator-Regel inline (Auto-Show bleibt) + Detail on-demand. Proof: `worklog/proofs/352-navigator-split.txt`.
- **Folge-Slices: DONE (Slice 353, 2 Parallel-Agents):** errors-db.md 787→73 Z. (44 Patterns, +1 Sektion für 7 header-lose Orphans) · errors-infra.md 538→66 Z. (41 Patterns). Beide Heading-Diff verbatim + Coverage 1:1 unabhängig verifiziert. Detail-Files non-matching glob.
- **Gesamt-Ergebnis:** 3 Domains, always-loaded pro Domain-Edit: frontend 1032→78 · db 787→73 · infra 538→66. Pattern-Verlust = 0. **DISTILL: D95** (Navigator+Detail-Architektur, `.tsx`-Kollaps-Befund).

## Gemessene Context-Kosten (2026-06-23)
- **Always-loaded (~990 Z.):** CLAUDE.md 103 · workflow.md 517 · common-errors.md 150 · business.md 194 · performance.md 28.
- **Path-scoped (laden bei Domain-Edit, ~2900 Z.):** errors-frontend.md **1032** · errors-db **787** · errors-infra **538** · testing 285 · database 150 · ui-components 137.
- **Session-Start:** session-handoff 171 · MEMORY 53 · active 26.
- **Gates:** pre-commit 15 Steps · CI 6 Jobs · 22 audit-Scripts.

## Verdikt
Architektur ist **bewusst getiert** (always → path-scoped → docs/knowledge on-demand → memory recall) — Konzept gut. Aber 3 echte Overhead-Stellen.

## Track #1 — errors-*.md Lade-Effizienz (GRÖSSTER HEBEL, frische Session)
**Schlüssel-Befund (Investigation 2026-06-23):** errors-frontend.md ist **NICHT stale-aufgebläht** — es sind **41 legitime, meist aktuelle** Patterns. Das Problem ist: beim Edit *irgendeiner* Frontend-Datei laden **ALLE 41** (1032 Z.), 90 % irrelevant für den konkreten Edit.
- → Reines „verdichten" (Prosa kürzen) = nur ~25 % Gewinn + Risiko, Nuancen guter Patterns zu verlieren. **Nicht der richtige Hebel.**
- → **Echter Hebel = strukturell:** Navigator (scharfe 1-Zeiler je Pattern, always-loaded/bei-Edit) + volle Patterns **on-demand** statt alles-bei-jedem-Edit. ~90 % weniger Token/Edit. Pattern-Verlust = null (nur verschoben; Heading-Diff verifizierbar: 41 ### müssen überleben).
- **OFFENE ENTSCHEIDUNG (Anil):** Das kehrt die bewusste Setup-Entscheidung 2026-06-17 um („autoload beim Edit = richtiger Moment für Pre-Edit-Checks"). Trade-off Effizienz vs. Pre-Edit-Safety (Patterns nicht mehr auto-gezeigt → Lese-Disziplin nötig, mitigiert durch scharfen Navigator). In frischer Session als eigener Slice mit Anil-Alignment + Heading-Diff-Verifikation.
- Betroffen: errors-frontend (41 P.), errors-db, errors-infra. Pilot = frontend (größter).

## Track #2 — SHIP-STATUS-Injection trimmen (schnell, risikolos)
- Hook injiziert bei „status/fertig/stand" git-log + active.md + **die letzten 5 vollen log.md-Einträge** (je ~10 Z.). Diese Session ~5× → dieselben ~60 Z. wiederholt.
- Fix: nur active.md + `git log -3` (oneline) + letzten **1** log-Eintrag statt 5. 1 Hook-Tweak. Hook: `ship-status-gate.sh` (`.claude/hooks/`).

## Track #3 — Slice-Zeremonie für XS/Ops entschlacken (workflow.md)
- 350/351 (Ops/Tooling) bekamen vollen spec+proof+review+log. Für XS/Ops teils Overhead.
- workflow.md erlaubt bereits S-Slice-Flag + skipped-Stages, aber nicht klar für „Ops/Tooling-Fix". Formal eine schlanke Ops-Slice-Spur definieren (proof+log reicht, review self bei kein-Money/Security).

## Empfohlene Reihenfolge frische Session
1. **#2 zuerst** (schnellster risikoloser Win, 1 Hook).
2. **#1** als eigener Slice mit Anil-Alignment (strukturell vs. lossless) + Heading-Diff-Verifikation.
3. **#3** workflow.md-Ergänzung.

(Hinweis: Slice 349 Live-Playwright-Verify ist die ALLERERSTE Action der nächsten Session, VOR diesen Tracks — siehe session-handoff.)
