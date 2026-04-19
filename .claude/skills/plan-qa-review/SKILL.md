---
name: plan-qa-review
description: QA-Hat Review zum Edge-Case-Enumerieren VOR Code. Nutze nach /spec, vor /deliver. Checklist 12 Kategorien (null/zero/error/offline/race/stale/unauth/i18n/mobile/desktop/double-state/locale). Output Edge-Cases + Spec-Gap-Hinweise.
---

# /plan-qa-review — QA-Hat Review

Finde Edge-Cases VOR Code — wo sonst in Prod explodieren.

## 12 Edge-Case-Kategorien

| # | Kategorie | Typische Frage |
|---|-----------|----------------|
| 1 | null / empty | Was wenn Feld leer? API leerer Array? |
| 2 | Zero / Boundary | 0, negative, overflow, max-int? |
| 3 | Error-Pfad | Supabase wirft — UI zeigt was? |
| 4 | Offline | Keine Netzwerkverbindung — Fallback? |
| 5 | Race | Double-Click, concurrent edit, stale mutation |
| 6 | Stale-Cache | Daten 5min alt — refetch? |
| 7 | RLS / Unauth | User nicht eingeloggt — redirect? error-UI? |
| 8 | i18n | DE + TR vorhanden? MISSING_MESSAGE geblockt? |
| 9 | Mobile 393px | iPhone 16 — Touch-Target, Overflow, Scroll |
| 10 | Desktop 1280px | Standard-Breakpoint |
| 11 | Double-State | Pending + Error gleichzeitig, Loading + Empty |
| 12 | Locale-Edge | `I`.toLowerCase TR, NFD-Diakritika, RTL-future |

## Output-Format

```
Edge-Cases gefunden: N

1. [KRITISCH|MITTEL|NIEDRIG] Kategorie — Beschreibung
   Aktueller Spec-Gap: <Zitat oder "keine Abdeckung">
   Vorgeschlagene AC-Ergänzung: <Zeile>

2. [MITTEL] Locale — Türkisch `İsmail`.toLowerCase liefert NFD, search-index bricht.
   Aktueller Spec-Gap: AC-3 erwähnt nur exakte-Match.
   Vorgeschlagene AC-Ergänzung: normalizeForMatch() in Input-Path.

...

Spec-Completeness: X/12 Kategorien adressiert.
```

## BeScout-spezifische Fallen

- **Türkisch-Lowercase:** `I` → `i̇` (NICHT `i`). Fix: NFD + strip diacritics.
- **Mobile 393px:** Tabs mit `flex-1` → overflow; nutze `flex-shrink-0`.
- **Modal preventClose:** `isPending` → Modal darf nicht schließbar sein.
- **Dynamic Tailwind:** `border-[${var}]` JIT-broken → `style={{ borderColor: hex }}`.
- **Hooks vor early returns:** React-Rules.
- **`.in()` > 400 UUIDs:** PostgREST silent-fail → chunk 100er.
- **`.select()` > 1000 Rows:** PostgREST-Cap → `.range()`-Loop.
- **Modal braucht `open` prop** — sonst lifecycle broken.

## Pre-Check-Liste

- [ ] Alle 12 Kategorien durchgegangen?
- [ ] Money/Trading-Path? → RLS + Race + Stale-Cache extra streng
- [ ] i18n komplett? → DE + TR keys vorhanden, kein raw-key-leak
- [ ] Pre-Submit-Hints für Money-Risk (Price/Qty Warnungen) definiert?
- [ ] Error-Messages i18n-tauglich (keyword wird via `t()` resolvet)?

## Auto-Grep vor Review

```bash
# i18n-Keys used in Spec
grep -oE "t\(['\"][^'\"]*['\"]\\)" <spec-file> | sort -u

# MUSS in messages/de.json + messages/tr.json existieren
```
