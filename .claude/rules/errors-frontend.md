---
paths:
  - "src/components/**"
  - "src/app/**"
  - "src/features/**"
  - "src/lib/hooks/**"
---

# Errors: Frontend

Stand: 2026-04-24 · Split aus `common-errors.md` (Slice 186). Siehe auch `ui-components.md`, `testing.md`.

## React / TypeScript

### Checklist
- Hooks VOR early returns.
- `Array.from(new Set())` / `Array.from(map.keys())` statt Spread (strict TS).
- Modal: IMMER `open={true/false}` prop.
- PlayerPhoto: `first` / `last` / `pos` (nicht firstName/lastName).
- Barrel-Exports bereinigen wenn Files geloescht werden.
- NIEMALS `.catch(() => {})` — mindestens `console.error`.
- Cancellation Token in useEffect: `let cancelled = false; return () => { cancelled = true; }`.
- Null-Guards: `floor_price ?? 0`, `entry.rank ?? 999`.

### Defensive null-strict-equality bei optional-resolved Hook-Daten (Slice 265)

**Bug-Klasse:** UI-Component leitet boolean-Risk-State aus Hook-Daten ab, die `number | null` returnieren (RPC noch nicht resolved oder silent-fail). Truthy-Check `!value` statt strict `=== 0` führt zu False-Positives — Card erscheint bei null/undefined obwohl Risk-State unbekannt ist.

**Beispiel (Slice 265 StreakRiskCard):**
```ts
// FALSCH — null zählt als at-risk:
const isStreakAtRisk = streak >= 7 && !shieldsRemaining;
// Wenn shieldsRemaining=null (RPC error / network-fail):
// !null === true → at-risk Card erscheint trotz unbekanntem State

// RICHTIG — strict equality, defensive:
const isStreakAtRisk = streak >= 7 && shieldsRemaining === 0;
// null === 0 ist false → Card unsichtbar bei unbekanntem State
```

**Regel:** Bei `T | null`-Hook-Returns mit Risk-Indikator-Logik IMMER strict `=== <konkreterWert>` statt truthy-Falsy. Nur `null` (resolved) sollte als bekannter State zählen, nicht als unbekannter.

**Audit-Pattern für Reviewer:**
```bash
# Findet truthy-Falsy-Checks auf number|null Hook-Returns:
grep -rnE "!(streak|shields|count|balance|tickets|priceChange)[A-Z]" src/components/ src/features/
# Manuell prüfen: kommt Wert aus Hook mit `T | null`-Return?
```

**Reference:** `useLoginStreak` returnt `data: StreakResult | null`, Slice 265 Pre-Review F-04 fand das Pattern bevor BUILD. Defensive `=== 0` ist die korrekte Mitigation für silent-fail/initial-resolve-Race.

**Beziehung:** Cross-Cutting mit "Silent Fails" (common-errors.md §1) — eine UI-Layer-Variante. Backend hat ähnliches Pattern bei `Promise.allSettled` ohne Observability.

### Selected-Item-Snapshot vs. Realtime-Update-Drift (Slice 273, 2026-05-06)

**Bug-Klasse:** Komponente hält ein "selectedX"-Item als Snapshot-State (`useState<X | null>`), während ein Realtime-Hook die Source-Liste patched (`setItems(prev.map(...))`). Modal/Detail-View liest weiterhin den eingefrorenen Snapshot → User sieht Stale-Score, Stale-Status, Stale-Minute.

**Symptom (Slice 273 Live-Bug):**
- User klickt Fixture → Modal öffnet mit `selectedFixture = fixtures[i]`
- Realtime-Update kommt: `useLiveFixtures.onUpdate` patches `fixtures[i] = {...next, home_score: 2}`
- Modal-State `selectedFixture` ist der **alte Pointer** (vor Patch) → zeigt Score 0:0
- React preserved den Pointer, kein implicit-sync

**Anti-Pattern:**
```ts
// ❌ Snapshot-State
const [selectedFixture, setSelectedFixture] = useState<Fixture | null>(null);
// ...
onClick={(f) => setSelectedFixture(f)}  // capture snapshot
// ...
<Modal fixture={selectedFixture} />  // stale across realtime updates
```

**Fix-Pattern: ID-as-State + derived-from-list:**
```ts
// ✓ Slice 273 Pattern
const [selectedFixtureId, setSelectedFixtureId] = useState<string | null>(null);

const selectedFixture = useMemo(
  () => (selectedFixtureId ? fixtures.find(f => f.id === selectedFixtureId) ?? null : null),
  [selectedFixtureId, fixtures],
);
// ...
onClick={(f) => setSelectedFixtureId(f.id)}  // capture ID only
// ...
<Modal fixture={selectedFixture} />  // atomar synchron mit fixtures[]-Updates
```

**Cross-Cutting Property:** Sub-Components die `fixture` als Prop erhalten + eigene State-Loads (z.B. `getFixturePlayerStats(fixture.id)`) müssen useEffect-deps auf **stabile Felder** spreizen (`fixture.id`, `fixture.status`) statt auf das ganze `fixture`-Object — sonst re-runs der Effect bei jedem Realtime-Patch.

```ts
// ❌ ganzer Object als dep → re-run bei jedem patch
useEffect(() => loadStats(), [fixture, isOpen]);

// ✓ stabile Felder als deps → re-run nur bei id/status-change
const fixtureId = fixture?.id;
const fixtureStatus = fixture?.status;
useEffect(() => loadStats(), [fixtureId, fixtureStatus, isOpen]);
```

**Refetch-Strategy für Modal mit Live-Match:**
```ts
useEffect(() => {
  if (!fixtureId || !isOpen) return;
  let cancelled = false;
  const loadStats = () => { /* fetch + setStats */ };
  loadStats();

  // 60s-Polling während Live-Match (BPS/Bewertungen ticken hoch)
  if (fixtureStatus === 'live') {
    const interval = setInterval(loadStats, 60_000);
    return () => { cancelled = true; clearInterval(interval); };
  }
  return () => { cancelled = true; };
}, [fixtureId, fixtureStatus, isOpen]);
```

Effect re-feuert bei `live → finished`-Transition automatisch via deps und holt finale Stats.

**Audit-Pattern:**
```bash
# Find Snapshot-State auf Realtime-pflegten Listen
grep -rnE "useState<[A-Z][a-zA-Z]+ \| null>" src/components/ src/features/ | head
# Manuell prüfen: wird das Item einer Realtime-gepatchten Liste in setX(item) gestellt?
# Wenn ja: zu ID-as-State + derived-from-list refactoren.
```

**Reference:** Slice 273 `src/components/fantasy/SpieltagTab.tsx:53-156` + `FixtureDetailModal.tsx:432-468`. fantasy-scoring-expert Specialist-Audit P0-B + P0-C.

**Beziehung:**
- Cross-Cutting mit Slice 270 "Per-Tenant-Window vs. Global-MAX" (errors-db.md) — beide sind „Daten-Frische in Multi-Source-Architektur".
- Erweitert "Realtime-Hook-Refactor TanStack-Query → callback-only" (Slice 267) auf UI-Modal-Layer.

### Derived-Loading aus `data === undefined` — TanStack-v5-Anti-Pattern (Slice 283, 2026-06-12)

**Bug-Klasse:** Hook leitet einen Loading-State aus `data === undefined` ab statt `isLoading` zu destrukturieren. Bei Query-ERROR bleibt `data` für immer undefined → der abgeleitete Loading-State hängt permanent → endloser Skeleton OHNE ErrorState/Retry. Besonders fies wenn die Query Upstream-ID-Lieferant für abhängige byIds-Queries ist: deren `isError` feuert nie (0 ids = disabled).

```ts
// ❌ FALSCH (283-F-01): Error-Fall = ewiges Loading
const { data: dashboard } = useMarketUserDashboard(userId);
const dashboardLoading = dashboard === undefined;

// ✓ RICHTIG: Loading UND Error explizit verkabeln
const { data: dashboard, isLoading: dashboardLoading, isError: dashboardError } = useMarketUserDashboard(userId);
const combinedError = dashboardError || downstreamByIdsError;
```

Regel: Upstream-Queries sind ID-Lieferant UND eigener Failure-Mode — beide Achsen in kombinierte Loading/Error-States (erweitert 282-F-02/F-03 um die Error-Achse). v5-Hinweis: `isLoading` ist bei disabled Queries false → anon-Fälle bleiben sauber.

**Reference:** Slice 283 Review F-01, `useMarketData.ts`.

### PostgREST `.or()` mit User-Input: `,` und `()` sind Parser-Syntax (Slice 283, 2026-06-12)

`supabase.or(\`first_name.ilike.%q%,last_name.ilike.%q%\`)` — der or-Parser nutzt Komma als Bedingungs-Separator und Klammern als Gruppierung. User-Input mit `,()` erzeugt einen 400-Parse-Error → throw → je nach Consumer silent leere Liste. Kein Injection-Risiko (parametrisiert), aber funktionaler Silent-Fail.

Fix: Input-Strip `q.replace(/[%_,().]/g, '')` ODER quoted-literal `col.ilike."${pattern}"`.

**Reference:** `src/lib/services/players.ts` searchPlayersByName (Slice 283 F-02).

### Feature-Reaktivierung + Query-Ersatz: 3 Drift-Klassen (Slice 282, 2026-06-11)

Slice 282 (Home von 4,2-MB-/api/players entkoppelt) — Cold-Context-Reviewer fing 2 MAJOR, alle 3 Klassen sind generalisierbar:

**1. Feature-Reaktivierung = Multi-Slot-Suppression-Audit-Trigger (erweitert Slice 278).**
Wenn ein Slice eine TOTE Daten-Quelle reaktiviert (Slice 282: activeIPOs war immer leer weil dbToPlayer ipo.status='none' setzte), werden latente Suppression-Gate-Gaps erstmals scharf. Der Sidebar-IPO-Gate prüfte nur `spotlightType` (= primary-Slot) — IPO als SECONDARY-Slot hätte doppelt gerendert. Der Gap existierte seit Slice 266, war aber unsichtbar weil das Feature nie feuerte.
Regel: Bei Reaktivierung einer Daten-Quelle die Suppression-Mapping-Tabelle ALLER Sections neu auditieren, die diese Quelle konsumieren (`grep -rnE "spotlightSlots\.(primary|secondary)|spotlightType" src/app/`).

