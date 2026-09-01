#!/usr/bin/env node
// offline-browser.mjs — prove the OFFLINE pillar in a REAL browser, over a REAL http origin.
//
// WHY THIS EXISTS
//
// "Works offline" is one of the three winning conditions in CLAUDE.md, and it was false in
// every browser for the entire life of the product. index.html built its service worker as
// a string, wrapped it in a Blob, and registered the blob: URL:
//
//     navigator.serviceWorker.register(URL.createObjectURL(bl)).catch(()=>{});
//
// The Service Workers spec's Register algorithm only accepts http(s) script URLs. Chrome
// rejects a blob: registration outright — measured 2026-08-31 in this very harness:
//
//     REJECTED: The URL protocol of the script ('blob:http://127.0.0.1:.../...')
//               is not supported.
//
// and `.catch(()=>{})` swallowed it. `getRegistration()` returned NONE. Nothing was ever
// cached; a second visit without network showed the browser's offline error page.
//
// Four separate checks in test.mjs claimed to cover this. Every one of them was a regex over
// index.html: `caches.open(` appears, `serviceWorker.*register` appears, `k!==C` appears.
// All true. All green. All measuring that the CODE EXISTS, not that it RUNS. That is the
// same failure mode a11y-browser.mjs was written for, so this file is its sibling: it checks
// the RESULT, in a real browser, over a real origin.
//
// a11y-browser.mjs loads index.html over file://, where `serviceWorker` is absent entirely —
// so no existing harness could have caught this. This one serves over http on localhost.
//
// Zero dependencies: Chromium driven over CDP via Node's built-in WebSocket, plus a
// throwaway node:http server. No Playwright, no npm install.
//
//   node offline-browser.mjs          # assert; non-zero exit on failure
//
// If no browser is present the script SKIPS with exit 0 — a machine without Chromium must
// not turn into a red build — but it says so loudly rather than looking green.

