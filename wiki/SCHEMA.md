# BeScout Product Wiki — Schema

> Dieses File sagt dem LLM wie das Wiki funktioniert.
> Human kuratiert (was rein soll), LLM pflegt (Seiten, Index, Querverweise).

## Prinzip

Das Wiki waechst organisch. Keine vordefinierten Kategorien.
Wenn Input reinkommt → erkennen was es ist → Seite erstellen/aktualisieren → Index updaten.

## 3 Operationen

### INGEST (Input verarbeiten)

Trigger: Anil droppt einen Link, erzaehlt von einem Gespraech, teilt eine Erkenntnis.

1. **Verstehen:** Was ist das? (Competitor, Club, Entscheidung, Idee, Research, Feedback)
2. **Seite finden oder erstellen:**
   - Gibt es schon eine Seite zu diesem Thema? → Aktualisieren
   - Nein? → Neue Seite in `wiki/` erstellen
3. **Querverweise:** Welche bestehenden Seiten sind relevant? → Links setzen
4. **Index aktualisieren:** `wiki/index.md` um neuen Eintrag ergaenzen
5. **Log:** Eintrag in `wiki/log.md` appenden

### QUERY (Fragen beantworten)

Trigger: Anil fragt "wie machen andere X?" oder "warum haben wir Y so entschieden?"

1. Lies `wiki/index.md` — finde relevante Seiten
2. Lies die Seiten
3. Synthetisiere Antwort mit Quellenangaben
4. Wenn die Antwort gut ist → als eigene Seite speichern (Wissen kompiliert)

### LINT (Qualitaet pruefen)

Trigger: Manuell oder bei AutoDream-Run.

1. Verwaiste Seiten (nirgends verlinkt)?
2. Widersprueche zwischen Seiten?
3. Stale Seiten (>90 Tage nicht aktualisiert)?
4. Luecken (erwaehnte Themen ohne eigene Seite)?

## Seiten-Format

Jede Seite hat YAML Frontmatter + Markdown Body:

```markdown
---
title: [Thema]
type: [competitor|club|decision|research|idea|feedback|comparison]
created: YYYY-MM-DD
updated: YYYY-MM-DD
tags: [relevante Stichworte]
sources: [URLs oder "Gespraech mit X"]
---

# [Titel]

[Inhalt — Fakten, nicht Meinungen. Quellenangaben wo moeglich.]

## Relevanz fuer BeScout
[Was bedeutet das fuer uns? Vergleich, Inspiration, Warnung?]

## Siehe auch
- [[andere-seite]] — Querverweise
```

## Index-Format

`wiki/index.md` — Auto-generiert, gruppiert nach Type:

```markdown
# Wiki Index

## Competitors
- [Sorare](sorare.md) — Fantasy Football, NFT-basiert, 2023 Rebranding

## Decisions
- [Dark Mode Only](dark-mode-only.md) — Warum kein Light Mode

## Research
- [Fantasy Models](fantasy-models.md) — Vergleich Free vs Paid Fantasy
```

Keine feste Reihenfolge der Gruppen — neue Types entstehen dynamisch.

## Log-Format

`wiki/log.md` — Append-only, neueste oben:

```markdown
## [YYYY-MM-DD] [Aktion]
- Seite: [name.md]
- Typ: [created|updated|merged]
- Quelle: [URL oder Beschreibung]
- Aenderungen: [was wurde hinzugefuegt/geaendert]
```

## Regeln

1. **Fakten, nicht Meinungen.** Wiki speichert was IST, nicht was sein sollte.
2. **Quellen angeben.** Jede Seite hat `sources` im Frontmatter.
3. **Keine Duplikate.** Bevor neue Seite → pruefen ob Thema schon existiert.
4. **Deutsch.** Wiki-Sprache ist Deutsch (wie der Rest des Projekts).
5. **Kurz.** Seiten sollen 50-200 Zeilen sein. Zu lang → aufteilen.
6. **Relative Daten verboten.** Immer absolute Daten (2026-04-07, nicht "gestern").
7. **Keine Code-Details.** Dafuer gibt es memory/ und .claude/rules/. Wiki = Produkt-Wissen.
