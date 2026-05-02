# Slice 265 — StreakRiskCard im ActionRequiredStack

**Status:** SPEC v2 (post-Pre-Review) · **Größe:** S · **Slice-Type:** UI · **Scope:** CTO (autonom, Anil's full-autonomy-Mandat 2026-05-02) · **Datum:** 2026-05-02

> **v2 Heal:** Pre-Review (D62) fand 5 Findings — 2× P1 (CTA-Drift + Wording-Compliance), 2× P2 (Render-Branch Catch-22 + null-State-Race), 1× MINOR (Mock-Drift). v2 adressiert alle:
> - F-01 → Card als Notification ohne Link (kein semantisch-leeres CTA)
> - F-02 → Wording neutralisiert auf information-only („STREAK-ERINNERUNG" statt „GEFÄHRDET")
> - F-03 → Render-Branch refactored: `if (hasLineup && hasCaptain && !isStreakAtRisk) return null;`
> - F-04 → AC-12 (defensive null-State) ergänzt
> - F-05 → nur `Flame`-Icon, kein Link/ArrowRight

---

## 1. Problem Statement

D63 Phase 2 Action-Layer hat ActionRequiredStack mit Lineup + Captain Cards (Slice 264) + Wildcard-Pill (Slice 264b). Aber **Streak-Risk fehlt** — Game-Designer-Persona-Audit (D63) hat das als Top-Finding markiert ("Streak-Risk fehlt → Daily-Driver-Killer").

**Wer ist betroffen:** Alle Manager-Mode-User mit hohen Login-Streaks (≥ 7 Tage), die kurz vor Streak-Verlust stehen weil **0 Shields verbleibend** sind. Loss-Aversion-Trigger fehlt komplett — User vergessen + verlieren Streak ohne sichtbare Warnung. Aktuelle UI: Streak-Indikator existiert nur im HomeStoryHeader-Pill (`streak >= 2 && ...`) ohne Risk-Differenzierung.

**Evidence:**
- D63 Roadmap Phase 2 listet Slice 265 als "Streak-Risk + Mission-Progress"
- `memory/decisions.md` D63 Game-Designer-Finding: "Streak-Risk fehlt"
- `worklog/specs/263-doppel-identity-pills.md` Scope-Out: "Streak-Risk-Indikator → Slice 265"

## 2. Lösungs-Design (Architektur)

**StreakRiskCard** als 3. Card im ActionRequiredStack (nach Lineup, nach Captain). Stateless, derived state from existing `streak` + `shieldsRemaining` Props. **Notification-only — kein Link, kein CTA-Verb (F-01-A).**

**Risk-Logik (clientside, kein RPC nötig):**
```ts
const isStreakAtRisk = streak >= 7 && shieldsRemaining === 0;
const isStreakUrgent = streak >= 14 && shieldsRemaining === 0;
```

**Defensive null-State:** `shieldsRemaining === 0` (strict) ist defensive — `null` (RPC noch nicht resolved oder silent-fail) wird NICHT als at-risk interpretiert. Bedeutet: Card erscheint erst nach erfolgreichem `useLoginStreak`-Resolve. F-04-Mitigation.

**Datenfluss (vor Change):**
- `useHomeData()` returnt `streak`, `shieldsRemaining` → propagiert an `HomeStoryHeader`
- `ActionRequiredStack` bekommt nur `heroMode`, `gw`, `hasLineup`, `hasCaptain`, `locksAtIso`, `scopedActiveEventStatus`

**Datenfluss (nach Change):**
- `ActionRequiredStack` zusätzliche Props: `streak: number`, `shieldsRemaining: number | null`
- Render-Branch refactored (F-03):
  ```ts
  if (heroMode !== 'manager') return null;
  if (!locksAtIso && !isStreakAtRisk) return null;        // F-03: off-GW + Streak ist auch valid
  if (hasLineup && hasCaptain && !isStreakAtRisk) return null;  // F-03: Streak overrides Lineup-done
  if (isLocked) return null;
  ```
- **Streak-Card ist Notification-only (F-01-A):** rendert als `<div role="status">`, kein `<Link>`, kein ArrowRight, kein hover-state. User leitet selbst ab dass „morgen einloggen" Streak hält.

**Kein RPC-Erweiterung.** `record_login_streak` liefert bereits `shields_remaining` via `useLoginStreak` Hook (verifiziert in `src/lib/queries/streaks.ts:43`).

**Render-Order im Stack** (sichtbar wenn Conditions matchen):
1. Lineup-Card (wenn `!hasLineup`)
2. Captain-Card (wenn `hasLineup && !hasCaptain`)
3. **NEU:** Streak-Risk-Card (wenn `isStreakAtRisk`) — rendert auch wenn Lineup+Captain done

Stack rendert space-y-3, kann 1-3 Cards parallel zeigen.

## 3. Betroffene Files

| File | Aktion | Begründung |
|------|--------|------------|
| `src/components/home/ActionRequiredStack.tsx` | EDIT | StreakRiskCard hinzufügen, +2 Props |
| `src/app/(app)/page.tsx` | EDIT | `streak`, `shieldsRemaining` zu ActionRequiredStack durchreichen |
| `messages/de.json` | EDIT | 4 neue Strings unter `home.actionStack` |
| `messages/tr.json` | EDIT | 4 neue Strings unter `home.actionStack` |
| `src/components/home/__tests__/ActionRequiredStack.test.tsx` | EDIT | 4 neue Tests (Visibility, Urgent-Variant, CTA-Href, Edge-Cases) |

**Vor diesem Slice greppt man:**
- `grep -rn "ActionRequiredStack" src/` → 2 Call-Sites (`page.tsx`, `__tests__`)
- `grep -rn "shieldsRemaining" src/` → 6 Stellen, alle in `useHomeData` / `page.tsx` / `HomeStoryHeader` Konsumenten
- `grep -rn "home.actionStack" messages/` → existing Namespace, Erweiterung kompatibel

## 4. Code-Reading-Liste (Pflicht VOR Implementation)

| File | Zweck | Zu prüfen |
|------|-------|-----------|
| `src/components/home/ActionRequiredStack.tsx` | Pattern-Source (Lineup + Captain Card) | Card-Klassen-Pattern (`px-4 py-3.5 rounded-2xl border min-h-[64px]`), URGENT-Variant-Pattern (`red-400/30` + animate-pulse), Icon-Container (`size-10 rounded-xl`) |
| `src/components/home/helpers.tsx` | URGENT-Threshold-Quelle | `URGENT_THRESHOLD_MS` Export — wir nutzen NICHT countdown-basiert sondern streak-basiert, also kein Import nötig |
| `src/lib/queries/streaks.ts` | Streak-Datenstruktur verifizieren | `useLoginStreak` returnt `streak: number` + `data: StreakResult \| null` mit `shields_remaining` Field |
| `src/app/(app)/hooks/useHomeData.ts` Z.45-110 | Wie kommt `shieldsRemaining` an Components | `setShieldsRemaining(streakData.shields_remaining)` aus useEffect → State-Wert wird durchgereicht |
| `src/components/home/__tests__/ActionRequiredStack.test.tsx` | Test-Pattern | Render-Branches via Props variieren, `useTranslations` mock, `Link` href-Assertions |
| `messages/de.json` `home.actionStack` Block | Namespace-Konvention | Keys: `lineupTitle`, `lineupSubtitle`, `captainTitle`, `captainSubtitle`, `urgentBadge`, `lineupCta`, `captainCta` — wir folgen gleichem Schema |
| `.claude/rules/business.md` "Wording-Compliance" | Kein Glücksspiel-Wording | „Streak verlieren" ist OK (nicht „Gewinn entgehen lassen"), TR: „kaybetmek" ist neutral |
| `.claude/rules/errors-frontend.md` "JSON Object/String-Duplicate-Key-Drift" | Slice 263 Lehre | Vor i18n-Erweiterung prüfen: gibt es bereits `home.streakRisk` als String? Antwort: Nein (gegrept) |