**2. Error-Gate-Semantik bei Query-Ersatz NIE verschärfen.**
Original: `playersError && players.length === 0` (Full-Page-Error nur ohne Daten). Naiver Ersatz: `homeError = moversError || byIdsError` — (a) dekorativer Endpoint-Fail ersetzt die GANZE Page durch ErrorState, (b) TanStack v5 setzt `status='error'` auch nach Background-Refetch-Fail TROTZ vorhandener data → gerenderte Page kann nachträglich durch Error-Screen ersetzt werden.
Regel: `error && data.length === 0`-Guards des Originals beibehalten; dekorative Quellen graceful degraden (defensiv false, Slice-265-Pattern), nicht page-fatal machen.

**3. Abgeleitete byIds-Queries: Upstream-Loading in kombinierten Loading-State.**
`usePlayersByIds(ids)` mit ids aus anderen Queries (trending, ipos) ist ein Waterfall: byIds startet erst NACH Upstream-Resolve. Wenn der kombinierte Loading-State das Upstream-Loading NICHT enthält, oszilliert die UI Content→Skeleton→Content (loading=false-Fenster zwischen Upstream-Resolve und byIds-Start) UND jeder ids-Wachstumsschritt erzeugt einen neuen Cache-Key → Mehrfach-Fetches.
Regel: `combinedLoading = upstreamLoading || (ids.length > 0 && byIdsLoading)`.

**Reference:** `worklog/reviews/282-review.md` F-01/F-02/F-03. Files: `useHomeData.ts:96-107`, `page.tsx:351`.

### Cross-Section-Coupling-Drift bei Multi-Slot-Refactors (Slice 278, 2026-05-06)

**Bug-Klasse:** Page-Render-Tree zeigt dasselbe semantische Element an 2 Stellen (z.B. CTA-Card oben in Hero-Slot UND als persistent Card in Sidebar). Beide Stellen reagieren auf gleiche Daten-Quelle (`hasFreeBoxToday`, `activeIPOs.length`, etc.). Wenn ein Multi-Slot-Refactor neue Slot-Types einführt, MUSS systematisch geprüft werden welche Sidebar/Mobile-Sections doppelt zeigen würden — sonst Doppel-Render-Drift.

**Symptom (Slice 278 Anil-Live-Bug 2026-05-06):** „wieviele mysteryboxen habe ich im home? ich habe das gefühl das es 2 mal auftritt". HomeSpotlight-Slot zeigt MysteryBox als Slot 2 in der 5-Tier-Cascade wenn `hasFreeBoxToday=true`. Sidebar-Card in `page.tsx:386` zeigt MysteryBox parallel mit Shimmer-Animation, **OHNE Suppression-Gate** auf `spotlightSlots.primary !== 'mysteryBox'`. → Mobile-User sieht 2× MysteryBox im Scroll-Viewport.

**Root-Cause:** Slice 266 hat Multi-Slot-Spotlight eingeführt + Suppression-Mapping in `page.tsx` für 4/5 Slot-Types erfasst (`spotlightType !== 'event'`, `!== 'ipo'`, `!== 'topMover'`, `!== 'trending'`) — **mysteryBox wurde übersehen**. Sidebar-Card hatte daher keinen Gate, war pre-Slice-266 ohne-Konflikt sichtbar, post-Slice-266 mit-Konflikt-aber-unentdeckt.

**Fix-Pattern:**
```tsx
// Vorher (Drift)
{uid && (
  <Card>...MysteryBox...</Card>
)}

// Nachher (Suppression)
{uid && spotlightSlots.primary !== 'mysteryBox' && spotlightSlots.secondary !== 'mysteryBox' && (
  <Card>...MysteryBox...</Card>
)}
```

**Audit-Pattern (Pflicht bei JEDEM Multi-Slot-Refactor):**
```bash
# Bei JEDEM neuen Slot-Type in Spotlight/Multi-Slot-Container:
# Greppen welche Sections im selben Page-Render-Tree dieselben Daten konsumieren
grep -rnE "spotlightType\s*!==|spotlightSlots\.(primary|secondary)" src/app/

# Plus: alle Sections greppen die conditionally auf gleiche Daten-Quelle reagieren
grep -rnE "(hasFreeBoxToday|activeIPOs\.length|isEventLive|nextEvent)" src/app/\(app\)/page.tsx \
  src/components/home/*.tsx
```

**Decision-Tree für künftige Multi-Slot-Components:**
1. Welche Daten-Quellen konsumiert der Slot-Container? (z.B. 5 Slot-Types in HomeSpotlight = 5 Daten-Quellen)
2. Pro Daten-Quelle: gibt es eine zweite Section im Page-Render-Tree die DIESELBE Daten-Quelle konsumiert?
3. Wenn JA: brauche ich Suppression-Gate der die Section verbirgt wenn Slot-Container das Element bereits zeigt?
4. Spec-Pflicht: Suppression-Mapping-Tabelle (Slot-Type → betroffene Sidebar-Section) als Sektion in Multi-Slot-Spec.

**Beziehung:**
- Slice 266 (D63 Phase 1) hat Multi-Slot-Spotlight eingeführt — original Drift-Quelle
- Slice 278 fixt mysteryBox-Suppression als 5. Slot-Type
- Pattern-Familie: Cross-Section-Coupling — gleiche Bug-Klasse wie „Selected-Item-Snapshot vs. Realtime-Update-Drift" (Slice 273), aber andere Achse (statisches-Render statt dynamisches-State)

**Reference:** Slice 278 `src/app/(app)/page.tsx:386` Suppression-Gate. Pre-Slice-278 Render-Pfad: `useHomeData.spotlightSlots` → Spotlight rendert Slot + Sidebar rendert Card parallel.

### Dead-Wrapper-File mit transitive Lib-Lock-In (Slice 280, 2026-05-06)

**Bug-Klasse:** Wrapper-Component (`src/components/ui/X.tsx`) ist Barrel-re-exportiert (`@/components/ui` `export { X }`), aber kein Konsument importiert `X` mehr. Webpack/Next bundlet das Wrapper-File trotzdem mit allen transitive deps (Radix-Primitives, Floating-UI-Layer, etc.) in jeden Page-Chunk der das Barrel importiert. Result: 100+ KB transitive Lib-Bundle pro Page-Chunk für 0 User-Visible-Code.

**Symptom (Slice 280 Discovery):** `DropdownMenu.tsx` Wrapper hatte 0 Konsumenten in Production-Code (verifiziert via `grep -rln "DropdownMenu" src/ | grep -v __tests__ | grep -v ui/index.tsx`). Wrapper hatte aber `import * as RadixMenu from '@radix-ui/react-dropdown-menu'` + Barrel-Re-Export. Bundle-Inclusion: ~105 KB direct + transitive floating-ui/collection/dismiss-Layer. Nach Delete: **-17 KB FLJS auf JEDER der 22 tracked Pages, -374 KB Total-FLJS-Sum**.

**Root-Cause:** Wrapper wurde im Slice 181 Radix-Foundation als „Pilot-Multi-Wrapper" gebaut (Dialog + AlertDialog + DropdownMenu), aber nur 2 davon sind tatsächlich in Code migriert worden. DropdownMenu blieb orphan. Pre-Slice-280 Audit hatte das nicht gefangen weil:
- TSC clean (Wrapper-File compiles selbst-konsistent)
- Tests grün (DropdownMenu.test.tsx existierte)
- Barrel-Re-Export sieht „in-use" aus
- `audit:orphan` (Slice 228) detektiert Orphan-Components, aber Wrapper-Files mit eigenem Test waren False-Positive-Filter.

**Detection-Pattern (Pre-Bundle-Refactor pflicht):**
```bash
# Für jeden Wrapper-File in src/components/ui/:
for wrapper in src/components/ui/*.tsx; do
  name=$(basename "$wrapper" .tsx)
  count=$(grep -rln "\b$name\b" src/ \
    --exclude-dir=__tests__ \
    --exclude-dir=test-utils \
    | grep -v "components/ui/$name.tsx\|components/ui/index.tsx" \
    | wc -l)
  if [ "$count" = "0" ]; then
    echo "ORPHAN-WRAPPER: $wrapper (0 Konsumenten)"
  fi
done
```

**Fix-Pattern:**
1. Wrapper-File löschen (`src/components/ui/X.tsx`)
2. Test-File löschen (`src/components/ui/__tests__/X.test.tsx`)
3. Barrel-Re-Export entfernen (`src/components/ui/index.tsx`)
4. `optimizePackageImports`-Eintrag entfernen falls vorhanden (`next.config.mjs`)
5. Optional: zugrundeliegendes pnpm-dep entfernen wenn 0 anderer Consumer (`pnpm remove`)
6. Optional: Test-Helpers in `src/test-utils/` mit-prüfen (oft eigene Mock-Factories für den Wrapper, dann auch dead)

**Bundle-Win-Erwartung:** 50-150 KB pro Page-Chunk (abhängig von transitive Tiefe). Slice 280: -17 KB × 22 Pages = -374 KB.

**Beziehung zu D54 / D46:**
- D54 „Build-without-Wire" — Tools/Hooks/Migrations gebaut + nicht verkabelt. Wrapper-Variante ist die UI-Layer-Achse: gebaut + Barrel-exportiert + nicht konsumiert.
- D46 „Service-Duplicate bei parallelem BE+FE-Dispatch" — andere Achse (Duplikate), aber gleiche Pattern-Familie „Existenz ≠ Verwendung".

