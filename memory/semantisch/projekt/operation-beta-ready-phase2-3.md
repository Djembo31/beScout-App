# Operation Beta Ready — Phase 2+3 (J5–J11 Healer-Wave, 2026-04-14/15)

## Status
DONE — alle J5–J11 Findings abgearbeitet. Phase 3 Cross-Cutting closed Beta ready.
Commits: e5143a5 (J5) → J7/J8 Round2 → J7 Healer → J8 Healer → J9 Healer → J10 Healer → J11 Healer → Phase3 Achievement i18n + transactions backfill → 553d0e2 (Ferrari 10/10)

## Was wurde gemacht

### J5 Healer-A: Mystery Box Components (Commit e5143a5)
- MysteryBoxModal + MysteryBoxHistorySection vollstaendig i18n-fied
- `resolveRarityLabel()` Helper eingeführt (analog zu equipmentNames.ts Pattern)
- `cosmetic_name` + `cosmetic_key` via useHomeData propagiert
- `preventClose={isOpening}` Pattern (separate State-Variable vor RPC-Call)
- `ResizeObserver` cleanup in useEffect
- `toLocaleDateString(locale === 'tr' ? 'tr-TR' : 'de-DE')` fuer Datum

### J6+J7+J8 Round 2 Frontend
- **MissionDisclaimer Component** neu (1:1 Pattern von MysteryBoxDisclaimer)
- `Orderbuch` → `Angebots-Tiefe` Sweep: TransferListSection `defaultMessage` fix
- SellModal **Fee-Breakdown** (3.5% + 1.5% + 1% = 6%) — reused `feeBreakdownPlatform/pbt/club` Keys
- DbMissionDefinition: `title_tr`, `description_tr` nullable hinzugefügt
- Streak Source-of-Truth: useHomeData + useProfileData → `useLoginStreak` Hook (React Query, staleTime=60s)

### J7 Healer: Missions + Streak (17 Fixes)
- **useLoginStreak** neuer Hook (`src/lib/queries/streaks.ts`, React Query)
- **missionErrors.ts** mapErrorToKey Helper
- MissionBanner: claimError state + role="alert" + Loader2 in Claim-Button
- invalidate tickets/wallet/notifications nach Claim (1.5s delay fuer fire-and-forget)
- StreakMilestoneBanner + DailyChallengeCard locale-aware (tr/de Felder)

### J8 Healer: Trading/Selling (14 Fixes)
- usePlayerTrading.ts i18n-key-leak (CRITICAL, analog J3)
- errorMessages.ts: Regex-Mappings fuer `orderCannotBeCancelled`
- SellModal: sellSuccess Prop, SC suffix lokalisiert, Quick-Price Math.max(1, ...), aria-labels
- Glossar: `orderbookTitle` + `portfolioTrend` umbenannt in user-facing Values
- offers.ts: `error.message` → `mapErrorToKey`

### J9 Healer: Rankings / Liga-Rang (22 Fixes)
- AirdropTier Union um `'silver'` erweitert + TIER_CONFIG Fallback zu `bronze`
- Filter `rank > 0` in Leaderboards bis Backfill-Migration live
- TradingDisclaimer auf /rankings Page
- "Monats-Sieger" → "Top-Platzierungen des Monats" / TR "Ayın Üst Sıralamaları"
- FanRankOverview Season 1 hardcoded → `useCurrentLigaSeason?.name`
- fanRanking staleTime 5min → 30s + Realtime-Subscribe user_stats/fan_rankings
- FanRankBadge i18n Keys + aria-label + role="status"
- MonthlyWinners reward_cents Disclaimer-Badge
- "Aufstieg" → "Neuer Rang erreicht" / "Yeni Rütbeye Ulaşıldı"

