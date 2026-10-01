# ADR-0904 — Gate persisted boot values before use

## Status

Accepted — two unvalidated localStorage reads are gated at module init.

## Context

`localStorage` is user-writable and survives every deploy: any value read at
module scope must be treated as untrusted input, the same posture the wire
intake gates already take (ADR-0777+). Two reads were unvalidated:

1. **`board.peer` → `PEER_ID`.** Read verbatim at module init; only
   `if(!id)` regenerated. A stored value of arbitrary length or shape flowed
   into every outbound wire message (`clock.peer`, presence, dedup keys,
   `Net._imgSent`/`_pk` routing). Consequences of a corrupted or hand-edited
   entry: every op bloated by the id's length, and a `'rtc:'`-prefixed id
   makes this peer's own messages collide with the ADR-0827 rtc:/BC
   provenance split.

2. **`board.theme` → `_themeCache`.** Read verbatim into the in-memory theme
   mode; any stored string landed in `documentElement.dataset.theme` at boot
   (cosmetic only — CSS matches nothing — but also returned by
   `UI._themeMode()`). A garbage value collapses to auto on the first
   toggle, so severity is low; gating keeps the three-state contract exact.

## Decision

- `board.peer`: regenerate unless the value matches
  `/^[a-z0-9-]{8,64}$/i` — accepts both `uid()` formats (32-hex UUIDv4,
  base36 fallback) plus legacy hyphenated ids, rejects `:`-prefixed and
  oversized values.
- `board.theme`: accept only `'light'|'dark'`; anything else becomes `null`
  (auto) — same fix point as the `_themeCache` initializer, so the cached
  mode is born valid.

## Verification

- `board.lang` (`LANG` init): already gated to `'ja'|'en'`.
- `board.minimap`: `!=='off'` is a boolean-typed read — any garbage means
  "on", which is the safe default. No change.
- IDB doc record (`docName`): `_s80` bounds at the `_docN` gate.
- No other `localStorage` reads exist (`_lg` audit complete).

## Pins (test.mjs)

Source pins on both gate expressions (module-scope initializers cannot be
re-run inside the harness).

## References

ADR-0012 (theme), ADR-0827 (rtc: provenance), ADR-0775+ (wire intake posture).
