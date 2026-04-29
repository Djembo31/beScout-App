---
description: Frontend-Fehler — React/TS/CSS, i18n/Locale
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

## i18n / Locale

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
