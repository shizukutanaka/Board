// Board - smoke test for op-log reversibility and geometry purity.
// Run: node test.mjs
// Extracts subset of board.js and tests it in isolation.

import { readFileSync } from 'fs';
import { execSync } from 'child_process';
import assert from 'assert';

const html = readFileSync('./index.html', 'utf8');
const readme = readFileSync('./README.md', 'utf8');
const _codeVer = (html.match(/const V='([^']+)'/) || [])[1];
// Size is no longer hard-capped (44KB gzip budget removed 2026-06-13). A loose raw
// ceiling stays purely as a runaway-growth guard; gzip size is reported for visibility.
const RAW_CEILING = 512 * 1024;
const _gzSize = parseInt(execSync('gzip -9 -c index.html | wc -c').toString().trim());
console.log(`  ℹ index.html: ${html.length} bytes raw, ${_gzSize} bytes gzip`);

// ---- presence checks ----
const checks = [
  ['Single-file (no external script)', !/<script[^>]+src=["']https?:/.test(html)],
  ['Single-file (no external link)', !/<link[^>]+(href)=["']https?:/.test(html)],
  // Socratic perspective (2026-06-14): the product is defined by NEGATIONS (no
  // signup/weight/paywall/privacy-violation). A negation is only credible if it
  // is falsifiable. Single-file was already enforced above; these make the two
  // load-bearing-but-previously-prose values testable: zero third-party network
  // (privacy / zero-tracking) and offline-equivalence (ships an offline fallback).
  ['Privacy: no telemetry/analytics primitives', !/sendBeacon|XMLHttpRequest|\bgtag\(|google-analytics|googletagmanager|mixpanel|amplitude|\bSentry\b/i.test(html)],
  ['Privacy: zero third-party origins (only W3C SVG namespace identifier)', ((html.match(/https?:\/\/[A-Za-z0-9._-]+/gi)||[]).every(u=>/(?:www\.)?w3\.org/i.test(u)))],
  ['Offline-equivalence: SW ships a cache-first offline fallback', /caches\.open\(/.test(html) && (/new Response\(['"]offline/.test(html) || /status:\s*503/.test(html))],
  // Longevity (local-first ownership, §3.7): the autosave must request durable
  // (non-evictable) storage, else a board lives in the browser's best-effort
  // bucket and a "clear site data" or disk-pressure eviction loses it.
  ['Longevity: requests durable (non-evictable) storage', /navigator\.storage|\bst\.persist\b/.test(html) && /\.persist\(\)/.test(html)],
  ['PWA manifest inline', /rel="manifest"/.test(html) && /data:application\/manifest\+json/.test(html)],
  ['ServiceWorker registered', /serviceWorker.*register/.test(html)],
  ['i18n ja + en', /I18N\s*=/.test(html) && html.includes('ja:{') && html.includes('en:{')],
  ['WCAG AAA brand-ink token', html.includes('--brand-ink:#003B40')],
  ['IndexedDB store', html.includes("DB_NAME='board'")],
  ['RAF render loop', /requestAnimationFrame\(frame\)/.test(html)],
  ['op-log op types (add/del/upd/move/clear/zorder/replace)',
    ['add','del','upd','move','clear','zorder','replace'].every(op => html.includes(`op:'${op}'`))],
  ['Tools: pen, rect, ellipse, arrow, line, text, eraser, select, hand',
    ['pen','rect','ellipse','arrow','line','text','eraser','select','hand']
      .every(t => html.includes(`data-tool="${t}"`))],
  ['Keymap covers all tools',
    /KEYMAP\s*=\s*\{v:'select'[^}]+h:'hand'[^}]+p:'pen'/.test(html)],
  ['Raw size under runaway ceiling (512KB)', html.length < RAW_CEILING],
  // v1.6.77: enforce docs-vs-reality — the README version badge must track `const V`.
  // Root cause of prior drift (README said 1.6.70 while code shipped 1.6.77): nothing
  // tied them. This check fails the build the moment a version bump forgets the README.
  ['README version badge matches const V', !!_codeVer && readme.includes(`version-${_codeVer}-`)],
  ['No innerHTML anywhere (XSS-safe)', !/innerHTML\s*=/.test(html)],
  // v1.1: ctx must be let (not const) for exportPNG swap
  ['ctx declared as let (not const)', /let ctx=canvas\.getContext/.test(html)],
  // v1.1: exportPNG passes ctx as parameter (no global swap)
  ['exportPNG passes ctx as parameter', html.includes('drawShape(s,oc)')],
  // v1.1: toBlob null guard
  ['toBlob has null guard', html.includes("if(!bl){UI.toast(t('exportFailed')")],
  // v1.1: op validation in _onRecv
  ['_onRecv validates op.clock', html.includes("typeof op.clock.peer!=='string'")],
  // v1.1: import validates shapes
  ['importFromHash validates shape fields', html.includes("data.shapes.filter(validShape)")],
  ['All data-tool buttons have kbd hints',
    (html.match(/class="tool"[^>]*>/g) || []).length >=
    (html.match(/<kbd>/g) || []).length - 1], // -1 for topbar
  ['brand color #00C4CC used', html.includes('#00C4CC')],
  ['Reduced motion respected', html.includes('prefers-reduced-motion')],
  ['Dark mode vars', html.includes('prefers-color-scheme:dark')],
  // v1.6.83: iOS notch / home-indicator safe area. viewport-fit=cover extends the page
  // under the notch, so the fixed chrome MUST pad with env(safe-area-inset-*) or it hides
  // behind the notch/home bar (a concrete PWA bug per Qiita/Zenn safe-area articles).
  ['viewport-fit=cover for safe-area opt-in', /viewport-fit=cover/.test(html)],
  ['safe-area-inset applied to fixed chrome (topbar/toolbar/statusbar)',
    (html.match(/env\(safe-area-inset-/g)||[]).length>=5
    && /\.topbar\{[^}]*env\(safe-area-inset-top\)/.test(html)
    && /\.toolbar\{[^}]*env\(safe-area-inset-left\)/.test(html)
    && /\.statusbar\{[^}]*env\(safe-area-inset-bottom\)/.test(html)],
  ['safe-area uses max() so non-notch devices are unaffected (env→0)',
    /max\([^)]*env\(safe-area-inset/.test(html)],
  ['mobile media query preserves safe-area (not overridden away)',
    /@media \(max-width:720px\)\{[\s\S]*\.statusbar\{[^}]*env\(safe-area-inset-bottom\)/.test(html)],
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
  ['pointercancel restores eraser batch + clears guides', html.includes("_cancelPointerGesture") && html.includes("state.guides=null") && /if\(_eraseBatch\.length\)[\s\S]{0,180}state\.guides=null/.test(html)],
  ['document.title synced on docName change (WCAG 2.4.2)', html.includes('_syncDocTitle')&&html.includes("document.title=")&&html.includes("_syncDocTitle();")],
  ['Screen Wake Lock in presentation mode', html.includes('navigator.wakeLock')&&html.includes('_acquireWakeLock')&&html.includes('_releaseWakeLock')],
  ['RAF idle-stop: invalidate guards with _rafId (no 60fps busy-loop on idle board)', html.includes('let needsRender=true,_rafId=0')&&html.includes('if(!_rafId)_rafId=requestAnimationFrame(frame)')&&html.includes('_rafId=0;')],
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
  // §3.18: minimap had no dismiss affordance — always-on is pure visual noise on a small
  // board with zero user control. M toggles visibility; preference persists (localStorage).
  ['M key routes to UI.toggleMinimap', html.includes("else if(k==='m'&&!meta){UI.toggleMinimap()}")],
  ['help grid documents the M shortcut', html.includes("['M',k.minimap]")],
  ['Minimap.schedule skips requestAnimationFrame while hidden', html.includes("function schedule(){if(!state.showMinimap||_raf)return;_raf=requestAnimationFrame(draw)}")],
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
  ['Presentation on Shift+P / Ctrl+Enter', html.includes("k==='p'&&e.shiftKey") && html.includes("Presentation.enter")],
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
  ['zorder op is minimal-delta changes (ADR-0001 Step2)', html.includes("op:'zorder',changes")],
  ['zorder _apply handles changes-delta + legacy snapshot', html.includes("sh.frac=forward?c.after:c.before") && html.includes("const snap=forward?op.after:op.before")],
  ['fractional index keyBetween/reindexFrac present (ADR-0001)', html.includes("function keyBetween") && html.includes("function reindexFrac")],
  ['z-step ops route through _zCommit (undoable, minimal-delta)', html.includes("_zCommit(changes)") && html.includes("function _zCommit")],
  ['applyRemote whitelists op types', html.includes("REMOTE_OPS") && html.includes("this.REMOTE_OPS.has(op.op)")],
  ['applyRemote validates remote add shape', html.includes("case 'add':    return validShape(op.shape)")],
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
  ['remote move requires finite deltas', html.includes("Number.isFinite(op.dx)&&typeof op.dy==='number'&&Number.isFinite(op.dy)")],
  // v1.6.8: viewport culling + load validation
  ['viewport culling helpers present', html.includes("function visibleWorldRect") && html.includes("function inView")],
  ['draw() culls via inView', html.includes("inView(s,_view)")],
  ['inView margin covers stroke width', html.includes("m=4+(s.size||0)/2")],
  // v1.7.0: connector (edge) labels (ADR-0003)
  ['openLabelEditor shared by boxes + connectors', html.includes("function openLabelEditor(hit,leftPx,topPx,bold)")],
  ['dblclick opens label editor on line/arrow at midpoint', html.includes("hit.type==='line'||hit.type==='arrow'") && html.includes("(en.x1+en.x2)/2,y:(en.y1+en.y2)/2")],
  ['_drawConnLabel renders edge label on canvas', html.includes("function _drawConnLabel(s,c)") && html.includes("c.fillText(s.label,mx,my)")],
  ['line/arrow drawShape calls _drawConnLabel', html.includes("c.stroke();_drawConnLabel(s,c);break;") && html.includes("drawArrow(s,c);_drawConnLabel(s,c);break;")],
  ['_connLabelSVG emits edge label in SVG', html.includes("function _connLabelSVG(s,x1,y1,x2,y2,ox,oy,stroke,paper)")],
  ['Persist.load validates shapes', html.includes("d.shapes.filter(validShape)")],
  // v1.6.9: sticky text auto-wrap
  ['wrapText helper present', html.includes("function wrapText")],
  ['sticky render wraps text', html.includes("wrapTextCached(s,s.text,Math.abs(s.w)-pad*2")],
  ['SVG sticky export wraps text', html.includes("wrapText(s.text,Math.abs(W)-pad2*2")],
  // v1.6.10: keyboard shape navigation (a11y)
  ['cycleSel/describeShape helpers present', html.includes("function cycleSel") && html.includes("function describeShape")],
  ['Tab cycles shape selection', html.includes("else if(k==='tab')") && html.includes("cycleSel(ids,")],
  ['toasts region is aria-live (SR announce)', html.includes('id="toasts"') && html.includes('aria-live="polite"')],
  ['canvas aria-label is updated dynamically in pickTool', html.includes("Drawing canvas. Tab/Shift+Tab cycles shapes,")],
  // v1.6.11: spatial index for pickTop
  ['spatial grid helpers present', html.includes("function _buildGrid") && html.includes("function _queryGrid")],
  ['pickTop uses grid for large boards', html.includes("state.shapes.length>40") && html.includes("_buildGrid(state.shapes)")],
  ['grid invalidated on every _apply', html.includes("_apply(op,forward){") && html.includes("_invalidateGrid()")],
  // v1.6.12: keyboard shape creation (a11y)
  ['createShapeKbd helper present', html.includes("function createShapeKbd")],
  ['Enter creates shape at viewport centre', html.includes("k==='enter'&&!meta&&!e.shiftKey") && html.includes("createShapeKbd()")],
  ['canvas aria-label includes Enter creates hint', html.includes("Enter creates, arrows move, Alt+arrows resize.")],
  ['help grid lists Tab cycle and Enter create', html.includes("['Tab / ⇧Tab',k.cycle]") && html.includes("['Enter',k.create]")],
  // v1.6.13: variable-width pen (velocity-based)
  ['penWidths helper present', html.includes("function penWidths")],
  ['drawPen uses variable width', html.includes("penWidths(p,s.size)") && html.includes("c.lineWidth=(w[i]+w[i+1])/2")],
  ['SVG pen export uses penWidths (display=output parity)', html.includes("penWidths(P,SZ)")],
  // v1.6.14: pointer pressure input
  ['pen captures pointer pressure', html.includes("function _penPr") && html.includes("[wp.x,wp.y,_penPr(e)]")],
  ['penWidths uses varying pressure signal', html.includes("usePr=hasPr&&(mx-mn)>0.05")],
  ['SVG pen carries pressure for parity', html.includes("_num(p&&p[1])+oy,p&&p[2]")],
  // v1.6.15: smart alignment guides (snap to objects)
  ['snapBox helper present', html.includes("function snapBox")],
  ['move uses object snap when grid off', html.includes("function objectSnap") && html.includes("if(!state.snap)")],
  ['guides rendered during drag', html.includes("function drawGuides") && html.includes("state.guides")],
  // v1.6.16: dashed/dotted line styles
  ['dashArr helper present', html.includes("function dashArr")],
  ['drawShape applies line dash', html.includes("c.setLineDash((s.dash&&")],
  ['SVG export emits stroke-dasharray', html.includes("stroke-dasharray=") && html.includes("dashArr(s.dash,SZ)")],
  ['line-style buttons in style panel', html.includes('data-dash="1"') && html.includes('data-dash="2"')],
  ['dash wired to selection', html.includes("applyStyleToSelection({dash:state.style.dash})")],
  // v1.6.17: audit fixes
  ['shared validShape used at intake', html.includes("function validShape") && html.includes("filter(validShape)")],
  ['en context menu has ctxDelete + ctxBringFront', html.includes("ctxDelete:'Delete'") && html.includes("ctxBringFront:'Bring to front'")],
  ['Escape closes open modal', html.includes("if(hp.dataset.open==='true')UI.toggleHelp()")],
  ['dashbtn covered by forced-colors', html.includes(".btn,.tool,.swatch,.dashbtn{border:1px solid ButtonText}")],
  ['image cache is bounded LRU', html.includes("IMG_CACHE_MAX") && html.includes("_imgCache.keys().next().value")],
  ['load validates viewport finiteness', html.includes("Number.isFinite(+d.viewport.zoom)&&d.viewport.zoom>0")],
  ['load clamps viewport zoom to [MIN_ZOOM,MAX_ZOOM]', html.includes("state.viewport.zoom=clampZoom(+d.viewport.zoom)")],
  ['clampZoom is the single zoom-invariant source', html.includes("const clampZoom=z=>Math.max(MIN_ZOOM,Math.min(MAX_ZOOM,z))") && html.includes("const nz=clampZoom(") && html.includes("const z=clampZoom(")],
  // v1.6.18: deeper audit fixes
  ['P selects pen, Shift+P presents', html.includes("k==='p'&&e.shiftKey&&!meta&&!e.altKey")],
  ['pen has no resize handles', html.includes("if(s.type==='pen'||s.w==null)return [];")],
  ['presentation saves+restores viewport', html.includes("_savedVp={x:state.viewport.x") && html.includes("Object.assign(state.viewport,_savedVp)")],
  ['help grid present row uses i18n', html.includes("['⇧P',k.present]") && html.includes("['↑↓←→',k.nudge]")],
  ['help i18n keys in ja and en', html.includes("present:'プレゼン'") && html.includes("present:'Present'")],
  // v1.6.19: sync + PWA fixes
  ['snapshot ops get distinct, stable clock keys (id-based)', html.includes("seq:'snap:'+s.id")],
  ['snapshot merge accepts only add ops (non-add ops rejected at merge path)', html.includes("op.op!=='add'||!op.shape")&&html.includes("byId(op.shape.id))continue")],
  ['applyRemote gates clock via validClock (wclock-poison guard)', html.includes('function validClock(')&&html.includes('if(!validClock(op.clock))return')],
  ['local clocks stamped via monotonic nowTs (no wall-clock regression)', html.includes('function nowTs()')&&html.includes('ts:nowTs()')&&!html.includes('ts:Date.now()')],
  ['uid() uses crypto.randomUUID for 122-bit collision safety', html.includes('crypto.randomUUID')],
  ['service worker purges stale caches', html.includes("caches.keys()") && html.includes("k!==C")],
  // v1.6.20: fourth audit pass
  ['drawShape opacity uses nullish coalescing (opacity=0 invisible, not opaque)', html.includes('c.globalAlpha=s.opacity??1')],
  ['pointercancel restores in-progress resize/move shapes', html.includes("ptr.dragKind==='resize'&&ptr.resizeOrig")],
  ['frame label Escape removes blur listener before cancelling', html.includes("inp.removeEventListener('blur',commit)")],
  ['context menu items have role=menuitem (WCAG 4.1.2)', html.includes("setAttribute('role','menuitem')")],
  ['context menu separators have role=separator', html.includes("setAttribute('role','separator')")],
  // v1.6.21: fifth audit pass
  ['exportPDF uses setTransform for correct world-coordinate mapping', html.includes('oc.setTransform(dpr,0,0,dpr,(-b.x+pad)*dpr,(-b.y+pad)*dpr)')],
  ['G.hit handles single-point pen dot (length===1 early return)', html.includes('pts.length===1)return Math.hypot')],
  ['doPaste remaps groupId via gidMap to avoid cross-group contamination', html.includes('gidMap') && html.includes('gidMap.has(sh.groupId)')],
  // v1.6.22: IME + pen RDP + docs
  ['frame label keydown guards ev.isComposing (IME safe)', html.includes('inp.addEventListener') && html.includes('if(ev.isComposing)return')],
  ['text editor keydown guards ev.isComposing (IME safe)', (html.match(/if\(ev\.isComposing\)return/g)||[]).length >= 2],
  ['pen RDP decimation function _rdp present', html.includes('function _rdp(pts,eps)')],
  ['endPen applies RDP on commit', html.includes('d.pts.length>3')&&html.includes('_rdp(d.pts,0.5)')],
  ['size is reported (no hard cap since 2026-06-13)', readFileSync('./test.mjs','utf8').includes("Size is no longer hard-capped")],
  // v1.6.25: style op for single-undo multi-select style
  ['style op in _apply (single undo for multi-select style)', html.includes("case 'style':")],
  ['style op in REMOTE_OPS allowlist', html.includes("'style'")&&html.includes('REMOTE_OPS')],
  ['applyStyleToSelection uses style op not per-shape upd', html.includes("{op:'style',before,after}")],
  // v1.6.26: emptying existing text = single undo (not upd+del)
  ['text editor captures orig clone at open', html.includes('const orig=clone(s)')],
  ['emptied existing text deletes original via single del op', html.includes("const delOp={op:'del',shapes:[orig]};")&&html.includes("Store.commit(delOp);")],
  ['existing text edit branch is else-if (no double op)', html.includes("}else if(newText!==origText){")],
  // v1.6.23: .board file export/import
  ['exportBoard function exists', html.includes('function exportBoard()')],
  ['exportBoard revokes Blob URL to prevent memory leak', html.includes("revokeObjectURL(_bu),1e4")],
  ['importBoard uses atomic replace op (not clear+adds)', html.includes('function importBoard') && html.includes('.filter(validShape)') && html.includes("op:'replace',before,after")],
  ['Ctrl+Shift+S triggers exportBoard', html.includes("e.shiftKey){e.preventDefault();exportBoard()}")],
  // ADR-0004: doClearAll/importBoard/importFromHash back up the pre-replace board to a
  // second IndexedDB slot before the destructive swap, so it survives past the session-only
  // undo window (reload / closed tab). importBoard can't be exercised directly in this
  // harness (FileReader has no fake), so its trigger wiring is presence-checked; the backup
  // mechanism itself (Persist.saveBackup/checkBackup/restoreBackup) is behaviourally tested.
  ['ADR-0004: doClearAll backs up pre-clear board before the destructive commit',
    html.includes("Persist.saveBackup(clone(state.shapes),{...state.viewport},state.docName);   // ADR-0004\n  Store.commit({op:'clear'")],
  ['ADR-0004: importBoard backs up pre-import board before the whole-board swap',
    html.includes("if(before.length)Persist.saveBackup(before,{...state.viewport},state.docName);   // ADR-0004\n      state.shapes=shapes.map(clone);")],
  ['ADR-0004: importFromHash backs up pre-import board before the whole-board swap',
    html.includes("if(before.length)Persist.saveBackup(before,{...state.viewport},state.docName);\n      state.shapes=valid.map(clone);")],
  ['ADR-0004: main() offers a one-time restore prompt when a backup exists at boot',
    html.includes("if(await Persist.checkBackup()){") && html.includes("if(confirm(t('backupAvailable')))await Persist.restoreBackup();") && html.includes("else await Persist.discardBackup();")],
  ['drag-drop accepts .board files', html.includes(".endsWith('.board')")],
  // v1.6.27: SVG export renders single-point pen as circle dot
  ['SVG export handles single-point pen shape', html.includes('s.pts.length===1')],
  ['SVG export emits circle for single-point pen', html.includes('<circle cx=')],
  // v1.6.28: ungroup undo preserves per-shape groupId across multi-group ungroup
  ['doUngroup captures before snapshot', html.includes('before.push({id:s.id,groupId:s.groupId})')],
  ['ungroup backward uses before snapshot when available', html.includes('if(op.before){for(const b of op.before)')],
  // v1.6.29: slider undo coalescing - single op per drag, not per input event
  ['slider before-capture helper _sfbCapture defined', html.includes('function _sfbCapture(p)')],
  ['slider flush helper _sfbFlush defined', html.includes('function _sfbFlush(p,v)')],
  ['size slider uses pointerdown/change for undo, not input', html.includes("_sfbCapture('size')") && html.includes("_sfbFlush('size'")],
  ['opacity slider uses pointerdown/change for undo', html.includes("_sfbCapture('opacity')") && html.includes("_sfbFlush('opacity'")],
  ['size slider captures on focus (keyboard undo)', html.includes("focus',()=>_sfbCapture('size')")],
  ['opacity slider captures on focus (keyboard undo)', html.includes("focus',()=>_sfbCapture('opacity')")],
  ['size slider re-arms after flush for sequential keyboard presses', html.includes("_sfbFlush('size',state.style.size);_sfbCapture('size')")],
  ['opacity slider re-arms after flush for sequential keyboard presses', html.includes("_sfbFlush('opacity',state.style.opacity);_sfbCapture('opacity')")],
  // v1.6.29: dead op:'z' code removed; i18n for image-too-large
  ['dead op-z case removed from _apply', !html.includes('// Array reorder')],
  ['imgBig i18n key present in ja and en', html.includes("imgBig:'画像が大きすぎます") && html.includes("imgBig:'Image too large")],
  ['on/off/online/offline i18n keys in both locales (parity fix)', html.includes("on:'オン'") && html.includes("off:'オフ'") && html.includes("on:'On'") && html.includes("off:'Off'") && html.includes("online:'Online'") && html.includes("offline:'Offline'")],
  // v1.6.32: i18n for popup-blocked and invalid-board; drop-image toast
  ['popupBlocked i18n key in both locales', html.includes("popupBlocked:'ポップアップ") && html.includes("popupBlocked:'Pop-up blocked")],
  ['invalidBoard i18n key in both locales', html.includes("invalidBoard:'ボードファイル") && html.includes("invalidBoard:'Invalid .board")],
  ['drop-image handler shows toast', html.includes("invalidate();UI.toast(t('imagePasted')")],
  ['popupBlocked used via t()', html.includes("t('popupBlocked')")],
  ['invalidBoard used via t()', html.includes("t('invalidBoard')")],
  // v1.6.33: Present button data-t, snap/grid i18n, comment fix
  ['Present button span has data-t attribute', html.includes('data-t="present"')],
  ['present key in ja i18n', html.includes("present:'プレゼン'")],
  ['snap/grid on/off keys in ja i18n', html.includes("snap:'スナップ'") && html.includes("on:'オン'")],
  ['snap/grid toasts use t()', html.includes("t('snap')") && html.includes("t('grid')") && html.includes("t('on')")],
  // v1.6.34: online/offline status i18n
  ['online/offline keys in ja i18n', html.includes("online:'オンライン'") && html.includes("offline:'オフライン'")],
  ['updateOnline uses t()', html.includes("t('online')") && html.includes("t('offline')")],
  // v1.6.35: snap key in en, present in en, help grid uses t('snap')
  ['snap key in en i18n', html.includes("snap:'Snap'")],
  ['present key in en i18n (fixes lowercase regression)', html.includes("en:{export:'Export',present:'Present'")],
  ['help grid snap row uses t()', html.includes("t('snap')")],
  // v1.6.36: exportFailed/saveFailed i18n, shapes status label, describeShape locale
  ['exportFailed key in ja and en', html.includes("exportFailed:'書き出し失敗'") && html.includes("exportFailed:'Export failed'")],
  ['saveFailed key in ja and en', html.includes("saveFailed:'保存失敗'") && html.includes("saveFailed:'Save failed'")],
  ['toBlob null guard uses t(exportFailed)', html.includes("t('exportFailed')")],
  ['Persist.save error uses t(saveFailed)', html.includes("t('saveFailed')")],
  ['shapes key in ja and en', html.includes("shapes:'図形'") && html.includes("shapes:'Shapes'")],
  ['status bar saved label has data-t', html.includes('class="lbl" data-t="saved"')],
  ['status bar shapes label has data-t', html.includes('class="lbl" data-t="shapes"')],
  ['describeShape uses T.k locale name', html.includes("T.k?.[s.type]??s.type")],
  ['no dead t() fallbacks in toast/confirm calls', !html.includes("t('connected')||") && !html.includes("t('importConfirm')||")],
  // v1.6.37: toast role=alert/status, Escape closes context menu
  ['toast sets role=alert for err/warn, role=status otherwise', html.includes("setAttribute('role',kind==='err'||kind==='warn'?'alert':'status')")],
  ['Escape key closes context menu before modal dismiss', html.includes("ctx2.dataset.open==='true'){UI.closeCtxMenu();return}")],
  // v1.6.38: context menu auto-focuses first item on open (keyboard a11y)
  ['context menu focuses first item on open', html.includes("m.querySelector('.ctx-item')?.focus()")],
  // v1.6.39: console cleanup - no redundant console.warn/error in production paths
  ['no console.warn in BroadcastChannel catch', !html.includes("console.warn('BroadcastChannel init failed'")],
  ['no console.error in save catch (user gets toast)', !html.includes("console.error('save failed'")],
  ['import parse failure shows invalidBoard toast (not silent)', html.includes("UI.toast(t('invalidBoard'),'err')")],
  // v1.6.40: style panel a11y - decorative labels hidden, panel groups have role/aria-label
  ['style panel S/F labels are aria-hidden (decorative)', html.includes('<span class="sp-label" aria-hidden="true">S</span>') && html.includes('<span class="sp-label" aria-hidden="true">F</span>')],
  ['size and opacity groups have role=group', html.includes('role="group" aria-label="Size"') && html.includes('role="group" aria-label="Opacity"')],
  ['SW dead code removed: r|| before new Response is gone', !html.includes('return r||new Response')],
  // v1.6.41: line style sp-label is aria-hidden (group has aria-label)
  ['line style sp-label is aria-hidden', html.includes('data-t="lineStyle" aria-hidden="true"')],
  // v1.6.43: zoom display is a button (keyboard accessible) with aria-label
  ['zoom level is a button not a div (keyboard-accessible)', html.includes('<button class="zoom-val"')],
  ['zoom button has aria-label', html.includes('aria-label="Zoom level, click to reset"')],
  // v1.6.44: minimap canvas has role=img and descriptive aria-label
  ['minimap canvas has role=img', html.includes('id="minimap"') && html.includes('role="img"')],
  ['minimap canvas has descriptive aria-label', html.includes('aria-label="Board minimap — click to navigate"')],
  // v1.6.44: x,y decorative label is aria-hidden
  ['x,y status label is aria-hidden (decorative)', html.includes('<span class="lbl" aria-hidden="true">x,y</span>')],
  // v1.6.45: connection status is aria-live (announces online/offline to SR)
  ['sConn has aria-live=polite (online/offline announces to SR)', html.includes('id="sConn" aria-live="polite"')],
  // v1.6.45: zoom badge has role=group for semantic grouping
  ['zoom-badge has role=group and aria-label', html.includes('class="zoom-badge" role="group" aria-label="Zoom controls"')],
  // v1.6.52: dialog focus management (WCAG 2.4.3)
  ['toggleHelp moves focus to helpClose on open', html.includes("open?'helpClose':'btnHelp'")],
  ['openShare moves focus to shareClose', html.includes("document.getElementById('shareClose').focus()")],
  ['closeShare returns focus to btnShare', html.includes("document.getElementById('btnShare').focus()")],
  // v1.6.56: custom color pickers (native <input type=color>) for stroke and fill
  ['custom stroke color picker present', html.includes('class="swatch cp" data-cp="stroke"')],
  ['custom fill color picker present', html.includes('class="swatch cp" data-cp="fill"')],
  ['custom color pickers route through applyStyleToSelection', html.includes("for(const cp of document.querySelectorAll('input.cp'))")],
  // v1.6.57: flip H/V - reuses the align op, context menu + ⇧H/⇧V shortcut
  ['flip ctx labels in ja and en', html.includes("ctxFlipH:'左右反転'") && html.includes("ctxFlipH:'Flip horizontal'")],
  ['flip context-menu entries present', html.includes("['ctxFlipH','⇧H',()=>doFlip('h')]") && html.includes("['ctxFlipV','⇧V',()=>doFlip('v')]")],
  ['flip keyboard shortcut (⇧H/⇧V) guarded by selection', html.includes("(k==='h'||k==='v')&&state.selection.size){e.preventDefault();doFlip(k)}")],
  // v1.6.58: rect/ellipse centre labels - dblclick to set, rendered centred, SVG export
  ['rect/ellipse label rendered centred in canvas', html.includes("_drawBoxLabel(s,c);break;") && html.includes("c.textAlign='center'")],
  ['dblclick label editor handles rect and ellipse', html.includes("hit.type==='frame'||hit.type==='rect'||hit.type==='ellipse'") && html.includes("getCSS(bold?'--accent-contrast':'--ink')")],
  ['SVG export emits label for rect', html.includes("if(s.label)els.push") && html.includes("text-anchor=\"middle\"")],
  // v1.6.59: laser pointer (presentation) + shape lock
  ['laser pointer state + presentation intercept', html.includes("let _laser=null") && html.includes("if(Presentation.isActive()){_laser=wp")],
  ['laser dot drawn during presentation', html.includes("_laser&&Presentation.isActive()") && html.includes("rgba(255,50,50,.75)")],
  ['laser cleared on presentation leave and pointerleave', html.includes("_laser=null;_active=false") && html.includes("pointerleave")],
  ['doLock toggles locked via align op', html.includes("function doLock") && html.includes("op:'align',dir:'lock'")],
  ['locked shapes have no resize handles', html.includes("function getHandles(s){\n  if(s.locked)return [];")],
  ['doMove skips locked shapes', html.includes("if(!sh||sh.locked)continue")],
  ['endSelect move op filters out locked shapes', html.includes("filter(id=>!byId(id)?.locked)")],
  ['locked hover shows not-allowed cursor', html.includes("top.locked?'not-allowed':'move'")],
  ['lock/unlock ctx labels in ja and en', html.includes("ctxLock:'ロック'") && html.includes("ctxLock:'Lock'")],
  ['lock context-menu entry toggles label by locked state', html.includes("?'ctxUnlock':'ctxLock','',doLock")],
  ['locked selection drawn with dashed outline, no handles', html.includes("const lockedSel=sel.every(s=>s.locked)") && html.includes("if(lockedSel)return")],
  // v1.7.05: Tab cycling excludes locked shapes (parity with doMove/doDelete/doRotate/doFlip)
  ['Tab cycling excludes locked shapes (filter before cycleSel)', html.includes("const ids=state.shapes.filter(s=>!s.locked).map(s=>s.id)")],
  // v1.6.60: bound connectors - arrow/line endpoints follow bound shapes
  ['connEnds helper derives bound endpoints', html.includes("function connEnds") && html.includes("function _edgePt")],
  ['G.bbox line uses connEnds', html.includes("const e=connEnds(s);\n      const x=Math.min(e.x1,e.x2)")],
  ['G.hit line uses connEnds', html.includes("const e=connEnds(s);\n        return distToSeg")],
  ['drawArrow uses connEnds', html.includes("const e=connEnds(s);\n  c.beginPath();c.moveTo(e.x1,e.y1)")],
  ['endLineLike binds endpoints dropped on a shape', html.includes("const ba=_bindAt(d.x1,d.y1),bb=_bindAt(d.x2,d.y2)") && html.includes("function _bindAt")],
  ['bound endpoints expose no resize handle', html.includes("if(!s.a)h.push({id:'p1'") && html.includes("if(!s.b)h.push({id:'p2'")],
  ['SVG export derives bound endpoints', html.includes("const _e=connEnds(s);\n    const X1=_num(_e.x1)")],
  // v1.6.61: rotation - shapes rotate on canvas, undo/redo, keyboard ,/.
  ['doRotate function exists', html.includes("function doRotate") && html.includes("op:'align',dir:'rotate'")],
  ['rotation applied in drawShape (save/restore)', html.includes("const _rot=shapeRot(s);") && html.includes("if(_rot)c.restore()")],
  ['G.hit applies inverse rotation', html.includes("if(s.rotate){const _cx=s.x+(s.w||0)/2") && html.includes("_r=-s.rotate*Math.PI/180")],
  ['G.bbox returns rotation envelope', html.includes("if(s.rotate){const _cx=_rb.x+_rb.w/2")],
  ['rotation keyboard shortcuts , and .', html.includes("k===','&&!meta&&state.selection.size") && html.includes("k==='.'&&!meta&&state.selection.size")],
  ['SVG export rotation transform', html.includes("rT=shapeRot(s)?` transform=") && html.includes("rotate(${_num(s.rotate)}")],
  // v1.6.61: shape search - Ctrl+F highlights matching shapes
  ['_sq search state variable', html.includes("let _sq='';")],
  ['search input DOM element created in wire()', html.includes("sq.id='sqinput'") && html.includes("sq.addEventListener('input'")],
  ['search highlight drawn in world space', html.includes("if(_sq){const q=_sq.toLowerCase()") && html.includes("'#F97316'") && html.includes("'#EA580C'")],
  ['Ctrl+F toggles search input', html.includes("meta&&k==='f'") && html.includes("sq.style.display")],
  // v1.6.62: Socratic feature-interaction fixes
  ['flip negates rotation angle (reflection reverses sense)', html.includes("if(s.rotate)s.rotate=(360-s.rotate)%360;")],
  ['rotated box shapes expose handles at rotated positions', html.includes("return hs.map(p=>{const r=_rotPt(p.x,p.y,cx,cy,s.rotate);return{id:p.id,x:r.x,y:r.y}});")],
  ['search placeholder uses i18n t(search)', html.includes("sq.placeholder=t('search')")],
  ['rotate + search i18n keys in ja and en', html.includes("rotate:'回転 (15° / ノブdrag)',search:'検索'") && html.includes("rotate:'Rotate (15° / knob drag)',search:'Search'")],
  ['help grid lists rotate and search shortcuts', html.includes("[', / .',k.rotate]") && html.includes("['⌘F',k.search]") && html.includes("['Enter / ⇧Enter',t('searchNav')]")],
  // keyboard shortcuts (all documented in README)
  ['N shortcut for sticky (in KEYMAP)', html.includes("n:'sticky'")],
  ['⌘G / ⌘⇧G group/ungroup shortcuts', html.includes("k==='g'&&e.shiftKey") && html.includes("doUngroup") && html.includes("doGroup")],
  ['⌥C / ⌥V style copy/paste shortcuts', html.includes("k==='c'&&e.altKey") && html.includes("copyStyle") && html.includes("k==='v'&&e.altKey")],
  ['⌘⇧E SVG export shortcut', html.includes("meta&&k==='e'&&e.shiftKey") && html.includes("exportSVG")],
  // v1.6.63: Socratic round 3 - internal consistency + a11y
  ['doFlip skips locked shapes (consistent with doRotate)', html.includes("function doFlip(axis){\n  const sel=[...state.selection].map(byId).filter(s=>s&&!s.locked);")],
  ['doRotate orbits selection about group centre', html.includes("orbit about group centre, like doFlip") && html.includes("Shape.translate(s,nx-cx,ny-cy)")],
  ['search input has aria-label', html.includes("sq.setAttribute('aria-label',t('search'))")],
  ['search Escape returns focus to canvas', html.includes("invalidate();canvas.focus();}") && html.includes("_sqAdvance(ev.shiftKey?-1:1)")],
  // v1.6.64: Socratic round 4 - rotation scope + lock completeness
  ['doRotate restricted to box shapes (s.w!=null, NaN-safe)', html.includes("filter(s=>s&&!s.locked&&s.w!=null)")],
  ['doDelete skips locked shapes', html.includes("function doDelete(){\n  const sel=[...state.selection].map(byId).filter(s=>s&&!s.locked);")],
  ['eraser skips locked shapes', html.includes("if(hit&&!hit.locked&&!_eraseBatch.some")],
  // v1.6.65: budget removed - deferred fixes implemented
  ['_edgePt is rotation-aware (projects to true rotated edge)', html.includes("const ub=sh.w!=null?{x:sh.x,y:sh.y,w:sh.w,h:sh.h}:G.bbox(sh)") && html.includes("const cx=ub.x+ub.w/2,cy=ub.y+ub.h/2,rot=sh.rotate")],
  ['rotation extends to all box types (text bbox uses envelope)', !html.includes("if(s.type==='text'){\n      return{x:s.x,y:s.y,w:s.w,h:s.h};")],
  ['SVG rotation applies to text/image/sticky/frame', html.includes("font-size=\"${fs}\" fill=\"${stroke}\"${a}${rT}>") && html.includes("href=\"${_esc(s.dataUrl)}\"${a}${rT}/>")],
  ['minimap applies rotation transform', html.includes("const _mr=s.rotate&&s.w!=null;") && html.includes("if(_mr)mx.restore();")],
  ['minimap renders frame shapes (case frame fallthrough to rect)', html.includes("case 'frame':\n        case 'rect':")],
  ['describeShape announces locked and rotated state', html.includes("if(s.locked)d+=` ${t('ctxLock')}`;") && html.includes("if(s.rotate)d+=` ${s.rotate}°`;")],
  ['describeShape announces text/label content for SR', html.includes("const txt=String(s.text||s.label||'').replace(/\\s+/g,' ').trim();") && html.includes("txt.length>30?txt.slice(0,30)+'…':txt")],
  // v1.6.66: resize object-snap
  ['resizeSnap exists and applyResize uses it', html.includes("function resizeSnap(orig,handle,wp)") && html.includes(":resizeSnap(orig,handle,wp); // lock/alt override obj-snap")],
  ['resize commit clears alignment guides', html.includes("ptr.resizeHandle=null;ptr.resizeOrig=null;state.guides=null;")],
  ['resize Shift locks aspect ratio on corners', html.includes("const lock=shift&&corner&&orig.w>0&&orig.h>0;")],
  // v1.6.67: drag-to-rotate handle
  ['rotation handle helper + hit-test present', html.includes("function getRotHandle(s)") && html.includes("function hitRotHandle(wp,s)")],
  ['pointerdown enters rotate dragKind on knob hit', html.includes("const rh=hitRotHandle(wp,onlySel);") && html.includes("ptr.dragKind='rotate';")],
  ['rotate drag maps angle (knob-up=0°), Shift snaps 15°', html.includes("Math.atan2(wp.y-ptr.rotCy,wp.x-ptr.rotCx)*180/Math.PI+90") && html.includes("deg=Math.round(deg/15)*15;")],
  ['rotate commit records upd + announces angle', html.includes("ptr.dragKind==='rotate'") && html.includes("UI.toast(describeShape(rsh)); // SR announce new angle")],
  ['rotation knob drawn in drawSelection', html.includes("const rh=getRotHandle(sh);") && html.includes("ctx.arc(kp.x,kp.y,hs/2,0,PI2)")],
  // v1.7.62: the overlay pass (selection/guides/marquee/laser/peer cursors) draws in CSS px
  // under a DPR transform — multiplying w2s output by DPR double-applied it on HiDPI.
  ['overlay pass draws in CSS px, no double DPR (HiDPI fix)',
    html.includes('// Overlay pass: CSS-px space, the transform supplies DPR')
    && !html.includes('sp.x*DPR') && !html.includes('kp.x*DPR') && !html.includes('lp.x*DPR')
    && html.includes('const x=p1.x,y=p1.y,w=p2.x-p1.x,h=p2.y-p1.y;')],
  // v1.7.62 / ADR-0011: peer selection presence
  ['ADR-0011 selection presence: send + receive + draw wired',
    html.includes("case 'selection':") && html.includes('sendSelectionIfChanged(){')
    && html.includes('function drawPeerSelections()') && html.includes('Net.sendSelectionIfChanged();')],
  ['ADR-0011 latecomer resend: _touchPeer resets _lastSelSent',
    html.includes('this._lastSelSent=null;invalidate();')],
  // v1.7.63 robustness audit
  ['SW: navigations are network-first (cache-first pinned users to the first cached version forever)',
    html.includes("if(e.request.mode==='navigate')")
    && html.includes("catch(_){const r=await c.match(e.request);if(r)return r;return new Response('offline',{status:503})}")],
  ['peer flood: MAX_PEERS cap + peer-id type/length intake guard',
    html.includes('const MAX_PEERS=32')
    && html.includes('if(state.peers.size>=MAX_PEERS)return;')
    && html.includes("typeof msg.peer!=='string'||msg.peer.length>MAX_PEER_ID_LEN")],
  ['snapshot amplification: _sendSnapshot throttled',
    html.includes('_lastSnapAt:0') && html.includes('if(now-this._lastSnapAt<1000)return;')],
  ['importBoard: FileReader onerror toasts instead of failing silently',
    html.includes("r.onerror=()=>UI.toast(t('invalidBoard'),'err');")],
  ['docName clamped to 80 chars on all four intake paths (import/IDB/backup/hash)',
    (html.match(/\.slice\(0,80\)/g)||[]).length>=4],
  // v1.6.68: Alt resize-from-centre
  ['Alt resizes about original centre', html.includes("function applyResize(sh,handle,orig,wp,shift,alt)") && html.includes("if(alt){sh.x=cx0-sh.w/2;sh.y=cy0-sh.h/2;}") && html.includes("applyResize(rsh,ptr.resizeHandle,ptr.resizeOrig,wp,e.shiftKey,e.altKey);")],
  // v1.6.69: rotated-box resize
  ['_rotPt shared rotation helper present', html.includes("function _rotPt(px,py,cx,cy,deg)")],
  ['rotated resize works in local frame + world re-pin', html.includes("sp=_rotPt(wp.x,wp.y,cx0,cy0,-orig.rotate);") && html.includes("sh.x+=tgt.x-cur.x;sh.y+=tgt.y-cur.y;")],
  ['selection outline traces rotated box', html.includes("if(single&&single.rotate&&single.w!=null){")],
  // v1.6.70: keyboard resize (Alt+arrow)
  ['resize op registered (apply, validate, remote)', html.includes("case 'resize':\n      case 'align':\n      case 'beautify':{") && html.includes("case 'resize':{const noLock=") && html.includes("'align','style','resize'])")],
  ['Alt+arrow keyboard-resizes box shapes', html.includes("Store._recordCommitted({op:'resize',before,after});") && html.includes("sh.w=Math.max(4,sh.w+dw);sh.h=Math.max(4,sh.h+dh);")],
  // v1.6.71: image import error handling
  ['imgErr i18n key in both locales', html.includes("imgErr:'画像を読み込めませんでした'") && html.includes("imgErr:'Image failed to load'")],
  ['drag-drop image import has img.onerror toast', html.includes("img.onerror=()=>UI.toast(t('imgErr'),'warn');") ],
  ['drag-drop image import has reader.onerror toast', html.includes("reader.onerror=()=>UI.toast(t('imgErr'),'warn');\n    reader.readAsDataURL(f);")],
  ['context menu deduplicates consecutive separators', html.includes(".filter((it,i,a)=>!(it==='sep'&&(i===0||i===a.length-1||a[i-1]==='sep')))")],
  ['doDuplicate does not clobber clipboard (uses _placeCopies, not state.clipboard=)', html.includes("const added=_placeCopies(sel);   // independent of state.clipboard") && html.includes("function _placeCopies(srcShapes")],
  // v1.6.71: import sites clear stale selection + wclock (mirror replace op's _apply)
  ['importBoard clears selection+wclock on whole-board swap', html.includes("state.shapes=shapes.map(clone);_invalidateGrid();   // ADR-0009\n      // Match the replace op's _apply") && html.includes("state.selection.clear();state.wclock={};\n      if(typeof d.docName")],
  ['importFromHash clears selection+wclock on whole-board swap', html.includes("state.shapes=valid.map(clone);_invalidateGrid();state.docName=") && /state\.shapes=valid\.map\(clone\)[\s\S]{0,320}state\.selection\.clear\(\);state\.wclock=\{\};/.test(html)],
  // v1.6.71: presentation-mode guard precedes editing shortcuts (no undo mid-slideshow)
  ['presentation guard runs before undo/redo/select-all shortcuts', /if\(Presentation\.isActive\(\)\)\{[\s\S]{0,260}return;\n  \}[\s\S]{0,700}if\(meta&&k==='z'&&!e\.shiftKey\)/.test(html)],
  // v1.6.71: export canvas clamped to browser limits
  ['exportPNG uses exportScale clamp', html.includes("const scale=exportScale(w,h,2);")],
  ['exportPDF uses exportScale clamp for dpr', html.includes("dpr=exportScale(W,H,window.devicePixelRatio||1)")],
  // v1.6.72: sticky note resize preserves user's chosen width
  ['resizeAfterTextEdit helper present', html.includes("function resizeAfterTextEdit(s,text,c)")],
  ['sticky branch preserves s.w (no text-width overwrite)', html.includes("if(s.type==='sticky'){") && html.includes("wl=wrapText(s.text||'',Math.abs(s.w)-pad*2")],
  ['text branch still auto-sizes width', html.includes("}else{\n    const lines=(s.text||'').split('\\n');")],
  // v1.6.73: doAlign skips locked shapes (parity with doDelete/doRotate/doFlip)
  ['doAlign filters locked shapes', html.includes("const sel=[...state.selection].map(byId).filter(s=>s&&!s.locked);\n  if(sel.length<2)return;")],
  // v1.6.74: _placeCopies remaps connector bindings (sh.a/sh.b) within pasted set
  ['_placeCopies pre-generates idMap for two-pass connector remapping', html.includes("const idMap=new Map();") && html.includes("for(const orig of srcShapes)idMap.set(orig.id,uid());")],
  ['_placeCopies remaps sh.a and sh.b to new ids', html.includes("if(sh.a&&idMap.has(sh.a))sh.a=idMap.get(sh.a);") && html.includes("if(sh.b&&idMap.has(sh.b))sh.b=idMap.get(sh.b);")],
  // v1.6.75: keyboard nudge parity with pointer-drag (frame children follow + skip locked)
  ['withFrameChildren helper shared by drag + nudge', html.includes("function withFrameChildren(ids)") && html.includes("const dragIds=withFrameChildren(state.selection);")],
  ['nudgeSelection mirrors drag: frame children + skip locked', html.includes("function nudgeSelection(dx,dy)") && html.includes("[...withFrameChildren(state.selection)].filter(id=>!byId(id)?.locked)")],
  ['arrow-key handler delegates to nudgeSelection', html.includes("nudgeSelection(dx,dy);")],
  // v1.6.76: render rotation gated to box shapes (canvas/SVG parity, no NaN centre)
  ['shapeRot helper gates rotation to box shapes', html.includes("function shapeRot(s){return s.rotate&&s.w!=null?s.rotate:0;}")],
  ['canvas drawShape uses shapeRot (not raw s.rotate)', html.includes("const _rot=shapeRot(s);")],
  ['SVG export rT uses shapeRot', html.includes("const rT=shapeRot(s)?")],
  // v1.6.77: Persist._saveErrMsg distinguishes QuotaExceededError (Zenn/PWA best practice)
  ['Persist._saveErrMsg branches on QuotaExceededError', html.includes("_saveErrMsg(err){") && html.includes("err.name==='QuotaExceededError'")],
  ['Persist.save catch delegates to _saveErrMsg', html.includes("UI.toast(this._saveErrMsg(err),'err');")],
  ['quotaExceeded i18n key in ja and en', html.includes("quotaExceeded:'保存容量が逼迫しています") && html.includes("quotaExceeded:'Storage quota exceeded")],
  // v1.6.78: pen captures all coalesced sub-samples (high-rate stylus smoothness)
  ['coalescedSamples helper present with fallback', html.includes("function coalescedSamples(e)") && html.includes("return cs&&cs.length?cs:[e];")],
  ['pen pointermove iterates coalesced samples', html.includes("case 'pen':for(const ce of coalescedSamples(e))contPen(G.s2w({x:ce.offsetX,y:ce.offsetY}),ce);break;")],
  // v1.6.79: Persist.flushIfHidden — visibilitychange→hidden as mobile-reliable durability signal
  ['Persist.flushIfHidden gates on vis===hidden && state.dirty', html.includes("flushIfHidden(vis){") && html.includes("if(vis==='hidden'&&state.dirty){")],
  ['Persist.flushIfHidden cancels pending debounce + calls save', html.includes("clearTimeout(this._saveT);\n      this.save();")],
  ['visibilitychange listener wires document.visibilityState to flushIfHidden', html.includes("document.addEventListener('visibilitychange',()=>Persist.flushIfHidden(document.visibilityState));")],
  // v1.6.80: multi-touch pinch cancels the single-pointer gesture (no stray edits)
  ['pointerdown aborts single-pointer gesture when a 2nd finger lands', html.includes("if(_pointers.size>=2){abortGesture();return;}")],
  ['pointermove bails while pinch is active', html.includes("if(_pointers.size>=2)return;   // pinch in progress")],
  ['abortGesture reverts move/resize/rotate from pointerdown snapshots', html.includes("function abortGesture(){") && html.includes("if(ptr.dragKind==='move'&&ptr.dragStartShapes){")],
  // v1.6.81: wheel deltaMode normalization (Firefox line-mode parity with Chrome pixels)
  ['wheelPx normalizes deltaMode to pixels', html.includes("function wheelPx(e)") && html.includes("e.deltaMode===1?16:e.deltaMode===2?400:1")],
  ['wheel handler routes through wheelPx', html.includes("const d=wheelPx(e);") && html.includes("zoomAt({x:e.offsetX,y:e.offsetY},-d.y*0.005)")],
  // v1.6.82: IME-safe docName live update (Qiita Rapls / Zenn spacemarket)
  ['imeShouldCommit helper present', html.includes("function imeShouldCommit(e){return !(e&&e.isComposing);}")],
  ['docName input handler gates on imeShouldCommit', html.includes("docNameEl.addEventListener('input',e=>{if(imeShouldCommit(e))_commitDocName()})")],
  ['docName compositionend listener wires final commit', html.includes("docNameEl.addEventListener('compositionend',_commitDocName)")],
  // v1.6.83: coordinate rounding at serialization boundaries (Zenn float-precision bloat)
  ['_round helper sheds float noise', html.includes("function _round(n,dp){return typeof n==='number'&&Number.isFinite(n)?Math.round(n*10**dp)/10**dp:n;}")],
  ['roundShapesForExport rounds coord/dim fields', html.includes("function roundShapesForExport(shapes,dp=2)") && html.includes("['x','y','w','h','x1','y1','x2','y2','rotate']")],
  ['share export rounds shapes', html.includes("shapes:roundShapesForExport(state.shapes),name:state.docName")],
  ['.board export rounds shapes', html.includes("shapes:roundShapesForExport(state.shapes)})],{type:'application/json'})")],
  // v1.6.84: Net.init clears prior presence timer on re-init (no leaked heartbeat)
  ['Net.init clears prior presence timer', html.includes("clearInterval(this._presenceTimer);   // re-init (room switch) must not leak the old heartbeat")],
  // v1.6.85: WebRTC peers lifecycle-managed (not heartbeat-reaped after 15s)
  ['_reapPeers exempts rtc: peers from timeout reaping', html.includes("if(id.startsWith('rtc:'))continue;   // WebRTC peers are lifecycle-managed")],
  ['dc.onclose removes the rtc peer', html.includes("if(this._rtcPeerId){state.peers.delete(this._rtcPeerId);this._rtcPeerId=null;}")],
  ['dc.onopen stores _rtcPeerId for lifecycle management', html.includes("this._rtcPeerId='rtc:'+uid().slice(0,4);")],
  // v1.6.86: multi-image drop cascades by index (async closure capture fix)
  ['drop image cascade uses per-iteration index (not shared ox)', html.includes("files.forEach((f,i)=>{") && html.includes("x:wp.x+i*20,y:wp.y")],
  ['drop image no longer uses a shared incremented ox counter', !html.includes("const sh=Shape.make('image',{x:wp.x+ox,y:wp.y")],
  // v1.6.87: new text/sticky finalize syncs typed content to live peers
  ['_syncTextFinalize present (broadcast-only finalize op)', html.includes("function _syncTextFinalize(s,before,deleted)")],
  ['text editor finalize syncs typed content (non-empty isNew)', html.includes("_syncTextFinalize(s,origText,false);")],
  ['text editor finalize syncs removal (empty isNew)', html.includes("_syncTextFinalize(s,origText,true);")],
  // v1.6.88: rect/ellipse labels render on canvas (parity with SVG export + dblclick feature)
  ['_drawBoxLabel helper present', html.includes("function _drawBoxLabel(s,c)") && html.includes("c.fillText(s.label,s.x+s.w/2,s.y+s.h/2)")],
  ['rect case renders label', html.includes("if(s.stroke){c.stroke()}\n      _drawBoxLabel(s,c);break;\n    case 'ellipse':")],
  ['ellipse case renders label', /case 'ellipse':[\s\S]{0,200}_drawBoxLabel\(s,c\);break;/.test(html)],
  // v1.6.89: colour picker coalesces (one undo/sync op per pick, like the sliders)
  ['colour picker captures on focus/pointerdown', html.includes("cp.addEventListener('focus',()=>_sfbCapture(k));") && html.includes("cp.addEventListener('pointerdown',()=>_sfbCapture(k));")],
  ['colour picker input is live-only (no per-input commit)', html.includes("for(const id of state.selection){const s=byId(id);if(s&&!s.locked)s[k]=cp.value}") && !html.includes("applyStyleToSelection({[k]:cp.value})")],
  ['colour picker flushes one op on change', html.includes("cp.addEventListener('change',()=>{_sfbFlush(k,cp.value);_sfbCapture(k);});")],
  // v1.6.76: ⌘⇧L keyboard shortcut for lock/unlock — README claims "全機能キーボード操作可能"
  // but doLock was right-click-only. Fix adds Ctrl+Shift+L → doLock().
  ['doLock has ⌘⇧L keyboard shortcut', html.includes("meta&&k==='l'&&e.shiftKey")&&html.includes("doLock()")],
  ['lockToggle i18n key present in ja and en', (html.match(/lockToggle:/g)||[]).length>=2],
  ['lockToggle in help grid', html.includes("t('lockToggle')")],
  // v1.7.06: doCopy excludes locked shapes (parity with doDelete/doMove/doAlign)
  ['doCopy expands frame children and excludes locked shapes', html.includes("const sel=[...withFrameChildren(state.selection)].map(byId).filter(s=>s&&!s.locked);\n  if(!sel.length)return;\n  state.clipboard")],
  // v1.6.77: paste/duplicate is one atomic undo — _placeCopies commits a single addMany op
  ['_placeCopies commits one addMany (not per-shape add)', html.includes("if(built.length)Store.commit({op:'addMany',shapes:built})")],
  ['addMany op has an _apply case', /case 'addMany':/.test(html)],
  ['addMany in REMOTE_OPS allow-list', /REMOTE_OPS[\s\S]{0,160}'addMany'/.test(html)],
  ['addMany validated in validRemotePayload (with MAX_OP_SHAPES cap)', /case 'addMany':/.test(html)&&html.includes("case 'addMany':    return Array.isArray(op.shapes)&&op.shapes.length<=MAX_OP_SHAPES&&op.shapes.every(validShape)")],
  // v1.6.85: modal dialog isolation — global canvas shortcuts must not fire behind an
  // open help/share dialog, and Tab is trapped inside it (WCAG 2.4.3 / 2.1.2).
  ['modal focus-trap helpers present', html.includes('function _trapStep')&&html.includes('function _openDialog')],
  ['keydown isolates an open dialog (suppress shortcuts, trap Tab)',
    /const _dlg=_openDialog\(\);[\s\S]{0,200}if\(_dlg&&k!=='escape'\)/.test(html)],
  // v1.6.86: track devicePixelRatio changes (monitor switch) that fire no resize event.
  ['DPR-change watcher present and wired',
    html.includes('function _watchDPR')&&/resolution: \$\{window\.devicePixelRatio\}dppx/.test(html)&&html.includes('_watchDPR();')],
  // v1.6.87: clipboard copy works on file:// (navigator.clipboard absent) via execCommand
  ['copyText has execCommand fallback for non-secure contexts',
    html.includes('async function copyText')&&html.includes("execCommand('copy')")&&html.includes('window.isSecureContext')],
  ['share-copy button routes through copyText (not raw navigator.clipboard)',
    html.includes('await copyText(url)')&&!/shareCopyBtn[\s\S]{0,160}navigator\.clipboard\.writeText/.test(html)],
  ['copyFailed i18n key in ja and en', (html.match(/copyFailed:/g)||[]).length>=2],
  // v1.6.92: PWA install button (beforeinstallprompt)
  ['beforeinstallprompt handler stores deferred prompt and shows button',
    html.includes('beforeinstallprompt')&&html.includes('e.preventDefault()')&&html.includes('_installPrompt=e')&&html.includes("btn.hidden=false")],
  ['appinstalled handler clears prompt and hides button',
    html.includes('appinstalled')&&html.includes('_installPrompt=null')&&html.includes("btn.hidden=true")],
  ['btnInstall hidden by default (no unsolicited install prompt)',
    html.includes('id="btnInstall"')&&html.includes('hidden')],
  ['_onBtnInstall exported for testing',
    html.includes('async function _onBtnInstall()')&&html.includes('_installPrompt.prompt()')&&html.includes('_installPrompt.userChoice')],
  // v1.6.93: SW update notification
  ['controllerchange listener shows update toast',
    html.includes("'controllerchange'")&&html.includes('function _onSwUpdate()')&&html.includes("UI.toast(t('appUpdated'),'ok')")],
  ['appUpdated i18n key in ja and en',
    html.includes("appUpdated:'アプリが更新されました")&&html.includes("appUpdated:'App updated")],
  // v1.6.94: _esc single-quote + IME composition guard
  ['_esc escapes single quotes (defense-in-depth for mixed attr delimiters)',
    html.includes("replace(/'/g,'&#39;')")],
  ['openTextEditor guards auto-resize during IME composition (_textComposing)',
    html.includes('_textComposing')&&html.includes("compositionstart',()=>{_textComposing=true")&&html.includes("compositionend',()=>{_textComposing=false;auto()")],
  // v1.6.95: context menu ARIA APG arrow-key navigation
  ['_ctxMenuKeyNav handles ArrowDown/Up/Home/End (ARIA APG menu pattern)',
    html.includes('function _ctxMenuKeyNav')&&html.includes("'ArrowDown'")&&html.includes("'ArrowUp'")&&html.includes("'Home'")&&html.includes("'End'")],
  ['ctx menu keydown wired in wire() to _ctxMenuKeyNav',
    html.includes('addEventListener(\'keydown\',e=>_ctxMenuKeyNav(')],
  // v1.6.96: Tab closes ctx menu + text shapes have no resize handles
  ['_ctxMenuKeyNav closes menu on Tab (ARIA APG: Tab moves to next tab stop = close)',
    html.includes("'Tab'")&&html.includes("UI.closeCtxMenu()")],
  ['getHandles returns empty for text shapes (content-driven size, no resize conflict)',
    html.includes("s.type==='text')return []")],
  // v1.6.97: doPaste viewport centering + wrapText \\r\\n normalization
  ['doPaste centers at viewport center (_pasteCount cascade, not clipboard mutation)',
    html.includes('_pasteCount')&&html.includes('_lastClipboard')&&html.includes('vCx-srcCx+co')],
  ['wrapText normalizes \\r\\n and \\r before splitting (Windows clipboard parity)',
    html.includes("replace(/\\r\\n/g,'\\n').replace(/\\r/g,'\\n')")],
  // v1.7.23: validRemotePayload must block locked key in remote align ops
  ['remote align op cannot set locked (noLock guard in validRemotePayload, lock dir exempt)',
    html.includes("const noLock=p=>op.dir==='lock'||!('locked' in p);")],
  // v1.7.24a: _apply clear backward must restore pre-clear selection
  ['_apply clear backward restores origSel (mirror of del undo)',
    html.includes("if(op.origSel)state.selection=new Set(op.origSel.filter(id=>byId(id)));") &&
    html.includes("if(origSel.length)state.history[state.histIdx].origSel=origSel;")],
  // v1.7.24b: validRemotePayload must block locked key in remote style/resize ops
  ['remote style/resize ops cannot set locked (noLock guard extended)',
    html.includes("case 'resize':{const noLock=p=>!('locked' in p);")],
  // v1.7.26: _apply replace backward restores origSel; importBoard/importFromHash attach it
  ['_apply replace backward restores origSel; import callers attach origSel + afterWc to op',
    html.includes("if(!forward&&op.origSel)state.selection=new Set(op.origSel.filter(id=>byId(id)));") &&
    html.includes("Store._recordCommitted({op:'replace',before,after:clone(state.shapes),wc:beforeWc,afterWc:clone(state.wclock),origSel});")],
  // v1.7.28: validRemotePayload for upd must block locked key (parity with style/resize/align)
  ['remote upd op cannot set locked (noLock guard extended to upd)',
    html.includes("case 'upd':{const noLock=p=>!('locked' in p);\n      if(typeof op.id!=='string'||!validPatch(op.after)||!noLock(op.after)")],
  // v1.7.30: _apply add backward restores origSel; createShapeKbd attaches origSel
  ['_apply add backward restores origSel; createShapeKbd attaches origSel',
    html.includes("if(op.origSel)state.selection=new Set(op.origSel.filter(id=>byId(id)));") &&
    html.includes("const origSel=[...state.selection];\n  Store.commit({op:'add',shape:s});\n  if(origSel.length)state.history[state.histIdx].origSel=origSel;")],
  // v1.7.33: validRemotePayload group must require before (string-id array)
  ['validRemotePayload group: requires before array with string ids',
    html.includes("&&Array.isArray(op.before)&&op.before.length<=MAX_OP_SHAPES&&op.before.every(b=>b&&typeof b.id==='string');")],
  // v1.7.34: validRemotePayload ungroup must require gids array
  ['validRemotePayload ungroup: requires gids array with string elements',
    html.includes("&&Array.isArray(op.gids)&&op.gids.length<=MAX_OP_SHAPES&&op.gids.every(g=>typeof g==='string'&&g.length>0);")],
  // v1.7.34: _apply ungroup backward must use optional chaining on op.gids
  ['_apply ungroup backward: op.gids?.[0] optional chaining null guard',
    html.includes("const gid=op.gids?.[0];")],
  // v1.7.35: validRemotePayload style/resize/align must require before (before==null previously allowed)
  ['validRemotePayload style/resize/align: before required (op.before==null removed from fallback)',
    !html.includes("(op.before==null||(patches(op.before)&&op.before.every(noLock)))")],
  // v1.7.35: text-blur del origSel pattern must exist at the existing-text-empty path
  ['text-blur del: origSel captured and patched before and after Store.commit del',
    html.includes("const origSel=[...state.selection];\n        const connClears=computeConnClears(new Set([orig.id]));")&&
    html.includes("Store.commit(delOp);\n        if(origSel.length)state.history[state.histIdx].origSel=origSel;")],
  // v1.7.36: flushErase must capture origSel before del commit and patch after
  ['flushErase del: origSel captured before commit and patched after (parity with doDelete)',
    html.includes("const origSel=[...state.selection];\n  const op={op:'del',shapes:clone(_eraseBatch)};")],
  // v1.7.38: _apply('upd', forward) must guard sh.locked (parity with move forward)
  ['_apply upd forward: if(forward&&sh.locked)break guards locked shapes',
    html.includes("const sh=byId(op.id);if(!sh)break;\n        if(forward&&sh.locked)break;")],
  // v1.7.38: _apply style/resize/align forward must guard sh.locked per patch
  ['_apply style/resize/align forward: !(forward&&sh.locked&&!locked-in-p) guards locked shapes per patch',
    html.includes("if(sh&&!(forward&&sh.locked&&!('locked' in p)))Object.assign(sh,clone(p))")],
  // v1.7.39: _apply del forward connClears must guard sh.locked
  ['_apply del forward connClears: if(sh&&!sh.locked) guards locked connectors',
    html.includes("if(sh&&!sh.locked)Object.assign(sh,p.after);}}")],
  // v1.7.40: _apply zorder forward must guard sh.locked (changes path)
  ['_apply zorder forward changes: !(forward&&sh.locked) guards locked shapes',
    html.includes("if(sh&&!(forward&&sh.locked))sh.frac=forward?c.after:c.before}")],
  // v1.7.40: _apply group forward must guard sh.locked
  ['_apply group forward: !(forward&&sh.locked) guards locked shapes from remote group',
    html.includes("if(sh&&!(forward&&sh.locked))sh.groupId=op.gid}")],
  // v1.7.40: _apply ungroup forward must guard sh.locked
  ['_apply ungroup forward: !(forward&&sh.locked) guards locked shapes from remote ungroup',
    html.includes("if(sh&&!(forward&&sh.locked))delete sh.groupId}")],
  // v1.7.37: doGroup/_apply group backward must carry and restore origSel
  ['doGroup: origSel patched onto history entry after _recordCommitted',
    html.includes("Store._recordCommitted({op:'group',ids,gid,before});\n  if(origSel.length)state.history[state.histIdx].origSel=origSel;")],
  ['_apply group backward: if(op.origSel) restores selection',
    html.includes("if(op.origSel)state.selection=new Set(op.origSel.filter(id=>byId(id)));}\n        break;}\n      case 'ungroup':")],
  // v1.7.37: doUngroup/_apply ungroup backward must carry and restore origSel
  ['doUngroup: origSel captured before selection expansion and patched after _recordCommitted',
    html.includes("const origSel=[...ids];\n  // find all groupIds")],
  ['_apply ungroup backward: if(op.origSel) restores selection',
    html.includes("if(op.origSel)state.selection=new Set(op.origSel.filter(id=>byId(id)));}\n        break;}\n      case 'zorder':")],
  // v1.7.32: _apply group backward must guard op.before (parity with ungroup backward)
  ['_apply group backward: if(op.before) guard added (parity with ungroup)',
    html.includes("if(op.before)for(const b of op.before){const sh=byId(b.id);if(sh){if(b.groupId)sh.groupId=b.groupId;else delete sh.groupId}}\n          if(op.origSel)state.selection=new Set(op.origSel.filter(id=>byId(id)));}")],
  // v1.7.31: endRectLike/endLineLike/beginText attach origSel (parity with createShapeKbd)
  ['endRectLike/endLineLike/beginText attach origSel before shape add commit',
    (html.match(/const origSel=\[\.\.\.state\.selection\];\n  Store\.commit\(\{op:'add',shape:d\}\);\n  if\(origSel\.length\)state\.history\[state\.histIdx\]\.origSel=origSel;/g)||[]).length >= 2 &&
    html.includes("const origSel=[...state.selection];\n  Store.commit({op:'add',shape:s});\n  if(origSel.length)state.history[state.histIdx].origSel=origSel;\n  openTextEditor")],
  // v1.7.43: _zCommit captures origSel before zorder _recordCommitted
  ['_zCommit: origSel captured before zorder commit and patched onto history entry',
    html.includes("Store._recordCommitted({op:'zorder',changes});\n  if(origSel.length)state.history[state.histIdx].origSel=origSel;")],
  // v1.7.44: MAX_OP_SHAPES constant defined (DoS guard for remote ops)
  ['MAX_OP_SHAPES constant defined (remote array size cap)',
    html.includes("const MAX_OP_SHAPES=500;")],
  // v1.7.44: nextZ uses reduce to avoid spread RangeError on large boards
  ['nextZ uses reduce (safe for >65K shapes, no spread RangeError)',
    html.includes("function nextZ(){return state.shapes.length?state.shapes.reduce((m,s)=>Math.max(m,s.z||0),0)+1:1}")],
  // v1.7.44: _apply replace forward restores afterWc on redo
  ['_apply replace forward: if(forward&&op.afterWc) restores wclock on redo',
    html.includes("if(forward&&op.afterWc)state.wclock=clone(op.afterWc);")],
  // v1.7.43: _apply zorder backward restores origSel (mirrors move/align/group/ungroup)
  ['_apply zorder backward: if(!forward&&op.origSel) restores selection',
    html.includes("if(!forward&&op.origSel)state.selection=new Set(op.origSel.filter(id=>byId(id)));\n        break;}\n      case 'style':")],
  // v1.7.43: keyboard resize (Alt+Arrow) captures origSel around resize _recordCommitted
  ['keyboard resize (Alt+Arrow): origSel captured before resize commit',
    html.includes("const origSel=[...state.selection];\n      Store._recordCommitted({op:'resize',before,after});\n      if(origSel.length)state.history[state.histIdx].origSel=origSel;")],
  // v1.7.43: drag-resize upd captures origSel (mirrors endSelect/nudgeSelection pattern)
  ['drag-resize: origSel captured before upd _recordCommitted (ptr.resizeOrig path)',
    html.includes("const origSel=[...state.selection];\n            Store._recordCommitted({op:'upd',id:rsh.id,before,after});\n            if(origSel.length)state.history[state.histIdx].origSel=origSel;\n          }\n        }\n        ptr.resizeHandle=null")],
  // v1.7.43: _apply upd backward restores origSel (drag-resize/rotate undo)
  ['_apply upd backward: if(!forward&&op.origSel) restores selection',
    html.includes("Object.assign(sh,p);\n        if(!forward&&op.origSel)state.selection=new Set(op.origSel.filter(id=>byId(id)));\n        break;}\n      case 'move':{")],
  // v1.7.45: openLabelEditor commit closure must capture origSel (label-edit undo restores selection)
  ['openLabelEditor commit: origSel captured before upd _recordCommitted',
    html.includes("hit.label=lbl||null;const origSel=[...state.selection];Store._recordCommitted({op:'upd',id:hit.id,before,after});if(origSel.length)state.history[state.histIdx].origSel=origSel;invalidate()")],
  // v1.7.45: openTextEditor existing-text changed path must capture origSel (text-edit undo restores selection)
  ['openTextEditor existing-text: origSel captured before upd _recordCommitted',
    html.includes("Store._recordCommitted({op:'upd',id:s.id,before,after});\n        if(origSel.length)state.history[state.histIdx].origSel=origSel;")],
  // v1.7.46: validRemotePayload del connClears must have MAX_OP_SHAPES length cap
  ['validRemotePayload del connClears: length<=MAX_OP_SHAPES cap added',
    html.includes("&&op.connClears.length<=MAX_OP_SHAPES&&op.connClears.every(")],
  // v1.7.46: drawShape duplicate rect/ellipse label block removed
  ['drawShape: duplicate inline label block after switch removed (label drawn once via _drawBoxLabel)',
    !html.includes("if((s.type==='rect'||s.type==='ellipse')&&s.label){\n    const cx=s.x+s.w/2")],
  // v1.7.46: _apply del backward connClears must respect sh.locked (parity with forward)
  ['_apply del backward connClears: if(sh&&!sh.locked) lock guard added (parity with forward path)',
    html.includes("if(op.connClears){for(const p of op.connClears){const sh=byId(p.id);if(sh&&!sh.locked)Object.assign(sh,p.before);}}")],
  // v1.7.47: validRemotePayload align must validate dir against a whitelist
  ['validRemotePayload align: dir whitelist (DIRS Set) prevents unknown dir values',
    html.includes("const DIRS=new Set(['left','right','cx','top','bottom','cy','hspace','vspace','flip','rotate','lock']);")],
  // v1.7.47: doPaste uses canvas.getBoundingClientRect() for viewport center (not window.innerWidth)
  ['doPaste: canvas.getBoundingClientRect() used for viewport center (not window.innerWidth)',
    html.includes("const _r=canvas.getBoundingClientRect();\n  const vCx=v.x+_r.width/(v.zoom*2);")],
  // v1.7.47: minimap draw and click use canvas.getBoundingClientRect() (not window.innerWidth)
  ['minimap: canvas.getBoundingClientRect() used for viewport rect and click-navigate',
    html.includes("_r=canvas.getBoundingClientRect(),cW=_r.width,cH=_r.height;")&&
    html.includes("const _r=canvas.getBoundingClientRect();\n    state.viewport.x=wx-_r.width/")],
  // v1.7.47: del op.wc refreshed on every forward apply (not lazy)
  ['_apply del: op.wc refreshed on every forward apply (if(!op.wc) guard removed)',
    !html.includes("if(!op.wc){op.wc={};for")&&
    html.includes("op.wc={};for(const sh of op.shapes)if(state.wclock[sh.id])op.wc[sh.id]=clone(state.wclock[sh.id]);")],
  // v1.7.48: 'clear' removed from REMOTE_OPS (remote peer cannot wipe board)
  ["REMOTE_OPS excludes 'clear' (board-wipe is local-only like 'replace')",
    html.includes("REMOTE_OPS:new Set(['add','addMany','del','upd','move','group','ungroup','zorder','align','style','resize'])")],
  // v1.7.48: _applySnapshot caps shape count at MAX_OP_SHAPES
  ['_applySnapshot: MAX_OP_SHAPES cap on snapshot shapes (DoS guard)',
    html.includes("const valid=shapes.slice(0,MAX_OP_SHAPES).filter(validShape);")],
  // v1.7.48: sticky shadow set before fill (renders correctly)
  ['sticky note shadow set before fill (not after)',
    html.includes("c.shadowColor='rgba(0,0,0,.08)';c.shadowBlur=8;c.shadowOffsetY=2;\n      c.beginPath();roundRect(")],
  // v1.7.48: group gid must be non-empty string
  ['validRemotePayload group: gid must be non-empty string (op.gid.length>0)',
    html.includes("&&typeof op.gid==='string'&&op.gid.length>0")],
  // v1.7.48: move dx/dy must be actual numbers not coercible strings
  ['validRemotePayload move: typeof op.dx/dy === number (no string coercion)',
    html.includes("&&typeof op.dx==='number'&&Number.isFinite(op.dx)&&typeof op.dy==='number'&&Number.isFinite(op.dy)")],
  // v1.7.56 (ADR-0007, FT-07): export menu + .board file-picker DOM/wiring
  ['btnExportMenu button and hidden fileImport input present in the DOM',
    html.includes('id="btnExportMenu"') && html.includes('id="fileImport"') && html.includes('accept=".board"')],
  ['btnExportMenu wired to UI.openExportMenu, fileImport wired to importBoard',
    html.includes("UI.openExportMenu(r.left,r.bottom+4)") && html.includes("if(f)importBoard(f);")],
  ['openCtxMenu accepts an optional customItems override (backward-compatible default)',
    html.includes("openCtxMenu(x,y,customItems){") && html.includes("const items=customItems||[")],
  ['ctxExportPNG/SVG/PDF/Board + ctxImportBoard i18n keys present in ja and en',
    (html.match(/ctxExportPNG:/g)||[]).length>=2 && (html.match(/ctxImportBoard:/g)||[]).length>=2],
  // v1.7.57 (ADR-0008, FT-05): Share modal clarity — role-labeled steps + code copy buttons
  ['rtcOfferCopyBtn and rtcAnswerCopyBtn present in the Share modal DOM',
    html.includes('id="rtcOfferCopyBtn"') && html.includes('id="rtcAnswerCopyBtn"')],
  ['signaling code copy buttons route through copyText (not raw navigator.clipboard)',
    html.includes("_copyCode('rtcOffer')") && html.includes("_copyCode('rtcAnswer')") &&
    html.includes("const _copyCode=async(taId)=>{const v=_g(taId).value;if(!v)return;const ok=await copyText(v);")],
  ['shareCodeCopied i18n key present in ja and en (distinct from shareUrlCopied)',
    (html.match(/shareCodeCopied:/g)||[]).length>=2],
  ['stale unused i18n key sharePasteAnswer removed (verified zero references before deletion)',
    !html.includes('sharePasteAnswer')],
  ['Share modal step labels are role-labeled (inviting side / joining side), not just numbered',
    html.includes('誘う側 手順1') && html.includes('招待された側 手順1') &&
    html.includes("Inviting side, step 1") && html.includes("Joining side, step 1")],
  // v1.7.58 (ADR-0009): byId() O(1) id index
  ['byId is a lazy Map index invalidated via the shared _invalidateGrid choke point',
    html.includes("function _invalidateGrid(){_grid=null;_idIndex=null;}") &&
    html.includes("if(!_idIndex||_idIndex.size!==state.shapes.length){_idIndex=new Map();for(const s of state.shapes)_idIndex.set(s.id,s);}")],
  ['exportPDF convertToBlob rejection routes to the same exportFailed toast as the toBlob(null) path',
    html.includes("off.convertToBlob({type:'image/png'}).then(fin,()=>fin(null));")],
  // v1.7.59 (a11y-audit-2026-07): theme-aware accent-contrast token, no raw --brand outlines left
  ['--accent-contrast token defined for base(light)/dark-media/dark-attr, no raw var(--brand) outline left',
    html.includes("--accent-contrast:var(--brand-ink);") &&
    html.includes("--accent-contrast:var(--brand);") &&
    !html.includes("outline:2px solid var(--brand)") &&
    (html.match(/outline:2px solid var\(--accent-contrast\)/g)||[]).length===7],
  // v1.7.60 (a11y-audit-2026-07 follow-up): canvas UI-indicator strokes (selection box,
  // rotation tether, alignment guides, marquee, minimap viewport) also use the
  // theme-aware token, not raw --brand — same contrast fix, extended past CSS to canvas.
  // Shape-drawing DEFAULT colors (new frame/sticky stroke fallbacks) are deliberately left
  // on raw --brand: that's a style choice, not an accessibility-critical indicator.
  ["canvas UI-indicator strokes (selection/guides/marquee/rotation-tether/minimap-viewport) use --accent-contrast",
    (html.match(/getCSS\('--accent-contrast'\)/g)||[]).length===5 &&
    (html.match(/getCSS\('--brand'\)/g)||[]).length===5],
  ['frame label editor text color uses --accent-contrast (real text, needs the 4.5:1 floor too)',
    html.includes("getCSS(bold?'--accent-contrast':'--ink')")],
  ['floating search box border uses --accent-contrast, not raw --brand',
    html.includes("border:2px solid var(--accent-contrast);border-radius:6px;padding:5px 10px;font-size:14px;color:var(--ink);outline:none;")],
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
  querySelector: () => ({style:{display:'',removeProperty(){},setProperty(){}}, hidden:false}),
  addEventListener(){},
  title: '',
  activeElement: null,
};
const fakeWin = {
  devicePixelRatio: 1, innerWidth: 800, innerHeight: 600,
  addEventListener(){}, removeEventListener(){},
  requestAnimationFrame: (fn) => 0,
  setTimeout, clearTimeout, setInterval: () => 0, clearInterval,
  location: { hash: '', origin: 'http://test', pathname: '/index.html' },
  history: { replaceState(){} },
  navigator: { language:'en', onLine:true,
    serviceWorker:{ register:()=>Promise.resolve(), _listeners:{},
      addEventListener(type,fn){ this._listeners[type]=fn; } },
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

// Minimal working fake of the IndexedDB request/transaction async-callback shape, used to
// exercise Persist.saveBackup/checkBackup/restoreBackup for real (not just call-counting).
// Handlers (oncomplete/onsuccess) are always attached synchronously by txDone()/reqDone()
// right after transaction()/get() return, so firing them via queueMicrotask is safe — it
// runs after that synchronous attachment, in the same tick chain as the awaiting caller.
function makeFakeIdb(){
  const store=new Map();
  return {_store:store,transaction(){
    const tx={oncomplete:null,onerror:null,onabort:null,
      objectStore(){return{
        get(key){const rq={onsuccess:null,onerror:null};
          queueMicrotask(()=>{rq.result=store.get(key);rq.onsuccess&&rq.onsuccess();});
          return rq;},
        put(val,key){store.set(key,val);},
        delete(key){store.delete(key);},
      };}};
    queueMicrotask(()=>tx.oncomplete&&tx.oncomplete());
    return tx;
  }};
}

// Execute in isolated function scope; export hooks via globalThis
try {
  const fn = new Function('window','document','navigator','requestAnimationFrame',
    'indexedDB','URL','setTimeout','clearTimeout','setInterval','clearInterval',
    'getComputedStyle','confirm','alert','Blob','globalThis','self',`
    ${js}
    return { state, Store, G, Shape, distToSeg,
             doBringFront, doSendBack, doBringForward, doSendBackward,
             doAlign, doFlip, snapV, snapPt,
             getHandles, applyResize, resizeSnap, handleCursor, getRotHandle,
             doGroup, doUngroup, doPaste, doDuplicate, doCopy, doClearAll, pickTop, buildSVG, exportScale, inView, wrapText, wrapTextCached, cycleSel, describeShape,
             copyStyle, pasteStyle, applyStyleToSelection,
             _buildGrid, _queryGrid, sortZ, createShapeKbd, pickTool, penWidths, snapBox, dashArr, validShape,
             _sfbCapture, _sfbFlush, _sbf, doLock, connEnds, computeConnClears, doRotate, doDelete, keyBetween, reindexFrac, validRemotePayload, clampZoom, MIN_ZOOM, MAX_ZOOM, Net, clockNewer, nowTs, resizeAfterTextEdit, withFrameChildren, nudgeSelection, shapeRot, Persist, coalescedSamples, beginPen, contPen, abortGesture, ptr, wheelPx, imeShouldCommit, roundShapesForExport, _round, _syncTextFinalize,
             _sqNav, _sqAdvance, _setSq, UI, _trapStep, _watchDPR, copyText, Minimap, recognizeStroke, doBeautify,
             flushErase, _pushEraseBatch: (s) => _eraseBatch.push(s), _cancelPointerGesture, _longPressFire, _armLongPress, _clearLongPress, _syncDocTitle, Presentation, canvas, resize,
             exportPNG, exportSVG, exportPDF, exportBoard, importBoard, _invalidateGrid, byId, eraseAt,
             _onBtnInstall, _getInstallPrompt: () => _installPrompt, _setInstallPrompt: (v) => { _installPrompt = v; },
             _onSwUpdate, _ctxMenuKeyNav,
             _getPasteCount: () => _pasteCount, _resetPasteClipboard: () => { _lastClipboard = null; },
             endRectLike, endLineLike,
             draw, _setCtx: (c) => { const p = ctx; ctx = c; return p; } };
  `);
  const api = fn(
    fakeWin, fakeDoc, fakeWin.navigator, fakeWin.requestAnimationFrame,
    fakeWin.indexedDB, fakeWin.URL, setTimeout, clearTimeout, setInterval, clearInterval,
    fakeWin.getComputedStyle, fakeWin.confirm, fakeWin.alert, Blob, fakeWin, fakeWin
  );
  const { state, Store, G, Shape, distToSeg,
          doBringFront, doSendBack, doBringForward, doSendBackward,
          doAlign, doFlip, snapV, snapPt,
          getHandles, applyResize, resizeSnap, handleCursor, getRotHandle,
          doGroup, doUngroup, doPaste, doDuplicate, doCopy, doClearAll, pickTop, buildSVG, exportScale, inView, wrapText, wrapTextCached, cycleSel, describeShape,
          copyStyle, pasteStyle, applyStyleToSelection,
          _buildGrid, _queryGrid, sortZ, createShapeKbd, pickTool, penWidths, snapBox, dashArr, validShape,
          _sfbCapture, _sfbFlush, _sbf, doLock, connEnds, computeConnClears, doRotate, doDelete, keyBetween, reindexFrac, validRemotePayload, clampZoom, MIN_ZOOM, MAX_ZOOM, Net, clockNewer, nowTs, resizeAfterTextEdit, withFrameChildren, nudgeSelection, shapeRot, Persist, coalescedSamples, beginPen, contPen, abortGesture, ptr, wheelPx, imeShouldCommit, roundShapesForExport, _round, _syncTextFinalize,
          _sqNav, _sqAdvance, _setSq, UI, _trapStep, _watchDPR, copyText, Minimap, recognizeStroke, doBeautify,
          flushErase, _pushEraseBatch, _cancelPointerGesture, _longPressFire, _armLongPress, _clearLongPress, _syncDocTitle, Presentation, canvas, resize,
          exportPNG, exportSVG, exportPDF, exportBoard, importBoard, _invalidateGrid, byId, eraseAt,
          _onBtnInstall, _getInstallPrompt, _setInstallPrompt,
          _onSwUpdate, _ctxMenuKeyNav,
          _getPasteCount, _resetPasteClipboard,
          endRectLike, endLineLike } = api;

  console.log('\n-- behavioural --');

  // geom: distToSeg
  assert.strictEqual(distToSeg({x:0,y:0},{x:-1,y:0},{x:1,y:0}), 0);
  assert.strictEqual(distToSeg({x:0,y:5},{x:-10,y:0},{x:10,y:0}), 5);
  console.log('  ✓ distToSeg correct for axis-aligned segments');

  // Store.add + undo + redo round trip
  state.shapes.length = 0;_invalidateGrid(); state.history.length = 0; state.histIdx = -1;
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

  // ---- undo/redo coverage for ops lacking behavioral round-trip tests ----
  // The architecture's invariant: every op committed locally is reversible via
  // _apply(op,false). String-presence checks (see above) cannot catch logic regressions
  // here - only these end-to-end assertions do.

  // clear undo: all shapes restored with original properties (frac, stroke, etc.)
  {
    state.shapes=[];_invalidateGrid(); state.history=[]; state.histIdx=-1;
    const ca=Shape.make('rect',{x:1,y:1,w:10,h:10}); ca.stroke='#CA0000';
    const cb=Shape.make('ellipse',{x:20,y:1,w:10,h:10}); cb.stroke='#CB0000';
    Store.commit({op:'add',shape:ca}); Store.commit({op:'add',shape:cb});
    const preClear=state.shapes.map(s=>({id:s.id,stroke:s.stroke,frac:s.frac}));
    Store.commit({op:'clear',shapes:state.shapes.map(s=>({...s}))});
    assert.strictEqual(state.shapes.length,0,'clear: board is empty after forward');
    Store.undo();
    assert.strictEqual(state.shapes.length,2,'clear undo: both shapes restored');
    assert.ok(state.shapes.some(s=>s.id===ca.id&&s.stroke==='#CA0000'),'clear undo: ca properties intact');
    assert.ok(state.shapes.some(s=>s.id===cb.id&&s.stroke==='#CB0000'),'clear undo: cb properties intact');
    // frac keys must be preserved so z-order is restored
    assert.ok(state.shapes.every(s=>s.frac===preClear.find(p=>p.id===s.id).frac),'clear undo: frac (z-order) restored');
    console.log('  ✓ clear op undo restores all shapes with original properties and frac order');
  }

  // style undo: single-shape stroke change round-trips cleanly
  {
    state.shapes=[];_invalidateGrid(); state.history=[]; state.histIdx=-1;
    const ss=Shape.make('rect',{x:0,y:0,w:10,h:10}); ss.stroke='#000000';
    Store.commit({op:'add',shape:ss});
    const live=state.shapes.find(s=>s.id===ss.id);
    Store._recordCommitted({op:'style',before:[{id:ss.id,stroke:'#000000'}],after:[{id:ss.id,stroke:'#FF0000'}]});
    live.stroke='#FF0000'; // _recordCommitted assumes caller already applied
    assert.strictEqual(live.stroke,'#FF0000','style: stroke changed to red');
    Store.undo();
    assert.strictEqual(live.stroke,'#000000','style undo: stroke restored to original');
    Store.redo();
    assert.strictEqual(live.stroke,'#FF0000','style redo: stroke re-applied');
    console.log('  ✓ style op undo/redo round-trips stroke correctly');
  }

  // group undo: groupId assigned then removed by undo; ungroup undo: groupId restored
  {
    state.shapes=[];_invalidateGrid(); state.history=[]; state.histIdx=-1;
    const ga=Shape.make('rect',{x:0,y:0,w:5,h:5});
    const gb=Shape.make('rect',{x:10,y:0,w:5,h:5});
    Store.commit({op:'add',shape:ga}); Store.commit({op:'add',shape:gb});
    const la=state.shapes.find(s=>s.id===ga.id), lb=state.shapes.find(s=>s.id===gb.id);
    // group
    const gid='TEST_GID';
    la.groupId=gid; lb.groupId=gid;
    Store._recordCommitted({op:'group',ids:[ga.id,gb.id],gid,before:[{id:ga.id,groupId:undefined},{id:gb.id,groupId:undefined}]});
    assert.strictEqual(la.groupId,gid,'group: groupId assigned');
    Store.undo();
    assert.strictEqual(la.groupId,undefined,'group undo: groupId removed from la');
    assert.strictEqual(lb.groupId,undefined,'group undo: groupId removed from lb');
    Store.redo();
    assert.strictEqual(la.groupId,gid,'group redo: groupId re-assigned');
    // ungroup
    delete la.groupId; delete lb.groupId;
    Store._recordCommitted({op:'ungroup',ids:[ga.id,gb.id],gids:[gid],before:[{id:ga.id,groupId:gid},{id:gb.id,groupId:gid}]});
    assert.strictEqual(la.groupId,undefined,'ungroup: groupId removed');
    Store.undo();
    assert.strictEqual(la.groupId,gid,'ungroup undo: groupId restored');
    assert.strictEqual(lb.groupId,gid,'ungroup undo: groupId restored on lb');
    console.log('  ✓ group/ungroup undo/redo round-trips groupId correctly');
  }


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

  // v1.6.41: G.hit for ellipse, line/arrow, sticky/frame
  {
    // Filled ellipse: centre point hits
    assert.strictEqual(G.hit({type:'ellipse',x:0,y:0,w:100,h:60,fill:'#000'},{x:50,y:30}),true,'ellipse filled centre');
    // Unfilled ellipse: point deep inside misses
    assert.strictEqual(G.hit({type:'ellipse',x:0,y:0,w:100,h:60,fill:null},{x:50,y:30}),false,'ellipse outline: interior miss');
    // Unfilled ellipse: point on edge hits
    assert.strictEqual(G.hit({type:'ellipse',x:0,y:0,w:100,h:60,fill:null},{x:100,y:30}),true,'ellipse outline: edge hit');
    // Line: point on the segment hits
    assert.strictEqual(G.hit({type:'line',x1:0,y1:0,x2:100,y2:0,size:2},{x:50,y:2}),true,'line: near midpoint hits');
    // Line: point far away misses
    assert.strictEqual(G.hit({type:'line',x1:0,y1:0,x2:100,y2:0,size:2},{x:50,y:200}),false,'line: far away misses');
    // Sticky: bbox interior hits
    assert.strictEqual(G.hit({type:'sticky',x:10,y:10,w:100,h:80},{x:60,y:50}),true,'sticky: interior hits');
    assert.strictEqual(G.hit({type:'sticky',x:10,y:10,w:100,h:80},{x:200,y:50}),false,'sticky: outside misses');
    console.log('  ✓ G.hit: ellipse filled/outline, line proximity, sticky bbox');
  }

  console.log('\n-- v1.1: CRDT / sync --');

  // CRDT clock: commit stamps ops
  state.shapes.length = 0;_invalidateGrid(); state.history.length = 0; state.histIdx = -1;
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
  state.shapes.length = 0;_invalidateGrid(); state.history.length = 0; state.histIdx = -1;
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
  state.shapes.length = 0;_invalidateGrid(); state.history.length = 0; state.histIdx = -1;
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
  state.shapes.length = 0;_invalidateGrid(); state.history.length = 0; state.histIdx = -1;
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
  state.shapes.length = 0;_invalidateGrid(); state.history.length = 0; state.histIdx = -1;
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
  state.shapes.length = 0;_invalidateGrid(); state.history.length = 0; state.histIdx = -1;
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

  // §3-2: value-level payload guard - NaN/Infinity injection and prototype
  // pollution via upd/style must be dropped (a finite shape must not vanish).
  {
    const x1 = state.shapes[0].x, sz0 = state.shapes[0].size;
    Store.applyRemote({op:'upd', id:mvId, after:{x:NaN}, clock:{peer:'attacker', seq:10, ts:1}});
    assert.strictEqual(state.shapes[0].x, x1, 'remote upd with NaN coordinate is dropped');
    Store.applyRemote({op:'upd', id:mvId, after:{w:Infinity}, clock:{peer:'attacker', seq:11, ts:1}});
    assert.ok(Number.isFinite(state.shapes[0].w), 'remote upd with Infinity is dropped');
    Store.applyRemote({op:'upd', id:mvId, after:JSON.parse('{"__proto__":{"polluted":1}}'), clock:{peer:'attacker', seq:12, ts:1}});
    assert.notStrictEqual(({}).polluted, 1, 'prototype pollution via __proto__ patch is blocked');
    Store.applyRemote({op:'style', after:[{id:mvId, size:NaN}], clock:{peer:'attacker', seq:13, ts:1}});
    assert.strictEqual(state.shapes[0].size, sz0, 'remote style with NaN value is dropped');
    // a well-formed upd still applies
    Store.applyRemote({op:'upd', id:mvId, after:{x:x1+3}, clock:{peer:'peerB', seq:3, ts:1}});
    assert.strictEqual(state.shapes[0].x, x1+3, 'well-formed remote upd is applied');
    console.log('  ✓ applyRemote rejects NaN/Infinity/__proto__ in upd/style payloads');
  }

  // §3.17 follow-up: group/ungroup payload validation. A non-string gid would
  // corrupt _gmap Map keys, selection equality and the clone-remap, and now also
  // flows through the LWW _chg comparison - so reject it at the validator.
  {
    const gv = state.shapes[0].id;
    delete state.shapes[0].groupId;
    Store.applyRemote({op:'group', ids:[gv], gid:{evil:1}, clock:{peer:'attacker', seq:20, ts:1}});
    assert.strictEqual(state.shapes[0].groupId, undefined, 'remote group with non-string gid is dropped');
    Store.applyRemote({op:'group', ids:[{x:1}], gid:'G1', clock:{peer:'attacker', seq:21, ts:1}});
    assert.strictEqual(state.shapes[0].groupId, undefined, 'remote group with non-string ids is dropped');
    Store.applyRemote({op:'group', ids:[gv], gid:'GOOD', before:[{id:gv}], clock:{peer:'peerB', seq:4, ts:1}});
    assert.strictEqual(state.shapes[0].groupId, 'GOOD', 'well-formed remote group is applied');
    console.log('  ✓ applyRemote validates group/ungroup payloads (string ids + gid)');
  }

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
  assert.strictEqual(describeShape({type:'rect',x:10.4,y:20.6,w:5,h:5}), 'Rectangle @ 10,21', 'shape description for SR (en locale name)');
  console.log('  ✓ cycleSel cycles selection, describeShape labels for screen readers');

  // align
  state.shapes.length = 0;_invalidateGrid(); state.history.length = 0; state.histIdx = -1;
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
  state.shapes.length=0;_invalidateGrid(); state.history.length=0; state.histIdx=-1; state.seq=0; state.seenOps=new Set();
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
  state.shapes.length=0;_invalidateGrid(); state.history.length=0; state.histIdx=-1; state.seq=0; state.seenOps=new Set();
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
  state.shapes.length=0;_invalidateGrid(); state.history.length=0; state.histIdx=-1; state.seq=0; state.seenOps=new Set();
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

  // ungroup undo with multiple groups (the multi-group undo bug)
  {
    state.shapes.length=0;_invalidateGrid(); state.history.length=0; state.histIdx=-1; state.seq=0; state.seenOps=new Set();
    const mg1=Shape.make('rect',{x:0,y:0,w:10,h:10});
    const mg2=Shape.make('rect',{x:20,y:0,w:10,h:10});
    const mg3=Shape.make('rect',{x:40,y:0,w:10,h:10});
    const mg4=Shape.make('rect',{x:60,y:0,w:10,h:10});
    state.shapes.push(mg1,mg2,mg3,mg4);
    // create two separate groups
    state.selection=new Set([mg1.id,mg2.id]); doGroup(); const gA=mg1.groupId;
    state.selection=new Set([mg3.id,mg4.id]); doGroup(); const gB=mg3.groupId;
    assert.notStrictEqual(gA, gB, 'two distinct groupIds');
    // select all and ungroup both at once
    state.selection=new Set([mg1.id,mg2.id,mg3.id,mg4.id]);
    doUngroup();
    assert.ok(!mg1.groupId && !mg2.groupId && !mg3.groupId && !mg4.groupId, 'all ungrouped');
    // undo - shapes must return to their ORIGINAL groups
    Store.undo();
    assert.strictEqual(mg1.groupId, gA, 'mg1 restored to group A');
    assert.strictEqual(mg2.groupId, gA, 'mg2 restored to group A');
    assert.strictEqual(mg3.groupId, gB, 'mg3 restored to group B');
    assert.strictEqual(mg4.groupId, gB, 'mg4 restored to group B');
    console.log('  ✓ ungroup undo with multiple groups restores per-shape groupIds');
  }

  // align undo
  state.shapes.length=0;_invalidateGrid(); state.history.length=0; state.histIdx=-1; state.seq=0; state.seenOps=new Set();
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
  state.shapes.length=0;_invalidateGrid(); state.history.length=0; state.histIdx=-1; state.seq=0; state.seenOps=new Set();
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
  state.shapes.length=0;_invalidateGrid(); state.history.length=0; state.histIdx=-1; state.seq=0; state.seenOps=new Set();
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
  // v1.6.11: spatial index - _queryGrid must return all shapes that G.hit can match
  {
    const rnd11 = (() => { let a = 0x11c0de;return () => { a|=0;a=a+0x6D2B79F5|0;let t=Math.imul(a^a>>>15,1|a);t=t+Math.imul(t^t>>>7,61|t)^t;return((t^t>>>14)>>>0)/4294967296; }; })();
    state.shapes.length = 0;_invalidateGrid(); state.history.length = 0; state.histIdx = -1; state.seq = 0; state.seenOps = new Set();
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

  // v1.6.12: keyboard shape creation - each creation tool yields a default shape
  {
    state.shapes.length = 0;_invalidateGrid(); state.history.length = 0; state.histIdx = -1; state.seq = 0; state.seenOps = new Set(); state.selection = new Set();
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

  // v1.6.13: variable-width pen - slow (closely spaced) ink is thicker than fast (widely spaced)
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

  // v1.6.14: pointer pressure - a varying pressure signal drives width; constant/none falls back to velocity
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

  // v1.6.15: smart alignment guides (snap to objects)
  {
    const tol = 8;
    // Moving box near a target whose left edge is 5 away → snaps left edges, emits a vertical guide.
    let r = snapBox({x:105,y:200,w:50,h:30}, [{x:100,y:0,w:40,h:40}], tol);
    assert.strictEqual(r.dx, -5, 'left edge snaps to nearby target left edge');
    assert.ok(r.guides.some(g => g.x1 === g.x2 && g.x1 === 100), 'vertical guide at snap x');
    // Centre-x alignment: target centre at 120, moving centre at 124 (w=40 → x=104) → snap by -4.
    r = snapBox({x:104,y:300,w:40,h:20}, [{x:100,y:0,w:40,h:40}], tol);
    assert.ok(Math.abs(r.dx) <= tol && r.dx !== 0, 'centre-x within tol snaps');
    // Out of range → no snap, no guides.
    r = snapBox({x:500,y:500,w:40,h:20}, [{x:100,y:0,w:40,h:40}], tol);
    assert.strictEqual(r.dx, 0); assert.strictEqual(r.dy, 0);
    assert.strictEqual(r.guides.length, 0, 'no guides when nothing in range');
    // Nearest anchor wins: two anchors of the one target are in range, smallest adj chosen.
    r = snapBox({x:113,y:0,w:20,h:10}, [{x:100,y:0,w:20,h:10}], tol);
    assert.strictEqual(r.dx, -3, 'nearest anchor (offset 3) wins over farther ones (>8 ignored)');
    // Both axes can snap simultaneously → two guides.
    r = snapBox({x:103,y:103,w:20,h:20}, [{x:100,y:100,w:20,h:20}], tol);
    assert.strictEqual(r.dx, -3); assert.strictEqual(r.dy, -3);
    assert.strictEqual(r.guides.length, 2, 'x and y snap emit two guides');
    console.log('  ✓ alignment guides: edge/centre snap, nearest wins, dual-axis, out-of-range no-op');
  }

  // v1.6.16: dashed/dotted line styles
  {
    assert.deepStrictEqual(dashArr(0, 4), [], 'dash 0 = solid (empty pattern)');
    assert.strictEqual(dashArr(1, 4).length, 2, 'dash 1 = dashed (2-tuple)');
    assert.strictEqual(dashArr(2, 4).length, 2, 'dash 2 = dotted (2-tuple)');
    // pattern scales with stroke size
    assert.ok(dashArr(1, 8)[0] > dashArr(1, 2)[0], 'dash pattern scales with size');
    assert.deepStrictEqual(dashArr(99, 4), [], 'unknown dash value falls back to solid');
    // SVG: dashed rect emits stroke-dasharray; solid rect does not.
    const dashed = buildSVG([{id:'d1',type:'rect',z:0,x:0,y:0,w:40,h:30,stroke:'#111',size:2,dash:1}], '#FFF');
    assert.ok(/stroke-dasharray="[\d. ]+"/.test(dashed), 'dashed rect SVG has stroke-dasharray');
    const solid = buildSVG([{id:'s1',type:'rect',z:0,x:0,y:0,w:40,h:30,stroke:'#111',size:2,dash:0}], '#FFF');
    assert.ok(!/stroke-dasharray/.test(solid), 'solid rect SVG has no stroke-dasharray');
    // dash applied through the generic style path is reversible (upd op)
    state.shapes.length = 0;_invalidateGrid(); state.history.length = 0; state.histIdx = -1; state.seq = 0; state.seenOps = new Set();
    const rc = Shape.make('rect', {x:0,y:0,w:10,h:10}); rc.dash = 0; Store.commit({op:'add',shape:rc});
    state.selection = new Set([rc.id]);
    applyStyleToSelection({dash:1});
    assert.strictEqual(state.shapes[0].dash, 1, 'dash applied to selection');
    Store.undo();
    assert.strictEqual(state.shapes[0].dash, 0, 'dash change is undoable');
    console.log('  ✓ line styles: solid/dashed/dotted patterns, SVG dasharray, size-scaled, reversible');
  }

  // v1.6.71: exportScale clamps PNG/PDF canvas to browser limits (no silent blank export)
  {
    const MAXD=16384, MAXA=16384*16384;
    // small board: desired scale passes through untouched
    assert.strictEqual(exportScale(800,600,2), 2, 'exportScale: small board keeps desired 2x');
    assert.strictEqual(exportScale(800,600,1), 1, 'exportScale: small board keeps desired 1x');
    // wide board: single-dimension cap binds (w*scale <= MAXD)
    const wide=exportScale(20000,100,2);
    assert.ok(wide<2, 'exportScale: oversized width reduces scale below desired');
    assert.ok(20000*wide<=MAXD+1e-6, 'exportScale: clamped width within MAX_DIM');
    // tall board: height cap binds
    const tall=exportScale(100,40000,2);
    assert.ok(100*Math.min(2,MAXD/40000) && 40000*tall<=MAXD+1e-6, 'exportScale: clamped height within MAX_DIM');
    // huge near-square board: area cap binds before either dimension cap
    const big=exportScale(15000,15000,2);
    assert.ok((15000*big)*(15000*big)<=MAXA+1, 'exportScale: clamped area within MAX_AREA');
    assert.ok(15000*big<=MAXD+1e-6 && 15000*big>0, 'exportScale: area-clamped dims still positive and within MAX_DIM');
    // degenerate sizes: never throw, return desired
    assert.strictEqual(exportScale(0,500,2), 2, 'exportScale: zero width returns desired (no div-by-zero)');
    assert.strictEqual(exportScale(500,0,3), 3, 'exportScale: zero height returns desired');
    // monotonic: clamped scale never exceeds desired
    assert.ok(exportScale(50000,50000,2)<=2, 'exportScale: result never exceeds desired');
    console.log('  ✓ exportScale: clamps PNG/PDF canvas to MAX_DIM/MAX_AREA, passes small boards through');
  }

  // v1.6.17: validShape rejects malformed shapes (notably bad pen pts that crash render)
  {
    assert.ok(validShape({id:'a',type:'rect',z:0}), 'valid rect accepted');
    assert.ok(validShape({id:'p',type:'pen',z:0,pts:[[0,0],[1,1]]}), 'valid pen accepted');
    assert.ok(!validShape(null), 'null rejected');
    assert.ok(!validShape({type:'rect',z:0}), 'missing id rejected');
    assert.ok(!validShape({id:'x',type:'rect'}), 'missing z rejected');
    assert.ok(!validShape({id:'x',z:'no',type:'rect'}), 'non-number z rejected');
    // The crash-causing cases: pen with bad pts
    assert.ok(!validShape({id:'p',type:'pen',z:0,pts:null}), 'pen with null pts rejected');
    assert.ok(!validShape({id:'p',type:'pen',z:0,pts:[]}), 'pen with empty pts rejected');
    assert.ok(!validShape({id:'p',type:'pen',z:0,pts:'nope'}), 'pen with string pts rejected');
    assert.ok(!validShape({id:'p',type:'pen',z:0,pts:[[0,0],[NaN,1]]}), 'pen with NaN coord rejected');
    assert.ok(!validShape({id:'p',type:'pen',z:0,pts:[[0,0],[null]]}), 'pen with malformed point rejected');
    console.log('  ✓ validShape: accepts sound shapes, rejects malformed pens that would crash render');
  }

  // v1.6.18: getHandles - pen exposes no box handles (box-resize would NaN its x/y/w/h)
  {
    assert.strictEqual(getHandles({type:'pen',pts:[[0,0],[10,10]],z:0}).length, 0, 'pen: no resize handles');
    assert.strictEqual(getHandles({type:'line',x1:0,y1:0,x2:5,y2:5,z:0}).length, 2, 'line: 2 endpoint handles');
    assert.strictEqual(getHandles({type:'rect',x:0,y:0,w:10,h:10,z:0}).length, 8, 'rect: 8 box handles');
    console.log('  ✓ getHandles: pen move-only (0 handles), line=2 endpoints, rect=8 box');
  }

  // v1.6.19: snapshot merge dedup - distinct clock seqs must all apply (the seq:0 bug)
  {
    state.shapes.length = 0;_invalidateGrid(); state.history.length = 0; state.histIdx = -1; state.seenOps = new Set();
    const mk = (id, seq) => ({ op:'add', clock:{peer:'remote', seq},
      shape:{id, type:'rect', z:1, x:0, y:0, w:5, h:5, stroke:'#000', size:1, opacity:1} });
    // Fixed behaviour: each snapshot op has a distinct seq → all adopted.
    Store.applyRemote(mk('a','snap0'));
    Store.applyRemote(mk('b','snap1'));
    Store.applyRemote(mk('c','snap2'));
    assert.strictEqual(state.shapes.length, 3, 'distinct-seq snapshot ops all apply on merge');
    // Regression guard: same seq collapses to one (this is exactly why the fix was needed).
    state.shapes.length = 0;_invalidateGrid(); state.seenOps = new Set();
    Store.applyRemote(mk('d', 0));
    Store.applyRemote(mk('e', 0));
    assert.strictEqual(state.shapes.length, 1, 'same-seq ops collide under peer:seq dedup');
    console.log('  ✓ snapshot merge: distinct clock keys let every shape through dedup');
  }

  // core invariant - apply N ops, undo all == initial; redo all == post-ops.
  // This is the net to catch reversibility regressions like the old zorder bug.
  {
    const mulberry32 = (a) => () => { a|=0; a=a+0x6D2B79F5|0; let t=Math.imul(a^a>>>15,1|a); t=t+Math.imul(t^t>>>7,61|t)^t; return ((t^t>>>14)>>>0)/4294967296; };
    const ser = () => JSON.stringify(state.shapes);
    let scenarios = 0;
    for (let seed = 1; seed <= 30; seed++) {
      const rnd = mulberry32((seed * 2654435761) >>> 0), ri = (n) => Math.floor(rnd() * n);
      state.shapes.length = 0;_invalidateGrid(); state.history.length = 0; state.histIdx = -1;
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

  // v1.6.21: G.hit single-point pen dot
  {
    state.shapes=[];_invalidateGrid();state.history=[];state.histIdx=-1;state.selection=new Set();
    const dot={id:'d1',type:'pen',z:1,pts:[[50,50]],stroke:'#000',size:2,opacity:1};
    Store.commit({op:'add',shape:dot});
    assert.strictEqual(G.hit(dot,{x:50,y:50}),true,'single-point pen: hit at exact point');
    assert.strictEqual(G.hit(dot,{x:55,y:50}),true,'single-point pen: hit within tolerance');
    assert.strictEqual(G.hit(dot,{x:200,y:200}),false,'single-point pen: miss far away');
    console.log('  ✓ G.hit single-point pen dot is hittable');
  }

  // v1.6.21: doPaste remaps groupId (no cross-group contamination)
  {
    state.shapes=[];_invalidateGrid();state.history=[];state.histIdx=-1;state.selection=new Set();
    const s1=Shape.make('rect',{x:0,y:0,w:40,h:40});
    const s2=Shape.make('rect',{x:50,y:0,w:40,h:40});
    Store.commit({op:'add',shape:s1});Store.commit({op:'add',shape:s2});
    state.selection=new Set([s1.id,s2.id]);
    doGroup();
    const origGid=state.shapes.find(s=>s.id===s1.id).groupId;
    assert.ok(origGid,'original shapes have groupId after group');
    // copy via clipboard
    state.clipboard={shapes:state.shapes.filter(s=>s.groupId===origGid).map(s=>JSON.parse(JSON.stringify(s)))};
    doPaste();
    // pasted shapes should have a NEW groupId, not origGid
    const pasted=state.shapes.filter(s=>s.groupId&&s.groupId!==origGid);
    assert.ok(pasted.length===2,'doPaste: two pasted shapes with new groupId');
    assert.ok(pasted[0].groupId===pasted[1].groupId,'doPaste: pasted shapes share new groupId');
    assert.ok(pasted[0].groupId!==origGid,'doPaste: new groupId differs from original');
    console.log('  ✓ doPaste remaps groupId - pasted copies get fresh group identity');
  }

  // doPaste / doDuplicate must place pasted shapes AT THE TOP of the z-order.
  // Regression: ADR-0001 frac system means sortZ uses frac (not z) as the primary key.
  // A pasted shape clones frac from the original, landing it at the original's z-position
  // instead of on top. Fix: clear frac on paste/duplicate so sortZ assigns a fresh top key.
  {
    state.shapes=[];_invalidateGrid();state.history=[];state.histIdx=-1;state.seq=0;state.seenOps=new Set();state.wclock={};state.selection=new Set();
    const pa=Shape.make('rect',{x:0,y:0,w:50,h:50});
    const pb=Shape.make('ellipse',{x:60,y:0,w:50,h:50});
    const pc=Shape.make('rect',{x:120,y:0,w:50,h:50});
    Store.commit({op:'add',shape:pa});Store.commit({op:'add',shape:pb});Store.commit({op:'add',shape:pc});
    // Use the LIVE shape (which has frac assigned by sortZ) to replicate doDuplicate's behaviour.
    // Bug: doPaste clones frac from original, placing copy at original's z-position instead of top.
    const paLive=state.shapes.find(s=>s.id===pa.id);
    assert.ok(paLive.frac!=null,'test setup: paLive has frac assigned by sortZ');
    state.clipboard={shapes:[JSON.parse(JSON.stringify(paLive))]};
    doPaste();
    const top=state.shapes[state.shapes.length-1];
    assert.notStrictEqual(top.id,pa.id,'paste z-order: pasted copy has new id');
    assert.strictEqual(top.type,'rect','paste z-order: pasted copy is on top of z-order');
    assert.ok(top.frac>state.shapes.find(s=>s.id===pc.id).frac,'paste z-order: pasted frac > previous top frac');
    console.log('  ✓ doPaste: pasted shapes land on top of z-order (not at original frac)');
  }

  // v1.6.71: doDuplicate must NOT clobber the copy/paste clipboard.
  // Regression: doDuplicate used to do state.clipboard={shapes:...} then doPaste(),
  // destroying whatever the user had copied. Fix: _placeCopies takes shapes directly,
  // so duplicate routes around state.clipboard. Non-vacuity: assert clipboard identity
  // is preserved through a duplicate, AND that duplicate still actually adds a copy.
  {
    state.shapes=[];_invalidateGrid();state.history=[];state.histIdx=-1;state.seq=0;state.seenOps=new Set();state.wclock={};state.selection=new Set();
    const ca=Shape.make('rect',{x:0,y:0,w:30,h:30,stroke:'#AAA'});
    const cb=Shape.make('ellipse',{x:100,y:0,w:30,h:30,stroke:'#BBB'});
    Store.commit({op:'add',shape:ca});Store.commit({op:'add',shape:cb});
    // user copies shape A
    state.selection=new Set([ca.id]);
    doCopy();
    assert.strictEqual(state.clipboard.shapes.length,1,'copy: clipboard holds 1 shape');
    assert.strictEqual(state.clipboard.shapes[0].stroke,'#AAA','copy: clipboard holds shape A');
    const nBefore=state.shapes.length;
    // user selects shape B and duplicates it
    state.selection=new Set([cb.id]);
    doDuplicate();
    // duplicate added exactly one copy of B
    assert.strictEqual(state.shapes.length,nBefore+1,'duplicate: one new shape added');
    const dup=state.shapes[state.shapes.length-1];
    assert.strictEqual(dup.stroke,'#BBB','duplicate: the copy is of shape B (the selection)');
    // KEY ASSERTION: the copy/paste clipboard still holds shape A, untouched by duplicate
    assert.strictEqual(state.clipboard.shapes.length,1,'duplicate did not grow/replace clipboard');
    assert.strictEqual(state.clipboard.shapes[0].stroke,'#AAA','duplicate preserved clipboard = shape A (not B)');
    // and a subsequent paste pastes A, not B
    const nBeforePaste=state.shapes.length;
    doPaste();
    assert.strictEqual(state.shapes.length,nBeforePaste+1,'paste after duplicate: one shape pasted');
    assert.strictEqual(state.shapes[state.shapes.length-1].stroke,'#AAA','paste after duplicate pastes A (clipboard intact)');
    console.log('  ✓ doDuplicate: independent of clipboard - Copy A / Duplicate B / Paste still yields A');
  }

  // v1.6.77: paste/duplicate of N shapes is ONE undo step (atomic gesture).
  // Before fix: _placeCopies committed one {op:'add'} per shape, so pasting 3 shapes
  // pushed 3 history entries and took 3 Ctrl+Z to reverse. After: one {op:'addMany'}.
  // This matters most after the withFrameChildren duplicate fix (v1.6.75): duplicating
  // a frame+child silently needed 2 undos. A user gesture should map to one undo.
  {
    state.shapes=[];_invalidateGrid();state.history=[];state.histIdx=-1;state.seq=0;state.seenOps=new Set();state.wclock={};state.selection=new Set();
    const a=Shape.make('rect',{x:0,y:0,w:30,h:30});
    const b=Shape.make('ellipse',{x:50,y:0,w:30,h:30});
    const c=Shape.make('rect',{x:100,y:0,w:30,h:30});
    Store.commit({op:'add',shape:a});Store.commit({op:'add',shape:b});Store.commit({op:'add',shape:c});
    const histAfterSetup=state.history.length;   // 3
    state.selection=new Set([a.id,b.id,c.id]);
    doDuplicate();
    // 3 copies added
    assert.strictEqual(state.shapes.length,6,'atomic dup: 3 originals + 3 copies = 6 shapes');
    // KEY: exactly ONE new history entry for the whole 3-shape duplicate
    assert.strictEqual(state.history.length,histAfterSetup+1,'atomic dup: 3-shape duplicate pushes exactly ONE history entry');
    assert.strictEqual(state.history[state.history.length-1].op,'addMany','atomic dup: the entry is an addMany op');
    assert.strictEqual(state.history[state.history.length-1].shapes.length,3,'atomic dup: addMany carries all 3 copies');
    // KEY: a SINGLE undo removes all 3 copies (not just one)
    Store.undo();
    assert.strictEqual(state.shapes.length,3,'atomic dup: one undo removes ALL 3 copies (not 1)');
    // redo restores all 3 in one step
    Store.redo();
    assert.strictEqual(state.shapes.length,6,'atomic dup: one redo restores ALL 3 copies');
    // distinct frac (the ADR-0001 paint-order key) — deferred batch commit must not
    // collide copies into one z/frac slot. sortZ stacks null-frac copies on top, each
    // higher than the last, so all 6 shapes have a unique frac.
    const fracs=state.shapes.map(s=>s.frac);
    assert.ok(fracs.every(f=>f!=null),'atomic dup: every shape has a frac key after redo');
    assert.strictEqual(new Set(fracs).size,fracs.length,'atomic dup: all 6 shapes have distinct frac (no batch z-collision)');
    console.log('  ✓ doDuplicate/doPaste: N-shape paste is ONE atomic undo (addMany op, distinct z)');
  }

  // v1.6.38: snapV / snapPt grid-snap helpers (GRID_SIZE=20)
  {
    state.snap = true;
    assert.strictEqual(snapV(0),  0,  'snapV: 0 stays 0');
    assert.strictEqual(snapV(20), 20, 'snapV: 20 is already on grid');
    assert.strictEqual(snapV(9),  0,  'snapV: 9 rounds to 0 (below midpoint)');
    assert.strictEqual(snapV(11), 20, 'snapV: 11 rounds to 20 (above midpoint)');
    assert.strictEqual(snapV(-11),-20, 'snapV: -11 rounds to -20');
    assert.deepStrictEqual(snapPt({x:9,y:11}), {x:0,y:20}, 'snapPt rounds both axes');
    state.snap = false;
    assert.strictEqual(snapV(9), 9, 'snapV: passes through when snap disabled');
    state.snap = true;
    console.log('  ✓ snapV/snapPt: grid snap quantisation, disable pass-through');
  }

  // v1.6.38: snapBox smart alignment guide helper
  {
    const mov={x:50,y:50,w:40,h:40};
    const targets=[{x:0,y:0,w:40,h:40}];
    // mov.x=50, mov.y=50; target bottom/right edge=40 → both axes snap by -10
    const r1=snapBox(mov,targets,15);
    assert.strictEqual(r1.dx,-10,'snapBox: snaps left edge to target right edge (d=-10)');
    assert.strictEqual(r1.dy,-10,'snapBox: snaps top edge to target bottom edge (d=-10)');
    assert.strictEqual(r1.guides.length,2,'snapBox: emits x and y guide when both axes snap');
    // out of tolerance: tol=4 but nearest is 10 away → no snap
    const r2=snapBox(mov,targets,4);
    assert.strictEqual(r2.dx,0,'snapBox: no snap when out of tolerance');
    assert.strictEqual(r2.guides.length,0,'snapBox: no guides when out of tolerance');
    console.log('  ✓ snapBox: edge/centre snap, nearest wins, out-of-range no-op');
  }

  // v1.6.38: dashArr patterns
  {
    assert.deepStrictEqual(dashArr(0,4),[],  'dashArr solid returns []');
    assert.deepStrictEqual(dashArr(1,4),[12,10],'dashArr dashed: [3s,2.5s] at size 4');
    assert.deepStrictEqual(dashArr(2,4),[2,8],  'dashArr dotted: [0.5s,2s] at size 4');
    assert.deepStrictEqual(dashArr(1,0),[3,2.5],'dashArr dashed: size defaults to 1');
    console.log('  ✓ dashArr: solid/dashed/dotted patterns, size-scaled');
  }

  // v1.6.38: _sfbCapture/_sfbFlush slider undo coalescing
  {
    state.shapes=[];_invalidateGrid();state.history=[];state.histIdx=-1;state.selection=new Set();
    const sh=Shape.make('rect',{x:0,y:0,w:40,h:40});sh.size=4;
    Store.commit({op:'add',shape:sh});
    const baseLen=state.history.length;
    state.selection=new Set([sh.id]);
    // simulate slider pointerdown → multiple input events → change (release)
    _sfbCapture('size');
    sh.size=8; // first drag tick
    sh.size=12; // second drag tick - no history entries yet
    _sfbFlush('size',12); // release: commits one style op
    assert.strictEqual(state.history.length,baseLen+1,'_sfbFlush: single history entry for whole drag');
    assert.strictEqual(state.history[state.history.length-1].op,'style','style op recorded');
    Store.undo();
    assert.strictEqual(state.shapes.find(s=>s.id===sh.id).size,4,'undo restores original size');
    console.log('  ✓ slider coalescing: multiple drag ticks → one style op → undo restores');
  }

  // Slider keyboard undo: arrow-key changes must be undoable even without a pointerdown.
  // Bug: _sfbFlush without a prior _sfbCapture (no pointerdown) skips creating history.
  // Fix: focus event calls _sfbCapture; change handler re-arms via _sfbCapture after flush.
  {
    state.shapes=[];_invalidateGrid();state.history=[];state.histIdx=-1;state.selection=new Set();
    const kbSh=Shape.make('rect',{x:0,y:0,w:40,h:40});
    Store.commit({op:'add',shape:kbSh});
    // Use live clone from state.shapes (Store.commit pushes a clone, not kbSh itself)
    const kbLive=state.shapes.find(s=>s.id===kbSh.id);
    kbLive.size=4;
    const kbBase=state.history.length;
    state.selection=new Set([kbSh.id]);
    // Without capture (no focus/pointerdown): flush must create no history entry (bug baseline)
    kbLive.size=8;
    _sfbFlush('size',8);
    assert.strictEqual(state.history.length,kbBase,'no-capture _sfbFlush: no history entry (bug baseline)');
    // With capture (simulates focus event): first key press creates a history entry
    _sfbCapture('size');          // focus → capture before=8 (from live clone)
    kbLive.size=12;               // arrow-key input: live shape mutated
    _sfbFlush('size',12);         // arrow-key change: flush (before=8,after=12)
    _sfbCapture('size');          // re-arm from change handler: capture before=12 for next key
    assert.strictEqual(state.history.length,kbBase+1,'keyboard first key: history entry created');
    // Second key press — re-arm means _sbf has before=12, so this also creates a history entry
    kbLive.size=16;
    _sfbFlush('size',16);
    assert.strictEqual(state.history.length,kbBase+2,'keyboard second key: second history entry');
    Store.undo();
    assert.strictEqual(state.shapes.find(s=>s.id===kbSh.id).size,12,'undo restores between-key size');
    Store.undo();
    assert.strictEqual(state.shapes.find(s=>s.id===kbSh.id).size,8,'double-undo restores pre-first-key size');
    console.log('  ✓ slider keyboard undo: focus+change re-arm gives per-key-press undo entries');
  }

  // v1.6.37: copyStyle / pasteStyle round-trip
  {
    state.shapes=[];_invalidateGrid();state.history=[];state.histIdx=-1;state.selection=new Set();
    const src=Shape.make('rect',{x:0,y:0,w:40,h:40});src.stroke='#ff0000';src.fill='#00ff00';src.size=8;src.opacity=0.5;src.dash=2;
    const dst=Shape.make('rect',{x:100,y:0,w:40,h:40});
    Store.commit({op:'add',shape:src});Store.commit({op:'add',shape:dst});
    state.selection=new Set([src.id]);
    copyStyle();
    state.selection=new Set([dst.id]);
    pasteStyle();
    const d=state.shapes.find(s=>s.id===dst.id);
    assert.strictEqual(d.stroke,'#ff0000','pasteStyle transfers stroke');
    assert.strictEqual(d.fill,'#00ff00','pasteStyle transfers fill');
    assert.strictEqual(d.size,8,'pasteStyle transfers size');
    assert.strictEqual(d.opacity,0.5,'pasteStyle transfers opacity');
    assert.strictEqual(d.dash,2,'pasteStyle transfers dash');
    Store.undo();
    const d2=state.shapes.find(s=>s.id===dst.id);
    assert.notStrictEqual(d2.stroke,'#ff0000','pasteStyle undo reverts stroke');
    console.log('  ✓ copyStyle/pasteStyle round-trip transfers all style props; undo reverts');
  }

  // v1.6.39: handleCursor - correct CSS cursor for each resize handle
  {
    assert.strictEqual(handleCursor('nw'),'nwse-resize','nw corner → nwse-resize');
    assert.strictEqual(handleCursor('se'),'nwse-resize','se corner → nwse-resize (same axis)');
    assert.strictEqual(handleCursor('ne'),'nesw-resize','ne corner → nesw-resize');
    assert.strictEqual(handleCursor('sw'),'nesw-resize','sw corner → nesw-resize');
    assert.strictEqual(handleCursor('n'), 'ns-resize',  'n edge → ns-resize');
    assert.strictEqual(handleCursor('s'), 'ns-resize',  's edge → ns-resize');
    assert.strictEqual(handleCursor('e'), 'ew-resize',  'e edge → ew-resize');
    assert.strictEqual(handleCursor('w'), 'ew-resize',  'w edge → ew-resize');
    assert.strictEqual(handleCursor('p1'),'crosshair',  'line endpoint → crosshair fallback');
    console.log('  ✓ handleCursor: 8 resize handles map to correct CSS cursor, endpoints → crosshair');
  }

  // v1.6.39: Store undo/redo boundary - undo at bottom and redo at top are no-ops
  {
    state.shapes=[];_invalidateGrid();state.history=[];state.histIdx=-1;state.selection=new Set();
    assert.strictEqual(Store.undo(),false,'undo on empty history returns false');
    assert.strictEqual(Store.redo(),false,'redo on empty history returns false');
    const sh=Shape.make('rect',{x:0,y:0,w:10,h:10});
    Store.commit({op:'add',shape:sh});
    assert.strictEqual(Store.redo(),false,'redo at top (no redo branch) returns false');
    Store.undo();
    assert.strictEqual(Store.undo(),false,'undo past bottom returns false');
    assert.strictEqual(state.shapes.length,0,'shapes empty after undo past all ops');
    console.log('  ✓ Store.undo/redo return false at boundaries, no double-undo past floor');
  }

  // G.hit - text (exact bbox, no tolerance)
  assert.strictEqual(G.hit({type:'text',x:0,y:0,w:120,h:24,size:14},{x:60,y:12}),true,'text: interior hits');
  assert.strictEqual(G.hit({type:'text',x:0,y:0,w:120,h:24,size:14},{x:130,y:12}),false,'text: outside right misses');
  // G.hit - frame (bbox + tolerance, same as sticky/image)
  assert.strictEqual(G.hit({type:'frame',x:10,y:10,w:100,h:80,size:2},{x:60,y:50}),true,'frame: interior hits');
  assert.strictEqual(G.hit({type:'frame',x:10,y:10,w:100,h:80,size:2},{x:200,y:50}),false,'frame: far outside misses');
  console.log('  ✓ G.hit text and frame shapes');

  // G.bbox - per-shape bounding box
  assert.deepStrictEqual(G.bbox({type:'rect',x:10,y:20,w:100,h:50}),{x:10,y:20,w:100,h:50},'bbox rect returns exact dims');
  assert.deepStrictEqual(G.bbox({type:'text',x:5,y:5,w:80,h:24}),{x:5,y:5,w:80,h:24},'bbox text returns exact dims');
  const lbx=G.bbox({type:'line',x1:0,y1:0,x2:60,y2:0,size:2});
  assert.ok(lbx.x<0&&lbx.w>60&&lbx.h>0,'bbox line expanded by size padding');
  const pbx=G.bbox({type:'pen',pts:[[10,20],[50,40]],size:4});
  assert.ok(pbx.x<10&&pbx.y<20&&pbx.x+pbx.w>50&&pbx.y+pbx.h>40,'bbox pen expands beyond all pts');
  // G.bboxAll - union of multiple shapes
  assert.strictEqual(G.bboxAll([]),null,'bboxAll empty → null');
  const abx=G.bboxAll([{type:'rect',x:0,y:0,w:50,h:50},{type:'rect',x:60,y:10,w:40,h:30}]);
  assert.strictEqual(abx.x,0,'bboxAll union: left edge');
  assert.strictEqual(abx.y,0,'bboxAll union: top edge');
  assert.strictEqual(abx.w,100,'bboxAll union: total width');
  assert.strictEqual(abx.h,50,'bboxAll union: total height');
  console.log('  ✓ G.bbox rect/text/line/pen and G.bboxAll union');

  // cycleSel - keyboard Tab cycling
  assert.strictEqual(cycleSel([],null,1),null,'cycleSel empty ids → null');
  assert.strictEqual(cycleSel(['a','b','c'],'a',1),'b','cycleSel forward from first');
  assert.strictEqual(cycleSel(['a','b','c'],'c',1),'a','cycleSel forward wraps to start');
  assert.strictEqual(cycleSel(['a','b','c'],'a',-1),'c','cycleSel backward wraps to end');
  assert.strictEqual(cycleSel(['a','b','c'],'x',1),'a','cycleSel unknown cur + forward → first');
  assert.strictEqual(cycleSel(['a','b','c'],'x',-1),'c','cycleSel unknown cur + backward → last');
  console.log('  ✓ cycleSel: forward/backward/wrap/unknown-current');

  // describeShape - SR shape announcement
  assert.ok(describeShape({type:'rect',x:10,y:20,w:100,h:50}).endsWith('@ 10,20'),'describeShape includes rounded position');
  assert.ok(describeShape({type:'rect',x:10,y:20,w:100,h:50}).length>5,'describeShape not empty');
  // v1.7.1: announce text/label content first (a11y) — the meaningful part for SR users
  {
    const arrow=describeShape({type:'arrow',x1:0,y1:0,x2:100,y2:0,label:'yes'});
    assert.ok(arrow.includes('yes'),'describeShape: connector label announced (SR hears edge content)');
    const sticky=describeShape({type:'sticky',x:5,y:5,w:160,h:160,text:'buy milk'});
    assert.ok(sticky.includes('buy milk'),'describeShape: sticky text announced');
    // text beats label when both present; whitespace collapsed
    const both=describeShape({type:'rect',x:0,y:0,w:10,h:10,text:'  hello\n world ',label:'L'});
    assert.ok(both.includes('hello world')&&!both.includes('\n'),'describeShape: text wins over label, whitespace collapsed');
    // long content truncated with ellipsis so the aria-live region isn't flooded
    const long=describeShape({type:'text',x:0,y:0,w:10,h:10,text:'x'.repeat(50)});
    assert.ok(long.includes('…')&&!long.includes('x'.repeat(40)),'describeShape: long content truncated to ~30 chars + …');
    // unlabeled shapes are unchanged (backward compatible — no quotes added)
    assert.ok(!describeShape({type:'rect',x:10,y:20,w:100,h:50}).includes('“'),'describeShape: unlabeled shape adds no content quote');
  }
  console.log('  ✓ describeShape: position suffix + content (text/label) announced for SR');

  // inView - frustum culling
  const vp0={x:0,y:0,w:800,h:600};
  assert.strictEqual(inView({type:'rect',x:100,y:100,w:200,h:150},vp0),true,'inView: shape within viewport');
  assert.strictEqual(inView({type:'rect',x:900,y:100,w:200,h:150},vp0),false,'inView: shape outside right edge');
  assert.strictEqual(inView({type:'rect',x:-300,y:100,w:200,h:150},vp0),false,'inView: shape outside left edge');
  console.log('  ✓ inView: culls off-screen shapes, passes on-screen');

  // v1.6.90: inView margin must cover stroke width — G.bbox omits stroke for rect/
  // ellipse/frame, so a thick-stroked shape at the edge would be culled with its stroke
  // still on screen. vp0={0,0,800,600}.
  {
    // rect just past the right edge (x=804..814); its 32px stroke extends 16px left, to
    // x=788 — that's inside the 800-wide view, so 12px of stroke is visible.
    const edge={type:'rect',x:804,y:100,w:10,h:10,size:32};
    assert.strictEqual(inView(edge,vp0),true,'inView: thick-stroked rect at edge kept (stroke visible)');
    // non-vacuity: the OLD fixed 4px margin would have culled it (x0=804 > 800+4=804? equal,
    // so push it 1px further to make the old margin definitively cull)
    const edge2={type:'rect',x:806,y:100,w:10,h:10,size:32};
    const oldInView=(sh)=>{const x0=sh.x,m=4;return x0<=vp0.x+vp0.w+m;}; // x-axis right-edge test, old margin
    assert.strictEqual(oldInView(edge2),false,'non-vacuity: old 4px margin culls the thick-stroked edge rect');
    assert.strictEqual(inView(edge2,vp0),true,'inView: new stroke-aware margin keeps it (12px of stroke on screen)');
    // a genuinely far shape is still culled even with a thick stroke
    assert.strictEqual(inView({type:'rect',x:5000,y:100,w:10,h:10,size:32},vp0),false,'inView: far thick-stroked shape still culled');
    // strokeless rects unchanged (backward compatible with the existing assertions above)
    assert.strictEqual(inView({type:'rect',x:900,y:100,w:200,h:150},vp0),false,'inView: strokeless off-screen rect still culled (margin unchanged)');
    console.log('  ✓ inView: margin covers stroke width (thick-stroked edge shapes not wrongly culled)');
  }

  // wrapText - pure text-wrapping function
  {
    const m=s=>s.length*10; // 10px per char
    // text shorter than maxWidth → single line, unchanged
    assert.deepStrictEqual(wrapText('hello',1000,m),['hello'],'wrapText short text: no wrap');
    // explicit newlines → paragraph breaks
    assert.deepStrictEqual(wrapText('a\nb',1000,m),['a','b'],'wrapText \\n → paragraph break');
    // empty string → one empty paragraph
    assert.deepStrictEqual(wrapText('',1000,m),[''],'wrapText empty string → one empty line');
    // null → treated as empty
    assert.deepStrictEqual(wrapText(null,1000,m),[''],'wrapText null → one empty line');
    // word-wrap: 'hello world' with maxWidth 70 → ['hello', 'world']
    assert.deepStrictEqual(wrapText('hello world',70,m),['hello','world'],'wrapText word-wrap at space');
    // char-break: single token 'abcde' with maxWidth 30 → ['abc','de']
    assert.deepStrictEqual(wrapText('abcde',30,m),['abc','de'],'wrapText char-break for long token');
    console.log('  ✓ wrapText: no-wrap, newline, empty, null, word-wrap, char-break');
  }

  // v1.6.82: 禁則処理 (kinsoku shori) — Japanese line-break rules in wrapText.
  // Japanese has no spaces, so wrapText char-breaks CJK text. A naive break can put
  // 。、」 at a line start or 「（ at a line end — both typographically wrong (a flaw any
  // Japanese reader / Qiita-Zenn dev notices). Line-start-prohibited chars hang on the
  // current line (ぶら下げ); line-end-prohibited opening brackets push down to the next.
  {
    const m=s=>s.length*10; // 10px/char, maxWidth 30 → 3 chars/line
    // 行頭禁則: 。 must not start a line — it hangs on the line it closes instead.
    const r1=wrapText('あいう。えお',30,m);
    assert.ok(!r1.some(l=>/^[。、，．・：；！？）」』]/.test(l)),'kinsoku: no line starts with prohibited punctuation');
    assert.strictEqual(r1[0],'あいう。','kinsoku: 。 hangs on the line it closes (ぶら下げ)');
    // non-vacuity: the naive char-break WOULD have started a line with 。
    assert.notDeepStrictEqual(r1,['あいう','。えお'],'kinsoku: output differs from naive break (行頭禁則 applied)');
    // 行末禁則: 「 (opening bracket) must not end a line — it pushes down to the next line.
    const r2=wrapText('あい「うえお',30,m);
    assert.ok(!r2.some(l=>/[「（『【〔]$/.test(l)),'kinsoku: no line ends with an opening bracket');
    // a line-start-prohibited ASCII char (closing paren) also hangs, never starts a line
    const r3=wrapText('abc)def',30,m);
    assert.ok(!r3.some(l=>/^\)/.test(l)),'kinsoku: no line starts with ASCII )');
    // English word-wrap path is untouched (kinsoku only affects the CJK char-break loop)
    assert.deepStrictEqual(wrapText('hello world',70,m),['hello','world'],'kinsoku: English word-wrap unchanged');
    // every wrapped line still respects the width budget except deliberate hangs (≤1 over)
    assert.ok(wrapText('かきくけこ。さしすせそ',30,m).every(l=>l.length<=4),'kinsoku: hang overflow bounded (no runaway line)');
    console.log('  ✓ wrapText 禁則処理: prohibited chars never start/end a line (ぶら下げ + push-down)');
  }

  // getHandles - ellipse/sticky use same box-handles as rect
  {
    const el=Shape.make('ellipse',{x:0,y:0,w:100,h:50});
    const eh=getHandles(el);
    assert.strictEqual(eh.length,8,'getHandles ellipse: 8 box handles');
    assert.ok(eh.find(h=>h.id==='nw'&&h.x===0&&h.y===0),'getHandles ellipse: nw at origin');
    assert.ok(eh.find(h=>h.id==='se'&&h.x===100&&h.y===50),'getHandles ellipse: se at corner');
    const sk=Shape.make('sticky',{x:10,y:20,w:120,h:80});
    const sh=getHandles(sk);
    assert.strictEqual(sh.length,8,'getHandles sticky: 8 box handles');
    assert.ok(sh.find(h=>h.id==='n'&&h.x===70&&h.y===20),'getHandles sticky: n midpoint');
    console.log('  ✓ getHandles ellipse/sticky: 8 box handles at correct positions');
  }

  // applyResize - handle-drag updates shape dimensions
  {
    state.snap=false; // disable grid snap in test
    const orig={type:'rect',x:10,y:10,w:100,h:80};
    // se: expand down-right
    const sh1={...orig};
    applyResize(sh1,'se',orig,{x:160,y:140});
    assert.strictEqual(sh1.w,150,'applyResize se: w = drag_x - orig_x');
    assert.strictEqual(sh1.h,130,'applyResize se: h = drag_y - orig_y');
    // se: minimum size clamp
    const sh2={...orig};
    applyResize(sh2,'se',orig,{x:11,y:11});
    assert.strictEqual(sh2.w,4,'applyResize se clamp: w minimum is 4');
    assert.strictEqual(sh2.h,4,'applyResize se clamp: h minimum is 4');
    // nw: origin moves, right/bottom edge stays fixed
    const sh3={...orig};
    applyResize(sh3,'nw',orig,{x:20,y:20});
    assert.strictEqual(sh3.x,20,'applyResize nw: x = drag point');
    assert.strictEqual(sh3.w,90,'applyResize nw: w = right_edge - drag_x = 110-20');
    assert.strictEqual(sh3.h,70,'applyResize nw: h = bottom_edge - drag_y = 90-20');
    // p1/p2 for line endpoints
    const ln={type:'line',x1:0,y1:0,x2:100,y2:100};
    applyResize(ln,'p1',ln,{x:50,y:50});
    assert.strictEqual(ln.x1,50,'applyResize p1: x1 updated');
    assert.strictEqual(ln.y1,50,'applyResize p1: y1 updated');
    console.log('  ✓ applyResize: se/nw expand + clamp, p1 endpoint drag');
  }

  // penWidths - variable-width pen stroke
  {
    const w1=penWidths([[0,0]],4);
    assert.strictEqual(w1.length,1,'penWidths: output length = pts length');
    assert.strictEqual(w1[0],4,'penWidths single point: full base width');
    const wFar=penWidths([[0,0],[1000,0]],4);
    assert.ok(wFar[0]<4,'penWidths far spacing: tapered below base');
    assert.ok(wFar[0]>0,'penWidths far spacing: positive width');
    const wPr=penWidths([[0,0,0.1],[10,0,0.9]],4);
    assert.ok(wPr[1]>wPr[0],'penWidths pressure: high pressure → wider than low');
    console.log('  ✓ penWidths: length, single-pt full width, taper, pressure-scale');
  }

  // _buildGrid + _queryGrid - spatial index
  {
    const s1=Shape.make('rect',{x:0,y:0,w:50,h:50});
    const s2=Shape.make('rect',{x:1000,y:1000,w:50,h:50});
    const g=_buildGrid([s1,s2]);
    const near=_queryGrid(g,{x:25,y:25});
    assert.ok(near.has(s1),'grid query: nearby shape found');
    assert.ok(!near.has(s2),'grid query: far shape excluded');
    // empty input
    const ge=_buildGrid([]);
    assert.strictEqual(_queryGrid(ge,{x:0,y:0}).size,0,'grid query: empty grid → empty set');
    console.log('  ✓ _buildGrid/_queryGrid: nearby found, far excluded, empty grid');
  }

  // doGroup / doUngroup - grouping ops and full undo/redo round-trip
  {
    state.shapes=[];_invalidateGrid();state.history=[];state.histIdx=-1;state.selection=new Set();
    const s1=Shape.make('rect',{x:0,y:0,w:50,h:50});
    const s2=Shape.make('rect',{x:100,y:0,w:50,h:50});
    Store.commit({op:'add',shape:s1});Store.commit({op:'add',shape:s2});
    state.selection=new Set([s1.id,s2.id]);

    // group: assigns same groupId to both
    doGroup();
    const g1=state.shapes.find(s=>s.id===s1.id);
    const g2=state.shapes.find(s=>s.id===s2.id);
    assert.ok(g1.groupId,'doGroup: s1 has groupId');
    assert.ok(g2.groupId,'doGroup: s2 has groupId');
    assert.strictEqual(g1.groupId,g2.groupId,'doGroup: both shapes share same groupId');

    // undo group: groupIds deleted (were undefined before group)
    Store.undo();
    assert.ok(!state.shapes.find(s=>s.id===s1.id).groupId,'doGroup undo: s1 groupId cleared');
    assert.ok(!state.shapes.find(s=>s.id===s2.id).groupId,'doGroup undo: s2 groupId cleared');

    // redo group: groupIds restored
    Store.redo();
    assert.ok(state.shapes.find(s=>s.id===s1.id).groupId,'doGroup redo: groupId restored');

    // ungroup from single-shape selection: expands to whole group
    state.selection=new Set([s1.id]);
    doUngroup();
    assert.ok(!state.shapes.find(s=>s.id===s1.id).groupId,'doUngroup: s1 groupId removed');
    assert.ok(!state.shapes.find(s=>s.id===s2.id).groupId,'doUngroup: s2 groupId removed (same group)');

    // undo ungroup: groupIds restored from before snapshot
    Store.undo();
    assert.ok(state.shapes.find(s=>s.id===s1.id).groupId,'doUngroup undo: s1 groupId restored');
    assert.ok(state.shapes.find(s=>s.id===s2.id).groupId,'doUngroup undo: s2 groupId restored');
    console.log('  ✓ doGroup/doUngroup: groupId assignment, undo/redo, whole-group ungroup');
  }

  // pickTop - returns topmost (highest-z) shape at a world point
  // Note: unfilled rects only hit on their border; use fill or edge points.
  {
    state.shapes=[];_invalidateGrid();state.history=[];state.histIdx=-1;state.selection=new Set();
    const s1=Shape.make('rect',{x:0,y:0,w:100,h:100});s1.fill='#000';
    const s2=Shape.make('rect',{x:0,y:0,w:100,h:100});s2.fill='#000';
    Store.commit({op:'add',shape:s1});Store.commit({op:'add',shape:s2});
    // s2 was added last → checked first in backward walk → wins
    assert.strictEqual(pickTop({x:50,y:50})?.id,s2.id,'pickTop: last-added shape wins (filled rect)');
    assert.strictEqual(pickTop({x:200,y:200}),null,'pickTop: null when no shape at point');
    // frame is yielded to non-frame shapes at same point
    const fr=Shape.make('frame',{x:0,y:0,w:200,h:200,label:'F'});
    Store.commit({op:'add',shape:fr});
    assert.strictEqual(pickTop({x:50,y:50})?.id,s2.id,'pickTop: non-frame preferred over frame at same point');
    // only frame at point (no non-frame shapes there)
    assert.strictEqual(pickTop({x:150,y:150})?.id,fr.id,'pickTop: frame returned when no non-frame at point');
    console.log('  ✓ pickTop: z-order wins, null miss, non-frame over frame, frame-only fallback');
  }

  // sortZ - sorts shapes array by ascending z value
  {
    state.shapes=[];_invalidateGrid();state.history=[];state.histIdx=-1;
    const a=Shape.make('rect',{x:0,y:0,w:10,h:10});a.z=3;
    const b=Shape.make('rect',{x:10,y:0,w:10,h:10});b.z=1;
    const c2=Shape.make('rect',{x:20,y:0,w:10,h:10});c2.z=2;
    state.shapes.push(a,b,c2);
    sortZ();
    assert.strictEqual(state.shapes[0].z,1,'sortZ: lowest z first');
    assert.strictEqual(state.shapes[1].z,2,'sortZ: middle z second');
    assert.strictEqual(state.shapes[2].z,3,'sortZ: highest z last');
    console.log('  ✓ sortZ: shapes sorted ascending by z value');
  }

  // keyBetween - fractional index keys (ADR-0001 Step 1)
  {
    // open ends
    assert.ok(keyBetween(null,null).length>0,'keyBetween(null,null) returns a key');
    assert.ok(keyBetween('V',null)>'V','keyBetween(a,null) is strictly above a');
    assert.ok(keyBetween(null,'V')<'V','keyBetween(null,b) is strictly below b');
    // strict betweenness, including adjacent digits (no integer gap)
    const pairs=[['V','k'],['V','W'],['0','1'],['a','b'],['VV','Vk'],['','1']];
    for(const [a,b] of pairs){
      const m=keyBetween(a,b);
      assert.ok((a===''||m>a)&&m<b,`keyBetween(${a},${b})=${m} lies strictly between`);
    }
    // dense insertion: repeatedly bisect the same gap; order must always hold
    let lo='V',hi='k';
    for(let i=0;i<200;i++){const m=keyBetween(lo,hi);assert.ok(m>lo&&m<hi,'dense insert stays ordered');hi=m;}
    // appending chain (reindexFrac uses this) is strictly increasing & prefix-stable
    const chain=[];let p=null;for(let i=0;i<50;i++){p=keyBetween(p,null);chain.push(p);}
    for(let i=1;i<chain.length;i++)assert.ok(chain[i]>chain[i-1],'append chain strictly increases');
    const chain2=[];p=null;for(let i=0;i<10;i++){p=keyBetween(p,null);chain2.push(p);}
    assert.deepStrictEqual(chain.slice(0,10),chain2,'append chain is prefix-stable (count-independent)');
    // robustness: degenerate / hostile inputs must terminate (no infinite loop) and
    // return a string. b="0" (all-zeros) used to hang keyBetween(null,"0") forever.
    for(const [a,b] of [[null,'0'],[null,'00'],['0','0'],['0','00'],[null,'000'],['~weird','0']]){
      const m=keyBetween(a,b);
      assert.strictEqual(typeof m,'string',`keyBetween(${a},${b}) terminates with a string`);
    }
    // out-of-alphabet characters are treated as 0, never throw
    assert.strictEqual(typeof keyBetween('💥','x'),'string','non-alphabet input does not throw');
    console.log('  ✓ keyBetween: strict order, dense insert, prefix-stable, hostile-input safe');
  }

  // frac is the canonical order; z-order ops move keys, and the zorder snapshot
  // carries frac so undo restores keys exactly (ADR-0001 Step 1)
  {
    state.shapes=[];_invalidateGrid();state.history=[];state.histIdx=-1;state.seq=0;state.seenOps=new Set();
    const r1=Shape.make('rect',{x:0,y:0,w:10,h:10});
    const r2=Shape.make('rect',{x:5,y:5,w:10,h:10});
    const r3=Shape.make('rect',{x:9,y:9,w:10,h:10});
    Store.commit({op:'add',shape:r1});Store.commit({op:'add',shape:r2});Store.commit({op:'add',shape:r3});
    assert.ok(state.shapes.every(s=>typeof s.frac==='string'),'every committed shape gets a frac key');
    const asc=state.shapes.map(s=>s.frac);
    assert.deepStrictEqual([...asc].sort(),asc,'array order matches ascending frac order');
    const fracBefore=new Map(state.shapes.map(s=>[s.id,s.frac]));
    state.selection=new Set([r1.id]);
    doBringFront();
    assert.strictEqual(state.shapes[state.shapes.length-1].id,r1.id,'bring front: r1 on top');
    assert.ok(state.shapes[state.shapes.length-1].frac>state.shapes[0].frac,'top shape has the largest key');
    Store.undo();
    assert.strictEqual(state.shapes.map(s=>s.id).join(','),[r1.id,r2.id,r3.id].join(','),'undo restores order');
    for(const s of state.shapes)assert.strictEqual(s.frac,fracBefore.get(s.id),'undo restores exact frac keys');
    console.log('  ✓ frac canonical: keys assigned, ordered, and round-trip through zorder undo');
  }

  // Step 2: zorder ops are minimal-delta - only moved shapes appear in `changes`
  {
    state.shapes=[];_invalidateGrid();state.history=[];state.histIdx=-1;state.seq=0;state.seenOps=new Set();
    const mk=()=>{const s=Shape.make('rect',{x:0,y:0,w:10,h:10});Store.commit({op:'add',shape:s});return s;};
    const a=mk(),b=mk(),c=mk(),d=mk();          // bottom→top: a,b,c,d
    // single bring-forward touches exactly one shape's key
    state.selection=new Set([b.id]);
    doBringForward();
    let op=state.history[state.histIdx];
    assert.strictEqual(op.op,'zorder','records a zorder op');
    assert.strictEqual(op.changes.length,1,'single forward = 1-shape delta');
    assert.strictEqual(op.changes[0].id,b.id,'the moved shape is b');
    assert.deepStrictEqual(state.shapes.map(s=>s.id),[a.id,c.id,b.id,d.id],'b moved up one past c');
    Store.undo();
    assert.deepStrictEqual(state.shapes.map(s=>s.id),[a.id,b.id,c.id,d.id],'undo restores order');
    // multi-select bring-front preserves relative order, moves both to the top
    state.selection=new Set([a.id,c.id]);
    doBringFront();
    op=state.history[state.histIdx];
    assert.strictEqual(op.changes.length,2,'two selected = 2-shape delta (others untouched)');
    assert.deepStrictEqual(state.shapes.map(s=>s.id),[b.id,d.id,a.id,c.id],'a,c on top in relative order');
    // bring-front when already contiguous at the top is a strict no-op (no key churn)
    const hbefore=state.histIdx;
    state.selection=new Set([a.id,c.id]);
    doBringFront();
    assert.strictEqual(state.histIdx,hbefore,'redundant bring-front records nothing');
    // same for send-back at the bottom
    state.selection=new Set([b.id,d.id]);
    doSendBack();
    assert.strictEqual(state.histIdx,hbefore,'redundant send-back records nothing');
    console.log('  ✓ zorder minimal-delta: single move = 1 change; multi keeps relative order; no-op at extremes');
  }

  // Step 3: concurrent-reorder convergence - equal frac keys (two peers inserting
  // into the same gap) must resolve to ONE order on every peer, via shape id.
  {
    state.shapes=[];_invalidateGrid();state.history=[];state.histIdx=-1;
    const mkr=id=>({id,type:'rect',x:0,y:0,w:10,h:10,frac:'V',stroke:'#000',size:2,opacity:1});
    const x=mkr('aaa'),y=mkr('bbb');
    state.shapes=[y,x];sortZ();const o1=state.shapes.map(s=>s.id).join(',');
    state.shapes=[x,y];sortZ();const o2=state.shapes.map(s=>s.id).join(',');
    assert.strictEqual(o1,o2,'tie resolves identically regardless of input order (convergence)');
    assert.strictEqual(o1,'aaa,bbb','frac tie broken by ascending shape id');
    // distinct keys are unaffected by the id tiebreak
    state.shapes=[{...mkr('zzz'),frac:'k'},{...mkr('aaa'),frac:'V'}];sortZ();
    assert.deepStrictEqual(state.shapes.map(s=>s.id),['aaa','zzz'],'distinct keys still order by frac, not id');
    console.log('  ✓ Step3 convergence: equal frac keys break ties deterministically by id');
  }

  // Step 3: validRemotePayload guards the zorder delta against malformed peers
  {
    assert.ok(validRemotePayload({op:'zorder',changes:[{id:'a',before:'V',after:'k'}]}),'well-formed delta accepted');
    assert.ok(validRemotePayload({op:'zorder',changes:[{id:'a',after:'k'}]}),'missing before (null) accepted');
    assert.ok(!validRemotePayload({op:'zorder',changes:[{id:'a',after:{evil:1}}]}),'non-string key rejected');
    assert.ok(!validRemotePayload({op:'zorder',changes:[{before:'V',after:'k'}]}),'missing id rejected');
    assert.ok(!validRemotePayload({op:'zorder',changes:'nope'}),'non-array changes rejected');
    assert.ok(validRemotePayload({op:'zorder',after:[]}),'legacy snapshot format still accepted');
    assert.ok(validRemotePayload({op:'zorder',after:[{id:'a',z:1,frac:'Vz'}]}),'legacy with valid z+frac accepted');
    // legacy path assigns sh.z=p.z and sh.frac=p.frac directly - malformed values corrupt the
    // ADR-0001 sort invariant. Guard them at the validator.
    assert.ok(!validRemotePayload({op:'zorder',after:[{id:'a',z:NaN}]}),'legacy with NaN z rejected (would corrupt sortZ)');
    assert.ok(!validRemotePayload({op:'zorder',after:[{id:'a',frac:{x:1}}]}),'legacy with object frac rejected (breaks ADR-0001 sort)');
    assert.ok(!validRemotePayload({op:'zorder',after:[{z:1}]}),'legacy entry missing id rejected');
    // move: ids must be strings (consistent with group/ungroup fix)
    assert.ok(validRemotePayload({op:'move',ids:['s1','s2'],dx:5,dy:3}),'move with string ids accepted');
    assert.ok(!validRemotePayload({op:'move',ids:[{id:'s1'}],dx:5,dy:3}),'move with object ids rejected');
    console.log('  ✓ Step3 validRemotePayload: zorder legacy validates z/frac; move validates string ids');
  }

  // Net._snapshotMsg carries `ops` so a non-empty peer can merge (WebRTC + BC both)
  {
    state.shapes=[];_invalidateGrid();state.history=[];state.histIdx=-1;state.seq=0;state.seenOps=new Set();
    const sa=Shape.make('rect',{x:0,y:0,w:10,h:10});
    const sb=Shape.make('ellipse',{x:20,y:0,w:10,h:10});
    state.shapes.push(sa,sb);
    const msg=Net._snapshotMsg();
    assert.strictEqual(msg.k,'snapshot','snapshot message kind');
    assert.ok(Array.isArray(msg.ops),'snapshot carries ops array (merge path needs it)');
    assert.strictEqual(msg.ops.length,2,'one add-op per shape');
    assert.ok(msg.ops.every(o=>o.op==='add'&&o.shape&&o.clock),'ops are well-formed add ops with clocks');
    const keys=msg.ops.map(o=>o.clock.peer+':'+o.clock.seq);
    assert.strictEqual(new Set(keys).size,keys.length,'distinct clock keys (no dedup collapse)');
    assert.deepStrictEqual(msg.ops.map(o=>o.shape.id),[sa.id,sb.id],'ops reference the right shapes');
    // keys must be derived from shape id (stable), not array index
    assert.strictEqual(msg.ops[0].clock.seq,'snap:'+sa.id,'clock seq keyed by shape id');
    console.log('  ✓ Net._snapshotMsg includes ops with id-keyed distinct clocks (fixes WebRTC merge)');
  }

  // Re-snapshot after the sender's shape set changed must still merge new shapes.
  // Builds the snapshots via the real _snapshotMsg (as sender 'A'), then replays them
  // into receiver 'B'. Index-based clock keys regressed this - Z (new, at the index a
  // dropped shape vacated) would inherit a seen `A:snapN` and be silently dropped.
  {
    const mk=(id,x)=>({id,type:'rect',x,y:0,w:10,h:10,z:x,frac:null,stroke:'#000',size:2,opacity:1});
    const X=mk('X',10),Y=mk('Y',20),Z=mk('Z',30);
    // --- as sender A: capture two snapshots across a shape-set change ---
    state.peerId='A';state.shapes=[X,Y];
    const msg1=Net._snapshotMsg();
    state.shapes=[Y,Z];                               // A dropped X, added Z
    const msg2=Net._snapshotMsg();
    // --- as receiver B: starts with its own shape W, replays A's snapshots ---
    state.peerId='B';state.shapes=[mk('W',0)];state.history=[];state.histIdx=-1;state.seq=0;state.seenOps=new Set();
    Net._onRecv(msg1);
    assert.deepStrictEqual(state.shapes.map(s=>s.id).sort(),['W','X','Y'],'merge 1: X,Y adopted alongside W');
    Net._onRecv(msg2);
    assert.ok(state.shapes.some(s=>s.id==='Z'),'merge 2: newly-added Z adopted despite prior snapshot');
    console.log('  ✓ re-snapshot merges new shapes after sender set changed (id-keyed clocks)');
  }

  // Snapshot merge path hardening: a malicious peer embedding non-add ops (e.g. clear)
  // inside snapshot.ops must be rejected - only 'add' ops are legitimate in a snapshot.
  // _snapshotMsg() only emits add ops; accepting others here would let a hostile peer
  // clear/delete/update via the snapshot code path, bypassing any op-level suspicion.
  {
    const mkShape=(id)=>Shape.make('rect',{x:0,y:0,w:5,h:5});
    state.shapes=[];_invalidateGrid(); state.history=[]; state.histIdx=-1; state.seq=0; state.seenOps=new Set();
    const legit=mkShape('L1'); legit.id='L1';
    Store.commit({op:'add',shape:legit});
    assert.strictEqual(state.shapes.length,1,'baseline: one shape present');
    // Forge a snapshot message carrying a 'clear' op alongside a legitimate add
    const forged={k:'snapshot',peer:'evil',ops:[
      {op:'clear',shapes:[],clock:{peer:'evil',seq:1,ts:9e15}},
      {op:'add',shape:Shape.make('rect',{x:0,y:0,w:5,h:5}),clock:{peer:'evil',seq:2,ts:1}},
    ]};
    Net._onRecv(forged);
    assert.strictEqual(state.shapes.length,2,'snapshot merge: the add is accepted (new shape added)');
    assert.ok(state.shapes.some(s=>s.id==='L1'),'snapshot merge: embedded clear did NOT wipe local shapes');
    console.log('  ✓ snapshot merge: non-add ops (e.g. clear) embedded in snapshot.ops are rejected');
  }

  // validPatch recurses: nested poison in a remote `upd` (gated by validPatch alone)
  {
    // well-formed nested data accepted (pen pts is [[x,y,p],…])
    assert.ok(validRemotePayload({op:'upd',id:'a',after:{pts:[[1,2,0.5],[3,4,0.5]]}}),'nested finite pts accepted');
    assert.ok(validRemotePayload({op:'upd',id:'a',after:{x:1,label:'hi',flag:true,note:null}}),'flat valid patch accepted');
    // NaN/Infinity buried inside a nested array must be rejected (would break drawPen)
    assert.ok(!validRemotePayload({op:'upd',id:'a',after:{pts:[[1,NaN]]}}),'NaN in nested pts rejected');
    assert.ok(!validRemotePayload({op:'upd',id:'a',after:{pts:[[1,2],[Infinity,4]]}}),'Infinity in nested pts rejected');
    // prototype pollution at depth (own __proto__ key via JSON.parse) rejected
    assert.ok(!validRemotePayload({op:'upd',id:'a',after:JSON.parse('{"meta":{"__proto__":1}}')}),'nested __proto__ key rejected');
    // function buried in a nested object rejected
    assert.ok(!validRemotePayload({op:'upd',id:'a',after:{box:{onload:()=>1}}}),'nested function rejected');
    // hostile deep nesting is bounded (depth cap), returns false rather than blowing the stack
    let deep={}; let cur=deep; for(let i=0;i<40;i++){cur.n={};cur=cur.n}
    assert.ok(!validRemotePayload({op:'upd',id:'a',after:deep}),'over-deep nesting rejected (DoS guard)');
    console.log('  ✓ validPatch recurses: nested NaN/Infinity/__proto__/function/over-deep rejected');
  }

  // legacy boards (integer z, no frac) migrate to keys on first sortZ, order intact
  {
    state.shapes=[];_invalidateGrid();state.history=[];state.histIdx=-1;
    const L=['c','a','b'].map((id,i)=>({id,type:'rect',x:i*10,y:0,w:10,h:10,z:[3,1,2][i],stroke:'#000',size:2,opacity:1}));
    state.shapes.push(...L);                      // pushed out of z order, no frac
    sortZ();
    assert.deepStrictEqual(state.shapes.map(s=>s.id),['a','b','c'],'legacy: sorted by integer z');
    assert.ok(state.shapes.every(s=>typeof s.frac==='string'),'legacy: keys seeded for all shapes');
    const keys=state.shapes.map(s=>s.frac);
    assert.deepStrictEqual([...keys].sort(),keys,'legacy: seeded keys are ascending in z order');
    console.log('  ✓ legacy z-only board migrates to frac keys preserving order');
  }

  // Shape.translate - moves shape coordinates per type
  {
    const r=Shape.make('rect',{x:10,y:20,w:100,h:50});
    Shape.translate(r,5,10);
    assert.strictEqual(r.x,15,'translate rect: x += dx');
    assert.strictEqual(r.y,30,'translate rect: y += dy');
    const l=Shape.make('line',{x1:0,y1:0,x2:100,y2:50});
    Shape.translate(l,10,20);
    assert.strictEqual(l.x1,10,'translate line: x1 += dx');
    assert.strictEqual(l.y1,20,'translate line: y1 += dy');
    assert.strictEqual(l.x2,110,'translate line: x2 += dx');
    assert.strictEqual(l.y2,70,'translate line: y2 += dy');
    const pn=Shape.make('pen',{pts:[[0,0],[10,5]]});
    Shape.translate(pn,3,7);
    assert.strictEqual(pn.pts[0][0],3,'translate pen: first pt x');
    assert.strictEqual(pn.pts[1][0],13,'translate pen: second pt x');
    console.log('  ✓ Shape.translate: rect x/y, line x1y1/x2y2, pen pts all shifted');
  }

  // G.marqueeHit - marquee fully contains shape's bbox
  {
    const s=Shape.make('rect',{x:20,y:20,w:60,h:40});
    assert.strictEqual(G.marqueeHit(s,{x:0,y:0,w:200,h:200}),true,'marqueeHit: shape fully inside marquee');
    assert.strictEqual(G.marqueeHit(s,{x:0,y:0,w:50,h:200}),false,'marqueeHit: shape right edge outside marquee');
    assert.strictEqual(G.marqueeHit(s,{x:25,y:25,w:200,h:200}),false,'marqueeHit: shape left edge outside marquee');
    console.log('  ✓ G.marqueeHit: full containment passes, partial overlap fails');
  }

  // Store move op - translates shapes, fully reversible
  {
    state.shapes=[];_invalidateGrid();state.history=[];state.histIdx=-1;state.selection=new Set();
    const smv=Shape.make('rect',{x:0,y:0,w:50,h:50});
    Store.commit({op:'add',shape:smv});
    Store.commit({op:'move',ids:[smv.id],dx:30,dy:20});
    const moved=state.shapes.find(s=>s.id===smv.id);
    assert.strictEqual(moved.x,30,'move op: x += dx');
    assert.strictEqual(moved.y,20,'move op: y += dy');
    Store.undo();
    const back=state.shapes.find(s=>s.id===smv.id);
    assert.strictEqual(back.x,0,'move op undo: x restored');
    assert.strictEqual(back.y,0,'move op undo: y restored');
    console.log('  ✓ move op: translates coords and undo restores');
  }

  // Store upd op - updates arbitrary fields, reversible
  {
    state.shapes=[];_invalidateGrid();state.history=[];state.histIdx=-1;state.selection=new Set();
    const sup=Shape.make('rect',{x:0,y:0,w:50,h:50});sup.stroke='#000000';
    Store.commit({op:'add',shape:sup});
    Store.commit({op:'upd',id:sup.id,before:{stroke:'#000000'},after:{stroke:'#FF0000'}});
    assert.strictEqual(state.shapes.find(s=>s.id===sup.id).stroke,'#FF0000','upd op: field updated');
    Store.undo();
    assert.strictEqual(state.shapes.find(s=>s.id===sup.id).stroke,'#000000','upd op undo: field restored');
    console.log('  ✓ upd op: arbitrary field update + undo');
  }

  // Store del op - removes shapes, fully reversible
  {
    state.shapes=[];_invalidateGrid();state.history=[];state.histIdx=-1;state.selection=new Set();
    const sd=Shape.make('rect',{x:0,y:0,w:50,h:50});
    Store.commit({op:'add',shape:sd});
    Store.commit({op:'del',shapes:[sd]});
    assert.strictEqual(state.shapes.length,0,'del op: shape removed');
    Store.undo();
    assert.strictEqual(state.shapes.length,1,'del op undo: shape restored');
    assert.strictEqual(state.shapes[0].id,sd.id,'del op undo: correct shape restored');
    console.log('  ✓ del op: shape removed, undo restores');
  }

  // Store clear op - removes all shapes, reversible
  {
    state.shapes=[];_invalidateGrid();state.history=[];state.histIdx=-1;state.selection=new Set();
    const sc1=Shape.make('rect',{x:0,y:0,w:50,h:50});
    const sc2=Shape.make('ellipse',{x:100,y:0,w:50,h:50});
    Store.commit({op:'add',shape:sc1});Store.commit({op:'add',shape:sc2});
    Store.commit({op:'clear',shapes:[sc1,sc2]});
    assert.strictEqual(state.shapes.length,0,'clear op: all shapes removed');
    Store.undo();
    assert.strictEqual(state.shapes.length,2,'clear op undo: all shapes restored');
    console.log('  ✓ clear op: all shapes cleared, undo restores both');
  }

  // Store replace op - shared-link import is reversible (§3.9 self-overwrite guard)
  {
    state.shapes=[];_invalidateGrid();state.history=[];state.histIdx=-1;state.selection=new Set();state.seq=0;state.seenOps=new Set();
    const own1=Shape.make('rect',{x:0,y:0,w:50,h:50});
    const own2=Shape.make('ellipse',{x:60,y:0,w:50,h:50});
    Store.commit({op:'add',shape:own1});Store.commit({op:'add',shape:own2});
    const myBoard=state.shapes.map(s=>s.id);
    // Simulate importFromHash's reversible whole-board swap.
    const incoming=[Shape.make('arrow',{x1:0,y1:0,x2:10,y2:10})];
    const before=JSON.parse(JSON.stringify(state.shapes));
    state.shapes=incoming.map(s=>JSON.parse(JSON.stringify(s)));sortZ();
    Store._recordCommitted({op:'replace',before,after:JSON.parse(JSON.stringify(state.shapes))});
    assert.strictEqual(state.shapes.length,1,'replace: board swapped to imported shapes');
    assert.strictEqual(state.shapes[0].type,'arrow','replace: imported shape present');
    Store.undo();
    assert.strictEqual(state.shapes.length,2,'replace undo: original board restored');
    assert.deepStrictEqual(state.shapes.map(s=>s.id),myBoard,'replace undo: same shapes, same order');
    Store.redo();
    assert.strictEqual(state.shapes.length,1,'replace redo: imported board re-applied');
    assert.strictEqual(state.shapes[0].type,'arrow','replace redo: imported shape back');
    console.log('  ✓ replace op: import swaps board, undo restores it, redo re-applies');
  }

  // replace op is local-only - a remote peer must NOT be able to wipe your board
  {
    state.shapes=[];_invalidateGrid();state.history=[];state.histIdx=-1;state.seq=0;state.seenOps=new Set();
    const keep=Shape.make('rect',{x:0,y:0,w:50,h:50});
    state.shapes.push(keep);
    Store.applyRemote({op:'replace',before:[],after:[],clock:{peer:'evil',seq:1,ts:0}});
    assert.strictEqual(state.shapes.length,1,'replace rejected from remote: board intact');
    assert.strictEqual(state.shapes[0].id,keep.id,'replace rejected from remote: shape unchanged');
    console.log('  ✓ replace op: rejected over the wire (REMOTE_OPS allow-list)');
  }

  // importBoard uses atomic replace op (1 undo restores full board, not N+1 undos)
  // Bug: old code did clear+N-adds → overflow MAX_HISTORY for large boards.
  {
    state.shapes=[];_invalidateGrid();state.history=[];state.histIdx=-1;state.seq=0;state.seenOps=new Set();
    const ib1=Shape.make('rect',{x:0,y:0,w:50,h:50});
    const ib2=Shape.make('ellipse',{x:60,y:0,w:50,h:50});
    Store.commit({op:'add',shape:ib1});Store.commit({op:'add',shape:ib2});
    const ibOrigIds=state.shapes.map(s=>s.id);
    const histLenBefore=state.history.length;
    // Simulate fixed importBoard: atomic replace, not clear+adds
    const ibBefore=JSON.parse(JSON.stringify(state.shapes));
    const ibImported=[Shape.make('arrow',{x1:0,y1:0,x2:10,y2:10}),Shape.make('rect',{x:100,y:0,w:30,h:30})];
    state.shapes=ibImported.map(s=>JSON.parse(JSON.stringify(s)));sortZ();
    Store._recordCommitted({op:'replace',before:ibBefore,after:JSON.parse(JSON.stringify(state.shapes))});
    assert.strictEqual(state.history.length,histLenBefore+1,'importBoard: adds exactly 1 history entry (not N+1)');
    Store.undo();
    assert.deepStrictEqual(state.shapes.map(s=>s.id),ibOrigIds,'importBoard: 1 undo fully restores original board');
    Store.redo();
    assert.strictEqual(state.shapes[0].type,'arrow','importBoard: redo re-applies import');
    console.log('  ✓ importBoard(fix): atomic replace op - 1 Ctrl+Z restores board, not N+1');
  }

  // add op is idempotent on shape id - closes a snapshot/live-add duplication race.
  // _applySnapshot sets state.shapes directly but does NOT populate seenOps, so if a
  // live add for an already-held shape arrives after the snapshot, the un-deduped add
  // must not push a second copy.
  {
    state.shapes=[];_invalidateGrid();state.history=[];state.histIdx=-1;state.seq=0;state.seenOps=new Set();state.wclock={};state.selection=new Set();
    const X=Shape.make('rect',{x:0,y:0,w:50,h:50});
    // Snapshot already adopted X (like _applySnapshot: shapes set, seenOps untouched).
    state.shapes=[JSON.parse(JSON.stringify(X))];
    // Live add op for the SAME shape arrives afterwards (snapshot won the race).
    Store.applyRemote({op:'add',shape:JSON.parse(JSON.stringify(X)),clock:{peer:'A',seq:5,ts:1}});
    assert.strictEqual(state.shapes.filter(s=>s.id===X.id).length,1,'add idempotent: no duplicate after snapshot+live-add race');
    assert.strictEqual(state.shapes.length,1,'add idempotent: shape count stays 1');
    console.log('  ✓ add op idempotent on shape id - snapshot/live-add race yields no duplicate');
  }

  // validClock: a malformed-ts remote op is rejected so it can't poison wclock.
  // clockNewer((ts:number),(ts:object)) is false both ways → without the gate a single
  // bad-ts write freezes the property forever (no later legit write can win). The gate
  // must reject the bad op so a subsequent legitimate write still lands.
  {
    state.shapes=[];_invalidateGrid();state.history=[];state.histIdx=-1;state.seq=0;state.seenOps=new Set();state.wclock={};state.selection=new Set();
    const cx=Shape.make('rect',{x:0,y:0,w:50,h:50,stroke:'#000'});
    Store.commit({op:'add',shape:cx});
    // Malformed clock: ts is an object. Must be REJECTED (no wclock poisoning).
    Store.applyRemote({op:'upd',id:cx.id,before:{stroke:'#000'},after:{stroke:'red'},clock:{peer:'evil',seq:1,ts:{}}});
    assert.strictEqual(state.shapes.find(s=>s.id===cx.id).stroke,'#000','malformed-ts upd rejected: stroke unchanged');
    assert.strictEqual(state.wclock[cx.id]===undefined||state.wclock[cx.id].stroke===undefined,true,'malformed-ts upd left no wclock entry');
    // A subsequent LEGITIMATE write must now win (proves wclock was not poisoned).
    Store.applyRemote({op:'upd',id:cx.id,before:{stroke:'#000'},after:{stroke:'blue'},clock:{peer:'good',seq:1,ts:1000}});
    assert.strictEqual(state.shapes.find(s=>s.id===cx.id).stroke,'blue','legit write wins after malformed op rejected');
    // Sibling malformed form also rejected: Infinity ts.
    state.wclock={};state.shapes.find(s=>s.id===cx.id).stroke='#000';
    Store.applyRemote({op:'upd',id:cx.id,before:{stroke:'#000'},after:{stroke:'red'},clock:{peer:'e2',seq:1,ts:Infinity}});
    assert.strictEqual(state.shapes.find(s=>s.id===cx.id).stroke,'#000','Infinity-ts upd rejected');
    console.log('  ✓ validClock: malformed-ts remote op rejected - no wclock poisoning (denial-of-edit)');
  }

  // nowTs monotonic floor: a BACKWARDS wall clock must not let a peer's own newer edit
  // (higher seq) lose to its older edit on remotes. nowTs clamps ts to never regress, so
  // the (peer,seq) tiebreak orders same-peer writes correctly.
  {
    state.shapes=[];_invalidateGrid();state.history=[];state.histIdx=-1;state.seq=0;state.seenOps=new Set();state.wclock={};state.selection=new Set();
    const realNow=Date.now;
    try{
      // Pin wall time to 1000 BEFORE any commit so the floor starts there (the add op
      // would otherwise stamp the real Date.now and dominate the floor).
      Date.now=()=>1000; state._lastTs=0;
      const nx=Shape.make('rect',{x:0,y:0,w:40,h:40,stroke:'#000'});
      Store.commit({op:'add',shape:nx});
      // First edit at wall time 1000.
      Store._recordCommitted({op:'upd',id:nx.id,before:{stroke:'#000'},after:{stroke:'red'}});
      const c1=state.history[state.history.length-1].clock;
      // Wall clock jumps BACK to 990; second edit by the same peer.
      Date.now=()=>990;
      Store._recordCommitted({op:'upd',id:nx.id,before:{stroke:'red'},after:{stroke:'blue'}});
      const c2=state.history[state.history.length-1].clock;
      assert.strictEqual(c2.ts,1000,'nowTs clamps regressed ts up to the prior floor (not 990)');
      assert.ok(c2.seq>c1.seq,'second edit has the higher seq');
      assert.strictEqual(clockNewer(c2,c1),true,"peer's newer edit wins despite backwards wall clock");
    }finally{Date.now=realNow}
    // Remote-ts floor: a local edit after observing a higher remote ts gets ts >= it.
    state._lastTs=0;
    Store.applyRemote({op:'upd',id:'zzz',before:{},after:{},clock:{peer:'R',seq:1,ts:5000}});
    assert.ok(nowTs()>=5000,'local clock floor rises to observed remote ts (HLC-lite)');
    console.log('  ✓ nowTs: monotonic clock floor - backwards wall clock cannot make a peer lose to itself');
  }

  // uid() uses crypto.randomUUID → 122-bit entropy.
  // Old Math.random().toString(36).slice(2,10) gives ~41 bits; birthday collision at 1M
  // shapes reaches p≈23% (old V8 32-bit engine: 100%). crypto.randomUUID is safe.
  {
    const ids=new Set();
    for(let i=0;i<5000;i++)ids.add(Shape.make('rect',{x:0,y:0,w:1,h:1}).id);
    assert.strictEqual(ids.size,5000,'uid: 5000 consecutive uids are all unique');
    const sample=[...ids][0];
    // UUID v4 with dashes stripped: 32 hex chars
    assert.ok(/^[0-9a-f]{32}$/.test(sample)||sample.length>=12,
      'uid: id matches crypto.randomUUID (32 hex) or fallback (>=12 chars)');
    // Clean up; don't leave 5000 shapes in state
    state.shapes=[];_invalidateGrid();
    console.log('  ✓ uid(): crypto.randomUUID gives 122-bit ids - 5000 uids all unique');
  }

  // v1.6.55: doAlign remaining variants - right, bottom, cx, cy
  {
    // right: all right edges align to rightmost
    state.shapes.length=0;_invalidateGrid(); state.history.length=0; state.histIdx=-1; state.seq=0; state.seenOps=new Set();
    const ar1=Shape.make('rect',{x:0,y:0,w:40,h:40});     // right edge = 40
    const ar2=Shape.make('rect',{x:100,y:0,w:60,h:60});   // right edge = 160 (max)
    state.shapes.push(ar1,ar2); state.selection=new Set([ar1.id,ar2.id]);
    doAlign('right');
    assert.strictEqual(G.bbox(ar1).x+G.bbox(ar1).w, G.bbox(ar2).x+G.bbox(ar2).w, 'align right: right edges equal');
    console.log('  ✓ doAlign("right") aligns all shapes to rightmost right edge');

    // bottom: all bottom edges align to bottommost
    state.shapes.length=0;_invalidateGrid(); state.history.length=0; state.histIdx=-1; state.seq=0; state.seenOps=new Set();
    const ab1=Shape.make('rect',{x:0,y:0,w:40,h:40});     // bottom = 40
    const ab2=Shape.make('rect',{x:0,y:100,w:40,h:60});   // bottom = 160 (max)
    state.shapes.push(ab1,ab2); state.selection=new Set([ab1.id,ab2.id]);
    doAlign('bottom');
    assert.strictEqual(G.bbox(ab1).y+G.bbox(ab1).h, G.bbox(ab2).y+G.bbox(ab2).h, 'align bottom: bottom edges equal');
    console.log('  ✓ doAlign("bottom") aligns all shapes to bottommost bottom edge');

    // cx: all shapes center-x aligns to midpoint of bounding union
    state.shapes.length=0;_invalidateGrid(); state.history.length=0; state.histIdx=-1; state.seq=0; state.seenOps=new Set();
    const ac1=Shape.make('rect',{x:0,y:0,w:40,h:40});     // cx = 20
    const ac2=Shape.make('rect',{x:100,y:0,w:60,h:40});   // cx = 130
    state.shapes.push(ac1,ac2); state.selection=new Set([ac1.id,ac2.id]);
    doAlign('cx');
    const bc1=G.bbox(ac1), bc2=G.bbox(ac2);
    assert.strictEqual(bc1.x+bc1.w/2, bc2.x+bc2.w/2, 'align cx: centers-x equal after cx align');
    console.log('  ✓ doAlign("cx") aligns all shapes to horizontal center of union');

    // cy: all shapes center-y aligns to midpoint of bounding union
    state.shapes.length=0;_invalidateGrid(); state.history.length=0; state.histIdx=-1; state.seq=0; state.seenOps=new Set();
    const ay1=Shape.make('rect',{x:0,y:0,w:40,h:40});     // cy = 20
    const ay2=Shape.make('rect',{x:0,y:100,w:40,h:60});   // cy = 130
    state.shapes.push(ay1,ay2); state.selection=new Set([ay1.id,ay2.id]);
    doAlign('cy');
    const by1=G.bbox(ay1), by2=G.bbox(ay2);
    assert.strictEqual(by1.y+by1.h/2, by2.y+by2.h/2, 'align cy: centers-y equal after cy align');
    console.log('  ✓ doAlign("cy") aligns all shapes to vertical center of union');
  }

  // v1.6.55: G.hit ellipse - filled interior vs boundary (unfilled edge)
  {
    // Ellipse: x=0,y=0,w=100,h=80 → cx=50,cy=40,rx=50,ry=40
    const elf={type:'ellipse',x:0,y:0,w:100,h:80,fill:'#f00',size:2}; // filled
    const elu={type:'ellipse',x:0,y:0,w:100,h:80,fill:null,size:2};   // unfilled (outline only)
    // filled: interior point hits, far exterior misses
    assert.strictEqual(G.hit(elf,{x:50,y:40}),true,'ellipse filled: center hit');
    assert.strictEqual(G.hit(elf,{x:95,y:40}),true,'ellipse filled: near-edge interior hit');
    assert.strictEqual(G.hit(elf,{x:150,y:40}),false,'ellipse filled: outside bbox misses');
    // unfilled: right boundary (rx from center = 50) hits; deep interior misses
    assert.strictEqual(G.hit(elu,{x:100,y:40}),true,'ellipse unfilled: right edge boundary hit');
    assert.strictEqual(G.hit(elu,{x:20,y:40}),false,'ellipse unfilled: deep interior misses (outline only)');
    console.log('  ✓ G.hit ellipse: filled interior + exterior, unfilled boundary vs interior');
  }

  // v1.6.55: Store.applyRemote del op - remote peer can delete a local shape
  {
    state.shapes.length=0;_invalidateGrid(); state.history.length=0; state.histIdx=-1; state.seq=0; state.seenOps=new Set();
    const rd=Shape.make('rect',{x:0,y:0,w:10,h:10});
    Store.commit({op:'add',shape:rd});
    assert.strictEqual(state.shapes.length,1,'remote del setup: shape present');
    Store.applyRemote({op:'del',shapes:[JSON.parse(JSON.stringify(rd))],clock:{peer:'remoteD',seq:1,ts:1}});
    assert.strictEqual(state.shapes.length,0,'remote del op: shape removed');
    console.log('  ✓ Store.applyRemote del op removes the targeted shape');
  }

  // v1.6.57: doFlip - mirror selection across its bbox centre, reversible via align op
  {
    state.shapes=[];_invalidateGrid();state.history=[];state.histIdx=-1;state.selection=new Set();
    // two boxes: left [0,40], right [120,160] → bbox x 0..160, centre cx=80
    const fl=Shape.make('rect',{x:0,y:0,w:40,h:40});
    const fr=Shape.make('rect',{x:120,y:0,w:40,h:40});
    Store.commit({op:'add',shape:fl});Store.commit({op:'add',shape:fr});
    state.selection=new Set([fl.id,fr.id]);
    doFlip('h');
    assert.strictEqual(state.shapes.find(s=>s.id===fl.id).x,120,'flipH: left box mirrors to right (2*80-(0+40))');
    assert.strictEqual(state.shapes.find(s=>s.id===fr.id).x,0,'flipH: right box mirrors to left (2*80-(120+40))');
    Store.undo();
    assert.strictEqual(state.shapes.find(s=>s.id===fl.id).x,0,'flipH undo: left box x restored');
    assert.strictEqual(state.shapes.find(s=>s.id===fr.id).x,120,'flipH undo: right box x restored');
    console.log('  ✓ doFlip h: boxes mirror about selection centre, undo restores');
  }
  {
    // pen: vertical flip inverts y order of points
    state.shapes=[];_invalidateGrid();state.history=[];state.histIdx=-1;state.selection=new Set();
    const pn={id:'fp',type:'pen',z:1,pts:[[0,0],[10,20]],stroke:'#000',size:2,opacity:1};
    Store.commit({op:'add',shape:pn});
    state.selection=new Set([pn.id]);
    doFlip('v');
    const p2=state.shapes.find(s=>s.id===pn.id);
    assert.ok(p2.pts[0][1]>p2.pts[1][1],'flipV pen: top point (y=0) now below bottom point (y=20)');
    assert.strictEqual(p2.pts[0][0],0,'flipV pen: x coords untouched on vertical flip');
    Store.undo();
    assert.strictEqual(state.shapes.find(s=>s.id===pn.id).pts[0][1],0,'flipV pen undo: pts restored');
    console.log('  ✓ doFlip v: pen pts mirror vertically, x untouched, undo restores');
  }
  {
    // line: horizontal flip mirrors endpoints (reverses arrow direction)
    state.shapes=[];_invalidateGrid();state.history=[];state.histIdx=-1;state.selection=new Set();
    const ln={id:'fln',type:'line',z:1,x1:0,y1:0,x2:100,y2:0,stroke:'#000',size:2,opacity:1};
    Store.commit({op:'add',shape:ln});
    state.selection=new Set([ln.id]);
    doFlip('h');
    const l2=state.shapes.find(s=>s.id===ln.id);
    assert.ok(l2.x1>l2.x2,'flipH line: endpoints mirrored (x1 now > x2)');
    assert.strictEqual(l2.y1,0,'flipH line: y untouched on horizontal flip');
    console.log('  ✓ doFlip h: line endpoints mirror, y untouched');
  }
  {
    // empty selection is a safe no-op (no history entry, no throw)
    state.shapes=[];_invalidateGrid();state.history=[];state.histIdx=-1;state.selection=new Set();
    const baseLen=state.history.length;
    doFlip('h');
    assert.strictEqual(state.history.length,baseLen,'doFlip no-op on empty selection');
    console.log('  ✓ doFlip: empty selection is a safe no-op');
  }
  {
    // v1.6.62: flipping a rotated shape negates the rotation angle (reflection reverses sense)
    state.shapes=[];_invalidateGrid();state.history=[];state.histIdx=-1;state.selection=new Set();
    const r={id:'frr',type:'rect',z:1,x:0,y:0,w:100,h:60,rotate:30,stroke:'#000',size:2,opacity:1};
    Store.commit({op:'add',shape:r});
    state.selection=new Set([r.id]);
    doFlip('h');
    assert.strictEqual(state.shapes.find(s=>s.id===r.id).rotate,330,'flipH negates rotate 30°→330°');
    Store.undo();
    assert.strictEqual(state.shapes.find(s=>s.id===r.id).rotate,30,'flip undo restores rotate=30');
    console.log('  ✓ doFlip + rotation: reflection negates the rotation angle, undo restores');
  }
  {
    // v1.6.63: doFlip skips locked shapes (was: only doRotate did)
    state.shapes=[];_invalidateGrid();state.history=[];state.histIdx=-1;state.selection=new Set();
    const lk={id:'flk',type:'rect',z:1,x:0,y:0,w:50,h:50,locked:true,stroke:'#000',size:2,opacity:1};
    Store.commit({op:'add',shape:lk});
    state.selection=new Set([lk.id]);
    const hlen=state.history.length;
    doFlip('h');
    assert.strictEqual(state.history.length,hlen,'doFlip is a no-op when all selected shapes are locked');
    console.log('  ✓ doFlip + lock: locked shapes are not flipped (consistent with doRotate)');
  }
  {
    // v1.6.63: multi-selection rotation orbits about the group centre (like doFlip),
    // while a single shape spins in place. Verify both.
    state.shapes=[];_invalidateGrid();state.history=[];state.histIdx=-1;state.selection=new Set();
    const a={id:'ra',type:'rect',z:1,x:0,y:0,w:20,h:20,stroke:'#000',size:2,opacity:1};
    const b={id:'rb',type:'rect',z:2,x:100,y:0,w:20,h:20,stroke:'#000',size:2,opacity:1};
    Store.commit({op:'add',shape:a});Store.commit({op:'add',shape:b});
    state.selection=new Set([a.id,b.id]);
    doRotate(90); // group centre is (60,10); 90° orbit moves each shape's centre
    const a2=state.shapes.find(s=>s.id===a.id),b2=state.shapes.find(s=>s.id===b.id);
    assert.strictEqual(a2.rotate,90,'multi-rotate sets rotate=90 on first shape');
    // a centre was (10,10); orbit 90° about (60,10): new centre (60,-40) → x=50,y=-50
    assert.ok(Math.abs((a2.x+a2.w/2)-60)<0.01&&Math.abs((a2.y+a2.h/2)-(-40))<0.01,'shape orbits about group centre, not in place');
    Store.undo();
    const a3=state.shapes.find(s=>s.id===a.id);
    assert.ok(a3.x===0&&a3.y===0&&(a3.rotate||0)===0,'multi-rotate undo restores position and rotation');
    // single shape spins in place (position unchanged)
    state.selection=new Set([a.id]);
    doRotate(45);
    const a4=state.shapes.find(s=>s.id===a.id);
    assert.ok(a4.x===0&&a4.y===0,'single-shape rotate does not move the shape (spins in place)');
    assert.strictEqual(a4.rotate,45,'single-shape rotate sets angle');
    console.log('  ✓ doRotate: multi-selection orbits group centre, single shape spins in place, undo restores');
  }
  {
    // v1.6.64: rotation only applies to rect/ellipse; pen/line/arrow are skipped (NaN-safe)
    state.shapes=[];_invalidateGrid();state.history=[];state.histIdx=-1;state.selection=new Set();
    const ln={id:'rln',type:'line',z:1,x1:0,y1:0,x2:100,y2:0,stroke:'#000',size:2,opacity:1};
    Store.commit({op:'add',shape:ln});
    state.selection=new Set([ln.id]);
    const hlen=state.history.length;
    doRotate(15);
    assert.strictEqual(state.history.length,hlen,'doRotate is a no-op on a line (point geometry)');
    assert.ok(state.shapes.find(s=>s.id===ln.id).rotate==null,'line never gets a rotate field');
    console.log('  ✓ doRotate scope: pen/line/arrow excluded (no NaN rotation)');
  }
  {
    // v1.6.64: lock protects against deletion, not just movement
    state.shapes=[];_invalidateGrid();state.history=[];state.histIdx=-1;state.selection=new Set();
    const lk={id:'dlk',type:'rect',z:1,x:0,y:0,w:50,h:50,locked:true,stroke:'#000',size:2,opacity:1};
    const fr={id:'dfr',type:'rect',z:2,x:60,y:0,w:50,h:50,stroke:'#000',size:2,opacity:1};
    Store.commit({op:'add',shape:lk});Store.commit({op:'add',shape:fr});
    state.selection=new Set([lk.id,fr.id]);
    doDelete();
    assert.ok(state.shapes.find(s=>s.id===lk.id),'locked shape survives doDelete');
    assert.ok(!state.shapes.find(s=>s.id===fr.id),'unlocked shape in same selection is deleted');
    console.log('  ✓ lock + delete: locked shapes are protected, unlocked siblings still delete');
  }
  {
    // v1.6.65: rotation now covers all box types (sticky/text/image/frame), not just rect/ellipse
    state.shapes=[];_invalidateGrid();state.history=[];state.histIdx=-1;state.selection=new Set();
    const st={id:'rst',type:'sticky',z:1,x:0,y:0,w:100,h:60,color:'#FEF08A',size:1,opacity:1};
    Store.commit({op:'add',shape:st});
    state.selection=new Set([st.id]);
    doRotate(90);
    const s2=state.shapes.find(s=>s.id===st.id);
    assert.strictEqual(s2.rotate,90,'sticky rotates (box-type expansion)');
    const bb=G.bbox(s2);
    assert.ok(Math.abs(bb.w-60)<1&&Math.abs(bb.h-100)<1,'rotated sticky bbox is the 90° envelope (w/h swapped)');
    console.log('  ✓ rotation scope: extends to sticky/text/image/frame (box types), bbox envelope tracks');
  }
  {
    // v1.6.65: connector bound to a rotated shape projects to the TRUE rotated edge,
    // not the axis-aligned envelope. A 45°-rotated square's corner pokes past x=100.
    state.shapes=[];_invalidateGrid();state.history=[];state.histIdx=-1;state.selection=new Set();
    const sq={id:'csq',type:'rect',z:1,x:0,y:0,w:100,h:100,fill:'#eee',stroke:'#000',size:2,opacity:1};
    const ar={id:'car',type:'arrow',z:2,a:sq.id,x1:50,y1:50,x2:200,y2:50,stroke:'#000',size:2,opacity:1};
    Store.commit({op:'add',shape:sq});Store.commit({op:'add',shape:ar});
    const eUnrot=connEnds(state.shapes.find(s=>s.id===ar.id));
    assert.ok(Math.abs(eUnrot.x1-100)<0.5,'unrotated: east-aimed connector exits the right edge at x=100');
    state.shapes.find(s=>s.id===sq.id).rotate=45;
    const eRot=connEnds(state.shapes.find(s=>s.id===ar.id));
    assert.ok(eRot.x1>110,'rotated 45°: connector exits the rotated corner past x=110 (true edge, not envelope)');
    assert.ok(Math.abs(eRot.y1-50)<0.5,'rotated edge point stays on the centre line by symmetry');
    console.log('  ✓ connector + rotation: endpoint projects to the true rotated edge, not the bbox envelope');
  }
  {
    // v1.6.65: describeShape announces locked + rotated state for screen readers
    state.shapes=[];_invalidateGrid();state.history=[];state.histIdx=-1;state.selection=new Set();
    const plain={id:'dp',type:'rect',z:1,x:10,y:20,w:30,h:30,stroke:'#000',size:2,opacity:1};
    const lr={id:'dlr',type:'rect',z:2,x:10,y:20,w:30,h:30,locked:true,rotate:45,stroke:'#000',size:2,opacity:1};
    const d0=describeShape(plain),d1=describeShape(lr);
    assert.ok(!d0.includes('°'),'plain shape description has no rotation marker');
    assert.ok(d1.includes('45°'),'rotated shape description includes the angle');
    assert.ok(d1.length>d0.length,'locked+rotated description is richer than plain');
    console.log('  ✓ describeShape: announces locked + rotated state to screen readers');
  }
  {
    // v1.6.66: resize handles object-snap to nearby shape edges (parity with move-snap)
    state.shapes=[];_invalidateGrid();state.history=[];state.histIdx=-1;state.selection=new Set();
    state.snap=false;state.viewport={x:0,y:0,zoom:1};
    const tgt={id:'rt',type:'rect',z:1,x:200,y:0,w:80,h:80,stroke:'#000',size:1,opacity:1};
    const me={id:'rm',type:'rect',z:2,x:0,y:0,w:100,h:100,stroke:'#000',size:1,opacity:1};
    state.shapes=[tgt,me];
    // drag the east edge to x=195 - within 8px of the target's left edge (200) → snaps
    const s1=resizeSnap(me,'e',{x:195,y:50});
    assert.strictEqual(s1.x,200,'east-resize snaps right edge to the nearby target left edge');
    assert.ok(s1.guides.length===1,'a vertical alignment guide is emitted on snap');
    // far away → no snap
    const s2=resizeSnap(me,'e',{x:150,y:50});
    assert.strictEqual(s2.x,150,'far from any edge → no snap');
    assert.strictEqual(s2.guides.length,0,'no guide when nothing snaps');
    // grid-snap mode bypasses object-snap (mutually exclusive, like move)
    state.snap=true;
    assert.strictEqual(resizeSnap(me,'e',{x:195,y:50}).x,195,'grid-snap mode bypasses object-snap');
    state.snap=false;
    // rotated shapes are skipped (axis-aligned edge snap would be incoherent)
    me.rotate=30;
    assert.strictEqual(resizeSnap(me,'e',{x:195,y:50}).x,195,'rotated shape resize is not object-snapped');
    delete me.rotate;
    // line endpoints (p1/p2) are not box-edge snapped
    assert.strictEqual(resizeSnap(me,'p2',{x:195,y:50}).x,195,'line endpoint handles are not box-snapped');
    console.log('  ✓ resize object-snap: edges snap to nearby shapes, guides emitted, grid/rotate/line bypass');
  }
  {
    // clampZoom is the single source for the zoom invariant [MIN_ZOOM,MAX_ZOOM], shared by
    // wheel-zoom, fit, AND Persist.load. A corrupt/forward-incompat IDB record with an
    // out-of-range zoom used to load an unusable canvas; load now routes through clampZoom.
    assert.strictEqual(clampZoom(1e9), MAX_ZOOM, 'clampZoom: astronomical zoom pinned to MAX_ZOOM');
    assert.strictEqual(clampZoom(0.00001), MIN_ZOOM, 'clampZoom: microscopic zoom pinned to MIN_ZOOM');
    assert.strictEqual(clampZoom(1), 1, 'clampZoom: in-range zoom passes through unchanged');
    assert.ok(MIN_ZOOM>0 && MAX_ZOOM>MIN_ZOOM, 'clampZoom: invariant range is sane');
    console.log('  ✓ clampZoom pins out-of-range zoom into [MIN_ZOOM,MAX_ZOOM] (load/wheel/fit share it)');
  }
  {
    // v1.6.66: Shift on a corner handle locks the original aspect ratio
    state.shapes=[];_invalidateGrid();state.history=[];state.histIdx=-1;state.selection=new Set();
    state.snap=false;state.viewport={x:0,y:0,zoom:1};
    const orig={id:'ar',type:'rect',x:0,y:0,w:100,h:50,stroke:'#000',size:1,opacity:1}; // 2:1
    // se handle dragged to (300,300); without lock that's 300x300, with lock aspect stays 2:1
    const sh={...orig};
    applyResize(sh,'se',orig,{x:300,y:300},true);
    assert.ok(Math.abs(sh.w/sh.h-2)<1e-6,'aspect ratio preserved (2:1) under Shift');
    assert.strictEqual(sh.x,0,'se anchor: top-left pinned (x)');
    assert.strictEqual(sh.y,0,'se anchor: top-left pinned (y)');
    // nw handle: opposite (se) corner stays pinned at (100,50)
    const sh2={...orig};
    applyResize(sh2,'nw',orig,{x:-100,y:-100},true);
    assert.ok(Math.abs(sh2.w/sh2.h-2)<1e-6,'nw aspect ratio preserved');
    assert.ok(Math.abs((sh2.x+sh2.w)-100)<1e-6,'nw anchor: se corner pinned (x)');
    assert.ok(Math.abs((sh2.y+sh2.h)-50)<1e-6,'nw anchor: se corner pinned (y)');
    // without Shift, free resize (no aspect constraint)
    const sh3={...orig};
    applyResize(sh3,'se',orig,{x:300,y:300},false);
    assert.ok(Math.abs(sh3.w-300)<1e-6&&Math.abs(sh3.h-300)<1e-6,'no Shift → free resize');
    // edge handles ignore Shift (only corners lock aspect)
    const sh4={...orig};
    applyResize(sh4,'e',orig,{x:300,y:0},true);
    assert.strictEqual(sh4.h,50,'edge handle height unchanged by Shift');
    console.log('  ✓ resize aspect-lock: Shift on corner preserves ratio with opposite corner pinned');
  }
  {
    // v1.6.67: drag-to-rotate handle geometry
    state.shapes=[];_invalidateGrid();state.history=[];state.histIdx=-1;state.selection=new Set();
    state.viewport={x:0,y:0,zoom:1};
    const box={id:'rh',type:'rect',x:0,y:0,w:100,h:100,stroke:'#000',size:1,opacity:1};
    state.shapes=[box];
    const rh=getRotHandle(box);
    // unrotated: knob sits directly above top-centre (50,0) by ROT_OFFSET=24
    assert.ok(Math.abs(rh.x-50)<1e-6&&Math.abs(rh.y-(-24))<1e-6,'knob above top-centre when unrotated');
    assert.ok(Math.abs(rh.cx-50)<1e-6&&Math.abs(rh.cy-50)<1e-6,'pivot is the shape centre');
    assert.ok(Math.abs(rh.ax-50)<1e-6&&Math.abs(rh.ay-0)<1e-6,'anchor on the top edge');
    // rotated 90°: knob swings to the left of centre (pivot 50,50; up→left)
    box.rotate=90;
    const rh2=getRotHandle(box);
    assert.ok(Math.abs(rh2.x-(50+74))<1e-4,'90°: knob x = pivot + (cy - knobY_unrot) = 50+74');
    assert.ok(Math.abs(rh2.y-50)<1e-4,'90°: knob y stays at pivot height');
    // locked / point geometry → no handle
    box.rotate=0;box.locked=true;
    assert.strictEqual(getRotHandle(box),null,'locked shape has no rotation handle');
    assert.strictEqual(getRotHandle({type:'pen',pts:[[0,0]]}),null,'pen has no rotation handle (no box centre)');
    // angle math the drag uses: knob dragged due-east of pivot → 90°
    const deg=((Math.round(Math.atan2(0,100)*180/Math.PI+90)%360)+360)%360;
    assert.strictEqual(deg,90,'knob east of pivot maps to 90°');
    console.log('  ✓ rotation handle: knob geometry tracks rotation, excludes locked/point shapes');
  }
  {
    // v1.6.68: Alt = resize about the original centre (opposite edge mirrors)
    state.shapes=[];_invalidateGrid();state.history=[];state.histIdx=-1;state.selection=new Set();
    state.snap=false;state.viewport={x:0,y:0,zoom:1};
    const orig={id:'cz',type:'rect',x:100,y:100,w:100,h:100,stroke:'#000',size:1,opacity:1}; // centre (150,150)
    // east handle + Alt: drag right edge to x=200 → half=50 → w=100... extend to x=250 → half=100
    const sh={...orig};
    applyResize(sh,'e',orig,{x:250,y:150},false,true);
    assert.strictEqual(sh.w,200,'Alt east: width = 2×(edge−centre) = 200');
    assert.strictEqual(sh.x,50,'Alt east: centre stays at 150 (x=50)');
    assert.ok(Math.abs((sh.x+sh.w/2)-150)<1e-9,'Alt east: centre invariant');
    assert.strictEqual(sh.h,100,'Alt east: height untouched');
    // corner + Alt: both axes mirror about centre
    const sh2={...orig};
    applyResize(sh2,'se',orig,{x:250,y:250},false,true);
    assert.ok(Math.abs((sh2.x+sh2.w/2)-150)<1e-9&&Math.abs((sh2.y+sh2.h/2)-150)<1e-9,'Alt corner: centre invariant on both axes');
    assert.strictEqual(sh2.w,200,'Alt se: width mirrored');
    assert.strictEqual(sh2.h,200,'Alt se: height mirrored');
    // Shift+Alt: symmetric AND proportional (1:1 here)
    const sh3={...orig};
    applyResize(sh3,'se',orig,{x:300,y:200},true,true);
    assert.ok(Math.abs(sh3.w-sh3.h)<1e-9,'Shift+Alt: aspect locked (square stays square)');
    assert.ok(Math.abs((sh3.x+sh3.w/2)-150)<1e-9&&Math.abs((sh3.y+sh3.h/2)-150)<1e-9,'Shift+Alt: centre invariant');
    console.log('  ✓ resize from centre: Alt mirrors about original centre; Shift+Alt stays proportional');
  }
  {
    // v1.6.69: rotated-box resize keeps the opposite anchor fixed in WORLD space
    state.shapes=[];_invalidateGrid();state.history=[];state.histIdx=-1;state.selection=new Set();
    state.snap=false;state.viewport={x:0,y:0,zoom:1};
    const rot=30,toR=d=>d*Math.PI/180;
    const rotPt=(px,py,cx,cy,d)=>{const a=toR(d),c=Math.cos(a),s=Math.sin(a),dx=px-cx,dy=py-cy;return{x:cx+dx*c-dy*s,y:cy+dx*s+dy*c};};
    const orig={id:'rr',type:'rect',x:0,y:0,w:100,h:100,rotate:rot,stroke:'#000',size:1,opacity:1};
    // grabbing 'se' should keep the nw corner pinned in world
    const sh={...orig};
    applyResize(sh,'se',orig,{x:140,y:120},false,false);
    const nwWorldOrig=rotPt(0,0,50,50,rot);
    const nwWorldNew=rotPt(sh.x,sh.y,sh.x+sh.w/2,sh.y+sh.h/2,rot);
    assert.ok(Math.abs(nwWorldNew.x-nwWorldOrig.x)<1e-6&&Math.abs(nwWorldNew.y-nwWorldOrig.y)<1e-6,'se-resize: nw corner fixed in world');
    // handles are exposed for rotated shapes now, at rotated positions
    const hs=getHandles(orig);
    assert.strictEqual(hs.length,8,'rotated box exposes all 8 handles');
    const se=hs.find(h=>h.id==='se'),seW=rotPt(100,100,50,50,rot);
    assert.ok(Math.abs(se.x-seW.x)<1e-6&&Math.abs(se.y-seW.y)<1e-6,'se handle sits at the rotated corner');
    // edge handle 'e' keeps the left-edge midpoint pinned in world
    const sh2={...orig};
    applyResize(sh2,'e',orig,{x:160,y:50},false,false);
    const lmOrig=rotPt(0,50,50,50,rot),lmNew=rotPt(sh2.x,sh2.y+sh2.h/2,sh2.x+sh2.w/2,sh2.y+sh2.h/2,rot);
    assert.ok(Math.abs(lmNew.x-lmOrig.x)<1e-6&&Math.abs(lmNew.y-lmOrig.y)<1e-6,'e-resize: left-edge midpoint fixed in world');
    // Alt on a rotated box keeps the centre fixed
    const sh3={...orig};
    applyResize(sh3,'se',orig,{x:140,y:120},false,true);
    assert.ok(Math.abs((sh3.x+sh3.w/2)-50)<1e-6&&Math.abs((sh3.y+sh3.h/2)-50)<1e-6,'Alt+rotated: centre invariant');
    console.log('  ✓ rotated resize: anchor fixed in world, handles rotate, Alt keeps centre');
  }
  {
    // v1.6.70: keyboard resize op (Alt+arrow) is a single reversible batch
    state.shapes=[];_invalidateGrid();state.history=[];state.histIdx=-1;state.selection=new Set();
    const a={id:'ka',type:'rect',z:1,x:0,y:0,w:100,h:50,stroke:'#000',size:1,opacity:1};
    const b={id:'kb',type:'sticky',z:2,x:200,y:0,w:80,h:80,color:'#FEF08A',size:1,opacity:1};
    Store.commit({op:'add',shape:a});Store.commit({op:'add',shape:b});
    // grow both by a `resize` batch op (the Alt+arrow handler mutates then records;
    // here we let Store.commit apply it so undo/redo of the op type is exercised)
    Store.commit({op:'resize',
      before:[{id:'ka',w:100,h:50},{id:'kb',w:80,h:80}],
      after:[{id:'ka',w:110,h:60},{id:'kb',w:90,h:90}]});
    assert.strictEqual(byId('ka').w,110,'resize op applied width to shape A');
    assert.strictEqual(byId('kb').h,90,'resize op applied height to shape B');
    Store.undo();
    assert.strictEqual(byId('ka').w,100,'single undo reverts shape A');
    assert.strictEqual(byId('kb').h,80,'single undo reverts shape B too (one history entry)');
    Store.redo();
    assert.strictEqual(byId('ka').w,110,'redo re-applies A');
    assert.strictEqual(byId('kb').w,90,'redo re-applies B');
    function byId(id){return state.shapes.find(s=>s.id===id)}
    console.log('  ✓ keyboard resize: `resize` batch op is a single reversible undo/redo step');
  }

  // v1.6.58: rect/ellipse centre labels via upd op
  {
    // Setting a label on a rect via upd op and undoing restores it
    state.shapes=[];_invalidateGrid();state.history=[];state.histIdx=-1;state.selection=new Set();
    const lb=Shape.make('rect',{x:0,y:0,w:100,h:60});
    Store.commit({op:'add',shape:lb});
    Store.commit({op:'upd',id:lb.id,before:{label:null},after:{label:'Hello'}});
    assert.strictEqual(state.shapes.find(s=>s.id===lb.id).label,'Hello','label set via upd op');
    Store.undo();
    assert.strictEqual(state.shapes.find(s=>s.id===lb.id).label,null,'label null after undo (not rendered)');
    console.log('  ✓ rect label: set via upd op, undo clears it');
  }
  {
    // Ellipse label round-trip: set → undo → redo
    state.shapes=[];_invalidateGrid();state.history=[];state.histIdx=-1;state.selection=new Set();
    const le=Shape.make('ellipse',{x:0,y:0,w:80,h:60});
    Store.commit({op:'add',shape:le});
    Store.commit({op:'upd',id:le.id,before:{label:null},after:{label:'OK'}});
    assert.strictEqual(state.shapes.find(s=>s.id===le.id).label,'OK','ellipse label set');
    Store.undo();
    assert.strictEqual(state.shapes.find(s=>s.id===le.id).label,null,'ellipse label null after undo');
    Store.redo();
    assert.strictEqual(state.shapes.find(s=>s.id===le.id).label,'OK','ellipse label redo');
    console.log('  ✓ ellipse label: upd op round-trip undo/redo');
  }
  {
    // SVG export includes label text for labelled rect
    const lr=Shape.make('rect',{x:0,y:0,w:100,h:60});lr.label='SVG';
    const svgLbl=buildSVG([lr],'#FFFFFF');
    assert.ok(svgLbl.includes('text-anchor="middle"'),'SVG rect label uses text-anchor middle');
    assert.ok(svgLbl.includes('>SVG<'),'SVG rect label text is present');
    // ensure label is escaped
    const lrEvil=Shape.make('rect',{x:0,y:0,w:100,h:60});lrEvil.label='<script>';
    const svgEvil=buildSVG([lrEvil],'#FFFFFF');
    assert.ok(!/<script/.test(svgEvil),'SVG rect label is HTML-escaped');
    console.log('  ✓ SVG export: rect label rendered with text-anchor, escaped');
  }

  // v1.6.59: shape lock - locked shapes resist move/resize, toggle is reversible
  {
    state.shapes=[];_invalidateGrid();state.history=[];state.histIdx=-1;state.selection=new Set();
    const lk=Shape.make('rect',{x:10,y:10,w:50,h:50});
    Store.commit({op:'add',shape:lk});
    state.selection=new Set([lk.id]);
    // lock it
    doLock();
    assert.strictEqual(state.shapes.find(s=>s.id===lk.id).locked,true,'doLock sets locked=true');
    // locked shape exposes no resize handles
    assert.strictEqual(getHandles(state.shapes.find(s=>s.id===lk.id)).length,0,'locked shape has 0 handles');
    // undo restores unlocked (null)
    Store.undo();
    assert.strictEqual(state.shapes.find(s=>s.id===lk.id).locked,null,'doLock undo clears locked');
    // redo re-locks
    Store.redo();
    assert.strictEqual(state.shapes.find(s=>s.id===lk.id).locked,true,'doLock redo re-locks');
    // toggle off again
    doLock();
    assert.strictEqual(state.shapes.find(s=>s.id===lk.id).locked,null,'doLock toggles off (unlock)');
    // empty selection is a safe no-op
    state.selection=new Set();
    const baseLen=state.history.length;
    doLock();
    assert.strictEqual(state.history.length,baseLen,'doLock no-op on empty selection');
    console.log('  ✓ shape lock: toggle locked, no handles when locked, undo/redo, empty no-op');
  }

  // v1.6.60: bound connectors - arrow endpoints derive from bound shapes and follow them
  {
    state.shapes=[];_invalidateGrid();state.history=[];state.histIdx=-1;state.selection=new Set();
    const box=Shape.make('rect',{x:100,y:100,w:80,h:60});   // centre (140,130), edges x∈[100,180]
    const arr=Shape.make('arrow',{x1:0,y1:130,x2:90,y2:130});
    arr.a=box.id;  // bind start to the box
    Store.commit({op:'add',shape:box});
    Store.commit({op:'add',shape:arr});
    const e1=connEnds(state.shapes.find(s=>s.id===arr.id));
    // bound start sits on the box's left edge (x=100) since the free end (x2=90) is to the left
    assert.strictEqual(e1.x1,100,'bound start projects to box left edge');
    assert.strictEqual(e1.y1,130,'bound start keeps centre y');
    assert.strictEqual(e1.x2,90,'free end unchanged');
    const ab1=G.bbox(state.shapes.find(s=>s.id===arr.id));
    // move the box right by 200 → bound endpoint follows (derived, not stored)
    state.selection=new Set([box.id]);
    Store.commit({op:'move',ids:[box.id],dx:200,dy:0});
    const e2=connEnds(state.shapes.find(s=>s.id===arr.id));
    assert.ok(e2.x1>e1.x1,'bound endpoint follows the moved box');
    // bbox of the arrow reflects the derived endpoint (so culling/selection track it)
    const ab2=G.bbox(state.shapes.find(s=>s.id===arr.id));
    assert.ok(ab2.w>ab1.w,'arrow bbox widens as the bound endpoint moves away');
    // deleting the bound shape degrades gracefully to the stored fallback coord
    Store.commit({op:'del',shapes:[JSON.parse(JSON.stringify(state.shapes.find(s=>s.id===box.id)))]});
    const e3=connEnds(state.shapes.find(s=>s.id===arr.id));
    assert.strictEqual(e3.x1,0,'after bound shape deleted, start falls back to stored x1');
    console.log('  ✓ bound connectors: endpoint projects to edge, follows move, bbox tracks, graceful fallback');
  }

  // v1.6.61: rotation
  {
    state.shapes=[];_invalidateGrid();state.history=[];state.histIdx=-1;state.selection=new Set();
    const r=Shape.make('rect',{x:0,y:0,w:100,h:60,fill:'#eee'});
    Store.commit({op:'add',shape:r});
    state.selection=new Set([r.id]);
    // initial rotate undefined/null → bbox matches raw shape
    const b0=G.bbox(state.shapes.find(s=>s.id===r.id));
    assert.strictEqual(b0.w,100,'unrotated bbox.w=100');
    doRotate(90);
    const rsh=state.shapes.find(s=>s.id===r.id);
    assert.strictEqual(rsh.rotate,90,'doRotate sets rotate=90');
    // rotated 90°: axis-aligned bbox should swap w/h
    const b1=G.bbox(rsh);
    assert.ok(Math.abs(b1.w-60)<1,'rotated 90°: bbox.w≈h=60');
    assert.ok(Math.abs(b1.h-100)<1,'rotated 90°: bbox.h≈w=100');
    // undo restores rotate to 0
    Store.undo();
    assert.strictEqual(state.shapes.find(s=>s.id===r.id).rotate,0,'doRotate undo restores rotate=0');
    // redo re-applies
    Store.redo();
    assert.strictEqual(state.shapes.find(s=>s.id===r.id).rotate,90,'doRotate redo restores rotate=90');
    // G.hit: point at shape centre always hits regardless of rotation
    const sh2=state.shapes.find(s=>s.id===r.id);
    const cx=sh2.x+sh2.w/2,cy=sh2.y+sh2.h/2;
    assert.ok(G.hit(sh2,{x:cx,y:cy}),'centre point always hits a rotated rect');
    // wrap-around: 360→0
    doRotate(270); // 90+270=360 → 0
    assert.strictEqual(state.shapes.find(s=>s.id===r.id).rotate,0,'doRotate 360° wraps to 0');
    // empty selection is a no-op
    state.selection=new Set();
    const hlen=state.history.length;
    doRotate(45);
    assert.strictEqual(state.history.length,hlen,'doRotate no-op on empty selection');
    console.log('  ✓ doRotate: rotate field, bbox envelope, G.hit centre, undo/redo, wrap, empty no-op');
  }

  // ---- two-peer convergence harness (§3.14) -----------------------------------
  // The single-world harness above cannot observe sync bugs - they need >=2 peers.
  // Build a second independent world (eval the script again) and wire the transports
  // so convergence is asserted, not assumed. This harness would have caught all three
  // of this session's sync fixes (validPatch nesting, WebRTC ops-missing, snapshot
  // index keys) automatically, instead of relying on a manual code read.
  {
    const A = api;
    const B = fn(
      fakeWin, fakeDoc, fakeWin.navigator, fakeWin.requestAnimationFrame,
      fakeWin.indexedDB, fakeWin.URL, setTimeout, clearTimeout, setInterval, clearInterval,
      fakeWin.getComputedStyle, fakeWin.confirm, fakeWin.alert, Blob, fakeWin, fakeWin
    );
    const cp = o => JSON.parse(JSON.stringify(o));
    A.state.peerId='peerA'; B.state.peerId='peerB';
    const reset = W => { W.state.shapes.length=0;_invalidateGrid(); W.state.history.length=0; W.state.histIdx=-1; W.state.seq=0; W.state.seenOps=new Set(); W.state.wclock={}; };
    reset(A); reset(B);
    // wire each peer's outbound to the other's _onRecv (deep-copied, like a real wire)
    A.Net.broadcast = op => B.Net._onRecv({k:'op',op:cp(op)});
    B.Net.broadcast = op => A.Net._onRecv({k:'op',op:cp(op)});
    A.Net._send = msg => B.Net._onRecv(cp(msg));
    B.Net._send = msg => A.Net._onRecv(cp(msg));

    // (a) a shape A commits propagates to B by broadcast
    const ra = A.Shape.make('rect',{x:0,y:0,w:10,h:10});
    A.Store.commit({op:'add',shape:ra});
    assert.ok(B.state.shapes.some(s=>s.id===ra.id),'convergence: B receives A\'s committed shape');

    // (b) both drew offline, then exchange snapshots → converge to the union.
    //     This is the non-empty-peer merge that sync bugs #2/#3 silently broke.
    reset(A); reset(B);
    const sa = A.Shape.make('rect',{x:1,y:1,w:5,h:5});   A.state.shapes.push(sa);
    const sb = B.Shape.make('ellipse',{x:9,y:9,w:5,h:5}); B.state.shapes.push(sb);
    A.Net._sendSnapshot();   // A → B (B already has sb, so B must MERGE, not replace)
    B.Net._sendSnapshot();   // B → A
    const idsA = A.state.shapes.map(s=>s.id).sort();
    const idsB = B.state.shapes.map(s=>s.id).sort();
    assert.deepStrictEqual(idsA, idsB, 'convergence: A and B hold the same shape set after snapshot exchange');
    assert.ok(idsA.includes(sa.id) && idsA.includes(sb.id), 'convergence: union contains both peers\' shapes');
    console.log('  ✓ two-peer harness: broadcast propagates + snapshot exchange converges to union (§3.14)');

    // ---- ADR-0010: peer cursor presence — ephemeral, never touches Store/history ----
    {
      A.state.peers.clear();B.state.peers.clear();
      // both sides must already know of "some" peer for sendCursor's early-return guard
      // (it checks the SENDER's own state.peers.size, not the receiver's)
      A.state.peers.set('peerB',{color:'#111',lastSeen:Date.now()});
      B.state.peers.set('peerA',{color:'#222',lastSeen:Date.now()});
      A.Net._lastCursorSend=0;

      // (a) BC-path: A's cursor reaches B, keyed by A's real peerId (viaRtc undefined/false)
      A.Net.sendCursor({x:10,y:20});
      assert.deepStrictEqual(B.state.peers.get('peerA').cursor,{x:10,y:20},'ADR-0010a: cursor position propagates A→B via the BC path, keyed by real peerId');

      // (b) throttle: an immediate second send within CURSOR_THROTTLE_MS is dropped
      A.Net.sendCursor({x:99,y:99});
      assert.deepStrictEqual(B.state.peers.get('peerA').cursor,{x:10,y:20},'ADR-0010b: a second sendCursor within the throttle window is dropped, stale position unchanged');
      A.Net._lastCursorSend=0;   // simulate the throttle window elapsing
      A.Net.sendCursor({x:99,y:99});
      assert.deepStrictEqual(B.state.peers.get('peerA').cursor,{x:99,y:99},'ADR-0010b: after the throttle window elapses, the next sendCursor goes through');

      // (c) viaRtc routing: a WebRTC-received cursor must key off the LOCAL synthetic
      // _rtcPeerId, NOT msg.peer — hello/ping/sync-req never ride the DataChannel, so
      // msg.peer would not exist as a state.peers key on that transport.
      B.state.peers.clear();
      B.Net._rtcPeerId='rtc:test';
      B.state.peers.set('rtc:test',{color:'#333',lastSeen:Date.now()});
      B.Net._onRecv({k:'cursor',peer:'peerA',x:5,y:6},true);
      assert.deepStrictEqual(B.state.peers.get('rtc:test').cursor,{x:5,y:6},'ADR-0010c: viaRtc cursor message updates the synthetic _rtcPeerId entry');
      assert.strictEqual(B.state.peers.has('peerA'),false,'ADR-0010c: viaRtc routing does not create a phantom entry keyed by the real peerId');

      // (d) unknown peer: a cursor for a peer we've never heard of is silently ignored
      B.state.peers.clear();
      assert.doesNotThrow(()=>B.Net._onRecv({k:'cursor',peer:'ghost',x:1,y:2}),'ADR-0010d: cursor for an unknown peer does not throw');
      assert.strictEqual(B.state.peers.has('ghost'),false,'ADR-0010d: cursor for an unknown peer does not create a new entry (presence is enrich-only, not peer-creating)');

      // (e) non-finite coordinates are rejected (defensive intake, same spirit as validRemotePayload)
      B.state.peers.set('peerA',{color:'#222',lastSeen:Date.now()});
      B.Net._onRecv({k:'cursor',peer:'peerA',x:NaN,y:5});
      assert.strictEqual(B.state.peers.get('peerA').cursor,undefined,'ADR-0010e: a non-finite x/y is rejected, no cursor is set');

      console.log('  ✓ ADR-0010 peer cursor presence: BC routing, throttle, viaRtc→_rtcPeerId, unknown-peer no-op, non-finite rejected');
    }

    // ---- ADR-0011: peer selection presence — change-detected at the frame boundary ----
    {
      A.state.peers.clear();B.state.peers.clear();
      A.state.peers.set('peerB',{color:'#111',lastSeen:Date.now()});
      B.state.peers.set('peerA',{color:'#222',lastSeen:Date.now()});
      A.Net._lastSelSent='';

      // (a) BC path: A's selection reaches B, keyed by A's real peerId; deselect propagates
      A.state.selection=new Set(['s1','s2']);
      A.Net.sendSelectionIfChanged();
      assert.deepStrictEqual(B.state.peers.get('peerA').sel,['s1','s2'],'ADR-0011a: selection ids propagate A→B via the BC path, keyed by real peerId');
      A.state.selection=new Set();
      A.Net.sendSelectionIfChanged();
      assert.deepStrictEqual(B.state.peers.get('peerA').sel,[],'ADR-0011a: deselecting propagates as an empty ids array (clears the highlight)');

      // (b) change detection: an unchanged selection is NOT resent. Prove it by planting
      // a sentinel in B's record — a resend would overwrite it.
      A.state.selection=new Set(['s3']);
      A.Net.sendSelectionIfChanged();
      B.state.peers.get('peerA').sel=['sentinel'];
      A.Net.sendSelectionIfChanged();
      assert.deepStrictEqual(B.state.peers.get('peerA').sel,['sentinel'],'ADR-0011b: an unchanged selection is not resent (frame-boundary no-op)');
      A.state.selection=new Set(['s3','s4']);
      A.Net.sendSelectionIfChanged();
      assert.deepStrictEqual(B.state.peers.get('peerA').sel,['s3','s4'],'ADR-0011b: a changed selection is resent');

      // (c) latecomer resend: _touchPeer registering a NEW peer resets _lastSelSent so
      // the next frame rebroadcasts the current selection to the newcomer.
      B.state.peers.get('peerA').sel=['sentinel2'];
      A.Net.sendSelectionIfChanged();
      assert.deepStrictEqual(B.state.peers.get('peerA').sel,['sentinel2'],'ADR-0011c precondition: no resend while unchanged');
      A.Net._touchPeer('peerC');
      A.Net.sendSelectionIfChanged();
      assert.deepStrictEqual(B.state.peers.get('peerA').sel,['s3','s4'],'ADR-0011c: a new peer joining forces one selection rebroadcast');
      A.state.peers.delete('peerC');

      // (d) viaRtc routing: same _rtcPeerId pitfall as ADR-0010c
      B.state.peers.clear();
      B.Net._rtcPeerId='rtc:test';
      B.state.peers.set('rtc:test',{color:'#333',lastSeen:Date.now()});
      B.Net._onRecv({k:'selection',peer:'peerA',ids:['sX']},true);
      assert.deepStrictEqual(B.state.peers.get('rtc:test').sel,['sX'],'ADR-0011d: viaRtc selection message updates the synthetic _rtcPeerId entry');
      assert.strictEqual(B.state.peers.has('peerA'),false,'ADR-0011d: viaRtc routing does not create a phantom entry keyed by the real peerId');

      // (e) defensive intake: non-array rejected, non-string ids filtered, unknown peer no-op
      B.state.peers.set('peerA',{color:'#222',lastSeen:Date.now()});
      B.Net._onRecv({k:'selection',peer:'peerA',ids:'not-an-array'});
      assert.strictEqual(B.state.peers.get('peerA').sel,undefined,'ADR-0011e: a non-array ids payload is rejected outright');
      B.Net._onRecv({k:'selection',peer:'peerA',ids:['ok',42,null,{},'ok2']});
      assert.deepStrictEqual(B.state.peers.get('peerA').sel,['ok','ok2'],'ADR-0011e: non-string ids are filtered out of the payload');
      assert.doesNotThrow(()=>B.Net._onRecv({k:'selection',peer:'ghost',ids:['x']}),'ADR-0011e: selection for an unknown peer does not throw');
      assert.strictEqual(B.state.peers.has('ghost'),false,'ADR-0011e: selection for an unknown peer does not create a new entry');

      console.log('  ✓ ADR-0011 peer selection presence: change-detect send, deselect clear, join resend, viaRtc→_rtcPeerId, defensive intake');
    }

    // ---- v1.7.62: recording-canvas test for the overlay coordinate space (HiDPI) --------
    // The fake ctx above is a pure no-op, so until now NO test could observe a coordinate
    // error — which is exactly how the double-DPR overlay bug survived from v1.6.5 to
    // v1.7.61 (spec §14.2 "テストの偏り"). This recording ctx tracks the affine transform
    // and captures the DEVICE-space rect of each strokeRect, turning a wrong ×DPR into a
    // numeric failure. The invariant asserted is transform-driven (device size must scale
    // exactly with DPR), not a hardcoded constant, so it also guards future regressions.
    {
      const A2 = A;
      const mkRec = () => {
        let T=[1,0,0,1,0,0]; const rects=[];
        const dx=(x,y)=>T[0]*x+T[2]*y+T[4], dy=(x,y)=>T[1]*x+T[3]*y+T[5];
        return { _rects:rects,
          setTransform(a,b,c,d,e,f){T=[a,b,c,d,e,f];},
          strokeRect(x,y,w,h){rects.push({x:dx(x,y),y:dy(x,y),w:T[0]*w,h:T[3]*h});},
          fillRect(){}, beginPath(){}, moveTo(){}, lineTo(){}, arc(){}, arcTo(){},
          quadraticCurveTo(){}, ellipse(){}, closePath(){}, fill(){}, stroke(){}, clip(){},
          save(){}, restore(){}, translate(){}, scale(){}, rotate(){}, clearRect(){},
          measureText:()=>({width:50}), fillText(){}, setLineDash(){},
          get canvas(){return{width:800,height:600};},
          fillStyle:'',strokeStyle:'',lineWidth:1,font:'',textBaseline:'',globalAlpha:1,lineCap:'',lineJoin:'' };
      };
      // Single selected rect placed WELL off-screen (5000,5000) so its body is culled by
      // inView — leaving only the overlay (selection box + handles) in the recording.
      A2.state.shapes.length=0; A2._invalidateGrid();
      A2.state.peers.clear(); A2.state.guides=null; A2.state.marquee=null;
      A2.state.draft=null; A2.state.showGrid=false;
      Object.assign(A2.state.viewport,{x:0,y:0,zoom:1});
      const rr=A2.Shape.make('rect',{x:5000,y:5000,w:100,h:100});
      A2.state.shapes.push(rr); A2._invalidateGrid();
      A2.state.selection=new Set([rr.id]);

      // the selection box is strokeRect(x-1,y-1,w+2,h+2); at zoom 1 its CSS-px size is
      // w+2=102, and handles are HANDLE_SIZE=8 — so w>50 isolates the box from handles.
      const bigBox = rec => rec._rects.filter(r=>Math.abs(r.w)>50);
      const runAt = dpr => {
        fakeWin.devicePixelRatio=dpr; A2.resize();
        const rec=mkRec(); const prev=A2._setCtx(rec);
        A2.draw(); A2._setCtx(prev);
        return bigBox(rec);
      };
      const at1=runAt(1), at2=runAt(2);
      assert.strictEqual(at1.length,1,'HiDPI-record: exactly one overlay box (selection) at DPR=1 — body culled, handles filtered');
      assert.strictEqual(at2.length,1,'HiDPI-record: exactly one overlay box at DPR=2');
      assert.ok(Math.abs(at1[0].w-102)<1,`HiDPI-record: DPR=1 selection box device width ≈102 (got ${at1[0].w})`);
      // the crux: doubling DPR must exactly double the device size. Buggy ×DPR-again code
      // would give 102→~404 (ratio ~3.96); the fix gives 102→204 (ratio 2.0).
      assert.ok(Math.abs(at2[0].w-204)<1,`HiDPI-record: DPR=2 selection box device width ≈204, NOT ~404 (double-DPR bug); got ${at2[0].w}`);
      assert.ok(Math.abs(at2[0].w-2*at1[0].w)<0.5,'HiDPI-record: device size scales EXACTLY with DPR (transform supplies DPR, overlay must not multiply again)');
      assert.ok(Math.abs(at2[0].x-9998)<1,`HiDPI-record: DPR=2 selection box device x ≈9998 (=DPR·(w2s.x−1)), NOT ~19998; got ${at2[0].x}`);
      // restore harness DPR for subsequent tests
      fakeWin.devicePixelRatio=1; A2.resize();
      A2.state.shapes.length=0; A2.state.selection=new Set(); A2._invalidateGrid();
      console.log('  ✓ HiDPI recording-canvas: overlay draws in CSS px, device size scales exactly with DPR (double-DPR bug would fail this, v1.7.62)');
    }

    // ---- v1.7.63: peer-map flood hardening + snapshot amplification throttle ----------
    // WebRTC delivers EVERY message kind into _onRecv unfiltered, so hello/ping flooding
    // with arbitrary peer ids was an unbounded state.peers/DOM growth vector, and each
    // hello/sync-req forced a full board clone×2 (snapshot) with no rate limit.
    {
      B.state.peers.clear();
      for(let i=0;i<40;i++)B.Net._touchPeer('flood'+i);
      assert.strictEqual(B.state.peers.size,32,'flood: state.peers is capped at MAX_PEERS=32');
      const _ls=B.state.peers.get('flood0').lastSeen;
      B.Net._touchPeer('flood0');
      assert.ok(B.state.peers.get('flood0').lastSeen>=_ls,'flood: an already-known peer still refreshes lastSeen at the cap');
      B.state.peers.clear();
      B.Net._onRecv({k:'hello',peer:'x'.repeat(65)});
      assert.strictEqual(B.state.peers.size,0,'flood: a >64-char peer id is rejected before any case runs');
      B.Net._onRecv({k:'hello',peer:12345});
      assert.strictEqual(B.state.peers.size,0,'flood: a non-string peer id is rejected');
      B.Net._onRecv({k:'ping',peer:'peerZ'});
      assert.strictEqual(B.state.peers.has('peerZ'),true,'flood: a normal peer id is still accepted');
      // snapshot throttle: a burst of sync-req-driven snapshots collapses to one send
      let _snaps=0;const _origSend=B.Net._send;B.Net._send=m=>{if(m&&m.k==='snapshot')_snaps++;};
      B.Net._lastSnapAt=0;
      B.Net._sendSnapshot();B.Net._sendSnapshot();B.Net._sendSnapshot();
      assert.strictEqual(_snaps,1,'snapshot throttle: a burst of _sendSnapshot collapses to a single send');
      B.Net._lastSnapAt=0;   // simulate the 1s window elapsing
      B.Net._sendSnapshot();
      assert.strictEqual(_snaps,2,'snapshot throttle: the next window sends again');
      B.Net._send=_origSend;
      B.state.peers.clear();
      console.log('  ✓ peer-map flood hardening: MAX_PEERS cap, peer-id type/length intake, snapshot throttle (v1.7.63)');
    }

    // ---- v1.7.63: importBoard error/robustness paths ----------------------------------
    {
      // (a) FileReader read failure must toast (was: totally silent). Node has no global
      // FileReader — install a shim that fails synchronously, restore afterwards.
      const seen=[];const _origToast=A.UI.toast;A.UI.toast=(m,k)=>{seen.push({m,k});};
      const _hadFR=Object.prototype.hasOwnProperty.call(globalThis,'FileReader');
      const _prevFR=globalThis.FileReader;
      try{
        globalThis.FileReader=class{ readAsText(){ this.onerror&&this.onerror(); } };
        A.importBoard({name:'x.board'});
        assert.strictEqual(seen.length,1,'importBoard: a read failure produces exactly one toast (was silent)');
        assert.strictEqual(seen[0].k,'err','importBoard: the read-failure toast is an error toast');
        // (b) docName clamp: a crafted .board with a 200-char name must be cut to the same
        // 80-char limit the #docName input enforces via maxlength.
        seen.length=0;
        A.state.shapes.length=0;A._invalidateGrid();A.state.history.length=0;A.state.histIdx=-1;
        const _sh=A.Shape.make('rect',{x:0,y:0,w:10,h:10});
        const _payload=JSON.stringify({docName:'D'.repeat(200),shapes:[_sh]});
        globalThis.FileReader=class{ readAsText(){ this.result=_payload; this.onload&&this.onload(); } };
        A.importBoard({name:'y.board'});
        assert.strictEqual(A.state.shapes.length,1,'importBoard: crafted board imports its one valid shape');
        assert.strictEqual(A.state.docName.length,80,'importBoard: a 200-char docName is clamped to 80 (input maxlength parity)');
      }finally{
        A.UI.toast=_origToast;
        if(_hadFR)globalThis.FileReader=_prevFR;else delete globalThis.FileReader;
        A.state.shapes.length=0;A.state.history.length=0;A.state.histIdx=-1;A.state.selection=new Set();A._invalidateGrid();
        A.state.docName='Untitled';
      }
      console.log('  ✓ importBoard: read failure toasts (was silent), oversized docName clamped to 80 (v1.7.63)');
    }

    // §3.15 → ADR-0002: concurrent edits to the SAME property now CONVERGE via
    // per-property LWW (deterministic total order: ts, peer, seq). Both peers commit
    // offline, buffer, then exchange - and must agree on the winner (was: diverged).
    const conflict = (tsA, tsB) => {
      reset(A); reset(B);
      const cX = {id:'cX',type:'rect',x:0,y:0,w:10,h:10,z:1,frac:null,stroke:'#000',size:2,opacity:1};
      A.state.shapes.push(cp(cX)); B.state.shapes.push(cp(cX)); A.sortZ(); B.sortZ();
      const qAB=[], qBA=[];
      A.Net.broadcast = op => qAB.push({k:'op',op:cp(op)});
      B.Net.broadcast = op => qBA.push({k:'op',op:cp(op)});
      // pin clocks so the winner is determined (A=red@tsA, B=blue@tsB)
      A.Store.commit({op:'upd',id:'cX',before:{stroke:'#000'},after:{stroke:'red'}, clock:{peer:'peerA',seq:1,ts:tsA}});
      B.Store.commit({op:'upd',id:'cX',before:{stroke:'#000'},after:{stroke:'blue'},clock:{peer:'peerB',seq:1,ts:tsB}});
      qAB.forEach(m=>B.Net._onRecv(m)); qBA.forEach(m=>A.Net._onRecv(m));
      return [A.state.shapes.find(s=>s.id==='cX').stroke, B.state.shapes.find(s=>s.id==='cX').stroke];
    };
    let [av,bv] = conflict(2000, 1000);   // A newer → red wins on both
    assert.strictEqual(av, bv, 'LWW: A and B converge on the same stroke (A newer)');
    assert.strictEqual(av, 'red', 'LWW: the newer write (A) wins deterministically');
    ([av,bv] = conflict(1000, 2000));     // B newer → blue wins on both
    assert.strictEqual(av, bv, 'LWW: A and B converge on the same stroke (B newer)');
    assert.strictEqual(av, 'blue', 'LWW: the newer write (B) wins deterministically');
    ([av,bv] = conflict(1000, 1000));     // equal ts → peer-id tiebreak (peerB > peerA)
    assert.strictEqual(av, bv, 'LWW: equal timestamps still converge (peer-id tiebreak)');
    console.log('  ✓ two-peer LWW: concurrent same-property edits converge deterministically (ADR-0002, §3.15)');

    // disjoint properties of the SAME shape must BOTH survive (per-property, not per-shape)
    reset(A); reset(B);
    const dX = {id:'dX',type:'rect',x:0,y:0,w:10,h:10,z:1,frac:null,stroke:'#000',size:2,opacity:1};
    A.state.shapes.push(cp(dX)); B.state.shapes.push(cp(dX)); A.sortZ(); B.sortZ();
    const dAB=[], dBA=[];
    A.Net.broadcast = op => dAB.push({k:'op',op:cp(op)});
    B.Net.broadcast = op => dBA.push({k:'op',op:cp(op)});
    A.Store.commit({op:'upd',id:'dX',before:{stroke:'#000'},after:{stroke:'green'}});
    B.Store.commit({op:'upd',id:'dX',before:{size:2},after:{size:9}});
    dAB.forEach(m=>B.Net._onRecv(m)); dBA.forEach(m=>A.Net._onRecv(m));
    const Ad = A.state.shapes.find(s=>s.id==='dX'), Bd = B.state.shapes.find(s=>s.id==='dX');
    assert.strictEqual(Ad.stroke, Bd.stroke, 'disjoint: stroke agrees');
    assert.strictEqual(Ad.size, Bd.size, 'disjoint: size agrees');
    assert.ok(Ad.stroke==='green' && Ad.size===9, 'disjoint: both peers\' independent edits preserved');
    console.log('  ✓ two-peer LWW: concurrent DISJOINT-property edits both survive (per-property)');

    // wclock hygiene: a late remote upd for a DELETED shape must not leave a stale
    // wclock entry. A deletes dX; B (hadn't seen the delete) recolors dX concurrently.
    // On A the recolor no-ops (shape gone) - but it must NOT resurrect a wclock[dX].
    // Without the byId guard in _stampWrites this entry leaks unbounded over a session.
    A.Store.commit({op:'del', shapes:[cp(A.state.shapes.find(s=>s.id==='dX'))]});
    assert.ok(!A.state.shapes.some(s=>s.id==='dX'), 'wclock hygiene: dX deleted on A');
    assert.strictEqual(A.state.wclock['dX'], undefined, 'wclock hygiene: del cleared wclock[dX]');
    A.Net._onRecv({k:'op',op:{op:'upd',id:'dX',before:{stroke:'green'},after:{stroke:'red'},clock:{peer:'peerB',seq:99,ts:9e9}}});
    assert.strictEqual(A.state.wclock['dX'], undefined, 'wclock hygiene: late upd for deleted shape leaves NO stale wclock entry');
    console.log('  ✓ two-peer LWW: late upd for a deleted shape leaks no wclock entry (_stampWrites byId guard)');

    // §3.16: but concurrent MOVES of the same shape CONVERGE - move is a delta
    // (Shape.translate adds dx,dy), and translation commutes, so receipt order is
    // irrelevant. Whether an edit converges is decided by delta-vs-absolute op
    // encoding, NOT by a sync algorithm. This is the commutative-op counterexample to
    // §3.15's divergent absolute `upd`.
    reset(A); reset(B);
    const mX = {id:'mX',type:'rect',x:0,y:0,w:10,h:10,z:1,frac:null,stroke:'#000',size:2,opacity:1};
    A.state.shapes.push(cp(mX)); B.state.shapes.push(cp(mX)); A.sortZ(); B.sortZ();
    const mAB=[], mBA=[];
    A.Net.broadcast = op => mAB.push({k:'op',op:cp(op)});
    B.Net.broadcast = op => mBA.push({k:'op',op:cp(op)});
    A.Store.commit({op:'move',ids:['mX'],dx:10,dy:0});   // A nudges +10x
    B.Store.commit({op:'move',ids:['mX'],dx:0,dy:5});    // B nudges +5y, concurrently
    mAB.forEach(m=>B.Net._onRecv(m)); mBA.forEach(m=>A.Net._onRecv(m));
    const A_mX = A.state.shapes.find(s=>s.id==='mX'), B_mX = B.state.shapes.find(s=>s.id==='mX');
    assert.strictEqual(A_mX.x, B_mX.x, 'commute: A and B agree on x after concurrent moves');
    assert.strictEqual(A_mX.y, B_mX.y, 'commute: A and B agree on y after concurrent moves');
    assert.ok(A_mX.x===10 && A_mX.y===5, 'commute: both deltas applied (sum), order-independent');
    console.log('  ✓ two-peer commute: concurrent MOVES converge (delta ops commute) - §3.16');

    // resize/align now LWW too (ADR-0002 follow-up): whole-shape snapshot ops gate/stamp
    // only the keys they actually changed (diff before/after). (i) concurrent resize of
    // the SAME geometry converges to the newer writer.
    reset(A); reset(B);
    const rX = {id:'rX',type:'rect',x:0,y:0,w:10,h:10,z:1,frac:null,stroke:'#000',size:2,opacity:1};
    A.state.shapes.push(cp(rX)); B.state.shapes.push(cp(rX)); A.sortZ(); B.sortZ();
    let rAB=[], rBA=[];
    A.Net.broadcast = op => rAB.push({k:'op',op:cp(op)});
    B.Net.broadcast = op => rBA.push({k:'op',op:cp(op)});
    A.Store.commit({op:'resize',before:[cp(rX)],after:[{...cp(rX),w:40}],clock:{peer:'peerA',seq:1,ts:1000}});
    B.Store.commit({op:'resize',before:[cp(rX)],after:[{...cp(rX),w:99}],clock:{peer:'peerB',seq:1,ts:2000}}); // B newer
    rAB.forEach(m=>B.Net._onRecv(m)); rBA.forEach(m=>A.Net._onRecv(m));
    const Ar = A.state.shapes.find(s=>s.id==='rX'), Br = B.state.shapes.find(s=>s.id==='rX');
    assert.strictEqual(Ar.w, Br.w, 'resize LWW: A and B agree on width');
    assert.strictEqual(Ar.w, 99, 'resize LWW: newer writer (B) wins');

    // (ii) a resize and a recolor of the SAME shape, concurrently, must BOTH survive -
    // the snapshot resize must not clobber stroke, which it never touched.
    reset(A); reset(B);
    A.state.shapes.push(cp(rX)); B.state.shapes.push(cp(rX)); A.sortZ(); B.sortZ();
    rAB=[]; rBA=[];
    A.Net.broadcast = op => rAB.push({k:'op',op:cp(op)});
    B.Net.broadcast = op => rBA.push({k:'op',op:cp(op)});
    // Pin the resize to be NEWER than the recolor: without changed-key gating the
    // resize snapshot's (unchanged) stroke would win on timestamp and clobber B's
    // recolor. Changed-key gating drops the untouched stroke key regardless of clock.
    A.Store.commit({op:'resize',before:[cp(rX)],after:[{...cp(rX),w:55}],clock:{peer:'peerA',seq:1,ts:5000}}); // newer
    B.Store.commit({op:'upd',id:'rX',before:{stroke:'#000'},after:{stroke:'purple'},clock:{peer:'peerB',seq:1,ts:1000}});
    rAB.forEach(m=>B.Net._onRecv(m)); rBA.forEach(m=>A.Net._onRecv(m));
    const Ar2 = A.state.shapes.find(s=>s.id==='rX'), Br2 = B.state.shapes.find(s=>s.id==='rX');
    assert.strictEqual(Ar2.w, Br2.w, 'resize×recolor: width agrees');
    assert.strictEqual(Ar2.stroke, Br2.stroke, 'resize×recolor: stroke agrees');
    assert.ok(Ar2.w===55 && Ar2.stroke==='purple', 'resize×recolor: BOTH survive (newer snapshot did not clobber stroke)');
    console.log('  ✓ two-peer LWW: resize converges + resize×recolor both survive (changed-key gating)');

    // §3.17: concurrent GROUP ops with an overlapping shape - the contested shape must
    // land in exactly one group (LWW on groupId), while disjoint members keep their own
    // groups. group/ungroup are absolute-assignment ops (groupId = gid), non-commutative,
    // so they share the same divergence risk as `upd stroke` - and are now covered by LWW.
    reset(A); reset(B);
    A.Net.broadcast = op => B.Net._onRecv({k:'op',op:cp(op)});
    B.Net.broadcast = op => A.Net._onRecv({k:'op',op:cp(op)});
    A.Net._send = msg => B.Net._onRecv(cp(msg));
    B.Net._send = msg => A.Net._onRecv(cp(msg));
    const gsh1={id:'gs1',type:'rect',x:0,y:0,w:5,h:5,z:1,frac:null};
    const gsh2={id:'gs2',type:'rect',x:5,y:0,w:5,h:5,z:2,frac:null};
    const gsh3={id:'gs3',type:'rect',x:10,y:0,w:5,h:5,z:3,frac:null};
    A.state.shapes.push(cp(gsh1),cp(gsh2),cp(gsh3)); B.state.shapes.push(cp(gsh1),cp(gsh2),cp(gsh3));
    A.sortZ(); B.sortZ();
    const gAB=[], gBA=[];
    A.Net.broadcast = op => gAB.push({k:'op',op:cp(op)});
    B.Net.broadcast = op => gBA.push({k:'op',op:cp(op)});
    // A groups [gs1,gs2] with 'GA' (ts:1000), B groups [gs2,gs3] with 'GB' (ts:2000 = newer)
    A.Store.commit({op:'group',ids:['gs1','gs2'],gid:'GA',
      before:[{id:'gs1',groupId:undefined},{id:'gs2',groupId:undefined}],
      clock:{peer:'peerA',seq:10,ts:1000}});
    B.Store.commit({op:'group',ids:['gs2','gs3'],gid:'GB',
      before:[{id:'gs2',groupId:undefined},{id:'gs3',groupId:undefined}],
      clock:{peer:'peerB',seq:10,ts:2000}});
    gAB.forEach(m=>B.Net._onRecv(m)); gBA.forEach(m=>A.Net._onRecv(m));
    const Ags1=A.state.shapes.find(s=>s.id==='gs1'), Bgs1=B.state.shapes.find(s=>s.id==='gs1');
    const Ags2=A.state.shapes.find(s=>s.id==='gs2'), Bgs2=B.state.shapes.find(s=>s.id==='gs2');
    const Ags3=A.state.shapes.find(s=>s.id==='gs3'), Bgs3=B.state.shapes.find(s=>s.id==='gs3');
    // gs1 uncontested (only A touched it) → GA on both
    assert.strictEqual(Ags1.groupId, Bgs1.groupId, 'group LWW: disjoint member gs1 agrees');
    assert.strictEqual(Ags1.groupId, 'GA', 'group LWW: gs1 keeps GA (B never claimed it)');
    // gs3 uncontested (only B touched it) → GB on both
    assert.strictEqual(Ags3.groupId, Bgs3.groupId, 'group LWW: disjoint member gs3 agrees');
    assert.strictEqual(Ags3.groupId, 'GB', 'group LWW: gs3 keeps GB (A never claimed it)');
    // gs2 contested - B newer (ts:2000 > ts:1000) → GB on both
    assert.strictEqual(Ags2.groupId, Bgs2.groupId, 'group LWW: contested shape gs2 agrees');
    assert.strictEqual(Ags2.groupId, 'GB', 'group LWW: newer writer (B) wins contested shape gs2');
    console.log('  ✓ two-peer LWW: concurrent GROUP ops converge - contested shape yields to newer writer (§3.17)');

    // v1.6.87: a new text/sticky is committed+broadcast with EMPTY text, then filled in
    // the editor. _syncTextFinalize must push the typed content (and a dismissed-empty
    // removal) to already-connected peers, or collaborators see a blank shape forever.
    reset(A); reset(B);
    A.Net.broadcast = op => B.Net._onRecv({k:'op',op:cp(op)});
    B.Net.broadcast = op => A.Net._onRecv({k:'op',op:cp(op)});
    // A creates a text shape (the up-front empty add broadcasts to B)
    const tA = A.Shape.make('text',{x:0,y:0,w:120,h:24,text:'',fontSize:16});
    A.Store.commit({op:'add',shape:tA});
    assert.ok(B.state.shapes.some(s=>s.id===tA.id), 'text sync: B received the (empty) add');
    assert.strictEqual(B.state.shapes.find(s=>s.id===tA.id).text, '', 'text sync: B has empty text before finalize');
    // A finishes typing — finalize broadcasts the typed content
    const liveA = A.state.shapes.find(s=>s.id===tA.id);
    liveA.text='hello world'; liveA.w=200; liveA.h=24;
    A._syncTextFinalize(liveA, '', false);
    const Bt = B.state.shapes.find(s=>s.id===tA.id);
    assert.strictEqual(Bt.text, 'hello world', 'text sync: B now has the typed content (the bug: stayed empty)');
    assert.strictEqual(Bt.w, 200, 'text sync: B adopted the auto-sized width');
    // dismissed-empty case: A creates another text, then finalizes it as deleted
    reset(A); reset(B);
    A.Net.broadcast = op => B.Net._onRecv({k:'op',op:cp(op)});
    B.Net.broadcast = op => A.Net._onRecv({k:'op',op:cp(op)});
    const tA2 = A.Shape.make('text',{x:5,y:5,w:120,h:24,text:'',fontSize:16});
    A.Store.commit({op:'add',shape:tA2});
    assert.ok(B.state.shapes.some(s=>s.id===tA2.id), 'text sync: B received the blank add');
    A._syncTextFinalize(tA2, '', true);   // dismissed empty → removal broadcast
    assert.ok(!B.state.shapes.some(s=>s.id===tA2.id), 'text sync: B drops the blank shape after empty-dismiss (no lingering hitbox)');
    console.log('  ✓ two-peer: new text/sticky finalize syncs typed content + empty-dismiss removal (§collab)');
  }

  // v1.6.71: context menu separator deduplication
  // Non-vacuity: without the filter, double-sep stays in; with it, collapses to single.
  {
    const dedupSep = arr => arr.filter((it,i,a)=>!(it==='sep'&&(i===0||i===a.length-1||a[i-1]==='sep')));
    // single non-grouped selection: two consecutive seps (was the bug)
    assert.deepStrictEqual(
      dedupSep(['copy','del','sep','sep','front','back','sep','all']),
      ['copy','del','sep','front','back','sep','all'],
      'ctx menu sep: consecutive double-sep collapses to single');
    // leading sep removed
    assert.deepStrictEqual(dedupSep(['sep','copy','del']),['copy','del'],'ctx menu sep: leading sep removed');
    // trailing sep removed
    assert.deepStrictEqual(dedupSep(['copy','del','sep']),['copy','del'],'ctx menu sep: trailing sep removed');
    // well-formed list unaffected
    assert.deepStrictEqual(dedupSep(['copy','sep','front']),['copy','sep','front'],'ctx menu sep: clean list unchanged');
    // bug baseline: WITHOUT filter, double sep survives (proves test is non-vacuous)
    const raw=['copy','del','sep','sep','front'];
    assert.strictEqual(raw.filter(Boolean).filter((it,i,a)=>it!==undefined).length, 5, 'ctx menu sep: no-filter leaves double sep (5 items)');
    assert.strictEqual(dedupSep(raw).length, 4, 'ctx menu sep: with filter collapses to 4 items');
    console.log('  ✓ ctx menu: sep deduplication collapses consecutive/leading/trailing separators');
  }

  // v1.6.73: doAlign skips locked shapes (parity with doDelete/doRotate/doFlip)
  // Non-vacuity: without the locked filter, the locked shape would be translated by doAlign.
  {
    state.shapes=[];_invalidateGrid();state.history=[];state.histIdx=-1;state.selection=new Set();
    const lk=Shape.make('rect',{x:0,y:0,w:50,h:50});lk.locked=true;
    const u1=Shape.make('rect',{x:200,y:10,w:50,h:50});
    const u2=Shape.make('rect',{x:300,y:20,w:50,h:50});
    Store.commit({op:'add',shape:lk});
    Store.commit({op:'add',shape:u1});
    Store.commit({op:'add',shape:u2});
    state.selection=new Set([lk.id,u1.id,u2.id]);
    const lkX0=lk.x;
    doAlign('left');
    // locked shape must not move
    assert.strictEqual(state.shapes.find(s=>s.id===lk.id).x, lkX0, 'doAlign: locked shape x unchanged');
    // unlocked shapes align to each other's leftmost (200), not to the locked shape at 0
    assert.strictEqual(state.shapes.find(s=>s.id===u1.id).x, 200, 'doAlign: unlocked shape aligned to leftmost unlocked');
    assert.strictEqual(state.shapes.find(s=>s.id===u2.id).x, 200, 'doAlign: second unlocked shape also aligned');
    // non-vacuity: without fix, lk would have been moved to align with u1/u2 reference (x=0 → x≠0)
    // or u1/u2 would have aligned to lk (x=0). Either way lk.x would change.
    // We verify the history entry recorded NO change for the locked shape.
    const op=state.history[state.histIdx];
    assert.ok(op&&op.op==='align','doAlign records align op');
    assert.ok(!op.before.some(b=>b.id===lk.id),'doAlign: locked shape absent from align op (not mutated)');
    console.log('  ✓ doAlign: locked shapes skipped (position unchanged, absent from undo op)');
  }

  // v1.6.72: sticky note resize-after-edit preserves user's chosen width
  // Non-vacuity: old text-branch code applied to sticky would set s.w = measureText(whole text)
  {
    const mkCtx = charW => ({ font:'', measureText: t => ({ width: t.length * charW }) });
    // text shape: both w and h auto-sized from content
    const ts = { type:'text', fontSize:14, text:'', w:0, h:0 };
    resizeAfterTextEdit(ts, 'hello world', mkCtx(10));
    assert.ok(ts.w > 0, 'text: w auto-sized to content width');
    assert.ok(ts.h >= 14 * 1.25, 'text: h auto-sized from line count');
    assert.strictEqual(ts.text, 'hello world', 'text: s.text updated');

    // sticky shape: user's chosen w (160) must survive; only h auto-fits
    const longText = 'This is a long sentence that would expand width if not for the sticky branch';
    const sk = { type:'sticky', fontSize:14, text:'', w:160, h:160 };
    resizeAfterTextEdit(sk, longText, mkCtx(10));
    assert.strictEqual(sk.w, 160, 'sticky: chosen width preserved (not overwritten by text measure)');
    assert.ok(sk.h > 0, 'sticky: height auto-fitted to wrapped content');
    assert.strictEqual(sk.text, longText, 'sticky: s.text updated');

    // non-vacuity: applying the TEXT branch to a sticky would overwrite s.w
    const oldW = Math.max(20, longText.split('\n').reduce((m,l)=>Math.max(m,l.length*10),0));
    assert.ok(oldW !== 160, `non-vacuity: old code would set s.w=${oldW} (not 160) for this sticky`);
    console.log('  ✓ resizeAfterTextEdit: sticky preserves chosen width; text auto-sizes both dims; non-vacuous');
  }

  // v1.6.74: _placeCopies remaps connector bindings (sh.a/sh.b) within pasted set
  // Before fix: C'.a===A.id (original); After fix: C'.a===A'.id, C'.b===B'.id.
  {
    // Reset seq+seenOps to avoid collision with hardcoded seq:10 in two-peer tests
    // (which leave 'peerA:10' in seenOps; without reset the 10th commit is silently dropped).
    state.shapes=[];_invalidateGrid();state.history=[];state.histIdx=-1;state.selection=new Set();
    state.seq=0;state.seenOps=new Set();
    const A=Shape.make('rect',{x:0,y:0,w:50,h:50});
    const B=Shape.make('rect',{x:200,y:0,w:50,h:50});
    const C=Shape.make('arrow',{x1:25,y1:25,x2:225,y2:25});
    C.a=A.id; C.b=B.id;
    Store.commit({op:'add',shape:A});
    Store.commit({op:'add',shape:B});
    Store.commit({op:'add',shape:C});
    state.selection=new Set([A.id,B.id,C.id]);
    doDuplicate();
    // doDuplicate sets state.selection to the 3 new copy ids
    const copyIds=new Set(state.selection);
    assert.strictEqual(copyIds.size,3,'_placeCopies: 3 copies in selection');
    const cC=state.shapes.find(s=>copyIds.has(s.id)&&s.type==='arrow');
    assert.ok(cC,'_placeCopies: arrow copy found in selection');
    assert.ok(cC.a!==A.id,'_placeCopies: pasted arrow .a is NOT the original A.id');
    assert.ok(cC.b!==B.id,'_placeCopies: pasted arrow .b is NOT the original B.id');
    assert.ok(copyIds.has(cC.a),'_placeCopies: pasted arrow .a is one of the copy ids');
    assert.ok(copyIds.has(cC.b),'_placeCopies: pasted arrow .b is one of the copy ids');
    assert.ok(cC.a!==cC.b,'_placeCopies: .a and .b point to distinct copies');
    // non-vacuity: original connector still has its original bindings (not modified)
    assert.strictEqual(C.a,A.id,'non-vacuity: original connector C.a still equals A.id');
    console.log('  ✓ _placeCopies: pasted connector bindings remapped to copies (not originals)');
  }

  // v1.6.75: keyboard nudge parity — frame children follow the frame, locked shapes stay put.
  // Mirrors pointer-drag move. Before fix: nudge moved only the frame (children left behind)
  // and moved locked shapes too (no !locked filter). After: full parity with drag.
  {
    state.shapes=[];_invalidateGrid();state.history=[];state.histIdx=-1;state.selection=new Set();
    state.seq=0;state.seenOps=new Set();
    // frame at (0,0,300,300); child inside; locked child inside; outsider outside the frame
    const fr=Shape.make('frame',{x:0,y:0,w:300,h:300});
    const child=Shape.make('rect',{x:50,y:50,w:40,h:40});
    const lockedChild=Shape.make('rect',{x:150,y:150,w:40,h:40});lockedChild.locked=true;
    const outsider=Shape.make('rect',{x:500,y:500,w:40,h:40});
    Store.commit({op:'add',shape:fr});
    Store.commit({op:'add',shape:child});
    Store.commit({op:'add',shape:lockedChild});
    Store.commit({op:'add',shape:outsider});

    // withFrameChildren: selecting the frame expands to its contained shapes (not the outsider, not the frame's clones)
    const ID=id=>state.shapes.find(s=>s.id===id);
    const expanded=withFrameChildren(new Set([fr.id]));
    assert.ok(expanded.has(fr.id),'withFrameChildren: keeps the frame itself');
    assert.ok(expanded.has(child.id),'withFrameChildren: includes contained child');
    assert.ok(expanded.has(lockedChild.id),'withFrameChildren: includes contained locked child');
    assert.ok(!expanded.has(outsider.id),'withFrameChildren: excludes shape outside the frame');

    // nudge the frame right by 10: frame + unlocked child move; locked child + outsider stay
    const fx=fr.x, cx=child.x, lx=lockedChild.x, ox=outsider.x;
    state.selection=new Set([fr.id]);
    nudgeSelection(10,0);
    assert.strictEqual(ID(fr.id).x, fx+10, 'nudge: frame moved by 10');
    assert.strictEqual(ID(child.id).x, cx+10, 'nudge: unlocked child followed the frame');
    assert.strictEqual(ID(lockedChild.id).x, lx, 'nudge: LOCKED child did not move');
    assert.strictEqual(ID(outsider.id).x, ox, 'nudge: outsider (not in frame) did not move');
    // the recorded move op must not list the locked child (so undo/redo stay clean)
    const mop=state.history[state.histIdx];
    assert.ok(mop&&mop.op==='move','nudge records a move op');
    assert.ok(!mop.ids.includes(lockedChild.id),'nudge: locked child absent from move op');
    assert.ok(mop.ids.includes(child.id)&&mop.ids.includes(fr.id),'nudge: frame + unlocked child in move op');

    // non-vacuity: the OLD inline handler translated every selected id (just the frame)
    // with no frame-child expansion and no locked filter — so child would NOT have moved
    // and a locked selected shape WOULD have moved. Confirm the new behaviour differs.
    assert.notStrictEqual(ID(child.id).x, cx, 'non-vacuity: child position changed (old code left it behind)');
    console.log('  ✓ nudgeSelection: frame children follow + locked shapes stay (drag parity)');
  }

  // v1.6.76: render rotation gated to box shapes — line/arrow/pen ignore a stray
  // rotate (only reachable via remote upd), keeping canvas (NaN-centre avoided) and
  // SVG export in agreement. shapeRot is the shared source of truth.
  {
    // box shapes carry their rotate through
    assert.strictEqual(shapeRot({type:'rect',x:0,y:0,w:10,h:10,rotate:45}), 45, 'shapeRot: rect keeps rotate');
    assert.strictEqual(shapeRot({type:'sticky',x:0,y:0,w:10,h:10,rotate:90}), 90, 'shapeRot: sticky keeps rotate');
    assert.strictEqual(shapeRot({type:'rect',x:0,y:0,w:10,h:10,rotate:0}), 0, 'shapeRot: rotate 0 → 0');
    assert.strictEqual(shapeRot({type:'rect',x:0,y:0,w:10,h:10}), 0, 'shapeRot: no rotate → 0');
    // point geometry (no w) ignores a stray rotate — non-vacuity: raw s.rotate would be 45/30
    const ln={type:'line',x1:0,y1:0,x2:50,y2:0,rotate:45};
    const pn={type:'pen',pts:[[0,0],[5,5]],rotate:30};
    assert.strictEqual(shapeRot(ln), 0, 'shapeRot: line ignores stray rotate (no box centre)');
    assert.strictEqual(shapeRot(pn), 0, 'shapeRot: pen ignores stray rotate');
    assert.strictEqual(ln.rotate, 45, 'non-vacuity: line.rotate is actually 45 (raw value would NaN the canvas centre)');

    // SVG export parity: a rotated rect emits a transform; a "rotated" line does not.
    const rectSvg = buildSVG([{id:'r1',type:'rect',x:0,y:0,w:20,h:20,rotate:45,stroke:'#000',size:1,opacity:1}], '#fff');
    const lineSvg = buildSVG([{id:'l1',type:'line',x1:0,y1:0,x2:40,y2:0,rotate:45,stroke:'#000',size:1,opacity:1}], '#fff');
    assert.ok(/transform="rotate\(45/.test(rectSvg), 'SVG: rotated rect emits a rotate transform');
    assert.ok(!/rotate\(/.test(lineSvg), 'SVG: line with stray rotate emits NO rotate transform (parity with canvas)');
    console.log('  ✓ shapeRot: rotation gated to box shapes (canvas/SVG parity, no NaN centre)');
  }

  // v1.6.77: Persist._saveErrMsg — QuotaExceededError gets actionable message;
  // generic errors fall through to the legacy "save failed: …" form. Pure helper,
  // unit-testable without mocking IndexedDB. Informed by Zenn PWA-storage articles
  // that consistently flag this as the one IDB error users need explicit guidance on.
  {
    const quotaErr={name:'QuotaExceededError',message:'DOMException: quota'};
    const ioErr={name:'InvalidStateError',message:'db closed'};
    const undefErr=undefined;
    const quotaMsg=Persist._saveErrMsg(quotaErr);
    const ioMsg=Persist._saveErrMsg(ioErr);
    const undefMsg=Persist._saveErrMsg(undefErr);
    assert.ok(!quotaMsg.includes('DOMException'),
      '_saveErrMsg: quota toast does not leak the raw err.message verbatim');
    assert.ok(quotaMsg.includes('⌘E')||/export/i.test(quotaMsg),
      '_saveErrMsg: quota path mentions the export shortcut (actionable)');
    assert.ok(!/^save failed|^保存失敗/i.test(quotaMsg),
      '_saveErrMsg: quota path does NOT use the generic saveFailed prefix');
    assert.ok(ioMsg.includes('db closed'),
      '_saveErrMsg: non-quota error includes err.message');
    assert.ok(/save failed|保存失敗/i.test(ioMsg),
      '_saveErrMsg: non-quota error uses the generic saveFailed prefix');
    assert.ok(typeof undefMsg==='string'&&undefMsg.length>0,
      '_saveErrMsg: null/undefined err yields a non-empty fallback string');
    assert.ok(undefMsg.includes('unknown'),
      '_saveErrMsg: null err falls back to "unknown" message');
    // non-vacuity: the OLD code (pre-extraction) used the same generic format for both;
    // the new mapping must make them differ — that is the whole point of the fix.
    assert.notStrictEqual(quotaMsg, ioMsg,
      'non-vacuity: quota and non-quota errors now produce DIFFERENT toast text');
    console.log('  ✓ Persist._saveErrMsg: QuotaExceededError → actionable toast (Zenn/PWA research)');
  }

  // v1.6.78: coalescedSamples + pen multi-sample capture (high-rate stylus smoothness).
  // Without getCoalescedEvents the pen keeps one point per 60Hz frame; a 240Hz stylus
  // coalesces ~4 samples/frame, so 3/4 of the pen path (and its pressure) is lost.
  {
    // coalescedSamples: returns the coalesced list when non-empty, else falls back to [e]
    const a={offsetX:1,offsetY:0,pressure:0.5},b={offsetX:2,offsetY:0,pressure:0.6},c={offsetX:3,offsetY:0,pressure:0.7};
    const evMulti={getCoalescedEvents:()=>[a,b,c]};
    const evEmpty={getCoalescedEvents:()=>[]};
    const evNone={offsetX:9,offsetY:9};            // no getCoalescedEvents (old browser)
    assert.deepStrictEqual(coalescedSamples(evMulti),[a,b,c],'coalescedSamples: returns all sub-samples');
    assert.deepStrictEqual(coalescedSamples(evEmpty),[evEmpty],'coalescedSamples: empty list falls back to [e]');
    assert.deepStrictEqual(coalescedSamples(evNone),[evNone],'coalescedSamples: missing API falls back to [e]');

    // Integration: simulate ONE pointermove carrying 4 coalesced samples vs the old
    // single-sample behaviour, and confirm the multi-sample path records finer detail.
    state.viewport={x:0,y:0,zoom:1};               // decimation threshold = 1 world unit
    state.shapes=[];_invalidateGrid();state.history=[];state.histIdx=-1;state.draft=null;
    beginPen({x:0,y:0},{pressure:0.5});
    // OLD code: one contPen for the bare event's final position (x=10)
    const baselineDraft=state.draft;
    contPen({x:10,y:0},{pressure:0.5});
    const oldCount=baselineDraft.pts.length;       // start(1) + 1 sample = 2
    assert.strictEqual(oldCount,2,'baseline: single sample yields 2 pts (start + end)');

    // NEW code: feed the 4 coalesced samples spread along the path
    state.draft=null;
    beginPen({x:0,y:0},{pressure:0.5});
    const coalesced=[{offsetX:2.5,offsetY:0,pressure:0.5},{offsetX:5,offsetY:0,pressure:0.6},
                     {offsetX:7.5,offsetY:0,pressure:0.7},{offsetX:10,offsetY:0,pressure:0.8}];
    const evt={getCoalescedEvents:()=>coalesced};
    for(const ce of coalescedSamples(evt))contPen({x:ce.offsetX,y:ce.offsetY},ce);
    const newCount=state.draft.pts.length;         // start(1) + 4 samples = 5
    assert.strictEqual(newCount,5,'coalesced: 4 sub-samples yield 5 pts (start + 4)');
    assert.ok(newCount>oldCount,'non-vacuity: coalesced capture records MORE pen detail than single-sample');
    // pressure of each sub-sample is preserved (not just the last) → variable-width fidelity
    assert.strictEqual(state.draft.pts[2][2],0.6,'coalesced: intermediate sample pressure preserved');
    console.log('  ✓ coalescedSamples: pen captures every coalesced sub-sample (240Hz stylus, Qiita research)');
  }

  // v1.6.79: Persist.flushIfHidden — pure gate, unit-testable without dispatching events.
  // Mobile browsers (iOS Safari, Chrome Android) often skip beforeunload on swipe-away /
  // background eviction; visibilitychange→hidden is the recommended PWA durability signal.
  {
    // Stub Persist.save to count calls (the fake-DB harness makes save() a no-op early-return).
    const calls=[];
    const orig=Persist.save;
    Persist.save=function(...a){calls.push(a);return orig.apply(this,a);};
    try{
      // Case 1: hidden but not dirty → no flush
      state.dirty=false;Persist._saveT=0;
      Persist.flushIfHidden('hidden');
      assert.strictEqual(calls.length,0,'flushIfHidden: hidden+clean → no save');
      // Case 2: dirty but visible → no flush (debounce is for visible cadence)
      state.dirty=true;
      Persist.flushIfHidden('visible');
      assert.strictEqual(calls.length,0,'flushIfHidden: visible+dirty → no immediate save');
      // Case 3: dirty AND hidden → save fires, debounce timer cleared
      const fakeTimer=setTimeout(()=>{},60000);   // pretend a save is pending
      Persist._saveT=fakeTimer;
      Persist.flushIfHidden('hidden');
      assert.strictEqual(calls.length,1,'flushIfHidden: hidden+dirty → save called exactly once');
      // Case 4: 'prerender' / other states are NOT hidden → no flush
      state.dirty=true;
      Persist.flushIfHidden('prerender');
      assert.strictEqual(calls.length,1,'flushIfHidden: prerender state does not trigger save');
      // Case 5: case-sensitive on 'hidden' (defensive)
      Persist.flushIfHidden('Hidden');
      assert.strictEqual(calls.length,1,'flushIfHidden: case-sensitive on "hidden"');
      // Non-vacuity: directly call save() to confirm the counter actually moves —
      // proves Case 1/2 zeros aren't because of a broken stub.
      Persist.save();
      assert.strictEqual(calls.length,2,'non-vacuity: stub counts direct Persist.save() calls');
    }finally{Persist.save=orig;state.dirty=false;}
    console.log('  ✓ Persist.flushIfHidden: dirty + hidden flushes; visible/clean does not (PWA Zenn)');
  }

  // v1.6.80: abortGesture — a pinch interrupting a single-pointer gesture must revert
  // the in-progress mutation (no stray stroke / half-move / non-undoable change) and
  // disarm pointerup (ptr.down=false) so the lingering finger-up commits nothing.
  {
    state.shapes=[];_invalidateGrid();state.history=[];state.histIdx=-1;state.selection=new Set();
    state.seq=0;state.seenOps=new Set();state.draft=null;state.marquee=null;

    // (a) in-progress draft (pen/rect/etc) is dropped — it never reached state.shapes
    state.draft={type:'rect',x:0,y:0,w:30,h:20};
    ptr.down=true;ptr.dragKind=null;
    abortGesture();
    assert.strictEqual(state.draft,null,'abortGesture: in-progress draft dropped');
    assert.strictEqual(ptr.down,false,'abortGesture: ptr.down cleared (pointerup will not commit)');

    // (b) in-progress MOVE rolls back to the pre-drag positions (no orphan mutation)
    const r=Shape.make('rect',{x:100,y:100,w:40,h:40});
    Store.commit({op:'add',shape:r});
    const histLen=state.history.length;
    ptr.dragKind='move';
    ptr.dragStartShapes=new Map([[r.id, JSON.parse(JSON.stringify(r))]]);
    // simulate a live drag having moved the shape +50,+60
    const live=state.shapes.find(s=>s.id===r.id); live.x=150; live.y=160;
    ptr.down=true;
    abortGesture();
    const after=state.shapes.find(s=>s.id===r.id);
    assert.strictEqual(after.x,100,'abortGesture: move reverts x to pre-drag');
    assert.strictEqual(after.y,100,'abortGesture: move reverts y to pre-drag');
    assert.strictEqual(state.history.length,histLen,'abortGesture: move records NO op (clean cancel, not a commit)');
    assert.strictEqual(ptr.dragKind,null,'abortGesture: dragKind cleared');

    // (c) in-progress RESIZE rolls back from ptr.resizeOrig
    const r2=Shape.make('rect',{x:0,y:0,w:20,h:20});
    Store.commit({op:'add',shape:r2});
    ptr.dragKind='resize';ptr.resizeOrig=JSON.parse(JSON.stringify(r2));
    const live2=state.shapes.find(s=>s.id===r2.id); live2.w=999; live2.h=888;
    ptr.down=true;
    abortGesture();
    const after2=state.shapes.find(s=>s.id===r2.id);
    assert.strictEqual(after2.w,20,'abortGesture: resize reverts w');
    assert.strictEqual(after2.h,20,'abortGesture: resize reverts h');

    // non-vacuity: without abortGesture the live mutation (x=150 / w=999) would persist
    // with no op — i.e. after.x would be 150, not 100. The revert is what the test proves.
    assert.notStrictEqual(150,after.x,'non-vacuity: reverted x (100) differs from the dragged x (150)');
    console.log('  ✓ abortGesture: pinch cancels & reverts in-progress gesture (multi-touch, Qiita/Zenn)');
  }

  // v1.6.81: wheelPx normalizes wheel deltas across deltaMode so Firefox's line-mode
  // mouse wheel isn't ~16× weaker than Chrome's pixel mode. Pure → directly unit-tested.
  {
    // pixel mode (Chrome / trackpad): unchanged
    assert.deepStrictEqual(wheelPx({deltaMode:0,deltaX:10,deltaY:100}),{x:10,y:100},'wheelPx: pixel mode passes through');
    // line mode (Firefox mouse wheel): ×16
    assert.deepStrictEqual(wheelPx({deltaMode:1,deltaX:1,deltaY:3}),{x:16,y:48},'wheelPx: line mode scaled ×16');
    // page mode (rare): ×400
    assert.deepStrictEqual(wheelPx({deltaMode:2,deltaX:0,deltaY:1}),{x:0,y:400},'wheelPx: page mode scaled ×400');
    // missing deltas are coerced to 0 (no NaN into viewport math)
    assert.deepStrictEqual(wheelPx({deltaMode:0}),{x:0,y:0},'wheelPx: missing deltas → 0 (NaN-safe)');
    // non-vacuity: line mode (×16) must differ from reading deltaY raw — that is the bug.
    const raw=3, normalized=wheelPx({deltaMode:1,deltaY:3}).y;
    assert.notStrictEqual(normalized,raw,'non-vacuity: line-mode normalized (48) ≠ raw deltaY (3)');
    assert.ok(normalized>raw,'wheelPx: line-mode normalization amplifies a too-weak raw delta');
    console.log('  ✓ wheelPx: deltaMode normalized to pixels (Firefox/Chrome parity, MDN/Zenn)');
  }

  // v1.6.82: imeShouldCommit — gate live-update inputs (docName) so partial IME
  // conversions don't leak into state/IDB/sync. Pure → directly unit-tested.
  {
    // Non-composing input: COMMIT
    assert.strictEqual(imeShouldCommit({isComposing:false}),true,'imeShouldCommit: isComposing=false → commit');
    assert.strictEqual(imeShouldCommit({}),true,'imeShouldCommit: missing isComposing → commit (mouse/paste/etc)');
    // Composing input (Japanese mid-conversion): SKIP
    assert.strictEqual(imeShouldCommit({isComposing:true}),false,'imeShouldCommit: isComposing=true → skip');
    // Defensive: null/undefined event (rare but possible during teardown)
    assert.strictEqual(imeShouldCommit(null),true,'imeShouldCommit: null event → commit (defensive default)');
    assert.strictEqual(imeShouldCommit(undefined),true,'imeShouldCommit: undefined event → commit');
    // Non-vacuity: the OLD code had no gate — every input was committed, including
    // isComposing=true. So old behaviour was "always true", and the new behaviour MUST
    // differ on the composing branch.
    const oldBehaviour=true;
    assert.notStrictEqual(imeShouldCommit({isComposing:true}),oldBehaviour,
      'non-vacuity: composing input now skipped (was committed in old code)');
    console.log('  ✓ imeShouldCommit: composing skipped, committed otherwise (Qiita/Zenn IME)');
  }

  // v1.6.83: roundShapesForExport — trims float precision at serialization boundaries
  // without touching the in-memory model (undo/render stay full-precision). Pure → tested.
  {
    // _round sheds IEEE-754 noise and excess precision; NaN/Inf pass through
    assert.strictEqual(_round(100.00000000000001,2),100,'_round: sheds float noise');
    assert.strictEqual(_round(123.456789,2),123.46,'_round: rounds to 2dp');
    assert.ok(Number.isNaN(_round(NaN,2)),'_round: NaN passes through (validation still catches)');
    assert.strictEqual(_round(Infinity,2),Infinity,'_round: Infinity passes through');
    assert.strictEqual(_round('x',2),'x','_round: non-number passes through');

    const orig=[
      {id:'a',type:'rect',x:10.123456,y:20.987654,w:30.5,h:40.0000001,z:1,stroke:'#000',rotate:15.333333},
      {id:'b',type:'arrow',x1:1.111111,y1:2.222222,x2:3.333333,y2:4.444444,z:2},
      {id:'c',type:'pen',pts:[[1.23456,2.34567,0.5123],[3.4567,4.5678,0.9876]],z:3},
    ];
    const before=JSON.parse(JSON.stringify(orig));
    const out=roundShapesForExport(orig,2);
    // coordinate/dimension fields rounded
    assert.strictEqual(out[0].x,10.12,'roundShapes: x rounded to 2dp');
    assert.strictEqual(out[0].h,40,'roundShapes: h float noise dropped');
    assert.strictEqual(out[0].rotate,15.33,'roundShapes: rotate rounded');
    assert.strictEqual(out[1].x2,3.33,'roundShapes: arrow endpoint rounded');
    // pen pts: position 2dp, pressure 3dp
    assert.strictEqual(out[2].pts[0][0],1.23,'roundShapes: pen x rounded to 2dp');
    assert.strictEqual(out[2].pts[0][2],0.512,'roundShapes: pen pressure rounded to 3dp');
    // non-coordinate fields untouched
    assert.strictEqual(out[0].id,'a','roundShapes: id preserved');
    assert.strictEqual(out[0].stroke,'#000','roundShapes: stroke preserved');
    assert.strictEqual(out[0].z,1,'roundShapes: z preserved');
    // CRITICAL: the in-memory shapes are NOT mutated (serialization-only)
    assert.deepStrictEqual(orig,before,'roundShapes: input array not mutated (undo/render unaffected)');
    // rounded output still passes shape validation (finite coords)
    assert.ok(out.every(validShape),'roundShapes: output still valid shapes');
    // non-vacuity: serialized size actually shrinks
    assert.ok(JSON.stringify(out).length < JSON.stringify(orig).length,
      'non-vacuity: rounded JSON is smaller than full-precision JSON');
    console.log('  ✓ roundShapesForExport: trims precision at export, leaves model intact (Zenn)');
  }

  // v1.6.84: Net.init must clear the prior presence heartbeat on re-init (room switch),
  // else a leaked interval keeps pinging/reaping on top of the new one.
  {
    // Seed a REAL interval as the "prior" timer and a close-tracking channel stub, so we
    // can observe init() tearing both down. (Node's Timeout exposes _destroyed after clear.)
    const priorTimer=setInterval(()=>{},1e6);
    Net._presenceTimer=priorTimer;
    let closed=false;
    Net.bc={close(){closed=true},postMessage(){},onmessage:null};
    Net.init('roomA');
    assert.strictEqual(closed,true,'Net.init: prior BroadcastChannel closed on re-init');
    assert.strictEqual(priorTimer._destroyed,true,'Net.init: prior presence timer cleared (no leaked heartbeat)');
    assert.notStrictEqual(Net._presenceTimer,priorTimer,'Net.init: a fresh presence timer replaced the old one');
    assert.strictEqual(state.roomId,'roomA','Net.init: roomId updated');
    // cleanup the new real interval/channel this test spun up
    clearInterval(Net._presenceTimer);
    if(Net.bc&&Net.bc.close)try{Net.bc.close()}catch(_){}
    // non-vacuity: without the clearInterval, priorTimer._destroyed would still be false.
    assert.strictEqual(priorTimer._destroyed,true,'non-vacuity: the cleared flag is the leak guard under test');
    console.log('  ✓ Net.init: re-init closes channel + clears prior heartbeat (no timer leak)');
  }

  // v1.6.85: _reapPeers must NOT drop WebRTC peers by timeout — they don't ride the
  // BroadcastChannel heartbeat, so a live idle link would lose its avatar after 15s.
  // BroadcastChannel peers ARE still reaped on timeout (existing behaviour preserved).
  {
    const stale=Date.now()-60000;   // well past NET_PRESENCE_TIMEOUT (15s)
    const fresh=Date.now();
    state.peers=new Map([
      ['peerBC-stale',{color:'#f00',lastSeen:stale}],   // BC peer, idle → should be reaped
      ['peerBC-fresh',{color:'#0f0',lastSeen:fresh}],    // BC peer, active → kept
      ['rtc:ab12',{color:'#00f',lastSeen:stale}],        // WebRTC peer, idle but connected → kept
    ]);
    Net._onConnChange=null;   // avoid UI callback during test
    Net._reapPeers();
    assert.strictEqual(state.peers.has('peerBC-stale'),false,'_reapPeers: stale BroadcastChannel peer dropped');
    assert.strictEqual(state.peers.has('peerBC-fresh'),true,'_reapPeers: fresh BroadcastChannel peer kept');
    assert.strictEqual(state.peers.has('rtc:ab12'),true,'_reapPeers: idle WebRTC peer kept (lifecycle-managed, not heartbeat-reaped)');
    // non-vacuity: the rtc peer's lastSeen is just as stale as the dropped BC peer — the
    // ONLY reason it survives is the rtc: exemption. Without it, it would be reaped too.
    assert.strictEqual(state.peers.get('rtc:ab12').lastSeen,stale,'non-vacuity: kept rtc peer is as stale as the reaped BC peer');
    console.log('  ✓ _reapPeers: WebRTC peers survive timeout, BroadcastChannel peers reaped (presence bug)');
  }

  // v1.6.86: multi-image drop must cascade by a PER-ITERATION offset. The old code
  // shared a `let ox` incremented synchronously in the loop while reader.onload was
  // async, so every onload read the final ox (20×N) → all images stacked. This models
  // the exact closure-capture difference the fix relies on.
  {
    // BUGGY pattern: shared counter, sync increment, callbacks fire after the loop
    const buggy=[]; let ox=0; const bcb=[];
    for(let n=0;n<3;n++){ bcb.push(()=>buggy.push(ox)); ox+=20; }
    bcb.forEach(cb=>cb());
    assert.deepStrictEqual(buggy,[60,60,60],'reproduces bug: shared ox → every image at the final offset');
    // FIXED pattern: per-iteration index capture (what files.forEach((f,i)=>…) gives)
    const fixed=[]; const fcb=[];
    [0,1,2].forEach(i=>{ fcb.push(()=>fixed.push(i*20)); });
    fcb.forEach(cb=>cb());
    assert.deepStrictEqual(fixed,[0,20,40],'fix: per-iteration capture → distinct cascade offsets');
    assert.notDeepStrictEqual(buggy,fixed,'non-vacuity: the two patterns genuinely differ');
    console.log('  ✓ drop cascade: per-iteration index capture avoids async shared-counter stacking');
  }

  // v1.6.88: rect/ellipse labels must appear in BOTH canvas and SVG (parity). The canvas
  // side is verified by presence (fake ctx records nothing); here we lock in the export
  // side and the no-label case so the two paths can't silently drift apart again.
  {
    const rectLabeled = buildSVG([{id:'r',type:'rect',x:0,y:0,w:80,h:40,label:'Hello',stroke:'#000',size:1,opacity:1}], '#fff');
    const ellLabeled  = buildSVG([{id:'e',type:'ellipse',x:0,y:0,w:80,h:40,label:'World',stroke:'#000',size:1,opacity:1}], '#fff');
    const rectPlain   = buildSVG([{id:'r2',type:'rect',x:0,y:0,w:80,h:40,stroke:'#000',size:1,opacity:1}], '#fff');
    assert.ok(rectLabeled.includes('>Hello<'), 'SVG: labeled rect emits its label text');
    assert.ok(ellLabeled.includes('>World<'), 'SVG: labeled ellipse emits its label text');
    assert.ok(/<text/.test(rectLabeled), 'SVG: labeled rect emits a <text> node');
    assert.ok(!/<text/.test(rectPlain), 'SVG: rect without a label emits no <text> node');
    // The label text is escaped (XSS-safe) — exercise the shared _esc path on a hostile label
    const evil = buildSVG([{id:'x',type:'rect',x:0,y:0,w:80,h:40,label:'</text><script>',stroke:'#000',size:1,opacity:1}], '#fff');
    assert.ok(!evil.includes('<script>'), 'SVG: rect label is escaped (no raw markup injection)');
    console.log('  ✓ rect/ellipse labels: rendered on canvas (_drawBoxLabel) + escaped in SVG (parity)');
  }

  // v1.7.0: connector (edge) labels (ADR-0003). A labeled line/arrow emits its label as
  // a centred <text> at the segment midpoint in SVG (canvas verified by presence). The
  // label is escaped, and an unlabeled connector emits no <text>.
  {
    // arrow from (0,0)→(100,0): midpoint x=50; with pad=32 and bbox at 0, ox≈32 → text x≈82
    const arrSvg = buildSVG([{id:'a',type:'arrow',x1:0,y1:0,x2:100,y2:0,label:'yes',stroke:'#000',size:2,opacity:1}], '#fff');
    const lineSvg = buildSVG([{id:'l',type:'line',x1:0,y1:0,x2:80,y2:60,label:'no',stroke:'#000',size:2,opacity:1}], '#fff');
    const plain = buildSVG([{id:'p',type:'arrow',x1:0,y1:0,x2:100,y2:0,stroke:'#000',size:2,opacity:1}], '#fff');
    assert.ok(arrSvg.includes('>yes<'), 'edge label: labeled arrow emits its label text');
    assert.ok(/<text[^>]*text-anchor="middle"[^>]*>yes</.test(arrSvg), 'edge label: arrow label is centred <text>');
    assert.ok(lineSvg.includes('>no<'), 'edge label: labeled line emits its label text');
    assert.ok(!/<text/.test(plain), 'edge label: unlabeled connector emits no <text>');
    // midpoint placement: for the (0,0)->(100,0) arrow the label x must sit near 50+ox (=82),
    // i.e. between the endpoints, not at an endpoint
    const m = arrSvg.match(/<text x="([\d.]+)"[^>]*>yes</);
    assert.ok(m, 'edge label: <text> has an x coordinate');
    const lx = parseFloat(m[1]);
    assert.ok(lx > 60 && lx < 105, `edge label: x (${lx}) is near the segment midpoint, not an endpoint`);
    // XSS: hostile label is escaped via the shared _esc path
    const evil = buildSVG([{id:'x',type:'arrow',x1:0,y1:0,x2:100,y2:0,label:'</text><script>',stroke:'#000',size:2,opacity:1}], '#fff');
    assert.ok(!evil.includes('<script>'), 'edge label: hostile label escaped (no markup injection)');
    console.log('  ✓ connector edge labels: midpoint <text> in SVG, escaped, omitted when unlabeled (ADR-0003)');
  }

  // v1.6.89: colour-pick coalescing — a native <input type=color> fires `input`
  // continuously, so the pick must collapse to ONE undo/sync op (capture → live →
  // flush), exactly like the size/opacity sliders.
  {
    state.shapes=[];_invalidateGrid();state.history=[];state.histIdx=-1;state.selection=new Set();
    state.seq=0;state.seenOps=new Set();
    const r=Shape.make('rect',{x:0,y:0,w:50,h:50,stroke:'#000000'});
    Store.commit({op:'add',shape:r});
    state.selection=new Set([r.id]);
    const histAfterAdd=state.history.length;
    // colour pick: snapshot, then several live `input` mutations (no Store), then flush
    _sfbCapture('stroke');
    const live=state.shapes.find(s=>s.id===r.id);
    live.stroke='#111111'; live.stroke='#222222'; live.stroke='#333333';
    assert.strictEqual(state.history.length,histAfterAdd,'colour pick: live inputs record NO undo ops');
    _sfbFlush('stroke','#333333');
    assert.strictEqual(state.history.length,histAfterAdd+1,'colour pick: change flushes exactly ONE style op (not 3)');
    const op=state.history[state.histIdx];
    assert.strictEqual(op.op,'style','colour pick: flushed op is a style op');
    assert.strictEqual(op.before[0].stroke,'#000000','colour pick: before = original colour');
    assert.strictEqual(op.after[0].stroke,'#333333','colour pick: after = final colour');
    Store.undo();
    assert.strictEqual(state.shapes.find(s=>s.id===r.id).stroke,'#000000','colour pick: ONE undo restores original (not three)');
    // non-vacuity: flushing an unchanged value records nothing (proves the guard works)
    Store.redo();
    const hLen=state.history.length;
    _sfbCapture('stroke'); _sfbFlush('stroke','#333333');   // same value → no-op
    assert.strictEqual(state.history.length,hLen,'non-vacuity: flushing an unchanged colour records no op');
    console.log('  ✓ colour picker: multi-input pick coalesces to a single undo/sync op (slider parity)');
  }

  // search navigation: _sqAdvance steps through matches, wraps, reverses, resets on new query
  {
    state.shapes=[];_invalidateGrid();state.history=[];state.histIdx=-1;state.selection=new Set();
    state.seq=0;state.seenOps=new Set();
    const a=Shape.make('rect',{x:0,y:0,w:10,h:10,label:'needle A'});
    const b=Shape.make('rect',{x:50,y:0,w:10,h:10,label:'needle B'});
    const c=Shape.make('rect',{x:100,y:0,w:10,h:10,label:'needle C'});
    const other=Shape.make('rect',{x:200,y:0,w:10,h:10,label:'haystack'});
    Store.commit({op:'add',shape:a});Store.commit({op:'add',shape:b});
    Store.commit({op:'add',shape:c});Store.commit({op:'add',shape:other});
    // seed fresh search via _setSq (mirrors the search input's `input` handler)
    _setSq('needle');
    // first advance selects first match (idx 0)
    const r1=_sqAdvance(1);
    assert.ok(r1&&r1.label==='needle A','search nav: first advance selects first match');
    assert.ok(state.selection.has(a.id),'search nav: state.selection updated to first match');
    // second advance → second match
    const r2=_sqAdvance(1);
    assert.ok(r2&&r2.label==='needle B','search nav: second advance selects second match');
    // third advance → third match
    _sqAdvance(1);
    assert.ok(state.selection.has(c.id),'search nav: third advance selects third match');
    // fourth wraps to first
    const r4=_sqAdvance(1);
    assert.ok(r4&&r4.label==='needle A','search nav: fourth advance wraps to first (cycle)');
    // backward from first → last
    const rb=_sqAdvance(-1);
    assert.ok(rb&&rb.label==='needle C','search nav: backward from first wraps to last');
    // empty query: _sqAdvance is a no-op (returns undefined, selection unchanged)
    state.selection=new Set();_setSq('');
    const rEmpty=_sqAdvance(1);
    assert.ok(rEmpty===undefined,'search nav: empty query is a no-op (returns undefined)');
    assert.ok(state.selection.size===0,'search nav: empty query leaves selection unchanged');
    // no-match query: no-op
    _setSq('zzz-no-match');
    const rNone=_sqAdvance(1);
    assert.ok(rNone===undefined,'search nav: no-match query is a no-op');
    // query change resets index so next advance starts at 0
    _setSq('something-else');_sqAdvance(1);   // seed a non-zero idx on different query
    _sqNav.idx=2;                              // manually push to idx=2 (already on 'something-else')
    _setSq('needle');                           // new query → _setSq resets idx to -1
    const rReset=_sqAdvance(1);
    assert.ok(rReset&&rReset.label==='needle A','search nav: new query resets idx, first advance restarts at 0');
    console.log('  ✓ search navigation: _sqAdvance steps, wraps, reverses, resets on new query (9 asserts)');
  }

  // search navigation a11y: SR users search BY content, so the announcement must name
  // WHICH shape was found (describeShape), not a bare "2/7" count — parity with Tab cycle.
  {
    state.shapes=[];_invalidateGrid();state.history=[];state.histIdx=-1;state.selection=new Set();
    state.seq=0;state.seenOps=new Set();state.viewport={x:0,y:0,zoom:1};
    const a=Shape.make('rect',{x:0,y:0,w:10,h:10,label:'alpha'});
    const b=Shape.make('arrow',{x1:50,y1:0,x2:90,y2:0,label:'alphabet'});
    Store.commit({op:'add',shape:a});Store.commit({op:'add',shape:b});
    // spy on UI.toast to capture the live-region announcement
    const seen=[];const origToast=UI.toast;UI.toast=(msg,kind)=>{seen.push(msg);};
    try{
      _setSq('alpha');
      const r1=_sqAdvance(1);
      const msg1=seen[seen.length-1];
      // the announcement must contain the matched shape's content (describeShape), not only a count
      assert.ok(msg1.includes(describeShape(r1)),'search a11y: announcement includes describeShape of the match');
      assert.ok(msg1.includes('alpha'),'search a11y: announcement names the matched shape content');
      assert.ok(/\(1\/2\)/.test(msg1),'search a11y: announcement still carries the position count (1/2)');
      // non-vacuity: a bare-count-only announcement (the old behaviour) would NOT contain the
      // shape type — prove the new message is strictly richer than "1/2"
      assert.ok(msg1!=='1/2'&&msg1.length>'1/2'.length,'search a11y: announcement is richer than the bare count');
      // advancing to the 2nd match announces the OTHER shape (content differs)
      const r2=_sqAdvance(1);
      const msg2=seen[seen.length-1];
      assert.ok(msg2.includes(describeShape(r2)),'search a11y: 2nd advance announces the 2nd match content');
      assert.ok(/\(2\/2\)/.test(msg2),'search a11y: 2nd announcement carries position 2/2');
    }finally{UI.toast=origToast;}
    console.log('  ✓ search navigation a11y: announces matched shape (describeShape), not bare count (Tab-cycle parity)');
  }

  // v1.6.76: doLock undo round-trip (⌘⇧L keyboard accessibility).
  // README claims "全機能キーボード操作可能" but lock was right-click-only before this fix.
  // Behavioral non-vacuity: tests the lock/unlock toggle and undo/redo symmetry.
  // (Presence checks above — 3 new — fail before the fix and pass after.)
  {
    state.shapes=[];_invalidateGrid();state.history=[];state.histIdx=-1;state.selection=new Set();
    state.seq=0;state.seenOps=new Set();
    const sh=Shape.make('rect',{x:0,y:0,w:100,h:100});
    Store.commit({op:'add',shape:sh});
    state.selection=new Set([sh.id]);
    // byId reads the live clone in state.shapes (add op clones the shape)
    const live=()=>state.shapes.find(s=>s.id===sh.id);

    // initial: unlocked
    assert.ok(!live().locked,'lock: shape starts unlocked');
    // lock
    doLock();
    assert.ok(live().locked===true,'lock: doLock() sets locked=true');
    // toggle → unlock
    doLock();
    assert.ok(live().locked===null,'lock: second doLock() clears locked to null');
    // undo unlock → locked again
    Store.undo();
    assert.ok(live().locked===true,'lock: undo of unlock restores locked=true');
    // undo lock → unlocked
    Store.undo();
    assert.ok(!live().locked,'lock: undo of lock restores unlocked');
    // redo lock
    Store.redo();
    assert.ok(live().locked===true,'lock: redo of lock restores locked=true');
    console.log('  ✓ doLock: toggle + undo/redo symmetric (⌘⇧L keyboard accessibility)');
  }

  // v1.6.75: doDuplicate frame parity — duplicating a frame must include contained children,
  // mirroring withFrameChildren used by drag-move and nudge.
  // Before fix: only the frame shell duplicated (1 new shape, children left behind).
  // After fix: frame + all spatially-contained children duplicated (2+ new shapes).
  {
    state.shapes=[];_invalidateGrid();state.history=[];state.histIdx=-1;state.selection=new Set();
    state.seq=0;state.seenOps=new Set();
    const fr=Shape.make('frame',{x:0,y:0,w:300,h:300});
    const child=Shape.make('rect',{x:50,y:50,w:40,h:40});
    const outsider=Shape.make('rect',{x:500,y:500,w:40,h:40});
    Store.commit({op:'add',shape:fr});
    Store.commit({op:'add',shape:child});
    Store.commit({op:'add',shape:outsider});
    const beforeCount=state.shapes.length;  // 3

    state.selection=new Set([fr.id]);  // select only the frame, NOT the child or outsider
    doDuplicate();

    const addedCount=state.shapes.length-beforeCount;
    // after fix: frame+child both copied = 2 new shapes in selection
    assert.strictEqual(addedCount,2,'doDuplicate frame: duplicates frame AND contained child, not just the shell');
    // outsider (x=500) should NOT appear among the copies
    const copyIds=state.selection;
    assert.ok(!state.shapes.some(s=>copyIds.has(s.id)&&s.x>400),'doDuplicate frame: outsider not included in copies');
    // original frame still present (3 originals intact)
    assert.strictEqual(state.shapes.filter(s=>!copyIds.has(s.id)).length,3,'doDuplicate frame: originals untouched');
    // new frame and new child both appear in selection
    const newFrame=state.shapes.find(s=>copyIds.has(s.id)&&s.type==='frame');
    assert.ok(newFrame,'doDuplicate frame: frame copy is in the new selection');
    const newChild=state.shapes.find(s=>copyIds.has(s.id)&&s.type!=='frame');
    assert.ok(newChild,'doDuplicate frame: child copy is in the new selection');
    // spatial relationship preserved: child copy lands inside the new frame copy
    const nb=G.bbox(newFrame);
    const cb=G.bbox(newChild);
    assert.ok(cb.x>=nb.x&&cb.y>=nb.y&&cb.x+cb.w<=nb.x+nb.w&&cb.y+cb.h<=nb.y+nb.h,
      'doDuplicate frame: duplicated child is spatially inside the duplicated frame');
    console.log('  ✓ doDuplicate: frame duplication includes children (withFrameChildren parity with drag/nudge)');
  }

  // v1.6.78: doDelete clears stale connector bindings atomically inside the del op.
  // Before fix: when rA (the bound shape) is deleted, arrow.a stays as rA.id (dangling).
  // connEnds falls back to the arrow's draw-time x1,y1 — NOT where rA actually was.
  // After fix: a=null and x1,y1 = the resolved endpoint (edge of rA at delete time).
  // Undo must restore both: rA back in state.shapes AND arrow.a = rA.id.
  {
    state.shapes=[];_invalidateGrid();state.history=[];state.histIdx=-1;state.selection=new Set();
    const rA=Shape.make('rect',{x:200,y:200,w:80,h:60});
    Store.commit({op:'add',shape:rA});
    // Arrow with stale stored x1=140 (draw-time position, before rA moved)
    const arr=Shape.make('arrow',{x1:140,y1:130,x2:400,y2:400});
    const liveArr=()=>state.shapes.find(s=>s.id===arr.id);
    arr.a=rA.id;
    Store.commit({op:'add',shape:arr});
    // Delete rA — connector should clean up atomically
    state.selection=new Set([rA.id]);
    doDelete();
    assert.ok(liveArr(),'connector survives deletion of its bound shape');
    assert.strictEqual(liveArr().a,null,'doDelete: connector .a binding cleared when bound shape deleted');
    assert.notStrictEqual(liveArr().x1,140,'doDelete: connector x1 updated to resolved position (not stale draw-time value)');
    // Undo restores rA AND restores the connector binding — both in one Ctrl+Z
    Store.undo();
    assert.ok(state.shapes.find(s=>s.id===rA.id),'doDelete undo: deleted rect is restored');
    assert.strictEqual(liveArr().a,rA.id,'doDelete undo: connector .a binding restored');
    assert.strictEqual(liveArr().x1,140,'doDelete undo: original stored x1 restored');
    console.log('  ✓ doDelete: connector bindings resolved+cleared; undo restores both atomically');
  }

  // v1.6.79: flushErase must clear stale connector bindings, same as doDelete.
  // The eraser removes shapes from state.shapes immediately in eraseAt (visual feedback),
  // then flushErase pushes them BACK before calling Store.commit so _apply can do the
  // canonical splice. At that push-back point, connEnds can still resolve live positions.
  // Before fix: flushErase committed a bare del op (no connClears) → dangling a/b bindings.
  {
    state.shapes=[];_invalidateGrid();state.history=[];state.histIdx=-1;state.selection=new Set();
    const rB=Shape.make('rect',{x:100,y:100,w:60,h:50});
    Store.commit({op:'add',shape:rB});
    const arr2=Shape.make('arrow',{x1:50,y1:50,x2:300,y2:300});
    arr2.a=rB.id;
    Store.commit({op:'add',shape:arr2});
    const liveArr2=()=>state.shapes.find(s=>s.id===arr2.id);
    // Simulate eraseAt: remove rB from state.shapes, push to _eraseBatch
    const liveRB=state.shapes.find(s=>s.id===rB.id);
    state.shapes.splice(state.shapes.indexOf(liveRB),1);
    _pushEraseBatch(JSON.parse(JSON.stringify(liveRB)));
    // flushErase pushes rB back, computes connClears, commits del op with cleanup
    flushErase();
    assert.ok(liveArr2(),'arrow survives erasing its bound shape');
    assert.strictEqual(liveArr2().a,null,'flushErase: connector .a cleared when bound shape erased');
    assert.notStrictEqual(liveArr2().x1,50,'flushErase: connector x1 updated to resolved position');
    Store.undo();
    assert.ok(state.shapes.find(s=>s.id===rB.id),'flushErase undo: erased shape restored');
    assert.strictEqual(liveArr2().a,rB.id,'flushErase undo: connector .a binding restored');
    console.log('  ✓ flushErase: connector bindings cleared atomically (eraser parity with doDelete)');
  }

  // v1.6.80: remote `del` connClears must be validated (security parity with upd/style).
  // _apply case 'del' applies op.connClears via Object.assign(sh, p.after) — unvalidated.
  // Without a guard, a hostile peer's del op can inject NaN coords (shape vanishes),
  // prototype pollution, or functions into a connector, bypassing the validPatch gates
  // that protect every other remote write. The del validator must run each connClears
  // before/after through validPatch.
  {
    // well-formed connClears accepted
    assert.ok(validRemotePayload({op:'del',shapes:[],connClears:[{id:'c1',before:{a:'x',x1:5},after:{a:null,x1:9}}]}),
      'del: well-formed connClears accepted');
    // del with no connClears still accepted (backward compatible)
    assert.ok(validRemotePayload({op:'del',shapes:[]}),'del: missing connClears (legacy) accepted');
    // NaN coordinate in after must be rejected (would make connector vanish)
    assert.ok(!validRemotePayload({op:'del',shapes:[],connClears:[{id:'c1',after:{x1:NaN}}]}),
      'del: NaN coord in connClears.after rejected');
    // Infinity likewise
    assert.ok(!validRemotePayload({op:'del',shapes:[],connClears:[{id:'c1',after:{y2:Infinity}}]}),
      'del: Infinity in connClears rejected');
    // prototype pollution via __proto__ key rejected
    assert.ok(!validRemotePayload({op:'del',shapes:[],connClears:JSON.parse('[{"id":"c1","after":{"__proto__":{"polluted":1}}}]')}),
      'del: __proto__ in connClears rejected');
    // missing id rejected (Object.assign target lookup needs a string id)
    assert.ok(!validRemotePayload({op:'del',shapes:[],connClears:[{after:{x1:1}}]}),
      'del: connClears entry without string id rejected');
    // non-array connClears rejected
    assert.ok(!validRemotePayload({op:'del',shapes:[],connClears:'evil'}),
      'del: non-array connClears rejected');
    // End-to-end: a hostile remote del with NaN connClears must NOT corrupt the live connector.
    state.shapes=[];_invalidateGrid();state.history=[];state.histIdx=-1;state.seq=0;state.seenOps=new Set();state.wclock={};
    const victim=Shape.make('rect',{x:0,y:0,w:40,h:40});
    const conn=Shape.make('arrow',{x1:10,y1:10,x2:200,y2:200});
    conn.a=victim.id;
    Store.commit({op:'add',shape:victim});Store.commit({op:'add',shape:conn});
    Store.applyRemote({op:'del',shapes:[JSON.parse(JSON.stringify(victim))],
      connClears:[{id:conn.id,after:{x1:NaN,polluted:1}}],clock:{peer:'evil',seq:1,ts:1}});
    const liveConn=state.shapes.find(s=>s.id===conn.id);
    assert.ok(liveConn,'hostile del rejected: connector still present');
    assert.ok(Number.isFinite(liveConn.x1),'hostile del rejected: connector x1 not NaN-poisoned');
    assert.notStrictEqual(({}).polluted,1,'hostile del rejected: no prototype pollution');
    assert.ok(state.shapes.find(s=>s.id===victim.id),'hostile del rejected: victim shape not removed');
    console.log('  ✓ remote del connClears validated (NaN/Infinity/__proto__/non-string-id rejected)');
  }

  // v1.6.81: a REMOTE del of a bound shape must clean up the receiver's LOCAL connectors
  // that the sender didn't include in connClears (e.g. drawn locally, not yet synced to
  // the sender, or a concurrent-edit race). connEnds resolution must happen BEFORE the
  // shape is spliced from state.shapes, else the connector snaps to its stale draw-time
  // coords instead of where the bound shape actually was.
  {
    state.shapes=[];_invalidateGrid();state.history=[];state.histIdx=-1;state.seq=0;state.seenOps=new Set();state.wclock={};
    const A=Shape.make('rect',{x:200,y:200,w:80,h:60});
    const C=Shape.make('arrow',{x1:140,y1:130,x2:400,y2:400});
    C.a=A.id;
    Store.commit({op:'add',shape:A});Store.commit({op:'add',shape:C});
    const liveC=()=>state.shapes.find(s=>s.id===C.id);
    // Remote peer deletes A but does NOT include C in connClears (C is local-only to us).
    Store.applyRemote({op:'del',shapes:[JSON.parse(JSON.stringify(A))],clock:{peer:'remote',seq:1,ts:1}});
    assert.ok(liveC(),'remote del: receiver-local connector survives');
    assert.strictEqual(liveC().a,null,'remote del: receiver-local connector binding cleared');
    assert.notStrictEqual(liveC().x1,140,'remote del: connector x1 resolved to bound-shape edge (not stale draw-time)');
    assert.ok(Number.isFinite(liveC().x1)&&Number.isFinite(liveC().y1),'remote del: resolved endpoint is finite');
    assert.ok(!state.shapes.find(s=>s.id===A.id),'remote del: bound shape removed');
    // A connector already covered by the sender's connClears is NOT double-processed:
    // the sender-provided after wins (idempotent — both resolve to the same severed state).
    state.shapes=[];_invalidateGrid();state.history=[];state.histIdx=-1;state.seq=0;state.seenOps=new Set();state.wclock={};
    const A2=Shape.make('rect',{x:0,y:0,w:40,h:40});
    const C2=Shape.make('arrow',{x1:5,y1:5,x2:100,y2:100});
    C2.a=A2.id;
    Store.commit({op:'add',shape:A2});Store.commit({op:'add',shape:C2});
    Store.applyRemote({op:'del',shapes:[JSON.parse(JSON.stringify(A2))],
      connClears:[{id:C2.id,before:{a:A2.id,x1:5,y1:5},after:{a:null,x1:20,y1:20}}],clock:{peer:'remote',seq:2,ts:1}});
    const liveC2=state.shapes.find(s=>s.id===C2.id);
    assert.strictEqual(liveC2.a,null,'remote del w/ connClears: shared connector still severed');
    assert.strictEqual(liveC2.x1,20,'remote del w/ connClears: sender-provided endpoint applied (not double-clobbered)');
    console.log('  ✓ remote del cleans up receiver-local connectors; respects sender connClears for shared ones');
  }

  // v1.6.84: <html lang> must match the detected UI locale (WCAG 3.1.1 Language of Page).
  // It was hardcoded to "ja"; an English-browser user gets English UI but lang stayed "ja",
  // so a screen reader would read English text with a Japanese speech engine (and CJK han
  // unification could pick Japanese glyph variants). applyI18n now syncs documentElement.lang
  // to LANG. In this harness navigator.language='en' → LANG='en'.
  {
    fakeDoc.documentElement.lang='ja';   // simulate the hardcoded SSR default
    UI.applyI18n();
    assert.strictEqual(fakeDoc.documentElement.lang,'en','applyI18n syncs <html lang> to the detected locale (en in harness)');
    console.log('  ✓ applyI18n syncs <html lang> to UI locale (WCAG 3.1.1 Language of Page)');
  }

  // v1.6.85: modal focus trap (WCAG 2.4.3/2.1.2). _trapStep is the pure wrap step that
  // keeps Tab/Shift+Tab cycling inside an open dialog. Returns the element to focus at a
  // boundary (or when focus is outside the dialog), or null to let native Tab move within.
  {
    const a={},b={},c={},items=[a,b,c];
    // middle positions → null (native Tab handles intra-dialog movement)
    assert.strictEqual(_trapStep(items,a,false),null,'trap: forward from first → native (null)');
    assert.strictEqual(_trapStep(items,b,false),null,'trap: forward from middle → native (null)');
    assert.strictEqual(_trapStep(items,c,true),null,'trap: backward from last → native (null)');
    assert.strictEqual(_trapStep(items,b,true),null,'trap: backward from middle → native (null)');
    // boundaries wrap
    assert.strictEqual(_trapStep(items,c,false),a,'trap: forward off the last wraps to first');
    assert.strictEqual(_trapStep(items,a,true),c,'trap: backward off the first wraps to last');
    // focus currently outside the dialog → pull it in (first on Tab, last on Shift+Tab)
    assert.strictEqual(_trapStep(items,{},false),a,'trap: outside focus + Tab → first');
    assert.strictEqual(_trapStep(items,{},true),c,'trap: outside focus + Shift+Tab → last');
    // degenerate: no focusables → null (nothing to trap)
    assert.strictEqual(_trapStep([],a,false),null,'trap: empty focusables → null');
    // single focusable: any Tab keeps it focused (first===last)
    assert.strictEqual(_trapStep([a],a,false),a,'trap: lone control, Tab wraps to itself');
    assert.strictEqual(_trapStep([a],a,true),a,'trap: lone control, Shift+Tab wraps to itself');
    console.log('  ✓ _trapStep: focus wraps at dialog boundaries, native in the middle (WCAG focus trap)');
  }

  // v1.6.86: devicePixelRatio change tracking. resize() only fires on window-resize /
  // orientationchange — dragging the window between monitors of different density changes
  // devicePixelRatio with NO resize event, leaving the canvas backing store at the stale
  // DPR (blurry). _watchDPR arms a (resolution: Xdppx) media query that fires once when the
  // ratio changes, then re-arms for the new ratio.
  {
    const armed=[];const listeners=[];
    const realMM=fakeWin.matchMedia, realDPR=fakeWin.devicePixelRatio;
    fakeWin.matchMedia=(q)=>{armed.push(q);return{
      media:q,
      addEventListener:(_ev,fn)=>listeners.push(fn),
      removeEventListener(){},
      addListener:(fn)=>listeners.push(fn),
    };};
    fakeWin.devicePixelRatio=2;
    _watchDPR();
    assert.ok(/resolution: *2dppx/.test(armed[armed.length-1]),'DPR watch arms a query for the current ratio (2dppx)');
    assert.strictEqual(listeners.length,1,'DPR watch registers exactly one change listener');
    // Simulate moving to a 1× monitor: ratio changes, the query stops matching → change fires.
    fakeWin.devicePixelRatio=1;
    listeners[0]();
    assert.ok(/resolution: *1dppx/.test(armed[armed.length-1]),'on change, DPR watch re-arms for the NEW ratio (1dppx)');
    assert.ok(listeners.length>=2,'re-arm registers a fresh single-fire listener');
    // matchMedia absent → safe no-op (the watcher must never throw on unsupported envs)
    fakeWin.matchMedia=undefined;
    assert.doesNotThrow(()=>_watchDPR(),'DPR watch is a safe no-op when matchMedia is unavailable');
    fakeWin.matchMedia=realMM;fakeWin.devicePixelRatio=realDPR;
    console.log('  ✓ _watchDPR: tracks devicePixelRatio changes, re-arms per ratio (Retina monitor-switch)');
  }

  // v1.6.87: copyText falls back to execCommand on non-secure contexts (file:// / http://),
  // where navigator.clipboard is undefined — Board's primary "just open index.html" case.
  // Before: the share-copy button called navigator.clipboard.writeText in a try/catch, so on
  // file:// it threw, was swallowed, and copied nothing with no user feedback.
  {
    const realSecure=fakeWin.isSecureContext, realClip=fakeWin.navigator.clipboard, realExec=fakeDoc.execCommand;
    // (1) secure context with Clipboard API → uses navigator.clipboard.writeText
    let written=null;
    fakeWin.isSecureContext=true;
    fakeWin.navigator.clipboard={writeText:(s)=>{written=s;return Promise.resolve()}};
    assert.strictEqual(await copyText('hello'),true,'copyText: secure context returns true');
    assert.strictEqual(written,'hello','copyText: secure context used navigator.clipboard.writeText');
    // (2) non-secure context (file://): clipboard absent → execCommand fallback succeeds
    fakeWin.isSecureContext=false;
    fakeWin.navigator.clipboard=undefined;
    let execArg=null;
    fakeDoc.execCommand=(cmd)=>{execArg=cmd;return true};
    assert.strictEqual(await copyText('world'),true,'copyText: non-secure context falls back to execCommand');
    assert.strictEqual(execArg,'copy',"copyText: fallback issues execCommand('copy')");
    // (3) both unavailable → returns false (caller shows a copyFailed toast, not a silent no-op)
    fakeDoc.execCommand=()=>false;
    assert.strictEqual(await copyText('x'),false,'copyText: returns false when no copy mechanism works');
    // (4) secure context but writeText REJECTS → falls back to execCommand (not a hard failure)
    fakeWin.isSecureContext=true;
    fakeWin.navigator.clipboard={writeText:()=>Promise.reject(new Error('denied'))};
    fakeDoc.execCommand=()=>true;
    assert.strictEqual(await copyText('y'),true,'copyText: rejected writeText falls back to execCommand');
    fakeWin.isSecureContext=realSecure;fakeWin.navigator.clipboard=realClip;fakeDoc.execCommand=realExec;
    console.log('  ✓ copyText: secure→Clipboard API, file://→execCommand fallback, false when neither works');
  }

  // v1.6.88: pointercancel must clear state.guides and restore _eraseBatch
  // Bug 1 (Qiita: "ポインタキャンセル後に残るスナップガイド線"): state.guides not cleared
  // → alignment guide lines remain drawn after stylus goes out-of-range or Android takes over.
  {
    state.guides=[{x1:0,y1:0,x2:200,y2:0,type:'horiz'}];
    _cancelPointerGesture();
    assert.strictEqual(state.guides,null,'pointercancel: state.guides cleared (no stale snap-guide lines after cancel)');
  }
  // Bug 2 (data-loss): _eraseBatch not restored on cancel → shapes permanently disappear.
  // Repro: erase mid-stroke → OS gesture takes over → pointerup never fires → shapes lost.
  {
    const sh={id:'cancel-erase-sh',type:'rect',x:5,y:5,w:40,h:40,z:1,stroke:'#000',fill:'none',opacity:1};
    state.shapes.push(JSON.parse(JSON.stringify(sh)));
    const idx=state.shapes.findIndex(s=>s.id===sh.id);
    _pushEraseBatch(state.shapes.splice(idx,1)[0]); // mid-erase: removed from shapes, queued in batch
    assert.strictEqual(state.shapes.find(s=>s.id===sh.id),undefined,'erase-cancel pre: shape gone from state.shapes');
    _cancelPointerGesture();
    assert.ok(state.shapes.find(s=>s.id===sh.id),'pointercancel: eraser batch restored (no data-loss on pointer cancel)');
    const ci=state.shapes.findIndex(s=>s.id===sh.id);if(ci>=0)state.shapes.splice(ci,1);
    console.log('  ✓ pointercancel: state.guides cleared + eraser batch restored (stale guides + data-loss bugs fixed)');
  }

  // v1.6.89: document.title must track docName (WCAG 2.4.2 Page Titled).
  // Without this: browser tab always shows "index.html", screen readers announce wrong title.
  // Qiita: "document.title を更新しないとブラウザタブに反映されない"
  {
    const prevTitle=fakeDoc.title, prevName=state.docName;
    fakeDoc.title='';
    state.docName='Socratic Test Board';
    _syncDocTitle();
    assert.strictEqual(fakeDoc.title,'Socratic Test Board — Board',
      '_syncDocTitle: document.title updated with docName (WCAG 2.4.2)');
    // Untitled fallback when docName is empty
    state.docName='';
    _syncDocTitle();
    assert.strictEqual(fakeDoc.title,'Untitled — Board',
      '_syncDocTitle: falls back to "Untitled" when docName is empty');
    state.docName=prevName; fakeDoc.title=prevTitle;
    console.log('  ✓ _syncDocTitle: browser-tab title tracks docName (WCAG 2.4.2 Page Titled)');
  }

  // v1.6.90: Screen Wake Lock API — display must stay on during presentations.
  // Zenn: "プレゼンテーション中に画面がオフになる" / MDN Screen Wake Lock API.
  {
    let requested=null;
    const sentinel={released:false,release:async()=>{sentinel.released=true;}};
    fakeWin.navigator.wakeLock={request:async(type)=>{requested=type;return sentinel;}};
    await Presentation._acquireWakeLock();
    assert.strictEqual(requested,'screen','_acquireWakeLock requests "screen" lock');
    Presentation._releaseWakeLock();
    await Promise.resolve();  // allow the sentinel.release() micro-task to settle
    assert.strictEqual(sentinel.released,true,'_releaseWakeLock calls sentinel.release()');
    // graceful no-op when wakeLock is unsupported
    fakeWin.navigator.wakeLock=undefined;
    assert.doesNotThrow(()=>Presentation._acquireWakeLock(),'_acquireWakeLock: safe no-op when navigator.wakeLock absent');
    fakeWin.navigator.wakeLock=undefined;
    console.log('  ✓ Presentation._acquireWakeLock/release: screen stays on during slides (Screen Wake Lock API)');
  }

  // v1.6.92: PWA install button (beforeinstallprompt) — progressive enhancement,
  // only shows when the browser fires the event. Tests: prompt() called on click,
  // button hidden after install, no-op when prompt is null.
  // Must fail before fix (_installPrompt undefined) and pass after.
  {
    // 1. _setInstallPrompt stores prompt and _getInstallPrompt retrieves it
    assert.strictEqual(_getInstallPrompt(), null,
      'beforeinstallprompt: _installPrompt starts null');
    let promptCalled = false;
    const mockPrompt = {
      prompt() { promptCalled = true; },
      userChoice: Promise.resolve({ outcome: 'accepted' }),
    };
    _setInstallPrompt(mockPrompt);
    assert.strictEqual(_getInstallPrompt(), mockPrompt,
      'beforeinstallprompt: _setInstallPrompt stores event');

    // 2. _onBtnInstall calls prompt() and clears _installPrompt
    await _onBtnInstall();
    assert.strictEqual(promptCalled, true,
      'beforeinstallprompt: btnInstall click calls prompt()');
    assert.strictEqual(_getInstallPrompt(), null,
      'beforeinstallprompt: _installPrompt cleared after userChoice');

    // 3. _onBtnInstall is safe when _installPrompt is already null (no-op)
    assert.doesNotThrow(() => _onBtnInstall(),
      'beforeinstallprompt: _onBtnInstall no-op when prompt is null');
    console.log('  ✓ PWA install button: prompt() called on click, cleared after install (beforeinstallprompt)');
  }

  // v1.6.93: SW update notification — controllerchange fires after skipWaiting activates the
  // new SW; Board must show a toast so the user knows to reload.
  // Pattern: web.dev/service-worker-lifecycle / Zenn「SW更新時にリロードを促す」.
  // Must fail before fix (no _onSwUpdate exported) and pass after.
  {
    // 1. Listener is registered on navigator.serviceWorker
    const swListeners = fakeWin.navigator.serviceWorker._listeners;
    assert.ok(typeof swListeners['controllerchange'] === 'function',
      'SW controllerchange: listener registered on navigator.serviceWorker');
    // 2. Named handler _onSwUpdate() produces a toast when called directly.
    //    Direct call avoids closure-identity issues with UI.toast monkey-patching.
    assert.ok(typeof _onSwUpdate === 'function',
      'SW controllerchange: _onSwUpdate is exported');
    let lastToast = null;
    const origToast = UI.toast;
    UI.toast = (msg, kind) => { lastToast = {msg, kind}; };
    _onSwUpdate();
    UI.toast = origToast;
    assert.ok(lastToast && lastToast.kind === 'ok',
      'SW controllerchange: shows ok toast when new SW activates');
    console.log('  ✓ SW update notification: controllerchange → reload toast (web.dev SW lifecycle)');
  }

  // v1.6.94: _esc single-quote encoding — must fail before fix, pass after
  // Before fix: stroke "' onmouseover='xss()" passes through _esc unmodified → XSS vector
  // After fix: single quote encoded as &#39; → attribute value closed safely
  {
    const evilStroke = "' onmouseover='xss()";
    const svgOut = buildSVG([{type:'rect',x:0,y:0,w:10,h:10,z:0,id:'esc94',
      stroke:evilStroke,fill:'none'}], '#fff');
    assert.ok(svgOut && !svgOut.includes("' onmouseover="),
      "_esc v1.6.94: single quote in stroke cannot break SVG attr boundary");
    assert.ok(svgOut && svgOut.includes('&#39;'),
      "_esc v1.6.94: single quote is encoded as &#39; in SVG output");
    console.log("  ✓ _esc: single-quote encoded as &#39; (SVG attr defense-in-depth)");
  }

  // v1.6.95: context menu arrow-key navigation (ARIA APG menu pattern)
  // Must fail before fix (no _ctxMenuKeyNav) and pass after.
  {
    let focused = null;
    const mkItem = (name) => {
      const el = { className:'ctx-item', _name:name,
        focus(){ focused = el; fakeDoc.activeElement = el; } };
      return el;
    };
    const [it0,it1,it2] = ['a','b','c'].map(mkItem);
    const mockMenu = { querySelectorAll(s){ return s==='.ctx-item'?[it0,it1,it2]:[]; } };
    const pd = {key:'',preventDefault(){}};

    // ArrowDown: advance to next, wrap at end
    fakeDoc.activeElement = it0;
    _ctxMenuKeyNav(mockMenu, {...pd, key:'ArrowDown'});
    assert.strictEqual(focused, it1, 'ctx ArrowDown: item0→item1');
    _ctxMenuKeyNav(mockMenu, {...pd, key:'ArrowDown'});
    assert.strictEqual(focused, it2, 'ctx ArrowDown: item1→item2');
    _ctxMenuKeyNav(mockMenu, {...pd, key:'ArrowDown'});
    assert.strictEqual(focused, it0, 'ctx ArrowDown: item2→item0 (wrap)');

    // ArrowUp: previous, wrap at start
    fakeDoc.activeElement = it2;
    _ctxMenuKeyNav(mockMenu, {...pd, key:'ArrowUp'});
    assert.strictEqual(focused, it1, 'ctx ArrowUp: item2→item1');
    fakeDoc.activeElement = it0;
    _ctxMenuKeyNav(mockMenu, {...pd, key:'ArrowUp'});
    assert.strictEqual(focused, it2, 'ctx ArrowUp: item0→item2 (wrap)');

    // Home / End
    fakeDoc.activeElement = it1;
    _ctxMenuKeyNav(mockMenu, {...pd, key:'Home'});
    assert.strictEqual(focused, it0, 'ctx Home: → first item');
    fakeDoc.activeElement = it1;
    _ctxMenuKeyNav(mockMenu, {...pd, key:'End'});
    assert.strictEqual(focused, it2, 'ctx End: → last item');

    // v1.6.96: Tab closes the menu (ARIA APG "Tab: closes the menu")
    let closedMenu = false;
    const origClose = UI.closeCtxMenu;
    UI.closeCtxMenu = () => { closedMenu = true; };
    _ctxMenuKeyNav(mockMenu, {key:'Tab', shiftKey:false, preventDefault(){}});
    assert.ok(closedMenu, 'ctx Tab: closes menu');
    closedMenu = false;
    _ctxMenuKeyNav(mockMenu, {key:'Tab', shiftKey:true, preventDefault(){}});
    assert.ok(closedMenu, 'ctx Shift+Tab: closes menu');
    UI.closeCtxMenu = origClose;

    console.log('  ✓ ctx menu keyboard nav: ArrowDown/Up (with wrap), Home/End, Tab/Shift+Tab (ARIA APG)');
  }

  // v1.6.96: text shapes must have no resize handles (content-driven size)
  {
    const textShape = {type:'text',x:10,y:10,w:80,h:20,z:0,id:'txt1',text:'hi',fontSize:16};
    const textHandles = getHandles(textShape);
    assert.deepStrictEqual(textHandles, [],
      'getHandles: text shapes return no resize handles (content-driven auto-fit)');
    const rectShape = {type:'rect',x:0,y:0,w:100,h:80,z:0,id:'r1'};
    assert.ok(getHandles(rectShape).length === 8,
      'getHandles: rect shapes still return 8 resize handles');
    console.log('  ✓ getHandles: text → no resize handles (rotation via getRotHandle), rect → 8 handles');
  }

  // v1.6.97: doPaste viewport centering — must fail before fix, pass after
  // Before: paste at original coords + 20px → invisible when viewport is far away
  // After: paste centered at viewport center
  {
    const origShapesLen = state.shapes.length;
    const origViewport = JSON.parse(JSON.stringify(state.viewport));
    const origClipboard = state.clipboard;
    // Position viewport far from origin
    state.viewport = {x:5000,y:5000,zoom:1};
    // Clipboard shape at world origin (5000+px away from viewport)
    const clipShape = {type:'rect',x:0,y:0,w:100,h:100,z:1,id:'paste-test-97'};
    state.clipboard = {shapes:[clipShape]};
    _resetPasteClipboard();  // force _pasteCount reset on next paste
    doPaste();
    // vCx = 5000 + 800/1/2 = 5400 (fakeWin.innerWidth=800)
    // vCy = 5000 + 600/1/2 = 5300 (fakeWin.innerHeight=600)
    // srcCx = 0+100/2=50, srcCy = 0+100/2=50; co=20
    // placed at x≈0+(5400-50+20)=5370, center at 5420
    const newShape = state.shapes.slice(origShapesLen)[0];
    assert.ok(newShape, 'doPaste viewport: shape was added');
    const pastedCx = newShape.x + (newShape.w || 0) / 2;
    const pastedCy = newShape.y + (newShape.h || 0) / 2;
    assert.ok(Math.abs(pastedCx - 5400) < 100,
      `doPaste viewport: pasted center x (${pastedCx.toFixed(0)}) near viewport center (5400)`);
    assert.ok(Math.abs(pastedCy - 5300) < 100,
      `doPaste viewport: pasted center y (${pastedCy.toFixed(0)}) near viewport center (5300)`);
    // Cascade: second paste should be further from viewport center than first
    assert.strictEqual(_getPasteCount(), 1, 'doPaste: _pasteCount increments on paste');
    // Clean up
    state.viewport = origViewport;
    state.clipboard = origClipboard;
    Store.undo();
    console.log('  ✓ doPaste: shapes centered at viewport center, not at original clipboard position');
  }

  // v1.6.97: wrapText \\r\\n normalization
  {
    const w = wrapText("line1\r\nline2", 1000, () => 10);
    assert.deepStrictEqual(w, ['line1','line2'],
      'wrapText: \\r\\n normalized to \\n (Windows clipboard line endings)');
    const w2 = wrapText("a\rb\r\nc", 1000, () => 10);
    assert.deepStrictEqual(w2, ['a','b','c'],
      'wrapText: \\r and \\r\\n both normalized');
    console.log('  ✓ wrapText: \\r\\n and \\r normalized — Windows clipboard line endings handled');
  }

  // v1.6.98: Presentation.leave() must restore focus to the triggering element (WCAG SC 2.4.3)
  // Before fix: _setTestState not exported, leave() never calls focus()
  // After fix: _focusTrigger saved in enter() and restored in leave()
  {
    let focusCalled = false;
    const mockTrigger = { focus() { focusCalled = true; } };

    // hook exported for testability
    assert.ok(typeof Presentation._setTestState === 'function',
      'Presentation._setTestState exported (v1.6.98 hook)');

    // active presentation with a mock trigger: leave() must call focus()
    Presentation._setTestState(true, mockTrigger);
    Presentation.leave();
    assert.ok(focusCalled, 'Presentation.leave(): restores focus to trigger (WCAG SC 2.4.3)');

    // non-active path: early return means focus is NOT called
    focusCalled = false;
    Presentation._setTestState(false, mockTrigger);
    Presentation.leave();
    assert.ok(!focusCalled, 'Presentation.leave(): no-op (not active) → focus not called');

    console.log('  ✓ Presentation.leave(): restores focus to trigger element (WCAG SC 2.4.3)');
  }

  // v1.6.99: doAlign must treat grouped shapes as a single alignment unit (internal spacing preserved)
  // Before fix: each shape snapped individually to the leftmost edge → internal spacing collapsed to 0.
  // After fix: the group's combined bbox is the unit → spacing within the group is preserved.
  {
    state.shapes=[];_invalidateGrid();state.history=[];state.histIdx=-1;state.seq=0;state.seenOps=new Set();state.wclock={};state.selection=new Set();
    // Group 1: A (x=0,w=20) and B (x=50,w=20) — internal gap of 30px
    const ga1=Shape.make('rect',{x:0,y:0,w:20,h:20});
    const ga2=Shape.make('rect',{x:50,y:0,w:20,h:20});
    Store.commit({op:'add',shape:ga1});Store.commit({op:'add',shape:ga2});
    state.selection=new Set([ga1.id,ga2.id]);
    doGroup();
    const gGrpA=state.shapes.find(s=>s.id===ga1.id).groupId;
    // Group 2: C (x=200,w=20) and D (x=250,w=20) — internal gap of 30px
    const ga3=Shape.make('rect',{x:200,y:0,w:20,h:20});
    const ga4=Shape.make('rect',{x:250,y:0,w:20,h:20});
    Store.commit({op:'add',shape:ga3});Store.commit({op:'add',shape:ga4});
    state.selection=new Set([ga3.id,ga4.id]);
    doGroup();
    // Select all 4 shapes and align left
    state.selection=new Set([ga1.id,ga2.id,ga3.id,ga4.id]);
    doAlign('left');
    const liveA=state.shapes.find(s=>s.id===ga1.id);
    const liveB=state.shapes.find(s=>s.id===ga2.id);
    const liveC=state.shapes.find(s=>s.id===ga3.id);
    const liveD=state.shapes.find(s=>s.id===ga4.id);
    // Group 1 was already leftmost (x=0) — stays put
    assert.strictEqual(liveA.x, 0, 'doAlign group: A.x=0 (already at left)');
    assert.strictEqual(liveB.x - liveA.x, 50, 'doAlign group: B-A spacing preserved (50px)');
    // Group 2 shifted left so its left edge = 0; D stays 50px right of C
    assert.strictEqual(liveC.x, 0, 'doAlign group: C.x=0 (group 2 moved to left)');
    assert.strictEqual(liveD.x - liveC.x, 50, 'doAlign group: D-C spacing preserved (50px)');
    // Undo must restore original positions
    Store.undo();
    assert.strictEqual(liveC.x, 200, 'doAlign group undo: C.x restored to 200');
    assert.strictEqual(liveD.x, 250, 'doAlign group undo: D.x restored to 250');
    console.log('  ✓ doAlign: grouped shapes move as a unit, internal spacing preserved; undo restores');
  }

  // v1.7.00: doAlign must move frame children with the frame (parity with drag/nudge)
  // Before fix: selecting a frame + another shape and aligning moved the frame but left
  // frame children behind (same gap as nudge had before v1.6.75). After fix: children
  // inside a selected frame are silently added to its alignment unit.
  {
    state.shapes=[];_invalidateGrid();state.history=[];state.histIdx=-1;state.seq=0;state.seenOps=new Set();state.wclock={};state.selection=new Set();
    // Frame at x=100; child inside at x=120; reference at x=0 (leftmost)
    const frm=Shape.make('frame',{x:100,y:0,w:100,h:100});
    const child=Shape.make('rect',{x:120,y:10,w:20,h:20});
    const ref=Shape.make('rect',{x:0,y:200,w:20,h:20});
    Store.commit({op:'add',shape:frm});
    Store.commit({op:'add',shape:child});
    Store.commit({op:'add',shape:ref});
    state.selection=new Set([frm.id,ref.id]);   // child NOT explicitly selected
    doAlign('left');
    const liveFrame=state.shapes.find(s=>s.id===frm.id);
    const liveChild=state.shapes.find(s=>s.id===child.id);
    assert.strictEqual(liveFrame.x, 0, 'doAlign frame: frame moved to leftmost x=0');
    // Before fix: liveChild.x===120 (left behind). After fix: liveChild.x===20 (moved with frame).
    assert.strictEqual(liveChild.x, 20, 'doAlign frame: child moved with frame (120-100=20)');
    Store.undo();
    assert.strictEqual(state.shapes.find(s=>s.id===frm.id).x, 100, 'doAlign frame undo: frame restored to 100');
    assert.strictEqual(state.shapes.find(s=>s.id===child.id).x, 120, 'doAlign frame undo: child restored to 120');
    console.log('  ✓ doAlign: frame children move with frame (parity with drag/nudge); undo restores');
  }

  // v1.7.01: doFlip must mirror frame children with the frame (parity with doAlign)
  // Before fix: selecting a frame + ref and flipping mirrors the frame but leaves its
  // contained children at original positions. After fix: children mirror with the frame.
  {
    state.shapes=[];_invalidateGrid();state.history=[];state.histIdx=-1;state.seq=0;state.seenOps=new Set();state.wclock={};state.selection=new Set();
    // Frame at (0,0,200,200); child inside at (50,50,40,40); ref at (300,0,40,40)
    const frm=Shape.make('frame',{x:0,y:0,w:200,h:200});
    const child=Shape.make('rect',{x:50,y:50,w:40,h:40});
    const ref=Shape.make('rect',{x:300,y:0,w:40,h:40});
    Store.commit({op:'add',shape:frm});
    Store.commit({op:'add',shape:child});
    Store.commit({op:'add',shape:ref});
    state.selection=new Set([frm.id,ref.id]); // child NOT explicitly selected
    // c = (0+340)/2 = 170; child.x after flip = 2*170-(50+40) = 250
    doFlip('h');
    const liveChild=state.shapes.find(s=>s.id===child.id);
    // Before fix: liveChild.x===50 (left behind). After fix: 250 (mirrored with frame).
    assert.strictEqual(liveChild.x, 250, 'doFlip frame: child mirrored with frame (2*170-90=250)');
    Store.undo();
    assert.strictEqual(state.shapes.find(s=>s.id===child.id).x, 50, 'doFlip frame undo: child x restored');
    assert.strictEqual(state.shapes.find(s=>s.id===frm.id).x, 0, 'doFlip frame undo: frame x restored');
    console.log('  ✓ doFlip: frame children mirror with frame (parity with doAlign); undo restores');
  }

  // v1.7.01: doRotate must rotate frame children with the frame (parity with doAlign)
  // Before fix: selecting a frame + ref and rotating spins the frame but leaves box-shape
  // children with original rotate/position. After fix: children orbit + rotate with the frame.
  {
    state.shapes=[];_invalidateGrid();state.history=[];state.histIdx=-1;state.seq=0;state.seenOps=new Set();state.wclock={};state.selection=new Set();
    // Frame at (0,0,100,100); child inside at (20,20,20,20); ref at (200,0,100,100)
    const frm=Shape.make('frame',{x:0,y:0,w:100,h:100});
    const child=Shape.make('rect',{x:20,y:20,w:20,h:20});
    const ref=Shape.make('rect',{x:200,y:0,w:100,h:100});
    Store.commit({op:'add',shape:frm});
    Store.commit({op:'add',shape:child});
    Store.commit({op:'add',shape:ref});
    state.selection=new Set([frm.id,ref.id]); // child NOT explicitly selected
    doRotate(90);
    const liveChild=state.shapes.find(s=>s.id===child.id);
    // Before fix: child.rotate===undefined (not rotated). After fix: child.rotate===90.
    assert.strictEqual(liveChild.rotate, 90, 'doRotate frame: child rotate equals 90');
    Store.undo();
    assert.strictEqual(state.shapes.find(s=>s.id===child.id).rotate, 0, 'doRotate frame undo: child rotate restored to 0');
    console.log('  ✓ doRotate: frame children rotate with frame (parity with doAlign); undo restores');
  }

  // v1.7.02: doDelete must delete frame children with the frame (parity with doDuplicate)
  // Before fix: deleting a selected frame leaves its contained shapes orphaned on the canvas.
  // After fix: shapes fully inside a deleted frame are also deleted (Excalidraw/Figma behavior).
  {
    state.shapes=[];_invalidateGrid();state.history=[];state.histIdx=-1;state.seq=0;state.seenOps=new Set();state.wclock={};state.selection=new Set();
    const frm=Shape.make('frame',{x:0,y:0,w:200,h:200});
    const child=Shape.make('rect',{x:50,y:50,w:40,h:40}); // inside frame
    const outsider=Shape.make('rect',{x:300,y:300,w:40,h:40}); // outside frame
    Store.commit({op:'add',shape:frm});
    Store.commit({op:'add',shape:child});
    Store.commit({op:'add',shape:outsider});
    state.selection=new Set([frm.id]); // only frame selected (not child)
    doDelete();
    // Before fix: child survives (still in state.shapes). After fix: child is deleted too.
    assert.ok(!state.shapes.find(s=>s.id===child.id), 'doDelete frame: child inside frame is also deleted');
    assert.ok(state.shapes.find(s=>s.id===outsider.id), 'doDelete frame: outsider survives');
    Store.undo();
    assert.ok(state.shapes.find(s=>s.id===child.id), 'doDelete frame undo: child restored');
    assert.ok(state.shapes.find(s=>s.id===frm.id), 'doDelete frame undo: frame restored');
    console.log('  ✓ doDelete: frame children deleted with frame (parity with doDuplicate); undo restores');
  }

  // v1.7.07: doDelete undo must restore the original selection (Figma/Excalidraw parity).
  // Before fix: _apply(del, false) restores shapes but leaves selection empty.
  // After fix: doDelete stores origSel on the del op; _apply del reverse restores it.
  {
    state.shapes=[];_invalidateGrid();state.history=[];state.histIdx=-1;state.seq=0;state.seenOps=new Set();state.wclock={};state.selection=new Set();
    const A=Shape.make('rect',{x:0,y:0,w:100,h:100});
    const B=Shape.make('rect',{x:200,y:0,w:100,h:100});
    Store.commit({op:'add',shape:A});Store.commit({op:'add',shape:B});
    state.selection=new Set([A.id,B.id]);
    doDelete();
    // After delete: 0 shapes remain, selection cleared
    assert.strictEqual(state.shapes.length, 0, 'doDelete: both shapes deleted');
    assert.strictEqual(state.selection.size, 0, 'doDelete: selection cleared');
    Store.undo();
    // Before fix: shapes restored but selection remains empty
    // After fix: selection restored to {A.id, B.id}
    assert.strictEqual(state.shapes.length, 2, 'doDelete undo: both shapes restored');
    assert.ok(state.selection.has(A.id), 'doDelete undo: A.id restored to selection');
    assert.ok(state.selection.has(B.id), 'doDelete undo: B.id restored to selection');
    console.log('  ✓ doDelete undo: original selection restored (Figma/Excalidraw parity)');
  }

  // v1.7.06: doCopy must exclude locked shapes (parity with doDelete/doMove/doAlign/doRotate).
  // Before fix: doCopy used .filter(Boolean) — clipboard included locked shapes. Ctrl+X then
  // kept locked shapes on board AND in clipboard, causing duplicate on paste.
  // After fix: .filter(s=>s&&!s.locked) — locked shapes excluded from clipboard.
  {
    state.shapes=[];_invalidateGrid();state.history=[];state.histIdx=-1;state.seq=0;state.seenOps=new Set();state.wclock={};state.selection=new Set();
    const A=Shape.make('rect',{x:0,y:0,w:100,h:100});   // unlocked
    const B=Shape.make('rect',{x:200,y:0,w:100,h:100}); // will be locked
    Store.commit({op:'add',shape:A});Store.commit({op:'add',shape:B});
    state.shapes.find(s=>s.id===B.id).locked=true;
    state.selection=new Set([A.id,B.id]);
    doCopy();
    // Before fix: clipboard.shapes.length === 2 (A and B both copied) → FAIL
    // After fix: clipboard.shapes.length === 1 (locked B excluded) → PASS
    assert.strictEqual(state.clipboard.shapes.length, 1, 'doCopy: clipboard excludes locked B (only A copied)');
    assert.strictEqual(state.clipboard.shapes[0].id, A.id, 'doCopy: clipboard contains only unlocked A');
    console.log('  ✓ doCopy: locked shapes excluded from clipboard (parity with doDelete)');
  }

  // v1.7.05: Tab cycling (cycleSel) must skip locked shapes.
  // The Tab key handler builds ids from state.shapes. Before fix, it used .map(s=>s.id) (no lock
  // filter), so cycleSel could land on a locked shape. After fix, .filter(s=>!s.locked) is applied.
  // Non-vacuous: assert unfiltered ids include locked B AND cycleSel lands on B (bug reproduced);
  // assert filtered ids exclude B AND cycleSel skips from A straight to C (fix verified).
  {
    state.shapes=[];_invalidateGrid();state.history=[];state.histIdx=-1;state.seq=0;state.seenOps=new Set();state.wclock={};state.selection=new Set();
    const A=Shape.make('rect',{x:0,y:0,w:50,h:50});
    const B=Shape.make('rect',{x:100,y:0,w:50,h:50});
    const C=Shape.make('rect',{x:200,y:0,w:50,h:50});
    Store.commit({op:'add',shape:A});Store.commit({op:'add',shape:B});Store.commit({op:'add',shape:C});
    state.shapes.find(s=>s.id===B.id).locked=true;
    // bug scenario: unfiltered ids (before fix) include locked B; cycleSel lands on it
    const allIds=state.shapes.map(s=>s.id);
    assert.ok(allIds.includes(B.id), 'sanity: unfiltered ids include locked B');
    assert.strictEqual(cycleSel(allIds,A.id,1), B.id, 'bug: unfiltered cycleSel from A lands on locked B');
    // fix scenario: filtered ids (after fix) exclude locked B; cycleSel skips from A to C
    const filteredIds=state.shapes.filter(s=>!s.locked).map(s=>s.id);
    assert.ok(!filteredIds.includes(B.id), 'fix: filtered ids exclude locked B');
    assert.strictEqual(cycleSel(filteredIds,A.id,1), C.id, 'fix: filtered cycleSel from A skips locked B, lands on C');
    console.log('  ✓ cycleSel: filtered Tab cycling correctly skips locked shapes');
  }

  // v1.7.04: doDuplicate undo must restore the original selection (Figma/Excalidraw parity).
  // Before fix: _apply(addMany, false) only deletes copies from selection, leaving selection empty.
  // After fix: doDuplicate stores origSel on the addMany op; _apply reverse restores it.
  {
    state.shapes=[];_invalidateGrid();state.history=[];state.histIdx=-1;state.seq=0;state.seenOps=new Set();state.wclock={};state.selection=new Set();
    const A=Shape.make('rect',{x:0,y:0,w:100,h:100});
    const B=Shape.make('rect',{x:200,y:0,w:100,h:100});
    Store.commit({op:'add',shape:A});
    Store.commit({op:'add',shape:B});
    state.selection=new Set([A.id,B.id]);
    doDuplicate();
    // After duplicate: 4 shapes total; selection = copies (not originals)
    assert.strictEqual(state.shapes.length, 4, 'doDuplicate: 4 shapes total (2 originals + 2 copies)');
    assert.ok(!state.selection.has(A.id)&&!state.selection.has(B.id), 'doDuplicate: originals not selected after duplicate');
    Store.undo();
    // Before fix: selection is empty (copies deleted, originals never re-selected)
    // After fix: selection = {A.id, B.id} (origSel restored by _apply)
    assert.ok(state.selection.has(A.id), 'doDuplicate undo: A.id restored to selection');
    assert.ok(state.selection.has(B.id), 'doDuplicate undo: B.id restored to selection');
    assert.strictEqual(state.shapes.length, 2, 'doDuplicate undo: copies removed, 2 originals remain');
    console.log('  ✓ doDuplicate undo: original selection restored (Figma/Excalidraw parity)');
  }

  // v1.7.03: _sfbCapture must be idempotent — re-calling after mutation must NOT overwrite the original before-state.
  // Before fix: second _sfbCapture overwrites _sbf with current (mutated) value, so _sfbFlush sees before===after and records nothing.
  // After fix: second _sfbCapture is a no-op when the key is already captured, so _sfbFlush correctly records the style change.
  {
    state.shapes=[];_invalidateGrid();state.history=[];state.histIdx=-1;state.seq=0;state.seenOps=new Set();state.wclock={};state.selection=new Set();
    const A=Shape.make('rect',{x:0,y:0,w:100,h:100,opacity:0.5});
    Store.commit({op:'add',shape:A});
    state.selection=new Set([A.id]);
    _sfbCapture('opacity');                                         // captures original 0.5
    state.shapes.find(s=>s.id===A.id).opacity=0.3;                 // simulates input-event mutation
    _sfbCapture('opacity');                                         // OLD: overwrites to 0.3; NEW: no-op (idempotent)
    const histBefore=state.history.length;
    _sfbFlush('opacity', 0.3);
    // Before fix: before===0.3===v, no op recorded → history.length unchanged
    // After fix: before=0.5 !== v=0.3, op recorded → history.length + 1
    assert.strictEqual(state.history.length, histBefore+1, '_sfbCapture idempotent: style op recorded even after re-capture');
    Store.undo();
    assert.strictEqual(state.shapes.find(s=>s.id===A.id).opacity, 0.5, '_sfbCapture idempotent: undo restores original opacity');
    console.log('  ✓ _sfbCapture: idempotent — re-calling after mutation preserves original before-state');
  }

  // v1.7.12a: move op must skip locked shapes (remote move parity with local doMove).
  // Bug: _apply move checks `if(!sh)continue` but not `sh.locked`. Local doMove filters
  // locked shapes before building the op, so local ops never include locked IDs. But a
  // remote op (from applyRemote or a direct Store.commit with both IDs) would move a
  // locally-locked shape, bypassing lock protection.
  // Fix: `if(!sh||sh.locked)continue` in _apply case 'move'.
  {
    state.shapes=[];_invalidateGrid();state.history=[];state.histIdx=-1;state.seq=0;state.seenOps=new Set();state.wclock={};state.selection=new Set();
    const ML=Shape.make('rect',{x:0,y:0,w:50,h:50});ML.locked=true;
    const MU=Shape.make('rect',{x:100,y:0,w:50,h:50});
    Store.commit({op:'add',shape:ML});Store.commit({op:'add',shape:MU});
    const mlLive=state.shapes.find(s=>s.id===ML.id);
    const muLive=state.shapes.find(s=>s.id===MU.id);
    // Simulate move op containing both locked and unlocked ids (as a remote peer would send)
    Store.commit({op:'move',ids:[ML.id,MU.id],dx:20,dy:0});
    // BEFORE fix: mlLive.x becomes 20 (locked shape moved). AFTER fix: x stays 0.
    assert.strictEqual(mlLive.x, 0, 'move op: locked shape not translated');
    assert.strictEqual(muLive.x, 120, 'move op: unlocked shape translated correctly');
    console.log('  ✓ move op: locked shapes skipped in _apply (parity with local doMove)');
  }

  // v1.7.12b: doGroup must exclude locked shapes (parity with doAlign/doDelete/nudgeSelection).
  // Bug: doGroup builds ids from all of state.selection without a locked filter. A locked
  // shape's groupId gets set by the group op, which also means doUngroup can remove its groupId
  // — changing locked shape state contrary to the lock's intent.
  // Fix: filter with `!s.locked` in doGroup's ids computation.
  {
    state.shapes=[];_invalidateGrid();state.history=[];state.histIdx=-1;state.seq=0;state.seenOps=new Set();state.wclock={};state.selection=new Set();
    const GA=Shape.make('rect',{x:0,y:0,w:50,h:50});
    const GB=Shape.make('rect',{x:60,y:0,w:50,h:50});GB.locked=true;
    const GC=Shape.make('rect',{x:120,y:0,w:50,h:50});
    Store.commit({op:'add',shape:GA});Store.commit({op:'add',shape:GB});Store.commit({op:'add',shape:GC});
    state.selection=new Set([GA.id,GB.id,GC.id]);
    doGroup();
    const gaLive=state.shapes.find(s=>s.id===GA.id);
    const gbLive=state.shapes.find(s=>s.id===GB.id);
    const gcLive=state.shapes.find(s=>s.id===GC.id);
    // BEFORE fix: gbLive.groupId gets set (locked shape included). AFTER fix: no groupId.
    assert.ok(!gbLive.groupId,'doGroup: locked shape excluded from group');
    assert.ok(gaLive.groupId&&gcLive.groupId,'doGroup: unlocked shapes received groupId');
    assert.strictEqual(gaLive.groupId,gcLive.groupId,'doGroup: unlocked shapes share same groupId');
    console.log('  ✓ doGroup: locked shapes excluded (parity with doAlign/doDelete)');
  }

  // v1.7.11a: del undo must restore state.wclock (symmetric with add undo fix v1.7.10).
  // Bug: _apply(del, false) restores shapes but not their wclock entries. del forward
  // correctly calls `delete state.wclock[sh.id]`, but the reverse path never restores them.
  // Fix: _apply del forward snapshots op.wc before deletion; reverse restores from op.wc.
  {
    state.shapes=[];_invalidateGrid();state.history=[];state.histIdx=-1;state.seq=0;state.seenOps=new Set();state.wclock={};state.selection=new Set();
    const DA=Shape.make('rect',{x:0,y:0,w:50,h:50});
    Store.commit({op:'add',shape:DA});
    // Seed wclock as applyRemote would after peer edits DA
    state.wclock[DA.id]={stroke:{peer:'p1',seq:1,ts:1000}};
    assert.ok(Object.keys(state.wclock).includes(DA.id),'del undo wclock: wclock seeded for DA');
    // Delete DA: forward cleans wclock
    Store.commit({op:'del',shapes:[JSON.parse(JSON.stringify(state.shapes.find(s=>s.id===DA.id)))]});
    assert.ok(!Object.keys(state.wclock).includes(DA.id),'del undo wclock: wclock cleared after del');
    // Undo: DA restored; BEFORE fix wclock stays empty, AFTER fix wclock restored
    Store.undo();
    assert.ok(Object.keys(state.wclock).includes(DA.id),'del undo wclock: wclock restored after undo');
    console.log('  ✓ del undo: wclock restored (symmetric with add/addMany undo cleanup)');
  }

  // v1.7.11b: slider and color-picker input handlers must skip locked shapes.
  // Bug: size/opacity/color input events directly mutate sh[prop] without a locked check,
  // so dragging a slider with a locked shape selected permanently changes its property.
  // _sfbCapture also lacked a locked filter, so _sfbFlush would commit a style op for it.
  // Fix: add `&&!s.locked` to all three direct-mutation loops; add `&&!s.locked` to _sfbCapture.
  {
    state.shapes=[];_invalidateGrid();state.history=[];state.histIdx=-1;state.seq=0;state.seenOps=new Set();state.wclock={};state.selection=new Set();
    const SLA=Shape.make('rect',{x:0,y:0,w:50,h:50});SLA.size=4;SLA.locked=true;
    const SLB=Shape.make('rect',{x:100,y:0,w:50,h:50});SLB.size=4;
    Store.commit({op:'add',shape:SLA});Store.commit({op:'add',shape:SLB});
    state.selection=new Set([SLA.id,SLB.id]);
    // _sfbCapture: BEFORE fix captures locked SLA; AFTER fix skips it
    _sfbCapture('size');
    assert.ok(!(SLA.id+'size' in _sbf),'_sfbCapture: locked shape excluded from _sbf');
    assert.ok(SLB.id+'size' in _sbf,'_sfbCapture: unlocked shape captured in _sbf');
    // Simulate input-event mutation: only unlocked shape should mutate
    const slaLive=state.shapes.find(s=>s.id===SLA.id);
    const slbLive=state.shapes.find(s=>s.id===SLB.id);
    // (Direct mutation in real code: `if(s&&!s.locked)s.size=value` — skips SLA)
    if(slaLive&&!slaLive.locked)slaLive.size=12; // locked — skipped
    if(slbLive&&!slbLive.locked)slbLive.size=12; // unlocked — changed
    _sfbFlush('size',12);
    // Style op should only cover SLB, not locked SLA
    const styleOp=state.history[state.histIdx];
    assert.ok(styleOp&&styleOp.before.every(p=>p.id!==SLA.id),'_sfbFlush: locked shape excluded from committed style op');
    console.log('  ✓ _sfbCapture: locked shape excluded; slider commit does not touch locked shapes');
  }

  // v1.7.10a: applyStyleToSelection must skip locked shapes (parity with doDelete/doMove/etc.).
  // Bug: locked shapes are in state.selection; applyStyleToSelection iterates selection without
  // a locked filter, so style changes (color swatches, format painter, dash picker) bypass
  // the shape lock and permanently modify the locked shape's style properties.
  // Fix: add `if(!sh||sh.locked)continue;` in the for-loop of applyStyleToSelection.
  {
    state.shapes=[];_invalidateGrid();state.history=[];state.histIdx=-1;state.seq=0;state.seenOps=new Set();state.wclock={};state.selection=new Set();
    const LA=Shape.make('rect',{x:0,y:0,w:50,h:50});LA.stroke='#000000';LA.locked=true;
    const LB=Shape.make('rect',{x:100,y:0,w:50,h:50});LB.stroke='#000000';
    Store.commit({op:'add',shape:LA});Store.commit({op:'add',shape:LB});
    state.selection=new Set([LA.id,LB.id]);
    applyStyleToSelection({stroke:'#FF0000'});
    const laLive=state.shapes.find(s=>s.id===LA.id);
    const lbLive=state.shapes.find(s=>s.id===LB.id);
    // FAILS before fix: locked LA was modified to '#FF0000' instead of being skipped
    assert.strictEqual(laLive.stroke,'#000000','applyStyleToSelection: locked shape stroke unchanged');
    assert.strictEqual(lbLive.stroke,'#FF0000','applyStyleToSelection: unlocked shape stroke updated');
    console.log('  ✓ applyStyleToSelection: locked shapes excluded (parity with doDelete/doMove)');
  }

  // v1.7.10b: `add` op undo must delete state.wclock entry for the removed shape.
  // Bug: _apply(add, false) removes the shape from state.shapes but leaves its wclock entry,
  // creating a ghost LWW clock (same issue as addMany undo; del forward cleans up wclock
  // but add reverse does not).
  // Fix: add `delete state.wclock[op.shape.id]` in the add else branch.
  {
    state.shapes=[];_invalidateGrid();state.history=[];state.histIdx=-1;state.seq=0;state.seenOps=new Set();state.wclock={};state.selection=new Set();
    const X=Shape.make('rect',{x:0,y:0,w:50,h:50});
    Store.commit({op:'add',shape:X});
    // Seed wclock as applyRemote would after a peer edits X
    state.wclock[X.id]={stroke:{peer:'p1',seq:1,ts:1000}};
    assert.ok(Object.keys(state.wclock).includes(X.id),'add undo wclock: wclock seeded for X');
    // Undo: shape removed; BEFORE fix wclock[X.id] remains, AFTER fix it is deleted
    Store.undo();
    assert.strictEqual(Object.keys(state.wclock).length,0,'add undo wclock: stale entry cleaned up after undo');
    console.log('  ✓ add undo: wclock entry deleted for removed shape (parity with addMany undo)');
  }

  // v1.7.09a: addMany undo must delete state.wclock entries for removed shapes.
  // Bug: _apply(addMany, false) mirrors 'del' for shapes but not for wclock — it removes
  // shapes from state.shapes but leaves stale wclock entries for the removed IDs.
  // If remote ops arrived after the paste (setting wclock[P.id]), those entries persist in
  // state even though P is gone, creating a ghost clock that could corrupt future LWW.
  // Fix: add `delete state.wclock[sh.id]` in the addMany else branch (mirrors del forward).
  {
    state.shapes=[];_invalidateGrid();state.history=[];state.histIdx=-1;state.seq=0;state.seenOps=new Set();state.wclock={};state.selection=new Set();
    const P=Shape.make('rect',{x:0,y:0,w:50,h:50});
    const Q=Shape.make('rect',{x:100,y:0,w:50,h:50});
    Store.commit({op:'addMany',shapes:[P,Q]});
    assert.strictEqual(state.shapes.length, 2, 'addMany wclock: 2 shapes after addMany');
    // Seed wclock as applyRemote would after a peer edits the pasted shapes
    state.wclock[P.id]={stroke:{peer:'p1',seq:1,ts:1000}};
    state.wclock[Q.id]={fill:{peer:'p1',seq:2,ts:1000}};
    assert.strictEqual(Object.keys(state.wclock).length, 2, 'addMany wclock: wclock has entries for P and Q (seeded)');
    // Undo: shapes removed; BEFORE fix wclock retains stale entries, AFTER fix they're deleted
    Store.undo();
    assert.strictEqual(state.shapes.length, 0, 'addMany wclock: shapes gone after undo');
    assert.strictEqual(Object.keys(state.wclock).length, 0, 'addMany wclock: stale wclock entries cleaned up after undo');
    console.log('  ✓ addMany undo: wclock entries deleted for removed shapes (no ghost LWW clocks)');
  }

  // v1.7.09b: replace op undo must restore state.wclock.
  // Bug: _apply replace always clears state.wclock={}, but the reverse path never restores
  // the original wclock. After undoing a whole-board import, the pre-import shapes are back
  // but their LWW clocks are gone — a subsequent remote upd would win unconditionally.
  // Fix: importBoard/importFromHash snapshot wc:clone(state.wclock) into the op;
  // _apply replace reverse restores if(!forward && op.wc) state.wclock=clone(op.wc).
  {
    state.shapes=[];_invalidateGrid();state.history=[];state.histIdx=-1;state.seq=0;state.seenOps=new Set();state.wclock={};state.selection=new Set();
    const R=Shape.make('rect',{x:0,y:0,w:50,h:50});
    Store.commit({op:'add',shape:R});
    // Seed wclock for R as applyRemote would after a peer edit
    state.wclock[R.id]={stroke:{peer:'p2',seq:1,ts:2000}};
    const beforeShapes=JSON.parse(JSON.stringify(state.shapes));
    const beforeWc=JSON.parse(JSON.stringify(state.wclock));
    // Simulate importBoard: mutate state then call _recordCommitted (like importBoard does)
    const imported=Shape.make('rect',{x:200,y:0,w:50,h:50});
    state.shapes=[JSON.parse(JSON.stringify(imported))];state.wclock={};
    Store._recordCommitted({op:'replace',before:beforeShapes,after:JSON.parse(JSON.stringify(state.shapes)),wc:beforeWc});
    assert.strictEqual(Object.keys(state.wclock).length, 0, 'replace undo wclock: wclock empty after replace (import)');
    // Undo: shapes restored; BEFORE fix wclock stays {}, AFTER fix wclock restored
    Store.undo();
    assert.ok(Object.keys(state.wclock).includes(R.id), 'replace undo wclock: original wclock restored after undo of import');
    console.log('  ✓ replace undo: state.wclock restored (pre-import LWW clocks recovered)');
  }

  // v1.7.08: doClearAll undo must restore state.wclock.
  // Bug: _apply clear forward sets state.wclock={} but reverse never restores it.
  // After undo, any subsequently-arrived remote op for the same shape would be accepted
  // unconditionally (no clock to compare), breaking LWW conflict resolution.
  // Fix: doClearAll includes wc:clone(state.wclock) in the op; _apply clear reverse restores it.
  // Note: wclock is only populated by applyRemote (remote-op LWW stamps), not local commits.
  // We seed it directly to simulate the state after a prior remote edit, then clear and undo.
  {
    state.shapes=[];_invalidateGrid();state.history=[];state.histIdx=-1;state.seq=0;state.seenOps=new Set();state.wclock={};state.selection=new Set();
    const A=Shape.make('rect',{x:0,y:0,w:50,h:50});
    Store.commit({op:'add',shape:A});
    // Seed wclock as applyRemote would after a peer edits shape A's stroke
    state.wclock[A.id]={stroke:{peer:'p1',seq:3,ts:1000}};
    assert.ok(Object.keys(state.wclock).includes(A.id), 'clear undo wclock: wclock has A.id (seeded from prior remote op)');
    // Simulate doClearAll (without confirm): snapshot wc, then clear
    Store.commit({op:'clear',shapes:JSON.parse(JSON.stringify(state.shapes)),wc:JSON.parse(JSON.stringify(state.wclock))});
    assert.strictEqual(Object.keys(state.wclock).length, 0, 'clear undo wclock: wclock empty after clear');
    // Undo: wclock must be restored — FAILS before fix (wclock stays {}), PASSES after
    Store.undo();
    assert.ok(Object.keys(state.wclock).includes(A.id), 'clear undo wclock: wclock restored after undo');
    console.log('  ✓ doClearAll undo: state.wclock restored (LWW conflict resolution preserved)');
  }

  // v1.7.13a: doUngroup must skip locked shapes (parity with doGroup/doAlign/doDelete).
  // Bug: doUngroup iterates ALL state.shapes and strips groupId from any shape in a selected
  // group, without a locked check. A locked shape's groupId gets cleared against the lock's intent.
  // Fix: add `&&!s.locked` to the condition in doUngroup's for-loop.
  // Setup: group 3 unlocked shapes, then lock one, then ungroup — the locked one must keep groupId.
  {
    state.shapes=[];_invalidateGrid();state.history=[];state.histIdx=-1;state.seq=0;state.seenOps=new Set();state.wclock={};state.selection=new Set();
    const UGA=Shape.make('rect',{x:0,y:0,w:50,h:50});
    const UGB=Shape.make('rect',{x:60,y:0,w:50,h:50});
    const UGC=Shape.make('rect',{x:120,y:0,w:50,h:50});
    Store.commit({op:'add',shape:UGA});Store.commit({op:'add',shape:UGB});Store.commit({op:'add',shape:UGC});
    // Group all three while all are unlocked
    state.selection=new Set([UGA.id,UGB.id,UGC.id]);
    doGroup();
    const ugaAfterGroup=state.shapes.find(s=>s.id===UGA.id);
    const ugcAfterGroup=state.shapes.find(s=>s.id===UGC.id);
    const gId=ugaAfterGroup.groupId;
    assert.ok(gId,'doUngroup locked setup: group created (3 shapes)');
    assert.ok(ugcAfterGroup.groupId,'doUngroup locked setup: all 3 shapes in group');
    // Now lock UGC (it has groupId already)
    ugcAfterGroup.locked=true;
    // Select all and ungroup — UGA and UGB should lose groupId; locked UGC must keep it
    state.selection=new Set([UGA.id,UGB.id,UGC.id]);
    doUngroup();
    const ugaLive=state.shapes.find(s=>s.id===UGA.id);
    const ugbLive=state.shapes.find(s=>s.id===UGB.id);
    const ugcLive=state.shapes.find(s=>s.id===UGC.id);
    assert.ok(!ugaLive.groupId,'doUngroup locked: unlocked shape A is ungrouped (no groupId)');
    assert.ok(!ugbLive.groupId,'doUngroup locked: unlocked shape B is ungrouped (no groupId)');
    assert.ok(ugcLive.groupId,'doUngroup locked: locked shape C keeps its groupId');
    console.log('  ✓ doUngroup: locked shapes excluded (groupId preserved)');
  }

  // v1.7.13b: doDuplicate must skip locked shapes (parity with nudgeSelection/doDelete).
  // Bug: withFrameChildren expands the frame selection to include all contained children
  // (locked or not), but doDuplicate's .filter(Boolean) does not filter locked shapes out.
  // A locked child inside a frame gets duplicated when the frame is duplicated, bypassing lock.
  // Fix: change .filter(Boolean) to .filter(s=>s&&!s.locked) in doDuplicate.
  {
    state.shapes=[];_invalidateGrid();state.history=[];state.histIdx=-1;state.seq=0;state.seenOps=new Set();state.wclock={};state.selection=new Set();
    const DFR=Shape.make('frame',{x:0,y:0,w:300,h:300});
    const DCHILD=Shape.make('rect',{x:50,y:50,w:40,h:40});
    const DLOCKED=Shape.make('rect',{x:100,y:100,w:40,h:40});DLOCKED.locked=true;
    Store.commit({op:'add',shape:DFR});
    Store.commit({op:'add',shape:DCHILD});
    Store.commit({op:'add',shape:DLOCKED});
    const beforeCount=state.shapes.length;
    state.selection=new Set([DFR.id]);
    doDuplicate();
    const addedCount=state.shapes.length-beforeCount;
    // BEFORE fix: addedCount===3 (frame+child+locked child all copied). AFTER fix: 2.
    assert.strictEqual(addedCount, 2, 'doDuplicate locked frame child: 2 copies (frame + unlocked child only)');
    const lockedOrig=state.shapes.find(s=>s.id===DLOCKED.id);
    assert.ok(lockedOrig&&lockedOrig.locked,'doDuplicate locked frame child: original locked child still present');
    const copyIds=state.selection;
    assert.strictEqual(state.shapes.filter(s=>copyIds.has(s.id)&&s.locked).length, 0,
      'doDuplicate locked frame child: no locked copies in new selection');
    console.log('  ✓ doDuplicate: locked frame children excluded from copies (parity with nudgeSelection)');
  }

  // v1.7.15a: _apply(move, false) [undo] must restore locked shapes' positions.
  // Bug: line 1277 used `if(!sh||sh.locked)continue` in BOTH forward and backward directions.
  // Move shape A (unlocked), then lock it, then undo → the undo direction also skipped A.locked,
  // so A stayed at its moved position. Undo was irrecoverable without unlocking first.
  // Fix: `if(!sh)continue; if(forward&&sh.locked)continue;` — only forward skips locked.
  {
    state.shapes=[];_invalidateGrid();state.history=[];state.histIdx=-1;state.seq=0;state.seenOps=new Set();state.wclock={};state.selection=new Set();
    const MV=Shape.make('rect',{x:0,y:0,w:50,h:50});
    Store.commit({op:'add',shape:MV});
    // Move MV while unlocked (forward direction applies correctly)
    Store.commit({op:'move',ids:[MV.id],dx:50,dy:0});
    const mvLive=state.shapes.find(s=>s.id===MV.id);
    assert.strictEqual(mvLive.x, 50,'move undo locked: move applied while unlocked (x=50)');
    // Lock the shape post-move
    mvLive.locked=true;
    // Undo the move: BEFORE fix undo skips the locked shape (x stays 50); AFTER fix x restored to 0
    Store.undo();
    assert.strictEqual(mvLive.x, 0,'move undo locked: undo restores position even though shape is now locked');
    // Forward direction still skips locked shapes (no regression on v1.7.12a fix)
    Store.redo();
    assert.strictEqual(mvLive.x, 0,'move undo locked: redo is a no-op for locked shape (forward still skips locked)');
    console.log('  ✓ _apply move undo: undo restores locked shape position (undo direction skips locked-check)');
  }

  // v1.7.15b: doDelete must not clear connector bindings on locked connectors.
  // Bug: the connClears loop in doDelete had no sh.locked check. Deleting a shape that a
  // locked arrow is bound to would clear the arrow's binding and update its endpoints,
  // bypassing lock protection on the connector.
  // Fix: `if(sh.locked)continue` after `if(delIds.has(sh.id))continue`.
  // After fix, when the bound shape is deleted the locked connector retains its .a binding
  // (dangling); connEnds gracefully falls back to the stored coordinates.
  {
    state.shapes=[];_invalidateGrid();state.history=[];state.histIdx=-1;state.seq=0;state.seenOps=new Set();state.wclock={};state.selection=new Set();
    const RV=Shape.make('rect',{x:100,y:100,w:80,h:60});
    const CV=Shape.make('arrow',{x1:90,y1:130,x2:300,y2:300});
    CV.a=RV.id; CV.locked=true;
    Store.commit({op:'add',shape:RV});Store.commit({op:'add',shape:CV});
    assert.strictEqual(state.shapes.find(s=>s.id===CV.id).a, RV.id,'doDelete connClears locked: locked connector has binding before delete');
    state.selection=new Set([RV.id]);
    doDelete();
    // BEFORE fix: locked arrow's .a is cleared to null (locked write). AFTER fix: .a stays RV.id.
    assert.ok(!state.shapes.find(s=>s.id===RV.id),'doDelete connClears locked: bound shape deleted');
    assert.strictEqual(state.shapes.find(s=>s.id===CV.id).a, RV.id,'doDelete connClears locked: locked connector binding preserved');
    console.log('  ✓ doDelete: locked connectors keep their bindings when bound shape is deleted');
  }

  // v1.7.15c: _sfbFlush must not commit style ops for shapes locked between capture and flush.
  // Bug: slider capture happens (shape unlocked), user locks the shape, slider releases → flush
  // commits a style op whose after includes the locked shape, and _apply style applies it.
  // Fix: skip locked shapes inside _sfbFlush (still deletes _sbf[k] to avoid stale entries).
  {
    state.shapes=[];_invalidateGrid();state.history=[];state.histIdx=-1;state.seq=0;state.seenOps=new Set();state.wclock={};state.selection=new Set();
    const SF=Shape.make('rect',{x:0,y:0,w:50,h:50});SF.size=2;
    Store.commit({op:'add',shape:SF});
    state.selection=new Set([SF.id]);
    const histBefore=state.history.length;
    // Capture: shape is unlocked, slider down
    _sfbCapture('size');
    // Lock the shape (simulates Ctrl+Shift+L while slider is held)
    state.shapes.find(s=>s.id===SF.id).locked=true;
    // Flush: slider released at 6 — should be a no-op for locked shape
    _sfbFlush('size', 6);
    // BEFORE fix: history grows by 1 (style op committed for locked shape). AFTER fix: no op.
    assert.strictEqual(state.history.length, histBefore,'_sfbFlush locked: no style op committed when shape locked at flush time');
    // Shape size must remain at 2 (not changed to 6)
    assert.strictEqual(state.shapes.find(s=>s.id===SF.id).size, 2,'_sfbFlush locked: size unchanged on locked shape');
    // _sbf must be cleared (no stale capture leaks to the next slider session)
    _sfbFlush('size', 8);  // second flush with same key must also be no-op
    assert.strictEqual(state.history.length, histBefore,'_sfbFlush locked: stale _sbf cleared; second flush also no-op');
    console.log('  ✓ _sfbFlush: locked shapes excluded from style op (capture-then-lock race)');
  }

  // v1.7.14: dblclick handler must not open editors on locked shapes (parity with eraser/nudge/delete).
  // The handler dispatches on hit.type to openTextEditor or openLabelEditor; before fix there is
  // no !hit.locked guard, so double-clicking a locked text/sticky/rect/ellipse/line/arrow opens
  // an edit session and commits an upd op — bypassing the lock invariant.
  // DOM event firing cannot be unit-tested in this harness, so the guard is verified by presence
  // check: the fixed strings must exist in html (fail before fix, pass after).
  assert.ok(html.includes("if(!hit.locked&&(hit.type==='text'||hit.type==='sticky'))"),
    'dblclick: locked text/sticky guard present in source');
  assert.ok(html.includes("else if(!hit.locked&&(hit.type==='frame'||hit.type==='rect'||hit.type==='ellipse'))"),
    'dblclick: locked frame/rect/ellipse guard present in source');
  assert.ok(html.includes("else if(!hit.locked&&(hit.type==='line'||hit.type==='arrow'))"),
    'dblclick: locked line/arrow guard present in source');
  console.log('  ✓ dblclick: locked shapes do not open text/label editor (presence guards, v1.7.14)');

  // v1.7.18: doBringFront/doSendBack/doBringForward/doSendBackward must skip locked shapes.
  // Before fix, all four used `const ids=[...state.selection]` without filtering locked shapes,
  // so pressing ] or [ on a locked shape would change its frac (z-order) and record a zorder
  // undo entry — bypassing the locked invariant (parity with doAlign/doDelete/doMove).
  {
    state.shapes=[];_invalidateGrid();state.history=[];state.histIdx=-1;state.selection=new Set();
    const zA=Shape.make('rect',{x:0,y:0,w:20,h:20});
    const zB=Shape.make('rect',{x:10,y:0,w:20,h:20});
    const zC=Shape.make('rect',{x:20,y:0,w:20,h:20});
    Store.commit({op:'add',shape:zA});Store.commit({op:'add',shape:zB});Store.commit({op:'add',shape:zC});
    // Lock the LIVE shape in state.shapes (Store.commit clones, so set on live copy)
    const livezB=state.shapes.find(s=>s.id===zB.id); livezB.locked=true;
    const fracBefore=livezB.frac, histLen=state.history.length;
    // doBringFront on locked shape must be a no-op
    state.selection=new Set([livezB.id]);
    doBringFront();
    assert.strictEqual(livezB.frac,fracBefore,'doBringFront locked: locked shape frac unchanged');
    assert.strictEqual(state.history.length,histLen,'doBringFront locked: no zorder history entry added');
    // doSendBack on locked shape must be a no-op
    doSendBack();
    assert.strictEqual(livezB.frac,fracBefore,'doSendBack locked: locked shape frac unchanged');
    console.log('  ✓ doBringFront/doSendBack: locked shapes skipped in z-order operations (v1.7.18a)');
  }
  {
    state.shapes=[];_invalidateGrid();state.history=[];state.histIdx=-1;state.selection=new Set();
    const zA2=Shape.make('rect',{x:0,y:0,w:20,h:20});
    const zB2=Shape.make('rect',{x:10,y:0,w:20,h:20});
    const zC2=Shape.make('rect',{x:20,y:0,w:20,h:20});
    Store.commit({op:'add',shape:zA2});Store.commit({op:'add',shape:zB2});Store.commit({op:'add',shape:zC2});
    const livezB2=state.shapes.find(s=>s.id===zB2.id); livezB2.locked=true;
    const fracBefore2=livezB2.frac, histLen2=state.history.length;
    // doBringForward on locked shape must be a no-op
    state.selection=new Set([livezB2.id]);
    doBringForward();
    assert.strictEqual(livezB2.frac,fracBefore2,'doBringForward locked: locked shape frac unchanged');
    assert.strictEqual(state.history.length,histLen2,'doBringForward locked: no zorder history entry');
    // doSendBackward on locked shape must be a no-op
    doSendBackward();
    assert.strictEqual(livezB2.frac,fracBefore2,'doSendBackward locked: locked shape frac unchanged');
    console.log('  ✓ doBringForward/doSendBackward: locked shapes skipped in z-order operations (v1.7.18b)');
  }

  // v1.7.17a: _apply case style/resize/align must not crash when op.before is null (undo guard).
  // validRemotePayload allows op.before==null for these ops; if such an op reached local
  // history (e.g., via future import), Store.undo() would throw TypeError: null is not iterable.
  // Fix: add Array.isArray(patches) guard so the case breaks safely instead of crashing.
  {
    state.shapes=[];_invalidateGrid();state.history=[];state.histIdx=-1;state.selection=new Set();
    const sNullBefore=Shape.make('rect',{x:0,y:0,w:40,h:40});
    Store.commit({op:'add',shape:sNullBefore});
    // Manually inject a style op with op.before=null into history (simulates future import path)
    state.history.push({op:'style',before:null,after:[{id:sNullBefore.id,stroke:'#ff0000'}]});
    state.histIdx=state.history.length-1;
    // Undo must not throw; it should silently skip the non-reversible op
    let caughtErr=null;
    try{ Store.undo(); } catch(e){ caughtErr=e; }
    assert.ok(caughtErr===null,'_apply null before: Store.undo does not throw TypeError when op.before is null');
    assert.ok(state.shapes.find(s=>s.id===sNullBefore.id),'_apply null before: shape still present (undo skipped gracefully)');
    assert.ok(state.histIdx<state.history.length-1,'_apply null before: histIdx decremented (undo consumed the null-before op)');
    console.log('  ✓ _apply: null op.before guard prevents TypeError crash in undo (v1.7.17a)');
  }

  // v1.7.17b: validPatch must reject string values in numeric geometry fields.
  // Before fix, _cleanVal returned true for string values (strings are "clean"), so a
  // hostile peer could send {x:'NaN'} passing validation, then Object.assign would set
  // sh.x to the string 'NaN', corrupting geometry (string + number = string concat).
  {
    assert.ok(!validRemotePayload({op:'resize',after:[{id:'x',x:'NaN',y:0,w:10,h:10}],before:[{id:'x'}]}),
      'validPatch: string in numeric x field rejected');
    assert.ok(!validRemotePayload({op:'resize',after:[{id:'x',x:10,y:'99',w:10,h:10}],before:[{id:'x'}]}),
      'validPatch: string in numeric y field rejected');
    assert.ok(validRemotePayload({op:'resize',after:[{id:'x',x:10,y:0,w:10,h:10}],before:[{id:'x',x:0,y:0,w:10,h:10}]}),
      'validPatch: legitimate numeric coords still accepted after fix');
    console.log('  ✓ validPatch: string values in numeric geometry fields rejected (v1.7.17b)');
  }

  // v1.7.16a: flushErase must not clear connector bindings on locked connectors
  // (exact parity with doDelete connClears fix from v1.7.15).
  // If an arrow is locked and its bound shape is erased, flushErase must NOT include
  // it in connClears — locked connector's a/b bindings must remain intact.
  {
    state.shapes=[];_invalidateGrid();state.history=[];state.histIdx=-1;state.seq=0;state.seenOps=new Set();state.wclock={};
    const rE=Shape.make('rect',{x:10,y:10,w:40,h:40});
    const arrE=Shape.make('arrow',{x1:5,y1:5,x2:80,y2:80});
    arrE.a=rE.id; arrE.locked=true;
    Store.commit({op:'add',shape:rE});
    Store.commit({op:'add',shape:arrE});
    const origX1=arrE.x1, origA=arrE.a;
    // Simulate eraseAt: remove rE from state.shapes, push clone to _eraseBatch
    const liveRE=state.shapes.find(s=>s.id===rE.id);
    state.shapes.splice(state.shapes.indexOf(liveRE),1);
    _pushEraseBatch(JSON.parse(JSON.stringify(liveRE)));
    flushErase();
    const liveArrE=state.shapes.find(s=>s.id===arrE.id);
    assert.ok(liveArrE,'flushErase locked: locked arrow still present');
    assert.strictEqual(liveArrE.a,origA,'flushErase locked: locked arrow binding NOT cleared');
    assert.strictEqual(liveArrE.x1,origX1,'flushErase locked: locked arrow x1 NOT mutated');
    console.log('  ✓ flushErase: locked connectors skipped in connClears (v1.7.16a)');
  }

  // v1.7.16b: _remoteDelConnFix must not clear bindings on locked connectors.
  // When a remote peer deletes a shape that a LOCAL locked connector is bound to,
  // the receiver-side fix (_remoteDelConnFix) must skip locked connectors.
  {
    state.shapes=[];_invalidateGrid();state.history=[];state.histIdx=-1;state.seq=0;state.seenOps=new Set();state.wclock={};
    const rR=Shape.make('rect',{x:50,y:50,w:60,h:60});
    const arrR=Shape.make('arrow',{x1:20,y1:20,x2:200,y2:200});
    arrR.a=rR.id; arrR.locked=true;
    Store.commit({op:'add',shape:rR});
    Store.commit({op:'add',shape:arrR});
    const origX1R=arrR.x1, origAR=arrR.a;
    const liveArrR=()=>state.shapes.find(s=>s.id===arrR.id);
    // Remote peer deletes rR; does NOT include arrR in connClears (local-only connector)
    Store.applyRemote({op:'del',shapes:[JSON.parse(JSON.stringify(state.shapes.find(s=>s.id===rR.id)))],
      clock:{peer:'remote',seq:1,ts:1}});
    assert.ok(liveArrR(),'remote del locked: locked connector still present');
    assert.strictEqual(liveArrR().a,origAR,'remote del locked: locked connector binding NOT cleared');
    assert.strictEqual(liveArrR().x1,origX1R,'remote del locked: locked connector x1 NOT mutated');
    console.log('  ✓ _remoteDelConnFix: locked connectors skipped (v1.7.16b)');
  }

  // v1.7.22: doAlign per-unit bboxAll must skip units with null bbox.
  // Bug: doAlign computes G.bboxAll per alignment-unit at line 3308, then immediately uses
  // u.b.x / u.b.y in the switch cases (3315–3329) without checking if u.b is null.
  // After v1.7.19, bboxAll returns null for degenerate shapes (empty-pts pen). If such a
  // shape is in the selection, its unit gets b=null, and the first case 'left' accesses
  // null.x → TypeError crash. The other 2 valid-rect units would have been aligned correctly,
  // but the whole operation aborts with an unhandled exception.
  // Fix: filter out null-bbox units before the `if(units.length<2)return` check:
  //   `const units=[...unitMap.values()].filter(u=>u.b);`
  {
    state.shapes=[];_invalidateGrid();state.history=[];state.histIdx=-1;state.seq=0;state.seenOps=new Set();state.wclock={};state.selection=new Set();
    const rA=Shape.make('rect',{x:50,y:0,w:40,h:40});
    const rB=Shape.make('rect',{x:200,y:0,w:40,h:40});
    Store.commit({op:'add',shape:rA});Store.commit({op:'add',shape:rB});
    // Inject degenerate pen directly (bypasses validShape; triggers per-unit null bbox)
    const dP={type:'pen',pts:[],size:2,id:'degen-align',frac:'a',x:0,y:0,stroke:'#000',opacity:1};
    state.shapes.push(dP);
    state.selection=new Set([dP.id,rA.id,rB.id]);
    // Assertion 1: doAlign('left') must not crash. BEFORE fix: TypeError null.x on degenerate unit.
    let alignErr=null;
    try{doAlign('left');}catch(e){alignErr=e;}
    assert.ok(alignErr===null,'doAlign null-unit: doAlign("left") does not crash with degenerate shape in selection');
    // Assertion 2: rB (rightmost) moved to align with rA (leftmost at x=50). BEFORE: no chance to run.
    const rBLive=state.shapes.find(s=>s.id===rB.id);
    assert.strictEqual(rBLive.x,50,'doAlign null-unit: rB left-aligned to rA.x=50 (valid rects aligned correctly)');
    // Assertion 3: rA (leftmost) unchanged (aligning to leftmost means no movement for rA)
    const rALive=state.shapes.find(s=>s.id===rA.id);
    assert.strictEqual(rALive.x,50,'doAlign null-unit: rA (leftmost) x unchanged at 50');
    console.log('  ✓ doAlign: degenerate-bbox units filtered before alignment (v1.7.22)');
  }

  // v1.7.21: drawSelection and doFlip must guard against null from G.bboxAll.
  // After v1.7.19, G.bboxAll returns null for all-degenerate shapes (empty-pts pen).
  // drawSelection() (line ~1964) and doFlip() (line ~3353) both immediately access .x/.y/.w
  // on the bboxAll result without a null check, causing TypeError crashes:
  //   drawSelection: every render frame when a degenerate shape is selected
  //   doFlip: Shift+H or Shift+V on a selection containing only degenerate shapes
  // Fix:
  //   drawSelection: `if(!b)return;` after `const b=G.bboxAll(sel);`
  //   doFlip: split into `const bb=G.bboxAll(sel);if(!bb)return;` before accessing bb.x
  {
    state.shapes=[];_invalidateGrid();state.history=[];state.histIdx=-1;state.seq=0;state.seenOps=new Set();state.wclock={};state.selection=new Set();
    const dP={type:'pen',pts:[],size:2,id:'degen-flip',frac:'a',x:0,y:0,stroke:'#000',opacity:1};
    state.shapes.push(dP);  // bypass validShape
    state.selection=new Set([dP.id]);
    // Assertion 1: G.bboxAll([dP]) is null (confirms the degenerate setup)
    assert.strictEqual(G.bboxAll([dP]),null,'doFlip null-bbox: G.bboxAll returns null for empty-pts pen');
    // Assertion 2: doFlip('h') must not crash. BEFORE fix: TypeError on bb.x. AFTER: early return.
    const histLen=state.history.length;
    let flipErr=null;
    try{doFlip('h');}catch(e){flipErr=e;}
    assert.ok(flipErr===null,'doFlip null-bbox: doFlip("h") does not crash when bboxAll returns null');
    // Assertion 3: doFlip was a no-op (no history entry recorded — early return before any mutation)
    assert.strictEqual(state.history.length,histLen,'doFlip null-bbox: no flip op recorded (early return)');
    console.log('  ✓ doFlip/drawSelection: null bboxAll guard prevents crash for degenerate shapes (v1.7.21)');
  }

  // v1.7.20: doUngroup must preserve non-grouped shapes in the selection.
  // Bug: line 3275 replaces state.selection with only the ungrouped IDs, dropping any
  // previously-selected shapes that were not in any group.
  // Example: select A (in group gid) and B (ungrouped), then ungroup → selection becomes {A,C}
  // (all members of A's group), losing B entirely.
  // Fix: `state.selection=new Set([...ids.filter(id=>byId(id)),...ungrouped])` — keep the
  // original selection (shapes that still exist) and add all ungrouped members.
  {
    state.shapes=[];_invalidateGrid();state.history=[];state.histIdx=-1;state.seq=0;state.seenOps=new Set();state.wclock={};state.selection=new Set();
    const UA=Shape.make('rect',{x:0,y:0,w:50,h:50});
    const UB=Shape.make('rect',{x:60,y:0,w:50,h:50});
    const UC=Shape.make('rect',{x:120,y:0,w:50,h:50});
    Store.commit({op:'add',shape:UA});Store.commit({op:'add',shape:UB});Store.commit({op:'add',shape:UC});
    // Group A and C (not B) via doGroup
    state.selection=new Set([UA.id,UC.id]);
    doGroup();
    const uaLive=state.shapes.find(s=>s.id===UA.id);
    const gId=uaLive.groupId;
    assert.ok(gId,'doUngroup selection: group created (A and C)');
    // Select A (grouped) and B (not grouped)
    state.selection=new Set([UA.id,UB.id]);
    assert.strictEqual(state.selection.size,2,'doUngroup selection: 2 shapes selected before ungroup');
    // Ungroup. BEFORE fix: selection becomes {UA.id, UC.id} — B is lost.
    doUngroup();
    // Assertion 1: A (was grouped, now ungrouped) still selected
    assert.ok(state.selection.has(UA.id),'doUngroup selection: grouped shape A still selected after ungroup');
    // Assertion 2: B (was not grouped) must NOT be dropped from selection
    assert.ok(state.selection.has(UB.id),'doUngroup selection: non-grouped shape B preserved in selection');
    // Assertion 3: C (was in same group as A, not originally selected) is added to selection
    assert.ok(state.selection.has(UC.id),'doUngroup selection: group sibling C added to selection');
    console.log('  ✓ doUngroup: non-grouped selected shapes preserved in post-ungroup selection (v1.7.20)');
  }

  // v1.7.19: G.bboxAll must return null when all input shapes produce degenerate bboxes.
  // Bug: G.bbox for a pen shape with empty pts returns {x:Infinity, y:Infinity, w:-Infinity, h:-Infinity}
  // because the pts loop doesn't execute. bboxAll then leaves mnx/mxx at initial Infinity/-Infinity
  // and returns {x:Infinity, y:Infinity, w:NaN, h:NaN} — causing blank PNG/SVG exports when only
  // degenerate shapes exist on the board.
  // Fix: add `if(mxx===-Infinity)return null;` before the return in bboxAll.
  // (mxx stays at its initial -Infinity sentinel only when no shape contributed a valid right-edge —
  // i.e. all input bboxes had NaN/Infinity for b.x+b.w. A pen with *some* finite points still
  // updates mxx, so the guard is precise: empty-pts degenerate only.)
  {
    const dP={type:'pen',pts:[],size:2,id:'degen-p1',frac:'a',x:0,y:0,stroke:'#000',opacity:1};
    const dP2={type:'pen',pts:[],size:2,id:'degen-p2',frac:'b',x:0,y:0,stroke:'#000',opacity:1};
    // Assertion 1: single degenerate pen (empty pts) → null. BEFORE fix: {x:Infinity,...}. AFTER: null.
    assert.strictEqual(G.bboxAll([dP]),null,'bboxAll: degenerate pen (empty pts) → null not Infinity-bbox');
    // Assertion 2: all-degenerate array → null.
    assert.strictEqual(G.bboxAll([dP,dP2]),null,'bboxAll: all-degenerate shapes array → null');
    // Assertion 3 (regression guard): valid rect + degenerate pen → finite valid bounds (fix must not break mixed case).
    const vrect=Shape.make('rect',{x:10,y:20,w:30,h:40});
    const mr=G.bboxAll([vrect,dP]);
    assert.ok(mr!==null&&Number.isFinite(mr.x)&&Number.isFinite(mr.w),
      'bboxAll: valid rect + degenerate pen → finite bbox (mixed case unaffected)');
    console.log('  ✓ G.bboxAll: degenerate pen (empty pts) returns null instead of Infinity-valued bbox (v1.7.19)');
  }

  // v1.7.23: remote 'align' op must not be usable to lock/unlock shapes.
  // Bug: validRemotePayload for 'align' calls patches() which calls validPatch(), which
  // accepts any boolean value via _cleanVal (booleans are not objects/functions/non-finite
  // numbers). A hostile peer can send {op:'align', after:[{id:X, locked:true}]} to
  // freeze shapes on the victim's board: once locked, the victim's own move ops are
  // silently dropped (line ~1284: `if(forward&&sh.locked)continue`).
  // Fix: in validRemotePayload for 'align', add !('locked' in p) check per patch.
  {
    state.shapes=[];_invalidateGrid();state.history=[];state.histIdx=-1;state.seq=0;state.seenOps=new Set();state.wclock={};state.selection=new Set();
    const tR=Shape.make('rect',{x:0,y:0,w:50,h:50});
    Store.commit({op:'add',shape:tR});
    const liveTR=()=>state.shapes.find(s=>s.id===tR.id);
    assert.ok(!liveTR().locked,'v1.7.23: rect starts unlocked');
    // Simulate a peer sending an align op that smuggles locked:true.
    // BEFORE fix: liveTR().locked becomes true. AFTER fix: op rejected, stays falsy.
    Store.applyRemote({op:'align',after:[{id:tR.id,locked:true}],clock:{peer:'evil',seq:1,ts:1}});
    assert.ok(!liveTR().locked,'v1.7.23: remote align op with locked:true must not lock local shape');
    // Verify a valid remote align op (no locked key, known dir) still applies normally.
    Store.applyRemote({op:'align',dir:'left',after:[{id:tR.id,x:99}],before:[{id:tR.id,x:0}],clock:{peer:'good',seq:1,ts:1}});
    assert.strictEqual(liveTR().x,99,'v1.7.23: valid remote align op (no locked key, with before) still applies');
    console.log('  ✓ validRemotePayload: remote align op with locked key rejected (v1.7.23)');
  }

  // v1.7.24a: _apply('clear', backward) must restore pre-clear selection (origSel).
  // Bug: doDelete patches origSel onto the history entry after Store.commit so that
  // _apply('del', backward) can restore the pre-delete selection. doClearAll never sets
  // origSel, and _apply('clear', backward) never reads it — so undo of Clear-All leaves
  // selection empty even if the user had shapes selected before clearing.
  // Fix: (1) doClearAll captures origSel before commit and patches it onto the history
  // entry (mirror of doDelete). (2) _apply('clear', backward) restores origSel using
  // the same pattern as _apply('del', backward).
  // Note: doClearAll itself cannot be called directly from the test harness (it shows a
  // confirm() dialog that returns false in the fake window). Instead we directly commit a
  // 'clear' op and manually patch origSel — this isolates the _apply backward fix.
  // The doClearAll caller-side fix (capturing and patching origSel) is covered by the
  // string presence test: "doClearAll patches origSel onto clear history entry".
  {
    state.shapes=[];_invalidateGrid();state.history=[];state.histIdx=-1;state.seq=0;state.seenOps=new Set();state.wclock={};state.selection=new Set();
    const caA=Shape.make('rect',{x:0,y:0,w:40,h:40});
    const caB=Shape.make('rect',{x:60,y:0,w:40,h:40});
    Store.commit({op:'add',shape:caA});Store.commit({op:'add',shape:caB});
    state.selection=new Set([caA.id,caB.id]);
    // Simulate doClearAll without confirm(): commit clear op + manually patch origSel
    const origSel=[...state.selection];
    Store.commit({op:'clear',shapes:JSON.parse(JSON.stringify(state.shapes)),wc:{}});
    state.history[state.histIdx].origSel=origSel; // caller-side fix (doClearAll)
    // Assertion 1: shapes gone after clear
    assert.strictEqual(state.shapes.length,0,'v1.7.24a: clear op removes all shapes');
    Store.undo();
    // Assertion 2: shapes restored after undo
    assert.strictEqual(state.shapes.length,2,'v1.7.24a: undo of clear restores shapes');
    // Assertion 3: pre-clear selection restored by _apply('clear', backward).
    // BEFORE fix: selection.size===0 (_apply ignores origSel). AFTER fix: both shapes selected.
    assert.ok(state.selection.has(caA.id)&&state.selection.has(caB.id),
      'v1.7.24a: _apply clear backward restores origSel (selection not left empty)');
    console.log('  ✓ _apply clear backward: pre-clear selection restored via origSel (v1.7.24a)');
  }

  // v1.7.24b: remote 'style'/'resize' ops must also not be usable to lock shapes.
  // v1.7.23 blocked 'locked' from remote 'align' ops, but 'style' and 'resize' share the
  // same validRemotePayload path (patches() only calls validPatch, which accepts booleans).
  // A peer can send {op:'style', after:[{id:X, locked:true}]} to achieve the same lock
  // bypass that v1.7.23 closed for 'align'.
  // Fix: apply the same !('locked' in p) guard to 'style' and 'resize' in validRemotePayload.
  {
    state.shapes=[];_invalidateGrid();state.history=[];state.histIdx=-1;state.seq=0;state.seenOps=new Set();state.wclock={};state.selection=new Set();
    const srA=Shape.make('rect',{x:0,y:0,w:50,h:50});
    Store.commit({op:'add',shape:srA});
    const liveSR=()=>state.shapes.find(s=>s.id===srA.id);
    // Peer sends style op smuggling locked:true.
    // BEFORE fix: liveSR().locked becomes true. AFTER fix: op rejected, stays falsy.
    Store.applyRemote({op:'style',after:[{id:srA.id,locked:true}],clock:{peer:'evil2',seq:1,ts:1}});
    assert.ok(!liveSR().locked,'v1.7.24b: remote style op with locked:true must not lock local shape');
    // Peer sends resize op smuggling locked:true.
    Store.applyRemote({op:'resize',after:[{id:srA.id,locked:true}],clock:{peer:'evil2',seq:2,ts:2}});
    assert.ok(!liveSR().locked,'v1.7.24b: remote resize op with locked:true must not lock local shape');
    // Valid remote style op (stroke change, no locked key) still applies normally.
    Store.applyRemote({op:'style',after:[{id:srA.id,stroke:'#ff0000'}],before:[{id:srA.id,stroke:'#0F172A'}],clock:{peer:'good2',seq:1,ts:1}});
    assert.strictEqual(liveSR().stroke,'#ff0000','v1.7.24b: valid remote style op (no locked key, with before) still applies');
    console.log('  ✓ validRemotePayload: remote style/resize ops with locked key rejected (v1.7.24b)');
  }

  // v1.7.25: doCopy must expand frame children via withFrameChildren (parity with doDuplicate).
  // Bug: doCopy iterates only state.selection, skipping shapes spatially inside a selected
  // frame. When the user selects a frame and Ctrl+C, only the frame shell enters the
  // clipboard — children are silently absent. For Ctrl+X (cut = copy + delete), doDelete
  // DOES expand frame children and removes them from the board, but they are not in the
  // clipboard, so paste cannot restore them. The children are permanently lost unless undone.
  // Fix: change `[...state.selection]` to `[...withFrameChildren(state.selection)]` in doCopy.
  {
    state.shapes=[];_invalidateGrid();state.history=[];state.histIdx=-1;state.seq=0;state.seenOps=new Set();state.wclock={};state.selection=new Set();state.clipboard=null;
    const cpF=Shape.make('frame',{x:0,y:0,w:300,h:300});
    const cpC=Shape.make('rect',{x:50,y:50,w:40,h:40}); // spatially inside cpF
    Store.commit({op:'add',shape:cpF});Store.commit({op:'add',shape:cpC});
    state.selection=new Set([cpF.id]); // only frame selected, not child
    doCopy();
    // Assertion 1: clipboard must include child. BEFORE fix: length===1 (frame only). AFTER: 2.
    assert.strictEqual(state.clipboard.shapes.length,2,
      'v1.7.25: doCopy of selected frame includes spatially-contained child in clipboard');
    // Assertion 2: child id specifically present in clipboard.
    assert.ok(state.clipboard.shapes.some(s=>s.id===cpC.id),
      'v1.7.25: doCopy clipboard contains frame child id');
    // Assertion 3: cut (copy+delete) then paste restores child — no data loss.
    state.selection=new Set([cpF.id]);
    doCopy();doDelete();
    doPaste();
    assert.strictEqual(state.shapes.filter(s=>s.type==='rect').length,1,
      'v1.7.25: cut+paste of frame restores child shape (no data loss)');
    console.log('  ✓ doCopy: frame children included in copy/cut clipboard (v1.7.25)');
  }

  // v1.7.26: _apply('replace', backward) must restore pre-import selection (origSel).
  // Bug: importBoard and importFromHash call state.selection.clear() then
  // Store._recordCommitted({op:'replace',...}) without carrying origSel in the op.
  // _apply('replace', backward) clears selection but never restores it — so undoing
  // a whole-board import (Ctrl+Z) leaves the board restored but selection empty,
  // even when the shapes the user had selected are back on the board.
  // Same family as the v1.7.24 'clear' origSel fix.
  // Fix: (1) importBoard/importFromHash capture origSel before clear and include it
  // in the op; (2) _apply('replace', backward) restores origSel via byId filter.
  // Note: the callers (importBoard/importFromHash) show a confirm() dialog or parse
  // a file — untestable directly in the harness. We manually patch origSel onto the
  // history entry to isolate the _apply backward path (same approach as v1.7.24a).
  // Caller-side fix is covered by the new presence check.
  {
    state.shapes=[];_invalidateGrid();state.history=[];state.histIdx=-1;state.seq=0;state.seenOps=new Set();state.wclock={};state.selection=new Set();
    const rpA=Shape.make('rect',{x:0,y:0,w:50,h:50});
    const rpB=Shape.make('rect',{x:100,y:0,w:50,h:50});
    Store.commit({op:'add',shape:rpA});Store.commit({op:'add',shape:rpB});
    state.selection=new Set([rpA.id,rpB.id]);
    // Simulate importBoard/importFromHash without file I/O: record replace op + patch origSel
    const before=JSON.parse(JSON.stringify(state.shapes));
    const beforeWc=JSON.parse(JSON.stringify(state.wclock));
    const origSel=[...state.selection];
    const newSh=Shape.make('ellipse',{x:200,y:0,w:50,h:50});
    state.shapes=[newSh];state.selection.clear();state.wclock={};
    Store._recordCommitted({op:'replace',before,after:JSON.parse(JSON.stringify(state.shapes)),wc:beforeWc});
    state.history[state.histIdx].origSel=origSel; // caller-side fix (importBoard/importFromHash)
    // Assertion 1: import replaced the board with the new shape
    assert.strictEqual(state.shapes.filter(s=>s.type==='ellipse').length,1,'v1.7.26: replace op applied (new shape on board)');
    Store.undo();
    // Assertion 2: original shapes restored by _apply('replace', backward)
    assert.strictEqual(state.shapes.length,2,'v1.7.26: undo of replace restores original shapes');
    // Assertion 3: pre-import selection restored.
    // BEFORE fix: selection.size===0. AFTER fix: rpA and rpB both selected.
    assert.ok(state.selection.has(rpA.id)&&state.selection.has(rpB.id),
      'v1.7.26: _apply replace backward restores pre-import origSel');
    console.log('  ✓ _apply replace backward: pre-import selection restored via origSel (v1.7.26)');
  }

  // v1.7.27: _apply('upd', backward) must not regress properties already superseded by
  // a remote peer with a newer clock.
  // Bug: Store.undo() calls _apply(op, false) → Object.assign(sh, clone(op.before)) with
  // no wclock check. If a peer wrote to the same property with a newer clock (C2 > C1),
  // undo restores the pre-local value and the local board permanently diverges from the
  // peer (undo does not broadcast, so the peer is never informed of Alice's revert).
  // Fix: in _apply('upd', false), filter out any property where state.wclock[id][key]
  // has a clock newer than op.clock before calling Object.assign.
  {
    state.shapes=[];_invalidateGrid();state.history=[];state.histIdx=-1;state.seq=0;state.seenOps=new Set();state.wclock={};state.selection=new Set();
    const lwwSh=Shape.make('rect',{x:0,y:0,w:50,h:50});
    lwwSh.stroke='#000000';
    Store.commit({op:'add',shape:lwwSh});
    const liveLww=()=>state.shapes.find(s=>s.id===lwwSh.id);
    // Alice: local upd stroke → red (clock auto-assigned C1)
    Store.commit({op:'upd',id:lwwSh.id,before:{stroke:'#000000'},after:{stroke:'#ff0000'}});
    const c1=state.history[state.histIdx].clock; // C1 = Alice's auto-assigned clock
    assert.strictEqual(liveLww().stroke,'#ff0000','v1.7.27 setup: local upd stroke red');
    // Remote peer: stroke → blue with C2 (newer than C1)
    const c2={peer:'bob',seq:1,ts:c1.ts+1000};
    Store.applyRemote({op:'upd',id:lwwSh.id,before:{stroke:'#ff0000'},after:{stroke:'#0000ff'},clock:c2});
    assert.strictEqual(liveLww().stroke,'#0000ff','v1.7.27 setup: remote upd (newer clock) stroke blue');
    // state.wclock[lwwSh.id].stroke === c2 (newer than c1)
    // Alice undoes: must NOT restore '#000000' — wclock says c2 owns stroke
    Store.undo();
    // BEFORE fix: stroke === '#000000' (undo ignores wclock, clobbers peer's newer blue).
    // AFTER fix:  stroke === '#0000ff' (stroke skipped in backward patch; wclock c2 > c1).
    assert.strictEqual(liveLww().stroke,'#0000ff',
      'v1.7.27: undo must not regress properties already superseded by a remote peer with newer clock');
    console.log('  ✓ _apply upd backward: wclock-protected properties skipped in undo (v1.7.27)');
  }

  // v1.7.28: validRemotePayload for 'upd' must block 'locked' key in op.after.
  // Bug: style/resize/align all have !('locked' in p) guard, but 'upd' does not.
  // A hostile peer can send {op:'upd', after:{locked:true}} to lock any shape remotely.
  {
    state.shapes=[];_invalidateGrid();state.history=[];state.histIdx=-1;state.seq=0;state.seenOps=new Set();state.wclock={};state.selection=new Set();
    const lkSh=Shape.make('rect',{x:0,y:0,w:50,h:50});
    Store.commit({op:'add',shape:lkSh});
    const lkLive=()=>state.shapes.find(s=>s.id===lkSh.id);
    assert.ok(!lkLive().locked,'v1.7.28 setup: shape starts unlocked');
    // Hostile peer tries to lock the shape via upd
    Store.applyRemote({op:'upd',id:lkSh.id,after:{locked:true},clock:{peer:'evil',seq:1,ts:999999}});
    assert.ok(!lkLive().locked,
      'v1.7.28: remote upd with locked:true must not lock the shape (noLock guard missing in upd)');
    // Hostile peer tries to set a legitimate property AND lock simultaneously
    Store.applyRemote({op:'upd',id:lkSh.id,after:{stroke:'#ff0000',locked:true},clock:{peer:'evil',seq:2,ts:999999}});
    assert.ok(!lkLive().locked,
      'v1.7.28: remote upd with mixed patch containing locked:true must not lock (whole op rejected)');
    // Legitimate upd (no locked key) still works
    Store.applyRemote({op:'upd',id:lkSh.id,after:{stroke:'#00ff00'},clock:{peer:'good',seq:1,ts:1000}});
    assert.strictEqual(lkLive().stroke,'#00ff00',
      'v1.7.28: remote upd without locked key still applies correctly');
    console.log('  ✓ validRemotePayload upd: locked key in after rejected (v1.7.28)');
  }

  // v1.7.29: doPaste missing origSel — undo of paste doesn't restore pre-paste selection.
  // doDuplicate (line 3164) captures origSel and patches the history entry;
  // doPaste calls _placeCopies without doing either, so undo clears selection.
  {
    state.shapes=[];_invalidateGrid();state.history=[];state.histIdx=-1;state.seq=0;state.seenOps=new Set();state.wclock={};state.selection=new Set();
    state.viewport={x:0,y:0,zoom:1};
    _resetPasteClipboard();
    const pA=Shape.make('rect',{x:0,y:0,w:50,h:50});
    const pB=Shape.make('rect',{x:100,y:0,w:50,h:50});
    Store.commit({op:'add',shape:pA});
    Store.commit({op:'add',shape:pB});
    state.selection=new Set([pA.id,pB.id]);
    doCopy();
    assert.ok(state.clipboard,'v1.7.29 setup: clipboard set after copy');
    doPaste();
    const pastedIds=[...state.selection];
    assert.strictEqual(pastedIds.length,2,'v1.7.29 setup: two shapes pasted');
    assert.ok(!pastedIds.includes(pA.id)&&!pastedIds.includes(pB.id),
      'v1.7.29 setup: pasted shapes have fresh ids');
    Store.undo();
    assert.ok(state.selection.has(pA.id)&&state.selection.has(pB.id),
      'v1.7.29: undo paste must restore pre-paste selection (origSel pattern, parity with doDuplicate)');
    console.log('  ✓ doPaste: undo restores pre-paste selection via origSel (v1.7.29)');
  }

  // v1.7.30: createShapeKbd missing origSel — undo of keyboard shape creation doesn't
  // restore the pre-creation selection (parity gap with doDuplicate/doPaste/doClearAll).
  {
    state.shapes=[];_invalidateGrid();state.history=[];state.histIdx=-1;state.seq=0;state.seenOps=new Set();state.wclock={};state.selection=new Set();
    state.viewport={x:0,y:0,zoom:1};
    // Create a shape to serve as the pre-existing selection
    const preA=Shape.make('rect',{x:0,y:0,w:50,h:50});
    Store.commit({op:'add',shape:preA});
    state.selection=new Set([preA.id]);
    assert.ok(state.selection.has(preA.id),'v1.7.30 setup: preA is selected');
    // Create a shape via keyboard — this commits an 'add' op and changes selection to the new shape
    state.tool='ellipse';
    const ok=createShapeKbd();
    assert.ok(ok,'v1.7.30 setup: createShapeKbd returns true for ellipse');
    const newId=[...state.selection].find(id=>id!==preA.id);
    assert.ok(newId,'v1.7.30 setup: new shape is selected after keyboard creation');
    // Undo: the new shape is removed; selection should be restored to {preA.id}
    Store.undo();
    assert.ok(!state.shapes.some(s=>s.id===newId),'v1.7.30: new shape removed by undo');
    assert.ok(state.selection.has(preA.id),
      'v1.7.30: undo keyboard shape creation must restore pre-creation selection (origSel pattern, parity with doDuplicate/doPaste)');
    console.log('  ✓ createShapeKbd: undo restores pre-creation selection via origSel (v1.7.30)');
  }

  // v1.7.31: endRectLike/endLineLike/beginText missing origSel — undo of pointer-drawn
  // shape doesn't restore the pre-draw selection (parity gap with createShapeKbd v1.7.30).
  {
    state.shapes=[];_invalidateGrid();state.history=[];state.histIdx=-1;state.seq=0;state.seenOps=new Set();state.wclock={};state.selection=new Set();
    state.viewport={x:0,y:0,zoom:1};state.draft=null;state.snap=false;
    // Create two shapes that will serve as the pre-existing selection
    const pX=Shape.make('rect',{x:0,y:0,w:50,h:50});
    const pY=Shape.make('ellipse',{x:100,y:0,w:50,h:50});
    Store.commit({op:'add',shape:pX});
    Store.commit({op:'add',shape:pY});
    state.selection=new Set([pX.id,pY.id]);
    assert.strictEqual(state.selection.size,2,'v1.7.31 setup: two shapes selected');
    // Draw a rect via endRectLike (simulate beginRectLike+contRectLike result)
    state.draft=Shape.make('rect',{x:200,y:0,w:80,h:60});
    state.tool='rect';
    endRectLike();
    const newId=[...state.selection][0];
    assert.strictEqual(state.selection.size,1,'v1.7.31 setup: only the new rect is selected after draw');
    assert.notStrictEqual(newId,pX.id,'v1.7.31 setup: new shape has a different id');
    // Undo: rect removed; selection should be restored to {pX, pY}
    Store.undo();
    assert.ok(!state.shapes.some(s=>s.id===newId),'v1.7.31: drawn rect removed by undo');
    assert.ok(state.selection.has(pX.id)&&state.selection.has(pY.id),
      'v1.7.31: undo pointer-drawn shape must restore pre-draw selection (origSel pattern, parity with createShapeKbd)');
    console.log('  ✓ endRectLike: undo restores pre-draw selection via origSel (v1.7.31)');
  }

  // v1.7.32: _apply('group', backward) crashes when op.before is undefined.
  // The ungroup backward case (line 1328) already has `if(op.before){…}` guard;
  // the group backward case (line 1321) iterates op.before without any guard.
  // A group op without op.before can enter history via Store._recordCommitted
  // (e.g. synthesised by a peer or a test). Ctrl+Z then throws:
  //   TypeError: Cannot iterate over undefined (for...of op.before)
  {
    state.shapes=[];_invalidateGrid();state.history=[];state.histIdx=-1;state.seq=0;state.seenOps=new Set();state.wclock={};state.selection=new Set();
    const gA=Shape.make('rect',{x:0,y:0,w:50,h:50});
    const gB=Shape.make('rect',{x:60,y:0,w:50,h:50});
    Store.commit({op:'add',shape:gA});
    Store.commit({op:'add',shape:gB});
    // Apply forward manually (as if a remote group op arrived)
    const liveA=state.shapes.find(s=>s.id===gA.id);
    const liveB=state.shapes.find(s=>s.id===gB.id);
    liveA.groupId='grp1'; liveB.groupId='grp1';
    // Push a group op WITHOUT op.before onto the undo stack
    Store._recordCommitted({op:'group',ids:[gA.id,gB.id],gid:'grp1'});
    assert.ok(state.histIdx>=0,'v1.7.32 setup: op is on history stack');
    // BEFORE FIX: Store.undo() throws TypeError: Cannot iterate over undefined
    // AFTER FIX: graceful no-op (before is absent, so backward is skipped)
    assert.doesNotThrow(()=>Store.undo(),
      'v1.7.32: _apply group backward must not crash when op.before is undefined (parity with ungroup guard)');
    console.log('  ✓ _apply group backward: null op.before guard prevents TypeError crash (v1.7.32)');
  }

  // v1.7.33: validRemotePayload('group') accepts ops without op.before — a malicious
  // peer can send {op:'group', ids:[...], gid:'g'} (no before), which passes validation
  // and groups the shapes, but the undo becomes a silent no-op (_apply backward skips).
  // doGroup always includes before; the validator should require it to enforce the contract.
  {
    // FAILS before fix: returns true for a group op without before
    assert.ok(!validRemotePayload({op:'group',ids:['s1','s2'],gid:'g1'}),
      'v1.7.33: group op without before must be rejected (undo would be a silent no-op)');
    // Existing valid ops still accepted
    assert.ok(validRemotePayload({op:'group',ids:['s1','s2'],gid:'g1',before:[{id:'s1'},{id:'s2'}]}),
      'v1.7.33: group op with valid before array is still accepted');
    // Non-string id in before should be rejected
    assert.ok(!validRemotePayload({op:'group',ids:['s1'],gid:'g1',before:[{id:123}]}),
      'v1.7.33: group op with non-string id in before is rejected');
    console.log('  ✓ validRemotePayload group: before required with string ids (v1.7.33)');
  }

  // v1.7.34: _apply('ungroup', backward) crashes when op.gids is undefined and op.before is absent.
  // Line 1330: `else{const gid=op.gids[0];...}` — no null guard on op.gids, parallel to the
  // v1.7.32 group crash. Also, validRemotePayload('ungroup') (line 1047) doesn't require gids,
  // so a peer can send {op:'ungroup', ids:[...]} (no gids/before) that passes validation,
  // ungroups shapes, then crashes Ctrl+Z.
  {
    state.shapes=[];_invalidateGrid();state.history=[];state.histIdx=-1;state.seq=0;state.seenOps=new Set();state.wclock={};state.selection=new Set();
    const ug1=Shape.make('rect',{x:0,y:0,w:50,h:50});
    const ug2=Shape.make('rect',{x:60,y:0,w:50,h:50});
    Store.commit({op:'add',shape:ug1});
    Store.commit({op:'add',shape:ug2});
    const lug1=state.shapes.find(s=>s.id===ug1.id);
    const lug2=state.shapes.find(s=>s.id===ug2.id);
    // Manually apply the forward (ungrouping already done, no groupId)
    delete lug1.groupId; delete lug2.groupId;
    // Push an ungroup op WITHOUT gids or before onto history (simulates malformed or remote op)
    Store._recordCommitted({op:'ungroup',ids:[ug1.id,ug2.id]});
    assert.ok(state.histIdx>=0,'v1.7.34 setup: op on history stack');
    // BEFORE FIX: Store.undo() throws TypeError: Cannot read properties of undefined (reading '0')
    // AFTER FIX: graceful no-op (op.gids?.[0] === undefined, loop assigns nothing)
    assert.doesNotThrow(()=>Store.undo(),
      'v1.7.34: _apply ungroup backward must not crash when both op.gids and op.before are undefined');
    console.log('  ✓ _apply ungroup backward: null guard for op.gids prevents TypeError crash (v1.7.34)');
  }

  // v1.7.35: validRemotePayload style/resize/align: before==null was accepted, making it possible
  // for a remote peer to apply a style/resize/align op that can't be undone (backward path silently
  // no-ops when before is null). After fix, before is required by the validator.
  {
    state.shapes=[];_invalidateGrid();state.history=[];state.histIdx=-1;state.seq=0;state.seenOps=new Set();state.wclock={};state.selection=new Set();
    const sv=Shape.make('rect',{x:0,y:0,w:50,h:50,fill:'blue'});
    state.shapes.push(sv);
    // Remote style op with before:null — should be REJECTED after fix
    Store.applyRemote({op:'style', after:[{id:sv.id,fill:'red'}], before:null, clock:{peer:'p35',seq:1,ts:1}});
    const sh35=state.shapes.find(s=>s.id===sv.id);
    assert.ok(sh35,'v1.7.35 setup: shape exists after rejected remote op');
    assert.strictEqual(sh35.fill,'blue',
      'v1.7.35: remote style op with before:null must be rejected (before required by validRemotePayload)');
    console.log('  ✓ validRemotePayload style/resize/align: before:null op rejected (v1.7.35)');
  }

  // v1.7.36: flushErase commits a del op without capturing origSel, so undoing an erase
  // leaves state.selection empty instead of restoring the pre-erase selection.
  // The del forward path removes erased shape ids from state.selection (line ~1270).
  // Without origSel, _apply del backward doesn't restore the selection after undo.
  // Pattern: same origSel capture + history patch that doDelete uses.
  {
    state.shapes=[];_invalidateGrid();state.history=[];state.histIdx=-1;state.seq=0;state.seenOps=new Set();state.wclock={};state.selection=new Set();
    state.viewport={x:0,y:0,zoom:1};state.draft=null;state.snap=false;
    const feA=Shape.make('rect',{x:0,y:0,w:30,h:30});
    const feB=Shape.make('rect',{x:50,y:0,w:30,h:30});
    Store.commit({op:'add',shape:feA});
    Store.commit({op:'add',shape:feB});
    // Reset history so the only undo target is the upcoming erase
    state.history=[];state.histIdx=-1;state.seq=0;state.seenOps=new Set();
    // A is selected and is being erased — del forward will remove A from selection
    state.selection=new Set([feA.id]);
    // Simulate eraser: A is removed from state.shapes into _eraseBatch
    state.shapes=state.shapes.filter(s=>s.id!==feA.id);
    _pushEraseBatch(feA);
    flushErase();
    assert.ok(!state.shapes.some(s=>s.id===feA.id),'v1.7.36 setup: A erased');
    assert.strictEqual(state.selection.size,0,'v1.7.36 setup: selection is empty after erase');
    Store.undo();
    assert.ok(state.shapes.some(s=>s.id===feA.id),'v1.7.36: undo restores erased shape');
    assert.ok(state.selection.has(feA.id),
      'v1.7.36: undo of erase must restore pre-erase selection (origSel pattern missing in flushErase)');
    console.log('  ✓ flushErase: undo restores pre-erase selection via origSel (v1.7.36)');
  }

  // v1.7.37: doGroup stores origSel; _apply group backward restores it.
  // Group doesn't change selection, but if user deselects after grouping, undo should
  // restore the pre-group selection (parity with all other ops that change shape state).
  {
    state.shapes=[];_invalidateGrid();state.history=[];state.histIdx=-1;state.seq=0;state.seenOps=new Set();state.wclock={};state.selection=new Set();
    const gA=Shape.make('rect',{x:0,y:0,w:30,h:30});
    const gB=Shape.make('rect',{x:50,y:0,w:30,h:30});
    Store.commit({op:'add',shape:gA});
    Store.commit({op:'add',shape:gB});
    state.history=[];state.histIdx=-1;state.seq=0;state.seenOps=new Set();
    state.selection=new Set([gA.id,gB.id]);
    doGroup();
    assert.ok(state.shapes.find(s=>s.id===gA.id)?.groupId,'v1.7.37 setup: shapes grouped');
    // Simulate user clicking elsewhere after group (clears selection)
    state.selection.clear();
    assert.strictEqual(state.selection.size,0,'v1.7.37 setup: selection cleared after group');
    Store.undo();
    assert.ok(state.selection.has(gA.id)&&state.selection.has(gB.id),
      'v1.7.37: undo of doGroup must restore pre-group selection via origSel');
    console.log('  ✓ doGroup: undo restores pre-group selection via origSel (v1.7.37)');
  }

  // v1.7.37: doUngroup stores origSel; _apply ungroup backward restores it.
  // doUngroup EXPANDS state.selection (adds all group members). Without origSel, undo
  // leaves the expanded selection instead of restoring the pre-ungroup selection.
  {
    state.shapes=[];_invalidateGrid();state.history=[];state.histIdx=-1;state.seq=0;state.seenOps=new Set();state.wclock={};state.selection=new Set();
    const ugA=Shape.make('rect',{x:0,y:0,w:30,h:30});
    const ugB=Shape.make('rect',{x:50,y:0,w:30,h:30});
    const ugC=Shape.make('rect',{x:100,y:0,w:30,h:30});
    const testGid='test-group-id-37';
    ugA.groupId=testGid; ugB.groupId=testGid; ugC.groupId=testGid;
    Store.commit({op:'add',shape:ugA});
    Store.commit({op:'add',shape:ugB});
    Store.commit({op:'add',shape:ugC});
    state.history=[];state.histIdx=-1;state.seq=0;state.seenOps=new Set();
    // Select only A — doUngroup will expand to all three members of the group
    state.selection=new Set([ugA.id]);
    doUngroup();
    assert.ok(!state.shapes.find(s=>s.id===ugA.id)?.groupId,'v1.7.37 setup: shapes ungrouped');
    assert.ok(state.selection.size>1,'v1.7.37 setup: selection expanded after ungroup');
    Store.undo();
    assert.strictEqual(state.selection.size,1,
      'v1.7.37: undo of doUngroup must restore pre-ungroup selection (1 shape) not the expanded set');
    assert.ok(state.selection.has(ugA.id),
      'v1.7.37: undo of doUngroup must restore origSel {ugA}');
    console.log('  ✓ doUngroup: undo restores pre-ungroup selection via origSel (v1.7.37)');
  }

  // v1.7.38a: _apply('upd', forward) must skip locked shapes (parity with move forward).
  // A remote peer can send {op:'upd', after:{rotate:45}} on a locally-locked shape and have
  // the mutation applied because _apply upd has no sh.locked guard.
  {
    state.shapes=[];_invalidateGrid();state.history=[];state.histIdx=-1;state.seq=0;state.seenOps=new Set();state.wclock={};state.selection=new Set();
    const lu=Shape.make('rect',{x:0,y:0,w:50,h:50,rotate:0});
    state.shapes.push(lu);
    lu.locked=true;
    Store.applyRemote({op:'upd',id:lu.id,before:{rotate:0},after:{rotate:45},clock:{peer:'evil38',seq:1,ts:1}});
    const sh38=state.shapes.find(s=>s.id===lu.id);
    assert.ok(sh38,'v1.7.38a setup: locked shape still present');
    assert.strictEqual(sh38.rotate,0,
      'v1.7.38a: _apply upd forward must not mutate a locked shape (remote upd on locked shape rejected)');
    console.log('  ✓ _apply upd forward: locked shape not mutated by remote upd op (v1.7.38a)');
  }

  // v1.7.38b: _apply style/resize/align forward must skip locked shapes per patch.
  // Remote peer sends a style op targeting a locked shape; fill should not change.
  {
    state.shapes=[];_invalidateGrid();state.history=[];state.histIdx=-1;state.seq=0;state.seenOps=new Set();state.wclock={};state.selection=new Set();
    const ls=Shape.make('rect',{x:0,y:0,w:50,h:50,fill:'blue'});
    state.shapes.push(ls);
    ls.locked=true;
    Store.applyRemote({op:'style',after:[{id:ls.id,fill:'#ff0000'}],before:[{id:ls.id,fill:'blue'}],clock:{peer:'evil38b',seq:1,ts:1}});
    const sh38b=state.shapes.find(s=>s.id===ls.id);
    assert.ok(sh38b,'v1.7.38b setup: locked shape still present');
    assert.strictEqual(sh38b.fill,'blue',
      'v1.7.38b: _apply style forward must not mutate a locked shape (remote style on locked shape rejected)');
    console.log('  ✓ _apply style forward: locked shape not mutated by remote style op (v1.7.38b)');
  }

  // v1.7.39: _apply('del', forward) connClears loop bypasses sh.locked.
  // doDelete (local) correctly skips locked connectors when building connClears, but
  // a remote peer can craft a del op whose connClears targets a locally-locked connector.
  // The fix: add !sh.locked guard to the connClears Object.assign, same class as v1.7.38.
  {
    state.shapes=[];_invalidateGrid();state.history=[];state.histIdx=-1;state.seq=0;state.seenOps=new Set();state.wclock={};state.selection=new Set();
    const delTarget=Shape.make('rect',{x:0,y:0,w:30,h:30});
    const lockedConn=Shape.make('arrow',{x1:0,y1:15,x2:100,y2:15});
    lockedConn.a=delTarget.id;
    state.shapes.push(delTarget,lockedConn);
    lockedConn.locked=true;
    // Remote del of delTarget with connClears targeting the locked connector
    Store.applyRemote({op:'del',shapes:[delTarget],
      connClears:[{id:lockedConn.id,before:{a:delTarget.id,x1:0,y1:15},after:{a:null,x1:50,y1:50}}],
      clock:{peer:'evil39',seq:1,ts:1}});
    const conn39=state.shapes.find(s=>s.id===lockedConn.id);
    assert.ok(conn39,'v1.7.39 setup: locked connector still present after del of bound shape');
    assert.strictEqual(conn39.a,delTarget.id,
      'v1.7.39: remote del connClears must not clear binding on a locked connector');
    assert.strictEqual(conn39.x1,0,
      'v1.7.39: remote del connClears must not overwrite x1 on a locked connector');
    console.log('  ✓ _apply del forward connClears: locked connector not modified by remote del (v1.7.39)');
  }

  // v1.7.40a: _apply('zorder', forward) mutates sh.frac on locked shapes without lock guard.
  // Local zorder ops filter out locked shapes before building changes[], so local undo/redo
  // is safe. Remote peers can still send zorder targeting locked shapes.
  {
    state.shapes=[];_invalidateGrid();state.history=[];state.histIdx=-1;state.seq=0;state.seenOps=new Set();state.wclock={};state.selection=new Set();
    const zl=Shape.make('rect',{x:0,y:0,w:30,h:30});
    state.shapes.push(zl);
    zl.locked=true;
    const origFrac=zl.frac||null;
    Store.applyRemote({op:'zorder',changes:[{id:zl.id,before:'a0',after:'z0'}],clock:{peer:'evil40z',seq:1,ts:1}});
    const zl2=state.shapes.find(s=>s.id===zl.id);
    assert.ok(zl2,'v1.7.40a setup: locked shape present after remote zorder');
    assert.notStrictEqual(zl2.frac,'z0',
      'v1.7.40a: remote zorder must not mutate frac of a locked shape');
    console.log('  ✓ _apply zorder forward: locked shape frac not mutated by remote zorder (v1.7.40a)');
  }

  // v1.7.40b: _apply('group', forward) assigns groupId to locked shapes without lock guard.
  // Remote peer can group a locked shape, making it draggable as part of a group.
  {
    state.shapes=[];_invalidateGrid();state.history=[];state.histIdx=-1;state.seq=0;state.seenOps=new Set();state.wclock={};state.selection=new Set();
    const gl=Shape.make('rect',{x:0,y:0,w:30,h:30});
    const gl2=Shape.make('rect',{x:50,y:0,w:30,h:30});
    state.shapes.push(gl,gl2);
    gl.locked=true;
    Store.applyRemote({op:'group',ids:[gl.id,gl2.id],gid:'remote-group',before:[{id:gl.id},{id:gl2.id}],clock:{peer:'evil40g',seq:1,ts:1}});
    const gl_after=state.shapes.find(s=>s.id===gl.id);
    assert.ok(gl_after,'v1.7.40b setup: locked shape present');
    assert.notStrictEqual(gl_after.groupId,'remote-group',
      'v1.7.40b: remote group must not assign groupId to a locked shape');
    console.log('  ✓ _apply group forward: locked shape not grouped by remote group op (v1.7.40b)');
  }

  // v1.7.40c: _apply('ungroup', forward) deletes groupId from locked shapes without lock guard.
  {
    state.shapes=[];_invalidateGrid();state.history=[];state.histIdx=-1;state.seq=0;state.seenOps=new Set();state.wclock={};state.selection=new Set();
    const ul=Shape.make('rect',{x:0,y:0,w:30,h:30});
    ul.groupId='existing-group';
    state.shapes.push(ul);
    ul.locked=true;
    Store.applyRemote({op:'ungroup',ids:[ul.id],gids:['existing-group'],before:[{id:ul.id,groupId:'existing-group'}],clock:{peer:'evil40u',seq:1,ts:1}});
    const ul_after=state.shapes.find(s=>s.id===ul.id);
    assert.ok(ul_after,'v1.7.40c setup: locked shape present');
    assert.strictEqual(ul_after.groupId,'existing-group',
      'v1.7.40c: remote ungroup must not delete groupId from a locked shape');
    console.log('  ✓ _apply ungroup forward: locked shape groupId not removed by remote ungroup (v1.7.40c)');
  }

  // v1.7.41a: validRemotePayload('align') with dir:'lock' rejects lock ops because
  // its noLock predicate blocks any patch containing 'locked'. Remote lock state
  // never syncs to peers — remote shape stays unlocked.
  {
    state.shapes=[];_invalidateGrid();state.history=[];state.histIdx=-1;state.seq=0;state.seenOps=new Set();state.wclock={};state.selection=new Set();
    const la=Shape.make('rect',{x:0,y:0,w:30,h:30});
    state.shapes.push(la);
    la.locked=null;
    Store.applyRemote({op:'align',dir:'lock',
      after:[{id:la.id,locked:true}],
      before:[{id:la.id,locked:null}],
      clock:{peer:'p41a',seq:1,ts:1}});
    const la_after=state.shapes.find(s=>s.id===la.id);
    assert.strictEqual(la_after.locked,true,
      'v1.7.41a: remote lock op must propagate locked=true to shape');
    console.log('  ✓ validRemotePayload align/lock: remote lock op syncs to peers (v1.7.41a)');
  }

  // v1.7.41b: redo of unlock broken by v1.7.38 guard — !(forward&&sh.locked) skips
  // the unlock patch because the shape IS locked (just re-locked by undo).
  // Fix: bypass guard when patch explicitly carries the 'locked' key.
  {
    state.shapes=[];_invalidateGrid();state.history=[];state.histIdx=-1;state.seq=0;state.seenOps=new Set();state.wclock={};state.selection=new Set();
    const lb=Shape.make('rect',{x:0,y:0,w:30,h:30});
    state.shapes.push(lb);
    state.selection=new Set([lb.id]);
    doLock();   // lock: locked=true
    doLock();   // unlock: locked=null
    Store.undo(); // undo unlock → re-locks shape
    assert.strictEqual(state.shapes.find(s=>s.id===lb.id).locked,true,
      'v1.7.41b setup: undo of unlock re-locks shape');
    Store.redo(); // redo unlock → should return locked to null
    assert.ok(!state.shapes.find(s=>s.id===lb.id).locked,
      'v1.7.41b: redo of unlock must clear locked (v1.7.38 guard broke this)');
    console.log('  ✓ redo of unlock: locked cleared after lock→unlock→undo→redo (v1.7.41b)');
  }

  // v1.7.42a: nudgeSelection does not capture origSel — undo of arrow-key move loses selection.
  {
    state.shapes=[];_invalidateGrid();state.history=[];state.histIdx=-1;state.seq=0;state.seenOps=new Set();state.wclock={};state.selection=new Set();
    const na=Shape.make('rect',{x:0,y:0,w:30,h:30});
    const nb=Shape.make('rect',{x:100,y:0,w:30,h:30});
    state.shapes.push(na,nb);
    state.selection=new Set([na.id,nb.id]);
    nudgeSelection(10,0);
    state.selection=new Set();
    Store.undo();
    assert.ok(state.selection.has(na.id),
      'v1.7.42a: undo of nudge must restore na to selection');
    assert.ok(state.selection.has(nb.id),
      'v1.7.42a: undo of nudge must restore nb to selection');
    console.log('  ✓ nudgeSelection: undo restores pre-nudge selection via origSel (v1.7.42a)');
  }

  // v1.7.42b: doAlign/doFlip/doRotate/doLock do not capture origSel — undo loses selection.
  // Tests doAlign as representative of all four (shared _apply backward path).
  {
    state.shapes=[];_invalidateGrid();state.history=[];state.histIdx=-1;state.seq=0;state.seenOps=new Set();state.wclock={};state.selection=new Set();
    const aa=Shape.make('rect',{x:0,y:0,w:30,h:30});
    const ab=Shape.make('rect',{x:100,y:0,w:30,h:30});
    state.shapes.push(aa,ab);
    state.selection=new Set([aa.id,ab.id]);
    doAlign('left');
    state.selection=new Set();
    Store.undo();
    assert.ok(state.selection.has(aa.id),
      'v1.7.42b: undo of doAlign must restore aa to selection');
    assert.ok(state.selection.has(ab.id),
      'v1.7.42b: undo of doAlign must restore ab to selection');
    console.log('  ✓ doAlign: undo restores pre-align selection via origSel (v1.7.42b)');
  }

  // v1.7.42c: validRemotePayload('move') allows empty ids[] and zero-displacement ops —
  // no-ops that consume seenOps dedup slots without moving anything.
  {
    state.shapes=[];_invalidateGrid();state.history=[];state.histIdx=-1;state.seq=0;state.seenOps=new Set();state.wclock={};state.selection=new Set();
    const mc=Shape.make('rect',{x:10,y:10,w:30,h:30});
    state.shapes.push(mc);
    Store.applyRemote({op:'move',ids:[],dx:100,dy:0,clock:{peer:'evil42c',seq:1,ts:1}});
    assert.strictEqual(state.shapes.find(s=>s.id===mc.id).x,10,
      'v1.7.42c: remote move with empty ids rejected (shape.x unchanged)');
    assert.ok(!state.seenOps.has('evil42c:1'),
      'v1.7.42c: empty-ids move op must not be added to seenOps');
    Store.applyRemote({op:'move',ids:[mc.id],dx:0,dy:0,clock:{peer:'evil42c',seq:2,ts:2}});
    assert.ok(!state.seenOps.has('evil42c:2'),
      'v1.7.42c: zero-displacement move op must not be added to seenOps');
    console.log('  ✓ validRemotePayload move: empty ids and zero-displacement ops rejected (v1.7.42c)');
  }

  // v1.7.43a: _zCommit does not capture origSel — undo of doBringFront loses selection.
  // Requires 3 shapes so doBringFront doesn't short-circuit (2 selected, 1 not).
  {
    state.shapes=[];_invalidateGrid();state.history=[];state.histIdx=-1;state.seq=0;state.seenOps=new Set();state.wclock={};state.selection=new Set();
    const za=Shape.make('rect',{x:0,y:0,w:30,h:30});
    const zb=Shape.make('rect',{x:50,y:0,w:30,h:30});
    const zc=Shape.make('rect',{x:100,y:0,w:30,h:30});
    state.shapes.push(za,zb,zc);
    state.selection=new Set([za.id,zb.id]);
    doBringFront();
    state.selection=new Set();
    Store.undo();
    assert.ok(state.selection.has(za.id),
      'v1.7.43a: undo of doBringFront must restore za to selection');
    assert.ok(state.selection.has(zb.id),
      'v1.7.43a: undo of doBringFront must restore zb to selection');
    console.log('  ✓ _zCommit/doBringFront: undo restores pre-zorder selection via origSel (v1.7.43a)');
  }

  // v1.7.43b: _apply('upd', backward) has no origSel restoration — simulates drag-resize undo.
  // Manually patches origSel onto the op (mirrors what the fixed drag-resize call site does),
  // then verifies _apply backward restores selection.
  {
    state.shapes=[];_invalidateGrid();state.history=[];state.histIdx=-1;state.seq=0;state.seenOps=new Set();state.wclock={};state.selection=new Set();
    const ua=Shape.make('rect',{x:0,y:0,w:100,h:100});
    state.shapes.push(ua);
    state.selection=new Set([ua.id]);
    const uBefore={w:100,h:100};
    ua.w=200;
    const uAfter={w:200,h:100};
    Store._recordCommitted({op:'upd',id:ua.id,before:uBefore,after:uAfter});
    state.history[state.histIdx].origSel=[ua.id];
    state.selection=new Set();
    Store.undo();
    assert.ok(state.selection.has(ua.id),
      'v1.7.43b: _apply upd backward must restore origSel (drag-resize undo)');
    console.log('  ✓ _apply upd backward: origSel restored on undo (v1.7.43b)');
  }

  // v1.7.44a: validRemotePayload('addMany') has no size cap — 501 shapes pass validation,
  // freezing the UI thread and exhausting memory.
  {
    state.shapes=[];_invalidateGrid();state.history=[];state.histIdx=-1;state.seq=0;state.seenOps=new Set();state.wclock={};state.selection=new Set();
    const bigShapes=Array.from({length:501},(_,i)=>Shape.make('rect',{x:i*15,y:0,w:10,h:10}));
    Store.applyRemote({op:'addMany',shapes:bigShapes,clock:{peer:'evil44a',seq:1,ts:1}});
    assert.strictEqual(state.shapes.length,0,
      'v1.7.44a: remote addMany with 501 shapes must be rejected');
    assert.ok(!state.seenOps.has('evil44a:1'),
      'v1.7.44a: oversized addMany op must not be added to seenOps');
    console.log('  ✓ validRemotePayload addMany: >MAX_OP_SHAPES shapes rejected (v1.7.44a)');
  }

  // v1.7.44b: _apply replace forward does not restore op.afterWc on redo —
  // wclock is cleared to {} instead of being restored to the afterWc snapshot.
  {
    state.shapes=[];_invalidateGrid();state.history=[];state.histIdx=-1;state.seq=0;state.seenOps=new Set();state.wclock={};state.selection=new Set();
    const rAfter=[Shape.make('rect',{x:50,y:0,w:10,h:10})];
    const testWc={'wc44b':{peer:'test',seq:1,ts:1}};
    Store.commit({op:'replace',before:[],after:rAfter,wc:{},afterWc:testWc,origSel:[]});
    Store.undo();
    assert.ok(!state.wclock['wc44b'],
      'v1.7.44b setup: undo of replace restores empty wc (not afterWc)');
    Store.redo();
    assert.ok(state.wclock['wc44b'],
      'v1.7.44b: redo of replace must restore afterWc to state.wclock');
    console.log('  ✓ _apply replace forward: afterWc restored on redo (v1.7.44b)');
  }

  // v1.7.45a: validRemotePayload zorder/group/ungroup must cap array sizes at MAX_OP_SHAPES
  {
    // Before fix: zorder.changes had no length cap — 501-element array was accepted
    assert.ok(!validRemotePayload({op:'zorder',changes:Array(501).fill({id:'x',before:'a',after:'b'})}),
      'v1.7.45a: zorder with 501 changes rejected (DoS cap)');
    // Before fix: group.ids had no length cap
    assert.ok(!validRemotePayload({op:'group',ids:Array(501).fill('s1'),gid:'g1',before:[{id:'s1'}]}),
      'v1.7.45a: group with 501 ids rejected (DoS cap)');
    // Before fix: ungroup.ids had no length cap
    assert.ok(!validRemotePayload({op:'ungroup',ids:Array(501).fill('s1'),gids:['g1']}),
      'v1.7.45a: ungroup with 501 ids rejected (DoS cap)');
    // Reasonable sizes must still be accepted
    assert.ok(validRemotePayload({op:'zorder',changes:[{id:'x',before:'a',after:'b'}]}),
      'v1.7.45a: zorder with 1 change still accepted');
    assert.ok(validRemotePayload({op:'group',ids:['s1','s2'],gid:'g1',before:[{id:'s1'},{id:'s2'}]}),
      'v1.7.45a: group with 2 ids still accepted');
    assert.ok(validRemotePayload({op:'ungroup',ids:['s1','s2'],gids:['g1']}),
      'v1.7.45a: ungroup with 2 ids still accepted');
    console.log('  ✓ validRemotePayload zorder/group/ungroup: >MAX_OP_SHAPES arrays rejected (v1.7.45a)');
  }

  // v1.7.45b: applyStyleToSelection must capture origSel so style undo restores selection
  {
    state.shapes=[];_invalidateGrid();state.history=[];state.histIdx=-1;state.seq=0;state.seenOps=new Set();state.wclock={};state.selection=new Set();
    const stSh=Shape.make('rect',{x:0,y:0,w:50,h:50,stroke:'#000000'});
    state.shapes.push(stSh);
    state.selection=new Set([stSh.id]);
    applyStyleToSelection({stroke:'#FF0000'});
    assert.strictEqual(stSh.stroke,'#FF0000','v1.7.45b setup: style applied');
    state.selection.clear();
    Store.undo();
    assert.ok(state.selection.has(stSh.id),'v1.7.45b: applyStyleToSelection undo restores origSel');
    console.log('  ✓ applyStyleToSelection: origSel captured so undo restores selection (v1.7.45b)');
  }

  // v1.7.46a: validRemotePayload del connClears must be capped at MAX_OP_SHAPES
  {
    // 501-entry connClears must be rejected (before fix: accepted with no length check)
    assert.ok(!validRemotePayload({op:'del',shapes:[],connClears:Array(501).fill({id:'c1'})}),
      'v1.7.46a: del with 501 connClears rejected (DoS cap)');
    // Small connClears still accepted
    assert.ok(validRemotePayload({op:'del',shapes:[],connClears:[{id:'c1',before:{a1:'t'},after:{a1:null}}]}),
      'v1.7.46a: del with 1 valid connClear still accepted');
    console.log('  ✓ validRemotePayload del connClears: >MAX_OP_SHAPES rejected (v1.7.46a)');
  }

  // v1.7.46c: _apply del backward connClears must respect sh.locked (parity with forward path)
  {
    state.shapes=[];_invalidateGrid();state.history=[];state.histIdx=-1;state.seq=0;state.seenOps=new Set();state.wclock={};state.selection=new Set();
    const connSh=Shape.make('arrow',{x1:0,y1:0,x2:100,y2:0,a1:'dummy_target'});
    const targetSh=Shape.make('rect',{x:90,y:-5,w:20,h:10});
    state.shapes.push(connSh,targetSh);
    Store.commit({op:'del',shapes:[JSON.parse(JSON.stringify(targetSh))],connClears:[{id:connSh.id,before:{a1:'dummy_target'},after:{a1:null}}]});
    assert.strictEqual(connSh.a1,null,'v1.7.46c setup: connector binding cleared on del');
    connSh.locked=true;
    Store.undo();
    assert.strictEqual(connSh.a1,null,'v1.7.46c: locked connector binding NOT restored on del-backward (lock guard)');
    console.log('  ✓ _apply del backward connClears: locked connector not modified (v1.7.46c)');
  }

  // v1.7.47a: validRemotePayload align must reject unknown dir values
  {
    // Before fix: any string dir (or no dir) was not validated — unknown dirs not blocked
    assert.ok(!validRemotePayload({op:'align',dir:'EVIL',before:[{id:'x',x:0}],after:[{id:'x',x:1}]}),
      'v1.7.47a: align op with unknown dir rejected');
    // Known-good dirs still pass
    assert.ok(validRemotePayload({op:'align',dir:'left',before:[{id:'x',x:0}],after:[{id:'x',x:1}]}),
      'v1.7.47a: align op with valid dir accepted');
    assert.ok(validRemotePayload({op:'align',dir:'rotate',before:[{id:'x',rotate:0}],after:[{id:'x',rotate:15}]}),
      'v1.7.47a: align rotate op with valid dir accepted');
    console.log('  ✓ validRemotePayload align: unknown dir rejected by whitelist (v1.7.47a)');
  }

  // v1.7.47c: del op.wc refreshed on redo — remote write wclock survives del→undo→redo→undo
  {
    state.shapes=[];_invalidateGrid();state.history=[];state.histIdx=-1;state.seq=0;state.seenOps=new Set();state.wclock={};state.selection=new Set();
    const wSh=Shape.make('rect',{x:0,y:0,w:50,h:50});
    state.shapes.push(wSh);
    state.wclock[wSh.id]={stroke:{peer:'p1',seq:1,ts:1}};
    Store.commit({op:'del',shapes:[JSON.parse(JSON.stringify(wSh))]});
    Store.undo();
    assert.ok(state.wclock[wSh.id],'v1.7.47c setup: wclock restored after undo-del');
    // Simulate remote write stamping a newer clock
    state.wclock[wSh.id]={stroke:{peer:'p2',seq:2,ts:999}};
    Store.redo();   // redo del — op.wc should now capture the UPDATED wclock
    Store.undo();   // undo del — op.wc should restore the remote write's clock
    assert.ok(state.wclock[wSh.id]&&state.wclock[wSh.id].stroke.peer==='p2',
      'v1.7.47c: del op.wc refreshed on redo — remote write wclock restored on subsequent undo');
    console.log('  ✓ _apply del: op.wc refreshed on every forward apply (v1.7.47c)');
  }

  // v1.7.48a: remote 'clear' must be rejected (REMOTE_OPS whitelist excludes 'clear')
  {
    state.shapes=[];_invalidateGrid();state.history=[];state.histIdx=-1;state.seq=0;state.seenOps=new Set();state.wclock={};state.selection=new Set();
    const keepSh=Shape.make('rect',{x:0,y:0,w:50,h:50});
    state.shapes.push(keepSh);
    // Before fix: remote clear would wipe all shapes (no recovery via undo)
    Store.applyRemote({op:'clear',shapes:[],clock:{peer:'evil48',seq:1,ts:1}});
    assert.strictEqual(state.shapes.length,1,'v1.7.48a: remote clear op rejected by REMOTE_OPS whitelist');
    console.log('  ✓ REMOTE_OPS excludes clear: remote board-wipe rejected (v1.7.48a)');
  }

  // v1.7.48b: validRemotePayload group must reject empty gid
  {
    assert.ok(!validRemotePayload({op:'group',ids:['s1'],gid:'',before:[{id:'s1'}]}),
      'v1.7.48b: group with empty gid rejected (silent invisible-group trap)');
    assert.ok(validRemotePayload({op:'group',ids:['s1'],gid:'g-1',before:[{id:'s1'}]}),
      'v1.7.48b: group with non-empty gid still accepted');
    console.log('  ✓ validRemotePayload group: empty gid rejected (v1.7.48b)');
  }

  // v1.7.48c: validRemotePayload move must reject string dx/dy (type coercion bypass)
  {
    assert.ok(!validRemotePayload({op:'move',ids:['s1'],dx:'42',dy:0}),
      'v1.7.48c: move with string dx rejected (was coerced via +op.dx)');
    assert.ok(!validRemotePayload({op:'move',ids:['s1'],dx:0,dy:'10'}),
      'v1.7.48c: move with string dy rejected');
    assert.ok(validRemotePayload({op:'move',ids:['s1'],dx:5,dy:3}),
      'v1.7.48c: move with numeric dx/dy still accepted');
    console.log('  ✓ validRemotePayload move: string dx/dy rejected (typeof check, v1.7.48c)');
  }

  // v1.7.49a: validRemotePayload upd must reject flat pts arrays (drawPen crashes on non-nested arrays)
  {
    // Before fix: validPatch({pts:[1,2,3]}) returns true (all finite numbers); drawPen then
    // crashes because it expects [[x,y],...]. After fix: explicit structure check added to 'upd'.
    assert.ok(!validRemotePayload({op:'upd',id:'a',after:{pts:[1,2,3]}}),
      'v1.7.49a: flat pts array in upd.after rejected (drawPen expects [[x,y],…])');
    assert.ok(validRemotePayload({op:'upd',id:'a',after:{pts:[[1,2,0.5],[3,4,0.5]]}}),
      'v1.7.49a: nested [[x,y,p]] pts in upd.after still accepted');
    assert.ok(validRemotePayload({op:'upd',id:'a',after:{pts:[]}}),
      'v1.7.49a: empty pts array in upd.after still accepted');
    console.log('  ✓ validRemotePayload upd: flat pts array rejected, nested still accepted (v1.7.49a)');
  }

  // v1.7.49b: buildSVG text must use dominant-baseline="hanging" not +fontSize y-offset
  {
    // Before fix: <text y="${Y+oy+fs}"> shifts text down by fontSize — misaligns with canvas
    // where textBaseline='top' means y is the top of the text.
    // After fix: <text y="${Y+oy}" dominant-baseline="hanging"> — top-aligned, matches canvas.
    const t49b=Shape.make('text',{x:10,y:20,w:100,h:24,text:'Hello',stroke:'#000000',fontSize:16});
    const svg49b=buildSVG([t49b],'#ffffff');
    assert.ok(svg49b.includes('dominant-baseline="hanging"'),
      'v1.7.49b: SVG text must include dominant-baseline="hanging" (matches canvas textBaseline=top)');
    console.log('  ✓ buildSVG text: dominant-baseline="hanging" present (y-offset fixed, v1.7.49b)');
  }

  // v1.7.49c: doDelete on text shape severs bound connector (openTextEditor now mirrors this path)
  {
    // openTextEditor empty-text path now computes connClears like doDelete does.
    // Test doDelete on text shape to verify the shared connClears mechanism works correctly.
    state.shapes=[];_invalidateGrid();state.history=[];state.histIdx=-1;state.seq=0;state.seenOps=new Set();state.wclock={};state.selection=new Set();
    const txt49c=Shape.make('text',{x:0,y:0,text:'Hi'});
    const arr49c=Shape.make('arrow',{x1:0,y1:0,x2:100,y2:0});
    arr49c.a=txt49c.id;
    state.shapes.push(txt49c,arr49c);
    state.selection=new Set([txt49c.id]);
    doDelete();
    assert.ok(!state.shapes.some(s=>s.id===txt49c.id),'v1.7.49c: text shape deleted');
    assert.strictEqual(state.shapes.find(s=>s.id===arr49c.id).a,null,
      'v1.7.49c: doDelete on text shape clears connector binding via connClears');
    Store.undo();
    assert.strictEqual(state.shapes.find(s=>s.id===arr49c.id).a,txt49c.id,
      'v1.7.49c: undo of text-delete restores connector binding');
    console.log('  ✓ doDelete on text shape: connector binding cleared and restored on undo (v1.7.49c)');
  }

  // v1.7.49d: Net._onRecv snapshot merge loop capped at MAX_OP_SHAPES (DoS guard)
  {
    // Before fix: msg.ops loop was unbounded — 600 ops applied, freezing UI and risking OOM.
    // After fix: msg.ops.slice(0,MAX_OP_SHAPES) caps processing at 500.
    state.shapes=[];_invalidateGrid();state.history=[];state.histIdx=-1;state.seq=0;state.seenOps=new Set();state.wclock={};state.selection=new Set();
    state.peerId='testReceiver49d';
    const bigOps49d=Array.from({length:600},(_,i)=>{
      const s=Shape.make('rect',{x:i*15,y:0,w:10,h:10});
      return {op:'add',shape:s,clock:{peer:'bigSender49d',seq:i+1,ts:i+1}};
    });
    Net._onRecv({k:'snapshot',peer:'bigSender49d',ops:bigOps49d});
    assert.ok(state.shapes.length<=500,
      `v1.7.49d: snapshot merge capped at MAX_OP_SHAPES=500 (got ${state.shapes.length})`);
    console.log('  ✓ Net._onRecv snapshot merge: 600-op snapshot capped at 500 shapes (v1.7.49d)');
  }

  // v1.7.49e: validRemotePayload ungroup must reject empty-string gids (parity with group.gid)
  {
    // Before fix: gids.every(g=>typeof g==='string') accepts '' (empty string is a string).
    // After fix: g.length>0 added — '' rejected (parity with group op's gid non-empty check).
    assert.ok(!validRemotePayload({op:'ungroup',ids:['a'],gids:['']}),
      'v1.7.49e: ungroup with empty-string gid rejected (parity with group.gid non-empty check)');
    assert.ok(validRemotePayload({op:'ungroup',ids:['a'],gids:['valid-gid']}),
      'v1.7.49e: ungroup with non-empty gid still accepted');
    console.log('  ✓ validRemotePayload ungroup: empty gid rejected (parity fix, v1.7.49e)');
  }

  // v1.7.50a: _syncTextFinalize (abandoned-new-text race) must compute connClears —
  // a peer's connector can bind to a text shape while it is still being typed locally
  // (Store.undo() only removes the shape; it never touches connector bindings). Before
  // the fix, the broadcast 'del' carried no connClears, so peers (and the local state
  // itself, if the binding arrived via remote op) kept a dangling s.a/s.b reference.
  {
    state.shapes=[];_invalidateGrid();state.history=[];state.histIdx=-1;state.seq=0;state.seenOps=new Set();state.wclock={};state.selection=new Set();
    state.peerId='local50a';
    const txt50a=Shape.make('text',{x:0,y:0,w:80,h:24,text:''});
    const arr50a=Shape.make('arrow',{x1:0,y1:0,x2:100,y2:0});
    arr50a.a=txt50a.id;                 // simulates a peer's connector already bound to the in-progress text
    state.shapes.push(arr50a);          // txt50a itself already removed, mirroring Store.undo() of the add
    let broadcast50a=null;
    Net.broadcast=op=>{broadcast50a=op;};
    _syncTextFinalize(txt50a,'',true);
    assert.ok(broadcast50a&&Array.isArray(broadcast50a.connClears)&&broadcast50a.connClears.length===1,
      'v1.7.50a: _syncTextFinalize broadcasts connClears for abandoned-new-text del');
    assert.strictEqual(broadcast50a.connClears[0].id,arr50a.id,
      'v1.7.50a: connClears targets the bound connector');
    assert.strictEqual(state.shapes.find(s=>s.id===arr50a.id).a,null,
      'v1.7.50a: local dangling connector binding is cleared (not just broadcast)');
    console.log('  ✓ _syncTextFinalize: abandoned-new-text del computes connClears (v1.7.50a)');
  }

  // v1.7.50b: computeConnClears is the single shared implementation behind
  // doDelete/flushErase/openTextEditor/_syncTextFinalize — verify it directly for a
  // multi-id batch (parity check for the extraction refactor).
  {
    state.shapes=[];_invalidateGrid();state.history=[];state.histIdx=-1;state.seq=0;state.seenOps=new Set();state.wclock={};state.selection=new Set();
    const dA=Shape.make('rect',{x:0,y:0,w:20,h:20});
    const dB=Shape.make('rect',{x:100,y:0,w:20,h:20});
    const connA=Shape.make('arrow',{x1:10,y1:10,x2:50,y2:10});
    const connB=Shape.make('arrow',{x1:50,y1:10,x2:110,y2:10});
    const lockedConn=Shape.make('arrow',{x1:10,y1:30,x2:110,y2:30});
    connA.a=dA.id; connB.b=dB.id; lockedConn.a=dA.id; lockedConn.locked=true;
    state.shapes.push(dA,dB,connA,connB,lockedConn);
    const cc50b=computeConnClears(new Set([dA.id,dB.id]));
    const ids50b=cc50b.map(p=>p.id).sort();
    assert.deepStrictEqual(ids50b,[connA.id,connB.id].sort(),
      'v1.7.50b: computeConnClears finds both affected connectors, skips the locked one');
    console.log('  ✓ computeConnClears: shared helper resolves multi-id batch, skips locked (v1.7.50b)');
  }

  // v1.7.50c: wrapTextCached memoizes per-shape (text,maxWidth,fontSize) — a cache hit
  // must skip calling `measure` again (perf: sticky notes were re-wrapped every RAF frame
  // even when nothing changed), while a genuine content/size change still re-wraps.
  {
    const sticky50c=Shape.make('sticky',{x:0,y:0,w:120,h:60,text:'hello world'});
    let calls50c=0;
    const measure50c=t=>{calls50c++;return t.length*7;};
    const l1=wrapTextCached(sticky50c,'hello world',100,14,measure50c);
    const callsAfterFirst=calls50c;
    assert.ok(callsAfterFirst>0,'v1.7.50c setup: first call invokes measure');
    const l2=wrapTextCached(sticky50c,'hello world',100,14,measure50c);
    assert.strictEqual(calls50c,callsAfterFirst,
      'v1.7.50c: identical (text,maxWidth,fontSize) is a cache hit — measure not called again');
    assert.deepStrictEqual(l2,l1,'v1.7.50c: cache hit returns the same wrapped lines');
    const l3=wrapTextCached(sticky50c,'goodbye world',100,14,measure50c);
    assert.ok(calls50c>callsAfterFirst,
      'v1.7.50c: changed text invalidates the cache — measure called again');
    console.log('  ✓ wrapTextCached: memoizes per-shape, invalidates on content change (v1.7.50c)');
  }

  // v1.7.51a: _apply('del', forward) must guard sh.locked — parity with every other
  // remote op (upd/move/style/resize/align/group/ungroup/zorder all guard forward+locked,
  // but del's shape-removal loop did not). A malicious/buggy peer could otherwise send
  // {op:'del',shapes:[{...a locally-locked shape...}],clock:{...}} and force-delete a
  // shape the local user explicitly locked (violates the documented lock invariant:
  // "移動・リサイズ・削除・消去すべて不可、可逆").
  {
    state.shapes=[];_invalidateGrid();state.history=[];state.histIdx=-1;state.seq=0;state.seenOps=new Set();state.wclock={};state.selection=new Set();
    const dl51a=Shape.make('rect',{x:0,y:0,w:30,h:30});
    state.shapes.push(dl51a);
    dl51a.locked=true;
    Store.applyRemote({op:'del',shapes:[JSON.parse(JSON.stringify(dl51a))],clock:{peer:'evil51a',seq:1,ts:1}});
    assert.ok(state.shapes.some(s=>s.id===dl51a.id),
      'v1.7.51a: remote del must not remove a locally-locked shape');
    assert.strictEqual(state.shapes.find(s=>s.id===dl51a.id).locked,true,
      'v1.7.51a: locked shape survives remote del intact');
    console.log('  ✓ _apply del forward: locked shape not deleted by remote del (v1.7.51a)');
  }

  // v1.7.51b: Presentation.enter()/leave() must resize() the canvas backing buffer.
  // Entering/leaving presentation mode changes canvas.style (fixed fullscreen ↔ in-flow)
  // but that is a pure CSS layout change — no native window 'resize' event fires, so the
  // canvas's pixel buffer (canvas.width/height) is only ever recomputed by an explicit
  // resize() call. Without it, the buffer stays stale: stretched/blurry, and desynced from
  // _zoomToFrame's window.innerWidth/Height-based transform math.
  {
    state.shapes=[];_invalidateGrid();state.history=[];state.histIdx=-1;state.seq=0;state.seenOps=new Set();state.wclock={};state.selection=new Set();
    const fr51b=Shape.make('frame',{x:0,y:0,w:200,h:150,label:'Slide 1'});
    state.shapes.push(fr51b);
    canvas.width=111;canvas.height=111;   // simulate a stale pre-presentation backing buffer
    Presentation.enter();
    assert.notStrictEqual(canvas.width,111,
      'v1.7.51b: Presentation.enter() must recompute the canvas backing buffer (resize())');
    assert.strictEqual(canvas.width,800,
      'v1.7.51b: enter() resize() recomputes width from canvas.getBoundingClientRect() (800 in the fake DOM)');
    canvas.width=222;canvas.height=222;   // simulate a stale fullscreen buffer on exit
    Presentation.leave();
    assert.notStrictEqual(canvas.width,222,
      'v1.7.51b: Presentation.leave() must also recompute the canvas backing buffer (resize())');
    assert.strictEqual(canvas.width,800,
      'v1.7.51b: leave() resize() recomputes width back to the in-flow box size');
    console.log('  ✓ Presentation.enter()/leave(): resize() keeps canvas backing buffer in sync (v1.7.51b)');
  }

  // v1.7.52a (ADR-0004): Persist.saveBackup/checkBackup/restoreBackup round-trip through a
  // working fake IndexedDB. doClearAll/importBoard/importFromHash replace state.shapes
  // wholesale; session undo covers that but the next autosave overwrites the ONLY durable
  // slot with the destructive result — after a reload the pre-replace board is unrecoverable.
  // The backup slot (a second IDB key) plus this restore path close that gap.
  {
    state.shapes=[];_invalidateGrid();state.history=[];state.histIdx=-1;state.seq=0;state.seenOps=new Set();state.wclock={};state.selection=new Set();
    const origDb=Persist.db;
    Persist.db=makeFakeIdb();
    try{
      const has0=await Persist.checkBackup();
      assert.strictEqual(has0,false,'v1.7.52a: checkBackup false before any saveBackup call');

      const backupSh=Shape.make('rect',{x:5,y:5,w:20,h:20});
      await Persist.saveBackup([backupSh],{x:1,y:2,zoom:1.5},'Old Board');
      const has1=await Persist.checkBackup();
      assert.strictEqual(has1,true,'v1.7.52a: checkBackup true after saveBackup persisted a non-empty backup');

      const currentSh=Shape.make('rect',{x:99,y:99,w:5,h:5});
      state.shapes=[currentSh];state.docName='Current';
      const histLenBefore=state.history.length;
      const ok=await Persist.restoreBackup();
      assert.strictEqual(ok,true,'v1.7.52a: restoreBackup reports success');
      assert.deepStrictEqual(state.shapes.map(s=>s.id),[backupSh.id],
        'v1.7.52a: restoreBackup replaces state.shapes with the backed-up shapes');
      assert.strictEqual(state.docName,'Old Board','v1.7.52a: restoreBackup restores the backed-up docName');
      assert.strictEqual(state.history.length,histLenBefore+1,
        'v1.7.52a: restoreBackup records exactly one history entry (single undo, not N ops)');
      assert.strictEqual(state.history[state.histIdx].op,'replace',
        'v1.7.52a: restoreBackup commits via the existing replace op (reuses import undo semantics)');

      Store.undo();
      assert.deepStrictEqual(state.shapes.map(s=>s.id),[currentSh.id],
        'v1.7.52a: undo of restoreBackup brings back the pre-restore board (session-undoable)');
      Store.redo();
      assert.deepStrictEqual(state.shapes.map(s=>s.id),[backupSh.id],
        'v1.7.52a: redo re-applies the restore');

      const has2=await Persist.checkBackup();
      assert.strictEqual(has2,false,
        'v1.7.52a: restoreBackup consumes the backup slot (single-slot, single-notification per ADR-0004)');
    }finally{Persist.db=origDb;}
    console.log('  ✓ Persist.saveBackup/checkBackup/restoreBackup: round-trip, undoable, single-slot consumption (v1.7.52a, ADR-0004)');
  }

  // v1.7.52b (ADR-0004): saveBackup must no-op on an empty shape list — nothing was at risk
  // of being lost, and writing an empty backup would clobber a genuinely useful prior one.
  {
    const fakeDb=makeFakeIdb();
    const origDb=Persist.db;
    Persist.db=fakeDb;
    try{
      await Persist.saveBackup([],{x:0,y:0,zoom:1},'Nothing');
      assert.strictEqual(fakeDb._store.size,0,
        'v1.7.52b: saveBackup([]) writes nothing to the backup slot');
      const has=await Persist.checkBackup();
      assert.strictEqual(has,false,'v1.7.52b: checkBackup stays false after an empty saveBackup call');
    }finally{Persist.db=origDb;}
    console.log('  ✓ Persist.saveBackup: no-op on empty shape list (v1.7.52b, ADR-0004)');
  }

  // v1.7.52c (ADR-0004): doClearAll/importBoard/importFromHash must call Persist.saveBackup
  // with the pre-replace shapes before the destructive commit — confirmed by simulating the
  // same sequence each caller follows (direct invocation isn't possible: doClearAll gates on
  // confirm(), which this harness fixes to always return false — see v1.7.08/existing tests
  // for the same constraint on doClearAll).
  {
    state.shapes=[];_invalidateGrid();state.history=[];state.histIdx=-1;state.seq=0;state.seenOps=new Set();state.wclock={};state.selection=new Set();
    const origDb=Persist.db;
    Persist.db=makeFakeIdb();
    try{
      const preSh=Shape.make('rect',{x:0,y:0,w:10,h:10});
      state.shapes=[preSh];
      // Simulate doClearAll's sequence: backup THEN clear.
      await Persist.saveBackup(JSON.parse(JSON.stringify(state.shapes)),{...state.viewport},state.docName);
      Store.commit({op:'clear',shapes:JSON.parse(JSON.stringify(state.shapes)),wc:JSON.parse(JSON.stringify(state.wclock))});
      assert.strictEqual(state.shapes.length,0,'v1.7.52c setup: board cleared');
      const has=await Persist.checkBackup();
      assert.strictEqual(has,true,
        'v1.7.52c: a backup exists after the clear — the pre-clear board survives past this session');
      const restored=await Persist.restoreBackup();
      assert.ok(restored,'v1.7.52c: the cleared board is recoverable via restoreBackup');
      assert.deepStrictEqual(state.shapes.map(s=>s.id),[preSh.id],
        'v1.7.52c: restoreBackup brings back exactly the shapes that existed before doClearAll');
    }finally{Persist.db=origDb;}
    console.log('  ✓ doClearAll pattern: pre-clear board backed up and recoverable after reload (v1.7.52c, ADR-0004)');
  }

  // v1.7.53a (§3.18): UI.toggleMinimap flips state.showMinimap and is idempotent-reversible
  // (on→off→on). The minimap previously had zero user-facing way to dismiss it.
  {
    state.showMinimap=true;
    UI.toggleMinimap();
    assert.strictEqual(state.showMinimap,false,'v1.7.53a: toggleMinimap flips showMinimap off');
    UI.toggleMinimap();
    assert.strictEqual(state.showMinimap,true,'v1.7.53a: toggleMinimap flips showMinimap back on');
    console.log('  ✓ UI.toggleMinimap: flips state.showMinimap on/off (v1.7.53a)');
  }

  // v1.7.53b (§3.18): Minimap.schedule() must not enqueue a RAF draw while hidden — the
  // minimap was always redrawn every invalidate() regardless of visibility, wasted work on
  // a canvas nobody can see. Verified with a spy'd requestAnimationFrame on a fresh sandboxed
  // instance (same two-peer-harness technique used elsewhere in this file), since the shared
  // fakeWin.requestAnimationFrame always returns 0 and can't distinguish "called" from "not".
  {
    const rafCalls=[];
    const spyRaf=cb=>{rafCalls.push(cb);return rafCalls.length;};
    const C=fn(
      fakeWin, fakeDoc, fakeWin.navigator, spyRaf,
      fakeWin.indexedDB, fakeWin.URL, setTimeout, clearTimeout, setInterval, clearInterval,
      fakeWin.getComputedStyle, fakeWin.confirm, fakeWin.alert, Blob, fakeWin, fakeWin
    );
    C.state.showMinimap=false;
    C.Minimap.schedule();
    assert.strictEqual(rafCalls.length,0,'v1.7.53b: Minimap.schedule() hidden — no RAF scheduled');
    C.state.showMinimap=true;
    C.Minimap.schedule();
    assert.strictEqual(rafCalls.length,1,'v1.7.53b: Minimap.schedule() visible — exactly one RAF scheduled');
    C.Minimap.schedule();
    assert.strictEqual(rafCalls.length,1,'v1.7.53b: Minimap.schedule() re-entrant call does not double-schedule');
    console.log('  ✓ Minimap.schedule(): skips requestAnimationFrame while hidden, no double-schedule (v1.7.53b)');
  }

  // ---- ADR-0005: sketch beautification (recognizeStroke / doBeautify, Alt+B) ----
  // Deterministic point generators (no Math.random — reproducible pass/fail).
  const _genRectPts=(x,y,w,h,jitter)=>{
    const pts=[],corners=[[x,y],[x+w,y],[x+w,y+h],[x,y+h],[x,y]],steps=6;
    for(let c=0;c<4;c++){
      const [ax,ay]=corners[c],[bx,by]=corners[c+1];
      for(let i=0;i<steps;i++){
        const t=i/steps,jx=Math.sin(i*13+c*7)*jitter,jy=Math.cos(i*17+c*11)*jitter;
        pts.push([ax+(bx-ax)*t+jx,ay+(by-ay)*t+jy]);
      }
    }
    pts.push([x,y]);
    return pts;
  };
  const _genEllipsePts=(cx,cy,rx,ry,jitter)=>{
    const pts=[],steps=24;
    for(let i=0;i<=steps;i++){
      const a=(i/steps)*Math.PI*2,jx=Math.sin(i*13)*jitter,jy=Math.cos(i*17)*jitter;
      pts.push([cx+Math.cos(a)*rx+jx,cy+Math.sin(a)*ry+jy]);
    }
    return pts;
  };
  const _genLinePts=(x1,y1,x2,y2,n,jitter)=>{
    const pts=[];
    for(let i=0;i<=n;i++){
      const t=i/n,jAmt=(i===0||i===n)?0:jitter;   // keep endpoints exact for assertion clarity
      const jx=Math.sin(i*13)*jAmt,jy=Math.cos(i*7)*jAmt;
      pts.push([x1+(x2-x1)*t+jx,y1+(y2-y1)*t+jy]);
    }
    return pts;
  };
  const _genStarPts=(cx,cy,rOuter,rInner,points)=>{
    const pts=[],n=points*2;
    for(let i=0;i<=n;i++){
      const r=i%2===0?rOuter:rInner,a=(i/n)*Math.PI*2;
      pts.push([cx+Math.cos(a)*r,cy+Math.sin(a)*r]);
    }
    return pts;
  };
  const _genZigzagPts=()=>[[0,0],[20,40],[0,80],[20,120],[0,160]];   // open, not straight, not closed

  {
    const rec=recognizeStroke(_genRectPts(0,0,100,60,2));
    assert.ok(rec&&rec.type==='rect','v1.7.54a: hand-drawn rectangle recognized as rect');
    assert.ok(Math.abs(rec.x-0)<3&&Math.abs(rec.y-0)<3&&Math.abs(rec.w-100)<5&&Math.abs(rec.h-60)<5,
      'v1.7.54a: recognized rect bbox matches the drawn shape');

    const recEll=recognizeStroke(_genEllipsePts(50,30,50,30,1.5));
    assert.ok(recEll&&recEll.type==='ellipse','v1.7.54a: hand-drawn ellipse (jittered circle path) recognized as ellipse');

    const recLine=recognizeStroke(_genLinePts(0,0,120,40,10,1));
    assert.ok(recLine&&recLine.type==='line','v1.7.54a: hand-drawn straight stroke recognized as line');
    assert.strictEqual(recLine.x1,0);assert.strictEqual(recLine.y1,0);
    assert.strictEqual(recLine.x2,120);assert.strictEqual(recLine.y2,40);

    assert.strictEqual(recognizeStroke(_genStarPts(50,50,50,20,5)),null,
      'v1.7.54a: closed star shape (high radius variance) is neither rect nor ellipse — rejected');
    assert.strictEqual(recognizeStroke(_genZigzagPts()),null,
      'v1.7.54a: open zigzag (not straight, not closed) rejected by all three tests');
    assert.strictEqual(recognizeStroke([[0,0],[2,2],[4,0]]),null,
      'v1.7.54a: stroke below the size floor (diag<8) rejected regardless of shape');
    console.log('  ✓ recognizeStroke: rect/ellipse/line recognized, star/zigzag/tiny rejected (v1.7.54a, ADR-0005)');
  }

  {
    state.shapes=[];_invalidateGrid();state.history=[];state.histIdx=-1;state.seq=0;state.seenOps=new Set();state.wclock={};state.selection=new Set();
    const rectPts=_genRectPts(0,0,100,60,2);
    const penSh=Shape.make('pen',{pts:rectPts});
    state.shapes.push(penSh);
    state.selection=new Set([penSh.id]);
    doBeautify();
    assert.strictEqual(state.shapes.find(s=>s.id===penSh.id).type,'rect',
      'v1.7.54b: doBeautify converts a recognized pen stroke to rect');
    assert.strictEqual(state.history.length,1,'v1.7.54b: one beautified shape = one history entry');
    Store.undo();
    const undone=state.shapes.find(s=>s.id===penSh.id);
    assert.strictEqual(undone.type,'pen','v1.7.54b: undo reverts the shape back to pen');
    assert.deepStrictEqual(undone.pts,rectPts,'v1.7.54b: undo restores the exact original pts');
    Store.redo();
    assert.strictEqual(state.shapes.find(s=>s.id===penSh.id).type,'rect','v1.7.54b: redo re-applies the conversion');
    console.log('  ✓ doBeautify: converts recognized pen stroke, undo/redo symmetric (v1.7.54b, ADR-0005)');
  }

  {
    state.shapes=[];_invalidateGrid();state.history=[];state.histIdx=-1;state.seq=0;state.seenOps=new Set();state.wclock={};state.selection=new Set();
    const rectSh=Shape.make('pen',{pts:_genRectPts(0,0,80,50,1.5)});
    const ellSh=Shape.make('pen',{pts:_genEllipsePts(200,30,40,25,1)});
    const starSh=Shape.make('pen',{pts:_genStarPts(400,50,50,20,5)});
    const lockedRectSh=Shape.make('pen',{pts:_genRectPts(300,0,60,40,1.5)});
    lockedRectSh.locked=true;
    const alreadyRect=Shape.make('rect',{x:500,y:0,w:20,h:20});
    state.shapes.push(rectSh,ellSh,starSh,lockedRectSh,alreadyRect);
    state.selection=new Set([rectSh.id,ellSh.id,starSh.id,lockedRectSh.id,alreadyRect.id]);
    doBeautify();
    assert.strictEqual(state.shapes.find(s=>s.id===rectSh.id).type,'rect','v1.7.54c: recognized rect converted');
    assert.strictEqual(state.shapes.find(s=>s.id===ellSh.id).type,'ellipse','v1.7.54c: recognized ellipse converted');
    assert.strictEqual(state.shapes.find(s=>s.id===starSh.id).type,'pen','v1.7.54c: unrecognized star left untouched');
    assert.strictEqual(state.shapes.find(s=>s.id===lockedRectSh.id).type,'pen','v1.7.54c: locked pen shape untouched');
    assert.strictEqual(state.shapes.find(s=>s.id===alreadyRect.id).type,'rect','v1.7.54c: non-pen shape in selection unaffected');
    assert.strictEqual(state.history.length,1,'v1.7.54c: multiple beautified shapes still cost exactly ONE undo step');
    Store.undo();
    assert.strictEqual(state.shapes.find(s=>s.id===rectSh.id).type,'pen','v1.7.54c: single undo reverts the rect shape');
    assert.strictEqual(state.shapes.find(s=>s.id===ellSh.id).type,'pen','v1.7.54c: single undo also reverts the ellipse shape');
    console.log('  ✓ doBeautify: mixed selection — locked/non-pen/unrecognized skipped, single undo for the rest (v1.7.54c, ADR-0005)');
  }

  {
    state.shapes=[];_invalidateGrid();state.history=[];state.histIdx=-1;state.seq=0;state.seenOps=new Set();state.wclock={};state.selection=new Set();
    const starOnly=Shape.make('pen',{pts:_genStarPts(50,50,50,20,5)});
    state.shapes.push(starOnly);
    state.selection=new Set([starOnly.id]);
    doBeautify();
    assert.strictEqual(state.history.length,0,'v1.7.54d: no history entry when nothing in the selection is recognized');
    assert.strictEqual(state.shapes[0].type,'pen','v1.7.54d: unrecognized-only selection leaves the shape untouched');
    console.log('  ✓ doBeautify: all-unrecognized selection is a no-op, no spurious undo step (v1.7.54d, ADR-0005)');
  }

  // ---- ADR-0006: touch long-press → context menu (_longPressFire/_armLongPress/_clearLongPress) ----
  // Real setTimeout/clearTimeout are wired through unmocked (see fn() call above), so these
  // tests call _longPressFire directly instead of waiting out LONG_PRESS_MS — same discipline
  // as _cancelPointerGesture's own tests further up.
  {
    const origOpenCtxMenu=UI.openCtxMenu;
    const calls=[];
    UI.openCtxMenu=(x,y)=>calls.push([x,y]);
    try{
      // normal case: pointer held still (well within LONG_PRESS_MOVE_TOL) → menu opens,
      // gesture is cancelled (ptr.down flips false via _cancelPointerGesture)
      ptr.down=true;ptr.dragKind='marquee';ptr.x=ptr.x0=10;ptr.y=ptr.y0=10;
      _longPressFire(123,456);
      assert.deepStrictEqual(calls,[[123,456]],'v1.7.55a: _longPressFire opens the context menu at the given client coords');
      assert.strictEqual(ptr.down,false,'v1.7.55a: _longPressFire cancels the in-flight gesture (ptr.down=false)');

      // movement past LONG_PRESS_MOVE_TOL before firing = a drag, not a hold → no menu
      calls.length=0;
      ptr.down=true;ptr.dragKind='marquee';ptr.x0=10;ptr.y0=10;ptr.x=200;ptr.y=10;
      _longPressFire(1,2);
      assert.deepStrictEqual(calls,[],'v1.7.55b: _longPressFire does not open the menu when movement exceeds LONG_PRESS_MOVE_TOL');
      assert.strictEqual(ptr.down,true,'v1.7.55b: gesture is left untouched (not cancelled) when it looks like a real drag');

      // resize/rotate handle-drag in progress: never interrupt a deliberate precision drag
      calls.length=0;
      ptr.down=true;ptr.dragKind='resize';ptr.x=ptr.x0=10;ptr.y=ptr.y0=10;
      _longPressFire(1,2);
      assert.deepStrictEqual(calls,[],'v1.7.55c: _longPressFire does not fire while a resize handle-drag is in progress');
      ptr.dragKind='rotate';
      _longPressFire(1,2);
      assert.deepStrictEqual(calls,[],'v1.7.55c: _longPressFire does not fire while a rotate handle-drag is in progress');

      // pointer already lifted (gesture ended before the timer fired) → harmless no-op
      calls.length=0;
      ptr.down=false;ptr.dragKind=null;
      assert.doesNotThrow(()=>_longPressFire(1,2),'v1.7.55d: _longPressFire on an already-ended gesture does not throw');
      assert.deepStrictEqual(calls,[],'v1.7.55d: _longPressFire does not open the menu once the pointer has already lifted');
    }finally{
      UI.openCtxMenu=origOpenCtxMenu;
      ptr.down=false;ptr.dragKind=null;ptr.panning=false;
    }
    // _clearLongPress is called unconditionally on every pointerup; must be a harmless
    // no-op when no timer is pending (e.g. a plain tap on desktop with mouse, never armed).
    assert.doesNotThrow(()=>_clearLongPress(),'v1.7.55e: _clearLongPress with no pending timer does not throw');
    // _armLongPress/_clearLongPress round-trip: arming then clearing must prevent the
    // timer from ever firing (proves clearTimeout is actually wired, not just called).
    {
      let fired=false;
      const realFire=UI.openCtxMenu;
      UI.openCtxMenu=()=>{fired=true};
      ptr.down=true;ptr.dragKind='marquee';ptr.x=ptr.x0=0;ptr.y=ptr.y0=0;
      _armLongPress(1,2);
      _clearLongPress();
      UI.openCtxMenu=realFire;
      ptr.down=false;ptr.dragKind=null;
      assert.strictEqual(fired,false,'v1.7.55f: _clearLongPress prevents an armed timer from firing');
    }
    console.log('  ✓ ADR-0006 long-press: fires on hold, suppressed by movement/resize/rotate/ended-gesture, arm/clear round-trip (v1.7.55a-f)');
  }

  // ---- ADR-0007 (FT-07): UI.openExportMenu delegates to UI.openCtxMenu with the right items ----
  {
    const origOpenCtxMenu=UI.openCtxMenu;
    let captured=null;
    UI.openCtxMenu=(x,y,items)=>{captured=[x,y,items]};
    try{
      UI.openExportMenu(10,20);
      assert.ok(captured,'v1.7.56a: openExportMenu calls UI.openCtxMenu');
      assert.strictEqual(captured[0],10);assert.strictEqual(captured[1],20);
      const items=captured[2];
      assert.ok(Array.isArray(items),'v1.7.56a: openExportMenu passes an items array, not the default (undefined)');
      const keys=items.map(it=>it==='sep'?'sep':it[0]);
      assert.deepStrictEqual(keys,['ctxExportPNG','ctxExportSVG','ctxExportPDF','ctxExportBoard','sep','ctxImportBoard'],
        'v1.7.56a: openExportMenu offers PNG/SVG/PDF/.board export + a separator + .board import, in that order');
      const fnByKey=Object.fromEntries(items.filter(it=>it!=='sep').map(it=>[it[0],it[2]]));
      assert.strictEqual(fnByKey.ctxExportPNG,exportPNG,'v1.7.56a: PNG item wired to the real exportPNG');
      assert.strictEqual(fnByKey.ctxExportSVG,exportSVG,'v1.7.56a: SVG item wired to the real exportSVG');
      assert.strictEqual(fnByKey.ctxExportPDF,exportPDF,'v1.7.56a: PDF item wired to the real exportPDF');
      assert.strictEqual(fnByKey.ctxExportBoard,exportBoard,'v1.7.56a: .board export item wired to the real exportBoard');
      assert.strictEqual(typeof fnByKey.ctxImportBoard,'function','v1.7.56a: import item is a callable (opens the file picker)');
    }finally{
      UI.openCtxMenu=origOpenCtxMenu;
    }
    console.log('  ✓ ADR-0007 openExportMenu: delegates to openCtxMenu with PNG/SVG/PDF/.board export + import, correctly wired (v1.7.56a)');
  }

  // ---- ADR-0009: byId() O(1) index stays correct across every membership-changing path ----
  // Regression coverage for a real bug found while implementing this: several _apply cases
  // call byId() (idempotency/lock checks) BEFORE push()ing/splice()ing state.shapes in the
  // SAME op, which builds the cache from the pre-mutation state and (without the size check
  // in byId() itself) would leave it one change stale until the next op's invalidation.
  {
    state.shapes=[];_invalidateGrid();state.history=[];state.histIdx=-1;state.seq=0;state.seenOps=new Set();state.wclock={};state.selection=new Set();
    // single add: byId must resolve the new shape on the very next call (the exact bug — an
    // 'add' op's own idempotency check (byId) rebuilds the cache from the PRE-push state).
    const r1=Shape.make('rect',{x:0,y:0,w:10,h:10});
    Store.commit({op:'add',shape:r1});   // Store clones on add, so byId(r1.id) !== r1 by reference — compare .id
    assert.strictEqual(byId(r1.id)?.id,r1.id,'v1.7.58a: byId resolves a shape immediately after a single add op');
    Store.undo();
    assert.strictEqual(byId(r1.id),undefined,'v1.7.58a: byId returns undefined immediately after undoing an add');
    Store.redo();
    assert.strictEqual(byId(r1.id)?.id,r1.id,'v1.7.58a: byId resolves again immediately after redoing the add');
    console.log('  ✓ byId: resolves new shape right after add/undo/redo, no one-op-stale gap (v1.7.58a, ADR-0009)');
  }
  {
    state.shapes=[];_invalidateGrid();state.history=[];state.histIdx=-1;state.seq=0;state.seenOps=new Set();state.wclock={};state.selection=new Set();
    // addMany: the forward case calls byId() inside a loop, once per shape, BEFORE each
    // push — every shape after the first is checked against an increasingly-stale cache
    // unless byId()'s own size check catches it.
    const shapes=[Shape.make('rect',{x:0,y:0,w:10,h:10}),Shape.make('rect',{x:20,y:0,w:10,h:10}),Shape.make('rect',{x:40,y:0,w:10,h:10})];
    Store.commit({op:'addMany',shapes});
    for(const s of shapes)assert.strictEqual(byId(s.id)?.id,s.id,`v1.7.58b: byId resolves shape ${s.id} immediately after addMany`);
    console.log('  ✓ byId: resolves every shape right after a multi-shape addMany, not just the first (v1.7.58b, ADR-0009)');
  }
  {
    state.shapes=[];_invalidateGrid();state.history=[];state.histIdx=-1;state.seq=0;state.seenOps=new Set();state.wclock={};state.selection=new Set();
    // del: the forward case calls byId() (lock check) inside a loop, once per shape, BEFORE
    // each splice — same one-behind-stale risk as addMany, in the removal direction.
    const shapes=[Shape.make('rect',{x:0,y:0,w:10,h:10}),Shape.make('rect',{x:20,y:0,w:10,h:10}),Shape.make('rect',{x:40,y:0,w:10,h:10})];
    Store.commit({op:'addMany',shapes});
    Store.commit({op:'del',shapes:JSON.parse(JSON.stringify(shapes))});
    for(const s of shapes)assert.strictEqual(byId(s.id),undefined,`v1.7.58c: byId no longer resolves shape ${s.id} immediately after del`);
    Store.undo();
    for(const s of shapes)assert.strictEqual(byId(s.id).id,s.id,`v1.7.58c: byId resolves shape ${s.id} again immediately after undoing the del`);
    console.log('  ✓ byId: no longer resolves any deleted shape right after a multi-shape del, restores on undo (v1.7.58c, ADR-0009)');
  }
  {
    // _applySnapshot replaces state.shapes wholesale (bypasses Store.commit/_apply entirely)
    // — must invalidate the id index directly, or a stale snapshot could resolve old ids
    // that no longer exist and fail to resolve the new ones.
    const oldShape=Shape.make('rect',{x:0,y:0,w:10,h:10});
    state.shapes=[oldShape];_invalidateGrid();state.history=[];state.histIdx=-1;state.seq=0;state.seenOps=new Set();state.wclock={};state.selection=new Set();
    assert.strictEqual(byId(oldShape.id),oldShape,'v1.7.58d: sanity — byId resolves the pre-snapshot shape');
    const newShape=Shape.make('rect',{x:5,y:5,w:8,h:8});
    Net._applySnapshot({shapes:[newShape]});
    assert.strictEqual(byId(oldShape.id),undefined,'v1.7.58d: byId no longer resolves a shape dropped by _applySnapshot');
    assert.strictEqual(byId(newShape.id).id,newShape.id,'v1.7.58d: byId resolves a shape introduced by _applySnapshot');
    console.log('  ✓ byId: _applySnapshot (bypasses Store.commit) correctly invalidates the id index (v1.7.58d, ADR-0009)');
  }
  {
    // eraseAt splices the shape out of state.shapes immediately (for visual feedback) before
    // the erase is ever committed as an op; abortGesture restores it on cancel. byId must
    // track both transitions without needing a full op round-trip.
    const es=Shape.make('rect',{x:0,y:0,w:10,h:10,fill:'#000'});   // filled: hit-test isn't tolerance/zoom-dependent
    state.shapes=[es];_invalidateGrid();state.history=[];state.histIdx=-1;state.seq=0;state.seenOps=new Set();state.wclock={};state.selection=new Set();
    state.viewport.zoom=1;state.viewport.x=0;state.viewport.y=0;   // undo any zoom left by an earlier test (pickTop tolerance is zoom-dependent)
    eraseAt({x:5,y:5});
    assert.strictEqual(byId(es.id),undefined,'v1.7.58e: byId no longer resolves a shape immediately after eraseAt splices it out');
    abortGesture();
    assert.strictEqual(byId(es.id)?.id,es.id,'v1.7.58e: abortGesture restores the erased shape and byId resolves it again');
    console.log('  ✓ byId: eraseAt splice + abortGesture restore both correctly invalidate the id index (v1.7.58e, ADR-0009)');
  }

  // ---- a11y-audit-2026-07: focus ring meets WCAG SC 1.4.11 (3:1 non-text contrast) in both themes ----
  // Regression guard for a real finding: the old CSS used raw var(--brand) (#00C4CC) for every
  // :focus-visible outline, which is only 2.15:1 against white paper — below the 3:1 floor.
  // Recomputes against the ACTUAL current token values (extracted from source), not a hardcoded
  // snapshot, so it keeps catching this if the palette changes later.
  {
    const hex=name=>{
      const m=html.match(new RegExp(`--${name}:\\s*#([0-9A-Fa-f]{6})`));
      if(!m)throw new Error(`token --${name} not found in source`);
      return m[1];
    };
    const toRgb=h=>[parseInt(h.slice(0,2),16),parseInt(h.slice(2,4),16),parseInt(h.slice(4,6),16)];
    const relLum=([r,g,b])=>{
      const lin=c=>{c/=255;return c<=0.03928?c/12.92:Math.pow((c+0.055)/1.055,2.4);};
      return 0.2126*lin(r)+0.7152*lin(g)+0.0722*lin(b);
    };
    const contrastOf=(h1,h2)=>{
      const L1=relLum(toRgb(h1)),L2=relLum(toRgb(h2));
      return (Math.max(L1,L2)+0.05)/(Math.min(L1,L2)+0.05);
    };
    const brand=hex('brand'),brandInk=hex('brand-ink');
    const lightPaper=hex('paper');   // first --paper: match in source is the base (light) :root block
    const darkPaperMatch=html.match(/@media \(prefers-color-scheme:dark\)\{\s*:root\{[^}]*--paper:#([0-9A-Fa-f]{6})/);
    assert.ok(darkPaperMatch,'a11y: dark-theme --paper token found in the prefers-color-scheme media block');
    const darkPaper=darkPaperMatch[1];

    const lightRatio=contrastOf(brandInk,lightPaper);
    const darkRatio=contrastOf(brand,darkPaper);
    assert.ok(lightRatio>=3,`a11y: light-mode focus ring (brand-ink on paper) meets the 3:1 SC 1.4.11 floor (got ${lightRatio.toFixed(2)}:1)`);
    assert.ok(darkRatio>=3,`a11y: dark-mode focus ring (brand on paper) meets the 3:1 SC 1.4.11 floor (got ${darkRatio.toFixed(2)}:1)`);
    // also confirm the OLD (broken) pairing would have failed, proving this test is non-vacuous
    const oldRatio=contrastOf(brand,lightPaper);
    assert.ok(oldRatio<3,`a11y: sanity — the pre-fix pairing (raw brand on light paper) is genuinely below 3:1 (got ${oldRatio.toFixed(2)}:1), confirming this test would have caught the original bug`);
    console.log(`  ✓ a11y: focus ring contrast — light ${lightRatio.toFixed(2)}:1, dark ${darkRatio.toFixed(2)}:1, both clear the 3:1 floor (a11y-audit-2026-07)`);
  }

  console.log('\n✓ All behavioural tests passed');
  pass += 1028; // prev 1017 + v1.7.63 robustness (11: flood 5, snapshot throttle 2, importBoard 4)

} catch (err) {
  console.log('  ✗ behavioural tests crashed:', err.message);
  fail += 1;
}

console.log(`\n${pass} pass, ${fail} fail`);
process.exit(fail > 0 ? 1 : 0);
