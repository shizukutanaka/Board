# ADR-0861 — escape the group id in drawio export

## Defect

`_dioCells` emits group wrappers as `<mxCell id="g_${gid}" …>` and member parents as
`parent="g_${_gi(s)}"` — the only remote-derived content in the drawio emitter that did
NOT go through `_dioEsc`. A room peer can mint a shape with `groupId` containing `"` and
markup (wire `group` op bounds it at `≤64` chars; charset unrestricted). Exporting the
board as `.drawio` then writes the raw quote into an XML attribute:

```
groupId = 'x" style="evil'   →   <mxCell id="g_x" style="evil" ...>
```

The file is a stored artifact the victim opens in draw.io — attribute injection lets the
remote attacker author arbitrary `mxCell` attributes (and, past the quote, XML content)
in the exported file. Text/labels/styles/links were already escaped via `nl`/`esc`; the
gid reference was the remaining raw channel.

## Fix

`_dioEsc(gid)` at all four emission sites (one group-cell `id`, three member/edge
`parent` references). Escaping is deterministic and applied symmetrically at the id
definition and every reference, so group containment references stay consistent —
`_dioEsc('x"')` → `x&quot;` everywhere, still one logical group.

## Tests (test.mjs, behavioural)

- `boardToDrawio([rect with groupId='x" style="evil'])` emits `id="g_x&quot;"` and
  `parent="g_x&quot;"`, and contains no raw `g_x"` attribute break.
