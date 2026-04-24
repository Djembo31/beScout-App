<!-- auto:handoff-start -->
# Session Handoff — Auto (2026-04-24 16:56)

> Dieser Block wird vom Stop-Hook aktualisiert. Manueller Rich-Content steht ausserhalb der Marker.

## Uncommitted Changes: 2 Files
```
 M .claude/settings.local.json
 M memory/session-handoff.md
```

## Session Commits: 10
- 11df77e2 docs(agents): gtm-writer + SKILL.md — GTM-Infrastruktur-Gap schliessen
- 8018a18e docs(hygiene): Slice 181e1+e2 abschluss — active.md idle
- bd6bf756 refactor(ui): Slice 181e2 — Modal→Dialog migration Batch 4b (Player-Detail Trading, 4 Files)
- 5f807704 refactor(ui): Slice 181e1 — Modal→Dialog migration Batch 4a (Marktplatz/Orderbook, 4 Files)
- 9a34f4e2 docs(strategy): Strategie-Memo + Asset-Klasse-Positionierung + Scope-Korrektur
- aed313aa docs(handoff): Session 2026-04-24 close — 181e-Spec + D35 + Rich-Handoff
- e81a6410 docs(hygiene): Slice 181d Eintrag in log.md + active.md idle (post-commit nachgezogen)
- 5eb4d30d refactor(ui): Slice 181d — Modal→Dialog migration Batch 3 (Fantasy/Gamification, 12 Files)
- 9e2d5b47 refactor(ui): Slice 181c — Modal→Dialog migration Batch 2 (Community/Help/Sonstige, 13 Files)
- 6a6c7f9c refactor(ui): Slice 181b — Modal→Dialog migration Batch 1 (Admin Pages, 11 Files)

<!-- auto:handoff-end -->

---

# Rich Handoff — 2026-04-24 Session 3 (Strategy + GTM-Infrastruktur)

## Was diese Session brachte

Diese Session hat **KEIN Code-Slice** produziert, sondern zwei fundamentale strategische Verankerungen:

| Commit | Scope | Output |
|--------|-------|--------|
| `9a34f4e2` | docs(strategy) — Strategie-Memo + Asset-Klasse-Positionierung | `docs/strategy-2026-04-24.md` (580 L) + VISION.md +3 Sektionen + business.md Asset-Klasse-Wording |
| `11df77e2` | docs(agents) — gtm-writer + SKILL.md | `.claude/agents/gtm-writer.md` + `.claude/skills/gtm-writer/` |

Parallele Session 2 (Radix-Migration) ist abgeschlossen — Commits 5f807704 + bd6bf756 + 8018a18e (Slice 181e1 + 181e2 + Hygiene).

## Kern-Reframings (muessen Session 4 bekannt sein)

1. **Scout Cards = neue Asset-Klasse** zwischen Aktien und Crypto. Positioniert in `docs/strategy-2026-04-24.md` Teil 1-3. Produkt-Wahrheit = Equity-artig, Marketing-Pflicht = Utility-Register.
2. **FM-Community (20M+ global) ist primaerer Beachhead** — nicht „Fußball-Fans generell". Launch-Hook: „Football Manager, aber real."
3. **Sakaryaspor-First ist obsolet.** War Finanzierungs-Idee, Plattform ist fertig → Trigger weg. Neu: Bundesliga-Mittelfeld + Sueper-Lig-Top 6 als Default-Targets. Siehe verschaerftes `feedback_scope_all_leagues_launch_ready.md` (User-Memory, Verschaerfung 2026-04-24).
4. **Setup-Review-Verdict:** Code 8.5/10, Produkt-Klarheit 8.5/10, Market 9.0/10, Execution-Risk 7/10. Bottleneck ist NICHT mehr Engineering — es ist GTM-Execution (Anil musste sich ergaenzen lassen).

## Neue Infrastruktur (live)