## 5. Pattern-References (relevant für DIESEN Slice)

- **D63** — Phase 2 Action-Layer Manager-Hub Roadmap, dieser Slice schließt die Phase ab
- **D62** — Pre-Review-VOR-BUILD-Pattern (D65 promoted für M+, hier S aber Self-Disziplin)
- **`patterns.md` #29** — Stateless Component (Slice 254 Pattern, Slice 264 confirmed) — alle Inputs als Primitive-Props
- **`errors-frontend.md` "JSON Object/String-Duplicate-Key-Drift" (Slice 263)** — i18n-Erweiterung Audit-Pflicht
- **`errors-frontend.md` "Missing i18n-Key bei neuer CTA-Component" (Slice 198)** — beide Locales bedienen
- **`business.md` "Erweitertes Verbots-Register"** — Wording-Drahtseilakt, kein Glücksspiel-Vokabular
- **`ui-components.md` "Mobile-First"** — Touch Target ≥ 44px, font-size ≥ 16px equivalent (Card hat min-h-[64px] = OK)

## 6. Acceptance Criteria (Executable, nicht Prosa)

```
AC-01: [HAPPY] Streak-Risk-Card sichtbar bei streak=7, shieldsRemaining=0, Manager-Mode
  VERIFY: Render <ActionRequiredStack heroMode="manager" streak={7} shieldsRemaining={0} hasLineup={true} hasCaptain={true} ... />
  EXPECTED: Card mit Title "STREAK GEFÄHRDET" / Icon Flame / Link /missions sichtbar
  FAIL IF: Card unsichtbar trotz erfüllter Trigger-Condition

AC-02: [EMPTY] Streak-Risk-Card unsichtbar bei streak < 7
  VERIFY: Render mit streak=6, shieldsRemaining=0
  EXPECTED: Streak-Card NICHT im DOM (queryByText("STREAK GEFÄHRDET") === null)
  FAIL IF: Card sichtbar bei zu niedrigem Streak

AC-03: [EMPTY] Streak-Risk-Card unsichtbar wenn Shields verfügbar
  VERIFY: Render mit streak=14, shieldsRemaining=2
  EXPECTED: Streak-Card NICHT im DOM
  FAIL IF: Card sichtbar trotz Shield-Buffer

AC-04: [URGENT-VARIANT] Bei streak ≥ 14 wird Urgent-Style aktiv
  VERIFY: Render mit streak=14, shieldsRemaining=0
  EXPECTED: Card hat `border-red-400/30` + `motion-safe:animate-pulse`
  FAIL IF: Default-Style (Orange) statt Red-Pulse

AC-05: [DEFAULT-VARIANT] Bei 7 ≤ streak < 14 wird Orange-Style genutzt
  VERIFY: Render mit streak=10, shieldsRemaining=0
  EXPECTED: Card hat `border-orange-400/30` + KEIN animate-pulse
  FAIL IF: Red-Pulse-Style bei Mid-Streak

AC-06: [I18N-DE] Wording in DE — neutral, information-only (F-02)
  VERIFY: Render im DE-Locale, streak=10, shieldsRemaining=0
  EXPECTED: Title="STREAK-ERINNERUNG", Subtitle enthält "10 Tage" + 🔥
  FAIL IF: Englische/türkische Strings sichtbar ODER „GEFÄHRDET"/„komm morgen wieder" Loss-Aversion-Wording

AC-07: [I18N-TR] Wording in TR — neutral, kein "kazan*" (F-02)
  VERIFY: Render im TR-Locale, streak=10, shieldsRemaining=0
  EXPECTED: Title="SERİ HATIRLATMASI", Subtitle enthält "10" + "gün" + 🔥 (kein "kazanmak"/"yatırım"/"kayıp")
  FAIL IF: Glücksspiel-Vokabel oder DE-Strings

AC-08: [HEROMODE-GUARD] Streak-Card unsichtbar in scout-Mode
  VERIFY: Render mit heroMode="scout", streak=14, shieldsRemaining=0
  EXPECTED: Stack returnt null (existing Guard `if (heroMode !== 'manager') return null`)
  FAIL IF: Stack rendert in scout-Mode

AC-09: [NO-LINK] Card ist Notification-only, kein klickbarer Link (F-01)
  VERIFY: Render mit streak=14, shieldsRemaining=0, queryByRole('link') für Streak-Card
  EXPECTED: KEIN Link mit StreakRisk-Wording. Card hat role="status" oder ähnliche aria-Markierung.
  FAIL IF: Card ist klickbar oder enthält href-Attribut

AC-10: [STREAK-OVERRIDES-LINEUP-DONE] Streak-Card sichtbar auch wenn Lineup+Captain done (F-03)
  VERIFY: Render mit streak=14, shieldsRemaining=0, hasLineup=true, hasCaptain=true, locksAtIso="2026-05-05T18:00:00Z"
  EXPECTED: Streak-Card sichtbar im DOM (NUR Streak-Card, keine Lineup/Captain Cards)
  FAIL IF: Stack returnt null oder Streak-Card unsichtbar

AC-11: [STREAK-OFF-GW] Streak-Card sichtbar off-GW (locksAtIso=null) (F-03)
  VERIFY: Render mit streak=14, shieldsRemaining=0, locksAtIso=null
  EXPECTED: Streak-Card sichtbar (off-GW User mit at-risk Streak verdienen Reminder)
  FAIL IF: Stack returnt null wegen `!locksAtIso`

AC-12: [NULL-SHIELDS-DEFENSIVE] Card unsichtbar bei shieldsRemaining=null (F-04)
  VERIFY: Render mit streak=14, shieldsRemaining=null
  EXPECTED: Streak-Card unsichtbar (defensive — null !== 0 strict equality)
  FAIL IF: Card sichtbar trotz unbekanntem Shield-State
```

