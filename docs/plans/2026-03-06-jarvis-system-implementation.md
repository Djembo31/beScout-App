# Jarvis System Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Replace the monolithic CLAUDE.md + MEMORY.md knowledge system with a 3-layer architecture (Rules + Identity + Working Context) that loads only relevant knowledge per domain, adds a Stop Hook quality gate, and cleans up unused skills/plugins.

**Architecture:** Path-specific `.claude/rules/` files load domain knowledge only when touching matching files. CLAUDE.md shrinks to ~70 lines of pure project identity. Feature-context-files in `memory/features/` track active work. Stop Hook auto-checks completeness.

**Tech Stack:** Claude Code rules system (YAML frontmatter `paths:`), Claude Code hooks (prompt type for Stop, command type for Notification), custom slash commands (`.claude/commands/`).

---

## Phase 1: Rules + CLAUDE.md (Kern)

### Task 1: Create .claude/rules/ directory and core.md

**Files:**
- Create: `.claude/rules/core.md`

**Step 1: Create rules directory**

Run: `mkdir -p .claude/rules`

**Step 2: Write core.md (always loaded, no path filter)**

```markdown
---
description: Kern-Workflow und Knowledge Capture Protocol
---

## Workflow
- Features/groessere Aenderungen (>10 Zeilen): Research → Plan → Anil OK → Code → Build → Verify
- Kleine Bugfixes (<10 Zeilen): Direkt fixen, kurz erklaeren
- Rollback-Regel: Nicht flicken. Git zuruecksetzen, Plan anpassen, sauber neu

## Knowledge Capture Protocol
Wenn waehrend der Arbeit neues Wissen entsteht — sofort festhalten:
- Neues Requirement → `memory/features/*.md` updaten
- Neue Erkenntnis/Pattern → passende `rules/*.md` oder `memory/patterns.md` updaten
- Neue Entscheidung → `memory/features/*.md` oder `memory/decisions.md` updaten
- Neues Feature gestartet → File in `memory/features/` erstellen + `current-sprint.md` Router updaten
- Feature fertig → nach `memory/features/archive/` verschieben + Router updaten
- Kurzes Feedback geben: "requirement aktualisiert: X" oder "pattern notiert: Y"

## Session-Hygiene
- /compact bei Themenwechsel (ich manage das)
- Bestehende Components/Services IMMER pruefen bevor neu gebaut wird
- Session-Ende: `current-sprint.md` updaten (Router + letzter Stand)

## Code-Konventionen
- `'use client'` auf allen Pages (Client Components)
- Types zentral in `src/types/index.ts`
- Shared UI in `src/components/ui/index.tsx`
- `cn()` fuer classNames, `fmtScout()` fuer Zahlen (deutsch: 1.000)
- Cache-Invalidation nach Writes via `invalidateTradeData()` / `invalidate(prefix)`
- Deutsche UI-Labels, englische Code-Variablen/Kommentare
```

**Step 3: Verify file was created**

Run: `cat .claude/rules/core.md`
Expected: File content matches above

**Step 4: Commit**

Run: `git add .claude/rules/core.md && git commit -m "chore: add .claude/rules/core.md (Jarvis Phase 1)"`

---

### Task 2: Create rules/ui-components.md

**Files:**
- Create: `.claude/rules/ui-components.md`

**Step 1: Write ui-components.md**

```markdown
---
paths:
  - "src/components/**"
  - "src/app/**/*.tsx"
---

## Mobile-First
- Touch Targets: min 44x44px (`min-h-[44px]`)
- Font-Size nie unter 16px (iOS Auto-Zoom)
- `100dvh` / `min-h-dvh` statt `100vh` / `min-h-screen`
- Bottom Nav: `padding-bottom: env(safe-area-inset-bottom)`
- Kein horizontaler Overflow
- Modals auf Mobile → Bottom Sheets
- `inputMode="numeric"` bei Zahlenfeldern

## States (IMMER alle implementieren)
- Hover, Active, Focus, Disabled
- Loading: Skeleton Screens (nicht Spinner)
- Empty: hilfreiche Message
- Error: mit Retry-Option

## Accessibility
- Icon-only Buttons: IMMER `aria-label`
- Dekorative Icons: IMMER `aria-hidden="true"`
- Expandable Controls: `aria-expanded` + `aria-controls`
- Inputs/Selects: `aria-label` oder `id`+`htmlFor`
- Error Messages: `role="alert"`