- **`gtm-writer` Agent** — verfuegbar via Agent-Tool (`subagent_type: "gtm-writer"`). Tools: Read/Write/Edit/Grep/Glob (kein Bash). Loads strategy-memo + business.md automatisch.
- **`gtm-writer` Skill** — Deliverable-Templates fuer Landing-Page, Reddit-Post, Cold-Email, Twitter, Discord-Seeding. 4-Filter-Gate (Zielgruppe / Compliance / Scope / Conversion).
- **CLAUDE.md Agent-Liste** um gtm-writer ergaenzt.

## Anils Commitment (CEO, aus Session-End)

Anil hat zugesagt den Setup-Review-Rat zu befolgen. Die wichtigste Action die er selbst tun muss (keine Delegation moeglich):

**P1 — Diese Woche: 3 Beta-Tester anrufen + Zoom-Calls terminieren**

Aus MEMORY.md: „Anil-Action-Items: 3 Tester (Familie/Freunde) kontaktieren, min. 1 tuerkisch-sprachig, min. 1 ohne Fußball-Kontext." Diese Action steht seit Phase-3b-Plan. **Ohne diese Calls kein echtes Produkt-Feedback, kein User-Quote fuer Pitch-Deck, kein Momentum.**

## Nahtloser Start fuer naechste Session

### Wichtig: erster Lesezug in Session 4

1. `docs/strategy-2026-04-24.md` TL;DR (erste 20 Zeilen) — Strategie-Ground-Truth
2. `memory/feedback_scope_all_leagues_launch_ready.md` (User-Memory) — Scope-Direktive
3. Dieses Handoff-File — Kontext wo wir stehen

### Was Session 4 liefern sollte (Empfehlung, nicht Pflicht)

| Option | Was | Dauer | Wer |
|--------|-----|-------|-----|
| **A (empfohlen)** | Erster GTM-Output: Landing-Page-Copy fuer FM-Community via `gtm-writer` Agent | 15-30 min | Agent-Dispatch |
| B | Reddit-Post-Entwurf fuer r/footballmanagergames (AMA-Format) via gtm-writer | 15-20 min | Agent-Dispatch |
| C | Cold-Email-Template fuer Club-Outreach (Bundesliga-Mittelfeld) via gtm-writer | 10-15 min | Agent-Dispatch |
| D | 60-Sek-Video-Script fuer Launch-Kampagne | 10 min | Solo-Claude |

**Option A ist Default** wenn Anil ohne weitere Anweisung startet. Das ist das unmittelbar naechste Artefakt um Landing-Page zu bauen.

### Agent-Dispatch-Template fuer Session 4

```
Agent({
  subagent_type: "gtm-writer",
  description: "Landing-Page FM-Community",
  prompt: "Baue Landing-Page-Copy fuer die FM-Community-Launch-Kampagne.
           Zielgruppe: r/footballmanagergames (450K) + Football-Manager-Twitter.
           Hook: 'Football Manager, aber real.'
           Deliverable: Hero + 3 Sektionen + 3 FAQ + Deploy-Guide.
           Output: copy-paste-ready Markdown-Draft + A/B-Varianten + Risiken.
           Context: Read docs/strategy-2026-04-24.md TL;DR + Teil 4 + Teil 7."
})
```

### NICHT starten in Session 4 ohne Ruecksprache

- Kein weiteres Code-Slice (Radix 181f/g/h Cleanup optional, aber nicht prioritaer)
- Kein Club-Kontakt ohne Landing-Page + Pitch-Material
- Keine neue Strategie-Iteration — Memo ist stable

## Open Follow-ups (Setup-Review Top 5)