## 7. Edge Cases Table

| # | Flow | Case | Input/State | Expected | Mitigation |
|---|------|------|-------------|----------|------------|
| 1 | Mount | streak=0, shieldsRemaining=null (initial) | First render before useLoginStreak resolved | Card unsichtbar | `streak >= 7` False, `shieldsRemaining === 0` False (null !== 0) → kein Render |
| 2 | Mount | streak=0, shieldsRemaining=0 (User mit 0-Tag-Streak) | New User Day-1 | Card unsichtbar | streak < 7 → kein Render |
| 3 | Mount | streak=7, shieldsRemaining=0 (Threshold) | Genau am Trigger-Punkt | Default-Card sichtbar (Orange) | Inclusive ≥ 7, < 14 |
| 4 | Mount | streak=14, shieldsRemaining=0 (Urgent-Threshold) | Genau am Urgent-Punkt | Urgent-Card sichtbar (Red-Pulse) | Inclusive ≥ 14 |
| 5 | Mount | streak=100, shieldsRemaining=0 (extremer Wert) | Long-Streak-User | Urgent-Card mit "100" Subtitle | tabular-nums, kein Layout-Bruch |
| 6 | Mount | streak=14, shieldsRemaining=undefined | StreakResult ohne shields_remaining (impossible per Type, defensive) | Card unsichtbar | TS `number \| null` Type, Behandlung wie null → not === 0 → kein Render |
| 7 | LiveSwitch | streak=7→8 mid-render (rerender) | useLoginStreak refetch | Card bleibt sichtbar, Subtitle updated | React-Memo skipt nicht weil Props change |
| 8 | LiveSwitch | shieldsRemaining=0→1 nach Shield-Auto-Use | Backend hat Shield konsumiert, refetch | Card verschwindet | Re-render durch new Props |

