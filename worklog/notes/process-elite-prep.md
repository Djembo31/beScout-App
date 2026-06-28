# Prozess-Elite-Optimierung — Vorbereitungs-Briefing (für frische Session)

> **✅ ERLEDIGT in Slice 430 (2026-06-28):** P1 (Stand-Konsolidierung) + P2 (Mega-Zeilen) + P5 (Anti-Drift-Guard) umgesetzt. Anil-Entscheid = Kern+Guard. **P3 (log/decisions archivieren) + P4 (Lean-Lane ausweiten) bewusst deferred.** Proof `worklog/proofs/430-tracker-drift.txt`, Review `worklog/reviews/430-review.md`. Stand-SSOT-Regel jetzt in `workflow.md` (LOG-Stage) + Guard `audit:tracker-drift` (.husky non-blocking). Der Befund unten ist die ausgeführte Vorlage.

> **Auftrag (Anil 2026-06-28):** BEVOR weiter an BeScout-Features gebaut wird, erst den **Prozess/Workflow selbst** auf Elite-Niveau bringen. Die Overhead-/Drift-Punkte vermeiden + lösen, optimalen Zustand herstellen. **Feature-Arbeit (428b DROP, Welle 3, Ranking) PAUSIERT bis das durch ist.**
>
> Diese Datei = der Einstieg der nächsten Session. Read-only-Analyse + Plan ist HIER fertig vorbereitet → frische Session startet direkt mit Entscheidungen + Umsetzung, keine Re-Analyse nötig.

---

## 1. Befund (gemessen 2026-06-28, nicht behauptet)

**Mega-Zeilen (eine einzige Zeile, Zeichen):**
| Datei | längste Zeile | Zeilen total | Datei-Größe |
|-------|---------------|--------------|-------------|
| `TODO.md` | **7.532** | 76 | 34 KB |
| `docs/knowledge/INDEX.md` | **5.602** | 63 | — |
| `MASTERPLAN.md` | **4.706** | 53 | 22 KB |
| `memory/session-handoff.md` | **4.402** | 399 | 90 KB |
| `memory/decisions.md` | 1.170 | 4.316 | **341 KB** |
| `worklog/log.md` | — | — | **946 KB** |

**Duplikation des laufenden „Stand"-Blocks:** **4 Dateien** tragen denselben „Welle 1/2 KOMPLETT…"-Prosa-Stand fast wortgleich — `MASTERPLAN.md` (sogar 2×: Z.16 + Z.50), `TODO.md` (Z.8), `session-handoff.md`, Auto-`MEMORY.md` (~/.claude). Beim GW-Fork diese Session stand der **stale** „NÄCHSTER: Admin-Gameweek-Engine"-Pointer in **3** davon → musste 3× geglättet werden.

## 2. Root-Cause (dieselbe Krankheit, die wir im Code bekämpfen)

