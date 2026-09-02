#!/usr/bin/env node
// sync-browser.mjs — prove the SYNC pillar between two REAL tabs of a REAL browser.
//
// WHY THIS EXISTS
//
// test.mjs has extensive two-peer tests — but every one of them wires two eval'd copies of
// index.html together through a fake channel the harness controls. That proves the op-log
// converges. It does not prove that a second tab, opened by a real user on a real origin,
// ever receives anything: BroadcastChannel, IndexedDB hand-off at boot, the RAF-driven
// redraw, and the a11y mirror all sit OUTSIDE the fake.
//
// The offline pillar had four green checks and was dead in every browser (ADR-0018). The
// sync pillar had many more green checks and had never once been observed in a browser.
// Same shape of blind spot; this file closes it the same way offline-browser.mjs did.
//
// What is asserted, end-to-end through real input events (Input.dispatch*):
//   1. Tab B, opened after tab A drew, boots with A's shape (IndexedDB hand-off).
//   2. A draws  → B sees it        (BroadcastChannel, live).
//   3. A undoes → B sees it vanish (ADR-0015: undo is a REPLICATED op — before that fix,
//                                   every Ctrl+Z diverged the two boards silently).
//   4. B draws  → A sees it        (the channel is symmetric, not a one-way feed).
//
// A FIXTURE LESSON, paid for while writing this: a background tab does not run
// requestAnimationFrame, and Board's redraw AND a11y mirror both ride frame(). So a hidden
// tab's `state.shapes` grows while its mirror stays stale — which looks exactly like a
// sync bug and is not one. Every read below is preceded by Page.bringToFront. The first
// draft of this harness "found" a phantom defect for precisely this reason.
//
// Zero dependencies, same as its siblings. SKIPS with exit 0 when no browser is present.
//
//   node sync-browser.mjs

