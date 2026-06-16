<!-- auto:handoff-start -->
# Session Handoff — Auto (2026-06-16 14:07)

> Dieser Block wird vom Stop-Hook aktualisiert. Manueller Rich-Content steht ausserhalb der Marker.

## Uncommitted Changes: 5 Files
```
 M memory/session-handoff.md
 M worklog/concepts/csf-club-treasury-model.md
?? worklog/audits/audit-stale-2026-06-15.md
?? worklog/audits/type-truth-2026-06-15.md
?? worklog/audits/wiring-2026-06-15.md
```

<!-- auto:handoff-end -->

---

# 🎯 RESUME-ANKER NÄCHSTE SESSION (2026-06-15 Abend — S7 Phase-3 läuft)

**Status: idle.** HEAD = `7449026e` (Slice 326 Wave B DONE). Vor Start: `git status --short --branch && git log --oneline -6`. Working tree: nur 3 self-renewing Audit-Churn-Files (`worklog/audits/*-2026-06-XX.md` → NICHT committen, ignorieren). `worklog/active.md` = idle.

## ✅ Diese Session — 3 Slices komplett, alle live + Playwright-verifiziert, 0 Reverts

| Slice | Was | Commit |
|-------|-----|--------|
| **326 Wave A** | Liga-Filter Name→`league_id` (10 Konsumenten) + `getLeagueById` + `Player.leagueId` + Writer fail-closed (createClub RPC `p_league`→`p_league_id`, FK=fail-closed) | `d6bce498` |
| **327** | Flaggen-Normung Emoji→SVG (Anil-Windows-Bug „TR/DE als Text"). 4 Emoji-Konsumenten → `CountryFlag` (SVG), `countryToFlag` entfernt | `0f7ea0c1` |
| **326 Wave B** | **DROP `clubs.league`** — `league_id` ist einzige Wahrheit, Display via `getLeagueById().name`. 3 RPCs via leagues-Join + DROP + NOT NULL atomar | `b8452176`+`7449026e` |

**→ Slice 326 (S7 Phase-3 Paar B) KOMPLETT abgeschlossen.** D80-Single-Truth für `clubs.league` erreicht.

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
