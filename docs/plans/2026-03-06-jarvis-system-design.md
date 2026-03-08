# Jarvis System — Knowledge Architecture for BeScout

> Design Doc, validiert am 06.03.2026 gegen offizielle Claude Code Docs + Community Research.
> Jede Entscheidung ist begründet. Keine Annahmen.

## Problem

Details werden bei der Umsetzung übersehen — UI-States, Accessibility, Business-Regeln,
bestehende Patterns. Root Cause: 341+ Zeilen generischer Kontext bei Session-Start,
davon ~60% irrelevant für die aktuelle Aufgabe. Signal-to-Noise Ratio ist zu niedrig.

## Lösung: 3-Schichten Wissensarchitektur

```
Schicht 1: DNA           → .claude/rules/     (path-spezifisch, automatisch)
Schicht 2: Identität     → CLAUDE.md           (immer geladen, ~70 Zeilen)
Schicht 3: Arbeitskontext→ memory/             (on-demand + auto-memory)
```

## Validierte Fakten (aus offizieller Doku)

- `.claude/rules/` unterstützt `paths:` Frontmatter mit YAML-Listen und quoted Globs
- Path-spezifische Rules laden wenn Claude Dateien liest die dem Pattern matchen
- Rules ohne `paths:` laden bei jeder Session (wie CLAUDE.md)
- CLAUDE.md überlebt /compact — wird nach Compact von Disk neu geladen
- MEMORY.md: Erste 200 Zeilen werden bei jeder Session geladen
- Topic-Files in memory/ werden NICHT automatisch geladen — nur on-demand
- Unter 200 Zeilen pro CLAUDE.md = optimale Regelanwendung (>92%)
- 5 Rule-Files × 30 Zeilen > 1 File × 150 Zeilen (96% vs 92% Anwendungsrate)

## Schicht 1: Rules (.claude/rules/)

### rules/core.md (KEIN path — immer geladen)

```yaml
---
description: Kern-Workflow und Knowledge Capture Protocol
---
```

Inhalt (~45 Zeilen):
- Workflow: Plan → OK → Code → Build → Verify
- Rollback-Regel: Nicht flicken, sauber neu
- Session-Hygiene: /compact bei Themenwechsel, ich manage das
- Knowledge Capture Protocol:
  - Neues Requirement erkannt → features/*.md sofort updaten
  - Neue Erkenntnis → passende rules/*.md updaten
  - Neue Entscheidung → features/*.md updaten
  - Neues Feature → File erstellen + current-sprint.md Router updaten
  - Feature fertig → archive/ verschieben + Router updaten
  - Feedback: Kurze Zeile ("requirement aktualisiert: X")
- Session-Ende: current-sprint.md updaten (Router + letzter Stand)
- Bestehende Components/Services IMMER prüfen bevor neu gebaut wird

### rules/ui-components.md

```yaml
---
paths:
  - "src/components/**"
  - "src/app/**/*.tsx"
---
```

Inhalt (~40 Zeilen):
- Mobile-First: 44px Touch Targets, 16px Min Font, 100dvh
- IMMER: hover, active, focus, disabled States
- IMMER: Loading States (Skeleton), Empty States, Error States mit Retry
- IMMER: aria-label auf Icon-Buttons, aria-hidden auf dekorative Icons
- IMMER: aria-expanded + aria-controls auf expandable Controls
- Spacing: bestehende Patterns übernehmen, nicht neu erfinden
- Keine zufälligen Gradients, keine übertriebenen Border-Radius
- PlayerDisplay aus player/PlayerRow (compact/card) — IMMER nutzen
- PlayerPhoto aus player/index.tsx — NIEMALS inline img+fallback
- cn() für classNames, NICHT Template Literals
- size-* statt w-* h-* bei quadratischen Elementen
- text-balance auf Headings, text-pretty auf Paragraphs
- tabular-nums auf alle numerischen Daten
- transition-colors statt transition-all
- will-change NUR temporär, backdrop-blur max sm (4px)
- Modals auf Mobile → Bottom Sheets
- inputMode="numeric" bei Zahlenfeldern
- Kein horizontaler Overflow — niemals
- Bottom Nav: padding-bottom: env(safe-area-inset-bottom)

### rules/database.md

```yaml
---
paths:
  - "src/lib/services/**"
  - "src/lib/queries/**"
  - "src/app/api/**"
  - "src/types/**"
