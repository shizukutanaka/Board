# ADR-0903 — Search-nav reverse first step + mirror resync on toggleLang

## Status

Accepted — two real defects flagged on ADR-0902's audit are fixed with
behavioural pins.

## Context

ADR-0902 recorded the SR mirror/search/announce invariants as verified. Two
edge paths inside that same surface were nonetheless wrong:

1. **Reverse search nav from a fresh query.** `_sqAdvance` resets
   `_sqNav.idx` to `-1` whenever the query changes so the first Enter starts
   at match 0. The wrap arithmetic `(_sqNav.idx+dir+n)%n` works for dir=+1
   (`-1+1=0`) but for dir=-1 yields `(-1-1+n)%n = n-2` — the first ⇧Enter on
   a fresh query skips the last match and lands on the second-to-last.
   (JS `%` is signed, so the formula only wraps indices that start ≥0.)

2. **DOM mirror survives a language toggle.** `_mirrorSync` rebuilds only
   when `_gridVer` changes (`_mirrorVer` guard) — its per-row
   `describeShape(s)` + `t('tagHidden')` text is baked at build time.
   `UI.toggleLang` resyncs every other creation-time cache (sq placeholder,
   canvas aria, help, peers) but left the mirror untouched, so an en→ja
   toggle kept announcing "Rectangle"/"hidden" until the next shape edit.

## Decision

1. `_sqAdvance`: when `idx<0 && dir<0`, seed `idx=n` before applying dir —
   "one past the end" so the modulo lands on `n-1`. Forward direction keeps
   the existing reset semantics.
2. `UI.toggleLang`: append `_mirrorVer=-1; _mirrorSync();` after
   `UI.refreshPeers()` — invalidating the cache version forces a rebuild in
   the new language on the same call. This completes the resync contract
   documented at the `describes...resync done in toggleLang()` comment:
   every UI surface that caches localized text is refreshed in-place.

## Behavioural pins (test.mjs)

- Reverse nav: 1-match stays; fresh 3-match query `dir=-1` lands on the last
  match, walks back one step at a time, and wraps to the last.
- Mirror/lang: stub `shapeMirrorList` + `peerStack`, build one rect row in
  English, `UI.toggleLang()` → label rebuilt as 矩形, second toggle → back
  to Rectangle.

## Consequences

- Net size: ~+69B of logic, offset by merging the severed announce comment
  (~-85B) → file stays under the raw ceiling.
- `_mirrorSync` is a no-op on non-mirror DOM (test/stub path returns early
  when `#shapeMirrorList` is absent — verified: `if(!ul)return` guard).

## References

ADR-0041 (DOM mirror), ADR-0048 (`_sqMatches`), ADR-0902 (the audit that
recorded these surfaces), Devin Review on PR #663 (flagged both defects).