## Anti-Slop
- Keine zufaelligen Gradients, keine uebertriebenen Border-Radius
- Spacing: bestehende Patterns uebernehmen, nicht neu erfinden
- `cn()` fuer classNames, NICHT Template Literals
- `size-*` statt `w-* h-*` bei quadratischen Elementen
- `text-balance` auf Headings, `text-pretty` auf Paragraphs
- `tabular-nums` auf alle numerischen Daten
- `transition-colors` statt `transition-all`
- `will-change` NUR temporaer, `backdrop-blur` max `sm` (4px)

## Spieler-Darstellung
- IMMER `PlayerDisplay` aus `@/components/player/PlayerRow` (compact/card)
- IMMER `PlayerPhoto` aus `player/index.tsx` — NIEMALS inline img+fallback
- L5-Tokens: `getL5Color()`/`getL5Hex()`/`getL5Bg()` aus `player/index.tsx`

## Mobile Tab-Bars
- `flex-shrink-0` (NIEMALS `flex-1`) + `overflow-x-auto` + `scrollbar-hide`
```

**Step 2: Commit**

Run: `git add .claude/rules/ui-components.md && git commit -m "chore: add .claude/rules/ui-components.md (Jarvis Phase 1)"`

---

### Task 3: Create rules/database.md

**Files:**
- Create: `.claude/rules/database.md`

**Step 1: Write database.md**

```markdown
---
paths:
  - "src/lib/services/**"
  - "src/lib/queries/**"
  - "src/app/api/**"
  - "src/types/**"
---

## Supabase Patterns
- NIE in Components → immer Service Layer (`lib/services/`)
- Explicit `.select()` mit FK-Join → TS inferred als Array → Cast noetig
- `.maybeSingle()` fuer optionale Lookups (nicht `.single()` — 406 bei 0 Rows)
- NIEMALS `Promise.resolve(supabase...)` → immer `await`
- PostgREST `nested.field` unzuverlaessig → separate Query + `.in()`
- `getWallet()` NICHT cachen (RLS Race Condition)
- Realtime: Tabelle braucht `REPLICA IDENTITY FULL`
- RLS `.update()` stumm blockiert → IMMER RPC fuer geschuetzte Tabellen

## RPC Regeln
- Parameter IMMER aus DB verifizieren (`pg_get_functiondef`)
- `::TEXT` auf UUID: NIEMALS beim INSERT
- ALLE Geld-RPCs: `IF p_quantity < 1 THEN RETURN error`
- REVOKE: Von `PUBLIC, authenticated, anon` (alle 3!)
- `auth.uid()` ist NULL in SECURITY DEFINER → NULL-safe Guards
- Gamification: 13 DB-Triggers — Client ruft NICHT direkt auf

## Schema
- Neue DB-Tabellen: FK auf `profiles` (nicht `auth.users`)
- Types zentral in `src/types/index.ts`
- `players` hat `first_name`/`last_name`, NICHT `name`
- `wallets` PK=user_id (kein `id`, kein `currency`)
- `orders.side` (nicht type), `post_votes.vote_type` = SMALLINT
```

**Step 2: Commit**

Run: `git add .claude/rules/database.md && git commit -m "chore: add .claude/rules/database.md (Jarvis Phase 1)"`

---

### Task 4: Create rules/trading.md

**Files:**
- Create: `.claude/rules/trading.md`

**Step 1: Write trading.md**

```markdown
---
paths:
  - "src/lib/services/trading*"
  - "src/lib/services/wallet*"
  - "src/lib/services/ipo*"
  - "src/lib/services/offers*"
  - "src/components/market/**"
  - "src/app/**/market/**"
---

## Geld-Regeln
- IMMER als BIGINT cents (1,000,000 cents = 10,000 $SCOUT)
- Alle Geld-Operationen als atomare DB Transactions (RPCs)
- Trades/Transactions append-only (kein UPDATE/DELETE auf Logs)
- `fmtScout()` fuer Formatierung, `$SCOUT` user-sichtbar
- `ipo_price` = fest, `floor_price` = MIN(sell orders)
- NIEMALS leere `.catch(() => {})` — mindestens `console.error`

## MiCA/CASP Compliance
- NIEMALS: Investment, ROI, Profit, Rendite, Dividende, Gewinn, Ownership
- IMMER: Utility Token, Platform Credits, Scout Assessment
- $SCOUT = "Platform Credits", DPC = "Digital Player Contract"

