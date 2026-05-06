# Beta-Phase Tracker

> **Single-Source-of-Truth für Beta-Launch-Phase.** Single-Source. Detail-Tabellen
> in `worklog/audits/<date>/*.md` und `worklog/punch-list-*.md` sind Inputs;
> dieser Tracker ist das **Aggregat das Hooks/Skills lesen**.
>
> **Erzeugt:** Slice 214 (D50 Wave 2 Operationalisierung der "Fertig"-Definition).
> **Updated von:** `/auto-beta-ready` Skill, manuell von Anil/CTO.
> **Gelesen von:** `.claude/hooks/ship-phase-gate.sh`, `/auto-beta-ready status`.

```yaml
phase: D    # Walk-Back 2026-05-05 — Anil-Direktive (b): erst iPhone-Visual-Verify alle 8 Konfigs DANN GO-LIVE-Mail
last_phase_run: 2026-05-05 (Sign-Off PASS-PENDING-IPHONE-VISUAL-VERIFY — Tech-Side komplett grün post-SO-5, Action-Items 1+2+3+5 DONE, ABER Visual-Check Home/Spotlight/Markt-Puls bislang nur 1/8 Konfigs (cta-new) Playwright-verified. Anil verlangt vor GO-LIVE Manual-iPhone-Verify aller 8 Konfigs.)
last_signoff: PASS-PENDING-IPHONE-VISUAL-VERIFY
last_signoff_date: 2026-05-05
last_signoff_verdict: "Sign-Off PASS-PENDING-IPHONE-VISUAL-VERIFY (2026-05-05). Sequence: SO-2 SOFT-PASS → SO-3/SO-4 Recovery → SO-2-Recovery STRENGTHENED → SO-5 Wildcard-RPC-Migration-Drift CLOSED. Tech-Side komplett grün: Action-Items 1+2+3+5 DONE (Tester-Liste + onboarding-Email/Tel + TR-Pre-Verify-Audit + Sentry NEXTJS-15 archived 1wk). NEW BONUS-DISCOVERY via SO-5: 4-Migration-Drift Slice 251 Wave 2 (28.04) nie applied, 3× get_wildcard_balance 404 systemisch in Production seit ~7 Tagen — applied + 2 SQL-Bugs in Original gefixt + Custom-Patch für 22-arg rpc_save_lineup. Live-Verify bescout.net `/` 0 Errors post-Apply. ABER: Visual-Check (Action-Item 4) nur partial via Playwright Chromium done (1 von 8 Konfigs: cta-new-Mode bei Jarvis-Account 0 Holdings). 7 Konfigs nicht-testbar wegen Account-State-Limit + 1 Drift entdeckt (Slice 269 Markt-Puls 0-tabs h2-Heading-Leak 16px statt unsichtbar). Anil-Direktive (2026-05-05 post-SO-5-PASS-Walkback): Variante (b) — Manual-iPhone-Verify alle 8 Konfigs Pflicht VOR GO-LIVE-Mail an Tester. Checkliste: worklog/audits/2026-05-05/iphone-verify-checklist.md."
findings_open:
  P0: 0
  P1: 0   # Slice 225 healed UX-NEU-2 → ALLE P1 NULL
  P2: 0   # Slice 226 healed FM-NEU-4 → FM-NEU-3 deferred + ORPHAN-NEU-1 deferred (Slice 227)
  P3: 0   # Slice 225 healed UX-NEU-4 → FM-NEU-5 wont-fix (User-Intent-Misalignment)
  incomplete_reruns: 0
  test_mock_backlog: 0
  signoff_questionable: 1   # Per-Page-Health-Score 0-50-System nie persistiert (Backlog post-Beta). Persona-Avg measured 8.33/10 in 2026-05-04 Static-Re-Walk → ✅ measured PASS
  deferred:
    - POSTHOG-NEU-1 (post-3-Tester-Beta, wenn Skala >20 User)
    - FM-RR-2 (Watchlist-Standalone-Page Feature)
    - FM-NEU-3 (Sentiment Reliability-Weighting — post-Beta wenn Skala >20 User; bei N<5 Testern null praktischer Effekt, Service-Erweiterung wäre M-Slice mit 0% Pre-Beta-ROI)
    - ORPHAN-NEU-1 (CommunityValuation orphan production-code — Slice 227 mit @experimental JSDoc markiert + decisions.md D46 erweitert. Wire-Plan-Decision: bei Skala >20 active-scouts auf Player-Detail Community-Tab wiren, sonst Slice 230+ delete)
  ceo_pending: []   # Slice 253 (2026-04-29): alle 3 → wont-fix per Anil-Direktive D59 "BeScout-Character-Spezifikation, kein FPL-Klon"
  wont_fix:
    - FM-RR-1 (Slice 208 Spec-Decision: Sparkline ist Glance-Indicator, kein Detail-Tool)
    - BRAND-NEU-1 (pre-existing pre-Slice-198, audit-stale)
    - FM-NEU-5 (Empty-State-Scout-CTA in BuyConfirmModal — User-Intent-Misalignment: Buy-Step ist nicht Scout-CTA-Ort, Player-Detail hat submitValuation-Flow bereits)
    - FANTASY-NEU-1 (Slice 253 / D59 — FPL 60min-Rule + perfL5-vs-0-15-Mapping bewusst NICHT übernommen. BeScout-Character-Spec, kein FPL-Klon. Top-FPL-Manager-Erwartung wird via Tooltip-Erklärung "BeScout-Score-Engine basiert auf perfL5" im Backlog-Tracker geparkt — wenn User-Confusion in Beta echte Friction zeigt, Spec-Decision re-evaluieren)
    - F-09 BPS-Bonus (Slice 253 / D59 — FPL Top-3-Bonus-System nicht übernommen. BeScout's perfL5-Engine ist eigener Wertungs-Mechanismus. API-Football's bonus-Field bleibt ungenutzt)
    - UX 20 MembershipSection Confirm (Slice 253 / D59 — strategische Entscheidung im Kontext der Character-Spec-Direktive. Re-Visit-Trigger: WENN echte Fiat-Subscription enabled wird, Confirm-Step pflichtig nachholen analog BuyConfirmModal-Pattern. Aktuell Platform-Credits-only in Phase 1 = akzeptabel)
  stale:
    - TR-NEU-1 (event_winner-Keys existieren bereits in DE+TR)
    - FM-RR-3 (Trending-Pills Punch-List-Drift, audit-Annahme falsch)
aggregate_file: worklog/audits/2026-04-27/aggregate.md
signoff_file: worklog/sign-off/2026-05-04-readiness.md
gate: "kein 'Beta-fertig'/'launch-ready' bis last_signoff == PASS UND P0+P1 = 0"
slice_stubs_pending:
  - "Slice 224: 5-Min-Wording-Heal — BUSINESS-NEU-1 + BUSINESS-NEU-2 (heilt FM-NEU-2 automatisch)"
  - "Slice 225: InfoTooltip-Migration-Wave — UX-NEU-2 + UX-NEU-3 + UX-NEU-4 (BuyConfirmModal + MostOwnedSection Slice 216) + Pattern-Regel ui-components.md"
  - "Slice 226: getPlayerSentimentCounts Reliability-Weighting — FM-NEU-3"
  - "Slice 227: Sentiment-Bar 3-Segment + Empty-State-CTA — FM-NEU-4 + FM-NEU-5"
anil_action_blockers:
  - "🔒 iPhone-Manual-Visual-Verify 8 Konfigs PFLICHT vor GO-LIVE — siehe worklog/audits/2026-05-05/iphone-verify-checklist.md (Slice 266 4 Spotlight-Configs + Slice 269 4 MarktPuls-Configs × 2 Accounts)"
anil_action_done_2026_05_05:
  - "Action-Item 1 ✅ memory/beta-tester-list.md erstellt (gitignored, Kemal+Taki+Nail)"
  - "Action-Item 2 ✅ memory/beta-onboarding.md Email/Tel gefüllt (k_demirtas@hotmail.de + +49 1511 77 66 543)"
  - "Action-Item 3 ✅ TR-Pflicht-Review Pre-Verify-Audit live (worklog/audits/2026-05-04/tr-keys-compliance-preverify.md PASS, Decision (a) post-Beta-Cleanup für Watchlist-Drift) — **ANIL-CONFIRMED 2026-05-06: '2 bestätigt'** → RISK-5 endgültig CLOSED"
  - "Action-Item 4 🔒 BLOCKER: Visual-Check 1/8 Konfigs Playwright (cta-new-Mode), 7 Konfigs + iPhone-Real-Safari-NEXTJS-15-Repro PFLICHT vor GO-LIVE"
  - "Action-Item 5 ✅ Sentry NEXTJS-15 archived 1week + commented"
```

