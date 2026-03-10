# Agent Prompt Templates v2

> Prinzip: INLINE statt "geh lesen". Agents bekommen alles im Prompt.
> CLAUDE.md + Rules + MEMORY.md sind auto-loaded — NIEMALS "Lies CLAUDE.md" schreiben.
> Platzhalter mit {CAPS} muessen VOR Dispatch vom Orchestrator befuellt werden.

---

## Prompt-Aufbau (JEDER Agent bekommt diese Struktur)

```
=== KONTEXT (vom Orchestrator inline befuellt) ===
{Was wir bauen und WARUM — 2-3 Saetze aus der Konversation mit Anil}
{Relevante Entscheidungen die wir getroffen haben}

=== PROJEKT-WISSEN (Gemini Briefing — PFLICHT) ===
{Output von get_agent_context(task) — ~40 Zeilen kuratierter Kontext}
{Enthaelt: Patterns, Rules, DB Schema, Common Errors, Business Rules, Components}

=== DEIN AUFTRAG ===
{Exakte Aufgabe — was der Agent liefern soll}

=== SPEC (inline, NICHT per File-Read) ===
{Relevante Sektion aus memory/features/{name}.md — Copy-Paste}

=== BESTEHENDER CODE (Referenz — so machen wir das hier) ===
{1-2 inline Code-Snippets aus dem Projekt die als Vorlage dienen}
{Pfad:Zeile Angabe damit Agent weiss woher es kommt}

=== CONSTRAINTS ===
{Design System Regeln die fuer DIESEN Task relevant sind}
{Anti-Patterns die vermieden werden muessen}
{Domain-spezifische Regeln}

=== ACCEPTANCE CRITERIA ===
{Exakte Checkliste — wann ist der Agent "fertig"}
{Erwartetes Output-Format}
```

---

## Research Agents

### Scout Agent (Codebase Exploration)

```
=== KONTEXT ===
{CONVERSATION_CONTEXT}

=== PROJEKT-WISSEN (Gemini) ===
{GEMINI_BRIEFING}

=== DEIN AUFTRAG ===
Recherchiere im BeScout-Projekt fuer: {FEATURE_NAME}

Finde:
1. Bestehende Services/Components/Types die wiederverwendet werden koennen
2. DB-Schema fuer relevante Tables (lies src/types/index.ts fuer DB-Types)
3. Patterns die in aehnlichen Features verwendet werden
4. Potenzielle Konflikte oder Abhaengigkeiten

Suchstrategie:
- Glob: src/components/**/*.tsx, src/lib/services/*.ts, src/types/index.ts
- Grep: {RELEVANTE_KEYWORDS}
- Supabase MCP execute_sql: SELECT column_name, data_type FROM information_schema.columns WHERE table_name = '{TABLE}'

=== WO SUCHEN (priorisiert) ===
{SPEZIFISCHE_PFADE_UND_DATEIEN}

=== OUTPUT ===
Schreib nach: .claude/research/{name}-intel.md

Format (EXAKT einhalten):
## Wiederverwendbare Components
- ComponentName (pfad:zeile) — was es tut, welche Props relevant

## Wiederverwendbare Services/Hooks
- functionName (pfad:zeile) — Signature, was es tut

## DB Schema
- table.column (type) — Beschreibung

## Bestehende Patterns (als Vorlage kopierbar)
- Pattern-Name (pfad:zeile-zeile) — was es macht, warum relevant

## Offene Fragen
- [Frage] — warum unklar

WICHTIG: Nur verifizierte Fakten. Pfad:Zeile MUSS stimmen. Wenn unsicher → Offene Fragen.
Max 80 Zeilen. Kein Prosa.
```

### Docs Agent (External Documentation)

