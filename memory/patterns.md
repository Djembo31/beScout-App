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

---

### 34. Worktree-Awareness-Trap bei Worktree-Frontend-Agents (Slice 198, 3/4 Tracks betroffen)

**Symptom:** Frontend-Agent in `agent-XXX`-Worktree edited via absolute path `C:\bescout-app\src\...` (= main-Pfad), nicht via Worktree-Pfad `C:\bescout-app\.claude\worktrees\agent-XXX\src\...`. Agent's `git status` (im Worktree) zeigt clean — Edits sind im main-Repo. Beim Merge-Versuch: Worktree-Branch hat keine Commits, main hat unstaged-Edits.

**Root-Cause:** Agents nutzen Read/Edit/Write mit absoluten Pfaden. Worktree-CWD ist gesetzt, aber wenn Path-Parameter dem main-Repo-Layout folgt (`C:\bescout-app\src\X.tsx`), landen Edits dort.

**Folgen:**
- Worktree-Branch leer, kein clean Merge moeglich
- Main-Repo dirty mit Edits aus N parallel-Tracks (Race-Risk)
- `git checkout` in main (zur Bereinigung) propagiert via Windows-Junction auch zur Worktree → Edits verloren

**Fix-Pattern bei Discovery:**
1. Verify: `diff main-Pfad worktree-Pfad` — wenn Files identisch + main dirty → Trap aufgetreten.
2. Pragmatisch: Re-apply die Edits direkt in main (Track A Slice 198 Approach). Worktree-Branch bleibt leer.
3. Alternative wenn Track noch nicht durchgelaufen: Re-Edit in Worktree-Pfad explizit + commit dort.

**Prevention (Briefing-Update):**
```
Im Agent-Briefing IMMER beilegen:
"WICHTIG: Du arbeitest in einem Worktree. Dein CWD ist
C:\bescout-app\.claude\worktrees\agent-XXX. Alle Edits MUESSEN
Pfade unter diesem Verzeichnis verwenden (oder relative Pfade).
NIEMALS C:\bescout-app\src\... als absoluter Pfad — das ist
main-Repo, nicht dein Worktree."
```

**Empirie Slice 198:** Track A (Brand) — 100% Trap, Re-Apply via main. Track B — clean (worktree-relative). Track C — partial Trap. Track D — clean Working-Tree-Edits aber kein commit (anderes Symptom: Stream-Watchdog-Stop). Trap-Rate: 50% bei Frontend-Agent-Worktree-Dispatch.

**Slice-Reference:** Slice 198 Track A Heal-Cycle.

---

### 35. Threshold-Konstante mit Migration-Source-Reference (Slice 200b, FM-10.1)

**Kontext:** Wenn Frontend-Code Schwellenwerte (Tier-Thresholds, Score-Boundaries, Fee-Tiers, etc.) duplicate, die in einer DB-Migration definiert sind, wird die Konstante mit explicitem Comment auf Migration-File:Line referenziert.

**Pattern:**
```ts
// Slice 200b FM-10.1: Airdrop Tier-Thresholds. Synchron zu
// supabase/migrations/20260417170000_refresh_airdrop_score_trigger_internal.sql:77.
const AIRDROP_TIER_THRESHOLDS: Record<AirdropTier, number> = {
  bronze: 0, silber: 200, gold: 500, diamond: 1000,
};
```

**Begruendung:**
- DB-Migration ist Source-of-Truth fuer Tier-Threshold (DB-Trigger berechnet `tier` server-side).
- Frontend-Konstante ist Spiegel-Wert fuer UI-CTAs ("Brauche X Pkt fuer next Tier").
- Comment macht Drift-Risk explizit: bei Migration-Changes (`silber=300` z.B.) muss Frontend-Konstante mit-aktualisiert werden.
- Vorbild: `errors-db.md` "Money-RPC Pricing-Formel Drift" Pattern (Slice 108).

**Anwendung erweitert auf:**
- Money-Tiers (bereits Slice 108 dokumentiert via test-invariant)
- Score-Boundaries (Airdrop, Fan-Rang, Manager-Score)
- Fee-Caps (CEO-approved values)
- Mission-Threshold-Werte

**Slice-Reference:** Slice 200b FM-10.1 (Airdrop tier-CTA).

---

### 36. Polish-Audit Pre-Existing-Code-Grep (Slice 200a + 200b, codifiziert D48)

**Kontext:** Polish-Sweep-Items aus Punch-List klassifizieren "X fehlt", aber Code im consumed-Hook/parallel-Component löst es bereits. Wenn ohne Pre-Existing-Code-Grep implementiert wird → Duplicate in Production.

**Pattern:**
```bash
# VOR jedem Polish-Item: 30-Sekunden-Sanity-Check
grep -rn "<spec-pattern>" \
  src/features/<domain>/hooks/ \
  src/features/<domain>/services/ \
  src/lib/hooks/ \
  src/components/<domain>/ \
  src/app/\(app\)/<domain>/
```

**Slice-Empirie:**
- **Slice 200a UX-2:** Audit "Buy-Error-Banner auto-dismiss fehlt" — pre-existing 5s setTimeout in `useTradeActions.ts:63-69` seit Slice 161+. Ohne Reviewer-Agent waere Duplicate-useEffect in Production.
- **Slice 200b R-03:** Audit "Manager-Score isoliert fehlt" — pre-existing `'manager'`-Dimension-Tab in `GlobalLeaderboard.tsx:19`. Reviewer-Agent dokumentierte als already-fixed-marker.
- **Trefferquote:** 2 von 9 Polish-Items in Slice 200a+200b waren already-fixed = ~22% Audit-Stale-Rate.

**Decision-Reference:** D48 "Reviewer-Agent als Audit-Stale-Catcher".
**Beziehung:** D45 (Worktree-Awareness) + D46 (Service-Schnittstelle) + D48 = drei Pre-Implementation-Audits.

**Codify:** `errors-frontend.md` "Polish-Audit Pre-Existing-Code-Drift" Pattern (Slice 200a).

**Update Slice 202:** D48 ist im 1. produktiven Einsatz validiert. FM 9.3 TierComparisonMatrix-Implementation: Reviewer-Agent fuhr Pre-Existing-Code-Grep (`grep TierComparison|comparison.*tier|stripe.*matrix` ueber `src/`), ergab **NO duplicate** — kein false-positive, kein Heal-Loop. Die D48-Pflicht-Praxis funktioniert auch fuer greenfield-Components. Audit-Stale-Catcher braucht keine pre-existing matches um wertvoll zu sein — der Verifikations-Schritt ist die Versicherung.

---

### 37. Per-Tier Comparison Matrix mit ExtraKey-Union + Whitelist (Slice 202, FM-9.3)

**Wann:** Wenn Tier-/Plan-/Subscription-Vergleichs-Tabelle gebraucht wird (Founding Pass, Sales-Pakete, $SCOUT-Pricing-Tiers, Equipment-Ranks).

**Pattern:**

