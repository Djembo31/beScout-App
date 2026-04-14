---
description: Haeufigste Fehler die bei JEDER Arbeit relevant sind
---

## DB Columns + CHECK Constraints
→ Single Source: `database.md` (Column Quick-Reference + CHECK Constraints)

## Supabase Client
- `.single()` wenn 0 Rows moeglich → HTTP 406 Error → `.maybeSingle()` nutzen
- Regel: Wenn "existiert dieser Datensatz garantiert?" → NEIN → `.maybeSingle()`
- Audit-Signal: HTTP 406 Fehler in Logs/QA → systematisch alle Service-Calls pruefen

## React/TypeScript
- Hooks VOR early returns (React rules)
- `Array.from(new Set())` statt `[...new Set()]` (strict TS)
- `Array.from(map.keys())` statt `for (const k of map.keys())` (strict TS)
- `Modal` braucht IMMER `open={true/false}` prop
- `PlayerPhoto` Props: `first`/`last`/`pos` (nicht firstName/lastName)
- Barrel-Exports bereinigen wenn Dateien geloescht werden
- NIEMALS leere `.catch(() => {})` — mindestens `console.error`
- Cancellation Token in useEffect: `let cancelled = false; return () => { cancelled = true; }`
- `floor_price ?? 0` — IMMER Null-Guard auf optionale Zahlen
- `entry.rank ?? 999` — Airdrop rank ist nullable

## CSS / Tailwind
- `::after`/`::before` mit `position: absolute` → Eltern MUSS `relative` haben
- `overflow: hidden` allein reicht NICHT als Containing Block
- `flex-1` auf Tabs → overflow auf iPhone → `flex-shrink-0` nutzen
- Dynamic Tailwind Classes NIEMALS: `border-[${var}]/40` → Tailwind JIT scannt nur statische Strings. Nutze `style={{ borderColor: hex }}` + statische Class (`border-2`)

## Turkish Unicode
- `I`.toLowerCase() = `i̇` (NICHT `i`) → NFD + strip diacritics + `ı→i`
- SQL: `translate(lower(name), 'şçğıöüİŞÇĞÖÜ', 'scgiouISCGOU')`

## API-Football
- Substitution: `time.elapsed` (NICHT `time.minute`!), `player`=OUT, `assist`=IN
- Null guards: `evt.player?.id` und `evt.assist?.id` koennen null sein
- `grid_position` kann kaputt sein: fehlende GK-Row, Duplikate, >11 Starters
- API-Football hat KEINE Market Values → nur Transfermarkt

## RLS Policy Trap (Session 255 — SC Blocking war komplett kaputt)
- Neue Tabelle mit RLS MUSS Policies fuer ALLE Client-Ops haben (SELECT + INSERT + DELETE)
- SELECT-only = Client kann lesen aber NICHT schreiben → silent failure
- IMMER nach Migration pruefen: `SELECT policyname, cmd FROM pg_policies WHERE tablename = 'X'`
- NIEMALS `console.error` ohne `throw` bei kritischen DB-Writes → silent failure ist der schlimmste Bug

## RPC Anti-Patterns (Top 5 Bugs)
- `::TEXT` auf UUID beim INSERT (5x in Session 93)
- Record nicht initialisiert vor Zugriff in falscher Branch
- FK-Reihenfolge falsch (Child INSERT vor Parent)
- NOT NULL Spalte fehlt im INSERT
- Guards fehlen (Liquidation-Check in allen Trading-RPCs)

## Vercel / Deployment
- `NEXT_PUBLIC_*` Env-Vars NIEMALS als "Sensitive" auf Vercel → werden beim Build NICHT injected
- KEIN `createClient()` auf Module-Level → Lazy-Init (Proxy/Getter), sonst crasht Vercel Build
- CSP `img-src` Domains aus DB ableiten, nicht raten: `SELECT DISTINCT substring(image_url from '^https?://[^/]+')`
- Spielerbilder = `img.a.transfermarkt.technology` (NICHT api-sports.io)

