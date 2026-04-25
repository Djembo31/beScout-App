---
name: BeScout Code Patterns
description: Top 20 etablierte Patterns aus dem Codebase. Quellen CLAUDE.md, common-errors.md, ui-components.md, database.md, trading.md.
type: reference
tags: [reference, pattern]
---

# BeScout Code Patterns

> Top 20 etablierte Patterns aus dem Codebase.
> Quellen: CLAUDE.md, common-errors.md, ui-components.md, database.md, trading.md

---

### 1. Service Layer
**Wann:** Jeder Datenzugriff (lesen oder schreiben).
**Wie:** Component ruft Service-Funktion auf, Service ruft Supabase auf. NIE Supabase direkt in Components.
```
Component → useQuery(qk.foo, () => fooService.getAll())
           → Service Function → supabase.from('table').select(...)
```
**Warum:** Zentralisiert DB-Logik, erleichtert Testing, verhindert RLS-Bugs in Components.

### 2. Query Key Factory
**Wann:** Jede React Query Definition.
**Wie:** IMMER `qk.*` Factory aus `@/lib/queryKeys` nutzen.
```typescript
// RICHTIG
useQuery({ queryKey: qk.holdings(userId), queryFn: ... })
// FALSCH — Invalidation funktioniert nicht
useQuery({ queryKey: ['holdings', userId], queryFn: ... })
```
**Warum:** Raw Keys verhindern korrekte Invalidation. 5 orphaned Keys in Session 241 gefunden.

### 3. Loading Guard vor Empty Guard
**Wann:** Jede Component die async Daten darstellt.
**Wie:** Loading-State VOR Empty-State pruefen.
```typescript
if (isLoading) return <Loader2 className="animate-spin" />
if (!data || data.length === 0) return <EmptyState />
return <DataView data={data} />
```
**Warum:** Ohne Loading Guard wird kurz der Empty-State geflasht bevor Daten da sind.

### 4. Hooks vor Early Returns
**Wann:** JEDE React Component.
**Wie:** Alle useState, useEffect, useQuery etc. VOR dem ersten `if (...) return`.
```typescript
function MyComponent({ id }: Props) {
  const { data, isLoading } = useQuery(...)  // ERST alle Hooks
  const [state, setState] = useState(false)

  if (isLoading) return <Loading />           // DANN early returns
  if (!data) return <Empty />
}
```
**Warum:** React Rules of Hooks — Hooks muessen bei jedem Render in gleicher Reihenfolge aufgerufen werden.

### 5. Null-Safe Closures
**Wann:** Async Callbacks die auf User-Daten zugreifen.
**Wie:** `user.id` VOR dem async Call in lokale Variable snapshotten.
```typescript
const handleAction = async () => {
  const uid = user.id  // Snapshot VOR async
  const result = await someService.doThing(uid)
  await invalidateQueries(qk.holdings(uid))
}
```
**Warum:** `user` kann sich waehrend async-Ausfuehrung aendern (Logout, Re-Auth).

### 6. Optimistic Updates
**Wann:** User-Aktionen die sofort visuell reagieren sollen (Votes, Follows, Toggles).
**Wie:** State VOR async Operation capturen, bei Fehler reverten.
```typescript
const prev = data
setData(optimisticValue)
try {
  await service.update(...)
} catch {
  setData(prev)  // Revert
  toast.error('Fehler')
}
```
**Warum:** UX fuer schnelle Interaktionen, keine Wartezeit.

### 7. Tab-gated Queries
**Wann:** Tabs mit eigenen Datenquellen.
**Wie:** `enabled` auf aktiven Tab beschraenken.
```typescript
useQuery({
  queryKey: qk.playerStats(id),
  queryFn: () => getPlayerStats(id),
  enabled: activeTab === 'stats',  // Nur wenn Tab aktiv
})
```
**Warum:** Market-Page von 10 auf 4 initiale Queries reduziert (Session 212).

### 8. Fire-and-Forget Stats
**Wann:** Nach User-Aktionen die Gamification-Stats triggern.
**Wie:** Async Chain ohne await im Hauptfluss.
```typescript
// Nach erfolgreichem Trade:
refreshUserStats(uid).then(() => checkAchievements(uid))
```
**Warum:** Stats/Achievements duerfen UX nicht blockieren. DB-Triggers machen den Rest.

### 9. Escrow Pattern
**Wann:** Offers und Bounties (Geld muss gesperrt werden).
**Wie:** Lock → Insert → bei Fehler: Unlock.
```
1. Check wallet balance (available = balance - locked)
2. Lock amount in locked_balance (FOR UPDATE)
3. Insert record
4. On insert failure → unlock amount (Rollback)
```
**Warum:** Verhindert Double-Spending, atomare Transaktion.

### 10. REVOKE Pattern
**Wann:** Neue RPCs die nicht direkt vom Client aufgerufen werden sollen.
**Wie:** REVOKE von allen 3 Rollen.
```sql
REVOKE EXECUTE ON FUNCTION my_rpc FROM PUBLIC, authenticated, anon;
-- Wrapper-Funktion mit auth.uid() erstellen
```
**Warum:** Supabase hat 3 Rollen — ALLE muessen revoked werden. `PUBLIC` allein reicht nicht.

### 11. FK Join Cast
**Wann:** PostgREST FK-Joins die TypeScript-Typen brechen.
**Wie:** Double Cast ueber `unknown`.
```typescript
const club = row.clubs as unknown as DbClub
```
**Warum:** PostgREST returned FK-Joins als verschachtelte Objekte, TS inferred falsch.

