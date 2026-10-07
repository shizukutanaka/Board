# ADR-1130 — `_txFlush` drains best-effort

Status: accepted — implemented in v1.8.154 (round880).

## Context

`_txFlush` drains the convergence queue `_txE` built by `_lwwDrop`
(ADR-1123/1124/1125/1126): each entry says "a remote op was rejected because
the local value is newer — re-emit the local value so the sender heals."
The drain consumed the queue up front (`_txE=null`) and emitted each op
sequentially via `_txC`.

## The Socratic question

> "If the queue is consumed before draining and one emit throws, what happens
> to the entries that were never attempted?"

## Findings

- **Mid-drain abort strands the rest.** A `_txC` throw (`Net.broadcast` down,
  `_stampWrites` crash) propagated out of `_txFlush` immediately — every
  remaining entry in `g`/`z`/`gg` was silently discarded. There is no retry:
  the queue was already consumed, and `_txE` is only refilled by *future*
  drops. The peer's divergent prop stays stale forever — the exact outcome
  the emit exists to prevent.
- **`before:{}` is legal.** Entries whose dropped remote value was
  `undefined` emit `{b:_ud→omitted,a:v}` → the upd's `before` is `{}`.
  `validPatch({})` passes vacuously (`every` on no keys), and `upd` requires
  only a valid `after` (ADR-1122) — no divergence there.
- The `state.ro` early-return is correct: an ro-adopted doc must not emit at
  all; pending entries are legitimately discarded.
- The build loop (`for e of q`) is pure Map/Set work — can't realistically
  throw; the emit calls are the only failure surface.

## Decision

```js
let err=null;const _run=f=>{try{f()}catch(e){if(!err)err=e}};
for(const[id,p]of g)_run(()=>_txC({op:'upd',id,before:p.b,after:p.a}));
if(z)_run(()=>_txC({op:'zorder',changes:z}));
for(const o of gg)_run(()=>_txC(o));
if(err)throw err;
```

Best-effort drain: every emit attempted (each `_txC` keeps its own ADR-1128
catch→evict→rethrow boundary, so a failed emit's dedup key is still evicted
and a later redelivery isn't blocked), then the **first** error propagates
to the caller — identical failure signal to the old code, but the rest of
the queue converges instead of vanishing.

## Verification

`node test.mjs` → 4240 pass / 0 fail. 8 behavioural pins
(test.mjs:20235-20262): two `_lwwDrop`-seeded upd emits drain past a
broadcast that throws on the first call — the second emit still lands, the
first error propagates; ro adoption suppresses pending emits.
