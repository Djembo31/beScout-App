# Slice 202 — Wave 5 Polish-Sweep (Frontend-only, single-track)

**Type:** S | **Owner:** CTO | **CEO-Scope:** No (Frontend-only, kein Money-Path, keine Schema-Migration, keine RPC) | **Estimated:** 1.5-2h

## Ziel

Closen der 3 letzten verifiziert-offenen Frontend-only-Items aus dem Phase-A-Audit-Punch, ohne CEO-Approval zu blockieren (Slice 200/201 bleiben CEO-pending). Plus Punch-Liste-Status-Sync (drift-Korrektur fuer Audit-Stale-Vermeidung gemaess D48).

## Items (3 closed + 1 hygiene)

### 1. Brand 12 (P3) — PitchView text-yellow → text-status-doubtful

**File:** `src/features/fantasy/components/lineup/PitchView.tsx:73`
**Issue:** `'doubtful': { ..., color: 'text-yellow-400' }` weicht von BeScout-doubtful-Token ab.
**Fix:** Replace mit `text-status-doubtful` (Token bereits in `tailwind.config.ts` seit Slice 196 definiert).
**Verify:** Visual identisch + grep `text-yellow` in PitchView leer.

### 2. Brand 2 (P3) — Gold-Pulse-Gradient als CSS-Utility

**File:** `src/app/(app)/page.tsx:323` (gradient inline auf Header-Treatment)
**Issue:** `bg-gradient-to-r from-gold/[0.04] via-gold/[0.10] to-gold/[0.04]` mehrfach inline statt Token.
**Fix:** Neue `.gold-pulse-bg` Utility in `src/app/globals.css` (oder bestehender `@layer utilities`). Replace inline-Gradient mit Klasse.
**Verify:** Gradient identisch (Browser-DevTools), grep andere Vorkommen, evtl. weitere Stellen mitschleifen.

### 3. FM 9.3 (P2) — Founding Per-Tier-Vergleichstabelle

**File:** Neue Component `src/app/(app)/founding/TierComparisonMatrix.tsx` + Integration in `src/app/(app)/founding/page.tsx`
**Issue:** Aktuelle TierCards listen Extras isoliert. FM24/Sorare zeigen Stripe-Matrix (Tier-Spalte × Feature-Zeile mit ✓/✗). Power-User wollen "was bekomme ich extra"-Diff.
**Fix:**
- Component sammelt alle distinct Extras aus `FOUNDING_PASS_TIERS[*].extras` (Union)
- Rendert Matrix: Y-Achse = i18n-Keys aller Extras, X-Achse = 4 Tiers, Cells = ✓/✗ basierend auf `tierDef.extras.includes(extraKey)`
- Plus zusätzliche Zeilen: `priceLabel`, `bcreditsLabel`, `migrationBonusPct`
- Mobile-friendly (overflow-x-auto, sticky-left-column für Feature-Names)
- Section-Header `t('founding.compareTitle')` (neu i18n-Key DE+TR)
- Position: Unter den TierCards in `founding/page.tsx`, vor dem Confirm-Modal-Trigger
**Verify:**
- Tabelle zeigt alle 8 distinct Founder-Extras correctly mapped
- Mobile 393px overflow-x funktioniert
- DE+TR i18n keys vollstaendig
- Reviewer-Pflicht (Cold-Context fuer Audit-Stale-Catcher D48)

### 4. Punch-Liste-Status-Sync (Hygiene)

**File:** `worklog/punch-list-2026-04-25.md`
**Issue:** Status-Spalten zeigen "open" obwohl 196/198/198b/199 schon closed haben (UX 21, ggf. weitere). Audit-Stale-Trap-Risiko fuer naechste Wave (D48-Lehre).
**Fix:** Per-Section Cross-Check mit Slice-Reports + Status-Korrektur.
- UX 21 (compare alert) → done (Slice 196 verified)
- Brand 6 (FormTab text-yellow) → done (text-status-doubtful verified)
- Brand 7 (StatsTab text-yellow) → done (text-status-doubtful verified)
- Brand 14 (airdrop inline #FFD700) → done (Slice 196 closed laut Punch)
- Aggregat-Tabelle aktualisieren + closed-Liste pflegen

## Acceptance Criteria

1. tsc clean
2. PitchView.tsx Z73: `text-yellow-400` ersetzt durch `text-status-doubtful`
3. `grep "text-yellow" src/features/fantasy/components/lineup/PitchView.tsx` leer
4. `.gold-pulse-bg` Utility in `globals.css` definiert + page.tsx:323 nutzt Klasse
5. Visual-Identität Gold-Pulse vorher/nachher (kein computed-style-Diff)
6. TierComparisonMatrix rendert ohne Console-Errors auf /founding
7. 8+ Extras-Zeilen + 3 Meta-Zeilen (Price/Credits/Migration-Bonus) sichtbar
8. Mobile 393px: Tabelle scrollt horizontal, Feature-Spalte sticky
9. DE+TR i18n keys all present (kein raw-key leak)
10. Punch-Liste closed-Count steigt von 70 auf 73/98 (~74%)
11. Reviewer-Agent verdict != FAIL

## Edge Cases

1. PitchView: text-status-doubtful ist im Tailwind-Token-Set ⇒ verify import-Reihenfolge nicht broken
2. Gold-Pulse: Aktuelle inline-classes in mehreren Files? grep first
3. TierComparisonMatrix: Was wenn extras-Array leer? ⇒ skip row (defensive)
4. TR-Locale: Lange i18n-Keys fuer Extras — Mobile-Wrap-Verhalten testen
5. Audit-Stale: Reviewer-Agent muss `grep` ueber consumed hooks vor "fehlt"-Akzeptanz machen (D48 Pflicht)
6. founding/page.tsx hat schon viel Logik — neue Component muss isoliert bleiben (kein Side-Effect auf TierCard-Rendering)

## Proof-Plan

- `worklog/proofs/202-tsc-grep-i18n.txt` — tsc clean + grep-Verify (text-yellow leer + i18n-keys present) + visual-grep .gold-pulse-bg
- Screenshot oder visual-confirm bleibt optional (post-Deploy gegen bescout.net)
- Reviewer-Output: `worklog/reviews/202-review.md`

## Scope-Out

- FM 9.3-Variants: keine "Recommend-Tier"-Logik (CEO-scope)
- Brand 1, 13: deferred (CEO/Designer-call laut Audit)
- UX 20 MembershipSection Confirm-Step: Money-Risk → Slice 201
- F-09/C-03/K-03/M-01: brauchen Backend → Slice 201

## Knowledge-Capture-Kandidaten

- `.gold-pulse-bg` als wiederverwendbare CSS-Utility-Pattern → patterns.md (kein Pattern-#37, falls schon Token-Migration-Sektion existiert)
- TierComparisonMatrix als Vergleichs-Component-Pattern → falls weitere Comparison-UIs entstehen
