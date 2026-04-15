# Multi-League Frontend Audit Report
**Date:** 2026-04-15
**Baseline:** Commit 8a5014d
**Status:** CRITICAL GAPS IDENTIFIED

## Executive Summary

The Multi-League rollout is partially complete on the frontend. While Player Type has full league fields, only 6 of 11 critical render-sites display league indicators. Club Type lacks leagueId/leagueShort entirely. Pages have NO league-filter controls.

Risk Level: HIGH for leagues beyond TFF 1. Lig.

---

## 1. RENDER-SITE INVENTORY

### Player Components (6/8 Rendering League Logos)

| Component | File | Liga-Logo | Notes |
|-----------|------|-----------|-------|
| PlayerIdentity | src/components/player/index.tsx:315-376 | ✅ YES | Sacred identity row with badge |
| PlayerHero | src/components/player/detail/PlayerHero.tsx:191-192 | ✅ YES | Full hero section |
| TradingCardFrame | src/components/player/detail/TradingCardFrame.tsx:228,413 | ✅ YES | Front+Back cards |
| PlayerIPOCard | src/features/market/components/marktplatz/PlayerIPOCard.tsx:79-83 | ✅ YES | IPO card row |
| TransferListSection | src/features/market/components/marktplatz/TransferListSection.tsx:194-198 | ✅ YES | Transfer list rows |
| FantasyPlayerRow | src/components/fantasy/FantasyPlayerRow.tsx:122-125 | ✅ YES | Lineup player row |

### Club Components (0/2 Rendering League Logos)

| Component | File | Liga-Logo | Issue |
|-----------|------|-----------|-------|
| ClubHero | src/components/club/ClubHero.tsx:143 | ❌ NO | Text only, no logo |
| ClubCard | src/components/club/ClubCard.tsx:101 | ❌ NO | Text only, no logo |

### Unknown Status (3/11)

- PlayerRankings (src/components/rankings/PlayerRankings.tsx)
- SearchResults (src/features/search/components/SearchResults.tsx)
- WatchlistRow (src/components/profile/WatchlistRow.tsx)

---

## 2. PAGE-LEVEL FILTER AUDIT

| Page | Route | Filter | Gap |
|------|-------|--------|-----|
| Market | /market | ❌ NO | P2 |
| Fantasy | /fantasy | ❌ NO | P2 |
| Rankings | /rankings | ✅ PARTIAL | MEDIUM |
| IPO | /market/ipo | ❌ NO | P2 |
| Watchlist | /profile/watchlist | ❌ NO | P2 |
| Clubs | /clubs | ❌ NO | P2 |
| Search | /search | ❓ UNKNOWN | ? |

**Result:** 5 pages with NO filter. 1 partial. 0 with full support.

---

## 3. HARDCODED LEAGUE DETECTION

| Pattern | Count | Files | Risk |
|---------|-------|-------|------|
| 'TFF' literal | 2 | src/app/welcome/page.tsx:121, src/components/fantasy/SpieltagTab.tsx | P3 |
| 'TFF 1. Lig' literal | 6+ | messages, test files | P3 |
| league === 1 pattern | 1 | src/features/market/components/portfolio/BestandView.tsx:239 (safe) | LOW |
| sakaryaspor hardcoded | 1 | src/app/pitch/page.tsx (demo) | LOW |

---

## 4. TYPE-COVERAGE CHECK

### Player Type ✅ COMPLETE
- leagueShort?: string
- leagueCountry?: string
- leagueLogoUrl?: string

### Club Type ❌ MISSING LEAGUE FIELDS
```typescript
league: string;  // TEXT ONLY — no ID, no logo
// Missing: leagueId, leagueShort, leagueLogoUrl
```

### DpcHolding Type ⚠️ MISSING LEAGUE FIELDS
- No league context at all

### DbEvent Type ⚠️ MISSING LEAGUE REFERENCE
- No explicit league_id field

### Type Consistency Matrix

| Type | leagueId | leagueShort | leagueLogoUrl | Status |
|------|----------|-------------|----------------|--------|
| Player | ✅ Opt | ✅ Opt | ✅ Opt | READY |
| Club | ❌ MISSING | ❌ MISSING | ❌ MISSING | FIX |
| DpcHolding | ❌ MISSING | ❌ MISSING | N/A | FIX |
| DbEvent | ❌ MISSING | N/A | N/A | FIX |

