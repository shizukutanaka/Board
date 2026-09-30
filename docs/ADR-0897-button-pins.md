# ADR-0897: Behavioural pins — non-primary buttons arm no gesture

Status: Accepted (test, v1.7.923)

## Context

ADR-0896 widened the pointerdown button guard from `===2` to `>1`.
The event-series harness already pinned the right-button case with a
real `fire('pointerdown', {button:2})`; X1/X2 and stylus barrels needed
the same coverage.

## Decision

Extend the event-series block to fire `pointerdown`/`pointerup` with
`button: 3` and `button: 4` under the pen tool, asserting neither arms
`ptr.down` nor commits a shape:

```js
for(const b of [3,4]){
  reset();state.tool='pen';
  fire('pointerdown',50,50,{button:b});
  assert.ok(!ptr.down&&state.shapes.length===0);
  fire('pointerup',50,50);
}
```

## Consequences

- The whole non-primary button range is pinned through the real
  listener path, not just the source pin.
- Audit of the surrounding input paths (pointerup/cancel, wheel,
  dblclick, drop, pinch, capture) found no further button gaps —
  `dblclick` fires only for the primary button per UI Events.
