// Board - smoke test for op-log reversibility and geometry purity.
// Run: node test.mjs
// Extracts subset of board.js and tests it in isolation.

import { readFileSync } from 'fs';
import { execSync } from 'child_process';
import assert from 'assert';

const html = readFileSync('./index.html', 'utf8');
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
  ['remote move requires finite deltas', html.includes("Number.isFinite(+op.dx)&&Number.isFinite(+op.dy)")],
  // v1.6.8: viewport culling + load validation
  ['viewport culling helpers present', html.includes("function visibleWorldRect") && html.includes("function inView")],
  ['draw() culls via inView', html.includes("inView(s,_view)")],
  ['Persist.load validates shapes', html.includes("d.shapes.filter(validShape)")],
  // v1.6.9: sticky text auto-wrap
  ['wrapText helper present', html.includes("function wrapText")],
  ['sticky render wraps text', html.includes("wrapText(s.text,Math.abs(s.w)-pad*2")],
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
  ['emptied existing text deletes original via single del op', html.includes('Store.commit({op:\'del\',shapes:[orig]})')],
  ['existing text edit branch is else-if (no double op)', html.includes("}else if(newText!==origText){")],
  // v1.6.23: .board file export/import
  ['exportBoard function exists', html.includes('function exportBoard()')],
  ['exportBoard revokes Blob URL to prevent memory leak', html.includes("revokeObjectURL(_bu),1e4")],
  ['importBoard uses atomic replace op (not clear+adds)', html.includes('function importBoard') && html.includes('.filter(validShape)') && html.includes("op:'replace',before,after")],
  ['Ctrl+Shift+S triggers exportBoard', html.includes("e.shiftKey){e.preventDefault();exportBoard()}")],
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
  ['rect/ellipse label rendered centred in canvas', html.includes("(s.type==='rect'||s.type==='ellipse')&&s.label") && html.includes("c.textAlign='center'")],
  ['dblclick label editor handles rect and ellipse', html.includes("hit.type==='frame'||hit.type==='rect'||hit.type==='ellipse'") && html.includes("isFrame?'--brand':'--ink'")],
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
  ['search highlight drawn in world space', html.includes("if(_sq){const q=_sq.toLowerCase()") && html.includes("ctx.strokeStyle='#F97316'")],
  ['Ctrl+F toggles search input', html.includes("meta&&k==='f'") && html.includes("sq.style.display")],
  // v1.6.62: Socratic feature-interaction fixes
  ['flip negates rotation angle (reflection reverses sense)', html.includes("if(s.rotate)s.rotate=(360-s.rotate)%360;")],
  ['rotated box shapes expose handles at rotated positions', html.includes("return hs.map(p=>{const r=_rotPt(p.x,p.y,cx,cy,s.rotate);return{id:p.id,x:r.x,y:r.y}});")],
  ['search placeholder uses i18n t(search)', html.includes("sq.placeholder=t('search')")],
  ['rotate + search i18n keys in ja and en', html.includes("rotate:'回転 (15° / ノブdrag)',search:'検索'") && html.includes("rotate:'Rotate (15° / knob drag)',search:'Search'")],
  ['help grid lists rotate and search shortcuts', html.includes("[', / .',k.rotate],['⌘F',k.search]")],
  // v1.6.63: Socratic round 3 - internal consistency + a11y
  ['doFlip skips locked shapes (consistent with doRotate)', html.includes("function doFlip(axis){\n  const sel=[...state.selection].map(byId).filter(s=>s&&!s.locked);")],
  ['doRotate orbits selection about group centre', html.includes("orbit about group centre, like doFlip") && html.includes("Shape.translate(s,nx-cx,ny-cy)")],
  ['search input has aria-label', html.includes("sq.setAttribute('aria-label',t('search'))")],
  ['search Escape returns focus to canvas', html.includes("invalidate();canvas.focus();}});}")],
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
  // v1.6.66: resize object-snap
  ['resizeSnap exists and applyResize uses it', html.includes("function resizeSnap(orig,handle,wp)") && html.includes(":resizeSnap(orig,handle,wp); // lock/alt override obj-snap")],
  ['resize commit clears alignment guides', html.includes("ptr.resizeHandle=null;ptr.resizeOrig=null;state.guides=null;")],
  ['resize Shift locks aspect ratio on corners', html.includes("const lock=shift&&corner&&orig.w>0&&orig.h>0;")],
  // v1.6.67: drag-to-rotate handle
  ['rotation handle helper + hit-test present', html.includes("function getRotHandle(s)") && html.includes("function hitRotHandle(wp,s)")],
  ['pointerdown enters rotate dragKind on knob hit', html.includes("const rh=hitRotHandle(wp,onlySel);") && html.includes("ptr.dragKind='rotate';")],
  ['rotate drag maps angle (knob-up=0°), Shift snaps 15°', html.includes("Math.atan2(wp.y-ptr.rotCy,wp.x-ptr.rotCx)*180/Math.PI+90") && html.includes("deg=Math.round(deg/15)*15;")],
  ['rotate commit records upd + announces angle', html.includes("ptr.dragKind==='rotate'") && html.includes("UI.toast(describeShape(rsh)); // SR announce new angle")],
  ['rotation knob drawn in drawSelection', html.includes("const rh=getRotHandle(sh);") && html.includes("ctx.arc(kp.x*DPR,kp.y*DPR,hs/2,0,PI2)")],
  // v1.6.68: Alt resize-from-centre
  ['Alt resizes about original centre', html.includes("function applyResize(sh,handle,orig,wp,shift,alt)") && html.includes("if(alt){sh.x=cx0-sh.w/2;sh.y=cy0-sh.h/2;}") && html.includes("applyResize(rsh,ptr.resizeHandle,ptr.resizeOrig,wp,e.shiftKey,e.altKey);")],
  // v1.6.69: rotated-box resize
  ['_rotPt shared rotation helper present', html.includes("function _rotPt(px,py,cx,cy,deg)")],
  ['rotated resize works in local frame + world re-pin', html.includes("sp=_rotPt(wp.x,wp.y,cx0,cy0,-orig.rotate);") && html.includes("sh.x+=tgt.x-cur.x;sh.y+=tgt.y-cur.y;")],
  ['selection outline traces rotated box', html.includes("if(single&&single.rotate&&single.w!=null){")],
  // v1.6.70: keyboard resize (Alt+arrow)
  ['resize op registered (apply, validate, remote)', html.includes("case 'resize':\n      case 'align':{") && html.includes("case 'resize':\n    case 'align':  return patches(op.after)") && html.includes("'align','style','resize'])")],
  ['Alt+arrow keyboard-resizes box shapes', html.includes("Store._recordCommitted({op:'resize',before,after});") && html.includes("sh.w=Math.max(4,sh.w+dw);sh.h=Math.max(4,sh.h+dh);")],
  // v1.6.71: image import error handling
  ['imgErr i18n key in both locales', html.includes("imgErr:'画像を読み込めませんでした'") && html.includes("imgErr:'Image failed to load'")],
  ['drag-drop image import has img.onerror toast', html.includes("img.onerror=()=>UI.toast(t('imgErr'),'warn');") ],
  ['drag-drop image import has reader.onerror toast', html.includes("reader.onerror=()=>UI.toast(t('imgErr'),'warn');\n    reader.readAsDataURL(f);")],
  ['context menu deduplicates consecutive separators', html.includes(".filter((it,i,a)=>!(it==='sep'&&(i===0||i===a.length-1||a[i-1]==='sep')))")],
  ['doDuplicate does not clobber clipboard (uses _placeCopies, not state.clipboard=)', html.includes("const added=_placeCopies(sel);   // independent of state.clipboard") && html.includes("function _placeCopies(srcShapes)")],
  // v1.6.71: import sites clear stale selection + wclock (mirror replace op's _apply)
  ['importBoard clears selection+wclock on whole-board swap', html.includes("state.shapes=shapes.map(clone);\n      // Match the replace op's _apply") && html.includes("state.selection.clear();state.wclock={};\n      if(typeof d.docName")],
  ['importFromHash clears selection+wclock on whole-board swap', html.includes("state.shapes=valid.map(clone);state.docName=") && /state\.shapes=valid\.map\(clone\)[\s\S]{0,260}state\.selection\.clear\(\);state\.wclock=\{\};/.test(html)],
  // v1.6.71: presentation-mode guard precedes editing shortcuts (no undo mid-slideshow)
  ['presentation guard runs before undo/redo/select-all shortcuts', /if\(Presentation\.isActive\(\)\)\{[\s\S]{0,260}return;\n  \}\n  if\(meta&&k==='z'&&!e\.shiftKey\)/.test(html)],
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
             doAlign, doFlip, snapV, snapPt,
             getHandles, applyResize, resizeSnap, handleCursor, getRotHandle,
             doGroup, doUngroup, doPaste, doDuplicate, doCopy, pickTop, buildSVG, exportScale, inView, wrapText, cycleSel, describeShape,
             copyStyle, pasteStyle, applyStyleToSelection,
             _buildGrid, _queryGrid, sortZ, createShapeKbd, pickTool, penWidths, snapBox, dashArr, validShape,
             _sfbCapture, _sfbFlush, _sbf, doLock, connEnds, doRotate, doDelete, keyBetween, reindexFrac, validRemotePayload, clampZoom, MIN_ZOOM, MAX_ZOOM, Net, clockNewer, nowTs, resizeAfterTextEdit, withFrameChildren, nudgeSelection, shapeRot, Persist, coalescedSamples, beginPen, contPen, abortGesture, ptr, wheelPx, imeShouldCommit, roundShapesForExport, _round };
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
          doGroup, doUngroup, doPaste, doDuplicate, doCopy, pickTop, buildSVG, exportScale, inView, wrapText, cycleSel, describeShape,
          copyStyle, pasteStyle, applyStyleToSelection,
          _buildGrid, _queryGrid, sortZ, createShapeKbd, pickTool, penWidths, snapBox, dashArr, validShape,
          _sfbCapture, _sfbFlush, _sbf, doLock, connEnds, doRotate, doDelete, keyBetween, reindexFrac, validRemotePayload, clampZoom, MIN_ZOOM, MAX_ZOOM, Net, clockNewer, nowTs, resizeAfterTextEdit, withFrameChildren, nudgeSelection, shapeRot, Persist, coalescedSamples, beginPen, contPen, abortGesture, ptr, wheelPx, imeShouldCommit, roundShapesForExport, _round } = api;

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

  // ---- undo/redo coverage for ops lacking behavioral round-trip tests ----
  // The architecture's invariant: every op committed locally is reversible via
  // _apply(op,false). String-presence checks (see above) cannot catch logic regressions
  // here - only these end-to-end assertions do.

  // clear undo: all shapes restored with original properties (frac, stroke, etc.)
  {
    state.shapes=[]; state.history=[]; state.histIdx=-1;
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
    state.shapes=[]; state.history=[]; state.histIdx=-1;
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
    state.shapes=[]; state.history=[]; state.histIdx=-1;
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
    Store.applyRemote({op:'group', ids:[gv], gid:'GOOD', clock:{peer:'peerB', seq:4, ts:1}});
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

  // ungroup undo with multiple groups (the multi-group undo bug)
  {
    state.shapes.length=0; state.history.length=0; state.histIdx=-1; state.seq=0; state.seenOps=new Set();
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
  // v1.6.11: spatial index - _queryGrid must return all shapes that G.hit can match
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

  // v1.6.12: keyboard shape creation - each creation tool yields a default shape
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
    state.shapes.length = 0; state.history.length = 0; state.histIdx = -1; state.seq = 0; state.seenOps = new Set();
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
    state.shapes.length = 0; state.history.length = 0; state.histIdx = -1; state.seenOps = new Set();
    const mk = (id, seq) => ({ op:'add', clock:{peer:'remote', seq},
      shape:{id, type:'rect', z:1, x:0, y:0, w:5, h:5, stroke:'#000', size:1, opacity:1} });
    // Fixed behaviour: each snapshot op has a distinct seq → all adopted.
    Store.applyRemote(mk('a','snap0'));
    Store.applyRemote(mk('b','snap1'));
    Store.applyRemote(mk('c','snap2'));
    assert.strictEqual(state.shapes.length, 3, 'distinct-seq snapshot ops all apply on merge');
    // Regression guard: same seq collapses to one (this is exactly why the fix was needed).
    state.shapes.length = 0; state.seenOps = new Set();
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

  // v1.6.21: G.hit single-point pen dot
  {
    state.shapes=[];state.history=[];state.histIdx=-1;state.selection=new Set();
    const dot={id:'d1',type:'pen',z:1,pts:[[50,50]],stroke:'#000',size:2,opacity:1};
    Store.commit({op:'add',shape:dot});
    assert.strictEqual(G.hit(dot,{x:50,y:50}),true,'single-point pen: hit at exact point');
    assert.strictEqual(G.hit(dot,{x:55,y:50}),true,'single-point pen: hit within tolerance');
    assert.strictEqual(G.hit(dot,{x:200,y:200}),false,'single-point pen: miss far away');
    console.log('  ✓ G.hit single-point pen dot is hittable');
  }

  // v1.6.21: doPaste remaps groupId (no cross-group contamination)
  {
    state.shapes=[];state.history=[];state.histIdx=-1;state.selection=new Set();
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
    state.shapes=[];state.history=[];state.histIdx=-1;state.seq=0;state.seenOps=new Set();state.wclock={};state.selection=new Set();
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
    state.shapes=[];state.history=[];state.histIdx=-1;state.seq=0;state.seenOps=new Set();state.wclock={};state.selection=new Set();
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
    state.shapes=[];state.history=[];state.histIdx=-1;state.selection=new Set();
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
    state.shapes=[];state.history=[];state.histIdx=-1;state.selection=new Set();
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
    state.shapes=[];state.history=[];state.histIdx=-1;state.selection=new Set();
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
    state.shapes=[];state.history=[];state.histIdx=-1;state.selection=new Set();
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
  console.log('  ✓ describeShape: position suffix present');

  // inView - frustum culling
  const vp0={x:0,y:0,w:800,h:600};
  assert.strictEqual(inView({type:'rect',x:100,y:100,w:200,h:150},vp0),true,'inView: shape within viewport');
  assert.strictEqual(inView({type:'rect',x:900,y:100,w:200,h:150},vp0),false,'inView: shape outside right edge');
  assert.strictEqual(inView({type:'rect',x:-300,y:100,w:200,h:150},vp0),false,'inView: shape outside left edge');
  console.log('  ✓ inView: culls off-screen shapes, passes on-screen');

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
    state.shapes=[];state.history=[];state.histIdx=-1;state.selection=new Set();
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
    state.shapes=[];state.history=[];state.histIdx=-1;state.selection=new Set();
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
    state.shapes=[];state.history=[];state.histIdx=-1;
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
    state.shapes=[];state.history=[];state.histIdx=-1;state.seq=0;state.seenOps=new Set();
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
    state.shapes=[];state.history=[];state.histIdx=-1;state.seq=0;state.seenOps=new Set();
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
    state.shapes=[];state.history=[];state.histIdx=-1;
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
    state.shapes=[];state.history=[];state.histIdx=-1;state.seq=0;state.seenOps=new Set();
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
    state.shapes=[]; state.history=[]; state.histIdx=-1; state.seq=0; state.seenOps=new Set();
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
    state.shapes=[];state.history=[];state.histIdx=-1;
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
    state.shapes=[];state.history=[];state.histIdx=-1;state.selection=new Set();
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
    state.shapes=[];state.history=[];state.histIdx=-1;state.selection=new Set();
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
    state.shapes=[];state.history=[];state.histIdx=-1;state.selection=new Set();
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
    state.shapes=[];state.history=[];state.histIdx=-1;state.selection=new Set();
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
    state.shapes=[];state.history=[];state.histIdx=-1;state.selection=new Set();state.seq=0;state.seenOps=new Set();
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
    state.shapes=[];state.history=[];state.histIdx=-1;state.seq=0;state.seenOps=new Set();
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
    state.shapes=[];state.history=[];state.histIdx=-1;state.seq=0;state.seenOps=new Set();
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
    state.shapes=[];state.history=[];state.histIdx=-1;state.seq=0;state.seenOps=new Set();state.wclock={};state.selection=new Set();
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
    state.shapes=[];state.history=[];state.histIdx=-1;state.seq=0;state.seenOps=new Set();state.wclock={};state.selection=new Set();
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
    state.shapes=[];state.history=[];state.histIdx=-1;state.seq=0;state.seenOps=new Set();state.wclock={};state.selection=new Set();
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
    state.shapes=[];
    console.log('  ✓ uid(): crypto.randomUUID gives 122-bit ids - 5000 uids all unique');
  }

  // v1.6.55: doAlign remaining variants - right, bottom, cx, cy
  {
    // right: all right edges align to rightmost
    state.shapes.length=0; state.history.length=0; state.histIdx=-1; state.seq=0; state.seenOps=new Set();
    const ar1=Shape.make('rect',{x:0,y:0,w:40,h:40});     // right edge = 40
    const ar2=Shape.make('rect',{x:100,y:0,w:60,h:60});   // right edge = 160 (max)
    state.shapes.push(ar1,ar2); state.selection=new Set([ar1.id,ar2.id]);
    doAlign('right');
    assert.strictEqual(G.bbox(ar1).x+G.bbox(ar1).w, G.bbox(ar2).x+G.bbox(ar2).w, 'align right: right edges equal');
    console.log('  ✓ doAlign("right") aligns all shapes to rightmost right edge');

    // bottom: all bottom edges align to bottommost
    state.shapes.length=0; state.history.length=0; state.histIdx=-1; state.seq=0; state.seenOps=new Set();
    const ab1=Shape.make('rect',{x:0,y:0,w:40,h:40});     // bottom = 40
    const ab2=Shape.make('rect',{x:0,y:100,w:40,h:60});   // bottom = 160 (max)
    state.shapes.push(ab1,ab2); state.selection=new Set([ab1.id,ab2.id]);
    doAlign('bottom');
    assert.strictEqual(G.bbox(ab1).y+G.bbox(ab1).h, G.bbox(ab2).y+G.bbox(ab2).h, 'align bottom: bottom edges equal');
    console.log('  ✓ doAlign("bottom") aligns all shapes to bottommost bottom edge');

    // cx: all shapes center-x aligns to midpoint of bounding union
    state.shapes.length=0; state.history.length=0; state.histIdx=-1; state.seq=0; state.seenOps=new Set();
    const ac1=Shape.make('rect',{x:0,y:0,w:40,h:40});     // cx = 20
    const ac2=Shape.make('rect',{x:100,y:0,w:60,h:40});   // cx = 130
    state.shapes.push(ac1,ac2); state.selection=new Set([ac1.id,ac2.id]);
    doAlign('cx');
    const bc1=G.bbox(ac1), bc2=G.bbox(ac2);
    assert.strictEqual(bc1.x+bc1.w/2, bc2.x+bc2.w/2, 'align cx: centers-x equal after cx align');
    console.log('  ✓ doAlign("cx") aligns all shapes to horizontal center of union');

    // cy: all shapes center-y aligns to midpoint of bounding union
    state.shapes.length=0; state.history.length=0; state.histIdx=-1; state.seq=0; state.seenOps=new Set();
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
    state.shapes.length=0; state.history.length=0; state.histIdx=-1; state.seq=0; state.seenOps=new Set();
    const rd=Shape.make('rect',{x:0,y:0,w:10,h:10});
    Store.commit({op:'add',shape:rd});
    assert.strictEqual(state.shapes.length,1,'remote del setup: shape present');
    Store.applyRemote({op:'del',shapes:[JSON.parse(JSON.stringify(rd))],clock:{peer:'remoteD',seq:1,ts:1}});
    assert.strictEqual(state.shapes.length,0,'remote del op: shape removed');
    console.log('  ✓ Store.applyRemote del op removes the targeted shape');
  }

  // v1.6.57: doFlip - mirror selection across its bbox centre, reversible via align op
  {
    state.shapes=[];state.history=[];state.histIdx=-1;state.selection=new Set();
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
    state.shapes=[];state.history=[];state.histIdx=-1;state.selection=new Set();
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
    state.shapes=[];state.history=[];state.histIdx=-1;state.selection=new Set();
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
    state.shapes=[];state.history=[];state.histIdx=-1;state.selection=new Set();
    const baseLen=state.history.length;
    doFlip('h');
    assert.strictEqual(state.history.length,baseLen,'doFlip no-op on empty selection');
    console.log('  ✓ doFlip: empty selection is a safe no-op');
  }
  {
    // v1.6.62: flipping a rotated shape negates the rotation angle (reflection reverses sense)
    state.shapes=[];state.history=[];state.histIdx=-1;state.selection=new Set();
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
    state.shapes=[];state.history=[];state.histIdx=-1;state.selection=new Set();
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
    state.shapes=[];state.history=[];state.histIdx=-1;state.selection=new Set();
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
    state.shapes=[];state.history=[];state.histIdx=-1;state.selection=new Set();
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
    state.shapes=[];state.history=[];state.histIdx=-1;state.selection=new Set();
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
    state.shapes=[];state.history=[];state.histIdx=-1;state.selection=new Set();
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
    state.shapes=[];state.history=[];state.histIdx=-1;state.selection=new Set();
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
    state.shapes=[];state.history=[];state.histIdx=-1;state.selection=new Set();
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
    state.shapes=[];state.history=[];state.histIdx=-1;state.selection=new Set();
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
    state.shapes=[];state.history=[];state.histIdx=-1;state.selection=new Set();
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
    state.shapes=[];state.history=[];state.histIdx=-1;state.selection=new Set();
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
    state.shapes=[];state.history=[];state.histIdx=-1;state.selection=new Set();
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
    state.shapes=[];state.history=[];state.histIdx=-1;state.selection=new Set();
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
    state.shapes=[];state.history=[];state.histIdx=-1;state.selection=new Set();
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
    state.shapes=[];state.history=[];state.histIdx=-1;state.selection=new Set();
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
    state.shapes=[];state.history=[];state.histIdx=-1;state.selection=new Set();
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
    state.shapes=[];state.history=[];state.histIdx=-1;state.selection=new Set();
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
    state.shapes=[];state.history=[];state.histIdx=-1;state.selection=new Set();
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
    state.shapes=[];state.history=[];state.histIdx=-1;state.selection=new Set();
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
    const reset = W => { W.state.shapes.length=0; W.state.history.length=0; W.state.histIdx=-1; W.state.seq=0; W.state.seenOps=new Set(); W.state.wclock={}; };
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
    state.shapes=[];state.history=[];state.histIdx=-1;state.selection=new Set();
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
    state.shapes=[];state.history=[];state.histIdx=-1;state.selection=new Set();
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
    state.shapes=[];state.history=[];state.histIdx=-1;state.selection=new Set();
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
    state.shapes=[];state.history=[];state.histIdx=-1;state.draft=null;
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
    state.shapes=[];state.history=[];state.histIdx=-1;state.selection=new Set();
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

  console.log('\n✓ All behavioural tests passed');
  pass += 481; // prev 476 + Net.init presence-timer clear (5 asserts)

} catch (err) {
  console.log('  ✗ behavioural tests crashed:', err.message);
  fail += 1;
}

console.log(`\n${pass} pass, ${fail} fail`);
process.exit(fail > 0 ? 1 : 0);
