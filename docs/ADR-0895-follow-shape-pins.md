# ADR-0895: Behavioural pin — _teFollow re-fires on a shape commit

Status: Accepted (test, v1.7.921)

## Context

ADR-0892 added `_gridVer` to the overlay follow signatures so a peer
`upd` that moves or restyles the edited shape repositions the overlay.
The existing `_teFollow` block pinned viewport follow (zoom →
position+font scale, pan → reposition, unchanged sig → no-op, closed
editor → no follow) but not the `_gridVer` component.

## Decision

Extend the `_teFollow` behavioural block with a real commit:

```js
ta.style.left='999px';_teFollow();        // unchanged sig → no-op (left stays)
Store.commit({op:'upd',id:s.id,before:{x:300,bold:null},after:{x:300,bold:true}});
_teFollow();
assert ta.style.left==='500px' && ta.style.fontWeight==='600'
```

The commit drives the real `_apply` path (which bumps `_gridVer`), so
the signature changes at a fixed viewport and `positionTextEditor`
re-runs — covering both reposition (x:300 → screen 500px at zoom 2,
pan x:50) and restyle (bold → fontWeight 600). The closed-editor guard
assert follows on the new position value.

## Consequences

- The shape-change follow is now pinned against regression alongside
  the viewport follow.
- `_lblFollow` has no destructured export; its `_gridVer`+zoom coverage
  rides the shared signature shape and the round642/643 audits.