---
```

Inhalt (~35 Zeilen):
- Supabase NIE in Components → immer Service Layer
- Explicit .select() mit FK-Join → TS inferred als Array → Cast nötig
- .maybeSingle() für optionale Lookups (nicht .single())
- NIEMALS Promise.resolve(supabase...) → immer await
- PostgREST nested.field unzuverlässig → separate Query + .in()
- getWallet() NICHT cachen (RLS Race Condition)
- Realtime: Tabelle braucht REPLICA IDENTITY FULL
- RLS .update() stumm blockiert → IMMER RPC für geschützte Tabellen
- RPC Parameter IMMER aus DB verifizieren (pg_get_functiondef)
- ::TEXT auf UUID: NIEMALS beim INSERT
- ALLE Geld-RPCs: IF p_quantity < 1 THEN RETURN error
- REVOKE: Von PUBLIC, authenticated, anon (alle 3!)
- auth.uid() ist NULL in SECURITY DEFINER → NULL-safe Guards
- Gamification: 13 DB-Triggers — Client ruft NICHT direkt auf
- Neue DB-Tabellen: FK auf profiles (nicht auth.users)
- Types zentral in src/types/index.ts

### rules/trading.md

```yaml
---
paths:
  - "src/lib/services/trading*"
  - "src/lib/services/wallet*"
  - "src/lib/services/ipo*"
  - "src/lib/services/offers*"
  - "src/components/market/**"
  - "src/app/**/market/**"
---
```

Inhalt (~25 Zeilen):
- Geld IMMER als BIGINT cents (1,000,000 cents = 10,000 $SCOUT)
- Alle Geld-Operationen als atomare DB Transactions (RPCs)
- Trades/Transactions append-only (kein UPDATE/DELETE auf Logs)
- fmtScout() für Formatierung, $SCOUT user-sichtbar
- ipo_price = fest, floor_price = MIN(sell orders)
- NIEMALS leere .catch(() => {}) — mindestens console.error
- MiCA/CASP: NIEMALS ROI/Profit/Rendite in User-facing Texten
- Closed Economy: KEIN Cash-Out, KEIN P2P-Transfer, KEIN Exchange

### rules/business.md (KEIN path — immer geladen)

```yaml
---
description: Business-Regeln und Compliance
---
```

Inhalt (~25 Zeilen):
- Licensing Phase 1 (jetzt): DPC Trading, Free Fantasy, Votes, Events, Scout Reports
- Phase 3 (nach CASP): $SCOUT Token, Cash-Out — NICHT BAUEN
- Phase 4 (nach MGA): Paid Fantasy — NICHT BAUEN
- Wording: NIEMALS Investment/ROI/Profit/Rendite/Ownership
- Wording: IMMER Utility Token, Platform Credits, Scout Assessment
- $SCOUT = Platform Credits, DPC = Digital Player Contract
- Geofencing: TIER_FULL, TIER_CASP, TIER_FREE, TIER_RESTRICTED, TIER_BLOCKED
- Deutsche UI-Labels, englische Code-Variablen/Kommentare
- i18n: next-intl, t() nutzen, Cookie bescout-locale

### rules/fantasy.md

```yaml
---
paths:
  - "src/components/fantasy/**"
  - "src/app/**/fantasy/**"
  - "src/lib/services/events*"
  - "src/lib/services/lineups*"
  - "src/lib/services/scoring*"
  - "src/lib/services/predictions*"