## Phase-Definitionen

| Phase | Was | Done-Bedingung |
|-------|-----|----------------|
| **A** | Audit-Beta-Readiness (8 Audit-Agents, 21 Pages) | Punch-List existiert, alle P0-Items closed oder triaged |
| **B** | Polish-Sweeps (sweep-page je Findings-Page) | P1-Items abgearbeitet auf <5 |
| **C** | Persona-Walk (3 Personas FM-Power/Casual/TR-Locale) | Friction-Reports vorliegen, P0-Findings closed |
| **D** | Sign-Off (Beta-Exit-Kriterien-Check) | last_signoff == PASS + alle P0/P1 grün |
| **READY** | Beta GO-LIVE | 50-Tester-Onboarding aktiv |

## Regel-Block (von Hook gelesen)

Triggert WARN bei UserPrompt mit Phrasen:
- "fertig", "ready" (im Kontext "beta", "launch")
- "go-live", "go live", "golive"
- "beta launch"

Wenn `last_signoff != PASS` UND Phrase-Match → WARN-Output mit aktuellem Stand.

## Manuelle Updates (post-Slice-Workflow)

Nach jedem Slice-Commit der Findings closed:
```bash
# Update findings_open Counts
sed -i "s/  P1: [0-9]\+/  P1: <new-count>/" worklog/beta-phase.md
```

