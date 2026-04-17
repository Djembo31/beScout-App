# Slice 053 — B-01 Realtime-Orders Floor-Price (refetchInterval Polling)

**Groesse:** XS
**CEO-Scope:** NEIN
**Variante-2-Position:** #10/10 (FINAL)

## Ziel

Orderbook-Freshness verbessern fuer aktive Marktplatz-User. staleTime bereits auf 30s reduziert (Slice 008). Jetzt: refetchInterval 30s hinzufuegen = aktives Polling waehrend Tab fokussiert.

## Hintergrund

Walkthrough-Plan B-01: "Datenquellen Floor-Price (staleTime 2min)".
Briefing-Info war stale — Slice 008 hat bereits auf 30s reduziert (siehe Comment in `src/lib/queries/orders.ts:10`).

Verbleibender Gap: Ohne `refetchInterval`, refetcht React Query nur bei (a) Mount, (b) Re-Focus, (c) Manual invalidation. Ein User der 5min auf der Marktplatz-Seite sitzt, sieht Orders die bis zu 5min alt sind (solange kein Focus-Change).

## Fix

Einmal Zeile + einmal Zeile hinzugefuegt in `src/lib/queries/orders.ts`:
- `useAllOpenOrders`: `refetchInterval: 30_000`
- `useAllOpenBuyOrders`: `refetchInterval: 30_000`

**Default-Verhalten von React Query:**
- `refetchIntervalInBackground = false` (default) → Polling nur wenn Tab fokussiert
- staleTime 30s + refetchInterval 30s = konsistente 30s-Aktualisierung

## Alternativen-Analyse

**Realtime via Supabase-Subscription:**
- Requires `REPLICA IDENTITY FULL` auf orders-Table
- Subscription-Management im Client (mount/unmount)
- RLS-Policy-Compliance fuer Channel-Filter (orders-table hat auth.uid()-policy seit Slice 021)
- Skaliert schlechter bei vielen concurrent Viewers
- **Entscheidung:** Polling reicht fuer Beta, Realtime als optional Slice 053b post-Beta wenn Live-Usage das verlangt.

## Acceptance Criteria

1. `refetchInterval: 30_000` aktiv in beiden Order-Queries. ✅
2. tsc clean. ✅
3. Keine Regression (tests gruen). ✅
4. No-op fuer Background-Tabs (default React Query behavior).

## Files

**MODIFIZIERT:**
- `src/lib/queries/orders.ts` (+2 Zeilen, +Doc-Comment)

## Proof

- `git diff src/lib/queries/orders.ts` zeigt 2 added refetchInterval lines + Doc-Comment
- tsc --noEmit clean
- Existierende order-Tests gruen (keine neue Test-Schreibung noetig, refetchInterval ist React Query Feature nicht Service-Logic)

---

**VARIANTE-2 ABGESCHLOSSEN:** Slice 053 ist der letzte von 10. 10/10 DONE.
