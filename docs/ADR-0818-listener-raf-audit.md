# ADR-0818: Listener & rAF-slot audit complete

- Status: Accepted (2026-09-28, v1.7.844)

## Scope & Result

Audited every event-listener registration and `requestAnimationFrame`
slot for the leak classes: duplicate registration, leaked per-element
listeners, accumulating media-query watchers, and multi-armed rAF
schedulers.

- `_on` sites: all registered once at boot inside `wire()` / UI init —
  `main()` runs once, so no re-registration. Canvas + window +
  document handlers are single-boot.
- Per-element listeners (`textarea` editors, search input, toolbar
  buttons, doc-name input): attached to elements created per open —
  GC'd with the element, no accumulation.
- `dc`/`bc`/`rtc` handlers are *property assignments* (`onmessage=`,
  `onopen=`, `onbufferedamountlow=`, `ondatachannel=`) — assignment
  replaces, never stacks.
- `_watchDPR` uses `{once:true}` and re-arms on a *fresh*
  MediaQueryList each ratio change; the expired listener dies with
  its old `mq` — no accumulation.
- `mq.addListener` fallback covers legacy Safari.
- rAF slots: `_raf` (main draw loop + minimap `_raf`) and `_edgeRaf`
  are single-slot armed — each sets itself `0` on entry and re-arms
  only if the predicate still holds, so `schedule()`/`_edgePanKick`
  can never run two loops.
- `_presenceTimer` covered in ADR-0817 (cleared on room switch).

Conclusion: no duplicate listeners, no leaked element handlers, no
stacked media watchers, single-armed rAF everywhere.
