**2026-04-15 — Data-Migration / HTTP-Reachability-Check**
Observation: `media.api-sports.io` CDN blockt HEAD-Requests mit 403, erlaubt aber GET
mit 200. Ein `fetch(url, { method: 'HEAD' })`-basierter Reachability-Check scheiterte
deshalb bei der TFF-Logo-Migration, obwohl die Assets verfügbar waren. Fix: GET mit
`Range: bytes=0-0` Header; akzeptiere Status 200 (full) oder 206 (partial). Dies ist
ein allgemein verbreitetes CDN-Verhalten (nicht nur api-sports) — in allen Scripts die
URLs gegen externe CDNs prüfen sollte der Range-GET-Fallback statt HEAD genutzt werden.
Confidence: high (direkt reproduziert + extern bestätigt via curl)
