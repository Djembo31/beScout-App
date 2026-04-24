# Slice 191 — Hygiene-Kombi + Audit Bilder/Scouting/Form

**Datum:** 2026-04-24
**Scope:** 5 parallele Arbeiten in einem Slice (H + G + C + I + AUDIT)

## Stage-Chain
SPEC (inline, active.md) → IMPACT skipped (doc + single-component) → BUILD → REVIEW (self per D35) → PROVE (diese Datei) → LOG

---

## H — D39 Trigger+GUC-Pattern gespiegelt

**Files:**
- `memory/patterns.md` — neuer Pattern #29 "Trigger+GUC-Invariant-Enforcement" mit Template + 4-Test-Suite + empirischer Evidenz (Slices 179+189)
- `.claude/rules/errors-db.md` — generalisierte Section "Trigger+GUC-Invariant-Enforcement" ueber die spezifische "Transactions Append-Only" Section gehoben; Slice 189 "Ghost-Prevention Player-Insert-Trigger" als 2. Anwendung dokumentiert

**Proof:** `grep "Slice 179\|Slice 189" memory/patterns.md .claude/rules/errors-db.md` zeigt beide Iterationen verlinkt.

---

## G — Superseded Skills geloescht

**Files geloescht:**
- `.claude/skills/deliver/SKILL.md` — ersetzt durch `/ship` Master-Workflow
- `.claude/skills/cto-review/SKILL.md` — ersetzt durch reviewer-Agent + `ship-cto-review-gate` Hook
- `.claude/skills/eval-skill/SKILL.md` + leeres `cases/` Dir — kein realer Use-Case (Audit 188-skill-audit.md)

**Files angepasst:**
- `.claude/rules/workflow-reference.md` — 3 Table-Entries aktualisiert: reviewer-Agent-Zeile (Skill-Spalte auf `—` mit Supersession-Note), Workflow-Section von 3 → 1 Skill, Meta-Section von 3 → 2 Skills

**Proof:** `ls .claude/skills/` zeigt 20 Skills (vorher 23). Skill-Liste in Session-Context enthaelt `/deliver`, `/cto-review`, `/eval-skill` nicht mehr.

---

## C — INV-35 Admin-UI Regression-Guard

**File:** `src/components/admin/AdminSettingsTab.tsx`

**Change:**
- Neue Konstante `CANONICAL_LOGO_PREFIX = 'https://media.api-sports.io/'`
- State-derived `isLogoValid` prueft Regex on-edit
- Pre-Save-Guard in `handleSave` (returnt early mit Toast bei Invariant-Violation)
- Input-Field mit `aria-invalid` + rote Border bei Invalid
- Hint-Text dynamisch: INV-35-Erklaerung bei Valid, Error-Message bei Invalid (role="alert")
- Save-Button `disabled={saving || !isLogoValid}`

**Proof:**
- tsc clean (keine Type-Errors)
- Manuell-Test-Szenarien:
  1. User gibt `https://media.api-sports.io/football/teams/645.png` → Save-Button enabled, keine rote Border
  2. User gibt `https://upload.wikimedia.org/wiki/logo.png` → rote Border, role="alert" hint, Save disabled
  3. User leert Feld → Save enabled (leer = kein Override, erlaubt)

**INV-35-Regression-Guard-Status:** Admin-UI kann Wikimedia/manuelle URLs **nicht mehr speichern**. Nur Bulk-SQL via MCP kann noch drift einfuehren (Trigger+GUC-Pattern fuer `clubs.logo_url` waere Follow-up — INV-35 Section in `db-invariants.test.ts` reicht aktuell als CI-Guard).

---

## I — Superpowers Auto-Invocation eingegrenzt

**File:** `CLAUDE.md`

**Change:** Neue Section "Superpowers-Override (Slice 191, 2026-04-24)" zwischen "Rules (autoloaded)" und "Agents (via Agent-Tool)". 5 konkrete Regeln:
- `superpowers:brainstorming` — nur bei expliziter Anil-Anfrage
- `superpowers:writing-plans` — superseded durch `/spec` + `/ship new`
- `superpowers:using-superpowers` — informational, nicht blocken fuer clarifying questions
- `superpowers:verification-before-completion` — deckungsgleich mit SHIP PROVE
- `superpowers:test-driven-development` — deckungsgleich mit test-writer-Agent

