# Active Slice

```
status: in_progress
slice: 191
stage: BUILD
spec: inline (multi-task hygiene session)
impact: skipped (doc-only + single-component guard)
proof: worklog/proofs/191-hygiene-audit.md
review: self (D35 — trivial hygiene, kein Money-Path)
```

## Scope (Multi-Task, XS-Kombi)

1. **H — D39 Pattern-Doku:** Trigger+GUC-Pattern in `memory/patterns.md` #29 + `.claude/rules/errors-db.md` generalisiert
2. **G — Superseded Skills loeschen:** `/deliver`, `/cto-review`, `/eval-skill` + workflow-reference.md bereinigt
3. **C — INV-35 Admin-UI Regression-Guard:** `src/components/admin/AdminSettingsTab.tsx` Logo-URL-Validation (regex + disabled Save)
4. **I — Superpowers Taming:** CLAUDE.md Override-Section fuer `brainstorming`/`writing-plans`/`using-superpowers`
5. **AUDIT — Bilder/Scouting/Form:** DB-Evidenz, Root-Cause-Erklaerung, UX-Gap-Fix (TradingTab Empty-State fuer Scouting)

## Zuletzt

- **Slice 191** (2026-04-24) — Hygiene-Kombi H+G+C+I + Audit Bilder/Scouting/Form.
- **Slice 190** (2026-04-24) — CI-Check Cron-Route-Registry-Audit + D39 DISTILL (XS, PASS).
- **Slice 189** (2026-04-24) — Ghost-Prevention Player-Insert-Trigger (S, PASS).
- **Slice 188** (2026-04-24) — CTO-Setup-Upgrade Meta-Sprint (M, PASS).
- **Slice 187b** (2026-04-24) — expire-orders Cron-Route + vercel.json (XS, PASS).

**Session 2026-04-24 Total:** 14 Slices (bis 191) + D36-D39 DISTILLs — umfangreichster Session-Output je.

Offen (Backlog):
- **GTM-Push** (Option A — Anil-Entscheidung Landing/Reddit/Cold-Mail via `/gtm-writer`)
- **181g** JoinConfirmDialog Custom-DOM-Refactor (Nice-to-have, nicht Slice-191-Scope)
- **Research-Seed:** Bot-Accounts mit ~10 Research-Posts/Liga fuer Scout-Consensus-UX (post-Beta)
- **L5-Data-Drift:** 11% ohne perf_l5 trotz matches > 0 (TFF + Sueper Lig niedrigste Coverage) — optional /silent-fail-audit
- **Vercel Pro Restore** (CEO-Entscheidung)
- **INV-35 Admin-UI Regression-Guard** ✓ jetzt erledigt via Slice 191
- **Metrics-Dashboard:** nach 5+ Slices in `worklog/metrics/stages.jsonl`
- **Points 8+9 Deep-Dive:** Self-Healing Loop + Codification-Stop-Hook (postponed)

**Anil-Action-Items (Mensch-Task):**
- 3 Beta-Tester anrufen + Zoom-Calls terminieren (ASAP)
- Vercel-Plan-Entscheidung (Hobby vs Pro)
- Deutsch-Türke für TR-Locale-Review organisieren
- Entscheidung: Research-Bot-Seeds vor Beta-Launch?
