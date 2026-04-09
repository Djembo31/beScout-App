# BeScout Error Reference

> Top 50 Fehler, gruppiert nach Kategorie.
> Single Source fuer DB Columns + CHECK Constraints: `.claude/rules/database.md`

---

### DB Columns + CHECK Constraints
→ Single Source: `.claude/rules/database.md` (Column Quick-Reference + CHECK Constraints)

### RPC Anti-Patterns

- **`::TEXT` Cast auf UUID beim INSERT:** PostgreSQL schlaegt fehl bei Type-Mismatch. → **Fix:** UUID-Werte OHNE `::TEXT` Cast uebergeben.
- **Record nicht initialisiert vor Zugriff:** Variable in falscher Branch referenziert. → **Fix:** Record VOR Zugriff initialisieren, NULL-Check.
- **FK-Reihenfolge falsch:** Child INSERT vor Parent INSERT. → **Fix:** Parent zuerst inserten, dann Child.
- **NOT NULL Spalte fehlt im INSERT:** DB wirft Constraint Error. → **Fix:** ALLE NOT NULL Spalten im INSERT angeben.
- **Liquidation-Check fehlt:** Trading-RPCs ohne `is_liquidated` Guard. → **Fix:** ALLE 4 Trading-RPCs muessen `is_liquidated` pruefen.
- **`auth.uid()` ist NULL in SECURITY DEFINER:** Context nicht verfuegbar. → **Fix:** NULL-safe Guards einbauen, Parameter explizit uebergeben.
- **Quantity < 1 nicht geprueft:** Geld-RPCs ohne Mindest-Check. → **Fix:** `IF p_quantity < 1 THEN RETURN error` am Anfang.

### RLS Policy Trap

- **Neue Tabelle nur mit SELECT Policy:** INSERT/DELETE still blockiert, silent failure. → **Fix:** Policies fuer ALLE Client-Ops: SELECT + INSERT + DELETE + UPDATE.
- **`console.error` ohne `throw` bei DB-Writes:** Fehler wird geloggt aber nicht geworfen. → **Fix:** `throw` nach `console.error` bei kritischen Writes.
- **RLS Policies nicht verifiziert nach Migration:** Policies koennten fehlen. → **Fix:** `SELECT policyname, cmd FROM pg_policies WHERE tablename = 'X'`.
- **RLS `.update()` stumm blockiert:** Update-Queries returnieren OK aber aendern nichts. → **Fix:** RPC fuer geschuetzte Tabellen nutzen statt direktem `.update()`.
- **`activity_log` Feed Policy nur `auth.uid() = user_id`:** Blockiert Feeds von gefolgten Usern, da der lesende User eine ANDERE user_id hat. Pattern wie Session 255 holding_locks. → **Fix:** Policy erweitern: `auth.uid() = user_id OR user_id IN (SELECT following_id FROM user_follows WHERE follower_id = auth.uid())`. Anwendbar auf JEDE Feed-Tabelle die Cross-User-Reads benoetigt. (2026-04-08, B2 Following Feed, Commit e61be4a)

### Dynamic Import + fire-and-forget Promise

- **Inner Promise nicht returned in `.then()` body-block:** `import('X').then(({ fn }) => { fn(id); })` — `fn(id)` erzeugt neues Promise das NICHT zum outer `.catch` propagiert. Lokal verdeckt weil echter DB-Call erfolgreich ist. Im CI ohne env vars crasht `vi.mock` nicht zuverlaessig fuer dynamic imports → echter Service geladen → Network Error → vitest exit 1. → **Fix:** Expression-Form: `.then(({ fn }) => fn(id))`. (2026-04-08, CI Resurrection, Commit 868b8ce)

### Supabase Client

