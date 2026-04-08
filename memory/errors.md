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
