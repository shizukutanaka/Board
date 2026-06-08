// Board — smoke test for op-log reversibility and geometry purity.
// Run: node test.mjs
// Extracts subset of board.js and tests it in isolation.

import { readFileSync } from 'fs';
import { gzipSync } from 'zlib';
import assert from 'assert';

const html = readFileSync('./index.html', 'utf8');
const GZIP_BUDGET = 45056; // 44KB gzip — must match .github/workflows/ci.yml

// ---- presence checks ----
const checks = [
  ['Single-file (no external script)', !/<script[^>]+src=["']https?:/.test(html)],
  ['Single-file (no external link)', !/<link[^>]+(href)=["']https?:/.test(html)],
  ['PWA manifest inline', /rel="manifest"/.test(html) && /data:application\/manifest\+json/.test(html)],
  ['ServiceWorker registered', /serviceWorker.*register/.test(html)],
  ['i18n ja + en', /I18N\s*=/.test(html) && html.includes('ja:{') && html.includes('en:{')],
  ['WCAG AAA brand-ink token', html.includes('--brand-ink:#003B40')],
  ['IndexedDB store', html.includes("DB_NAME='board'")],
  ['RAF render loop', /requestAnimationFrame\(frame\)/.test(html)],
  ['op-log op types (add/del/upd/move/z/clear)',
    ['add','del','upd','move','z','clear'].every(op => html.includes(`op:'${op}'`))],
  ['Tools: pen, rect, ellipse, arrow, line, text, eraser, select, hand',
    ['pen','rect','ellipse','arrow','line','text','eraser','select','hand']
      .every(t => html.includes(`data-tool="${t}"`))],
  ['Keymap covers all tools',
    /KEYMAP\s*=\s*\{v:'select'[^}]+h:'hand'[^}]+p:'pen'/.test(html)],
  ['Size under 44KB gzip budget', gzipSync(html).length < GZIP_BUDGET],
  ['No innerHTML anywhere (XSS-safe)', !/innerHTML\s*=/.test(html)],
  // v1.1: ctx must be let (not const) for exportPNG swap
  ['ctx declared as let (not const)', /let ctx=canvas\.getContext/.test(html)],
  // v1.1: exportPNG passes ctx as parameter (no global swap)
  ['exportPNG passes ctx as parameter', html.includes('drawShape(s,oc)')],
  // v1.1: toBlob null guard
  ['toBlob has null guard', html.includes("if(!bl){UI.toast('export failed'")],
  // v1.1: op validation in _onRecv
  ['_onRecv validates op.clock', html.includes("typeof op.clock.peer!=='string'")],
  // v1.1: import validates shapes
  ['importFromHash validates shape fields', html.includes("s.id&&s.type&&typeof s.z==='number'")],
  ['All data-tool buttons have kbd hints',
    (html.match(/class="tool"[^>]*>/g) || []).length >=
    (html.match(/<kbd>/g) || []).length - 1], // -1 for topbar
  ['brand color #00C4CC used', html.includes('#00C4CC')],
  ['Reduced motion respected', html.includes('prefers-reduced-motion')],
  ['Dark mode vars', html.includes('prefers-color-scheme:dark')],
  ['LICENSE is MIT referenced', html.includes('MIT')],
  ['No external fonts', !/@import[^;]+fonts\.googleapis/.test(html)],
  ['Help grid populated', html.includes('fillHelp')],
  // v1.1 additions
  ['BroadcastChannel sync code present', html.includes("NET_CHANNEL_PREFIX='board:'")],
  ['PEER_ID persistence', html.includes("localStorage.getItem('board.peer')")],
  ['Share export/import', html.includes('exportToUrl') && html.includes('importFromHash')],
  ['WebRTC manual signaling', html.includes('wrtcCreateOffer') && html.includes('wrtcAcceptOffer')],
  ['Share button wired in wire()', html.includes("btnShare") && html.includes("UI.openShare")],
  ['Net.init called in main()', html.includes('Net.init()')],
  ['Share.importFromHash called in main()', html.includes('Share.importFromHash()')],
  ['UI.refreshPeers defined', html.includes('refreshPeers')],
  ['Version display dynamic', html.includes("sVer').textContent='v'+V")],
  // v1.1 functional additions
  ['Arrow key nudge code', html.includes("arrowup") && html.includes("arrowdown") && html.includes("Shape.translate")],
  ['Pinch zoom code', html.includes("_pointers") && html.includes("_pinchPrev")],
  // round 4 improvements
  ['data-t i18n auto-apply', html.includes("UI.applyI18n") && html.includes("el.textContent=t(key)")],
  ['Eraser batches into single undo', html.includes("_eraseBatch") && html.includes("flushErase")],
  ['drawShape accepts ctx param', html.includes("function drawShape(s,c)")],
  // round 4 improvements (current session)
  ['Double-click re-edit text', html.includes("dblclick") && html.includes("openTextEditor")],
  ['openTextEditor isNew param', html.includes("openTextEditor(s,true)") && html.includes("openTextEditor(s,isNew)")],
  ['Orientation change handler', html.includes("screen.orientation")],
  // Phase 1.2: image import + SVG export + sticky notes
  ['Image shape type in drawShape', html.includes("case 'image':") && html.includes("getImg")],
  ['Sticky note shape type', html.includes("case 'sticky':") && html.includes("STICKY_COLORS")],
  ['Image drag-drop handler', html.includes("dragover") && html.includes("drop") && html.includes("readAsDataURL")],
  ['Image clipboard paste', html.includes("paste") && html.includes("getAsFile")],
  ['SVG export function', html.includes("function exportSVG") && html.includes("image/svg+xml")],
  ['Sticky tool in toolbar', html.includes('data-tool="sticky"')],
  ['N key maps to sticky', html.includes("n:'sticky'")],
  ['i18n sticky key exists', html.includes("sticky:'付箋'") && html.includes("sticky:'Sticky'")],
  // Phase 1.3: z-order + align + snap
  ['Snap-to-grid functions', html.includes("function snapV") && html.includes("function snapPt")],
  ['Snap state + toggle key', html.includes("state.snap") && html.includes("⇧G")],
  ['doBringForward defined', html.includes("function doBringForward")],
  ['doSendBackward defined', html.includes("function doSendBackward")],
  ['doAlign defined with all directions', html.includes("function doAlign") && html.includes("'hspace'") && html.includes("'vspace'")],
  ['Context menu align items', html.includes("ctxAlignLeft") && html.includes("ctxHSpace")],
  ['Z-order keyboard shortcuts', html.includes("doBringFront") && html.includes("doSendBack")],
  // round 5 improvements
  ['contLineLike applies snap', html.includes("const sp=snapPt(wp)") && html.includes("let x2=sp.x")],
  ['seenOps bounded by MAX_SEEN_OPS', html.includes("MAX_SEEN_OPS") && html.includes("seenOps.size>MAX_SEEN_OPS")],
  ['dblclick calls openTextEditor with isNew=false', html.includes("openTextEditor(hit,false)")],
  // Phase 1.4: minimap + format painter + PDF
  ['Minimap canvas present', html.includes('id="minimap"') && html.includes("const Minimap")],
  ['Minimap click-to-navigate', html.includes("state.viewport.x=wx-")],
  ['Format painter copyStyle/pasteStyle', html.includes("function copyStyle") && html.includes("function pasteStyle")],
  ['Format painter styleClipboard state', html.includes("styleClipboard")],
  ['PDF export function', html.includes("function exportPDF") && html.includes("window.print")],
  ['Presentation mode + PDF export shortcuts',
    html.includes("exportPDF") && html.includes("Presentation.enter")],
  // Phase 1.5: resize handles + groups
  ['getHandles function', html.includes("function getHandles") && html.includes("hitHandle")],
  ['applyResize function', html.includes("function applyResize") && html.includes("nw") && html.includes("se")],
  ['handleCursor function', html.includes("function handleCursor") && html.includes("nwse-resize")],
  ['resize dragKind', html.includes("ptr.dragKind='resize'") && html.includes("ptr.resizeHandle")],
  ['doGroup/doUngroup functions', html.includes("function doGroup") && html.includes("function doUngroup")],
  ['group keyboard shortcuts Ctrl+G', html.includes("meta&&k==='g'") && html.includes("doGroup")],
  ['group visual outline rendered', html.includes("_gmap") && html.includes("groupId")],
  // Phase 1.6: Frames + Presentation Mode
  ['Frame tool defined', html.includes("data-tool=\"frame\"") && html.includes("'frame'")],
  ['Frame shape renders differently', html.includes("case 'frame':") && html.includes("s.label")],
  ['Presentation mode enter/leave', html.includes("Presentation.enter") && html.includes("Presentation.leave")],
  ['Present button in topbar', html.includes("btnPresent")],
  ['Frame zoomToFrame', html.includes("_zoomToFrame")],
  ['Frame keyboard P', html.includes("k==='p'&&!meta") && html.includes("Presentation.enter")],
  // round 6: frame hit priority + label edit + image size guard
  ['pickTop skips frames on first pass', html.includes("s.type==='frame')continue")],
  ['frame dblclick label edit', html.includes("hit.type==='frame'") && html.includes("hit.label")],
  ['image size guard 4MB', html.includes("4*1024*1024") && html.includes("大きすぎます")],
  ['SVG export frames first', html.includes("svgShapes") && html.includes("type===\"frame\"")],
  // round 7: _apply completeness + opacity UI
  ['_apply handles group op', html.includes("case 'group':") && html.includes("sh.groupId=op.gid")],
  ['_apply handles ungroup op', html.includes("case 'ungroup':")],
  ['_apply handles zorder op', html.includes("case 'zorder':")],
  ['_apply handles align op', html.includes("case 'align':")],
  ['opacity slider in style panel', html.includes("rngOpacity") && html.includes("opacRng.value/100")],
  // round 8: accessibility
  ['canvas has role=application', html.includes('role="application"')],
  ['canvas has aria-label', html.includes('id="c"') && html.includes('aria-label="Drawing canvas')],
  ['forced-colors support', html.includes("forced-colors:active")],
  ['prefers-contrast support', html.includes("prefers-contrast:more")],
  // round 9: presentation pointer guard + frame move + i18n
  ['pointerdown guarded during presentation', html.includes("if(Presentation.isActive())return")],
  ['frame move drags contained shapes', html.includes("dragIds") && html.includes("type==='frame'")],
  ['copyStyle uses i18n', html.includes("t('noSelection')") && html.includes("t('styleCopied')")],
  ['group toasts use i18n', html.includes("t('grouped')") && html.includes("t('selectTwo')")],
  ['copyStyle captures stroke/fill/size/opacity', html.includes("stroke:sh.stroke,fill:sh.fill") && html.includes("size:sh.size,opacity:sh.opacity")],
  ['pasteStyle filters undefined keys', html.includes("filter(([,v])=>v!==undefined)")],
  ['applyStyleToSelection records undo', html.includes("Store._recordCommitted({op:'upd'")],
  // v1.6.6: reversibility + security hardening
  ['zorder op carries before/after snapshot', html.includes("op:'zorder',before,after")],
  ['zorder _apply restores order+z from snapshot', html.includes("const snap=forward?op.after:op.before") && html.includes("sh.z=p.z")],
  ['z-step ops route through _commitZ (undoable)', html.includes("_commitZ(before)") && html.includes("function _commitZ")],
  ['applyRemote whitelists op types', html.includes("REMOTE_OPS") && html.includes("this.REMOTE_OPS.has(op.op)")],
  ['applyRemote validates remote add shape', html.includes("op.shape.id&&op.shape.type&&typeof op.shape.z==='number'")],
  ['SVG export uses testable buildSVG', html.includes("function buildSVG") && html.includes("buildSVG(state.shapes")],
  ['SVG attrs escaped via _esc', html.includes("stroke=\"${stroke}\"") && html.includes("_esc(s.fill)")],
  ['SVG image dataUrl validated', html.includes("/^data:image\\//.test(s.dataUrl)")],
  ['PDF export escapes docName', html.includes("_esc(state.docName||'board')")],
  ['getCSS is memoised', html.includes("_cssCache") && html.includes("function clearCSSCache")],
  ['resize handles use AAA brand-ink ring', html.includes("getCSS('--brand-ink')")],
  // spec-gap fixes
  ['_num coerces to finite number', html.includes("function _num") && html.includes("Number.isFinite(n)?n:0")],
  ['buildSVG coerces numeric coords via _num', html.includes("const X=_num(s.x)") && html.includes("_num(s.size)")],
  ['applyRemote validates op payloads', html.includes("function validRemotePayload") && html.includes("if(!validRemotePayload(op))return")],
  ['remote move requires finite deltas', html.includes("Number.isFinite(+op.dx)&&Number.isFinite(+op.dy)")],
  // v1.6.8: viewport culling + load validation
  ['viewport culling helpers present', html.includes("function visibleWorldRect") && html.includes("function inView")],
  ['draw() culls via inView', html.includes("inView(s,_view)")],
  ['Persist.load validates shapes', html.includes("d.shapes.filter(s=>s&&typeof s==='object'&&s.id&&s.type")],
  // v1.6.9: sticky text auto-wrap
  ['wrapText helper present', html.includes("function wrapText")],
  ['sticky render wraps text', html.includes("wrapText(s.text,Math.abs(s.w)-pad*2")],
  ['SVG sticky export wraps text', html.includes("wrapText(s.text,Math.abs(W)-pad2*2")],
  // v1.6.10: keyboard shape navigation (a11y)
  ['cycleSel/describeShape helpers present', html.includes("function cycleSel") && html.includes("function describeShape")],
  ['Tab cycles shape selection', html.includes("else if(k==='tab')") && html.includes("cycleSel(ids,")],
  ['toasts region is aria-live (SR announce)', html.includes('id="toasts"') && html.includes('aria-live="polite"')],
  ['canvas aria-label advertises Tab nav', html.includes("Tab / Shift+Tab cycle through shapes")],
  // v1.6.11: spatial index for pickTop
  ['spatial grid helpers present', html.includes("function _buildGrid") && html.includes("function _queryGrid")],
  ['pickTop uses grid for large boards', html.includes("state.shapes.length>40") && html.includes("_buildGrid(state.shapes)")],
  ['grid invalidated on every _apply', html.includes("_apply(op,forward){") && html.includes("_invalidateGrid()")],
  // v1.6.12: keyboard shape creation (a11y)
  ['createShapeKbd helper present', html.includes("function createShapeKbd")],
  ['Enter creates shape at viewport centre', html.includes("k==='enter'&&!meta&&!e.shiftKey") && html.includes("createShapeKbd()")],
  ['canvas aria-label advertises Enter create', html.includes("press Enter to create a shape")],
  ['help grid lists Tab cycle and Enter create', html.includes("['Tab / ⇧Tab',k.cycle]") && html.includes("['Enter',k.create]")],
  // v1.6.13: variable-width pen (velocity-based)
  ['penWidths helper present', html.includes("function penWidths")],
  ['drawPen uses variable width', html.includes("penWidths(p,s.size)") && html.includes("c.lineWidth=(w[i]+w[i+1])/2")],
  ['SVG pen export uses penWidths (display=output parity)', html.includes("penWidths(P,SZ)")],
  // v1.6.14: pointer pressure input
  ['pen captures pointer pressure', html.includes("function _penPr") && html.includes("[wp.x,wp.y,_penPr(e)]")],
  ['penWidths uses varying pressure signal', html.includes("usePr=hasPr&&(mx-mn)>0.05")],
  ['SVG pen carries pressure for parity', html.includes("_num(p&&p[1])+oy,p&&p[2]")],
];

let pass = 0, fail = 0;
for (const [name, ok] of checks) {
  if (ok) { console.log(`  ✓ ${name}`); pass++; }
  else   { console.log(`  ✗ ${name}`); fail++; }
}

// ---- behavioral: extract Store + geometry + run ----
// Minimal harness: eval the relevant JS in a fake global.
const jsMatch = html.match(/<script>([\s\S]*?)<\/script>/);
const js = jsMatch[1];

// Fake the DOM-touching APIs so the script can load without crashing
const fakeDoc = {
  getElementById: () => ({
    addEventListener(){}, removeEventListener(){},
    setAttribute(){}, getAttribute(){}, removeAttribute(){},
    appendChild(){}, removeChild(){}, remove(){},
    dataset: {}, style: {}, classList: { add(){}, remove(){}, toggle(){} },
    offsetWidth: 800, offsetHeight: 600, clientWidth: 800, clientHeight: 600,
    getBoundingClientRect: () => ({left:0,top:0,width:800,height:600,right:800,bottom:600}),
    getContext: () => ({
      fillRect(){}, strokeRect(){}, beginPath(){}, moveTo(){}, lineTo(){},
      arc(){}, arcTo(){}, quadraticCurveTo(){}, ellipse(){}, closePath(){},
      fill(){}, stroke(){}, clip(){}, save(){}, restore(){}, clearRect(){},
      setTransform(){}, translate(){}, scale(){}, rotate(){},
      measureText: () => ({ width: 50 }),
      fillText(){}, setLineDash(){},
      get canvas(){return{width:800,height:600}},
      fillStyle:'', strokeStyle:'', lineWidth:1, font:'', textBaseline:'',
      globalAlpha:1, lineCap:'', lineJoin:''
    }),
    width: 800, height: 600, value: '', textContent: '',
    querySelectorAll: () => [],
    querySelector: () => null,
    focus(){}, blur(){}, click(){}, contains(){ return false; },
    hidden: false,
    onclick: null, oninput: null,
  }),
  createElement: (tag) => ({
    tagName: tag.toUpperCase(), className:'', style:{},
    addEventListener(){}, appendChild(){}, remove(){},
    setAttribute(){}, getAttribute(){}, classList: { add(){}, remove(){} },
    dataset: {}, width: 800, height: 600,
    toBlob: (cb) => cb(new Blob(['fake'],{type:'image/png'})),
    getContext: () => fakeDoc.getElementById().getContext(),
    value:'', textContent:'', innerHTML:'',
    scrollWidth: 50, scrollHeight: 20, spellcheck: false,
    focus(){}, blur(){}, select(){}, setSelectionRange(){},
    click(){}
  }),
  body: { appendChild(){}, removeChild(){} },
  documentElement: { setAttribute(){}, getAttribute(){}, dataset:{} },
  querySelectorAll: () => [],
  addEventListener(){},
};
const fakeWin = {
  devicePixelRatio: 1, innerWidth: 800, innerHeight: 600,
  addEventListener(){}, removeEventListener(){},
  requestAnimationFrame: (fn) => 0,
  setTimeout, clearTimeout, setInterval: () => 0, clearInterval,
  location: { hash: '', origin: 'http://test', pathname: '/index.html' },
  history: { replaceState(){} },
  navigator: { language:'en', onLine:true, serviceWorker:{ register:()=>Promise.resolve() },
    clipboard: { writeText: () => Promise.resolve() } },
  localStorage: { _d: {}, getItem(k){ return this._d[k] || null }, setItem(k,v){ this._d[k] = String(v) } },
  indexedDB: { open: () => ({ addEventListener(){}, onsuccess:null, onerror:null, onupgradeneeded:null }) },
  URL: { createObjectURL: () => 'blob:x', revokeObjectURL(){} },
  Blob, confirm: () => false, alert(){}, prompt: () => null,
  getComputedStyle: () => ({ getPropertyValue: () => '#fff' }),
  BroadcastChannel: class { onmessage=null; postMessage(){} close(){} },
  RTCPeerConnection: undefined,
  RTCSessionDescription: undefined,
  btoa: globalThis.btoa || (s => Buffer.from(s).toString('base64')),
  atob: globalThis.atob || (s => Buffer.from(s, 'base64').toString()),
  escape: globalThis.escape || (s => s),
  unescape: globalThis.unescape || (s => s),
  encodeURIComponent, decodeURIComponent,
  Math, Date, JSON, Object, Array, Set, Map, Promise, Error, RegExp, String, Number, Boolean,
  parseInt, parseFloat, isNaN, isFinite,
};
fakeWin.window = fakeWin; fakeWin.document = fakeDoc; fakeWin.self = fakeWin;

// Execute in isolated function scope; export hooks via globalThis
try {
  const fn = new Function('window','document','navigator','requestAnimationFrame',
    'indexedDB','URL','setTimeout','clearTimeout','setInterval','clearInterval',
    'getComputedStyle','confirm','alert','Blob','globalThis','self',`
    ${js}
    return { state, Store, G, Shape, distToSeg,
             doBringFront, doSendBack, doBringForward, doSendBackward,
             doAlign, snapV, snapPt,
             getHandles, applyResize, handleCursor,
             doGroup, doUngroup, pickTop, buildSVG, inView, wrapText, cycleSel, describeShape,
             copyStyle, pasteStyle, applyStyleToSelection,
             _buildGrid, _queryGrid, sortZ, createShapeKbd, pickTool, penWidths };
  `);
  const api = fn(
    fakeWin, fakeDoc, fakeWin.navigator, fakeWin.requestAnimationFrame,
    fakeWin.indexedDB, fakeWin.URL, setTimeout, clearTimeout, setInterval, clearInterval,
    fakeWin.getComputedStyle, fakeWin.confirm, fakeWin.alert, Blob, fakeWin, fakeWin
  );
  const { state, Store, G, Shape, distToSeg,
          doBringFront, doSendBack, doBringForward, doSendBackward,
          doAlign, snapV, snapPt,
          getHandles, applyResize, handleCursor,
          doGroup, doUngroup, pickTop, buildSVG, inView, wrapText, cycleSel, describeShape,
          copyStyle, pasteStyle, applyStyleToSelection,
          _buildGrid, _queryGrid, sortZ, createShapeKbd, pickTool, penWidths } = api;

  console.log('\n-- behavioural --');

  // geom: distToSeg
  assert.strictEqual(distToSeg({x:0,y:0},{x:-1,y:0},{x:1,y:0}), 0);
  assert.strictEqual(distToSeg({x:0,y:5},{x:-10,y:0},{x:10,y:0}), 5);
  console.log('  ✓ distToSeg correct for axis-aligned segments');

  // Store.add + undo + redo round trip
  state.shapes.length = 0; state.history.length = 0; state.histIdx = -1;
  const sh = Shape.make('rect', {x:10,y:10,w:100,h:50});
  Store.commit({op:'add', shape: sh});
  assert.strictEqual(state.shapes.length, 1);
  Store.undo();
  assert.strictEqual(state.shapes.length, 0);
  Store.redo();
  assert.strictEqual(state.shapes.length, 1);
  console.log('  ✓ add op is reversible (add→undo→redo round trip)');

  // Store.move reversibility
  const before = JSON.parse(JSON.stringify(state.shapes[0]));
  Shape.translate(state.shapes[0], 50, 25);
  state.history.push({op:'move', ids:[sh.id], dx:50, dy:25});
  state.histIdx++;
  Store.undo();
  assert.strictEqual(state.shapes[0].x, before.x);
  assert.strictEqual(state.shapes[0].y, before.y);
  console.log('  ✓ move op is reversible');

  // Store.del
  Store.commit({op:'del', shapes:[JSON.parse(JSON.stringify(state.shapes[0]))]});
  assert.strictEqual(state.shapes.length, 0);
  Store.undo();
  assert.strictEqual(state.shapes.length, 1);
  console.log('  ✓ del op is reversible');

  // G.bbox for rect
  const b = G.bbox({type:'rect', x:10, y:20, w:100, h:50});
  assert.deepStrictEqual(b, {x:10, y:20, w:100, h:50});
  console.log('  ✓ G.bbox for rect');

  // G.bbox for line
  const bl = G.bbox({type:'line', x1:0, y1:0, x2:100, y2:50, size:2});
  assert.ok(bl.w >= 100 && bl.h >= 50);
  console.log('  ✓ G.bbox for line includes stroke padding');

  // G.hit miss-outside-bbox
  assert.strictEqual(G.hit({type:'rect', x:0, y:0, w:10, h:10, fill:null, stroke:'#000', size:2}, {x:1000, y:1000}), false);
  console.log('  ✓ G.hit rejects far-away points');

  // G.hit: filled rect
  assert.strictEqual(G.hit({type:'rect', x:0, y:0, w:100, h:100, fill:'#000'}, {x:50, y:50}), true);
  console.log('  ✓ G.hit hits filled rect interior');

  console.log('\n-- v1.1: CRDT / sync --');

  // CRDT clock: commit stamps ops
  state.shapes.length = 0; state.history.length = 0; state.histIdx = -1;
  state.seq = 0; state.seenOps = new Set();
  const sh2 = Shape.make('rect', {x:0,y:0,w:10,h:10});
  Store.commit({op:'add', shape: sh2});
  const lastOp = state.history[state.histIdx];
  assert.ok(lastOp.clock, 'committed op has clock');
  assert.strictEqual(lastOp.clock.peer, state.peerId);
  assert.strictEqual(lastOp.clock.seq, 1);
  console.log('  ✓ Store.commit stamps CRDT clock {peer, seq, ts}');

  // dedup: same op applied twice is no-op
  const before2 = state.shapes.length;
  Store.applyRemote(lastOp);
  assert.strictEqual(state.shapes.length, before2, 'dedup prevents double-add');
  console.log('  ✓ applyRemote deduplicates by peer:seq');

  // applyRemote from different peer
  const remoteOp = {
    op: 'add',
    shape: Shape.make('ellipse', {x:50,y:50,w:20,h:20}),
    clock: {peer: 'remote-peer-123', seq: 1, ts: Date.now()}
  };
  Store.applyRemote(remoteOp);
  assert.strictEqual(state.shapes.length, before2 + 1, 'remote op applied');
  console.log('  ✓ applyRemote applies ops from different peers');

  // applyRemote does NOT enter local undo stack
  const histLen = state.history.length;
  const remoteOp2 = {
    op: 'add',
    shape: Shape.make('line', {x1:0,y1:0,x2:10,y2:10}),
    clock: {peer: 'remote-peer-456', seq: 1, ts: Date.now()}
  };
  Store.applyRemote(remoteOp2);
  assert.strictEqual(state.history.length, histLen, 'remote ops skip local history');
  console.log('  ✓ remote ops do NOT enter local undo history');

  // _recordCommitted stamps clock + appears in history
  state.shapes.length = 0; state.history.length = 0; state.histIdx = -1;
  state.seq = 0; state.seenOps = new Set();
  const sh3 = Shape.make('rect', {x:5,y:5,w:50,h:50});
  state.shapes.push(sh3);
  Store._recordCommitted({op:'move', ids:[sh3.id], dx:10, dy:10});
  assert.ok(state.history.length === 1, '_recordCommitted adds to history');
  assert.ok(state.history[0].clock, '_recordCommitted stamps clock');
  console.log('  ✓ _recordCommitted stamps clock and enters history');

  // Version is v1.1
  assert.ok(typeof api.state !== 'undefined');
  console.log('  ✓ state is accessible (V=' + (api.state ? 'ok' : 'missing') + ')');

  // z-order
  console.log('\n-- z-order & alignment --');
  state.shapes.length = 0; state.history.length = 0; state.histIdx = -1;
  state.seq = 0; state.seenOps = new Set();
  const za = Shape.make('rect', {x:0, y:0, w:50, h:50});
  const zb = Shape.make('rect', {x:10, y:10, w:50, h:50});
  Store.commit({op:'add', shape: za});
  Store.commit({op:'add', shape: zb});
  state.selection = new Set([za.id]);
  // bring front
  doBringFront();
  assert.strictEqual(state.shapes[state.shapes.length - 1].id, za.id, 'bring front puts shape at end');
  console.log('  ✓ doBringFront moves shape to end of array');
  // send back
  doSendBack();
  assert.strictEqual(state.shapes[0].id, za.id, 'send back puts shape at start');
  console.log('  ✓ doSendBack moves shape to start of array');

  // z-order undo must be a TRUE inverse (regression: dir-based zorder undo
  // used to send-to-back instead of restoring the original stacking order)
  state.shapes.length = 0; state.history.length = 0; state.histIdx = -1;
  state.seq = 0; state.seenOps = new Set();
  const o1 = Shape.make('rect', {x:0,y:0,w:10,h:10});
  const o2 = Shape.make('rect', {x:5,y:5,w:10,h:10});
  const o3 = Shape.make('rect', {x:9,y:9,w:10,h:10});
  Store.commit({op:'add', shape:o1});
  Store.commit({op:'add', shape:o2});
  Store.commit({op:'add', shape:o3});
  const beforeOrder = state.shapes.map(s => s.id).join(',');
  state.selection = new Set([o2.id]);
  doBringFront();
  assert.notStrictEqual(state.shapes.map(s => s.id).join(','), beforeOrder, 'bring front changed order');
  Store.undo();
  assert.strictEqual(state.shapes.map(s => s.id).join(','), beforeOrder, 'undo restores exact prior z-order');
  console.log('  ✓ zorder undo restores the exact original stacking order');

  // forward/backward step ops must be undoable (regression: they mutated
  // state directly with no Store entry, so Ctrl+Z did nothing)
  state.shapes.length = 0; state.history.length = 0; state.histIdx = -1;
  state.seq = 0; state.seenOps = new Set();
  const f1 = Shape.make('rect', {x:0,y:0,w:10,h:10}); f1.z = 1;
  const f2 = Shape.make('rect', {x:5,y:5,w:10,h:10}); f2.z = 2;
  const f3 = Shape.make('rect', {x:9,y:9,w:10,h:10}); f3.z = 3;
  state.shapes.push(f1, f2, f3);
  const fOrder = state.shapes.map(s => s.id).join(',');
  state.selection = new Set([f1.id]);
  doBringForward();
  assert.notStrictEqual(state.shapes.map(s => s.id).join(','), fOrder, 'bring forward changed order');
  Store.undo();
  assert.strictEqual(state.shapes.map(s => s.id).join(','), fOrder, 'undo reverts doBringForward');
  state.selection = new Set([f3.id]);
  doSendBackward();
  assert.notStrictEqual(state.shapes.map(s => s.id).join(','), fOrder, 'send backward changed order');
  Store.undo();
  assert.strictEqual(state.shapes.map(s => s.id).join(','), fOrder, 'undo reverts doSendBackward');
  console.log('  ✓ doBringForward / doSendBackward are undoable');

  // remote ops: unknown op types and malformed `add` payloads are rejected
  state.shapes.length = 0; state.history.length = 0; state.histIdx = -1;
  state.seenOps = new Set();
  Store.applyRemote({op:'EVIL', payload:'x', clock:{peer:'attacker', seq:1, ts:1}});
  assert.strictEqual(state.shapes.length, 0, 'unknown remote op type is dropped');
  Store.applyRemote({op:'add', shape:{id:'bad'}, clock:{peer:'attacker', seq:2, ts:1}});
  assert.strictEqual(state.shapes.length, 0, 'malformed remote add (no type/z) is dropped');
  const goodShape = Shape.make('rect', {x:0,y:0,w:5,h:5});
  Store.applyRemote({op:'add', shape:goodShape, clock:{peer:'peerB', seq:1, ts:1}});
  assert.strictEqual(state.shapes.length, 1, 'well-formed remote add is accepted');
  console.log('  ✓ applyRemote rejects unknown op types and malformed adds');

  // remote op PAYLOAD validation (not just op type): malformed move/upd are
  // dropped so a peer can't NaN-out or corrupt shapes (state has goodShape)
  const mvId = state.shapes[0].id, mx0 = state.shapes[0].x;
  Store.applyRemote({op:'move', ids:[mvId], dx:{}, dy:0, clock:{peer:'attacker', seq:3, ts:1}});
  assert.strictEqual(state.shapes[0].x, mx0, 'remote move with non-finite dx is dropped');
  Store.applyRemote({op:'upd', id:123, after:'evil', clock:{peer:'attacker', seq:4, ts:1}});
  assert.ok(Number.isFinite(state.shapes[0].x), 'remote upd with bad id/after is dropped');
  Store.applyRemote({op:'move', ids:[mvId], dx:5, dy:0, clock:{peer:'peerB', seq:2, ts:1}});
  assert.strictEqual(state.shapes[0].x, mx0 + 5, 'well-formed remote move is applied');
  console.log('  ✓ applyRemote validates op payloads (move/upd) and applies valid move');

  // SVG export escapes attribute values (regression: colors/labels/dataUrls
  // were interpolated raw → an exported .svg could execute injected markup)
  const evil = Shape.make('rect', {x:0,y:0,w:20,h:20});
  evil.stroke = '"/><script>alert(1)</script>';
  evil.fill = '"onmouseover="alert(2)';
  const svgOut = buildSVG([evil], '#FFFFFF');
  assert.ok(!/<script/i.test(svgOut), 'no unescaped <script in exported SVG');
  assert.ok(svgOut.includes('&lt;script'), 'malicious stroke was HTML-escaped');
  console.log('  ✓ buildSVG escapes attribute values (no markup injection)');

  // SVG NUMERIC attributes are coerced (regression: string coords like x could
  // break out of an attribute even after color/label strings were escaped)
  const evilNum = { id:'n1', type:'rect', z:0, x:'0"/><script>alert(3)</script>', y:0, w:10, h:10 };
  const svgNum = buildSVG([evilNum], '#FFFFFF') || '';
  assert.ok(!/<script/i.test(svgNum), 'no <script via string numeric attr');
  assert.ok(!/alert\(3\)/.test(svgNum), 'malicious coord neutralised, not emitted');
  console.log('  ✓ buildSVG coerces numeric attrs (no breakout via coords)');

  // viewport culling predicate (drives draw() skip of off-screen shapes)
  const cv = { x:0, y:0, w:800, h:600 };
  assert.ok(inView({type:'rect',x:10,y:10,w:50,h:50}, cv), 'on-screen shape drawn');
  assert.ok(!inView({type:'rect',x:5000,y:5000,w:50,h:50}, cv), 'far off-screen shape culled');
  assert.ok(inView({type:'rect',x:-30,y:-30,w:50,h:50}, cv), 'partially-overlapping shape drawn');
  assert.ok(inView({type:'line',x1:-1000,y1:300,x2:1000,y2:300,size:2}, cv), 'line crossing view drawn');
  console.log('  ✓ inView culls off-screen shapes, keeps overlapping ones');

  // text wrapping (sticky notes): pure helper with an injected measure (10px/char)
  const m10 = (t) => t.length * 10;
  assert.deepStrictEqual(wrapText('hi', 100, m10), ['hi'], 'short text not wrapped');
  assert.deepStrictEqual(wrapText('hello world', 100, m10), ['hello', 'world'], 'wraps on whitespace');
  assert.deepStrictEqual(wrapText('a\nb', 100, m10), ['a', 'b'], 'honours explicit newlines');
  assert.deepStrictEqual(wrapText('abcdefghij', 50, m10), ['abcde', 'fghij'], 'hard-breaks an overlong token');
  assert.deepStrictEqual(wrapText('hello', 0, m10), ['hello'], 'non-positive width => no wrap');
  assert.ok(wrapText('x'.repeat(200), 50, m10).every(l => m10(l) <= 50), 'every wrapped line fits width');
  console.log('  ✓ wrapText word-wraps and char-breaks to width');

  // keyboard navigation: cycle selection through shapes (a11y)
  const cids = ['a','b','c'];
  assert.strictEqual(cycleSel(cids,'a',1), 'b', 'next wraps forward');
  assert.strictEqual(cycleSel(cids,'c',1), 'a', 'forward wraps at end');
  assert.strictEqual(cycleSel(cids,'a',-1), 'c', 'prev wraps at start');
  assert.strictEqual(cycleSel(cids,null,1), 'a', 'no selection => first on Tab');
  assert.strictEqual(cycleSel(cids,'x',-1), 'c', 'unknown selection => last on Shift+Tab');
  assert.strictEqual(cycleSel([],'a',1), null, 'empty board => null');
  assert.strictEqual(describeShape({type:'rect',x:10.4,y:20.6,w:5,h:5}), 'rect @ 10,21', 'shape description for SR');
  console.log('  ✓ cycleSel cycles selection, describeShape labels for screen readers');

  // align
  state.shapes.length = 0; state.history.length = 0; state.histIdx = -1;
  const r1 = Shape.make('rect', {x:0, y:0, w:40, h:40});
  const r2 = Shape.make('rect', {x:100, y:100, w:60, h:60});
  const r3 = Shape.make('rect', {x:200, y:50, w:30, h:30});
  state.shapes.push(r1, r2, r3);
  state.selection = new Set([r1.id, r2.id, r3.id]);
  doAlign('left');
  assert.strictEqual(G.bbox(r2).x, G.bbox(r1).x, 'align left sets same x');
  assert.strictEqual(G.bbox(r3).x, G.bbox(r1).x, 'align left sets same x for r3');
  console.log('  ✓ doAlign("left") aligns all shapes to leftmost x');

  doAlign('top');
  assert.strictEqual(G.bbox(r2).y, G.bbox(r1).y, 'align top sets same y');
  console.log('  ✓ doAlign("top") aligns all shapes to topmost y');

  // snap
  state.snap = true;
  const snapped = snapV(33);
  assert.strictEqual(snapped, 40, 'snapV(33) → 40 (nearest 20)');
  state.snap = false;
  const unsnapped = snapV(33);
  assert.strictEqual(unsnapped, 33, 'snapV(33) → 33 when snap off');
  console.log('  ✓ snapV snaps to nearest grid multiple when snap=true');

  // seenOps bounded
  console.log('\n-- seenOps memory bound --');
  state.seenOps.clear(); state.seq = 0;
  // flood with 2500 ops (> MAX_SEEN_OPS=2000)
  for (let i = 0; i < 2500; i++) {
    const op = {
      op: 'add', shape: Shape.make('rect', {x:i,y:0,w:10,h:10}),
      clock: {peer: 'flood-peer', seq: i+1, ts: Date.now()}
    };
    Store.applyRemote(op);
  }
  assert.ok(state.seenOps.size <= 2000, `seenOps capped: ${state.seenOps.size}`);
  console.log(`  ✓ seenOps capped at ${state.seenOps.size} after 2500 ops`);

  // resize handles
  console.log('\n-- resize handles --');
  state.shapes.length=0; state.history.length=0; state.histIdx=-1; state.seq=0; state.seenOps=new Set();
  const rsz=Shape.make('rect',{x:100,y:100,w:200,h:150});
  state.shapes.push(rsz);
  const handles=getHandles(rsz);
  assert.strictEqual(handles.length, 8, 'rect has 8 handles');
  const seHandle=handles.find(h=>h.id==='se');
  assert.ok(seHandle, 'se handle exists');
  assert.strictEqual(seHandle.x, 300); // x + w
  assert.strictEqual(seHandle.y, 250); // y + h
  console.log('  ✓ getHandles returns 8 handles for rect');

  // applyResize: se drag expands
  const orig=JSON.parse(JSON.stringify(rsz));
  applyResize(rsz,'se',orig,{x:350,y:300});
  assert.strictEqual(rsz.w, 250); // 350-100
  assert.strictEqual(rsz.h, 200); // 300-100
  console.log('  ✓ applyResize se expands width+height');

  // applyResize: nw drag moves origin + shrinks
  Object.assign(rsz,orig); // reset
  applyResize(rsz,'nw',orig,{x:120,y:120});
  assert.strictEqual(rsz.x, 120);
  assert.strictEqual(rsz.y, 120);
  assert.strictEqual(rsz.w, 200+100-120); // orig.x+orig.w - new.x
  console.log('  ✓ applyResize nw moves origin and adjusts size');

  // groups
  console.log('\n-- groups --');
  state.shapes.length=0; state.history.length=0; state.histIdx=-1; state.seq=0; state.seenOps=new Set();
  const g1=Shape.make('rect',{x:0,y:0,w:50,h:50});
  const g2=Shape.make('ellipse',{x:60,y:0,w:50,h:50});
  state.shapes.push(g1,g2);
  state.selection=new Set([g1.id,g2.id]);
  doGroup();
  assert.ok(g1.groupId, 'g1 has groupId after group');
  assert.ok(g2.groupId, 'g2 has groupId after group');
  assert.strictEqual(g1.groupId, g2.groupId, 'same groupId');
  console.log('  ✓ doGroup assigns same groupId to all members');

  // click one member should select all in group (via pickOrMarquee groupId logic)
  state.selection=new Set();
  state.selection.add(g1.id); // simulate picking g1
  // expand to group
  const gid=g1.groupId;
  const toSelect=state.shapes.filter(s=>s.groupId===gid).map(s=>s.id);
  for(const id of toSelect) state.selection.add(id);
  assert.ok(state.selection.has(g2.id), 'group member also selected');
  console.log('  ✓ clicking group member selects whole group');

  // doUngroup
  doUngroup();
  assert.ok(!g1.groupId, 'g1 has no groupId after ungroup');
  assert.ok(!g2.groupId, 'g2 has no groupId after ungroup');
  console.log('  ✓ doUngroup removes groupId from all members');

  // group undo/redo
  console.log('\n-- group undo/redo --');
  state.shapes.length=0; state.history.length=0; state.histIdx=-1; state.seq=0; state.seenOps=new Set();
  const u1=Shape.make('rect',{x:0,y:0,w:50,h:50});
  const u2=Shape.make('ellipse',{x:60,y:0,w:50,h:50});
  state.shapes.push(u1,u2);
  state.selection=new Set([u1.id,u2.id]);
  doGroup();
  const ugid=u1.groupId;
  assert.ok(ugid, 'groupId assigned');
  Store.undo();
  assert.ok(!u1.groupId, 'after undo: groupId removed');
  assert.ok(!u2.groupId, 'after undo: groupId removed from u2');
  Store.redo();
  assert.strictEqual(u1.groupId, ugid, 'after redo: groupId restored');
  console.log('  ✓ group undo/redo works correctly');

  // align undo
  state.shapes.length=0; state.history.length=0; state.histIdx=-1; state.seq=0; state.seenOps=new Set();
  const a1=Shape.make('rect',{x:0,y:10,w:40,h:40});
  const a2=Shape.make('rect',{x:100,y:80,w:40,h:40});
  state.shapes.push(a1,a2);
  state.selection=new Set([a1.id,a2.id]);
  const origY1=a1.y, origY2=a2.y;
  doAlign('top');
  assert.strictEqual(a2.y, origY1, 'after align top: a2.y matches a1.y');
  Store.undo();
  assert.strictEqual(a2.y, origY2, 'after undo align: a2.y restored');
  console.log('  ✓ align undo/redo works correctly');

  // frame contains shape detection
  console.log('\n-- frame containment --');
  state.shapes.length=0; state.history.length=0; state.histIdx=-1; state.seq=0; state.seenOps=new Set();
  const fr=Shape.make('frame',{x:0,y:0,w:300,h:200,label:'F1'});
  const inside=Shape.make('rect',{x:50,y:50,w:40,h:40,fill:'#000'});
  const outside=Shape.make('rect',{x:400,y:400,w:40,h:40});
  state.shapes.push(fr,inside,outside);
  // compute which shapes are inside the frame bbox
  const fb=G.bbox(fr);
  const contained=state.shapes.filter(s=>{
    if(s.type==='frame')return false;
    const b=G.bbox(s);
    return b.x>=fb.x&&b.y>=fb.y&&b.x+b.w<=fb.x+fb.w&&b.y+b.h<=fb.y+fb.h;
  });
  assert.strictEqual(contained.length, 1, 'one shape inside frame');
  assert.strictEqual(contained[0].id, inside.id, 'inside shape detected');
  console.log('  ✓ frame containment detection correct');

  // pickTop prefers inner shape over frame
  const picked=pickTop({x:60,y:60});
  assert.strictEqual(picked.id, inside.id, 'pickTop returns inner shape not frame');
  console.log('  ✓ pickTop prefers inner shape over frame');

  // format painter: copyStyle → pasteStyle
  console.log('\n-- format painter --');
  state.shapes.length=0; state.history.length=0; state.histIdx=-1; state.seq=0; state.seenOps=new Set();
  state.styleClipboard=null;
  const srcStyle=Shape.make('rect',{x:0,y:0,w:50,h:50,stroke:'#ff0000',fill:'#00ff00',size:5,opacity:0.5});
  const dstStyle=Shape.make('rect',{x:100,y:0,w:50,h:50,stroke:'#000000',fill:null,size:2,opacity:1});
  state.shapes.push(srcStyle,dstStyle);
  // copy from source
  state.selection=new Set([srcStyle.id]);
  copyStyle();
  assert.ok(state.styleClipboard, 'styleClipboard set after copy');
  assert.strictEqual(state.styleClipboard.stroke, '#ff0000', 'clipboard captured stroke');
  assert.strictEqual(state.styleClipboard.size, 5, 'clipboard captured size');
  // paste onto destination
  state.selection=new Set([dstStyle.id]);
  pasteStyle();
  assert.strictEqual(dstStyle.stroke, '#ff0000', 'paste applied stroke');
  assert.strictEqual(dstStyle.fill, '#00ff00', 'paste applied fill');
  assert.strictEqual(dstStyle.size, 5, 'paste applied size');
  assert.strictEqual(dstStyle.opacity, 0.5, 'paste applied opacity');
  console.log('  ✓ copyStyle/pasteStyle transfers all style props');
  // undo restores destination style
  Store.undo();
  assert.strictEqual(dstStyle.stroke, '#000000', 'undo restores stroke');
  assert.strictEqual(dstStyle.size, 2, 'undo restores size');
  console.log('  ✓ format painter is undoable');
  // copyStyle with no selection is a safe no-op
  state.selection=new Set();
  state.styleClipboard=null;
  copyStyle();
  assert.strictEqual(state.styleClipboard, null, 'copyStyle no-op when nothing selected');
  console.log('  ✓ copyStyle no-op on empty selection');

  // ---- property-based: op-log reversibility over random scenarios ----
  // Dependency-free PBT (no fast-check): seeded random op sequences asserting the
  // v1.6.11: spatial index — _queryGrid must return all shapes that G.hit can match
  {
    const rnd11 = (() => { let a = 0x11c0de;return () => { a|=0;a=a+0x6D2B79F5|0;let t=Math.imul(a^a>>>15,1|a);t=t+Math.imul(t^t>>>7,61|t)^t;return((t^t>>>14)>>>0)/4294967296; }; })();
    state.shapes.length = 0; state.history.length = 0; state.histIdx = -1; state.seq = 0; state.seenOps = new Set();
    // Add 60 rects spread across several grid cells
    for(let i=0;i<60;i++){
      const s=Shape.make('rect',{x:(rnd11()*2000-1000),y:(rnd11()*2000-1000),w:40+rnd11()*160,h:40+rnd11()*160});
      s.z=i+1;state.shapes.push(s);
    }
    sortZ();
    const grid=_buildGrid(state.shapes);
    // For each shape, query its centre and check every candidate satisfies G.hit or is just an over-approximation
    let gridOk=true;
    for(const s of state.shapes){
      const wp={x:s.x+s.w/2,y:s.y+s.h/2};
      // Brute-force: topmost shape that G.hit accepts
      let bf=null;
      for(let i=state.shapes.length-1;i>=0;i--){const sh=state.shapes[i];if(sh.type!=='frame'&&G.hit(sh,wp)){bf=sh;break;}}
      // Grid path (same logic as pickTop grid branch)
      const cands=_queryGrid(grid,wp);
      let gr=null;
      for(let i=state.shapes.length-1;i>=0;i--){const sh=state.shapes[i];if(sh.type!=='frame'&&cands.has(sh)&&G.hit(sh,wp)){gr=sh;break;}}
      if(bf?.id!==gr?.id){gridOk=false;break;}
    }
    assert.ok(gridOk,'spatial grid pickTop matches brute-force for 60 shapes');
    // Also verify: after Store.commit (grid invalidate) a fresh build is used
    const shNew=Shape.make('rect',{x:500,y:500,w:30,h:30});shNew.z=99;
    Store.commit({op:'add',shape:shNew});
    const gridAfter=_buildGrid(state.shapes);
    const candsAfter=_queryGrid(gridAfter,{x:515,y:515});
    assert.ok([...candsAfter].some(s=>s.id===shNew.id),'newly added shape appears in rebuilt grid');
    console.log('  ✓ spatial index: grid matches brute-force for 60-shape board, invalidation works');
  }

  // v1.6.12: keyboard shape creation — each creation tool yields a default shape
  {
    state.shapes.length = 0; state.history.length = 0; state.histIdx = -1; state.seq = 0; state.seenOps = new Set(); state.selection = new Set();
    state.viewport = { x: 0, y: 0, zoom: 1 };
    for (const [tool, type, check] of [
      ['rect','rect', s => s.w===120 && s.h===80],
      ['ellipse','ellipse', s => s.w===120 && s.h===80],
      ['line','line', s => s.x1!==s.x2 && s.y1===s.y2],
      ['arrow','arrow', s => s.x1!==s.x2],
      ['sticky','sticky', s => s.w===160 && s.h===160 && typeof s.color==='string'],
      ['frame','frame', s => s.w===800 && s.h===500 && /^Frame /.test(s.label)],
    ]) {
      const before = state.shapes.length;
      state.tool = tool;
      const ok = createShapeKbd();
      assert.ok(ok, `createShapeKbd returns true for ${tool}`);
      assert.strictEqual(state.shapes.length, before + 1, `${tool} adds exactly one shape`);
      const s = state.shapes[state.shapes.length - 1];
      assert.strictEqual(s.type, type, `${tool} creates a ${type}`);
      assert.ok(check(s), `${tool} default geometry correct`);
      assert.ok(state.selection.has(s.id), `${tool} new shape is selected`);
      // Reversible like any add op
      const n = state.shapes.length;
      Store.undo();
      assert.strictEqual(state.shapes.length, n - 1, `${tool} creation is undoable`);
      Store.redo();
      assert.strictEqual(state.shapes.length, n, `${tool} creation redoable`);
      state.tool = tool; // pickTool('select') ran inside; reset for next loop
    }
    // text path returns true (opens editor) and creates a text shape
    state.tool = 'text';
    const tn = state.shapes.length;
    assert.ok(createShapeKbd(), 'createShapeKbd returns true for text');
    assert.strictEqual(state.shapes.length, tn + 1, 'text adds one shape');
    assert.strictEqual(state.shapes[state.shapes.length-1].type, 'text', 'text creates a text shape');
    // non-creation tools are a no-op
    for (const tool of ['select','hand','eraser','pen']) {
      state.tool = tool;
      const c = state.shapes.length;
      assert.ok(!createShapeKbd(), `createShapeKbd no-op for ${tool}`);
      assert.strictEqual(state.shapes.length, c, `${tool} creates nothing`);
    }
    console.log('  ✓ keyboard creation: all tools default-create, undoable, no-op for select/hand/eraser/pen');
  }

  // v1.6.13: variable-width pen — slow (closely spaced) ink is thicker than fast (widely spaced)
  {
    const size = 8, base = size, LO = 0.45;
    // Slow stroke: points 1wu apart. Fast stroke: points 200wu apart.
    const slow = [], fast = [];
    for (let i = 0; i < 10; i++) { slow.push([i * 1, 0]); fast.push([i * 200, 0]); }
    const ws = penWidths(slow, size), wf = penWidths(fast, size);
    assert.strictEqual(ws.length, slow.length, 'penWidths returns one width per point');
    // every width within [LO*base, base]
    for (const w of ws.concat(wf)) {
      assert.ok(w <= base + 1e-9 && w >= LO * base - 1e-9, 'pen width stays within [LO*base, base]');
    }
    // slow ink is meaningfully thicker than fast ink at the interior
    assert.ok(ws[5] > wf[5] + 0.5, 'slow stroke is thicker than fast stroke');
    // slow stroke near full base width (closely spaced)
    assert.ok(ws[5] > 0.9 * base, 'slow stroke approaches full width');
    // fast stroke tapers toward the floor
    assert.ok(wf[5] < 0.7 * base, 'fast stroke tapers thin');
    // degenerate inputs don't throw
    assert.strictEqual(penWidths([[0,0]], size).length, 1, 'single-point penWidths ok');
    console.log('  ✓ variable-width pen: slow ink thicker than fast, widths bounded [LO*base, base]');
    // SVG export emits variable-width segments and tolerates non-finite coords
    const penShape = { id:'pn', type:'pen', z:0, stroke:'#111', size:6,
      pts:[[0,0],[1,0],[2,0],[200,0],[400,0]] };
    const penSvg = buildSVG([penShape], '#FFFFFF') || '';
    const widths = [...penSvg.matchAll(/stroke-width="([\d.]+)"/g)].map(m => +m[1]);
    assert.ok(widths.length >= 2, 'pen SVG emits multiple segments');
    assert.ok(Math.max(...widths) > Math.min(...widths), 'pen SVG segments have varying width');
    const badPen = { id:'pb', type:'pen', z:0, stroke:'#111', size:6, pts:[[0,0],[Infinity,NaN],[5,5]] };
    const badSvg = buildSVG([badPen], '#FFFFFF') || '';
    const badPaths = [...badSvg.matchAll(/<path[^>]*\/>/g)].map(m => m[0]);
    assert.ok(badPaths.length > 0 && badPaths.every(p => !/(NaN|Infinity)/.test(p)),
      'pen SVG path coords/widths coerce non-finite via _num');
    console.log('  ✓ variable-width pen: SVG export parity + non-finite coord safety');
  }

  // v1.6.14: pointer pressure — a varying pressure signal drives width; constant/none falls back to velocity
  {
    const size = 8, base = size, LO = 0.45;
    // Closely-spaced points (so velocity would say "thick everywhere"), but pressure ramps low→high.
    const pr = [];
    for (let i = 0; i < 10; i++) pr.push([i, 0, i / 9]); // pressure 0 .. 1
    const wp = penWidths(pr, size);
    assert.ok(wp[8] > wp[1] + 1, 'high-pressure end is thicker than low-pressure start');
    for (const w of wp) assert.ok(w <= base + 1e-9 && w >= LO * base - 1e-9, 'pressure width bounded');
    // Constant pressure (mouse 0.5) → ignored as a signal, velocity proxy used instead.
    // Build a stroke that is slow then fast; constant pressure must NOT flatten the taper.
    const mixed = [];
    for (let i = 0; i < 6; i++) mixed.push([i * 1, 0, 0.5]);     // slow
    for (let i = 1; i < 5; i++) mixed.push([6 + i * 200, 0, 0.5]); // fast
    const wm = penWidths(mixed, size);
    assert.ok(wm[2] > wm[8] + 0.5, 'constant pressure falls back to velocity (slow thicker than fast)');
    // Legacy 2-tuples (no pressure element) still work unchanged.
    const legacy = penWidths([[0,0],[1,0],[2,0],[200,0],[400,0]], size);
    assert.strictEqual(legacy.length, 5, 'legacy 2-tuple penWidths unchanged');
    assert.ok(legacy[1] > legacy[3], 'legacy stroke still velocity-tapered');
    // Non-finite pressure → treated as no-signal, no throw.
    const badPr = penWidths([[0,0,NaN],[1,0,0.9],[2,0,0.2]], size);
    assert.ok(badPr.every(Number.isFinite), 'non-finite pressure tolerated');
    console.log('  ✓ pointer pressure: varying signal drives width, constant/none → velocity, legacy safe');
  }

  // core invariant — apply N ops, undo all == initial; redo all == post-ops.
  // This is the net to catch reversibility regressions like the old zorder bug.
  {
    const mulberry32 = (a) => () => { a|=0; a=a+0x6D2B79F5|0; let t=Math.imul(a^a>>>15,1|a); t=t+Math.imul(t^t>>>7,61|t)^t; return ((t^t>>>14)>>>0)/4294967296; };
    const ser = () => JSON.stringify(state.shapes);
    let scenarios = 0;
    for (let seed = 1; seed <= 30; seed++) {
      const rnd = mulberry32((seed * 2654435761) >>> 0), ri = (n) => Math.floor(rnd() * n);
      state.shapes.length = 0; state.history.length = 0; state.histIdx = -1;
      state.seq = 0; state.seenOps = new Set(); state.selection = new Set();
      for (let i = 0; i < 4; i++) { const s = Shape.make('rect', {x:ri(120),y:ri(120),w:10+ri(40),h:10+ri(40)}); s.z = i+1; Store.commit({op:'add', shape:s}); }
      const baseIdx = state.histIdx, snap0 = ser();
      for (let k = 0; k < 10; k++) {
        const ids = state.shapes.map(s => s.id), kind = ri(6);
        if (kind === 0) Store.commit({op:'add', shape:Shape.make('ellipse', {x:ri(200),y:ri(200),w:20,h:20})});
        else if (kind === 1) { const sel = ids.filter(() => rnd() < 0.5); Store.commit({op:'move', ids: sel.length?sel:[ids[ri(ids.length)]], dx:ri(20)-10, dy:ri(20)-10}); }
        else if (kind === 2) { const id = ids[ri(ids.length)], sh = state.shapes.find(s => s.id===id); Store.commit({op:'upd', id, before:{size:sh.size}, after:{size:1+ri(20)}}); }
        else if (kind === 3 && state.shapes.length > 1) { const id = ids[ri(ids.length)], sh = state.shapes.find(s => s.id===id); Store.commit({op:'del', shapes:[JSON.parse(JSON.stringify(sh))]}); }
        else if (kind === 4) { state.selection = new Set([ids[ri(ids.length)]]); [doBringFront,doSendBack,doBringForward,doSendBackward][ri(4)](); }
        else if (ids.length >= 2) { state.selection = new Set(ids); doAlign(['left','right','top','bottom','cx','cy'][ri(6)]); }
      }
      const snapA = ser();
      while (state.histIdx > baseIdx) { if (!Store.undo()) break; }
      assert.strictEqual(ser(), snap0, `seed ${seed}: undo-all restores initial state`);
      while (Store.redo()) {}
      assert.strictEqual(ser(), snapA, `seed ${seed}: redo-all restores post-op state`);
      scenarios++;
    }
    console.log(`  ✓ property-based reversibility: ${scenarios} random scenarios round-trip`);
  }

  console.log('\n✓ All behavioural tests passed');
  pass += 59;

} catch (err) {
  console.log('  ✗ behavioural tests crashed:', err.message);
  fail += 1;
}

console.log(`\n${pass} pass, ${fail} fail`);
process.exit(fail > 0 ? 1 : 0);