import { spawn } from 'node:child_process';
import { createServer } from 'node:http';
import { existsSync, mkdtempSync, rmSync, readdirSync, readFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

function findChrome() {
  const roots = [process.env.PLAYWRIGHT_BROWSERS_PATH, '/opt/pw-browsers'].filter(Boolean);
  for (const root of roots) {
    if (!existsSync(root)) continue;
    for (const d of readdirSync(root)) {
      for (const rel of ['chrome-linux/chrome', 'chrome-linux64/chrome',
                         'chrome-mac/Chromium.app/Contents/MacOS/Chromium']) {
        const p = join(root, d, rel);
        if (existsSync(p)) return p;
      }
    }
  }
  for (const p of ['/usr/bin/chromium', '/usr/bin/chromium-browser', '/usr/bin/google-chrome',
                   '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome']) {
    if (existsSync(p)) return p;
  }
  return null;
}

class CDP {
  constructor(ws) {
    this.ws = ws; this.id = 0; this.pending = new Map();
    ws.addEventListener('message', ev => {
      const m = JSON.parse(ev.data);
      if (m.id && this.pending.has(m.id)) {
        const { resolve, reject } = this.pending.get(m.id); this.pending.delete(m.id);
        m.error ? reject(new Error(m.error.message)) : resolve(m.result);
      }
    });
  }
  send(method, params = {}) {
    const id = ++this.id;
    return new Promise((resolve, reject) => {
      this.pending.set(id, { resolve, reject });
      this.ws.send(JSON.stringify({ id, method, params }));
      setTimeout(() => { if (this.pending.delete(id)) reject(new Error(`CDP timeout: ${method}`)); }, 30000);
    });
  }
}

const sleep = ms => new Promise(r => setTimeout(r, ms));
async function getJSON(url, tries = 60) {
  for (let i = 0; i < tries; i++) {
    try { const r = await fetch(url); if (r.ok) return await r.json(); } catch {}
    await sleep(250);
  }
  throw new Error(`browser never answered ${url}`);
}

let pass = 0; const failures = [];
const ok = (cond, msg) => { cond ? (pass++, console.log(`  ✓ ${msg}`)) : failures.push(msg); };

const chrome = findChrome();
if (!chrome) {
  console.log('sync-browser: SKIPPED — no Chromium/Chrome found.');
  console.log('  This check needs two real tabs on one real origin: BroadcastChannel and');
  console.log('  IndexedDB hand-off cannot be observed from the eval\'d harness.');
  process.exit(0);
}

const html = readFileSync('./index.html');
const srv = createServer((req, res) => {
  res.writeHead(200, { 'content-type': 'text/html; charset=utf-8', 'cache-control': 'no-cache' });
  res.end(html);
});
await new Promise(r => srv.listen(0, '127.0.0.1', r));
const url = `http://127.0.0.1:${srv.address().port}/`;

const profile = mkdtempSync(join(tmpdir(), 'board-sync-'));
const port = 9900 + Math.floor(process.pid % 90);
const proc = spawn(chrome, [
  '--headless=new', '--no-sandbox', '--disable-gpu', '--disable-dev-shm-usage',
  '--window-size=1280,900', `--remote-debugging-port=${port}`, `--user-data-dir=${profile}`,
  '--no-first-run', '--no-default-browser-check', '--disable-extensions', 'about:blank',
], { stdio: 'ignore' });

let code = 0;
try {
  const version = await getJSON(`http://127.0.0.1:${port}/json/version`);
  console.log(`sync-browser: ${version.Browser}`);
  console.log(`  origin: ${url}\n`);

  const openTab = async () => {
    const t = await (await fetch(`http://127.0.0.1:${port}/json/new?${encodeURIComponent(url)}`, { method: 'PUT' })).json();
    const ws = new WebSocket(t.webSocketDebuggerUrl);
    await new Promise((res, rej) => { ws.addEventListener('open', res); ws.addEventListener('error', rej); });
    const cdp = new CDP(ws);
    await cdp.send('Runtime.enable'); await cdp.send('Page.enable');
    const evaluate = async expr => {
      const r = await cdp.send('Runtime.evaluate', { expression: expr, awaitPromise: true, returnByValue: true });
      if (r.exceptionDetails) throw new Error(r.exceptionDetails.exception?.description || expr);
      return r.result.value;
    };
    const key = async (k, opts = {}) => {
      const base = { key: k, code: opts.code || k, windowsVirtualKeyCode: opts.vk,
                     nativeVirtualKeyCode: opts.vk, modifiers: opts.modifiers || 0, text: opts.text };
      await cdp.send('Input.dispatchKeyEvent', { type: opts.text ? 'keyDown' : 'rawKeyDown', ...base });
      await cdp.send('Input.dispatchKeyEvent', { type: 'keyUp', ...base });
    };
    const mouse = (type, x, y) => cdp.send('Input.dispatchMouseEvent', {
      type, x, y, button: 'left', buttons: type === 'mouseReleased' ? 0 : 1, clickCount: 1 });
    const front = () => cdp.send('Page.bringToFront');
    const drawRect = async (x, y) => {
      await front();
      await evaluate(`document.getElementById('c').focus()`);
      await key('r', { code: 'KeyR', vk: 82, text: 'r' });
      await mouse('mousePressed', x, y); await mouse('mouseMoved', x + 140, y + 100); await mouse('mouseReleased', x + 140, y + 100);
    };
    // Read only while VISIBLE — see the fixture lesson in the header.
    const mirror = async () => { await front(); await sleep(900); return evaluate(`document.querySelectorAll("#srMirrorList li").length`); };
    const shapes = () => evaluate(`state.shapes.length`);
    const peerId = () => evaluate(`state.peerId`);
    const reload = async () => { await cdp.send('Page.reload'); await sleep(2500); };
    return { cdp, evaluate, key, mouse, front, drawRect, mirror, shapes, peerId, reload };
  };

  const A = await openTab();
  await sleep(2000);
  await A.drawRect(300, 320);
  await sleep(1200);                                   // > SAVE_DEBOUNCE so IDB has it
  ok(await A.mirror() === 1, 'tab A drew one shape (through real input)');

  /* 1. IndexedDB hand-off at boot */
  const B = await openTab();
  await sleep(2500);
  ok(await B.mirror() === 1, 'tab B, opened afterwards on the same origin, BOOTS with A\'s shape (IndexedDB hand-off)');

  // ADR-0019 root cause. The CRDT dedup key is `clock.peer + ':' + clock.seq`; it is unique
  // only while the id is unique PER REPLICA. Two tabs are two replicas — each counts seq
  // from 0 — so a per-browser id (the old localStorage['board.peer']) guaranteed a
  // collision on the very first op of the second tab.
  const [idA, idB] = [await A.peerId(), await B.peerId()];
  ok(idA && idB && idA !== idB,
    `the two tabs are DISTINCT replicas (${String(idA).slice(0, 8)}… vs ${String(idB).slice(0, 8)}…) — a shared id makes peer:seq collide and silently discards one tab's work`);

  /* 2. live BroadcastChannel, A → B */
  await A.drawRect(600, 320);
  await sleep(600);
  ok(await A.shapes() === 2, 'A now holds 2 shapes locally');
  ok(await B.mirror() === 2, 'B received A\'s new shape LIVE over BroadcastChannel (no reload)');

  /* 3. ADR-0015 — undo is replicated, not local */
  await A.front();
  await A.evaluate(`document.getElementById('c').focus()`);
  await A.key('z', { code: 'KeyZ', vk: 90, modifiers: 2 });   // Ctrl+Z
  await sleep(600);
  ok(await A.shapes() === 1, 'A undid its last shape (Ctrl+Z through the real dispatcher)');
  ok(await B.mirror() === 1, 'B saw the shape VANISH — undo is a replicated op (ADR-0015; before it, every Ctrl+Z silently diverged the two boards)');

  /* 4. symmetry, B → A */
  await B.drawRect(300, 560);
  await sleep(600);
  ok(await B.shapes() === 2, 'B drew a shape of its own');
  ok(await A.mirror() === 2, 'A received B\'s shape — the channel is symmetric, not a one-way feed');

  /* 5. a reloaded tab is a NEW replica — its seq restarts at 0, so a persisted id would
        collide with the ops the other tab still remembers in seenOps. This is the same
        defect with one tab instead of two, and it bit WebRTC pairs too. */
  await A.reload();
  const idA2 = await A.peerId();
  ok(idA2 && idA2 !== idA, 'a reloaded tab takes a FRESH replica id (its seq restarts at 0, so reusing the old id would collide)');
  await A.drawRect(900, 560);
  await sleep(800);
  ok(await B.mirror() === 3, 'an edit made AFTER a reload still reaches the other tab (the persisted id used to drop these until seq passed its old maximum)');

  /* Both boards agree on content, not just on count */
  const sig = tab => tab.evaluate(`state.shapes.map(s => s.type + '@' + Math.round(s.x) + ',' + Math.round(s.y)).sort().join('|')`);
  const [sa, sb, na, nb] = [await sig(A), await sig(B), await A.shapes(), await B.shapes()];
  ok(sa === sb && sa.length > 0, `both tabs hold IDENTICAL boards (A[${na}]=${sa} vs B[${nb}]=${sb})`);

  /* 6. The WebRTC transport — the cross-machine path — SUCCEEDING.
        FT-20 added feedback for a link that never connects, and test.mjs covers the
        failure wiring, but the path actually WORKING had never been observed in a
        browser: the fake harness stubs RTCPeerConnection outright.

        Transport isolation matters here. Both tabs share a room, so BroadcastChannel
        would carry the op and the assertion would prove nothing. Net.init(room) is not
        reachable from the product UI (main() calls Net.init() with no argument), so
        rather than lean on a path users cannot take, close the BroadcastChannel on both
        sides. Net.broadcast() then has only the DataChannel left. */
  const offer = await A.evaluate(`Net.wrtcCreateOffer()`);
  ok(typeof offer === 'string' && offer.length > 100, `A produced an offer token (${String(offer).length} chars)`);
  const answer = await B.evaluate(`Net.wrtcAcceptOffer(${JSON.stringify(offer)})`);
  ok(typeof answer === 'string' && answer.length > 100, `B answered it (${String(answer).length} chars)`);
  await A.evaluate(`Net.wrtcConsumeAnswer(${JSON.stringify(answer)}).then(()=>'ok',e=>'ERR '+e.message)`);

  let dcOpen = false;
  for (let i = 0; i < 15 && !dcOpen; i++) {
    await sleep(1000);
    dcOpen = await A.evaluate(`(Net.dc&&Net.dc.readyState)==='open'`) &&
             await B.evaluate(`(Net.dc&&Net.dc.readyState)==='open'`);
  }
  ok(dcOpen, 'the manually-signalled WebRTC DataChannel actually OPENS on both sides (no server, no STUN required on loopback)');
  ok(await A.evaluate(`Net.rtc && Net.rtc.connectionState`) === 'connected',
     'RTCPeerConnection reports connectionState "connected" (the state FT-20 watches for failure)');

  // Cut the other transport, so anything that arrives can only have come over WebRTC.
  for (const T of [A, B]) await T.evaluate(`(()=>{try{Net.bc.close()}catch(_){} Net.bc=null; return true})()`);
  const beforeRtc = await B.shapes();
  await A.drawRect(300, 700);
  await sleep(1200);
  const afterRtc = await B.shapes();
  ok(afterRtc === beforeRtc + 1,
     `an op drawn in A reached B over the DataChannel with BroadcastChannel CLOSED (${beforeRtc} → ${afterRtc}) — the cross-machine path works, not just same-browser tabs`);
  ok(String(await A.evaluate(`[...state.peers.keys()].join(',')`)).includes('rtc:'),
     'the WebRTC link is tracked under a synthetic rtc: peer id (ADR-0010 routing)');

} catch (e) {
  failures.push(`harness error: ${e.message}`);
} finally {
  proc.kill('SIGKILL');
  srv.close();
  try { rmSync(profile, { recursive: true, force: true }); } catch {}
}

console.log('');
if (failures.length) {
  for (const f of failures) console.log(`  ✗ ${f}`);
  console.log(`\n✗ ${failures.length} sync check(s) failed (${pass} passed).`);
  code = 1;
} else {
  console.log(`✓ ${pass} checks passed between two REAL tabs of a REAL browser.`);
  console.log('  The sync pillar — including replicated undo — is now verified by RESULT.');
}
process.exit(code);