**Lehre für `optimizePackageImports`:** Wins via `optimizePackageImports` sind oft **0 KB für ESM-libs** weil moderne Libraries bereits tree-shaken sind. Hauptwin liegt in:
1. **Dead-Wrapper-Removal** (105 KB+ pro Wrapper, Slice 280)
2. **Lazy-Loading** (Slice 121 Pattern, Eager-Trap vermeiden)
3. **API-Surface-Reduktion** via gezielte Named-Imports statt Namespace (Slice 120)

**Reference:** Slice 280 Bundle-Diff Proof `worklog/proofs/280-bundle-diff.md`. `next.config.mjs:12-26`. Discovery via Pre-Implementation-Greppen analog Slice 121-Lehre.

**Erweiterung Slice 305 (Dead-Feature-Removal — 4 Residuen-Achsen):** Bei Removal eines toten Features (nicht nur Wrapper) MUSS die RED-State-Karte **4 Achsen** abdecken, nicht nur Code+DB. Slice 305 (CommunityValuation + valuations.ts + 2 Tabellen + RPC) hatte Code+DB perfekt, ließ aber 2 Residuen zurück (vom Reviewer gefangen):
1. **Code/Service** — Component, Service, Barrel-Exports, Test-Refs (`grep -rn "<Feature>" src/`)
2. **DB-Objekte** — Tabellen, RPCs, Trigger, Views, FKs (`pg_proc`/`pg_constraint`/`pg_views` + 0-incoming-FK-Check vor DROP)
3. **i18n-Keys** — `messages/{de,tr}.json` exklusiv-konsumierte Keys (`grep` jeden Key-Token in src/ → 0 = orphan, aber **shared Keys wie `floorPrice`/`saving` behalten** — pro Key verifizieren, nicht Block-Delete)
4. **Tooling-Allowlists** — `orphan-component-detector.ts` KNOWN_ORPHANS, `wiring-check.ts`-Allowlist, baseline-JSONs (ein excused-Eintrag für eine gelöschte Datei = Dead-Config)

Pflicht-Grep bei jedem Dead-Feature-Removal: `grep -rn "<FeatureName>" messages/ scripts/ .claude/` zusätzlich zu `src/`.

**Plus DROP-TABLE-Diligence (Slice 305 F-4):** Vor jedem `DROP TABLE` mit `user_id`-Spalte → Pflicht-Proof-Zeile `SELECT COUNT(*), MAX(created_at) FROM <table>` um Live-User-Content vs. Testdaten zeitlich zu belegen. Drop ist irreversibel — Diligence VOR dem Drop dokumentieren. `DROP TABLE IF EXISTS` ohne CASCADE = richtige Safety (failt bei übersehener FK statt still mitzulöschen).

**Reference 305:** `worklog/reviews/305-review.md`, Migration `20260613220000_slice_305_drop_orphan_valuations.sql`.

**Erweiterung Slice 324 (Column-DROP zählt als Removal):** Ein `ALTER TABLE ... DROP COLUMN` ist dieselbe Removal-Klasse wie Dead-Feature-Removal — der Pflicht-Grep MUSS auch hier `scripts/*.sql` + `messages/` + `.claude/` umfassen, nicht nur `src/`. Grund: **manuelle Seed-/Maintenance-SQL (`scripts/seed-demo.sql`) hat KEINEN tsc-Schutz** — eine INSERT-Spaltenliste mit der gedroppten Spalte failt erst zur Laufzeit (`column "x" does not exist`), nicht beim Build. Slice 324 (favorite_club-Drop) hatte src/ sauber, aber `seed-demo.sql` schrieb die Spalte noch → vom Reviewer gefangen. Audit pro Column-Drop: `grep -rnE "<col>([^_]|$)" src/ scripts/ messages/ supabase/migrations/` (RPC-Bodies/Views mitprüfen). Plus: Data-Migrationen mit Backfill+DROP in `BEGIN; … COMMIT;` wrappen (atomar; bei riskanteren Folge-Drops wie players.club Pflicht).

**Erweiterung Slice 326 Wave B (Column-DROP — die 2 verpassten src-Achsen):** Der Pre-DROP-Grep MUSS zusätzlich zwei src-Achsen explizit abdecken, die der naive „Domain-Service + Cache"-Scan verpasst (vom Reviewer als 2 BLOCKER gefangen, beide auf Live-Pfaden):
1. **ALLE `src/lib/services/*.ts`, nicht nur der Domain-Service.** Ein zweiter Service (hier `platformAdmin.getAllClubs`) macht oft ein eigenes `supabase.from('<table>').select('…<col>…')` direkt — unabhängig vom Haupt-Service (`club.ts`). Nach DROP → PostgREST 400 `column does not exist` → die GESAMTE Query wirft (nicht nur das Label). Audit: `grep -rn "from('<table>')" src/ | grep "<col>"` über ALLE Files.
2. **`src/app/**/page.tsx` SSR `generateMetadata`/RSC via `supabaseAdmin`.** Server-Komponenten umgehen den Client-Cache-Layer komplett und selektieren oft Spalten die im Output gar nicht genutzt werden (hier `getClubMeta` SELECT `league`, nie verwendet) — der SELECT selbst errort nach DROP → jede betroffene Seiten-Metadata bricht (öffentlicher Pfad). Audit: `grep -rn "supabaseAdmin" src/app/ | …` + die `.select()`-Spaltenlisten prüfen.

**DROP-Sicherheits-Sequenz (Slice 326 Wave B, generalisiert):** Bei einem irreversiblen `DROP COLUMN` auf Live-Prod: (1) alle Reader auf Ableitung umstellen (Spalte bleibt als Netz), (2) deployen, (3) **Network-Trace-Gate** — per Playwright verifizieren dass die LIVE-Version die Spalte nicht mehr selektiert (`<table>?select=…` ohne `<col>`); Vorsicht **PWA-Service-Worker cacht alte Bundles** → vor dem Check `navigator.serviceWorker`-unregister + `caches.delete` + Hard-Reload, sonst testet man die alte Version, (4) erst nach bestätigt-neuer-Version DROP applien, (5) Post-DROP-Verify (Spalte weg + Liga-Namen erscheinen TROTZDEM = Ableitung greift). Der DROP ist nicht datenverlust-irreversibel solange die FK-ID (hier `league_id`) alle Infos behält — worst case ist ein behebbarer Display-Timing-Glitch, kein Restore nötig.

### Lookup-Map indexed by ambiguous Key (Slice 276, 2026-05-06)

**Bug-Klasse:** Frontend-Cache (z.B. ClubCache) indiziert Records nach mehreren Keys für „flexiblen Lookup". Wenn EIN Key nicht garantiert eindeutig ist (z.B. `short`-Code 3-stellig), überschreibt der letzte Insert silent → nachfolgende Lookups returnen das falsche Record. ORDER BY entscheidet welcher gewinnt — vom User-Standpunkt random.

**Symptom (Slice 276 Anil-Live-Bug 2026-05-06):** „Wolfsburg zeigt Wolverhampton-Wappen, Gençlerbirliği auch". DB-Truth korrekt (`logo_url` matcht Verein), aber Frontend-Cache `clubCache.set(c.short, lookup)` für `short='WOL'` 2× ausgeführt → letzter Wolves-Insert überschreibt Wolfsburg.

**6 Konflikte in BeScout DB:**

| short | Konflikte |
|-------|-----------|
| ALA | Alanyaspor (TR) ↔ Alaves (ES) |
| BAY | Bayer Leverkusen ↔ Bayern München (beide DE!) |
| BOL | Bologna (IT) ↔ Boluspor (TR) |
| GEN | Gençlerbirliği (TR) ↔ Genoa (IT) |
| KAR | Fatih Karagümrük (TR) ↔ Karlsruher SC (DE) |
| WOL | VfL Wolfsburg (DE) ↔ Wolves (EN) |

**Detection (Pre-Cache-Init):**
```sql
SELECT short, COUNT(*) AS conflicts, ARRAY_AGG(name) AS clubs
FROM clubs WHERE short IS NOT NULL
GROUP BY short HAVING COUNT(*) > 1;
```

**Fix-Pattern: Konflikt-Detection + Multi-Map-Helper.**

```ts
// Phase 1: Sammle non-unique Key-Lookups in temporärer Map<key, Lookup[]>
const byShort = new Map<string, ClubLookup[]>();
for (const c of data) {
  cache.set(c.id, lookup);    // unique
  cache.set(c.slug, lookup);  // unique
  cache.set(c.name, lookup);  // unique mostly
  if (c.short) {
    const list = byShort.get(c.short) ?? [];
    list.push(lookup);
    byShort.set(c.short, list);
  }
}

// Phase 2: short-Code nur indizieren wenn EINDEUTIG
const conflicts = new Map<string, ClubLookup[]>();
byShort.forEach((list, short) => {
  if (list.length === 1) cache.set(short, list[0]);
  else conflicts.set(short, list);
});

// Helper für Caller mit Disambiguator-Context (z.B. league_id)
export function getByKeyAndLeague(key: string, leagueId: string | null): Lookup | null {
  const direct = cache.get(key);
  if (direct) return leagueId ? (direct.league_id === leagueId ? direct : null) : direct;
  const conflictList = conflicts.get(key);
  if (!conflictList || !leagueId) return null;
  return conflictList.find(c => c.league_id === leagueId) ?? null;
}
```

**Caller-Pattern bei Konflikten:** Caller mit Fallback-Pattern (`getCache(short) || getCache(name)`) sind automatisch gefixt — short-Lookup returnt null, name-Fallback greift. Caller ohne Fallback brauchen `getByKeyAndLeague(short, leagueId)` ODER Migration auf eindeutige Keys (UUID).

**Audit-Pattern für künftige Lookup-Caches:**
```bash
grep -rnE "newCache\.set\(c\.(short|code|abbreviation)" src/lib/ src/features/
```

**Reference:** Slice 276 `worklog/proofs/276-club-logo-conflict-fix.txt`. `src/lib/clubs.ts:24-110` Cache-Init mit Konflikt-Detection.

