# Slice 264b — Wildcard-Pill (Manager-Mode Optional-Hint)

**Status:** SPEC v2 (post-Pre-Review CONCERNS, 7 Patches) · **Größe:** XS-S (5 Files + i18n + Test-Mock) · **Slice-Type:** UI · **Scope:** CTO autonom · **Datum:** 2026-05-02

> **v2-Changelog:**
> - **P1-01:** useHomeData.test.ts Mock-Block für `useWildcardBalance` ergänzt
> - **P1-02:** TR-Wording „Wild Card" (Lehnwort+Space) statt „Wildcard" — User-Journey-Konsistent zu existing `errors.wildcardCounter`/`wallet.wildCards`
> - **P2-01:** page.tsx explicit-prop-pass verifiziert (+1 Prop-Zeile pflicht, kein spread)
> - **P2-02:** Sparkles Icon static (kein animate-pulse), analog ScoutPill
> - **P2-03:** Worst-Case-Screenshot 4-Pills Mobile-393 in Proof-Plan
> - **P2-04:** Inventory-Icon-Check in Code-Reading-Liste
> - **P2-05:** EC-06 ergänzt (0 Holdings + 0 Wildcards)

---

## 1. Problem Statement

**Heute (post-Slice-264):** Wildcard-Balance ist im UI nirgends sichtbar im Hero-Bereich. User muss zu `/fantasy?tab=lineup` navigieren um zu sehen ob er Wildcards hat. Slice 264 hat Wildcard-Card explizit out-of-scope gestellt weil **optional** (nicht „required") — daher passt sie nicht in ActionRequiredStack.

**Lösungs-Ansatz:** Wildcard als kompakte Status-Pill in ManagerBlock-Pill-Reihe (analog ScoutPill aus Slice 263). Konsistent mit Pills-Pattern: zeigt Status, ist Tap-CTA, kompakt.

**Evidence:**
- Slice 264 Spec §2.4 + §15: „Wildcard-CTAs → Slice 264b. Wildcard ist OPTIONAL"
- D63 Phase 2 Plan: ursprünglich „ActionRequiredStack vor Spotlight (Captain/Lineup/Wildcard)" — Wildcard split in 264b
- FM-Power-User-Pattern: FPL/Comunio zeigen Wildcard-Counts persistent in Manager-View

## 2. Lösungs-Design

### 2.1 Wildcard-Pill-Component (inline in ManagerBlock)

Sichtbar wenn:
- `heroMode === 'manager'` (durch ManagerBlock-Mount-Garantie sichergestellt)
- AND `wildcardBalance > 0`

Layout (analog ScoutPill aus Slice 263):
```
[Sparkles-Icon] Wildcard · 2
                └ Label    └ Anzahl
```
Tap → `/fantasy?tab=lineup`. Pill nutzt `Sparkles` aus lucide-react. **Sparkles static** — kein `animate-pulse` (Slice 264 Decision J: Pulse nur in ActionRequiredStack für Required-Actions, Wildcard ist Optional-Hint).

### 2.2 Position in ManagerBlock-Pill-Reihe

```
Lineup-Pill        (Status oder CTA, Slice 262)
Captain-Pill       (cascading nach Lineup, Slice 262)
Wildcard-Pill      (NEU Slice 264b, sichtbar wenn balance > 0)
ScoutPill          (Cross-Identity, Slice 263)
```

Begründung: Wildcard ist Manager-Hub-internal. ScoutPill bleibt am Ende als Cross-Identity-Verweis.

### 2.3 useHomeData-Erweiterung

```ts
// in useHomeData (nach scopedLeagueId-Bezug):
const { data: wildcardBalance = 0 } = useWildcardBalance(uid, scopedLeagueId ?? undefined);

// Return-Field:
return { /* existing */, wildcardBalance };
```

`useWildcardBalance` aus `src/features/fantasy/queries/events.ts:56` — existing Hook mit `enabled: !!userId && !!leagueId`. Returnt 0 wenn disabled.

### 2.4 ManagerBlock-Erweiterung

Props ergänzt: `wildcardBalance: number`. Pill nach Captain-Block (sichtbar oder hidden), VOR ScoutPill.

## 3. Betroffene Files

| File | Change | Begründung |
|------|--------|-----------|
| `src/app/(app)/hooks/useHomeData.ts` | +useWildcardBalance Hook + Return-Field | Single-Source |
| `src/components/home/HomeStoryHeader.tsx` | +Prop pass-through `wildcardBalance` an ManagerBlock | Dispatcher |
| `src/components/home/ManagerBlock.tsx` | +Prop + Wildcard-Pill-Render | UI |
| `src/components/home/__tests__/ManagerBlock.test.tsx` | +3 Tests (visible/hidden/link) | DoD |
| `src/app/(app)/page.tsx` | +1 Destructure (`wildcardBalance`) + 1 Prop-Zeile an HomeStoryHeader (P2-01: explicit-prop-pass, kein spread) | Pass-Through |
| `src/app/(app)/hooks/__tests__/useHomeData.test.ts` | +Mock-Block `vi.mock('@/features/fantasy/queries/events', ...)` | P1-01 Test-Mock-Drift-Fix |
| `messages/de.json` | +1 Key `home.manager.wildcardLabel` | i18n DE „Wildcard" |
| `messages/tr.json` | analog mit „Wild Card" (P1-02 User-Journey-Konsistenz) | i18n TR |

**Größe:** XS-S (5-6 Files, alle small Edits). Pattern-bekannt (Pill analog ScoutPill).

## 4. Code-Reading-Liste

| File | Resultat |
|------|----------|
| `src/features/fantasy/queries/events.ts:52-63` | `useWildcardBalance(userId, leagueId): { data: number }` mit `enabled: !!userId && !!leagueId`, staleTime 1min |
| `src/features/fantasy/services/wildcards.ts:13` | `getWildcardBalance(userId, leagueId): Promise<number>` — returns 0 wenn keine Row |
| `src/components/home/ManagerBlock.tsx:140-154` | ScoutPill-Pattern (Slice 263) als Vorbild |
| `src/app/(app)/hooks/useHomeData.ts:36, 309-311` | scopedLeagueId bereits vorhanden via useLeagueScope (Slice 262) |
| lucide-react | `Sparkles` Icon — Standard-Export, kein Render-Risk |
| `messages/tr.json` (P1-02 verifiziert) | `errors.wildcardCounter` Z.961 = „Wild Cards: ..." · `wallet.wildCards` Z.2148 = „Wild Cards" · `inventory.tabWildcards` Z.5111 = „Vahşi Kart". User-Journey Pill→`/fantasy?tab=lineup` rendert errors-Strings → „Wild Card" konsistent |
| (Inventory-Icon-Check, P2-04) | `src/components/inventory/WildcardsSection.tsx` — falls Icon ≠ Sparkles, Visual-Drift dokumentieren. Akzeptable Asymmetrie weil Pill ist Hero-Hint, Inventory ist eigene Tab-Identität. |

## 5. Pattern-References

- **Slice 263 ScoutPill** als Pill-Pattern-Vorbild
- **Slice 254** Stateless-Component (kein lokaler State)
- **D62** Pre-Review-VOR-BUILD (5. Slice in Folge)
- **errors-frontend.md** Liga/Context-Switch State-Reset (deps-stable Memo)

## 6. Acceptance Criteria

| # | AC | VERIFY |
|---|-----|--------|
| AC-01 | useHomeData returnt `wildcardBalance: number` (default 0) | grep |
| AC-02 | Wildcard-Pill sichtbar wenn `wildcardBalance > 0` | RTL test |
| AC-03 | Wildcard-Pill hidden bei `wildcardBalance === 0` | RTL test |
| AC-04 | Wildcard-Pill zeigt Label + Count | RTL test |
| AC-05 | Wildcard-Pill Tap → `/fantasy?tab=lineup` | RTL test |
| AC-06 | Position: nach Captain-Block, VOR ScoutPill | DOM-check |
| AC-07 | Mobile 393px: Touch-Target ≥44px | qa-visual |
| AC-08 | TR-Locale: „Wildcard"→„Wildcard" (Lehnwort, FPL-Standard) | Anil-PROVE |

## 7. Edge Cases

| # | Szenario | Erwartet |
|---|----------|----------|
| EC-01 | useWildcardBalance disabled (no leagueId) | data=undefined, default 0 → Pill hidden |
| EC-02 | Cold-Start (Cache leer) | wildcardBalance=0 default → Pill hidden, nach Cache-Hit ggf. erscheint |
| EC-03 | Liga-Switch (A: 2 Wildcards → B: 0) | wildcardBalance re-derived via useWildcardBalance enabled+queryKey-Change → Pill verschwindet |
| EC-04 | wildcardBalance > 99 (theoretisch) | Pill rendert „99+" oder real Zahl — Decision: nutze raw Zahl (kein Limit, in Praxis selten) |
| EC-05 | Manager-Mode + 0 Holdings + 1 Wildcard (sehr selten) | Pill sichtbar — Wildcard ist Lineup-Action, nicht Holdings-abhängig |
| EC-06 (P2-05 NEU) | Manager-Mode + 0 Holdings + 0 Wildcards | ScoutPill + WildcardPill BEIDE hidden, nur Lineup-Pills sichtbar. Kein Render-Bug, dokumentiert. |

## 8. Self-Verification Commands

```bash
grep -n "wildcardBalance" src/app/\(app\)/hooks/useHomeData.ts \
  src/components/home/HomeStoryHeader.tsx \
  src/components/home/ManagerBlock.tsx

# i18n
for locale in de tr; do
  grep -q "wildcardLabel" "messages/${locale}.json" || echo "MISSING: home.manager.wildcardLabel in $locale"
done

# tsc + tests
pnpm exec tsc --noEmit
CI=true pnpm exec vitest run src/components/home/__tests__/ManagerBlock.test.tsx \
  src/app/\(app\)/hooks/__tests__/useHomeData.test.ts
```

## 9. CTO-Decisions (autonom)

| # | Entscheidung | Rationale |
|---|--------------|-----------|
| A | Wildcard als Pill (nicht Card im Stack) | Optional-Hint, semantisch nicht „required" — Pills-Pattern passt |
| B | Position: nach Captain-Block, vor ScoutPill | Manager-internal Order: Lineup → Captain → Wildcard → Scout-Cross-Identity |
| C | Show-Condition: nur `wildcardBalance > 0` (kein anderer Guard) | Wildcard ist Lineup-Action, hasLineup-unabhängig |
| D | Sparkles-Icon | Wildcard = magic/special, FPL-Standard-Visual |
| E | i18n: „Wildcard" als Lehnwort in beiden Locales | FPL-Convention, keine Übersetzung nötig |
| F | wildcardBalance default 0 wenn Hook disabled | Pill hidden by default |

## 10. i18n-Keys

| Key | DE | TR |
|-----|-----|-----|
| `home.manager.wildcardLabel` | „Wildcard" | „Wild Card" (Lehnwort+Space, P1-02 User-Journey-Konsistenz zu errors.wildcardCounter Z.961 + wallet.wildCards Z.2148) |

(Anzahl wird inline gerendert: `{wildcardBalance}` — keine Plural-Logic nötig, da numeric-only.)

## 11. Proof-Plan

| Proof | Artefakt |
|-------|----------|
| Tests grün | `worklog/proofs/264b-tests.txt` |
| tsc clean | `worklog/proofs/264b-tsc.txt` |
| Mobile-393 Pill sichtbar (1+ Wildcards) | `worklog/proofs/264b-pill-visible.png` |
| Mobile-393 Pill hidden (0 Wildcards) | `worklog/proofs/264b-pill-hidden.png` |
| **(P2-03 NEU)** Mobile-393 Worst-Case 4 Pills (Lineup-CTA + Captain-CTA + Wildcard-2 + ScoutPill) | `worklog/proofs/264b-worst-case-4-pills.png` |

## 12. Stage-Chain

```
SPEC v1 → Pre-Review (D62)
       → BUILD
       → Cold-Context Review post-BUILD
       → PROVE (Tests + tsc + Anil Mobile-PROVE)
       → LOG
```

## 13. Pre-Mortem (XS-S = 4 Szenarien)

| # | Was schief gehen könnte | Mitigation |
|---|-------------------------|-----------|
| PM-1 | useWildcardBalance failed silent (Network/RLS) | Hook returnt undefined → default 0 → Pill hidden, kein Render-Crash |
| PM-2 | wildcardBalance updates sich nicht nach Wildcard-Use (in /fantasy) | useWildcardBalance staleTime 1min → automatisches Refresh, plus Mutation in fantasy invalidiert Query |
| PM-3 | Pill-Positionierung bricht ManagerBlock-Layout | flex-wrap im existing Pill-Reihe-Container handelt Overflow |
| PM-4 | i18n „Wildcard" als Lehnwort wirkt fremd in DE | FPL-Convention etabliert, akzeptabel. Anil-PROVE entscheidet |

## 14. Scope-Out

- Wildcard-Verwende-Action (UI-Modal für Wildcard-Aktivierung) — bleibt in `/fantasy`
- Wildcard-Type-Differentiation (z.B. Free-Hit vs Wildcard) — current Backend hat 1 Wildcard-Type
- Captain-Deep-Link (Slice 264c) — separater Slice

## 15. Notes

- **Slice 264b ist intentional klein** — XS-S Pattern-Reuse (Pills wie ScoutPill).
- **Phase 2 Action-Layer Status post-264b:** Slice 264 (Required-Stack) + 264b (Wildcard-Pill) = Manager-Hub Action-Surface komplett. Slice 265 = Streak-Risk + Mission (Server-State pflicht).
- **D62-Pattern 5. Slice in Folge** — Pre-Review-VOR-BUILD bleibt Standard auch für XS-S-Slices weil Pre-Review-Cost (~10-20 min) << BUILD-Revert-Cost.
- **Compliance:** Wildcard ist Football-Manager-Standard-Vokabular, kein Asset-Klasse-Drift.