### 12. Floor Price Berechnung
**Wann:** Anzeige von Spieler-Preisen auf Market/Portfolio.
**Wie:** Client-seitig MIN aus offenen Sell-Orders berechnen.
```typescript
const floorPrice = sellOrders.length > 0
  ? Math.min(...sellOrders.map(o => o.price))
  : player.ipo_price
```
**Warum:** Per-Player DB Query waere zu teuer. `ipo_price` als Fallback wenn keine Orders offen.

### 13. Post-Trade Refresh
**Wann:** Nach Trade/IPO-Kauf/Offer-Annahme.
**Wie:** Nur Holdings + Orders refetchen, NIE alle Spieler.
```typescript
const [hlds, orders, offers] = await Promise.all([
  getHoldings(uid), getAllOpenSellOrders(), getIncomingOffers(uid),
])
setPlayers(prev => enrichPlayers(prev, orders, hlds))
```
**Warum:** Lightweight Refresh statt Full-Page-Reload. Floor Price wird client-seitig neu berechnet.

### 14. Full-Screen Picker
**Wann:** Auswahl-Listen mit mehr als 10 Items.
**Wie:** Fixed overlay statt Bottom-Sheet.
```tsx
<div className="fixed inset-0 z-50 bg-[#0a0a0a] flex flex-col">
  <div className="sticky top-0 ...">Header + Search</div>
  <div className="flex-1 overflow-y-auto divide-y divide-white/[0.06]">
    {items.map(item => <button className="w-full min-h-[44px] ..." />)}
  </div>
</div>
```
**Warum:** Bottom-Sheets skalieren nicht fuer lange Listen auf Mobile.

### 15. Card Surface Pattern
**Wann:** Jede Card-Komponente im Dark Mode.
**Wie:** Exakte Design-Tokens einhalten.
```tsx
<div className="bg-white/[0.02] border border-white/10 rounded-2xl"
     style={{ boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.06)' }}>
```
**Warum:** Konsistentes Dark-UI. Min 5% opacity fuer sichtbare Surfaces.

### 16. Mobile Tab-Bar
**Wann:** Tabs auf Mobile-Screens.
**Wie:** `flex-shrink-0` + `overflow-x-auto`.
```tsx
<div className="flex overflow-x-auto scrollbar-hide gap-2">
  {tabs.map(tab => (
    <button key={tab} className="flex-shrink-0 min-h-[44px] px-4 ...">
      {tab}
    </button>
  ))}
</div>
```
**Warum:** `flex-1` bricht auf iPhone (Tabs werden abgeschnitten). Max ~5 Zeichen pro Label.

### 17. Supabase maybeSingle
**Wann:** Optionale Lookups (Profil, Wallet, Settings).
**Wie:** `.maybeSingle()` statt `.single()`.
```typescript
const { data } = await supabase
  .from('profiles')
  .select('*')
  .eq('id', userId)
  .maybeSingle()  // Gibt null bei 0 Rows statt 406 Error
```
**Warum:** `.single()` wirft 406 bei 0 Rows. `.maybeSingle()` gibt null zurueck.

### 18. i18n mit next-intl
**Wann:** Jeder user-sichtbare String.
**Wie:** `useTranslations` Hook + `t()` Funktion.
```typescript
const t = useTranslations('market')
return <h1>{t('title')}</h1>
// messages/de.json: { "market": { "title": "Marktplatz" } }
// messages/tr.json: { "market": { "title": "Pazar" } }
```
**Warum:** DE + TR Support. Cookie `bescout-locale` steuert Sprache.

### 19. Geld als BIGINT Cents
**Wann:** JEDE Geld-Operation (Wallet, Trading, Fees).
**Wie:** Intern als Integer-Cents, nur bei Anzeige formatieren.
```typescript
// 10,000 $SCOUT = 1,000,000 cents
const priceInCents = 1_000_000
// Anzeige:
fmtScout(priceInCents)  // "10,000 $SCOUT"
```
**Warum:** Floating-Point-Fehler bei Geldbetraegen vermeiden. DB-Typ ist BIGINT.

### 20. PlayerPhoto Component
**Wann:** JEDE Spieler-Bild-Anzeige.
**Wie:** Shared Component mit korrekten Props.
```tsx
import { PlayerPhoto } from '@/components/player/index'

<PlayerPhoto
  first={player.first_name}   // NICHT firstName
  last={player.last_name}     // NICHT lastName
  pos={player.position}
/>
```
**Warum:** Einheitliches Fallback-Verhalten, Positions-Farben, Image-Optimierung. NIE inline `<img>` mit eigenem Fallback.

### 22. RPC-Rename via Alias-Pattern (Null-Downtime)
**Wann:** Postgres-Funktion umbenennen ohne Downtime (besonders fuer Cron-kritische RPCs).
**Wie:** Dreistufig — Create → Deploy → Drop.
```sql
-- Schritt 1: Neue Funktion mit neuem Namen (identischer Body)
CREATE OR REPLACE FUNCTION buy_player_sc(p_buyer_id uuid, ...)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  -- identischer Body, DPC→SC in Strings
END;
$$;
GRANT EXECUTE ON FUNCTION buy_player_sc TO authenticated;

-- Alte Funktion = duenner Alias-Wrapper
CREATE OR REPLACE FUNCTION buy_player_dpc(p_buyer_id uuid, ...)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  RETURN buy_player_sc(p_buyer_id, ...); -- delegiert
END;
$$;
GRANT EXECUTE ON FUNCTION buy_player_dpc TO authenticated; -- identische Grants
```
**Phase 2:** Code-Deploy — Caller migrieren auf neuen Namen.
**Phase 3:** Nach 1-2 Sessions Verify → `DROP FUNCTION buy_player_dpc` in separater Migration.
**Warum:** Reversibel, Null-Downtime zwischen Migration-Apply und Code-Deploy. Kritisch wenn Cron-Jobs oder externe Callers nicht atomar mit DB-Migration deploybar sind.

