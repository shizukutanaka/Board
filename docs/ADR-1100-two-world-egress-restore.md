# ADR-1100 — two-world teardown restores canonical egress

Date: 2026-10-01 (round850)
Status: accepted (shipped in v1.8.124)

## Context

The two-peer convergence harness (`test.mjs:7424+`) builds a second eval'd
world B and rewires both worlds' egress into relays:

```js
A.Net.broadcast = op => B.Net._onRecv({k:'op',op:cp(op)});
B.Net.broadcast = op => A.Net._onRecv({k:'op',op:cp(op)});
A.Net._send = msg => B.Net._onRecv(cp(msg));
B.Net._send = msg => A.Net._onRecv(cp(msg));
```

`A` is the main world (`A = api`, and the suite's `Net` is destructured from
`api` — `A.Net === Net`). Sub-blocks keep re-assigning `A.Net.broadcast` for
their own queue-based wires; the last ones leave it as the B-relay.

## The defect

The teardown at :8980 inerts only world B
(`B.Net._send=B.Net.broadcast=()=>{}`, clears `B.Net._snapT`) — **the main
world's `Net.broadcast`/`Net._send` stayed wired as dead-B relays.** Every
post-section `Store.commit` pushed an *unslimmed* op into a dead world's
`_onRecv`, and `_send` injected raw messages into the same dead intake.
Two consequences:

- **Harness hygiene** — dead-B state kept mutating silently after the
  section, and any pin restoring a saved `Net._send`/`broadcast` would
  restore the *relay*, not the canonical function (the bug that made the
  ADR-1098 pin install its own canonical `_send` body explicitly).
- **Coverage gap** — every post-:8980 commit bypassed the real egress:
  `_slimOp` (after/before wire form), `dmac` DC tagging, `_sendDC`
  backpressure, and `_bcast` dual-transport were never exercised.

(`_onRecv` is intentionally NOT restored: the `_patchRecv` MAC-stamping wrap
plus the :7439 op-peer binding is load-bearing for every post-section
`Net._onRecv`-driven pin.)

## The fix

`const _cBc=A.Net.broadcast,_cSd=A.Net._send` is captured before the first
rewire (still the eval'd canonical methods), and the teardown line restores
them alongside B's inert-ization:

```js
B.Net._send=B.Net.broadcast=()=>{};clearTimeout(B.Net._snapT);B.Net._snapT=0;
A.Net.broadcast=_cBc;A.Net._send=_cSd;   // main world exits with canonical egress
```

Safety: the harness `BroadcastChannel` is a no-op stub (`postMessage(){}`),
so canonical `_send` only stamps `m.mac` and calls a void — no cross-world
delivery is introduced, and no earlier assertion changes meaning.

## Behavioural pins

Inside the section, right after teardown:

- post-teardown `Store.commit` lands the shape on the main world;
- the same commit does **not** reach `B.state.shapes` (no relay);
- `A.Net._send({k:'name',…})` leaves `B.state.docName` untouched (posts to
  bc, not into `B._onRecv`).