```typescript
// 1. Type-Union ueber alle moeglichen Feature-Keys
type ExtraKey =
  | 'founding.extraAccess'
  | 'founding.extraBadge'
  | 'founding.extraIpoEarly';

// 2. Explizit-geordnete Whitelist (nicht dynamic-derived aus Tier-Defs)
//    — fuer UX-konsistente Anzeige-Reihenfolge ueber alle Tiers
const ALL_EXTRAS_ORDERED: ExtraKey[] = [
  'founding.extraAccess',
  'founding.extraBadge',
  'founding.extraIpoEarly',
];

// 3. Stripe-Matrix mit ✓/✗ via includes()-Check
{ALL_EXTRAS_ORDERED.map((extraKey) => (
  <tr key={extraKey}>
    <th scope="row" className="sticky left-0 bg-bg-main">
      {t(extraKey.replace('founding.', '') as 'extraAccess')}
    </th>
    {TIERS.map((td) => (
      <td key={td.tier}>
        {td.extras.includes(extraKey) ? <Check /> : <span>—</span>}
      </td>
    ))}
  </tr>
))}
```

**Mobile-Pflicht:** `overflow-x-auto` + `min-w-[480px]` + `sticky left-0 z-10 bg-bg-main` auf Feature-Spalten-th's. Garantiert horizontal-scroll auf 393px mit lesbaren Feature-Namen.

**Accessibility-Pflicht:** `scope="col"`/`"row"`/`"colgroup"` + `aria-label` auf ✓-Icon und em-dash-Fallback. Tabelle ist screen-reader-tauglich.

**Schema-Drift-Caveat:** ExtraKey-Union + ALL_EXTRAS_ORDERED-Whitelist ist explicit-geordnet, nicht dynamic-derived. Wenn neuer Extra-Key in der Source (z.B. `foundingPasses.ts` `extras`-Array) hinzugefuegt wird, MUSS er auch in:
1. ExtraKey Type-Union ergaenzt werden
2. ALL_EXTRAS_ORDERED-Array hinzugefuegt werden
3. DE+TR i18n-key vorhanden sein

Sonst rendert die neue Feature-Row stillschweigend nicht in der Matrix. **Konvention:** Inline-Comment in `foundingPasses.ts` als Reminder ergaenzen.

**Wiederverwendbar fuer:**
- BeScout Sales-Pakete (Baslangic / Profesyonel / Sampiyon — siehe `business.md`)
- Equipment-Rank-Vergleich (Mystery-Box-Outputs)
- Membership-Tiers (post-Phase-3 Subscription-Modell)

**Reference:** Slice 202 Implementation `src/app/(app)/founding/TierComparisonMatrix.tsx`. Reviewer-Cold-Context PASS, kein Duplicate via D48-Check.

---

### 38. Anonymized RLS-Bypass Aggregate-RPC Series (Slice 014 → 199 → 201b → 201d)

**Wann:** UI braucht aggregierte Daten ueber alle User (Holders-Count, Top-Predictor-Liste, Distribution per Fixture, etc.) ABER:
- RLS auf der Source-Tabelle ist tight (own-rows-only oder admin-only)
- Cross-User-Reads sind privacy-sensitiv (kein user_id-Leak gewollt)
- Frontend braucht aber den Aggregat-Wert (nicht die individuellen rows)

**Anti-Pattern:** RLS lockern oder cross-user-Selects in Frontend. Beides zerschiesst Privacy.

**Pattern (etabliert 2026-04 mit 4 RPCs LIVE):**

```sql
CREATE OR REPLACE FUNCTION public.get_<entity>_<aggregate>(<args>)
RETURNS jsonb           -- discriminated-union Slice 168 Pattern
LANGUAGE plpgsql        -- nicht sql, weil auth.uid() Guard + Variablen
STABLE                  -- read-only
SECURITY DEFINER        -- bypasses RLS
SET search_path TO 'public', 'pg_catalog'
AS $function$
DECLARE
  v_<aggregate> ...;
BEGIN
  -- 1. Auth-Guard (anon-Block)
  IF auth.uid() IS NULL THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'auth_required',
      <empty-aggregate-fields>
    );
  END IF;

  -- 2. Aggregate (kein user_id im Output)
  WITH aggregated AS (...)
  SELECT ... INTO v_<aggregate>;

  -- 3. Discriminated-union Return (Slice 168)
  RETURN jsonb_build_object(
    'success', true,
    <aggregate-fields>
  );
END;
$function$;

COMMENT ON FUNCTION ... IS '<Slice-Ref>: <Purpose>. Anonymized aggregate, SECURITY DEFINER bypasses RLS.';

-- 4. AR-44 REVOKE/GRANT
REVOKE EXECUTE ON FUNCTION ... FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION ... FROM anon;
GRANT  EXECUTE ON FUNCTION ... TO authenticated;
GRANT  EXECUTE ON FUNCTION ... TO service_role;
```

**Service-Wrapper-Pflicht (Slice 168 Pattern):**
```ts
const { data, error } = await supabase.rpc('get_<entity>_<aggregate>', {...});
if (error) throw new Error(error.message);
const result = data as { success: boolean; error?: string; <fields> };
if (!result.success) throw new Error(result.error ?? 'rpc_failed');
return { ...result };  // narrow + return
```

**Live-Beispiele (Q2 2026):**

| RPC | Slice | Use-Case | Output |
|-----|-------|----------|--------|
| `get_player_holder_count(player_id)` | 014 | Holder-Count per Player | INT (legacy, naked-return) |
| `get_top_predictors_leaderboard(limit)` | 199 | Top-Predictor-Leaderboard | jsonb {success, leaderboard:[{handle,tier,hit_rate,total_points}]} |
| `get_most_owned_players_per_club(club_id, limit)` | 199 | Most-Owned-Players | jsonb {success, players:[{player_id,holders_count}]} |
| `get_event_difficulty_score(event_id)` | 199 | Event-Difficulty-Indicator | jsonb {success, difficulty_score, tier} |
| `get_event_captain_distribution(event_id)` | 195e | Captain-Pick-Rate per Event | jsonb {success, distribution:[{captain_slot,pct}]} |
| `get_event_player_pick_rates(event_id)` | 195e | Differential-% per Player | jsonb {success, picks:[{player_id,pct}]} |
| `get_player_holders_concentration(player_id)` | 201b | Top-10 Holders-Concentration | jsonb {success, total_holders, total_supply, top_10_supply, top_10_pct} |
| `get_prediction_consensus(fixture, condition, player?)` | 201d | Prediction-Distribution per Fixture | jsonb {success, total_count, distribution:[{value,count,pct}]} |

**Privacy-Garantien (Anti-Pattern-Vermeidung):**
- KEIN user_id im Output (auch nicht hashed)
- Optional: `handle` + `tier` (semi-anonymous) — explizit Public-Identifier wenn UI das braucht
- Bei <5 Predictions/Holdings: optional Sparse-Disclaimer im UI (nicht im RPC), aber Output-Schema bleibt gleich

**Frontend-Lazy-Load-Pflicht:**
- Bei Per-Row-Aggregat (z.B. Concentration-Bar fuer 100+ Player-Rows): `enabled`-Flag + opt-in pro Row (z.B. nur expanded-View)
- Sonst: 100 RPC-Calls bei Render → DB-Last, Sentry-Spam