### 23. Bulk-Sanitize via regex_replace + pg_get_functiondef
**Wann:** Viele RPC-Funktionen haben String-Literals (RAISE, description) die umbenannt werden muessen ohne Signatur-Aenderung.
**Wie:** `pg_get_functiondef` lesen, `regex_replace` mit Word-Boundary anwenden.
```sql
-- Word-Boundary \y schuetzt lowercase Identifier (dpc_amount bleibt unberuehrt)
-- DPCs vor DPC replacen (Greedy-Matching: laengeres Pattern zuerst)
CREATE OR REPLACE FUNCTION my_rpc(...)
RETURNS ... AS $$
  -- Body mit regex_replace(original_body, '\yDPCs\y', 'SCs', 'g')
  -- dann:     regex_replace(result,        '\yDPC\y',  'SC',  'g')
$$;

-- Verify nach Migration:
SELECT proname FROM pg_proc
WHERE proname IN ('accept_offer', 'buy_from_market', ...)
  AND prosrc LIKE '%DPC%'; -- sollte 0 Rows liefern
```
**Warum:** Gesammelte Migration (1 statt 14) = weniger Registry-Eintraege. `\y` = PostgreSQL Word-Boundary Regex-Operator (schuetzt `dpc` in Variablen/Columns). Kein Caller-Code muss angepasst werden (nur Strings im Body, nicht Signatur).

### 21. Realtime + React Query (Live Feed Pattern)
**Wann:** Live-Updates auf Listen (Following Feed, Notifications, Chat, Leaderboards).
**Wie:** Subscribe auf INSERT/UPDATE via `supabase.channel()`, bufferRef-Counter mit Throttle-Timer (first-event-starts-window), bei User-Aktion `invalidateQueries` — `keepPreviousData` ist global default, also flicker-frei.
```typescript
// Voraussetzungen (einmalig pro Tabelle, Migration):
ALTER TABLE public.foo REPLICA IDENTITY FULL;
ALTER PUBLICATION supabase_realtime ADD TABLE public.foo;

// Hook-Pattern (src/lib/queries/social.ts: useFollowingFeed):
useEffect(() => {
  if (!userId) return;
  const bufferRef = { count: 0 };
  let timer: ReturnType<typeof setTimeout> | null = null;

  const channel = supabase
    .channel(`foo-${userId}`)
    .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'foo' }, (payload) => {
      // WICHTIG: RLS filtert serverseitig — kein client filter noetig wenn
      // SELECT-Policy prazise genug ist. Nur own-event Skip falls relevant.
      const row = payload.new as { user_id?: string };
      if (row.user_id === userId) return;

      bufferRef.count += 1;
      if (timer === null) {
        // Throttle (NICHT debounce): first event starts window, burst events
        // buffern ohne timer reset — sonst feuert Window bei stetigen Events nie.
        timer = setTimeout(() => {
          setPendingCount((c) => c + bufferRef.count);
          bufferRef.count = 0;
          timer = null;
        }, 2000);
      }
    })
    .subscribe();
  return () => { if (timer) clearTimeout(timer); supabase.removeChannel(channel); };
}, [userId]);
```
**Warum:**
- **Supabase Realtime respektiert RLS** → ein sauberer cross-user SELECT-Policy ersetzt clientseitige Filter. Getestet 2026-04-08 mit `activity_log` Feed-Policy (user_id IN following + action IN FEED_ACTIONS).
- **Throttle statt Debounce** → classic debounce (timer reset bei jedem Event) feuert bei stetigem Traffic nie. Throttle window garantiert max. 1 flush pro window.
- **`queryClient.invalidateQueries` statt `setQueryData`** → Service enriched Rows mit Profile-Joins, rohe Realtime-Payload reicht nicht. `keepPreviousData` ist global default (`queryClient.ts:11`), deshalb flicker-frei ohne extra Opt-in.
- **REPLICA IDENTITY FULL** → nicht strikt noetig fuer INSERT-only, aber Best-Practice fuer Publication-Tabellen (UPDATE/DELETE-Events brauchen volle alte Row).

### 24. Locale-Resolver fuer DB-Types mit _de/_tr Columns
**Wann:** DB-Typ hat `name_de`/`name_tr`/`description_de`/`description_tr` oder aehnliche locale-Suffix-Pairs.
**Wie:** Helper-Funktion NEBEN dem Type-Def, Grid-Wrapper loest EINMAL auf und reicht `displayName` als Prop durch.
```typescript
// Helper neben Type (nicht im Service-Layer — reiner Display-Concern):
export function resolveEquipmentName(
  def: DbEquipmentDefinition,
  locale: string
): string {
  return (locale === 'tr' ? def.name_tr : def.name_de) ?? def.name_de ?? def.name_key
}

// Grid-Wrapper: einmal aufloesen, als Prop durchreichen
const displayName = resolveEquipmentName(def, locale)
return <EquipmentCard displayName={displayName} />

// NIEMALS direkt im JSX:
// <div>{def.name_de}</div>  ← TR-User sieht DE-Strings, kein Crash
```
**Audit:** `grep -rn '\.name_de\|\.name_tr\|\.label_tr\|\.title_tr' src/` → alle Treffer brauchen Helper.
**Warum:** 13 direkte Call-Sites entstanden weil Equipment kein Helper hatte → TR sah nur DE. 1 Helper-Fix deckt alle ab.

