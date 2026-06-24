---
paths:
  - "src/components/**"
  - "src/app/**"
  - "src/features/**"
  - "src/lib/hooks/**"
---

# Errors: Frontend — Navigator

Stand: 2026-06-23 · **Slice 352:** Dieser Navigator (always-loaded bei `.tsx`/Hook-Edit) trägt je Pattern die **ACTIONABLE Regel inline**. Der volle Detail (Root-Cause, Code-Blöcke, Audit-greps, Reference) liegt **on-demand** in `errors-frontend-detail.md`. Siehe auch `ui-components.md`, `testing.md`.

> **Nutzung:** Jede Zeile ist die Guardrail — danach handeln. Trifft ein Pattern wirklich zu (oder brauchst du Code/Audit-grep) → `.claude/rules/errors-frontend-detail.md` öffnen, Abschnitt « *Heading* » lesen. Pattern-Namen unten = exakte Detail-Headings.

## React / TypeScript

### Checklist (immer)
- Hooks VOR early returns.
- `Array.from(new Set())` / `Array.from(map.keys())` statt Spread (strict TS).
- Modal: IMMER `open={true/false}` prop.
- PlayerPhoto: `first` / `last` / `pos` (nicht firstName/lastName).
- Barrel-Exports bereinigen wenn Files geloescht werden.
- NIEMALS `.catch(() => {})` — mindestens `console.error`.
- Cancellation Token in useEffect: `let cancelled = false; return () => { cancelled = true; }`.
- Null-Guards: `floor_price ?? 0`, `entry.rank ?? 999`.

### State / Hook / Render — Patterns (Regel inline · Detail-Heading in Klammern)