- **`.single()` wenn 0 Rows moeglich:** HTTP 406 Error, Query crasht. → **Fix:** `.maybeSingle()` fuer alle Lookups wo der Datensatz optional ist (User-Airdrop, optionale Profile-Daten, etc.). Regel: Wenn die Frage "Existiert dieser Datensatz sicher?" mit NEIN beantwortet werden kann → `.maybeSingle()`. Audit-Trigger: Visual QA HTTP 406 Fehler. (2026-04-07, 23 Service-Calls gefixt, Commit d66f0f6)

### React/TypeScript

- **Hooks nach early return:** React Rules Verletzung, Runtime-Crash. → **Fix:** ALLE Hooks VOR dem ersten `if (...) return`.
- **`[...new Set()]`:** TypeScript strict Mode Fehler. → **Fix:** `Array.from(new Set(...))`.
- **`for (const k of map.keys())`:** Strict TS erlaubt es nicht. → **Fix:** `Array.from(map.keys())`.
- **Modal ohne `open` prop:** Modal zeigt/versteckt sich nicht korrekt. → **Fix:** IMMER `open={true/false}` als prop uebergeben.
- **PlayerPhoto mit `firstName`/`lastName`:** Props heissen anders. → **Fix:** `first`/`last`/`pos` nutzen.
- **Leere `.catch(() => {})`:** Fehler werden verschluckt, silent failure. → **Fix:** Mindestens `.catch(console.error)`.
- **Fehlende Cancellation in useEffect:** Race Conditions bei schnellem Re-Render. → **Fix:** `let cancelled = false; return () => { cancelled = true; }`.
- **`floor_price` ohne Null-Guard:** `undefined` in Berechnung. → **Fix:** `floor_price ?? 0`.
- **`entry.rank` ohne Null-Guard:** Airdrop rank ist nullable. → **Fix:** `entry.rank ?? 999`.
- **Barrel-Exports nicht bereinigt:** Import aus geloeschter Datei. → **Fix:** Barrel-Exports updaten wenn Dateien geloescht werden.
- **`staleTime: 0` auf Queries:** Ueberfluessige Refetches. → **Fix:** `invalidateQueries` nach Writes statt `staleTime: 0`.
- **Raw Query Keys `['foo']`:** Invalidation funktioniert nicht zuverlaessig. → **Fix:** IMMER `qk.*` Factory nutzen.

### CSS/Tailwind

- **`flex-1` auf Tab-Buttons:** iPhone overflow, Tabs werden abgeschnitten. → **Fix:** `flex-shrink-0` nutzen.
- **Dynamic Tailwind Classes `border-[${var}]/40`:** JIT scannt nur statische Strings, Class wird nicht generiert. → **Fix:** `style={{ borderColor: hex }}` + statische Class (`border-2`).
- **`::after`/`::before` ohne relative Parent:** Pseudo-Element positioniert sich falsch. → **Fix:** Eltern-Element braucht `position: relative`.
- **`overflow: hidden` als Containing Block:** Reicht allein nicht. → **Fix:** `position: relative` auf Parent setzen.
- **Text unter WCAG AA Kontrast:** `white/40` ist zu dunkel auf `#0a0a0a`. → **Fix:** Mindestens `white/50` fuer lesbaren Text.
- **Glow Shadows zu schwach:** 8% opacity unsichtbar auf dunklem Hintergrund. → **Fix:** 20-35% opacity fuer Position-Glows.

### Turkish Unicode

- **`I.toLowerCase()` ergibt `i̇` statt `i`:** Tuerkisches Unicode-Verhalten. → **Fix:** NFD normalization + strip diacritics + `ı→i` Mapping.
- **SQL Suche ohne Unicode-Mapping:** Tuerkische Zeichen matchen nicht. → **Fix:** `translate(lower(name), 'scgiouISCGOU', 'scgiouISCGOU')` (volle Mapping-Tabelle in common-errors.md).

### Vercel/Deployment