### 25. Service Error-Contract (throw statt swallow)
**Wann:** JEDER Service-Call der fehlschlagen kann.
**Wie:** Fehler werfen, NICHT `return null` oder `return { ok: false }`.
```typescript
// FALSCH: React Query cached null als SUCCESS, kein Retry, UI bleibt in Skeleton/Empty
if (error) { console.error(error); return null; }

// RICHTIG: React Query retried automatisch (3x backoff)
if (error) { logSupabaseError('getHoldings', error); throw new Error(error.message); }

// RICHTIG fuer i18n-Keys:
throw new Error('handleBuy')  // Consumer resolved via mapErrorToKey + te()

// Best-effort Side-Effects (club-follow, referral, avatar) → separates try/catch:
try { await applyClubReferral(uid) } catch (e) { console.error(e) /* continue */ }
```
**Audit:** `grep -rn 'const { data } = await supabase' src/lib/services/` → ohne error-Destructuring = unsichtbarer Fehler.
**Warum:** 117 Fixes in 61 Services (2026-04-13). `return null` = React Query cached Fehler als leere Daten.

### 26. Data-Fix-Audit-Pattern (Direct-DB-UPDATE via MCP)
**Wann:** Kleiner Data-Cleanup (5-20 Rows) mit klarer Evidenz, kein Code-Change, ohne Migration-File-Overhead.
**Wie:** 7-Phasen-Audit-Trail in `worklog/proofs/<slice>-audit.txt` (Template aus Slice 144e):
```
1. Pre-Fix-Baseline: COUNT + Breakdown-Queries (nach mv_source, nach mapping-state, etc.)
2. Evidence-Tabelle: jeder Row Pre-State vs erwartetem Post-State (markdown-Tabelle)
3. UPDATE-Transaction mit BEGIN/COMMIT + RETURNING
4. Post-Fix-Verify: gleiche Query wie Baseline + Delta-Math ("119 null → 111 null = −8 exakt")
5. FK/Trigger-Safety: alle BEFORE UPDATE triggers dokumentieren, IS-DISTINCT-Guards checken
6. Related-Policy-Respect (z.B. mv_source stale-Guard: kein MV-Overwrite)
7. Backlog-Abgrenzung: was bleibt out-of-scope und warum (neue Slices erzeugen)
```
**Pre-UPDATE-Checks:**
```sql
-- FK + Constraints kennen
SELECT conname, pg_get_constraintdef(oid)
FROM pg_constraint WHERE conrelid = 'public.<table>'::regclass;

-- Trigger-Guards verstehen
SELECT trigger_name, action_timing
FROM information_schema.triggers
WHERE event_object_table = '<table>';
```
**Warum:** Reversibel (z.B. null → X → null), keine Migration-File-Overhead für <20 Rows, aber vollständiger Audit-Trail für Reviewer-Agent. Slice 144e 8-Row-Fix ist Referenz-Template.
**Commit-Prefix:** `fix(data):` damit Proof- + Review-Gates firen (Disziplin statt Schleichweg).

