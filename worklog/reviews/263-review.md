# Slice 263 Code-Review (post-BUILD)

**Verdict:** CONCERNS (1 Spec-Drift P2 dokumentationspflichtig + Spec-Notes-Patch, 1 Test-Coverage-Lücke P2 akzeptabel mit Anil-PROVE-Mitigation)
**Time:** ~25 min
**Spec:** `worklog/specs/263-doppel-identity-pills.md` (v2)
**Files:** 9 src + 2 messages + 3 test-files

---

## Pre-Review-Findings Resolution

| # | Status | Evidence |
|---|--------|----------|
| F-01 (P0) i18n Sub-Namespace + Top-Level-String-Cleanup | ⚠️ PARTIAL — Spec-Drift | Top-Level-Strings Z.371-372 sauber gelöscht ✓. Implementation nutzt `home.manager.*` (Slice-262-Konsistenz) statt Spec-§10 `home.managerBlock.*`. Funktional gleichwertig (Konflikt gelöst), Spec-Drift = F-NEW-1. |
| F-02 (P1) AC-05 Label + CR + PnL%, KEIN Count | ✅ | ManagerBlock.tsx:140-154 + Test :175-180 |
| F-03 (P1) Defense-in-Depth ended/scoring exclude | ✅ | helpers.tsx:65 + 2 Tests :187-201 |
| F-04 (P1) TR „{time} sonra" + DE „in {time}" | ✅ | de.json:450 + tr.json:450 |
| F-05 (P1) Mobile 2-Zeilen-Wrap akzeptiert | ✅ Spec | flex-wrap:173 + Anil-PROVE Long-String pflicht |
| F-06 (P2) Wording-Refinement Notes | ✅ | Spec §15 |
| F-07 (P2) useHomeData Mock-Adjustment | ✅ | useHomeData.test.ts:145 |
| F-08 (P2) Memo-Performance Notes | ✅ | Spec §15 |

---

## Findings (post-BUILD)

### P0 — keine
### P1 — keine
### P2

#### F-NEW-1 · i18n-Namespace `home.manager.*` statt Spec-`home.managerBlock.*` — Spec-Drift undokumentiert

Spec v2 §10 + §3 + §2.7 sagen `home.managerBlock.*`. Implementation nutzt `home.manager.*` (12 Test-Assertions + 2 i18n-Files). Funktional konsistent (Top-Level-String-Konflikt durch Z.371-372-Cleanup gelöst), aber gegen errors-infra.md „Spec-Drift-im-Drift-Heal-Anti-Pattern" (Slice 234).

**Fix:** Spec §15 Notes ergänzen um Implementation-Drift v2→Build (CTO-Empfehlung — minimal-aufwändig).

#### F-NEW-2 · ManagerPill keine RTL-Tests, AC-09+10 nur Anil-PROVE

ManagerPill Render-Logic + Link-href haben keine automatisierten Tests. Akzeptabel weil structurally trivial + HomeStoryHeader hat keinen existing Test-File. Anil-PROVE muss explizit ManagerPill-Visible + Tap testen (Mitigation gesetzt).

---

## Compliance (business.md) — OK

- Asset-Klasse-Sprache vermieden ✓
- „Kader/Kadro/Spieltag/Hafta" Football-Manager-Standard ✓
- Meme-Coin-Sprache: keine ✓
- Securities-Wording: pnlPct neutral „+5.4%" ✓
- JSON-Linter-Drift gelöst ✓ (Top-Level-Strings entfernt)

---

## Code-Quality / Patterns

| Pattern | Status |
|---------|--------|
| Stateless-Component (Slice 254) | ✅ |
| Liga/Context-Switch State-Reset | ✅ deps `[events, scopedLeagueId, leagueScopeHydrated]` |
| Mobile 393px 4-Pills-flex-wrap | ⚠️ Anil-PROVE Long-String pflicht |
| min-h-44px Touch-Targets | ✅ |
| Slice-262-Patterns konsistent | ✅ prefetch={false}, motion-safe |
| Type-Safety nextScopedEvent.gameweek | ✅ Guard `!= null` |

---

## AC-Verification

| # | Status |
|---|--------|
| AC-01..08, 13 | ✅ codeseitig + Tests |
| AC-09, 10 (ManagerPill render+link) | ⚠️ kein RTL-Test, nur Anil-PROVE |
| AC-11 (Mobile 393px) | ⚠️ Anil-PROVE |
| AC-12 (TR-Locale) | ⚠️ Anil-PROVE DE+TR Cookie-Switch |

---

## Pattern-Promotion-Kandidat (D45 — Knowledge-Flywheel)

**i18n Object/String-Duplicate-Key-Drift** als errors-frontend.md-Eintrag:

```markdown
### JSON Object/String-Duplicate-Key-Drift (Slice 263 Pre-Review F-01)

**Symptom:** Pre-existing Top-Level-String + neues Sub-Object mit gleichem Key
im selben Namespace. JSON last-wins → String unreachable, latent.

**Detection:** grep für duplicate keys im selben Indent-Level.

**Fix-Pattern:**
1. Top-Level-String löschen wenn 0 Consumer (`grep "t('namespace.key')" src/`)
2. ODER Sub-Namespace umbenennen (Component-symmetrisch)

**Reference:** Slice 262 `home.manager: { gwLabel ... }` Object eingeführt
gegen pre-existing `home.manager: "Manager"` String. Slice 263 Cleanup +
Pre-Review-Catcher demonstriert D62-Wert.
```

**CTO-Empfehlung:** PROMOTE post-LOG.

---

## Anil-PROVE-Vorbereitung (post-Deploy)

### 1. ManagerPill in ScoutHero (Mobile DE + TR)
- Off-GW + Holdings, 393px /home
- 4-Pill-Reihe: Wallet + PnL + Players + Spieltag X · in 2d 4h
- Tap → /fantasy
- DE → TR: „Spieltag 28 · in 2d 4h" → „Hafta 28 · 2d 4h sonra"

### 2. ScoutPill in ManagerBlock (Mobile DE + TR)
- Active-GW + Holdings, 393px /home
- ScoutPill nach Captain: „Kader 245.000 CR +5.4%"
- Tap → /manager?tab=kader
- DE → TR: „Kader" → „Kadro"

### 3. Long-String-Edge (Mobile)
- Account >100k Balance + 50+ Holdings + 14d-Countdown
- 393px ScoutHero akzeptabler 2-Zeilen-Wrap, kein horizontaler Overflow

### 4. Edge-Cases
- 0-Holdings Manager-Mode → ScoutPill hidden ✓
- Liga-Switch (DE → TR-Liga) → nextScopedEvent re-derived sauber

---

## Summary

**Verdict CONCERNS** wegen 1 Spec-Drift (F-NEW-1, Notes-Patch in §15 reicht). 13 ACs codeseitig + Tests erfüllt, 4 ACs Anil-PROVE-pflichtig. 64/64 Tests grün, tsc clean, Compliance-konform.

**Vor Commit:**
1. Spec §15 Notes-Patch (F-NEW-1)
2. Pattern-Promotion-Kandidat in errors-frontend.md (post-LOG)

**Anil-PROVE post-Deploy** (4 Szenarien siehe oben).
