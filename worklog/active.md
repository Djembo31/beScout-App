# Active Slice

```
status: active
slice: 265
stage: PROVE
proof: worklog/proofs/265-ac-audit.txt
spec: inline (Slice 264 follow-up — TopBar wallet/tickets cold-start)
impact: skipped (3 Files: useWallet, useUserTickets, AuthProvider lsClear extension)
proof: pending
review: self-review D35 (XS additiv localStorage-cache mit Slice-260-User-Switch-Cascade)
```

## Slice 265 P1 (Beta-Day-2 follow-up): TopBar Wallet+Tickets cold-start localStorage-Cache. Anil-Re-Test post-263+264: "schon deutlich besser, aber beim kalt start home hat geladen, geld und tickets waren nicht geladen, konnte nicht klicken/navigieren". Symptom: Mobile-Safari Initial Query-Storm exhaustes Connection-Pool, wallet/tickets hängen in queue. Fix: lokal-cache letzte balance/ticket-count, useWallet+useUserTickets nutzen das als initialData → instant render bei reload, fetch in background. User-Switch-Detect (Slice 260) sweept beide caches mit lsClear()-Extension.
