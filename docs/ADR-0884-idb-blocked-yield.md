# ADR-0884 — IndexedDB blocked-open / versionchange yield

## Status
Accepted, v1.7.910

## Context
`main()` awaits `Persist.open()` before everything that makes the app live —
restore prompt, share-link import, `Net.init`, and the `_rAF(frame)` render
loop. `indexedDB.open(name, ver)` stays *pending forever* (never errors) when
another tab holds the same database open at an older version. Stale tabs like
this are routine on iOS (frozen background tabs) and after SW updates. The new
tab therefore painted the shell but never reached the render loop: a silent
boot hang with no canvas and no feedback.

The mirror-image hazard exists too: this tab, once upgraded and holding the
connection, can block a *newer* tab's upgrade forever, because there was no
`onversionchange` handler to yield the connection.

## Decision

```js
r.onblocked  = () => { _oT('saveBlocked'); res() };                    // proceed in-memory
r.onsuccess  = () => { this.db = r.result;
                       this.db.onversionchange = () => { try{this.db.close()}catch(_){}
                                                        this.db=null };
                       res() };                                       // yield on upgrade
r.onerror    = () => rej(r.error);
```

- **Blocked → resolve in-memory.** Every `Persist` method already early-returns
  on `!this.db`, so the board runs fully in-memory; the user is told once via
  the `saveBlocked` toast that this session won't persist.
- **`onversionchange` → close + null.** When another tab requests a newer
  version, this tab releases its connection so the upgrade isn't wedged; saves
  on this tab then no-op safely instead of writing to a stale connection.

## Consequences
Boot can no longer hang on a cross-tab version hold; upgrades between tabs
cooperate instead of deadlocking. Cost: a tab that yields mid-session silently
stops persisting — acceptable: its data is already committed up to the last
flush, and the newer tab takes over the durable record.