1. **Kein SSOT für „aktueller Stand"** → „von allem fünf" in unseren eigenen Prozess-Docs (genau D111-Wurzel #1, nur auf Meta-Ebene).
2. **Append-only-Wachstum ohne Restrukturierung** → Mega-Zeilen.
3. **Purpose-Overlap** → jeder Tracker versucht die volle laufende Narrative zu halten, statt EINE Aufgabe.

**3 Kosten:** (a) Token/Session (4-5 Mega-Zeilen lesen+editieren je Session) · (b) Drift (4-5 Kopien synchron halten) · (c) Edit-Friktion (Vollzeile-Read für Schwanz-Edit).

## 3. Ziel-Zustand (Elite — Separation of Concerns, EINE Aufgabe pro Datei)

| Datei | EINE Aufgabe | Format-Ziel |
|-------|-------------|-------------|
| `worklog/active.md` | Was läuft JETZT (1 Slice) | kurz, strukturiert — **schon ok** ✓ |
| `memory/session-handoff.md` (Top-Anker) | **DIE kanonische „Wo stehen wir / was als Nächstes"** — einzige Stand-Quelle | strukturiert, kurz, Bullets |
| `worklog/log.md` | History (chronologisch) | append, konzise Einträge — **ok, aber archivieren** |
| `memory/decisions.md` | WARUM (ADRs) | strukturiert ✓ — **archivieren bei 341 KB** |
| `MASTERPLAN.md` | **stabiler Plan** (7 Wellen + Vision) + **Status-TABELLE (1 Zeile/Welle)** | Tabelle statt Prosa-Stand |
| `TODO.md` | **Actionable** P0/P1/P2 | kurze Bullets, keine Narrative-History |
| Auto-`MEMORY.md` | Durable Facts (Anil, Money-Modell) + **Pointer auf handoff** | kein laufender Slice-Stand |

**Die Regel die Re-Duplikation verhindert:** „Laufender Fortschritt lebt an EINEM Ort (handoff). Andere Tracker referenzieren ihn oder halten 1-Zeilen-Status — NIE die volle Prosa." + optional ein Pre-Commit-Check, der Mega-Zeilen / Duplikat-Stand-Prosa flaggt (damit es nicht nachwächst).

## 4. Plan (frische Session — Reihenfolge)

**Slice P1 — Stand-Konsolidierung (der Kern):**
- handoff Top-Anker = einzige laufende Stand-Quelle (Format auf scannbare Bullets bringen).
- MASTERPLAN: Prosa-Stand (Z.16+Z.50) → **Wellen-Status-Tabelle** (1 Zeile/Welle: ✅/🔄/⬜ + Slice-Range + 1 Pointer auf handoff). Vision/7-Wellen-Struktur bleibt.
- TODO: Narrative-History raus → reine P0/P1/P2-Bullets (Verweis auf log.md für History).
- Auto-MEMORY: PROGRAMM-STAND-Mega-Zeile → kurzer Durable-Fact + Pointer auf handoff.

**Slice P2 — Mega-Zeilen brechen:**
- TODO/MASTERPLAN/INDEX/handoff: lange Append-Zeilen → Bullet-Listen (editierbar ohne Vollzeile-Read).

**Slice P3 — History archivieren:**
- `log.md` (946 KB) + `decisions.md` (341 KB): alte Einträge in `worklog/_archive/` bzw. `memory/_archive/` auslagern (z.B. < Slice 400 / < D100), aktive Datei schlank halten. INDEX-Range-Hook beachten.

**Slice P4 — Lean-Ceremony-Lane erweitern:**
- `workflow.md`: die „Ops/Tooling"-Lean-Lane auf **display-only + money-neutral** Slices ausweiten (self-review statt Reviewer-Agent, inline-Spec). Money-nah behält volle Rigorosität (die ist GUT — s. §6).

**Slice P5 (optional) — Anti-Drift-Guard:**
- Pre-Commit-Check: warnt bei Zeilen > N Zeichen in Trackern ODER bei „Stand"-Prosa außerhalb handoff. Verhindert Nachwachsen.

## 5. Entscheidungen für Anil (in der frischen Session zu klären)

1. **Wie aggressiv?** Voll-Restrukturierung (alle 5 Slices) ODER nur die schlimmsten Duplikate dedupen (P1+P2)?
2. **Auto-generiert vs. Disziplin?** Soll ein Skript die MASTERPLAN-Status-Tabelle aus log/active generieren (kein manuelles Sync) — oder Disziplin + Check-Hook reicht?
3. **History archivieren?** log.md/decisions.md alte Einträge auslagern (ja/nein, ab welcher Grenze)?
4. **Auto-MEMORY:** PROGRAMM-STAND ganz auf Pointer abspecken — oder Kurz-Stand behalten (weil immer-geladen = nützlich beim Cold-Start)?
5. **Anti-Drift-Guard** (P5) bauen oder erst mal ohne?

## 6. Was NICHT anfassen (die Rigorosität ist GUT, kein Overhead)

- **Der SHIP-Loop-Kern** (Spec→Build→Review→Proof) für **money-nahe** Arbeit. Diese Session hat er real Bugs gefangen: Reviewer fand den Form-Bar-RPC-Fanout (419b), der PATCH-AUDIT verhinderte stille RPC-Reverts (428). Das ist kein Ballast — das ist der Wert.
- **Reviewer-Agent für Money/Migration/Security.** Bleibt Pflicht.
- **Recon-vor-Money (D87 Live-functiondef).** Bleibt.
- Der Overhead ist NICHT die Loop-Rigorosität — es sind die **gewachsenen Tracker-Artefakte** + Zeremonie-für-Trivial. Nur die anfassen.

## 7. Was die Optimierung bringt (Erfolgs-Kriterium)

- **Eine** Stand-Quelle statt fünf → 0 Drift-Glättungs-Arbeit pro Session.
- Tracker editierbar ohne Mega-Zeilen-Read → günstiger pro Session.
- Trivial-Slices ohne Voll-Zeremonie → schneller.
- Messbar: nach der Optimierung sollte „Session-Close-Hygiene" < halb so viele Tracker-Edits brauchen.

---

## Kontext-Pointer (damit die frische Session nicht suchen muss)
- Dieser Befund + Plan: **diese Datei.**
- Mein Overhead-Audit-Gespräch: Session 2026-06-28 (nach GW-Fork).
- Aktueller Feature-Stand (pausiert): `memory/session-handoff.md` Top-Anker (GW-Fork 427-429 done, 428b+Welle 3 warten).
- Workflow-Regeln: `.claude/rules/workflow.md`. Tracker-Kopplung-Regel: workflow.md LOG-Stage „Tracker-Kopplung (Slice 354)".