**Discriminated-Union > naked-return:** Auch wenn Output nur 1 Skalar-Wert ist, jsonb-Discriminator gibt Service-Layer einheitlichen Cast-Path. `get_player_holder_count` ist Legacy (naked INT) — neue RPCs IMMER discriminated-union.

**Reference:**
- `errors-db.md` "Return-Shape: Discriminated Union Pflicht" (Slice 168)
- `database.md` Migration-Workflow + AR-44
- D43 Type-Truth-Audit-Pflicht
- D48 Reviewer-Agent als Audit-Stale-Catcher

**Kandidaten fuer naechste Aggregate-RPCs (Backlog 2026-04-26 Session-End):**
- FM 5.2 Differential-Sentiment ScoutConsensus (research_post-Aggregat per Player)
- FM 6.2 Trend-Sparkline-Mini-Chart (price_history-Aggregat per Player+Window)
- FM 10.2 Airdrop Personal-Score-History (airdrop_scores-history per User+Period)
- FM 10.3 Airdrop Friends-Filter (cross-user social-graph-restricted)
- K-03 Squad-Tab Fantasy-Pick-Rate (lineups-Aggregat per Player+Event)

---

### 39. Pre-Review-Memo Pattern (Slice 207, codifiziert Slice 211 D50)

**Wann:** Vor jedem Reviewer-Agent-Dispatch bei M/L-Slices oder parallel-Worktree-Slices.

**Was:** Agent (oder Primary-Claude) schreibt **vor** Reviewer-Dispatch ein Self-Audit-Memo nach `worklog/reviews/<slice>-pre-review.md`. Reviewer-Agent kriegt das als zusätzliche Input-File.

**Inhalt-Schema (~10-15 Zeilen):**

```markdown
# Pre-Review-Memo Slice <NNN>

## AC-Self-Audit
| AC | Status | Notiz |
|----|--------|-------|
| AC-01 | grün | tsc clean |
| AC-02 | teils | Edge-Case 3 nicht getestet (out of scope) |
| AC-03 | offen | Reviewer bitte bewerten ob ausreichend |

## Edge-Case-Coverage
- EC-1 null-input: getestet (sparkline-buckets.test.ts:35)
- EC-2 single-day: getestet
- EC-7 timezone-edge: NICHT getestet (test-runner-DST-issue, mitigation: vi.useFakeTimers)

## Self-Verification-Output (audit-commands gelaufen)
- `npx tsc --noEmit`: clean
- `grep -rn "TrendSparkline" src/`: 1 Treffer (Caller in TransactionsPageContent.tsx:445)
- `npx vitest run src/components/transactions`: 10/10 PASS

## Open-Blocks (was Reviewer entscheiden sollte)
- Catmull-Rom vs Linear Path: ich habe Linear gewählt (60px H + 90 buckets — visuell nicht differenzierbar). Spec-Drift dokumentiert. **Reviewer: ist das akzeptabel?**
- Math.min/max(...spread): mit 90-Cap aktuell harmlos, errors-frontend.md sagt aber reduce-pattern. **Reviewer: NIT oder ignore?**

## Bekannte Risiken
- ~ — keine Production-Risks identifiziert
- (oder: Race-Condition, Type-Truth-Drift, etc.)

## Time-Spent
~45 min Implementation + Tests + Self-Audit
```

**Wirkung:** Reviewer-Agent kann sich auf **Blindspots** konzentrieren statt komplettes Audit zu wiederholen. Reduziert Reviewer-Arbeit ~60% laut Slice 207-Erfahrung. Plus: Pre-Review-Memo ist self-Disziplin — der Agent muss SELBST Self-Audit laufen lassen, nicht nur Reviewer hoffen das er catched.

**Anti-Pattern:**
- Pre-Review-Memo "alles gruen" ohne Audit-Output → Performative agreement, kein Wert.
- Pre-Review-Memo nach Implementation als Marketing → Reviewer durchschaut es, dispatch-Vertrauen sinkt.
- Pre-Review-Memo bei XS-Slices mit trivial-Pattern → Overhead > Win, skippen.

**Wann Pflicht?**
- L-Slices mit parallel-Dispatch ≥ 3 Worktrees (Slice 198, 207 als Beispiele)
- Money-Path-Slices (zusätzliche Schicht vor Reviewer-Cold-Context)
- Slices mit Spec-Drift (z.B. Linear statt Catmull-Rom in Slice 208) — Pre-Review-Memo dokumentiert die Drift, Reviewer entscheidet

**Optional:**
- M-Slices mit single-Domain-Agent
- S-Slices mit komplexer Logic (auch wenn 2-3 Files)

**Reference:** Slice 207 Worktree-Heal-Story (3 Probleme aufeinander, Pre-Review-Memo hätte 2 von 3 vorne weg gefangen). Slice 208 Reviewer-CONCERNS A11y-Issue (Pre-Review-Memo hätte den SVG-aria-Konflikt zu spät gefangen, weil A11y-Audit kein Standard-Self-Verification-Command ist — aber zumindest Spec-Drift Catmull-Rom→Linear hätte darin gestanden).

### 40. Service Worker Cache-Strategie: nur Static Assets, niemals authenticated APIs (Slice 259, 2026-04-30)

**Wann:** Bei jedem PWA-Setup mit Service Worker, der für eine App mit User-Auth läuft.

**Wie:**

```js
// public/sw.js
const CACHE_NAME = 'app-vN';

const STATIC_CACHE_PATTERNS = [
  /\/_next\/static\//,
  /\/icons\//,
  // ... cdn-cached, public, JWT-irrelevant
];

self.addEventListener('fetch', (event) => {
  const { request } = event;

  // Navigation: network-first, offline-fallback only
  if (request.mode === 'navigate') { /* network-or-offline */ return; }

  // Static assets: cache-first
  if (STATIC_CACHE_PATTERNS.some((p) => p.test(request.url))) { /* cache-or-network-then-cache */ return; }

  // ALLES ANDERE (incl. Supabase REST, andere authenticated APIs):
  // pass through to network. Browser HTTP-cache + TanStack Query handle
  // caching at the right layers (with JWT-awareness).
  return;
});

// Activate-handler: catch-all-filter
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k)))
    )
  );
  self.clients.claim();
});
```

**Warum NICHT authenticated APIs cachen:**
- Cache API keyed by URL only — Authorization-Header (JWT) ist NICHT Teil des Cache-Keys
- Anon-Response wird nach Login weiter-serviert (User sieht leere Daten beim Erst-Load)
- Cross-User-Pollution möglich: User A's `/rest/v1/wallets?user_id=eq.X` cached → bei User B serviert wenn URL match
- Symptom-Decoder: User-Report "Refresh fixt App-Load" → SW serviert stale Anon-Response → background-fetch füllt Cache → 2. Load fresh
- TanStack Query ist der richtige Layer (JWT-aware via Supabase-Client + per-user query-keys + auth-state-change-Invalidation)

