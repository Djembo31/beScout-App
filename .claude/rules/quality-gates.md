---
description: Ultra Instinct v5 — Kontextuelles Wissensrouting, <5% Bug-Rate
globs: "**/*"
---

## Ultra Instinct v5

### Ziel: <5% Bug-Rate bei Agent-Geschwindigkeit

Nicht 10-15% "vielleicht." Gesichert unter 5%.
Nicht langsam weil ich alles selbst mache. Schnell weil Agents parallel arbeiten.

### Wie: Kontextuelles Wissensrouting

Mein Context IST das Briefing. Wenn ich gerade Fantasy-Code gelesen habe,
weiss ich ALLES ueber Fantasy. Dieses Wissen geht SOFORT in den Agent —
nicht morgen, nicht generisch, sondern JETZT und SPEZIFISCH.

---

## Der Workflow

### 1. ICH tauche ein (Domain Deep-Dive)

Bevor ich Agents dispatche, tauche ICH in die Domain ein:
- Lese die betroffenen Files
- Verstehe die Zusammenhaenge
- Identifiziere die Fallstricke

Das kostet mich ~10K Context. Aber danach WEISS ich alles.

### 2. ICH schreibe das Briefing SOFORT (Wissen ist frisch)

WAEHREND ich den Kontext habe, schreibe ich das Briefing.
Nicht spaeter. JETZT. Weil in 20 Minuten ist der Kontext komprimiert.

Das Briefing ist kein Dokument — es ist ein **Wissens-Dump:**
- "Diese Funktion wird von X, Y, Z aufgerufen — ich habe es gerade gesehen"
- "Dieser Fehler passiert hier immer — centsToBsd nicht doppelt anwenden"
- "Anil will das GENAU SO — kein Konfetti, Trading-Aesthetik"

### 3. AGENT arbeitet mit meinem Wissen + eigenem Deep-Dive

Agent hat:
- Mein kuratiertes Wissen (20-30K) → er startet wo ICH aufgehoert habe
- 1M eigenen Context → er liest ZUSAETZLICH, vertieft, versteht
- Agent-Memory → er weiss was LETZTES MAL schiefging
- Volle Verification Suite → tsc, build, vitest, Flow-Fragen

### 4. AGENT testet SELBST (nicht ich)

Agent fuehrt die Quality Gates SELBST durch:
- Schreibt Test BEVOR er implementiert (TDD)
- Laesst Tests laufen
- Beantwortet die 6 Flow-Fragen
- Committed NUR wenn alles PASS ist

### 5. 1 TIEFER Review (Szenario-basiert)

Review-Agent bekommt:
- Das Briefing (er kennt den Kontext)
- Den Diff (was geaendert wurde)
- Auftrag: 3 Szenarien durchspielen
- PASS oder REWORK, nichts dazwischen

### 6. Learnings zurueck → System wird schlauer

Agent schreibt:
- Was hat funktioniert → patterns
- Was war ueberraschend → errors
- Welche Info fehlte im Briefing → Briefing wird naechstes Mal besser

---

## Warum <5% moeglich ist

| Fehlerquelle | Wie verhindert | Verbleibend |
|-------------|----------------|-------------|
| Agent kennt Callsites nicht | Briefing Sektion 3 (ICH habe sie gerade gesehen) | ~0% |
| Doppelte Konvertierung | Briefing Sektion 6 (bekannte Fehler fuer DIESEN Code) | ~0% |
| Race Condition | Agent Flow-Frage 1 + TDD | ~2% (echte Edge Cases) |
| Fehlende i18n | Agent Flow-Frage 4 + Briefing Sektion 7 (Anils Sprach-Entscheidungen) | ~1% |
| A11y vergessen | Agent Flow-Frage 5 + Rules (ui-components.md) | ~1% |
| Integration bricht | Agent laeuft tsc+build in vollem Worktree | ~1% |