## Shell / Hooks (Windows Git Bash)
- `grep -oP` mit `\K` scheitert SILENT auf Windows (Locale-Bug: "supports only unibyte and UTF-8 locales")
- Fix: `sed -n 's/.*"key"\s*:\s*"\([^"]*\)".*/\1/p'` statt `grep -oP`
- Worktree-Agents haben KEINEN Zugriff auf `.claude/skills/` — Fallback auf Main-Repo-Path oder Task gut verpacken

## Data Contract Changes (NICHT als UI-Change behandeln)
- required → optional (Feld, Prop, DB Column) = Contract Change → ERST alle Consumer greppen
- optional → required = Breaking Change → Migration + Backfill noetig
- Form-Validierung aendern (disabled, required entfernen) → Pruefen: Was passiert downstream wenn der Wert null/leer ist?
- REGEL: Jede Aenderung die beeinflusst WELCHE Werte in die DB geschrieben werden → `/impact` oder manueller Grep BEVOR Code geschrieben wird

## UX Konsistenz
- Spieler-Anzeigen MUESSEN Link zu `/player/[id]` haben (Ausnahme: Picker-UIs)
- `<button>` NICHT in `<Link>` wrappen (invalid HTML) → stattdessen `href` Prop oder Wrapper-Komponente

## PL/pgSQL NULL-in-Scalar (2026-04-11 — CRITICAL Money Bug)
- `IF (SELECT COALESCE(x, 0) FROM t WHERE ...) < y` ist FALSCH wenn keine Row existiert
- Scalar-Subquery auf leeres Result-Set → NULL (COALESCE laeuft per-Zeile, nicht auf leere Sets)
- `NULL < y` = NULL = falsy in PL/pgSQL IF → Guard wird UEBERSPRUNGEN
- Richtig: `SELECT x INTO v_x; IF COALESCE(v_x, 0) < y THEN reject`
- Oder: `IF NOT FOUND THEN reject` (sicherstes Pattern)
- Audit: `grep 'SELECT COALESCE.*FROM.*WHERE' supabase/migrations/`

## Service Error-Swallowing (2026-04-11 — Tickets Pop-In, 2026-04-13 — Full Hardening)
- `if (error) { console.error(...); return null; }` → React Query cached null als SUCCESS
- Kein Retry, UI zeigt Skeleton/Empty fuer 30s (staleTime)
- Kritisch bei Auth-Race: RPC wirft 'Nicht authentifiziert', Service schluckt
- Richtig: `if (error) { logSupabaseError(...); throw new Error(error.message); }`
- React Query retried automatisch (3x backoff) → nach ~1s ist Auth ready
- **SCHLIMMSTE Variante:** `const { data } = await supabase...` OHNE error-Destructuring
  - Error komplett unsichtbar: kein log, kein throw, data=null wie "keine Rows"
  - Audit: `grep -rn 'const { data } = await supabase' src/lib/services/`
- **2026-04-13: 117 Fixes in 61 Services — alle Saeulen gehaertet, 1192 Tests gruen**

## Service Contract-Change Propagation (2026-04-14 — Journey #1 Reviewer)
- Service-Aenderung `if(error) console.error → throw` ist Breaking-Change fuer Caller
- Pattern: Nach JEDEM swallow→throw Refactor IMMER alle Caller greppen + try/catch-Logik auditen
- Concrete Falle: `applyClubReferral.throw` ohne Consumer-Fix → onboarding/page.tsx trapped User:
  createProfile OK, clubFollow throw, User gefangen (Retry scheitert an unique-handle)
- Fix-Pattern: Bei "best-effort" Side-Effects (club-follow, referral, avatar) in separates try/catch
  wrappen, `console.error` + continue (analog Avatar-Upload-Pattern)
- Audit-Signal: Service-PR aendert return-shape oder error-Semantik → vor Merge `grep -rn 'serviceName' src/`