Nach Phase-Lauf:
```yaml
phase: <new>
last_phase_run: <ISO-timestamp>
```

Nach Sign-Off:
```yaml
last_signoff: PASS | FAIL
last_signoff_date: <ISO>
last_signoff_verdict: "<short-reasoning>"
```

## Phase-Status-Historie

| Datum | Phase | Aktion | Outcome |
|-------|-------|--------|---------|
| 2026-05-05 ~01 | D | **Walk-Back zu Phase D (Anil-Direktive (b)):** Visual-Check Home nur partial via Playwright (1/8 Konfigs). iPhone-Manual-Verify alle 8 Konfigs Pflicht VOR GO-LIVE-Mail. Plus Slice 269 0-tabs Drift entdeckt. Tech-Side bleibt komplett grün post-SO-5. | **PASS-PENDING-IPHONE-VISUAL-VERIFY** |
| 2026-05-05 ~00 | READY | Sign-Off ENDGÜLTIG-PASS post-SO-5 (zu früh deklariert — Visual-Verify-Coverage 12% war Anil nicht ausreichend, Walkback in Folgezeile). | (superseded) |
| 2026-05-04 18:30+ | D | **Recovery-Pass post-SO-3/SO-4 + Static-Re-Walk:** SOFT-PASS-STRENGTHENED. RISK-2/3/6 alle closed. Persona-Avg measured 8.33/10. 22 stale Issues batch-closed → 1 Master-Tracker #63 by-design open. GHA-Pipeline live-verified (Run für `73ede77c` SUCCESS in 1m47s). Verbleibend: RISK-1 Sentry-Watch + 4 Anil-Action-Items. | SOFT-PASS-STRENGTHENED |
| 2026-05-04 | D | **Sign-Off Re-Trial #2 ausgeführt** post-Slice-269. Verdict: **SOFT-PASS-PENDING-ANIL** (6/6 Tech ✅, 2/2 Tester-Items ⚠️ formell-offen). Smoke 18.3s PASS gegen bescout.net (manuell-warm). 22+ GHA-Beta-Blocker-Issues = Cold-Start-Transients (kein App-Bug). Sentry: 1 NEW Watch-Item (JAVASCRIPT-NEXTJS-15 Maximum-Update-Depth, 1 event 0 users). Anil-Action-Items dokumentiert. CTO-Empfehlung: GO. Sign-Off-File: `worklog/sign-off/2026-05-04-readiness.md` | SOFT-PASS-PENDING-ANIL |
| 2026-05-04 | D | D63 Phase 1+2+3+4 Home-Redesign 10/13 Slices live (261-269). Phase 5 Visual-Polish pending. **Tech-Side**: 0 P0/P1/P2/P3 open. 3 Tester aktiv. **Empfehlung: Sign-Off-Re-Trial.** | ⏳ ready-for-signoff |
| 2026-04-26 17:50 | C | 7 Agents dispatched (3 Persona-Walker + 4 Auditors) | ⏳ running/aggregate-pending |
| 2026-04-26 14:24 | docs | Slice 209 Audit-Cleanup (12 audit-stale-marker korrigiert) | done |
| 2026-04-25 ~18 | A | Phase-A-Audit (Brand+UX+FM+Fantasy) | 98 Findings dokumentiert |
| pre-04-25 | B | Polish-Sweeps Slice 198-202 | viele P1 closed |
| **NIE** | **D** | **Sign-Off** | **NIE GELAUFEN — Anil-Direktive 2026-04-26** |