- **`NEXT_PUBLIC_*` als "Sensitive" markiert:** Werden beim Build NICHT injected. → **Fix:** Nur Server-only Vars als Sensitive, `NEXT_PUBLIC_*` als Plain.
- **`createClient()` auf Module-Level:** Crasht Vercel Build wenn Env-Vars fehlen. → **Fix:** Lazy-Init (Proxy/Getter Pattern).
- **CSP `img-src` Domains geraten:** Blockiert Bilder die aus DB kommen. → **Fix:** `SELECT DISTINCT substring(image_url from '^https?://[^/]+')` aus DB ableiten.
- **Spielerbilder von `api-sports.io`:** Falsche Domain. → **Fix:** Korrekte Domain ist `img.a.transfermarkt.technology`.

### API-Football

- **`time.minute` statt `time.elapsed` bei Substitution:** Falsches Feld. → **Fix:** `time.elapsed` nutzen.
- **`player`/`assist` ohne Null-Guard:** Koennen null sein bei manchen Events. → **Fix:** `evt.player?.id` und `evt.assist?.id`.
- **`grid_position` blind vertrauen:** Fehlende GK-Row, Duplikate, >11 Starters moeglich. → **Fix:** Validierung einbauen.
- **Market Values von API-Football:** API liefert KEINE Marktwerte. → **Fix:** Nur Transfermarkt als Datenquelle fuer Marktwerte.

### UX Konsistenz

- **Spieler ohne Link zu `/player/[id]`:** User kann nicht zur Detail-Seite navigieren. → **Fix:** IMMER Link setzen (Ausnahme: Picker-UIs).
- **`<button>` in `<Link>` gewrappt:** Invalid HTML, unvorhersehbares Verhalten. → **Fix:** `href` Prop nutzen oder Wrapper-Komponente.

### Component Props

- **Hardcoded null fuer Prop das Daten braucht:** `<PageHeader nextEvent={null} />` rendert visuell OK aber semantisch falsch (zeigt "Kein Event" obwohl Events existieren). → **Fix:** Prop IMMER aus echtem Query (useOpenEvents etc.) verbinden. Hardcoded null ist semantische Luege. (2026-04-08, Manager PageHeader, Commit d16b493)

### Dead Code / Dead Exports

- **Exportierter Hook ohne Consumer:** `getFollowingFeed` existierte seit Monaten in `social.ts`, wurde nie aufgerufen. `FEED_ACTION_LABELS` war dead export in queries. → **Fix:** Audit-Signal: grep nach jedem exportierten Hook/Typ → wenn 0 Consumer → entweder drahtlos oder loeschen. Vor neuer Feature-Implementierung: existierende dead-code Kandidaten suchen, nicht neu bauen. (2026-04-08, B2 Following Feed Discovery)

### Dev Server / Service Worker

- **Service Worker Cache zeigt stale JS/HTML bei Dev:** Browser liefert gecachte Version des Build-Artifacts auch nach Code-Aenderungen. → **Fix:** Vor jedem frischen QA-Test: DevTools → Application → Service Workers → "Unregister" + "Update on reload" aktivieren + Hard Reload (Shift+F5). Alternativ: Incognito-Window. Immer zuerst pruefen ob SW aktiv ist bevor Rendering-Bugs reported werden. (2026-04-08, B2 Following Feed QA)
- **SW Re-Registration waehrend QA-Session:** `navigator.serviceWorker.unregister()` allein reicht nicht — App-Code re-registriert den SW nach Navigate sofort wieder. Dann serviert der SW weiterhin den alten Bundle-Cache. → **Fix:** Caches AUCH loeschen: `const cs = await caches.keys(); for (const c of cs) await caches.delete(c);`. Nach Navigate erneut pruefen ob SW wieder aktiv. Audit-Signal: Code-Changes sichtbar in Source, tsc clean, Browser zeigt altes Verhalten → IMMER zuerst SW + Caches pruefen. (2026-04-08, B3 Transactions History QA)

### React State / URL Params

