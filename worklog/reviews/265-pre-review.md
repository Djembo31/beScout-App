# Pre-BUILD Review: Slice 265 — StreakRiskCard

**Reviewer:** reviewer-Agent (cold context) · **Datum:** 2026-05-02 · **Verdict:** CONCERNS

D62 Pre-Review-VOR-BUILD durchgeführt trotz S-Slice (Self-Disziplin gemäß D65). Spec ist solide, Pattern-Source korrekt verstanden, Threshold-Werte deckungsgleich mit `streakBenefits.ts` (7+14 in `STREAK_TIERS`). Wording-Vorab in DE+TR ist neutral. **5 nicht-kritische Findings vor BUILD** — alle mit konkretem Fix-Vorschlag.

---

## Findings

| # | Severity | Location | Issue | Fix-Recommendation |
|---|----------|----------|-------|---------------------|
| **F-01** | **P1** | Spec §2 + §6 AC-09 + §13 PM #3 | CTA-Ziel `/missions` ist semantisch leer. Mission-Page-Streak-Detail ist im Code-Reading nicht verifiziert. „Streak schützen" als Action-CTA ist Loss-Aversion-Loop ohne Mitigation-Path. Existing Pattern-Source linkt ALLE Cards auf `/fantasy?tab=lineup` (Action-Vollendung) — hier semantische Lücke. | **Option A (gewählt):** CTA entfernen, Card ist Notification-only (`<div>` statt `<Link>`, kein ArrowRight). Streak-Schutz-Action ist „login morgen", nicht „klick jetzt". |
| **F-02** | **P1** | Spec §13 PM #3 + Wording-Vorab | „Streak gefährdet" + „komm morgen wieder" + 🔥 = Loss-Aversion-Trigger. business.md „Reinvestment-Anti-Pattern" semantisch übertragbar. DSGVO-Risk Kinderzielgruppe (13+) — Loss-Aversion-Trigger restricted (KJM §4-Empfehlung). „Gefährdet" ist Glücksspiel-adjacent (verlieren-Verb-Equivalent). | **Wording neutralisieren auf information-only:**<br>DE: `streakRiskTitle: "STREAK-ERINNERUNG"` (statt „GEFÄHRDET")<br>DE: `streakRiskSubtitle: "Du hast {streak} Tage in Folge gespielt 🔥"`<br>TR: `streakRiskTitle: "SERİ HATIRLATMASI"`<br>TR: `streakRiskSubtitle: "Üst üste {streak} gün oynadın 🔥"`<br>Card-Existenz alleine = visueller Hint. User leitet selbst ab. |
| **F-03** | **P2** | Spec §2 Render-Branch + §6 AC-Coverage | **Render-Branch Catch-22.** Existing Guard `if (hasLineup && hasCaptain) return null;` blockt Streak-Card für die Zielgruppe — high-streak User haben täglich Lineup+Captain → Card permanent unsichtbar. | **Render-Branch-Refactor:**<br>`if (hasLineup && hasCaptain && !isStreakAtRisk) return null;`<br>`if (!locksAtIso && !isStreakAtRisk) return null;`<br>Plus AC-10 (Streak-overrides-Lineup-done) + AC-11 (off-GW + Streak-at-risk = Card sichtbar). |
| **F-04** | **P2** | Spec §13 PM #2 + EC-1 | shieldsRemaining=null persistent (RPC-error/network-fail) → Card permanent unsichtbar bei genau den at-risk-Usern. Silent-Fail. | Defensive Logic explizit: `streak >= 7 && shieldsRemaining === 0`. AC-12 ergänzen: `[NULL-SHIELDS] streak=14, shieldsRemaining=null → Card unsichtbar (defensive)`. |
| **F-05** | **MINOR** | Spec §3 Files + §10 Proof | Test-Mock-Drift Risk. Card sollte NUR `Flame` nutzen (existing Stub), kein `Shield`-Icon. „OHNE SCHILD"-Badge wird Text-only. | Card nutzt nur `Flame` + ggf. nichts weiteres (kein ArrowRight da kein Link in F-01-A). |

---

## Layer-Hierarchy-Check

**„Slice 264b Wildcard-Pill ist auch im Hero. Ist Position-Hierarchie konsistent?"** — geklärt:

- **Wildcard-Pill (264b):** Sub-Element INNERHALB ManagerBlock (Optional-Hint-Pill).
- **ActionRequiredStack (264 + 265):** Pflicht-Action-Layer SEPARAT zwischen HomeStoryHeader und ScoutCardStats.
- **D63-Konsistenz:** Sub-Layers ≠ Pflicht-Actions. Streak-Risk-Card als 3. Card im Stack ist semantisch korrekt platziert.
- **Re-architectural-Frage:** Wenn F-01-A gewählt (Card ohne Link), gehört dann StreakRisk als Pill in HomeStoryHeader? — **Nein, bleibt im Stack.** 4 Pills auf 393px wäre zu voll (Manager+Scout+Wildcard+Streak), plus D63 Phase-2-Roadmap-Plan.

## Definition-of-Done UI-Slice (D54)

- vitest grün ✓
- i18n-Audit ✓
- Mobile-Render Anil PROVE-Backlog ✓
- Page-Render-Tree-Verkabelung im Scope ✓ (`page.tsx`-Edits in §3)

## Slice-Type-Check

UI ✓ korrekt. Hook `ship-spec-quality-gate.sh` Layer 3 wird PASS sein.

---

## Positive

- Spec-Quality solide für S-Slice (13 Sektionen voll, 9 ACs, 8 EC, 5 Pre-Mortem-Szenarien)
- Code-Reading-Liste exzellent (8 Items, business.md + errors-frontend.md als References)
- i18n-Anti-Konflikt-Check eingebaut (§8 Self-Verification — Slice-263-Detection-Command Pflicht)
- Threshold-Werte verifizierbar konsistent mit `streakBenefits.ts:31-32`
- Stateless-Component-Pattern korrekt (Slice 254/264-Pattern)
- Scope-Out diszipliniert (Mission → 265b, RPC-Erweiterung → out-of-scope)
- business.md „Erweitertes Verbots-Register" antizipiert (`kazan*` + `yatırım`)

---

## Decision-Path (CTO autonom, Anil-Mandat 2026-05-02)

- **F-01:** Option A (Card als Notification, kein Link). Vermeidet semantisch-leeres CTA.
- **F-02:** Reviewer-Wording übernommen (STREAK-ERINNERUNG / SERİ HATIRLATMASI).
- **F-03:** Render-Branch-Refactor in Spec §2 + AC-10 + AC-11 ergänzen.
- **F-04:** AC-12 ergänzen (defensive null-State).
- **F-05:** Nur Flame-Icon, kein Shield, kein ArrowRight (passt mit F-01-A).

Spec wird zu v2 erweitert mit allen Findings adressiert vor BUILD.

---

**Time-Spent:** 22 min (Reviewer) + 8 min (Primary-Claude Spec-v2-Edits geplant)