**Summe: ~5%** — und die verbleibenden sind echte Edge Cases die der Review faengt.

---

## Briefing-Struktur (v5 — kontextuell, nicht generisch)

```markdown
# Briefing: [Task]
## Von: Jarvis | Fuer: [Agent-Type] | Domain: [fantasy/trading/market/...]

## KONTEXT (was ICH gerade weiss)
[Frisch aus meinem Context — nicht zusammengesucht, sondern ABGEZAPFT]
[Was ich gerade gelesen habe, was mir aufgefallen ist, was wichtig ist]

## AUFTRAG
[Praezise: was soll passieren]

## BETROFFENE FILES
[Source die ich GERADE gelesen habe — komplett, nicht Auszuege]

## FALLSTRICKE (spezifisch fuer DIESEN Code)
[Nicht generische Regeln — sondern EXAKT was hier schiefgehen kann]
[z.B. "player.prices.floor ist SCHON in BSD, NICHT centsToBsd anwenden"]
[z.B. "diese Funktion wird von firePush fuer ANDERE User aufgerufen"]

## ANILS WILLE
[Was Anil zu diesem Thema gesagt hat — Stil, Richtung, Entscheidungen]
[z.B. "kein Konfetti, Premium Trading-Aesthetik"]

## ACCEPTANCE
[Exakte Befehle die PASS sein muessen]
[Exakte visuelle Checks wenn UI]

## DEIN DEEP-DIVE PLAN
[Welche zusaetzlichen Files der Agent SELBER lesen sollte]
[Nicht alle — nur die die ueber mein Briefing hinaus relevant sind]
```

---

## Parallel-Dispatch (Geschwindigkeit)

Weil Agents eigene 1M Context haben und Briefings bekommen:

```
ICH tauche in Domain ein (10 min)
  ↓
Schreibe 3 Briefings parallel (5 min):
  briefings/task-a.md (Feature)
  briefings/task-b.md (Tests)
  briefings/task-c.md (i18n)
  ↓
Dispatche 3 Agents parallel (0 min):
  Agent A: implementiert Feature (Briefing A)
  Agent B: schreibt Tests (Briefing B, sieht NIE Agent A's Code — unabhaengig)
  Agent C: i18n + A11y Check (Briefing C)
  ↓
Alle 3 fertig → 1 Integration-Check (tsc + build)
  ↓
1 tiefer Review-Agent (bekommt ALLE 3 Briefings + ALLE 3 Diffs)
  ↓
PASS → Commit | REWORK → betroffenen Agent resume mit Feedback
```

**Geschwindigkeit:** 3 Tasks parallel statt sequentiell.
**Qualitaet:** Jeder Agent hat domainspezifisches Briefing.
**Noise:** 0 auf meinen Context (Briefings auf Disk, Agents in Worktrees).

---

## Wissens-Kreislauf (wird IMMER besser)

```
Session N:
  Briefing (mein Wissen) → Agent → Learnings → Memory

Session N+1:
  Briefing (mein Wissen + Agent Memory) → Agent → bessere Learnings → Memory

Session N+10:
  Briefing (akkumuliertes Wissen) → Agent macht 0 bekannte Fehler
```

Je mehr wir arbeiten, desto besser werden die Briefings.
Je besser die Briefings, desto weniger Bugs.
Je weniger Bugs, desto weniger Review-Runden.
Je weniger Review-Runden, desto schneller.

**Das ist kein theoretisches Modell. Das ist ein Flywheel.**

---

## Selbst-Check

Bevor ich "fertig" sage:
1. Habe ich den Domain Deep-Dive gemacht?
2. Habe ich das Briefing WAEHREND ich den Kontext hatte geschrieben?
3. Hat der Agent die 6 Flow-Fragen beantwortet?
4. Gibt es Tests?
5. Hat der Reviewer PASS gesagt?
6. Sind Learnings zurueckgeschrieben?

Alle JA → fertig. Ein NEIN → nicht fertig.