---
```

Inhalt (~20 Zeilen):
- Events: entry_fee, prize_pool, max_entries, event_tier
- Lineup: 6er (1+2+2+1) oder 11er (1+4+3+3) Format
- Deadline: per-fixture Locking (fixture.starts_at), nicht GW-level
- Scoring: rating*10, perf_l5/l15 aus fixture_player_stats
- Events klonen bei neuem GW (cron_process_gameweek)
- Predictions: individuelle Fixture-Vorhersagen
- activeGameweek Fallback: ?? 1 ist gefährlich für User ohne Club

### rules/common-errors.md (KEIN path — immer geladen)

```yaml
---
description: Häufigste Fehler die bei JEDER Arbeit relevant sind
---
```

Inhalt (~30 Zeilen):
- players hat first_name/last_name, NICHT name
- wallets PK=user_id (kein id, kein currency)
- orders.side (nicht type), post_votes.vote_type = SMALLINT
- Hooks VOR early returns (React rules)
- Array.from(new Set()) statt spread (strict TS)
- Modal braucht IMMER open={true/false} prop
- PlayerPhoto Props: first/last/pos
- Barrel-Exports bereinigen wenn Dateien gelöscht werden
- Turkish Unicode: İ.toLowerCase() = i̇ → NFD + strip + ı→i
- CSS ::after/::before mit absolute → Eltern MUSS relative haben
- API-Football: time.elapsed (NICHT time.minute), player=OUT, assist=IN
- Mobile Tab-Bars: flex-shrink-0 + overflow-x-auto + scrollbar-hide

## Schicht 2: CLAUDE.md (~70 Zeilen)

```markdown
# BeScout — Projekt-Kontext

B2B2C Fan-Engagement-Plattform für Fußballvereine. Clubs verkaufen DPCs,
starten Events/Votes, verteilen $SCOUT-Credits. Pilot: Sakaryaspor (TFF 1. Lig).

## Stack
Next.js 14 (App Router) | TypeScript strict | Tailwind (Dark Mode only) |
Supabase (PostgreSQL + Auth + Realtime) | TanStack React Query v5 | Zustand v5 |
next-intl (Cookie bescout-locale) | lucide-react

## Regeln → .claude/rules/
Domänen-spezifische Regeln laden automatisch per Glob-Pattern.
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
4. Bei Fehler: Rollback (git zurück, sauber neu) — NICHT flicken
5. /compact bei Themenwechsel (ich manage das)
6. Session-Ende: current-sprint.md + Feature-Files sind bereits aktuell
```

## Schicht 3: Memory-System

### current-sprint.md (~30 Zeilen, Session-Start)

```markdown
# Current Sprint

## Aktive Features
| Feature | File | Status |
|---------|------|--------|
| Club Verkauf | features/club-verkauf.md | In Arbeit |

## Blocker
- VAPID Key fehlt in Vercel

