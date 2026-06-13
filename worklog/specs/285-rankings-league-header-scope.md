# Slice 285 — FM-06: Rankings-Liga-Header über PlayerRankings verschieben

**Slice-Type:** UI
**Größe:** XS
**CEO-Scope:** Nein (Frontend-Layout, kein Money/Security/Breaking)
**Datum:** 2026-06-13

---

## 1. Problem-Statement (Evidence)

**Audit-Item:** FM-06 (P2) aus `worklog/audits/2026-06-12/stab-284-punchlist.md:38`
> „Rankings-Liga-Filter-Header suggeriert Seiten-weite Wirkung, filtert aber NUR
> Spieler-Rankings (Leaderboards ignorieren ihn). Fix: Header über die
> PlayerRankings-Card verschieben (kurzfristig)."

**Verifiziert (2026-06-13):** `src/app/(app)/rankings/page.tsx`
- Z.34: `<LeagueScopeHeader leagueBarSize="md" nonSticky />` steht ganz oben, full-width.
- Z.43-51: 5 Leaderboards (Global, Monthly, Friends, Club, LastEvent) konsumieren
  `filterCountry`/`filterLeague` **nicht** — sind liga-übergreifend bzw. social/club-scoped.
- Z.52: NUR `<PlayerRankings filterCountry={...} filterLeague={...} />` konsumiert den Filter.

→ Der Header sitzt visuell über allem, wirkt aber nur auf 1 von 6 Cards. Irreführend.

**Cross-Page-Kontext:** Auf `/clubs` (Z.155) und `/fantasy` (Z.219) steht der Header
korrekt oben, weil dort die *ganze* Seite liga-gescoped ist. `/rankings` ist der einzige
Sonderfall mit gemischtem Scope.

**Anil-Decision (2026-06-13):** Option 1 gewählt — Header runter direkt über die
PlayerRankings-Card (ehrliches Scoping, Filter steht wo er wirkt).

## 3. Betroffene Files

| File | Änderung | Begründung |
|------|----------|------------|
| `src/app/(app)/rankings/page.tsx` | Header von Z.34 (Page-Top) in die rechte Grid-Spalte direkt über `<PlayerRankings>` (Z.52) verschieben, in gemeinsamen Container wrappen | Einziges File — Header-Platzierung ist rein lokal auf dieser Page |

## 4. Code-Reading-Liste (VOR Implementation)

| File | Zweck | Geprüfte Frage |
|------|-------|----------------|
| `src/app/(app)/rankings/page.tsx` | Layout-Struktur | ✅ gelesen — Header Z.34, PlayerRankings Z.52 rechte Spalte, 2-col grid |
| `src/components/layout/LeagueScopeHeader.tsx` | Props-Contract | Prüfen: `leagueBarSize`, `nonSticky`, `className` Props bleiben kompatibel — kein Top-Only-Verhalten (sticky war via `nonSticky` schon aus) |
| `src/components/rankings/PlayerRankings.tsx` | Konsument | Prüfen: erwartet `filterCountry`/`filterLeague` — Props-Durchreichung unverändert |

## 6. Acceptance Criteria

- **AC-1 [HAPPY]:** Liga-Header steht nicht mehr am Page-Top, sondern direkt über der
  Spieler-Rankings-Card.
  VERIFY: visuelle Inspektion + `grep -A2 "PlayerRankings" rankings/page.tsx` zeigt Header davor.
  FAIL-IF: Header noch in Z.34-Position oder doppelt gerendert.
- **AC-2 [LAYOUT]:** Mobile (393px, 1 Spalte): Header sitzt unmittelbar über Spieler-Rankings
  am unteren Ende des Stacks. Desktop: Header in rechter Spalte über PlayerRankings.
  VERIFY: Screenshot bescout.net /rankings mobil + desktop.
  FAIL-IF: horizontaler Overflow, Header von Card visuell getrennt.
- **AC-3 [REGRESSION]:** Liga-Filter wirkt weiterhin auf PlayerRankings (Country+League
  werden durchgereicht), Leaderboards unverändert.
  VERIFY: Liga wechseln → PlayerRankings-Liste ändert sich, Leaderboards bleiben.
  FAIL-IF: Filter wirkungslos oder tsc-Fehler bei Props.
- **AC-4 [BUILD]:** `pnpm exec tsc --noEmit` grün.

## 8. Self-Verification Commands

```bash
# Header nicht mehr am Page-Top (keine Zeile zwischen <h1> und SelfRankCard mit LeagueScopeHeader):
grep -n "LeagueScopeHeader" src/app/\(app\)/rankings/page.tsx
# Erwartung: genau 1 Import + 1 Verwendung, Verwendung im Kontext der rechten Spalte über PlayerRankings.

# Header direkt vor PlayerRankings:
grep -B3 "<PlayerRankings" src/app/\(app\)/rankings/page.tsx
# Erwartung: LeagueScopeHeader-Zeile im selben Container-Block.

# tsc:
pnpm exec tsc --noEmit
```

## 10. Proof-Plan

- `pnpm exec tsc --noEmit` Output → `worklog/proofs/285-rankings-header.md`
- Post-Deploy Playwright-Screenshot bescout.net `/rankings` mobil (393px) + desktop → in Proof-Doc.

---

## 12. Stage-Chain (geplant)

SPEC → IMPACT (skipped: rein lokales Layout, kein Consumer/Service/DB) → BUILD →
REVIEW (self-review: XS Layout-Move, kein Logic-Change) → PROVE (Screenshot) → LOG

## 11. Scope-Out

- KEINE Änderung an Leaderboard-Scoping (Friends/Club/Global bleiben liga-übergreifend — by design).
- KEINE Änderung am globalen `leagueScopeStore` (SSOT bleibt).
- KEINE Header-Platzierung auf anderen Pages (/clubs, /fantasy bleiben Top — dort korrekt).
- Langfristige Option „Leaderboards liga-scopen" explizit out (separater Slice falls je gewünscht).