**Cache-Bump-Migration-Pattern (Standard bei Breaking-SW-Changes):**
- `CACHE_NAME = 'app-vN' → 'app-vN+1'`
- Activate-handler `keys.filter(k => k !== CACHE_NAME)` (catch-all, KEIN Whitelist) evicts ALLE legacy Caches reliably inkl. uncoupled API-Caches
- `skipWaiting()` + `clients.claim()` für sofortigen Takeover (Update-Race kostet 1 Reload bei existing Tabs)

**Detection von Cache-Pollution:**
```js
// In Chrome DevTools Console gegen Production:
const cacheNames = await caches.keys();
let suspicious = 0;
for (const name of cacheNames) {
  const cache = await caches.open(name);
  const requests = await cache.keys();
  suspicious += requests.filter(r => r.url.includes('supabase.co/rest/v1')).length;
}
console.log({cacheNames, cached_authenticated_requests: suspicious});
// Wenn cached_authenticated_requests > 0: Cache-Pollution-Risiko
```

**Reference:** Slice 259 — Beta-Day-2 Service-Worker-Heal nach Anil-Bug-Report "Initial Load funktioniert schrott — jedes Mal Refresh nötig". 1899 stale Supabase-REST-Responses bei jedem Browser im Cache vor Heal. Decision D61.

### 41. Cross-Tab Cache Sync via localStorage with User-Switch-Detect (Slice 260, 2026-04-30)

**Wann:** Auth-Provider-Cache Migration von sessionStorage zu localStorage für besseren first-paint UX.

**Wie (vor → nach):**

```ts
// VOR (sessionStorage — tab-isolated, neuer Tab = kalt-start)
function ssGet<T>(key: string): T | null {
  try { return JSON.parse(sessionStorage.getItem(key) ?? 'null'); } catch { return null; }
}

// NACH (localStorage — cross-tab warm cache)
function lsGet<T>(key: string): T | null {
  try { return JSON.parse(localStorage.getItem(key) ?? 'null'); } catch { return null; }
}

// PFLICHT-Mitigation: User-Switch-Detect VOR setUser
// (cross-user-pollution wenn SIGNED_OUT nicht gefeuert hat — z.B. tab-crash)
supabase.auth.onAuthStateChange(async (event, session) => {
  const u = session?.user ?? null;
  if (u) {
    const cachedUserId = lsGet<User>(LS_USER)?.id;
    if (cachedUserId && cachedUserId !== u.id) {
      Sentry.addBreadcrumb({
        category: 'auth',
        message: 'user_switch_detected_cache_cleared',
        level: 'info',
        data: { from: cachedUserId.slice(0, 8), to: u.id.slice(0, 8) },  // GDPR-safe
      });
      lsClear();
      queryClient.clear();
    }
    setUser(u);
    lsSet(LS_USER, u);
    // ...
  }
});
```

**Warum:**
- sessionStorage tab-isoliert → returning user opens new tab → 1-3s skeleton on first load while auth round-trips
- localStorage cross-tab shared → instant warm-cache render, no skeleton flash
- Cross-User-Pollution-Risk neu (sessionStorage hatte ihn nicht): ohne SIGNED_OUT bleibt User A's cache, User B logt ein → User B sieht User A's Profile
- User-Switch-Detect-Block + queryClient.clear() neutralisiert das

**SSR-Pflicht:**
- Storage-Reads NUR in useEffect (niemals useState-init — server hat kein localStorage)
- try/catch um alle storage-Ops (Privacy-Mode, Quota-Exceeded)

**Defense-in-Depth (zusätzlich):**
- Sub-Provider (z.B. ClubProvider) sollten eigenen `storedStillValid`-Check haben (cached value muss Teil aktueller User-Daten sein, sonst ignorieren)
- Sentry-Breadcrumbs mit truncated UUIDs für post-incident-debugging

**Reference:** Slice 260 — Beta-Day-2 Auth-Hydrate-Hardening nach Slice 259 SW-Heal.

### 42. requestIdleCallback für Non-Critical Mount-Effects (Slice 260, 2026-04-30)

**Wann:** Welcome-Bonus, ActivityLog, analytics-pings, Telemetry — alles was zwar bei Mount triggert aber nicht render-critical ist.

**Wie:**

```ts
useEffect(() => {
  if (!user) return;
  const trigger = () => {
    // ... non-critical work
  };
  if (typeof window !== 'undefined' && 'requestIdleCallback' in window) {
    const idleId = window.requestIdleCallback(trigger, { timeout: 5000 });
    return () => window.cancelIdleCallback?.(idleId);
  }
  // Fallback für Safari < 16.4
  const timeoutId = setTimeout(trigger, 1000);
  return () => clearTimeout(timeoutId);
}, [user]);
```

**Warum:**
- Mount-Effects competen mit first-paint-Queries auf Render-Race-Surface
- requestIdleCallback feuert wenn Browser idle ist → off critical path
- timeout: 5000ms forced-fire ensures eventual execution
- Cleanup-functions für beide paths preventen leak bei Pathname-Change/Unmount

**Idempotency-Pflicht:** Trigger-Function MUSS idempotent sein (z.B. via DB-PK-Constraint), weil idle-callback nicht gefeuert werden könnte vor Tab-close → next visit holt es nach.

**Reference:** Slice 260 — `(app)/layout.tsx` Welcome-Bonus + ActivityLog migrated to idle-callback. Bonus-Claim ist via PK-Constraint idempotent (existing).

### 43. TanStack Query Persist-Cache mit Defense-in-Depth-Filter (Slice 261, 2026-04-30)

**Wann:** TanStack Query persistQueryClient setup für returning-user warm-cache, mit Cross-User-Pollution-Prevention.

**Wie (Defense-in-Depth 3-Layer):**

```ts
'use client';
import { useEffect } from 'react';
import { QueryClientProvider } from '@tanstack/react-query';
import { persistQueryClient } from '@tanstack/react-query-persist-client';
import { createSyncStoragePersister } from '@tanstack/query-sync-storage-persister';
import { queryClient } from '@/lib/queryClient';

const LOCALSTORAGE_KEY = 'APP_QUERY_CACHE_v1';
const MAX_AGE_MS = 30 * 60 * 1000;
const THROTTLE_MS = 1000;

// Layer 2: explicit user-scope domain DENY
const USER_SCOPED_DOMAINS = new Set([
  // qk-Factory domains (greppable)
  'holdings', 'wallet', 'orders', /* ... */
  // Inline-keyed domains (NOT in qk-Factory — Pflicht-Audit:
  //   grep -rn "queryKey:\\s*\\['" src/ )
  'home', 'streaks', 'wildcards', 'rankings',
]);

// Layer 3: UUID-regex DENY (defensive backup)
const UUID_REGEX = /[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/i;

export function QueryProvider({ children }: { children: React.ReactNode }) {
  useEffect(() => {
    if (typeof window === 'undefined') return;
    let unsubscribe: (() => void) | undefined;
    try {
      const persister = createSyncStoragePersister({
        storage: window.localStorage,
        key: LOCALSTORAGE_KEY,
        throttleTime: THROTTLE_MS,
      });
      const [persistUnsubscribe] = persistQueryClient({
        queryClient,
        persister,
        maxAge: MAX_AGE_MS,
        buster: 'v1',
        dehydrateOptions: {
          shouldDehydrateQuery: (query) => {
            // Layer 1: status-success-only (no in-flight, no errors)
            if (query.state.status !== 'success') return false;
            // Layer 2: skip user-scope domains
            const firstKey = query.queryKey[0];
            if (typeof firstKey === 'string' && USER_SCOPED_DOMAINS.has(firstKey)) return false;
            // Layer 3: skip any key with UUID
            if (UUID_REGEX.test(JSON.stringify(query.queryKey))) return false;
            return true;
          },
        },
      });
      unsubscribe = persistUnsubscribe;
    } catch (err) {
      Sentry.captureException(err, { tags: { component: 'QueryProvider' } });
    }
    return () => unsubscribe?.();
  }, []);
  return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>;
}
```

