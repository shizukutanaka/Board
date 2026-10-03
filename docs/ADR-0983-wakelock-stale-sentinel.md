# ADR-0983: Wake-lock sentinels resolving after leave() / supersede are released, never leaked

## Status
Accepted (v1.8.009, round732)

## Context
Audit axis this round: async callbacks that resolve on a later turn applying
captured/stale state. `navigator.wakeLock.request('screen')` returns a
Promise — `_acquireWakeLock` awaited it and then unconditionally assigned
`_wakeLock = sentinel`. Two leak paths followed:

1. `leave()` while the request is pending → `_releaseWakeLock()` sees
   `_wakeLock===null` and does nothing → the sentinel later resolves, gets
   stored, and is never released. The OS keeps the screen awake until the
   tab hides — exactly the user-visible drain the API docs warn about
   (MDN Screen Wake Lock: "you are responsible for releasing the lock").
2. A second `_acquireWakeLock` (enter → visibility re-acquire) while one is
   held overwrites `_wakeLock`, orphaning the first sentinel's handle — the
   browser still holds that lock; we just lost the pointer to release it.

The rest of the sweep was clean: `Persist.save` reads `_sh()`/`_vp()`/
`state.curPg` live at put-time so the mid-await img-GC window is
self-healing via parked refs + imgq (ADR-0835/0840); WebRTC offer/answer
torn reads throw and surface via the click handlers' `catch(e){_e(...)}`;
FileReader/`f.text()`/`img.onload` import cascades stamp `pg` at commit
time — all consistent.

## Decision
Gate the store on `_active`, and always release a superseded sentinel:

```js
async function _acquireWakeLock(){
  if(!navigator.wakeLock)return;
  try{const l=await navigator.wakeLock.request('screen'),o=_wakeLock;
    _active?_wakeLock=l:l.release().catch(()=>{});o&&o.release().catch(()=>{})}catch(_){}
}
```

Resolving while `_active` is false releases the incoming sentinel instead
of storing it; resolving while a sentinel is already held releases the old
one (a no-op when `o` was already released — `release()` is idempotent).

## Consequences
The screen is never left awake by a sentinel nobody can reach, and a
wake-lock at most one generation old is held at any time. Behavioural pins:
acquire-while-active stores; acquire resolving after `_active` went false
releases instead of storing; a second acquire releases the superseded
sentinel exactly once and `_releaseWakeLock` still releases the held one
(3 asserts + the existing pin made non-vacuous with `_setTestState(true)`).