**Beziehung:** Cross-Cutting mit Slice 081 „Cross-Club-Contamination via API-Football" (errors-scraper.md) — gleiche Bug-Klasse „Eindeutigkeits-Annahme verletzt → silent Cross-Entity-Pollution", andere Layer (Cache statt Scraper).

### Multi-Slot-State-Stores: Move-Semantik vs. Insert-Semantik (Slice 272, 2026-05-05)

**Bug-Klasse:** Zustand-Store für Multi-Slot-State (Lineup-Builder, Equipment-Slots, Tab-Pinning, Card-Loadouts) mit `selectX(id, slot)` Action der nur den Target-Slot filtert, nicht aber die ID. Wenn User dieselbe ID auf 2 Slots setzt, sitzt sie auf beiden → UI zeigt Duplicate.

**Symptom (Slice 272 — Lineup-Builder Pre-Fix):**
```ts
selectPlayer: (playerId, position, slot) =>
  set((state) => ({
    selectedPlayers: [
      ...state.selectedPlayers.filter((p) => p.slot !== slot),  // ← nur Slot, nicht playerId
      { playerId, position, slot, isLocked: false },
    ],
  })),
```

User-Flow: Player X auf Slot 0 → User wählt X für Slot 1 → X erscheint auf Slot 0 UND Slot 1.

**UI-Defense reicht nicht:** Picker-Komponente filtert `usedIds` aus Available-Liste, aber sekundäre Pfade (Quick-Add-Click in Holdings-Strip, Drag&Drop, Pre-Pick-via-URL-Param) können die UI-Defense umgehen.

**Fix-Pattern: Move-Semantik im Store-Action (defense-in-depth).**

```ts
selectPlayer: (playerId, position, slot) =>
  set((state) => ({
    selectedPlayers: [
      ...state.selectedPlayers.filter((p) => p.slot !== slot && p.playerId !== playerId),  // ← BEIDE
      { playerId, position, slot, isLocked: false },
    ],
  })),
```

**Cross-Slot-Subtype-Asymmetrie:** Wenn der Store mehrere Slot-Subtypes hat (z.B. Starter + Bench), MUSS jede `setX`-Action gegen ALLE anderen Subtypes deduplen, nicht nur INNERHALB. Slice 272 hatte folgende Asymmetrie:
- `setBenchSlot` deduptete INNERHALB Bench, aber nicht vs. Starter
- `selectPlayer` (Starter) deduptete nicht vs. Bench

Fix: jede Action prüft alle Slot-Subtypes (siehe `lineupStore.ts` Slice 272).

**Picker-Filter-Konsistenz:** Wenn 2 Picker für 2 Subtypes existieren, MÜSSEN beide `getAvailableForX` Funktionen gegen ALLE belegten Slots filtern, nicht nur eigene Subtype:
```ts
// Pre-Slice-272 Asymmetrie
const usedIds = new Set(selectedPlayers.map((p) => p.playerId));  // ← nur Starter
// Bench-Player könnten im Starter-Picker auftauchen!

// Slice 272 Fix
const usedIds = new Set(selectedPlayers.map((p) => p.playerId));
if (benchGk) usedIds.add(benchGk);
if (benchO1) usedIds.add(benchO1);
// ... alle Bench-Slots
```

**DB-Server-Guard ist Pflicht (Money/Fantasy-Path):** Trotz UI-Defense MUSS Server validieren. RPC `rpc_save_lineup` hat `duplicate_player`-Guard via `v_seen` Array-Check über alle 12 Slots — Slice 272 UI-Fix ist Defense-in-Depth, ersetzt nicht Server-Validation.

**Reference:** Slice 272 Anil-Live-Bug-Report 2026-05-05. Files:
- `src/features/fantasy/store/lineupStore.ts` (selectPlayer + setBenchSlot Move-Semantik)
- `src/features/fantasy/hooks/useLineupBuilder.ts` (`getAvailablePlayersForPosition` excludet Bench)
- `src/components/fantasy/event-tabs/LineupPanel.tsx` Z.854-865 (Quick-Add isSelected-Skip)
- DB-Guard: `supabase/migrations/20260417110000_save_lineup_formation_validation.sql:248-258`

**Audit-Pattern:**
```bash
# Find Multi-Slot-Stores mit Insert-Action ohne ID-Filter
grep -rnE "selectedPlayers\.filter\(.*\.slot !==" src/features/*/store/
# Wenn `&& p.playerId !==` fehlt, Move-Semantik-Bug.
```

### Modal preventClose Pattern (J2 + J3)
- Jeder Modal mit `useMutation.isPending` → `preventClose={isPending}` pflicht. Sonst ESC/Backdrop-Click mitten in DB-Transaction verliert State.
- Heuristik: `Modal` + (`isPending|cancelling|selling|buying|submitting`) im gleichen File → nachruesten.
- Audit: `grep -rn '<Modal' src/components/ | grep -v preventClose`

### Liga/Context-Switch State-Reset via prevRef (Slice 254)

**Bug-Klasse:** Hook hat per-context-Default (z.B. per-Liga `active_gameweek`). User kann Context wechseln (Liga-Switch). State der Context-A's-Default-Wert hält bleibt nach Switch zu Context-B haengen — UI stuck-on-stale.

**Symptom:**
- Switch von Liga A (activeGw=28) zu Liga B (activeGw=30)
- UI zeigt weiterhin GW=28 obwohl B's Daten geladen wurden
- React-Query refetcht korrekt, aber lokaler State `selectedGameweek=28` haengt fest

**Root-Cause:** Init-useEffect setzt `selectedGameweek=activeGw` einmalig bei Mount. Bei Context-Switch laeuft Init-Effect nicht erneut weil Guard `selectedGameweek === null` faelscherlich falsch ist (=28 von vorher). Reset-useEffect ohne Init-Effect-Coordination loest Race aus: Reset setzt null, Init-Effect feuert mit stale-cached-activeGw, freezed wieder.

**Fix-Pattern (Slice 254 v2):** Init-Effect ENTFERNEN. State ist NUR manual-override:
```ts
// 1. Reset bei Context-Wechsel
const prevContextRef = useRef<string | null>(contextId);
useEffect(() => {
  if (prevContextRef.current !== contextId) {
    prevContextRef.current = contextId;
    setManualOverride(null);
  }
}, [contextId, setManualOverride]);

// 2. currentValue: manual-override winning, sonst context-default
const currentValue = manualOverride ?? contextDefault ?? fallback;
```

**KEIN init-useEffect** der `setManualOverride(contextDefault)` aufruft — der erzeugt den Pin-Effekt.

**Anti-Pattern (verboten):**
```ts
// Setzt manualOverride auf contextDefault → freezt Wert ueber Context-Wechsel
useEffect(() => {
  if (contextDefault && manualOverride === null) {
    setManualOverride(contextDefault);
  }
}, [contextDefault, manualOverride, setManualOverride]);
```

**Reference:** `src/features/fantasy/hooks/useGameweek.ts` Slice 254 Heal-v2.

### Cache-Invalidation: Root-Prefix vs enumerated Keys (Slice 254)

**Bug-Klasse:** Store oder Hook invalidet React-Query-Keys mit enumerated-Liste. Neuer Hook fuer dieselbe Domain wird hinzugefuegt, aber NICHT in der enumerated-Liste registriert. → silent stale-cache-Drift.

**Beispiel:**
```ts
// Pre-Slice-254 leagueScopeStore — 5 enumerated Sub-Keys
queryClient.invalidateQueries({ queryKey: ['events', 'leagueGw'] });
queryClient.invalidateQueries({ queryKey: ['events', 'leagueMaxGw'] });
queryClient.invalidateQueries({ queryKey: ['events', 'wildcardBalance'] });
// ... aber qk.events.all (=['events','list']) UNGEFLAGGED
// → Liga-Switch invalidiert nicht den primaeren Events-Hook
```

**Fix-Pattern: Root-Prefix-Match.** React-Query macht prefix-match — `queryKey: ['events']` invalidiert `['events', ...]` und alle children:
```ts
// Slice 254 Heal — robust gegen "neuer Hook unbeachtet"
await Promise.all([
  queryClient.invalidateQueries({ queryKey: ['events'] }),
  queryClient.invalidateQueries({ queryKey: ['fantasy'] }),
]);
```

**Tradeoff:** Root-Prefix invalidet auch nicht-context-aware Sub-Keys (z.B. `events.activeGw(clubId)` bei Liga-Switch). 5-10 unnoetige Refetches pro Switch. Dokumentieren als "broader-but-correct" — bei P95-Latency-Anstieg in Beta zurueck zu enumerated mit primaer-Hook ergaenzt.

**Wann Root-Prefix wahlen:**
- Domain-weiter State-Change (Liga-Switch, User-Switch, Locale-Switch)
- "Alles X-aware muss refetchen wenn X aendert" Mental-Model
- Drift-Risk hoch (mehrere Hooks, viele Konsumenten)

**Wann enumerated wahlen:**
- Sehr-spezifische State-Updates (z.B. einzelnes Feld)
- Performance-kritische Pfade (Latency-budget knapp)
- Konsumenten-Liste stabil und ueberschaubar

**Reference:** `src/features/shared/store/leagueScopeStore.ts` Slice 254 Heal.

### Filter-as-audience-choice vs Filter-as-result-filter (Slice 254)

**Bug-Klasse:** UI-Filter-Komponente ist gleichzeitig **Discoverability-Mechanism** (User soll wissen, dass Optionen X/Y/Z existieren) UND **Result-Filter** (Filter aus dem Result-Set abgeleitet). Catch-22 entsteht: bei Result-Set-leer ist Filter unsichtbar → User kann nicht switchen.

