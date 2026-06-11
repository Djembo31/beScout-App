# Lighthouse-Baseline — 2026-06-11 (Phase-2-Auswertung, Slice 282)

> Deferred-Task aus Slice 279 („nach 3-5 Live-Runs Baseline schreiben"). 8 GHA-Runs liefen
> (5× 2026-05-06, 3× 2026-06-11), Artifacts der Mai-Runs nicht mehr abrufbar → Baseline
> stattdessen aus lokalem LHCI-Run (identische lighthouserc.json, 3 URLs × 3 Runs, mobile
> 393px, 4× CPU-Slowdown, 1.6 Mbps simuliert) gegen Production bescout.net.

## ⚠️ VALIDITY-BEFUND: Alle 3 konfigurierten URLs messen /login

`/`, `/market`, `/community` sind **auth-gated** und redirecten unauthenticated auf `/login`.
Die Slice-279-Annahme „public-readable ohne Auth-Wall" war falsch. **Alle bisherigen
Phase-1-Runs (GHA seit 2026-05-06) haben 3× die Login-Page gemessen, nie die App.**

Konsequenz:
1. Baseline unten = Login-Page-Baseline (immerhin: misst App-Shell-Boot + FLJS-Kosten).
2. Authentifizierte Messung der echten Pages braucht LHCI `puppeteerScript`-Auth →
   eigener Slice (282b-Kandidat). Bis dahin: Phase-3-Error-Gates NICHT scharf schalten
   (würden die falsche Page gaten).

## Baseline /login (Median-of-3, 3 unabhängige Messungen = 9 Runs)

| Messung | Perf | FCP (ms) | LCP (ms) | TBT (ms) | SI (ms) | CLS | TTI (ms) |
|---|---|---|---|---|---|---|---|
| #1 | 58 | 2170 | 6421 | 653 | 3200 | 0.000 | 6427 |
| #2 | 64 | 2111 | 6135 | 455 | 2938 | 0.000 | 6135 |
| #3 | 60 | 2220 | 6301 | 563 | 3431 | 0.000 | 6301 |
| **Mean** | **60.7** | **2167** | **6286** | **557** | **3190** | **0.000** | **6288** |
| StdDev | 3.1 | 55 | 144 | 99 | 247 | 0 | 146 |

**Interpretation:** Schon die Login-Page (kein Daten-Fetch) hat LCP ~6,3s mobil — der
App-Shell-Boot (FLJS ~395 kB × 4× CPU-Slowdown) dominiert. Jede eingeloggte Page startet
von dieser Basis und addiert Daten-Fetches.

## Direkt-Messung Daten-Layer (nicht via Lighthouse — curl gegen Production)

| Endpoint | Payload | Zeit (unthrottled) | Mobile-Schätzung (1.6 Mbps) |
|---|---|---|---|
| `GET /api/players` | **4.228.848 bytes (4,2 MB)** | 5,48s | **~21s Download + JSON.parse von 4 MB auf 4×-throttled CPU** |

`/api/players` wird konsumiert von: **Home** (`useHomeData` → `usePlayers()`) + **Market**
(`useMarketData` → `useEnrichedPlayers`). X-Vercel-Cache: MISS (Server-In-Memory-Cache
5 min, aber Lambda-Cold-Start = Cache leer; CDN cached nicht zuverlässig).

**Home-Nutzungs-Analyse (Slice 282 Discovery):** Home braucht von den 4.500 Spielern:
1. `activeIPOs` — **DEAD CODE**: `dbToPlayer` setzt `ipo.status` unconditional `'none'`
   (`players.ts:185` „loaded separately"), Filter `status === 'open'` matched nie →
   Home-IPO-Spotlight + Sidebar-IPO-Sektion (page.tsx:352) haben nie gerendert.
2. `trendingWithPlayers` — Join von 5 Trending-IDs gegen die volle Liste.
3. `hasGlobalMovers` — ein `some(change24h !== 0)`.

→ 4,2 MB Payload für 2 lebende Mini-Ableitungen + 1 totes Feature. **Das ist der
größte Cold-Start-Hebel für eingeloggte User** (Anils Live-Komplaint D70).

## Abgeleitete Phase-3-Schwellen (NUR für /login, NICHT scharf schalten bis 282b)

Formel baseline + 1.5×StdDev: Perf ≥ 56 · FCP ≤ 2250 · LCP ≤ 6502 · TBT ≤ 706.
**Empfehlung: NICHT aktivieren** — erst 282b (Auth-LHCI) liefert gate-würdige URLs.

## GHA-Nebenbefund

`lighthouse.yml` Upload-Artifact produziert 0 abrufbare Artifacts (Run 27360734770:
`/artifacts` API = leer trotz `if: always()` + `if-no-files-found: warn`). Vermutlich
Name-Expression `github.event.deployment.sha && ... || github.sha` + warn-silent-skip.
→ Fix-Kandidat in 282b.