**Pflicht-Audit beim Adding-Cache-Filter:**
```bash
# qk-Factory domains
grep -E "^\s+[a-z]+:" src/lib/queries/keys.ts
# PLUS inline-keyed domains (NICHT vergessen — Slice 261 Reviewer-Find)
grep -rn "queryKey:\s*\['" src/ --include="*.tsx" --include="*.ts"
```

**Cascading mit User-Switch-Detect (Pattern #41):**
- queryClient.clear() in AuthProvider feuert bei User-Switch
- persist subscribed via QueryCache events → localStorage cleared automatisch nach throttleTime (1s)
- 1s race-window mitigated durch Layer 1 (in-flight User-B queries nicht persisted)

**Cache-Lifecycle-Tradeoff:**
- gcTime 24h aligned mit persist maxAge — sonst gc'd queries nicht re-hydrated
- Memory-Bloat-Risk: 24h × 50-100 queries × 5-50KB → bis 500MB worst-case Tab-stayer
- Mitigation post-validation: gcTime auf 30min reduzieren (matches MAX_AGE_MS, persist restoraten trotzdem)

**Reference:** Slice 261 — TanStack Query Persist-Cache Beta-Day-2 Final. Anil-Bug-Report kalt-start jeder Tab → instant warm cache.

### 44. Edge-Middleware Public-Route-Bail-Out (Slice 262, 2026-04-30)

**Wann:** Edge-Middleware mit Auth-Roundtrip auf jedem Request, public Pages für true-anon visitors langsam.

**Wie:**

```ts
export async function updateSession(request: NextRequest) {
    const pathname = request.nextUrl.pathname;
    let supabaseResponse = NextResponse.next({ request });

    // Cheap pre-checks: geo-tier + public-route detection
    if (geoTier) supabaseResponse.cookies.set('app-geo-tier', geoTier, ...);
    const publicRoutes = ['/login', '/welcome', '/onboarding', '/auth/callback'];
    const isPublicRoute = publicRoutes.some(r => pathname === r || pathname.startsWith(`${r}/`));

    // Bail-Out: skip Supabase Auth round-trip for true-anon public visits
    // Stable Supabase cookie naming since 2024: sb-<project-ref>-auth-token
    const hasAuthCookie = request.cookies.getAll().some(c =>
      c.name.startsWith('sb-') && c.name.endsWith('-auth-token')
    );
    if (isPublicRoute && !hasAuthCookie) {
      return supabaseResponse;  // 50-300ms TTFB saved
    }

    // Otherwise: full auth flow (createServerClient + getUser + admin-checks)
    // ...
}
```

**Wann Bail-Out greift:**
- True-Anon visit zu Public-Route (kein sb-cookie): RT-skip ✓
- Logged-In-User zu Public-Route (sb-cookie present): full RT (SSR-Auth-State)
- Stale-Cookie + Public-Route: full RT (verify stale-vs-valid)
- Protected-Route any state: full RT (existing redirect logic)

**Effekt:** Landing-Page TTFB für Anonymous Visitors um 50-300ms reduziert. Vor allem wirksam bei: GTM-Campaign-Traffic, Direct-URL-Hits, social-shared Links.

**Reference:** Slice 262 — Middleware Public-Route-Bail-Out Beta-Day-2 Final-Final.

### 45. Cold-Start UID-keyed Cache-Mirror Pattern (Slice 268, 2026-04-30)

**Problem:** TanStack Query mit Persist-Cache (Pattern #43) deny-listet user-scoped Domains (wallet, tickets) → kein Persist-Hit beim Refresh → Mobile-Safari Auth-SDK-Warmup-Bottleneck (4-9s) führt zu sichtbarem Skeleton-Pulse für kritische User-Daten. User refresht weil App scheint tot.

**Lösung:** Eigener UID-keyed localStorage-Mirror parallel zum Persist-Cache. Synchroner Read in `useMemo` als `placeholderData` → instant Render. Background-Refetch läuft IMMER (`staleTime: 0`).

**3-Layer-Architektur:**

```ts
// 1. Helper-Module (DRY für mehrere Hooks):
//    src/lib/utils/cachedQuery.ts
export function readCached<T>(prefix: 'bs_wallet' | 'bs_tickets', uid: string): T | undefined;
export function writeCached(prefix: 'bs_wallet' | 'bs_tickets', uid: string, data: unknown): void;
export function clearCachedAllSlots(): void;  // für User-Switch + SIGNED_OUT

// 2. Hook-Pattern:
const placeholder = useMemo<T | undefined>(
  () => (userId ? readCached<T>('bs_wallet', userId) : undefined),
  [userId],
);
const query = useQuery({
  queryKey: walletQueryKey(userId),
  queryFn: async () => {
    const data = await getWallet(userId);
    if (data && userId) writeCached('bs_wallet', userId, data);
    return data;
  },
  enabled: !!userId,
  staleTime: 0,                  // Background-Refetch IMMER
  placeholderData: placeholder,  // NICHT initialData!
});

// 3. AuthProvider clearCachedAllSlots SYNCHRON:
//    (a) User-Switch-Detect-Block (vor setUser):
if (cachedUserId && cachedUserId !== u.id) {
  lsClear();
  clearCachedAllSlots();  // VOR setUser, sonst sieht User-B kurz User-A's Werte
  queryClient.clear();
}
//    (b) SIGNED_OUT clearUserState (synchron neben lsClear):
lsClear();
clearCachedAllSlots();  // SYNCHRON, NICHT in setTimeout
setTimeout(() => queryClient.clear(), 0);
```

**Money-Path-Schutz:**
TanStack v5 `placeholderData` setzt `dataUpdatedAt = 0` bis Real-Fetch resolved → `useIsBalanceFresh()` returnt `false` während placeholder rendert → BuyModal-Confirm-Button bleibt **disabled** bis Server-Truth da → Money-Action sicher gegated.

**Anti-Patterns (Slice 265 Reverted-Lehre — verboten):**
- ❌ `initialData` (markiert als data persistiert → dataUpdatedAt nicht 0 → Money-Path-Risk)
- ❌ Single-slot Storage (`bs_wallet` ohne UID) — Cross-User-Pollution-Race
- ❌ Touch von TopBar.tsx oder (app)/layout.tsx — Render-Tree-Risiken
- ❌ `staleTime > 0` — refetch wird zu spät gefeuert
- ❌ useState-Init-Read von localStorage — SSR-Hydration-Mismatch

**Reviewer-VOR-BUILD-Stage:** Bei Re-Doing-Reverted-Slices (Slice 268 = Slice-265-Wiederholung) Reviewer-Agent VOR dem Coden, um Anti-Pattern-Vermeidung zu verifizieren. Spec-Reviewer fand 3 MINORs (AC-09, clearCachedAllSlots-Synchronicity, Edge-Cases) die in Spec eingearbeitet wurden bevor Code-Schreiben begann.

**Coverage-Pflicht:** AC-03 (User-Switch) + AC-04 (SIGNED_OUT-Clear-Sync) MÜSSEN automatisierten Test haben — Cross-User-Pollution ist KRITISCHES Risk-Bucket. Spy-Order-Verify via `mockFn.mock.invocationCallOrder` für synchrone Reihenfolge.

**Reference:** Slice 268 — Cold-Start Cache-Mirror Wallet+Tickets (Slice-265-done-right).

---

### 46. TanStack-Query-Hook für deterministisch-keyed Multi-ID Aggregat-RPC (Slice 268b, 2026-05-04)

**Wann:** Service liest Aggregate über eine variable Liste von IDs (z.B. Top-Movers für User-Holdings, Most-Owned für Followed-Clubs, Sentiment für Compare-Players). Hook soll Cache-Hit liefern wenn dieselbe ID-Menge in beliebiger Reihenfolge erneut gefragt wird, **ohne** dass die Eingabe-Reihenfolge den Key ändert.

**Symptom-Anti-Pattern (vermeiden):**
- Konsument macht `useState/useEffect/cancelled-flag` und ruft Service direkt → kein dedup, kein staleTime, kein retry, jede Re-Mount = neue RPC.
- Cache-Key nutzt `playerIds` als Array → Re-Render mit gleichen IDs aber neuem Array-Ref invalidet Cache.
- Cache-Key nutzt `playerIds.join(',')` ohne Sort → `['a','b','c']` und `['c','a','b']` sind 2 separate Cache-Entries trotz identischer Datenanforderung.

**Pattern (Service + qk + Hook + Konsument):**

```ts
// 1. Service — throw bei Error (kein silent return [])
export async function getAggregateByIds(ids?: string[], limit = 20): Promise<Aggregate[]> {
  const { data, error } = await supabase.rpc('rpc_name', { p_ids: ids ?? null, p_limit: limit });
  if (error) throw new Error(error.message);
  return (data as Aggregate[]) ?? [];
}

// 2. qk-Factory
qk.aggregateName: {
  byIds: (idsKey: string, limit: number) =>
    ['aggregateName', idsKey, limit] as const,
}

// 3. Hook (in src/lib/queries/<domain>.ts)
export function useAggregateByIds(ids: string[] | undefined, limit: number) {
  const idsKey = useMemo(
    () => (ids ?? []).slice().sort().join(','),
    [ids],
  );
  return useQuery<Aggregate[]>({
    queryKey: qk.aggregateName.byIds(idsKey, limit),
    queryFn: () => getAggregateByIds(ids, limit),
    enabled: !!ids && ids.length >= MIN_THRESHOLD,
    staleTime: FIVE_MIN,
  });
}

// 4. Konsument (Caller-Stability-Pflicht!)
const ids = useMemo(() => holdings.map(h => h.playerId), [holdings]);
const { data: aggregates } = useAggregateByIds(ids, 3);
const mapped = useMemo(
  () => (aggregates ?? []).map(a => ({ ... })),  // defensive null-strict-equality
  [aggregates],
);
```

**Pflicht-Bestandteile:**
1. **Service throw bei Error** (nicht `return []`) per `errors-db.md` "Service Error-Swallowing".
2. **Sorted-Joined Key** für Reihenfolgen-Invarianz.
3. **`useMemo` für `idsKey`** im Hook + `useMemo` für `ids` im Konsument — Reference-Stability erforderlich.
4. **enabled-Gate** ≥ MIN_THRESHOLD matcht Konsumenten-Logic.
5. **Defensive `?? []`** im Konsument — schützt vor `data === undefined` (Loading + isError).
6. **Layer 3 UUID_REGEX-aware Persist:** Wenn IDs UUIDs sind, persist-skip automatisch. KEIN initialData/placeholderData (Money-Path-Risk laut Slice 268 / Pattern #45).

**Test-Schichtung:**
- **Service-Test** (`@vitest-environment node`): mockSupabase, deckt success + error-throw + null-data-fallback ab.
- **Hook-Test** (jsdom + QueryClientProvider-Wrapper, **shared QC** für Dedup-Test!): mockt Service, verifiziert enabled-Gate (3 Branches: undefined/[]/[1]), Cache-Dedup (zwei `renderHook` mit umgedrehter Reihenfolge teilen 1 RPC), error-Propagation.
- **Konsument-Test:** mockt Hook (nicht Service), verifiziert mapping-Output + AC-09 graceful-degrade bei isError.

**Wann verwenden:** Statt useState/useEffect/cancelled-flag für ID-scoped Service-Aggregate. Wenn die Liste der IDs durch User-Action variabel ist und Cache-Hits über Re-Mounts/Tab-Switches erwartet werden.

**Wann NICHT verwenden:**
- Single-ID-Lookup (`getById`) → einfachere `useDbPlayerById`-Pattern.
- Money-Path mit User-spezifischen Werten → Pattern #45 (Cold-Start UID-keyed Cache-Mirror) mit `staleTime: 0` + `placeholderData`.
- Aggregat ist Realtime-getrieben (z.B. Live-Score) → Subscription-Hook-Pattern statt Cache.

**Reference:** Slice 268b — `usePlayerPriceChanges7d` (`src/lib/queries/players.ts:96-110`) für 7d-Top-Movers in Home-Page. D63 Cross-Persona-Top-Finding #3 (Battery-Drain-Fix).

---

### 47. Slot-Priority-Engine + Multi-Slot-Render-Pattern (Slice 266, 2026-05-04)

**Wann:** Eine UI-Komponente soll aus N möglichen Inhalt-Quellen die wichtigsten 1-2 priorisiert anzeigen, statt einen einzigen prio-cascade-winner-takes-all. Beispiele: Home-Spotlight (5 Slot-Quellen), Notification-Stack (Multi-Channel), Achievement-Hub (Daily/Weekly/Milestone parallel).

**Symptom-Anti-Pattern (vermeiden):**
- Component hat `if-else-Cascade` mit 5 Returns → max 1 sichtbarer Inhalt, andere verloren.
- Component berechnet sowohl Prio-Logik als auch Render-Logik → Verantwortungs-Mischung, schwer testbar.
- Cascade enthält "fallback ist null" → Empty-State-Handling unsichtbar.
- Sub-Component-Extraktion vor BUILD erzwungen → premature abstraction für ~5 Renderer-Funktionen.

**Pattern (Hook + Component, Single-Source-of-Truth in Hook):**

```ts
// 1. Hook (in src/app/.../hooks/use<Domain>Data.ts) — Slot-Priority-Engine
type SlotType = 'a' | 'b' | 'c' | 'd' | 'e';

const slots = useMemo<{ primary: SlotType | null; secondary: SlotType | null }>(() => {
  const active: SlotType[] = [];
  if (conditionA) active.push('a');
  if (conditionB) active.push('b');
  if (conditionC) active.push('c');
  if (conditionD) active.push('d');
  if (conditionE) active.push('e');
  return {
    primary: active[0] ?? null,
    secondary: active[1] ?? null,  // Max 2 visible (Mobile-above-fold-Constraint)
  };
}, [conditionA, conditionB, conditionC, conditionD, conditionE]);

// 2. Legacy-Mapping (falls Konsumenten alten Discriminator-Output nutzen):
const legacyType = useMemo(() => {
  const p = slots.primary;
  if (p === 'a') return 'a-legacy' as const;  // 1:1
  if (p === 'b') return 'special-legacy' as const;  // Sub-Type-Suppress für Sidebar-Disambiguierung
  return 'cta' as const;  // Fallback
}, [slots.primary]);

// 3. Component (reiner Renderer, NICHT Slot-Priority-Owner)
interface ComponentProps {
  slots: { primary: SlotType | null; secondary: SlotType | null };
  // Slot-spezifische Sub-Payloads (Pre-Review F-07 reduzierte Prop-Surface):
  aData?: { ... };
  bData?: { onAction: () => void };
}

function Component({ slots, ...slotData }: ComponentProps) {
  if (!slots.primary) return null;
  const primary = renderSlot(slots.primary);
  const secondary = slots.secondary ? renderSlot(slots.secondary) : null;
  if (!secondary) return primary;
  return <div className="space-y-3">{primary}{secondary}</div>;

  function renderSlot(type: SlotType) {
    switch (type) {
      case 'a': return renderASlot();
      case 'b': return renderBSlot();
      // ... pro Slot eine inner-function (nutzt Closures auf props)
    }
  }
}
```

**Pflicht-Bestandteile:**

1. **Slot-Priority-Engine in Hook** (nicht Component) — Single-Source-of-Truth, testbar isoliert ohne Component-Render.
2. **Max 2 Slots visible** (Mobile-above-fold-Constraint, nicht Wahl-Lähmung-Hick's-Law). 3+ verlangen separates Slice mit Constraint-Verifikation.
3. **Sortierte-Reihenfolge-Cascade in Hook** statt if-else-return — Slot-Priority ist Daten, nicht Control-Flow.
4. **`slots.primary === null` als legitimer Empty-State** — Component returnt `null`, Caller entscheidet ob Skeleton/Hide/Fallback-CTA.
5. **Legacy-Mapping (falls Hook ältere Output-Form ersetzt)** — Discriminator-Mapping in Hook, NICHT zwei separate State-Updates die driften können.
6. **Slot-spezifische Sub-Payload-Props** — `aData?`, `bData?` typed-optional statt 5 flat Props (`hasA`, `aValue1`, `aValue2`, `aOnClick`, `bValue` etc.).
7. **Inline-Branches in Component** für ~5 Slot-Renderers OK (≤300 LOC). Sub-Component-Extraktion erst wenn Renderer-Funktion komplex genug für eigenes Test-File.

**Test-Schichtung:**

- **Hook-Test** (vitest jsdom mit renderHook): testet Slot-Priority-Cascade mit verschiedenen Input-Konfigurationen. Verifiziert primary + secondary in jeder Permutation.
- **Component-Test** (vitest jsdom + render + i18n-Provider): testet rendered Output je Slot-Type (8 Tests = Empty + 5 Slot-Types + 1 Multi-Slot-Layout + 1 Legacy-Backward-Compat).
- **Konsument-Test:** Konsument mockt Hook (nicht Component-internals) — nur Output-Mapping testen.

**Wann verwenden:**

- Multi-Source-UI mit klarer Priorität (Home-Spotlight, Notification-Stack, Discovery-Cards).
- Hook hat alle Inputs für Priorität verfügbar (Time-sensitive > Daily > Limited-Time > Personal > Discovery).
- Component soll nur Renderer sein (no business logic).

**Wann NICHT verwenden:**

- Single-prio-Inhalt (z.B. Hero-Card auf einer Detail-Seite) → einfacher if-else.
- Multi-Source ohne Priorität (alle gleich-wichtig parallel) → Grid-Layout statt Slot-Engine.
- Slot-Logik abhängig von Layout-Decisions (z.B. "wenn Card breit ist, zeige A+B; wenn schmal, nur A") → CSS-driven, nicht Hook-driven.

**Reference:** Slice 266 — `useHomeData.spotlightSlots` (`src/app/(app)/hooks/useHomeData.ts:202-225`) + `HomeSpotlight.tsx` (`src/components/home/HomeSpotlight.tsx`) für 5-Slot Home-Spotlight (liveScore > mysteryBox > ipo > topMover > trending). D63 Phase 3 Mystery-Box-Discoverability-Fix.

---

### 48. Legacy-Mapping-Tabelle bei Hook-Output-Migration (Slice 266, 2026-05-04)

**Wann:** Ein Hook ersetzt seinen alten Output-Discriminator durch eine reichere Datenstruktur, aber Konsumenten nutzen weiter die alte Form. Beispiele: `spotlightType: string` → `spotlightSlots: { primary, secondary }`, `loadingState: bool` → `loadingState: { isPending, isError, isFetching }`, `userRole: string` → `userPermissions: { canX, canY, canZ }`.

**Symptom-Anti-Pattern (vermeiden):**
- Hook-Output-Migration ohne Backward-Compat → 5+ Konsumenten brechen gleichzeitig → Slice wird L statt M.
- Beide Outputs separat berechnet → Drift-Risiko (Hook-Logik einmal geändert, alter Output stale).
- Konsument-Migration im selben Slice wie Hook-Migration → Reviewer-Audit wird groß, Test-Coverage zerfällt.

**Pattern (explizite Mapping-Tabelle in Hook):**

```ts
// Hook: NEUE Output-Form als Single-Source-of-Truth
const newOutput = useMemo<NewShape>(() => ({ /* ... */ }), [deps]);

// Legacy-Mapping (Backward-Compat, NICHT separat berechnet):
const legacyOutput = useMemo(() => {
  const p = newOutput.primary;
  if (p === 'liveScore') return 'event' as const;  // Sidebar-Suppression-Pflicht
  if (p === 'ipo') return 'ipo' as const;          // 1:1
  if (p === 'topMover') return 'topMover' as const; // 1:1
  if (p === 'trending') return 'trending' as const; // 1:1
  return 'cta' as const;                            // mysteryBox + null Fallback
}, [newOutput.primary]);

return { ...newOutput, legacyOutput };
```

**Spec-Pflicht:** Mapping-Tabelle MUSS in Spec dokumentiert sein bevor BUILD. Format:

| primarySlot | legacyType | Begründung |
|-------------|------------|------------|
| `liveScore` | `'event'`  | Sidebar-NextEvent-Card unterdrückt (Doppelung-Schutz) |
| `mysteryBox` | `'cta'`   | Keine korrespondierende Sidebar-Sektion |
| `ipo` | `'ipo'`         | 1:1 |
| `topMover` | `'topMover'` | 1:1 |
| `trending` | `'trending'` | 1:1 |
| `null` | `'cta'`         | Fallback |

**Vorteile:**
1. **Konsumenten-Migration deferred** — kein L-Slice durch Hook + 5 Konsumenten parallel.
2. **Drift-Schutz** — `legacyOutput` ist `useMemo`-derived, kann nicht out-of-sync mit `newOutput` werden.
3. **Behavior-Korrekturen sichtbar** — wenn Mapping eine pre-existing Doppelung-Bug fixt (z.B. `'event'` jetzt nur bei isEventLive statt ALLE active events), wird das durch explizite Tabelle dokumentiert + getestet.
4. **Future-Cleanup planbar** — Legacy-Output kann in einem späteren Slice entfernt werden, wenn alle Konsumenten migriert sind.

**Pflicht-Test:** Behavior-Change durch Mapping-Schmälerung MUSS einen expliziten Test mit Comment haben:

```ts
// Slice X behavior change: 'event' is now reserved for isEventLive (running).
// Pre-X mapped ALL nextEvent (registering/late-reg/running) → 'event' which
// over-suppressed the Sidebar-NextEvent card. New behavior: only running
// events map to 'event'. Non-running nextEvent → 'cta', letting Sidebar
// render the upcoming-Event card normally.
it('legacyOutput=event ONLY when event is running (Slice X behavior change)', () => {
  // ...
});
```

**Wann verwenden:**

- Hook-Output-Refactor mit ≥3 Konsumenten (Konsumenten-Migration in eigenem Slice deferred).
- Pre-existing Bug im alten Discriminator-Mapping wird implicit gefixt (Behavior-Korrektur).
- Konsumenten sind nicht alle Code-owned (z.B. Plugin-Konsumenten, Storybook-Stories).

**Wann NICHT verwenden:**

- Hook-Output ist nur an 1 Konsument-Stelle gebunden → direkt migrieren ohne Mapping-Layer.
- Discriminator-Mapping wäre lossy (z.B. `Set<string>` → `string`) → Re-Design statt Mapping.
- Behavior-Change ist Breaking + intentional → explizit als Migration-Slice mit Konsumenten-Update.

**Reference:** Slice 266 — `useHomeData.ts:227-239` mappt `spotlightSlots → spotlightType` für `page.tsx:315,392` Sidebar-Suppression-Konsumenten. Pre-266 Bug: `spotlightType='event'` was over-set für ALLE active events → Sidebar-NextEvent over-suppressed. Post-266 Mapping: nur `liveScore` → `'event'`, andere `nextEvent`-Stati → `'cta'` (Sidebar zeigt upcoming-Event normal). Behavior-Change-Test in `useHomeData.test.ts:418-428` mit Slice-Comment.

### 49. Baseline-Ratchet-Guard (Anti-Drift ohne Mass-Migration) (Slice 299, 2026-06-13)

**Wann:** Eine Code-Hygiene-Regel soll enforced werden ("keine neuen X"), aber es existieren bereits N legacy-Verstöße. Eine Hard-Rule (ESLint-error, blocking-Gate) würfe alle N → erzwingt Mass-Migration in einem Slice (Big-Bang-Anti-Pattern). Beispiele: keine neuen Bridge-Imports, kein neuer Direct-Supabase-in-Component, keine neuen silent-catches, keine neuen `any`.

**Pattern (Count-Baseline + Increase-only-Gate):**

```ts
// scripts/<x>-check.ts — 3 Modi: report | --check | --update
const BASELINE = '.<x>-baseline.json';
const snap = scan();                                   // count current violations
if (mode === 'update') { write(BASELINE, snap); exit(0); }   // re-freeze nach legit Migration
if (mode === 'check') {
  if (!exists(BASELINE)) { write(BASELINE, snap); exit(0); } // no-baseline → write-initial (kein false-CI-fail)
  const base = read(BASELINE);
  const violations = keys.filter(k => snap[k] > base[k]);    // STRICT > (nicht !=) — Senken erlaubt
  if (violations.length) { logEach(violations); exit(1); }
  exit(0);
}
writeReport(snap);                                     // default: human report
```

**Schlüssel-Eigenschaften:**
- **STRICT `>`**, nicht `!=` — legitime Migration (Count SINKT) failt NICHT; danach `--update` ratcht Baseline runter.
- **no-baseline → write-initial + exit 0** — kein false-CI-fail beim ersten Lauf (silent-fail-Vorbild).
- **`--update`-Hinweis im Fehler-Output** — proaktive UX für den Senkungs-Fall.
- **Verkabelung (D54-Pflicht):** package.json `audit:x` + `audit:x:check` + `.husky/pre-commit`-Step + wiring-check-Allowlist (`.husky/` wird von wiring-check NICHT gescannt → :check muss allowlisted werden trotz echter Verkabelung).

**Scanner-Falle (Slice 299 F-1, Familie „Grep-Audit-Scope-Gap" Slice 166):** Static-`from '…'`-only-Regex verpasst dynamic `await import('…')` + inline-type-imports `import('…').T` + `require('…')`. Regex IMMER auf `(from|import\s*\(|require\s*\()\s*['"]…['"]` erweitern, sonst umgeht ein dynamic-Crossing den Ratchet silent.

**Instanzen:** `silent-fail-audit.ts` (`.audit-baseline.json`, Slice 092/093, HIGH-increase-Gate) · `boundary-check.ts` (`.boundary-baseline.json`, Slice 299, bridge-imports + direct-supabase) · `test-confidence-check.ts` (`.test-confidence-baseline.json`, Slice 300, placeholder + skip/focus). Alle gleiches Template.

**Marker-Falle (Slice 300 F-1):** Test-Focus-Marker `fit(`/`xtest(`/`.only` sind eine KOMPLEMENTÄRE false-confidence-Achse zu `.skip` (focus droppt alle ANDEREN Tests silent). Beim Tracken IMMER als CALL matchen (`\bfit\s*\(`) — bare `\bfit\b` false-positivet auf Domain-Wörter (z.B. player `status: 'fit'`, 14 Treffer in BeScout). Gleiche Familie wie Scanner-Falle oben.

**Wann NICHT:** Bei 0 legacy-Verstößen → direkt Hard-Rule (ESLint-error). Bei Verstößen die SOFORT alle gefixt werden müssen (Security) → kein Ratchet, sofort-fix.

**Reference:** Slice 299 — `scripts/boundary-check.ts`, `.boundary-baseline.json`, `worklog/audits/2026-06-13/s4-source-of-truth-boundaries.md`. Master-Audit §11.5/6 von Prosa → enforced.
