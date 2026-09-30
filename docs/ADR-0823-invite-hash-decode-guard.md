# ADR-0823: `#s=` invite hash gets `#b=`'s malformed-% toast parity

- Status: Accepted (2026-09-28, v1.7.849)

## Problem

ADR-0815 moved `#b=`'s `decodeURIComponent` inside the try so a
malformed `%` sequence toasts `invalidBoard` and clears the hash
instead of dying silently in `main()`'s catch. The `#s=` invite
path (`inviteFromHash`) kept the same hole: `code=_dU(h.slice(3))`
outside any guard → URIError escapes to `main()`'s silent catch.

Unlike `#b=`, the `#s=` hash is cleared *before* decoding
(`history.replaceState` precedes `_dU`), so nothing stays pinned in
the address bar — the only missing piece was feedback: the user
clicked an invite link and got a silent no-op, contrary to
ADR-0038's "every reject path toasts" contract.

## Fix

Wrap the decode: `try{code=_dU(h.slice(3))}catch{_eT(_IB);return false}`.
Reuses `_IB` (invalidBoard) — the payload is still a board offer;
no new i18n key needed. Hash stays cleared by the existing
replaceState above.

Source-pin added beside the `#b=` pins (test.mjs).
