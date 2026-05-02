# Slice 264b Pre-Review (D62, 5. Slice in Folge)

**Verdict:** CONCERNS (0 P0, 2 P1, 5 P2 — kein Architektur-Drift, nur Spec-Vollständigkeit)
**Spec:** `worklog/specs/264b-wildcard-pill.md`
**Time:** ~22 min

---

## P0 — keine

## P1

### P1-01 · useHomeData.test.ts Mock-Erweiterung pflicht

useHomeData wird `useWildcardBalance` aus `@/features/fantasy/queries/events` importieren. Test-File mockt aktuell nur `@/features/fantasy/queries/lineups` + `@/lib/queries`. Slice 264b BUILD bricht Tests sonst.

**Fix Spec §3:** ergänze `src/app/(app)/hooks/__tests__/useHomeData.test.ts` mit Mock-Block:
```ts
vi.mock('@/features/fantasy/queries/events', () => ({
  useWildcardBalance: () => ({ data: 0 }),
}));
```

### P1-02 · TR-Wording „Wildcard" inkonsistent zu Existing

Existing TR-Locale (verifiziert via grep):
- `errors.*` Z.955-961 + `wallet.*` Z.2148-2149: **„Wild Card" / „Wild Cards"** (Lehnwort, Space)
- `inventory.*` Z.5111-5174: **„Vahşi Kart" / „Vahşi Kartlar"** (lokalisiert)

Spec §10 schlägt „Wildcard" (ein Wort) vor — neuer dritter Drift.

**CTO-Empfehlung:** **Variante B** = „Wild Card" (Space). Begründung: User-Journey Pill-Tap → `/fantasy?tab=lineup` → errors.wildcardCounter rendert dort. Konsistenz im aktiven Pfad. inventory.* ist separate Page (nicht im Pill-Tap-Flow).

DE bleibt unverändert: „Wildcard" (ein Wort, matcht existing `home.manager.*` Pattern).

## P2

### P2-01 · §3 page.tsx-Status klären
„KEIN Edit nötig" trügerisch — page.tsx muss `wildcardBalance` aus useHomeData destrukturieren + an HomeStoryHeader weitergeben (HomeStoryHeader-Props-Erweiterung). Spec präzisieren.

### P2-02 · Sparkles Icon explicit static (kein animate)
Spec §2.1 zeigt Layout ohne Pulse. Konsistent mit Slice 264 Decision J (Pulse nur in Required-Stack). Spec §2.1 ergänzen: „Sparkles static, kein animate-pulse."

### P2-03 · 4-Pills-Layout 393px Worst-Case
Pre-264b: 1-3 Pills. Post-264b: bis zu 4 Pills (Lineup-CTA + Captain-CTA + Wildcard + ScoutPill). `flex-wrap` löst auf 2 Reihen.

**Fix Proof-Plan §11:** Worst-Case-Screenshot ergänzen (alle 4 Pills aktiv).

### P2-04 · Inventory-Tab-Icon-Konsistenz prüfen
Code-Reading-Liste §4 ergänzen: `src/components/inventory/WildcardsSection.tsx` — welcher Icon? Wenn nicht Sparkles → visual-language-Drift.

### P2-05 · EC-06 ergänzen: 0 Holdings + 0 Wildcards
Edge-Case fehlt in §7. Manager-Mode + 0 Holdings + 0 Wildcards → ScoutPill + WildcardPill beide hidden, nur Lineup-Pills sichtbar. Kein Bug, aber explicit dokumentieren.

---

## Was gut war

1. Code-Reading-Liste konkret + verifiziert (events.ts:52-63, wildcards.ts:13)
2. Show-Gate stateless korrekt (`wildcardBalance > 0` ohne hasLineup-Coupling)
3. Decision E (Lehnwort DE) konsistent mit existing
4. Pre-Mortem PM-1 Defense-in-Depth
5. CTO-Decision F (default 0) Liga-Switch-safe
6. Slice-Type + Größe korrekt
7. Stage-Chain D62-konform
8. Scope-Out diszipliniert (Wildcard-Modal bleibt in /fantasy)

---

## CTO-Decision-Bias-Check

- **Pattern-Yo-Yo Risk:** Slice 262 P2-2 entfernte holdingsCount, Slice 263 fügte es zurück, Slice 264 downgrade Lineup-Pulse, Slice 264b fügt 4. Pill. **Niedrig** — jede Erweiterung hat klaren Use-Case (Hero-Mode/Cross-Identity/Required/Optional). Keine Reverts.
- **Decision E (TR-Wording-Bias):** „FPL-Convention" — UK-Vokabular, TR-Userbase eventuell andere Convention. Existing inkonsistent (Wild Card vs Vahşi Kart). Variante B (Wild Card) wegen User-Journey-Konsistenz.

---

## Spec-v2-Patches

1. **§3 Files-Tabelle:** +`useHomeData.test.ts` Mock-Block, +`page.tsx` Status klären
2. **§10:** TR auf „Wild Card" (Space) ändern
3. **§2.1:** Sparkles static dokumentieren
4. **§4 Code-Reading:** +Inventory-Wildcard-Icon-Check
5. **§7 EC-06:** 0 Holdings + 0 Wildcards Edge-Case
6. **§11:** Worst-Case 4-Pills-Screenshot

---

**Effort:** ~10 min Spec v2 + ~30-45 min BUILD (XS-S, Pattern-Reuse).

**Verdict CONCERNS** — keine Architektur-Drifts, nur Spec-Vollständigkeit. Nach 6 Patches → PASS für BUILD.
