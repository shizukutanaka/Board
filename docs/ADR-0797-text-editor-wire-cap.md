# ADR-0797: Cap the text editor at the wire's text bound

- Status: Accepted (2026-09-28, v1.7.823)

## Background

`validPatch` rejects `text` props over 5,000 chars — the wire bound. But
`openTextEditor`'s `<textarea>` had no `maxLength`, so a user could paste or
type beyond 5,000. The blur commit then wrote the oversized text locally and
`_syncTextFinalize` broadcast `upd:{text:…}` that every peer dropped — the
local board kept text the peers never applied (divergence, invisible to the
author).

## Decision

`ta.maxLength=5000` — the same idiom as the label editor (`maxLength=80`) and
the doc-name input (`maxlength=80`): user input is bounded at the control, so
local state can never express a value the wire would reject.

## Consequences

- Text edits stay within the bound peers enforce; no silent divergence.
- All user-text producers now cap at or below their wire bounds: text 5000
  (was ∞), label 80 (≤600), link 500 + scheme check (≤600 + `https?:`),
  docName 80, pageName 80.
