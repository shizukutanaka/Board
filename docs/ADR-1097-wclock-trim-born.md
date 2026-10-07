# ADR-1097 — wclock flood trim preserves existence clocks (`_born`)

Status: accepted (1.8.121)

## Context

`del` forward applies a flood cap on `state.wclock` (ADR-0734/0738): past 8192
entries it rebuilds the map keeping only tomb records — `t[id]={_del:w._del}` —
so a peer flooding clocks cannot grow the map unboundedly while the
anti-resurrection data survives.

Two clobber holes, same class as the `_wTb` clobber fixed in ADR-1096:

1. `t[id]={_del:w._del}` drops `_born` unconditionally — including an
   *outranking* `_born`. A live shape whose entry is `{_del@500,_born@600}`
   stays installed but its record degenerates to a plain tomb: the `dels`
   sweep then advertises the live id as dead to joining peers, and a
   re-delivered stale `del` (after dedup eviction) can tomb it again.
2. `_born`-only entries (the canonical live record — `add` deletes `_del`
   and stamps `_born`) were dropped wholesale, erasing the very record that
   lets `_bN`/`_tmb` protect a live shape from a stale kill.

## Decision

The trim now keeps the *existence clocks* — the pair that arbitrates
life-vs-death — and still drops every prop clock (convergence hints are
expendable):

```js
if(w._del||w._born){
  const n={};
  if(w._del)n._del=w._del;
  if(w._born&&clockNewer(w._born,w._del||{}))n._born=w._born;
  t[id]=n;
}
```

- `{_del}` tomb → kept verbatim.
- `{_del,_born}` → `_born` kept only when it outranks the tomb (a `_born` ≤
  `_del` is semantically dead — dropping it loses no arbitration outcome).
- `{_born}` live record → kept.
- Prop-only entries → dropped (unchanged).

The bound still holds: entries carry at most the two existence clocks.

## Consequences

- `dels` sweeps can no longer advertise a live id as dead after a flood trim.
- Stale `del` re-delivery (post dedup-evict) still loses to `_bN`.
- Kills still win arbitration exactly as before — tombs are preserved.

## Test plan

`test.mjs` — 6 behavioural pins: outranking `_born` survives; tomb survives;
plain tomb gains no `_born`; plain tombs survive; `_born`-only record
survives; surviving `_born` still outranks a hypothetical dels clock.