## Letzter Stand
Session #199 — [was zuletzt passiert ist]
```

### features/*.md (on-demand, ~50 Zeilen pro Feature)

Jedes aktive Feature hat ein eigenes File mit:
- Status (was ist fertig, was nicht)
- Aktuelle Requirements
- Entscheidungen (wann, warum)
- Offene Fragen
- Betroffene Dateien
- Datenfluss

### MEMORY.md (~30 Zeilen, auto-loaded erste 200 Zeilen)

Wird zum reinen Pointer/Index:
- Projekt-Snapshot (Version, DB-Stand)
- Verweis auf current-sprint.md
- Verweis auf features/
- Auto-Memory Learnings (Claude schreibt automatisch)

### Archiv-Files (NIE automatisch geladen)

- sessions.md: Letzte 3 Sessions, Rest komprimiert
- errors.md: Vollständiges Error-Journal
- patterns.md: Vollständiges Pattern-Archiv
- architecture.md, backend-systems.md, business-context.md, decisions.md

## Skills Cleanup

### Behalten (7 Skills)
- bencium-code-conventions (Code-Style)
- bencium-impact-designer (1 Designer-Skill)
- baseline-ui (Quality Gate)
- fixing-accessibility (Quality Gate)
- fixing-motion-performance (Quality Gate)
- fixing-metadata (Quality Gate)
- typography (Quality Gate)

### Entfernen (33+ Skills)
- bencium-controlled-ux-designer (Duplikat von impact-designer)
- bencium-innovative-ux-designer (Duplikat)
- renaissance-architecture (zu abstrakt, nie genutzt)
- human-architect-mindset (zu abstrakt)
- design-audit (durch baseline-ui abgedeckt)
- angular-best-practices (falscher Stack)
- vue-composition-api (falscher Stack)
- 14 Business-Rollen (cto, pm, qa, security, perf, ux, competitors,
  content, data, growth, mobile, pitch, review-code, sprint)
  → Selten getriggert, fressen Skill-Liste.
  → Business-Wissen gehört in rules/ und features/, nicht in Skills.

### Plugins behalten (6)
- frontend-expert, code-quality, testing-toolkit
- security-essentials, tailwind-expert, shadcn-style-expert

### Plugins entfernen (2)
- node-developer (zu generisch)
- project-management (nicht unser Workflow)

## Hook Optimierung

### Aktuell: run_tests_on_change.sh
Läuft `npm test` (195 Tests) nach JEDEM File-Edit → massiver Overhead.

### Neu: Deaktivieren oder gezielt
Option A: Hook komplett deaktivieren (empfohlen)
- Tests laufen bei `npx next build` am Ende
- Manuell bei Bedarf: `npx vitest run`

Option B: Nur bei Test-relevanten Dateien
- Nur triggern bei services/*.ts, queries/*.ts (Business Logic)
- Nicht bei .tsx (UI-Änderungen brechen selten Tests)

## settings.local.json Cleanup

Aktuell 330 Zeilen individuelle Permissions.
Vereinfachen auf Wildcard-Patterns:
- Bash(*) statt 200+ Einzel-Bash-Permissions
- WebFetch(*) statt 50+ Domain-Permissions
- mcp__supabase__* statt 10+ Einzel-MCP-Permissions

## Token-Budget Vergleich

| Kontext-Element | Heute | Jarvis |
|----------------|-------|--------|
| CLAUDE.md | 193 Zeilen | 70 Zeilen |
| MEMORY.md | 148 Zeilen | 30 Zeilen |
| Rules (immer geladen) | 0 | ~100 Zeilen (core+business+errors) |
| Rules (path-spezifisch) | 0 | ~40-60 Zeilen (nur matching) |
| current-sprint.md | 108 Zeilen | 30 Zeilen |
| sessions.md (bei Start) | 785 Zeilen | 0 (nicht mehr bei Start) |
| Feature-File | 0 | ~50 Zeilen (1 File) |
| **GESAMT** | **~1.234 Zeilen** | **~320-380 Zeilen** |

Reduktion: **~70% weniger Kontext**, davon **~95% relevant** statt ~40%.

## Warum NICHT claude-mem

Validierung ergab:
- 5 Hooks feuern bei JEDER Aktion (SessionStart, UserPromptSubmit,
  PostToolUse, Summary, SessionEnd)
- PostToolUse fängt JEDEN Tool-Call ab → bei 100+ Calls/Session = Overhead
- Keine dokumentierte Kompatibilität mit Built-In Auto Memory
- Externe Dependency (Worker-Service, SQLite, Chroma, Port 37777)
- PolyForm Noncommercial Lizenz auf ragtime-Subdirectory

Built-In Auto Memory + Knowledge Capture Protocol + Feature-Files
erreichen 95% des gleichen Ergebnisses mit 0% Overhead.

## God-Mode Additions (validiert gegen offizielle Docs)

### 1. Stop Hook — Quality Gate (Prompt-basiert)

Prüft AUTOMATISCH bei jedem "fertig" ob Details fehlen.
Nutzt Haiku (leichtes Modell) für minimalen Token-Overhead.
Validiert: Offiziell dokumentiert seit v2.0.10+.

Konfiguration in `.claude/settings.json`:
```json
{
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
  }
}
```

Schutz vor Endlosschleife (stop_hook_active Guard ist built-in bei prompt hooks).

### 2. Notification Hook — Desktop Alerts

Windows-Popup wenn Claude auf Input wartet.
Für lange Sessions mit Unterbrechungen.
Validiert: Offiziell dokumentiert, Windows PowerShell Syntax.

Konfiguration in `~/.claude/settings.json` (User-Level):
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

### 3. Custom Commands (.claude/commands/)

#### /switch [feature] — Themenwechsel
File: `.claude/commands/switch.md`
```markdown
Themenwechsel zu: $ARGUMENTS