**Beispiel (FantasyContent.tsx pre-Slice-254):**
```ts
// FALSCH — Catch-22
const eventCountries = useMemo(() => {
  const eventCountryCodes = new Set<string>();
  for (const e of gwEvents) {
    if (e.clubId) eventCountryCodes.add(getClub(e.clubId)?.country);
  }
  if (eventCountryCodes.size === 0) return allCountries;
  return allCountries.filter(c => eventCountryCodes.has(c.code));
}, [gwEvents]);
// Wenn aktuelle GW nur TR-Events hat → eventCountries = [TR]
// CountryBar.tsx hat: `if (countries.length <= 1) return null` → CountryBar UNSICHTBAR
// User sieht keine Pillen → kann nicht zu BL/ES/EN/IT switchen
// Catch-22: Filter braucht Audience-Wahl, ist aber von Result abhaengig.
```

**Fix-Pattern:** Filter-Visibility ist **NIE** vom Result-Set abhaengig. Static-Source (z.B. `getCountries(locale)`) verwenden:
```ts
// Slice 254 Heal — Filter ist Audience-Choice
const eventCountries = useMemo(() => getCountries(locale), [locale]);
```

**Wann Result-Filter erlaubt:**
- User hat sich BEREITS innerhalb des Results bewegt (z.B. Position-Filter im Kader → Position-Pillen die der User hat machen Sinn).
- Filter ist **Verfeinerung**, nicht **primaere Navigation**.

**Wann Audience-Choice pflicht:**
- Filter ist Top-Level-Navigation (Liga, Country, Sprache, Tab).
- User muss **wissen** dass Optionen existieren (Discoverability).
- Mobile-Pflicht: kein Hover-Discovery moeglich.

**Reference:** `src/app/(app)/fantasy/FantasyContent.tsx` Slice 254 Heal.

### CSS / Tailwind Gotchas
- `::after` / `::before` mit `position: absolute` → Eltern MUSS `relative`. `overflow: hidden` reicht NICHT als Containing Block.
- `flex-1` auf Tabs → iPhone overflow → `flex-shrink-0`.
- Dynamic Tailwind NIEMALS: `border-[${var}]/40` → JIT scannt nur statische Strings. Nutze `style={{ borderColor: hex }}` + statische Class.

### `gold-pulse-bg` ist statischer Gradient — Pulse braucht zusätzlich `motion-safe:animate-pulse` (Slice 261)

**Bug-Klasse:** Klassenname `gold-pulse-bg` impliziert Animation, ist aber in `globals.css:124-126` nur `background-image: linear-gradient(...)` ohne `@keyframes`. Component-Author erwartet pulsierende Animation by name, sieht aber statischen Gold-Tint.

**Symptom:** Component nutzt `className="... gold-pulse-bg motion-reduce:animate-none"` und erwartet Aufmerksamkeits-Pulse bei Urgent-States. Visueller Output ist statischer Gold-Hintergrund — kein Bewegungs-Cue.

**Pattern-Source (working):** `src/components/home/HomeSpotlight.tsx:311` (NextEvent-Card) kombiniert beide Klassen:
```tsx
className={cn('gold-pulse-bg motion-safe:animate-pulse motion-reduce:animate-none', ...)}
```
- `gold-pulse-bg` liefert den Gold-Gradient als visuellen Underlayer
- `motion-safe:animate-pulse` liefert die tatsächliche Pulse-Animation (Tailwind-built-in opacity-keyframes)
- `motion-reduce:animate-none` honoriert prefers-reduced-motion

**Fix-Pattern bei neuen Komponenten:** Wenn Pulse gewünscht, IMMER beide Klassen + reduce-honor:
```tsx
className={cn(
  'gold-pulse-bg motion-safe:animate-pulse motion-reduce:animate-none',
  isUrgent ? 'border-gold/30' : 'border-white/10',
)}
```

**Reference:** Slice 261 P2-1-Drift gefangen vom Code-Reviewer post-BUILD, inline-gefixt vor Commit (`GameweekStatusBar.tsx:97`).

**Audit:** `grep -rn "gold-pulse-bg" src/components/ | grep -v "animate-pulse" | head` — Treffer prüfen ob Pulse gewünscht ist (dann patchen) oder nur Gradient als visual-distinction (dann OK lassen).

### Tailwind data-* Variants nur auf Tailwind-Utilities (Slice 181)
- `data-[state=open]:anim-modal` in className **wirkt nicht**, wenn `anim-modal` plain CSS class in `globals.css` ist (nicht in `@layer utilities`).
- Tailwind generiert die Variant-Selectoren nur fuer **bekannte Utilities**. Plain global-CSS-Klassen sind nicht bekannt → keine Output-Rule, keine Animation.
- Symptom: Radix-Wrapper rendert, aber Open/Close-Animation fehlt komplett. Visual-Regression vs. ehemalige direkte `anim-modal`-Klasse.
- Fix-Pattern:
  ```css
  /* Slice 181 — anim-* in @layer utilities, damit Tailwind data-state Variants generiert */
  @layer utilities {
    .anim-modal { animation: modal-in 0.2s ease-out; }
    .anim-bottom-sheet { animation: slide-up 0.25s cubic-bezier(0.32, 0.72, 0, 1); }
    .anim-fade { animation: fade-in 0.2s ease-out; }
    .anim-dropdown { animation: dropdown-in 0.15s ease-out; }
  }
  ```
- Verify: `grep -oE "data-state=open[^{]{0,80}\\{[^}]{0,80}" .next/static/css/*.css` — sollte 4 Animation-Rules zeigen post-build.
- Gilt analog fuer `data-[state=closed]:`, `data-[disabled]:`, `aria-[expanded=true]:` etc.

### Non-reaktiver Module-Cache + useMemo-stale-deps → Cold-Load-Race (Slice 286, 2026-06-13)

**Bug-Klasse:** Ein Module-Level-Cache (`leagueCache`/`clubCache`-Familie in `src/lib/`) wird **async** befüllt (`initLeagueCache()` aus DB). Komponenten lesen ihn **synchron** in einem `useMemo` mit deps, die sich bei Cache-Ready NICHT ändern (z.B. `[locale]`, `[country]`). Beim ersten Render (Cold-Load) ist der Cache leer → der useMemo captured die leere Liste und **recomputet nie**, weil der async-Load kein Re-Render mit geänderten deps triggert. Folge-Effekt: `if (list.length <= 1) return null`-Guards (Slice 254 Smart-Collapse) kollabieren die ganze UI-Komponente → app-weit unsichtbar.

**Symptom (Slice 286 Live-Bug, bei Slice-285-Verifikation entdeckt):** Liga-Filter (`CountryBar` via `getCountries`, `LeagueBar` via `getAllLeaguesCached`) rendert **leer** bei **Hard-Navigation / Hard-Refresh / PWA-Cold-Start** — DOM-verifiziert `[data-testid=league-scope-header]` `childCount: 0` auf /rankings + /clubs. Bei **warmer SPA-Navigation** (Klick durch die App, Cache schon ready) korrekt (9 Buttons). Deshalb in einer Live-Beta lange latent — Cold-Load trifft v.a. Mobile/PWA.

**Root-Cause-Kette:**
1. Provider rendert Children sofort, ohne Gating auf `cachesReady` (`ClubProvider.tsx:167`).
2. `initLeagueCache()` ist async → `leagueCache` zunächst leer.
3. `useMemo(() => getCountries(locale), [locale])` captured `[]`, recomputet nie.
4. `CountryBar:22` / `LeagueBar:38` `if (length <= 1) return null` → Bar weg.

**Fix-Pattern (Root-Cause): reaktives Cache-Ready-Signal via `useSyncExternalStore`.**

Module-Cache framework-frei lassen, nur ein Versions-Signal exportieren:
```ts
// src/lib/leagues.ts
let cacheVersion = 0;
const cacheListeners = new Set<() => void>();
function emitCacheChange() { cacheVersion += 1; cacheListeners.forEach((l) => l()); }
export function subscribeLeagueCache(listener: () => void) {
  cacheListeners.add(listener);
  return () => { cacheListeners.delete(listener); };
}
export function getLeagueCacheVersion() { return cacheVersion; }
// ... in initLeagueCache() NACH cacheReady = true:  emitCacheChange();
```
```ts
// src/lib/hooks/useLeagueCacheVersion.ts  ('use client')
export function useLeagueCacheVersion(): number {
  return useSyncExternalStore(subscribeLeagueCache, getLeagueCacheVersion, getLeagueCacheVersion);
}
```
```ts
// Konsument: cacheVersion als zusätzliche useMemo-dep
const cacheVersion = useLeagueCacheVersion();
const countries = useMemo(() => getCountries(locale), [locale, cacheVersion]);
```

**Warum useSyncExternalStore (nicht `useClub().loading` als dep):** Generische UI-Komponenten (`src/components/ui/CountryBar`, `LeagueBarShared`) dürfen nicht von ClubContext abhängen — falsche Layer + Wiederverwendbarkeit. Das Signal gehört an die **Daten-Quelle** und deckt damit ALLE Caller. SSR-safe via 3. Arg `getServerSnapshot` (=`getLeagueCacheVersion` → 0 auf Server == Client-initial 0 → kein Hydration-Mismatch). Primitiver number-Snapshot → `Object.is` stabil, kein Loop (emit nur 1× bei init + selten bei refresh, Daten deterministisch).

**Warum nicht Provider-Gating:** würde die GANZE App hinter dem Cache-Load blockieren (Render-Verzögerung für alle Pages) — zu invasiv für ein Filter-Bar-Problem.

**Out-of-scope (gleicher Cache, aber NICHT race-prone):**
- useMemo-dep enthält async-Daten die ohnehin nach dem Cache laden (z.B. `KaderTab:249` dep `bestandItems`) → self-healt.
- Cache-Read im **Click-/Effect-Handler** (`BestandView:239`, `clubs/page.tsx:55`) → feuert erst nach User-Interaktion → Cache warm.
- Read gated auf `cachesReady` (`leagueScopeStore:220` via ClubProvider).

**Detection-grep:**
```bash
# Render-time useMemos die einen async Module-Cache lesen, ohne Cache-Version-dep:
grep -rnE "useMemo\(\(\) => (getCountries|getAllLeaguesCached|getActiveLeagues)" src/ \
  | # dann manuell prüfen: ist cacheVersion / cache-ready in den deps?
```

