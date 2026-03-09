# Agent Prompt Templates

> Standardisierte Prompts fuer den Orchestrator. Als Vorlage fuer Agent-Tool prompt.

## Research Agents

### Scout Agent (Codebase Exploration)

Recherchiere im BeScout-Projekt fuer Feature: {FEATURE_NAME}

Aufgabe:
1. Lies CLAUDE.md und relevante .claude/rules/ Files fuer Projekt-Kontext
2. Finde bestehende Services/Components/Types die wiederverwendet werden koennen
3. Pruefe DB-Schema (via Supabase MCP oder types/index.ts) fuer relevante Tables
4. Identifiziere Patterns die in aehnlichen Features verwendet werden

Schreib Findings nach: .claude/research/{name}-intel.md
Format:
- Bestehende Code-Stellen: Pfad:Zeile + was sie tun
- Wiederverwendbare Components/Services
- Relevante DB Tables + Columns
- Empfohlene Patterns (mit Verweis auf bestehende Nutzung)
- Offene Fragen / Unklarheiten

WICHTIG: Nur Fakten, kein Raten. Wenn unsicher → als Frage markieren.

### Docs Agent (External Documentation)

Recherchiere externe Dokumentation fuer: {TOPIC}

Aufgabe:
1. Nutze Context7 MCP fuer Library-Docs ({LIBRARY_NAME})
2. Finde: API-Referenz, Best Practices, bekannte Limitationen
3. Destilliere auf das was fuer BeScout relevant ist

Schreib Ergebnisse in: .claude/research/{name}-intel.md (append zu Scout-Findings)
Format:
- Relevante API: Function Signatures + Beschreibung
- Empfohlener Approach fuer unseren Use Case
- Bekannte Pitfalls / Limitationen
- Code-Beispiele (nur wenn direkt nutzbar)

Max 50 Zeilen. Kein Copy-Paste aus Docs — nur destilliertes Wissen.

### Verify Agent (Fact-Checking)

Verifiziere Research-Findings fuer: {FEATURE_NAME}

Input: Lies .claude/research/{name}-intel.md

Aufgabe:
1. Pruefe JEDE genannte Function/Table/Component: existiert sie wirklich?
2. Pruefe Pfad:Zeile Angaben — stimmen sie?
3. Pruefe empfohlene Patterns — werden sie tatsaechlich so verwendet?
4. Korrigiere Fehler, markiere Unverifizierbares

Schreib nach: .claude/research/{name}-verified.md
Format:
- Verifiziert: [was stimmt]
- Korrigiert: [was falsch war → was richtig ist]
- Nicht verifizierbar: [was geprueft werden muss]

NUR verifizierte Fakten weitergeben. Lieber weniger als falsch.

### Plan Agent (Implementation Blueprint)

Erstelle Implementation-Bauplan fuer: {FEATURE_NAME}

Input: Lies .claude/research/{name}-verified.md + Feature-Spec in memory/features/{name}.md

Aufgabe:
1. Exakte Migration SQL (wenn DB-Aenderung)
2. Exakte Function Signatures fuer Services
3. Exakte File-Pfade + Zeilennummern wo Aenderungen noetig
4. Welche bestehenden Patterns als Vorlage kopieren (mit Pfad:Zeile)
5. Reihenfolge der Implementation (was haengt von was ab)

Schreib nach: .claude/research/{name}-plan.md
Format: Nummerierte Schritte, jeder Schritt mit exaktem File-Pfad, exakter Aenderung.
Kein Prosa — nur Bauplan.

## Implementation Agents

### DB Agent

Implementiere DB-Layer fuer Feature: {FEATURE_NAME}

Spec: Lies memory/features/{name}.md — Sektion "Contracts" ist dein Interface.
Context: Lies CLAUDE.md fuer Projekt-Konventionen.
Plan: Lies .claude/research/{name}-plan.md fuer Implementation-Details.

Aufgabe:
1. Erstelle Supabase Migration (via Supabase MCP apply_migration)
2. Erstelle RPC Functions (SQL)
3. Erstelle RLS Policies
4. REVOKE Pattern beachten: FROM PUBLIC, authenticated, anon

Return: Liste der erstellten Migrations/RPCs + exakte Signaturen.

### Service Agent

Implementiere Service-Layer fuer Feature: {FEATURE_NAME}

Spec: Lies memory/features/{name}.md — Sektion "Contracts".
DB-Info: {DB_AGENT_SUMMARY}
Context: Lies CLAUDE.md + .claude/rules/core.md fuer Konventionen.

Aufgabe:
1. Service-Funktionen in lib/services/{service}.ts
2. React Query Hooks (keepPreviousData, staleTime min 30s)
3. Types in types/index.ts (wenn neue Interfaces noetig)
4. Bestehende Patterns folgen (Service Layer Pattern, Null-Safe Closures)

Return: Erstellte/geaenderte Files + exportierte Function Signatures.

### UI Agent

Implementiere UI-Components fuer Feature: {FEATURE_NAME}

Spec: Lies memory/features/{name}.md — Sektion "Contracts" + "UI States".
Design System: Lies CLAUDE.md Sektion "Design System".
Components: Lies .claude/rules/ui-components.md.
Service Signatures: {SERVICE_SIGNATURES_FROM_SPEC}

Aufgabe:
1. Components erstellen (Mobile-First, 360px min)
2. ALLE States: Loading, Empty, Error, Success, Disabled
3. Bestehende UI wiederverwenden: Card, Button, Modal, TabBar, PlayerDisplay
4. cn() fuer classNames, Design System Farben/Borders/Fonts
5. Deutsche Labels, englische Variablen

Return: Erstellte Files + Component-Props + Screenshot-Beschreibung.

### Test Agent

Schreibe Tests fuer Feature: {FEATURE_NAME}

Spec: Lies memory/features/{name}.md — Sektion "Tests" + "Verhalten".

Aufgabe:
1. Unit Tests (Vitest): Service-Funktionen, Edge Cases, Error States
2. E2E Tests (Playwright): Happy Path User-Flows
3. Test-Patterns aus bestehenden Tests uebernehmen

Pfade: __tests__/ fuer Unit, e2e/ fuer E2E.
Return: Erstellte Test-Files + was jeder Test abdeckt.

## Verification Agents

### Build Agent

Fuehre Build-Verification aus.
Run: npx next build
Return: "0 errors" oder "N errors" mit exakten Fehlermeldungen.

### Review Agent

Review den Code fuer Feature: {FEATURE_NAME}

Spec: Lies memory/features/{name}.md
Rules: Lies .claude/rules/core.md + .claude/rules/common-errors.md + {DOMAIN_RULES}

Pruefe:
1. Code matched Spec-Contracts (Types, Signatures, Verhalten)
2. Design System eingehalten (CLAUDE.md)
3. Common Errors vermieden (common-errors.md)
4. Patterns korrekt angewendet
5. Keine Security-Issues (OWASP Top 10)

Return: "Approved" oder Liste von Issues mit Pfad:Zeile + was falsch ist.
