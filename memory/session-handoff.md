<!-- auto:handoff-start -->
# Session Handoff — Auto (2026-06-17 00:19)

> Dieser Block wird vom Stop-Hook aktualisiert. Manueller Rich-Content steht ausserhalb der Marker.

## Uncommitted Changes: 1 Files
```
 M memory/session-handoff.md
```

## Session Commits: 2
- 4cda65de docs(plan): Karpathy-Minimalismus als Leitstern im Setup-Upgrade verankert
- 21ff6b7f chore(memory): 27 verwaiste journey-Audits archiviert (Hygiene Achse 4)

<!-- auto:handoff-end -->

---

# 🎯 RESUME-ANKER NÄCHSTE SESSION (2026-06-17 — Setup-Upgrade DONE)

**Status: idle.** Vor Start: `git status --short --branch && git log --oneline -8`. Working tree: nur self-renewing Audit-Churn (`worklog/audits/*-2026-06-XX.md` → NICHT committen). `worklog/active.md` = idle.

## ✅ Diese Session — Setup-Elite-Upgrade, 5 Achsen voll-autonom (D84), 0 Code-Risiko

Meta-Session (kein Produkt-Slice). Plan: `worklog/concepts/setup-elite-upgrade.md` §6. Decision: `memory/decisions.md` D84.

| Achse | Was | Commit |
|-------|-----|--------|
| **4 Müll** | 6 beta-Phase Audit-Subdirs (>30d) + 2 Proofs → `worklog/_archive/`. Slice-Proofs bewusst NICHT bewegt | `f1a228d0` |
| **2 Doku** | `workflow-reference.md`→`workflow.md` gemerged+gelöscht; CLAUDE.md 164→103 Z. Karpathy-first; **SHIP-Loop 5→6 Stufen Fix** (REVIEW-Widerspruch weg); Register=SSOT-Pointer | `ced8b2c7` |
| **1 Verschlankung** | Audit-Befund: **kein Cull nötig** — 0 tote Hooks (alle gewired), keine Agent-Dups, keine toten Skills. „Fett" war Doku-Drift | `60ee1c84` |
| **3 Autoload** | `errors-{frontend,db,infra,scraper}.md`+`testing.md` → `paths:`-scoped. Always-Load ~4,5k→~1,2k Z./Session | `3797e3cd` |
| **5 Modell** | Routing-Regel CLAUDE.md §8 (Sonnet default / Opus money+security / Haiku trivial) | `15ddcbfc` |

**→ CLAUDE.md ist jetzt Prinzipien-Kompass, nicht Register. Drift-Klasse strukturell beseitigt (SSOT-Pointer).**

## 🧠 WICHTIG fürs nächste Mal (aus D84)
- **NIE wieder Hook/Skill/Agent/MCP-Zahlen in Docs hardcoden** — SSOT-Pointer (settings.json / .mcp.json / Laufzeit-Tools). Das war die Drift-Ursache.
- `errors-*.md` laden jetzt nur beim Edit der Domain-Files (paths:). Bei reinem Debugging/Planning ohne Edit → bei Bedarf direkt `Read`.
- Neuer Hook/Skill/Agent → nur via SSOT, nicht in CLAUDE.md listen.

## ⚡ NÄCHSTE PRIORITÄT (D80 Sommer Tech-First Phase-3, Reihenfolge)

String→UUID-Fundament Stand:
- ✅ `favorite_club` (Slice 324), ✅ `clubs.league` (Slice 326)
- ⏳ **`players.club` (Paar A) — BLOCKIERT durch gesperrten API-Football-Key** (braucht Reconcile, `clubs.name`-Truth invertiert vs. league_id). Nicht startbar bis Anil den Key freischaltet.