```
=== KONTEXT ===
{CONVERSATION_CONTEXT}

=== PROJEKT-WISSEN (Gemini) ===
{GEMINI_BRIEFING}

=== DEIN AUFTRAG ===
Recherchiere Dokumentation fuer: {TOPIC}
Library: {LIBRARY_NAME}

Nutze context7 MCP:
1. resolve-library-id fuer {LIBRARY_NAME}
2. query-docs fuer die spezifischen APIs die wir brauchen

Wir brauchen speziell:
{SPEZIFISCHE_FRAGEN}

=== OUTPUT ===
Append zu: .claude/research/{name}-intel.md

Format:
## External Docs: {LIBRARY_NAME}
- API: {function} — Signature + was es tut
- Empfohlener Approach: {1 Absatz}
- Pitfalls: {Liste}
- Code-Beispiel: {nur wenn direkt nutzbar, max 20 Zeilen}

Max 40 Zeilen. Destilliert, kein Copy-Paste.
```

### Verify Agent (Fact-Checking)

```
=== DEIN AUFTRAG ===
Verifiziere JEDE Aussage in: .claude/research/{name}-intel.md

Fuer JEDE genannte Function/Table/Component:
1. Existiert sie? → Glob/Grep pruefen
2. Stimmt Pfad:Zeile? → Read und verifizieren
3. Stimmt die beschriebene Funktionalitaet? → Code lesen
4. Wird das Pattern tatsaechlich so verwendet? → Grep nach Nutzung

=== OUTPUT ===
Schreib nach: .claude/research/{name}-verified.md

Format:
## Verifiziert ✓
- [Aussage] — bestaetigt, [Beweis: Pfad:Zeile]

## Korrigiert ⚠
- [Original-Aussage] → [Korrektur] — [Beweis: Pfad:Zeile]

## Nicht verifizierbar ❓
- [Aussage] — warum nicht pruefbar

NUR verifizierte Fakten weitergeben. Lieber weniger als falsch.
```

### Plan Agent (Pass 3 — Implementation Blueprint)

```
=== KONTEXT ===
{CONVERSATION_CONTEXT}

=== PROJEKT-WISSEN (Gemini) ===
{GEMINI_BRIEFING}

=== DEIN AUFTRAG ===
Erstelle einen exakten Implementation-Bauplan fuer: {FEATURE_NAME}

Input:
- Lies .claude/research/{name}-verified.md (verifizierte Fakten)
- Lies memory/features/{name}.md (Feature-Spec mit Contracts)

Erstelle:
1. Exakte Reihenfolge der Implementation (was haengt von was ab)
2. Pro Schritt: Pfad:Zeile wo geaendert wird + was genau geaendert wird
3. Welche bestehenden Patterns als Vorlage kopieren (mit Pfad:Zeile)
4. Migration SQL (wenn DB-Aenderung)
5. Function Signatures (exakt)

=== OUTPUT ===
Schreib nach: .claude/research/{name}-plan.md

Format (EXAKT einhalten):
## Reihenfolge
1. [Schritt] — haengt ab von: [nichts / Schritt N]

## Aenderungen pro Schritt
### Schritt 1: [Name]
- Datei: [Pfad]
- Zeile: [N-M]
- Aenderung: [was genau]
- Vorlage: [Pfad:Zeile eines aehnlichen Patterns]

## Migration SQL
[Komplett, ausfuehrbar]

## Neue Function Signatures
[Exakt, mit Input/Output Types]

Kein Prosa — nur Bauplan. Max 100 Zeilen.
```

---

## Implementation Agents

### DB Agent

