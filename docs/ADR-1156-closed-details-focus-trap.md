# ADR-1156: closed-`<details>` children are excluded from the focus trap

Status: accepted (v1.8.180)

## Context

ADR-1150..1155 built the overlay focus contract: every modal/overlay captures its invoker,
traps Tab inside, and restores focus on close. The trap is driven by two functions:

- `_focusables(root)` — enumerates `button,[href],input,select,textarea,summary,[tabindex]`
  under the dialog and filters `!disabled && !hidden`.
- `_trapStep(items, active, back)` — pure wrap step; returns the element to focus or
  `null` to let the native Tab proceed (middle-of-list case).

The `#share` dialog contains `<details class="share-details">` (the WebRTC peer section),
**closed by default**, whose body holds `rtcCreateOffer`, `rtcOfferCopyBtn`,
`rtcInviteLinkBtn`, `rtcOffer`, `rtcAnswerIn`, `rtcConnect`, `rtcOfferIn`,
`rtcCreateAnswer`, `rtcAnswerCopyBtn`, `rtcAnswer` — ten controls that are in the DOM,
not `disabled`, not `hidden` — but **not rendered** while the `<details>` is closed.

## Defect

`_focusables` has no closed-`<details>` awareness, so it listed the summary plus all
ten unreachable children. Two live symptoms:

1. **Tab on the `summary` escapes the modal.** The summary is a middle item →
   `_trapStep` returns `null` → native Tab runs — but the browser's own tab order
   skips the unrendered children, so focus walks past the end of the dialog onto
   `<body>` (the dialog is last in document order). The user has left the modal
   without closing it: the trap is breached.

2. **⇧Tab on the first item (`shareClose`) strands permanently.** `_trapStep` wraps
   to `items[last]` = `rtcAnswer`, inside the closed details. `el.focus()` on an
   unrendered element is a no-op — `activeElement` never leaves `shareClose`, and
   every subsequent ⇧Tab repeats the same dead wrap.

## Fix

`_focusables` now drops any element whose ancestor matches `details:not([open])`,
except the `<summary>` of that details (which is rendered and tabbable):

```js
.filter(el=>{if(el.disabled||el.hidden)return false;
  const d=el.closest?.('details:not([open])');
  return !d||el===_qs(d,'summary');});
```

Consequences:

- Every wrap sentinel and every `null`-middle step now lands on a rendered,
  focusable element — the two symptom paths are closed at the source.
- Toggling the details open while the dialog is up re-enumerates on the next Tab
  (the list is recomputed per keydown), so an open peer section regains its ten
  controls in the trap with no extra wiring.

## Pins (test.mjs, 8 asserts)

- Source: `closest('details:not([open])')` present; `el===_qs(d,'summary')` keeps the summary.
- Behavioural: a stub dialog tree — closed details children are dropped, the summary
  is kept; forward wrap lands on the first item, backward wrap lands on a rendered item;
  an open details keeps its children listed.
