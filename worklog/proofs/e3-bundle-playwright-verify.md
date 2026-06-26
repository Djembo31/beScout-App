# E-3 Regelsatz — Gebündelter Playwright-Durchlauf (Proof)

**Datum:** 2026-06-26 · **Gegen:** bescout.net (Prod, main deployed) · **Viewport:** Mobile 393×852 (iPhone 16) · **Login:** ali (Club + Platform-Admin, superadmin)
**Scope:** Builder-Render-Verify der 5 E-3-Aufstellungsregeln (Slices 385/386/388/389/390/392) in beiden Buildern.

## Statischer Vor-Check (faktenbasiert)
- **Beide Label-Objekte vollständig:** Club-Builder (`AdminEventsTab.tsx`, `t('admin')`) + Platform-Builder (`AdminEventsManagementTab.tsx`, DE-hardcoded) — alle 5 Regeln verkabelt.
- **i18n namespace-aware (S333-Falle):** alle **29 Club-Keys** im `admin`-Namespace in **DE 29/29 + TR 29/29** vorhanden. Kein MISSING_MESSAGE-Risiko auf dem Papier.

## Live-Verify Club-Builder (`/club/sakaryaspor/admin` → Events → Neues Event)
- **14/14 Regel-Inputs** im DOM vorhanden (minPerOwnClub · ageMax · ageMin · minPos{GK,DEF,MID,ATT} · maxPos{GK,DEF,MID,ATT} · mvMax · mvMin · maxPerNation).
- **9/9 Labels aufgelöst**, 0 fehlend. **0 Leak-Hits** (kein `MISSING_MESSAGE`, kein Roh-Schlüssel).
- **Alle Inputs `min-height: 44px`** (Touch-Target-konform). aria-labels durchgehend gesetzt.
- **NationMultiSelect (392):** Trigger „Keine Einschränkung" → Picker öffnet (Full-Screen) → Suchfeld „Land suchen…" → Eingabe „türk" filtert exakt auf **„Türkei / TR"** → Auswahl → Trigger zeigt **„1 gewählt"**. Voll funktional.
- Proof-Screenshot: `e3-bundle-club-builder-393.png` (lokal, PNGs gitignored).

## Live-Verify Platform-Builder (`/bescout-admin` → Tab „Even" → Neues Event)
- **14/14 Regel-Inputs** vorhanden, 0 fehlend. **0 Leaks.** Alle 44px. Nation-Trigger vorhanden. 9/9 Labels.
- Proof-Screenshot: `e3-bundle-platform-builder-393.png`.

## Verdikt Builder-Render: ✅ PASS (beide Builder, Mobile 393px, DE)

---

## 🔴 FINDING #1 (UX-Gap, non-P0) — Reject-Toasts sind NICHT regel-spezifisch
**Was der Plan wollte:** „je 1 Reject-Toast user-facing".
**Fakt:** Der Validator `rpc_save_lineup` gibt 9 Regel-Codes zurück (`age_max_exceeded`, `age_min_not_met`, `min_per_own_club_not_met`, `min_per_position_not_met`, `max_per_position_exceeded`, `mv_max_exceeded`, `mv_min_not_met`, `nation_not_allowed`, `max_per_nation_exceeded`) **+ reichen Kontext** (`limit`, `player_id`, `age`/MV).
- **Service** (`lineups.mutations.ts:62`) liest NUR `result.error` (den Code) und wirft ihn nackt → der Kontext (`limit`/`age`/`player`) wird **verworfen**.
- **FE** (`useLineupSave.ts:135`) → `mapErrorToKey(code)`: keiner der 9 Codes ist in `KNOWN_KEYS` und kein Regex greift → Fallback **`'generic'`**.
- **Resultat:** Jeder Regelverstoß zeigt denselben **generischen** Toast („Ein Fehler ist aufgetreten"). Kein Crash, kein Leak, **aber** der Nutzer erfährt nicht, WELCHE Regel er gebrochen hat — was den Zweck granularer Regeln untergräbt.
- **i18n-Check:** 0/9 Codes im `errors`-Namespace (DE+TR) — bestätigt generischer Fallback.

**Empfehlung:** Kleiner Folge-Slice (i18n, kein Money): 9 Codes → `KNOWN_KEYS` + 9×DE/TR-Strings im `errors`-Namespace; optional `limit`/`age`/MV in die Meldung threaden („Max. Alter 21 — dieser Spieler ist 24"). TR = Anil-Compliance-Review.

## 🟠 FINDING #2 (Prod-Fehler, separat von E-3) — AuthProvider Profile-Load
- Kumulativer Console-Scan (`all:true`) über die Session: **7× `[AuthProvider] Profile load failed after retry`** (2 Deploy-Chunks). Einzelseiten-Counter zeigte „0 errors" → nur im Session-übergreifenden Scan sichtbar.
- Nicht E-3-bezogen; alle Admin-Funktionen rendern normal (superadmin-Rolle aufgelöst). Könnte ali-Testkonto-spezifisch sein (SQL-bcrypt-Setup) ODER systemisch. **Worth a look**, kein E-3-Blocker.
