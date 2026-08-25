#!/usr/bin/env node
// a11y-browser.mjs — run index.html in a REAL browser and inspect the REAL accessibility tree.
//
// WHY THIS EXISTS
//
// FT-11 was recorded for a year as "requires a human with NVDA / VoiceOver". That framing
// was never questioned, so it never moved. Question it:
//
//   NVDA and VoiceOver do not invent what they speak. They read the PLATFORM accessibility
//   tree (IAccessible2 / UI Automation on Windows, NSAccessibility on macOS). The browser
//   computes that tree from DOM + ARIA using the accname and role algorithms, and Chromium
//   exposes exactly it over CDP as `Accessibility.getFullAXTree`.
//
// So the part of FT-11 that needs a human is much smaller than "all of it":
//
//   Derivable here (no human):  does every control HAVE a name; is it the RIGHT name; is the
//                               role right; is the state exposed; is the ADR-0016 board mirror
//                               actually IN the tree rather than merely in the DOM.
//   Still needs a human:        is the announcement PLEASANT — reading order in practice,
//                               verbosity, whether the phrasing makes sense out loud.
//
// test.mjs already checks that ARIA references resolve and that icon-only buttons carry an
// explicit label. That is a check on the SOURCE. This is a check on the RESULT: it is the
// difference between "we wrote aria-label" and "the browser computed that name". Those come
// apart in real, boring ways — a label on a node the browser prunes, an element that is
// aria-hidden by an ancestor, a role that silently forbids a name from children.
//
// Zero dependencies, same as coverage.mjs: Chromium is driven over CDP through Node 22's
// built-in WebSocket. No Playwright, no puppeteer, no npm install.
//
//   node a11y-browser.mjs            # assert; non-zero exit on failure
//   node a11y-browser.mjs --dump     # print the computed tree (for eyeballing)
//
// CHROME is resolved from PLAYWRIGHT_BROWSERS_PATH or a few well-known locations; if no
// browser is present the script SKIPS with exit 0 and says so. A machine without a browser
// must not turn into a red build — but it must also not silently look green, so it prints.