- **URL-derived State via useEffect statt lazy init:** `useState('default')` + `useEffect(() => { if (!init && stats) setTab(initialTab) })` erzeugt Tab-Flash und Race-Condition (Effect kommt zu spaet, SW-Cache macht es sticky). → **Fix:** Lazy initializer direkt aus URL-Prop: `useState<Tab>(() => isValidTab(p) ? p : 'default')`. Effect-Setzung nur als Fallback fuer Data-derived Defaults. Regel: URL/Prop-derived State → lazy init. Data-derived Default → useEffect nach Load. (2026-04-08, B3 deep link fix, Commit d28f843)

### DB/Code Type Drift

- **Code-Filtermap kennt nicht alle DB-Types:** Filter verpasst Rows weil DB `trade_buy`/`trade_sell` hat aber Code nur `['buy','sell']` kennt. Passiert bei organisch gewachsenen Enums. → **Fix:** VOR Feature-Bau: `SELECT DISTINCT type, COUNT(*) FROM <tabelle> GROUP BY type ORDER BY 2 DESC;` → Ergebnis gegen Code-Konstanten greppen. Wenn >3 DB-Types nicht im Code → Drift beheben bevor Implementation. SSOT-Datei erstellen die Code + RLS spiegelt. (2026-04-08, B3 FILTER_TYPE_MAP, Commit 9264bb2)

### Navigation-Abort / Fetch-Abort Noise

- **`console.error` fuer "Failed to fetch" bei Navigation:** Passiert wenn User navigiert waehrend Layout-Queries noch in-flight sind. Nicht ein echter API-Fehler — erzeugt aber Monitoring-Noise. → **Fix:** `logSupabaseError(prefix, error)` aus `src/lib/supabaseErrors.ts` nutzen statt direktem `console.error`. Klassifiziert automatisch: `warn` fuer Transients (Failed to fetch, NetworkError, ERR_NETWORK, network request failed), `error` fuer echte API-Fehler. Alle 5 Consumer (sponsors, tickets, trading, welcomeBonus, useHomeData) als Referenz. (2026-04-09, Commit ef13d85)

### RLS Self-Recursion (SECURITY DEFINER Pattern)

- **RLS Policy referenziert dieselbe Tabelle im Subquery:** PostgreSQL re-applied dieselbe Policy auf den Inner-SELECT → infinite recursion → PostgREST HTTP 500. Pattern: `SELECT league_id FROM fantasy_league_members WHERE user_id = auth.uid()` innerhalb einer Policy auf `fantasy_league_members`. → **Fix:** SECURITY DEFINER Helper-Funktion erstellen die ausserhalb des Policy-Kontexts laeuft: `CREATE FUNCTION get_my_ids() RETURNS SETOF uuid LANGUAGE sql SECURITY DEFINER STABLE AS $$ SELECT id FROM tbl WHERE user_id = auth.uid(); $$;`. Policy nutzt dann den Helper: `id IN (SELECT get_my_ids())`. Regel: Wann immer eine RLS Policy dieselbe Tabelle im Subquery referenziert → SECURITY DEFINER. (2026-04-09, fantasy_league_members, Migration 20260409150000, Commit 66b8935)

### Feed/Social Read Tabellen

- **Cross-User Read Policy generell fehlt:** Zweiter Fall nach B2 `activity_log` — `transactions` hatte nur `auth.uid() = user_id`, blockierte damit Public Profile Timeline komplett (silent: keine Rows, kein Error). → **Fix:** Feed/Social-Tabellen die Cross-User-Reads brauchen (Public Profile, Follower-Feed) IMMER zwei SELECT-Policies: `own-all` + `public-whitelist`. Pattern: `type = ANY(ARRAY['safe_type1','safe_type2'])` fuer die public-readable Subset. RLS nach jeder Migration: `SELECT policyname, cmd FROM pg_policies WHERE tablename = 'X'`. (2026-04-08, B3 transactions RLS, Commit 9264bb2)
