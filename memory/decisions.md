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

## D9 — PROCESS: Hypothesis-Validation-Before-Slice (Backlog-Items sind Hypothesen, keine Wahrheiten)

**Datum:** 2026-04-22
**Status:** ✅ Aktiv

### Entscheidung

Bevor ein Kanban-/Backlog-Item als Slice gestartet wird, **validiere zuerst die Hypothese gegen aktuellen Code + DB**. Backlog-Items sind Momentaufnahmen eines vergangenen Denkens — zwischen Eintrag und Start können Tage bis Monate liegen, Code/DB hat sich bewegt. Ein Slice der eine invalide Hypothese löst, ist entweder Noise (nichts geändert) oder schädlich (bricht funktionierenden Code).

Pflicht-Checks vor Code-Change auf Basis eines Backlog-Items:

1. **Ist die Root-Cause noch aktuell?** — grep für erwähnte Files/Flags/Symbols. Fehlende Referenzen = stale (D7 self-heal).
2. **Stimmt die Zahl?** — jede konkret genannte Zahl (367 Spieler, 5 cron-routes, etc.) per DB-Query oder grep verifizieren. Zahlen altern am schnellsten.
3. **Existiert der Fix vielleicht schon?** — grep für den vorgeschlagenen Fix-Mechanismus (Feature-Flag, Guard, Helper-Funktion). Oft ist halb-fertig implementiert und nur Kanban nie gepflegt.
4. **Wie groß ist der Blast-Radius des Fix?** — der Fix-Vorschlag könnte mehr breaken als er löst (siehe Case unten).

Wenn einer der Checks Red-Flag zeigt: **stop, cleanup Kanban-Eintrag mit Evidence, report an User**. Kein Code.

### Begründung (2 Fälle in derselben Session 2026-04-22)

**Fall 1 — Paid-Mystery-Box Gating (CRITICAL):**
Kanban sagte "Paid-Opens mit $SCOUT = Loot-Box-Fall, Feature-Flag fehlt". Check: 4-Layer-Defense-in-Depth live (env-flag `PAID_MYSTERY_BOX_ENABLED`, client-guard in MysteryBoxModal, RPC-guard in open_mystery_box_v2 — via `pg_proc` verifiziert mit `HAS_GUARD`+`HAS_ERROR`, DB-setting `app.paid_mystery_box_enabled=(unset)` → default false). Ergebnis: **Stale — Journey-5-Arbeit schon komplett**, Kanban nie synced. Wenn ich den Slice gestartet hätte, hätte ich entweder doppelt-gebaut oder den live-gate versehentlich modifiziert.

**Fall 2 — api-football Name-Normalization (P2):**
Kanban sagte "367 Spieler blockiert weil api-football 'F.', 'P.' initials liefert, reject oder flag vor Insert". Check via DB-Audit: von 197 Spielern mit Initial-Namen haben **162 (82%)** ein valides TM-Mapping (K.Tsimikas, P.Dybala, M.Svilar als top-Spieler). Die Überschneidung "unknown + Initial-Namen" ist nur 7 von 134 unknowns (5%). Ergebnis: **Hypothese falsch** — ein naiver Reject-Fix hätte 162 top-Spieler silent gedroppt für max 7 mögliche Wins. Negativer ROI.

### Auswirkungen

- Pattern verankert in `memory/feedback_verify_before_claiming_open.md` (bereits existent — D9 formalisiert den Workflow für Kanban-Items)
- Bei Kanban-Planung: **3 Min Verify-Aufwand spart 30-120 Min Slice-Aufwand** wenn Hypothese falsch ist. Auch wenn Hypothese richtig: Verify schärft Scope und Blast-Radius.
- Agent-Briefs für backend-Agent müssen ebenfalls Pre-Validation enthalten — der Agent arbeitet sonst auf stale Briefing.
- In dieser Session: 4 Kanban-Items durch Validation als Erledigt markiert (1× Slice 115 gelöst, 2× J4/J5 gelöst, 1× Hypothese falsch). Das ist nicht "Faulheit", sondern Schutz vor Pseudo-Arbeit.

### Alternativen erwogen

- **Blind trust Kanban-Inhalt:** Verworfen — heute 2× würde es uns schaden haben gekostet. Das skaliert nicht.
- **Nur bei CRITICAL/P0 verifizieren:** Verworfen — P2 Fall 2 hätte 162 Spieler broken, die Priorität sagt nichts über Blast-Radius aus.
- **User (Anil) zuerst fragen:** Verworfen — Anil delegiert explizit ("überlasse es dir"). Self-Verify ist CTO-Pflicht.

### Re-Visit-Trigger

Wenn Kanban-Items 3× hintereinander Verifikation überleben und unverändert valide sind → vielleicht ist die Backlog-Quality inzwischen hoch genug und der Verify-Check kann weiter vorne im Session-Start stattfinden (z.B. als Kanban-Hygiene-Skill).

---

## D10 — PROCESS: Backlog in 5 Layern dependency-sortiert (memory/backlog.md)

**Datum:** 2026-04-22
**Status:** ✅ Aktiv
**Supersedes:** —

### Entscheidung

Offene Arbeiten außerhalb aktiver Slices werden in `memory/backlog.md` in **5 topologisch sortierten Layern** gepflegt: L0 Anil-Blocker (extern), L1 Independent (parallel startbar), L2 Depends-on-L1, L3 Post-Beta-Launch, L4 Revenue-Scaling. Items in Layer N können erst nach Abschluss von L<N-1> starten. Innerhalb eines Layers ist Reihenfolge frei.

### Begründung

- Vor Slice 137-140 gab es 3 parallele Listen (Kanban, `next-session-briefing`, `project_*.md`) mit unklarer Sortierung.
- Anil-Frage „haben wir was out-of-scope offen" ließ sich nicht in einem Blick beantworten — 15 Min Query über Notion + memory/ nötig.
- Ein einziges Backlog mit harten Dependencies macht die Antwort trivial: Layer N ist blockiert bis L<N-1> grün, innerhalb Layer beliebig.
- Layer-Sortierung (statt Prio) bildet echte Abhängigkeiten ab — Prio ist Gefühlssache, Dependency ist Fakt.

### Auswirkungen

- **Code:** Neue Datei `memory/backlog.md` (5 Layer, Spalten Prio + Aufwand + Quelle + Dependencies).
- **Prozess:** Bei jeder Session-End-DISTILL ggf. `backlog.md` aktualisieren (neue Items einsortieren, fertige streichen, Dependency-Verschiebungen tracken).
- **Team:** Claude ist Owner für Layer 1-4 (technical), Anil Owner für L0 (externe Tasks).

### Alternativen erwogen

- **Prio-sortiert (P0/P1/P2):** Verworfen — Prio ist kontext-abhängig und kann mehrere Items blockieren die sich gegenseitig nicht blockieren.
- **Nur Notion-Kanban:** Verworfen — Notion ist keine durchsuchbare Referenz in Sessions und Mobile-Edit ist träge.
- **Im `next-session-briefing`:** Verworfen — das File ist session-spezifisch, nicht persistent-langfristig.
- **Kanban + `memory/backlog.md` parallel:** Pragmatisch übernommen — Notion für externes Tracking + Daily-View, `backlog.md` für Claude-internal-Planning. Sync nur wenn relevanter Shift passiert.

### Re-Visit-Trigger

Wenn `backlog.md` >50 Items enthält oder Layer-Hierarchie unhandlich wird → in Unter-Files pro Theme splitten (`backlog-tech.md`, `backlog-revenue.md`).

---

## D11 — ARCHITECTURE: Supabase Reconcile-Trust-Model — Follow skipt, Unfollow behält

**Datum:** 2026-04-22
**Status:** ✅ Aktiv
**Supersedes:** —

### Entscheidung

In optimistic-UI-Patterns mit Supabase, nach erfolgreichem DB-Write:
- **Follow / Add-Path (deterministisch):** KEIN Reconcile via `.select()`. Optimistic-State ist komplette Wahrheit (wir kennen die Daten die wir geschrieben haben).
- **Unfollow / Remove-Path + Side-Effects:** RECONCILE via `.select()`. Server-seitige Effekte (Primary-Promotion, Cascade-Deletes, Trigger) sind für Client nicht vorhersagbar.

Gilt für alle Provider die via pgBouncer-transaction-pooling lesen (alle Supabase-JS-Clients).

### Begründung

- Slice 138 Live-Test entdeckte: `getUserFollowedClubs` direkt nach erfolgreichem `upsert` liefert den neuen Row manchmal nicht zurück → `setFollowedClubs(server-truth)` überschreibt Optimistic → UI reverted sichtbar. Nach Refresh ist alles korrekt.
- Ursache: Supabase pgBouncer transaction-pooling — Write committed auf Connection A, immediate Read auf Connection B kann pre-commit-state sehen.
- Folge: Blind-Replace mit Server-Read ist ein Risiko ohne Informationsgewinn, wenn Client-State bereits deterministisch ist.
- Für Unfollow ist Reconcile echter Wert: `toggleFollowClub` transfert den `is_primary`-Flag zu einem unpredictable next-Club — nur Server-Read bringt diese Info.

### Auswirkungen

- **Code:** Slice 139 — `src/components/providers/ClubProvider.tsx` conditional Reconcile (follow skipt, unfollow behält).
- **Prozess:** Bei neuem Provider-State-Management (Community-Follows, Friends, Inventory): gleiche Regel anwenden.
- **Rules:** `common-errors.md` Section 2 → „pgBouncer Read-After-Write Transient" Pattern dokumentiert.
- **Tests:** `ClubProvider.test.tsx` enthält Regression-Guards für beide Pfade.

### Alternativen erwogen

- **Reconcile mit 100-300ms Delay:** Verworfen — pragmatisch aber hacky. Trifft nicht den Root-Cause (Connection-Scheduling ist nicht deterministisch, Delay kann zu kurz oder zu lang sein).
- **Merge-Strategy (Optimistic ∪ Server):** Verworfen — komplex, erfordert per-Field-Merge-Logic, und Cross-Tab-Sync wird schwieriger.
- **service_role-Read für Reconcile:** Verworfen — bricht RLS-Semantik, nur für Admin-Routes OK.
- **Retry mit expected-clubId check:** Verworfen — exponentieller Code-Aufwand, deckt aber nur Follow-Case ab. Skip ist einfacher.
- **Komplett auf Optimistic-Only umstellen:** Verworfen — Unfollow braucht Server-Truth für Primary-Promotion.

### Re-Visit-Trigger

Wenn Supabase pgBouncer auf session-pooling oder direct connection wechselt → Reconcile kann wieder read-your-write garantieren, skip ist dann optional statt nötig. ODER: Wenn Cross-Tab-Sync wichtig wird (z.B. User in 2 Tabs, Tab A followt, Tab B muss aktualisieren) → brauchen wir realtime-subscription, nicht reconcile.

---

## D12 — ARCHITECTURE: Cron-Completion-Guards basieren auf DB-Truth, nicht API-Response-Count

**Datum:** 2026-04-22
**Status:** ✅ Aktiv
**Supersedes:** —

### Entscheidung

Cron-Jobs die „alle X sind fertig"-Semantik haben (Phase-B in gameweek-sync, future sync-jobs, reconciliation-jobs) MÜSSEN ihre Completion-Guards gegen **DB-Truth** prüfen, nicht allein gegen **externe API-Response-Count**. Externe APIs können Rows silent droppen (postponed, cancelled, data-quality-issues) — die DB bleibt Ground-Truth für „haben wir alle Rows für diesen Zustand".

Konkret: `allFixturesDone = apiAllDone && dbTruthAllDone`, wobei `dbTruthAllDone = (dbFinishedIds.size + newlyFinishedFixtures.length >= totalDbFixtures)`.

### Begründung

- Slice 140 Root-Cause: `gameweek-sync` vertraute `fixtureCheck.allDone = API.total === API.finished`. API-Football dropped 4 von 9 Süper-Lig-Fixtures (postponed) → allDone=true → Phase B advanced Clubs → 4 Fixtures unerreichbar.
- Symptom sichtbar auf `/clubs` 30-60h später (Slice 137). Root-Cause 2 Tage versteckt, weil gameweek-sync Logs als „Skipped: No fixtures past kickoff" harmlos aussahen.
- Regel gilt transitiv: jeder Cron der aufgrund einer Completion-Check-weiterspringt (GW-advance, Liga-Rotation, Season-Rollover), muss DB-Count mit einbeziehen.

### Auswirkungen

- **Code:** Slice 140 — `src/app/api/cron/gameweek-sync/route.ts` Phase-B-Guard.
- **Prozess:** Bei neuen Cron-Routes (z.B. season-end-rollover, bounty-close-batch): Guard-Pattern aus common-errors.md übernehmen.
- **Rules:** `common-errors.md` Section 1 → „Cron-Guard API-Response-Count vs DB-Count" Pattern dokumentiert.
- **Monitoring:** `logStep 'phase_X_blocked_db_mismatch'` bei Divergenz → admin sieht cron_sync_log → manuelle Intervention möglich (sync-fixtures-future oder SQL-cleanup).

### Alternativen erwogen

- **Blind der API vertrauen:** Verworfen — Slice 140 zeigte wie das silent-data-lost verursacht.
- **Cron bei jedem Discrepancy-Fall hart failen:** Verworfen — ein einziges postponed Match würde Phase B für alle Ligen blockieren. Partial-Processing + Log-Warning ist besser.
- **Nur postponed-Status-Handling in gameweek-sync einbauen:** Zu eng. Das Pattern ist breiter (gilt für alle Cron-Guards).
- **Separate reconciliation-cron pro Entity:** Verworfen — verdoppelt Code. Guard-Pattern im existing Cron ist minimal-invasiv.

### Re-Visit-Trigger

Wenn API-Football-Reliability > 99.9% erreicht wird (keine silent drops mehr), könnten wir API-Response-Counts wieder direkt trusten. Unwahrscheinlich kurzfristig.

---

## D13 — PROCESS: Reviewer-Agent als Pflicht-Stage nach BUILD (6-Stufen-SHIP-Loop)

**Datum:** 2026-04-22
**Status:** ✅ Aktiv
**Supersedes:** Implizite Reviewer-ist-optional-Politik der 5-Stufen-SHIP-Loop

### Entscheidung

Zwischen BUILD und PROVE wird REVIEW als eigenständige Stage eingeführt. Bei jedem feat/fix/refactor-Slice ab S-Größe muss ein Reviewer-Agent (Cold-Context, `subagent_type: "reviewer"`) dispatched werden und einen Review nach `worklog/reviews/<slice>-review.md` schreiben. Hook `ship-cto-review-gate` blockt Commits ohne Review-File.

Loop: SPEC → IMPACT → BUILD → **REVIEW** → PROVE → LOG.

### Begründung (Session-Self-Assessment 2026-04-22)

- In 5 konsekutiven Slices (137-142) wurde Reviewer-Agent nie dispatched.
- Bestehender `ship-cto-review-gate` Hook war tot: checkte `status="active"` — dieser Wert existiert nie im SHIP-Loop.
- Claude-Primary hat Blindspots (eigener Context ≠ Cold-Context-Prüfung). Commit-Message + eigene Tests sind keine Code-Review.
- Session-Bewertung: "Output gut (7 Commits), aber Discipline-Gaps ziehen Note auf 2-." Reviewer-Agent ist die größte der 10 identifizierten Gaps.

### Auswirkungen

- **Hook:** `.claude/hooks/ship-cto-review-gate.sh` rewrite (warn→strict-block, heredoc-exempt entfernt).
- **Workflow:** `.claude/rules/workflow.md` Loop 5→6 Stufen, REVIEW-Stage 3b dokumentiert.
- **Filesystem:** `worklog/reviews/` Directory neu.
- **Active.md:** neuer `review:` Key, parallel zu `proof:`.
- **Prozess:** Bei Agent-Dispatch wird Reviewer Schreibpfad explizit genannt. Read-Only-Reviewer (ohne Write) liefert Content inline → Primary-Claude legt File an.

### Alternativen erwogen

- **Hook als Warn statt Block:** Verworfen — wurde 5 Slices ignoriert. Nur Hard-Gate erzwingt Discipline.
- **Reviewer nach PROVE:** Verworfen — REWORK braucht evtl. Code-Change der erneuten Proof erfordert. REVIEW→PROVE-Order minimiert Rework-Zyklen.
- **Reviewer Pflicht auch für XS:** Verworfen — Trivial-Fixes haben Review-Cost > Nutzen. XS-Opt-Out via `touch worklog/reviews/<slice>-review.md` oder `review: skipped (Grund)` in active.md.
- **Automatischer Reviewer-Dispatch via Hook:** Verworfen — Hooks können keine Agent-Tools triggern (nur Claude-Prozess). Primary-Claude muss explicit dispatchen.

### Re-Visit-Trigger

Nach 20+ Slices mit REVIEW-Stage: Empirische Auswertung, wie viele REWORK-Verdicts echte Bugs gefunden haben. Wenn <5% → evtl. Gate auf M-Size einschränken. Wenn >20% → REVIEW in XS-Slices auch aktivieren.

---

## D14 — ARCHITECTURE: TM-Squad-Page-Strategie statt Search-Profile-Pattern für Player-Sync

**Datum:** 2026-04-22
**Status:** ⚠️ Trial (Slice 144 erst 1× Full-Run durchlaufen)
**Supersedes:** Implizite Strategie via `transfermarkt-search-batch` + `sync-transfermarkt-batch` (Slice 068/069)

### Entscheidung

Neuer Player-Sync-Weg: Pro Club 1 Request auf `https://www.transfermarkt.de/<slug>/startseite/verein/<tm-club-id>` liefert komplette Squad (20-30 Players) mit Shirt + Position + MV + Nationality direkt aus der Squad-Tabelle. Ersetzt perspektivisch den 2-Request-per-Player-Flow des alten Scrapers.

Pre-Condition (Slice 141b): `club_external_ids(source='transfermarkt')` für alle 134 Clubs gefüllt.

### Begründung

- Alter Flow: ~5000 Players × 2 Requests = ~10.000 Requests/Sync-Zyklus. Vercel-Hobby-Timeout hart, Cloudflare-Block permanent, TM-Rate-Limit gefährdet.
- Neuer Flow: 134 Clubs × 1 Request = **75× weniger Netzwerk-Last**.
- Garantierte Club-Zuordnung (keine Fuzzy-Match-False-Positives wie in Search-Flow).
- Erst nach Slice 141b möglich (134/134 TM-Club-IDs gemappt).
- Slice 144 Full-Run: 134/134 clubs, 2841 matched, 22 shirt-drift updated, 0 errors, 12.8 min.

### Auswirkungen

- **Code:** `src/lib/scrapers/transfermarkt-squad.ts` + `scripts/tm-squad-scrape-local.ts` + Migration `players.last_squad_check TIMESTAMPTZ`.
- **Deprecation-Plan:** Alter `transfermarkt-search-batch` bleibt bis Squad-Scraper im Production-Cron läuft. Sync-Tasks die neue Players importieren bleiben bei API-Football (`sync-players-daily`) — Squad-Scraper ist Update-Tool, kein Insert-Importer.
- **Scope-Decision (Anil 2026-04-22 Option A):** Leihspieler zählen als Squad-Member des Leih-Clubs (nicht Stammverein).

### Alternativen erwogen

- **Bei Search-Scrape bleiben:** Verworfen — kostet 75× mehr Requests, weniger robust gegen Cloudflare-Blocks.
- **API-Football als einzige Truth:** Verworfen — API-Football liefert keine Marktwerte, nur Shirts+Positions. TM als MV-Quelle bleibt unverzichtbar.
- **TM-Profile-Page (einzeln) behalten:** Wird für Contract-End + Nationality nachträglich weiter genutzt (Squad-Page hat kein Contract). Hybrid-Strategie.

### Re-Visit-Trigger

- Wenn TM Squad-Table-HTML umgestellt wird (analog Slice 078 MV-Markup-Migration): Parser muss adaptiert werden.
- Wenn `sync-players-daily` (API-Football) retired wird: Squad-Scraper müsste Insert-Pfad übernehmen.
- Wenn Production-Cron für Squad-Scraper gesetzt wird: Vercel-Pro-Upgrade oder Proxy-Service evaluieren.

---

## D15 — PROCESS: Shell-case auf COMMAND-Strings MUSS command-token-anchorn

**Datum:** 2026-04-22
**Status:** ✅ Aktiv
**Supersedes:** —

### Entscheidung

Jedes `case "$COMMAND" in *"<token>"*)`-Pattern in `.claude/hooks/` (oder generell PreToolUse-Hooks die JSON-Command-Strings parsen) MUSS:

- Start-of-Command anchorn (z.B. `"git merge"|"git merge "*)`) statt Substring-Match.
- Bei Flag-Check (`--amend`, `--force`, `-i`): quoted-Content erst strippen (`UNQUOTED=$(sed 's/"[^"]*"//g; s/'\''[^'\'']*'\''//g')`), dann Substring-Match auf UNQUOTED.
- Keine `*"<english-word>"*` Patterns weil Commit-Messages das Wort als Text enthalten können.

Zusätzlich: `grep -oE` in Hook-MSG-Extraktion darf KEIN `\b`-word-anchor nutzen, weil JSON-escaped Heredoc (`\nfeat(...`) ein Literal `n` vor `feat` hat — word-char blockiert `\b`. Stattdessen `[(:]`-Suffix oder `[^a-zA-Z_]`-Lookbehind.

### Begründung

Slice 146 Cold-Context-Review fand 4 Bugs derselben Klasse in 2 Gate-Hooks:

1. `*"merge"*` matched `fix(api): prevent merge conflict` → false-exempt
2. `*"--amend"*` matched `fix(docs): add --amend help` → false-exempt
3. `*"git commit"*` matched bash-test-scripts mit Fixture-Strings → false-trigger
4. `\b(feat|fix|refactor)` failed bei JSON-escaped Heredoc → review-gate-Backdoor für alle Heredoc-Commits silent exempt

Primary-Claude hatte in Slice 145 die ersten beiden Patterns als "trivial copy" klassifiziert und den `\b`-Bug komplett verpasst — Reviewer-Agent fand es, weil Cold-Context keinen Tunnel-Vision-Bias hatte. Das validiert D13 (REVIEW als Pflicht) empirisch beim ersten Live-Test.

Regel ist verallgemeinerbar auf alle Shell-Hooks die User-Commands parsen, nicht nur Commit-Gates.

### Auswirkungen

- **Code:** `.claude/hooks/ship-proof-gate.sh`, `.claude/hooks/ship-cto-review-gate.sh` in Slice 146 gefixt. Audit-Kandidaten: alle anderen `.claude/hooks/*.sh` die `case "$COMMAND"` nutzen.
- **Prozess:** Bei jedem neuen Hook der PreToolUse.Bash parst: dieses D15-Muster Pflicht in Code-Review-Checklist.
- **Test-Coverage:** Hook-Test-Suites müssen "message-contains-token-as-text"-Regression-Cases abdecken (siehe `worklog/proofs/146-hook-test.txt` Case B/H/I/L als Template).
- **Team:** Eintrag in `.claude/rules/common-errors.md` Section 8 als "Shell case-statement wildcard promiskuös" (erweitert) + neuer Entry "grep `\b` broken bei JSON-escaped Heredoc".

### Alternativen erwogen

- **Rein auf Convention verlassen (kein Gate-Hardening):** Verworfen — Slice 145 hat gezeigt dass der Backdoor aktiv genutzt wurde (heredoc-Commits umgingen review-gate silent).
- **Full JSON-Parser in Shell (jq):** Verworfen — Windows Git Bash hat jq nicht garantiert, sed/grep reicht mit korrekten Pattern-Anchors.
- **Hook in Node/Python rewriten:** Verworfen — Performance-Overhead bei jedem PreToolUse-Event, Bash-Hooks bleiben Standard im Codebase.

### Re-Visit-Trigger

- Wenn weiterer Bug derselben Klasse auftaucht (Hook exempt durch Command-Substring-Match): sofort auditieren. Pattern ist bekannt und fixable.
- Wenn neue Gate-Hook-Kategorien hinzukommen (z.B. spec-gate auf nicht-Bash Tools): Regel verallgemeinern.

---

## D16 — ARCHITECTURE: Scraper-null-Policy — always write null statt old-value keep

**Datum:** 2026-04-22
**Status:** ✅ Aktiv
**Supersedes:** —

### Entscheidung

Wenn ein Scraper-Parser `null` returnt (Source-Feld fehlt im externen HTML), MUSS der DB-Write den alten Wert mit `null` überschreiben — nicht belassen. Policy für alle `scripts/tm-*` und ähnliche Scraper:

```ts
// FALSCH (data-liar):
if (contract !== null) updates.contract_end = contract;

// RICHTIG (honest):
updates.contract_end = contract; // null = Source has no current value
```

### Begründung

Slice 144f hatte die alte Policy: `tm-rescrape-stale.ts` setzte `mv_source='transfermarkt_verified'` nach erfolgreichem Scrape, schrieb aber `contract_end` nur bei parser-success. Bei 3 Werder-Players (Lynen/Pieper/Stark) hatte TM-Profile **0 "Vertrag bis"**-Occurrences → parser returnt null → alte DB-Werte aus 2022-2023 blieben → UI zeigte "Vertrag bis 2022-07-01" trotz `verified`-Flag.

Debug-Evidence (`tmp/144g-contract-debug.ts`): Parser ist funktional korrekt. Die 3 Spieler haben im TM-Profil-HTML tatsächlich kein aktuelles Contract-Ende. `null` ist semantisch ehrlich — alte historische Importe (pre-Slice 144f) zu belassen erzeugt **permanente Data-Liar-Akkumulation**, die nur durch manuelle Fixes heilt.

INV-38 (contract_end < cutoff AND mv_source != stale) wurde durch 144f aktiv verletzt bei diesen 3 Playern (verified + 2022-07-01). Nach 144g-Fix: null-values sind vom IS-NOT-NULL-Filter implizit ausgeschlossen → Invariant heilt automatisch.

### Auswirkungen

- **Code:** `scripts/tm-rescrape-stale.ts:271` Line-Change (Slice 144g commit `a487a93b`). Consumer-Chain 12x null-safe verifiziert (calcContractMonths returns 0, PerformanceTab gated via `>0`).
- **Prozess:** Bei jedem neuen Scraper/Parser-Consumer die DB-Write macht: `null`-als-valid-Output vom Source einplanen, nie "keep old" als Default.
- **Pattern → common-errors.md Section 9:** "Scraper null-Policy — always write null on missing source field. Keep-old = permanent data-liar."
- **Tests:** DB-Invariants (INV-38) dienen als Regression-Detector wenn Policy wieder bricht.

### Alternativen erwogen

- **Conservative-Mode als default ("keep old, set verified"):** Verworfen — erzeugt stille Datenlügen, die nur manuell heilen. Bei 3 Players schon user-sichtbar falsch.
- **Separate `contract_source` Column analog `mv_source`:** Verworfen — Migration-Overhead, und Policy "null = missing" ist genau diese Information kompakter.
- **Parser-Tweak (versuche andere Patterns wenn primary fehlt):** Verworfen — Parser ist korrekt, die 3 Players haben wirklich kein "Vertrag bis" in TM. Mehr Pattern würde false-positives einbringen.

### Re-Visit-Trigger

- Wenn ein neuer Scraper-Konsument auftaucht der absichtlich "keep old" Policy braucht (z.B. Multi-Source-Merge mit TM als Tertiärquelle): dann Opt-out-Flag einbauen und D16-Policy bleibt Default.
- Wenn parser-unsafe für bestimmte Feld-Typen (z.B. numerische 0 vs null-Verwirrung): Entry erweitern um Feld-Typ-Distinction.

---

## D17 — ARCHITECTURE: useSafeMutation als Standard-Primitive für alle Mutations

**Datum:** 2026-04-23
**Status:** ✅ Aktiv
**Supersedes:** —

### Entscheidung

Alle neuen Mutation-Handler (feature oder migration) MUESSEN `useSafeMutation` aus `src/lib/hooks/useSafeMutation.ts` nutzen, nicht `useState(loading)` + `async handleX`. Kein `useRef`-Mutex-Custom-Build — useSafeMutation wraps React Query v5 useMutation mit synchronem Pending-Guard via `safeTrigger(variables)` + Auto-Toast via `errorToast` + Sentry via `errorTag`.

### Begründung

Slice 150 Audit (User-Report Slice 149 "Follow-Button loest mehrfach aus"): 63 React-Components hatten das `setState(loading)`-Pattern, nur 4 nutzten `useMutation`. React-setState ist async — Race-Window zwischen `if (loading) return` und `setLoading(true)`. Pragmatisch + projekt-konsistent ist ein shared Primitive der React Query's `isPending` (synchron im Observer) ausnutzt plus Toast-Integration einheitlich macht.

Primitive in Slice 151a etabliert, 2 Piloten in 151b (useClubActions / Follow) + 151c (MembershipSection / Subscribe) migriert — beide race-safe, 20 neue Tests green.

### Auswirkungen

- **Code:** `src/lib/hooks/useSafeMutation.ts` ist canonical. Generic-Order matched React Query v5: `<TData, TError, TVariables, TContext>`. Intersection-type (nicht interface-extends) weil `UseMutationResult` in v5 discriminated-union ist.
- **Prozess:** Neue Mutations → useSafeMutation. Legacy-Migration via Slice-per-File. ESLint-Rule `no-restricted-syntax` (warn) gegen `onClick={async ...}`. Audit-Script `npm run audit:mutation-race` zeigt migration-candidates + prueft Baseline.
- **Pattern → common-errors.md D18:** "React setState Race in Mutation-Handler" mit Migration-Plan-Reference.

### Alternativen erwogen

- **`useRef`-Mutex pro Component custom:** Verworfen — inkonsistent, dupliziert in jeder Stelle, keine Toast-Integration, keine Sentry-Integration.
- **`<AsyncButton>` Component:** Verworfen als Primary-Pattern — Hook-Level ist flexibler (andere Call-Sites als Button), Component-Wrapper als Phase-6-Option fuer legacy-safe-spot-migration.
- **Direkter useMutation ohne Wrapper:** Verworfen — jede Call-Site wuerde Toast + Sentry + safeTrigger neu bauen. Shared Primitive macht das einmal zentral.

### Re-Visit-Trigger

- Bei React Query v6 Upgrade: Generic-Order + MutationObserver-Interna neu verifizieren.
- Wenn `<AsyncButton>` Component-Wrapper-Pattern sich als besser erweist (empirisch nach Slice 152-160): Primitive bleibt, Component als zusaetzliche Layer.

---

## D18 — ARCHITECTURE: Money-RPC Idempotency-Window als Pflicht-Pattern

**Datum:** 2026-04-23
**Status:** ✅ Aktiv
**Supersedes:** —

### Entscheidung

Jeder Money-RPC der Wallet-Deduct + Domain-INSERT kombiniert MUSS einen Idempotency-Pre-Check mit kurzem Window (typisch 60 Sekunden) VOR der Wallet-Deduction haben. Client-Guard (useSafeMutation safeTrigger) ist Defense-in-Depth — **nicht authoritativ**. Server-side Network-Retry umgeht den Client-Guard.

### Begründung

Slice 151c.2 Reviewer-Agent identifizierte echten Money-Path-BLOCKER in `subscribe_to_club` RPC: Wallet-Deduction passierte UNCONDITIONAL vor `ON CONFLICT`-Check auf `club_subscriptions`. Szenario: Call #1 (T+0) Balance 1M → -50K → 950K. Call #2 (T+1, network-retry bei Mobile-Switch) Balance 950K → -50K → 900K. Subscription-Row via ON CONFLICT saved von Duplicate, aber **Wallet 2x deducted für 1 Subscription** — direkter Geld-Verlust bei 3-Tester-Beta realistisch (Mobile-Netzwerk).

Fix-Pattern in `20260423190000_slice_151c2_subscribe_idempotency.sql` live deployed:
```sql
IF FOUND THEN
  IF v_existing.tier = p_tier AND v_existing.started_at > NOW() - INTERVAL '60 seconds' THEN
    RETURN jsonb_build_object('success', true, 'idempotent_retry', true, ...);
  END IF;
  -- tier-change / older: Upgrade/Downgrade-Flow
END IF;
```

### Auswirkungen

- **Migration-Standard:** Jede neue Money-RPC-Migration ab Slice 151c.2 hat Pre-Check-Early-Return.
- **Audit vor Migration:** `SELECT pg_get_functiondef('rpc_name'::regproc);` VOR useSafeMutation-Migration. Ohne Server-Hardening ist Client-Migration nur halbe Wahrheit.
- **Betroffene RPCs (Audit pending):** `subscribe_to_club` (DONE 151c.2), `renew_club_subscription`, `buy_player_dpc`, `open_mystery_box`, `liquidate_player`, `withdraw_club_balance`, `createOffer`/`acceptOffer`. Slice 152+ jede einzeln pruefen.
- **Pattern → common-errors.md:** Subsection unter D18 — "Money-RPC Idempotency-Window".

### Alternativen erwogen

- **UNIQUE-Constraint + ON CONFLICT DO NOTHING als Idempotency-Quelle:** Verworfen als alleinige Strategie — Wallet-Deduction passiert trotzdem vor ON CONFLICT check in current subscribe_to_club. Muss mit Pre-Check kombiniert werden.
- **Idempotency-Key Pattern (client-generated UUID):** Verworfen fuer Slice 151c.2 — substantieller Refactor (API-change + DB-column), nicht Beta-Launch-ready. Kandidat fuer Phase 6 Production-Hardening.
- **Client-only Guard reicht:** Verworfen — Browser-Retry (fetch auto-retry bei Network-Timeout) + Mobile-Switch umgehen jeden Client-Guard. Defense-in-Depth Pflicht.

### Re-Visit-Trigger

- Wenn 60s-Window zu kurz fuer Legitimate-Retry-Scenarios (e.g. offline-queue bei Mobile): auf 120s oder 300s erhoehen, abhaengig von Business-Context.
- Bei Scale (>1000 subscriptions/Tag): Idempotency-Key-Pattern bauen (cleaner, performance-aware). Dann D18 → 📦 Superseded.

---

## D19 — PROCESS: Cron-Route-Registry (jede route.ts MUSS in vercel.json)

**Datum:** 2026-04-23
**Status:** ✅ Aktiv
**Supersedes:** "MANUAL-ONLY wegen Hobby-Plan"-Pattern aus pre-2026-04 (Projekt ist Pro-Plan)

### Entscheidung

Jede `src/app/api/cron/*/route.ts` MUSS entweder (a) in `vercel.json.crons` mit explicit schedule ODER (b) als `MANUAL-ONLY` dokumentiert mit Klaus-Owner + Dokumentation warum nicht automatisch. "Existiert in trigger-cron-whitelist aber nicht in vercel.json" ist stille Daten-Drift-Quelle.

### Begründung

Slice 149c (Anil-Report "Gala hat 71 Punkte, UI zeigt 68"): `sync-standings` existierte als Route + Admin-Trigger-Whitelist aber war seit 2026-03 nicht in vercel.json crons. Niemand triggerte manuell → league_standings 4 Tage stale. Slice 149d Follow-up: `sync-fixtures-future` (6 Tage stale, 294 rows) + `sync-transfers` (NIE gesynced, 0 rows) hatten dasselbe Problem. Alle 3 routes hatten Header-Kommentar "MANUAL-ONLY wegen Hobby-Plan" — aber Projekt ist laengst Pro (6 Crons aktiv bereits).

Audit-Command (7 Zeilen Shell):
```bash
ls src/app/api/cron/ | while read d; do
  grep -q "\"path\": \"/api/cron/$d\"" vercel.json || echo "MISSING: $d"
done
```

### Auswirkungen

- **vercel.json:** jetzt 9 crons (alle src/app/api/cron-Routes registriert).
- **Schedule-Layout konfliktfrei:** 1,2,3,4,5,6,12 Uhr-Slots (Stand Slice 149d). Rate-aware: transfers weekly (134 API-Calls), rest daily.
- **Route.ts-Convention:** Header-Kommentar MUSS Schedule nennen ODER explicit "MANUAL-ONLY mit Begruendung" flaggen.
- **CI-Gate-Kandidat:** Audit-Command als Pre-Commit-Hook oder GH-Actions Check.

### Alternativen erwogen

- **MANUAL-ONLY als Default:** Verworfen — erzeugt Drift ohne Owner-Warning.
- **Automatisches Cron-Scheduling via File-Naming-Convention:** Verworfen — vercel.json ist Vercel-Canonical, Sync-Layer waere Redundanz.

### Re-Visit-Trigger

- Wenn Cron-Slots knapp werden (Vercel Pro hat 40 cron/day limit): Schedule-Optimierung + weekly-Consolidation.

---

## D20 — ARCHITECTURE: Query-Cache ist Single-Source-of-Truth fuer Server-Daten, Provider NUR fuer UI-State

**Datum:** 2026-04-23
**Status:** ✅ Aktiv
**Supersedes:** —

### Entscheidung

Server-Daten (Wallet-Balance, Follower-Listen, Holdings, etc.) werden ausschliesslich via React-Query-Cache verwaltet. Provider-Komponenten (React-Context) sind reserviert fuer **UI-State** (activeClub, modal-open, selected-tab) — niemals fuer Server-Daten als Duplikat.

Konkret eliminiert:
- **ClubProvider.followedClubs/primaryClub/isFollowing/toggleFollow** → `useFollowedClubs` + `usePrimaryClub` + `useToggleFollowClub` (151b-RESET, commit 04b4492f)
- **WalletProvider komplett** → `useWallet` + 4 Helpers `setWalletBalance/setWalletLockedBalance/invalidateWallet/removeWalletFromCache` (152a-d, commits 753e8f83 / 0e10fe12 / a59a7209 / 78c7f409)

ClubProvider verbleibt mit `activeClub/setActiveClub/loading` — reiner UI-State. Kein anderer Provider hat noch Server-Daten-Spiegel.

### Begruendung

State-Sync-Audit 2026-04-23 (commit f0cfbc6b) identifizierte 5 Anti-Pattern-Klassen auf 18 Features. Klasse A (Dual-State-Drift) und Klasse C (Zwei-Provider) machten zusammen 40% der Findings aus und waren direkte Ursache fuer Anil's User-Report "Follow-Button zeigt mal 0, mal 4 Scouts, wackelt, nicht synchron".

Single-Source-of-Truth eliminiert die Drift-Klasse systematisch:
- Optimistic-Update via `setQueryData` ist atomar, jeder Consumer sieht exakt denselben Wert.
- Kein `useState`-Spiegel der mit `useQuery` divergieren kann.
- Cross-Consumer-Sync (Sidebar + Button + Hero auf derselben Page) funktioniert ohne Sync-Logik.

### Auswirkungen

- **Code:** 465 LOC netto entfernt (207 LOC WalletProvider + 207 LOC dessen Test + ClubProvider-Shrink 127 LOC). Ersetzt durch ~220 LOC neue Query-Hooks.
- **Prozess:** Neue Pattern-Regel in `.claude/rules/` — "Kein Provider fuer Server-Daten". ESLint D18b (Slice 160 Backlog) soll `useState` parallel zu `useQuery`-Key als Error flaggen.
- **Team:** Slice 153-158 wenden dieselbe Regel auf `useProfileData` (Follower/Following), `usePlayerTrading` (15 useStates), `useEventActions` (parallel-state) an.

### Alternativen erwogen

- **Provider behalten + Query-Sync-Bridge:** Verworfen — Dual-Ownership bleibt, jeder Mutation-Pfad muss beide Layer updaten. Gleiche Drift-Klasse, nur mit mehr Code.
- **Zustand-Store als Alternative zu React-Query:** Verworfen — beScout nutzt React-Query bereits durchgaengig. Zweiter Store waere erneut Dual-Ownership.
- **Provider-First wie Sorare (beobachtet):** Verworfen — Sorare hat auch inzwischen auf React-Query migriert. Peer-Confirm fuer die Richtung.

### Re-Visit-Trigger

- Wenn React Query v6 das Cache-Modell grundsaetzlich aendert.
- Wenn ein UI-State (z.B. aktiver Tab) Server-Persistenz braucht → dann nur fuer diesen Fall, nicht als globales Re-Einfuehren von Server-Providern.

---

## D21 — ARCHITECTURE: Ferrari-Blueprint-Pattern fuer alle Mutations (pgBouncer-safe onSuccess/onSettled-Split)

**Datum:** 2026-04-23
**Status:** ✅ Aktiv
**Supersedes:** —

### Entscheidung

Jede Mutation in beScout folgt **exakt** diesem Muster (Referenz-Implementation: `src/lib/hooks/useToggleFollowClub.ts` aus Slice 151b-RESET):

```ts
const mut = useSafeMutation<TData, Error, TVars, RollbackContext>({
  mutationFn: async (vars) => { /* RPC-Call */ },
  onMutate: async (vars) => {
    await Promise.all([ /* cancelQueries × n */ ]);
    const ctx = { /* snapshot × n */ };
    /* setQueryData optimistic × n */
    return ctx;
  },
  onError: (_err, vars, ctx) => { /* rollback aus ctx */ },
  onSuccess: (result) => {
    /* setQueryData(deterministic-server-response) */
    /* NICHT invalidateQueries hier! */
  },
  onSettled: () => {
    /* invalidateQueries NUR fuer non-deterministic Keys */
  },
  errorToast: t('...'),
  errorTag: 'domain.action',
});
```

**Kritisch:** `invalidateQueries` im `onSettled`, nicht `onSuccess`. Gruende: pgBouncer-Read-After-Write-Transient (Slice 139) — wenn `setQueryData` und `invalidateQueries` im selben Microtask laufen, ueberschreibt der Invalidate-Refetch den deterministischen Write mit Stale-Row.

### Begruendung

Slice 152c Reviewer-Agent (Commit a59a7209) fand genau dieses Anti-Pattern 2× als HIGH-Finding in meiner initialen Migration: `invalidateWallet(queryClient)` stand im `onSuccess` direkt nach `setWalletBalance`. Ich hatte das pgBouncer-Pattern in `useWallet.ts:200` selbst dokumentiert und trotzdem falsch migriert. Cold-Context-Review fing die Blaupause↔Impl-Diskrepanz.

Zwei Referenz-Implementationen existieren jetzt:
- **`useToggleFollowClub`** — Single-Mutation mit 3-Key-Cascade (isFollowing + follower-count + followed-list), `onSettled` invalidate nur fuer non-deterministic `followedByUser`.
- **`useWallet` + Helpers** — Cross-Mutation-Shared-State-Pattern. Trading-Hooks nutzen `setWalletBalance(qc, uid, result.new_balance)` im `onSuccess` und `invalidateWallet(qc)` im `onSettled`.

### Auswirkungen

- **Code:** 151b-RESET + 152c setzen den Standard. Slice 153 (usePlayerTrading Ferrari-Refactor) + 156-158 muessen dieses Pattern anwenden.
- **Prozess:** Reviewer-Agent-Briefing bei Money-Path-Slices enthaelt explizit "Jede Abweichung zu useToggleFollowClub/useWallet ist ein Finding".
- **Team:** Pattern wird Slice 160 (Norm-Codification) in `.claude/rules/mutations.md` einziehen + ESLint-Rule + `scripts/audit-mutation-pattern.sh`.

### Alternativen erwogen

- **Alles in onSuccess:** Verworfen — 152c-Review fand genau dieses Anti-Pattern als HIGH. pgBouncer-Race ist real.
- **Kein Optimistic (nur invalidate nach Success):** Verworfen — UI wartet Round-Trip, "mal 0, mal 4 scouts"-Symptom (User-Report 2026-04-23) kehrt zurueck.
- **setQueryData nur, kein invalidate:** Verworfen — non-deterministic Felder (Server-timestamps, DENSE_RANK promote-primary-Logik) drifted ohne Reconcile-Roundtrip.

### Re-Visit-Trigger

- Bei React Query v6-Migration: Pattern gegen neue API pruefen.
- Bei Supabase-Connection-Pool-Wechsel (von pgBouncer auf Supavisor): Pattern evaluieren — Commit-Fenster-Timing kann anders sein.

---

## D22 — PROCESS: Sub-Slice-Gating fuer Provider-Elimination (Foundation → Read → Mutation → Delete)

**Datum:** 2026-04-23
**Status:** ✅ Aktiv
**Supersedes:** —

### Entscheidung

Provider-Eliminationen (aktuell: WalletProvider 152a-d, zukuenftig: ggf. andere) werden in **4 Sub-Slices** gebaut:

- **Sub-a — Foundation:** Neuer Query-Hook + Helpers + TDD-Tests. Keine Consumer-Aenderung. **Self-Review reicht.** Rollback-trivial.
- **Sub-b — Welle 1 Read-only Consumer:** Import-Swap, keine Behavior-Aenderung. **Self-Review reicht.**
- **Sub-c — Welle 2 Mutation-Consumer:** API-Swap (alte Provider-Methoden → neue Helper). **Reviewer-Agent pflicht** (Money-Path-Behavior-Change).
- **Sub-d — Welle 3 Provider-Delete + Test-Mocks:** Provider-File entfernen, Tree schrumpfen, Test-Mock-Pfade migrieren, AuthProvider-signOut-Check. **Reviewer-Agent pflicht** (Cross-Cutting).

### Begruendung

Slice 152 haette als Big-Bang-Commit 22 non-test + 5 test Files in einem Rutsch aendern muessen. Problem:
1. **Review-Kosten:** Reviewer-Agent muss 20+ verschiedene Aenderungs-Patterns in einem Diff beurteilen → Findings gehen unter.
2. **Rollback-Kosten:** Ein Bug irgendwo → kompletter `git revert` zerstoert auch die sauberen 18 Files.
3. **Deploy-Risiko:** Money-Path-Bug betrifft alle Trading-Flows gleichzeitig → keine partial-Rollback-Option.

Evidenz aus 152c:
- Reviewer-Agent fand 2 HIGH + 1 MEDIUM **genau weil** der Diff nur auf Mutation-Handlern fokussiert war.
- Fix war in 5 Minuten moeglich und wurde inline vor Commit gemacht.
- Big-Bang-Variante haette entweder die Findings verloren oder den Fix-Zyklus ueber 20+ Files treiben muessen.

### Auswirkungen

- **Code:** Slice 152 hat 4 Commits (753e8f83 / 0e10fe12 / a59a7209 / 78c7f409) statt 1.
- **Prozess:** Pattern ist Backlog-Referenz fuer zukuenftige Provider-Eliminationen. Reviewer-Agent-Gate-Regel: pflicht bei Mutation-Sub-Slice (c) + Cross-Cutting-Sub-Slice (d).
- **Team:** Spec-Template fuer Provider-Elimination sollte diese 4-Wellen-Struktur enthalten (Slice 160 Backlog).

### Alternativen erwogen

- **Big-Bang-Commit:** Verworfen (siehe Begruendung oben).
- **2 Sub-Slices (Hook+Consumer als 1, Delete+Tests als 1):** Verworfen — Read-Consumer-Migration (10 Files, triviale Substitution) und Mutation-Consumer-Migration (6 Files, Behavior-Change) haben unterschiedliches Review-Risiko. Zusammenfassen waere falsches Gleichbehandeln.
- **Parallel-Agent-Dispatch:** Akzeptabel fuer Sub-b (Read-only-Substitution), verworfen fuer Sub-c+d (Money-Path braucht sequenzielle Reviewer-Ketten).

### Re-Visit-Trigger

- Bei naechster Provider-Elimination (z.B. Zustand-Store-Migration falls relevant): Pattern anwenden + Retro ob 4 Wellen die richtige Granularitaet sind.

---

## D23 — PROCESS: Ferrari-API-Swap und Ferrari-Struktur-Upgrade in getrennten Slices

**Datum:** 2026-04-23
**Status:** ✅ Aktiv
**Supersedes:** —

### Entscheidung

Wenn ein Consumer von der alten zur neuen Ferrari-Mutation-API migriert, wird **zwei-stufig** refactored:

1. **Stufe 1 — API-Swap (Minimal):** Nur Methoden-Namen-Mapping. `setBalanceCents(x)` → `setWalletBalance(qc, uid, x)`. `refreshBalance()` → `invalidateWallet(qc)`. Keine strukturelle Aenderung. Behavior unchanged.
2. **Stufe 2 — Struktur-Upgrade (Ferrari):** Raw `useMutation` + useRef-Mutex → `useSafeMutation` + `onMutate` + `onError` + `errorToast` + `errorTag`. Echter Optimistic-Update mit Rollback.

Beide Stufen = separate Slices, separate Reviewer-Agent-Gates.

### Begruendung

Slice 152c fasste urspruenglich "alles in einem Rutsch" an (`usePlayerTrading` 15 useStates + 3 useRef-Mutex auf `useSafeMutation` migrieren). Das waere 2-3 Stunden Arbeit und fuer den Reviewer-Agent nicht mehr handhabbar (5 Handler × 4 Lifecycle-Callbacks = 20 Struktur-Aenderungen parallel zum API-Swap).

Entscheidung: Minimal-Swap fuer 152c (30 Min, klar scope'd). Struktur-Upgrade in separatem Slice 153. Vorteile:
- **Review-Fokus:** 152c = "jeder `setBalanceCents` → `setWalletBalance`"-Pattern. Mechanisch pruefbar.
- **Rollback-Kosten:** Wenn Struktur-Upgrade einen Handler falsch migriert (z.B. Missing-Optimistic), ist Money-Path broken. Minimal-Swap hat 0 Behavior-Change-Risiko.
- **Eigenstaendige Begruendung:** Slice 153 hat `usePlayerTrading 15 useStates → 3` als eigenen Value, nicht als Nebeneffekt.

### Auswirkungen

- **Code:** Slice 152c committed als API-Swap (a59a7209). Slice 153 als Nachfolger fuer Struktur-Upgrade geplant.
- **Prozess:** Reviewer-Agent-Briefing fuer "Welle 2"-Slices enthaelt explizit "Struktur-Upgrade ist scope-out, nur API-Swap pruefen". Das verhindert Reviewer-Findings wie "warum kein onMutate?" bei API-Swap-Slices.
- **Team:** Spec-Template fuer Consumer-Migration dokumentiert die 2-Stufen-Trennung.

### Alternativen erwogen

- **Alles in einem Slice (Ferrari-extended):** Verworfen — 2-3 Stunden, Review unhandhabbar, hoeheres Rollback-Risiko.
- **API-Swap skippen, direkt Struktur-Upgrade:** Verworfen — alter Provider-Export kann nicht parallel zum neuen Hook existieren ohne Runtime-Crash. API-Swap-Zwischenschritt ist noetig fuer sauberen Provider-Delete in Welle 3.
- **Kein Struktur-Upgrade, nur API-Swap permanent:** Verworfen — raw useMutation ohne onMutate/onError bleibt Nicht-Ferrari. Eventual-Migration auf Ferrari-Blueprint (D21) ist Pflicht.

### Re-Visit-Trigger

- Slice 153 DONE: Retro ob 2-Stufen-Trennung tatsaechlich schneller/sicherer war als Big-Bang-Alternative.
- Falls `usePlayerTrading` Ferrari-Refactor Probleme bringt: Pattern evaluieren.

---

## D24 — PROCESS: Ferrari-Blueprint-Retro nach 6 Slices (Pattern-Codification COMPLETE)

**Datum:** 2026-04-23
**Status:** ✅ Aktiv

### Entscheidung

Nach 6 konsekutiven Ferrari-Slices (153a/b, 156, 157, 158, 159 — total 19 Mutations refactored) ist das Pattern stabil. Kodifizierung komplett abgeschlossen:

- `memory/patterns.md` #28 — Ferrari-Blueprint als Standalone-Pattern mit Blueprint-Referenzen + Scope-Entscheidungen.
- `.claude/rules/common-errors.md` §5 D18 — Piloten-Liste + Stand-per-2026-04-23-Status + patterns.md-Crossref.
- `memory/decisions.md` D21 (ARCHITECTURE) + D22/D23 (PROCESS) bleiben autoritativ fuer "warum" und "wie-im-Detail".

### Begruendung

Reviewer-Agent-Feedback (Slice 159 NIT #1 "mut.mutate vs safeTrigger Blueprint-Stil-Drift") zeigte, dass Pattern **gelernt** aber nicht mehr **reflektiert** werden muss. Codification in `memory/patterns.md` macht es einem frischen Agent (oder Cold-Start-Claude) schneller erschliessbar als D21 (Decision-History) allein. Trennung:

- **decisions.md**: WARUM (Genesis, Abwaegung, Alternativen) — historisch-kontextuell.
- **patterns.md**: WAS/WIE (Copy-Paste-Template, Scope-Entscheidungen) — operational.
- **common-errors.md §5**: WANN/WO-ANGEWANDT (Pilot-Liste, Stand-per-Datum) — discoverability bei Bug-Suche.

### Auswirkungen

- **Fuer Claude:** Bei neuer Mutation-Arbeit zuerst `patterns.md #28` lesen (Copy-Paste-Ready). Falls Historie wichtig: D21 nachschlagen.
- **Fuer Reviewer-Agent:** Briefing kann "gegen patterns.md #28 pruefen" schreiben — klare Rubrik.
- **Open Work (Slice 160+):** Nur noch 2 Admin-Tier-1 (WithdrawalTab, FoundingPassesTab) + 3 Tier-2 (LeaguesSection, AirdropScoreCard, MissionBanner) + 10× Admin-Space. Pattern-Stabilitaet heisst Slice-Groesse kann zurueck auf S/XS (30-45 min pro Datei).

### Alternativen erwogen

- **Nur in decisions.md belassen:** Verworfen — ein neuer Agent muesste durch die ganze D21/D22/D23-Historie lesen, bevor Code kopiert werden kann. Patterns.md fuehrt direkt zum Template.
- **Separate .claude/rules/ferrari.md Datei:** Verworfen — patterns.md ist der etablierte Ort fuer operational-Templates. Rule-Files sind fuer "thou shalt not". Ferrari ist Affirmativ.
- **Jetzt codifizieren vs nach Slice 160/161 warten:** Codification jetzt — wir koennen den Kontext in der aktuellen Session noch frisch einfuegen. Warten heisst Risiko dass nuances vergessen werden.

### Re-Visit-Trigger

- Nach Slice 165: Pattern-Stabilitaet nochmal pruefen. Falls neue Scope-Entscheidung auftaucht (z.B. Streaming-Mutations, Supabase-Realtime-Integration), patterns.md #28 nachziehen.
- Falls ein Reviewer-NIT dreimal dasselbe bemaengelt (z.B. "Optimistic-Scope zu eng"): Decision-Entry dazu machen statt patterns.md mit Ausnahmen zuzumuellen.

---

## D25 — PROCESS: Knowledge-Flywheel als Slice-Chain-Pattern

**Datum:** 2026-04-23
**Status:** ✅ Aktiv
**Supersedes:** —

### Entscheidung

Wenn ein Bug-Fix/Refactor-Slice einen Reviewer-Finding produziert, das eine neue Pattern/Konvention codifiziert, wird die Codification in einem **separaten nachfolgenden Slice** (XS, docs-only) umgesetzt — nicht in-same-slice, nicht Backlog-only.

Session-Evidence 2026-04-23 (9 Slices):
- Slice 159 Ferrari-Batch → Slice 164 Pattern-Konvention-Codification (patterns.md #28 + testing.md useSafeMutation-Test-Patterns)
- Slice 166 Modal-Sweep → Slice 167 Grep-Audit-Scope-Gap-Pattern (common-errors.md §8) + Modal-preventClose-Konvention (patterns.md #28)
- Slice 165 Silent-Cast-Hardening → Slice 168 RPC-Shape-Discriminated-Union-Regel (database.md)

### Begründung

**In-same-slice-Codification** = Scope-Creep. Codification braucht eigene Spec/Review-Disziplin; mit Bug-Fix vermischt wird Proof-Artefakt unklar.

**Backlog-only** = Vergessen. Session 2026-04-23 hatte 3 Reviewer-Findings die codification-wert waren. Wenn nicht in separate Slices umgesetzt, wären sie nach 1-2 Sessions verloren.

**Separate XS-Slice pro Codification** hält:
- Bug-Fix-Slice fokussiert auf tatsächlichen Fix (keine doc-sweeps).
- Codification-Slice klar als docs-only (kein Code-Risk, XS-Größe).
- Knowledge-Flywheel explizit sichtbar im Commit-Log (`fix(...)` → `docs(codification): ...`).

### Auswirkungen

- **Prozess:** Nach jedem PASS-mit-Learnings-Review entscheiden ob Codification separater Slice (XS, 15-45min) oder Backlog. Faustregel: Wenn der gleiche Learning in 2+ Slices schon aufgetaucht ist → unbedingt codifizieren.
- **Commit-Log:** Flywheel-Pattern sichtbar via `refactor(X) → docs(codification)` Chain.
- **Claude als CTO:** Beim Review-Verdict "PASS mit Learnings" explizit fragen: "Codification-Slice jetzt oder Backlog?" — nicht implizit in Backlog werfen.

### Alternativen erwogen

- **In-same-slice-Codification:** Verworfen — vermischt Scope, Proof-Artefakt schwammig, Commit-Log-Intent unklar.
- **Nur Backlog-Eintrag in active.md:** Verworfen — Session-Evidence zeigt dass 3/3 relevante Learnings in dieser Session codifiziert wurden weil Separater Slice explizit angeboten wurde. Backlog-only-Wahrscheinlichkeit für Vergessen hoch.
- **Alle Learnings in 1 Batch-Codification-Slice am Ende:** Verworfen — Codification-Slice wird dann zu groß (z.B. M oder L), verliert XS-Disziplin. Plus: Einzeln codifizierte Patterns sind einfacher cross-referenziert.

### Re-Visit-Trigger

- Falls 2 Codification-Slices in Folge unbeantwortete Reviewer-Findings produzieren: Meta-Pattern prüfen ob Spec-Audit-Methodik angepasst werden muss (siehe D26).
- Falls Codification-Slice-Aufwand >60 min wird: Scope zu groß, in 2 Slices splitten.

---

## D27 — ARCHITECTURE: Idempotency-Infrastructure generisch statt per-RPC inline

- **Datum:** 2026-04-24
- **Status:** Aktiv (Foundation live seit Slice 178)
- **Kontext:** Slice 151c.2 hatte inline-60s-Idempotency-Window in `subscribe_to_club`. Pattern-bekannt aus common-errors.md §2 "Money-RPC Idempotency-Window". Sorare/Socios-Audit Tier A1: systemweit absichern.
- **Entscheidung:** Generische `request_dedup_keys(user_id, dedup_key, response JSONB)` Tabelle + SECURITY DEFINER Helper `check_or_reserve_dedup_key(p_user_id, p_dedup_key, p_ttl_seconds)`. Response-Caching erlaubt idempotent retry-replay mit cached data.
- **Begruendung:** Ad-hoc per-RPC-Implementation bei 5+ Money-RPCs (subscribe_to_club, buy_player_sc, liquidate_player, openMysteryBox, create_offer) = 5× duplicated logic = 5× drift-risk. Generisch als Foundation standardisiert das Pattern.
- **Auswirkungen:** Zukuenftige Money-RPCs erhalten `p_idempotency_key TEXT` Parameter + 3-Line-Integration. Slice 178a ist Pilot, 178c migriert existing inline.
- **Alternativen erwogen:**
  - **Postgres `advisory_lock`**: Verworfen weil nur während Transaction aktiv (nicht retry-safe nach commit).
  - **Redis-Cache**: Verworfen weil Supabase-only (no Redis in stack).
  - **Client-side dedup**: Verworfen weil Network-retry (Mobile-switch) umgeht Client-Guard (Slice 151c.2 Lehre).
- **Re-Visit-Trigger:** Bei >50 RPCs im Money-Path oder wenn per-RPC-cleanup nicht mehr via Cron machbar.

---

## D28 — ARCHITECTURE: DB-Invariants via Trigger + Opt-In GUC fuer legitimierte Bulk-Migrations

- **Datum:** 2026-04-24
- **Status:** ⤳ Konsolidiert in **D39** (generalisiert das Trigger+GUC-Pattern über append-only hinaus). D28 = der append-only-Erstfall, D39 = Kanon für alle Data-Integrity-Invariants. (E0-W2b 2026-06-17)
- **Kontext:** CLAUDE.md-Regel "Trades/Transactions append-only" war nur Doku, nicht enforced. Slice 179 setzt als DB-Invariant: `REVOKE UPDATE, DELETE` von anon/authenticated + BEFORE-Trigger raising exception.
- **Entscheidung:** Trigger pruefen `current_setting('bescout.allow_transactions_mutation', true) = 'true'` → Bypass. Legitimierte Bulk-Migrations setzen `SET LOCAL <guc>` innerhalb Transaction. SET LOCAL = Transaction-scope, nicht Session-scope.
- **Begruendung:** REVOKE allein reicht nicht (SECURITY DEFINER RPCs laufen als postgres). Trigger = defense-in-depth. GUC-Opt-in-Pattern erlaubt legitimierte one-time-backfills ohne Trigger-temporaer-disable/re-enable (zu risky).
- **Auswirkungen:** Pattern uebertragbar auf `trades`, `activity_log`, `audit_log`, zukuenftige `holdings_history` etc. Migration-Template:
  ```sql
  BEGIN;
  SET LOCAL bescout.allow_<table>_mutation = 'true';
  UPDATE public.<table> SET ...;
  COMMIT;
  ```
- **Alternativen erwogen:**
  - **Temporär Trigger DROP/re-CREATE**: Verworfen (zu risky, race-window).
  - **Service_role bypass auto**: Verworfen (RPCs nutzen SECURITY DEFINER = postgres, würde Guard komplett durchlöchern).
  - **Audit-Tabelle statt Append-Only**: Verworfen (erhöht Complexity, Append-Only ist simpler).
- **Re-Visit-Trigger:** Bei echtem Refund-Flow (nicht in V1 geplant).

---

## D29 — PROCESS: Autonomous-Marathon-Session mit CEO-Explicit-Grant

- **Datum:** 2026-04-24
- **Status:** Trial (1 Session durchgefuehrt, 14 Slices)
- **Kontext:** Tier-Plan Slices 174-185 (Sorare/Socios-Audit) enthielt Money-Path-Slices (178, 179). Per CEO-Approval-Matrix: Money = CEO approved vor Code. User-Prompt "voller Zugriff! komm zurück wenn du durch bist" = explicit session-scoped approval.
- **Entscheidung:** Autonomous-Marathon zulaessig bei explicit session-scoped grant. Claude arbeitet Tier-Plan ab mit:
  - Scope-narrowing bei zu grossen Slices (z.B. 180 → nur INV-25-Fix statt alle 33 Services)
  - Self-Review statt Reviewer-Agent bei XS-Slices mit trivialer Pattern-Wiederholung (175c, 185, 179, 178)
  - Reviewer-Agent Pflicht bei S/M-Slices mit Consumer-Impact (175b, 176d, 177)
  - Live-DB-Migrations via mcp__supabase__apply_migration + Post-Apply-Verify
  - Pragmatic Follow-Slice-Markierung statt Scope-Creep (e.g. 178a/b/c/d, 180b)
- **Begruendung:** CEO-Approval-Matrix ist per-Action-Scoped, nicht per-Slice. "Voller Zugriff" = Session-Scope = explicit. Ohne Marathon-Option würde Tier-Plan-Completion über viele Sessions streuen (context-loss, repetitive setup).
- **Auswirkungen:**
  - Next-Session-Handoff kann Marathon-Outcome in 1 active.md Summary lesen (kein 14× Slice-by-Slice catch-up)
  - Pattern fuer zukuenftige Tier-Plan-Abarbeitungen wenn Scope vorher klar (Foundation-Tiers, nicht Feature-Tiers)
- **Alternativen erwogen:**
  - **Slice-by-Slice CEO-approval**: Verworfen weil User explicit "komm zurueck wenn du durch bist" gesagt hat = full-marathon-intent.
  - **Only-non-money Marathon**: Verworfen weil 178+179 kernstuecke des Audits sind, ohne die der Tier-Plan unvollstaendig.
- **Re-Visit-Trigger:** Wenn post-Marathon-Review Quality-Issues findet die durch Slice-by-Slice-Pause gefangen worden waeren.

---

## D26 — PROCESS: Reviewer-Agent als Scope-Gap-Catcher etabliert

**Datum:** 2026-04-23
**Status:** ✅ Aktiv
**Supersedes:** —

### Entscheidung

Cold-Context-Reviewer-Agent wird bei **Sweep-/Pattern-Migration-Slices** explizit als zweite Audit-Iteration eingesetzt — mit Auftrag, Spec-behauptete "Scope komplett"-Claims gegen eigenen Grep-Pattern zu verifizieren.

Session-Evidence (Slice 166 Modal-preventClose-Sweep):
- Primary Top-Level-Grep fand 7/13 Modals (Spec-Scope)
- Reviewer-Agent fand zusätzliche 6/13 (46% ROI) via embedded-Component-Cross-Ref
- Ohne Reviewer wären 6 Safety-Fixes inkl. 1 Money-Pfad (OfferModal) übersehen worden

### Begründung

**Primary-Claude Audit-Pattern hat Blind-Spot** bei embedded Sub-Components:
- `grep "<Modal" src/components/` listet Files, aber Cards/Tabs mit eingebetteten Modals werden übersehen wenn der Scan auf Top-Level-Container fokussiert.
- Cross-Ref mit Mutation-State-Pattern (Cards mit `loading`/`isPending`/`submitting`) fehlt.

**Cold-Context-Reviewer** hat strukturellen Vorteil:
- Kein Anker an bereits gesehenem Scope.
- Liest Spec mit Skeptiker-Brille "welche Modals hat Primary verpasst?"
- Kann eigenen Grep-Pattern erfinden (recursive + cross-ref).

**Nicht für jedes Slice pflicht** — nur bei Sweep-Patterns mit "alle X mit Y finden"-Scope.

### Auswirkungen

- **Prozess:** Bei Sweep-Slices (Pattern-Migration, Dead-Code-Entfernung, API-Consumer-Updates) expliziter Reviewer-Prompt: "Prüfe ob Spec-Audit alle Targets gefunden hat — nutze eigenen Grep-Pattern als Cross-Ref."
- **common-errors.md §8** codifiziert das "Grep-Audit-Scope-Gap"-Pattern (Slice 167 Codification) — Audit-Command-Template dort.
- **Slice-Size-Kalkulation:** Sweep-Slices sollten +20-30% Buffer für Scope-Gap-Fixes nach Reviewer einplanen. Slice 166 plante 7 Fixes, lieferte 13.

### Alternativen erwogen

- **Immer Reviewer bei jedem Slice:** Verworfen — ROI ist bei Single-Feature-Slice niedrig (Primary hat dort klaren Scope). Bei Sweep-Slices ist ROI 46% (Slice 166 Evidence).
- **Primary macht zweiten Grep-Pass selbst:** Verworfen — Anchoring-Bias. Primary hat bereits mentales Modell vom Scope, sieht nur was reinpasst. Cold-Context-Second-Iteration ist strukturell besser.
- **Reviewer nur retrospektiv (nach Commit):** Verworfen — Scope-Gaps müssen in-slice gefixt werden (sonst separates 166b-Slice nötig). Pre-Commit-Review ist der richtige Gate.

### Re-Visit-Trigger

- Falls Reviewer-ROI bei Sweep-Slices unter 10% fällt: Primary-Audit-Methodik ist besser geworden, Reviewer-Iteration optional.
- Falls Reviewer-ROI über 60% bei 3+ Slices: Primary-Audit-Methodik ist schlechter geworden, Audit-Template-Review nötig.

---

## D30 — ARCHITECTURE: useSafeIdempotentMutation als Money-Path Standard-Primitive

**Datum:** 2026-04-24
**Status:** ✅ Aktiv
**Supersedes:** Extends D17 (useSafeMutation) fuer Money-Path-Subset

### Entscheidung

Money-Path-Mutations nutzen **`useSafeIdempotentMutation`** (Composition ueber `useSafeMutation`) mit `idempotencyNamespace` + `mutationFn: (vars, key) => service(..., key)`. Plain-async-Handler (fire-and-forget) nutzen `newIdempotencyKey('namespace')` inline.

Rollout in Session 2026-04-24: 6 Money-Path Call-Sites (useBuyFromMarket, usePlaceBuyOrder, usePlayerTrading buy/sell, MembershipSection, useHomeData.openMB, missions/page.openMB, useAdminPlayersState.liquidate) + 8 Server-RPCs (178a/c/e-a..e).

### Begründung

- **D27 (generic Idempotency-Infrastructure)** lieferte Server-Side Foundation — ohne Client-Side Auto-Key bleibt Wert ungenutzt.
- Hook-Composition gewinnt gegen optional-flag-Sprawl im Base-Hook.
- Auto-managed key-lifecycle (persist waehrend in-flight+retry, reset on onSuccess+onError) ist komplex genug um nicht per-caller copy-pastable zu sein.
- Plain-async-Pfad (`newIdempotencyKey()` direkt) bleibt fuer Callers ohne React-Query-Mutation (z.B. openMysteryBox handler, handleLiquidate).

### Auswirkungen

- **Code:** neu `src/lib/idempotency.ts` + `src/lib/hooks/useSafeIdempotentMutation.ts`. Rules-Referenz in `errors-db.md` Money-RPC Idempotency-Blueprint.
- **Tests:** Call-Site-Test-Assertions erweitert um `expect.stringMatching(/^namespace:/)` fuer key-pass-through.
- **Pattern-Replikation:** Weitere Money-RPC-Integrationen (buyFromIpo, cancelBuyOrder, cancelOrder falls gewuenscht) folgen demselben Pattern.

### Alternativen erwogen

- **Per-Caller `useRef<string>`-Management:** Verworfen — zu viel Disziplin-Last auf Consumers, key-lifecycle-Bugs wahrscheinlich.
- **Integriert in `useSafeMutation`:** Verworfen — nicht alle Mutations brauchen Idempotency (pure Reads, Client-State-only). Flag-Sprawl.
- **Key-Generation im Service-Layer:** Verworfen — Service-Layer weiss nicht ob Mutation `isRetry` vs. fresh-attempt. Hook hat besseren Lifecycle-Kontext.

### Re-Visit-Trigger
- Falls >3 Money-RPCs ohne Idempotency-Integration in Prod driften: Namespacing-Convention pruefen.
- Falls Client-Side-Key-Collision beobachtet wird: UUID-Fallback vs. crypto.randomUUID-Availability pruefen.

---

## D31 — PROCESS: Auto-generated Files mit Merge-Markern (nie komplett ueberschreiben)

**Datum:** 2026-04-24
**Status:** ✅ Aktiv
**Supersedes:** Session-Handoff-Hook-Verhalten pre-2026-04-24 (komplettes Overwrite)

### Entscheidung

Hooks die auto-generierte Files pflegen (konkret: `memory/session-handoff.md`, aber Pattern-generell) nutzen **Marker-Block-Merge** statt Full-File-Write:

```
<!-- auto:handoff-start -->
... auto content ...
<!-- auto:handoff-end -->

... manual rich content (untouched) ...
```

awk state-machine (`before → in_block → after`) ersetzt nur den Block zwischen Markern. Migration-Path fuer Bestandsdateien ohne Marker: Auto-Block oben einfuegen, existierender Content darunter.

### Begründung

Historisches Problem (pre-2026-04-24): Session-Handoff-Hook ueberschrieb bei jedem Stop-Event die ganze Datei. Rich-Content (Priority-Queue, DB-Stand, Next-Session-Briefing) war nach jeder Session weg. In Session 2026-04-24 **3× manuell wiederhergestellt** bevor Root-Cause-Fix.

### Auswirkungen

- **`.claude/hooks/session-handoff-auto.sh`** umgebaut (Slice session-handoff-merge-Commit).
- **`errors-infra.md`** dokumentiert Pattern fuer kuenftige Hooks.
- Anwendbar auf: Crash-Recovery-Hook (wenn er auch in gleiche Datei schreibt), zukuenftige Auto-Status-Hooks.

### Alternativen erwogen

- **Separate Auto-Datei (`session-handoff.auto.md`):** Verworfen — Doppelpflege, `MEMORY.md`-Index muesste beide referenzieren.
- **Hook skippt wenn Datei bereits Content hat:** Verworfen — verliert Auto-Status-Updates bei aktivem Handoff.
- **Header-Zeile als Marker (`# Auto-Handoff-Only`):** Verworfen — fragile, User koennte Header unbewusst editieren.

### Re-Visit-Trigger
- Falls Marker-Format mit User-Tooling konfligiert (Obsidian-Rendering, Markdown-Lint): alternative Markers (z.B. Special-Comment-Style) erwaegen.

---

## D32 — PROCESS: Bundle-Budget-Gate in CI (Size-Regression-Prevention)

**Datum:** 2026-04-24
**Status:** ✅ Aktiv

### Entscheidung

`bundle-budget.json` definiert thresholds pro Route + shared-bundle. `scripts/check-bundle-size.ts` parst `next build`-Output, exit 1 bei jeder Route ueber Budget oder shared > threshold. CI-Gate im build-Job (`.github/workflows/ci.yml`): `next build | tee build-output.txt` + `cat | npx tsx scripts/check-bundle-size.ts`.

Baseline 2026-04-24: 162 kB shared, 51 routes tracked, ~10-15 kB Headroom pro critical Route (`/player/[id]` 378/390, `/market` 346/360, `/community` 364/375, etc.).

### Begründung

Bundle-Size-Regressions sind **silent**: `next build` warnt nicht bei +20 kB auf einer Route. Entdeckt wurde nur durch manuelle Bundle-Analyzer-Inspektion nach User-Reports ueber Langsamkeit (historisch: `country-flag-icons` namespace 235 kB, Slice 120).

CI-Gate verhindert Regression vor Merge statt retrospektiv nach Prod-Deploy. Budget-Headroom (~10-15 kB) erlaubt kleine Schwankungen, grosse Spruenge bleiben sichtbar.

### Auswirkungen

- **Neu:** `bundle-budget.json`, `scripts/check-bundle-size.ts`, `pnpm run size` script.
- **CI:** build-Job hat zwei Steps: `next build | tee` + size-check.
- **Budget-Updates:** nur mit Justification (neuer Feature, Performance-Tradeoff). Anil-Review fuer >+20 kB-Updates.
- **`errors-infra.md`** dokumentiert Gate.

### Alternativen erwogen

- **size-limit mit @size-limit/file:** Verworfen — Next.js-Chunks haben dynamische Namen, statische File-Target-Liste bricht bei jedem Chunk-Hash-Change.
- **Manueller Bundle-Analyzer-Run vor Merge:** Verworfen — zu disziplinabhaengig, wird vergessen.
- **Nur shared-bundle-Check, keine per-route-Budgets:** Verworfen — route-level Regressions (z.B. /player/[id] +50 kB durch neuen heavy-chart) waeren unsichtbar.

### Re-Visit-Trigger
- Falls CI-Gate >2× pro Monat gruene PRs falsch-blockt: Budget-Headroom erhoehen oder per-slice-opt-out-Mechanismus erwaegen.
- Falls Bundle-Size systematisch waechst trotz Gate: Per-Chunk-size-limit (Slice 185c) oder bundle-analyzer-artifact-Upload erwaegen.

---

## D33 — PROCESS: common-errors.md Split in Domain-Files (40 KB Regel)

**Datum:** 2026-04-24
**Status:** ✅ Aktiv
**Supersedes:** Single-File `common-errors.md` (55 KB, 720 Zeilen)

### Entscheidung

`.claude/rules/common-errors.md` wird auf **~6 KB Navigator + Section 1 Silent-Fails** reduziert. Domain-spezifische Patterns in:

- `errors-db.md` (~11 KB) — Supabase/Postgres, RPC-Design, Auth/Security, React-Query+Cache
- `errors-frontend.md` (~7 KB) — React/TS/CSS, Modal-Pattern, i18n/Locale
- `errors-infra.md` (~11 KB) — Build/Deploy, Bundle, Hooks, Beta-Launch-Ops
- `errors-scraper.md` (~6 KB) — Transfermarkt, API-Football, HTML-Parsing

Alle Files unter 30 KB (Soft-Ziel < 40 KB, Optimal ~30 KB).

### Begründung

- **Context-Efficiency:** CLAUDE.md laedt rules/ autoloaded. Bei 55 KB Single-File frisst common-errors jede Session unnoetige Tokens.
- **Skip-Rate bei grossen Files:** User-Behavior — lange Rules werden seltener gescrollt, wichtige Patterns verloren im Middle.
- **Domain-Splits reflektieren Use-Case:** DB-Arbeit braucht DB-Patterns, Frontend-Arbeit Frontend-Patterns. Autoload-alle bleibt, Navigator macht Scope klar.
- **Silent-Fails bleiben im Hauptfile:** cross-cutting relevant (trifft DB+Frontend+Scraper), wichtigste Bug-Klasse.

### Auswirkungen

- **Autoload-Impact:** Alle 4 neuen Files werden autoloaded (rules/**/*.md). Gesamt-Content aehnlich, verteilt.
- **Navigation:** Devs + Claude finden Pattern via Navigator-Table in common-errors.md. Querverweise zwischen Splits via relative Pfade.
- **Maintenance:** Neuer Pattern → direkt in richtige Domain-Datei. "Silent-Fails" bleiben Ankerpunkt fuer cross-cutting.

### Alternativen erwogen

- **Aggressive Inline-Pruning (55→30 KB im Single-File):** Verworfen — wichtiges Know-how geht verloren, Maintenance-Load bleibt auf einem File.
- **Split nach Slice-ID-Ranges:** Verworfen — Slice-Historie ist nicht Search-Intent. User sucht "wie fixe ich RPC-Silent-Fail", nicht "was war Slice 160".
- **Markdown-Sections als Multi-File mit automatischem Merge:** Verworfen — Over-engineering, Plain-Splits funktionieren.

### Re-Visit-Trigger
- Falls eines der Splits >25 KB erreicht: weiter splitten (z.B. errors-db.md → errors-db-core.md + errors-db-auth.md).
- Falls common-errors.md Navigator-Section stale wird (2+ Pattern in falscher Datei): Renovation-Slice.

---

## D34 — ARCHITECTURE: Radix UI als Headless-Foundation fuer Dialog/AlertDialog/DropdownMenu

**Datum:** 2026-04-24
**Status:** ✅ Aktiv (Slice 181)
**Supersedes:** Custom-`Modal` + `ConfirmDialog` (bleiben coexistent bis Slice 181h Cleanup)

### Entscheidung

`@radix-ui/react-dialog`, `@radix-ui/react-alert-dialog`, `@radix-ui/react-dropdown-menu` als Foundation einfuehren. Drei Wrapper in `src/components/ui/`:

- **Dialog.tsx** — Drop-in API zu altem Modal (1:1 Props)
- **AlertDialog.tsx** — Drop-in API zu altem ConfirmDialog (1:1 Props)
- **DropdownMenu.tsx** — Compound API (Radix-idiomatisch, kein Vorgaenger im Code)

Migration der 48 Modal-Konsumenten + 2 ConfirmDialog-Konsumenten ueber Folge-Slices 181b-h (siehe `worklog/specs/181b-radix-migration-plan.md`).

### Begründung

- **A11y aus der Box:** Korrekte ARIA-Roles (dialog, alertdialog, menu), robust focus-trap (react-focus-scope), focus-restore aufs Trigger-Element, Screen-Reader-Announcements via DialogTitle.
- **Code-Reduktion:** Custom-Modal hatte ~150 LoC fuer ESC + scroll-lock + focus-trap manuell. Radix loest das + bessere Edge-Cases.
- **Industry-Standard:** Radix ist de-facto-Standard fuer Headless-UI in Next.js-Projekten. Onboarding neuer Devs einfacher.
- **Drop-in API minimiert Migration-Risiko:** Folge-Slices sind Import-Renames, nicht Strukturaenderungen.

### Auswirkungen

- **Bundle:** Per-Route +14-21 kB (NICHT shared chunk wie initial vermutet — Webpack tree-shaket Radix in Pilot-Sites lokal). Bundle-Budget per-Route +25 kB Headroom dokumentiert.
- **Tests:** `src/test-utils/radix-mocks.ts` als shared factory-mock-helper. 48 Folge-Migrations nutzen es konsistent.
- **Animations:** Erforderte Tailwind-Fix (`@layer utilities` Wrap fuer `anim-*`-Klassen, sonst keine `data-[state=open]:`-Variants generiert) — siehe errors-frontend.md Pattern.
- **Pattern-Asymmetrie AlertDialog Action:** Bewusst plain `<Button>` statt `RadixAlert.Action` weil Action implizit closed → race mit async onConfirm. Cancel via `RadixAlert.Cancel asChild` ist OK weil Cancel = sofort-close.

### Alternativen erwogen

- **Custom-Modal weiter ausbauen:** Verworfen — A11y ist hard-to-get-right manuell, Code-Maintenance hoch.
- **Radix Themes (vorgefertigte styled Components):** Verworfen — loest unser Design-Token-System auf, Inkompatibel mit BeScout-Dark-Mode-Theming.
- **Headless UI (Tailwind Labs):** Verworfen — kleinerer Featureset, keine AlertDialog/DropdownMenu Primitives.
- **Big-Bang-Migration aller 48 Sites in 181:** Verworfen — Risk zu hoch (Money-Path-Modals dabei). Pilot + gradual rollout via 181b-h.

### Re-Visit-Trigger
- Falls Bundle-Impact pro Route ueber 30 kB steigt nach 181e Trading-Migration: Optimization-Slice (selektives Lazy-Import von Radix-Internals).
- Falls Radix v2 Breaking-Changes bringt: Migration-Window planen.
- Falls 5+ neue Primitives nach 181 hinzugefuegt werden (Tooltip, Popover, Select, Tabs, Toast): zentrale Theming-Schicht (z.B. shadcn-style Theme-File) statt per-Wrapper-Styling.

---

## D35 — PROCESS: Mechanical-Pattern-Slices duerfen Self-Review nutzen nach 2+ erfolgreichen Pattern-Iterations

**Datum:** 2026-04-24
**Status:** ✅ Aktiv
**Supersedes:** —

### Entscheidung

Bei Slices die **identisches Pattern** wiederholen das in mindestens 2 vorherigen Slices durch Cold-Context-Reviewer erfolgreich PASS-validiert wurde, darf Primary-Claude **Self-Review** in `worklog/reviews/<slice>-review.md` schreiben statt reviewer-Agent zu dispatchen.

Bedingungen:
- Pattern ist mechanisch (z.B. Import-Rename + JSX-Rename + Test-Mock-Rename — nichts neues)
- Keine Logic-Aenderung, keine neuen Edge-Cases, keine API-Drift
- 2+ Slices mit gleichem Pattern hatten Cold-Context-Review = PASS
- Self-Review-Doc dokumentiert Pattern-Wiederholung explizit
- ship-cto-review-gate-Hook akzeptiert File-Existence (Content reviewer-agnostic)

### Begründung

- **Reviewer-Cost:** Cold-Context-Reviewer braucht 30-40 min, $$, viel Output. Bei mechanischer Wiederholung ist das verschwendet.
- **False-Positive-Rate hoch:** Reviewer flaggt manchmal HIGH "fehlende Spec-Datei im Worktree" obwohl File in main existiert (Slice 181 Beispiel) — Noise.
- **Pattern-Validation ist additive:** Wenn Iteration 1+2 PASSed haben, ist Iteration 3 nicht riskanter als Iteration 2.
- **Belt-and-Suspenders weiterhin aktiv:** tsc + vitest + Bundle-Gate + Pre-Commit-Hooks.
- **Bei NEUEM Pattern-Element:** Reviewer-Pflicht zurueck (z.B. wenn Migration auf Money-Path Trading-Modal trifft → 181e bekommt qa-visual statt Self-Review).

### Auswirkungen

- **Slice 181b/c/d:** Self-Review angewandt nach 181 (Pilot, Cold-Context-Review) + 181b (Self) + 181c (Self).
- **Slice 181e (Trading):** Reviewer + qa-visual zurueck (HIGH-risk, neuer Risiko-Aspekt: Money-Path Visual-Regression).
- **Hook-Update nicht noetig:** ship-cto-review-gate prueft File-Existence, nicht Reviewer-Authorship.
- **Speed-Gewinn:** 4 Slices in 1 Session (181/b/c/d) statt 4 Sessions mit Reviewer-Roundtrip.

### Alternativen erwogen

- **Reviewer-Pflicht fuer ALLE Slices:** Verworfen — over-validation bei mechanischer Wiederholung, blockt Velocity unnoetig.
- **Reviewer skip ohne Self-Review-Doc:** Verworfen — verletzt ship-cto-review-gate, hinterlaesst Audit-Luecke.
- **Reviewer NUR fuer L-Slices:** Verworfen — L vs M ist scope-Groesse, nicht Risk. 181b ist L (11 Files) aber low-risk.
- **Healer-Agent statt Self-Review fuer Mechanical-Slices:** Verworfen — Healer fixed Bugs, hier gibts keine zu fixen.

### Re-Visit-Trigger
- Falls Self-Reviewed Slice einen Production-Bug erzeugt: Self-Review-Pattern revertieren, Reviewer-Pflicht fuer ALLE Slices ab dann.
- Falls Reviewer-Agent Cost/Speed deutlich verbessert (z.B. Caching) — Reviewer wieder default.

---

## D36 — PROCESS: Vercel-Deploy-Health-Check nach Push (Silent-Build-Fail-Detection)

**Datum:** 2026-04-24
**Status:** ✅ Aktiv
**Supersedes:** —

### Entscheidung

Nach jedem `git push origin main` muss innerhalb 3 Minuten via `mcp__vercel__list_deployments` verifiziert werden, dass der neueste Commit als Deployment listet. Wenn Vercel-List die letzten Commits NICHT enthält: **Silent-Build-Fail vermuten** und SOFORT `vercel deploy --prod --yes` foreground laufen lassen, um den echten Fehler zu sehen.

Trigger-Bedingung:
- Eine komplette Session (8+ Commits, 4+ Stunden) ohne Auto-Deploy-Output auf Vercel → Plan-Downgrade oder Webhook-Drop vermuten
- Auto-Deploys funktionieren laut Vercel-MCP seit X Stunden nicht → NICHT weiter pushen bis Ursache gefunden

### Begründung

In Session 2026-04-24 waren **17 Commits silent blockiert** seit 15:41 UTC weil `dedup-cleanup` cron `0 * * * *` (hourly) auf Hobby-Tier rejected wurde. Jede `git push` hat den Webhook getriggert, Vercel hat Build started, der Build validiert `vercel.json`, Fail mit Message „Hobby accounts are limited to daily cron jobs" — aber **keine Notification irgendwo**. GitHub Action sah Commit, Vercel-Dashboard hatte failed-builds, aber nichts hat eskaliert.

Fix-Zeit nach Discovery: 2 min (cron-Schedule auf daily, manual deploy). **Discovery-Zeit ohne Protokoll: 30 min** (MCP-Rumsucherei, API-Call, Log-Inspektion). Health-Check nach Push hätte das sofort gefangen.

### Auswirkungen

- **Post-Push-Protokoll:** Neue Routine — nach `git push` immer `mcp__vercel__list_deployments` mit `since: <push-timestamp>` checken. Wenn 0 Results nach 2-3 min: `vercel deploy --prod --yes` manuell triggern um die echte Fehlermeldung zu sehen.
- **Rules-Update:** `.claude/rules/errors-infra.md` kriegt Vercel-Hobby-Cron-Pattern (parallel zu dieser Decision).
- **CI-Gate möglich (Optional Slice):** GHA-Workflow der post-push-deploy-status nach 5 min überwacht und failed bei MISSING-Deploy.

### Alternativen erwogen

- **Manuelle Vercel-Dashboard-Check:** Verworfen — unreliable, nicht in Claude's Loop.
- **GHA-Webhook `deployment_status` watch (existiert bereits für Smoke):** Verworfen als alleinige Lösung — triggered nur bei `success`-events, nicht bei silent-fail WITH NO DEPLOYMENT CREATED at all.
- **Vercel-Pro-Plan immer zahlen:** CEO-Entscheidung — auch mit Pro können Webhooks droppen (Slice 140 cron-gaps als Präzedenzfall).

### Re-Visit-Trigger
- Falls Vercel je ein Notification-System für build-config-rejections einführt (z.B. E-Mail bei Hobby-Plan-Limit-Breach) → Protokoll vereinfachen.
- Falls CI-Gate implementiert ist (GHA watcher) → manuelles Probing optional.

---

## D37 — PROCESS: Re-Audit-Grep vor Component-Deletion-Slices (Cleanup-Gap-Catch)

**Datum:** 2026-04-24
**Status:** ✅ Aktiv
**Supersedes:** —

### Entscheidung

Bevor ein Component, Hook, Type, Service oder UI-Primitive aus `src/` gelöscht wird, ist ein finaler Re-Audit-Grep über alle Import-Pfade Pflicht. Das gilt auch wenn der Primary-Plan explizit alle bekannten Call-Sites auflistet — weil Cleanup-Slices oft 46× validiertes Pattern wiederholen und man daher dazu neigt die Restliste als komplett zu betrachten.

Template-Grep:
```bash
grep -rn "import.*\b<Component>\b.*from ['\"]@/<path>" src/
# Erwartung: 0 matches VOR Deletion
```

Wenn Treffer > 0: **Stop, diese Files zuerst migrieren**, Deletion-Slice pausieren. Wenn Deletion-Slice trotzdem läuft → Build-bruch garantiert.

### Begründung

Slice 181h (Modal + ConfirmDialog Cleanup):
- Primary-Plan: nur EventDetailModal (181f) + fine
- Re-Audit-Grep: fand **2 zusätzliche Files** (PlayerDetailModal.tsx Manager + EventSelector.tsx Manager-Aufstellen) die nicht im Plan standen
- Ohne Re-Audit: `Modal` aus index.tsx removen → diese 2 Files hätten `import { Modal } from '@/components/ui'` → Build-Error auf Prod

Pattern-Referenz: `errors-infra.md` Slice 166 (Grep-Audit-Scope-Gap bei Sub-Component-Scan — 46% zusätzliche Files gefunden durch Gap-Audit).

### Auswirkungen

- **Post-Migration, Pre-Deletion Audit:** Standard-Step in Cleanup-Slices. Findings in Slice-Proof dokumentieren („Re-Audit Gap-Catch: N zusätzliche Files migriert bevor Deletion").
- **Spec-Template für Cleanup-Slices:** Expliziter Re-Audit-Step in Stage-Chain vor BUILD (oder am BUILD-Ende).
- **Applies auch für:** Hook-Removal, Type-Removal, Service-Removal, Feature-Flag-Removal.

### Alternativen erwogen

- **Primary-Plan exhaustive machen:** Verworfen — Cleanup-Slices leben von „46× validiert, trivial" Velocity-Erwartung. Exhaustive-Planning macht jeden Cleanup zum L-Scope.
- **Deletion ohne Audit (Trust the Plan):** Verworfen — 181h Szenario zeigt: 22% Gap-Catch-Rate reicht zum Build-Bruch.
- **Reviewer-Agent exklusiv:** Verworfen — Reviewer kann Re-Audit machen aber Cold-Context hat weniger Signal als einfacher Grep.

### Re-Visit-Trigger
- Falls grep-basierter Re-Audit je einen Silent-Miss hat (z.B. dynamic-imports, barrel-re-exports) → Audit-Tool upgraden (ts-morph, ripgrep-JSON mit AST).

---

## D38 — ARCHITECTURE: Data-Cleanup via Supabase MCP statt Migration fuer non-schema-changes

**Datum:** 2026-04-24
**Status:** ✅ Aktiv
**Supersedes:** —

### Entscheidung

Für Data-Integrity-Cleanups (Invariant-Repair, Ghost-Row-Orphaning, Stale-Flag-Update, Order-Expiration), die **nur Live-DB-State ändern ohne Schema-Change**, nutzen wir direkt `mcp__supabase__execute_sql` statt Migration-File zu schreiben.

Regeln:
- **Schema-Change (DDL, neue Tabellen, neue RPCs):** Migration Pflicht (`mcp__supabase__apply_migration`).
- **Data-Change (UPDATE, DELETE auf existing rows):** MCP-Execute in Slice-Proof dokumentieren, kein Migration-File.
- **Money-Path Data-Change:** Nur via existierende SECURITY DEFINER RPC (z.B. `expire_pending_orders`) — niemals raw UPDATE auf `wallets`, `transactions`, `orders`.
- **Proof-Pflicht:** Jede Query (Before-Count, UPDATE, After-Count) in `worklog/proofs/<slice>.md` verbatim + 0-Violations Verify + vitest RED→GREEN.

### Begründung

Slice 187 (5 pre-existing Invariants → 0):
- 0 Code-Änderungen im Repo
- 5 gezielte UPDATEs via MCP + 1 RPC-Call
- Verify via Live-DB-Count + vitest 44/44 grün
- Proof + Review dokumentiert (reproducible via Queries)

Migration hätte 5 separate Files erfordert, keine davon würde nach erstmaligem Apply je wieder laufen (idempotent trivial weil UPDATE mit Filter). File-Noise + Registry-Drift-Risiko ohne Nutzen.

Gegenargument: „Migration als Audit-Trail". Counter: Git-Log + Proof-File sind Audit-Trail genug, MCP-Calls sind loggenbar via Supabase-Edge-Logs.

### Auswirkungen

- **Slice-Classification:** Data-Cleanup-Slices bekommen Stage-Chain SPEC → IMPACT `skipped (data-only)` → BUILD (DB-State-Change via MCP) → REVIEW → PROVE → LOG.
- **Proof-Template:** Before-Counts + SQL-Queries + After-Counts + vitest.
- **Money-Path-Guard:** `UPDATE wallets|transactions|orders` niemals raw — immer RPC. Pre-Commit-Grep möglich als CI-Check.
- **Recurring Data-Issues:** Falls ein Invariant-Violation regelmäßig auftritt → ursprünglicher Bug (z.B. sync-players-daily Ghost-Prevention) muss als Code-Fix gemacht werden, Cleanup-Slice ist nur Symptom-Behandlung.

### Alternativen erwogen

- **Migration pro Data-Cleanup:** Verworfen — File-Noise, Registry-Entries für Einmal-Aktionen, kein Re-Run-Wert.
- **Direct-SQL-Editor (Supabase-Dashboard):** Verworfen — nicht in Claude's Workflow, kein Audit-Trail im Repo.
- **Admin-UI-Buttons für Cleanups:** Verworfen — Over-Engineering, CEO könnte versehentlich Money-Path-Daten touchen.

### Re-Visit-Trigger
- Falls Data-Cleanups sich wiederholen (gleicher Invariant 2+ mal in 30 Tagen gebrochen) → Code-Fix für Root-Cause Pflicht, Cleanup-Protokoll dokumentiert es als Symptom-Indicator.
- Falls Supabase MCP je entfernt wird → Fallback auf Migration-Files.

---

## D39 — ARCHITECTURE: Trigger+GUC-Pattern als Standard für DB-Level Data-Integrity-Invariants

**Datum:** 2026-04-24
**Status:** ✅ Aktiv (Kanon für Trigger+GUC-Invariants)
**Supersedes:** **D28** (generalisiert dessen append-only-Pattern auf alle Data-Integrity-Invariants — D28 bleibt als Erstfall-Doku)

### Entscheidung

Das **Trigger-Function + GUC-Escape-Pattern** (etabliert in D28 für `transactions` append-only) ist ab sofort **Standard für alle DB-Level Data-Integrity-Invariants**, bei denen:

1. Die Invariant-Verletzung sonst durch mehrere Code-Pfade unabhängig eingeführt werden könnte (Scripts, Crons, RPCs, manuelle SQL)
2. Eine reine Code-Guard-Lösung fragil wäre (neue Call-Sites = neue Gap-Kandidaten)
3. Legitime Bulk-Imports/Migrations trotzdem möglich sein müssen

**Template:**

```sql
CREATE OR REPLACE FUNCTION public.prevent_<invariant_violation>()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  -- 1. Escape-Hatch (D28-Pattern)
  IF current_setting('bescout.allow_<feature>', true) = 'true' THEN
    RETURN NEW;
  END IF;

  -- 2. NULL-Guards: skip if data incomplete
  IF NEW.critical_field IS NULL THEN RETURN NEW; END IF;

  -- 3. Invariant-Check(s) mit RAISE EXCEPTION
  IF <violation_condition> THEN
    RAISE EXCEPTION '<invariant_key>: <human msg>'
      USING ERRCODE = 'unique_violation';
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS <trigger_name> ON public.<table>;
CREATE TRIGGER <trigger_name>
  BEFORE <INSERT|UPDATE|DELETE> ON public.<table>
  FOR EACH ROW
  EXECUTE FUNCTION public.prevent_<invariant_violation>();

COMMENT ON FUNCTION public.prevent_<invariant_violation>() IS
  'Slice <N>: <purpose>. Bypass: SET LOCAL bescout.allow_<feature> = true.';
```

**Bulk-Import-Bypass (Session-Pattern):**

```sql
BEGIN;
SET LOCAL bescout.allow_<feature> = 'true';
-- ... legitimate bulk-work ...
COMMIT;
```

### Begründung

**Empirische Validierung (2 Iterationen):**

| Slice | Invariant | Trigger | GUC |
|-------|-----------|---------|-----|
| 179 (D28) | transactions append-only | BEFORE UPDATE/DELETE | `bescout.allow_transactions_mutation` |
| 189 (heute) | players ghost-row-prevention | BEFORE INSERT | `bescout.allow_player_ghost_insert` |

Beide Trigger verhalten sich stabil, erwischen alle Insert/Update/Delete-Pfade, und erlauben kontrollierten Bypass für Bulk-Migrations. Pattern ist reproduzierbar genug für Copy-Paste-Template.

**Warum kein reines Code-Guard:**

Code-Guards (z.B. Pre-Check in Service-Layer) hätten diese strukturelle Schwäche:
- Neue Call-Site entstanden = neue Gap (siehe Slice 189 Ghost-Quellen: 3 verschiedene manuelle Scripts)
- Raw SQL via MCP oder psql umgeht Code-Guards komplett
- Tests müssten für jeden Call-Site neu durchlaufen werden

**Warum GUC statt Trigger-DROP für Bulk-Imports:**

D28-Analyse: Temporäres Trigger-DROP + Re-CREATE öffnet Race-Window für andere concurrent Writes. GUC (`SET LOCAL`) ist transaction-scoped und thread-safe ohne DDL-Overhead.

### Auswirkungen

- **Code:** Pattern-Referenz in `.claude/rules/errors-db.md` + `memory/patterns.md` dokumentieren (Follow-up-XS-Slice).
- **Prozess:** Bei künftigen Data-Integrity-Anforderungen zuerst fragen: "Kann das via Trigger+GUC abgebildet werden?" bevor Code-Guards überlegt werden.
- **Migration-Template:** REVOKE/GRANT nicht nötig für Trigger-Functions (per database.md Ausnahme). Dafür: COMMENT ON FUNCTION pflicht.
- **Test-Pattern:** 4-Test-Suite etabliert (same-class violation, cross-class violation, positive-case, GUC-bypass).
- **Bekannte Kandidaten:** `trades` (append-only analog transactions), `activity_log` (append-only), künftige `holdings_history`, `audit_log` — alle geeignet für Trigger+GUC.

### Alternativen erwogen

- **Pure CHECK-Constraints:** Verworfen — CHECK kann nicht auf andere Rows (SELECT EXISTS) referenzieren, nur auf eigene Tuple-Fields. Cross-Row-Invariants brauchen Trigger.
- **DEFERRABLE CONSTRAINTS + DEFERRED check:** Verworfen — komplex, schlechter UX bei Fehler (Error erst bei COMMIT), keine Escape-Hatch.
- **RLS-Policies mit custom check-functions:** Verworfen — RLS prüft wer zugreifen darf, nicht welche Daten-Konstellationen legitim sind. Wrong layer.
- **Application-Layer-Guards in Service-Functions:** Verworfen — siehe Begründung oben. Gap-Risk hoch.
- **Materialized Views mit UNIQUE INDEX:** Verworfen — refresh-latency, kein Pre-Insert-Block, Performance-Overhead.

### Re-Visit-Trigger

- Wenn 3+ Slices denselben GUC-Namespace nutzen müssen: Namensraum-Convention dokumentieren (z.B. `bescout.allow_<domain>_<op>`).
- Wenn Trigger-Performance je Bottleneck wird (unlikely bei BEFORE-Row-Triggern mit EXISTS-Subqueries): Partial-Index zur Beschleunigung.
- Wenn GUC-Audit-Log gewünscht: separater Slice (optional Follow-up aus Slice 189 Review).

---

## D40 — PROCESS: Live-Verify mit Chrome-DevTools-MCP statt Hypothesen-Debugging

**Datum:** 2026-04-24
**Status:** ✅ Aktiv

### Entscheidung

Bei Bug-Reports mit visuellem Symptom (Anil-Screenshots, "X funktioniert nicht") ist die **erste** Aktion **Chrome-DevTools-MCP-Live-Inspection**, nicht Hypothesen-Bildung aus Code-Reading.

### Begründung (Slice 192-Lehre)

Bei Slice 192 hatte ich initial Auth-Race als Hypothese aus Console-Warnings (`get_auth_state RPC slow > 10s timeout`). Live-Network-Trace via Chrome-DevTools-MCP zeigte: RPC liefert in 154ms server-time. **Hypothese widerlegt nach 30 Sekunden Live-Inspection** statt 30 min Code-Lesung.

Konkrete Signale die Live-Inspection liefert:
- `x-envoy-upstream-service-time` = echte RPC-Performance (Server-Side)
- DOM-Pattern-Match (z.B. `#0 MID 0 CR 1/1 SC 0S 0T 0A` = 7-feldige Mapper-Default-Signature)
- Network-Request-Sequenz (parallel vs sequenziell)
- Console-Errors mit Stack-Trace
- Render-State (was tatsächlich im DOM steht)

### Auswirkungen

- **Workflow:** Bei Bug-Reports zuerst `chrome-devtools-mcp` aufrufen, navigieren, snapshot, list_console_messages, get_network_request — VOR Code-Reading
- **Reviewer-Briefings:** Reviewer-Agent-Prompts erwähnen explizit "lies Live-Network-Trace falls vorhanden"
- **Bug-Pattern-Codification:** Symptom-zu-Code-Backtrack-Tabellen in `common-errors.md` (Slice 192-Tabelle als Vorlage)

### Alternativen erwogen

- **Sentry Issue-Stream:** Nur post-mortem, kein Live-State.
- **Playwright-Screenshot-only:** Zeigt nur Pixel, nicht DOM-Struktur, Network, Console.
- **Code-Hypothese + Spec-Reading:** Long-cycle, fehleranfällig (siehe Slice 192 erste Hypothese).

---

## D41 — ARCHITECTURE: Defense-in-Depth-Pattern für Silent-Fails (4-Layer-Standard)

**Datum:** 2026-04-24
**Status:** ✅ Aktiv

### Entscheidung

Bei Silent-Fail-Klassen (Mapper-Defaults überdecken NULL, RPC-Cast lügt, Race-Conditions) ist **Defense-in-Depth mit 4 Layern Pflicht-Standard**, nicht single-point-fix.

**Template:**

```
Layer 1: Type-Truth         — Service-Type matched RPC-Return-Shape (kein lügender Cast)
Layer 2: Service-Filter     — Service filtert kaputte Daten + logSilentCatch
Layer 3: Mapper-Throw       — Mapper wirft i18n-key statt silent-default
Layer 4: Tests              — Unit-Tests für jeden Layer-Branch
```

### Begründung (Slice 192 + 193)

Slice 192 zeigt das Pattern: Symptom (Ghost-Rows) entstand durch **3 sich überdeckende Silent-Fails**:
1. Mapper applizierte Defaults bei `h.player == null`
2. Service akzeptierte data-array ohne Validation
3. Type-Cast `as HoldingWithPlayer[]` log über RPC-Shape

Single-Layer-Fix (z.B. nur Mapper-Throw) hätte CRITICAL Cache-Priming-Pfad gecrasht (Reviewer Finding #1). Erst 4-Layer-Defense + Auth-Gate (Slice 193) eliminiert die Klasse vollständig.

### Auswirkungen

- **Code:** Pattern dokumentiert in `memory/patterns.md` (Pattern-Reference + Slice-192/193-Beispiel)
- **Review-Checkliste:** Reviewer-Agent prüft bei Silent-Fail-Fixes: sind alle 4 Layer gebaut?
- **Service-Layer-Convention:** Bei jeder neuen RPC-konsumierenden Service-Function: Type-Truth + Filter + Throw-on-Invalid + Tests pflicht (Refactor existing services as we touch them)

### Alternativen erwogen

- **Single-Layer (Mapper-Throw only):** Verworfen — Reviewer Finding #1 zeigt Hard-Crash-Risk wenn andere Cache-Pfade unbeobachtet bleiben.
- **Validation-Library (zod, yup):** Verworfen — Performance-Overhead bei jedem Hot-Path-Call. Manueller Discriminator-Check ist schlank.
- **Sentry-Sampling-only:** Verworfen — Catches symptom, not cause. Defense-in-Depth verhindert Symptom überhaupt.

### Re-Visit-Trigger

Wenn nach 5+ Slice-Anwendungen ein 5. oder 6. Layer sich wiederholt einschleicht (z.B. "Hook-Catch in useFantasyHoldings"): Pattern auf 5-Layer erweitern.

---

## D42 — PROCESS: Reviewer-Agent Critical-Findings sind Pre-Merge-Pflicht

**Datum:** 2026-04-24
**Status:** ✅ Aktiv
**Supersedes:** Implizite Praxis "PASS oder REWORK ohne Verbindlichkeit"

### Entscheidung

Reviewer-Agent-Output mit **CRITICAL-Severity-Finding** blockiert Merge. Primary-Claude muss Finding fixen + Review-File aktualisieren mit Status `addressed`, **vor** Commit.

### Begründung (Slice 192 Beispiel)

Reviewer-Agent fand **Finding #1 CRITICAL** — `primeMarketDashboardCaches` schreibt `DbHolding[]` (ohne nested `player`) in `qk.holdings.byUser` Cache. Mit Slice-192 Mapper-Throw wäre `/market → /fantasy/aufstellen` Hard-Crash gewesen. Wäre dieser Finding unaddressed gemerged worden, hätte das den User-facing Bug von "Geister-Rows" zu "Whitescreen" eskaliert.

**Empirisch:** Reviewer-Agent (Cold-Context Opus 4.6) findet pro Slice 1-3 CRITICAL/HIGH-Findings die Primary-Claude in 6-50% der Fälle übersehen hat. Pre-Merge-Pflicht macht das Audit-System zur **echten Qualitätsgate**, nicht Audit-Theater.

### Auswirkungen

- **Hook:** `ship-cto-review-gate.sh` blockt feat/fix/refactor-Commits ohne `worklog/reviews/<slice>-review.md` (bereits aktiv)
- **Workflow-Erweiterung:** Review-File muss bei CRITICAL/HIGH-Findings expliziten "Status: addressed" pro Finding-Item haben (oder explicit "Skipped: <reason>" bei LOW)
- **Self-Review (D35) bleibt erlaubt** für trivial Hygiene + Pattern-Wiederholung — aber NICHT bei Money-Path/Cross-Domain/Auth-Layer

### Alternativen erwogen

- **CONCERNS-Status statt REWORK:** Verworfen — verwischt Verbindlichkeit. PASS|REWORK|FAIL drei-stufig ist klar.
- **Reviewer-Agent als CI-Gate (GitHub Action):** Verworfen — Cost (jede PR triggert Opus-Run). Pre-Commit-Hook reicht.
- **Manueller Reviewer (Anil) statt Agent:** Verworfen — Anil-Bandbreite ist begrenzt, Agent ist 24/7.

---

## D43 — ARCHITECTURE: Type-Truth-Audit-Pflicht bei RPC-konsumierenden Services

**Datum:** 2026-04-24
**Status:** ✅ Aktiv

### Entscheidung

Jede TypeScript-Service-Function die `supabase.rpc(...)` aufruft MUSS ihren Return-Type gegen den **echten** RPC-Body verifizieren via `pg_get_functiondef('public.fn_name(args)'::regprocedure)`. Kein blinder `as XYZ[]` Cast.

### Begründung (Slice 192 + Reviewer Finding #1)

`getMarketUserDashboard` returnte `DbHolding[]` (kein JOIN auf players in RPC-Body), aber TS-Cast war `as HoldingWithPlayer[]`. Lie-Cast war seit 2026-04-21 (Slice 122) unbemerkt — funktionierte nur weil **kein Consumer den nested `player`-Feld gelesen hatte**. Slice-192 Mapper-Throw deckte die Lie auf — hätte Hard-Crash auf `/market → /fantasy` produziert.

**Empirisch:** Bei Audit der existierenden `as ...[]` Casts in `src/lib/services/` finde wir mit hoher Wahrscheinlichkeit weitere latente Lies (besonders bei aggregierten Dashboard-RPCs).

### Auswirkungen

- **Code:** Audit-Skript `scripts/audit-rpc-type-truth.ts` (TODO Backlog) — automatischer Vergleich `as XYZ[]` casts vs `pg_get_functiondef` shape
- **Service-Layer-Convention:** Neue RPC-Service-Function MUSS einen Type definieren der **exakt** das RPC-Return-JSON matched. Bei Discrepancy: Type ist Wahrheit, Cast wird gefixt
- **Migration-Header-Pflicht:** Jede neue Migration mit `RETURNS jsonb` macht Return-Shape-Doku in Top-Comment (Sample-JSON)

### Alternativen erwogen

- **Auto-generated Types via supabase-cli:** Verworfen — generiert nur für Tabellen, nicht für jsonb-RPC-Return-Shapes.
- **Runtime Schema-Validation (zod):** Verworfen — Performance-Hit auf Hot-Path. Type-Truth at compile-time reicht.
- **Manueller Audit pre-merge:** Verworfen — fehleranfällig. Skript-basierter Audit ist Pflicht.

### Re-Visit-Trigger

Wenn `scripts/audit-rpc-type-truth.ts` mehr als 3 latente Lies findet bei initialem Run: dedizierter Sweep-Slice (analog Slice 081 Cleanup-Sweep).

---

## D44 — PROCESS: Remote-Agent für autonomes Over-Night-Design (neue Modalität)

**Datum:** 2026-04-25
**Status:** ⚠️ Trial (1. Anwendung läuft 2026-04-25 00:35 Berlin)

### Entscheidung

Für **Multi-Day-Spec-Aufgaben** (Architektur-Design, Plan-Doc-Schreiben, Skeleton-Implementation) wird Remote-Agent via `claude.ai/code/routines` als **Over-Night-Workstream** genutzt — Anil schläft, Agent arbeitet, morgen früh PR zum Review.

### Begründung

Lokaler Claude (mein Channel) ist Anils tägliche Bandbreite — limitiert. Remote-Agent ist parallele Bandbreite für:
- Multi-File-Design-Docs (200-500 Zeilen, viel Kontext lesen)
- Skeleton-Implementations (additiv, wenig Risiko)
- Audit-Sweeps (read-only Analyse)

**Konkrete Anwendung:** `trig_01YPzqQgFtgjqij1x5uitJpf` (Walkthrough-Crawler-Design 2026-04-25 00:35 Berlin).

### Auswirkungen

- **Workflow:** Bei Multi-Day-Tasks via `/schedule` Skill — One-shot mit run_once_at
- **Prompt-Quality:** Self-contained, alle Pflicht-Reads explizit, Acceptance-Criteria messbar (siehe Walkthrough-Crawler-Prompt als Vorlage)
- **CEO-Approval-Pattern:** Agent liefert PR mit Open-Questions (5-10 Stück) → Anil reviewt morgens → entscheidet pro Frage → ich (lokaler) baue Phase 2 nach Approval

### Alternativen erwogen

- **Cron-basierter Recurring-Agent:** Funktioniert für Routine-Audits, nicht für Multi-Day-Design.
- **Anil-Solo nachts:** Verworfen — Burnout-Risk, Anil braucht Schlaf.
- **Lokaler Claude über Nacht:** Geht nicht (Mac-Schlaf, Token-Limit).

### Re-Visit-Trigger

Nach 5 Anwendungen Retro: Wie oft Agent-PR sofort gemergt? Wie oft REWORK? Pattern-Erfolgsrate dokumentieren.

### Risiken

- **Update-Race:** Wenn Schedule schon gefeuert ist (run_once_fired), kann Prompt nicht mehr geändert werden. **Konkret heute passiert:** Walkthrough-Crawler-Update kam 23min zu spät → erste PR hat nur Stufe-1, Stufe-2+3 muss als zweiter Slice nachgezogen werden. Gelernt: Zeit-Buffer >5min einplanen, oder Schedule erst nach komplettem Briefing erstellen.
- **Spec-Missverständnis im PR:** Agent baut falsches → PR-Close ohne Merge, kein Schaden.
- **Repo-Permissions:** Erfordert GitHub-App Install (Slice-internal-Setup, einmalig).

---

## D45 — PROCESS: Worktree-Awareness-Briefing als Pflicht-Block für Worktree-Agent-Dispatch

**Datum:** 2026-04-25
**Status:** ✅ Aktiv (empirisch validiert über 5 Tracks)

### Entscheidung

Jeder Frontend/Backend-Agent-Prompt mit `isolation: "worktree"` MUSS am Anfang des Briefings den Worktree-Awareness-Block enthalten:

```
**WICHTIG (Worktree-Awareness, patterns.md #34):** Du arbeitest in einem Worktree.
Dein CWD ist `C:\bescout-app\.claude\worktrees\agent-XXX`. Edits MUESSEN Pfade
unter diesem Verzeichnis verwenden — relative Pfade (`src/components/...`)
oder worktree-prefixed absolute. NIEMALS `C:\bescout-app\src\...` als
absoluter Pfad — das ist main-Repo, nicht dein Worktree.
```

### Begründung

Empirische Daten 2026-04-25:
- **Slice 198 Wave 1** (4 Tracks ohne Briefing): 50% Trap-Rate (3/4 Tracks edited via main-Pfad → Worktree-Junction-Drift, Re-Apply-Heal nötig)
- **Slice 198b Wave 2** (3 Tracks mit Briefing): 0% Trap-Rate
- **Slice 199** (BE+FE mit Briefing): 0% Trap-Rate

Über 5 Tracks mit Briefing: 0/5 Trap. Pattern wirkt scharf.

### Auswirkungen

- **Prozess:** Briefing-Template-Pflicht in jedem worktree-Agent-Dispatch.
- **Code:** Pattern dokumentiert in `memory/patterns.md` #34.
- **Reviewer:** Bei Reviewer-Briefings explizit Trap-Rate als KPI tracken.

### Alternativen erwogen

- **Worktree-CWD-Hook in Settings:** Vercel-Hobby-Limit-analog hard-block. Verworfen — Hooks haben kein Tool-Pre-Context.
- **Path-Sanitizing in Edit-Tool:** Zu invasiv, breaks legitime cross-worktree Operations.
- **Agent-Definition-Update:** Subagent-System-Prompts editieren — verworfen weil global, nicht worktree-spezifisch.

### Re-Visit-Trigger

Wenn nach 10 Slices >0% Trap-Rate → Pattern verschärfen (Hard-Block via Hook).

---

## D46 — PROCESS: Service-Schnittstelle vorab spezifizieren bei parallelem BE+FE-Dispatch

**Datum:** 2026-04-25
**Status:** ✅ Aktiv (Reviewer-Find Slice 199)

### Entscheidung

Bei parallel-dispatch von Backend-Agent + Frontend-Agent in separaten Worktrees MUSS das SPEC vor Dispatch den **kanonischen Service-File-Pfad** plus **exakte Function-Signatur + Type-Definition** festlegen — nicht "BE legt an + FE importiert irgendwo".

### Begründung

Slice 199 Reviewer-Find: BE-Agent + FE-Agent haben parallel `getTopPredictorsLeaderboard` implementiert — BE in `src/lib/services/leaderboards.ts` (canonical), FE in `src/features/fantasy/services/predictions.queries.ts` (duplicate). FE-Hook nutzte FE-Variante → BE's Service war orphan production-code (Drift-Risk).

Heal-Cycle: FE-Duplicate entfernt, Hook-Import auf BE-Pfad re-routed. Vermeidbar gewesen mit klarer Vorab-Spec.

### Auswirkungen

- **SPEC-Template:** Bei Cross-Domain-Slices Sektion "Service-Schnittstelle" pflicht:
  - Canonical Service-File-Pfad (z.B. `src/lib/services/leaderboards.ts`)
  - Exact Function-Signatur (`async function X(args): Promise<T>`)
  - Return-Type-Definition (auch wenn nur skeleton — beide Agents nutzen exakt diese Type)
- **BE-Briefing:** "Du legst Service in `<canonical-path>` an mit Signature `<sig>`"
- **FE-Briefing:** "Du importierst aus `<canonical-path>`. Falls noch nicht da, schreibe inline-Type-Stub mit Backend-Signatur"

### Alternativen erwogen

- **Sequential dispatch BE → FE:** Zu langsam für L-Slices.
- **Beide Agents schreiben Spec-First:** Doppelte Arbeit, Drift-Risk dort.
- **Reviewer-Pflicht-Catch:** Funktioniert (Slice 199 caught), aber Prevention > Detection.

### Re-Visit-Trigger

Bei nächster parallelem Dispatch: bewusst mit Service-Spec arbeiten + tracken ob Drift auftritt.

### Erweiterung Slice 227 (2026-04-27): Orphan-Production-Component auf Component-Achse

**Pattern-Erweiterung:** D46 wurde original für **Service-Duplicate** definiert (parallele BE+FE-Worktrees implementieren denselben Service unabhängig → orphan production-code). Slice 227 erweitert das Pattern um die **Component-Achse**.

**Discovery (2026-04-27 Visual-Check):**
- `src/components/player/detail/CommunityValuation.tsx` — Component definiert, exported via Barrel-Index, **nirgends importiert** (`grep -rn "<CommunityValuation" src/` = 0 hits, nur Definition + Export)
- Slice 216 K-RR-1 + Slice 225 InfoTooltip-Migration wurden auf das Component appliziert ohne Wirkung — User hat es nie gesehen
- **Audit-Methodik-Bug:** Phase-A-Re-Audit hat das Component als "live + fixable" klassifiziert ohne import-trace zu prüfen

**Detection-Pattern für Future-Slices:**
```bash
# Orphan-Component-Detection: alle exported Components ohne JSX-Verwendung finden
for f in $(find src/components -name "*.tsx" -exec grep -l "^export default function" {} \;); do
  name=$(basename $f .tsx)
  count=$(grep -rn "<${name}[ />]" src/ --include="*.tsx" | grep -v "${name}.tsx:" | wc -l)
  [ "$count" -eq 0 ] && echo "ORPHAN: $f"
done
```

**Pflicht-Regel (Audit-Agents):**
- Vor P1-Finding-Klassifikation auf Component-Code: import-trace mit `grep -rn "<ComponentName"` ausführen
- Wenn 0 hits außer Definition: Component ist **orphan** → finding-Severity NICHT P1, sondern Code-Quality-P2
- audit-aggregate.md muss "import-trace verified ✓" als Audit-Step listen

**Future-Tooling (Wave-3-Backlog):**
- `scripts/orphan-component-detector.ts` analog `audit-stale-check.ts` (Slice 223). Ergänzt CI-Gate gegen orphan accumulation.
- Pre-Commit-Hook: bei `export default function` ohne Import in src/ → warn

**Heal-Optionen für entdeckte Orphans:**
- (A) Löschen — wenn keine Wire-Plan existiert
- (B) Wiren — wenn klar ist auf welcher Page
- (C) Defer mit `@experimental` JSDoc-Tag + Backlog-Eintrag — wenn Future-Wire-Plan offen ist

Slice 227 hat Option C gewählt für CommunityValuation.

**Cross-Reference:** Slice 207-Pattern "Worktree-Isolation-Escape" + Slice 199 "Service-Duplicate" + Slice 227 "Orphan-Component-Detection" sind alle Subklassen "Code-Existenz ≠ Code-Im-Render-Tree". Pattern-Familie: **Audit-Quality-Drift** — Audit fand Code aber Audit prüfte nicht Wirkung.

---

## D47 — PROCESS: Skip-Pattern-Bündelung — gebündelte Wave-Slice statt Einzel-Nachzügler

**Datum:** 2026-04-25
**Status:** ✅ Aktiv (Slice 199 als Erfolgs-Beispiel)

### Entscheidung

Wenn 3+ Slices innerhalb kurzer Zeit den gleichen Skip-Grund nennen ("Backend-Aggregat-RPC fehlt", "Column X muss erst migriert werden", "neuer Cron nötig"), wird daraus eine **gebündelte Wave-Slice** statt 3 Einzel-Nachzügler über die Zeit verteilt.

### Begründung

Slice 198 Track C skipped fm 4.4 + 4.5 wegen Backend. Slice 198b Track C skipped C-05 + K-02 wegen Backend-Aggregat-RPC. Track B skipped fm 2.4 wegen Schema-Annahmen. Reviewer Slice 198b: "Skip-Pattern 'Backend-Aggregat-RPC fehlt' häuft sich (C-05, K-02, fm 2.4, fm 1.3) — Kandidat für Slice 199 als gebündelte RPC-Wave statt einzeln nachzuziehen."

→ Slice 199 = 3 RPCs + 4 UI-Consumers in 1 parallel-dispatch. Effizienz: 4 Findings in 1 Slice statt 4 Slices.

### Auswirkungen

- **Reviewer-Pflicht:** Bei Skip-Findings Pattern-Match prüfen (gleicher Grund über Track/Slice-Grenzen?). Wenn ja → in `notes` als Slice-Kandidat dokumentieren.
- **CTO-Pflicht:** Skip-Backlog scannen vor neuem Slice — wenn Pattern-Cluster >3 → bündeln.
- **Punch-Liste-Format:** Skip-Reason explizit machen, nicht nur "deferred". Macht Pattern-Cluster sichtbar.

### Alternativen erwogen

- **Slice-pro-Finding:** Sauber pro Item, aber 4× Setup-Overhead (Spec/Impact/Reviewer/Push) statt 1×.
- **Catch-all "tech-debt"-Slice:** Zu unspezifisch, kein klarer Acceptance-Criterion.
- **Backlog-Decay:** Skip-Items "vergessen" — verworfen, würde Beta-Readiness gefährden.

### Re-Visit-Trigger

Nach 3 Wave-Slices Retro: Schließrate (Closed/Total) gegen Einzel-Slices vergleichen. Wenn Wave nicht effizienter → Pattern aufgeben.

---

## D48 — PROCESS: Reviewer-Agent als Audit-Stale-Catcher (Already-Fixed-Marker-Pattern)

**Datum:** 2026-04-26
**Status:** ✅ Aktiv (Slice 200a UX-2 + Slice 200b R-03 als 2 Erfolgs-Beispiele)

### Entscheidung

Bei Polish-Sweep-Slices aus Punch-List-Items: Reviewer-Agent ist Pflicht-Catcher für **Audit-Stale**-Bugs (Spec klassifiziert "X fehlt", aber Code im consumed-Hook/parallel-Component löst es bereits). Wenn Reviewer "already-fixed"-Pattern findet, wird das Item **nicht implementiert** sondern als "already-fixed-marker" in der Punch-Liste vermerkt.

### Begründung

Slice 200a (UX-2): Implementierte 5s setTimeout in `MarketContent.tsx:82-92`, aber pre-existing identisches Timer in `useTradeActions.ts:63-69` seit Slice 161. Reviewer fing CRITICAL pre-merge → Heal-Action: Duplicate gelöscht.

Slice 200b (R-03): Spec sagt "Manager-Score isoliert fehlt", aber `GlobalLeaderboard.tsx:19` hat `'manager'`-Tab als Dimension-Filter pre-Slice. Reviewer-Agent dokumentierte als already-fixed-marker.

Beide Cases: Audit aus 2026-04-25 wurde vor Hooks/Service-Layer-Implementation erstellt. Punch-Liste driftet 1-2 Wochen, Audit-Items sind Snapshot-in-Time. Polish-Sweep ohne Pre-Existing-Code-Grep produziert Duplicate-Code in Production.

### Auswirkungen

- **Reviewer-Pflicht (D42-Erweiterung):** Bei Polish-Sweep-Items "ist X bereits implementiert?" als ERSTER Check, BEFORE Spec-Klassifikation akzeptieren. Grep über consumed-hook-source + parallel-Components.
- **Punch-Liste-Format:** Status-Werte erweitert um `already-fixed via <pre-existing-source>` als legitimen Done-Status.
- **CTO-Pflicht:** Vor BUILD jedes Polish-Items: `grep -rn "<spec-pattern>" src/features/<domain>/hooks/ src/features/<domain>/services/ src/lib/hooks/ src/components/<domain>/` als 30-Sekunden-Sanity-Check.
- **Pattern-Codify:** `errors-frontend.md` "Polish-Audit Pre-Existing-Code-Drift" (codifiziert in Slice 200a).

### Alternativen erwogen

- **Audit-Refresh vor jeder Slice:** Wäre teuer (jeden Audit komplett re-scannen). Verworfen — Reviewer-Agent ist günstiger.
- **CI-Gate "Duplicate-Detection":** Static-Analysis schwer (verschiedene Patterns: useEffect, helper-fn, dimension-tab). Verworfen — zu false-positive-prone.
- **Pre-Implementation-Pflicht-Audit:** Würde Single-Track verlangsamen. Reviewer-Agent ist Post-BUILD aber Pre-Merge — gleicher Effekt.

### Re-Visit-Trigger

Wenn 3 Polish-Sweeps in Folge ohne already-fixed-marker enden, Pattern aufgeben (Audit-Drift dann nicht mehr Hauptproblem). Aktuell 2/2 Slices haben einen Marker — Pattern aktiv.

### Beziehung zu D42

D42 (CRITICAL-Findings = Pre-Merge-Pflicht) deckt Code-Quality-Bugs. D48 ist spezialisiert auf Audit-Stale-Bugs in Polish-Sweeps. Beide Reviewer-Agent-Use-Cases.

### Update Slice 202 (2026-04-26): D48 produktiv-validiert

3. Slice nach D48-Codification (Slice 202 FM-9.3 TierComparisonMatrix). Reviewer-Agent fuhr Pre-Existing-Code-Grep (`grep TierComparison|comparison.*tier|stripe.*matrix|TierMatrix|FeatureMatrix` ueber `src/`) — **NO duplicate gefunden**. Greenfield-Component, kein false-positive, kein Heal-Loop.

**Lehre:** D48 funktioniert auch wenn Pre-Existing-Code-Grep zero matches ergibt — der Verifikations-Schritt selbst ist die Versicherung. Die Frage ist nicht "wo ist die Duplicate", sondern "wuerde ich erfahren wenn da eine waere?". Slice 202 hat das mit 14-min Reviewer-Cold-Context-Effort beantwortet.

**Aktuelle Empirie:** 2/3 Slices mit already-fixed-marker (Slice 200a UX-2 + Slice 200b R-03), 1/3 ohne (Slice 202 — clean greenfield). Pattern bleibt aktiv weil 22% Trefferquote in den Polish-Slices reicht zum ROI.

---

## D49 — ARCHITECTURE: SELECT-COLS-Konstanten Sync-Pflicht mit DbType-Definitionen

**Datum:** 2026-04-26
**Status:** ✅ Aktiv (durch Slice 200 Bonus-Discovery aus Slice 197d Latent-Bug)

### Entscheidung

`*_SELECT_COLS`-Konstanten in Service-Layern (z.B. `PLAYER_SELECT_COLS` in `src/lib/services/players.ts`) MUESSEN bei JEDEM `ALTER TABLE <X> ADD COLUMN <Y>` synchron mit:
1. Db<X>-Type-Definition in `src/types/index.ts`
2. dbTo<X>-Mapper-Funktion (auch im Service-Layer)
3. SELECT-COLS-Konstante (oft vergessen — silent Production-Drift)
4. Ggf. RPC-Return-Shapes (bei discriminated-union RPCs)

**Pflicht-Audit nach JEDEM ADD COLUMN:**
```bash
# Alle db.X-Reads im Service-Layer enumerieren + gegen SELECT-COLS-Liste matchen
grep -E "db\.[a-z_]+" src/lib/services/players.ts | sed 's/.*db\.//; s/[^a-z_].*//' | sort -u
# Jeden Wert in PLAYER_SELECT_COLS suchen
```

### Begründung

**Discovery (2026-04-26 Slice 200):** PLAYER_SELECT_COLS in `src/lib/services/players.ts` hatte `mv_trend_7d` NICHT, obwohl:
- DbPlayer-Type erweitert (Slice 197d)
- dbToPlayer-Mapper liest `db.mv_trend_7d ?? null` (Slice 197d)
- Migration applied (Slice 197d)
- Frontend MV-Trend-Filter implementiert (Slice 197d)

→ PostgREST sendet die Spalte nicht zurueck → mvTrend7d immer `null` fuer alle 4556 Players in Production → MV-Trend-Pfeile in der UI rendern nie → 1 Tag (24h+) Latent-Bug, **niemand hat es bemerkt** weil:
- TS-Cast `db.mv_trend_7d ?? null` luegt nicht (NULL ist valid)
- `applyMvTrendFilter(items, value, p => p.mvTrend7d ?? null)` funktioniert auch mit allen-NULL
- Frontend-Tests gegen Mock-only (kein Real-DB-Roundtrip)
- Reviewer-Agent in 197d hat Service-Code nicht gesehen (Worktree-Isolation)

Slice 200 fixt by-coincidence weil `trades_volume_7d` zur SELECT-Liste hinzugefuegt wurde und `mv_trend_7d` mit.

### Auswirkungen

- **Code:** `errors-frontend.md` neuer Pattern "PLAYER_SELECT_COLS Sync mit DbPlayer-Type" (Slice 200, codifiziert).
- **Prozess:** Bei jedem ALTER TABLE players ADD COLUMN: 4-Punkt-Checklist (Type + Mapper + SELECT_COLS + Tests).
- **Audit-Command** dokumentiert (grep `db.X`-Reads vs SELECT-COLS).
- **Andere SELECT-COLS-Konstanten:** Pattern gilt analog fuer CLUB_SELECT_COLS, EVENT_SELECT_COLS, etc. — Audit-Command verallgemeinerbar.

### Alternativen erwogen

- **`select('*')` statt explicit-cols:** Wuerde Sync-Drift verhindern, aber alle Spalten holen ist Bandbreiten-Verschwendung (DbPlayer hat 30+ Felder, viele rare-used). Verworfen.
- **Auto-generated SELECT-COLS aus DbType via TS-Macro:** Komplex, kein etablierter Tooling. Verworfen.
- **CI-Gate "DbType vs SELECT-COLS Diff":** Implementierungs-Aufwand vs One-Time-Damage gerechnet — pragmatisch via Audit-Command + Pattern-Doc + Reviewer-Pflicht-Check loesbar. **Aktiv.**

### Re-Visit-Trigger

Wenn nochmal ein Latent-Bug dieser Klasse entsteht (SELECT-COLS-Drift) → CI-Gate-Implementierung priorisieren.

### Beziehung zu D43

D43 (Type-Truth-Audit-Pflicht bei RPC-konsumierenden Services) deckt RPC-vs-TS-Cast-Lies. D49 deckt SELECT-COLS-vs-DbType-Lies. Beide sind Latent-Production-Bug-Klassen die TS-Compiler nicht catched.

---

## D50 — PROCESS: Spec-Standard-Pflicht für Agent-Context-Building

**Datum:** 2026-04-26
**Status:** ✅ Aktiv (Slice 211 Spec-Foundation-Uplift)

### Entscheidung

Mit der SPEC steht und fällt jeder Slice. Der Agent ist intelligent, aber nicht hellsichtig. Eine Spec ohne Code-Reading-Liste, Pattern-References, Self-Verification-Commands und Open-Questions ist eine Wunschliste — der Agent improvisiert und verursacht Blindspots.

`/spec` Skill ist um 4 neue Pflicht-Sektionen erweitert (1.10-1.13):
- **1.10 Code-Reading-Liste** — Files die Agent VOR Implementation MUSS lesen, mit konkreter Frage was zu prüfen ist.
- **1.11 Pattern-References** — relevante Patterns/Decisions/Common-Errors mit IDs (nicht copy-paste-aller-38, nur die ECHT relevanten).
- **1.12 Self-Verification Commands** — Audit-Commands die Agent post-Implementation selbst laufen lassen kann.
- **1.13 Open-Questions** — Pflicht-Klärung vs. Autonom-Zone vs. Nicht-Autonom-Zone (CEO).

`workflow.md` SPEC-Stage erweitert um:
- 13 Pflicht-Sektionen (1-13) mit Slice-Größen-spezifischen Mindest-Anforderungen.
- XS-Slice: ≥ 3 Code-Reading-Items, ≥ 3 Edge-Cases, ≥ 3 ACs.
- S/M-Slice: ≥ 6 Items je.
- L-Slice: ≥ 10 Items + Pre-Mortem ≥ 5 Szenarien + Wave-Plan.
- Pre-Review-Memo Pattern (Sektion 1b) — empfohlen bei M/L mit parallel-Dispatch.

`worklog/specs/_TEMPLATE.md` ist Master-Template für jeden neuen Slice.

`/parallel-dispatch` Skill erweitert um:
- WORKTREE-PFLICHT-Block (absolute-Paths-Trap, `git status -s` Self-Check).
- Pre-Review-Memo Pattern.
- Service-Schnittstelle vorab spezifizieren (Pflicht bei BE+FE-Cross-Domain, Pattern aus D46).

`ship-cto-review-gate` Hook erweitert um Verdict-Schema-Enforcement (WARN, nicht BLOCK — regex `\\**Verdict:\\** PASS|REWORK|FAIL|CONCERNS`).

### Begründung

**Anil's Direktive 2026-04-26:** "mit der SPEC steht und fällt alles, hier musst du gewissenhaft und detailliert sein, der agent soll nicht blind sein, er muss sich seinen context bei bedarf auf bauen, ihr seid doch alle intelligent, dann nutzt es auch aus".

**Empirische Evidence dass Spec-Drift kostet:**
- Slice 207: Worktree-Agent escapierte Isolation (3 Bugs aufeinander). Pattern jetzt in common-errors.md.
- Slice 209: 12 audit-stale-row-marker korrigiert nach 4 Iterationen D48 Pattern. Spec-Sektion "Self-Verification" hätte audit-stale früher gefangen.
- Slice 192/193: Type-Truth-Drift latent 1+ Tag. Spec-Sektion "Pattern-References" mit D43 hätte Mitigation-Layer früher erzwungen.
- Slice 200: PLAYER_SELECT_COLS Latent-Bug. Spec-Sektion "Self-Verification" mit grep-audit hätte den Drift gefangen.
- Slice 198: i18n-Key-Leak. Spec-Sektion "Self-Verification" mit i18n-grep hätte den Leak vor Reviewer gefangen.
- Slice 199: Service-Duplicate. /parallel-dispatch hatte keine "Service-Schnittstelle vorab"-Block.

**Anti-Pattern bisher (was D50 löst):**
- "Spec hat nur Ziel + Files + ACs" → Agent läuft blind in bekannte Fallen.
- XS/S-Slices mit inline-Spec ohne Pattern-References → Agent ignoriert codifizierte Lehren.
- Reviewer-Agent muss komplettes Audit machen statt Blindspot-Catch → 60% redundant Arbeit.

### Auswirkungen

- **Workflow:** workflow.md SPEC-Stage komplett-überarbeitet, 13 Pflicht-Sektionen mit Slice-Größen-Tabelle.
- **/spec Skill:** 4 neue Sektionen 1.10-1.13. SPEC-GATE-Checklist erweitert um 4 neue Bullets.
- **/parallel-dispatch:** 3 neue Briefing-Blöcke (Worktree-Pflicht, Pre-Review-Memo, Service-Schnittstelle).
- **/ship Skill:** referenziert _TEMPLATE.md für Spec-Start (Wave 2 Slice 212).
- **Hook ship-cto-review-gate:** Verdict-Schema-Enforcement WARN.
- **Patterns.md #39:** Pre-Review-Memo Pattern codifiziert.
- **common-errors.md / errors-db.md:** Worktree-Isolation-Escape + Migration-Heal v1→v2 promoted aus Slice 207-Drafts.

### Alternativen erwogen

- **Hard-Block bei nicht-konformen Specs (ship-spec-quality-gate.sh Hook):** Würde Friction erhöhen, könnte legitime Quick-Fixes blockieren. **Verworfen für Slice 211 — Wave 2 Kandidat (Slice 212+).**
- **Spec-Generator-Tool (auto-fillt Pflicht-Sektionen):** Komplex, redundant zu /spec Skill. **Verworfen.**
- **Auto-Code-Reading-Liste via static-analysis:** ML-basiert, kein etablierter Tooling. **Verworfen.**
- **Pattern-Reference-Auto-Linker (Github-Action checkt patterns.md-IDs):** Wave 2 Kandidat — erstmal Documentation-First, Tooling-Layer auf solider Foundation. **Aktiv für Wave 2.**

### Re-Visit-Trigger

- Wenn 5+ Slices nach 211 ihre Spec-Pflicht-Sektionen ignorieren → Hard-Block-Hook (Wave 2).
- Wenn Reviewer-Agent öfter "Spec-Drift / Spec-Lücke" als Finding meldet → /spec Skill nochmal überarbeiten.
- Wenn neue Bug-Klassen entstehen die durch bessere Spec hätten verhindert werden können → spezifische Sektion erweitern.

### Beziehung zu D45-D49

- **D45** (Worktree-Awareness-Briefing-Pflicht-Block) — wird durch D50 in /parallel-dispatch konkretisiert.
- **D46** (Service-Schnittstelle vorab spezifizieren) — wird durch D50 in /parallel-dispatch operationalisiert.
- **D47** (Skip-Pattern-Bündelung) — orthogonale Process-Decision, bleibt aktiv.
- **D48** (Reviewer-Agent als Audit-Stale-Catcher) — wird durch D50 strukturell unterstützt (Self-Verification-Commands automatisieren D48 Pre-Check).
- **D49** (SELECT-COLS-Sync-Pflicht) — wird durch D50 Sektion 1.12 (Self-Verification: grep db.X-Reads vs SELECT_COLS) operationalisiert.

---

## D51 — PROCESS: Targeted Phase-A-Re-Audit nach Money-Path-UI-Edits Pflicht

**Datum:** 2026-04-27
**Status:** ✅ Aktiv (Trial-bestätigt durch Slice 223-227 Wave)

### Entscheidung

Nach jeder UI-Edit auf Money-Path-Komponente (BuyConfirmModal, SellModal, Trade-related, Wallet-Display, Founding-Pass) muss ein **Targeted Phase-A-Re-Audit** mit mindestens 3 Audit-Agents (`business`, `ux-coherence-auditor`, plus Domain-Expert wie `fm-mechanics-expert`) auf den minimalen Diff durchgeführt werden — bevor die Slice als "fertig" gilt.

### Begründung (Slice 222 → Re-Audit-Wave 224-227 Discovery)

Slice 222 hatte 10-Lines-Diff (4 title-Tooltips auf BuyConfirmModal Sentiment-Block) + Self-Review D35. Anil-Anweisung "B (Targeted Re-Run)" triggerte 3 parallel-Agents auf den Diff. **Result: 9 echte NEU Findings (3 P1 + 3 P2 + 3 P3).**

- **BUSINESS-NEU-1 (P1):** "unter-/überbewertet" + "düşük/yüksek değerli" = Securities-Valuation-Drift gegen `business.md` Asset-Klasse-Tabelle. Self-Review hat das NICHT erkannt — business-Domain ist außerhalb Code-Pattern-Scope.
- **UX-NEU-2 (P1):** HTML-`title=` auf Mobile (393px) zeigt KEIN Tooltip — Casual-Education auf Hauptzielgerät 0%. Self-Review hat Pattern-Wiederholung mit Slice 216 gesehen, aber Mobile-Gap unsichtbar weil Code-Pattern stimmig.
- **FM-NEU-2 (P1):** Tooltip-Wording im Money-Path triggert Spekulations-Action-Push (Casual). Domain-Expert-Linse fehlte im Self-Review.

**Self-Review-D35-Limit:** Self-Review erkennt Code-Pattern-Konsistenz, NICHT:
- Compliance-Domain (business-Drift, MASAK-Risk)
- Mobile-UX-Limits (Hover-on-Touch)
- Domain-Mechanik (FM-Power-User-Action-Bias auf Money-Path)

**ROI-Bestätigung:** Re-Audit kostete ~10 min (3 parallele Agents), heilte 9 echte Findings. Ohne Re-Audit wären die Findings live geblieben bis Beta-Test → User-Schmerz.

### Auswirkungen

- **Code:** Keine direkte Code-Änderung. Process-Erweiterung der SHIP-Loop für Money-Path-Slices.
- **Prozess:** SHIP-Loop Stage `REVIEW` für Money-Path-Slices erfordert min. 3-Agent-Targeted-Re-Audit, nicht nur Self-Review-D35.
- **Team:** Future Money-Path-Slices: vor Commit `Agent({subagent_type: business})` + `Agent({subagent_type: ux-coherence-auditor})` + Domain-Agent.

### Money-Path-Detection (welche Slices sind betroffen)

Trigger-Kriterien (mindestens eines):
- File-Pfad enthält `BuyConfirm`, `SellModal`, `Trade`, `Wallet`, `Founding`, `Liquidat`, `Order`, `Mystery`
- i18n-Keys mit `price`, `fee`, `buy`, `sell`, `credit`, `cr`, `scout-card`, `dpc`
- RPC-Aufruf in Service mit Money-Path-Funktion (`buy_player_*`, `place_*_order`, `liquidate_*`, `subscribe_*`)
- User-facing Text ändert sich auf einer Page wo `TradingDisclaimer` rendered ist

### Alternativen erwogen

- **Self-Review-D35 mit erweiterten Kriterien:** Verworfen — Self-Review hat strukturell limitierte Domain-Sicht. Cold-Context-Agent-Linse ist Domain-spezifisch.
- **Reviewer-Agent (allgemein):** Verworfen — Reviewer-Agent ist Code-Quality-fokussiert, nicht Domain-spezifisch (Compliance/Mobile-UX/FM-Mechanics). Targeted-Multi-Agent ist präziser.
- **Visual-Test-Suite Pflicht:** Verworfen für Money-Path-i18n-Edits — Tests fangen funktionale Regression, nicht Wording-Drift oder Mobile-UX-Patterns.

### Re-Visit-Trigger

Wenn 3+ aufeinanderfolgende Money-Path-Slices 0 NEU-Findings via Targeted-Re-Audit produzieren: Re-Audit-Pflicht zu "stichprobenartig pro 5 Slices" relaxen.

---

## D52 — PROCESS: Wave-3-Tooling — Detection-Tool pro Bug-Klasse-Pattern

**Datum:** 2026-04-27
**Status:** ✅ Aktiv (Trio bestätigt: Slices 223 + 228 + 229 + 230)

### Entscheidung

Jede empirisch-wiederholte Bug-Klasse (>3× Iteration) wird in ein **Static-Analysis-Tool** unter `scripts/audit-*.ts` operationalisiert mit standardisierter API:
- `npx tsx scripts/audit-<pattern>.ts` direkt ausführbar
- `pnpm run audit:<pattern>` als npm-Script
- Markdown-Report nach `worklog/audits/<pattern>-YYYY-MM-DD.md`
- Exit 0 bei 0 Hits (CI-Gate-ready), 1 sonst
- Heuristik-Iterativ tightenen bis Production-Code 0 Hits + Negative-Test-Detection bestätigt

### Begründung (Wave-3-Tooling-Trio Slice 223 + 228 + 229 + 230)

Bug-Klassen mit empirischer Iteration ≥4× verdienen Tool-Operationalisierung statt Manual-Audit:

| Pattern (D-ID) | Empirische Iteration | Tool (Slice) |
|----------------|----------------------|--------------|
| D48 Audit-Stale-Catcher | 6× (Slice 200a/200b/203/206/209/223 — 22% Drift-Rate) | `audit:stale` (Slice 223) |
| D46 Orphan-Production-Component | 14× (Slice 227 + Slice-228-Discovery 13 weitere) | `audit:orphan` (Slice 228) |
| D43 Type-Truth-Drift | 3× (Slice 165/192/200) — Pattern-Familie | `audit:type-truth` (Slice 229) |
| Phase-Tracker-Reminder (Slice 214 Backlog) | 4× manuelle sed-Edits in Heal-Wave 224-227 | `ship-phase-tracker-reminder.sh` (Slice 230) |

**ROI:** Manueller Audit kostet 30-45 min pro Sweep. Tool-Run kostet 30 Sekunden. Bei 10+ Future-Slices ist Break-Even nach 2-3 Runs.

**Heuristik-Refinement-Lehre (Slice 229):** Initial-Heuristik produzierte 17 false-positives. Iterative Erweiterung um Guard-Patterns (`if (error)`, `| null`-Cast, renamed `error: rpcErr`) reduzierte auf 0 Production-Code-Hits + Negative-Test-Detection bestätigt funktional. Pattern: **lieber zu locker starten, dann tightenen statt initial zu strikt** — sonst verliert man echte Bugs.

### Auswirkungen

- **Code:** 4 neue Tools/Hooks live in `scripts/` und `.claude/hooks/`. ~900 Zeilen Total. tsc-clean.
- **Prozess:** Future-Slices die neue Bug-Klasse entdecken (>3× Iteration) → Tool-Slice analog erstellen.
- **Team:** `pnpm run audit:*` als Pre-Commit-Empfehlung. CI-Integration als post-Beta-Item.

### Pattern-Familie etabliert

**Detection-Tool-Pattern-Template:**
1. Walk relevant directories
2. Pattern-Detection-Regex mit Iterativ-tightened Heuristik
3. Group by pattern + heal-hint
4. Markdown-Report mit Datums-Suffix
5. Exit-Code-Switch
6. Negative-Test (inject pattern → flag, revert → silent)

**Backlog (post-Beta-deferred):**
- `scripts/audit-rpc-type-truth-live.ts` — Live-DB-`pg_get_functiondef`-Lookup-Variante (D43 M-Slice)
- `scripts/audit-i18n-key-leak.ts` — D-?? errors-frontend.md "i18n-Key-Leak via Service-Errors"
- `scripts/audit-mutation-race.sh` — bereits existing als bash, ggf. nach `*.ts` migrieren für Konsistenz

### Alternativen erwogen

- **ESLint-Plugin-Custom-Rule:** Verworfen — Setup-Overhead hoch, Iteration langsam (lint-Plugin-Test-Cycle), TypeScript-AST-Parsing für Bug-Detection ist over-engineering bei Pattern-Detection-Use-Case.
- **Pre-Commit-Hook-Trigger statt manueller Run:** Verworfen für Initial — false-positive-Risk während Heuristik-Refinement zu hoch (würde Commits blockieren). Post-Stabilisierung evtl. opt-in.
- **CI-Job:** Verworfen für Initial — gleicher false-positive-Risk-Grund. Nach 2-3 Wochen Stabilität evtl. promote.

### Re-Visit-Trigger

Wenn 3+ aufeinanderfolgende Sessions Tools NICHT laufen lassen: Pre-Commit-Hook-Promotion erwägen. Wenn 1 false-positive-Heuristik-Drift gemeldet: lock-down + tightening-iteration analog Slice 229.

---

## D54 — PROCESS: Wiring-Drift-Recovery + Detection-Tooling (Build-without-Wire-Enforcement)

**Datum:** 2026-04-27
**Status:** ✅ Aktiv (Slice 234 codifiziert + Hook-Enforcement live)
**Kategorie:** PROCESS
**Erweitert:** D53 (Slice 233) — von Text-Regel auf Architektur-Enforcement promoted

### Entscheidung

D53 codifizierte "Build-without-Wire ist verboten" als Text-Regel in `workflow.md`. D54 erzwingt es **architektonisch**:

1. **Detection:** `scripts/wiring-check.ts` scannt `.claude/hooks/`, `scripts/`, `package.json` cross-mit `settings.json` + GHA-Workflows + Vercel-Crons + Hooks. Findet Build-without-Wire-Drift sofort. KNOWN_ORPHANS-Allowlist für intentional-manuelle Tools.

2. **Pre-Commit-Enforcement:** `.claude/hooks/ship-tool-wiring-gate.sh` blockt `feat(`/`fix(`/`refactor(`-Commits wenn `audit:wiring:check` real-drift findet. exit 2.

3. **Daily Detection:** `audit:wiring` läuft täglich in `.github/workflows/nightly-audit.yml` als 9. Audit-Step. Auto-Issue bei neuen Drifts (24h Detection-Latenz).

4. **Type-System:** Spec-Header `**Slice-Type:**` macht Definition-of-Done maschinen-prüfbar. Hook `ship-spec-quality-gate.sh` Layer 3 prüft Type-spezifische Pflicht-Sektion.

### Begründung

**Anil-Frustration 2026-04-27 (post-Slice-233):**
> "ich verstehe nicht, warum wir nicht mal was zu ende programmmieren können... ich hatte tests gemacht und sollte laufen, wundert mich dass die verkabelung fehlt? wie kann ich dass in zukunft verhindern."

**Empirische Evidence (Slice 234 BUILD-Audit):**
- 11 orphan Hook-Files in `.claude/hooks/` (10 dokumentiert als live in CLAUDE.md/workflow-reference.md, 0 in settings.json)
- **`capture-correction.sh` Single-Point-of-Failure:** orphan → `.claude/learnings-queue.jsonl` 0 bytes seit 19 Tagen → **Knowledge-Flywheel komplett tot**
- 4 orphan Pipelines (`findings-to-slices.ts`, `audit:compliance`, `test:synthetic`, `test:e2e`)
- 9 OPEN GitHub-Issues #14-#23 (Smoke-Failures seit 3 Tagen niemand triagiert)

**Discovery beim BUILD:** capture-correction.sh war nicht nur orphan — er hatte einen Bug (las `CLAUDE_USER_PROMPT` env-var statt JSON-stdin). Selbst wenn registriert wäre er dead-code gewesen. Slice 234 fixt beides.

### Auswirkungen

- **Code (Slice 234):**
  - `scripts/wiring-check.ts` (NEU, 230 Zeilen)
  - `.claude/hooks/ship-tool-wiring-gate.sh` (NEU)
  - 8 Hooks neu registriert in `.claude/settings.json`
  - 1 Hook archived (`quality-gate.sh`), 1 deleted (`inject-learnings.sh`)
  - `capture-correction.sh` stdin-fix (war env-var-based, nie gefeuert)
  - GHA-Heal: rpc-security env, tr-strings skip-graceful, Issue-Dedupe, audit:compliance + audit:wiring + findings-to-slices integriert
- **Prozess (workflow.md):**
  - SPEC-Stage: Slice-Type-Header pflicht
  - Section 3a Definition-of-Done-Tabelle wird Type-spezifisch erzwungen
- **Recovery:**
  - 9 Smoke-Issues #14-#23 closed (Slice 235 split für Code-Fix)
  - Knowledge-Flywheel reaktiviert (capture-correction live, 3 Test-Korrekturen in queue)

### Pattern-Familie etabliert

D54 schließt die "Audit-Quality-Drift"-Pattern-Familie:
- D43 (Slice 192/200): Type-Truth-Drift (Silent-Cast / nested-select)
- D46 (Slice 207/227/228): Orphan-Component-Production-Code
- **D54 (Slice 234): Build-without-Wire (Hooks/Scripts/NPM-Scripts)**
- D48 (Slice 209/223): Audit-Stale-Drift (Punch-List)

Cross-cutting: "Existenz ≠ Verwendung". Tool/Component/Audit kann existieren ohne im echten Workflow zu sein. Enforcement-Architektur (Hooks > Text-Regeln, D45) erzwingt Discipline.

### Alternativen erwogen

- **"Mehr Disziplin im /spec":** Verworfen (D45-Pattern). Disziplin-Versprechen brachen 19 Slices lang. Architektur-Enforcement durch Hooks ist robust.
- **"Manuelles Quartals-Audit":** Verworfen — Detection-Latenz zu hoch (Drift wuchs in 12 Tagen auf 11 Hooks).
- **"Larger Slices, weniger XS":** Verworfen — XS-Pattern ist eine Stärke. Problem ist nicht Größe, sondern Done-Cut.
- **"WARN-only initial für ship-tool-wiring-gate":** Verworfen — D53 hatte schon WARN-Only-Phase (workflow.md), Drift wuchs trotzdem. Hard-BLOCK ab Slice 234.

### Re-Visit-Trigger

Wenn nach Slice 234+ in 2 Wochen 0 false-positives gemeldet: Pattern stabil. Wenn ≥ 3 false-positives: KNOWN_ORPHANS-Heuristik refinen + Pattern-Erweiterung. Wenn neue Wiring-Achse entdeckt (z.B. unverkabelter Skill-Trigger): erweitere wiring-check.ts.

---

## D53 — PROCESS: Build-without-Wire ist verboten — Definition-of-Done je Slice-Type

**Datum:** 2026-04-27
**Status:** ✅ Aktiv (Slice 233 codifiziert + Hook-Enforcement Slice 235+)
**Kategorie:** PROCESS

### Entscheidung

Slice ist **nicht fertig** mit "Code geschrieben + Tests grün". Je nach Slice-Type ist das letzte 20% (Verkabelung) Pflicht-Teil des Slices, nicht Future-Slice. Workflow.md Sektion 3a ergaenzt um eine Slice-Type-Tabelle, die per Type definiert was "Done" heisst.

### Begründung (Anil-Frustration 2026-04-27)

> "ich verstehe nicht, warum wir nicht mal was zu ende programmmieren können, sondern nur halb fertig. ich hatte tests gemacht und sollte laufen, wundert mich dass die verkabelung fehlt? warum fehlt das, wie kann ich dass in zukunft verhindern, dass das passiert, dass enldich mal aufgaben zhu ende gearbeitet werden im vollen umfang"

**Empirische Evidence beim Slice 233 BUILD:**
- 8 Audit-Scripts in `package.json` ↔ NUR 1 in CI verkabelt (`audit:silent-fail:check`)
- Slices 223 + 228 + 229 (audit:stale + orphan + type-truth) bauten 3 Tools binnen 24h, ZERO verkabelt
- Slice 230 baute Stop-Hook-Reminder, korrekt verkabelt → das war die Ausnahme die Regel macht

**Root-Cause-Pattern:** XS-Slices liefern "Tool gebaut → 5/5 Smokes PASS → done". Letztes 20% (Wiring) landet in Scope-Out mit Begruendung "→ Slice 233+", und Slice 233+ kommt nie. Spec hat ein "Scope-Out"-Feld aber keine "Wired-Verifikation". Hooks erzwingen Spec-Quality, Proof, Review — aber nicht Wiring.

### Definition-of-Done je Slice-Type

| Slice-Type | "Done" heisst |
|-----------|---------------|
| **UI-Component** | in 1+ Page-Render-Tree importiert · visual auf bescout.net post-Deploy · Mobile 393px verifiziert |
| **Service / RPC** | in 1+ Hook/Query verwendet · vitest + tsc green · Idempotent wenn Money-Path |
| **Tool / Script** | in `package.json` als pnpm-Script · aufgerufen in mind. 1 Trigger (GHA / Vercel-Cron / `.claude/hooks/` / post-commit-hook) · Failure-Handling definiert |
| **Hook** | in `.claude/settings.json` registriert · Trigger korrekt · silent bei Standard, klare Message bei Edge-Case |
| **GHA-Workflow** | YAML-Lint-clean · permissions explizit · Live-Run nach push verifiziert · Failure-Path erprobt |
| **DB-Migration** | via `mcp__supabase__apply_migration` applied · `pg_get_functiondef`-Verify · RLS komplett |
| **i18n-Strings** | DE + TR · business.md-konform · Anil-Pflicht-Review markiert |

### Auswirkungen

- **Code (Slice 233):** `nightly-audit.yml` GHA-Workflow verkabelt 7 Audit-Tools + bescout.net-Smoke daily 03:00/04:00 UTC. Recovery von 3 orphan-Tools.
- **Prozess (workflow.md Section 3a):** Definition-of-Done-Tabelle live, jeder Slice-Author MUSS prüfen.
- **Prevention (Slice 235+ pendiert):** `scripts/wiring-check.ts` automatisiert Detection. `ship-tool-wiring-gate.sh` BLOCK bei pre-commit fuer scripts/audit-*.ts ohne Trigger.
- **Knowledge:** D46 (Orphan-Component-Achse) generalisiert auf "Orphan-Asset" — Components UND Scripts UND Hooks.

### Alternativen erwogen

- **"Disziplin-Versprechen":** Verworfen. Anil + ich haben uns 19 Slices lang geschworen, jedes Tool zu verkabeln. Ergebnis: 1/8. Disziplin braucht Architektur-Enforcement (D45 Hooks > Text-Regeln).
- **"Larger Slices, weniger XS":** Verworfen. XS-Slices sind eine Stärke (Slice-pro-Stunde-Rhythmus). Problem ist nicht die Größe sondern der Done-Cut.
- **"Reviewer-Pflicht-Audit pro Slice":** Verworfen. Reviewer-Cold-Context kann Wiring nicht prüfen ohne Definition-of-Done-Tabelle als Ground-Truth.

### Re-Visit-Trigger

Wenn nach Slice 235+ Wiring-Hook 4 Wochen lang 0 Treffer hat: Pattern stabil, kein weiteres Tightening. Wenn 3+ neue orphan-Tools in package.json: Hook ist insufficient, Pre-Push-Check als CI-Gate promoten.

---

## D55 — PROCESS: Discipline-Architektur 4-Layer (Pre-Commit + Pre-Push + CI + Nightly)

**Datum:** 2026-04-28
**Status:** ✅ Aktiv
**Supersedes:** —

### Entscheidung

BeScout-Quality-Gates sind 4-stufig nach Slice 243 + 244 + 248 + 233 etabliert:

| Layer | Trigger | Latenz | Gates |
|-------|---------|--------|-------|
| **1. Pre-Commit** (Slice 243) | `git commit` lokal | ~32s | tsc + audit:type-truth + audit:stale + audit:wiring:check + lint-staged |
| **2. Pre-Push** (Slice 248) | `git push` lokal | ~6 min | vitest run mit `CI=true` (skipt Integration) |
| **3. CI on-push** (Slice 244 P1) | `git push origin main` | ~2-3 min | lint + audit + build + test (4 required-status-checks) |
| **4. Nightly** (Slice 233) | täglich 03:00/04:00 UTC | ~5 min | 11 Audits + Smoke-Test + Auto-Issue-Pipeline |

Branch-Protection: 4 contexts required, `enforce_admins: false` (pragmatisch für Solo-Dev direct-push).

### Begründung

Slice 226-245 (≥20 Push-Events) hatten durchgehend rote CI ohne dass jemand bemerkt — Audit-Run-without-Action Pattern (docs/test.rtf #8/#9). Anil's RTF-Brainstorm dokumentierte 12 Drift-Risiko-Punkte. 5 davon strukturell geheilt heute (Slice 245 #6, 243 #8, 244 #9, plus 246+247 als CI-Recovery).

`enforce_admins: true` Catch-22 (Slice 244 Phase 2): Push blockiert bis CI grün, CI braucht Push. → Pre-Push-Hook als architektonische Lösung statt PR-Workflow für Solo-Dev (Slice 248).

### Auswirkungen

- **Code:** `.husky/pre-commit` + `.husky/pre-push` + `.github/workflows/ci.yml` + `.github/workflows/nightly-audit.yml`
- **Prozess:** Jeder lokale Commit + Push hat jetzt mehrere Gates. `--no-verify` als bewusster Bypass. Knowledge-Capture in `errors-infra.md` für Future-Onboarding.
- **Team:** CTO + Anil. Bei Multi-Dev: PR-Workflow + enforce_admins=true wäre angemessen.

### Alternativen erwogen

- **enforce_admins=true ohne Pre-Push-Hook:** Verworfen wegen Catch-22 (Slice 244 Phase 2 live demonstriert).
- **PR-Workflow für alle Slices:** Verworfen wegen Solo-Dev-Anti-Pattern. 252 Slices Historie zeigt direct-push.
- **Audit-Tools nur in CI:** Verworfen weil ≥20 silent CI-Failures gezeigt haben dass Detection ohne Pre-Commit-Reaction-Loop unwirksam ist.

### Re-Visit-Trigger

Wenn 6.6 min Pre-Push-Latenz dazu führt dass Anil häufig `--no-verify` nutzt: vitest-Worker-Parallelisierung (Slice 251+). Wenn ≥1 echter Multi-Dev: enforce_admins=true + PR-Workflow.

---

## D56 — PROCESS: Pre-Implementation-Replacement-Verification bei Cleanup-Slices Pflicht

**Datum:** 2026-04-28
**Status:** ✅ Aktiv
**Supersedes:** —

### Entscheidung

Bei Bulk-Delete-Cleanup-Slices (Components, Scripts, RPCs, Tests) ist **Pre-Implementation-Replacement-Verification pflicht** vor Anil-Empfehlung. Schnelle "DELETE-OK"-Empfehlungen ohne Replacement-Check sind verboten.

Pflicht-Checks pro Component-Kandidat:
1. **Replacement-Component-Suche:** Existiert eine Component die das Feature abdeckt?
2. **Wire-Lücke-Check:** Ist Feature semantisch abgedeckt oder UNIQUE-Visualization?
3. **Feature-Flag-Status:** Ist Component disabled per FEATURE_X-Flag (= DEFER-Kandidat)?
4. **Pattern-Anti-Pattern-Check:** Verstößt Component gegen `feedback_*.md` Memory-Items?
5. **Caller-Site-Audit:** Wer importiert (oder importierte) den Component?

### Begründung

Slice 239 Anil-Direktive ("vergewissere dich davon, nicht das wir wichtige dinge übersehen") deckte 2/9 Wire-Lücken auf die meine erste Empfehlung übersehen hatte:
- **GameweekScoreBar** schien obsolet (PerformanceTab existiert mit MatchTimeline+StatsBreakdown), aber Bar-Chart-Visualization mit Threshold-Lines war UNIQUE und nicht ersetzt
- **HoldingsSection** schien obsolet (SellModal existiert), aber alternative Inline-Sell-UX

Ohne Anil's "vergewissere dich"-Direktive hätten wir 1× UNIQUE-Feature unwiederbringlich gelöscht (Slice 239 GameweekScoreBar als WIRE umgesetzt).

### Auswirkungen

- **Code:** keine direkten Code-Änderungen, Process-Regel
- **Prozess:** Bei Slice-Specs für Bulk-Delete: Spec-Sektion 1.4 Code-Reading-Liste muss explizit Replacement-Suche pro Kandidat enthalten. Slice 239 als Pattern-Vorbild.
- **Team:** Future-Slices (252+ orphan-cleanup-waves)

### Alternativen erwogen

- **DELETE-First, Re-Add-Later:** Verworfen weil git-history nicht trivial wiederherstellbar bei umfangreichen Refactorings nach Delete.
- **All-Pre-Verify-Skip wenn audit-Tool sagt "orphan":** Verworfen weil orphan-detector Code-Existenz prüft, nicht Feature-Coverage.

### Re-Visit-Trigger

Wenn future Bulk-Delete-Slice (252+) eine UNIQUE-Feature unwiederbringlich verliert trotz Pre-Verification: Process-Hardening (z.B. mandatory Reviewer-Agent vor Delete).

---

## D57 — PROCESS: False-Alarm-Investigation pflicht vor Money-Path-Reconcile

**Datum:** 2026-04-28
**Status:** ✅ Aktiv
**Supersedes:** —

### Entscheidung

Bei Money-Path-Drift-Discoveries (Wallet-Drift, Transaction-Inkonsistenz, Balance-Mismatch) ist **Phase-A-Investigation read-only PFLICHT** vor jeder Reconcile-Empfehlung. Mögliche False-Alarm-Quellen müssen aktiv ausgeschlossen werden:

1. **Test-Bot-Daten:** Filter `handle LIKE 'bot%'` aus Production-Audits
2. **Test-Setup-Scripts:** Greppen `e2e/`, `scripts/seed-*.ts`, `scripts/refresh-*.ts` für direkte wallet/balance-Mutationen ohne ledger
3. **Cron-Pattern:** Cron-Jobs wallet-touchen ohne transactions-Insert
4. **Migration-Drift-Patches:** Slice-Backfills die einmal liefen
5. **Bulk-Time-Window-Match:** wallets.updated_at clustering — wenn 100% in 7-Sek-Fenster: Bulk-Operation, nicht echter Drift

Wenn alle 5 ausgeschlossen → Phase B Reconcile.

### Begründung

Slice 248 Pre-Push-Hook entdeckte 44 wallet-drifts in Production-Supabase mit Total ~1.62M $SCOUT. **Phase-A-Investigation (Slice 249 Phase B)** fand: ALLE 44 Wallets sind Test-Bots (`handle LIKE 'bot%'`), 29 in 7-Sekunden-Fenster updated, Smoking-Gun-Code: `e2e/bots/ai/refresh-wallets.ts` (designed Test-Setup).

Ohne Phase-A wäre Reconcile-Migration für 1.62M $SCOUT angenommen, die de-facto unnötig + falsch wäre. False-Positive-Reconcile-Migrations sind Money-Path-Critical-Anti-Pattern (würde Test-Bot-State zur Production-Truth machen).

### Auswirkungen

- **Code:** `db-invariants.test.ts` Bot-Filter (Slice 250 als Recovery)
- **Prozess:** Slice 249 als Pattern-Vorbild für Money-Path-Investigations. SHIP-Loop SPEC-Stage Sektion 1.4 Code-Reading-Liste muss bei Money-Path-Drifts diese 5 Checks enthalten.
- **Team:** CTO + Anil

### Alternativen erwogen

- **Sofort Reconcile basierend auf Drift-Liste:** Verworfen weil False-Positives potenziell Money-Loss verursachen.
- **Audit-Tool ausbauen damit es Bots filtert:** Komplementär zu D57 (Slice 250 macht das), aber nicht ersatz für Investigation-Process.

### Re-Visit-Trigger

Wenn Phase-A-Investigation für künftige Drift-Discovery 90+ min dauert ohne Root-Cause: Tooling-Gap, neuer Audit-Aspect (z.B. pg_audit aktivieren).

---

## D58 — PROCESS: Wave-Bridge-Cleanup-Pflicht in Multi-Wave-Slices

**Datum:** 2026-04-29
**Status:** ✅ Aktiv
**Supersedes:** —

### Entscheidung

Bei Multi-Wave-L-Slices (z.B. Slice 251 mit Wave 1-6), wo eine frühere Wave Bridge-Code via Hook/Prop einführt (z.B. `useGameweek(gwEvents, activeClub?.league_id ?? null)` als Wave-1-Bridge), MUSS die Wave die den finalen Mechanismus implementiert (z.B. Wave 3 SSOT-Store) den Bridge-Code aktiv ersetzen — explicit grep auf Bridge-Pattern als Pflicht-Item in Spec-Code-Reading-Liste UND Pre-Review-Memo R-Liste.

**Pflicht-Pattern in Spec-Sektion 1.4 (Migration Map):**
- Tabellen-Spalte „Wave-X-Bridge?" für jeden migrierten Konsumenten
- Pflicht-Edit-Item: „Bridge entfernen + auf neuen Mechanismus umstellen"

**Pflicht in Pre-Review-Memo:**
- Sektion „Migration-Surface beyond Konsumenten": prüfe Hooks + Queries + Services die migrierte Files nutzen, ob sie selbst Bridge-Code enthalten
- Wenn ja: explicit-confirm dass Bridge ersetzt wurde ODER explicit-defer mit Begründung

### Begründung

Slice 251 Wave 3 Track C wurde initial vom frontend-Agent gebaut: Store + Header + 6+2-Page-Migration + R-02 Cascade-Caller. Reviewer-Agent (cold-context) F-01 P0 entdeckte: `useGameweek(gwEvents, activeClub?.league_id)` Wave-1-Bridge in `FantasyContent.tsx:87` blieb unverändert. **Folge:** Hauptmotivation des Slices („Header-Switch wirkt überall atomar") wäre nicht erfüllt — User wechselt Liga im Header → GW + max_gameweeks bleiben aus `activeClub.league_id` → Stale-GW.

Reviewer-Quote: „Bridge bleibt forever-V1, der zentrale Switch-Use-Case wird nicht erfüllt. F-01 ist genau dieses Anti-Pattern."

Briefing-Lehre: Mein Track-C-Briefing listete 6 Konsumenten + 2 D54-Sub-Components. Aber ich nannte den Bridge-Code in `FantasyContent.tsx:85-87` nicht explizit. Der Agent migrierte korrekt was er sah, übersah aber das semantisch-zentrale Bridge-Replacement.

### Auswirkungen

- **Code:** Slice 251 Wave 3 Heal-Pass F-01 (commit 687bcb91 + manueller Heal-Edit) — useGameweek-Bridge ersetzt durch `useLeagueScope(s => s.leagueId)` + Bonus SpieltagTab leagueId-prop.
- **Prozess:**
  - SHIP-Loop SPEC-Stage Sektion 1.4 Migration-Map muss bei Multi-Wave-L-Slices „Wave-X-Bridge?"-Spalte enthalten.
  - SHIP-Loop Pre-Review-Memo (1b) muss „Migration-Surface beyond Konsumenten"-Sektion enthalten.
  - Briefing-Template für Multi-Wave-Slices: explicit-listen aller Bridge-Pattern aus früheren Waves.
- **Team:** CTO + Frontend/Backend-Agents

### Alternativen erwogen

- **Reviewer-Agent fängt das immer:** Verworfen — Reviewer ist letzte Falle, nicht erste. Pre-Build-Audit ist deutlich günstiger als Post-Build-Heal.
- **Bridge-Code mit `// TODO: Wave X` markieren:** Verworfen — TODOs verrotten + werden nicht systematisch durchsucht. Spec-Sektion ist enforcement-architektur (D45 „Hooks > Text-Regeln").
- **Tooling: Bridge-Pattern-Detector ähnlich D52 audit-tools:** Backlog-Würdig (z.B. `audit:bridge-debt`-Tool das `// Bridge:` Comments + Slice-N-Wave-X-Marker scannt + Slice-Tracker abgleicht). Nicht jetzt — erst sammeln ob diese Bridge-Klasse wiederholt auftritt.

### Re-Visit-Trigger

Wenn ein weiterer Multi-Wave-Slice eine Bridge-Cleanup-Lücke hat trotz D58-Process-Hardening: Tooling-Implementation `audit:bridge-debt`.

### Pattern-Familie

- **D43** Type-Truth-Drift („Existenz ≠ Verwendung" Type-Achse)
- **D46** Service-Duplicate / Orphan-Component („Existenz ≠ Verwendung" Component-Achse)
- **D54** Build-without-Wire („Existenz ≠ Verwendung" Tool/Hook-Achse)
- **D58** Wave-Bridge-Cleanup („Existenz ≠ Verwendung" Time-Axis innerhalb Multi-Wave-Slice)

Cross-cutting: Eine Code-Stelle die früher als „Bridge" / „Stub" / „Placeholder" / „TODO" markiert war, kann ohne explizit Cleanup-Schritt zur Permanent-Variante driften und das Final-Design verfälschen.

---

## D60 — PROCESS: Wave-Verify-Standard — Re-Switch-Flow Pflicht bei State-Switch-Features

**Datum:** 2026-04-29
**Status:** ✅ Aktiv
**Supersedes:** —

### Entscheidung

Bei jedem Live-Verify eines Wave/Slice der **State-Switch** implementiert (Liga, Country, Tab, User, Locale, Theme), MUSS der Verify-Flow **alle 3 Phasen** testen:

1. **Fresh-Init:** Page-Load mit cleared state → Default picks korrekt aus Cascade/Source-of-Truth
2. **A→B Switch:** State von A zu B wechseln → atomar, kein Stuck-on-A-State
3. **B→A Re-Switch:** Zurück von B zu A → atomar, kein Stuck-on-B-State (deckt prevRef-Bugs + Cache-Race)

Phase 3 ist der **kritischste** Test. Pre-Slice-254 Live-Verify-Standards testeten nur Phase 1+2 (fresh + forward-switch) — Phase 3 deckte Slice 254 v1's Bug auf (init-Effect freezt State bei Re-Switch via stale-cached source-of-truth).

### Begründung

Anil-Direktive 2026-04-29 nach Slice 254 v1 Live-Verify gefunden den Re-Switch-Bug:
> "danach bauen wir unseren workflow so um, dass uns das nicht mehr passiert"

Slice 254 v1 hatte alle 3 Frontend-Heals deployed, lokale tsc + vitest grün, Reviewer CONCERNS-mergeable. **Erst Live-Verify Re-Switch-Flow** entdeckte den bleibenden Race-Condition (Init-Effect picks stale-cached activeGw → freezt selectedGameweek). Wenn Live-Verify nur fresh-Init + A→B getestet hätte, wäre v1 als done geloggt worden — Anil hätte den Bug 2-3 Tage später bei Beta-Tester-Feedback wiederentdeckt.

Strukturell: State-Switch-Features haben drei verschiedene Code-Pfade die separat brechen können:
- **Init-Pfad** (mount mit Default) — Cascade-Logic
- **Forward-Switch-Pfad** (A→B) — invalidate-Logic, cache-refetch
- **Re-Switch-Pfad** (B→A) — prevRef-Tracking, Reset-Logic, Cache-Race

Tests die nur 2 Pfade decken **lassen den 3. unbedeckt** und bugs schlummern bis User-Feedback.

### Auswirkungen

- **Code:** `worklog/specs/_TEMPLATE.md` — Sektion "Self-Verification Commands" erweitert um Re-Switch-Pflicht-Schritt für State-Switch-Features.
- **Code:** keine direkten Code-Aenderungen — Standard ist Process-Layer.
- **Prozess (Verify-Pflicht):** zukünftige `worklog/proofs/<slice>-postdeploy-verify.md` MUSS bei State-Switch-Features die 3 Phasen explizit auflisten + Result pro Phase.
- **Reviewer-Agent-Briefing:** zusätzliche Pflicht-Frage "Wurde Re-Switch-Flow im Live-Verify getestet?" — wenn nein → CONCERNS bis nachgeholt.
- **Hook-Kandidat (Slice 256+):** `ship-verify-completeness-gate.sh` warnt wenn `worklog/proofs/<slice>-postdeploy-verify.md` für State-Switch-Slice nicht alle 3 Phasen dokumentiert.
- **Team:** Anil (CEO-Direktive). CTO setzt um in Slice 254 Live-Verify nachträglich (heute geschehen) + alle zukünftigen Wave-Verifies.

### Alternativen erwogen

- **Nur Forward-Switch (A→B) testen:** Verworfen — Re-Switch-Bugs sind häufiger als Forward-Switch-Bugs (state-cleanup-Pfad ist komplexer als state-init-Pfad). Slice 254 ist genau dieses Pattern.
- **Unit-Tests statt Live-Verify-Standard:** Verworfen — Race-Conditions zwischen React-Query-Cache + Effect-Order sind in JSDOM-Tests schwer reproduzierbar. Live-Browser hat reale Network-Latency die den Race triggert. Vitest grün ≠ Browser grün.
- **Optional als "Best-Practice":** Verworfen — pre-Slice-254 war Re-Switch-Test bereits "Best-Practice" aber nicht enforced. Pflicht-Standard schließt die Lücke.

### Re-Visit-Trigger

Wenn nach 5 State-Switch-Slices unter D60 KEINEN Re-Switch-Bug aufdeckt: Standard kann auf "starkes Indiz" reduziert werden. Bis dahin Pflicht.

### Pattern-Familie

- **D43** Type-Truth-Drift („Existenz ≠ Verwendung" Type-Achse)
- **D46** Service-Duplicate / Orphan-Component („Existenz ≠ Verwendung" Component-Achse)
- **D54** Build-without-Wire („Existenz ≠ Verwendung" Tool/Hook-Achse)
- **D58** Wave-Bridge-Cleanup („Existenz ≠ Verwendung" Time-Axis innerhalb Multi-Wave-Slice)
- **D60** Wave-Verify-Re-Switch-Pflicht („Verify-Vollstaendigkeit" Process-Achse)

Cross-cutting: Wenn ein Test/Verify nicht alle Code-Pfade deckt, kann der ungetestete Pfad ohne Detection driften. D60 schliesst diese Lücke explizit für State-Switch-Pfade.

---

## D59 — PRODUCT: BeScout-Character-Spezifikation, kein FPL-Klon

**Datum:** 2026-04-29
**Status:** ✅ Aktiv
**Supersedes:** —

### Entscheidung

BeScout baut **eigene Charakter-Spezifikation** — übernimmt nicht selektiv Features/Mechaniken von FPL (Fantasy Premier League), Comunio oder anderen Fantasy-Plattformen, nur weil Top-User dieser Plattformen es erwarten würden. **Wenn ein Audit-Finding Form „auf Plattform X gibt's Y, BeScout sollte das auch tun" hat, ist die Default-Klassifikation WONT-FIX**, nicht „CEO-pending".

Konkret 2026-04-29 entschieden für 3 Money-Path-Pending-Items aus `worklog/audits/2026-04-25/fantasy.md` + `worklog/audits/2026-04-26/aggregate.md`:

| Finding | Direktive | Begründung |
|---------|-----------|--------|
| **FANTASY-NEU-1** FPL 60-min-Rule + perfL5-vs-0-15-Mapping | WONT-FIX | BeScout-Score-Engine basiert bewusst auf perfL5 (40-150) statt FPL-direct (0-15). 60-min-Auto-Sub-Rule wird nicht übernommen — BeScout's `v_starter_minutes <= 0` ist eigene Spec. |
| **F-09** BPS-Bonus-System (FPL Top-3 +3/+2/+1) | WONT-FIX | API-Football's `bonus`-Field bleibt ungenutzt. BeScout's perfL5-Engine ist eigener Wertungs-Mechanismus. |
| **UX-20** MembershipSection Confirm-Step | WONT-FIX (mit Re-Visit) | Aktuell Platform-Credits-only in Phase 1 = akzeptabel. Re-Visit-Trigger: WENN echte Fiat-Subscription enabled wird. |

### Begründung

Anil-Direktive 2026-04-29:
> „alles wont fix, wir wollen keinen klon von deren plattform schaffen, sondern bescout character spezifikation durchsetzen auf bauen!"

Strategischer Kontext (siehe `docs/VISION.md` „Kategorie-Innovation" + `business.md` „Asset-Klasse-Positionierung"):
- BeScout-Asset-Klasse ist Equity-analog auf Spieler-Trajektorie, nicht Casual-Fantasy-Sport. FPL-Mechaniken kommen aus anderer Domain.
- Domain-Authenticity ist Differenzierung. „Wie FPL aber mit Trading" ist NICHT die Kategorie-Innovation — siehe Asset-Klasse-Doppel-Register (Equity-Wahrheit intern, Utility-Sprache extern).
- Audit-Findings die BeScout am Vergleich zu Comunio/FPL/Sorare messen sind **Audit-Methodik-Drift** — die Vergleichs-Norm ist falsch.

Dies setzt eine **Default-Direktive für zukünftige Audits**: bei Findings „BeScout fehlt Feature X von Plattform Y" → erste Frage ist „braucht BeScout-Spec das?", nicht „wieviel Aufwand für Implementation?". Wenn Spec es nicht braucht → WONT-FIX, nicht CEO-pending.

### Auswirkungen

- **Code:** keine (3× WONT-FIX, kein Code-Change)
- **`worklog/beta-phase.md`:** ceo_pending → wont_fix für FANTASY-NEU-1, F-09, UX-20. ceo_pending = leeres Array.
- **Prozess (Audit-Methodik):** zukünftige Audit-Agents (fantasy-scoring-expert, fm-mechanics-expert, persona-walker) bekommen Briefing-Erweiterung — Findings der Form „auf Plattform X gibt's Y" werden mit „Char-Spec-Check"-Tag versehen. Default-Empfehlung WONT-FIX, außer Char-Spec rechtfertigt explizit.
- **Team:** Anil (CEO-Direktive). CTO setzt um in Slice 253 + zukünftigen Audits.
- **Beta-Phase:** ceo_pending = 0 → letzter Tech-Block vor Sign-Off-Re-Trial weg (übrig: Anil-Mensch-Action „3 Tester organisieren").

### Alternativen erwogen

- **Pro Finding einzeln entscheiden:** Verworfen — strategische Direktive ist holistisch, nicht per-Finding. Default-Verschiebung verhindert wiederkehrende „auf Plattform X gibt's Y"-Audit-Drift in zukünftigen Phasen.
- **DEFER post-Beta für FANTASY-NEU-1 + F-09:** Verworfen — DEFER hieße „später entscheiden", aber Spec-Decision ist „nicht-übernehmen, fertig". Klarheit > Optionalität.
- **Tooltip-Erklärung „BeScout ist kein FPL-Klon" im UI:** Verworfen — Anil's Begründung „durchsetzen + aufbauen" implizit: nicht über Vergleich erklären, sondern eigene Kategorie etablieren.

### Re-Visit-Trigger

- **FANTASY-NEU-1 / F-09:** wenn Beta mit ≥20 echten Testern signifikante User-Confusion-Friction-Signale zeigt („Warum sind Scores 40-150 statt 0-15?", „Wo sind die Top-3-Bonus-Punkte?") — dann **Spec-Re-Eval**, nicht Implementation-Re-Eval. Spec entscheidet ob übernommen wird.
- **UX-20:** wenn echte Fiat-Subscription enabled wird (Phase 3+ Licensing) → ConfirmDialog pflichtig nachholen analog BuyConfirmModal-Pattern.

### Pattern-Familie

- **D59** ist erste explizite **PRODUCT**-Direktive zur Char-Spec-vs-Plattform-Klon-Frage. Vorhergehende PRODUCT-Decisions (D1 7-Ligen-Scope, decision_pricing_asset_model, decision_dpc_to_scout_card) waren feature-spezifisch.
- Komplementär zu `business.md` „Asset-Klasse-Positionierung" + „Erweitertes Verbots-Register" — beide schützen Differenzierung gegen unreflektiertes Mainstream-Mimicking.

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

---
## D61 — ARCHITECTURE: Service Worker Cache-Strategie ist nur-Static-Assets

**Datum:** 2026-04-30 (Slice 259)
**Status:** Aktiv
**Category:** ARCHITECTURE

### Entscheidung

Der BeScout Service Worker (`public/sw.js`) cached **ausschließlich**:
1. Static Assets aus `/_next/static/`, `/icons/`, `/logo.png`, `/schrift.png` (CDN-cached, JWT-irrelevant)
2. Offline-Fallback-Page (`/offline.html`)

Authenticated APIs (Supabase REST `/rest/v1/*`, alle anderen JWT-bearing Endpoints) werden **niemals** auf SW-Layer gecached. Pass-through to network — Browser HTTP-Cache + TanStack Query handhaben Caching auf den richtigen Layern mit JWT-Awareness.

### Begründung

Cache API ist URL-keyed. Authorization-Header (JWT) ist nicht Teil des Cache-Keys. Authenticated-API-Caching im SW erzeugt:
1. **Cross-Auth-Pollution:** anon-Response nach Login weiter-serviert
2. **Cross-User-Pollution-Risiko:** User A's Cache-Entry bei URL-Match an User B
3. **Stale-on-First-Load-Symptom:** stale-while-revalidate-Cache returnt leere/alte Daten beim ersten Visit nach Login → User muss refreshen

TanStack Query ist der korrekte Layer für authenticated-Daten-Caching (JWT-aware via Supabase-Client, per-user query-keys, auth-state-change-Invalidation).

### Auswirkungen

- ✅ Alle authenticated REST-Calls gehen direkt ans Netz (TanStack Query cached client-side)
- ✅ SW-Update kostet 1 Reload bei existing Tabs (PWA-Standard via `skipWaiting + clients.claim`)
- ✅ Cache-Migration via Cache-Name-Bump (`vN → vN+1`) + catch-all-Filter im activate-handler
- ✅ Push-Notifications + Static-Assets unverändert
- ⚠️ Verlust des theoretischen offline-Reads für REST-Daten (war eh nicht zuverlässig wegen JWT-Race) — TanStack Query offline-mode kann das später übernehmen

### Alternativen erwogen

- **Alt A (verworfen): JWT-keyed Cache** — Manual Cache-Key mit `userId+url` Prefix bauen. Komplex (Auth-Header-Parsing in fetch-handler, Token-Refresh-Handling, Logout-Eviction). Complexity-to-Benefit-Ratio schlecht: REST-Calls sind nicht LCP-blocking, Win marginal.
- **Alt B (verworfen): Per-Request-Vary-Header** — Cache API supports nur explicit `cacheKeys` mit `ignoreSearch`-Optionen, kein nativer Header-Vary. Manual-Wrapping noch komplexer als Alt A.
- **Alt C (verworfen): Whitelist nur unauthenticated REST-Endpoints** — Es gibt keine. ALLE Supabase-REST-Calls bei BeScout authenticated.
- **Alt D (gewählt): Removal — pass-through to network** — Subtraktiv, low-risk, korrekt-by-default. TanStack Query ist explizit der für JWT-aware Caching designed Layer.

### Re-Visit-Trigger

- Wenn Offline-Mode-Pflicht für authenticated Daten kommt → TanStack Query `persistQueryClient` + IndexedDB persistence (nicht SW-Cache)
- Wenn Bandwidth-Probleme bei Mobile → CDN-Layer (Vercel Edge), nicht Client-SW
- Wenn andere WebApp BeScout-SW-Code als Template übernimmt → erst diese Decision lesen

### Implementation

`public/sw.js` (Slice 259 commit `d4583303`). Pattern in `memory/patterns.md` #40.

## D62 — PROCESS: Reviewer-VOR-BUILD-Stage bei Re-Doing-Reverted-Slices

**Datum:** 2026-04-30 · **Status:** Aktiv (Kanon) · **Slice:** 268
> **Evolution (1 Thema, D62 = Kanon):** D62 Einführung → **D65** Promotion zu Default für M+ Slices (operative Regel) → **D67** ROI nach 7 Slices bestätigt (0 Reverts, reine Empirik). (konsolidiert E0-W2b 2026-06-17)

### Entscheidung

Bei jeder Slice die ein zuvor REVERTED-Slice wiederholt (gleiches Feature, neuer Versuch nach Lehrgeld), ist **Reviewer-Agent VOR BUILD** Pflicht-Stage — nicht nur POST-BUILD. Reviewer prüft die Spec, nicht den Code, und stellt sicher dass die Anti-Patterns aus dem REVERT in der Spec als **harte Constraints** eingebrannt sind.

### Begründung

**Empirisch (Slice 268):** Spec-Reviewer fand 3 MINORs (AC-09 Money-Path-Test fehlte, clearCachedAllSlots-Synchronicity-Detail unklar, Edge-Cases #11+#12 fehlten) bevor eine Zeile Code geschrieben wurde. Diese MINORs hätten bei POST-BUILD-Review Code-Rewrite ausgelöst (vermutlich 1-2h). VOR-BUILD: 15 min Spec-Edit.

**Bug-Klasse:** Re-Doing-Reverted-Slices haben höhere Spec-Drift-Wahrscheinlichkeit weil:
1. Author hat den Reverted-Code im Kopf → unbewusste Verzerrung der Lösung Richtung "wie es vorher war"
2. Anti-Patterns sind individuell-klar, aber kollektiv schwer zu enumerieren ohne Cold-Context-Audit
3. Money-Path-relevante Slices haben minimal-Toleranz für Spec-Schwächen

### Auswirkungen

**Stage-Chain neu für Re-Doing-Reverted-Slices:**

```
SPEC → IMPACT → REVIEWER-VOR-BUILD (NEU, Pflicht) → BUILD → REVIEWER-POST-BUILD (Slice 211 D50) → PROVE → LOG
```

**Trigger-Bedingung:** Slice in `worklog/log.md` mit Notes-Hinweis "Re-Doing Slice X" ODER Spec-Sektion 11 (Scope-Out) erwähnt explizit "Slice X war REVERTED, hier nochmal versuchen". Hook-Detection optional (post-Slice-268-Backlog).

**Format Review-File:** `worklog/reviews/<NNN>-spec-review.md` (separater File neben `<NNN>-review.md` für POST-BUILD).

**Reviewer-Briefing-Pflicht-Punkte:**
1. Anti-Pattern-Vermeidungs-Liste aus Reverted-Slice (5 Punkte minimum) — alle in Spec verboten + grep-prüfbar?
2. Money-Path-Schutz vorhanden (wenn Slice Money/Auth/Security berührt)?
3. AC-Coverage für die exakte Bug-Klasse die Revert ausgelöst hat?
4. Pre-Mortem ≥ 5 Szenarien mit Probability/Impact?

### Alternativen erwogen

**A. Spec-Quality-Self-Check als Hook:** Hook prüft Spec-Datei auf Pflicht-Sektionen pre-Edit-Lock. Slice 212 hat das als WARN-only implementiert — funktioniert für Standard-Slices, aber erkennt nicht "ist das eine Re-Doing-Reverted-Slice"-Kontext. **Verworfen** weil Spec-Inhalt-Qualität nicht Hook-prüfbar.

**B. Nur POST-BUILD-Review wie immer:** Slice-265+266 hat das gemacht und beide wurden revertet. **Verworfen** durch empirischen Beweis.

**C. Anil-Manuell-Review der Spec:** Funktioniert, aber Anil ist CEO nicht CTO — soll keine Spec-Quality-Audit-Last tragen. **Verworfen.**

### Re-Visit-Trigger

Wenn nach 5 Slices mit Reviewer-VOR-BUILD die Hit-Rate (gefundene-MINORs / Slices) < 30% ist, kann Pflicht zu OPT-IN reduziert werden. Bisher 1 von 1 Slice (Slice 268) hat 3 MINORs gefunden = 100% Hit-Rate.

### Beziehung zu existing Patterns

- **D43 (Auth-Hydration-Race):** Defense-in-Depth-Pattern — Reviewer-VOR-BUILD ist Process-Achse derselben Philosophie
- **D54 (Build-without-Wire):** UI-Definition-of-Done — Reviewer-VOR-BUILD ist Spec-Quality-Definition-of-Done

---

## D63 — PRODUCT: Home-Ultimate-Redesign-Plan (5-Phasen-Roadmap, kontextueller Hero)

**Datum:** 2026-04-30 · **Status:** Aktiv · **Slice:** 261 (Phase 1 startet)

### Entscheidung

Home-Page wird in 5 Phasen kompletter umgebaut. Vision: „BeScout-Identität in 5 Sekunden — WER bin ich (Manager + Scout), WAS ist jetzt los (Live-Pulse), WAS muss ich tun (Action) — alles above-the-fold, ohne Wahl-Lähmung."

**5 Phasen + ~13 Slices (261-273):**

| Phase | Scope | Slices |
|-------|-------|--------|
| **1 Identity-Foundation** | GW-Awareness + Hero-Mode-Switch + Hero-Pills | 261 (GW-Bar) · 262 (Hero-Mode + Manager-Block) · 263 (Liga-Rang + Streak-Risk + Scout-Block) |
| **2 Action-Layer** | ActionRequiredStack vor Spotlight | 264 (Captain/Lineup/Wildcard) · 265 (Streak-Risk + Mission-Progress) |
| **3 Live-Pulse + Manager-Hub** | Multi-Slot-Pulse + Live-Score während GW | 266 (Spotlight-Refactor) · 267 (Live-Score Realtime) · 268 (Price-Changes Cache) |
| **4 Discovery-Konsolidierung** | Markt-Puls als 3-Tab-Section | 269 |
| **5 Visual-Polish (Bilder)** | Stadium-Asset-Pipeline + Player-Action-Shots + 3D-Mystery-Box | 270-273 |

**Hero-Verhalten (kontextueller Hero, Anil-Decision 2026-04-30):**

| Kontext | Primär (groß) | Sekundär (Pill) | Hero-Number |
|---------|---------------|-----------------|-------------|
| Aktive GW (Liga hat `events.status='running'\|'late-reg'`) | Manager-Block | Scout-Block | GW-Score + Liga-Rang |
| Off-GW + Holdings | Scout-Block | Manager-Block | Portfolio-Wert + PnL% |
| 0-Holdings + Off-GW | CTA-Block | — | „Erste Scout Card"-CTA |
| 0-Holdings + Aktive GW | Manager-CTA | Scout-CTA klein | „Spieltag startet — stelle Lineup auf" |

**Kontext-Switch-Source:** `useHomeData()` Derived-Wert `heroMode: 'manager' | 'scout' | 'cta-new'`.

### Begründung

**3-Persona-Audit (Game-Designer + Sports-App-Engineer + FM-Manager-Expert) hat decken folgende Gaps gefunden:**

- FM-Power-User: Persistent GW-Bar fehlt, Liga-Rang fehlt, Live-Score während GW fehlt, Captain-Reminder fehlt
- Game-Designer: Mystery-Box als Sidebar-#16 begraben, Streak-Risk fehlt, Daily-Mission-Progress fehlt, Spotlight-null tote Zone
- Sports-App-Engineer: Realtime-Channel fehlt für Live-Status, `getPlayerPriceChanges7d` ohne TanStack-Cache

**3 Cross-Persona-Top-Findings:**
1. Mystery-Box ist begraben (Daily-Driver-Killer)
2. Gameweek-Awareness fehlt komplett (FM-Identitäts-Bruch)
3. `getPlayerPriceChanges7d` ohne Cache (Performance + Battery)

### Auswirkungen

**Implementations-Reihenfolge folgt Phasen** — keine Out-of-Order-Sprünge ohne CEO-Approval.

**Compliance-Drahtseilakt eingehalten:**
- Scout-Block-Wording „Kader-Wert · +5.4%" ist Equity-Register im Kopf, neutral im Wort (business.md Doppel-Register)
- Holdings-Price-Alert formuliert als „MV-Trend-Indikator", nicht als Spekulations-Empfehlung
- IPO-Card behält „Erstverkauf" / „Kulüp Satışı" durchgehend

**Bilder-Strategie (Phase 5):**
- 7 Liga-Stadium-BGs (`/stadiums/<liga>_hero.webp` + `_card.webp`) via SDXL Phase-1, Lizenz-Photos Phase-2, Eigene Photoshoots post-Beta
- Player-Action-Shots-Fallback per Position (`/players/silhouette_<pos>.webp`)
- 3D-Mystery-Box-Renders per Rarity (`/equipment/box_<rarity>.webp`)
- Achievement-Badges + Tier-Badge-Glows (existing)

### Alternativen erwogen

**A. Tab-Switch Manager/Scout statt parallel:** Saubere mental-model-Separation, aber erfordert User-Action vor Identitäts-Sichtbarkeit. **Verworfen** weil Doppel-Register-Identität gerade BeScout-Innovation ist (siehe `business.md` Sektion „Asset-Klasse-Positionierung — Wording-Drahtseilakt").

**B. Inkrementeller Refactor ohne Phasen-Plan:** Slice-by-Slice ohne übergeordnete Roadmap. **Verworfen** weil Cross-Phase-Dependencies (z.B. Phase 5 Stadium-Photos brauchen Phase 1-4 als Slot-Owner) sonst chaotisch landen.

**C. Komplett-Rewrite von page.tsx:** Bigger-Bang aber Slice-265-266-Revert-Lehre zeigt: Multi-File-Big-Bangs sind Risk-Klasse. **Verworfen** zugunsten Slice-für-Slice mit D62-Reviewer-VOR-BUILD.

### Re-Visit-Trigger

- Beta-Day-3+ Tester-Findings könnten Phase-Reihenfolge ändern (z.B. Mystery-Box-Discoverability höher priorisieren als Phase 2)
- Wenn Phase 1 Anil + Tester nicht überzeugt → Plan revisit nach Phase 2 (Action-Layer könnte mehr Wert bringen als Identity-Foundation)
- Wenn Vercel-Deploy-Cost durch Phase-5-Bilder-Asset stark steigt → CDN-Strategy Re-Evaluation

### Beziehung zu existing Patterns

- **D59 (BeScout-Character-Spezifikation, kein FPL-Klon):** Home-Redesign macht BeScout-Character sichtbar (Doppel-Identität, Trading + Manager parallel) statt FPL-Klon (Manager-only)
- **D54 (Build-without-Wire):** Phase 5 ist Asset-Pipeline → Asset-Files allein sind nicht Done, müssen in Component-Slot eingebunden sein
- **D40-D43 (Auth-Hydration + Type-Truth):** Phase 1+2 nutzen useLeagueScope SSOT + Stateless-Components → keine neuen Auth-Race-Risiken

---

## D64 — PROCESS: Multi-Choice-Decisions als Spec-Iteration-Speedup

**Datum:** 2026-05-01 · **Status:** Trial · **Slice:** 261

### Entscheidung

Bei Spec-Iterationen mit ≥ 2 offenen Anil-Decisions (CEO-Scope) **kompakt-Format mit Optionen-Buchstaben** anbieten statt freier Text-Frage. CTO präsentiert:

```
| # | Frage | Optionen | Empfehlung |
|---|-------|----------|------------|
| A | … | (a) X · (b) Y · (c) Z | b |
| B | … | (a) X · (b) Y | a |
| C | … | ja / anders | ja |
```

Anil antwortet kompakt z.B. „A=b · B=a · C=ja" oder einzeln „c" wenn nur 1 Decision noch offen.

### Begründung

**Empirisch (Slice 261):** Spec-Iteration brauchte 3 CEO-Decisions (A=b „2d 4h" beide Locales, B=b Bar ersetzt Spotlight-Event, C=ja TR „Hafta 28"). Anil tippt kurz (Codebase-Memory: „Spricht Deutsch, tippt kurz, will kurze Antworten"). Multi-Choice-Format reduzierte Decision-Round-Trip von 3× Frage-Antwort auf 1 strukturierte Antwort.

**Reduziert Spec-Drift-Risk:** Wenn CEO frei antwortet, kann Subtilität verloren gehen. Multi-Choice mit CTO-Empfehlung gibt CEO „Default genehmigt" als pragmatischen Pfad ODER „andere Variante" mit klarer Differenzierung.

### Anwendungs-Kriterien

**Wann nutzen:**
- ≥ 2 offene CEO-Decisions in einer Spec-Iteration
- Decisions sind klar enumerierbar (nicht „was meinst du dazu?")
- CTO hat eine begründete Empfehlung pro Decision (nicht „weiß ich nicht, du musst entscheiden")

**Wann NICHT nutzen:**
- Open-ended Strategy-Fragen (Markt, Zielgruppe, Pricing) → freier Text
- Money-Path-Decisions (Fee-Splits, Compliance) → eigener Frage-Round-Trip mit Risiko-Erläuterung
- Wenn nur 1 Decision offen → einzelne Frage reicht

### Alternativen erwogen

**A. Freier Text-Dialog wie bisher:** Funktioniert immer, aber bei 3+ Decisions wird's verschachtelt. **Nicht verworfen** — bleibt als Default für komplexe Strategie-Fragen.

**B. Markdown-Checkbox-List für CEO:** „- [ ] Option A1 / [ ] A2 / [ ] A3" — schwer zu parsen wenn CEO in Chat antwortet. **Verworfen** weil Tabellen-Format kompakter.

**C. Mündlich/Voice klären:** Außerhalb Chat-Loop → durchbricht Knowledge-Trail. **Verworfen.**

### Re-Visit-Trigger

Nach 5 weiteren Slices mit Multi-Choice-Format: Hit-Rate bewerten. Wenn Anil ≥ 80% des Mal CTO-Empfehlung approved (= „a · b · c" matched Empfehlung), zeigt das gute CTO-Empathie. Wenn < 50% → CTO bewertet falsch was Anil will, Format dann hinterfragen.

### Beziehung zu existing Patterns

- **D62 (Reviewer-VOR-BUILD):** D64 ist komplementär — Reviewer findet Tech-Spec-Drift, Multi-Choice-Format reduziert CEO-Decision-Drift
- **`feedback_autonomous_loop.md`:** Nach Alignment autonom durchziehen — Multi-Choice ist genau der Alignment-Schritt

---

## D65 — PROCESS: D62 Reviewer-VOR-BUILD bewährt — Promotion zu Default für M+ Slices

**Datum:** 2026-05-02 · **Status:** Aktiv · **Slices als Evidence:** 261, 262, 263, 264, 264b (5 in Folge)

### Entscheidung

D62 (Reviewer-VOR-BUILD-Stage) wird ab sofort **Default-Pflicht für alle Slices ab S-Größe** (UI/Service/Schema/Tool/Hook/GHA). XS-Slices mit reiner Pattern-Reuse können Self-Review nutzen (workflow.md §3b Ausnahme bleibt).

### Begründung — Empirische Bilanz nach 5 Slices

| Slice | Größe | Pre-Review-Verdict | Findings vor BUILD | BUILD-Reverts vermieden |
|-------|-------|--------------------|--------------------|-----|
| 261 | S | REWORK | 4xP0 + 6xP1 | mind. 1 (z-index/league-id) |
| 262 | M | REWORK | 3xP0 + 4xP1 + 2xP2 | mind. 1 (useLeagueScope-Import) |
| 263 | S | CONCERNS | 1xP0 + 4xP1 + 3xP2 | mind. 1 (i18n-Konflikt) |
| 264 | S→M | REWORK | 4xP0 + 4xP1 + 4xP2 | mind. 2 (useHomeData-Drift + Mount-Position) |
| 264b | XS-S | CONCERNS | 0xP0 + 2xP1 + 5xP2 | mind. 1 (Test-Suite-Mock-Drift) |

**Gesamt: 50 Findings vor BUILD gefangen.** Geschätzte Cost-Avoidance: 6-8 BUILD-Reverts × 1-2h = 8-16h gespart über 5 Slices. Pre-Review-Cost ~20-30 min pro Slice = 2 h investiert.

**ROI: 4-8x.**

### Auswirkungen

- **workflow.md §3b REVIEW-Stage:** Pre-Review-VOR-BUILD bei S+/M+/L-Slices wird Pflicht statt „bei Re-Doing-Reverted-Slices ODER bei komplexen Specs".
- **XS-Slice-Ausnahme:** Self-Review bleibt erlaubt bei trivialer Pattern-Wiederholung (siehe Slice 264b — ScoutPill-Pattern → WildcardPill-Pattern).
- **Reviewer-Agent-Output-Limit-Workaround:** In 2/5 Reviews abgeschnitten. Primary-Claude konsolidiert dann partielle Findings + verifiziert offene Punkte selbst (Slice 263, 264 haben das demonstriert). **Akzeptabel** als Fallback.

### Alternativen erwogen

**A. Pre-Review nur bei L-Slices (Cross-Domain):** Hätte 3/5 Slices der letzten Welle nicht abgedeckt — Findings wären in BUILD eskaliert. **Verworfen.**

**B. Reviewer-Agent durch Spec-Self-Audit-Checklist ersetzen:** Cold-Context-Vorteil verloren — Author hat Habit-Blindspots die Self-Audit nicht fängt (Slice 261 z-index-Annahme war so). **Verworfen.**

**C. Pre-Review nur bei Money-Path:** Zu eng — Slice 263 i18n-Drift ist kein Money-Path aber latent (User-Render-Crash). **Verworfen.**

### Re-Visit-Trigger

- Nach 10 weiteren Slices: ROI-Re-Eval. Wenn < 30% der Pre-Reviews neue P0/P1 finden → Pattern downgraden zu „bei Risk-Triggern" (Re-Doing, Cross-Domain, Money-Path).
- Wenn Reviewer-Agent-Output-Limit-Cuts > 50% → Output-Limit-Strategie überdenken (z.B. kürzere Pre-Review-Templates).

### Beziehung zu existing Patterns

- **D62**: Original-Decision (Reverted-Slices) — D65 erweitert auf alle M+ Slices basierend auf empirischer Bewährung
- **D64 Multi-Choice-Decisions**: Komplementär — Reviewer fängt Tech-Drift, Multi-Choice fängt CEO-Decision-Drift
- **errors-infra.md „Spec-Drift-im-Drift-Heal-Anti-Pattern" (Slice 234)**: D65 ist Process-Komplement — Pre-Review fängt Spec-Drift bevor Code geschrieben wird

---

## D66 — ARCHITECTURE: Shared-Helper-Extraction-Pattern (F-06 promoted)

**Datum:** 2026-05-02 · **Status:** Aktiv · **Slices als Evidence:** 263 (`pickScopedEvent`), 264 (`URGENT_THRESHOLD_MS`)

### Entscheidung

Wenn 2+ Komponenten/Hooks identische Filter-/Sort-/Mapping-Logic ODER identische Konstanten haben, MUSS Logic/Konstante in einem geteilten Helper-File leben. Lokale Duplikate driften innerhalb 1-2 Slices auseinander.

### Begründung

**Slice 263 case:** `pickBarEvent` lebte in GameweekStatusBar (Slice 261). Slice 263 brauchte gleichen Filter für `heroMode`-Detection. Statt Logic in useHomeData zu kopieren → Extract nach `helpers.tsx` als `pickScopedEvent`, beide Konsumenten nutzen Single-Source.

**Slice 264 case:** `URGENT_THRESHOLD_MS = 6 * 60 * 60 * 1000` lebte lokal in GameweekStatusBar.tsx. Slice 264 brauchte gleichen Wert für ActionRequiredStack. Extract nach `helpers.tsx`, GameweekStatusBar refactored um zu importieren.

### Anwendungs-Kriterien

**Wann extrahieren:**
- 2+ Konsumenten desselben Filter/Sort/Mapper
- 2+ Konsumenten derselben Magic-Number/String-Konstante
- Drift-Risk hoch (verschiedene Author oder verschiedene Slices verändern lokale Kopien)

**Wann NICHT extrahieren:**
- Single Konsument (Premature Abstraction Risk)
- Identische Logic, aber semantisch separat (z.B. zwei verschiedene Domains mit zufällig gleichem Algorithmus)

### Detection (Pre-BUILD)

Bei jedem neuen Hook/Component der „Filter X events nach scopedLeagueId"-artige Logic braucht:
```bash
grep -rn "events.filter\|status === " src/components/home/
# Prüfe ob bereits ähnliche Logic in einer anderen Datei lebt
```

### Auswirkungen

- **Spec-Quality-Gate:** Pre-Review-Reviewer fragt explizit „kann Helper extrahiert werden?" bei Komponenten die Filter/Sort haben
- **errors-frontend.md:** Pattern als Eintrag im Pattern-Catalog (siehe unten in errors-frontend Sektion „Shared-Helper-Pattern")

### Re-Visit-Trigger

- Wenn `helpers.tsx` > 500 LoC → Sub-File-Splitting erwägen (z.B. `helpers/events.ts`, `helpers/format.ts`)

### Beziehung

- **D54 Build-without-Wire:** Shared-Helper IST verwendete Definition (Existence ≠ Verwendung)
- **errors-infra.md „Spec-Drift-im-Drift-Heal":** Helper-Extraction-Slice MUSS sich selbst auf Drift prüfen (z.B. Slice 263 hat Slice-261 GameweekStatusBar mitrefactort)

---

## D67 — PROCESS: D62 ROI-Empirik nach 7 Slices in Folge bestätigt (0 Reverts)

**Datum:** 2026-05-03 · **Status:** ⤳ Bestätigung zu **D62/D65** (reine Empirik, kein neuer Beschluss — siehe D62 Evolution) · **Slice:** 267 (Realtime-Live-Score, 7. D62-Slice)

### Entscheidung

Nach 7 D62-Slices in Folge (261, 262, 263, 264, 264b, 265, 267) ist Pre-Review-VOR-BUILD-Pattern empirisch validiert mit **0 Reverts** und **0 post-BUILD Code-Patches** im selben Slice. D65 (D62 als Default für M+) wird zu **Default für ALLE Slice-Größen ab S** erweitert.

XS-Ausnahme bleibt erhalten: triviale Pattern-Wiederholung darf weiterhin Self-Review nutzen.

### Empirische Bilanz nach 7 Slices

| Slice | Größe | Pre-Review-Findings | Post-BUILD-Reverts | Post-BUILD-Code-Patches |
|-------|-------|---------------------|--------------------|-------------------------|
| 261 | M | REWORK (4×P0+6×P1) → CONCERNS (1×P0-NEW) | 0 | 1 inline (motion-safe) |
| 262 | M | CONCERNS (3×P0+4×P1+2×P2) | 0 | 2 inline P2-Cleanup |
| 263 | S | CONCERNS (1×P0+4×P1+3×P2) | 0 | 1 spec-drift Note |
| 264 | M | REWORK (4×P0+4×P1+4×P2) | 0 | 4 P2-Notes ohne Action |
| 264b | XS-S | CONCERNS (0×P0+2×P1+5×P2) | 0 | 0 (XS-Self-Review) |
| 265 | S | CONCERNS (0×P0+2×P1+2×P2+1×MINOR) | 0 | 0 |
| 267 | M | CONCERNS (1×P1+1×P1+5×P2+3×MINOR) | 0 | 0 (alle 8 v3-Patches Code-konform) |

**Total:** 50+ Findings vor BUILD adressiert. 0 Reverts. 7 Slices in Folge LIVE.

ROI-Schätzung: 4-8x. ~25 Stunden Heal-Aufwand gespart, ~3-5 Stunden Pre-Review-Cost.

### Begründung

- **Empirische Daten überstimmen Skepsis.** Nach 7 Slices ist Bilanz unbestreitbar.
- **Cold-Context-Reviewer fängt Author-Habit-Blindspots:** Spec-Faktenfehler die im „Code-State" übersehen werden.
- **Kosten-Nutzen-Asymmetrie:** Spec-Edit kostet 5-15 min, Code-Heal 30-90 min + Revert-Risk + Trust-Verlust.

### Auswirkungen

- `/ship` Skill: Pre-Review-Stage zwischen SPEC und IMPACT als Pflicht für **S+ Slices** (war: M+)
- `workflow.md`: Stage-Chain erweitern um „Pre-Review (D62)" zwischen SPEC und IMPACT
- XS-Ausnahme bleibt: Pattern-Wiederholung + Trivial-Cleanup (≤20 Zeilen single-File)

### Alternativen erwogen

- Zurück zu Post-BUILD-Review only — empirisch widerlegt
- D62 nur bei Money/Trading — alle 7 Slices waren UI, ROI auch dort hoch
- Pre-Review optional — Convenience-Skip-Drift-Risk

### Re-Visit-Trigger

- 3 aufeinanderfolgenden Slices mit 0 Pre-Review-Findings → False-Positive-Re-Kalibrierung
- Pre-Review-Cost > 30% Slice-Total-Time → reviewer-Skill optimieren
- Anil-Frust über „zu viel Review-Theatre" → Re-Kalibrierung

### Beziehung

- **D62** (Reviewer-VOR-BUILD bei Reverted-Slices) — D67 erweitert auf alle S+
- **D65** (D62 für M+ Default) — D67 superseeds mit empirischer Bilanz
- **D54** — Pre-Review fängt Wire-Up-Lücken (Slice 267 F-NEW-09 qk-orphan)

---

## D68 — PROCESS: Beta-Phase 3b Tester-Blocker resolved (Phase D Sign-Off unblocked)

**Datum:** 2026-05-03 · **Status:** Aktiv

### Entscheidung

3 Beta-Tester sind im System (Anil-confirmed) und testen aktiv. Sign-Off-Re-Trial-Blocker aus 2026-04-26 (`SOFT-NO-GO wegen Anil-Action-Blocker (Tester-Liste)`) ist aufgehoben. `worklog/beta-phase.md` aktualisiert.

### Begründung

Beta-Phase-Tracker hatte 4 Wochen denselben FAIL-State, einziger Blocker war operativ (Tester organisieren). Tech-Side seit Slice 226+227 maximal sauber (0 P0/P1/P2/P3).

### Auswirkungen

- `worklog/beta-phase.md` `phase: D` mit `last_phase_run: 2026-05-03`
- Nächster Sign-Off-Re-Trial via `/auto-beta-ready signoff` möglich nach Tester-Feedback-Sammlung
- Bei Tester-Findings: Reaktiv-Slices vor Sign-Off-PASS

### Re-Visit-Trigger

- Tester-Feedback ≥1 P0/P1-Issue → `findings_open` updaten + Slice-Backlog erweitern
- Tester-Feedback clean nach 1 Woche → `/auto-beta-ready signoff` ausführen

---

## D69 — PROCESS: Backlog-Sub-Track MUSS nächster Slice sein, nicht „separater Slice nach Beta"

**Datum:** 2026-05-06
**Status:** Aktiv
**Category:** PROCESS
**Trigger:** Slice 276b Hot-Fix Diagnose — Slice 273 Track A2 Cron-Code-Fix wurde als „Backlog für separater Slice 274 nach Beta" markiert. Slice 274/275/276 wurden danach von 3 anderen Live-Bugs vereinnahmt (Form-Bars, Injuries, Logo). Cron-Code-Fix nie gebaut → Bug-Klasse über Nacht in 4 weiteren Ligen wiederaufgetaucht (Bundesliga, 2.BL, Süper Lig, Serie A).

### Entscheidung

Wenn ein Slice-LOG einen Sub-Track explizit als „Backlog" oder „separater Slice N+1" markiert, MUSS der direkt nächste Slice exakt dieser Sub-Track sein. Live-Bug-Reports die danach reinkommen sind:

- **Emergency-Path:** wenn Money/Trading/Auth betroffen ODER User-blocking → `/ship emergency` (umgeht Spec-Gate)
- **Slice N+2 oder später:** alle anderen Live-Bugs

Anti-Pattern verboten: „Live-Bug X kam rein, ist dringender als Backlog-Track A2, schiebe ich auf Slice N+2" — genau das hat 3× hintereinander stattgefunden, weil JEDER Live-Bug subjektiv „dringender" wirkte.

### Begründung

Backlog-Drift ist exponentiell: jeder neue Live-Bug eskaliert die Subjektive-Dringlichkeit, der Backlog-Track sammelt Staub. Im konkreten Fall 273 → 4 Tage Verzögerung → Bug-Klasse rekurrent in 4 zusätzlichen Ligen sichtbar geworden. Hot-Fix nötig der ohne A2-Code-Fix in 1-3 Tagen wieder broken sein wird.

Verwandt aber nicht identisch zu D54 „Build-without-Wire": D54 ist „Tool gebaut, nicht verkabelt", D69 ist „Track-A1 gebaut, Track-A2 verschoben und vergessen". Process-Wurzel ist gleich: Slice gilt als „done" während ein logisch zusammengehörender Sub-Track offen ist.

### Auswirkungen

- `workflow.md` LOG-Stage-Sektion erweitern: bei „Backlog für separater Slice"-Markierung MUSS nächster Slice-Eintrag in active.md exakt der Backlog-Track sein. Hook-Idee `ship-backlog-followup-gate` (warn): wenn vorheriger Slice „Backlog für Slice N+1" markierte und neuer Slice einen anderen Scope hat, warnt vor Commit.
- Slice 277 ist Pflicht-nächster-Slice (nach Slice 276 Wolfsburg-Logo wenn parallel-laufend). Cron-Code-Fix gameweek-sync `already_complete` + `no_past_fixtures` Branches.
- LOG-Format-Konvention: „Backlog für späteren Slice" ist nicht mehr akzeptiert ohne explizite Slice-Nummer. Statt „Backlog nach Beta" → „Pflicht-nächster Slice 277".

### Alternativen erwogen

- **A: GitHub-Issue-Tracker für Backlog-Items** — gut für externes Reporting, aber Workflow-intern bleibt active.md SSOT. Issue-Tracker hatte schon Slice-234-Probleme (recurring Failure-Klassen ohne Master-Tracker).
- **B: Hard-Gate-Hook der nächsten Slice-Scope blockt** — zu rigide bei echten Emergencies. Soft-warn ist ausreichend wenn Process-Regel klar.
- **C: Status-quo, jedem Slice trauen** — funktioniert nicht, wie Slice 273→276 gezeigt hat.

Gewählt: PROCESS-Regel + WARN-Hook (D45 Hooks > Text-Regeln).

### Re-Visit-Trigger

- Backlog-Drift-Recurrence trotz Regel → Hard-Gate-Hook (Option B) erwägen
- 0 Backlog-Driftet nach 10 Slices → Regel hat sich bewährt, in workflow.md kanonisieren

---

## D70 — PROCESS: Cold-Start-Latency als nächster Strategic-Track (Slice 279+)

**Datum:** 2026-05-06
**Status:** Aktiv (Track für nächste Session)
**Category:** PROCESS
**Trigger:** Anil-Frustration 2026-05-06 ~15:35 — „ich bin weiterhin mit dem laden der App total unzufrieden! warum bekommen wir es nicht endlich mal alles reibungslos, abgestimmt wie ein fluss hinzubekommen? was machen die anderen anders wie wir?"

### Entscheidung

Cold-Start-Latency-Optimierung wird als nächster Strategic-Track ab Slice 279+ geöffnet. NICHT zwischen Live-Bug-Fixes als Sub-Track, sondern als dedizierter Multi-Slice-Track mit messbarer Metric.

**Track-Definition:**
- **Metric:** Mobile-LCP (Largest Contentful Paint) auf bescout.net im 3G-Slow-Profile via Lighthouse-CI.
- **Baseline messen:** vor Slice 279 BUILD — Lighthouse-Run gegen `https://bescout.net/` mit Mobile-Preset + 3G-Slow-Throttling. Output als `worklog/audits/2026-05-Y/lighthouse-baseline.md`.
- **Target:** LCP < 2.5s (Web-Vital good). Aktueller Schätzwert ~4-5s.

**Multi-Slice-Plan (vor BUILD: Anil-Approval-Pflicht für Track):**

| Slice | Was | ROI |
|-------|-----|-----|
| 279 | Lighthouse-CI als hard-fail Gate in GHA + Baseline-Measurement | macht Drift sichtbar, ohne kein Slice 280+ messbar |
| 280 | Bundle-Analysis + Tree-Shaking (Top 5 fat-Modules eliminieren) | -200-400KB sichtbarer parsed-bundle |
| 281 | Initial-Query-Konsolidierung — `useHomeData` Parallel-Loads in 1-RPC bundeln (analog Slice 109 Lehre) | -1.5s LCP wenn Waterfall vermieden |
| 282 | Vercel Edge-Caching für static assets + ISR für `/club/*` Pages | -800ms TTFB für returning visitors |

**Reihenfolge ist sequenziell:** ohne 279 keine Mess-Wahrheit, ohne 280-281 keine Bundle-Wins.

### Begründung

Anil's Frustration ist berechtigt. Status-quo:
- Cold-Start ~4-5s ist schlechter als Sorare/Linear/Socios (alle <2s LCP auf Mobile)
- 278 Slices in 12 Monaten haben Code-Quality + Feature-Breadth gebracht, aber Performance-Discipline fehlt systematisch
- Bundle-Budget existiert (Slice 185b), aber kein Lighthouse-Gate
- Die strategic-advisory hat das auch direkt gesagt: „Du hast 12 Monate Engineering-Arsenal aufgebaut, ohne parallel die Distribution-Maschine zu zünden" — gilt analog für UX-Latency-Discipline

Der Track ist Strategic-Investment für Beta-Launch-Erfolg: Tester die 4s Cold-Start sehen, kommen nicht wieder. Web-Vital-LCP <2.5s ist Mindeststandard für Retention in 2026.

### Anti-Pattern verboten

- **Performance-Slice zwischen Live-Bug-Fixes squeezen:** zu wenig Fokus, kein Mess-Workflow, keine Pattern-Lehre.
- **Optimieren ohne Baseline:** Slice 109 hat das gezeigt — Konsolidierung von 4 parallelen Hooks in 1 RPC brachte Δ -1-5% LCP, innerhalb Rauschen, weil Queries sowieso parallel waren. Ohne Lighthouse-Mess-Wahrheit produzieren wir „Optimize-Theater".
- **Bundle-Splitting blind:** Slice 121 hat gezeigt — `dynamic()` lazy-import bringt nichts wenn anderer Code-Path eager importiert. Erst Bundle-Analyzer + Mess-Wahrheit, dann Splits.

### Auswirkungen

- `workflow.md` Strategic-Track-Sektion ergänzen mit „Cold-Start-Latency-Track (Slice 279-282)"
- Track-Approval-Pflicht von Anil VOR Slice 279 BUILD — er muss Multi-Slice-Investment OK geben
- Slice 279 Spec wird Pflicht-Read VOR irgendeiner Optimization-Implementierung
- Alternative-Tracks (z.B. iPhone-Visual-Verify finishen, Beta-Mails) bleiben Anil-Pflicht parallel — Cold-Start ist CTO-Track ohne Anil-Action-Items

### Alternativen erwogen

- **A: Inline-Optimization im nächsten Live-Bug-Slice** — verworfen, siehe Anti-Pattern oben (zu wenig Fokus, kein Mess-Workflow)
- **B: Single-Big-Slice „Cold-Start fix"** — verworfen, zu groß für 1 Slice (wäre L oder XL), bricht workflow.md S/M-Empfehlung
- **C: Multi-Slice-Track mit Lighthouse-Baseline** — gewählt, klare Reihenfolge, messbar, Knowledge-Promotion-fähig
- **D: post-Beta verschieben** — verworfen, weil Cold-Start direkten Beta-Launch-Erfolg gefährdet (Tester-Retention-Risk)

### Re-Visit-Trigger

- Lighthouse-Baseline zeigt LCP < 3s → Track auf 1-2 Slices reduzieren (nur niedrig-hängende Früchte)
- Slice 279-282 done + LCP > 3s → Track erweitern mit weiteren Optimierungen (Image-CDN, ISR-Refinement, Service-Worker)
- Anil-Decision sagt „später" → Track in `slice_stubs_pending` parken

---

## D71 — PROCESS: Beta-Launch-Status korrigiert: LIVE seit ≤2026-05-06 statt Pre-Launch

**Datum:** 2026-05-06 · **Category:** PROCESS · **Status:** Aktiv

### Entscheidung

Beta-Launch ist ✅ **LIVE** mit Taki + Nail Mo als aktive Tester. Phase-D-BLOCKER-Tracker (`worklog/beta-phase.md` + alte session-handoff-Sektionen) ist stale. Slice 270-280 Live-Bug-Fixes (Form-Bars, Sync-Injuries, Logo-Konflikt, Cron-Drift, MysteryBox-Doppel-Render, Bundle-Win) kommen aus **Tester-Feedback**, nicht aus internem QA.

Anil-Status-Update wörtlich (2026-05-06 ~21:30): „ich teste bereits mit denen live, daher kommen die letzten fixes".

### Begründung

Anil hat die formelle Phase-D-Checklist-Abarbeitung (iPhone-Visual-Verify 8 Konfigs + Beta-Mails-Recruiting an Taki/Nail Mo) übersprungen und ist direkt in Live-Test gegangen. Das ist seine CEO-Decision — Phase-D-Process war als Pre-Launch-Hürde formuliert, hat sich überholt.

### Auswirkungen

- `MEMORY.md` Beta-Launch-Section auf LIVE geändert (Pre-Launch als historischer Snapshot markiert)
- `project_beta_live.md` neu — project-Memory mit Live-Status, Tester-Liste, Live-Bug-Fix-Pipeline, How-to-apply
- Bug-Reports von Anil mit Phrasen wie „zeigt nicht / wird nicht angezeigt / falsch / komisch" ab jetzt als **Tester-Befund hohe Prio** behandeln (nicht als internes QA-Issue)
- Cold-Start-Track (D70 Slice 279+) Argumentation: für aktive Tester relevant, nicht für hypothetische 50-Mann-Pipeline
- Phase-D-Checklist-Items (iPhone-Verify, Beta-Mails) in nächster Session aus tracker entfernen oder als „pre-launch erledigt"-Annotation versehen

### Alternativen erwogen

- **A: Phase-D als Soft-Recommendation behalten** — verworfen, weil Tracker dann inkonsistent zur Realität (CEO testet längst live)
- **B: Beta-Launch als Status „Live (2-Tester)" tracken bis 50-Mann aktiviert** — gewählt, klarer Status, kein Auto-Promote
- **C: project_beta_live.md als feedback-Memory** — verworfen, project-Memory passt besser (es ist Status-Information, nicht Anil-Preference)

### Re-Visit-Trigger

- 50-Mann-Pipeline aktiviert → D71 wird abgelöst durch neuen Status-Decision
- Live-Beta endet (Sunset oder Hard-Pivot) → D71 als Superseded markieren

---

## D72 — ARCHITECTURE: optimizePackageImports-Lehre — moderne ESM-Libs sind bereits tree-shaken

**Datum:** 2026-05-06 · **Category:** ARCHITECTURE · **Status:** Aktiv (Slice 280 empirisch verifiziert)

### Entscheidung

`next.config.mjs` `experimental.optimizePackageImports` bringt bei modernen ESM-Libraries (Radix-UI, Supabase-SSR, TanStack-Query-Persist-Client) **0 KB direkten Bundle-Win**. Webpack-Tree-Shaking war bereits effektiv, weil Libraries Named-Exports + ESM-Module-Format nutzen. Hauptwin liegt in:

1. **Dead-Wrapper-Removal** (Slice 280: -374 KB total durch DropdownMenu-Wrapper-Delete)
2. **Lazy-Loading** (Slice 121 Anti-Pattern: nur effektiv wenn ALLE Call-Sites lazy, nicht parallel eager)
3. **API-Surface-Reduktion via Named-Imports statt Namespace** (Slice 120 country-flag-icons static-asset-Migration)

### Begründung

Slice 280 hat das empirisch gemessen:
- Wave 1 (`optimizePackageImports` +5 entries) → 0 KB direkter Win
- Wave 2 (Sentry Namespace → Named-Imports in 3 Files) → 0 KB direkter Win
- Wave 0 (DropdownMenu-Wrapper-Delete via Pre-Implementation-Greppen-Discovery) → -374 KB Total-FLJS-Sum

Pattern-Lehre: Bundle-Win-Hunt sollte mit `grep -rln "<Wrapper-Name>" src/` für jeden UI-Wrapper-File starten. Wenn 0 Konsumenten in Production: sofort delete (Slice 280 Pattern). Erst dann config-only Optimizations versuchen.

### Auswirkungen

- `errors-frontend.md` neu „Dead-Wrapper-File mit transitive Lib-Lock-In (Slice 280)" — Bug-Klasse + Detection-Pattern + Fix-Pattern + Bundle-Win-Erwartung (live seit Commit `c9a36469`)
- Bei künftigen Bundle-Optimization-Slices: Wave 0 (Dead-Wrapper-Audit) MUSS vor Wave 1 (config-Tweaks) kommen
- `optimizePackageImports`-Add ist Low-Risk (kein Code-Change), kann als Safety-Net trotzdem hinzugefügt werden
- `scripts/orphan-component-detector.ts` (Slice 228) sollte um Wrapper-File-Filter erweitert werden — Future-Slice-Kandidat (siehe Slice 280 Reviewer Empfehlung 2)

### Alternativen erwogen

- **A: optimizePackageImports als primärer Bundle-Win-Pfad behalten** — empirisch widerlegt, 0 KB Win für moderne Libs
- **B: Lazy-Loading aller Modal-Components** — high-Risk (UX-Spike beim ersten Open), zurückgehalten als Slice 280b/Wave 3
- **C: Dead-Wrapper-Audit als Pre-Step für jede Bundle-Optimization** — gewählt, Slice 280 zeigte den Win-Pfad

### Re-Visit-Trigger

- Next.js 15+ ändert `optimizePackageImports`-Verhalten → D72 ggf. neu empirisch messen
- Library-Update bringt neue ESM-Format-Drift → Tree-Shaking könnte regredieren
- Bundle-Budget-Drift > 10% → Audit-Pattern aus D72 anwenden vor neuer Optimization-Strategie

## D73 — PROCESS: PROVE für conditional-render/filter-Components = Cold-Load + DOM-Assertion, nicht warmer Screenshot

**Datum:** 2026-06-13 · **Category:** PROCESS · **Status:** Aktiv (Slice 285→286 empirisch entstanden)

### Entscheidung

Bei der PROVE-Stage von Slices, die **conditional-render-Components** betreffen (Filter-Bars, Empty/Loading-States, `if (x) return null`-Guards, alles was abhängig von async-State sichtbar/unsichtbar wird), ist ein **warmer Screenshot allein kein ausreichender Proof**. Pflicht:
1. **Cold-Load** testen (`page.goto` = Hard-Navigation, nicht warme SPA-Klick-Navigation) — der Zustand den ein Direkt-Link / Hard-Refresh / PWA-Cold-Start trifft.
2. **DOM-Assertion** statt Augenmaß — konkret messen (`buttonCount`, `childCount`, Element-Präsenz via `browser_evaluate`), nicht nur ein Screenshot „sieht ok aus".

### Begründung

Slice 285 (FM-06, trivialer XS-Layout-Move: Liga-Header verschieben) wäre mit einem warmen Screenshot als „done" durchgegangen. Erst die **DOM-Assertion** (`[data-testid=league-scope-header]` → `childCount`/`buttonCount`) bei **Hard-Navigation** deckte auf, dass der Header **app-weit leer** rendert (Cold-Load-Race, → Slice 286). Bei warmer SPA-Navigation war alles sichtbar — ein Screenshot hätte gelogen. Der Beta-Blocker (Liga-Filter unsichtbar auf Mobile/PWA-Cold-Start) wäre latent live geblieben.

Kernpunkt: Conditional-Render hängt von Timing/State ab. Der „glückliche" Render-Pfad (warm, alles geladen) verdeckt den „kalten" Pfad, den echte User auf Mobile/Direkt-Link häufig treffen. Augenmaß auf dem glücklichen Pfad ist systematisch blind dafür.

### Auswirkungen

- `worklog/specs/_TEMPLATE.md` Proof-Plan-Sektion + `testing.md` Visual-QA: für conditional-render/filter-Components Cold-Load (`page.goto`) + DOM-Assertion als Proof-Pflicht ergänzen.
- Bei Filter/Empty-State/Skeleton-Slices: PROVE-Plan MUSS den Cold-Load-Pfad explizit nennen, nicht nur „Screenshot bescout.net".
- Verstärkt die bestehende Visual-QA-Regel (testing.md): „starte mit der Page die am meisten Änderungen erwartet" → ergänzt um „und teste den Cold-Load-Zustand, nicht nur den warmen".
- Pattern-Familie mit errors-frontend.md „Non-reaktiver Module-Cache + useMemo-stale-deps Cold-Load-Race" (Slice 286) — die Detection-Seite dieses Process-Standards.

### Alternativen erwogen

- **A: Screenshot des warmen Zustands reicht** — empirisch widerlegt (285 hätte den 286-Blocker verdeckt).
- **B: Nur DOM-Assertion, kein Cold-Load** — unzureichend: warme DOM-Assertion zeigt auch 9 Buttons. Der Cold-Load-Pfad ist das Entscheidende.
- **C: Cold-Load + DOM-Assertion (gewählt)** — fand den Blocker, generalisiert auf alle conditional-render-Components.

### Re-Visit-Trigger

- Wenn ein conditional-render-Bug trotz dieses Standards live geht → Standard war nicht angewandt oder unvollständig, nachschärfen.
- Falls Playwright-MCP Cold-vs-Warm nicht mehr unterscheidbar (Caching-Änderung) → Test-Strategie anpassen.

## D74 — ARCHITECTURE: Auth-Enforcement Single-Source = AuthGuard; Pages rendern KEINE eigene Sign-In-CTA

**Category:** ARCHITECTURE · **Datum:** 2026-06-13 · **Status:** Aktiv · **Slice:** 296 (S3 F-3)

### Entscheidung

Auth-Enforcement für alle `(app)`-Routes liegt **ausschließlich** bei `<AuthGuard>` (`app/(app)/layout.tsx`): unauth → `router.replace('/login')` + `ContentSkeleton`. Page-Components rendern **keine** eigene Sign-In-CTA und keinen eigenen unauth-Empty-State. Die in Page-Bodies vorhandenen `&& user`-Gates (z.B. `FantasyContent` Tab-Bodies) sind bewusst **defensive Null-Safety** (belt-and-suspenders), nicht ein zweiter Auth-UX-Pfad.

### Begründung

Ein page-local Sign-In-CTA wäre eine **zweite Quelle der Wahrheit** für „logged out" → divergenter Auth-UX-Pfad, Drift-Risiko (zwei Stellen müssten konsistent gehalten werden: Redirect-Ziel, Wording, Geo/Onboarding-Reihenfolge). AuthGuard kennt bereits die volle State-Maschine (loading / !user→/login / !profile→/onboarding / profileLoading-fall-through). Page-Components erreichen im Produktiv-Pfad nie einen `!user`-State, weil AuthGuard vorher Skeleton rendert + redirected. Die `&& user`-Gates schaden nicht (defensiv), aber dürfen nicht zu sichtbarem unauth-UI ausgebaut werden.

### Auswirkungen

- Neue `(app)`-Pages: KEINE eigene Login-Aufforderung bauen — auf AuthGuard verlassen.
- Bestehende `&& user`-Gates dokumentieren als „defensiv, AuthGuard = Enforcement" (Slice 296 Kommentar-Pattern in `FantasyContent.tsx`).
- Unauth-Verhalten als expliziten Test-Contract locken (Shell rendert, kein Primary-Body, kein CTA) statt implizit zu lassen — siehe `FantasyContent.test.tsx` `describe('unauth contract')`.
- Gilt NICHT für public Routes außerhalb `(app)` (z.B. `/club/[slug]` non-admin Branch, Landing) — die haben eigene Sichtbarkeits-Logik.

### Alternativen erwogen

- **A: Page-local Sign-In-CTA** (Audit F-3 Option) — verworfen: divergenter zweiter Auth-UX-Pfad, Drift-Risiko, redundant zu AuthGuard.
- **B: `&& user`-Gates entfernen** (rein auf AuthGuard vertrauen, kein defensives Gate) — verworfen: defensive Tiefe ist billig + schützt gegen künftige AuthGuard-Render-Reihenfolge-Änderungen.
- **C: AuthGuard single-source + defensive Gates + expliziter Test-Contract (gewählt)** — implizit→explizit ohne Behavior-Change, kein zweiter Pfad.

### Re-Visit-Trigger

- Falls je eine `(app)`-Page legitim einen anderen unauth-Zustand braucht als „redirect-to-login" (z.B. eine teil-öffentliche Page mit Login-Teaser) → dann ist das eine bewusste public-Route-Entscheidung, nicht ein zweiter Auth-Pfad; AuthGuard-Scope neu schneiden statt page-local CTA streuen.

## D75 — PROCESS: Stabilization-Audit-Slices liefern Audit-Doc + Ratchet-Guard (kein reines Audit-Theater)

**Category:** PROCESS · **Datum:** 2026-06-13 · **Status:** Aktiv · **Slice:** 299 (S4) + 300 (S5)

### Entscheidung

Stabilization-Audit-Slices der S-Serie (Master-Audit `worklog/audits/2026-06-12/stabilization-master-audit.md` §10) deren Ziel eine Prosa-Regel „keine neuen X" ist (§11.4/5/6: keine neuen Bridge-Imports, keine neuen Direct-Supabase-Components, keine neuen Placeholder/Skip-Tests), liefern IMMER **zwei** Artefakte: (1) ein kuratiertes Audit-Doc mit Taxonomie-Klassifikation + Folge-Findings, UND (2) ein **Baseline-Ratchet-Guard** (`scripts/<x>-check.ts` + `.<x>-baseline.json`, patterns.md #49) der die Prosa-Regel von Wort → enforced macht. Reines Audit ohne Enforcement ist verboten (workflow.md Anti-Pattern #1 + `ship-no-audit-slice`-Hook).

### Begründung

Die Master-Audit-Anti-Kreis-Regeln (§11) waren reine Prosa → 0 Enforcement → Drift kommt zurück sobald niemand hinschaut (genau die „Confidence Drift" / „Source-of-Truth Drift" die der Audit beklagt). Ein Baseline-Ratchet friert den Ist-Stand ein und blockt nur **Neuzuwachs** (strict `>`) — das verhindert Regression OHNE Mass-Migration der Bestände (Big-Bang-Refactor = §0-Anti-Pattern). Eine ESLint-Hard-Rule würfe alle Bestände als Error (erzwänge Big-Bang); ein „warn"-Level produziert N Dauer-Warnungen (Noise). Der Ratchet ist der churn-freie Mittelweg und macht den Audit zu echtem Fortschritt statt „gelb markieren".

### Auswirkungen

- S-Serie-Slices (S4 boundary, S5 test-confidence; künftig S6 dead-artifact) = Audit-Doc + Ratchet + pre-commit-Step + wiring-allowlist (D54).
- Bestände werden NICHT erzwungen migriert — als nummerierte Folge-Findings (S4-F-1.., S5-F-1..) für opportunistische Fix-Slices dokumentiert.
- `.husky/pre-commit` wächst pro S-Slice um 1 Ratchet-Step (~2s je). Bei >8 Steps Performance neu bewerten (dann ggf. pre-push-Bündelung).
- 3 Ratchet-Instanzen aktiv (silent-fail 092 · boundary 299 · test-confidence 300) — patterns.md #49 ist das Template.
- Scanner-Falle (#49): Marker IMMER als CALL/präzise matchen — `\bfit\b`/`from`-only false-positivet/verpasst (Slice 299 F-1 dynamic-import, Slice 300 F-1 `status:'fit'`).

### Alternativen erwogen

- **A: Reines Audit-Doc** (gelb markieren, Folge-Slices) — verworfen: §1-Anti-Pattern, Drift kommt zurück, kein Enforcement.
- **B: ESLint-Hard-Rule** (`no-restricted-imports` error / `no-disabled-tests`) — verworfen: würfe alle Bestände als Error → Big-Bang-Migrations-Zwang in einem Slice (§0).
- **C: Audit-Doc + Baseline-Ratchet-Guard (gewählt)** — Ist-Stand eingefroren, nur Neuzuwachs blockiert, Bestände als Folge-Findings; churn-frei + echtes Enforcement.

### Re-Visit-Trigger

- Wenn ein Bestand vollständig migriert ist (Count → 0) → Ratchet-Guard + Baseline-File löschen, Regel ggf. zu ESLint-Hard-Rule promoten (dann ist Big-Bang-Risk weg).
- Wenn pre-commit durch zu viele Ratchet-Steps spürbar langsam wird → Ratchets in einen kombinierten `audit:ratchets:check`-Sammel-Step bündeln.

---

## D76 — ARCHITECTURE: S7 Source-of-Truth-Harmonisierung (Mock-Erblast → eine Quelle pro Datenpunkt)

**Datum:** 2026-06-13 · **Status:** Aktiv (Programm, mehrere Sessions)

**Kontext:** Anil-Direktive aus Strategic-Konversation — Projekt ist „aus Mocks zusammengewachsen, nicht professionell strukturiert; immer mehr Brücken/Workarounds; mehrere Datenquellen pro Komponente wo eine reichte". Gefühl: unsauber, unnötige Datenpflege.

**Entscheidung:** Mehrphasiges Harmonisierungs-Programm (S7), das die Lese-/Source-of-Truth-Achse aufräumt — Daten-Analogon zu S6 (toter Code). Zielbild: geschichtete Architektur **DB → RPC/Service (1/Domäne) → Query-Facade → Component (nur UI)** mit 4 Gesetzen: (1) 1 Datenpunkt = 1 Quelle, (2) keine Komponente fasst `supabaseClient` direkt an, (3) keine Re-Export-Brücken, (4) keine Mehrquellen-Reads.

**Methode (= D75 Strangler-Fig + Ratchet, kein Big-Bang, Beta läuft live):** 3 Phasen — (1) **Registry** (`worklog/audits/2026-06-13/s7-source-of-truth-registry.md`, 8-Achsen-Record-Format pro Domäne), (2) Domäne-für-Domäne migrieren + Ratchet, (3) redundante Speicher mit RED/GREEN-Proof abräumen. Demo-/Money-Path zuerst.

**Begründung:** Beta live (Taki/Nail Mo) → Big-Bang verboten. Registry-first macht Migration evidenzbasiert statt Raten. Bewiesen wertvoll Slice 303: Money-Path-Health-Check verhinderte, dass ein naiver Floor-Backfill 3310 Spieler-Floors zerschießt (Seed-Müll-Poisoning, Yamal 200.000→100).

**Alternativen erwogen:** (a) Big-Bang-Refactor aller Datenquellen — verworfen (Beta-Risiko, kein Rollback). (b) Nur Code-Cleanup ohne Daten-Achse — verworfen (Kernproblem ist Mehrquellen-Lese-Drift, nicht toter Code allein). (c) Ad-hoc fixen wo's auffällt — verworfen (ohne Registry-Map = Raten, kein Drift-Schutz, Workarounds kommen zurück).

**Stand 2026-06-13:** Phase 1 = 3/9 P0-Domänen gemappt (Player/Fantasy/Trading). Phase 2 = #1 Floor (303) · #2 DbFeeConfig-Typ (304) · #3 Orphan-Value-Removal (305) live. Offen: #4 Wildcard-Ledger + 6 P1-Domänen. 6 systemische Muster als generische Klassen (Floor-Mehrfach · Schema≠Typ · 2-Spalten/2-Impls · leerer Ledger · orphan-Feature · dormant-by-external-dep).

**Re-Visit-Trigger:** Wenn alle P0-Befunde migriert + Ratchets grün → entscheiden ob die 6 P1-Domänen gemappt werden oder Programm als „Demo-/Money-Path harmonisiert" geschlossen wird.

---

## D77 — PROCESS: Registry/Audit-Steering-Doc-Findings gegen Live-Code verifizieren VOR Behandlung als offen

**Datum:** 2026-06-14 · **Status:** Aktiv

**Kontext:** Session „gehe die findings an" (S7-Phase-2). Die S7-Registry (`worklog/audits/2026-06-13/s7-source-of-truth-registry.md`, geschrieben in Slice 302) listete Floor (Player-#1/#3, Trading-#1/#3/#5, P0 Money) + Wildcard-Ledger (#3/#4, P1 „Compliance-Risiko") als offen. Live-Verifikation zeigte: **Floor war bereits durch Slice 303 Teil C geschlossen** (computePlayerFloor=Passthrough, Math.min entfernt — Registry war seit 303 stale), und der **Wildcard-„Compliance-Risiko"-Befund war ein Fehlalarm** (35 leere Backfill-Platzhalter, Ledger-Pfad korrekt, 0 Aktivität). Ohne Verifikation hätte ich Floor neu konsolidiert (Doppelarbeit) bzw. ein nicht-existentes Risiko „gefixt".

**Entscheidung:** Bevor ein Registry-/Audit-Doc-Finding als offene Arbeit behandelt wird, MUSS es gegen den aktuellen Live-Stand verifiziert werden — Code (`grep`/Datei lesen) UND Daten (`pg_get_functiondef` / `SELECT`-Counts/Werte). Steering-Docs sind ein Snapshot ihres Schreibzeitpunkts, keine Wahrheit. Erst verifizieren, dann specen/bauen. Bei Abweichung: Registry-Eintrag korrigieren (✅/widerlegt mit Evidence + Slice-Ref), damit der Drift nicht zurückkommt.

**Begründung:** Audit-Docs driften zwischen Schreiben und Abarbeiten (andere Slices schließen Findings, ohne das Doc zu pflegen). „Finding existiert im Doc" ≠ „Problem existiert im Code". Zwei Fehlerklassen verhindert: (a) Redo bereits-erledigter Arbeit (Floor/303), (b) Fixen von Fehl-Diagnosen (Wildcard-Risiko/306). Schwester-Lektion zu errors-db.md „Leere Backfill-Platzhalter" (Slice 306) auf Process-Achse.

**Alternativen erwogen:** (a) Registry blind als Arbeits-Queue abarbeiten — verworfen (führt zu Redo + Fehl-Fixes). (b) Registry bei jedem Slice live-synchron halten — unrealistisch (Pflege-Overhead, Findings schließen sich quer). Stattdessen: Verifikation am Abarbeitungs-Zeitpunkt (lazy, evidenzbasiert) + Korrektur-Pflicht bei Abweichung.

**Anwendung diese Session:** Player/Fantasy/Trading Top-Befunde-Tabellen + Übergreifende-Muster #4 korrigiert (✅-Markierung + Slice-Ref) für 303/304/305/306/307/308. Verhindert dass nächste Session erledigte Findings erneut aufgreift. **Zweite Anwendung (Session-End 309-312):** P2/P3-Residuen-Sweep — `fantasy.md /1.5`-Doc gegen `cron_recalc_perf` widerlegt (Slice 309), Lineup-Set/Offers-Dual/24h-Change live als false-positive/verschiedene-Surfaces/konsistent verifiziert statt blind refactored (Slice 312). 3 von 6 „Findings" non-actionable.

---

## D78 — ARCHITECTURE: active_gameweek = leagues-Single-Truth, Admin-Set liga-weit, Drift per Detektions-Skript

**Datum:** 2026-06-14 · **Status:** Aktiv · **Slice:** 310

**Kontext:** `active_gameweek` lebt in 2 physischen Spalten für 1 Semantik — `clubs.active_gameweek` (per-Club, legacy) + `leagues.active_gameweek` (per-Liga, Slice 251). Die Haupt-Fantasy-Leseseite (`useGameweek` → `useLeagueActiveGameweek`) liest `leagues`, aber der Admin-Write `set_active_gameweek` schrieb nur `clubs` → stiller Drift (Fantasy-UI sieht Admin-Änderung nie). Aktuell 0 Live-Drift (Cron dual-writet, Slice 277), daher preventiv. Registry §2.1 / Fantasy-#1.

**Entscheidung (Anil, 2-teilig):**
1. **`set_active_gameweek` wird liga-weit:** resolved `league_id`, setzt ALLE Clubs der Liga + die `leagues`-Zeile atomar. Hält Invariante `clubs-MIN === clubs-MAX === leagues`. `leagues` ist die einzige Lese-Wahrheit. Bewusste Folge: ein Club-Owner bewegt den GW seiner ganzen Liga (konsistent, da ein GW inhärent liga-weit ist; per-Club-Divergenz war nie gültig). Auth-Guard unverändert (Caller muss Admin des übergebenen Clubs sein).
2. **Drift-Guard = Detektions-Skript, kein DB-Trigger:** `scripts/audit/gameweek-drift.js` (clubs-MIN===MAX===leagues pro Liga) wired in `nightly-audit.yml` (D75-Ratchet-Stil, alarmiert via GH-Issue). KEIN BEFORE-UPDATE-Trigger (D39-Stil).

**Begründung:** Ein GW gehört semantisch der Liga, nicht dem Club — die per-Club-Spalte ist Redundanz. Liga-weiter Write ist der einzige Weg, die ratchet-Invariante (`clubs-MIN === leagues`) zu halten, wenn ein Admin setzt. Skript statt Trigger: ein BEFORE-UPDATE-Trigger riskiert legitime Cron-Dual-Write-Zwischenstände (Reihenfolge clubs-dann-leagues) hart zu blocken; das Detektions-Skript ist ein Sicherheitsnetz ohne Block-Risiko und passt zur bestehenden D75-Ratchet-Familie (silent-fail 092 · boundary 299 · test-confidence 300).

**Alternativen erwogen:** (a) Dual-Write nur Club+dessen-Liga (ohne sibling-Clubs) — verworfen, bricht die Invariante wenn ein Club aus der Reihe gesetzt wird. (b) Admin-GW-Set nur Platform-Admin (Club-Owner verliert die Fähigkeit) — verworfen, entzieht bestehende UI-Funktion. (c) DB-Trigger hart — verworfen wegen Cron-Zwischenstand-Risiko. (d) `clubs.active_gameweek`-Spalte droppen — Scope-Out (Cron + Admin-Display lesen noch; größere Migration).

**Auswirkungen:** Admin-Drift-Quelle aus App-Code geschlossen; `useActiveGameweek`+`qk.events.activeGw` orphan entfernt (Registry-Ziel); `getActiveGameweek` bleibt für Admin-per-Club-Display (post-Fix clubs===leagues, harmlos). Reviewer bestätigte: kein Money/Security-Risiko durch erweiterte Schreibreichweite (Scheduling-Feld, sibling-Clubs derselben Liga). Süper-Lig-Saison-End-Stau (active=34/max=38, API-Key) ist Cron-Lag, KEIN Spalten-Drift → kein False-Alarm im Skript.

**Re-Visit-Trigger:** Wenn `clubs.active_gameweek` je vollständig redundant wird (alle Reader auf leagues migriert) → Spalte droppen. Wenn das Drift-Skript je feuert → `clubsToProcess`-Vollständigkeit im Cron auditieren (Reviewer-F-3-Observation).

---

## D79 — PROCESS: S7 Phase 1 (Map) komplett 9/9 → nächste Priorität sind die 4 vom Mapping aufgedeckten P0-Money/P1-Security-Funde, NICHT weiter aufräumen/neue Features

**Datum:** 2026-06-14 · **Status:** Aktiv · **Slices:** 313–315 (Map-Abschluss)

**Kontext:** Die S7 Source-of-Truth-Registry (D76, Strangler-Fig + Ratchet D75) hatte Phase 1 (Map) = alle 9 Makro-Domänen live-schema kartieren. Mit Slice 302 (Player/Fantasy/Trading, P0), 314 (Club/Social/Gamification, P1) und 315 (Creator/Identity/Admin, P2/P3) ist Phase 1 **komplett**. Das Mappen war read-only Wahrheits-Feststellung — sein Wert liegt in den Funden. Diese Session schloss zusätzlich S7-Phase-2 für die 3 P0-Domänen ab (alle Demo/Money-Findings durch oder als non-actionable verifiziert, Slice 313).

**Entscheidung:** Der nächste Arbeitsblock ist **Phase 2 (Migrieren/Fixen) der vom Mapping aufgedeckten Top-Funde**, in dieser Severity-Reihenfolge — NICHT weitere Audit-Runden und NICHT neue Features:
1. **🔴 P0 Money** — Club-Founding-Passes: (a) bcredits TS≠RPC-Drift, (b) Preis nicht server-validiert (Kill-Switch-Integrität).
2. **🔴 P1 Security** (neue Klasse, Slice 315) — Identity: (a) `profiles_update`-RLS ohne Spalten-Whitelist (User self-set verified/plan/top_role/subscription_price), (b) `/api/push` cross-user-Spam.
3. **🟡 P1 Demo** — Club-Challenges-Crash, Notification-i18n, Score-Road-Shape, profilloser Account, etc.

Jeder Fix = eigener SHIP-Slice mit Spec + Review. **Money + Security = CEO-Scope** (Anil entscheidet Werte/Approach VOR Build, z.B. „sind Founding-bcredits 100k oder 250k pro Tier?").

**Begründung:** Der höchste Hebel ist nicht mehr „mehr Landkarte" oder „neue Features", sondern die konkreten Geld-Korrektheits- und Sicherheits-Lücken, die ohne das Mapping unsichtbar geblieben wären (Founding-bcredits-Drift = falsche gebuchte Geldmenge; profiles-RLS = self-set verified/plan; /api/push = Phishing-Vektor). Diese sind live-relevant (Beta läuft, D71) und CEO-Scope. Aufräumen (Phase 3) + restliche dormant/P2/P3-Konsolidierung kommt danach.

**Alternativen erwogen:** (a) Direkt neue Features / Sommer-Roadmap — verworfen, die P0-Money/P1-Security-Funde sind live + risikobehaftet, gehen vor. (b) Weiter Phase-3-Abräumen (dead code, dormant features) zuerst — verworfen, niedrigerer Hebel als Money/Security. (c) Alle Funde in einem Sammel-Slice fixen — verworfen, Money + Security brauchen je eigene Spec + Review + CEO-Decision (Scope-Trennung).

**Auswirkungen:** Registry `worklog/audits/2026-06-13/s7-source-of-truth-registry.md` ist jetzt die Single-Source des Phase-2-Backlogs (severity-sortierte Liste am Ende der Datei + pro-Domäne Top-Befunde-Tabellen). Resume-Anker im Handoff verweist mit Datei:Zeile-Pointern darauf. 6 neue übergreifende Muster-Instanzen + 4 neue Muster (#7 Money/Security-Truth-nur-im-Client, #8 De-norm-Counter-ohne-Reconcile, #9 Phantom-Tabellen, #10 pre-localized-vs-i18n_key).

**Re-Visit-Trigger:** Wenn alle P0/P1-Funde gefixt sind → Phase 3 (Abräumen: dormant Features S6-Removal + P2/P3-Konsolidierung) ODER Sommer-Roadmap/neue Features. Wenn API-Football-Key zurückkommt → die key-blockierten Fantasy-Punkte (284b, Süper-Lig-Drift) reaktivieren.

## D80 — PRODUCT: Sommer 2026 = Tiefen-Umbau/Professionalisierung (Tech-First), Wachstum + Monetarisierung bewusst nach hinten

**Datum:** 2026-06-14 · **Status:** Aktiv · **Kontext-Slices:** 316–323 (S7 Phase-2 P0/P1 komplett)

**Kontext:** S7 Phase-2 (alle P0-Money + P1-Security + P1-Demo-Funde) ist mit Slices 316–323 abgeschlossen (Founding-Pass-Money, profiles-RLS, /api/push, notifications/push, cancel-sub-RPC, FanChallenges-Removal, Gamif-Discriminator+Leaderboard, Ticket-Reconcile). Anil-Lagebild 2026-06-14: **Sommerpause, KEINE aktiven Tester, alles ruhig** → die „offener-Laden"-Bremse (riskante Struktur-Umbauten bei Live-Testern verboten) ist aufgehoben. Anil-Direktive wörtlich: „wir können aktuell alles vergewaltigen, um besser zu werden, strukturierter, professioneller."

**Entscheidung:** Den Sommer (jetzt bis ~Saisonstart Mitte/Ende August, ~8–10 Wochen) **voll auf technischen Tiefen-Umbau + Professionalisierung** (Track A) richten. Konkret = S7 **Phase 3** (Abräumen/Migrieren) + Politur:
- Daten-Modell-Vereinheitlichung (String→UUID für club/league/favorite_club, cross-domain).
- Konsolidierung (5 Leaderboard-Impls → 1, mehrere Truth-Tabellen → eine Quelle; Boundary: Komponenten → Service-Schicht).
- Dormant-Feature-Hygiene (Research, 2 Voting-Systeme, Creator-Fund, Monthly-Liga → je aktivieren ODER löschen; kein Halbfertiges).
- Reste: /api/push cross-user-INSERT-RLS, Ad-Revenue-Share (0€-Writepath), Cron-Monitoring.
- Onboarding-Glättung + Politur (Mobile/Performance/Empty-States) als Retention-Vorbereitung.
- Sobald Anil den API-Football-Key freischaltet: key-blockierte Live-Daten-Punkte (284b 154 Geister, Süper-Lig-Drift, Live-Scores).

**Bewusst NICHT jetzt (Anil-bestätigt):**
- **Monetarisierung/Bezahlsystem** → erst nach „Legal Go". Founding-Pass-Kaufstrecke (kein Payment-Gateway) ist damit KEINE Sommer-Priorität. Plattform bleibt vorerst kostenlos.
- **Wachstum/GTM-Akquise** → bewusst nach hinten (Anil-Wahl „erst Technik, Wachstum später").
- **Konsequenz akzeptiert:** das „1000 Nutzer bis Saisonstart"-Ziel rutscht nach hinten und ist ohne Akquise-Kanal nicht real — Anil hat das explizit akzeptiert. Nordstern dieses Sommers = professionelle, strukturierte, solide Plattform (launch-bereit), nicht Nutzerzahl.

**Begründung:** (1) Leeres-Laden-Fenster ist der einzig sichere Zeitpunkt für riskante Struktur-Migrationen (keine Live-User-Daten-Churn, Tester-Bugs nicht von Umbau-Bugs unterscheidbar entfällt). (2) Monetarisierung ist legal-gegated → kein Hebel jetzt. (3) „1000 Nutzer" ist ein Wachstums-Ziel (Akquise-Kanal-abhängig), kein Technik-Ziel — CTO-Wahrheit „Code bringt keine Nutzer, Code sorgt nur dass sie nicht gehen". Ohne Kanal wäre Tech+Wachstum-parallel verzettelt; Tech-First baut die Bühne sauber, Wachstum folgt wenn der Kanal steht.

**Alternativen erwogen:** (a) Technik + Wachstum parallel — verworfen, Anil hat (noch) keinen Akquise-Kanal, parallel = verzettelt. (b) Nur kleine sichere Fixes wie bisher — verworfen, das Leeres-Laden-Fenster wäre verschwendet (große Umbauten gehen jetzt sicher). (c) Bezahlsystem vorziehen — verworfen, legal-gegated.

**Auswirkungen:** Arbeits-Modus wechselt von „kleine vorsichtige Slices auf Live-Beta" zu „große strukturelle Umbauten im Wartungsfenster" — ABER SHIP-Disziplin (Spec/Review/Proof) bleibt, weil das Ziel „professionell/strukturiert" ist (schlampige Refactors widersprächen dem Zweck). Empfohlene Phase-3-Sequenz: erst Sicherheitsnetz auf den umzubauenden Pfaden härten (S5 fand mock-heavy Tests = grün-aber-bedeutungslos), DANN Fundament (String→UUID), DANN Konsolidierung, DANN Feature-Hygiene, DANN Politur. Supersedes D79-Re-Visit-Trigger („nach P0/P1 → Phase 3 ODER Sommer-Roadmap") — gewählt: Phase 3 / Tech-First.

**Re-Visit-Trigger:** „Legal Go" erreicht → Monetarisierung (Bezahlsystem + Founding-Kaufstrecke) wird Thema. ODER Anil entscheidet Akquise-Kanal → Track B (GTM) parallel hochfahren. ODER Plattform ist „professionell/solide genug" → Wachstums-Fokus.

## D82 — PROCESS: DROP-Sicherheits-Sequenz für irreversible Column-Drops auf Live-Prod

**Datum:** 2026-06-15 · **Status:** Aktiv · **Kontext:** Slice 326 Wave B (DROP clubs.league). Mehrere String→UUID-Migrationen stehen im Sommer an (D80 Tech-First); players.club (Paar A) kommt als nächster großer DROP sobald API-Key frei. Diese Session etablierte eine wiederholbare Sequenz, die einen Live-Prod-Bruch verhindert hat.

**Entscheidung:** Jeder irreversible `ALTER TABLE ... DROP COLUMN` auf Live-Prod läuft ab jetzt in dieser 5-Schritt-Sequenz (kodifiziert in `.claude/rules/errors-frontend.md` „Column-DROP"):
1. **Reader umstellen, Spalte bleibt** — alle Leser/Schreiber auf die ableitbare Quelle (hier `league_id` → `getLeagueById().name`) umstellen, Spalte noch als Netz. Cache-Order beachten (abgeleitete Quelle vor Konsumenten-Cache ready, Slice 286).
2. **Cold-Context-REVIEW vor jedem Apply** — reviewer-Agent prüft GEZIELT auf übersehene Reader über ALLE Achsen: `src/lib/services/*.ts` (nicht nur Domain-Service), `src/app/**/page.tsx` (SSR via supabaseAdmin umgeht Client-Cache), `scripts/*` (kein tsc-Schutz), DB-Functions/Views/Trigger. Diese Session: Review fing 5 übersehene Reader (2 BLOCKER live-Pfad) die der eigene Grep verpasste.
3. **Deploy + Network-Trace-Gate** — per Playwright verifizieren dass die LIVE-Version die Spalte nicht mehr selektiert. **PWA-Service-Worker cacht alte Bundles** → vor dem Check `serviceWorker`-unregister + `caches.delete` + Hard-Reload, sonst testet man die alte Version (passierte hier).
4. **DROP applien** — erst nach bestätigt-neuer-Version. RPC-Änderungen die die Spalte schreiben (z.B. `create_club` INSERT) + DROP atomar in 1 TX.
5. **Post-DROP-Verify** — Spalte weg + abgeleitete Werte erscheinen TROTZDEM live = Ableitung greift.

**Begründung:** Der DROP ist nicht datenverlust-irreversibel solange die FK-ID alle Infos behält (worst case = behebbarer Display-Glitch, kein DB-Restore). Echtes Risiko = übersehener Reader, der nach DROP mit PostgREST-400 die ganze Query (nicht nur ein Label) wirft — die liegen oft AUSSERHALB des offensichtlichen Domain-Service (zweiter Service, SSR-Metadata). Network-Gate + Cold-Review sind die zwei Filter die das fangen.

**Alternativen erwogen:** (a) Reader + DROP in einem Deploy — verworfen, dann ist die Spalte schon weg beim Live-Verify, kein Netz. (b) Nur eigener Grep ohne Cold-Review — verworfen, eigener Grep verpasste 5 Reader (Confirmation-Bias auf Domain-Service). (c) PostgREST-Join für DbClub.league — fummeliger (nested-cast, auth-race); Client-Ableitung via DRY-Helper `withLeagueName` gewählt.

**Auswirkungen:** Gilt für kommende String→UUID-DROPs (players.club Paar A u.a.). Macht irreversible DROPs zur Routine mit definierten Gates statt Einzelfall-Mut. Bestätigt D45 (Gates > Text) — diese Session 3× Blindspots gefangen (Migration-Ordering + 5 übersehene Reader).

**Re-Visit-Trigger:** Falls ein `audit:column-drop`-Tool gebaut wird (greppt alle Achsen + prüft Network-Trace automatisch), kann Schritt 2 teil-automatisiert werden → Sequenz aktualisieren.

## D83 — PRODUCT/ARCHITECTURE: BeScout Money/Reward-Modell — konsolidiert (Scout Card → IPO → CSF → Club-Treasury → Fan-Rewards)

**Datum:** 2026-06-16 · **Status:** Aktiv (Konzept komplett, Bau ausstehend) · **Kontext:** Strategie-Session 2026-06-15/16. Anil-Frustration: zentrale Money-Modell-Infos gingen zwischen Sessions verloren und mussten neu ausgearbeitet werden. Diese Decision + `docs/knowledge/domain/treasury.md` (Kanon) + `trading.md` sind die **dauerhafte Basis** — nie wieder neu durchgehen.

**Das Modell (Kern-Aussagen, unveränderlich):**
1. **Scout Card = vertragsgekoppelter Anteil am Spieler** (Produkt-Wahrheit, Equity-artig) / nach außen „digitale Sammelkarte" (Doppel-Register `business.md`). Asset-Laufzeit = Spielervertrag.
2. **Tokenisierung:** 100.000 SC = 100 % Spielerwert · max **10.000 SC = 10 %** (Verein-Anteil bleibt 90 %). **1 SC = MV / 100.000 €.**
3. **Wechselkurs** (Naming/Einheit jetzt per **D99** kanonisch — siehe dort): Anzeige **„Credits" = cents/100** (1 Credit = 100 DB-cents); **ICO-Wert (Phase 2, nicht heute, user-facing nie €): 1 Credit = 0,01 €**. Deckt sich mit Live-Code (`ipo_price_cents=MV/10` → `centsToBsd` → `MV/1000 Credits`) + ICO-Seed-Preis €0,01. „$SCOUT" = ICO-Coin-Name. Phase 1 = Credits intern (wertloses Spielgeld); echtes EUR Cash-out = **Phase 2** (nach gültiger Lizenz).
4. **IPO-Preis (Einstieg) = Vereins-Entscheidung mit MV-Anker** — nicht starr. Mechanik existiert (`create_ipo p_price`); MV-Vorschlag-UI = Slice 328 (DONE).
5. **CSF / Liquidation (Ausgang):** Bei realem Transfer. **Reward pro Card = min(Transfererlös, Cap) / 100.000 €** (Card-Anzahl kürzt sich raus). **Cap** = Vereins-Schutz bei IPO gesetzt. **Einmalig** (keine Tranchen), **rein proportional** nach Besitz (KEIN csf_multiplier — Treue separat über Fan-Rewards), aus **Club-Treasury**. Nur SC im Umlauf. Der Spread Einstieg↔Ausgang = der „Scout-Fang".
6. **Club-Treasury = echtes bidirektionales Konto** (Saldo + append-only Ledger). REIN: Trading 1 % · IPO 85 % · P2P 0,5 % · Abo 100 %. RAUS: CSF · Fan-Rewards · Event-Prizes · Poll-Rewards · Bounties. **extractive → investive:** Verein reinvestiert verdientes $SCOUT in Fan-Aktivierung. Alles Transfer/kein Minting (Closed Economy bleibt deflationär-neutral). IST heute: KEIN echtes Konto (tote Spalte `clubs.treasury_balance_cents` + on-the-fly `get_club_balance`, Abo-Bug schrumpft rückwirkend).
7. **Fan-Reward-Engine = 2 parallele Perks-Schienen** (Conversion-Anreiz, primär Gating nicht Geldfluss): **Abo** (bezahlt: Fee-Rabatt/Early-IPO/Premium) + **Fan-Rank** (verdient: Community-Zugang/Status/opt. Airdrop). Follow = Einstieg. Club-konfigurierbar.

**Kanon-Beispiel (Osimhen, mit Anil verifiziert 2026-06-16):**
- IPO bei MV 75 Mio → 1 SC = 750 € = 75.000 $SCOUT.
- Fan kauft 2 SC = 150.000 $SCOUT (1.500 €).
- Real-Transfer 150 Mio (kein Cap) → Reward/Card = 150 Mio/100.000 = 1.500 € = 150.000 $SCOUT.
- 2 SC → **3.000 € = 300.000 $SCOUT** (Gewinn +1.500 €, = **2×**, weil 75→150 Mio = 2× Wertsteigerung).
- Mit Cap 100 Mio → 1.000 €/Card (= 2.000 € für 2 SC). Cap ist der entscheidende Upside-Deckel.

**Bau-Sequenz:** 1) Treasury-Fundament (Saldo+Ledger+Einnahmen-Verbuchung+Abo-Bug-Fix) → 2) CSF-Engine ans Treasury (Cap-Semantik + csf_mult raus) → 3) RAUS-Kanäle (Events/Polls/Bounties) → 4) Fan-Reward-Engine. Alle Money-kritisch (CEO-Scope). Slice 328 (IPO-MV-Anker) bereits DONE.

**Begründung:** Das Geflecht (3 Score-Welten, CSF, Treasury, Perks) fühlte sich „wild" an, weil nie als EIN Modell formuliert. Diese Konsolidierung ist die SSOT für alle Money/Reward-Specs.

**Alternativen erwogen:** (a) CSF „echt machen" (Deckel lockern) — verworfen, Securities-Nähe + trifft nicht „Aktivität belohnen". (b) Treue über csf_multiplier bei Liquidation — verworfen (wirkungslos 1,15× + verwässert proportional), ersetzt durch Fan-Reward-Engine. (c) Tranchen-Auszahlung — verworfen, Club zahlt aus Treasury (kein Cashflow-Grund).

**Auswirkungen:** `trading.md` (autoloaded) trägt jetzt das CSF-Modell + Osimhen-Beispiel. `docs/knowledge/domain/treasury.md` = ausführliche Kanon-Quelle (WIE). Künftige Money-Specs referenzieren D83, nicht neu erarbeiten.

**Re-Visit-Trigger:** Cap-Semantik final festlegen (pro-Card cents vs. Transfer-EUR-Referenz) bei Treasury/CSF-Bau. ODER „Legal Go" → Phase-2-Cash-out wird Thema.

## D84 — PROCESS: Setup-Elite-Upgrade — CLAUDE.md Karpathy-first, Register=SSOT, Rules on-demand, Modell-Routing

**Datum:** 2026-06-17 · **Status:** Aktiv · **Kontext:** Auftrag „Setup auf Elite-Level + Hygiene + kein Widerspruch + EIN Workflow + Context ohne Overhead". Faktenbasis: Deep Research `walz06h0w` + Inventur. Voll-autonom alle 5 Achsen ausgeführt. Plan/Distillat: `docs/knowledge/research/claude-code-setup.md` (§4 Ausführungsprotokoll).

**Entscheidung:**
1. **CLAUDE.md = Karpathy-Prinzipien-First** (§1: Think Before Coding · Simplicity First · Surgical Changes · Goal-Driven; Leitsatz „bias toward caution over speed"). 164→103 Zeilen. Money/Security-CEO-Gates bleiben prominent (§3) = BeScouts legitimer Unterschied.
2. **EIN Workflow:** `workflow-reference.md` → `workflow.md` gemerged + gelöscht. Kern-Fix: SHIP-Loop 5→6 Stufen (REVIEW war in CLAUDE.md verschluckt — der Haupt-Widerspruch).
3. **Register = SSOT-Pointer statt hardcoded Kopien.** Hooks→settings.json, MCP→.mcp.json, Skills/Agents→Laufzeit-Tools. Killt die Drift-Klasse, die 28/22/9-Falschstände erzeugte. **Künftig NIE wieder Hook/Skill/Agent/MCP-Zahlen in Docs hardcoden.**
4. **Autoload-Budget:** `errors-{frontend,db,infra,scraper}.md` + `testing.md` von always-loaded auf `paths:`-scoped (laden beim Edit der Domain). Always-Load ~4,5k → ~1,2k Zeilen/Session. `common-errors.md` bleibt always-loaded als Navigator.
5. **Modell-Routing (CLAUDE.md §8):** Sonnet 4.6 Default, Opus 4.8 money/security/architektur/race/komplexe Migration, Haiku 4.5 trivial.

**Begründung:** Die vermeintliche „Setup-Fett"-Annahme (40 Hooks/26 Skills/16 Agents culln) war primär **Doku-Drift**, nicht reale Redundanz — Per-Item-Audit (Achse 1) fand 0 tote Hooks (alle gewired), keine Agent-Duplikate (distinkte Auditor-Lenses), keine toten Skills. Research refutierte „nur 3 Hooks" (kein Kahlschlag). Echter Hebel war Doku-Konsolidierung (Drift weg) + Autoload-Budget (Context-Overhead), nicht Item-Minimierung.

**Alternativen erwogen:** (a) Aggressiver Hook/Skill/Agent-Cull auf Zielzahlen — verworfen, Items sind je begründet + gewired, Cull bräche Skills (sweep/persona/audit). (b) 600+ slice-nummerierte SHIP-Proofs/Specs archivieren — verworfen, append-only Record, nicht im Context, = reine Churn. (c) Register-Tabellen mit korrekten Zahlen aktualisieren — verworfen, driftet sofort wieder; SSOT-Pointer ist die strukturelle Lösung. (d) errors-*.md ganz streichen — verworfen, wertvoll; paths-scoping behält Wissen, senkt nur always-Load.

**Auswirkungen:** Jede Session lädt ~3,3k Zeilen weniger. CLAUDE.md ist der Prinzipien-Kompass, nicht das Register. Commits: f1a228d0 (A4) · ced8b2c7 (A2) · 60ee1c84 (A1) · 3797e3cd (A3) · 15ddcbfc (A5).

**Re-Visit-Trigger:** Falls ein neuer Hook/Skill/Agent gebaut wird → NICHT in Docs listen, nur via SSOT. Falls Sessions errors-*.md-Wissen vermissen (paths-Trigger greift nicht) → paths-Globs erweitern, nicht zurück auf always-load.

## D85 — PROCESS: SHIP-Workflow-Test (Slice 329 Treasury) — Befunde + Reviewer-„Verdict-first"

**Datum:** 2026-06-17 · **Status:** Aktiv · **Kontext:** Erster großer Money-Slice (329 Club-Treasury) nach dem Setup-Upgrade (D84), bewusst als Test des neuen Workflows gefahren. Anil: „falls Schwächen/Lücken auffallen, klären wir das" + „entspricht der Output einem Senior?".

**Befund — der Workflow trägt, die Gates haben 2× echte Geld-Fehler gefangen:**
1. **IMPACT ist der größte Hebel:** Live-RPC-Bodies verifizieren (statt Spec/Konzept glauben) reduzierte den Blast-Radius von „6–7 Money-RPC-Edits" auf „2 Edits + 2 Trigger" (trades-AFTER-INSERT-Trigger fängt Income, D39). Ohne IMPACT hätte ich 4 Geld-RPCs unnötig angefasst (Slice-156-Revert-Risiko).
2. **REVIEW fing einen BLOCKER, den ICH eingebaut hatte:** Migration re-`GRANT`te das cron-only `renew_club_subscription` an authenticated + droppte service_role (AR-44-Muskelgedächtnis). Cold-Context-Reviewer fand's, live-verifiziert + gefixt. Bestätigt: REVIEW vor Prod-Apply ist bei Money Pflicht, nicht optional.
3. **PROVE/apply-Gate fing 2 Bugs:** `SUM(bigint)=numeric`-Cast (transaktionaler Rollback, kein Silent-Fail) + `balance_after`-Same-TX-Fragilität (→ 329b SUM-Heal). Beide jetzt in `errors-db.md`.

**Entscheidungen (Anil 2026-06-17):**
- **Reviewer „Verdict + Findings ZUERST" — JA, umgesetzt.** Reviewer-Agent (`.claude/agents/reviewer.md`) + `/ship review`-Template: sichtbare Antwort startet mit Verdict + Findings + One-Line, Herleitung ans Ende. Grund: reviewer-Agent wurde 2× in Slice 329 mitten in der Analyse abgeschnitten, bevor das Verdict kam. So landet das Wichtigste immer, auch bei Truncation.
- **Supabase-Branch-Dry-Run für Money-Migrationen — NEIN** (Anil). Bleibt bei: Review-vor-Apply + transaktionaler Rollback (`apply_migration` rollt bei Fehler komplett zurück) + Verify-Gate (Backfill-Abgleich VOR Read-Switch) + BEGIN/ROLLBACK-Smokes. Direkt auf Beta-Prod ist akzeptiert.

**Senior-Selbstcheck:** Kern-Design senior-grade (trigger-zentrisch, Bank-Ledger, append-only, RAUS deferred, Backfill-verify-vor-Switch). Die 2 Fehler, die ich beim ersten Wurf machte (cron-Grant, Same-TX-balance_after), sind genau die, die die Gates abfingen — System funktioniert wie entworfen.

**Auswirkungen:** Reviewer-Output ab jetzt verdict-first. Money-Migrationen bleiben Review→Apply→Verify ohne Branch-Schritt.

**Alternativen erwogen:** (a) Branch-Dry-Run — von Anil verworfen (Overhead > Nutzen bei vorhandenem Rollback+Verify-Gate). (b) Reviewer nur im Skill-Template ändern — verworfen, die Agent-Persona ist der stärkere Hebel (gilt bei jedem Dispatch, auch ohne /ship).

---

## D86 — PRODUCT: Polls = Vereins-Geldmaschine + Fan-Stimme (REIN, nicht RAUS) + Discovery + soziale Schicht

**Datum:** 2026-06-17 · **Status:** Aktiv (Vision geklärt, Bau offen) · **Kontext:** Strategie-Session beim Planen der RAUS-Kanäle. Anil korrigierte mein Missverständnis (ich hatte Polls als „Verein zahlt Fans / RAUS" eingeordnet). **Volles Modell + ToDos (Kanon): `docs/knowledge/domain/polls.md`. Beibezug Pflicht.**

**Die Entscheidung / das Modell:**
1. **Polls sind REIN, nicht RAUS.** Fan zahlt fürs Mitmachen → **Verein verdient → Treasury**. Das ist gewollt extractive (die Geldmaschine), KEINE „Verein-belohnt-Teilnahme"-Umkehr. Strategischer Kern: Vereine können Fan-Meinung (besonders Transferzeit) heute nirgends kanalisieren/monetarisieren — genau das schließen wir. Skalen-Hebel: Gala 35 Mio Fans, 1 % = 350k zahlende Teilnehmer.
2. **Drei Anlege-Spuren:** Gratis-Club-Vote (Admin, „fühl-dich-gehört", existiert) · **bezahlte Vereins-Umfrage** (Club-Admin, im Namen des Vereins, Geld → Treasury) · **bezahlte User-Umfrage** (User ab Follower-Schwelle, eigener Name, Geld → User-Wallet).
3. **Identitäts-/Autoritätsgrenze (sicherheitskritisch):** Bezug nehmen darf jeder; „im Namen des Vereins" auftreten (offiziell, an die Kasse) nur verifizierter Club-Admin. Sonst Impersonation/Geld-Umleitung. Gleiche Klasse wie Events-`type`-Quellenmodell (Slice 331).
4. **Bezug/Tags = Verein UND/ODER Spieler** (nicht nur Verein). `community_polls` braucht zusätzlich `player_id`.
5. **Discovery:** Fans müssen Polls + Paywalls (Research) nach **Verein + Spieler** suchen/filtern können (existiert heute nicht — nur Typ-Filter + Textsuche).
6. **Soziale Schicht:** **Follower** = Reichweite + Tor fürs User-Anlegen · **Abonnenten** = Perks (2×-Gewicht/Early/exklusiv bei Paid-Polls) · **Fan-Rang** (evtl.) = Treue-Bevorzugung/Auszahl-Gewichtung.
7. **Offen:** „Mehrheit der User auszahlen" — Lotterie/Topf vs „Recht behalten" (prediction) vs Mini-Teilnahme-Reward; Fan-Rang ggf. als Gewicht.

**Befund Current-State:** `community_polls` kann lesen/abstimmen(70/30)/abbrechen — **aber KEINE Erstellung** (kein Service/RPC/UI). „Hülle ohne Tür". Einzige existierende Erstellung = Gratis-Club-Vote (Admin). Kein `player_id`, kein Filter nach Verein/Spieler, Follower/Fan-Rang wirkungslos.

**Auswirkungen:** Korrigiert `docs/knowledge/domain/treasury.md` §7 (Polls = REIN). Roadmap P1–P4 im Kanon-Doc `docs/knowledge/domain/polls.md`. P1 (Erstellung + Quelle/Identität + Treasury-Routing) ist der Kern-Slice. Ledger-Typ: vorgehaltener `poll_reward`-DEBIT war falsche Annahme (RAUS) → für Polls braucht es einen REIN-Credit-Typ (`poll_revenue`).

**Alternativen erwogen:** Polls als RAUS/„Verein belohnt Teilnahme" (mein erster Entwurf) — von Anil verworfen: das verfehlt den Geschäftszweck (Verein soll *verdienen*, nicht ausgeben). Die Auszahl-an-Fans-Idee bleibt als *optionale* Zusatzebene (§7), nicht als Kern.

---

## D87 — PROCESS: Live-Reality-Check (functiondef) VOR SPEC/Modell, nicht erst vor BUILD

**Datum:** 2026-06-17 · **Status:** Aktiv · **Kontext:** In der Treasury-Serie (329-332) war meine Spec-/Modell-Prämisse **zweimal falsch**, weil ich Doku/alten Migrations-Dateien statt dem Live-Stand vertraute:
1. **Polls:** Konzept-Doc/mein Framing sagte „Verein belohnt Teilnahme (RAUS)" + „Fan legt Poll für Verein an". Beides falsch — Anil korrigierte (REIN = Verein verdient; Verein legt selbst an). D86.
2. **Bounties:** Ich spec'te „Club-Bounty mintet" aus der **alten Migrations-Datei** (`20260404191000`). Der **Live-functiondef** zeigte: Admin zahlt aus eigenem Wallet bei Approval (evolviert). Hätte ich nach Spec gebaut, wäre die Annahme falsch gewesen.

**Lehre:** Der Slice-156-PATCH-AUDIT („Live-functiondef = Baseline, nicht erste/alte Migration") gilt nicht nur vor BUILD, sondern **vor dem SPEC-Problem-Statement**. Sobald eine Slice eine bestehende RPC beschreibt/anfasst, MUSS Code-Reading #1 der Live-`pg_get_functiondef` sein — BEVOR ich das Problem in Worte fasse oder dem CEO ein Modell präsentiere. Sonst baue ich (oder erkläre Anil) auf einer veralteten Prämisse.

**Zusätzlicher Befund (Verstärkung errors-db.md):** 3 latente CHECK-Drift-Bugs in EINER Session gefunden (transactions.type/liquidation · events.status/'cancelled' · bounties.status/'completed') — alle „Body kompiliert, Runtime failt beim ersten echten Call". Systemisch. Pflicht-Grep `pg_get_constraintdef` gegen RPC-Status/Type-Literale bei jeder Money-Slice.

**Auswirkungen:** SPEC-Code-Reading-Liste (workflow.md §1.4) startet bei RPC-Slices IMMER mit Live-functiondef. Spart Fehl-Specs + Fehl-Erklärungen an den CEO.

**Alternativen erwogen:** Nur vor BUILD prüfen (Status quo D85/156) — verworfen: dann ist die Spec + die CEO-Präsentation schon auf falscher Basis, und der Reviewer/Build-Heal kommt zu spät (Anil hat dann ggf. schon eine falsche Entscheidung getroffen).

---

## D88 — PROCESS: Wissens-Lebenszyklus — Korrektheit, Aktualität, Korrektur verdrahtet (nicht nur dokumentiert)

**Datum:** 2026-06-17 · **Status:** Aktiv · **Category:** PROCESS · **Kontext:** Anil fragte beim Aufbau von `docs/knowledge/` (E0 Welle 2): „Wie stelle ich sicher dass das gespeicherte Wissen korrekt ist, abgestimmt aktuell bleibt, was passiert bei neuem Wissen / Korrektur / Erweiterung?" — und: „nicht nur planen, alle komplett verdrahten mit Verstand." Das ist DIE Existenzfrage: `memory/semantisch` ist genau daran gestorben (Files behaupteten „truth", drifteten unbemerkt, kein Detektor).

**Entscheidung:** Der Wissens-Lebenszyklus wird als **Gesetz + Enforcement** festgelegt (D45 „Hooks > Text-Regeln"):
1. **Korrektheit:** Ableitbares Wissen (RPC-Verhalten, Spalten, Fees) wird NICHT als Prosa dupliziert — entweder auf Live-Quelle zeigen oder `verified-against: <pfad> @ <datum>` ankern (kodifiziert D87). Migration/Anlage eines `domain/`-Files = Verify gegen Live-Realität (`pg_get_functiondef`), nicht alte Datei.
2. **Aktualität:** (a) `scripts/audit-knowledge.ts` — intelligenter Detektor (HARD: broken-link/orphan/no-frontmatter blockt Pre-Commit; SOFT: `updated`>6 Mo / `verified-against`-git-Drift → nightly sichtbar). (b) SHIP-LOG-Kopplung: Slice ändert Domain → `domain/`-File im SELBEN Slice mit-updaten (Drift = getrennte Code-/Doku-Änderung).
3. **Neues Wissen:** DISTILL-Regel (W2a) — Bucket-File mit Front-matter + INDEX-Zeile mit `consult_when`, sonst „verloren".
4. **Korrektur/Erweiterung pro Bucket:** `decisions/` = append-only (nie still überschreiben, `status: superseded` + Nachfolger-Link). `domain/lessons/research/` = überschreiben mit Spur (`updated` hoch; bei sachlich-falsch eine „Korrektur \<datum\>:"-Zeile behalten).

**Verkabelung (D53 Build-without-Wire verboten):** `audit:knowledge` in `package.json` + `.husky/pre-commit` (HARD-Gate) + `.github/workflows/nightly-audit.yml` (SOFT-Surfacing → Master-Tracker-Issue). Konvention in `docs/knowledge/README.md`. Live-getestet via deliberate-break (Proof E0-W2gov).

**Begründung:** Ein Wissens-Index ohne Lebenszyklus-Enforcement ist ein zukünftiger Friedhof. Die Mechanik existiert in BeScout bereits (`audit:stale`, `wiring-check`, Knowledge-Flywheel) — D88 erweitert bewährte Muster auf `docs/knowledge/`, erfindet nichts.

**Auswirkungen:** Jedes durable Wissen hat genau einen Ort + consult_when + (für Code-beschreibendes) einen Verifikations-Anker. Drift wird maschinell gefangen statt menschlich übersehen. Pre-Commit blockt jetzt-eingeführte Integritäts-Bugs; Nightly macht Veraltung sichtbar.

**Alternativen erwogen:**
- **Nur D88 dokumentieren, kein Tool** — verworfen: Text-Regeln driften (genau die Lehre aus `memory/semantisch`-Tod). „mit Verstand verdrahten" = Anils explizite Anforderung.
- **Auto-Update von `updated`/`verified`** — verworfen: Human-Curated-Context-Gesetz; ein Bot der „updated" hochsetzt ohne echte Re-Verifikation lügt nur maschinell.
- **Staleness HARD blockieren** — verworfen: würde unrelated Code-Commits blockieren; Veraltung gehört sichtbar (nightly), nicht als Commit-Blocker.

**Re-Visit-Trigger:** Wenn nach W2b-Migration `audit:knowledge` SOFT-Findings akkumulieren ohne dass sie abgearbeitet werden → Master-Tracker-Disziplin nachschärfen (analog Smoke-Fail SO-4).

---

## D89 — ARCHITECTURE: Wissens-Heimat = frisches `docs/knowledge/` (Option B), nicht `memory/semantisch` wiederbeleben

**Datum:** 2026-06-17 · **Status:** Aktiv · **Category:** ARCHITECTURE · **Kontext:** E0 Welle 2 wollte das verstreute durable Wissen an EINEN Ort bringen. Beim Aufbau zeigte sich: es existiert bereits ein zweiter Obsidian-„Second-Brain" unter `memory/semantisch/` + `memory/episodisch/`, geroutet von `memory/cortex-index.md` (bei jedem Session-Start gelesen). Ein neues `docs/knowledge/` wäre eine SECHSTE konkurrierende Taxonomie — das Gegenteil des Ziels.

**Entscheidung (Anil, nach Evidenz):** Option B — **frisches `docs/knowledge/` bauen, den `memory/`-Baum stilllegen** (Gold migrieren, Rest archivieren, cortex-index ablösen). NICHT Option A (memory/ wiederbeleben).

**Begründung (aus Qualitäts-Assessment `worklog/notes/E0-welle2-memory-quality-assessment.md`):** Der `memory/`-Baum ist zu ⅔ leer oder ephemer — 6 Teilbäume komplett leer (semantisch/episodisch-Split nie gelebt), 6 reine Snapshot-Halden, nur ~13 Files tragen durables Gold, und die sind systematisch gedriftet (Stand 2026-03/04, kennen kein Treasury/CSF/Polls). cortex-index ist technisch ~95% intakt aber inhaltlich tot. Wiederbeleben = fast neu bauen, mit derselben Drift-Struktur die ihn umbrachte. Das Wertvolle ist ohnehin schon woanders kanonisch (`.claude/rules/`, `decisions.md`, `worklog/concepts/`).

**Auswirkungen:** Neue Heimat `docs/knowledge/{domain,decisions,lessons,research}/` + `INDEX.md`. Migration in Wellen: W2a (Index) ✅ → W2gov (Governance/D88) ✅ → W2b (13 Gold migrieren + Dup-Entscheidungen) → W2c (~90 Files archivieren + cortex-index ablösen). `.claude/rules/` (path-scoped Autoload) + `wiki/` (Anil-kuratiert) + `session-handoff.md` bleiben eigene Häuser.

**Alternativen erwogen:**
- **Option A (memory/ wiederbeleben)** — verworfen: gleiche Drift-Anfälligkeit, die den Baum schon einmal killte; Aufwand ≈ Neubau ohne den Vorteil eines sauberen Schnitts + Front-matter-Disziplin.
- **Beides parallel laufen lassen** — verworfen: zwei Routing-Tabellen (cortex + INDEX) = genau die Mehrdeutigkeit, die E0 beseitigen soll.
- **Erst Qualität prüfen, dann entscheiden** — GEWÄHLT als Zwischenschritt (Assessment-Agent), führte zu fundiertem B statt Bauchgefühl.

**Re-Visit-Trigger:** Falls bei W2b-Migration ein Gold-File sich als nicht-migrierbar/wertlos zeigt → ist ok (war Schätzung); falls >5 der 13 wertlos → Assessment war zu optimistisch, Scope neu bewerten.

## D90 — ARCHITECTURE: 3-Schichten-Kanon für durables Wissen (WIE/WARUM/Regel-Zeiger)

**Datum:** 2026-06-17 · **Status:** Aktiv · **Category:** ARCHITECTURE · **Kontext:** Bei W2b lag dasselbe durable Wissen oft an 3 Orten (Treasury: `concept` + D83 + `trading.md`) → Doppel-Pflege-Risiko (Geld-Zahl an einer Stelle ändern, andere vergessen = Drift). Vor der Migration brauchte es eine Regel, WELCHE Schicht WAS hält. Anil-Entscheidung (AskUserQuestion, 2 Optionen verworfen).

**Entscheidung (Anil):** **3 Schichten, jede mit klarer Rolle, EINE Wahrheit pro Fakt:**
1. **`docs/knowledge/domain/` = WIE es funktioniert** = Kanon-Inhalt. ALLE Zahlen/Mechanik leben hier (Treasury-Formeln, Polls-Spuren, Fee-Splits-Mechanik).
2. **`memory/decisions.md` = WARUM** = kurze Entscheidung + Link auf domain. Append-only, supersede-Spur.
3. **`.claude/rules/*.md` = schlanke path-scoped Code-Regel + Zeiger** auf den domain-Kanon (statt Voll-Kopie).
Plus: Scope-Entscheidung „alle 13 Gold-Files in einem Rutsch migrieren" (nicht inkrementell).

**Begründung:** Verworfene Optionen waren (a) „alles nach docs/knowledge ziehen" — bricht den path-scoped Autoload von `.claude/rules` (lädt beim Domain-Edit, der wertvollste Moment) + den DISTILL-Fluss in decisions.md; (b) „Status quo, nur INDEX zeigt drauf" — lässt das Drift-Problem (der Grund für E0) ungelöst. Die 3-Schichten trennen nach Frage (WIE/WARUM/Code-Regel), sodass jede Information genau einen Heimat-Ort hat und die anderen Schichten nur zeigen.

**Auswirkungen:** Governance-Regel für jede künftige Wissens-Platzierung. Money-Modell-Beispiel umgesetzt: `domain/treasury.md` (WIE, Kanon) ← D83 (WARUM) ← `trading.md` (Regel + Zeiger). Gilt für alle Domains. Verstärkt D88 (Lebenszyklus) + D89 (Heimat = docs/knowledge).

**Alternativen erwogen:** siehe Begründung (alles-zentralisieren / Status-quo) — beide verworfen.

**Re-Visit-Trigger:** Falls Doppel-Pflege trotzdem auftritt (gleiche Zahl in domain UND rule gepflegt) → Zeiger-Disziplin in der Regel-Schicht nachschärfen (Regel darf Zahl nur referenzieren, nicht kopieren).

---

## D91 — PROCESS: Gated UI-Live-Verifikation → DB-Proof akzeptieren, keine Prod-Fixtures fabrizieren

**Datum:** 2026-06-18 · **Status:** Aktiv · **Category:** PROCESS · **Kontext:** PROVE-Stage verlangt bei UI-Changes Live-Playwright gegen bescout.net. Bei Slices 335 (Event-Cancel-ConfirmDialog) + 336 (Abo-2×-Gewicht) ist der UI-Pfad aber **konto-/daten-gated**: das QA-Konto `jarvisqa` ist platform_admin=0, club_admin=0, active_subs=0; zudem existierten auf Prod 0 absagbare Events + 0 aktive Club-Polls. Echte Live-Verifikation hätte das **Fabrizieren von Prod-Fixtures** (Test-Event, Club-Poll, Gold-Abo) + bei 336 eine **echte bezahlte Stimme** (Geld-Mutation auf Prod) erfordert.

**Entscheidung (Anil, „db beweis reicht"):** Wenn die Live-UI-Verifikation eines Money-/Mutations-Pfads **nur** durch Fabrizieren von Prod-Fixtures oder echte Geld-Mutationen möglich wäre, **gilt der Slice als bewiesen, sobald der Money-Pfad per DB-Smoke (`BEGIN; … ROLLBACK;`) belegt ist.** Keine Prod-Fixtures fabrizieren, keine echte Geld-Mutation nur für einen UI-Screenshot. Den Gating-Grund + die DB-Proof-Abdeckung im Proof-File dokumentieren (damit die nächste Session nicht erneut mit demselben Konto scheitert).

**Begründung:** Der Wert der Live-UI-Verifikation (Screenshot eines Dialogs / Tally-Inkrements) ist gering gegenüber dem Risiko/Aufwand, echte Vereins-/Abo-/Vote-Daten auf der Live-Prod-DB anzulegen — besonders im Money-Path (§3 „caution over speed"). Der DB-Smoke beweist die kritische Logik (Geld-Fluss, Guards, Refund) deterministisch und ohne Prod-Mutation. Trigger für echte UI-Verifikation bleibt: sobald ein passendes Test-Konto (Club-Admin / Gold-Abo) ODER organische Prod-Daten existieren.

**Auswirkungen:** Gilt für alle konto-/daten-gated UI-Verifikationen (Club-Admin-Panels, Abo-Perks, Rollen-spezifische Flows). Proof-File hält fest: (a) Gating-Grund (DB-verifizierte Rollen/Counts), (b) DB-Smoke-Abdeckung, (c) Re-Verify-Trigger. Ergänzt `feedback_no_local_qa` (Prod statt localhost) um die Gating-Ausnahme.

**Alternativen erwogen:** (a) jarvisqa temporär per DB hochstufen (Club-Admin + Abo) → verworfen, weil dann immer noch Prod-Fixtures (Event/Poll) fehlten + Prod-Mutation; (b) volle Fixtures fabrizieren inkl. echtem Vote → verworfen (Geld-Mutation auf Prod für Screenshot-Wert disproportional).

**Re-Visit-Trigger:** Sobald ein dediziertes Club-Admin-/Gold-Abo-Test-Konto + Test-Verein mit Fixtures existiert → gated UI-Verifikationen (335/336/334-Picker) echt nachholen.

## D92 — ARCHITECTURE: Neuer Multiplikator, der einen Live-Perk subsumiert → `MAX`-Floor, nicht ersetzen

**Datum:** 2026-06-18 · **Status:** Aktiv · **Category:** ARCHITECTURE · **Kontext:** Slice 343 aktiviert den Fan-Rang als Poll-Stimmgewicht. Es existierte bereits ein Live-Perk: aktives Club-Abo → 2× Tally-Gewicht (Slice 336). Anil bestätigte das Mapping „Ultra/Legende 2×, Ehren/Ikone 3×, sonst 1×" als reine Tier-Tabelle. Problem: `fan_rankings` ist stale (kein Trigger auf Abo/Holdings/Follow — reward-ranking.md W2-A), die meisten Abo-Inhaber sitzen auf niedrigem Rang → eine reine Tier-Tabelle hätte einen Gold-Abo-Inhaber von 2× still auf 1× **zurückgestuft** = unsichtbare Regression eines bezahlten Perks.

**Entscheidung:** Wenn ein neuer gewichtender Faktor einen **bestehenden, live ausgelieferten** Perk konzeptionell „integriert", wird er per **`GREATEST(alt_perk_weight, neu_weight)`** kombiniert, nicht als Ersatz. Der alte Perk bleibt **Mindestboden** (keine Regression), der neue Faktor kann nur **anheben**. Kein Stapeln/Multiplizieren (2×·3× = 6× ist nie gewollt). Gilt besonders, wenn der neue Faktor aus einer **stale/lazy** Quelle stammt.

**Begründung:** „Integriert, nicht doppelt" hat zwei Lesarten — reine Tabelle (subsumiert = ersetzt) und MAX (subsumiert = Floor). Die reine Tabelle ist nur korrekt, wenn die neue Quelle **frischer/vollständiger** ist als der alte Perk. Ist sie stale (wie fan_rankings), entwertet sie still einen bezahlten Live-Perk → Trust-/Money-Schaden ohne Fehler-Signal. MAX ist die einzige Lesart, die monoton ist (niemand verliert) und trotzdem den neuen Faktor wirksam macht. Verifiziert per DB-Smoke: `GREATEST(2,1)=2` (Floor), `GREATEST(2,3)=3` (kein 6×), `GREATEST(1,1)=1`.

**Auswirkungen:** Blaupause für die kommende **Fan-Reward-Engine** (Treasury §8) + jede künftige Reward-Konsolidierung, die Abo/Fan-Rang/Streak/Follower kombiniert. Regel: vor „neuer Faktor ersetzt alten" immer prüfen, ob der alte ein **live ausgelieferter** Perk ist und ob die neue Quelle **frisch** ist; wenn nein → `MAX`-Floor + Regression-AC. Verwandt mit „Money-RPC Pricing-Formel Drift" (Slice 108, errors-db.md) — dort Drift durch divergente Konstanten, hier Regression durch stale Subsumtion.

**Alternativen erwogen:** (a) reine Tier-Tabelle (Tier setzt Gewicht absolut) → verworfen: regressiert Abo-Inhaber mit stale Rang von 2× auf 1×, still. (b) Multiplizieren/Addieren (Abo × Fan-Rang) → verworfen: 6×-Eskalation, kein konzeptioneller Sinn, „doppelt zählen". (c) recalc-on-read des Fan-Rangs im Vote, um Staleness zu beheben → verworfen für Tally-only: teuer (5-Dim) im FOR-UPDATE-Money-Pfad, Risiko/Latenz disproportional, da stale = max „1 zu wenig", nie Geld-Effekt. Erst relevant wenn Fan-Rang ein **Geld-** oder **Zugangs**-Tor steuert (Polls (b)).

**Re-Visit-Trigger:** Wenn `fan_rankings` einen Frische-Trigger (auf Abo/Holdings/Follow) bekommt ODER Fan-Rang ein Geld-/Zugangstor steuert (Polls (b) exklusive Treue-Umfragen) → recalc-on-read bzw. Abhängigkeit von der Staleness neu bewerten.

---

## D93 — PRODUCT/ARCHITECTURE: Fan-Reward-Engine (Teil von Epic E1) — Reihenfolge + Mechanik

**Datum:** 2026-06-18 · **Status:** Aktiv · **Category:** PRODUCT/ARCHITECTURE · **Kontext:** Anil wählte als nächstes großes Money-Stück die **Fan-Reward-Engine** (Treasury §8: Verein belohnt treue Fans). Design-Alignment-Session 2026-06-18. Namens-Klarstellung: „E1" im MASTERPLAN = ganzes Money/Reward-Epic (Treasury → Polls → Fan-Rewards); die Fan-Reward-Engine ist ein Teil davon, ihre Schritte heißen **FRE-1 … FRE-5** (Slice 344 = FRE-1).

**Entscheidung (5 Festlegungen + Slice-Kette):**
1. **Perks/Gating zuerst, Airdrop ($SCOUT-RAUS) später.** Die Engine ist primär ein Perks-/Anreiz-System (Folgen/Abonnieren attraktiver machen), nicht primär ein Geldfluss.
2. **Follow zählt** als kleines Einstiegssignal in den Fan-Rang (`calculate_fan_rank`). Heute bringt Folgen nichts (reward-ranking.md W2-C) — das ist der erste Anreiz.
3. **`csf_multiplier` raus** aus dem Fan-Rang-Pfad (D83: Treue läuft vollständig über diese Engine, nicht über den CSF-Liquidations-Bonus, der ohnehin auf 1,15× gedeckelt/wirkungslos ist).
4. **Plattform-Default-Perks zuerst**, Club-Konfigurierbarkeit später (FRE-5).
5. **Welt-1 bleibt RAUS** (user_stats-Retire, Monatsliga-Aktivierung sind „Plattform belohnt Können", eigener Track — nicht Teil der Fan-Reward-Engine).

**Slice-Kette:** FRE-1 Leiter sichtbar + Perk-Katalog (Slice 344 ✅) → FRE-2 Follow→Fan-Rang-Signal (Migration, Money-nah, /impact) → FRE-3 ein echtes neues Perk-Gate → FRE-4 Airdrop (Club belohnt Top-Treue mit $SCOUT aus Treasury, Money) → FRE-5 Club-Konfigurierbarkeit.

**Begründung:** Perks-first hat kein Geld-Risiko (außer entgangene Fee-Rabatte), macht Follow/Fan-Rang sofort wirksam + sichtbar (größte tote Stelle laut reward-ranking.md W2-B/C/D) und bereitet den schärferen Airdrop-Money-Slice sauber vor. Follow als Signal heilt W2-C (größte, ignorierte Fan-Basis). csf_multiplier raus folgt D83 (Treue gehört in die Engine).

**Auswirkungen:** FRE-2 ändert die Fan-Rang-Formel = **Money-Tally-Input** (Fan-Rang steuert seit Slice 343 das Poll-Stimmgewicht). Daher /impact + Live-`pg_get_functiondef`-Read ZUERST + Anil-Design-Entscheidung (wie stark Follow zählt: kleines additives Signal vs. Neu-Gewichtung) + recalc-Latenz beachten (Fan-Rang aktualisiert nur nach Event-Scoring/Cron — D92 Re-Visit-Familie).

**Alternativen erwogen:** (a) Airdrop zuerst → verworfen: Geld-Risiko höher, Anils Frame ist Perks-primär. (b) Follow zählt NICHT (Treue nur Abo+Aktivität) → verworfen: Follow bleibt sonst totes Signal (W2-C). (c) Welt-1 mit reinnehmen (Monatsliga/user_stats) → verworfen: anderer Track (Können, nicht Treue), würde den Block unkontrollierbar machen.

**Re-Visit-Trigger:** Bei FRE-2 die recalc-Frage (Staleness) konkret entscheiden; csf_multiplier-Removal als eigener Aufräum-Slice einplanen.

**UPDATE 2026-06-18 (nach FRE-5):** Anil-Klarstellung — **FRE-4 Airdrop gehört NICHT in die jetzige Phase.** Der Airdrop ($SCOUT-RAUS an Top-Treue-Fans) war als **Übergangs-Mechanik auf den echten Coin** angelegt (Phase 3 nach CASP, business.md Licensing-Phasen). **Der Verein zahlt keine $SCOUT-Airdrops aus dem Treasury** — Treasury-Redistribution/Airdrops sind explizit „post-Pilot" (ADR-026). Damit ist die aktive Fan-Reward-Engine mit **FRE-1/2/3/5 inhaltlich abgeschlossen** für die jetzige Phase; FRE-4 ist auf die Coin-Phase verschoben (kein „nächster Money-Schritt"). **Slice-Kette aktualisiert:** FRE-1 (344 ✅) → FRE-2 (345 ✅) → FRE-3 (346 ✅) → FRE-5 Club-konfigurierbare Schwellen (**Slice 347 ✅** — pro-Club Score→Tier, Recalc-on-Save, Schutz-Grenze: Gewicht-Mapping bleibt global) → ~~FRE-4 Airdrop~~ (deferred bis echter Coin). Nächstes Money-Stück = **Polls-Reste** (b exklusive Treue-Umfragen, c Abo-Early-Access) ODER neuer Treasury-/REIN-Block, nicht Airdrop.

---

## D94 — PROCESS: Pre-Push-Hook = schneller Gate, volle Tests = CI-Autorität

**Datum:** 2026-06-23 · **Status:** Aktiv · **Category:** PROCESS · **Kontext:** Anil meldete (a) tägliche CI-Fail-Emails und (b) reproduzierbares „failed to push some refs". Diagnose: Der Pre-Push-Hook (Slice 248) lief `CI=true pnpm exec vitest run` — budgetiert für ~30-90s, aber die Suite ist auf 3242 Tests / ~6-7 min gewachsen. Diese Laufzeit war der **Auslöser** des Push-Transport-Bruchs (verifiziert: `git push --no-verify` ohne Hook landet sofort; 3× Fail mit Hook, 0× ohne). Parallel failte CI bei jedem Push am stale `audit:silent-fail`-Baseline (79 vs. 81, alles bestehende Cron-`.in()`-Muster).

**Entscheidung:**
1. **`.husky/pre-push` führt NICHT mehr die volle Test-Suite aus**, sondern nur den schnellen `audit:silent-fail:check` (~5s) — der Gate gegen genau die Drift-Klasse, die die täglichen CI-Fail-Mails verursachte. Verbindung bleibt frisch → Push-Transport stabil.
2. **Volle Tests/Build = CI-Autorität** (`ci.yml` test-job, grün, ~2.5 min auf GH-Runnern — schneller als lokal). Ein echter Testfehler erscheint in CI (mit Mail = echtes Signal), nicht mehr in einem 6-min-Lokal-Lauf.
3. **`git config http.version HTTP/1.1` + `http.postBuffer`** als Transport-Härtung (lokal).
4. **Audit-Baseline-Drift wird bewusst nachgezogen** (`.audit-baseline.json`), wie das Tool es vorgibt — nach Verifikation, dass die delta-Findings keine neuen Money-Path-Silent-Fails sind (Report-Diff).

**Begründung:** Die volle Suite lokal UND in CI ist Doppelung; die lokale Variante war zudem aktiv schädlich (Push-Bruch + 6 min/Push). CI deckt Tests zuverlässig ab. Für einen Solo-Dev mit Direct-Push ist „CI fängt es in ~2,5 min + Mail" ausreichend — sobald CI verlässlich grün ist, ist jede Fail-Mail Signal statt Rauschen (genau Anils Wunsch).

**Auswirkungen:** Revidiert die Slice-248-Annahme („pre-push simuliert lokal den CI test-job"). Trade-off bewusst akzeptiert: Test-/Mock-Drift (Slice-247-Klasse) wird erst in CI sichtbar, nicht pre-push — Beispiel diese Session: ein ClubContent-Mock-Bug rutschte durch einen `--no-verify`-Push und wurde korrekt von CI gefangen. Bei Bedarf später: schnelle changed-file-scoped `vitest related` als pre-push-Ergänzung (ohne 6-min-Vollauf).

**Alternativen erwogen:** (a) Vollen Hook behalten + Transport per HTTP/1.1 fixen → verworfen: HTTP/1.1 allein behob den Bruch nicht, und 6 min/Push bleiben schmerzhaft. (b) Hook ganz entfernen → verworfen: der schnelle Silent-Fail-Gate hat echten Wert (verhindert genau die Email-Quelle). (c) `--no-verify` als Dauer-Workaround → verworfen: Bypass-Anti-Pattern, umgeht ALLE Gates.

**Re-Visit-Trigger:** Wenn Test-/Mock-Drift trotz CI mehrfach erst spät auffällt → `vitest related` (changed-file-scoped, schnell) als pre-push-Ergänzung einführen. Wenn der Push-Transport-Bruch auch bei kurzem Hook wiederkehrt → Windows-Git-curl/credential-Mechanik tiefer untersuchen.

## D95 — ARCHITECTURE: Große Rule-Files als Navigator (Regel inline, always-loaded) + Detail (on-demand)

**Datum:** 2026-06-23 · **Status:** Aktiv · **Category:** ARCHITECTURE · **Kontext:** Anil-Auftrag „bauen/managen wir Context bewusst + optimiert?". Gemessen: die path-scoped `errors-*.md` luden bei JEDEM Domain-Edit komplett — `errors-frontend.md` 1032 Z. / 41 Patterns bei jedem `.tsx`-Edit, `errors-db.md` 787 Z. / 44 P., `errors-infra.md` 538 Z. / 41 P. — ~90 % davon irrelevant für den konkreten Edit.

**Verworfene Alternative + der entscheidende Befund (Code-Reading):** Erst gewählt war „feiner path-scopen" (errors-frontend nach Datei-Typ splitten: modal/i18n/css/react mit eigenem `paths:`). Code-Reading widerlegte die Prämisse: Frontend-Patterns sind **Bug-Klassen, die beim `.tsx`-Edit zuschlagen — unabhängig vom Thema**. Der i18n-„Missing-Key"-Pattern grept `src/components/<new>.tsx`; CSS/Tailwind-Gotchas sind Klassen *in* `.tsx`; Modal lebt in `.tsx`. i18n/CSS/Modal/React **kollabieren alle auf `.tsx`** → ein Path-Split nach Dateityp würde relevante Patterns vom Komponenten-Edit **verstecken** = Safety-Regression. Path-Scoping kann nur Concerns trennen, die auf unterschiedliche Datei-Pfade mappen — bei `.tsx`-gebundenen Cross-Cutting-Concerns versagt es.

**Entscheidung:** Pro großem Rule-File ein **Navigator** + **Detail**-Paar:
1. **Navigator** (`errors-<domain>.md`) behält die originale `paths:`-Frontmatter (lädt exakt wie vorher) → je Pattern **1 Zeile mit der ACTIONABLE Regel inline** + Slice-Ref (= exakter Detail-Heading). Auto-Show der Guardrail bleibt erhalten.
2. **Detail** (`errors-<domain>-detail.md`) trägt den vollen Inhalt (Root-Cause, Code-Blöcke, Audit-greps, Reference) und bekommt eine **non-matching glob** (`paths:`+`globs: __never-autoload__/**`) → lädt NIE auto, nur on-demand via Read, wenn ein Navigator-Pattern zutrifft.
3. **Transformation zero-loss via `git mv`** (Body verbatim → kein Transkriptions-Risiko), dann Frontmatter-Edit + frischer Navigator. **Pflicht-Verify: Heading-Diff** (alle `###` überleben im Detail) + Coverage (jeder Pattern im Navigator).

**Auswirkungen:** ~92/91/88 % weniger always-loaded Token pro Domain-Edit (frontend/db/infra), 0 Pattern-Verlust. Kehrt die 2026-06-17-Setup-Entscheidung („autoload = Pre-Edit-Safety-Moment") NICHT um — die Safety-relevante Regel bleibt always-loaded, nur der verbose Beleg wandert on-demand. Mechanik = Frontmatter-Semantik: kein `paths:`/`globs:` = always-loaded; matchende Globs = scoped; non-matching = nie. Slices 352 (frontend) + 353 (db+infra) umgesetzt; Muster wiederverwendbar für jedes künftige große Rule-File.

**Alternativen erwogen:** (a) Path-Split nach Dateityp → verworfen (`.tsx`-Kollaps, s.o. = Safety-Regression). (b) Nur „verdichten" (Prosa kürzen) → ~25 %, Risiko Nuancen-Verlust, nicht der Hebel. (c) So lassen (Safety > Token) → verworfen, Overhead real + vermeidbar ohne Safety-Verlust.

**Re-Visit-Trigger:** Falls Claude Navigator-Regeln zu oft zu knapp findet und ständig ins Detail springt → Navigator-Regeln pro Pattern um 1 Zeile anreichern. Falls der native Rule-Loader `globs:` vs `paths:` anders behandelt als angenommen → Detail-Glob-Mechanik prüfen (beide Keys gesetzt = abgesichert).

**Begleit-Tweaks gleiche Session (kein eigenes D, in `workflow.md` kodifiziert):** (#2) `ship-status-gate.sh` SHIP-STATUS-Injection von 5 log.md-Einträgen auf 1 + `git log -3` getrimmt. (#3) schlanke **Ops/Tooling-Slice-Spur** in `workflow.md` (Hook/GHA/Tool/Doc ohne Money/Security → inline-Spec + Smoke-Proof + self-review).

## D96 — ARCHITECTURE/PRODUCT: Plattform-Treasury (BeScout-Topf) — fängt Plattform-Fees auf + finanziert Plattform-Rewards

**Datum:** 2026-06-23 · **Status:** Aktiv (Planung, Bau startet nächste Session) · **Category:** ARCHITECTURE + PRODUCT · **Kontext:** Aus der Monats-Liga-e2e-Untersuchung (Anker `worklog/notes/357-preflight-monthly-leaderboard.md`) wuchs eine Geld-Grundsatzfrage. Anil: „weiter mit monthly leaderboard" → Frage „wird das aus dem BeScout-Topf bezahlt?" → „wo kommt unser Anteil an den ganzen Fees her bzw. wo fließt es hin?".

**Verifizierter Befund (Live-`pg_get_functiondef` aller 6 Fee-RPCs, D87):** Der **Plattform-Anteil JEDER Fee-Quelle wird verbrannt** — dem Zahler abgezogen, auf KEIN Konto gutgeschrieben, verschwindet aus dem Umlauf (impliziter Burn, ADR-026):
| Quelle | Plattform-Anteil | RPC | Wohin heute |
|---|---|---|---|
| Trading | 3,5 % | `buy_player_sc` | 🔥 nur `trades.platform_fee` notiert |
| IPO/Erstverkauf | 10 % | `buy_from_ipo` | 🔥 nur `trades.platform_fee` notiert |
| Polls | 20 % | `cast_community_poll_vote` | 🔥 nur `community_poll_votes.platform_share` notiert |
| Research | 20 % | `unlock_research` | 🔥 nur `research_unlocks.platform_fee` notiert |
| Bounty | 5 % | `approve_bounty_submission` | 🔥 nicht mal notiert (Differenz reward−creator_net) |
| P2P-Offers | 2 % | `accept_offer` | 🔥 nur `trades.platform_fee` notiert |
Kontrast: PBT-Anteile → `pbt_treasury` ✅, Club-Anteile → `clubs.treasury_balance_cents` ✅. **Nur der Plattform-Anteil verbrennt überall** → BeScout fängt aktuell technisch 0 € seiner eigenen Fees auf. Es gibt **kein Plattform-Konto** (live nur `club_treasury_ledger` per-Club + `pbt_treasury`).

**Entscheidung:** Wir bauen die **Plattform-Treasury** (BeScout-Topf) als echtes Konto (Saldo + append-only Ledger), spiegelbildlich zur Club-Treasury (Slice 329):
1. **REIN:** die heute verbrannten Plattform-Fee-Anteile (6 Quellen oben) fließen in den Topf statt zu verschwinden.
2. **RAUS:** plattformweite Rewards werden daraus bezahlt — **Monats-Liga** + **BeScout-Events** (`type='bescout'`, heute noch minten lt. treasury.md §7).
3. **Modell-Shift bewusst:** von rein **deflationär** (Plattform-Fees verbrennen) zu **zirkulär** (Fees finanzieren Engagement-Rewards). Selbst-finanzierend, kein Netto-Minting für Plattform-Rewards.

**Bau-Sequenz (Fundament zuerst, kein Reward-Kanal vor dem Topf):**
| Slice | Was | Typ |
|---|---|---|
| **1 Fundament** | `platform_treasury_ledger` + Saldo + `book_platform_treasury()` (Mirror `book_club_treasury`) + Admin-Sichtbarkeit | Money-Infra |
| **2 REIN** | verbrannte Plattform-Fees umleiten — **eine Quelle pro Slice** (Trading zuerst), wie Club-Treasury | Money |
| **3 Liga e2e** | Monats-Liga zahlt aus Topf + Live-Standing-UI + Cron (voll-auto, Anil) + `overall`=Median-Fix | Money + UI |
| **4 BeScout-Events** | `type='bescout'`-Events aus Topf (Reconcile Minting→Topf) | Money |
| **5 Wettkampf-Darstellung** | Events als „BeScout Liga" mit Monats-/Saison-Wertung sichtbar + die 7 Ranglisten konsolidieren | UI |

**Anil-Festlegungen diese Session:** (a) Geld aus Treasury, nicht minten — aber Topf existiert nicht → erst bauen. (b) Monatsabschluss **voll-automatisch per Cron** (Treasury-Quelle senkt das Auto-Risiko ggü. Minting; trotzdem Idempotenz + Deckungs-Check). (c) Scope „Liga e2e zuerst" expandiert bewusst zum Topf-Epic, weil Liga ohne Topf nicht sauber zahlbar ist. (d) Events sollen als Wettkampf (Saison/Monat) sichtbar werden — Manager messen sich („BeScout Liga"). (e) `overall`-Dimension der Monats-Liga rankt aktuell fälschlich nur nach `manager_score` (Array-Index [2] ohne Sortierung) statt Median → in Slice 3 fixen.

**Begründung:** Geld-Konsistenz (jeder Reward-Kanal aus echtem Konto), echte Plattform-Umsatz-Akkumulation statt Totalverbrennung, und es schließt drei offene Dinge auf einmal: Liga-e2e-Lücke (nie geschlossen, 0 Snapshots live), „wo fließen unsere Fees hin", Events-als-Wettkampf-Darstellung.

**Auswirkungen:** Money-/CEO-Scope über mehrere Slices (§3 selbst bauen). `treasury.md` §7 „bescout/sponsor/special/creator minten bewusst weiter" wird für `type='bescout'` durch Slice 4 abgelöst. Verändert die Geldpolitik (deflationär→zirkulär) — bewusst von Anil abgesegnet. ADR-026 „Fees = Burn" gilt damit nur noch für den NICHT-aufgefangenen Rest (falls Caps/Teil-Burn gewollt — in Slice 1/2 zu entscheiden).

**Alternativen erwogen:** (a) Monats-Liga weiter minten + nur deckeln → verworfen (inkonsistent zu Club-Töpfen, Anils Kern-Einwand). (b) Aus Club-Töpfen zahlen → unmöglich, Liga ist plattformweit, gehört keinem Club. (c) Aus PBT-Treasury → semantisch falsch (PBT = zweckgebunden Spieler/Holder). (d) Topf später, Liga zuerst → verworfen: kein Reward-Kanal vor seinem Konto (Fundament-zuerst, bewährt 329→332).

**Re-Visit-Trigger:** Wenn der zirkuläre Shift die $SCOUT-Inflation messbar treibt → Teil-Burn/Cap-Politik in `book_platform_treasury` einziehen. Wenn Plattform-Events vor Slice 4 dringend echtes Geld brauchen → Quelle-Priorität in Sequenz tauschen. Phase-2/3 (EUR-Cash-out aus Plattform-Topf) bleibt lizenz-/CASP-gegated, nicht jetzt.

## D97 — ARCHITECTURE: Plattform-Topf Saldo-Mechanik = SUM-on-read (Variante A) statt gecachter Saldo (B)

**Datum:** 2026-06-23 · **Status:** Aktiv (Slice 357 live) · **Category:** ARCHITECTURE · **Kontext:** Slice 357 (E3-1 Topf-Fundament) ist ein Single-Pot — anders als die per-Club Club-Treasury läuft durch den EINEN Plattform-Topf jede Fee jedes Trades/Polls/IPOs der ganzen Plattform. Anil fragte explizit „ist das eine saubere Design-Pattern, technisch gut?".

**Entscheidung (CEO-approved):** **Variante A** — Saldo = `SUM(platform_treasury_ledger)` unter Singleton-Row-Lock (`platform_treasury FOR UPDATE`), exakt wie Club-Treasury 329b. Kein gecachter Saldo-Wert.

**Der ehrliche Trade-off (an Anil offengelegt):** Beim per-Club-Ledger ist `SUM(alle Zeilen)` pro Buchung billig (kleine Tenants). Beim EINEN globalen Topf wächst der Ledger mit jeder Plattform-Fee → `SUM` pro Buchung ist **O(n)** auf dem heißen Schreibpfad. Korrekt (race-frei unter Lock), aber bei Millionen Zeilen langsam.

**Variante B (erwogen, vertagt):** Laufender Saldo als Spalte in der Singleton-Lock-Row (die ohnehin existiert) → O(1)-Buchung, Ledger = reines Audit. Das kanonische „Konto + Kontoauszug"-Bankmodell.

**Warum A jetzt, B als dokumentierter Revisit:** (1) **Kohärenz** — Plattform- und Club-Treasury rechnen identisch, ein Modell statt zwei. (2) Das Skalenproblem ist **weit weg** (Millionen Zeilen nötig). (3) **Nachrüsten billig** — die Singleton-Lock-Row existiert schon, Umstieg auf B ist später eine lokale Änderung. (4) Ein **Fundament** soll simpel + offensichtlich korrekt sein, nicht zwei-Wahrheiten-clever (329 hat gecachte Saldi bewusst zu SUM-only migriert wegen Drift — Abo-Bug). „bias toward caution over speed" (CLAUDE.md §1).

**Re-Visit-Trigger:** Wenn `platform_treasury_ledger` sehr groß wird (Richtwert: Millionen Zeilen / messbare Buchungs-Latenz im Money-Path) → auf Variante B umstellen (Saldo-Spalte in `platform_treasury`, atomar unter demselben Lock geschrieben, `balance == SUM(ledger)` als prüfbare Invariante). Dokumentiert auch im Migration-Header von Slice 357 + `treasury.md` §10.

## D98 — PRODUCT: Plattform-Fee-Auffang = voller Auffang 100% (kein Teil-Burn/Cap)

**Datum:** 2026-06-24 · **Status:** Aktiv (Slice 358 live, Trading) · **Category:** PRODUCT · **Kontext:** D96 ließ für Slice 2 (Fees REIN) eine CEO-Frage offen: Soll die gesamte Plattform-Fee in den Topf wandern (100 %) oder nur ein Teil, während der Rest weiter verbrennt (Teil-Burn/Cap als Inflations-Schutz, ADR-026)? Diese Entscheidung bestimmt die Buchungs-Policy in JEDEM `book_platform_treasury('credit', …)`-Aufruf aller Fee-Quellen-Slices.

**Entscheidung (CEO-approved 2026-06-24):** **Voller Auffang 100 %** — die komplette Plattform-Fee fließt in den Topf, nichts wird mehr verbrannt.

**Alternative erwogen (Teil-Burn/Cap):** Nur X % rein, Rest verbrennt weiter = deflationärer Inflations-Schutz (ADR-026). **Verworfen weil:** (1) voller Auffang ist **maximal zirkulär** = exakt das D96-Ziel (deflationär→zirkulär); (2) beim **Pilot-Volumen** ist Inflations-Schutz noch nicht nötig; (3) der Topf ist **transparent** (Admin-Saldo sichtbar) → wächst er später zu stark, ist das eine bewusste Redistributions-/Airdrop-Entscheidung post-Pilot (ADR-026), kein Bau-Detail jetzt; (4) **einfachste Buchung** — sauberes Zero-Sum, kein Split-Parameter je Quelle (geringeres Money-Risiko).

**Auswirkung:** Gilt als Default für ALLE Fee-Quellen-REIN-Slices — Trading (358) ✅, künftig IPO/Polls/Research/Bounty/P2P. Jeder bucht `book_platform_treasury('credit', <source>, voller_platform_anteil, …)`.

**Re-Visit-Trigger:** Wenn der Topf bei realem Volumen unkontrolliert wächst oder eine Inflations-Sorge real wird → Teil-Burn/Cap als bewusste Policy-Slice nachrüsten (Cap-Logik in den `book_platform_treasury`-Aufrufen / zentral). Die Architektur (voller Auffang) lässt das jederzeit lokal zu.

## D99 — PRODUCT/COMPLIANCE: $SCOUT-Phasenmodell — Pilot/Beta = wertloses Spielgeld, Coin-Wert erst ICO; Early-Adopter-Bonus diskretionär (SSOT gegen Money-Modell-Drift)

**Datum:** 2026-06-24 (Kern) · 2026-06-24 alle OFFEN-Punkte ratifiziert (E4 „Money-Modell Glattzug", Schritt 1) · **Status:** Aktiv — **vollständig ratifiziert**, Doc-Glattzug freigegeben · **Category:** PRODUCT/COMPLIANCE · **Kontext:** Ein einziger echter E2E-Trade (Slice 365 E2E-Durchlauf, jarvis kauft 1 Card) deckte **systemischen Money-Modell-Drift** auf: 3 rivalisierende Namen für dieselbe Einheit (**BSD / $SCOUT / Credits**), ein **Faktor-100-Widerspruch** beim €-Bezug („1 $SCOUT = 1 cent = 0,01 €" in trading.md/treasury.md/D83 **vs** „1.000.000 cents = 10.000 $SCOUT" in CLAUDE.md **vs** Live-Code `centsToBsd = cents/100`), uneinheitliche **Phasen-Nummerierung** (1/3/4 in business.md vs 1/2 in treasury.md/D83), ein **CASP-Strategie-Widerspruch** (`wiki/scout-launch-strategie.md` „keine CASP-Lizenz" vs alle Phasen-Docs „Token erst nach CASP"), und `docs/CONCEPT-DPC-ECONOMY.md` ist **in sich selbst** widersprüchlich. Vollständige Inventur (~40 Stellen, 5 Kategorien): `worklog/notes/365-money-model-drift-inventory.md`. Anil-Klarstellung 2026-06-24 → **D99 ist die SSOT, an der ALLE Money-/Wording-Docs ausgerichtet werden.**

**Entscheidung (CEO/Anil 2026-06-24) — Kern, decided:**
1. **Zeit-Trennung ist das Modell.** Pilot/Beta: $SCOUT/Credits = **wertloses Spielgeld** — kostenlos verteilt, **kein €-Wert**, **nicht kaufbar, nicht auszahlbar, kein Cash-Exit**. Spielgeld zum Testen/Spielen. ICO (erst NACH der Lizenz): erst dann echter Coin-Wert + Handel.
2. **Echtes Geld rein NUR über Founder-Pässe** (Unterstützer-Status, **kein** Gewinn-/Rendite-/ROI-Versprechen). Nicht über Verkauf von $SCOUT/Credits.
3. **Der €-Bezug ist Zukunft, kein heutiger Fakt.** Jede „1 $SCOUT = X €"-Aussage gilt **erst ab ICO** und ist überall so zu markieren. **User-facing niemals ein €-Wert** neben Credits (Compliance).
4. **Early-Adopter-Bonus = diskretionär, nie versprochen.** Pilot/Beta-Aktivität wird **jetzt mitgeloggt** (der append-only Ledger existiert bereits) als Datenbasis für einen **späteren, NICHT zugesagten, ermessensbasierten** $SCOUT-Token-Bonus beim ICO (Loyalty, an echte Aktivität/Beitrag gekoppelt, KYC+Geo beim Einlösen). **Niemals** vorab kommunizieren „deine SCOUTS werden Geld/Token" — das würde aus Spielgeld ein Finanzinstrument / einen unregistrierten Vorverkauf machen.

**Begründung:** Das ist das Standard-Compliance-Playbook seriöser Plattformen — (a) Free-Play-Points ohne Geldwert = **nicht reguliert** (kein E-Geld/MiCA-EMT, kein Wertpapier); (b) Monetarisierung über einen **separaten** Supporter-/Founder-Kauf, nicht über den Verkauf der Punkte; (c) Coin mit echtem Wert **erst nach** der Lizenz (CASP/MiCA). Reihenfolge **User → Legal-Go → ICO** ist die sichere Sequenz. Den Token vor der Lizenz handelbar/auszahlbar zu machen killt Startups.

**Alternativen erwogen:** (a) **$SCOUT jetzt schon mit €-Peg / Coin-Look** (`$`-Ticker, „1 Credit = 1 €" user-facing) — **verworfen:** sieht aus wie handelbarer Coin / E-Geld → MiCA-EMT-/Security-Signal, zerstört die Phase-1-Exemption + die Creator-/FM-Positionierung. (b) **Early-Adopter-Bonus vorab versprechen** — **verworfen:** macht das Spielgeld zum Finanzinstrument (Profit-Erwartung). (c) **Alles auf „$SCOUT" umbenennen jetzt** (Anils Bauchgefühl) — **als Empfehlung gegen „Credits behalten" gestellt** (siehe OFFEN), Compliance spricht für neutrales „Credits" jetzt + „$SCOUT" = Coin später.

**RATIFIZIERT (Anil 2026-06-24, E4 Schritt 1) — diese 4 Punkte sind jetzt entschieden, Doc-Glattzug richtet sich daran aus:**
1. **Naming = „Credits" user-facing (jetzt).** CTO-Empfehlung angenommen: in Pilot/Beta zeigt die UI **„Credits"** (neutral, kein Coin-Look). **„$SCOUT" wird erst beim ICO** der echte Coin-Name (scharfe Phasen-Linie: wertloses Spielgeld jetzt → echter Token später). Legacy **„BSD" wird überall deprecatet**; Code-Vokabular (`centsToBsd`/`bsdToCents`/`formatScout`/`fmtScout`, JSDoc „cents → $SCOUT") wird auf **eine** Bezeichnung vereinheitlicht (intern darf der Funktions-/Code-Name technisch bleiben, JSDoc/Kommentare sagen „Credits", user-facing immer „Credits"). $SCOUT bleibt der Token-Name für ICO-/Strategie-/Investor-Kontext.
2. **Phasen-Nummerierung = sequenziell 1/2/3.** **Phase 1** = jetzt (Free-Play, wertlose Credits) → **Phase 2** = ICO/$SCOUT-Coin nach Token-Lizenz (Cash-Out + Handel) → **Phase 3** = Paid Fantasy/Turniere nach Gaming-Lizenz (MGA). Lückenlos. Ersetzt das alte 1/3/4 (business.md ADR-028) **und** das alte 1/2 (treasury.md/D83) — beide werden auf 1/2/3 gezogen.
3. **CASP-Strategie = schnellster sicherer Weg zum ICO.** Working-Stance: **$SCOUT-Coin/Cash-Out erst nach gültiger Lizenz** (Phase 2). Die **konkrete Route** (volle CASP-Lizenz **vs** MiCA-Title-II-Notification / NCA-Pfad) ist eine **Anwalts-Entscheidung vor dem ICO** — Ziel ist der schnellste Weg, der **noch sicher** ist. `wiki/scout-launch-strategie.md` (MiCA-Title-II-These) ist **ein Input**, kein Widerspruch mehr; Phasen-Docs formulieren neutral „Token erst nach gültiger Lizenz" (nicht „nach CASP" absolut festschreiben).
4. **Card-Pricing = eine kanonische Formel, jetzt festgelegt.** Wichtige Erkenntnis (am Live-Code verifiziert): die behaupteten „100× auseinander" sind **kein** echter Widerspruch, sondern derselbe Faktor-100-Namensdrift. **Kanonisch: 1 Card = MV/1.000 Credits** (Live-Anzeige; `ipo_price_cents = MV/10`, `centsToBsd = /100`). Die Fairness-Formel „10 % / 10.000 Cards = MV/100.000 **€**" ist beim ICO-Peg (1 Credit = 0,01 €) **dieselbe Zahl** (MV/100.000 € = MV/1.000 Credits) — also konsistent, nicht konkurrierend. Der €-Bezug bleibt **ICO-Zeit** (Punkt 3 oben), user-facing nie €. **Data-Drift-Fix als eigener Money-Slice (CEO-Scope):** `ipo_price` der Nicht-Top-Spieler per Formel `MV/10 cents` neu setzen (heute bei Launch eingefroren → Douglas Willian MV 500K steht bei 10 statt ~500 Credits; Top-Spieler wie Mbappé korrekt). **→ SUPERSEDED durch D100 (2026-06-24): `ipo_price` ist Vereins-Eintrittspreis, MV-ENTKOPPELT — die „Drift" ist KEIN Bug, KEIN Backfill/Recompute. Diese Sub-Anweisung ist verworfen.**

**Auswirkung:** D99 ist die **einzige Wahrheit** zum Money-Modell. ALLE in der Inventur (`worklog/notes/365-money-model-drift-inventory.md`, ~40 Stellen, 5 Kategorien) gelisteten Stellen werden im E4-Cleanup darauf ausgerichtet (verbunden, kein Parallel-Stand). Bis dahin: bei jeder Money-/Wording-Frage **D99 zuerst**.

**Re-Visit-Trigger:** ICO-Vorbereitung (Naming-Unifikation Credits→$SCOUT-Coin, €-Peg-Festlegung, Tokenisierungs-Ökonomie final, konkrete Lizenz-Route mit Anwalt, KYC/Geo fürs diskretionäre Bonus-Einlösen).

---

## D100 — PRODUCT/ARCHITECTURE: Scout-Card-Wertmodell — vier getrennte Zahlen; ipo_price = Vereins-Eintrittspreis (MV-entkoppelt); Floor = transparentes Orderbuch

**Datum:** 2026-06-24 · **Status:** ✅ Aktiv · **Category:** PRODUCT/ARCHITECTURE · **Supersedes (Teil):** **D99 Punkt 4** Sub-Entscheidung „Data-Drift-Fix: `ipo_price` der Nicht-Top-Spieler per `MV/10` neu setzen" — war auf **falscher Prämisse** (ipo_price sei MV-gekoppelt). · **Kontext:** Slice-368-Vorbereitung. Anil-Klärung 2026-06-24 deckte auf, dass die Handoff-Prämisse („ipo_price ist falsch → auf MV/10 nachziehen") **das Modell selbst missversteht**. Live-Discovery (functiondef `buy_player_sc`/`recalc_floor_price`, 96/3.935 Drift-Rows, Explore-UI-Inventur) → Spec `docs/plans/2026-06-24-scout-card-value-model-spec.md`.

### Entscheidung (CEO/Anil 2026-06-24)

Eine Scout Card hat **VIER getrennte Wert-Zahlen**, die im Produkt nie verschmolzen werden dürfen:
1. **Erstverkaufspreis / Eintritts-Anker (`ipo_price`):** Preis, den der **VEREIN** beim Markteintritt verlangt. Orientiert sich am MV (Default-Vorschlag `MV/10`), darf aber **abweichen** (Vereinsmeinung ≠ Transfermarkt-Wert). = **Bezugspunkt für die Preisentwicklung**. Nach IPO **eingefroren**, folgt NIE automatisch dem MV.
2. **Aktueller Marktpreis (Orderbuch / `last_price` / `floor_price`):** was die Karte **jetzt** im Handel wert ist (Angebot/Nachfrage).
3. **Marktwert-Referenz (`market_value_eur`):** echter Transfermarkt-Wert, Cron-aktualisiert. **Nur Referenz, NICHT der Kartenpreis.** User sieht ihn als Kontext (reale Spielerentwicklung).
4. **CSF (Community Success Fee):** im **Reward**-Bereich, berechnet aus MV-Wachstum. Muss auf **richtiger Basis** erklärt sein (Compliance: keine falsche Gewinn-Erwartung).

### Folge-Regeln
- **Entkopplung:** `createPlayer` nutzt `MV/10` nur als **Vorschlag**; **kein** MV→`ipo_price`-Auto-Sync. MV-Backfill auf `ipo_price` (Slice-114-Klasse) ist **verboten**. Die 96 „Drift"-Rows (`ipo_price ≠ MV/10`) sind nach diesem Modell **KEIN Bug → kein Daten-UPDATE**.
- **Eintritts-Anker bestehender Spieler:** echter historischer Vereinspreis ist durch **Slice 114** überschrieben (nicht zuverlässig rekonstruierbar). Anzeige = **`ipos.price` der Erst-IPO**; existiert keine IPO → ehrlich **„—"** (keine Fiktion).
- **Floor = transparentes Orderbuch:** Floor zeigt seine **QUELLE** („niedrigste offene Order" vs. „letzter Verkauf, keine Angebote") + **Anti-Manipulation** (kein Mini-Order-Crash). IPO + Sekundärmarkt bestimmen gemeinsam.

### Begründung
Verschmolzene Zahlen erzeugen falsche Preis-/Reward-Wahrnehmung — UX-Murks **UND** Compliance-Risiko (Securities-/Rendite-Framing, `business.md`). Entlastung: der echte Kaufpfad (`buy_player_sc`) läuft **bereits über das Orderbuch** (niedrigste offene Order), nicht über `ipo_price`/`floor` — die vier Zahlen sind heute fast nur **Anzeige-Werte**, daher ist die Korrektur primär **Darstellungs-Wahrheit** (geringes Money-Risiko: 0 der 96 mit aktiver IPO/offener Order).

### Alternativen erwogen
- **`ipo_price = MV/10` erzwingen** (alte D99-Prämisse) — verworfen: zerstört den Vereins-Anker + verfälscht die CSF-Basis.
- **Eintritts-Anker aus erstem Trade-Preis** — verworfen: Sekundärmarkt ≠ Vereins-Erstverkauf.
- **`MV/10` einfrieren als Anker** — verworfen: bleibt der „falsche" MV-gekoppelte Wert.

### Auswirkung
Slice 368 = **3 Sub-Slices**: **368a** (dieses Doc/Decision) · **368b** (Anzeige-Wahrheit UI: „Dein Einstieg" ← `ipos.price`/„—", Labels trennen+vereinheitlichen) · **368c** (Floor-Orderbuch-Transparenz + Anti-Manipulation). Spec: `docs/plans/2026-06-24-scout-card-value-model-spec.md`. Money-WIE: `docs/knowledge/domain/treasury.md` §Wertmodell; Code-Regel: `.claude/rules/trading.md`.

**Re-Visit-Trigger:** 368c Anti-Manipulations-Regel-Wahl (Mindest-Order-Größe vs. %-Schwelle); falls ICO-Phase die Preis-Semantik ändert.

---

## D101 — PRODUCT/ARCHITECTURE: Markteintritt-Modell — erster IPO = eingefrorener Eintritt (`ipo_price`), spätere IPOs = aktueller IPO-Preis (live); Daten-Reparatur statt Spalten-Kollaps

**Datum:** 2026-06-24 · **Status:** ✅ Aktiv · **Category:** PRODUCT/ARCHITECTURE · **Präzisiert:** **D100** (Eintritts-Anker-Quelle) + **kippt die alte 368e-Spec-Prämisse** „3 Eintrittspreis-Spalten → 1 kollabieren". · **Kontext:** Slice 368e. Anil-Klärung 2026-06-24 + Live-`/impact` (D87: 2 Trigger, `recalc_floor_price`-functiondef, Mismatch-Counts).

### Entscheidung (CEO/Anil 2026-06-24)
Ein Verein kann **mehrere geplante, vorangekündigte IPOs pro Spieler** starten (Tranchen, Cooldown). Daraus zwei **dauerhaft getrennte** Zahlen (dürfen NIE verschmelzen):
1. **Markteintritt** = Preis des **ERSTEN** IPO, **eingefroren** → zeigt die Entwicklung auf BeScout. Denormalisiert in `players.ipo_price` (+ Spiegel `initial_listing_price`).
2. **Aktueller IPO-Preis** = der **gerade laufende** IPO (status open/early_access), **live aus der `ipos`-Row** gelesen (keine eigene Spalte).

### Schlüssel-Fund (Live, D87) — warum „kollabieren" falsch war
Das Schema implementiert dieses Modell bereits (Trigger `trg_set_initial_listing` = set-once erster IPO; früher `sync_player_ipo_price` = folgt aktivem IPO). Die alte 368e-Spec wollte beide zu `ipo_price` verschmelzen → hätte die Trennung zerstört. Außerdem widerlegt: 368b nahm an „`ipos.price` ehrlich, `ipo_price` vergiftet" — Live-Daten zeigen das Gegenteil (`ipos.price` = flacher Seed-Müll für die 488 Abweichler; `ipo_price = MV/10` = sauberer kanonischer Default).

### Folge-Regeln (umgesetzt in Slice 368e)
- **`players.ipo_price` = eingefrorener Markteintritt** (nicht „aktueller Preis"). Trigger `trg_sync_player_ipo_price` ENTFERNT; `trg_set_initial_listing` setzt beim ersten IPO **beide** Spalten (Sentinel `initial_listing_price IS NULL`). IPO-lose Spieler: `initial_listing_price` bleibt NULL (Sentinel intakt für künftigen ersten IPO).
- **Daten-Reparatur statt Spalten-Kollaps:** geseedete Phase-1-Spieler (MV>0, keine aktive IPO) → Markteintritt = `ROUND(MV/10)`. MV=0 + aktive-IPO-Spieler unangetastet. Echte zukünftige IPOs setzen ihren echten Preis via Trigger.
- **Anzeige-Reader = EINE Quelle `prices.ipoPrice`** (RewardsTab „Dein Einstieg", TradingTab „Markteintritt", PriceChart-Linie). Portfolio-Wertentwicklung = `holdings.avg_buy_price` (echtes P&L, nicht Markteintritt).
- **Money-Sicherheit (D87):** die 3 Spalten sind reine Anzeige-Werte (`recalc_floor_price` liest aktive `ipos`-Row, `buy_from_ipo` die `ipos`-Row, Orderbuch über `orders.price`) → Reparatur bewegt kein Geld.

### Alternativen erwogen
- **3 Spalten → 1 `ipo_price` kollabieren** (alte 368e-Spec) — verworfen: zerstört Markteintritt-vs-aktueller-IPO-Trennung.
- **`ipos.price` (erste) als SSOT behalten** (368b-Linie) — verworfen: für 488 Spieler flacher Seed-Müll, nicht rekonstruierbar.
- **Markteintritt-Seed stehen lassen** (modell-rein) — verworfen: 500K-Spieler zeigt 10 (absurd).

### Auswirkung
Slice 368e: Migration `20260624200000` (Daten-Reparatur + Trigger-Umstellung + Sentinel-Restore) + 3 Reader-Switches + toter `getFirstIpoPrice`-Pfad entfernt. DROP der redundanten `initial_listing_price`-Spalte = eigener Folge-Slice (Reader=0). Code-Regel: `.claude/rules/trading.md`; Money-WIE: `docs/knowledge/domain/treasury.md`.

**Re-Visit-Trigger:** wenn echte Club-IPOs (Phase-1-Onboarding) starten — prüfen ob Markteintritt-Anzeige für IPO-lose Spieler (zeigt MV/10-Provisorik) angepasst werden muss; ICO-Phase ändert Preis-Semantik.

---

## D102 — PRODUCT: DPC-Mastery-Feature entfernt (Dormant-Mock-Feature, kein echtes Engagement-Signal)

**Datum:** 2026-06-25 · **Status:** ✅ Aktiv · **Category:** PRODUCT · **Kontext:** Slice 375 (367-F#3-Follow-up). Anil-Entscheid 2026-06-25 nach Live-DB-Investigation.

### Entscheidung (CEO/Anil 2026-06-25)
Das **DPC-Mastery-Feature** (Level-/XP-/Sterne-Anzeige pro gehaltenem Spieler in TraderTab + Player-Detail) wird **user-facing entfernt**. Die DB-Tabelle `dpc_mastery` + die **echte** XP-Engine (Trigger `award_mastery_xp` via Fantasy-Lineups + Research/Content; `fn_mastery_on_trade` freeze/unfreeze) bleiben **reversibel erhalten** — keine Tabellen-/Engine-Löschung.

### Schlüssel-Fund (Live-DB, warum „entfernen" statt „aktivieren")
Die Mastery-Progression war **mock-getrieben**: ein täglicher pg_cron-Job (`increment_mastery_hold_days()`, `0 3 * * *`, aktiv) gab **jedem nicht-frozen Eintrag +1 XP + 1 hold_day pro Tag** und rechnete das Level hoch → Level stiegen durch **bloßes Halten**, nicht durch echtes Engagement (2503/2536 Rows xp>0 bei nur 890 Trades, 97 % hold_days≥30). Die angezeigten Sterne/Level waren also ein **Vanity-Signal ohne Aussage**. `hold_days` hatte zudem keinen App-Reader (367 entkoppelte den Achievement-Award auf `holdings.created_at`).

### Umsetzung (Slice 375)
- Code: 6 UI-Anzeige-Stellen + Prop-Kette (7 Files) entfernt; orphan `queries/mastery.ts` + `services/mastery.ts` gelöscht; Barrel + `qk.mastery` + `USER_SCOPED_DOMAINS` bereinigt; 5 Test-Files. −112 LoC.
- DB-Migration `20260625120000`: Mock-Cron `cron.unschedule` + `DROP FUNCTION increment_mastery_hold_days()` + `ALTER TABLE dpc_mastery DROP COLUMN hold_days` (tot). Echte Engine + Tabelle bleiben.

### Alternativen erwogen
- **Aktivieren (Pro-Engine bauen)** — verworfen: Mastery ist kein Beta-Kernsignal; echtes Progression-Design wäre eigenes Produkt-Thema. Engine bleibt für spätere Reaktivierung erhalten.
- **Nur Mock-Seed bereinigen, Anzeige behalten** — verworfen: ließe ein schwaches Vanity-Feature mit dann meist leeren Leveln stehen.
- **Nur tote `hold_days`-Spalte droppen (enges F#3)** — verworfen: der sichtbare Mock war das Level (Sterne), nicht hold_days → halbe Lösung.

### Auswirkung
Sauberer Beta-Zustand ohne Mock-getriebene Vanity-Anzeige. `card-tier-*`-CSS (mit `card-holographic` verwoben) bewusst belassen (inert). Reaktivierung = eigener Produkt-Slice (Engine ist da). Knowledge: `errors-frontend.md` Removal-5.-Achse (ungetypte Test-Fixtures + DB-Mock-Cron-Writer vor Column-DROP prüfen).

**Re-Visit-Trigger:** falls ein echtes Spieler-Bindungs-/Loyalitäts-Feature geplant wird — die erhaltene Engine (Fantasy/Content-XP) als Fundament prüfen.

---

## D103 — PRODUCT: Cold-Start-Liquidität der Plattform-Topf-RAUS-Kanäle = Genesis-Seed + manueller Trigger (kein Hard-Gate-Stillstand, kein Fallback-Mint)

**Datum:** 2026-06-25 · **Status:** ✅ Aktiv · **Category:** PRODUCT (Money/Treasury) · **Kontext:** Slice 376 (E3 RAUS-Kanal #1, Monats-Liga). Anil-Entscheid 2026-06-25 (AskUserQuestion). Setzt das Muster für ALLE künftigen Topf-RAUS-Kanäle.

### Problem
Der zirkuläre Modell-Shift (D96: Fees REIN → Rewards RAUS aus `platform_treasury` statt zu minten) kollidiert in der Beta mit der Realität: Fees tröpfeln in Cent-Beträgen, der Topf stand bei **3.297 cents** (~33 Credits), während die Monats-Liga **3.400.000 cents** (34.000 Credits)/Monat braucht. „Aus dem Topf zahlen" + „auto-Cron" + „harter Deckungs-Check" = die Liga zahlt **nie** etwas, solange die Fees den Topf nicht real füllen.

### Entscheidung (CEO/Anil)
1. **Genesis-Seed** statt Hard-Gate-Stillstand: einmaliges, source-getaggtes Anschub-Kapital in den Topf (`book_platform_treasury('credit','genesis',…)`, Slice 376 = 500.000 Credits, deckt ~14,7 Monate Liga). Das ist ein **bewusstes, einmaliges, sichtbares** Minting in den Topf — NICHT der laufende Fehlbetrags-Mint pro Auszahlung (verworfen, würde das zirkuläre Modell dauerhaft aufweichen).
2. **Deckungs-Check bleibt hart** (kein Negativ-Topf, kein Teil-Payout) — greift nach dem Seed aber praktisch nie in der Beta. Korrektheit für den Tag, an dem Fees tragen müssen.
3. **Manueller Trigger statt Cron** für den ersten RAUS-Kanal: der Admin klickt den Monatsabschluss bewusst (kontrollierter Payout in der Beta). Auto-Cron = eigener Folge-Slice, wenn sich das Topf-Modell gesetzt hat.

### Alternativen erwogen
- **Hybrid (Topf zuerst, Fehlbetrag minten):** verworfen — Liga zahlt zwar immer, aber das Modell ist nie wirklich zirkulär; laufendes verstecktes Minting.
- **Hart-Gate ohne Seed (Liga ruht bis Topf voll):** verworfen — sauberstes Modell, aber monatelang 0 Rewards = totes Engagement in der Beta.
- **Rewards an Topf-Größe koppeln (Auszahlung = was der Topf trägt):** verworfen — selbstregulierend, aber Reward-Höhe schwankt extrem und ist in der Beta winzig (Cent-Beträge).

### Auswirkung
Muster für **alle weiteren RAUS-Kanäle** (Slice 4 BeScout-Events, künftige): bei Cold-Start einmaliger Genesis-Seed in den Topf + Deckungs-Check hart + Trigger erst manuell. Credits sind in Phase 1 wertloses Spielgeld (D99) → der Seed ist kein finanzielles Risiko, nur Modell-Integrität. Quelle WIE: `docs/knowledge/domain/treasury.md` + Plan `worklog/notes/358-platform-treasury-epic.md`.

**Re-Visit-Trigger:** wenn die echten Fees den monatlichen RAUS-Bedarf real decken (Topf wächst nachhaltig) → Genesis-Anteil wird irrelevant, Auto-Cron kann scharf geschaltet werden. Spätestens vor Coin-Phase (D99 Phase 2) neu bewerten, da Credits dann Wert tragen.

---

## D104 — PRODUCT: Event-Modell — „Creator" als Oberbegriff, Liga-gebundene Aufstellung, Wertung pro Liga + global

**Datum:** 2026-06-25 · **Status:** 🟡 Zielbild (Roadmap, noch nicht gebaut) · **Category:** PRODUCT (Fantasy/Events/Money) · **Kontext:** Anil-Vision-Klärung 2026-06-25 (mehrteiliges Gespräch). Setzt das Zielbild für den gesamten Event-/BeScout-Liga-Bereich. WIE/Reihenfolge: `worklog/notes/event-creator-liga-epic.md`.

### Entscheidung (Anil-Vision, das Zielbild)

1. **„Creator" ist der Oberbegriff** für jeden, der ein Event erstellt — vier Sorten: **BeScout · Verein · User · Sponsor**. Jeder Creator **bezahlt** beim Erstellen den Preis-Pool; das Event erzeugt **Einnahmen** (Eintritt der Teilnehmer), die in die **Kasse des Creators** fließen; **BeScout kassiert immer seinen Anteil** (Fee-Split pro Event-Typ).
2. **Eintrittswährung:** BeScout-Events laufen über **Tickets** (Tickets einlösen → Credits/Equipment/Tickets gewinnen). BeScout **Special-Events** können auch **Credits** ausschütten (höherer Ticket-Preis). Vereins-/User-/Sponsor-Events: i. d. R. **Credits**. (Currency-Feld unterstützt beides.)
3. **BeScout Liga** = kostenlose Plattform-Liga-Events, **volle** Punkte, Monats-/Saison-Wertung. Jeder soll teilnehmen, um aufzufallen. **Creator-Events zählen nur minimal + gedeckelt** in die Liga (heute: 25 % + Saison-Cap — bleibt so).
4. **Liga-Bindung der Aufstellung (Kern der Länder/Ligen-Frage):**
   - **BeScout-Liga-Events sind an EINE Liga gebunden** → Lineup nur aus Spielern dieser Liga. Daraus folgt: die **BeScout-Liga läuft pro Liga getrennt**.
   - **Alle anderen Events (Verein/User/Sponsor/BeScout-Special) wählen frei:** „nur Liga X" ODER „offen / alle Ligen" (Sponsor-Beispiel: keine Liga-Grenze → Spieler aus beliebigen Ligen).
   - **Land** ist die Gruppierungs-Ebene über der Liga (nur Filter); fürs Aufstellen zählt die **Liga**.
5. **Wertung pro Liga UND global** (Anil-Entscheid): es gibt beide Ranglisten — je Liga getrennt **und** eine globale. (Heute nur global.)
6. **Aufstellung weiterhin nur mit eigenen Scout Cards** (Besitz-Pflicht bleibt, D-bestätigt).
7. **Teilnahme-Bedingungen** (Creator wählbar): „mind. X Spieler vom Verein", **Follower-Pflicht**, **nur Abonnenten** (Abo-Tier), **Fan-Rang-Gate**. User-Events zusätzlich: **Scope „nur für Freunde" vs. „für alle"**.

### Stand: was existiert schon vs. fehlt (Code-Audit 2026-06-25, Live-RPCs)

**Existiert + erzwungen:** Eintritt in Tickets ODER Credits (`events.currency`/`ticket_cost`), Fee-Split pro Event-Typ inkl. BeScout-Anteil + Beneficiary + Prize-Pool (`rpc_lock_event_entry` + `event_fee_config`), **Abo-Gate** (`min_subscription_tier`), **Gamification-Stufen-Gate** (`min_tier`), Club-Scope (`scope='club'`), **nur eigene SC** + **max-pro-Verein** + Salary-Cap + Wildcards (`rpc_save_lineup`), Liga-Wertung voll vs. 25 % (`is_liga_event`), Monats-/Saison-Abschluss.

**Fehlt (= die Roadmap):** Creator-Typ **„User"** (User-Events sind heute Toast-only), **Liga-Bindung der Aufstellung** (wird NICHT geprüft), **„mind. X Spieler vom Verein"** (nur `max_per_club` = Obergrenze existiert), **Follower-Pflicht**, **Fan-Rang-Gate auf Events**, **Scope „friends"**, **Wertung pro Liga** (heute global), **Creator-Pot-Einzahlung** für User/Creator-Events (Paid-Events Phase-4-gated).

### Alternativen erwogen
- **„Creator" und „Verein" als getrennte Konzepte:** verworfen — Anil: ein Verein IST ein Creator (Oberbegriff vereinheitlicht die Finanzierungs-/Fee-Logik).
- **BeScout-Liga global statt pro Liga:** verworfen — Süper-Lig-Fans sollen sich mit Süper-Lig-Fans messen; daher pro Liga. Global bleibt zusätzlich (nicht entweder/oder).
- **Liga-Bindung für ALLE Events erzwingen:** verworfen — nur Liga-Events sind hart gebunden; andere Creator entscheiden selbst (Sponsor-Beispiel = offen).

### Auswirkung
Mehrteiliger Bau (mehrere Slices, teils Money/CEO-Scope) — Reihenfolge + Detail in `worklog/notes/event-creator-liga-epic.md` (lebendes Dokument, Anil ergänzt dort). Compliance: Eintritt/Preise in **Tickets/Credits** (Phase-1-Spielgeld, D99) ist ok; **Paid-Fantasy mit echtem Geld bleibt Phase 3** (MGA, NICHT bauen). Quelle WIE Events: `.claude/rules/fantasy.md` + Roadmap-Anker.

**Re-Visit-Trigger:** Anil ergänzt/ändert das Zielbild in der Roadmap-Datei → bei Scope-Änderung diese Decision aktualisieren oder Nachfolger-`D<n>` mit `Supersedes: D104`.

---

## D105 — PRODUCT: Begriffs-Trennung — „Liga" = nur Fußball-Liga; Nutzer-Wettbewerb = „BeScout-Saison"

**Datum:** 2026-06-25 · **Status:** Aktiv (Naming-Kanon, gilt ab E5-Bau) · **Category:** PRODUCT (Naming/Information-Architektur) · **Kontext:** Beim Durchsprechen von D104 fiel auf, dass „Liga" im Code doppeldeutig ist. Anil-Entscheid zur Entwirrung. Präzisiert D104. WIE: `worklog/notes/event-creator-liga-epic.md` Section 0.

### Problem
Das Wort „Liga" meint heute zwei verschiedene Dinge:
- **Fußball-Liga** (Bundesliga, Süper Lig, Premier League) — gruppiert die Spieler-**Karten** (`clubs.league_id`).
- **Bestehende Nutzer-Punkte-„Liga"** (`is_liga_event`, `close_monthly_liga`, `monthly_liga_*`) — Bestenliste **der Nutzer** (bester Scout). Hat mit Fußball-Ligen nichts zu tun, heißt nur zufällig auch „Liga".

Zusätzlich verknüllt der eine Schalter `is_liga_event` heute ZWEI Achsen: „Fußball-Liga-Bezug" und „zählt voll/gedeckelt für die Wertung".

### Entscheidung (Anil)
1. **„Liga" = ausschließlich Fußball-Liga** — user-facing + Code-Begriff künftig nur noch dafür.
2. **Nutzer-Wettbewerb heißt „BeScout-Saison".** Ranglisten: „BeScout-Saison — Bundesliga" (pro Liga) + „BeScout-Saison — Gesamt" (global), je Monat/Saison. = das heutige `is_liga_event`/`monthly_liga_*`, bei E-2 begrifflich umgezogen.
3. **Jedes Event = drei getrennte Eigenschaften** statt einem „Liga-Event"-Schalter: (a) aus welcher Fußball-Liga aufstellen (`league_id`+„offen", E-1) · (b) zählt es für die BeScout-Saison, wie stark (alt `is_liga_event`, voll vs. gedeckelt, E-2) · (c) wer ist Creator/zahlt (`type`, existiert).

### Alternativen erwogen
- **„BeScout-Meisterschaft"** als Wettbewerbs-Name: verworfen — Anil wählte „BeScout-Saison" (betont Zeitraum-Charakter).
- **„Scout-Wertung"** (neutral/technisch): verworfen — weniger Wettkampf-Stimmung.
- **„Liga" als Marke für den Nutzer-Wettbewerb behalten + Fußball-Ligen anders nennen:** verworfen — Fußball-Ligen heißen universell „Liga", unnatürlich umzubenennen.

### Auswirkung
Bei E-2 wird `is_liga_event`/`monthly_liga_*` in zwei saubere Achsen entwirrt (Fußball-Liga-Bindung = E-1 `league_id` vs. Wertungs-Stärke = altes Flag) und das Nutzer-Wertungs-Konzept user-facing auf „BeScout-Saison" umbenannt. Verhindert, dass das System „die falschen Dinge zusammenzählt". Compliance: „Saison"/„Liga" sind unverfänglich (keine Securities-/Glücksspiel-Nähe).

**Re-Visit-Trigger:** Falls „BeScout-Saison" sich beim Bau als unklar erweist (z. B. Kollision mit dem Saison-Zeitraum-Begriff selbst) → Namen erneut mit Anil prüfen.

---

## D106 — PRODUCT: BeScout-Saison Wertung pro Liga — echte Rewards mit anpassbarem Preispool, gestuft

**Datum:** 2026-06-25 · **Status:** 🟡 Zielbild (E-2, noch nicht gebaut) · **Category:** PRODUCT (Money/Events) · **Kontext:** E-2-Vorbereitung. Live-Audit `close_monthly_liga` (D87) deckte auf: scout_scores ist NICHT pro Liga partitioniert. Anil-Entscheid (AskUserQuestion).

### Befund (Live, NICHT neu erheben)
- `scout_scores` = pro Nutzer 3 GLOBALE Werte (trader/manager/analyst), keine Liga-Achse. `close_monthly_liga(p_month)` rankt alle Nutzer global über 4 Dimensionen (trader/manager/analyst/overall=Median), zahlt Top-3 je Dim aus dem Plattform-Topf (hardcodiert 500k/250k/100k cents), zero-sum debit, Deckungs-Check + RAISE bei Unterdeckung. `monthly_liga_snapshots`/`_winners` haben KEINE league_id.
- Für „pro Liga" fehlt eine **Punktzahl pro (Nutzer, Liga)**. E-1 (`events.league_id`) ist das Fundament: Manager-Leistung pro Liga = aggregierbar aus liga-gebundenen Event-Lineups. Trader/Analyst bleiben global (Handel/Research nicht liga-spezifisch).

### Entscheidung (Anil)
1. **Pro-Liga-Ranglisten zahlen echte Rewards** (Option 2, nicht display-only) — ABER **Reward-Beträge/Preispool MÜSSEN admin-anpassbar sein** (nicht hardcodiert 500k/250k/100k). Grund: Topf-Belastung kontrollierbar halten (7 Ligen × 4 Dim × 3 Ränge ≈ bis 84 Auszahlungen/Monat statt 12).
2. **Gestufte Auslieferung** (in Schritte teilen):
   - **E-2a** = Begriffs-Umzug `is_liga_event`/`monthly_liga_*` → user-facing „BeScout-Saison" (D105) + **Pro-Liga-Ranglisten-Anzeige** (Manager-Dim aus liga-gebundenen Events abgeleitet). **KEINE** Payout-Änderung. Niedriges Risiko.
   - **E-2b** = Pro-Liga-**Payout** mit konfigurierbarer Reward-Struktur (Admin setzt Beträge) + Deckungs-Check + Idempotenz. Money/CEO, Reviewer-Pflicht.

### Alternativen erwogen
- **Nur Anzeige/Prestige (Option 1):** verworfen — Anil will echten Anreiz.
- **Fixer Gesamt-Pot aufgeteilt (Option 3):** verworfen zugunsten echter per-Liga-Rewards, aber die „Anpassbarkeit" adressiert die Topf-Sorge.
- **Alles in 1 L-Slice:** verworfen — Money-Risiko + Review-Größe; gestuft ist sicherer.

### Auswirkung
E-2a zuerst (Anzeige + Rename, kein Money). E-2b bringt konfigurierbare Reward-Struktur (neue Tabelle/Spalten für Reward-Beträge statt hardcodiert in `close_monthly_liga`) + per-Liga-Winner-Ermittlung. Compliance: Phase-1-Credits = Spielgeld (D99) → Topf-Risiko begrenzt, aber Anpassbarkeit ist die Steuerung. Anker: `worklog/notes/event-creator-liga-epic.md` E-2.

**Umsetzung E-2b (Slice 383, 2026-06-25 — Anil-Konkretisierung via AskUserQuestion):** (1) **Zusätzlich** statt ersetzen — globaler Manager-Payout bleibt, Pro-Liga-Manager kommt on top (Doppel-Payout bei global+Liga-Top-3 = gewollt). (2) **Pro Liga EINZELN** konfigurierbar (Tabelle `liga_reward_config` league_id×rank, nicht ein globaler Satz). (3) Default **100k/50k/25k cents** (=1000/500/250 CR). Pro-Liga-Ranking = exakt `rpc_get_season_ranking`-Aggregat (Display==Payout), nur manager-Dim. Zero-sum aus Topf, EIN Debit deckt global+pro-Liga. Reviewer PASS. Diese Konkretisierung präzisiert D106 (kein neuer D<n> — gleiche Entscheidung, verfeinert).

**Re-Visit-Trigger:** Reale Topf-Belastung nach E-2b beobachten; vor Coin-Phase (D99 Phase 2) Reward-Beträge neu bewerten (dann tragen Credits Wert).

---

## D107 — ARCHITECTURE: Event-Bedingungen — zwei Töpfe (Eintritts-Gate vs. Aufstellungs-Regel) + Regel-Liste (JSONB) statt Spalte-pro-Regel

**Datum:** 2026-06-25 · **Status:** 🟢 Aktiv (Zielbild E-3+, Bau startet) · **Category:** ARCHITECTURE (Events) · **Kontext:** E-3-Vorbereitung. Anil will den Event-Builder zu „einfach, aber mächtig" ausbauen — beliebige Teilnahme-/Aufstellungs-Bedingungen für „die wildesten Kombinationen" (Alter, Nationalität, min-vom-Verein, Marktwert, Position …), Builder user-/creator-zentriert statt ein globales Formular. Code-Ist-Stand live verifiziert (`useEventForm.ts` 21 Felder, `CreateEventModal.tsx` = Mock/Toast, `rpc_save_lineup`/`rpc_lock_event_entry`).

### Befund (Live 2026-06-25, NICHT neu erheben)
- **Zwei Builder heute:** Admin-Builder (`useEventForm.ts` + `EventFormModal.tsx`, 21 Felder, schreibt echt) — nur Plattform/Club-Admin. User-Builder (`CreateEventModal.tsx`) = nur Toast, schreibt NICHT in DB (Phase-4-gated, `creatorId:'user1'` hardcoded).
- **Bestehende Bedingungen:** Liga-Bindung (`league_id`, E-1) · max-pro-Verein (`max_per_club`, Slice 195c — Anils Wettbewerbsverzerrungs-Sorge teils gelöst) · Salary-Cap · min-Abo (`min_subscription_tier`) · min-Gamification-Stufe (`min_tier`/`event_tier`) · Wildcards · Eintritt Tickets/Credits · Teilnehmer-Limit (`max_entries`) · Preis-Pool · Typ/Format.

### Entscheidung (Anil 2026-06-25)
1. **Zwei getrennte Bedingungs-Töpfe** (nie vermischen):
   - **Eintritts-Türsteher** = *wer darf teilnehmen?* → Follower-Pflicht, Fan-Rang (`min_fan_rank_tier`), Abo, Stufe. Sitz: `rpc_lock_event_entry`. Bleiben **feste Spalten** (Geld-/Eintritts-Pfad einfach + auditierbar).
   - **Aufstellungs-Regel** = *welche Karten dürfen ins Lineup?* → Liga, Alter, Nationalität, min/max-pro-Verein, Marktwert-Deckel, Position. Sitz: `rpc_save_lineup`.
2. **Weg B — Regel-Liste statt Spalte-pro-Regel** für die Aufstellungs-Regeln: EIN JSONB-Feld (`lineup_rules`) auf `events` hält eine Liste typisierter Bedingungen (z.B. `[{type:'age_max',value:21},{type:'nation_in',value:['TR','DE']},{type:'min_per_own_club',value:5}]`). EIN generischer Validator-Block im RPC liest sie ab. Neue Regel-Art = **kein** Schema-Change, nur neuer Validator-Fall + Builder-Zeile.
3. **Bedingungs-Katalog (Start):** Anils Wünsche — Altersgrenze/-fenster · Nationalität · min-X-vom-Verein (Gegenstück zu max_per_club) · Equipment-Reward ja/nein. Claude-Ergänzungen (übernommen) — Marktwert-Deckel pro Karte (Underdog-Events) · Positions-Quote · min/max pro Nationalität.
4. **User-/Creator-zentrierter Builder:** gleicher Bau-Kern, aber Optionen nach Creator gefiltert (User: Tickets/Gratis + Scope Freunde · Verein: + Follower-/Fan-Rang-Gate + Vereinstopf · Sponsor: Liga-Bindung optional). Eigener Schritt (E-4/E-6), erst durch Regel-Liste sauber möglich.

### Alternativen erwogen
- **Weg A — Spalte pro Regel (Status quo fortführen):** verworfen — skaliert nicht zu „wildeste Kombinationen": nach ~8 Wünschen 30 Spalten + endloses Formular + Migration pro Regel.
- **JSONB auch für Eintritts-/Geld-Gates:** verworfen — Money-Pfad muss simpel + reviewbar bleiben; JSONB nur im kreativen (nicht-Geld-) Aufstellungs-Teil.
- **Voll generische Regel-Engine sofort (alle Regeln):** verworfen — „nicht übertreiben"; gestuft pro Slice einführen.

### Auswirkung
E-3 wird auf die Regel-Liste umgestellt (statt 3 Einzel-Spalten). JSONB im Lineup-Pfad → strenge Server-Validierung (whitelisted Regel-Typen, Wert-Bounds, fail-closed) + Reviewer-Pflicht. Builder zeigt „Bedingung hinzufügen ▾" + Echtzeit-„~X Spieler / ~Y Nutzer erfüllen das" (gegen tote Events durch Über-Filterung). Compliance: Phase-1-Credits/Tickets (D99). Anker: `worklog/notes/event-creator-liga-epic.md` §3b + §5 (E-3).

**Re-Visit-Trigger:** Wenn `lineup_rules`-Validator >~8 Regel-Typen trägt oder Cross-Regel-Abhängigkeiten entstehen (Regel A schließt B aus) → eigenes Regel-Schema/Versionierung erwägen.

---

## D108 — PRODUCT/ARCHITECTURE: User-Events Geld-Modell — dynamischer Pot aus Eintritten, Ersteller verdient nichts, admin-steuerbare Erstell-Gebühr

**Datum:** 2026-06-26 · **Status:** 🟢 Aktiv (E-4-Alignment, Bau startet mit Slice 396/E-4a) · **Category:** PRODUCT + ARCHITECTURE (Events/Money) · **Kontext:** E-4 (User-Events) Alignment mit Anil. Ein normaler Nutzer soll echte Fantasy-Events erstellen können (heute `CreateEventModal` = Mock-Toast). Money/CEO-Scope (§3). Präzisiert D104 (Creator-Oberbegriff) für den Creator-Typ „User".

### Befund (Live-RPCs 2026-06-26, NICHT neu erheben)
- Zwei getrennte Geld-Ströme bei Events: **① Preis-Pot** (treasury-escrow via `trg_events_escrow_prize` → `score_event` mintet Gewinner → `trg_events_prize_settle` Rest-Refund an Quelle) ist **voll + zero-sum**. **② Eintritt** ist **nur halb gebaut:** `rpc_lock_event_entry` **sperrt** den Eintritt (+ rechnet `event_entries.fee_split` aus), `rpc_unlock_event_entry`/`rpc_cancel_event_entries` lösen die Sperre wieder auf — aber **`score_event` fasst die gesperrten Eintritte NIE an.** Die Verbindung **„Eintritt → Pot" existiert nicht** (dormant; alle 208 Live-Events liefen Tickets/gratis, 0 mit Pot). → Diese fehlende Hälfte ist der E-4-Kern.
- `events_type_check` = bescout/club/sponsor/special (KEIN `user`). `event_fee_config` hat eine orphan `creator`-Zeile (5/5 = „verdient mit"), die D108 widerspricht → nicht nutzen. `reward_structure` (JSONB, Default 50/30/20) + `RewardStructureEditor` (Templates top3/top5/winner/top10 + 100%-Check) existieren bereits.

### Entscheidung (Anil 2026-06-26)
1. **Geld-Modell B — dynamischer Pot:** Jeder Teilnehmer zahlt Eintritt (Credits) → **5 % BeScout → Plattform-Topf**, Rest **wächst den Pot**. Optionaler **Start-Pot** aus Ersteller-Wallet (Anreiz). **Ersteller verdient nichts** (`event_fee_config('user')` = platform 500 / beneficiary 0). Jeder Eintritt finanziert seinen eigenen Pot-Anteil → **zero-sum, kein Minting** über das hinaus was reinkam.
2. **Start auch ohne volle Teilnehmerzahl** — Pot = was tatsächlich reinkam (kein fester Vorab-Pool). Plus **Ersteller-wählbare Mindest-Teilnehmerzahl** (`events.min_entries`, neu): nicht erreicht → **Absage + voller Refund** (Eintritte + Start-Pot).
3. **Auszahlung Ersteller-wählbar** (Top-3 / Winner-all / custom) → bestehende `reward_structure` + Reuse `RewardStructureEditor`.
4. **Anti-Müll = Erstell-Gebühr, vom BeScout-Admin steuerbar** (Config + Setter-RPC + Default), Gebühr → Topf. **Kein** Event-Limit (Anil-Entscheid).
5. **Typ `user`** (sauber, nicht das gedriftete `creator`); Scope **öffentlich** zuerst (Freunde/privat = späterer Slice); jeder eingeloggte User darf erstellen (Bounds wie User-Bounty, harte Server-Validierung).
6. **Decomposition:** E-4a (Geld-Kern, Slice 396, L/Money) → E-4b (Builder-UI) → (Freunde-Scope später). „Eintritt→Pot"-Settle (die fehlende Hälfte) wird in E-4a gebaut.

### Alternativen erwogen
- **Modell A (Geschenk-Pot, Eintritt frei):** verworfen als Default — Anil will den dynamischen Eintritts-Pot (öffnet mehr Event-Formen, Start ohne volle Teilnehmerzahl). A bleibt als Sonderfall möglich (Entry=0 + Seed>0).
- **Modell C (Ersteller verdient an Eintritten mit, wie Verein 5/5):** **verworfen — Glücksspiel-/Operator-Nähe** (auch mit Phase-1-Credits); Ersteller darf nie mehr rausholen als er reinlegt. Direkter Grund für `beneficiary 0`.
- **Anti-Müll via Bedingung (min-Stufe / max-3-offene-Events) statt Gebühr:** Anil wählte die **Gebühr** (admin-steuerbar) — einfachster fairer Hebel, jeder darf trotzdem erstellen, skaliert mit Missbrauch.
- **Pot live in `events.prize_pool` mitwachsen (Charge-on-join):** verworfen zugunsten **Lock-on-join + Charge-at-settle** — vervollständigt den bestehenden (halb-gebauten) Pfad statt das Lock-Modell umzubauen; sauberer Refund-Pfad bei Absage.

### Auswirkung
Slice 396 (E-4a) baut: Typ `user` + `min_entries` + `event_fee_config('user')` + admin-steuerbare Erstell-Gebühr (Config+Setter) + `create_user_event`-RPC (Gebühr→Topf, Seed-Escrow aus Wallet) + **dynamischer Entry-Pot-Settle** (Eintritt charge → 5 % Topf, Rest → Pot → Gewinner) + min_entries-Absage/Refund + Trigger-`user`-Zweige + club-loser Wildcard-Fix (380-Vormerkung). Money/CEO: Reviewer-Pflicht, force-rollback-Smokes, Live-`pg_get_functiondef` VOR Edit (D87), neue Topf-Sources `event_create_fee`/`event_entry_fee` (source-CHECK widen). Compliance: Credits = Phase-1-Spielgeld (D99), kein echtes Geld. Anker: `worklog/specs/396-user-events-money-core.md` + `worklog/notes/event-creator-liga-epic.md` E-4.

**Re-Visit-Trigger:** Wenn echtes Geld / Cash-Out (Phase 2/3) kommt → Operator-/Glücksspiel-Lizenzfrage für User-Events neu prüfen (Modell C bleibt verboten ohne Lizenz). Wenn Erstell-Gebühr Spam nicht bremst → Event-Limit nachrüsten (war bewusst weggelassen).
