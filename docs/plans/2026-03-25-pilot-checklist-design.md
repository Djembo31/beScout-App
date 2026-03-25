# Pilot Checklist — Real User Testing

## Datum: 2026-03-25
## Ziel: 50 Sakaryaspor-Fans (Closed Beta) nutzen App ohne Crash oder Sackgasse
## Ansatz: 4-Schichten-Audit (Infra → Daten → Flows → Edge Cases)

---

## Kontext

- **Pilot:** 50 handverlesene Sakaryaspor-Fans, persoenlich eingeladen
- **Scope:** Alle Features (Trading, Fantasy, Community, Profil, Club)
- **Feedback:** Erstmal beobachten, kein In-App Feedback noetig
- **Erfolgskriterium:** Kein User sieht einen Crash, weissen Screen oder Sackgasse

---

## Schicht 1: Infra & Config

Bevor ein User die App oeffnet muss die Basis stehen.

| # | Check | Was genau |
|---|-------|-----------|
| 1.1 | Vercel Env Vars | Alle `NEXT_PUBLIC_*` NICHT als "Sensitive" markiert, alle anderen gesetzt |
| 1.2 | Supabase Auth | Email-Templates (DE/TR), Redirect-URLs auf Prod-Domain |
| 1.3 | Cron Job | `gameweek-sync` laeuft, naechster Spieltag wird automatisch verarbeitet |
| 1.4 | Sentry | DSN live, Test-Error wird in Dashboard empfangen |
| 1.5 | PostHog | Events fliessen, User-Identification funktioniert |
| 1.6 | PWA | Manifest valid, Install-Prompt auf Android/iOS, Offline-Fallback |
| 1.7 | Domain/SSL | Prod-URL mit HTTPS, kein Mixed Content |
| 1.8 | Build | `next build` clean, 0 Warnings die User betreffen |

**Gate:** Alles gruen bevor Layer 2 beginnt.

---

## Schicht 2: Sakaryaspor-Daten

Die 50 Tester sind Sakaryaspor-Fans. Alles was sie sehen muss vollstaendig und korrekt sein.

| # | Check | Was genau |
|---|-------|-----------|
| 2.1 | Kader komplett | Alle Sakaryaspor-Spieler mit Bild, Position, Trikotnummer, Nationalitaet |
| 2.2 | Spieler-Stats | L5/L15 Scores aktuell, keine 0er oder null-Werte bei aktiven Spielern |
| 2.3 | IPOs verfuegbar | Mindestens 10-15 Spieler kaufbar (nicht alle — Knappheit erzeugt Spannung) |
| 2.4 | Fixtures aktuell | Naechster Spieltag mit korrekten Gegnern, Anstosszeiten, Formationen |
| 2.5 | Fantasy Events | Mindestens 1 aktiver Event (offener Spieltag) zum Mitmachen |
| 2.6 | Club Page | Logo, Farben, Info, Kader-Ansicht — alles korrekt fuer Sakaryaspor |
| 2.7 | Welcome Bonus | Betrag konfiguriert, reicht fuer mindestens 1-2 Scout Card Kaeufe |
| 2.8 | Preise realistisch | IPO-Preise und Marktpreise ergeben Sinn (kein 0.00 oder 999999) |

**Gate:** Ein Sakaryaspor-Fan sieht seinen Verein komplett und korrekt dargestellt.

---

## Schicht 3: Core Flows (manueller Durchlauf)

Jeder Flow wird einmal komplett durchgeklickt — auf Mobile-Viewport (360px).

| # | Flow | Schritte |
|---|------|----------|
| 3.1 | Signup → Home | Registrieren → Onboarding (6 Steps) → Welcome Bonus erhalten → Home Dashboard |
| 3.2 | Erster Kauf | Market → Spieler finden → Scout Card kaufen → in "Mein Kader" sehen → Wallet-Abzug korrekt |
| 3.3 | Fantasy | Event oeffnen → Lineup bauen → Captain waehlen → Absenden → in "Meine Lineups" sehen |
| 3.4 | Community | Scouting Zone → Post erstellen (Research) → Feed sehen → Post voten |
| 3.5 | Player Detail | Spieler antippen → Stats, Score, Chart, Trading-History sehen → zurueck ohne Fehler |
| 3.6 | Profil | Eigenes Profil → Holdings, Stats, Achievements sehen → oeffentliches Profil eines anderen Users |
| 3.7 | Club | Club Page → Kader → Abo abschliessen → Perks sichtbar |
| 3.8 | Verkauf | Mein Kader → Sell Order erstellen → im Orderbook sehen → Cancel funktioniert |
| 3.9 | Notifications | Aktion ausfuehren die Notification triggert → Badge erscheint → antippen → als gelesen markieren |
| 3.10 | Sprache | DE → TR wechseln → alle Texte auf Tuerkisch → zurueck auf DE |

**Gate:** Jeder Flow komplett ohne Crash, weissen Screen oder Sackgasse.

---

## Schicht 4: Edge Cases & Stress

Was passiert wenn etwas schiefgeht oder unerwartete Zustaende auftreten.

| # | Case | Was testen |
|---|------|-----------|
| 4.1 | Leeres Wallet | 0 Balance → Kaufen → Fehlermeldung statt stiller Fehler |
| 4.2 | Tuerkische Zeichen | Spielernamen mit I, s, c, g → Suche funktioniert, kein Encoding-Muell |
| 4.3 | Doppelklick | Kauf-Button 2x schnell druecken → kein doppelter Trade |
| 4.4 | Netzwerk-Abbruch | WLAN aus waehrend Aktion → Error Boundary, kein weisser Screen |
| 4.5 | Session abgelaufen | Token expired → Redirect zu Login, kein Endlos-Spinner |
| 4.6 | Mobile Overflow | 360px Viewport → kein horizontaler Scroll, keine abgeschnittenen Buttons |
| 4.7 | Back-Button | Browser-Zurueck auf jeder Seite → sinnvolle Navigation, kein Loop |
| 4.8 | Neuer User ohne Daten | Frisches Konto → ueberall Empty States mit CTAs, nirgends "undefined" oder leere Listen |
| 4.9 | Gleichzeitige Trades | 2 User kaufen letzte Scout Card → einer bekommt sie, anderer bekommt sauberen Fehler |
| 4.10 | i18n Luecken | TR-Modus → kein sichtbarer Fallback-Key (z.B. "market.buy.button") |

**Gate:** Kein Edge Case produziert einen Crash oder unverstaendlichen Zustand.

---

## Reihenfolge

```
Schicht 1 (Infra)     → kann sofort geprueft werden (DB-Queries, Config-Check)
Schicht 2 (Daten)     → nach Infra, DB-Queries + visuell
Schicht 3 (Flows)     → nach Daten, manuell auf Vercel Preview
Schicht 4 (Edge Cases) → nach Flows, gezielt provozieren
```

## Arbeitsweise

- Schicht 1+2: Groesstenteils automatisierbar (SQL-Queries, Config-Checks, tsc/vitest)
- Schicht 3: Playwright auf Vercel Preview + manuelle Stichproben
- Schicht 4: Mix aus Playwright (Doppelklick, Viewport) und manuellem Test
- Findings sofort fixen (Tier 1-2), nicht sammeln
