# Decisions Log

**Zweck:** Strategic + Architectural + Process-Entscheidungen, die länger als ein Slice wirken. Versioniert in git, automatisch in Claude's Context via `MEMORY.md`-Index, in Obsidian als Graph-Node, optional in Notion gespiegelt.

**Wann Entry anlegen:**
- Anil sagt „ist nicht mehr...", „neu...", „Scope-Change...", „ab jetzt..."
- Architektur-Entscheidung mit Alternativen-Abwägung (z.B. Tech-Stack, System-Design)
- Process-Regel die für künftige Sessions gilt (z.B. „Rollback-Drill Pflicht")

**Was NICHT hier rein:**
- Code-Patterns → `.claude/rules/common-errors.md`
- Business-Compliance-Regeln → `.claude/rules/business.md`
- Slice-Historie → `worklog/log.md`
- Ad-hoc Bug-Fixes → Commit-Message + log.md

**ID-Schema:** `D<n>` — einmal vergeben, nie wiederverwendet. Superseded-Entries bleiben als Historie, neue Entscheidung bekommt neue ID mit `Supersedes: D<old>`.

**Kategorien:**
- **PRODUCT** — Scope, Markt, Zielgruppe, Roadmap-Phasen
- **ARCHITECTURE** — Tech-Stack, System-Design, Bibliotheks-Wahl
- **PROCESS** — Workflow, Memory-System, Release-Prozess, Governance

---

## D1 — PRODUCT: 7 Ligen launch-ready (nicht mehr Sakaryaspor-Pilot-exklusiv)

**Datum:** 2026-04-21
**Status:** ✅ Aktiv
**Supersedes:** Historische Pilot-Strategie „Sakaryaspor (TFF 1. Lig) only" aus pre-2026-04 (siehe `docs/VISION.md` historisch, jetzt geupdated)

### Entscheidung

Alle 7 Ligen sind launch-ready: Süper Lig, TFF 1. Lig, Bundesliga, 2. Bundesliga, Premier League, La Liga, Serie A. Sakaryaspor war initialer Hook, aber Produktstand reicht jetzt für größere Clubs (Bundesliga, Süper Lig, EU-Top-5).

### Begründung (Anil-Direktive)

- Produktstand nach Multi-Liga-Expansion (Slice-Serie 2026-03/04) deutlich breiter als Pilot-Scope
- DE+TR-Prio bleibt (persönliche Nähe des Gründers), aber qualitativ gleicher Standard für alle Ligen
- B2B-Vertrieb soll größere Clubs targeten — kein Pilot-Lock-in nötig

### Auswirkungen

- **Code:** CLAUDE.md + SHARED-PREFIX + beScout-business LEARNINGS + VISION.md geupdated (Slice 131)
- **Content:** Bot-Handles + Seed-Daten mit Sakaryaspor-Fokus bleiben als Test-Content (post-Beta neu seeden)
- **Vertrieb:** Post-Beta Club-Deal-Entscheidung offen (Anil — realer Club-Partner vor Public-Launch?)
- **Data-Quality:** Gold-Standard-Ziel gilt für alle 7 Ligen gleichermaßen

### Alternativen erwogen

- **Sakaryaspor-only bleiben:** Verworfen weil Produktstand überproportional gewachsen ist — wäre Verschwendung von Produktreife.
- **Nur Süper Lig + Bundesliga:** Zu schmal — Scouting-Wert liegt in breiter Liga-Abdeckung.

---

## D2 — ARCHITECTURE: Beta-Metrics via SQL statt PostHog-Instrumentation

**Datum:** 2026-04-21
**Status:** ✅ Aktiv (nur für Beta-Phase, post-Beta evtl. revisit)

### Entscheidung

Während Beta-Phase werden User-Engagement + Feature-Usage + Money-Flow KPIs via Supabase-SQL-Queries direkt berechnet (`scripts/beta-metrics.mjs`), nicht via PostHog-Event-Instrumentation.

### Begründung

- PostHog-Instrumentation kostet 1-2h Entwicklungszeit + Testing + CSP-Anpassung + Cookie-Banner-Interaktion
- Pilot-Daten (20 Fans, 7 Tage) reichen als SQL-Aggregation völlig aus
- Supabase-Daten sind 100% deterministisch + auditierbar (für Money-KPIs wichtig)
- PostHog-Mehrwert (Session-Replay, No-Code-Dashboards) greift erst bei mehr User-Volume

### Auswirkungen

- `scripts/beta-metrics.mjs` rechnet 14 SQL-messbare KPIs (User-Engagement 5, Feature-Usage 6, Money-Flow 3)
- `pnpm run beta:metrics` als Daily-Check-Command
- PostHog-ENV-Vars bleiben live (nicht abschalten), aber 0 aktive Instrumentation in `src/`

### Alternativen erwogen

- **PostHog-Instrumentation bauen:** Verworfen wegen Pre-Beta-Zeitbudget + Pilot-Größe.
- **Keine Metrics-Tracking:** Verworfen — Exit-Criteria brauchen messbare Zahlen.
- **Sentry-Performance als Proxy:** Nur für Tech-KPIs (LCP), nicht für Business-Funnel.

### Re-Visit-Trigger

- Bei Public-Launch (>100 DAU): PostHog-Instrumentation evaluieren (SKILL.md oder neuer Slice)
- Bei Session-Replay-Bedarf nach Bug-Report: evtl. früher

---

## D3 — PROCESS: Rollback-Drill = Pflicht einmal vor Beta-Start

**Datum:** 2026-04-21
**Status:** ✅ Aktiv

### Entscheidung

Vor Beta-Launch muss einmal ein absichtlicher Rollback-Drill durchgeführt werden (`memory/beta-rollback-runbook.md` Section „Test-Prozedur VOR Beta-Start"). Ziel: Rollback-Zeit <3 Minuten, Fallstricke entdecken, CLI-Login etc. vorbereiten.

### Begründung

- Rollback-Prozedur wurde noch nie geübt — unter Druck während echtem P0-Incident entstehen Fehler
- 3-Minuten-Ziel nur verifizierbar mit echtem Drill
- Fallstricke (2FA-Prompt, expired CLI-Token, Service-Worker-Cache) sichtbar nur beim Durchspielen

### Auswirkungen

- Beta-Start-Checkliste bekommt „Rollback-Drill durchgeführt" als Pre-Start-Gate
- Ergebnis wird in `worklog/proofs/rollback-drill-YYYY-MM-DD.txt` dokumentiert
- Fallstricke kommen in Runbook zurück

### Alternativen erwogen

- **Überspringen:** Verworfen — Ops-Runbook ohne Drill ist Theater.
- **Nur bei Incident testen:** Verworfen — zu spät, dann fehlt Zeit zum Lernen.

---

## D4 — PROCESS: Memory-System — git ist Truth, Obsidian ist Lese-Layer, Notion ist Coordination

**Datum:** 2026-04-21
**Status:** ✅ Aktiv

### Entscheidung

Klare Rollen-Trennung der 3 Knowledge-Systeme:

- **git-tracked (`memory/` + `.claude/rules/` + `worklog/`)** = primärer Truth-Layer. Claude liest automatisch bei jeder Session.
- **Obsidian** = reiner Read-Layer auf `memory/`-Files via `.obsidian/`-Config. Anil nutzt Graph-View für Exploration. Kein Sync nötig (dieselben Files).
- **Notion** = Coordination-Layer für Anil (Kanban, Slice-DB, Status-Page). Kein Truth-Source, sondern Spiegel + Executive-View.

### Begründung

- Claude kann Notion nicht automatisch lesen ohne explicit MCP-Call → alles Strategy-relevante MUSS in git
- Obsidian und git auf denselben Files → kein Divergenz-Risiko
- Notion für Anil-Facing-Views (Stakeholder-Sharing, Priority-Changes) unschlagbar

### Auswirkungen

- `memory/MEMORY.md` als Index für Claude's Auto-Discovery
- Alle neuen Strategic Decisions → `memory/decisions.md` (dieses File)
- Slice-DONE-Hook spiegelt in Notion-Slice-DB
- Decisions optional Spiegelung in Notion-Status-Page (via `docs(decision):`-Commit-Hook, siehe Slice 131)

### Alternativen erwogen

- **Notion als Truth-Source:** Verworfen — Claude kann nicht auto-lesen, Versionierung fehlt, Grep-unfreundlich.
- **Obsidian als Truth-Source:** Verworfen — ist eigentlich nur ein Viewer auf Markdown-Files, kein eigener Store.
- **Alles in git, kein Notion:** Verworfen — Anil braucht Executive-Views für Stakeholder-Kommunikation.

---

## D5 — PROCESS: Session-End-Protokoll „DISTILL" — Chat-Ausarbeitungen müssen persistiert werden

**Datum:** 2026-04-21
**Status:** ✅ Aktiv (in `.claude/rules/workflow.md` verankert)

### Entscheidung

Am Ende jeder Session (vor Stop-Hook) muss Claude den Chat rückwärts scannen und folgende Inhalte extrahieren:

1. **Strategic Decisions** → `memory/decisions.md` neuer Entry
2. **Architektur-Alternativen erwogen** → `Alternativen erwogen`-Section in relevanter Decision
3. **Process-Erfindungen** (neue Workflows, Regeln, Checklisten) → `memory/decisions.md` mit Category PROCESS
4. **Ad-hoc Learnings** (überraschende Erkenntnisse, tech-deep-insights) → falls Code-relevant in `.claude/rules/common-errors.md`, sonst als neuer Decision-Entry

Commit-Message-Prefix: `docs(decision): D<nn> — <title>`.

### Begründung

Anil-Feedback 2026-04-21: „Ich habe das Gefühl dass viele Dinge die wir ausarbeiten auch verloren gehen, Kernerkenntnisse sollten schon extrahiert werden." Konkretes Beispiel: Sakaryaspor-Scope-Change war mündlich im Chat, landete aber nicht strukturiert in git — führte zu stale facts in CLAUDE.md über Wochen.

### Auswirkungen

- `.claude/rules/workflow.md` bekommt Section „DISTILL — Session-End-Protokoll"
- SHIP-Loop bekommt 6. Stufe nach LOG: DISTILL (optional pro Slice, pflicht pro Session)
- Claude muss aktiv sein — kein Hook kann semantische Decisions erkennen

### Alternativen erwogen

- **Stop-Hook mit LLM-Call:** Verworfen — zusätzlicher API-Cost, braucht Inference, fragil.
- **Anil macht es manuell:** Verworfen — genau das was der Feedback kritisiert hat.
- **Nur wenn Anil „decide"/"entschieden" sagt:** Verworfen — zu eng, viele Decisions kommen implizit.

---

## D6 — PRODUCT: Beta-Usability-Test-Format (30 Min Zoom × 3 Tester mit heterogenen Profilen)

**Datum:** 2026-04-21
**Status:** ✅ Aktiv

### Entscheidung

Phase 3b Beta-Testing läuft als **30-Min Zoom-Calls** mit **3 Testern verschiedener Profile**, nicht als Survey/Async/Single-Profile:

- **Tester A (Power-User):** Tech-affin + Fußball-Fan → validiert Power-Flows
- **Tester B (Novice):** Nicht-fußballaffin → validiert ob App selbsterklärend
- **Tester C (TR-Locale):** Türkisch-sprachig → live TR-UX (ergänzt Deutsch-Türke-Review der NUR 12 String-Findings durchklickt)

**Format:** „Denk-laut"-Protokoll, 8 sequentielle Tasks (Onboarding → First-Trade → Fantasy → Community → Mission → Club-Abo → Profile), Moderator beobachtet ohne einzugreifen (45-Sek-Regel), 6-8 Abschluss-Fragen mit NPS.

### Begründung

- Anil ist Einzelperson — Zoom-Setup ist niedrige operative Hürde
- 3 Tester in heterogenen Profilen maximieren Signal-pro-Zeit gegenüber 5 gleichen
- „Denk laut" deckt Mental-Model-Mismatches auf, die Survey-Items nie fangen würden
- Tester-C + Deutsch-Türke trennen **UX-Test** (lebendige Navigation) von **String-Review** (statische Korrektur) — beide nötig, aber verschiedene Methoden

### Auswirkungen

- 3 Files neu: `memory/beta-testplan.md`, `beta-test-results.md`, `beta-testing-runbook.md`
- Severity-Schema erweitert: neben P0-P2 auch **P3 = Celebration** (positive Findings explizit kategorisieren)
- Nachrichten-Template DE + TR für Tester-Akquise
- Commit-Prefix `docs(beta-test): tester <A|B|C> results` etabliert

### Alternativen erwogen

- **Written Survey (Google Forms):** Verworfen — keine Observation möglich, Tester rationalisieren.
- **Async Video-Recording (User-Testing-Style):** Verworfen — keine Rückfragen möglich bei Confusion, keine Follow-up-Probes.
- **5+ Power-Users:** Verworfen — überbetont tech-affine Bubble, ignoriert Novice-Perspektive.
- **Nur 1 Tester für alle Profile:** Verworfen — Tester A hat Fußball-Brille die UX-Gaps für B unsichtbar macht.
- **Längere Sessions (60 Min):** Verworfen — Test-Fatigue nach 30 Min sichtbar in Fremdstudien.

### Re-Visit-Trigger

- Nach Phase 3b Aggregation: War 30 Min knapp? Fehlten Tasks? → Format für Public-Launch-Beta anpassen.
- Bei >20 Testern (post-Beta): Methode umstellen auf PostHog-Funnel + selektive Zoom-Calls.

---

## D7 — PROCESS: Stale-Reference-Self-Heal bei Evidence-Check

**Datum:** 2026-04-21
**Status:** ✅ Aktiv

### Entscheidung

Wenn beim Evidenz-Check (z.B. „was ist in Phase 3 noch?") **stale references** gefunden werden (memory/MEMORY.md oder active.md behauptet File-X existiert aber `ls` zeigt Gegenteil), dann wird sofort in derselben Session der stale reference aufgelöst — entweder durch Erstellen des versprochenen Files ODER Entfernen der falschen Referenz. **Nicht „später"**.

### Begründung

Konkret erlebt in dieser Session: `memory/beta-testplan.md` und `beta-test-results.md` waren in `worklog/active.md` + `MEMORY.md` als fertig referenziert, existierten aber nicht. Genau das Pattern das D5 (DISTILL) adressieren soll — und es wäre beim nächsten Session-Start re-injected worden (CLAUDE reads MEMORY.md → findet Link → liest Content → Missing → Halluzination oder Verwirrung).

Stale references sind **infektiös**: je länger sie stehen, desto mehr Files referenzieren sie weiter, desto schwerer rauszuräumen.

### Auswirkungen

- Integriert in DISTILL-Stage: Wenn Stale-Reference beim Chat-Scan gefunden wird, ist Action Teil von DISTILL (schließen vor Commit).
- Bei Priorisierungsfragen vom Stale-Target: „jetzt" nicht „Slice später".
- Slice 132 (94f8ceea) ist Proof-of-Concept: Gap entdeckt → selbe Session geschlossen.

### Alternativen erwogen

- **„Ticket öffnen und später"**: Verworfen — führt zu genau dem Problem das D5 löst.
- **Nur Referenz löschen (nicht Content füllen)**: Verworfen wenn Content echt gebraucht wird (wie beta-testplan.md). Nur OK wenn Referenz unnötig ist.
- **Aus MEMORY.md auto-Index auskommentieren**: Verworfen — Obsidian zeigt broken links trotzdem.

---

## D8 — PROCESS: Bug-Triage mit DB-Truth-First bei UI-Daten-Anomalien

**Datum:** 2026-04-22
**Status:** ✅ Aktiv

### Entscheidung

Wenn ein User-Report sagt „die UI zeigt X aber sollte Y sein" (Zahlen, Listen, Counts) — **erste Diagnose-Aktion ist eine SQL-Query gegen die Produktions-DB**, nicht Code-Read. Erst wenn DB ≠ UI, gehe ich in den Client-Code. Wenn DB = UI, liegt der Bug in Service-Query oder Data-Pipeline.

Konkrete Reihenfolge:
1. DB-Truth: `SELECT ... GROUP BY ...` für die angeblich falsche Metric
2. Service-Layer-Query simulieren: gleiche Filter, gleiche JOINs, gleiche Limits
3. Wenn Stufe 1 + 2 unterschiedlich sind → Service hat Bug (Filter, Cap, Auth)
4. Wenn Stufe 1 + 2 gleich sind, UI anders → Client-Cache, React-State, Display-Mapping
5. Code-Read erst wenn Diagnose-Hypothese steht

### Begründung

Slice 133: Anil-Screenshot zeigte Beşiktaş „2 Spieler". DB-Query + Service-Simulation nahmen zusammen ~90 Sekunden — und zeigten sofort dass DB-Realität 20 ist, Service-Query auch 20 liefert in SQL, aber Client weniger bekommt. Daraus war in Sekunden klar: PostgREST-row-cap trotz `.limit(10000)`.

Ohne diesen Check wäre der erste Instinkt gewesen Code-Walk durch `getClubsWithStats` → Hypothesen bilden → testen — das dauert 10-15 Min mit Hypothesen die am Ende vielleicht alle falsch wären.

SQL-First ist **objektiv schneller** weil DB keine Meinung hat, nur Fakten.

### Auswirkungen

- **Pattern für Debug-Sessions:** Bei UI-Anomalie → `mcp__supabase__execute_sql` als erstes Tool, nicht grep + Read
- **In `.claude/rules/common-errors.md`** (Section „Silent Fails"): Beim Debug-Pattern verankert — „DB-Query vor Code-Read bei Count/Listen-Bugs"
- **Agent-Brief-Template** für impact-analyst / reviewer: bei Daten-Bugs explicit die Query-Reihenfolge (1. DB, 2. Service-Sim, 3. Client) einbauen

### Alternativen erwogen

- **Code-Walk first (klassisches Debugging):** Verworfen — erzeugt Hypothesen-Theater, kostet 5-10× mehr Zeit bei Data-Bugs
- **Nur bei Money-Bugs DB-first, sonst nach Gefühl:** Verworfen — User merkt keinen Unterschied zwischen Money und Count-Display, die Debugging-Disziplin muss einheitlich sein
- **User selbst DB-Query ausführen lassen:** Verworfen — Claude hat direkten MCP-Zugriff, das ist unnötige Latenz

### Re-Visit-Trigger

Wenn `mcp__supabase__execute_sql` mal 3× hintereinander bei einem Daten-Bug _nicht_ die Ursache lokalisiert hat → Pattern re-evaluieren (vielleicht gibt's eine UI-Layer die weiter vorne sitzt wie Realtime-Sync oder Service-Worker).

---

## Template für neue Entries

```markdown
## D<n> — <CATEGORY>: <kurzer Titel>

**Datum:** YYYY-MM-DD
**Status:** ✅ Aktiv | ⚠️ Trial | ❌ Verworfen | 📦 Superseded by D<n>
**Supersedes:** D<n> (wenn ersetzt) ODER „—"

### Entscheidung
Ein Absatz, was entschieden wurde. Konkret + messbar.

### Begründung
Warum so? Wer hat entschieden? Welcher Input hat geführt?

### Auswirkungen
- Code: <Files/Slices>
- Prozess: <Workflow-Änderungen>
- Team: <Wer muss wissen>

### Alternativen erwogen
- **<Alt A>:** Verworfen weil <Grund>.
- **<Alt B>:** Verworfen weil <Grund>.

### Re-Visit-Trigger (optional)
Wann diese Entscheidung neu bewerten? (z.B. „bei >100 DAU", „post-Beta", „wenn KPI X unter Y")
```