**Test-Mock-Pflicht:** Jeder Test der `@/lib/leagues` mockt UND einen Hook-Konsumenten rendert braucht Mock-Expansion: `subscribeLeagueCache: () => () => {}` + `getLeagueCacheVersion: () => 0` (sonst `useSyncExternalStore` wirft auf undefined-subscribe).

**Backlog:** `clubs.ts` (`initClubCache`/`getClub`) hat dasselbe non-reaktive Pattern. Falls je ein render-time `useMemo(() => getClub(...))` entsteht → gleiche Race, gleiches Fix-Pattern anwendbar.

**Beziehung:** Pattern-Familie „Cold-Start-State-Race" mit Slice 268 (`initialData` vs `placeholderData`) + Slice 267 (Map/Set-Serialization). Verletzt Slice 254 (Filter-as-audience-choice) NICHT — die `length<=1 return null`-Guards bleiben korrekt für echte 1-Liga-Länder (England→nur PL); gefixt wird der Recompute-Trigger, nicht der Guard.

**Reference:** Slice 286 — `src/lib/leagues.ts`, `src/lib/hooks/useLeagueCacheVersion.ts`, `LeagueScopeHeader.tsx:56`, `FantasyContent.tsx:111`, `LeagueBarShared.tsx:38`. Proof: `worklog/proofs/286-cache-race.md` (Cold-Load buttonCount 0→9 auf 3 Pages).

### TanStack Query v5: `initialData` vs `placeholderData` für Cold-Start-Mirror (Slice 268)

**Bug-Klasse:** Hook nutzt `initialData: cached` aus localStorage als Cold-Start-Optimierung. Slice 265 hat das gemacht und broke Page-Render. Root-Cause-Analyse zeigt: `initialData` markiert Wert als **persistiert data** mit `dataUpdatedAt = Date.now()` (oder via `initialDataUpdatedAt`-Override). Konsumenten die `dataUpdatedAt`-basiertes Freshness-Gating machen (z.B. `useIsBalanceFresh`) sehen "fresh-vor-fetch" → Money-Path-Bug. Plus: `enabled: !!userId` Race kann initialData mit User-A's Wallet bei User-B's Render zeigen wenn Single-Slot-Storage.

**Decision-Tree:**

