# Tier-Based Configuration Pattern

> Quelle: AR-55 Rate-Limit Tiers (J6 Backend), Geofencing-Tiers (business.md)
> Konsolidiert: AutoDream v3 Run #11 (2026-04-15)

## Problem

Features wie Rate-Limiting, Feature-Access, Fee-Splits brauchen User-Tier-basierte Konfiguration.
Hard-coded Constants in mehreren Files erzeugen Drift wenn Tiers sich aendern.

## Pattern: Tier-Config Record + RPC-basierter Lookup

### Frontend (TypeScript)

```typescript
// SSOT fuer Tier-Konfig im Client
export type UserTier = 'free' | 'scout' | 'pro' | 'elite'

export const TIER_CONFIG: Record<UserTier, {
  label: string
  dailyBoxes: number
  tradingFeeDiscount: number  // 0.0–1.0
  featureFlags: string[]
}> = {
  free:  { label: 'Free',  dailyBoxes: 1, tradingFeeDiscount: 0,    featureFlags: [] },
  scout: { label: 'Scout', dailyBoxes: 2, tradingFeeDiscount: 0.05, featureFlags: ['leagueInvite'] },
  pro:   { label: 'Pro',   dailyBoxes: 5, tradingFeeDiscount: 0.10, featureFlags: ['leagueInvite', 'priceAlerts'] },
  elite: { label: 'Elite', dailyBoxes: 10,tradingFeeDiscount: 0.15, featureFlags: ['leagueInvite', 'priceAlerts', 'eliteBadge'] },
}

// Verwendung
const cfg = TIER_CONFIG[user.tier ?? 'free']
```

### Backend (PostgreSQL)

```sql
-- Tier-Check in RPC
CREATE OR REPLACE FUNCTION get_user_daily_box_limit(p_user_id uuid)
RETURNS integer LANGUAGE plpgsql STABLE AS $$
DECLARE
  v_tier text;
BEGIN
  SELECT tier INTO v_tier FROM profiles WHERE id = p_user_id;
  RETURN CASE COALESCE(v_tier, 'free')
    WHEN 'elite' THEN 10
    WHEN 'pro'   THEN 5
    WHEN 'scout' THEN 2
    ELSE 1
  END;
END;
$$;
```

## Wichtige Regeln

1. **SSOT:** Tier-Werte nur an 1 Stelle definieren. Frontend-Config und Backend-RPC muessen gespiegelt sein.
2. **CEO-Gated Tier-Aenderungen:** Tier-Grenzen beeinflussen Geld-Flows → Aenderungen brauchen CEO-Approval.
3. **Default zum sichersten Tier:** `COALESCE(tier, 'free')` — nie mehr Features als erwartet.
4. **Feature-Flags als String-Array:** `featureFlags.includes('leagueInvite')` ist einfacher als Boolean-Explosion.
5. **Keine Tier-Logik in Components:** Immer via `TIER_CONFIG[user.tier]` oder Hook `useUserTier()`.

## Verwandte Patterns

- Geofencing-Tiers in `business.md` (TIER_FULL, TIER_CASP, TIER_FREE, TIER_RESTRICTED, TIER_BLOCKED)
- Feature-Flag als Defense-in-Depth (J5 CEO-Sweep: paid-Feature-Guard)
