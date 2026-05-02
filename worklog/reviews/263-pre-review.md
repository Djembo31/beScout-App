# Slice 263 Pre-Review (D62-Pattern)

**Verdict:** CONCERNS (1 P0, 4 P1, 3 P2) — Spec ist nicht REWORK-pflichtig. Zielgerichtete v2-Patches reichen.
**Spec:** `worklog/specs/263-doppel-identity-pills.md`
**Time:** ~30 min

---

## P0 — must fix before BUILD

### F-01 · i18n-Namespace-Kollision `home.scout`/`home.manager` String→Object

**Verifiziert:** `messages/de.json:371-372` hat `"manager": "Manager"` + `"scout": "Scout"` als Top-Level-Strings im `home`-Namespace. Line 442 (Slice 262) führte `"manager": {` als Object ein → JSON-Duplicate-Key-Drift (last-wins). Slice 263 würde `home.scout.*` als Object → vertieft den Drift.

**JSON-Validity-Risk:** Linter-Warnings, semantisch unsauber, Backward-Compat-Risk wenn künftig `t('manager')`/`t('scout')` als Top-Level home-Key gelesen wird (heute 0 Consumer per grep, aber Latent-Bomb).

**Fix-Optionen:**
| # | Optionen | Aufwand |
|---|----------|---------|
| (a) Top-Level-Strings löschen Z.371-372 + TR-äquivalent | XS, grep zeigt 0 Consumer |
| (b) Pill-Keys in `home.gw.*` Namespace | XS |
| (c) Sub-Namespace `home.scoutHero.*` + `home.managerBlock.*` (symmetrisch zu Component-Namen) | XS |

**CTO-Empfehlung:** **(c)** + Bonus-Cleanup von Z.371-372 in same Slice (auch in TR). Symmetrie zu Component, kein Konflikt.

---

## P1 — clarify before BUILD

### F-02 · AC-05 unscharf zu `holdingsCount`-Anzeige in ScoutPill

Spec §2.1 Mock zeigt „2.450 CR · +5.4%" ohne Count. AC-05 sagt „Portfolio-CR + PnL%-mit-Vorzeichen". `holdingsCount` als Prop in §2.5 — wird nicht im Pill angezeigt, nur als Show-Gate. Aber Spec ist nicht explizit.

**Empfehlung:** AC-05 präzisieren: „zeigt Label + Portfolio-CR + PnL%, KEIN Count im Pill". `holdingsCount`-Prop bleibt als Show-Gate (EC-03 Edge-Case mit portfolioValue=0 + holdings>0).

**Anti-Pattern-Risk:** Slice 262 P2-2 entfernte `holdingsCount` aus ManagerBlock. Slice 263 fügt sie wieder hinzu. §15 Notes Rationale dokumentieren („Re-Add für ScoutPill-Show-Gate, neuer Use-Case nach 262-Removal").

### F-03 · `pickNextScopedEvent` Status-Filter unscharf, Defense-in-Depth fehlt

Spec §2.3: „includes ALL statuses, requires starts_at > now". Praktisch heißt das: nur `upcoming` (+seltenes future-`registering`) qualifizieren weil `running`/`late-reg` per Definition past-starts haben. `ended`/`scoring` mit future-starts wäre DB-Drift, sollte abgesichert werden.

**Empfehlung:** Helper-Filter erweitern um Defense-in-Depth: `if (e.status === 'ended' || e.status === 'scoring') return false;`. Plus EC-02 Status-Klarheit.

### F-04 · TR-Possessive-Suffix „{time}'de başlıyor" GRAMMATIK-FALSCH bei einigen Outputs

`getTimeUntil()` produziert Outputs `2d 4h`, `5h 30m`, `0h 12m`. TR-Vokal-Harmonie hängt vom letzten Vokal ab:
- `2d 4h` → letzter Vokal `ö` (vier=dört) → `'de` ✓
- `5h 30m` → letzter Vokal `ı` (sıfır) → `'da` ✗
- `45m` → letzter Vokal `e` (beş) → `'da` ✗

Hardcoded `'de` ist in 50%+ Cases falsch.

**Fix-Empfehlung:** TR umformulieren als „{time} sonra" (= „in {time}"). „sonra" ist neutral, hängt nicht von Vokal-Harmonie ab.

