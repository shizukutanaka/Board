# ADR-0815: Guard the share-hash decodeURIComponent

- Status: Accepted (2026-09-28, v1.7.841)

## Decision

`importFromHash`'s `_dU(h.slice(3))` sat outside the try — a malformed
`%` sequence threw a URIError that escaped to the caller (`main()`),
leaving the unreadable `#b=` link pinned in the address bar with no
toast, contradicting ADR-0038's "every reject path toasts and clears".
The decode now lives inside a try whose catch toasts `invalidBoard`,
clears the hash, and returns — same contract as every other reject.
The `#s=` invite path needs no change: its hash is cleared before the
decode, and a silent no-op there is acceptable.