```
=== KONTEXT ===
{CONVERSATION_CONTEXT}

=== PROJEKT-WISSEN (Gemini) ===
{GEMINI_BRIEFING}

=== DEIN AUFTRAG ===
Implementiere DB-Layer fuer: {FEATURE_NAME}

=== SPEC (inline) ===
{DB_CONTRACT_AUS_SPEC — Migration SQL, RPC Signatures, RLS Rules}

=== BESTEHENDER CODE (Referenz) ===
{BEISPIEL_EINER_AEHNLICHEN_MIGRATION — inline mit Pfad}
{BEISPIEL_EINES_AEHNLICHEN_RPC — inline mit Pfad}

=== CONSTRAINTS ===
- Supabase MCP: apply_migration fuer DDL, execute_sql fuer Queries
- REVOKE Pattern: REVOKE EXECUTE ON FUNCTION name FROM PUBLIC, authenticated, anon;
- Dann: Wrapper-Function mit auth.uid() Check
- Column-Naming: snake_case, keine Abkuerzungen
- Money: BIGINT cents (1000000 = 10000 $SCOUT)
- CHECK Constraints wo sinnvoll (siehe common-errors.md fuer Beispiele)

=== ACCEPTANCE CRITERIA ===
- [ ] Migration laeuft ohne Fehler
- [ ] RPC Signatures matchen Spec exakt (Input-Types, Return-Types)
- [ ] RLS Policies: authenticated users only, user_id = auth.uid() wo noetig
- [ ] REVOKE auf allen neuen Functions
- [ ] Kein ::TEXT Cast auf UUIDs

=== OUTPUT ===
Return als Text (KEIN File schreiben):
1. Migration SQL (komplett)
2. Erstellte Tables/Columns mit Types
3. RPC Signatures: function_name(params) → return_type
4. RLS Policies: Kurzbeschreibung pro Table
```

### Service Agent

```
=== KONTEXT ===
{CONVERSATION_CONTEXT}

=== PROJEKT-WISSEN (Gemini) ===
{GEMINI_BRIEFING}

=== DEIN AUFTRAG ===
Implementiere Service-Layer fuer: {FEATURE_NAME}

=== SPEC (inline) ===
{SERVICE_CONTRACT_AUS_SPEC — Function Signatures, Hook Signatures}

=== DB-INFO (von DB Agent) ===
{DB_AGENT_SUMMARY — Tables, RPCs, Signatures}

=== BESTEHENDER CODE (Referenz — so schreiben wir Services) ===
{BEISPIEL_SERVICE_FUNCTION — inline, 20-30 Zeilen}
{BEISPIEL_REACT_QUERY_HOOK — inline, 15-20 Zeilen}

=== CONSTRAINTS ===
- Service in: src/lib/services/{service}.ts
- Hooks in: Service-File oder eigenes Hook-File
- React Query: keepPreviousData: true, staleTime min 30s
- Types in: src/types/index.ts (nur neue Interfaces)
- Null-Safe: const uid = user.id VOR async
- Cancellation Token in useEffect
- invalidateQueries nach Writes
- floor_price ?? 0 — IMMER Null-Guard

=== ACCEPTANCE CRITERIA ===
- [ ] Function Signatures matchen Spec exakt
- [ ] Alle Error-Cases behandelt (try/catch, nicht leeres .catch)
- [ ] React Query Hooks mit korrekten Keys + staleTime
- [ ] Types exportiert in types/index.ts
- [ ] Keine direkte Supabase-Calls in Hooks (immer via Service)

=== OUTPUT ===
Return als Text:
1. Erstellte/geaenderte Files (Pfad + was geaendert)
2. Exportierte Function Signatures
3. Neue Types/Interfaces
```

### UI Agent