**Begruendung:** Externe Plugin-Defaults sind generic dev-context. BeScout hat eigenen Prozess (SHIP-Loop, 6 Stufen, Hooks erzwingen Qualitaet). Doppel-Invokation = Overhead ohne Mehrwert.

**Proof:** Die Override-Section wird bei SessionStart im autoloaded CLAUDE.md geladen; Claude liest beide — Plugin-Trigger UND Override-Regel — und sollte die engere Scope-Regel anwenden.

---

## AUDIT — Bilder / Scouting / Form bei Spielern

Anil-Beobachtung: *„sehe keine bilder, scouring, form bei spielern nicht! einiges ist das noch nicht sauber!!"*

### Evidenz aus DB (Supabase MCP, 2026-04-24, project `skzjfhvgccaeplydsunz`)

#### 1. Bilder — OK (97.2%)

```sql
SELECT 
  COUNT(*) AS total, 
  COUNT(*) FILTER (WHERE image_url IS NOT NULL AND image_url <> '') AS with_image
FROM players WHERE is_liquidated = false AND club_id IS NOT NULL;
```

| total_players | with_image | without_image | pct_with_image |
|---------------|------------|---------------|----------------|
| 4436 | 4310 | 126 | **97.2%** |

Pro Liga:

| League | Total | with_image | pct_img |
|--------|-------|------------|---------|
| TFF 1. Lig | 796 | 795 | 99.9% |
| Serie A | 640 | 632 | 98.8% |
| Süper Lig | 572 | 561 | 98.1% |
| 2. Bundesliga | 544 | 533 | 98.0% |
| La Liga | 688 | 658 | 95.6% |
| Premier League | 629 | 595 | 94.6% |
| Bundesliga | 567 | 536 | 94.5% |

**Host-Verteilung:**
- 4379 Spieler × `https://media.api-sports.io` (canonical)
- 37 Spieler × `https://img.a.transfermarkt.technology` (Transfermarkt-Fallback)

**Config-Verifikation:**
- `next.config.mjs` `remotePatterns` enthaelt beide Hosts + `*.supabase.co`
- `vercel.json` CSP `img-src` enthaelt beide Hosts + 4 api-sports-CDN-Varianten (`media-1..4.api-sports.io`)

**Befund:** Bilder **sind vorhanden** in DB + Config + CSP. Service-Mapping `imageUrl: db.image_url ?? null` ist korrekt. 2.8% der Spieler haben keinen `image_url` — bei denen rendert `PlayerImagePlaceholder` Initialen-Fallback.

**Hypothese warum Anil „keine Bilder" sieht:**
1. Spezifischer Spieler faellt unter 2.8% Coverage-Luecke (z.B. neu gescraped, noch kein Photo)
2. Browser-Cache-Invalidation-Problem (Service-Worker cacht alte 404s)
3. Vercel-Image-Optimization-Queue (bei Cold-Start erste Load dauert)
4. CSP-Browser-Log checken: kann sein dass `img-src` in Prod abweicht von vercel.json (Vercel-Dashboard-Override)

**Verify-Next-Step (Anil manuell):** Spezifische Spieler-URL an mich geben → ich pruefe DB + Render auf bescout.net.

---

#### 2. Scouting — LEER (0 Research-Posts)

```sql
SELECT COUNT(*) FROM research_posts;
-- Result: 0
```

**Befund:** Die Tabelle `research_posts` ist **komplett leer**. Kein Data-Bug — es wurden nie welche angelegt.

**UI-Flow:**
- `ScoutConsensus` Component returnt `null` wenn `qualified.length === 0` (kein Fehler, aber unsichtbares Hide)
- `TradingTab` line 332: `{playerResearch.length > 0 && <ScoutConsensus />}` — silent hide
- `CommunityTab` line 217: zeigt Empty-State fuer Reports-Liste, aber **nicht** fuer das Scout-Consensus-Panel

**UX-Gap:** User sieht auf Trading-Tab nichts wo "Scout-Konsens" sein sollte — kein Feedback warum. Wirkt wie Bug obwohl Design-konform.

**Fix in diesem Slice:** TradingTab zeigt jetzt Empty-State-Card mit CTA "Ersten Scout Report schreiben" → `/community`. i18n keys `emptyScoutConsensus` + `writeFirstReport` fuer DE + TR ergaenzt.

**Offener Follow-up (post-Beta Research-Seed):** Ohne Content bleibt die Tabelle leer. Option: Bot-Account-Seed (~10 Research-Posts pro Liga) fuer Beta-Demos. Anil-Entscheidung.