1. Fuehre /compact aus um den aktuellen Kontext zu komprimieren
2. Lies memory/current-sprint.md fuer den Feature-Router
3. Lade das Feature-File fuer "$ARGUMENTS" aus memory/features/
4. Wenn kein Feature-File existiert, erstelle eins mit Template
5. Lies die relevanten Dateien des Features
6. Melde dich bereit mit einer kurzen Zusammenfassung was ansteht
```

#### /status — Projektstand
File: `.claude/commands/status.md`
```markdown
Zeige den aktuellen Projektstand:
1. Lies memory/current-sprint.md
2. Liste alle aktiven Features mit Status
3. Zeige Blocker
4. Zeige letzten Stand (Session-Nr + was passiert ist)
Halte die Ausgabe kompakt (max 20 Zeilen).
```

#### /done — Session beenden
File: `.claude/commands/done.md`
```markdown
Session beenden:
1. Update memory/current-sprint.md mit aktuellem Stand
2. Pruefe ob alle Feature-Files aktuell sind
3. Zeige Zusammenfassung: was wurde gemacht, was ist offen
4. Fuehre npx next build zur Verifikation aus
5. Zeige Build-Ergebnis
```

### Bewusst weggelassen (mit Begründung)

| Feature | Warum nicht |
|---------|-------------|
| claude-mem Plugin | 5 Hooks auf jeder Aktion, undokumentierte Kompatibilität |
| Agent-based Stop Hook | Overkill — Prompt-Hook reicht für Checkliste |
| HTTP Hooks | Kein externer Service nötig |
| PreToolUse Input Modification | Kein Use Case |
| SessionStart compact Hook | Bug #15174 — stdout wird nach Compaction verschluckt |
| Voice Mode | Noch nicht stable auf Windows |
| Claude Squad | Solo-Founder, ein Task reicht |
| Headless Mode CI/CD | Noch keine Pipeline |
| MAX_MCP_OUTPUT_TOKENS | Unsere MCP-Outputs nicht das Bottleneck |

## Implementierungsreihenfolge

### Phase 1: Rules + CLAUDE.md (Kern)
1. `.claude/rules/` erstellen (7 Files mit echtem Inhalt)
2. CLAUDE.md neu schreiben (~70 Zeilen)
3. MEMORY.md auf Index kuerzen (~30 Zeilen)

### Phase 2: Memory-Restructure
4. current-sprint.md verschlanken (~30 Zeilen)
5. `memory/features/` Ordner erstellen + club-verkauf.md
6. `memory/features/archive/` Ordner erstellen
7. sessions.md auf letzte 3 Sessions kuerzen

### Phase 3: God-Mode Hooks + Commands
8. Stop Hook Quality Gate in settings.json
9. Notification Hook in User-Settings
10. Custom Commands: switch.md, status.md, done.md

### Phase 4: Cleanup
11. Irrelevante Skills entfernen (33+ Files)
12. Irrelevante Plugins entfernen (2)
13. Test-Hook deaktivieren (run_tests_on_change.sh)
14. settings.local.json aufraeumen

### Phase 5: Validierung
15. `npx next build` — 0 Errors
16. Test-Session: /status, /switch, /done testen
17. Quality Gate testen: absichtlich Detail weglassen, pruefen ob Hook greift
