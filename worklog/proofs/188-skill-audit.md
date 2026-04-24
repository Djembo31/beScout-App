# Skill-Auslastungs-Audit (14 Tage, 2026-04-10 bis 2026-04-24)

**Methode:** Grep über `git log` + `worklog/log.md` + `worklog/specs/` + `worklog/reviews/` + Cross-Ref mit existierender Skill-Liste (25 Skills installiert).

## Skill-Kategorisierung nach Nutzung

### A. Aktiv genutzt (>5 Erwähnungen als skill-invocation)

| Skill | worklog-Count | Status |
|-------|---------------|--------|
| `/ship` | 20+ | Core-Workflow. Keep. |
| `/silent-fail-audit` | 12+ | Aktiv in Money-Path-Audits. Keep. |
| `/optimize` | 8+ | AutoResearch-Loop bei Perf-Slicen. Keep. |

### B. Gelegentlich genutzt (1-5 Erwähnungen)

| Skill | worklog-Count | Status |
|-------|---------------|--------|
| `/impact` | 5+ | DB/RPC-Pre-Check. Keep (steigern). |
| `/plan-ceo-review` | 1 | Nur in D-Referenzen. Keep aber aktivieren über Auto-Dispatch-Hook (Task 5). |
| `/plan-qa-review` | 1 | Nur in D-Referenzen. Keep aber aktivieren. |
| `/plan-legal-review` | 1 | Nur in D-Referenzen. Keep aber aktivieren (Money-Scope-Hook). |
| `/parallel-dispatch` | 1 | Slice 086 einziger realer Einsatz. Keep aber aktivieren (Task 4). |

### C. Agent-Dispatch via Tool (nicht als Slash-Skill)

| Agent | Dispatches (Review-Files) | Status |
|-------|---------------------------|--------|
| reviewer-Agent | ~20 in 10 Tagen | Sehr aktiv — ROI empirisch validiert (D15, Slice 145/146) |
| frontend-Agent | Slice 181 | Gelegentlich in Worktrees |
| backend-Agent | Slice 081, 178e | Gelegentlich in Worktrees |
| healer-Agent | ad-hoc | Manual, kein Auto-Loop |
| test-writer | selten | Spec-only-TDD selten genutzt |
| qa-visual | 1× (Slice 181e-smoke) | Potential höher |
| impact-analyst | ad-hoc | Selten |
| autodream | Stop-Hook | Nicht aktiv Skill |

### D. NIE genutzt (0 reale Invocations, Skill installiert)

| Skill | Verdict | Begründung |
|-------|---------|------------|
| `/post-mortem` | **Reaktivieren** — aber Trigger schärfen | `memory/post-mortems/` Dir existiert, aber leer. Pattern-Referenzen in `memory/research-agent-systems-best-practices.md`. Skill-Trigger "nach P1/P2 Bug-Fix" ist vage — konkreter: nach jedem Bug-Fix-Slice der REWORK-Verdict hatte ODER zweiten Fix-Anlauf brauchte. |
| `/competing-hypotheses` | **Behalten** — aber richtigen Kontext bauen | Fuer 3× gescheiterten Fix. Nie getriggert weil vorher `/codex:rescue` oder manuelle Hypothesen-Arbeit. Kein Handlungsbedarf — passive Reserve. |
| `/brainstorming` (superpowers) | **Deaktivieren als first-class** | Ersetzt durch `/spec` + `/ship new`. Superpower-Pflicht-Trigger verwirrt wenn wir `/ship` als Master haben. Empfehlung: Aus using-superpowers-Auto-Invocation raus, nur manuell nach expliziter Frage. |
| `/writing-plans` (superpowers) | **Deaktivieren als first-class** | Ersetzt durch `/spec`. Siehe oben. |
| `/metrics` | **Aktivieren via Stage-Timer-Data** (Task 3) | Kein Datenquelle bisher. Mit Task 3 entsteht `worklog/metrics/stages.jsonl` als Source. Skill ist dann wertvoll. |
| `/reflect` | **Behalten, Trigger-Doc schärfen** | „Alle 5 Sessions" Trigger ist unrealistisch fuer single-dev. Konkreter: Stop-Hook zeigt 2+ corrections in letzten 3 Sessions. Hook-Integration post-MVP. |
| `/improve` | **Behalten** — Heute 1× manuell genutzt | Der Deep-Dive diese Session war faktisch ein `/improve`-Lauf. Skill-Trigger fuer "alle 10 Sessions" ist OK, aber wir triggern meist via Anil-Prompt. |
| `/eval-skill` | **Deaktivieren** | Meta-Tooling ohne realen Use-Case. Installiert aber nie gebraucht — evaluieren kostet mehr als selber-fixen. |
| `/promote-rule` | **Behalten** — aber Trigger schärfen | Pending-Rules-Queue existiert, wird aber nicht systematisch gepflegt. Hook `reflect` waere Voraussetzung. |
| `/deliver` | **Superseded — löschen** | Vollständig ersetzt durch `/ship`. Skill-Installation kann entfernt werden. |
| `/cto-review` | **Superseded — löschen** | Vollständig ersetzt durch reviewer-Agent + ship-cto-review-gate-Hook. |
| `/typography` | **Extern — N/A** | Extern Installed, nicht BeScout-spezifisch. Keep als general UI-Tool. |
| `/gtm-writer` | **Aktivieren** — Session 3 gebaut, 0 Launches | Agent + Skill existiert seit 24.04. (Commit `11df77e2`). Keine Slice-Nutzung. Blocker: Anil muss Marketing-Task triggern. Kein Skill-Fix noetig, sondern Slice-Plan. |