| Prio | Action | Owner |
|------|--------|-------|
| **P1** | 3 Beta-Tester anrufen, Zoom-Calls terminieren | Anil (Mensch-Aktion, nicht delegierbar) |
| **P2** | Erste Landing-Page-Copy via gtm-writer produzieren | Claude + Anil Review |
| **P3** | Metriken-Dashboard `/admin/metrics` (Wait-List / Social-Reach / Active-Users) | Eigener Slice (2 Slices Work) |
| **P4** | „Code-freier Tag" ins Ritual (1×/Woche) — GTM/Community-Outreach | Anil (Selbstdisziplin) |
| **P5** | Externen Sparring-Partner finden (Indie-Hacker + Ex-Football-Profi) | Anil (Network-Arbeit) |

## Open Follow-ups aus Session 2 (Radix-Migration, niedrigere Prioritaet)

| Prio | Scope |
|------|-------|
| MED | **181f** EventDetailModal kombinierter Modal+ConfirmDialog → Dialog+AlertDialog (1 File) |
| MED | **181g** JoinConfirmDialog Custom-Dialog Refactor → AlertDialog (1 File) |
| MED | **181h** Cleanup — alte Modal+ConfirmDialog Components aus `src/components/ui/index.tsx` entfernen |
| LOW | buyFromIpo Idempotency-Integration |
| LOW | 185c per-chunk size-limit fuer grosse Libs |
| LOW | 180b Service-Shape votes/adminDeletePost/adminTogglePin |
| LOW | Notion-Action: Slice 181/181b/c/d/e1/e2 → „Erledigt" markieren in Kanban |

## Bekannte vorher-bestehende Failures (NICHT Slice-181x-related)

- `db-invariants.test.ts`: 4 Failures (INV-35/38/39/40) — Live-DB-Data-Integrity-Issues:
  - INV-35: Club-Logos sind aus einer Single-Source (api-sports canonical)
  - INV-38: kein unflagged Player mit contract_end > 12 Monate in der Vergangenheit
  - INV-39: keine Cross-Club-Contamination Ghost-Rows
  - INV-40: keine Same-Club Player-Duplicates
- Eigener Tier-A Slice empfohlen (Daten-Issues, nicht Code-Issues). Nicht-blocker fuer 181e.

## CI / Pipeline-Status

- Branch-Protection: 3 required status checks bypassed bei push (Owner-Berechtigung)
- Build-Job: `next build` + `pnpm run size` Gate — beide gruen lokal
- Pre-commit: commitlint + lint-staged aktiv
- ship-cto-review-gate: aktiv, prueft File-Existence in worklog/reviews/
- ship-proof-gate: aktiv, prueft Proof-Artifact bei feat(/fix(-Commits

## Wrapper-API-Reminder (fuer 181e Migrations)

```tsx
// Drop-in Migration: import-rename + JSX-rename
import { Modal, Button } from '@/components/ui'  →  import { Dialog, Button } from '@/components/ui'
<Modal open={...} title={...} preventClose={...} onClose={...} ...>  →  <Dialog ... />

// Test-Mock-Update (vi.mock @/components/ui):
Modal: ({ open, children, title, onClose }) => ...  →  Dialog: ({ open, children, title, onClose }) => ...
```

Wrapper-Source: `src/components/ui/Dialog.tsx`. preventClose-Pattern intakt.

## Worktree-Status

- main = einziger Worktree (e81a6410)
- agent-a0ad4a83 entfernt nach Merge

## CEO-Scope-Reminder

- 181e Trading betrifft Money-Path-UI aber kein RPC/Wording-Change → kein CEO-Approval noetig
- Visual-Regression-Risk = CEO-Scope-naehe → qa-visual + bescout.net-Smoke Pflicht (siehe 181e Spec AC-5+6+7)

## Time-Budget-Annahme naechste Session

- 181e1 (4 Files + Pre/Post-QA): ~30-45 min
- 181e2 (4 Files + Pre/Post-QA): ~30-45 min
- 181f + 181g + 181h Cleanup: ~30 min
- **Total Radix-Migration komplett**: ~90-120 min in einer fokussierten Session

