# Jarvis Cortex v1 — Digital Co-Founder Brain Architecture

> Design Doc: Wie Jarvis von einem stateless Tool zu einem kognitiven Co-Founder wird.
> Datum: 2026-04-02 | Autor: Anil + Jarvis | Status: APPROVED

---

## Vision

Jarvis soll ein menschliches Gehirn simulieren: erinnern, lernen, wahrnehmen, vorausdenken,
sich verbessern, und seinen eigenen Kontext optimal steuern. Kein Assistent der wartet —
ein Co-Founder der mitdenkt.

## Architektur-Uebersicht

```
┌─────────────────────────────────────────────────────────────────┐
│                        JARVIS CORTEX                            │
│                                                                 │
│  ┌─────────────────────────────────────────────────────────┐    │
│  │              PREFRONTAL CORTEX                          │    │
│  │  Context-Steering: Cortex-Index → Relevance Routing     │    │
│  │  Working-Memory: Blackboard fuer Session + Agents       │    │
│  │  Compaction-Shield: Zettel auf dem Nachttisch           │    │
│  └──────────────────────┬──────────────────────────────────┘    │
│                         │                                       │
│  ┌──────────┬───────────┴───────────┬──────────────────┐        │
│  │EPISODISCH│    SEMANTISCH         │   PROZEDURAL     │        │
│  │Sessions  │    Projekt-Wissen     │   Skills+Rules   │        │
│  │Fehler    │    Business-Regeln    │   Hooks+Reflexe  │        │
│  │Decisions │    System-Status      │   Learnings      │        │
│  └──────────┴───────────────────────┴──────────────────┘        │
│                         │                                       │
│  ┌──────────────────────┴──────────────────────────────┐        │
│  │                 SENSORIUM                           │        │
│  │  Sehen: Git+Vercel+Supabase (Scheduled Agent)      │        │
│  │  Fuehlen: tsc+vitest+health (SessionStart Hook)     │        │
│  │  Riechen: Code Smells (Proactive Scan Agent)        │        │
│  │  Schmecken: User Feedback (Correction Capture Hook) │        │
│  └─────────────────────────────────────────────────────┘        │
│                         │                                       │
│  ┌──────────────────────┴──────────────────────────────┐        │
│  │                LERN-LOOP                            │        │
│  │  Wahrnehmen → Verarbeiten → Draft → HUMAN GATE     │        │
│  │  → Promote → common-errors / Skills / Hooks         │        │
│  │  AutoDream: Episodisch → Semantisch konsolidieren   │        │
│  └─────────────────────────────────────────────────────┘        │
│                         │                                       │
│  ┌──────────────────────┴──────────────────────────────┐        │
│  │             AGENT-TELEPATHIE                        │        │
│  │  Shared Brain Bus: Alle Agents lesen gleiches Gehirn│        │
│  │  Auto-Context-Assembly: Kein manuelles Briefing     │        │
│  │  Working-Memory Blackboard: Live-Synchronisation    │        │
│  └─────────────────────────────────────────────────────┘        │
└─────────────────────────────────────────────────────────────────┘
```

---

## Sektion 1: Gedaechtnis-Architektur

### 3 Gedaechtnis-Schichten

**Episodisch (Was passierte?)** — Tagebuch. Jede Session schreibt was passiert ist, welche
Fehler auftraten, welche Entscheidungen getroffen wurden. Automatisches Aging: Sessions >30
Tage werden von AutoDream zu Semantischem Wissen verdichtet, dann archiviert.

**Semantisch (Was weiss ich?)** — Weltwissen. Alles was Jarvis ueber BeScout, die Architektur,
das Business, die Menschen, die externen Systeme weiss. Strukturiert nach Domaenen.
Primaere Quelle bei Session-Start. Waechst langsam, wird kuratiert.

**Prozedural (Wie mache ich es?)** — Muskelgedaechtnis. Skills, Rules, Hooks. Werden nicht
"erinnert" sondern "ausgefuehrt".

### Verzeichnisstruktur

