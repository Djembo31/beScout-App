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
