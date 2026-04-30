# Active Slice

```
status: idle
slice: —
stage: —
spec: —
impact: —
proof: —
review: —
```

## Slice 266 KOMPLETT (S): Top-Progress-Bar Cold-Start UX-Brücke. Slim 2px gold-Bar (NProgress-Style) während `authLoading || profileLoading || walletLoading || ticketsLoading`. Anti-Flicker via 200ms fade-out + Reduced-Motion-Fallback. Reviewer PASS (post-Heal: motion-reduce-Bug + Token-Drift inline behoben). Knowledge: errors-frontend.md "Tailwind motion-reduce variant nur auf existierende Animation-Utilities". 8/8 Tests grün, tsc clean. Slice-265-Lehre angewandt: Component vollständig isoliert. Commit `29842d26`.

## Beta-Day-3 Backlog

- **Slice 267 P0** Provider-Cascade-Refactor — echter Smoking-Gun-#3-Fix (Stagger queries / RSC Auth-Hydrate). Priorisierbar nach Beta-Tester-Feedback ob 266 UX-Brücke ausreicht.
- **Slice 268 P2** Slice-265-Post-Mortem — was hat localStorage-Mirror gebrochen? Browser-Console-Output von Slice-265-Test fehlt; bei akutem Bedarf Test-Page deployen + capture-en.
- **Anil's post-Deploy-Verify** auf bescout.net (iPhone iOS 18.7 Mobile-Safari): (a) Bar erscheint Cold-Start, (b) keine Notch-Überlappung, (c) DemoBanner-Visual-Stack OK (Reviewer Finding #3).