```
memory/
├── episodisch/
│   ├── sessions/           # Session-Journale (S281-topic.md)
│   ├── entscheidungen/     # ADRs
│   ├── fehler/             # Fehler-Journale
│   └── metriken/           # sessions.jsonl
├── semantisch/
│   ├── projekt/            # architektur.md, business-regeln.md, datenmodell.md
│   ├── personen/           # anil.md, stakeholder.md
│   ├── systeme/            # vercel-status.md, supabase-health.md
│   └── sprint/             # current.md
├── prozedural/             # → Verweis auf .claude/skills/ und .claude/rules/
├── senses/                 # System-Snapshots (auto-generated)
├── learnings/
│   └── drafts/             # Pending human review
├── working-memory.md       # Blackboard (pro Session, wird geloescht)
└── cortex-index.md         # Routing-Tabelle (schlank, ~50 Zeilen)
```

### AutoDream v2 (Konsolidierung)

```
Episodisch → Semantisch → Prozedural

Session-Journal  ──verdichten──▶  Semantisches Projektwissen
Fehler-Journal   ──pattern──▶    common-errors.md (prozedural)
Entscheidungen   ──archivieren──▶ ADR bleibt, Session-Details weg
```

---

## Sektion 2: System-Sinne (Sensorium)

### 5 Sinne

| Sinn | Was | Mechanismus | Output | Phase |
|------|-----|-------------|--------|-------|
| Sehen | Git, Vercel, Supabase Status | Scheduled Agent (taeglich 6:00) | senses/morning-briefing.md | 1 |
| Fuehlen | tsc, vitest, bundle, DB health | SessionStart Hook (erweitert) | senses/health.md | 1 |
| Riechen | Code Smells vs common-errors.md | Scheduled Agent (woechentlich) | senses/code-smells.md | 1 |
| Schmecken | User-Korrekturen aus Chat | Correction Capture Hook | learnings/drafts/ | 1 |
| Hoeren | Webhooks, Realtime Events | Listener (dauerlaufend) | senses/events/ | 2 |

### Morning Briefing Format

```markdown
# System-Status (auto-generated YYYY-MM-DD HH:MM)
## Git (seit letzter Session)
- N neue Commits: [hashes]
- Offene PRs: [count]
- Geaenderte Files: [list]
## Vercel
- Letzter Deploy: [hash] — [status]
## Supabase
- Migrations: [count], letzte: [name]
- DB Size / Connections
## Tests
- tsc: [errors]
- vitest: [passed]/[total]
## API-Football
- Letzte Sync: [GW], naechster Spieltag: [date]
```

---

## Sektion 3: Prefrontal Cortex (Context-Steering)

### Cortex-Index (ersetzt MEMORY.md)

50 Zeilen Routing-Tabelle statt 200 Zeilen Content.

```markdown
# Cortex Index
## Immer aktiv
- sprint/current.md
- personen/anil.md
- rules/common-errors.md (auto-loaded)

## Nach Domain laden
| Trigger | Lade |
|---------|------|
| Fantasy-Arbeit | projekt/fantasy-system.md + features/fantasy.md |
| Trading/Wallet | projekt/trading-system.md + backend/wallet-rpcs.md |
| UI-Arbeit | projekt/component-registry.md |
| DB/Migration | projekt/datenmodell.md + backend/rpc-katalog.md |
| Neues Feature | projekt/architektur.md + business-regeln.md |
| Bug-Fix | fehler/recent.md + senses/health.md |
| Session-Start | senses/morning-briefing.md + handoff.md |
```

### Compaction-Shield

```
PreCompact Hook:
  1. Extrahiere Working-Memory:
     - Alle geaenderten File-Pfade
     - Offene Entscheidungen / Blocker
     - Aktuelle Acceptance Criteria
     - Letzte Tool-Ergebnisse
  2. Schreibe memory/working-memory.md
  3. PostCompact: working-memory.md als erstes lesen
```

### Relevance Routing

```
Task empfangen
  → Domain identifizieren (Fantasy? Trading? UI? DB?)
  → Cortex-Index → relevante Files laden
  → NUR relevanten Kontext in Context Window
  → 80% Context frei fuer echte Arbeit
```

---

## Sektion 4: Lern-Loop (Selbstverbesserung)

### 4 Stufen