## Closed Economy (Phase 1)
- KEIN Cash-Out, KEIN P2P-Transfer, KEIN Exchange
- Kein Withdrawal-Feature bauen. Auch nicht versteckt.
```

**Step 2: Commit**

Run: `git add .claude/rules/trading.md && git commit -m "chore: add .claude/rules/trading.md (Jarvis Phase 1)"`

---

### Task 5: Create rules/business.md

**Files:**
- Create: `.claude/rules/business.md`

**Step 1: Write business.md**

```markdown
---
description: Business-Regeln und Compliance
---

## Licensing-Phasen (ADR-028)
- Phase 1 (jetzt): DPC Trading (BSD-Credits), Free Fantasy, Votes, Events, Scout Reports
- Phase 3 (nach CASP): $SCOUT Token, Cash-Out, Exchange — NICHT BAUEN
- Phase 4 (nach MGA): Paid Fantasy Entry, Turniere mit Preisen — NICHT BAUEN
- Kill-Switch: BSD-Sales bei EUR 900K stoppen (noch nicht implementiert)

## Wording-Compliance (KRITISCH)
- NIEMALS: Investment, ROI, Profit, Rendite, Dividende, Gewinn, Ownership, "guaranteed returns"
- IMMER: Utility Token, Platform Credits, Scout Assessment, "at BeScout's discretion"
- $SCOUT = "Platform Credits" (nicht Kryptowaehrung)
- DPC = "Digital Player Contract" (nicht Spieleranteil)
- Disclaimers auf JEDER Seite mit $SCOUT/DPC

## Geofencing-Tiers
- TIER_FULL (Rest EU): Alles
- TIER_CASP (EU ohne Gaming): Trading ja, Paid Fantasy nein
- TIER_FREE (DE/FR/AT/UK): Free only
- TIER_RESTRICTED (TR): Content + Free Fantasy only
- TIER_BLOCKED (USA/China/OFAC): Kein Zugang

## i18n
- next-intl, `t()` nutzen, Cookie `bescout-locale`
- Messages in `messages/{locale}.json`
```

**Step 2: Commit**

Run: `git add .claude/rules/business.md && git commit -m "chore: add .claude/rules/business.md (Jarvis Phase 1)"`

---

### Task 6: Create rules/fantasy.md

**Files:**
- Create: `.claude/rules/fantasy.md`

**Step 1: Write fantasy.md**

```markdown
---
paths:
  - "src/components/fantasy/**"
  - "src/app/**/fantasy/**"
  - "src/lib/services/events*"
  - "src/lib/services/lineups*"
  - "src/lib/services/scoring*"
  - "src/lib/services/predictions*"
---

## Events
- entry_fee, prize_pool, max_entries, event_tier
- Events klonen bei neuem GW (cron_process_gameweek)

## Lineups
- 6er (1+2+2+1) oder 11er (1+4+3+3) Format
- Deadline: per-fixture Locking (fixture.starts_at), nicht GW-level

## Scoring
- rating*10, perf_l5/l15 aus fixture_player_stats

## Predictions
- Individuelle Fixture-Vorhersagen
- activeGameweek Fallback: ?? 1 ist gefaehrlich fuer User ohne Club
```

**Step 2: Commit**

Run: `git add .claude/rules/fantasy.md && git commit -m "chore: add .claude/rules/fantasy.md (Jarvis Phase 1)"`

---

### Task 7: Create rules/common-errors.md

**Files:**
- Create: `.claude/rules/common-errors.md`

**Step 1: Write common-errors.md**

```markdown
---
description: Haeufigste Fehler die bei JEDER Arbeit relevant sind
---

## DB/Types
- `players` hat `first_name`/`last_name`, NICHT `name`
- `wallets` PK=user_id (kein `id`, kein `currency`)
- `orders.side` (nicht type), `post_votes.vote_type` = SMALLINT (1/-1)

## React/TypeScript
- Hooks VOR early returns (React rules)
- `Array.from(new Set())` statt spread (strict TS)
- `Modal` braucht IMMER `open={true/false}` prop
- `PlayerPhoto` Props: `first`/`last`/`pos` (nicht firstName/lastName)
- Barrel-Exports bereinigen wenn Dateien geloescht werden
- NIEMALS leere `.catch(() => {})` — mindestens `console.error`

## CSS
- `::after`/`::before` mit `position: absolute` → Eltern MUSS `relative` haben
- `overflow: hidden` allein reicht NICHT als Containing Block

## Turkish Unicode
- `I`.toLowerCase() = `i̇` (NICHT `i`) → NFD + strip diacritics + `ı→i`

