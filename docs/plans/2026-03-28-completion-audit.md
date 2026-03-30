# BeScout Completion Audit — Konsolidierter Befund

> Erstellt: 2026-03-28 | 4 Audit-Agents, vollständiger Scan über src/, migrations/, types/

## Gesamtbild

| Bereich | Status | Issues |
|---------|--------|--------|
| Types (171 Interfaces) | 100% | 0 |
| Migrations (297+) | 99% | 1 RLS fix bereits applied |
| Services (70+ Files) | 95% | 3 incomplete, deprecated exports |
| Components (150+ Files) | 98% | 3 UI issues |
| Routes/Pages | 97% | 2 critical, 1 stub |

**Total: 15 konkrete Issues, davon 2 CRITICAL, 7 MEDIUM, 6 LOW**

---

## PRIORITY 1 — CRITICAL (Blocking Production)

### C1: Cron RPC Auth — Gameweek-Sync bricht ab
**Was:** `resolve_gameweek_predictions` + `calculate_dpc_of_week` RPCs scheitern wenn vom Cron aufgerufen (service_role hat `auth.uid() = NULL`)
**Wo:** `src/app/api/cron/gameweek-sync/route.ts:1066,1082`
**Impact:** Gameweek-Sync kann Predictions nicht auflösen + DPC of Week nicht berechnen
**Fix:** RPCs refactoren: entweder NULL auth.uid() erlauben für service_role, oder Wrapper-RPCs ohne auth-Check
**Aufwand:** 1-2 Migrations

### C2: Founding Pass — Mock Payment Reference
**Was:** `paymentReference: 'mock-pilot'` statt echtem Payment Gateway
**Wo:** `src/app/(app)/founding/page.tsx:112`
**Impact:** Founding Pass Käufe bypassen echte Zahlung
**Fix:** Payment Provider integrieren (Stripe/PayPal) oder bewusst als Pilot-Modus dokumentieren
**Aufwand:** Hängt von Payment-Entscheidung ab

---

## PRIORITY 2 — MEDIUM (Features halb fertig)

### M1: Streak Benefits nicht in RPCs integriert
**Was:** `fantasyBonusPct` + `eloBoostPct` berechnet aber NICHT konsumiert
**Wo:** `src/lib/streakBenefits.ts:5-6`
**Impact:** User bekommen keinen Streak-Bonus obwohl System ihn berechnet
**Fix:** `score_event` RPC: Lineup-Score × (1 + fantasyBonusPct). `calculate_fan_rank` RPC: Boost anwenden
**Aufwand:** 2 Migrations

### M2: MysteryBox Discount — Server ignoriert es
**Was:** RPC `open_mystery_box` akzeptiert kein `p_ticket_cost`, Server charged immer 15 Tickets
**Wo:** `src/components/gamification/MysteryBoxModal.tsx:20-23,91-93`
**Impact:** Discount-UI existiert aber hat keinen Effekt
**Fix:** RPC erweitern um `p_ticket_cost` Parameter
**Aufwand:** 1 Migration + Component Update

### M3: Community Leaderboard — Toter Button
**Was:** `onSwitchToLeaderboard={() => {}}` — Handler ist leer
**Wo:** `src/app/(app)/community/page.tsx:240`
**Impact:** Button existiert aber tut nichts
**Fix:** Route zu Leaderboard implementieren oder Button entfernen
**Aufwand:** 30 Min

### M4: Trader Tab "Alle Trades" — Toter Link
**Was:** `href="#"` — Link geht nirgendwo hin
**Wo:** `src/components/profile/TraderTab.tsx:274`
**Impact:** User klickt und nichts passiert
**Fix:** Route zu Activity/Trades implementieren oder Link entfernen
**Aufwand:** 30 Min