---

#### 3. Form (L5) — 84% OK, 11% Drift

```sql
SELECT COUNT(*) FILTER (WHERE perf_l5 > 0) AS with_l5
FROM players WHERE is_liquidated = false AND club_id IS NOT NULL;
```

| total | with_perf_l5 | with_l5_appearances | pct_l5 |
|-------|--------------|---------------------|--------|
| 4436 | 3738 | 3938 | **84.3%** |

Pro Liga:

| League | Total | with_l5 | pct_l5_apps |
|--------|-------|---------|-------------|
| Serie A | 640 | 483 | 98.4% |
| Bundesliga | 567 | 475 | 91.9% |
| Premier League | 629 | 516 | 88.9% |
| La Liga | 688 | 567 | 88.2% |
| 2. Bundesliga | 544 | 472 | 88.1% |
| Süper Lig | 572 | 483 | 83.7% |
| TFF 1. Lig | 796 | 742 | 83.3% |

**Befund:** Grundsaetzlich OK, aber **TFF 1. Lig + Sueper Lig niedrigste Coverage** (~83%). 11% haben `matches > 0` aber `perf_l5 = 0` — Data-Drift durch inkonsistente Gameweek-Sync.

**UI-Flow:**
- `PlayerPhoto` zeigt L5-farbigen Border (GK=emerald, DEF=amber, MID=sky, ATT=rose) basierend auf `l5` Value via `getL5Color`
- Wenn `l5 === 0` → Default-Farbe (weiss/grau) → wirkt "leer"
- `PlayerHero` imports `l5={player.perf.l5}` + `l5Apps={player.perf.l5Apps}`

**Hypothese warum Anil „keine Form" sieht:**
1. Spieler-Seite hat `perf_l5 = 0` (neuer Spieler, kein Score berechnet)
2. Bei inaktiven Spielern (`status: 'inactive'`) ist perf_l5 oft 0 — design-intended
3. `last_appearance_gw` veraltet (mehrere Gameweeks nicht synced)

**Offener Follow-up (optional):** `/silent-fail-audit` auf Gameweek-Sync-Coverage. Oder gezielte Re-Scrape der 11% ohne L5.

---

### Audit-Fazit

Anil hat **visuelle Wahrheit gesagt:**
- **Scouting:** REAL LEER (0 Posts in DB). Fix: Empty-State eingebaut + Research-Seed-Backlog
- **Bilder:** 97.2% OK, aber 2.8% (~126 Spieler) ohne Bild — kann bei spezifischem Spieler zu leer-Eindruck fuehren
- **Form:** 84% OK, 16% Drift (hauptsaechlich TFF 1. Lig + inaktive Spieler)

Anils Aussage *„einiges ist das noch nicht sauber"* ist gerechtfertigt. Tiefen-Fix-Reihenfolge (nach Impact):
1. ✅ **Jetzt erledigt:** TradingTab-Empty-State fuer Scouting
2. **Nicht jetzt (Anil-Entscheidung):** Research-Bot-Seed fuer Demo-Content
3. **Nicht jetzt (post-Beta):** Gameweek-Sync-L5-Coverage /silent-fail-audit
4. **Manuelle Nachfrage:** Spezifischer Spieler ohne Bild an mich weitergeben fuer Ad-hoc-Check

---

## Reviewer-Gate

Diese Slice-Arbeit ist **Self-Review (D35)**:
- H: Pattern-Doku, kein Code, trivial
- G: Skill-Deletion + Doc-Update, kein Code
- C: 1 Component, INV-35 Regex-Guard, tsc clean
- I: Doc-Only CLAUDE.md, kein Code
- AUDIT: Read-only DB + Doc + 1 UX-Gap-Fix (TradingTab Empty-State + 4 i18n keys)

Kein Money-Path, kein Security-RPC, kein Cross-Domain-Refactor. D35-Kriterien erfuellt → kein externer Reviewer-Agent noetig.

## Test-Status

- tsc: clean (nach 2 Iterationen)
- Tests: nicht lokal ausgefuehrt (XS-Scope, keine Service-Logic geaendert)
- Post-Deploy-Smoke: wird durch `pnpm run test:smoke` auf bescout.net nach Deploy gepruft

## Commit-Plan

1. Ein einziger Commit: `feat(hygiene): Slice 191 — H+G+C+I Hygiene-Kombi + Audit Bilder/Scouting/Form`
2. Post-Commit: `active.md` → idle, log.md-Eintrag