## API-Football
- Substitution: `time.elapsed` (NICHT `time.minute`!), `player`=OUT, `assist`=IN
- Null guards: `evt.player?.id` und `evt.assist?.id` koennen null sein
- `grid_position` kann kaputt sein: fehlende GK-Row, Duplikate, >11 Starters
- API-Football hat KEINE Market Values → nur Transfermarkt
```

**Step 2: Commit**

Run: `git add .claude/rules/common-errors.md && git commit -m "chore: add .claude/rules/common-errors.md (Jarvis Phase 1)"`

---

### Task 8: Rewrite CLAUDE.md (~70 lines)

**Files:**
- Modify: `CLAUDE.md` (complete rewrite from 194 to ~70 lines)

**Step 1: Read current CLAUDE.md** (already read above)

**Step 2: Write new CLAUDE.md**

```markdown
# BeScout — Projekt-Kontext

B2B2C Fan-Engagement-Plattform fuer Fussballvereine. Clubs verkaufen DPCs,
starten Events/Votes, verteilen $SCOUT-Credits. Pilot: Sakaryaspor (TFF 1. Lig).

## Stack
Next.js 14 (App Router) | TypeScript strict | Tailwind (Dark Mode only) |
Supabase (PostgreSQL + Auth + Realtime) | TanStack React Query v5 | Zustand v5 |
next-intl (Cookie bescout-locale) | lucide-react

## Regeln → .claude/rules/
Domaenen-spezifische Regeln laden automatisch per Glob-Pattern.
core.md + business.md + common-errors.md = immer geladen.
ui-components.md, database.md, trading.md, fantasy.md = path-spezifisch.

