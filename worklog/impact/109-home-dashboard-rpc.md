# Slice 109 — Impact Analysis

## Consumer-Map der 4 konsolidierten Hooks

| Hook | File | /home? | Andere Pages |
|------|------|--------|--------------|
| `useHoldings` | `src/lib/queries/holdings.ts` | ✅ | market, fantasy-picker, community, onboarding, club, fantasy-ErgebnisseTab, enriched.ts, useFantasyHoldings |
| `useUserStats` | `src/lib/queries/stats.ts` | ✅ | community, missions |
| `useUserTickets` | `src/lib/queries/tickets.ts` | ✅ | **TopBar (layout — ALLE Seiten)**, **SideNav (layout — ALLE Seiten)**, missions, fantasy |
| `useHighestPass` | `src/lib/queries/foundingPasses.ts` | ✅ | profile |

**Critical:** `useUserTickets` läuft via `TopBar` (Layout-Component) auf JEDER Page — also auch auf /home bevor `useHomeData` mountet. Das schränkt die Einsparung ein:

- **Cold-Load /home**: TopBar fires `getUserTickets` parallel zu `useHomeDashboard`. Tickets-Query wird NICHT eingespart (läuft eh).
- **Warm-Navigation nach /home** (User war auf anderer Page): `qk.tickets.balance(uid)` ist bereits im Cache. TopBar liest cached data, Hintergrund-Refetch optional (staleTime 30s). `useHomeDashboard` primet den Cache, TopBar bleibt ruhig.

**Realistischer Save auf /home Cold-Load:**
- Eliminiert: holdings + user_stats + highest_pass = **3 Roundtrips**
- Hinzugefügt: get_home_dashboard_v1 = **1 Roundtrip**
- Netto: **-2 Roundtrips** (~300ms auf Slow 4G)
- Warm-Nav zusätzlich: -1 weiterer Roundtrip (tickets via Priming), **-3 insgesamt**

## Cross-Page Cache-Integrity

Die anderen Pages (market, community, fantasy, club, profile, missions, onboarding) nutzen **nicht** den neuen `useHomeDashboard` Hook. Sie rufen weiter ihre Einzel-Hooks auf. Das ist korrekt:

- Auf /market: `useHoldings` cached via `qk.holdings.byUser(uid)`. Wenn /home vorher besucht wurde UND Priming gelaufen ist, ist der Cache warm — `useHoldings` rendert sofort.
- Wenn /market zuerst besucht wird: `useHoldings` läuft normal. /home Navigation später nutzt warm cache (dashboard prime überschreibt mit gleichem Shape → kein Rerender).

**Shape-Kompatibilität ist Pflicht:** `dashboard.holdings` muss exakt `HoldingWithPlayer[]` sein (gleiche Spalten-Liste wie `getHoldings`). Sonst rendern Consumer-Pages falsch nach Priming-Write.

## RPC-Security

**SECURITY DEFINER + `auth.uid()` Guard (AR-44 Pflicht):**

```sql
CREATE OR REPLACE FUNCTION public.get_home_dashboard_v1(
  p_user_id uuid DEFAULT NULL
) RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_uid uuid := COALESCE(p_user_id, auth.uid());
BEGIN
  IF v_uid IS NULL THEN
    RAISE EXCEPTION 'auth_required';
  END IF;
  IF auth.uid() IS NOT NULL AND auth.uid() IS DISTINCT FROM v_uid THEN
    RAISE EXCEPTION 'auth_uid_mismatch';
  END IF;
  -- ... query holdings, user_stats, user_tickets, highest_pass
END;
$$;

REVOKE EXECUTE ON FUNCTION public.get_home_dashboard_v1(uuid) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.get_home_dashboard_v1(uuid) FROM anon;
GRANT EXECUTE ON FUNCTION public.get_home_dashboard_v1(uuid) TO authenticated;
```