| Anwendungsfall | Wähle |
|----------------|-------|
| Cold-Start Display-Cache + Money-Path-relevant | **`placeholderData`** (siehe Pattern #45) |
| Cold-Start Display-Cache + nicht-Money | `placeholderData` (auch hier sicherer) |
| Tab-zu-Tab-Daten-Übernahme im selben Mount | `keepPreviousData` (deprecated v5, ersetzt durch `placeholderData: keepPreviousData` Helper) |
| Server-Side Pre-Fetch via Hydrate (RSC) | `dehydrate/HydrationBoundary` — KEIN initialData |

**`placeholderData` Garantien (TanStack v5):**
- `dataUpdatedAt = 0` bis erfolgreicher Fetch → Freshness-Hooks returnen false → Money-Path geschützt
- NICHT als data persistiert — `query.data` ist placeholder, aber `query.status === 'pending'`
- Refetch läuft normal (`staleTime: 0` empfohlen für Mirror-Pattern damit Background-Refetch immer feuert)

**`initialData` Anti-Pattern für Mirror:**
```ts
// VERBOTEN für UID-keyed Mirror-Hooks:
useQuery({
  initialData: cached,
  initialDataUpdatedAt: 0,  // markiert als 1970-stale, ABER als data persistiert
  staleTime: 30_000,         // → wenn cache als initialData kommt, nutzt staleTime relativ zu 0 → trotzdem refetch...
})
// ABER: race-Window mit `enabled: !!userId` führt zu Cross-User-Pollution wenn cache single-slot
```

**Audit:**
```bash
# Mirror-Hooks die initialData nutzen (verdächtig):
grep -rnE "initialData:" src/lib/hooks/ src/lib/queries/ src/features/*/hooks/

# Hooks die localStorage in useState init lesen (SSR-Hydration-Bug):
grep -rnE "useState\([^)]*localStorage" src/
```

**Reference:** Slice 265 (REVERTED Commit `d76007f8`) → Slice 268 (Slice-265-done-right mit placeholderData).

### Map/Set-typed React-Query-Data + Persist/SSR = stille Korruption (Slice 267)

**Bug-Klasse:** Service-Layer returnt `Promise<Map<K, V>>` oder `Promise<Set<T>>`. Konsument ruft `useQuery({ queryFn: () => service() })` auf. Bei TanStack-Query mit `persistQueryClient` (Slice 261) ODER bei SSR-Hydrate via Next.js wird die Map/Set durch JSON.stringify gepresst — `JSON.stringify(new Map())` ergibt `"{}"`. Beim Rehydrate kommt ein **Plain-Object** zurück, nicht die Map. Konsumenten die `.values()` / `.size` / `.get()` / `.forEach()` aufrufen crashen mit:

```
TypeError: n.values is not a function (oder n.size, n.get, n.forEach)
  at useMemo (...)
  at <Hook> (...)
```

**Reichweite (Slice 267 Audit):** Mindestens 9 Services in BeScout returnten Map: `getFixtureDeadlinesByGameweek`, `getRecentPlayerMinutes`, `getRecentPlayerScores`, `getNextFixturesByClub`, `getFloorPricesForPlayers`, `getPlayerEventUsage`, `getActiveSubscriptionsByUsers`, `getMostOwnedPlayerBatch`, `getPlayerScores`. Konsumenten in fantasy/manager/market.

**Symptom Anil-Live-Bug 2026-04-30:** "spieltag content und andere werden nicht angezeigt/geladen". Manager-Page Error-Boundary "Etwas ist schiefgelaufen", Spieltag leer, Home wirft TypeError 3× silent in Console.

**Defense-in-Depth-Fix (3-Layer):**

1. **Persist-Cache Layer-4-Filter** (`QueryProvider.tsx` `shouldDehydrateQuery`):
```ts
// Layer 4 (Slice 267): Map/Set niemals dehydrieren — JSON.stringify zerstoert sie.
const data = query.state.data;
if (data instanceof Map || data instanceof Set) return false;
```

2. **Defensive Map-Reconstruction im Konsument-Hook**:
```ts
const { data: rawData } = useQuery({...});
const myMap = useMemo<Map<K, V>>(() => {
  if (rawData instanceof Map) return rawData;
  if (rawData && typeof rawData === 'object') {
    return new Map(Object.entries(rawData)) as Map<K, V>;
  }
  return new Map<K, V>();
}, [rawData]);
```

3. **Buster-Bump bei Persist-Schema-Changes** (`persistQueryClient` config):
```ts
buster: 'v2-slice267',  // war 'v1' — verwirft existierende korrupte caches
```

**Bessere Architektur (langfristig — Service-API-Refactor):** Services NICHT direkt Map returnen lassen. Stattdessen `Array<[K, V]>` returnen, Konsument konstruiert Map. Tuple-Arrays sind JSON-safe, Map-Konstruktion ist Konsument-Verantwortung.

**Audit:**
```bash
grep -rnE "Promise<(Map|Set)<" src/lib/services/ src/features/*/services/
grep -rnE "useQuery.*get(.*(Map|Set))" src/
```

**Beziehung zu D43 / errors-db.md "PostgREST nested-select Auth-Race":** Beide sind "Service-API gibt nicht das was Consumer erwartet" — DB-Layer NULL durch Auth-Race, hier Map durch Serialization. Beides hat Defense-in-Depth-Layered-Mitigation als Fix-Pattern.

### Multi-League Props-Propagation (J3 + J4)
- Neues optional Field auf Type (z.B. `leagueShort?`) → nur 2/8 Render-Call-Sites bedient. TSC/Tests merken nichts (optional = kein Error).
- Visual-QA im Pilot (1 Liga) uebersieht's, Fehler erst im Multi-League-Betrieb.
- Regel: Jedes Type mit `club*` Field MUSS spiegelbildlich `league*` Fields haben. ALLE Render-Call-Sites manuell greppen.

### Data-Format vs Component-Expectation Drift (Slice 102)
- Scraper speichert Full-Name ("Nigeria"), Component erwartet ISO-Code ("NG"). `hasFlag("NIGERIA")` = false → unsichtbarer text-badge-Fallback.
- Bonus-Bug: Pilot-Default `?? 'TR'` auf service-layer setzt NULL-Spieler auf tuerkisches Flag — bei Multi-Liga-Expansion wird Pilot-Default zum Gift.
- Regel: Component-API-Contract muss im Service-Layer-Mapper erzwungen werden. Leer/unbekannt → `""` / `undefined`, **nie** raten. Truthy-Check im Component: `{code && <Flag ...>}`.
- Library-Quirk: `country-flag-icons` — `hasFlag("GB-ENG")` true, aber React-Export heisst `GB_ENG` (Underscore).
- Audit: `SELECT DISTINCT <field>, COUNT(*) FROM <table> GROUP BY <field>` → jede Zeile gegen Component-Contract validieren.

### ConfirmDialog statt native alert/confirm (J4)
- Live: `src/components/ui/ConfirmDialog.tsx` — built-in preventClose + loading/disabled + `confirmVariant: 'gold' | 'danger'`.
- Native alert/confirm sind unstyled, blockieren Main-Thread, nicht i18n-ready.
- Audit: `grep -rn 'window.alert\|window.confirm' src/`

### UX Konsistenz
- Spieler-Anzeigen → Link zu `/player/[id]` (Ausnahme: Picker-UIs).
- `<button>` NICHT in `<Link>` wrappen (invalid HTML) → `href` Prop oder Wrapper.

### Vote-Toggle Client-Intent vs RPC-Constraint (Slice 159 → 160)
- Client sendet `voteType=0` fuer Toggle-Off, aber RPC Guard blockt `NOT IN (1,-1)` mit `{success:false}`. Service castet `data as { upvotes: number }` silent auf `undefined` → UI-State-Breakage.
- RPC hat internal DELETE-Branch wenn `p_vote_type = v_existing.vote_type` (same → remove). Client muss **same vote_type** senden, nicht 0.
- Fix-Pattern (Slice 160): UI sendet immer `1` oder `-1`. Handler liest lokalen State, ermittelt `isToggleOff = prevVote === voteType`.
- Audit: `grep -rnE "voteType === (0|1|-1) \? 0" src/`

### React setState Race in Mutation-Handler (Slice 149-151 — D18)
- `async handleX() { if (loading) return; setLoading(true); ... }` ist race-prone. React setState async — 2 Clicks in Render-Frame beide passieren → 2 parallele DB-Writes.
- Symptom: Follow-Button zeigt kurz +2 Delta; Wallet doppelt abgebucht.
- Fix: `useSafeMutation` aus `src/lib/hooks/useSafeMutation.ts`. `safeTrigger(variables)` mit synchronem `isPending`-Guard via React Query v5 MutationObserver.
- Money-Path erweitert: `useSafeIdempotentMutation` (Slice 178d) mit Auto-Key.
- Audit: `npm run audit:mutation-race`.

### Component-Prop Silent-Fallback (Slice 149b — D17)
- `prop?: T | null` + Fallback-Branch mit schlechter UX: Caller-Sites koennen prop weglassen **ohne TSC-Error**, User sieht degraded UI.
- Beispiel: `PlayerPhoto(imageUrl?)` — 7/10 Call-Sites korrekt, 3 vergessen → 30% silent-fail.
- Prevention: Fallback-Branch mit schlechter UX → prop **required** + Caller `imageUrl={x ?? null}` explicit.

### Singleton→useQueryClient() Migration exhaustive-deps-Trap (Slice 170 → 171)
- Module-Import `queryClient` ist exhaustive-deps exempt. Hook-lokales `useQueryClient()`-Binding MUSS in alle deps-arrays die `queryClient.*` lesen.
- Runtime-Impact meist Null (React Query v5 Garantie stable instance), aber Konvention-Konsistenz + ESLint-warn bei strict.
- Post-Migration-Audit: `grep -n "queryClient\." <file>` → jede enclosing useCallback → deps pruefen.
- Test-Pattern: `vi.hoisted(mockQc)` + partial `@tanstack/react-query`-Mock (siehe testing.md §5).

### Realtime-Hook-Refactor: TanStack-Query → Subscription-only callback bei Konsumenten-State-Mismatch (Slice 267)

**Bug-Klasse:** Wave-2-Frontend-Agent baut Realtime-Hook im TanStack-Query-Pattern (`useQuery({queryFn, refetchInterval}) + setQueryData(qk.X)` im Subscription-Callback). Konsument-Component nutzt aber **`useState<T[]>`** für die gleichen Daten (z.B. existing SpieltagTab pre-Slice-267). Result: Doppel-Fetch (Hook fetcht initial via TanStack + Component fetcht eigenen Pfad), State-Drift zwischen Hook-Cache und Component-Local-State, Realtime-Updates landen im Cache aber Component liest local-state.

**Symptom:** Hook ist „compile-clean" + Tests grün, aber Component-Konsument zeigt nicht die Realtime-Updates. Manueller Refresh nötig.

**Root-Cause:** Mismatch zwischen:
- Hook-Architektur (TanStack-Query als Backing-Store, setQueryData in Subscription-Callback)
- Component-Architektur (useState als Backing-Store, setX in eigener Loader-Function)

**Fix-Pattern (Slice 267 useLiveFixtures):**

Hook auf **Subscription-only callback-driven Pattern** umbauen (analog `src/lib/queries/social.ts:46-90` `useFollowingFeed` Goldstandard):

```ts
export type LiveChannelStatus = 'SUBSCRIBED' | 'CHANNEL_ERROR' | 'TIMED_OUT' | 'CLOSED';

export type UseLiveOptions<T> = {
  /** Called for every UPDATE event */
  onUpdate?: (row: T) => void;
  /** Optional channel-status observer (used for polling-fallback) */
  onStatus?: (status: LiveChannelStatus) => void;
};

export function useLiveX(
  scopeId: string | undefined,
  options?: UseLiveOptions<DbX>,
): { isPolling: boolean } {
  const [isPolling, setIsPolling] = useState(false);

  // STABLE CALLBACK-REFS — verhindert re-subscribe-Storm bei inline-callbacks
  const onUpdateRef = useRef(options?.onUpdate);
  const onStatusRef = useRef(options?.onStatus);
  useEffect(() => {
    onUpdateRef.current = options?.onUpdate;
    onStatusRef.current = options?.onStatus;
  }, [options?.onUpdate, options?.onStatus]);

  useEffect(() => {
    if (!scopeId) return;
    const channel = subscribeXUpdates(scopeId,
      (row) => onUpdateRef.current?.(row),
      (status) => {
        const typed = status as LiveChannelStatus;
        if (typed === 'CHANNEL_ERROR' || typed === 'TIMED_OUT' || typed === 'CLOSED') setIsPolling(true);
        else if (typed === 'SUBSCRIBED') setIsPolling(false);
        onStatusRef.current?.(typed);
      },
    );
    return () => { supabase.removeChannel(channel); };
  }, [scopeId]);  // Callbacks via ref, NICHT in deps

  return { isPolling };
}
```

**Konsument bridges Hook → eigener State:**

```ts
// Component nutzt useState weiter, Hook nur als Side-Effect-Subscription
useLiveX(scopeId, {
  onUpdate: (updatedRow) => {
    setLocalState((prev) => prev.map(r => r.id === updatedRow.id ? {...r, ...updatedRow} : r));
  },
});

// Polling-Fallback kann Konsument selbst orchestrieren
const { isPolling } = useLiveX(...);
useEffect(() => {
  if (!isPolling) return;
  const interval = setInterval(() => loadFromAPI(), 60_000);
  return () => clearInterval(interval);
}, [isPolling]);
```

**Wann TanStack-Query-Pattern wählen vs. Callback-Pattern:**

| Konsument-Architektur | Hook-Pattern |
|----------------------|--------------|
| Konsument nutzt `useQuery(qk.X)` | TanStack-Query-Hook mit `setQueryData(qk.X)` im Subscription |
| Konsument nutzt `useState<T[]>` | **Subscription-only callback-Pattern** (Slice 267) |
| Konsument ist neu / wird parallel gebaut | TanStack-Query (zukunftssicher) |
| Konsument ist legacy + Refactor out-of-scope | **Callback-Pattern** (Slice 267) |

**Detection-vor-BUILD:** Bei Wave-Dispatch mit Realtime-Hook → Code-Reading-Liste MUSS Konsument-File enthalten. Bei `useState<T[]>` im Konsument: SPEC explizit Callback-Pattern fordern.

**Reference:** Slice 267 Wave 2 Frontend baute TanStack-Query-Hook, Wave 3 Hook-Refactor + SpieltagTab-Wire-Up post-Merge zur Subscription-only-Pattern. `worklog/reviews/267-review.md` Architektur-Bewertung.

### qk-Key-Definition ohne Konsument (Slice 267)

**Bug-Klasse:** Spec definiert neuen `qk.{namespace}.{key}` (z.B. `qk.fixtures.live(leagueId)`), Implementation fügt Key in `src/lib/queries/keys.ts` hinzu, aber **kein Konsument** verwendet ihn (z.B. nach Hook-Refactor weg von TanStack-Query-Pattern). Result: orphan-Export, kein Production-Impact aber Code-Smell + Reviewer-Verwirrung.

**Detection:**

```bash
# Findet definierte Keys ohne Konsument
for key in $(grep -oE "[a-z_]+: \([^)]*\) =>" src/lib/queries/keys.ts | sed 's/:.*//'); do
  count=$(grep -rn "qk\.[a-z]*\.${key}\b" src/ --include="*.ts" --include="*.tsx" 2>/dev/null | grep -v "src/lib/queries/keys.ts" | wc -l)
  [ "$count" = "0" ] && echo "ORPHAN: qk.*.$key"
done
```

**Fix-Optionen:**

1. **Delete** wenn 0 Konsumenten + kein zukünftiger Plan → cleanest
2. **JSDoc-Reserve-Comment:** `/** Reserved — not yet consumed (intended for X). May be removed if X never lands. */` → behält Doku-Spur
3. **Konsumenten-Plan dokumentieren:** Wenn Plan klar in Spec → Reference + Datum

**Reference:** Slice 267 `qk.fixtures.live(leagueId)` (`src/lib/queries/keys.ts`) — definiert in Spec für TanStack-Query-Hook-Pattern, nach Hook-Refactor auf callback-only nicht mehr genutzt. Reviewer fand als F-NEW-09 MINOR. Optionale Cleanup im Future-Slice 267b.

## i18n / Locale

### JSON Object/String-Duplicate-Key-Drift (Slice 263 Pre-Review F-01)

**Symptom:** Pre-existing Top-Level-String + neues Sub-Object mit gleichem Key im selben Namespace (z.B. `home.manager: "Manager"` String + Slice-262-`home.manager: { gwLabel: ... }` Object). JSON-Parser-Verhalten: `last-wins`. String wird unreachable, **kein Linter-Error**, latent.

**Detection:**
```bash
# Findet Namespace mit doppelter Top-Level-Key-Definition
grep -nE '^\s{4}"(\w+)":\s' messages/de.json | sort | uniq -d -w 30
# Oder via Node:
node -e "const d = require('./messages/de.json').home; for(const k in d) { console.log(typeof d[k], k); }"
```

**Latente Bombe:** Wenn künftiger Code `t('home.manager')` als String liest (statt `t('home.manager.gwLabel')`) → React-Render-Crash mit „Objects are not valid as a React child".

**Fix-Pattern:**
1. **Top-Level-String löschen** wenn 0 Consumer (`grep "t('namespace.key')" src/` → leer). Slice 263 hat das mit `home.manager: "Manager"` + `home.scout: "Scout"` gemacht.
2. **ODER Sub-Namespace umbenennen** (z.B. `home.managerBlock` statt `home.manager`) — symmetrisch zu Component-Namen.
3. **ODER pre-existing-String beibehalten und Sub-Namespace-Drift dokumentieren** (Anti-Pattern, nur in Notfällen).

**Reference:**
- Slice 262 hat `home.manager: { gwLabel ... }` als Object eingeführt → Latent-Drift mit pre-existing `home.manager: "Manager"` String (Z.371 in damals).
- Slice 263 hat Top-Level-Strings gelöscht (`home.manager`/`home.scout` Z.371-372 in beiden Locales) — saubere Single-Pfad-Resolution.
- Pre-Review-Catcher D62 fand das vor BUILD — ohne Pre-Review wäre der Drift live gegangen.

**Pflicht-Check bei i18n-Erweiterung:** Bei jedem neuen Sub-Object in messages/{locale}.json prüfen ob gleicher Top-Level-Key bereits als String existiert.

### i18n-Key-Leak via Service-Errors (J1 + J3)
- `throw new Error('handleReserved')` → `err.message === 'handleReserved'` (raw key). Caller mit `setError(err.message)` zeigt literal unuebersetzt.
- Fix: Caller resolved via `mapErrorToKey(normalizeError(err)) → te(key)`.
- Konvention: Service wirft I18N-KEYS, Consumer resolved via `t()`.
- Nach JEDEM swallow→throw-Refactor ALLE gleichartigen Consumer-Pfade greppen.
- Audit: `grep -n 'throw new Error' src/lib/services/` → Keys vs. `setError(err.message)`.

### Missing i18n-Key bei neuer CTA-Component (Slice 198, Reviewer-Find)
- Neuer Button/Toggle/CTA mit `tNamespace('newKey', { defaultMessage: '...' })` — `defaultMessage` ist next-intl-Fallback. Component rendert "korrekt", aber **TR-User sieht DE-defaultMessage-String** (Locale-Mix-Bug). Kein TSC-Error, keine Console-Warning.
- Fix: Nach JEDEM neuen `t('namespace.key')` in einer Component IMMER beide Locales bedienen.
- Audit (post-Implementation pflicht):
  ```bash
  grep -oE "t[A-Za-z]*\\(\\s*['\"]([a-zA-Z]+\\.[a-zA-Z]+)" src/components/<new>.tsx \
    | sed -E "s/.*['\"]//; s/['\"].*//" \
    | sort -u \
    | while read key; do
        grep -q "\"${key#*.}\"" messages/de.json messages/tr.json || echo "MISSING: $key"
      done
  ```
- Reference: Slice 198 Track C `KaderPlayerRow.tsx:301` — `manager.quickLineupAction` fehlte in beiden Locales. Reviewer-Agent caught Post-Build (Slice 198 Heal).
- Beziehung zu i18n-Key-Leak: gleiche Bug-Klasse, andere Achse (Leak = Service-Error-Path, hier = Component-Render-Path).

### Polish-Audit Pre-Existing-Code-Drift (Slice 200a, Reviewer-Find)
- Punch-List-Item klassifiziert "X fehlt", aber Code im **consumed Hook/Service** des Components löst es bereits. Polish-Audit greppt nur Component-File, verpasst Hook-source.
- Symptom: Implementer fügt neuen useEffect/State hinzu → **Duplicate** zu pre-existing Logic. Beide feuern parallel auf gleichen Trigger. Cleanup-Order undefiniert. tsc + Tests bleiben grün → Bug erst durch Cold-Context-Reviewer entdeckt.
- Reference (Slice 200a): UX-#2 Audit-Item "Buy-Error-Banner auto-dismiss fehlt" — pre-existing 5s setTimeout in `useTradeActions.ts:63-69` seit Slice 161. Neuer useEffect in `MarketContent.tsx:82-92` war Audit-Stale → vom Reviewer-Agent gefangen.
- **Detection-Pflicht VOR "fehlt"-Klassifikation:**
  ```bash
  grep -rn "<spec-pattern>" src/features/<domain>/hooks/ src/features/<domain>/services/ src/lib/hooks/
  ```
- Prevention: Bei Polish-Sweeps ab Slice 198+ vor Implementation per `grep` über consumed-hook-source verifizieren. Reviewer-Agent als Backup-Catcher pflicht.
- Beziehung zu Service-Duplicate (D46): gleiche Bug-Klasse "Audit/Spec-Drift verdeckt pre-existing Code", andere Achse (D46 = parallele BE+FE-Worktrees, hier = Audit-Stale aus Punch-List).

### Service-Duplicate bei parallelem BE+FE-Dispatch (Slice 199, Reviewer-Find — D46)
- BE-Agent + FE-Agent in parallelen Worktrees implementieren denselben Service unabhängig (z.B. `getTopPredictorsLeaderboard` in `src/lib/services/leaderboards.ts` UND `src/features/fantasy/services/predictions.queries.ts`).
- Symptom: FE-Hook nutzt FE-Variante → BE's Service-File ist **orphan production-code** (kein Import). TSC clean, keine Errors. Drift-Risk: Wenn Schema-Änderung, müssen beide synchronisiert werden.
- Detection (post-merge): `grep -rn "import.*from.*'<be-service-path>'" src/` — wenn 0 Results: orphan.
- Fix-Pattern (Slice 199): canonical Service-File behalten, Duplicate löschen, Hook-Import re-routen.
- Prevention (D46): SPEC-Sektion "Service-Schnittstelle" pflicht bei Cross-Domain-Slices — kanonischer File-Pfad + exakte Signatur vorab spezifizieren.
- Reviewer-Pflicht: Bei Cross-Domain-Slices `grep` für duplicate exports im post-merge-Diff.

### Hardcoded German addToast/Error-Strings (Slice 196 Track B)
- User-facing components mit `addToast('Ein Fehler ist aufgetreten', 'error')` oder `addToast('Speichern fehlgeschlagen', 'success')` umgehen i18n und brechen TR-Locale komplett (TR-User sieht DE-Text).
- Identische Klasse zu i18n-Key-Leak oben, nur Toast-Pfad statt setError.
- Audit-CI-Detector: `grep -rn "addToast\\('[A-Z]" src/ | grep -v "bescout-admin\\|__tests__"`
  - bescout-admin/* exempt: Admin-UI darf hardcoded DE bleiben (CEO-Decision).
  - __tests__/* exempt: Test-Strings.
- Fix-Pattern:
  ```ts
  const te = useTranslations('errors');
  catch (err) {
    addToast(te(mapErrorToKey(normalizeError(err))), 'error');
  }
  ```
- Reference: Slice 196 Track B fixed founding/page.tsx + profile/settings/page.tsx + compare/page.tsx.

### Error-Messages nie dynamische Werte (J3 Triple-Red-Flag)
- `throw new Error(\`Price exceeds maximum (${X} $SCOUT)\`)` hat 3 Probleme: DE/EN-Mix + $SCOUT-Ticker user-facing + dynamischer Wert.
- Dynamic gehoert in Pre-Submit-Hints, nicht Post-Error.

### Turkish Unicode
- `I`.toLowerCase() = `i̇` (NICHT `i`) → NFD + strip diacritics + `ı→i`.
- SQL: `translate(lower(name), 'şçğıöüİŞÇĞÖÜ', 'scgiouISCGOU')`.

### Money-RPC Idempotency-Window (151c.2)
Historischer Pattern (Slice 151c.2 inline-60s) — jetzt via generic Slice 178a-f abgeloest. Siehe `errors-db.md` Money-RPC Idempotency-Blueprint.

### useCountUp auf volatile Server-Daten (Slice 151b-RESET — D20)
- `useCountUp(serverData, durationMs)` animiert jedes Re-Render. Auf React-Query-Daten die zwischen Optimistic/Stale/Real hopsen: 2-3 sichtbare Animations-Zyklen.
- Symptom: Hero + StatsBar animierten parallel mit unterschiedlichen Start-Punkten → Desync.
- Fix: `useDeferredValue` davorschalten.
  ```ts
  const stable = useDeferredValue(followerCount);
  const count = useCountUp(stable, 600);
  ```
- Audit: `grep -rn 'useCountUp(' src/ | grep -v useDeferredValue`.

### PLAYER_SELECT_COLS Sync mit DbPlayer-Type (Slice 200, aus 197d Production-Drift)
- `src/lib/services/players.ts` exportiert `PLAYER_SELECT_COLS` Konstante mit explicit-listed columns für `.select()`-Calls. Diese Liste MUSS mit `DbPlayer`-Type in `src/types/index.ts` synchron sein.
- Symptom (Slice 197d → 200 Discovery): `mv_trend_7d` Column in DB existing + DbPlayer-Type erweitert + dbToPlayer-Mapper liest `db.mv_trend_7d ?? null`, **aber PLAYER_SELECT_COLS nie aktualisiert** → PostgREST sendet die Spalte nicht zurück → mvTrend7d immer `null` für alle Players → Frontend MV-Trend-Filter rendert nie Pfeile, der ganze Slice 197d war 1 Tag latent broken in Production.
- TS-Cast lügt (kein Compile-Error): Spread `...db` filtert nur was inkommt. NULL-Mapping verschleiert Bug.
- **Pflicht-Regel:** Bei JEDEM `ALTER TABLE players ADD COLUMN <X>`:
  1. DbPlayer-Type ergänzen
  2. dbToPlayer-Mapper ergänzen
  3. `PLAYER_SELECT_COLS` ergänzen ← oft vergessen
  4. Frontend-Tests gegen echte DB-Response (kein Mock-only)
- Audit: `grep -E "db\.[a-z_]+" src/lib/services/players.ts | sed 's/.*db\.//; s/[^a-z_].*//' | sort -u` → jeden Wert gegen PLAYER_SELECT_COLS-Liste pruefen.
- Reference: Slice 200 Reviewer-Find Bonus-Observation. Pattern gilt analog für andere `*_SELECT_COLS`-Konstanten (CLUB_SELECT_COLS etc.).
