**2026-04-25 — Cross-Track Type-Race in Parallel-Dispatch (Slice 197d)**

Observation: Bei parallel-dispatch backend+frontend mit shared types/index.ts kann der Frontend-Agent Properties referenzieren, die der Backend-Agent gleichzeitig hinzufügt. Result: tsc fail bis Merge. Statt Workaround mit `as any` oder lokal definierten types: einfach akzeptieren, dokumentieren, Backend-Track erledigt es. Generic-Filter-Helper mit `getValue`-lambda ist dafür ideal — entkoppelt Filter-Logik vom Type-Race komplett.

Pattern: Generic Filter-Helper (197a + 197d) — `applyXFilter<T>(items, filter, getValue: (T) => Value | null)`. Kein Player-Import noetig, kein Type-Race-Problem. Teste den Helper isoliert (197d: 11/11 PASS), die Components rendern später.

Confidence: high. Pattern-Wert auch fuer zukuenftige Cross-Track-Slices (z. B. neue Spieler-Properties die Backend hinzufuegt).

Suggested location: `.claude/rules/errors-frontend.md` Section "Multi-Track Coordination" oder als Pattern in `memory/patterns.md` "Cross-Track Generic-Helper".