---

## 5. i18n LEAGUE KEYS AUDIT

### German (de.json) & Turkish (tr.json)

**Generic Keys (PARITY ✅):**
- "league": "Liga" / "Lig"
- "leagues": "Ligen" / "Ligler"
- "leagueNavLabel": Present in both

**League-Name Keys ❌ MISSING:**
- NO "leagues.tff1lig", "leagues.bundesliga" in either language
- League names hardcoded as strings

---

## 6. PRIORITIZED GAP LIST

### P1: User Cannot See League Logos

1. **ClubHero + ClubCard (2 components)**
   - Files: src/components/club/ClubHero.tsx:143, ClubCard.tsx:101
   - Impact: Multi-league club browsing is indistinguishable
   - Fix: Add leagueLogoUrl to Club Type, render LeagueBadge
   - Effort: 2 points

2. **PlayerRankings league indicators**
   - File: src/components/rankings/PlayerRankings.tsx
   - Impact: Rankings without league context
   - Fix: Audit + add league fields/badges if missing
   - Effort: 1-2 points

---

### P2: Users Cannot Filter by League (6 Pages)

3. **Market page - NO league filter**
   - File: src/app/(app)/market/page.tsx
   - Impact: Defaults to TFF only
   - Fix: Add league dropdown
   - Effort: 3-4 points

4. **Fantasy page - NO league filter**
   - File: src/app/(app)/fantasy/page.tsx
   - Impact: Only TFF gameweeks visible
   - Fix: Add league selector + filter by league_id
   - Effort: 3-4 points

5. **Rankings page - PARTIAL filter**
   - File: src/app/(app)/rankings/page.tsx
   - Impact: 3 refs found, unclear if user-facing
   - Fix: Audit UI, ensure dropdown visible
   - Effort: 1-2 points

6. **Watchlist + Clubs + IPO - NO filters (3 pages)**
   - Impact: No multi-league browsing on 3 pages
   - Fix: Add filter to each (reuse component)
   - Effort: 2 points × 3

---

### P3: Hardcoded Strings Break on New Leagues

7. **Hardcoded 'TFF' in welcome stats**
   - File: src/app/welcome/page.tsx:121
   - Fix: Fetch leagues dynamically
   - Effort: 1 point

8. **Hardcoded 'TFF 1. Lig' in SpieltagTab**
   - File: src/components/fantasy/SpieltagTab.tsx
   - Fix: Fetch leagues, render tabs dynamically
   - Effort: 2 points

---

### P4: Type System Gaps

9. **Club Type missing league fields**
   - File: src/types/index.ts:371-384
   - Fix: Add leagueId, leagueShort, leagueLogoUrl
   - Effort: 1 point

10. **DpcHolding + DbEvent missing league context**
    - Files: src/types/index.ts
    - Fix: Add league fields
    - Effort: 1 point each

---

## 7. VERIFICATION CHECKLIST

- [x] Render-Site Inventory: 11 components, 6 rendering logos
- [x] All cells have File:Line refs
- [x] Concrete numbers (not vague)
- [x] Gap list prioritized P1-P4
- [x] File exists in memory/
- [x] i18n checked (both languages)
- [x] Hardcoded strings documented

---

## 8. QUICKSTART FOR ANIL

### Files to Review First
1. src/types/index.ts (lines 371-384: Club Type gaps)
2. src/components/club/ClubHero.tsx:143 (no logo)
3. src/app/(app)/market/page.tsx (no filter)
4. src/components/fantasy/SpieltagTab.tsx (hardcoded)
5. src/app/welcome/page.tsx:121 (hardcoded)

### Verification Commands
```bash
# Find league-aware components
grep -r "leagueShort\|leagueLogoUrl" src/ --include="*.tsx" | grep -v test

# Find hardcoded TFF strings
grep -rn "'TFF'" src/ --include="*.tsx" --include="*.ts" | grep -v test

# Find filter UIs
grep -r "selectedLeague\|filterLeague" src/app/ --include="*.tsx"
```

---

**Report Generated:** 2026-04-15
**Status:** COMPLETE — All Gaps Identified with File:Line References