**Da Paar A blockiert → nächster Phase-3-Schritt ist KONSOLIDIERUNG oder DORMANT-FEATURE-HYGIENE** (beide aus D80):
1. **Konsolidierung** — 5 Leaderboard-Impls → 1; mehrere Truth-Tabellen → eine Quelle; Boundary Komponenten→Service-Schicht. Landkarte: `worklog/audits/2026-06-13/s7-source-of-truth-registry.md`.
2. **Dormant-Feature-Hygiene** — Research, 2 Voting-Systeme, Creator-Fund, Monthly-Liga → je aktivieren ODER löschen (kein Halbfertiges).
3. Reste: `/api/push` (schon Slice 318 gefixt — verifizieren), Ad-Revenue-Share 0€-Writepath, Cron-Monitoring.

→ **Empfehlung: mit Konsolidierung (Leaderboards) starten** — höchster Struktur-Gewinn, kein API-Key nötig. Anil fragen welcher Track.

## 🔧 WORKFLOW-LEHREN dieser Session (kodifiziert — Performance-Steigerung)

- **D82 (neu) — DROP-Sicherheits-Sequenz** für irreversible Column-Drops: Reader-umstellen → Cold-Review (ALLE Achsen!) → Deploy → Network-Gate → DROP → post-verify. Gilt für `players.club` u.a. künftige DROPs. Siehe `memory/decisions.md` D82 + `.claude/rules/errors-frontend.md` „Column-DROP".
- **Reviewer-Gate fing 3× Blindspots** (Migration-Ordering + 5 übersehene Reader, 2 BLOCKER live-Pfad). Der eigene Pre-DROP-Grep verpasste `src/lib/services/*.ts` (Nicht-Domain-Service) + `src/app/**/page.tsx` (SSR via supabaseAdmin). Bestätigt D45 (Gates > Text).
- **PWA-Service-Worker-Falle:** Beim Live-Verify cacht der SW alte Bundles → man testet die alte Version. Vor jedem post-Deploy-Verify: `navigator.serviceWorker`-unregister + `caches.delete` + Hard-Reload (Playwright `browser_evaluate`).
- **Reviewer-Agent-Truncation:** Der reviewer-Agent wurde 2× mitten in Live-DB-Checks abgeschnitten → via SendMessage fortgesetzt. Mitigation fürs nächste Mal: Reviewer-Briefing „max N DB-Checks, dann Verdict" ODER Verdict zuerst, Belege danach.

## 🧹 OFFENE HYGIENE (nicht kritisch, bei Gelegenheit)

- **log.md-Chronologie-Drift:** Einträge 316–325 stehen UNTER 315 (sollten oben sein, „neueste oben"). 326/326-WaveB/327 sind korrekt oben. Reparatur = 316–325 über 315 sortieren. Rein kosmetisch.
- **D81-Gap:** `workflow.md` referenziert „D81 (Resume-Preflight)", aber `decisions.md` springt D80→D82. Bei Gelegenheit D81 (Resume-/Handoff-Preflight-Regel, steht ausführlich in workflow.md) in decisions.md nachtragen.
- **Workflow-Tool-Kandidat:** `scripts/audit-column-drop.ts` — greppt automatisch alle 4 Achsen (src-services/SSR-pages/scripts/DB-functions) + prüft Network-Trace. Würde Schritt 2 der D82-Sequenz teil-automatisieren. Eigener Slice wert wenn mehrere DROPs anstehen (players.club + Konsolidierung).

## ⚠️ STOLPERFALLEN

1. **active.md auf idle** — sauber, kein Spec-Gate-Block.
2. **API-Football-Key gesperrt** — blockiert players.club + 154 Geister (Slice 284b) + Live-Scores. Anil muss Key freischalten.
3. **Audit-Churn** (`worklog/audits/*-2026-06-XX.md`) — self-renewing Cron-Output, NIE committen.
4. **Playwright-QA:** jarvis-qa@bescout.net / `JarvisQA2026!` / BASE_URL `https://www.bescout.net`. Bei Liga/Club-Verify SW-Cache leeren (s.o.).