## Memory → memory/
- current-sprint.md: Aktueller Stand + Feature-Router (bei Session-Start lesen)
- features/*.md: Aktive Feature-Kontexte (max 5, on-demand)
- features/archive/: Abgeschlossene Features (nie automatisch laden)
- Andere Topic-Files: on-demand wenn relevant

## Workflow
1. current-sprint.md lesen → wissen wo wir stehen
2. Anil sagt was ansteht → Feature-File laden wenn vorhanden
3. Plan → Anil gibt OK → Code → npx next build → Verify
4. Bei Fehler: Rollback (git zurueck, sauber neu) — NICHT flicken
5. Session-Ende: current-sprint.md + Feature-Files sind bereits aktuell (Knowledge Capture Protocol)

## Kern-Business
- DPC = Digital Player Contract. Marktwert steigt → Community Success Fee
- $SCOUT = Platform Credits (NIEMALS: Investment, ROI, Profit, Ownership)
- Geld IMMER als BIGINT cents (1,000,000 = 10,000 $SCOUT)
- Closed Economy Phase 1: KEIN Cash-Out, KEIN P2P, KEIN Exchange

## Quality Pipeline (nach UI-Aenderungen)
1. /baseline-ui [datei]
2. /fixing-accessibility [datei]
3. /fixing-motion-performance [datei]

## Referenzen
- docs/VISION.md — Produktvision
- docs/STATUS.md — Detaillierter Fortschritt
- docs/BeScout_Context_Pack_v8.md — Business Master-Dokument
- docs/SCALE.md — Skalierungsarchitektur und DB-Schema
```

**Step 3: Verify line count**

Run: `wc -l CLAUDE.md`
Expected: ~55-70 lines

**Step 4: Commit**

Run: `git add CLAUDE.md && git commit -m "chore: rewrite CLAUDE.md to ~70 lines (Jarvis Phase 1)"`

---

### Task 9: Slim down MEMORY.md to pointer/index (~30 lines)

**Files:**
- Modify: `C:\Users\Anil\.claude\projects\C--bescout-app\memory\MEMORY.md` (from 149 to ~30 lines)

**Step 1: Read current MEMORY.md** (already read above)

**Step 2: Write new MEMORY.md**

```markdown
# BeScout Project Brain — Index

> Auto-loaded (erste 200 Zeilen). Tiefenwissen → Topic-Files + rules/.

## Projekt-Snapshot
- **Status:** Beta-Launch Ready (263 Migrations, 25 Routes, 195 Unit Tests, 70 E2E Tests)
- **Stack:** Next.js 14.2.35 / TypeScript strict / Tailwind / Supabase / next-intl
- **Pilot:** Sakaryaspor (TFF 1. Lig), 570 Spieler (20 Clubs)
- **Supabase:** `skzjfhvgccaeplydsunz` (eu-west-1)
- **Live-Daten:** API-Football Plus, 380 Fixtures, 7.467 Stats (GW1-28)

## Aktueller Stand → current-sprint.md
## Aktive Features → features/*.md
## Regeln → .claude/rules/ (7 Files, path-spezifisch)

## KERNGESCHAEFT: Community Success Fee
- DPC = Anteil am Spieler. Marktwert steigt → DPC-Reward steigt
- Club zahlt bei Transfer an DPC-Holder, proportional zum Marktwert-Wachstum
- 3 Geldquellen bei Liquidation: 1) Community Success Fee 2) PBT (1.5%) 3) Trading-Gewinn

## Wissensbasis (Topic Files)
| File | Inhalt |
|------|--------|
| current-sprint.md | Stand, DB-Stand, Naechste Prioritaet, Blocker |
| features/*.md | Aktive Feature-Kontexte (max 5) |
| architecture.md | Projektstruktur, Design System, Routes |
| backend-systems.md | DB Schema, RPCs, Scoring, Trading |
| decisions.md | ADR mit Kontext + Begruendung |
| patterns.md | Code-Patterns, Anti-Patterns |
| errors.md | Error Journal + Quick-Reference (100+ Eintraege) |
| sessions.md | Letzte 3 Sessions im Detail |
| business-context.md | Sales-Tiers, Licensing, Geofencing |
| user-prefs.md | Anils Arbeitsweise + Prioritaeten |
```

**Step 3: Verify line count**

Run: `wc -l MEMORY.md` (from memory directory)
Expected: ~30-35 lines

**Step 4: No git commit needed** (memory/ is in user config, not repo)

---

## Phase 2: Memory Restructure

### Task 10: Slim current-sprint.md to ~30 lines (Router format)

**Files:**
- Modify: `C:\Users\Anil\.claude\projects\C--bescout-app\memory\current-sprint.md` (from 109 to ~30 lines)

**Step 1: Write new current-sprint.md**

```markdown
# Current Sprint

## Aktive Features
| Feature | File | Status |
|---------|------|--------|
| Jarvis System | features/jarvis-system.md | In Arbeit |

## Blocker
- VAPID Key fehlt in Vercel (Push Notifications)

## Letzter Stand
- **Session:** #199 (06.03.2026)
- **Thema:** Jarvis System — Knowledge Architecture Implementierung
- **DB:** 263 Migrations, Active GW 28, 7.467 Stats
- **Tests:** 195 Unit (gruen), 70 E2E (67+3 flaky), Build: 0 Errors

## Naechste Prioritaet
1. Push Notification Backend (web-push Sender)
2. VAPID Key in Vercel setzen
3. Real User Testing mit 50 Beta-Testern
```

**Step 2: No git commit needed** (memory/ is in user config)

---

### Task 11: Create memory/features/ directory structure

**Files:**
- Create: `C:\Users\Anil\.claude\projects\C--bescout-app\memory\features\` directory
- Create: `C:\Users\Anil\.claude\projects\C--bescout-app\memory\features\archive\` directory
- Create: `C:\Users\Anil\.claude\projects\C--bescout-app\memory\features\jarvis-system.md`

**Step 1: Create directories**

Run:
```bash
mkdir -p "/c/Users/Anil/.claude/projects/C--bescout-app/memory/features/archive"
```

**Step 2: Write jarvis-system.md (current feature context)**

```markdown
# Feature: Jarvis System

## Status: In Arbeit

## Was
Knowledge Architecture umbauen: monolithisches CLAUDE.md → 3-Schichten (Rules + Identity + Working Context).
Design Doc: `docs/plans/2026-03-06-jarvis-system-design.md`

## Entscheidungen
- rules/ mit paths: YAML frontmatter (validiert, GitHub #13905 gefixt)
- Built-in Auto Memory + Knowledge Capture Protocol statt claude-mem (Overhead)
- Stop Hook als prompt-basierte Quality Gate (Haiku)
- Max 5 aktive Feature-Files, Rest in archive/

## Betroffene Dateien
- .claude/rules/ (7 neue Files)
- CLAUDE.md (Rewrite ~70 Zeilen)
- .claude/settings.json (Stop Hook, Test-Hook deaktivieren)
- ~/.claude/settings.json (Notification Hook)
- .claude/commands/ (switch, status, done)
- .claude/skills/ (21 Skills entfernen)
- .claude/plugins/ (2 Plugins entfernen)
- memory/ (MEMORY.md, current-sprint.md, features/)

## Offene Fragen
- Keine
```

---

### Task 12: Trim sessions.md to last 3 sessions

**Files:**
- Modify: `C:\Users\Anil\.claude\projects\C--bescout-app\memory\sessions.md` (from 785 to ~100 lines)

**Step 1: Read last 3 sessions from sessions.md**

Run: `tail -150 "/c/Users/Anil/.claude/projects/C--bescout-app/memory/sessions.md"`

Use this to identify the last 3 session entries.

**Step 2: Rewrite sessions.md with only last 3 sessions + header**

The file should contain:
```markdown
# Session-Historie

> Letzte 3 Sessions im Detail. Aeltere Sessions → sessions-archive.md

## Session #199 — 06.03.2026
[Current session details added at session end]

## Session #198 — 06.03.2026
[Keep existing #198 content]

## Session #197 — [date]
[Keep existing #197 content]
```

**Step 3: Append older sessions summary to sessions-archive.md**

Read sessions-archive.md, append a compressed summary of sessions #1-#196.

---

## Phase 3: God-Mode Hooks + Commands

### Task 13: Add Stop Hook Quality Gate to settings.json

**Files:**
- Modify: `.claude/settings.json`

**Step 1: Read current settings.json** (already read above)

**Step 2: Update settings.json with Stop Hook + keep existing PostToolUse deactivated**

The new `.claude/settings.json` should be:

```json
{
  "version": "1.0",
  "permissions": {
    "Bash(*)": true,
    "Read(*)": true,
    "Write(*)": true,
    "Edit(*)": true
  },
  "hooks": {
    "Stop": [
      {
        "hooks": [
          {
            "type": "prompt",
            "prompt": "Check the conversation. Did the assistant handle ALL of these for EVERY changed UI component: 1) hover/active/focus/disabled states 2) aria-labels on interactive elements 3) loading/empty/error states 4) mobile touch targets min 44px 5) tabular-nums on numbers 6) German labels, English code variables? Also: were existing components/services reused instead of rebuilt? Were the active feature-file requirements fully addressed? If ANY item is missing, respond with {\"ok\": false, \"reason\": \"Missing: [list specific items per file]\"}. If all good, respond with {\"ok\": true}."
          }
        ]
      }
    ]
  },
  "settings": {}
}
```

Note: The PostToolUse test hook is intentionally removed (tests run via `npx next build` at end instead of after every edit).

**Step 3: Verify JSON is valid**

Run: `node -e "JSON.parse(require('fs').readFileSync('.claude/settings.json','utf8')); console.log('Valid JSON')"`
Expected: `Valid JSON`

**Step 4: Commit**

Run: `git add .claude/settings.json && git commit -m "chore: add Stop Hook quality gate, remove test-on-edit hook (Jarvis Phase 3)"`

---

### Task 14: Add Notification Hook to user settings

**Files:**
- Modify: `C:\Users\Anil\.claude\settings.json` (user-level, NOT project-level)

**Step 1: Read user settings**

Run: `cat "/c/Users/Anil/.claude/settings.json" 2>/dev/null || echo "File does not exist"`

**Step 2: Add Notification hook**

If the file exists, merge in the Notification hook. If not, create it.

The Notification section to add:
```json
{
  "hooks": {
    "Notification": [
      {
        "matcher": "",
        "hooks": [
          {
            "type": "command",
            "command": "powershell.exe -Command \"Add-Type -AssemblyName System.Windows.Forms; [System.Windows.Forms.MessageBox]::Show('Claude braucht deinen Input', 'BeScout - Claude Code', 'OK', 'Information')\""
          }
        ]
      }
    ]
  }
}
```

**Step 3: Verify JSON is valid**

Run: `node -e "JSON.parse(require('fs').readFileSync('/c/Users/Anil/.claude/settings.json','utf8')); console.log('Valid JSON')"`

---

### Task 15: Create custom commands (switch, status, done)

**Files:**
- Create: `.claude/commands/switch.md`
- Create: `.claude/commands/status.md`
- Create: `.claude/commands/done.md`

**Step 1: Create commands directory**

Run: `mkdir -p .claude/commands`

Note: The `.claude/commands/` directory already exists based on git status. Verify contents first.

**Step 2: Write switch.md**

```markdown
Themenwechsel zu: $ARGUMENTS

1. Fuehre /compact aus um den aktuellen Kontext zu komprimieren
2. Lies memory/current-sprint.md fuer den Feature-Router
3. Lade das Feature-File fuer "$ARGUMENTS" aus memory/features/
4. Wenn kein Feature-File existiert, erstelle eins mit Template:
   - Status: Neu
   - Was: [aus Kontext ableiten]
   - Entscheidungen: [leer]
   - Betroffene Dateien: [aus Kontext ableiten]
   - Offene Fragen: [leer]
5. Lies die relevanten Dateien des Features
6. Melde dich bereit mit einer kurzen Zusammenfassung was ansteht
```

**Step 3: Write status.md**

```markdown
Zeige den aktuellen Projektstand:
1. Lies memory/current-sprint.md
2. Liste alle aktiven Features mit Status
3. Zeige Blocker
4. Zeige letzten Stand (Session-Nr + was passiert ist)
Halte die Ausgabe kompakt (max 20 Zeilen).
```

**Step 4: Write done.md**

```markdown
Session beenden:
1. Update memory/current-sprint.md mit aktuellem Stand
2. Pruefe ob alle Feature-Files aktuell sind
3. Zeige Zusammenfassung: was wurde gemacht, was ist offen
4. Fuehre npx next build zur Verifikation aus
5. Zeige Build-Ergebnis
```

**Step 5: Commit**

Run: `git add .claude/commands/ && git commit -m "chore: add /switch, /status, /done commands (Jarvis Phase 3)"`

---

## Phase 4: Cleanup

### Task 16: Remove irrelevant skills (21 skill directories)

**Files:**
- Delete: `.claude/skills/bencium-controlled-ux-designer/`
- Delete: `.claude/skills/bencium-innovative-ux-designer/`
- Delete: `.claude/skills/renaissance-architecture/`
- Delete: `.claude/skills/human-architect-mindset/`
- Delete: `.claude/skills/design-audit/`
- Delete: `.claude/skills/competitors/`
- Delete: `.claude/skills/content/`
- Delete: `.claude/skills/cto/`
- Delete: `.claude/skills/data/`
- Delete: `.claude/skills/growth/`
- Delete: `.claude/skills/mobile/`
- Delete: `.claude/skills/perf/`
- Delete: `.claude/skills/pitch/`
- Delete: `.claude/skills/pm/`
- Delete: `.claude/skills/qa/`
- Delete: `.claude/skills/review-code/`
- Delete: `.claude/skills/security/`
- Delete: `.claude/skills/sprint/`
- Delete: `.claude/skills/ux/`

**Skills kept (7):**
- `bencium-code-conventions/` (Code-Style)
- `bencium-impact-designer/` (1 Designer-Skill)
- `baseline-ui/` (Quality Gate)
- `fixing-accessibility/` (Quality Gate)
- `fixing-motion-performance/` (Quality Gate)
- `fixing-metadata/` (Quality Gate)
- `typography/` (Quality Gate)

**Step 1: Remove skill directories**

Run:
```bash
cd /c/bescout-app && rm -rf \
  .claude/skills/bencium-controlled-ux-designer \
  .claude/skills/bencium-innovative-ux-designer \
  .claude/skills/renaissance-architecture \
  .claude/skills/human-architect-mindset \
  .claude/skills/design-audit \
  .claude/skills/competitors \
  .claude/skills/content \
  .claude/skills/cto \
  .claude/skills/data \
  .claude/skills/growth \
  .claude/skills/mobile \
  .claude/skills/perf \
  .claude/skills/pitch \
  .claude/skills/pm \
  .claude/skills/qa \
  .claude/skills/review-code \
  .claude/skills/security \
  .claude/skills/sprint \
  .claude/skills/ux
```

**Step 2: Verify remaining skills**

Run: `ls .claude/skills/`
Expected: Only these 7 directories:
- `baseline-ui/`
- `bencium-code-conventions/`
- `bencium-impact-designer/`
- `fixing-accessibility/`
- `fixing-metadata/`
- `fixing-motion-performance/`
- `typography/`

**Step 3: Commit**

Run: `git add -A .claude/skills/ && git commit -m "chore: remove 19 unused skills, keep 7 (Jarvis Phase 4)"`

---

### Task 17: Remove irrelevant plugins (2 plugin directories)

**Files:**
- Delete: `.claude/plugins/node-developer/`
- Delete: `.claude/plugins/project-management/`

**Plugins kept (6):**
- `frontend-expert/`
- `code-quality/`
- `testing-toolkit/`
- `security-essentials/`
- `tailwind-expert/`
- `shadcn-style-expert/`

**Step 1: Remove plugin directories**

Run:
```bash
cd /c/bescout-app && rm -rf \
  .claude/plugins/node-developer \
  .claude/plugins/project-management
```

**Step 2: Verify remaining plugins**

Run: `ls .claude/plugins/`
Expected: 6 directories (code-quality, frontend-expert, security-essentials, shadcn-style-expert, tailwind-expert, testing-toolkit)

**Step 3: Commit**

Run: `git add -A .claude/plugins/ && git commit -m "chore: remove 2 unused plugins (Jarvis Phase 4)"`

---

### Task 18: Remove plugin-generated command files from .claude/commands/

The `.claude/commands/` directory already has ~29 `.md` files auto-generated by plugins (angular-best-practices, vue-composition-api, etc.). These survive plugin deletion as orphan files.

**Step 1: List existing command files**

Run: `ls .claude/commands/`

**Step 2: Remove commands that belong to deleted plugins/skills**

Remove any `.md` files that are NOT `switch.md`, `status.md`, or `done.md`, and not from kept plugins/skills. Specifically remove:
- `angular-best-practices.md` (wrong stack)
- `vue-composition-api.md` (wrong stack)
- `update-tasks.md` (project-management plugin — deleted)
- `create-tasks.md` (project-management plugin — deleted)
- `from-prd.md` (project-management plugin — deleted)
- `generate-docs.md` (project-management plugin — deleted)

Keep all other command files from kept plugins (baseline-ui, fixing-*, code-review, fix-issue, etc.).

**Step 3: Commit**

Run: `git add -A .claude/commands/ && git commit -m "chore: remove orphan command files from deleted plugins (Jarvis Phase 4)"`

---

### Task 19: Simplify settings.local.json

**Files:**
- Modify: `.claude/settings.local.json` (from 334 to ~30 lines)

**Step 1: Read current file** (already read above — 334 lines of individual permissions)

**Step 2: Write simplified settings.local.json**

```json
{
  "permissions": {
    "allow": [
      "Bash(*)",
      "WebSearch",
      "WebFetch(*)",
      "mcp__supabase__*",
      "mcp__context7__*",
      "mcp__playwright__*",
      "mcp__figma-remote-mcp__*",
      "mcp__sequential-thinking__*"
    ]
  },
  "enabledPlugins": {
    "frontend-design@claude-plugins-official": true
  }
}
```

Note: `Read(*)`, `Write(*)`, `Edit(*)` are already in project `settings.json`. `Bash(*)` is duplicated here for safety. All 330+ individual permissions are replaced by wildcards.

**Step 3: Verify JSON is valid**

Run: `node -e "JSON.parse(require('fs').readFileSync('.claude/settings.local.json','utf8')); console.log('Valid JSON')"`

**Step 4: Commit**

Run: `git add .claude/settings.local.json && git commit -m "chore: simplify settings.local.json from 334 to ~15 lines (Jarvis Phase 4)"`

---

## Phase 5: Validation

### Task 20: Build verification

**Step 1: Run build**

Run: `npx next build`
Expected: 0 errors (this is a config-only change, no code was modified)

**Step 2: Run tests**

Run: `npx vitest run`
Expected: 195 tests pass (no code changes)

---

### Task 21: Verify rules load correctly

**Step 1: Check that rules files exist and have valid YAML frontmatter**

Run:
```bash
for f in .claude/rules/*.md; do
  echo "--- $f ---"
  head -5 "$f"
  echo ""
done
```

Expected: Each file shows its YAML frontmatter (either `paths:` or `description:`)

---

### Task 22: Test custom commands exist

**Step 1: Verify command files**

Run: `ls -la .claude/commands/switch.md .claude/commands/status.md .claude/commands/done.md`
Expected: All 3 files exist

---

### Task 23: Final commit summary

**Step 1: Review all changes**

Run: `git log --oneline -15`
Expected: ~10 Jarvis-related commits

**Step 2: Push**

Run: `git push origin main`

---

## Summary of Changes

| What | Before | After |
|------|--------|-------|
| CLAUDE.md | 194 lines | ~65 lines |
| MEMORY.md | 149 lines | ~30 lines |
| current-sprint.md | 109 lines | ~25 lines |
| sessions.md | 785 lines | ~100 lines |
| .claude/rules/ | 0 files | 7 files |
| .claude/commands/ | 0 custom | 3 custom (switch/status/done) |
| .claude/skills/ | 26 dirs | 7 dirs |
| .claude/plugins/ | 8 dirs | 6 dirs |
| settings.json hooks | PostToolUse test | Stop quality gate |
| settings.local.json | 334 lines | ~15 lines |
| Token budget at start | ~1,234 lines | ~320-380 lines |
| Relevance ratio | ~40% | ~95% |