### M5: Prediction Results — Hardcoded German Strings
**Was:** `getConditionText()` hat hardcoded DE statt `t()`
**Wo:** `src/components/fantasy/ergebnisse/PredictionResults.tsx:27-34`
**Impact:** Bricht Multi-Language (TR)
**Fix:** Strings in messages/*.json, `t()` nutzen
**Aufwand:** 20 Min

### M6: Deprecated Wallet Functions — Dual Payment Path
**Was:** `deductEntryFee()` + `refundEntryFee()` @deprecated aber noch exportiert
**Wo:** `src/lib/services/wallet.ts:148-186`
**Impact:** Risiko dass alter 2-Step Flow statt atomarer RPCs genutzt wird
**Fix:** Prüfen ob irgendwo importiert, wenn nein → entfernen
**Aufwand:** 15 Min

### M7: Gameweek Scoring Fallback fehlt
**Was:** `importProgressiveStats()` hat keinen Fallback wenn API-Football nicht verfügbar
**Wo:** `src/features/fantasy/services/scoring.admin.ts:129-150`
**Impact:** Events ohne API-Daten können nicht gescored werden
**Fix:** Manual Scoring Fallback definieren
**Aufwand:** 1-2h

---

## PRIORITY 3 — LOW (Code Quality / Cleanup)

### L1: Silent Error Returns (118 Instanzen)
**Was:** Services returnen `0`, `[]`, `null` bei Fehlern statt zu werfen
**Wo:** wallet.ts, trading.ts, club.ts, bounties.ts, social.ts, cosmetics.ts
**Impact:** UI zeigt leere States statt Error-Toast
**Fix:** Schrittweise auf throw/Result Pattern migrieren
**Aufwand:** 2-3h (batch)

### L2: Console.log in Production
**Was:** Debug-Logs in lineups.mutations.ts (5x) + useEventActions.ts (3x)
**Impact:** Bloated Browser Console
**Fix:** Entfernen oder Logger-Service nutzen
**Aufwand:** 15 Min

### L3: Bridge Re-Exports Aufräumen
**Was:** lib/services/ re-exportiert aus features/ — verwirrend
**Wo:** events.ts, scoring.ts, lineups.ts, etc.
**Fix:** Dokumentieren oder konsolidieren
**Aufwand:** 1h

### L4: Deprecated Club Helpers
**Was:** `getCachedClubBySlug()`, `buildClubFromApi()` @deprecated
**Wo:** `src/lib/clubs.ts:126,129`
**Fix:** Prüfen ob importiert, wenn nein → entfernen
**Aufwand:** 10 Min

### L5: Accessibility Lücken
**Was:** Einige Icon-Buttons ohne aria-label
**Wo:** NotificationDropdown, SearchOverlay, ClubSwitcher
**Fix:** aria-labels ergänzen
**Aufwand:** 30 Min

### L6: API-Football Grid Position Edge Cases
**Was:** Ungültige grid_position wird gewarnt aber nicht robust behandelt
**Wo:** `src/lib/footballApi.ts:251`
**Fix:** Fallback-Logik für kaputte Grids
**Aufwand:** 30 Min

---

## Execution-Reihenfolge

```
Sprint 1 (Critical + Quick Wins):
  C1: Cron RPC Auth Fix (1-2 Migrations)
  C2: Founding Pass Payment klären (Entscheidung)
  M3: Community Leaderboard Button (30 Min)
  M4: Trader Tab Link (30 Min)
  M5: Prediction i18n (20 Min)
  M6: Deprecated Wallet prüfen + entfernen (15 Min)
  L2: Console.log entfernen (15 Min)
  L4: Deprecated Club Helpers entfernen (10 Min)

Sprint 2 (Feature Completion):
  M1: Streak Benefits in RPCs (2 Migrations)
  M2: MysteryBox Discount RPC (1 Migration)
  M7: Gameweek Scoring Fallback (1-2h)
  L5: Accessibility Labels (30 Min)
  L6: Grid Position Robustness (30 Min)

Sprint 3 (Code Quality):
  L1: Silent Error Returns → throw (2-3h batch)
  L3: Bridge Re-Exports aufräumen (1h)
```

## Was NICHT im Audit aufgetaucht ist (= fertig)

- Trading System (Buy/Sell/IPO/Offers) ✅
- Fantasy Events (12 Flows) ✅
- Player Detail Page ✅
- Club Pages + Admin Dashboard ✅
- Profile (4 Tabs) ✅
- Gamification (Ranks, Missions, Achievements) ✅ (bis auf Streak-Bonus)
- Market (Kader + Kaufen) ✅
- Airdrop + Leaderboard ✅
- Platform Admin (6 Tabs) ✅
- Type System (171 Interfaces) ✅
- RLS Policies ✅ (nach Fix)