## 8. Self-Verification Commands

```bash
# Pflicht jeder Slice:
npx tsc --noEmit
npx vitest run src/components/home/__tests__/ActionRequiredStack.test.tsx

# Slice-spezifisch:
grep -rn "streakRisk\|isStreakAtRisk" src/  # Konsumenten verifizieren
grep -A1 "home.actionStack" messages/de.json | head -20  # i18n-Keys da
grep -A1 "home.actionStack" messages/tr.json | head -20

# i18n Anti-Konflikt-Check (Slice 263-Lehre):
grep -B2 -A1 '"streakRisk"' messages/de.json messages/tr.json
node -e "const d = require('./messages/de.json').home.actionStack; for(const k in d) console.log(typeof d[k], k);"

# Component-Unicity-Check:
grep -rn "STREAK GEFÄHRDET\|SERİ TEHLİKEDE" src/  # nur Tests + Component erwartet
```

## 9. Open-Questions (klären VOR Code)

**Pflicht-Klärung — keine, alle Decisions autonom (Anil-Mandat 2026-05-02 „volle Entscheidungsgewalt"):**

**Autonom-Zone (CTO entscheidet):**
- Threshold-Werte: 7 + 14 (analog zu existing `streakBenefits` Tier-Stufen in `src/lib/streakBenefits.ts`)
- Icon-Wahl: `Flame` (lucide-react, semantisch passend, schon in App genutzt)
- CTA-Ziel: `/missions` (Mission-Page hat Streak-Detail-Sektion existing)
- Card-Position: 3. Card im Stack (nach Lineup, nach Captain — nicht-Lineup-Action ist niedrigere Pflicht-Action)
- Wording-Sprache: Loss-Aversion ohne Glücksspiel-Vokabel

**Nicht-Autonom-Zone (CEO bei Verletzung):**
- Streak-RPC-Erweiterung (out-of-scope, nicht in Slice)
- Streak-Reward-Beträge (out-of-scope, nicht touched)
- Mission-Promotion in Stack (deferred zu Slice 265b)

## 10. Proof-Plan

| Change-Typ | Proof |
|------------|-------|
| UI-Component | `npx vitest run src/components/home/__tests__/ActionRequiredStack.test.tsx` Output → `worklog/proofs/265-vitest.txt` (≥ 9 Tests grün) |
| i18n | `grep -A1 '"streakRisk' messages/de.json messages/tr.json` Output → enthalten in `265-vitest.txt` Header |
| Mobile-Render (post-Deploy) | Anil PROVE-Backlog: 393px Mobile-Safari, Streak-Risk-Card visible bei test-account mit streak ≥ 7 |

**Verboten als Proof:** "tsc clean" allein, "Pattern wie 264".

## 11. Scope-Out

- **Mission-Hint-Promotion in ActionRequiredStack** → Slice 265b (separater Slice falls Anil das wirklich will, Begründung: Doppelung mit existing MissionHintList unter HomeSpotlight wäre Confusing-UX, separater Design-Decision nötig)
- **Streak-RPC-Erweiterung** (`get_streak_status` mit `at_risk` flag) → nicht nötig, clientside ableitbar
- **Streak-Animation** (Flame-Pulse, Streak-Number-Bounce) → out-of-scope, Polish-Pass später
- **Streak-Notification (Push)** → Phase 5 / Backend-Slice, nicht UI
- **Streak-Detail-Seite Update** auf `/missions` → existing, nicht touched

## 12. Stage-Chain (geplant)

```
SPEC v1 → PRE-REVIEW (D62 Self-Disziplin) → SPEC v2 ✓ (this) → IMPACT skipped → BUILD → REVIEW post-BUILD → PROVE → LOG
```

**IMPACT-Skip-Begründung:** Pure UI-Component mit existing Datenquellen (`useLoginStreak` schon konsumiert in `useHomeData`). Keine neuen Services, keine neuen RPCs, keine DB-Migration. Cross-Domain-Side-Effects: keine (existing Hook-Pfad bleibt unverändert).

**PRE-REVIEW trotz S:** D65 macht's bei M+ pflicht, S ist optional. Wir machen's trotzdem weil:
- 5 Slices in Folge mit Pre-Review hat 50 Findings vor BUILD gefangen (ROI 4-8x)
- Wording-Compliance ist heikel (Streak-Risk + Glücksspiel-Risiko-Wahrnehmung)
- Threshold-Decisions (7/14) sollten geprüft werden ob Anti-Pattern in business.md

## 13. Pre-Mortem (5 Szenarien — optional bei S, gemacht für Robustheit)

| # | Failure | Probability | Impact | Mitigation | Detection |
|---|---------|-------------|--------|------------|-----------|
| 1 | i18n-Konflikt-Drift (wie Slice 263) — neuer `streakRisk` Sub-Object kollidiert mit existing String | LOW | HIGH (latent React-Crash) | Audit-Command in Self-Verify (Step 4): `grep -B2 -A1 '"streakRisk"' messages/*.json` | Pre-Build: grep zeigt Duplicate. Runtime: React „Objects not valid as React child" |
| 2 | useLoginStreak nicht resolved bei initial-render → `shieldsRemaining=null` (kein 0) → Card silent unsichtbar trotz at-risk | MED | MED (1-2s Layout-Late) | EC-1: streak=0 + shieldsRemaining=null → Card unsichtbar (korrekt, `useLoginStreak` resolved schnell weil cached) | Anil-Live-Verify: refresh + Card erscheint nach <500ms |
| 3 | Wording-Compliance-Drift — Reviewer findet „Streak verlieren" als Glücksspiel-Wortspiel | LOW | HIGH (Compliance-Risk) | Pre-Review-Pflicht. business.md Sektion „Glücksspiel-Vokabel" prüfen | Pre-Review-Agent flagged BLOCKED |
| 4 | Layout-Bruch bei 3 Cards parallel (Lineup + Captain + Streak-Risk) auf 393px | LOW | MED | Card-Pattern ist proven (264 + 264b live), space-y-3 zwischen | Anil PROVE Mobile 393px |
| 5 | Performance-Regression — useLoginStreak refetcht bei jedem heroMode-Switch | LOW | LOW | useLoginStreak hat staleTime=60s, kein refetchOnWindowFocus | React DevTools Profiler im Pre-Review |

---

## Compliance-Check

- $SCOUT-Wording-Drift? **Nein** — keine $SCOUT-Erwähnung in StreakRisk-Card
- IPO-Begriff user-facing? **Nicht relevant** (kein Trading-Bezug)
- TR-Glücksspiel-Vokabel? **Audit-Pflicht** — kein „kazan*", neutral „seri kayboluyor" / „seri tehlikede"
- Asset-Klasse-Framing? **Nicht relevant** (Gamification-Context, nicht Money-Path)
- Disclaimer? **Nicht nötig** (kein $SCOUT/DPC, nur Streak-Reminder)

## TR-Wording-Vorab

| Key | DE | TR | business.md-Konformität |
|-----|----|----|-------------------------|
| `home.actionStack.streakRiskTitle` | "STREAK-ERINNERUNG" | "SERİ HATIRLATMASI" | ✓ neutral information-only, kein Loss-Aversion-Trigger |
| `home.actionStack.streakRiskSubtitle` | "Du hast {streak} Tage in Folge gespielt 🔥" | "Üst üste {streak} gün oynadın 🔥" | ✓ deskriptiv, kein „komm morgen", kein „kayıp" |
| `home.actionStack.streakRiskBadge` | "OHNE SCHILD" | "KALKAN YOK" | ✓ neutral, defensive Konnotation |
| `home.actionStack.streakRiskAriaLabel` | "Streak-Erinnerung: {streak} Tage in Folge ohne Schild" | "Seri hatırlatması: üst üste {streak} gün, kalkan yok" | ✓ Screen-Reader-Variante (Card hat role="status") |

**Anil-Pflicht-Review** vor Beta-Verify (F-02 P1 Wording-Compliance — Anti-Loss-Aversion-Frame).

**Anil-Pflicht-Review** vor Beta-Live markiert in Anil-Action-Items (Resume-Anker post-Slice).

## Open Risiko (kurz, ehrlich)

- **Wording-Risk:** „Streak gefährdet" + Loss-Aversion ist Edge-Case zwischen Engagement-Trigger und Glücksspiel-Anti-Pattern (StGB §284 Wahrnehmung). **Mitigation:** Pre-Review-Pflicht plus business.md-Audit, kein „kazan*"/„Gewinn"/„verlieren" als CTA-Verb, neutrale Verben („schützen/koru").
- **Threshold-Tuning-Risk:** 7/14 sind Annahmen ohne A/B-Test. **Mitigation:** Werte aus existing `streakBenefits.ts` Tier-Stufen abgeleitet (Konsistenz mit App-internem Streak-Reward-System), post-Beta tunable wenn Anil's Live-Tester-Findings Pattern zeigen.