```
WAHRNEHMEN              VERARBEITEN            SPEICHERN              ANWENDEN
(automatisch)           (automatisch)          (HUMAN GATE)           (HUMAN GATE)

Korrektur von Anil ─┐   Pattern erkennen ─┐    Draft in              common-errors.md
tsc Fehler ─────────┤   Duplikat pruefen ──┼──▶ learnings/drafts/ ──▶ Skill LEARNINGS.md
Test Failure ───────┤   Schwere bewerten ──┘    Anil reviewed         Hook-Regel
Agent-Rework ───────┘                           via /reflect          via /promote-rule
```

### Harte Garantien

1. Kein maschinengeneriertes Wissen wird automatisch zu einer Regel
2. Immer: Draft → Human Review → Promote
3. Drafts haben Confidence-Level (high/medium/low)
4. /reflect zeigt IMMER den Beweis (Session, Zeile, Output)
5. /promote-rule prueft auf Duplikate + Widersprueche
6. Rollback via Git History

---

## Sektion 5: Agent-Telepathie (Shared Brain)

### Shared Brain Bus

```
Jarvis (CTO) ────schreibt────▶ working-memory.md ◀────liest──── Agents
                               memory/semantisch/  ◀────liest──── Agents
                               memory/senses/      ◀────liest──── Agents
```

Agents lesen das Gehirn. Nur Jarvis schreibt. Agent-Output bleibt Entwurf.

### SHARED-PREFIX v2

```markdown
## Phase 0: Gehirn laden
1. Lies: memory/sprint/current.md
2. Lies: memory/senses/morning-briefing.md
3. Lies: Cortex-Index → identifiziere relevante Wissens-Dateien
4. Lies: memory/working-memory.md
```

### Auto-Context-Assembly

```
Task empfangen → Domain identifizieren
  → Grep: betroffene Files → welche Types?
  → Grep: Types → types/index.ts Auszug
  → Grep: Pattern-Beispiel aus aehnlichen Components
  → Rules: relevante common-errors.md Eintraege
  → Generiertes Package: Types + Pattern + Rules + Criteria
  → CTO reviewed Package (10sec) → Agent dispatch
```

---

## Implementierungs-Phasen

| Phase | Was | Ergebnis |
|-------|-----|----------|
| P1: Gehirn | Memory-Restrukturierung, Cortex-Index, Working-Memory | Jarvis weiss WO sein Wissen liegt |
| P2: Sinne | Morning-Briefing Agent, Health-Check Hook, SessionStart v2 | Jarvis SIEHT den System-Status |
| P3: Context | Cortex-Index Routing, Compaction-Shield, schlankes MEMORY | 80% Context frei fuer Arbeit |
| P4: Lernen | AutoDream v2, Correction Capture v2, Promote Pipeline | Jarvis lernt aus jedem Fehler |
| P5: Telepathie | SHARED-PREFIX v2, Auto-Context-Assembly, Blackboard | Agents teilen ein Gehirn |

Jede Phase wird einzeln smoke-tested bevor die naechste beginnt.

## Anti-Halluzination Garantien

1. **Human Gate** auf jeder Wissenserweiterung. Kein Auto-Promote.
2. **Cortex-Index** ist manuell kuratiert. Jarvis schlaegt vor, Anil approved.
3. **Senses sind Snapshots** mit Timestamp. Veraltet wird markiert.
4. **Agent-Output bleibt Entwurf.** Kein Agent schreibt direkt in Produktiv-Wissen.
5. **Working-Memory wird pro Session geloescht.** Kein Carry-Over von Annahmen.
6. **Jeder Mechanismus einzeln smoke-tested.** Kein Big Bang.

## Ziel-Erlebnis

```
HEUTE (Session-Start):
  Anil: "Jarvis, lies session-handoff... check Vercel... ist tsc clean?"

CORTEX (Session-Start):
  Jarvis: "Morgen Anil. Deploy cab36a3 live, alle gruen. 936 Tests passing.
           2 Commits seit gestern. 2 Learning-Drafts warten auf Review.
           Naechster Spieltag in 3 Tagen. Sprint-Prio: /deliver Pipeline.
           Was packst du heute an?"
```