## i18n-Key-Leak via Service-Errors (2026-04-14 — J1 Reviewer, J3 bestaetigt + erweitert)
- `throw new Error('handleReserved')` in Service → `err.message === 'handleReserved'` (Raw-Key)
- Wenn Caller `setError(err.message)` macht → User sieht literal "handleReserved" unuebersetzt
- Fix-Pattern: Caller resolved known Keys via `t(msg)` Lookup (`mapErrorToKey(normalizeError(err)) → te(key)`)
- Konvention: Service wirft I18N-KEYS, Consumer muss via `t()` resolven. Dokumentieren in Service-JSDoc.
- Audit: `grep -n 'throw new Error' src/lib/services/` → Keys sammeln, gegen Caller-`setError(err.message)` pruefen
- **J3 Evidence (2026-04-14):** J2 hat nur `handleBuy` gefixt, aber `handleSell`/`handleCancelOrder`/`placeBuyOrder` blieben offen (raw-key-leak). Pattern ist SYSTEMATISCH — **nach JEDEM swallow→throw-Refactor ALLE gleichartigen Consumer-Pfade greppen, nicht nur den direkt betroffenen.** Das gleiche Service (useTradeActions/trading.ts) hat 4 aehnliche Methoden, nur 1 war gefixt.
- **Triple-Red-Flag Service-Error Pattern (J3 Healer A):** `throw new Error(\`Price exceeds maximum (${X} $SCOUT)\`)` = (a) DE/EN-Mix, (b) $SCOUT-Ticker im User-Face, (c) dynamischer Wert in Error-Message. Regel: **Error-Messages NIE dynamische Werte enthalten** — dynamic gehoert in Pre-Submit-Hints, nicht Post-Error.

## Modal preventClose Pattern (2026-04-14 — J2F-04 + J3F-06..08)
- Jeder Modal mit `useMutation.isPending` → IMMER `preventClose={isPending}` setzen
- Schuetzt vor ESC/Backdrop-Click-State-Verlust mitten in DB-Transaction (200-500ms Latenz auf 4G)
- Ohne preventClose: User drueckt ESC → Mutation laeuft weiter, UI verliert State (Balance-Before, Pending-Qty), kein Success-Feedback
- Heuristik fuer Healer-Sweep: `Modal` + (`isPending|cancelling|selling|buying|submitting`) im gleichen File → preventClose nachruesten
- J3-Fund: BuyModal (`buying \|\| ipoBuying`), SellModal (`selling \|\| cancellingId !== null \|\| acceptingBidId != null`), LimitOrderModal (`false` + TODO fuer Feature-Live)
- Audit: `grep -rn '<Modal' src/components/ | grep -v preventClose` — Modals ohne preventClose bei Money/Trading-Context pruefen

## Multi-League Props-Propagation-Gap (2026-04-14 — J3 Frontend + Reviewer)
- Neues optionales Player-Feld (z.B. `leagueShort?`) auf Type hinzugefuegt → nur 2 von 8 Render-Call-Sites bedient
- TSC/Tests merken NICHTS (optional Prop, kein Error)
- Visual-QA im Pilot (1 Liga) uebersieht's, Fehler tritt erst im Multi-League-Betrieb auf
- Regel: Neues Player-Feld → **ALLE Render-Call-Sites manuell auditieren** (Grep alle `<PlayerRow`, `<PlayerHero`, `<TradingCardFrame`, `<PlayerIdentity`, `<PlayerIPOCard` etc.)
- Teil des `/impact` Skills fuer Player-Type-Aenderungen
- J3-Fund: TradingCardFrame Front+Back + PlayerHero + TransferListSection hatten 0 Liga-Logos trotz vollstaendigem Player-Type seit 2026-04-07

## RPC Response camelCase/snake_case Mismatch (2026-04-11 — Mystery Box)
- RPC `jsonb_build_object('rewardType', ...)` → camelCase im Response
- Service castet `data as { reward_type: ... }` → snake_case → ALLE Felder undefined
- TypeScript faengt das NICHT (as = unchecked assertion)
- Richtig: Service-Cast MUSS die ECHTEN Keys der RPC matchen
- Check: `pg_get_functiondef()` → Return-Shape → Service-Cast vergleichen
- Audit: Neuer RPC deployed? → Service-Datei pruefen ob Cast echte Keys nutzt