**Exploits adressiert:**
- Anon-Call → `REVOKE FROM anon` blockt.
- Authenticated-to-other-user (User callt mit fremder `p_user_id`) → Guard wirft `auth_uid_mismatch`.
- Service-Role (cron, admin) darf weiter mit expliziter `p_user_id` callen (auth.uid() IS NULL → skip guard).

**INV-21 Kompatibilität:** Die Function matcht das AR-44 Pattern exakt. Kein neuer Audit-Eintrag nötig in `db-invariants`.

## Invalidation-Änderungen (src/lib/queries/invalidation.ts)

**Betroffene Funktionen:**

```typescript
invalidateTradeQueries(playerId, userId) {
  // ... existing
  + queryClient.invalidateQueries({ queryKey: qk.homeDashboard.byUser(userId) });
}

invalidateSocialQueries(userId) {
  // ... existing
  + queryClient.invalidateQueries({ queryKey: qk.homeDashboard.byUser(userId) });
}

invalidatePlayerDetailQueries(playerId, userId) {
  // ... existing (already invalidates holdings.byUser)
  + queryClient.invalidateQueries({ queryKey: qk.homeDashboard.byUser(userId) });
}
```

**Auch:** `handleOpenMysteryBox` in `useHomeData.ts` invalidiert tickets/cosmetics/equipment/wallet. Nach Slice 109 zusätzlich `qk.homeDashboard.byUser(uid)` invalidieren — sonst bleibt Tickets-Balance auf /home stale nach Box-Open.

## Query-Key Änderung (src/lib/queries/keys.ts)

Hinzufügen:
```typescript
homeDashboard: {
  byUser: (userId: string) => ['home-dashboard', userId] as const,
}
```

## Rückwärts-Kompatibilität

- **Alle existierenden Hooks** bleiben exportiert und voll funktionsfähig. Keine Call-Site außer `useHomeData` wird angefasst.
- **Query-Keys** ändern sich nicht. Bestehender Cache bleibt valide.
- **Services** (`getHoldings`, `getUserStats`, `getUserTickets`, `getHighestPass`) bleiben unverändert — andere Pages nutzen sie weiter.
- **Neue Datei** `src/lib/services/homeDashboard.ts` ist additive Change.

## Risiken

1. **Priming-Shape-Drift**: Wenn RPC-Return-Shape eine Spalte weglässt die `HoldingWithPlayer` hat, rendern Consumer-Pages falsch. Mitigation: Spec AC #3 verlangt exakten Shape-Match; Vitest testet das.
2. **Performance auf großen Portfolios** (>200 Holdings): Aggregierter RPC-Payload wächst. Mitigation: Ist ein Fan-Engagement-Portfolio, typisch <50 Holdings. Bei Bedarf Paging-Slice später.
3. **Wallet nicht dabei**: Wallet wird bewusst separat gehalten (RLS race). `useHomeData` zeigt aber nirgends wallet direkt — nur über `WalletProvider`. Kein Breaking-Change.
4. **staleTime-Mismatch**: Einzel-Hooks haben unterschiedliche staleTimes (30s/2min/30s/5min). `useHomeDashboard` muss gemeinsamen staleTime setzen — wähle **30s** (kürzester), ist safe für alle und frisch genug.

## Migration-Plan

1. Write migration file locally → apply via `mcp__supabase__apply_migration`
2. Verify via `SELECT proname, prosecdef, proacl FROM pg_proc WHERE proname = 'get_home_dashboard_v1'` + invoke smoke test.
3. Deploy service + hook code.
4. Post-deploy: Chrome-DevTools-Trace verifiziert Request-Count-Reduktion.
5. Kein Rollback-Plan nötig: Wenn der Hook broken ist, fallback bedeutet /home zeigt Skeleton — Deploy-Revert auf Vercel ist 1-Klick.

## Kompatibilität mit Slice 110 (AuthProvider-Robustness)

Slice 110 fügt `balanceIsStale` / state-machine hinzu. Der HomeDashboard-Hook läuft mit `enabled: !!uid` — das bleibt Slice 110 kompatibel, weil state-machine `'authenticated'` → `uid` gesetzt ist. Keine Abhängigkeit oder Konflikt.