## Empfehlungen

### Sofort (Slice 188 — diese Session)

1. **Aktivieren durch Hook-Automation:**
   - `/plan-legal-review` via CEO-Scope-Hook (Task 5 — auto-inject Reminder bei Money/Fee/Wording-Keywords in Spec)
   - `/parallel-dispatch` via cross-domain-Hook (Task 4 — warn bei >3 Files cross-domain)
   - `/metrics` via Stage-Timer-Data (Task 3 — Data-Source schaffen)

2. **Trigger-Beschreibung in SKILL.md schärfen (non-blocking, Cleanup-Slice spaeter):**
   - `/post-mortem` — Trigger auf „nach REWORK-Verdict oder Zwei-Fix-Anlauf"
   - `/reflect` — Trigger auf „2+ corrections in 3 Sessions" (benoetigt capture-correction.sh Daten)
   - `/promote-rule` — Trigger auf „Pending-Rules >3 UND >7 Tage alt"

3. **Kandidaten fuer Deletion (separater Hygiene-Slice):**
   - `/deliver` (superseded von `/ship`)
   - `/cto-review` (superseded von reviewer-Agent)
   - `/eval-skill` (kein realer Use-Case)

### Langfristig

4. **Superpowers Auto-Invocation zaehmen** — `using-superpowers`-Trigger „any conversation start" ist zu aggressiv. Empfehlung: aus SessionStart-Auto-Load raus, nur bei `brainstorm|plan|explore`-Keywords.

5. **gtm-writer Push** — Session 3 Investment ist ungenutzt. CEO muss Marketing-Slice-Trigger geben (Landing-Page-Copy ODER Reddit-Post ODER Cold-Email-Template).

## Zahlen-Fazit

- **Installiert:** 25 Skills
- **Aktiv (>1× pro Woche):** 4 (`/ship`, `/silent-fail-audit`, `/optimize`, `/impact`)
- **Reserve (benoetigt Trigger-Schaerfe):** 5 (`/plan-*` 3× + `/parallel-dispatch` + `/metrics`)
- **Superseded:** 3 (`/deliver`, `/cto-review`, `/eval-skill`)
- **Dormant aber OK:** 4 (`/post-mortem`, `/competing-hypotheses`, `/reflect`, `/promote-rule`, `/improve`)
- **Extern:** 9+ (superpowers, codex, etc.)

Nutzungsquote: 4/25 aktiv = **16%**. Mit Reserve-Aktivierung durch Hooks: 9/25 = **36%** erreichbar in dieser Session.

---

**Audit-Date:** 2026-04-24
**Audit-Commit-Range:** `git log --since="2026-04-10"` (700+ commits)