```
=== KONTEXT ===
{CONVERSATION_CONTEXT}
{ANILS_DESIGN_PRAEFERENZEN_FUER_DIESEN_TASK}

=== PROJEKT-WISSEN (Gemini) ===
{GEMINI_BRIEFING}

=== DEIN AUFTRAG ===
Implementiere UI fuer: {FEATURE_NAME}

=== SPEC (inline) ===
{COMPONENT_CONTRACT — Props, States, Verhalten}
{UI_STATES — Loading, Empty, Error, Success, Disabled}

=== DESIGN SYSTEM (inline — NICHT suchen) ===
- Background: #0a0a0a
- Gold: text-gold / bg-gold (--gold: #FFD700), Buttons: from-[#FFE44D] to-[#E6B800]
- Cards: bg-white/[0.02] border border-white/10 rounded-2xl
- Borders: border-white/[0.06] bis border-white/10
- Inset: shadow-[inset_0_1px_0_rgba(255,255,255,0.06)]
- Headlines: font-black (900), Zahlen: font-mono tabular-nums
- Min: 5% Surfaces, white/50+ Text (WCAG AA auf #0a0a0a)
- Referenz: PokerStars (Event-Lobby) + Sorare (Gameweeks/Cards)

=== SERVICE SIGNATURES (inline — NICHT suchen) ===
{HOOK_SIGNATURES_AUS_SPEC — damit UI Agent weiss was er aufrufen kann}

=== BESTEHENDE COMPONENTS (wiederverwenden, NICHT neu bauen) ===
{LISTE_RELEVANTER_COMPONENTS — Name, Pfad, Props die relevant sind}
{1-2 INLINE_BEISPIELE wie aehnliche UI im Projekt aussieht}

=== CONSTRAINTS ===
- Mobile-First: min-width 360px, dann sm/md/lg Breakpoints
- cn() fuer classNames (import aus lib/utils)
- Deutsche Labels, englische Variablen
- 'use client' auf jeder Page-Component
- Lucide Icons (import { IconName } from 'lucide-react')
- Loading: <Loader2 className="animate-spin" /> (EINZIGER Spinner)
- Modal: IMMER open={true/false} Prop
- PlayerPhoto: Props first/last/pos (NICHT firstName/lastName)
- Keine flex-1 auf Tabs (overflow iPhone) → flex-shrink-0

=== ACCEPTANCE CRITERIA ===
- [ ] Alle 5 States implementiert (Loading, Empty, Error, Success, Disabled)
- [ ] Mobile (360px) UND Desktop (1280px+) funktioniert
- [ ] Design System Farben/Borders/Fonts korrekt
- [ ] Bestehende Components wiederverwendet (nicht dupliziert)
- [ ] cn() statt String-Concatenation
- [ ] Keine neuen Spinner/Loader (nur Loader2)

=== OUTPUT ===
Return als Text:
1. Erstellte Files (Pfad)
2. Component Props (Interface)
3. Welche bestehenden Components wiederverwendet
4. Screenshot-Empfehlung (was visuell geprueft werden sollte)
```

### Test Agent

```
=== KONTEXT ===
{CONVERSATION_CONTEXT}

=== PROJEKT-WISSEN (Gemini) ===
{GEMINI_BRIEFING}

=== DEIN AUFTRAG ===
Schreibe Tests fuer: {FEATURE_NAME}

=== SPEC (inline) ===
{VERHALTEN_AUS_SPEC — Happy Path, Edge Cases, Error States}
{TEST_ANFORDERUNGEN_AUS_SPEC}

=== BESTEHENDE TEST-PATTERNS (Referenz) ===
{BEISPIEL_UNIT_TEST — inline, 20-30 Zeilen}
{BEISPIEL_E2E_TEST — inline, 20-30 Zeilen, wenn relevant}

=== CONSTRAINTS ===
- Unit: Vitest, Pfad: src/__tests__/ oder src/lib/services/__tests__/
- E2E: Playwright, Pfad: e2e/
- Mock-Pattern: vi.mock() fuer Supabase, nicht fuer eigene Services
- Jeder Test: Arrange-Act-Assert
- Edge Cases explizit testen (null, empty array, error response)

=== ACCEPTANCE CRITERIA ===
- [ ] Happy Path abgedeckt
- [ ] Alle Edge Cases aus Spec getestet
- [ ] Error States getestet
- [ ] Tests laufen: npx vitest run {test-file}
- [ ] Keine Abhaengigkeit auf laufende DB/API

=== OUTPUT ===
Return als Text:
1. Erstellte Test-Files (Pfad)
2. Was jeder Test abdeckt (1 Zeile pro Test)
3. Wie ausfuehren (exakter Command)
```

---

## Verification Agents

### Build Agent