### 28. Ferrari-Blueprint (Mutation-Pattern, Slices 151a → 159)
**Wann:** JEDE neue client-side Mutation — Money-Path, Data-Integrity, Auth. Ersetzt Anti-Pattern A (`if (loading) return; setLoading(true)`) und B (kein Guard).
**Wie:** `useSafeMutation` mit strukturiertem Lifecycle:
```typescript
const mut = useSafeMutation<TData, Error, TVariables, TContext>({
  mutationFn: async (vars) => {
    const result = await service(vars);
    if (!result.success) throw new Error(result.error ?? 'generic');
    return result;
  },
  onMutate: async (vars) => {
    // Snapshot + Optimistic — nur deterministische Felder (cross-user = skip).
    const key = qk.x(uid);
    await qc.cancelQueries({ queryKey: key });
    const prev = qc.getQueryData<T>(key);
    qc.setQueryData(key, (old) => derive(old, vars));
    return { prev };
  },
  onError: (err, vars, ctx) => {
    // Phantom-Rollback-Fix: wenn snapshot undefined war, removeQueries (nicht setQueryData(undefined)).
    if (ctx?.prev !== undefined) qc.setQueryData(key, ctx.prev);
    else qc.removeQueries({ queryKey: key });
    // Optional: Toast-Routing, showError(err), consumer-specific error-mapping.
  },
  onSuccess: (result, vars) => {
    // Server-Truth: setWalletBalance, invalidateTradeQueries, etc.
    if (result.new_balance != null) setWalletBalance(qc, uid, result.new_balance);
    qc.invalidateQueries({ queryKey: qk.x(uid) });
  },
  onSettled: () => {
    // pgBouncer Read-After-Write: Wallet nach commit-window invalidaten.
    invalidateWallet(qc);
  },
  errorTag: 'domain.action',  // Sentry-Breadcrumb via logSilentCatch
});

// Consumer:
<Button onClick={() => mut.safeTrigger(vars)} disabled={mut.isPending} />
```
**Warum:**
- **Race-Safety:** `safeTrigger` liest synchron `mut.isPending` aus MutationObserver — rapid-click short-circuitet im selben Render-Frame. Keine stale-closure-race.
- **pgBouncer-Safety:** `onSettled invalidateWallet(qc)` triggert Refetch NACH Commit-Window (Slice 152c HIGH-1).
- **Observability:** `errorTag` → `logSilentCatch` → Sentry-Breadcrumb. Money-Path MUSS gesetzt sein.
- **Phantom-Rollback-Fix (153a Finding #1):** Bei undefined-Snapshot (keine cache-row vorher) muss `removeQueries` statt `setQueryData(undefined)` — sonst bleibt optimistic-Wert im Cache.
- **Consumer-Kompat:** Wrapper-Methoden koennen `async => Promise<void>` bleiben via `try { await mut.mutateAsync(...) } catch {}` (156 useLineupSave-Pattern). Oder direkt `mut.safeTrigger(...)` bei fire-and-forget UI (159).

**Blueprint-Referenzen (Money-Path):**
- `src/features/market/mutations/trading.ts` (153a) — 4 Hooks, Optimistic auf holdings-qty
- `src/components/player/detail/hooks/usePlayerTrading.ts` (153b) — 7 Handler
- `src/features/fantasy/hooks/useEventActions.ts` (156) — 3 Handler, kein Optimistic, RPC-Migration P2.3
- `src/features/market/components/portfolio/useOffersState.ts` (157) — 4 Handler, cross-user-transfer
- `src/features/manager/components/kader/KaderSellModal.tsx` (158) — 2 Handler, thin-wrapper-Modal

**Blueprint-Referenzen (Data-Integrity):**
- `src/components/community/ReportModal.tsx` (159) — 1 Handler
- `src/components/community/PostReplies.tsx` (159) — 3 Handler, per-Row pending via `mut.variables.replyId`
- `src/components/fan-wishes/FanWishModal.tsx` (159) — 1 Handler
- `src/components/community/hooks/useCommunityActions.ts` (162) — Vote-Handler mit Optimistic + full snapshot rollback (prevPosts + prevVotes)
- `src/components/player/detail/hooks/usePlayerCommunity.ts` (162) — Vote-Handler ohne Optimistic
- `src/components/fantasy/EventCommunityTab.tsx` (162) — inline Vote-Handler
- `src/components/fantasy/LeaguesSection.tsx` (161) — 3 Mutation-Modals (create/join/leave)
- `src/components/missions/MissionBanner.tsx` (161) — per-Row claim via `mut.variables.missionId`
- `src/components/fantasy/CreatePredictionModal.tsx` (163) — 2 Mutations im selben Component (create + loadPlayers)

**Blueprint-Referenzen (Bug-Class-Fix):**
- `src/lib/services/posts.ts` (160) — Service-Side-Effect-Guard via `isToggleOff`-Param (Mission/Notification/Activity-Log skip bei Toggle-Off, verhindert Upvote-Unvote-Exploit)

**Scope-Entscheidungen:**
- **Kein Optimistic** bei cross-user-transfer (P2P-Offers, Event-Entry) — server-truth via invalidate reicht.
- **setError/setSuccess-Clear** im Wrapper VOR `mutateAsync` nur wenn kein `onMutate`-Snapshot (158 KaderSellModal). Sonst gehoert der Clear in onMutate.
- **invalidateWallet defensive** bei allen Money-Path-adjacent Handlern (auch reject/cancel/leave), auch wenn Current-User-Wallet nicht touched — 1 extra Refetch akzeptabel vs Race-Gap.

**Konventionen (Session 2026-04-23 codifiziert, Slices 159-163):**

- **`useQueryClient()` Hook > Singleton `queryClient`.**
  Grund: Testbarkeit (Test-Mock ohne File-Level-Singleton-Patch), konsistente Hook-API im Component, zukünftige React-19-Kompatibilität. Singleton `queryClient` aus `@/lib/queryClient` ist **nicht** verboten (same instance via QueryProvider, funktional identisch), aber Hook-Variante ist Default für neue Slices. Slice 161+162 haben Singleton geerbt — separater Cleanup-Slice kann migrieren. Slice 163 wählt Hook als Ankerpunkt.

- **Multi-Mutations im selben Component = distinct `useSafeMutation`-Instanzen.**
  Grund: Scope-distinct `errorTag` pro Mutation (Sentry-Breadcrumb-Identifizierung), per-Mutation `isPending`, kein conditional-switch in mutationFn. Beispiel: `CreatePredictionModal` hat `createPredictionMut` + `playersForFixtureMut` (Slice 163). Anti-Pattern: 1 Mutation mit internem `if (mode === 'create') ... else ...`.

- **Forward-Ref `handleClose`/`reset` im onSuccess ist Closure-Safe.**
  Grund: JS-Closure-Scoping resolvt at-call-time. Der `onSuccess`-Callback feuert erst bei Mutation-Success (async nach RPC), zu dem Zeitpunkt ist der `const handleClose` im Function-Scope bereits definiert. Kein Temporal-Dead-Zone-Problem (nur bei `let` oder hoisted-functions). Slice 163 Bestätigung. Lesbarkeit > Semantik: `handleClose`/`reset` können optional vor den Mutations platziert werden, ist aber nicht zwingend.

- **Consumer-Handler-Signatur ist synchron.**
  `const handleX = (vars) => void mut.safeTrigger(vars)` — nicht `async`. Die Mutation läuft async im MutationObserver. Tests müssen `act() + waitFor()` statt `await handleX(...)` nutzen. Slice 162 Test-Migration (7 Tests umgebaut).

- **Modal-gescopte Mutation → `preventClose` Pflicht.**
  Wenn ein Modal eine Mutation owned (intern oder via Parent-Prop), MUSS `<Modal preventClose={<mut>.isPending}>` gesetzt sein. Sonst schliesst ESC/Backdrop-Click das Modal mid-Mutation — die Mutation läuft weiter im Background, `onSuccess` setzt State auf weg-gecleartes Modal, UI-Desync.
  - Für intern-useSafeMutation: `preventClose={createMut.isPending}` etc.
  - Für Parent-controlled loading prop: `preventClose={loading}` (parent garantiert RPC-only-pending).
  - Für Per-Row pending: `preventClose={submitting === bounty.id}` oder analog.
  - **Anti-Pattern (Slice 159 Blueprint-Gap):** ReportModal + FanWishModal hatten `useSafeMutation` mit `mut.isPending` am Button aber **ohne preventClose** am Modal. In Slice 166 nachgezogen (13-Modal-Sweep).
  - Siehe auch `common-errors.md §5 "Modal preventClose Pattern"` (J2+J3) + `common-errors.md §8 "Grep-Audit-Scope-Gap"` (Audit-Methodik).

**Decision-Reference:** `memory/decisions.md` D21 (ARCHITECTURE).
**Error-Class-Reference:** `.claude/rules/common-errors.md` §5 D18 (React setState Race).
**Test-Pattern-Reference:** `.claude/rules/testing.md` Abschnitt "useSafeMutation Test-Patterns".

### 27. Signal-Only-UPDATE (hart-kodierte Feld-Auswahl)
**Wann:** Side-Effect-Route die NUR einen Timestamp/Heartbeat setzen soll, andere Fields nicht tangieren darf.
**Wie:** Hart-kodiertes Objekt-Literal mit exakt dem einen Feld — kein spread, kein merge:
```typescript
// Transfer-detected ohne --allow-transfers: signalisiert "TM kennt Player noch",
// darf aber club_id/shirt/MV NICHT überschreiben (= Transfer-Apply durch Hintertuer)
await supabase.from('players')
  .update({ last_squad_check: now })  // Nur 1 Feld, hart-kodiert
  .eq('id', existing.id);
continue;  // kein Fall-through zum Multi-Field-UPDATE

// FALSCH:
const updates = { last_squad_check: now, ...anderes };  // spread öffnet Hintertuer
```
**Warum:** Signal-Writes müssen VOR Early-Exit-Gates in Sammel-Loops stehen — sonst silent data-loss. Slice 144c Integrity-Math: 2841 matched − 225 early-continue = 2616 populated → 225 Players unsichtbar für Retired-Detection.
**Kontext:** Slice 144c (tm-squad-scraper early-continue vor last_squad_check-Write).

### 28. Function-Wrap: Find-Handler-End-First (Slice 175b Lesson)
**Wann:** Bei Wrap eines existing top-level Handler-Exports (z.B. `export async function GET(req)` → `withLogger('route', async (req) => {...})`) in grosser File mit Helper-Functions.
**Wie:**
1. Finde Handler-Start: `grep -n "^export (async )?function GET\|^export const GET" <file>`
2. **Finde Handler-ENDE explizit** — nicht das File-Ende:
   ```bash
   grep -nE "^(export |async function |function |const |type |interface )" <file>
   ```
   Die Zeile VOR der naechsten Top-Level-Declaration ist das Handler-Closing-`}`.
3. Erst dann: 3 Edits parallel (Import + Signatur-Ersetzung + Closing-brace an **richtiger** Stelle).
**Warum:** Gross-Files haben helper-Functions nach dem Handler. Closing-`}` am File-Ende ist nicht-Handler-end sondern helper-closing. Ohne Find-End-First: falsch-gewrappter Handler + tsc-error "' expected".
**Evidenz Slice 175b:** gameweek-sync GET endet Zeile 334 (`}`), File-Ende Zeile 1738 ist syncLeague-helper-Close. Initial wrap at 1738 → tsc-break. Re-correct auf Zeile 334.
**Kontext:** Slice 175b (withLogger-Batch 15 API-Routes, 1738-Zeilen gameweek-sync gefangen).

### 29. Trigger+GUC-Invariant-Enforcement (Slice 179+189, codifiziert D39)

**Wann:** DB-Level Invariant, die von mehreren unabhaengigen Code-Pfaden (Scripts, Crons, RPCs, manuelle SQL via MCP) potenziell verletzt werden kann. Bulk-Migrations sollen kontrolliert bypassbar sein. Reine Code-Guards oder CHECK-Constraints reichen nicht (siehe D39 Alternativen).

**Wie:**

```sql
-- 1. Trigger-Function mit 3 Phasen:
CREATE OR REPLACE FUNCTION public.prevent_<invariant_violation>()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  -- Phase 1: Escape-Hatch (bulk-imports, migrations)
  IF current_setting('bescout.allow_<feature>', true) = 'true' THEN
    RETURN NEW;
  END IF;

  -- Phase 2: NULL-Guards — skip wenn Daten incomplete (kein Fehler, kein Block)
  IF NEW.critical_field IS NULL THEN RETURN NEW; END IF;

  -- Phase 3: Invariant-Check mit RAISE EXCEPTION
  IF <violation_condition> THEN
    RAISE EXCEPTION '<invariant_key>: <human msg>'
      USING ERRCODE = 'unique_violation';
  END IF;

  RETURN NEW;
END;
$$;

-- 2. Trigger-Registration:
DROP TRIGGER IF EXISTS <trigger_name> ON public.<table>;
CREATE TRIGGER <trigger_name>
  BEFORE <INSERT|UPDATE|DELETE> ON public.<table>
  FOR EACH ROW
  EXECUTE FUNCTION public.prevent_<invariant_violation>();

-- 3. COMMENT mit Bypass-Dokumentation (Pflicht):
COMMENT ON FUNCTION public.prevent_<invariant_violation>() IS
  'Slice <N>: <purpose>. Bypass: SET LOCAL bescout.allow_<feature> = true.';
```

**Bulk-Import-Bypass:**
```sql
BEGIN;
SET LOCAL bescout.allow_<feature> = 'true';
-- ... legitimate bulk-work (CSV-Import, manuelle Data-Migration) ...
COMMIT;
```

**Warum GUC statt Trigger-DROP:** `SET LOCAL` ist transaction-scoped + thread-safe ohne DDL-Overhead. Temp-DROP + Re-CREATE oeffnet Race-Window fuer concurrent Writes.

**Warum BEFORE statt AFTER:** BEFORE-Row-Trigger blockt Insert/Update PRE-Write — keine Rollback-Kosten, keine partial Writes bei Cascade.

**Test-Suite (4 Pflicht-Cases):**
1. Same-class violation raises expected Error.
2. Cross-class violation raises expected Error (falls Invariant cross-row ist).
3. Positive-Case (legitimer Insert/Update) durchlaeuft ohne Error.
4. GUC-Bypass durchlaeuft Violations ohne Error.

**Empirische Evidenz (2 Iterationen):**
| Slice | Invariant | Trigger-Typ | GUC-Namespace |
|-------|-----------|-------------|---------------|
| 179 (D28) | transactions append-only | BEFORE UPDATE/DELETE | `bescout.allow_transactions_mutation` |
| 189 (heute) | players ghost-row-prevention (INV-39/40) | BEFORE INSERT | `bescout.allow_player_ghost_insert` |

Pattern reproduziert: stable, fast (BEFORE-Row-Trigger mit EXISTS-Subquery), kein Race-Risk, copy-paste-template bewaehrt.

**Kandidaten fuer weitere Anwendung:** `trades` (append-only analog transactions), `activity_log` (append-only), `holdings_history` (bei Einfuehrung), `audit_log` (bei Einfuehrung).

**Decision-Reference:** `memory/decisions.md` D39 (ARCHITECTURE, 2026-04-24).
**Error-Class-Reference:** `.claude/rules/errors-db.md` Section "Transactions Append-Only" + "Ghost-Prevention Trigger" (Slice 189).

### 30. Defense-in-Depth fuer Silent-Fails (4-Layer-Standard, Slice 192/193, codifiziert D41)

**Wann:** Silent-Fail-Klasse wo eine Datenpfad-Komponente NULL/leer/falsch produziert und downstream Defaults stille Geister-Daten schaffen. Single-point-Fix ist nicht ausreichend.

**Wie (4 Pflicht-Layer):**

```
Layer 1: Type-Truth         — Service-Type matched RPC-Return-Shape (kein luegender Cast)
Layer 2: Service-Filter     — Service filtert kaputte Daten + logSilentCatch
Layer 3: Mapper-Throw       — Mapper wirft i18n-key statt silent-default
Layer 4: Tests              — Unit-Tests fuer jeden Layer-Branch
```

**Empirische Anwendung (Slice 192 Holdings-NULL-Player):**

| Layer | Code | Effekt |
|-------|------|--------|
| 1 | `MarketUserDashboard.holdings: DbHolding[]` (war fehlerhaft `HoldingWithPlayer[]`) | Type sagt Wahrheit ueber RPC-Shape |
| 2 | `getHoldings` filter `player == null` + `logSilentCatch` + all-ghost throw | Service liefert NIE kaputte Daten downstream |
| 3 | `dbHoldingToUserDpcHolding` throws `ghost_holding_row` bei null-player | Mapper-Bypass laesst keine Ghost-Defaults durch |
| 4 | `holdingMapper.test.ts` (4 Tests) + `getHoldings-ghost-filter.test.ts` (4 Tests) | Regression-Schutz |

Plus **Layer 0 (Slice 193 Erweiterung):** Auth-Gate auf `useHoldings` (`enabled: !!userId && !profileLoading`) verhindert das Race-Window ueberhaupt.

**Anti-Pattern (Slice 192 erste Iteration):** Nur Layer 3 (Mapper-Throw) ohne Layer 1 (Type-Truth). Reviewer-Agent flagged CRITICAL — Cache-Priming-Pfade von OTHER RPCs schreiben in gleichen Cache-Key, Mapper crashed dort sobald getriggert. Single-Layer-Fix wandelte UX-Krankheit in Hard-Crash.

**Test-Coverage-Pflicht:**
- 1 Test pro Layer-Branch
- Edge-Case: alle Daten kaputt (z.B. all-ghost) muss separater Code-Path sein (throw vs filter)
- Mock-Pattern: `vi.mock('@/lib/observability/silentRejects')` mit `vi.fn()` damit Layer-2/3-logSilentCatch-calls assertable sind

**Decision-Reference:** `memory/decisions.md` D41 (ARCHITECTURE, 2026-04-24).
**Error-Class-Reference:** `.claude/rules/errors-db.md` "PostgREST nested-select Auth-Race" (Slice 192/193).
**Test-Pattern-Reference:** `src/features/fantasy/mappers/__tests__/holdingMapper.test.ts`.

### 31. Cache-Priming-Audit (Slice 192 Reviewer-Finding #1, codifiziert D43)

**Wann:** Service X bekommt Filter/Validation-Logic. Bevor du commitest: ALLE Cache-Priming-Pfade audieren die in den gleichen `qk.X.*` Cache-Key schreiben.

**Wie:**

```bash
# Find all priming-paths for a query-key
grep -rn "queryClient.setQueryData(qk\.<key>" src/lib/queries/

# Audit each priming source: liefert es die gleiche Daten-Shape wie das Service?
# Wenn nicht: Type-Truth-Mismatch -> Mapper crashed sobald downstream getriggert.
```

**Empirische Anwendung (Slice 192):**
- Service `getHoldings` (PostgREST) liefert `HoldingWithPlayer[]` mit nested player-JOIN
- RPC `get_market_user_dashboard` liefert `DbHolding[]` ohne JOIN, **aber TS-Cast log** mit `as HoldingWithPlayer[]`
- `primeMarketDashboardCaches` schrieb DbHolding-Daten in `qk.holdings.byUser` Cache
- Mit Slice-192 Mapper-Throw waere `/market -> /fantasy/aufstellen` Hard-Crash gewesen
- Reviewer-Agent (Cold-Context) flagged das als CRITICAL Finding — wurde im REWORK gefixt

**Fix-Pattern (Option C — empfohlen):**
- Type-Truth: Cache-Priming-Path-Type aendern auf echte RPC-Shape
- Wenn Type-Mismatch: NICHT in Cache primen, lass Service eigenen Query laufen
- Doku in JSDoc: "INTENTIONALLY NOT primed — RPC liefert kein nested player-Object"

**Audit-Template (zukuenftiger Sweep):**
```ts
// Pflicht-Hook fuer alle prime*Caches Funktionen:
// 1. Was ist die Shape des Source (RPC return)?
// 2. Was ist die Shape des Target (qk-key consumer)?
// 3. Match? Wenn nein: skip prime, lass Service eigenen Query laufen.
```

**Anti-Pattern:** Blindes `as XYZ[]` Cast in Service ohne `pg_get_functiondef`-Verify. Lie-Cast bleibt latent bis ein neuer Mapper-Throw die Lie aufdeckt.

**Decision-Reference:** `memory/decisions.md` D43 (ARCHITECTURE, 2026-04-24).
**Slice-Reference:** Slice 192 Reviewer-Output `worklog/reviews/192-review.md` Finding #1.

### 32. React-Query enabled-Gate auf profileLoading (Slice 193, Auth-Race-Mitigation)

**Wann:** Query nutzt PostgREST nested-select via Cookie-Auth. Cold-Start-Race kann silent NULL fuer nested rows liefern.

**Wie:**

```ts
// Anti-pattern (race-condition window):
export function useHoldings(userId: string | undefined) {
  return useQuery({
    queryKey: qk.holdings.byUser(userId!),
    queryFn: () => getHoldings(userId!),
    enabled: !!userId,  // <-- feuert bei Cookie-Resume-in-Progress
    ...
  });
}

// Pattern (Slice 193 — gates auf vollstaendige Auth-Hydration):
export function useHoldings(userId: string | undefined) {
  const { profileLoading } = useUser();
  return useQuery({
    queryKey: qk.holdings.byUser(userId!),
    queryFn: () => getHoldings(userId!),
    enabled: !!userId && !profileLoading,  // <-- wartet auf Profile-Load
    ...
  });
}
```

**Effekt:** Holdings-Query feuert erst wenn AuthProvider Profile-Load abgeschlossen hat. JWT ist garantiert hydrated. Eliminiert Race-Window komplett (~50-200ms zusaetzliche Initial-Load-Latenz, akzeptabel).

**Begruendung:** `cachedUser` aus sessionStorage triggert `setUser(u)` sofort, was `useHoldings(userId)` queryFn fired BEVOR `loadProfile(u.id)` Cookie-Token vollstaendig restored hat. PostgREST nested-select scheitert silent in dieser Window.

**Anwendbarkeit:** ALLE Hooks die PostgREST nested-select via Cookie-Auth nutzen. Pattern uebertragbar auf:
- `useWatchlist(userId)` (selektiert player-nested-Daten)
- Andere user-scoped queries die nested PostgREST-JOINs machen

**Performance-Impact:** Initial-Load +50-200ms (warten auf get_auth_state). Akzeptabel weil:
- Slice-193 Timeout reduziert auf 3s (war 10s)
- 3-Query-Fallback robust (Promise.allSettled, max 8s)
- Auth-Race-Symptom (Geister-Rows) ist gravierender als 200ms Latenz

**Decision-Reference:** `memory/decisions.md` D40 (PROCESS Live-Verify) + D41 (Defense-in-Depth).
**Slice-Reference:** Slice 193 Proof `worklog/proofs/193-auth-state-perf.md`.

### 33. Generic Filter-Helper mit Value-Extractor statt Type-Constraint (Slice 197a + 197d)

**Problem:** Filter-Helper soll auf 3+ Item-Shapes laufen (Player.perf.l5, KaderPlayer.player.perf.l5, etc.). Type-Constraint `T extends { perfL5?: number }` zwingt alle Caller in das gleiche Schema, oft mit Adapter-Hacks. Bei parallel-dispatch backend+frontend mit shared Types: tsc-Race wenn Frontend ein Field referenziert das Backend gleichzeitig hinzufuegt.

**Pattern:** Generic-Helper mit Value-Extractor-Lambda als 3. Param.

```ts
export type FormL5Threshold = 0 | 45 | 55 | 65;

export function applyFormL5Filter<T>(
  items: T[],
  threshold: FormL5Threshold,
  getValue: (item: T) => number | null | undefined,
): T[] {
  if (threshold === 0) return items;
  return items.filter(item => (getValue(item) ?? 0) >= threshold);
}

// Caller bestimmen wie sie an den Wert kommen — kein Type-Magic, kein Adapter:
applyFormL5Filter(holdings, formL5, h => h.player.perf.l5);
applyFormL5Filter(players, formL5, p => p.perf.l5);
applyFormL5Filter(watchlistItems, formL5, item => item.perfL5);
```

**Anwendung:**
- Slice 197a: `formL5Filter` mit 3 Konsumenten (MarketFilters, KaderTab, WatchlistView)
- Slice 197d: `mvTrendFilter` analog

**Vorteile:**
- Kein Type-Constraint = keine Type-Magic in Caller-Sites
- Cross-Track-Type-Race komplett umgangen — Helper kennt Player-Type nicht, nur den extrahierten Value
- `getValue` ist required Param (nicht optional) → Anti-Silent-Fallback per `errors-frontend.md`
- Helper isoliert testbar (197d: 11/11 Tests ohne Backend-Dependency)

**Cross-Track-Bridge-Spezialfall:** Wenn Backend gleichzeitig DbX-Type erweitert + Mapper extended, kann Frontend den Helper sofort schreiben (mit `getValue: item => (item as PlayerWithX).x`). Nach Backend-Merge: Cleanup-Pflicht (Augment-Type weg, Cast simplifizieren). Wird sonst Code-Smell.

**Anti-Pattern:** `applyFilter<T extends { perfL5?: number }>(items, threshold)` — zwingt alle Caller in identisches Type-Schema. Schmerzhaft bei nested data-shapes (Holdings hat player.perf.l5, nicht direct).

**Slice-Reference:** Slice 197a Form-L5-Filter universal + Slice 197d MV-Trend-Filter.
