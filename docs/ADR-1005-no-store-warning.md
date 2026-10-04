# ADR-1005 — Warn once when persistence is unavailable

## Status
Accepted — implemented (v1.8.031).

## Problem
`Persist.open()` resolves `this.db` on success. Two paths leave it absent:

1. **Hard open error** — `r.onerror` rejects; the boot `catch` only logs
   `console.warn('persist init', err)`. The user gets no signal.
2. **Later loss** — a peer tab's schema upgrade fires `onversionchange`, closes
   `this.db` (ADR-0884), and `this.db=null` sticks.

Every mutator then flows through `save()`, whose first line is
`if(!this.db)return` — a **silent no-op**. The user draws for an hour, closes
the tab, and loses everything with zero notification. This is the exact hazard
class ADR-0884 already surfaced for `onblocked` (`_oT('saveBlocked')`) — the
hard-error and post-close paths lacked parity.

## Decision
- New toast key `noStore` (ja+en) — names the consequence, not the cause:
  'このセッションは永続化されません / this session won't persist'.
- `Persist._dbWarn()` — warn-once flag (`this._dbW`): the 500 ms debounced
  `save()` would otherwise re-toast on every edit.
- `save()` early-return becomes `return this._dbWarn()` — covers db never
  opened AND db closed mid-session, plus `saveBackup`'s sibling path via the
  same first line.
- Boot catch adds `Persist._dbWarn()` — immediate signal at startup, not only
  after the first edit.
- `load()`/`saveBackup`/`restoreBackup`/`getBackup` keep their silent early
  returns — they're internal read/destructive-guard paths; the user-visible
  hazard is edits that don't persist, which `save()` alone owns.

## Consequence
IDB-blocked / private-mode / post-versionchange sessions now surface exactly
one toast explaining the session won't persist — parity with the `saveBlocked`
path; zero toast-storm via `_dbW`.

## Pins
- `_dbWarn(){if(this._dbW)` — warn-once gate
- `if(!this.db)return this._dbWarn()` — save() covers every db-loss path
- `Persist._dbWarn()` — boot-time signal
- `noStore:'保存不可` / `noStore:'No storage` — both locales
- `r.onblocked=()=>{_oT('saveBlocked')` — sibling path unchanged (regression)
