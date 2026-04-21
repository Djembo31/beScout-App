# Active Slice

```
status: FREEZE
slice: 131 — Memory System Hygiene + Decisions + DISTILL Protocol
stage: LOG (wrapped)
spec: inline (Anil-Feedback: „Kernerkenntnisse gehen verloren" — strukturelle Fix)
impact: 4 stale-facts fix + memory/decisions.md (NEW) + workflow.md extended + Notion-Sync
proof: worklog/proofs/131-memory-system-hygiene.txt
```

## 🔒 Feature-Freeze aktiv (seit 2026-04-21)

**Regel:** Keine neuen Feature-Slices. Nur Beta-Blocker. Jeder Commit gegen die Frage: "Bewegt das den Launch um einen Tag vor?"

## Session-End 2026-04-21 — Slice 128 DONE (BETA-PREP Continuation)

**Ziel:** Ohne Blockierung von Anil's Phase 3b (Tester-Kontakt) die Infrastruktur für den Deutsch-Türke TR-Review vorbereiten + Cold-Start-Resilience + Compliance-Audit-Gap schließen.

### Deliverables
1. `scripts/audit/tr-strings.mjs` (NEW) — Reproduzierbares TR-Locale-Audit-Script, kategorisiert 4 Violation-Typen: DE-Leaks, EN-Leaks, Securities-Glossar (AR-7/AR-17), Glücksspiel-Vokabel (StGB §284/MASAK §4).
2. `memory/beta-tr-locale-findings.md` (NEW) — 3 Beta-Blocker identifiziert mit Source-Trace + Fix-Empfehlungen für Anil:
   - Ländernamen hart-codiert DE in `src/lib/leagues.ts:13-22` (7 Findings)
   - Community-Bot-Posts auf DE in `e2e/bots/ai/agent.ts` (10 Findings, DB-persistiert)
   - "IPO" user-facing → "Kulüp Satışı"/"Erstverkauf" (fixes DIESER Slice)
3. IPO-Compliance-Fixes: 5 i18n-Keys × 2 Locales (market.ipoViewLabel, ipoShowActive/Planned/Ended, founding.extraIpoEarly, subscriptions.benefitIpoEarlyAccess)
4. `scripts/audit/compliance.sh` — neuer IPO-Check eingebaut (fängt Future-Violations)
5. `e2e/beta-smoke.spec.ts` — `retries: 0 → 1` für Vercel-Cold-Start-Resilience
6. `e2e/synthetic-users.spec.ts` — `retries: 1` explicit am describe-level
7. `.audit-baseline.json` — Silent-Fail-Baseline 190 → 188 (2 HIGH eliminated)

### Proof
`worklog/proofs/128-tr-audit-tooling.txt` — compliance-audit + tr-strings-audit + silent-fail-check + tsc alle grün.

### Offen für Anil's nächste Session (entscheidend)
- **Bug 1** Ländernamen i18n (`leagues.ts:13`): 1h Arbeit, 7 Call-Sites betroffen. Vorhandene TR-Werte in tr.json schon vorhanden (jurisdictionTR, region.turkey). Anil entscheidet ob Beta-Blocker.
- **Bug 2** Community-Bot-Posts DE: 3 Fix-Optionen (DB-Cleanup 5 Min / bilingual 3h / Bots abschalten 10 Min). Empfehlung in memory/beta-tr-locale-findings.md.

## Offen Phase 3b — 3 echte Tester (wartet auf Anil)
- 3 Personen kontaktieren (Familie/Freunde): min. 1 türkisch-sprachig, min. 1 ohne Fußball-Kontext
- Nach Feedback: Bug 1+2 fixen → `pnpm run test:synthetic` re-run → TR-Strings erneut auditieren → Deutsch-Türke-Review

## Anil-Action-Items (offen)
- Alten `sb_secret_vT7ae...` in Supabase Dashboard revoken
- 3 Tester kontaktieren
- 1 Deutsch-Türke für TR-Review organisieren
- **NEU:** Entscheidung zu Bug 1 (Ländernamen) + Bug 2 (Bot-Posts) aus `memory/beta-tr-locale-findings.md`

## Next session first step

`git log --oneline -10` + `cat memory/beta-tr-locale-findings.md` → Anil-Entscheidungen einholen → Bug 1+2 fixen ODER direkt weiter zu Phase 3b Tester-Kontakt.
