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
