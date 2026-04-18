# User-Feedback Queue

Eingehendes Feedback (Anil + später Tester). Triage nach Priorität, dann in Slice umgesetzt oder verworfen.

## Priorität

- **P0** Blocker — kaputte Kernschleife, Crash, Daten-Loss → sofort
- **P1** Major UX — User versteht nicht was tun, visueller Bug auf Core-Page → nächster Slice
- **P2** Nice-to-have — kleine UX-Verbesserung, Edge Case → in Polish-Sweep eingebaut
- **P3** Wunsch — neues Feature, Umbau → nach Phase 1+2 prüfen

## Format

```
### P? | YYYY-MM-DD | Kurz-Titel
- **Seite:** /path oder Component
- **Symptom:** was passiert / Screenshot falls vorhanden
- **Erwartung:** was sollte passieren
- **Status:** open / triaged / in-slice-NNN / fixed / wontfix
- **Slice:** NNN (wenn bearbeitet)
```

---

## Offen

(leer — noch keine Einträge)

## Erledigt

(leer)