| Key | DE | TR (v2) |
|-----|----|---------|
| `home.scoutHero.managerPillCountdown` | „in {time}" | „{time} sonra" |

DE auch verkürzen für Symmetrie: „in {time}" statt „startet in {time}".

### F-05 · Mobile 393px Pill-Width-Budget kann reißen

ScoutHero hat aktuell 3 Pills (Balance + PnL + Players ≈ 310-410px). ManagerPill als 4. Pill (≈ 140-180px) → Overflow garantiert. `flex-wrap` regelt via 2-Zeilen-Wrap, aber Visual-Noise.

**Empfehlung:** AC-11 ergänzen: „akzeptierter 2-Zeilen-Wrap auf Mobile, kein horizontaler Overflow". Proof-Plan §11 erweitern um Long-String-Test (Account mit Balance >100k + 50+ Holdings + 14d-Countdown).

---

## P2 — nice to have

### F-06 · Wording-Drift „Kader" vs „Kader-Wert"
Slice 261/262 nutzt `home.portfolioRoster: "Kader-Wert"`. Slice 263 plant „Kader" als ScoutPill-Label. Nicht parallel sichtbar (verschiedene Modi), aber Liga-Switch könnte irritieren. Akzeptabel für 263, §15 Notes als „Möglicher Wording-Refinement Slice 264+" markieren.

### F-07 · `useHomeData.test.ts` Mock-Adjustment unspezifiziert
Spec §3 sagt „Mock-Adjustment für pickNextScopedEvent" — aber WIE? `vi.mock('@/components/home/helpers')` muss `pickNextScopedEvent: vi.fn(() => null)` ergänzen, parallel zu pickScopedEvent. Identisches Pattern wie Slice 262.

### F-08 · `nextScopedEvent`-Memo läuft auch in Manager-Mode
Cost minimal (<1ms bei 50 events), aber Object-Identity-Drift triggert React-Memo-Cascade. Akzeptabel, Performance-Slice optional später.

---

## Was gut war

1. Decision-Tabelle §9 explizit, kein Multi-Choice-Loop nötig
2. EC-Tabelle §7 deckt 8 Edge-Cases inkl. Liga-Switch + Cold-Start
3. Pre-Mortem §14 PM-1 strukturell sicher (Pill nur in ScoutHero-Branch)
4. Scope-Out §12 explizit mit Slice-Zuweisung
5. Code-Reading-Liste §4 mit File+Line-Range konkret
6. i18n §10 Anil-Review-Punkt explizit nach Slice-262-Lehre

---

## CTO-Decision-Bias-Check (§9)

| # | Scope | OK? |
|---|-------|-----|
| A | UI-Layout | ✓ |
| B | UI-Layout | ✓ |
| C | UI-State | ✓ |
| D | UX-Heuristik | ⚠️ kein 14-Tage-Limit — Anil-Vorbehalt möglich. EC-04 dokumentiert |
| E | Architektur | ✓ Slice 262 D=a Pattern |
| F | i18n | ✓ aber nach F-04-Fix Wording-Tabelle update |

---

## Spec-v2-Patches

1. **F-01** (P0): i18n-Namespace `home.scoutHero.*` + `home.managerBlock.*`. Bonus-Cleanup Z.371-372 (`home.manager`/`home.scout` Top-Level-Strings) in same Slice.
2. **F-02** (P1): AC-05 präzisieren, §15 Notes holdingsCount-Re-Add-Rationale.
3. **F-03** (P1): Helper-Filter Defense-in-Depth (Status `ended`/`scoring` exkludieren), EC-02 Status-Klarheit.
4. **F-04** (P1): TR „{time} sonra", DE „in {time}".
5. **F-05** (P1): AC-11 2-Zeilen-Wrap akzeptieren, Proof-Plan Long-String.
6. **F-07** (P2): §3 Mock-Adjustment-Detail.

P2 F-06 + F-08: nur §15 Notes.

**Effort:** ~15 min Spec-v2 + ~60-90 min BUILD (S-Slice, 8-10 Files, Pattern-bekannt).