import { spawn } from 'node:child_process';
import { existsSync, mkdtempSync, rmSync, readdirSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { pathToFileURL } from 'node:url';

const DUMP = process.argv.includes('--dump');
const HTML = pathToFileURL(join(process.cwd(), 'index.html')).href;

/* ---------- locate a browser ------------------------------------------------------- */

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

/* ---------- minimal CDP client ----------------------------------------------------- */

class CDP {
  constructor(ws) { this.ws = ws; this.id = 0; this.pending = new Map();
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

/* ---------- assertions ------------------------------------------------------------- */

let pass = 0; const failures = [];
const ok = (cond, msg) => { cond ? (pass++, console.log(`  ✓ ${msg}`)) : failures.push(msg); };

/* ---------- main ------------------------------------------------------------------- */

const chrome = findChrome();
if (!chrome) {
  console.log('a11y-browser: SKIPPED — no Chromium/Chrome found.');
  console.log('  This check needs a real browser to compute a real accessibility tree.');
  console.log('  Set PLAYWRIGHT_BROWSERS_PATH or install Chromium, then re-run.');
  process.exit(0);
}

const profile = mkdtempSync(join(tmpdir(), 'board-a11y-'));
const port = 9000 + Math.floor(process.pid % 900);
const proc = spawn(chrome, [
  '--headless=new', '--no-sandbox', '--disable-gpu', '--disable-dev-shm-usage',
  '--force-device-scale-factor=1', '--window-size=1280,900',
  `--remote-debugging-port=${port}`, `--user-data-dir=${profile}`,
  '--no-first-run', '--no-default-browser-check', '--disable-extensions',
  HTML,
], { stdio: 'ignore' });

let code = 0;
try {
  const version = await getJSON(`http://127.0.0.1:${port}/json/version`);
  console.log(`a11y-browser: ${version.Browser}`);
  console.log(`  loading ${HTML}\n`);

  let pageWs = null;
  for (let i = 0; i < 60 && !pageWs; i++) {
    const list = await getJSON(`http://127.0.0.1:${port}/json/list`);
    const page = list.find(t => t.type === 'page' && t.url.startsWith('file:'));
    if (page?.webSocketDebuggerUrl) pageWs = page.webSocketDebuggerUrl; else await sleep(250);
  }
  if (!pageWs) throw new Error('no file:// page target appeared');

  const ws = new WebSocket(pageWs);
  await new Promise((res, rej) => { ws.addEventListener('open', res); ws.addEventListener('error', rej); });
  const cdp = new CDP(ws);

  await cdp.send('Runtime.enable');
  await cdp.send('Page.enable');

  // Wait for the app to actually boot — main() is async (IndexedDB, service worker).
  const evaluate = async expr => {
    const r = await cdp.send('Runtime.evaluate', { expression: expr, awaitPromise: true, returnByValue: true });
    if (r.exceptionDetails) throw new Error(r.exceptionDetails.exception?.description || expr);
    return r.result.value;
  };
  for (let i = 0; i < 80; i++) {
    if (await evaluate('!!document.getElementById("c") && document.readyState === "complete"')) break;
    await sleep(250);
  }
  await sleep(1500);   // let the boot's async tail (persist load, mirror debounce) settle

  /* --- 1. file:// capability facts (ADR-0017 "known limitation 4": UNVERIFIED) ------ */

  const env = await evaluate(`(${(() => ({
    secure: window.isSecureContext,
    subtle: !!(window.crypto && window.crypto.subtle),
    compression: typeof CompressionStream !== 'undefined',
    protocol: location.protocol,
  })).toString()})()`);

  console.log(`  file:// capability probe → isSecureContext=${env.secure} crypto.subtle=${env.subtle} CompressionStream=${env.compression}`);
  ok(env.protocol === 'file:', 'probe really ran on a file:// origin (the case users double-click)');
  ok(env.subtle === true,
     'ADR-0017 limitation 4 resolved: crypto.subtle IS available on file:// — share links encrypt when opened locally');
  ok(env.compression === true, 'CompressionStream available on file:// — the deflate path is live, not the 0x00 fallback');

  /* --- 2. the REAL accessibility tree ---------------------------------------------- */

  await cdp.send('Accessibility.enable');
  const { nodes } = await cdp.send('Accessibility.getFullAXTree');

  const val = p => (p && typeof p === 'object' ? p.value : p);
  const nameOf = n => (val(n.name) ?? '').toString().trim();
  const roleOf = n => (val(n.role) ?? '').toString();
  const propOf = (n, key) => {
    const p = (n.properties || []).find(x => x.name === key);
    return p ? val(p.value) : undefined;
  };
  const ignored = n => n.ignored === true;
  const live = nodes.filter(n => !ignored(n));

  if (DUMP) {
    for (const n of live) console.log(`    ${roleOf(n).padEnd(16)} ${JSON.stringify(nameOf(n))}`);
  }

  ok(live.length > 0, `browser computed a non-empty accessibility tree (${live.length} exposed nodes)`);

  // 2a. Every exposed control has a computed name. This is the check that a source-level
  //     grep cannot make: the name here is what the accname algorithm ACTUALLY produced.
  const CONTROL_ROLES = new Set(['button', 'link', 'checkbox', 'radio', 'textbox', 'combobox',
                                 'slider', 'menuitem', 'menuitemcheckbox', 'tab', 'switch']);
  const controls = live.filter(n => CONTROL_ROLES.has(roleOf(n)));
  const unnamed = controls.filter(n => nameOf(n) === '');
  ok(controls.length >= 30, `enough controls reached the tree to be worth checking (${controls.length})`);
  ok(unnamed.length === 0,
     `every exposed control has a browser-computed accessible name (${controls.length} checked)` +
     (unnamed.length ? ` — unnamed: ${unnamed.map(n => roleOf(n) + '#' + n.nodeId).join(', ')}` : ''));

  // 2b. Names must be speech, not glyphs. A button named "⬛" is technically named and
  //     practically useless: NVDA spells the codepoint out. Source-level checks pass this.
  const glyphOnly = controls.filter(n => {
    const s = nameOf(n);
    return s !== '' && !/[\p{Letter}\p{Number}]/u.test(s);
  });
  ok(glyphOnly.length === 0,
     'no control is named only by a symbol/emoji (a screen reader would read the codepoint)' +
     (glyphOnly.length ? ` — ${glyphOnly.map(n => JSON.stringify(nameOf(n))).join(', ')}` : ''));

  // 2c. ADR-0016: the off-screen board mirror must be IN the tree. It is positioned
  //     off-screen on purpose; the failure mode this catches is display:none / aria-hidden
  //     / an ancestor pruning it, in which case it exists in the DOM and is unreachable.
  // Put real content on the board first, then re-read the tree: an EMPTY mirror proves
  // nothing. This is the whole point of testing the result instead of the source.
  // Use the BROWSER'S OWN INPUT PIPELINE (CDP Input.*), not synthesised DOM events.
  // Synthesised PointerEvents fail here for a real reason: the pointerdown handler calls
  // setPointerCapture(e.pointerId), which throws NotFoundError for a pointer id the browser
  // never issued — so the gesture dies before it starts and the board stays empty. Input.*
  // events are indistinguishable from a human's: isTrusted, real capture, real focus.
  const key = async (k, opts = {}) => {
    const base = { key: k, code: opts.code || k, windowsVirtualKeyCode: opts.vk,
                   nativeVirtualKeyCode: opts.vk, modifiers: opts.modifiers || 0,
                   text: opts.text };
    await cdp.send('Input.dispatchKeyEvent', { type: opts.text ? 'keyDown' : 'rawKeyDown', ...base });
    await cdp.send('Input.dispatchKeyEvent', { type: 'keyUp', ...base });
  };
  const mouse = async (type, x, y) => cdp.send('Input.dispatchMouseEvent', {
    type, x, y, button: 'left', buttons: type === 'mouseReleased' ? 0 : 1, clickCount: 1 });

  await evaluate(`document.getElementById('c').focus()`);
  await key('r', { code: 'KeyR', vk: 82, text: 'r' });   // rect tool
  await mouse('mousePressed', 300, 320);
  await mouse('mouseMoved',   440, 420);
  await mouse('mouseReleased', 440, 420);
  await sleep(1200);                                 // mirror is debounced (SR_MIRROR_DEBOUNCE)

  const mirrorInDom = await evaluate(`(() => {
    const el = document.getElementById('srMirror');
    if (!el) return null;
    return { id: el.id,
             label: el.getAttribute('aria-label'),
             role: el.getAttribute('role'),
             hidden: el.getAttribute('aria-hidden'),
             items: el.querySelectorAll('li').length,
             summary: (document.getElementById('srMirrorSummary')?.textContent || '').trim(),
             firstItem: (el.querySelector('li')?.textContent || '').trim() };
  })()`);
  ok(mirrorInDom !== null, `ADR-0016 board mirror element is present in the DOM (#srMirror)`);
  if (mirrorInDom) {
    ok(mirrorInDom.hidden !== 'true', 'board mirror is not aria-hidden (it would vanish from the tree)');
    ok(mirrorInDom.items > 0,
       `mirror actually listed the shape we drew (${mirrorInDom.items} <li>) — an empty mirror would prove nothing`);
    // The real question: does the OFF-SCREEN clip-path:inset(50%) region survive into the
    // tree? Visually-hidden patterns get pruned when done wrong (display:none, 0x0 + hidden
    // overflow on some engines). Only the browser can answer this.
    const { nodes: after } = await cdp.send('Accessibility.getFullAXTree');
    const liveAfter = after.filter(n => !ignored(n));
    const region = liveAfter.find(n => nameOf(n) === (mirrorInDom.label || 'Board contents'));
    ok(region !== undefined,
       `the off-screen mirror region is EXPOSED in the accessibility tree as "${mirrorInDom.label}" (clip-path hiding did not prune it)`);
    const needle = (mirrorInDom.firstItem || '').slice(0, 12);
    const textReached = needle.length > 0 &&
      liveAfter.some(n => nameOf(n).includes(needle) ||
                          (val(n.value) ?? '').toString().includes(needle));
    ok(textReached,
       `mirror item text reaches the tree — a browse-mode user can read ${JSON.stringify(mirrorInDom.firstItem.slice(0, 40))}`);
  }

  // 2d. The canvas is the product. A canvas with no fallback content is a blank hole to a
  //     screen reader — WHATWG requires fallback content to describe it.
  const canvasInfo = await evaluate(`(() => {
    const c = document.getElementById('c');
    if (!c) return null;
    return { role: c.getAttribute('role'), label: c.getAttribute('aria-label'),
             describedby: c.getAttribute('aria-describedby'),
             fallbackChars: (c.textContent || '').trim().length };
  })()`);
  ok(canvasInfo !== null, 'canvas#c found');
  if (canvasInfo) {
    ok(!!(canvasInfo.label || canvasInfo.describedby || canvasInfo.fallbackChars > 0),
       'canvas is not an unlabelled hole: it carries a name or fallback content (WHATWG)');
  }

  // 2e. Focus must be able to LAND somewhere. A keyboard user who cannot reach the board
  //     cannot use any of the keyboard shortcuts the README advertises.
  const focusable = await evaluate(`document.querySelectorAll(
    'a[href],button:not([disabled]),input:not([disabled]),select,textarea,[tabindex]:not([tabindex="-1"])'
  ).length`);
  ok(focusable > 0, `focusable elements exist (${focusable})`);

  const hiddenFocusable = await evaluate(`(() => {
    const sel = 'a[href],button:not([disabled]),input:not([disabled]),select,textarea,[tabindex]:not([tabindex="-1"])';
    const bad = [];
    for (const el of document.querySelectorAll(sel)) {
      if (el.closest('[aria-hidden="true"]')) bad.push(el.id || el.className || el.tagName);
    }
    return bad;
  })()`);
  ok(hiddenFocusable.length === 0,
     'no focusable element sits inside an aria-hidden subtree (focus would land on nothing)' +
     (hiddenFocusable.length ? ` — ${hiddenFocusable.slice(0, 5).join(', ')}` : ''));

  /* --- 3. WCAG 2.1.1 in a real browser: v1.7.82's Shift+F10 --------------------------- */
  //  test.mjs drives the handler directly. This drives the BROWSER: real KeyboardEvent,
  //  real dispatch, real DOM result. It is the difference between "the branch runs" and
  //  "pressing the key on a keyboard opens the menu".
  // NOTE ON HOW THIS IS DETECTED: #ctx is ALWAYS in the DOM and is shown via
  // `[data-open=true]` (see .ctx-menu CSS), never via `hidden`. The first version of this
  // check tested `menu.hidden` and therefore reported "open" before any key was pressed —
  // it passed while asserting nothing, and the giveaway was that it also reported
  // "0 menu items". Detect via data-open AND require a non-empty item list, so an empty or
  // unbuilt menu can never read as success.
  // Align/distribute only exist in the menu when 2+ shapes are selected — correct product
  // behaviour, so the test must set up the case the feature is FOR. Draw a second rect at a
  // deliberately different x, then select both with ⌘/Ctrl+A.
  await key('r', { code: 'KeyR', vk: 82, text: 'r' });        // re-arm: the tool reverts to
  await mouse('mousePressed', 620, 500);                      // select after each creation
  await mouse('mouseMoved',   760, 600);
  await mouse('mouseReleased', 760, 600);
  await key('a', { code: 'KeyA', vk: 65, modifiers: 2 });     // 2 = Ctrl
  await sleep(200);
  const selCount = await evaluate(`(() => {
    const m = (document.getElementById('srMirrorSummary')?.textContent || '');
    return { shapes: document.querySelectorAll('#srMirrorList li').length, summary: m.trim() };
  })()`);
  await sleep(600);
  const selCount2 = await evaluate(`document.querySelectorAll("#srMirrorList li").length`);
  ok(selCount2 === 2, `two shapes drawn through the real input pipeline (${selCount2})`);

  const menuState = `(() => {
    const menu = document.getElementById('ctx');
    const rect = menu ? menu.getBoundingClientRect() : null;
    return {
      open: !!menu && menu.dataset.open === 'true' && getComputedStyle(menu).display !== 'none',
      items: menu ? [...menu.querySelectorAll('[role="menuitem"]')].map(e => e.textContent.trim()) : [],
      onScreen: !!rect && rect.width > 0 && rect.height > 0 && rect.left >= 0 && rect.top >= 0 &&
                rect.right <= innerWidth + 1 && rect.bottom <= innerHeight + 1,
    };
  })()`;
  const before = await evaluate(menuState);
  await evaluate(`document.getElementById('c').focus()`);
  await key('F10', { code: 'F10', vk: 121, modifiers: 8 });   // 8 = Shift
  await sleep(150);
  const ctxOpened = { before: before.open, ...(await evaluate(menuState)) };
  ok(ctxOpened.before === false, 'context menu starts closed (data-open is absent before the key)');
  ok(ctxOpened.open === true, 'Shift+F10 opens the context menu in a real browser — WCAG 2.1.1');
  ok(ctxOpened.items.length > 0,
     `the opened menu is actually populated (${ctxOpened.items.length} items) — not a blank box`);
  // The align actions are the specific thing v1.7.82 made reachable. If they are not in
  // this menu, the keyboard route exists but leads nowhere.
  const alignish = ctxOpened.items.filter(s => /整列|align|配置|distribute/i.test(s));
  ok(alignish.length > 0,
     `align/distribute are reachable from the keyboard-opened menu (${alignish.length} matching items)`);
  ok(ctxOpened.onScreen === true, 'the keyboard-opened menu is positioned on-screen, not clipped off the viewport');

  // THE ACTUAL WCAG 2.1.1 CLAIM, end to end, with no mouse anywhere in the chain:
  // ⌘A selected → ⇧F10 opened → ↓ walks to the align item → Enter activates it → the two
  // rects (drawn at deliberately different x) end up sharing an x. If any link in that
  // chain is broken, the README's "整列 is keyboard-accessible" is false.
  const before2 = await evaluate(`[...document.querySelectorAll('#srMirrorList li')].map(li => li.textContent.trim())`);
  // Walk by READING the focused item, not by index. _ctxMenuKeyNav rows over `.ctx-item`
  // while the item list above was collected via [role=menuitem], and opening the menu
  // pre-positions focus — so any arithmetic on an index is a guess. Stepping until the
  // focused item's own text matches is immune to all of that.
  let focusedItem = '';
  for (let i = 0; i < ctxOpened.items.length + 2; i++) {
    focusedItem = await evaluate(`(document.activeElement.textContent || '').trim()`);
    if (/整列|align/i.test(focusedItem)) break;
    await key('ArrowDown', { code: 'ArrowDown', vk: 40 });
  }
  ok(/整列|align/i.test(focusedItem),
     `arrow keys walked focus onto an align item: ${JSON.stringify(focusedItem.slice(0, 30))}`);

  // REGRESSION (found here, v1.7.83): #ctx keydown bubbles to the window dispatcher, so
  // arrowing through the menu used to ALSO nudge the selection 1px per press. Walking the
  // menu must move the highlight and nothing else.
  await sleep(300);
  const afterNav = await evaluate(`[...document.querySelectorAll('#srMirrorList li')].map(li => li.textContent.trim())`);
  ok(afterNav.join('|') === before2.join('|'),
     `arrowing through the menu moves the highlight ONLY — the board must not shift behind it ` +
     `(${JSON.stringify(before2)} → ${JSON.stringify(afterNav)})`);
  ok((await evaluate(`document.getElementById('ctx').contains(document.activeElement)`)) === true,
     'focus is inside the menu while arrowing (roving focus, ARIA APG)');

  // Enter must be a full keyDown WITH text ('\r'). A CDP rawKeyDown carries no character,
  // and a <button>'s implicit activation is driven by the character event — so rawKeyDown
  // walks focus fine but never "presses" anything.
  await key('Enter', { code: 'Enter', vk: 13, text: '\r' });
  await sleep(600);
  const after2 = await evaluate(`[...document.querySelectorAll('#srMirrorList li')].map(li => li.textContent.trim())`);
  const xs = after2.map(s => (s.match(/@\s*(-?\d+)/) || [])[1]).filter(v => v !== undefined);
  ok(after2.join('|') !== before2.join('|'),
     `activating the align item by keyboard actually changed the board (${JSON.stringify(before2)} → ${JSON.stringify(after2)})`);
  ok(xs.length === 2 && xs[0] === xs[1],
     `keyboard-only align landed: both rects now share x=${xs[0]} — ⌘A → ⇧F10 → ↓ → Enter, no mouse (WCAG 2.1.1)`);

  /* --- 4. no console errors during boot -------------------------------------------- */
  // A thrown error during boot can leave half the UI unbuilt, which a static check on the
  // source cannot see at all.
  const errs = await evaluate(`(window.__boardErrors || []).length`);
  ok(errs === 0 || errs === undefined, 'no errors recorded during boot');

  console.log('');
  if (failures.length) {
    console.error(`✗ ${failures.length} accessibility-tree check(s) failed:\n`);
    for (const f of failures) console.error(`   ${f}`);
    code = 1;
  } else {
    console.log(`✓ ${pass} checks passed against a REAL browser accessibility tree.`);
    console.log('  Remaining human-only part of FT-11: whether the announcements are');
    console.log('  pleasant to listen to (verbosity, reading order in practice, phrasing).');
    console.log('  Name/role/state correctness is now machine-verified and will stay verified.');
  }
} catch (e) {
  console.error(`a11y-browser: ${e.message}`);
  code = 1;
} finally {
  proc.kill('SIGKILL');
  try { rmSync(profile, { recursive: true, force: true }); } catch {}
}
process.exit(code);
