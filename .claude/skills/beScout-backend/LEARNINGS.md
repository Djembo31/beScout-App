# Learnings — beScout-backend

> Kompiliert aus 91 Sessions. Jeder Eintrag ist ein echter Bug der uns Zeit gekostet hat.

## CRITICAL — Geld & Trading

### NULL-in-Scalar PL/pgSQL (Session 89, P0 Money Bug)
```sql
-- FALSCH: Wenn keine Row existiert → COALESCE wird NIE aufgerufen → NULL < y = NULL = falsy → Guard uebersprungen
IF (SELECT COALESCE(balance, 0) FROM wallets WHERE user_id = p_user) < p_price THEN RAISE;

-- RICHTIG: Erst in Variable, dann pruefen
SELECT balance INTO v_balance FROM wallets WHERE user_id = p_user;
IF NOT FOUND THEN RAISE 'Wallet nicht gefunden'; END IF;
IF COALESCE(v_balance, 0) < p_price THEN RAISE 'Guthaben zu niedrig'; END IF;
```
**Regel:** NIEMALS Scalar-Subquery mit COALESCE in IF. IMMER SELECT INTO + NOT FOUND Check.

### Fee-Split Parity (Session 73)
Wenn du eine Trading-Funktion aenderst (accept_offer, create_offer, place_order, execute_order), pruefe ALLE VIER.
Gleiche Fee-Logik, gleiche Guards, gleiche Balance-Checks. Ein Fix in einer Funktion = Check in allen vier.

### Escrow Reihenfolge (Session 42)
```
1. Balance pruefen
2. Balance abziehen (Escrow einfrieren)
3. Holdings pruefen
4. Holdings reservieren
5. Erst DANN: Trade ausfuehren
```
FK-Reihenfolge: Parent INSERT vor Child INSERT. Escrow-Lock VOR Trade-Execution.

## HIGH — RLS & Policies

### Silent Write Failure (Session 255)
Neue Tabelle mit RLS MUSS Policies fuer SELECT + INSERT + UPDATE + DELETE haben.
SELECT-only = Client kann lesen aber NICHT schreiben. KEIN Error, einfach nichts passiert.
```sql
-- IMMER nach Migration ausfuehren:
SELECT policyname, cmd FROM pg_policies WHERE tablename = 'neue_tabelle';
```

### RLS Self-Recursion (Session 87)
Policy die dieselbe Tabelle im Subquery referenziert → infinite recursion → HTTP 500.
```sql
-- FALSCH:
CREATE POLICY "read_own" ON fantasy_league_members
  FOR SELECT USING (league_id IN (SELECT league_id FROM fantasy_league_members WHERE user_id = auth.uid()));

-- RICHTIG: SECURITY DEFINER Helper
CREATE FUNCTION get_my_league_ids() RETURNS SETOF uuid LANGUAGE sql SECURITY DEFINER STABLE
AS $$ SELECT league_id FROM fantasy_league_members WHERE user_id = auth.uid(); $$;
```

### Cross-User Read Policies (Session 86, B3 Transactions)
Feed/Social-Tabellen die Cross-User-Reads brauchen: IMMER zwei SELECT-Policies.
1. `own-all` — User sieht alles eigene
2. `public-whitelist` — Andere User sehen nur safe Types (`type = ANY(ARRAY['buy','sell'])`)

## MEDIUM — Service Layer

### Error-Swallowing (Session 89, Tickets Pop-In)
```typescript
// FALSCH: React Query cached null als SUCCESS → kein Retry → 30s Skeleton
if (error) { console.error(prefix, error); return null; }

// RICHTIG: Throw → React Query retried 3x mit Backoff
if (error) { logSupabaseError(prefix, error); throw new Error(error.message); }
```
**Audit:** `grep -rn 'if (error).*return null' src/lib/services/` — ~10 Services noch betroffen.

### camelCase/snake_case Mismatch (Session 89, Mystery Box)
RPC returned `jsonb_build_object('rewardType', ...)` (camelCase).
Service castet `data as { reward_type: ... }` (snake_case) → ALLE Felder undefined.
TypeScript faengt das NICHT weil `as` unchecked ist.
**Check:** RPC Return-Shape (pg_get_functiondef) gegen Service-Cast vergleichen.

### .single() vs .maybeSingle() (Session 61)
`.single()` wirft HTTP 406 wenn 0 Rows. Wenn der Datensatz nicht GARANTIERT existiert → `.maybeSingle()`.

## LOW — Migration Patterns

### UUID ::TEXT Cast (Session 93)
`::TEXT` auf UUID beim INSERT erzeugt Typ-Mismatch. Column-Type respektieren.

### NOT NULL Spalte vergessen (Session 93)
INSERT Statement muss ALLE NOT NULL Columns ohne DEFAULT enthalten. Check: `\d tabelle` vor INSERT.

### Migration Reihenfolge
Immer: CREATE TABLE → CREATE INDEX → CREATE FUNCTION → CREATE POLICY → GRANT.
Nie: Function vor Table (Referenz-Fehler).
