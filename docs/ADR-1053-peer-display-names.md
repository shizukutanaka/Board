# ADR-1053: Peer display names ride presence

**Status**: implemented (v1.8.076)
**Context**: ADR-1048 P3-b — avatars and cursor markers identified peers only by a 2-letter
abbreviation of a random `peerId`; nobody could tell *who* is editing.

## Decision

Carry an `n` (name) field on the existing presence messages
(`ping` / `cursor` / `selection`), not on a new op kind:

- **Ephemeral like the carrier.** Presence is already latest-wins, non-persisted,
  throttled and reaped — the name inherits exactly the semantics that fit a display
  name. No `wclock`, no `seenOps`, no undo, no doc bytes.
- **Wire shape**: `_nm()` returns `{n}` or `null` and is spread into
  `_mk('ping'|'cursor'|'selection', …)` — absent when the user set no name.
- **Intake**: `_nIn(row, msg)` writes `row.n = trim(msg.n).slice(0,24) || undefined`
  — bounded at 24 chars, empty clears, non-strings ignored. It runs after the same
  row-creation gates the carrier already has (`_touchPeer` on `ping`, the
  viaRtc-resurrect/enrich gates on `cursor`/`selection`), so forged rows get no
  new surface.
- **Storage**: the user's own name lives in `localStorage board.name`
  (best-effort, like `board.theme`/`board.peer`), read through `_pnm()` which
  swallows storage errors.
- **UX**: the self avatar is now clickable — `prompt(t('peerName'), current)`,
  persisting and immediately re-broadcasting a `ping` so peers see the change
  within one heartbeat. Remote avatars prefix the tooltip with `n ·`, and
  `drawPeerCursors` paints `p.n` beside the marker in the peer's color.

## Why not

- **An op with LWW** — a name is not doc state; persisting it into `wclock` would
  leak presence into the op-log, survive room switches wrongly, and cost a clock
  slot per peer forever. Presence already re-broadcasts continuously, so durability
  adds nothing.
- **A dedicated `peer-name` kind** — another kind means another intake gate,
  another lifecycle to keep in sync with row creation/reap. Reusing the carriers
  keeps the surface identical: any message that can create/touch a peer row already
  exists today.
- **`msg.n` on `bye`/`sync-req`/`hello`** — `bye` deletes the row; `hello`/`sync-req`
  are handshake-only and the ping lands the name on the very next heartbeat.

## Consequences

- Wire size: +`"n":"…"` (≤24 chars) on each presence message — trivial against the
  256KiB cap.
- Old peers simply ignore `n` (unknown fields are skipped by envelope handling);
  a name set by a new-version peer is invisible to old ones — acceptable degraded
  mode, no divergence.
- A renamed peer's cursor label updates on the next cursor move/ping; no history
  is kept (ephemeral by design).
- Contract for future presence fields: ephemeral, non-causal data rides the
  carrier (`n`, `h`, `pg`, `cur`), doc state rides ops — never the reverse.