### J10 Healer: Watchlist + Notifications (18+ Fixes)
- **notifText(key, params, locale?)** — locale-Parameter optional mit default 'de' (30+ Call-Sites backward-compat)
- NotificationDropdown: price_alert via title-key + Player-lookup
- **Heart → Star Icon** in WatchlistView (Konsistenz mit PlayerHero)
- usePriceAlerts localStorage KOMPLETT entfernt (AR-59 DB-Pfad live)
- migrateLocalWatchlist: atomic (remove localStorage nur bei 0 failures)
- addToWatchlist: invalidate nach add (cache-race fix)
- "PBT-Ausschüttung" → "Verteilung" (DE only, TR "dağıtım" bleibt)
- Realtime: Single channel auf INSERT + UPDATE events (event: '*')

### J11 Healer: Equipment i18n (14 Fixes + AR-62/AR-63)
- **`equipmentNames.ts`** neuer Helper: `resolveEquipmentName(def, locale)` + `resolveEquipmentDescription(def, locale)`
- EquipmentSection + EquipmentDetailModal + EquipmentPicker: `name_de` → helper + useLocale
- MysteryBoxHistorySection: equipment_type → def-Lookup für Display-Name
- equipment.ts service: `equipToSlot`/`unequipFromSlot` → throw Error(i18n-key)
- useLineupSave: toast bei failed equips
- errorMessages.ts: 6 neue Equipment-Error-Keys + Regex
- **AR-62/AR-63**: `kazanildi` → `eklendi`, `kazanılmadı` → `elde edilmedi` (MASAK §4)
- EquipmentPicker: preventClose + multiplierLabels null guard + stats.equippedCount Guard

### Phase 3 Achievement i18n + Transactions Backfill (2026-04-15)
- DB Migration: achievement_definitions + `title_tr`/`description_tr` columns + Backfill aus i18n-Keys
- DB Migration: transactions.description `$SCOUT` → `Credits` (historische Einträge, Compliance)
- **`resolveAchievementLabel`** + **`resolveAchievementDescription`** Resolver in `src/lib/achievements.ts`
- AchievementsSection: useLocale() + Resolver (4 Call-Sites)
- SideNav: `<span>Wunsch einreichen</span>` → `{t('wishButton')}` (Key existierte schon)

### Ferrari 10/10 Workflow (Commit 553d0e2)
- Pre-Commit Guards live (`.claude/settings.json`)
- Governance-Files: `memory/ar-counter.md`, `memory/tr-review-queue.md`, `memory/agent-briefing-template.md`
- Worktree-Fix fuer Agents

### Platform-Settings Admin-Write-Policy Fix (Commit 0e7b123)
- Reviewer CONCERN → Admin-Write-Policy fuer platform_settings korrigiert

## Architektur-Entscheidungen (konsolidiert)

| Entscheidung | Begruendung |
|---|---|
| `resolveX(def, locale)` Helper Pattern | Single source of truth fuer DB-lokalisierte Felder. Genutzt fuer: equipmentNames, rarityLabel, achievements, missionTitle. Analog zu jedem neuen DB-Feature mit DE+TR-Feldern |
| Service wirft I18N-KEY, Consumer resolved via `t()` | J3→J11 konsistent durchgesetzt. mapErrorToKey in errorMessages.ts. Consumer via `te(key)` |
| notifText mit optionalem locale-Param | 30+ Call-Sites backward-compat. UI-Layer kennt Locale, Service kennt sie nicht |
| kazan* in TR vollstaendig eliminiert | MASAK §4 Abs.1.e. Pattern: `grep -iE "kazan" messages/tr.json` nach jedem TR-Merge |
| preventClose auf ALLEN Money/Transaction Modals | J2/J3 → auf alle Modals mit isPending ausgedehnt. FIX-Pattern: `preventClose={isPending\|\|isX}` |

## Offene Beobachtungen (Post-Beta)
- `cosmeticsEmptyDesc` TR line 4862: "kozmetik kazan" → "kozmetik topla" (kazan-Residuum)
- `noCosmeticsHint` TR line 3109: "Rütbe Yolu ... kazan" → analog
- `celebration` TR line 3057: "{reward} kazanıldı!" in Achievement — AR-32 J4 sollte schon gefixed haben, verifizieren
- FIX-13/14 J11: Icon-Duplication + groupByStatus in Equipment — DEFERRED post-Beta
- useNotificationRealtime FIX-18: Atomic Migration (deferred bis alle J10-Fixes live)