- **Defensive null-strict-equality bei optional-resolved Hook-Daten** (S265): Bei `T | null`-Hook-Returns mit Risk-/Boolean-Logik IMMER strict `=== <wert>` (z.B. `=== 0`), nie truthy `!value` — `null` ist *unbekannt*, nicht *at-risk*.
- **Selected-Item-Snapshot vs. Realtime-Update-Drift** (S273): Nie ein realtime-gepatchtes Item als `useState<Item>`-Snapshot halten → ID-as-State + `useMemo(() => list.find(id))`. Sub-Component-useEffect-deps auf stabile Felder (`fixture.id`,`.status`), nicht das ganze Object.
- **Derived-Loading aus `data === undefined`** (S283): Loading NIE aus `data === undefined` ableiten — `isLoading` UND `isError` destrukturieren, sonst hängt Error-Fall in ewigem Skeleton. Upstream-ID-Query = eigener Failure-Mode → kombinierter Error-State.
- **Zeitbasiertes Freshness-Gate ohne aktiven Recovery-Trigger hängt für immer** (S372): Ein Gate `Date.now() - dataUpdatedAt < X` (z.B. `useIsBalanceFresh`), das einen Button/Flow blockiert, MUSS bei Stale **aktiv refetchen**, nicht nur passiv blockieren — sonst bleibt es für immer disabled, sobald der Wert älter als das Fenster wird und die einzige Refetch-Quelle (TopBar-Mount/Window-Focus) nicht feuert (Query schon woanders gemountet → Modal-Öffnen triggert trotz `staleTime:0` KEIN Refetch). Fix: `useEffect(() => { if (stale) refetch(); }, [stale, refetch])` — dep = Stale-Flag (bleibt während `isFetching` konstant true → kein Loop), `refetch` v5-stabil, In-Flight-dedup via Query-Key, fail-safe bei Fetch-Fehler (bleibt disabled statt Aktion auf falschem Wert). Symptom: „Saldo wird aktualisiert…" löst sich nie auf, Kaufen-Button stuck. Falle: gemeldete Korrelation kann Timing-Artefakt sein („Tippen vs +/−" = nur „>30s vergangen + Re-Render"), nicht die echte Root-Cause. Verwandt: S283, S268 (`placeholderData`→`dataUpdatedAt=0`).
- **PostgREST `.or()` mit User-Input** (S283): `,` `()` sind or-Parser-Syntax → User-Input strippen `q.replace(/[%_,().]/g,'')` oder quoted-literal, sonst 400-Parse-Fail → silent leere Liste.
- **Feature-Reaktivierung + Query-Ersatz: 3 Drift-Klassen** (S282): (1) Reaktivierte Daten-Quelle → Suppression-Mapping ALLER Sections neu auditieren. (2) Error-Gate NIE verschärfen — `error && data.length===0` behalten, dekorative Quellen graceful. (3) byIds-Waterfall: `combinedLoading = upstreamLoading || (ids.length>0 && byIdsLoading)`.
- **Cross-Section-Coupling-Drift bei Multi-Slot-Refactors** (S278): Neuer Slot-Type in einem Multi-Slot-Container → jede Sidebar/Mobile-Section greppen die DIESELBE Daten-Quelle zeigt → Suppression-Gate (`spotlightSlots.primary !== 'x' && .secondary !== 'x'`). Sonst Doppel-Render.
- **Dead-Wrapper-File mit transitive Lib-Lock-In** (S280): UI-Wrapper mit 0 Konsumenten aber Barrel-Re-Export bundlet 100KB+ transitive Libs in jeden Page-Chunk. Pre-Bundle-Refactor: Orphan-Wrapper-grep, dann Wrapper+Test+Barrel+`optimizePackageImports` löschen. (Erw. S305/324/326: Removal/Column-DROP deckt 4 Achsen — Code, DB, i18n, Tooling-Allowlists — grep auch `messages/ scripts/ .claude/`; vor DROP COLUMN ALLE services + SSR `supabaseAdmin`-selects + Network-Trace-Gate.)
- **Lookup-Map indexed by ambiguous Key** (S276): Cache nie nach nicht-eindeutigem Key (`short`-Code) indizieren ohne Konflikt-Detection — sonst überschreibt letzter Insert silent (Wolfsburg↔Wolves). Non-unique Keys nur bei `list.length===1` setzen, sonst `getByKeyAndLeague(key, leagueId)`-Disambiguator.
- **Multi-Slot-State-Stores: Move- vs. Insert-Semantik** (S272): Store-Action `selectX(id, slot)` MUSS gegen `slot !== s && id !== id` filtern (beide!), und gegen ALLE Slot-Subtypes (Starter+Bench) deduplen. UI-Defense reicht nicht — DB-Server-Guard Pflicht im Money/Fantasy-Path.
- **Modal preventClose Pattern** (J2+J3): Jeder Modal mit `isPending`/`cancelling`/`selling`/`submitting` → `preventClose={isPending}` Pflicht (sonst ESC/Backdrop mitten in DB-Tx). Audit: `grep -rn '<Modal' src/components/ | grep -v preventClose`.
- **Liga/Context-Switch State-Reset via prevRef** (S254): Per-Context-Default-State → KEIN init-useEffect der `setOverride(default)` ruft (pinnt über Switch). Stattdessen `prevContextRef` reset auf null + `currentValue = manualOverride ?? contextDefault ?? fallback`.
- **Cache-Invalidation: Root-Prefix vs enumerated Keys** (S254): Domain-weiter State-Change (Liga/User/Locale-Switch) → Root-Prefix `invalidateQueries({queryKey:['events']})` (prefix-match), nicht enumerierte Sub-Keys (neuer Hook driftet sonst unbeachtet). Enumerated nur bei latenz-kritischen Einzelfeld-Updates.
- **Money-Mutation invalidiert Domänen-Key aber NICHT Wallet** (S371): Eine UI-Mutation, die das Wallet belastet (Poll-Vote `castCommunityPollVote`, Research-Unlock `unlockResearch`), MUSS nach Erfolg AUCH `qk.wallet.all` (`['wallet']`) invalidieren — sonst bleibt die Header-Credit-Anzeige (`TopBar`→`useWallet`, staleTime 0) bis zum nächsten Reload stale (DB korrekt, Anzeige lügt). Trading-Pfad macht es via `invalidateWallet`/`setWalletBalance`. Regel: bei jeder neuen credit-belastenden Mutation prüfen „wird der Wallet-Key invalidiert?" (performance.md: invalidateQueries nach Writes). Gilt analog für jede balance-ändernde Community/Event/Fantasy-Aktion.
- **Filter-as-audience-choice vs Filter-as-result-filter** (S254): Top-Level-Navigations-Filter (Liga/Country/Sprache) NIE aus dem Result-Set ableiten (Catch-22: leer→Filter unsichtbar→kein Switch). Static-Source `getCountries(locale)`. Result-Filter nur als Verfeinerung innerhalb bereits-gewählter Audience.
- **Non-reaktiver Module-Cache + useMemo-stale-deps → Cold-Load-Race** (S286): Render-time `useMemo(() => getCountries(locale), [locale])` auf async Module-Cache → captured leer, recomputet nie (Cold-Load/PWA leer). Fix: Cache-Version-Signal via `useSyncExternalStore` + als zusätzliche useMemo-dep. Click-/Effect-Reads sind safe.
- **TanStack v5: `initialData` vs `placeholderData` für Cold-Start-Mirror** (S268): UID-keyed Mirror-Hooks NIE `initialData` (persistiert als fresh data → `dataUpdatedAt`-Freshness-Gating lügt = Money-Bug + Cross-User-Race). Immer `placeholderData` (`dataUpdatedAt=0`, status bleibt pending).
- **Map/Set-typed React-Query-Data + Persist/SSR = stille Korruption** (S267): Service-Return `Promise<Map/Set>` überlebt `JSON.stringify` nicht (→`{}`) → `.values is not a function`-Crash. 3-Layer: Persist-Filter (`data instanceof Map → false`) + defensive Map-Reconstruction im Hook + buster-bump. Besser langfristig: `Array<[K,V]>` returnen.
- **Multi-League Props-Propagation** (J3+J4): Jedes Type mit `club*`-Field MUSS spiegelbildlich `league*`-Field haben; neues optional Field → ALLE Render-Call-Sites manuell greppen (optional = kein TSC-Error, Pilot-QA übersieht's).
- **Data-Format vs Component-Expectation Drift** (S102): Component-API-Contract im Service-Mapper erzwingen — leer/unbekannt → `""`/`undefined`, NIE raten (Pilot-Default `?? 'TR'` wird bei Multi-Liga zum Gift). Truthy-Check `{code && <Flag/>}`.
- **Display-Anker aus Source-of-Truth, nicht aus vergifteter denormalisierter Spalte** (S368b): Ist eine denormalisierte/Convenience-Spalte bekannt mock-/legacy-/migrations-überschrieben (z.B. `players.ipo_price` durch Slice 114 auf MV/10 für JEDEN Spieler → erfundener „Einstieg" auch ohne IPO; analog `dpc_mastery.hold_days`-Seed S367), liest die UI den **autoritativen Quell-Datensatz** (hier `ipos.price` der Erst-IPO via eigenem lazy Read-Hook). Fallback = **ehrliches „—"**, NICHT erfundene Zahl, und NIE Backfill der vergifteten Spalte (Slice-114-Klasse verboten, vgl. errors-db.md S303). Mock→Pro-Default: bei jedem Anzeige-Wert fragen „kommt der aus der Wahrheit oder aus einer bequemen, evtl. geseedeten Spalte?".
- **ConfirmDialog statt native alert/confirm** (J4): `src/components/ui/ConfirmDialog.tsx` (preventClose + loading + `confirmVariant`). Native alert/confirm verboten (unstyled, blockt Main-Thread, nicht i18n). Audit: `grep -rn 'window.alert\|window.confirm' src/`.
- **Vote-Toggle Client-Intent vs RPC-Constraint** (S159→160): UI sendet IMMER `1`/`-1` (nie `0` für Toggle-Off; RPC blockt `NOT IN(1,-1)` mit `{success:false}` → silent undefined). Handler ermittelt `isToggleOff = prevVote === voteType`.
- **React setState Race in Mutation-Handler** (S149-151,D18): `if(loading)return;setLoading(true)` ist race-prone (2 Clicks/Frame = 2 DB-Writes). `useSafeMutation` (synchroner `isPending`-Guard), Money-Path `useSafeIdempotentMutation`. Audit: `npm run audit:mutation-race`.
- **Component-Prop Silent-Fallback** (S149b,D17): Fallback-Branch mit schlechter UX + `prop?: T|null` → Call-Sites lassen prop weg OHNE TSC-Error (30% silent-fail). Prevention: prop **required** + Caller `prop={x ?? null}` explicit.
- **Singleton→`useQueryClient()` Migration exhaustive-deps-Trap** (S170→171): Hook-lokales `useQueryClient()`-Binding MUSS in alle deps-arrays die `queryClient.*` lesen (Module-Import war exempt). Post-Migration: jede enclosing `useCallback` deps prüfen.
- **Realtime-Hook-Refactor: TanStack-Query → Subscription-only callback** (S267): Konsument nutzt `useState<T[]>` → Realtime-Hook MUSS Subscription-only callback-Pattern sein (`onUpdate`-ref, deps nur `[scopeId]`), NICHT `setQueryData`. Sonst Doppel-Fetch + State-Drift. Code-Reading-Liste MUSS Konsument-File enthalten.
- **qk-Key-Definition ohne Konsument** (S267): Neuer `qk.*`-Key ohne Verwender = orphan-Export. Detection-grep, dann Delete ODER JSDoc-Reserve-Comment.

### CSS / Tailwind Gotchas
- `::after`/`::before` mit `position:absolute` → Eltern MUSS `relative` (`overflow:hidden` reicht NICHT als Containing Block).
- `flex-1` auf Tabs → iPhone-overflow → `flex-shrink-0`.
- Dynamic Tailwind NIEMALS `border-[${var}]/40` (JIT scannt nur statische Strings) → `style={{ borderColor: hex }}` + statische Class.
- **`gold-pulse-bg` ist statischer Gradient** (S261): Pulse braucht zusätzlich `motion-safe:animate-pulse motion-reduce:animate-none` — der Klassenname allein animiert nicht. Detail: errors-frontend-detail.md.
- **Tailwind `data-*` Variants nur auf Tailwind-Utilities** (S181): `data-[state=open]:anim-modal` wirkt NUR wenn `anim-modal` in `@layer utilities` steht (nicht plain global-CSS) — sonst keine Animation. Detail: errors-frontend-detail.md.

### UX Konsistenz
- Spieler-Anzeigen → Link zu `/player/[id]` (Ausnahme: Picker-UIs).
- `<button>` NICHT in `<Link>` wrappen (invalid HTML) → `href`-Prop oder Wrapper.

## i18n / Locale

- **JSON Object/String-Duplicate-Key-Drift** (S263): Neues Sub-Object darf keinen Top-Level-String gleichen Namens im selben Namespace haben (JSON last-wins, String unreachable, latent React-Crash). Bei jedem neuen Sub-Object prüfen + Top-Level-String löschen wenn 0 Consumer.
- **i18n-Key-Leak via Service-Errors** (J1+J3): Service wirft I18N-KEYS (`throw new Error('handleReserved')`), Consumer resolved via `te(mapErrorToKey(normalizeError(err)))` — NIE `setError(err.message)` (zeigt raw key). Nach jedem swallow→throw alle Consumer-Pfade greppen.
- **Missing i18n-Key bei neuer CTA-Component** (S198): Nach JEDEM neuen `t('namespace.key')` in einer Component SOFORT DE+TR bedienen (`defaultMessage`-Fallback = TR sieht DE-String, kein TSC-Error). **Erw. S333:** Key kann im FALSCHEN Namespace-Objekt liegen (grep grün, Runtime `MISSING_MESSAGE`) → namespace-aware Node-Check + 1× Live-Render-Console-Scan gegen bescout.net Pflicht.
- **Polish-Audit Pre-Existing-Code-Drift** (S200a): Vor „X fehlt"-Klassifikation den consumed Hook/Service greppen (`src/features/<d>/hooks/ services/ src/lib/hooks/`) — Logik existiert oft schon → neuer useEffect = Duplicate. Reviewer-Agent als Backup-Catcher.
- **Service-Duplicate bei parallelem BE+FE-Dispatch** (S199,D46): BE+FE-Worktrees bauen denselben Service doppelt → einer wird orphan (TSC clean). SPEC-Sektion „Service-Schnittstelle" (kanonischer Pfad+Signatur) Pflicht bei Cross-Domain. Post-merge: duplicate-export-grep.
- **Hardcoded German addToast/Error-Strings** (S196): `addToast('Ein Fehler...', 'error')` umgeht i18n → TR bricht. `addToast(te(mapErrorToKey(...)), 'error')`. Audit: `grep -rn "addToast\('[A-Z]" src/ | grep -v "bescout-admin\|__tests__"` (admin+tests exempt).
- **Error-Messages nie dynamische Werte** (J3): `throw new Error(\`Price exceeds ${X} $SCOUT\`)` = DE/EN-Mix + $SCOUT user-facing + dynamischer Wert. Dynamic gehört in Pre-Submit-Hints, nicht Post-Error.
- **Turkish Unicode**: `'I'.toLowerCase()` = `i̇` (nicht `i`) → NFD + strip diacritics + `ı→i`. SQL: `translate(lower(name),'şçğıöüİŞÇĞÖÜ','scgiouISCGOU')`.
- **Money-RPC Idempotency-Window** (151c.2): Historisch (inline-60s), abgelöst durch generic S178a-f → siehe `errors-db.md` Money-RPC Idempotency-Blueprint.
- **useCountUp auf volatile Server-Daten** (S151b,D20): `useCountUp` animiert jedes Re-Render → auf React-Query-Daten 2-3 Desync-Zyklen. `useDeferredValue` davorschalten. Audit: `grep -rn 'useCountUp(' src/ | grep -v useDeferredValue`.
- **PLAYER_SELECT_COLS Sync mit DbPlayer-Type** (S200): Bei JEDEM `ALTER TABLE players ADD COLUMN`: DbPlayer-Type + dbToPlayer-Mapper + **`PLAYER_SELECT_COLS`** (oft vergessen → Spalte kommt nie zurück, immer `null`, TS-Cast lügt) + Test gegen echte DB. Gilt analog für andere `*_SELECT_COLS`.