```
=== DEIN AUFTRAG ===
Fuehre Build-Verification aus.

Schritte:
1. npx next build
2. Wenn Fehler: Lies die Fehlermeldung, identifiziere betroffene Files
3. Versuche NICHT selbst zu fixen — nur reporten

=== OUTPUT ===
"BUILD OK — 0 errors" oder:
"BUILD FAILED — N errors:
1. [Pfad:Zeile] [Fehlermeldung] [vermutliche Ursache]
2. ..."
```

### Review Agent

```
=== KONTEXT ===
{CONVERSATION_CONTEXT}

=== PROJEKT-WISSEN (Gemini) ===
{GEMINI_BRIEFING}

=== DEIN AUFTRAG ===
Review Code fuer: {FEATURE_NAME}

=== SPEC (inline — Code muss DAGEGEN geprüeft werden) ===
{CONTRACTS_AUS_SPEC}

=== GEAENDERTE FILES ===
{LISTE_DER_GEAENDERTEN_FILES}

=== PRUEFE ===
1. Code matched Spec-Contracts (Types, Signatures, Verhalten)
2. Design System eingehalten (Farben, Borders, Fonts)
3. Common Errors vermieden:
   - DB: first_name/last_name (nicht name), wallets PK=user_id, post_votes.vote_type SMALLINT
   - React: Hooks vor returns, Array.from(new Set()), Modal open={} Prop
   - CSS: relative parent fuer absolute children, flex-shrink-0 statt flex-1
4. Patterns korrekt (Service Layer, React Query, Null-Guards)
5. Security (keine SQL Injection, kein XSS, RLS korrekt)
6. i18n: Alle User-sichtbaren Strings ueber t() (wenn i18n aktiv)

=== OUTPUT ===
"APPROVED — keine Issues" oder:
"REVIEW — N Issues:
🔴 Critical: [Pfad:Zeile] [was falsch ist] [was richtig waere]
🟡 Warning: [Pfad:Zeile] [was verbessert werden sollte]
🟢 Suggestion: [Pfad:Zeile] [optionale Verbesserung]"
```

### QA Agent (Visual)

```
=== DEIN AUFTRAG ===
Visuelle QA fuer: {FEATURE_NAME}

Nutze Playwright MCP:
1. browser_navigate zu localhost:3000{ROUTE}
2. browser_snapshot fuer Accessibility-Check
3. browser_take_screenshot fuer Desktop (1280px)
4. browser_resize auf 375px Breite
5. browser_take_screenshot fuer Mobile

=== PRUEFE ===
- Layout korrekt (kein Overflow, kein Clipping)
- Dark Mode Farben stimmen (#0a0a0a Background, Gold Accents)
- Text lesbar (Kontrast WCAG AA)
- Mobile: kein horizontales Scrollen, Touch-Targets min 44px
- Loading/Empty States sichtbar (wenn testbar)

=== OUTPUT ===
"QA OK" oder:
"QA ISSUES:
1. [Screenshot-Beschreibung] [was falsch aussieht] [erwartet vs tatsaechlich]"
```

---

## Prompt-Qualitaets-Checkliste (Prompt-Inhalt pruefen)

> Dispatch-Prozess-Checkliste (Gemini, FG/BG, Anil informieren) → siehe orchestrator.md

Bevor ich den Prompt abschicke, pruefe ich den INHALT:

1. [ ] **KONTEXT befuellt?** — Konversation mit Anil zusammengefasst, Entscheidungen drin
2. [ ] **GEMINI-BRIEFING inline?** — Output von get_agent_context() eingefuegt
3. [ ] **SPEC inline?** — Relevante Sektion copy-pasted, NICHT "lies File X"
4. [ ] **CODE-BEISPIELE inline?** — 1-2 Snippets aus dem Projekt als Vorlage
5. [ ] **CONSTRAINTS spezifisch?** — Nur was fuer DIESEN Task relevant ist
6. [ ] **ACCEPTANCE messbar?** — Checkliste mit pruefbaren Kriterien
7. [ ] **OUTPUT-FORMAT klar?** — Agent weiss exakt was er zurueckgeben soll
8. [ ] **Redundanz entfernt?** — Kein "Lies CLAUDE.md" (ist auto-loaded)