import { spawn } from 'node:child_process';
import { createServer } from 'node:http';
import { existsSync, mkdtempSync, rmSync, readdirSync, readFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

/* ---------- locate a browser (same resolution order as a11y-browser.mjs) ------------ */

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

/* ---------- minimal CDP client ------------------------------------------------------ */

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

/* ---------- assertions -------------------------------------------------------------- */

let pass = 0; const failures = [];
const ok = (cond, msg) => { cond ? (pass++, console.log(`  ✓ ${msg}`)) : failures.push(msg); };

/* ---------- a throwaway origin ------------------------------------------------------ */

// `serveSw` decides whether ./sw.js exists on this origin. That switch is the point: sw.js
// is OPTIONAL, and a host that ships index.html alone must still work perfectly.
function startOrigin({ serveSw }) {
  const html = readFileSync('./index.html');
  const sw = readFileSync('./sw.js');
  let offline = false;                       // flipped to simulate the server going away
  const srv = createServer((req, res) => {
    const path = (req.url || '/').split('?')[0];
    if (offline) { req.socket.destroy(); return; }   // hard failure, like a dead network
    if (path === '/sw.js') {
      if (!serveSw) { res.writeHead(404).end('not found'); return; }
      res.writeHead(200, { 'content-type': 'text/javascript', 'cache-control': 'no-cache' });
      res.end(sw); return;
    }
    res.writeHead(200, { 'content-type': 'text/html; charset=utf-8', 'cache-control': 'no-cache' });
    res.end(html);
  });
  return new Promise(resolve => srv.listen(0, '127.0.0.1', () =>
    resolve({ srv, port: srv.address().port, goOffline: () => { offline = true; } })));
}

/* ---------- main -------------------------------------------------------------------- */

const chrome = findChrome();
if (!chrome) {
  console.log('offline-browser: SKIPPED — no Chromium/Chrome found.');
  console.log('  This check needs a real browser and a real http origin: a service worker');
  console.log('  cannot register over file://, which is why no other harness covers it.');
  console.log('  Set PLAYWRIGHT_BROWSERS_PATH or install Chromium, then re-run.');
  process.exit(0);
}

const profile = mkdtempSync(join(tmpdir(), 'board-offline-'));
const port = 9200 + Math.floor(process.pid % 700);
const proc = spawn(chrome, [
  '--headless=new', '--no-sandbox', '--disable-gpu', '--disable-dev-shm-usage',
  '--window-size=1280,900', `--remote-debugging-port=${port}`, `--user-data-dir=${profile}`,
  '--no-first-run', '--no-default-browser-check', '--disable-extensions',
  'about:blank',
], { stdio: 'ignore' });

let code = 0;
let origin = null;
try {
  const version = await getJSON(`http://127.0.0.1:${port}/json/version`);
  console.log(`offline-browser: ${version.Browser}\n`);

  const connect = async url => {
    const t = await getJSON(`http://127.0.0.1:${port}/json/new?${encodeURIComponent(url)}`)
      .catch(async () => {
        // /json/new is PUT-only on newer builds; fall back to reusing the blank tab.
        const r = await fetch(`http://127.0.0.1:${port}/json/new?${encodeURIComponent(url)}`, { method: 'PUT' });
        return await r.json();
      });
    const ws = new WebSocket(t.webSocketDebuggerUrl);
    await new Promise((res, rej) => { ws.addEventListener('open', res); ws.addEventListener('error', rej); });
    const cdp = new CDP(ws);
    await cdp.send('Runtime.enable');
    await cdp.send('Page.enable');
    const evaluate = async expr => {
      const r = await cdp.send('Runtime.evaluate', { expression: expr, awaitPromise: true, returnByValue: true });
      if (r.exceptionDetails) throw new Error(r.exceptionDetails.exception?.description || expr);
      return r.result.value;
    };
    return { cdp, evaluate, targetId: t.id };
  };

  /* === Part 1: an origin that ships sw.js — offline must work ====================== */

  origin = await startOrigin({ serveSw: true });
  const url = `http://127.0.0.1:${origin.port}/`;
  console.log(`  origin (with sw.js): ${url}`);

  const { cdp, evaluate } = await connect(url);

  // Wait for boot AND for the SW to reach "activated". register() resolves before the
  // worker activates, so poll the registration rather than sleeping a magic number.
  let ready = false;
  for (let i = 0; i < 60 && !ready; i++) {
    ready = await evaluate(`(async () => {
      const r = await navigator.serviceWorker.getRegistration();
      return !!(r && r.active && r.active.state === 'activated');
    })()`).catch(() => false);
    if (!ready) await sleep(250);
  }

  ok(ready, 'the service worker actually REGISTERS and reaches "activated" over http (the blob: version never did)');

  const scriptURL = await evaluate(
    `navigator.serviceWorker.getRegistration().then(r => (r && r.active) ? r.active.scriptURL : '')`);
  ok(/\/sw\.js$/.test(scriptURL), `it registered the real sibling file (${scriptURL || 'none'})`);
  ok(!String(scriptURL).startsWith('blob:'), 'the script URL is not a blob: (Chrome rejects those outright)');

  // The first visit must not claim "app updated" — clients.claim() fires controllerchange
  // on a first install too, and an unguarded listener toasts to a first-time visitor.
  const firstVisitToast = await evaluate(
    `Array.from(document.querySelectorAll('#toast, .toast, [role="status"]')).map(n => n.textContent.trim()).join('|')`);
  ok(!/更新|updated/i.test(firstVisitToast || ''),
    'a FIRST visit shows no "app updated" toast (clients.claim() fires controllerchange there too)');

  // Take control: the SW controls the page only from the next navigation (claim() helps,
  // but reloading is what a returning visitor actually does).
  await cdp.send('Page.reload', { ignoreCache: false });
  await sleep(1500);
  const controlled = await evaluate(`!!navigator.serviceWorker.controller`);
  ok(controlled, 'after a reload the page is CONTROLLED by the worker (so its fetch handler is live)');

  // === the actual claim: kill the origin, reload, and see the board come back ===
  origin.goOffline();
  await cdp.send('Network.enable');
  await cdp.send('Network.emulateNetworkConditions',
    { offline: true, latency: 0, downloadThroughput: -1, uploadThroughput: -1 });

  await cdp.send('Page.reload', { ignoreCache: false });
  await sleep(2500);

  const offlineState = await evaluate(`(() => ({
    title: document.title || '',
    canvas: !!document.querySelector('canvas#c'),
    toolbarButtons: document.querySelectorAll('button').length,
    mirror: !!document.getElementById('srMirror'),
  }))()`).catch(() => null);

  ok(offlineState !== null, 'with the network DOWN the document still loads (served from the SW cache)');
  ok(!!offlineState && /Board/i.test(offlineState.title),
    `the cached document is Board itself, not an error page (title: ${offlineState?.title ?? 'n/a'})`);
  ok(!!offlineState && offlineState.canvas, 'the canvas is present offline — the app booted, it did not merely render HTML');
  ok(!!offlineState && offlineState.toolbarButtons > 20,
    `the full UI came back offline (${offlineState?.toolbarButtons ?? 0} buttons)`);
  ok(!!offlineState && offlineState.mirror, 'the a11y mirror is present offline too (ADR-0016 survives the cache path)');

  // Offline equivalence is the actual promise: not "it loads" but "you can still draw".
  // Driven through REAL browser input (Input.dispatchMouseEvent), the same way
  // a11y-browser.mjs does it — synthetic DOM events would prove less than the real pipeline.
  const key = async (k, opts = {}) => {
    const base = { key: k, code: opts.code || k, windowsVirtualKeyCode: opts.vk,
                   nativeVirtualKeyCode: opts.vk, modifiers: opts.modifiers || 0, text: opts.text };
    await cdp.send('Input.dispatchKeyEvent', { type: opts.text ? 'keyDown' : 'rawKeyDown', ...base });
    await cdp.send('Input.dispatchKeyEvent', { type: 'keyUp', ...base });
  };
  const mouse = async (type, x, y) => cdp.send('Input.dispatchMouseEvent', {
    type, x, y, button: 'left', buttons: type === 'mouseReleased' ? 0 : 1, clickCount: 1 });

  await evaluate(`document.getElementById('c').focus()`);
  await key('r', { code: 'KeyR', vk: 82, text: 'r' });
  await mouse('mousePressed', 300, 320);
  await mouse('mouseMoved',   440, 420);
  await mouse('mouseReleased', 440, 420);
  await sleep(1200);                                  // mirror is debounced (SR_MIRROR_DEBOUNCE)
  const drewOffline = await evaluate(`document.querySelectorAll("#srMirrorList li").length`).catch(() => -1);
  ok(drewOffline > 0, `a shape can still be DRAWN while offline (${drewOffline} item(s) in the mirror) — "offline-EQUIVALENT", not merely "offline-loads"`);

  await cdp.send('Network.emulateNetworkConditions',
    { offline: false, latency: 0, downloadThroughput: -1, uploadThroughput: -1 });
  origin.srv.close(); origin = null;

  /* === Part 2: an origin WITHOUT sw.js — index.html must still work ================ */

  const bare = await startOrigin({ serveSw: false });
  origin = bare;
  const bareUrl = `http://127.0.0.1:${bare.port}/`;
  console.log(`\n  origin (no sw.js): ${bareUrl}`);

  const solo = await connect(bareUrl);
  await sleep(2000);
  const soloState = await solo.evaluate(`(() => ({
    canvas: !!document.querySelector('canvas#c'),
    buttons: document.querySelectorAll('button').length,
  }))()`).catch(() => null);

  ok(!!soloState && soloState.canvas && soloState.buttons > 20,
    'index.html served ALONE still boots completely — sw.js is genuinely optional, the single-file promise holds');

  const soloErrors = await solo.evaluate(`window.__boardErrors ? window.__boardErrors.length : 0`).catch(() => 0);
  ok(soloErrors === 0, 'a missing sw.js produces no unhandled error (the rejected register() is caught)');

  bare.srv.close(); origin = null;

} catch (e) {
  failures.push(`harness error: ${e.message}`);
} finally {
  try { origin?.srv.close(); } catch {}
  proc.kill('SIGKILL');
  try { rmSync(profile, { recursive: true, force: true }); } catch {}
}

console.log('');
if (failures.length) {
  for (const f of failures) console.log(`  ✗ ${f}`);
  console.log(`\n✗ ${failures.length} offline check(s) failed (${pass} passed).`);
  code = 1;
} else {
  console.log(`✓ ${pass} checks passed against a REAL browser over a REAL http origin.`);
  console.log('  The offline pillar is now verified by RESULT, not by a regex over the source.');
}
process.exit(code);
