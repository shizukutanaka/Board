# ADR-1004 — SR announce channel / aria-live audit (clean)

## Status
Accepted — audit complete, no defect. Contract pinned in test.mjs (8 asserts).

## Question
`_ann(msg)` is the app's only screen-reader narration channel (aria-live=polite).
Under burst conditions (op batches, held-key repeats, per-frame callers) do
announcements get lost, does a stale/undefined string leak into the live region,
and do all `t()` keys actually resolve in both locales?

## Audit table

| Path | Verdict |
| --- | --- |
| `UI.announce(msg)` | Clean — writes `#sr.textContent`, toggles a trailing space when the same message repeats (`el.textContent===msg?msg+' ':msg`) so identical consecutive messages still announce — the canonical aria-live repeat idiom |
| `#sr` region | Clean — `aria-live="polite"` off-screen 1px region; `textContent` whole-replace = the region's entire content changes, so polite delivery is correct (assertive would rudely interrupt) |
| Burst writes | Clean by spec — polite regions deliver changes in order and coalesce rapid writes; last-wins on same-tick overwrite is the expected SR semantics, not a bug. There is no `_ann` caller inside `draw()`/per-frame loops — all callers are event-bound (gesture end, key press, peer change, presentation transitions) |
| `_announceSel` | Clean — routes selection narration through `_tst` (the `#toasts` stack, a second polite live region) capped at 4 and dedup'd (ADR-0389/0879) so spam can't accumulate |
| `t()` resolution | Clean — `t=k=>T[k]||I18N.en[k]||k` never yields `undefined`; ja/en dicts are key-symmetric and the ADR-0335 harness guard pins every `t('key')` call site resolving in both locales |
| `T.k[tool]` | Clean — tool-name dict exists in both locales with a raw-id fallback |
| `describeShape` announce paths | Clean — callers guard (`_announceSel` only describes when `n===1`; `_mirrorGo` resolves s by live id first) |
| Connection status | Clean — `#sConn` is its own polite region fed by `UI.updateOnline` |

## Conclusion
No defect: the announce channel is a single funnel (`_ann=m=>UI.announce(m)`)
writing a polite live region with correct repeat handling; no undefined string
can reach it; burst semantics are spec-correct.

## Pins
- `<div id="sr" aria-live="polite"` — the SR live region exists
- `_ann=m=>UI.announce(m)` — single announce funnel
- `el.textContent===msg?msg+' ':msg` — repeat-announce space toggle
- `aria-live="polite" aria-atomic="false"` — toast stack second channel
- `k:{select:` — tool-name dict present (both locales share the `k:` table)
- `_ann(_rnd(_vp().zoom*100)+'%')` — discrete-zoom narration
- `_ann(t(n>(Net._pCt|0)?'peerJoined':'peerLeft'))` — peer join/leave narration
- `_tst(n===0?t('selNone')` — selection narration via toast channel
