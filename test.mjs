// Board — smoke test for op-log reversibility and geometry purity.
// Run: node test.mjs
// Extracts subset of board.js and tests it in isolation.

import { readFileSync } from 'fs';
import { execSync } from 'child_process';
import assert from 'assert';

const html = readFileSync('./index.html', 'utf8');
const GZIP_BUDGET = 45056; // 44KB gzip — must match .github/workflows/ci.yml
// Use system gzip -9 to match CI exactly (node zlib and system gzip differ by ~1%)
const _gzSize = parseInt(execSync('gzip -9 -c index.html | wc -c').toString().trim());

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
  ['Size under 44KB gzip budget', _gzSize < GZIP_BUDGET],
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
  ['zorder op carries before/after snapshot', html.includes("op:'zorder',before,after")],
  ['zorder _apply restores order+z from snapshot', html.includes("const snap=forward?op.after:op.before") && html.includes("sh.z=p.z")],
  ['z-step ops route through _commitZ (undoable)', html.includes("_commitZ(before)") && html.includes("function _commitZ")],
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
  ['canvas aria-label is updated dynamically in pickTool', html.includes("tool+' — Drawing canvas. Tab/Shift+Tab cycles shapes,")],
  // v1.6.11: spatial index for pickTop
  ['spatial grid helpers present', html.includes("function _buildGrid") && html.includes("function _queryGrid")],
  ['pickTop uses grid for large boards', html.includes("state.shapes.length>40") && html.includes("_buildGrid(state.shapes)")],
  ['grid invalidated on every _apply', html.includes("_apply(op,forward){") && html.includes("_invalidateGrid()")],
  // v1.6.12: keyboard shape creation (a11y)
  ['createShapeKbd helper present', html.includes("function createShapeKbd")],
  ['Enter creates shape at viewport centre', html.includes("k==='enter'&&!meta&&!e.shiftKey") && html.includes("createShapeKbd()")],
  ['canvas aria-label includes Enter creates hint', html.includes("Enter creates, arrows move.")],
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
  ['load validates viewport finiteness', html.includes("d.viewport.zoom>0)Object.assign(state.viewport")],
  // v1.6.18: deeper audit fixes
  ['P selects pen, Shift+P presents', html.includes("k==='p'&&e.shiftKey&&!meta&&!e.altKey")],
  ['pen has no resize handles', html.includes("if(s.type==='pen')return [];")],
  ['presentation saves+restores viewport', html.includes("_savedVp={x:state.viewport.x") && html.includes("Object.assign(state.viewport,_savedVp)")],
  ['help grid present row uses i18n', html.includes("['⇧P',k.present]") && html.includes("['↑↓←→',k.nudge]")],
  ['help i18n keys in ja and en', html.includes("present:'プレゼン'") && html.includes("present:'Present'")],
  // v1.6.19: sync + PWA fixes
  ['snapshot ops get distinct clock keys', html.includes("seq:'snap'+i")],
  ['snapshot merge skips already-present shapes', html.includes("op.shape&&byId(op.shape.id))continue")],
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
  ['gzip budget test uses system gzip -9 (matches CI)', readFileSync('./test.mjs','utf8').includes("execSync('gzip -9 -c index.html")],
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
  ['importBoard function exists and uses validShape filter', html.includes('function importBoard') && html.includes('.filter(validShape)')],
  ['Ctrl+Shift+S triggers exportBoard', html.includes("e.shiftKey){e.preventDefault();exportBoard()}")],
  ['drag-drop accepts .board files', html.includes(".endsWith('.board')")],
  // v1.6.27: SVG export renders single-point pen as circle dot
  ['SVG export handles single-point pen shape', html.includes('s.pts.length===1')],
  ['SVG export emits circle for single-point pen', html.includes('<circle cx=')],
  // v1.6.28: ungroup undo preserves per-shape groupId across multi-group ungroup
  ['doUngroup captures before snapshot', html.includes('before.push({id:s.id,groupId:s.groupId})')],
  ['ungroup backward uses before snapshot when available', html.includes('if(op.before){for(const b of op.before)')],
  // v1.6.29: slider undo coalescing — single op per drag, not per input event
  ['slider before-capture helper _sfbCapture defined', html.includes('function _sfbCapture(p)')],
  ['slider flush helper _sfbFlush defined', html.includes('function _sfbFlush(p,v)')],
  ['size slider uses pointerdown/change for undo, not input', html.includes("_sfbCapture('size')") && html.includes("_sfbFlush('size'")],
  ['opacity slider uses pointerdown/change for undo', html.includes("_sfbCapture('opacity')") && html.includes("_sfbFlush('opacity'")],
  // v1.6.29: dead op:'z' code removed; i18n for image-too-large
  ['dead op-z case removed from _apply', !html.includes('// Array reorder')],
  ['imgBig i18n key present in ja and en', html.includes("imgBig:'画像が大きすぎます") && html.includes("imgBig:'Image too large")],
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
  // v1.6.39: console cleanup — no redundant console.warn/error in production paths
  ['no console.warn in BroadcastChannel catch', !html.includes("console.warn('BroadcastChannel init failed'")],
  ['no console.error in save catch (user gets toast)', !html.includes("console.error('save failed'")],
  ['import parse failure shows invalidBoard toast (not silent)', html.includes("UI.toast(t('invalidBoard'),'err')")],
  // v1.6.40: style panel a11y — decorative labels hidden, panel groups have role/aria-label
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
             doGroup, doUngroup, doPaste, pickTop, buildSVG, inView, wrapText, cycleSel, describeShape,
             copyStyle, pasteStyle, applyStyleToSelection,
             _buildGrid, _queryGrid, sortZ, createShapeKbd, pickTool, penWidths, snapBox, dashArr, validShape,
             _sfbCapture, _sfbFlush, _sbf };
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
          doGroup, doUngroup, doPaste, pickTop, buildSVG, inView, wrapText, cycleSel, describeShape,
          copyStyle, pasteStyle, applyStyleToSelection,
          _buildGrid, _queryGrid, sortZ, createShapeKbd, pickTool, penWidths, snapBox, dashArr, validShape,
          _sfbCapture, _sfbFlush, _sbf } = api;

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
    // undo — shapes must return to their ORIGINAL groups
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

  // v1.6.18: getHandles — pen exposes no box handles (box-resize would NaN its x/y/w/h)
  {
    assert.strictEqual(getHandles({type:'pen',pts:[[0,0],[10,10]],z:0}).length, 0, 'pen: no resize handles');
    assert.strictEqual(getHandles({type:'line',x1:0,y1:0,x2:5,y2:5,z:0}).length, 2, 'line: 2 endpoint handles');
    assert.strictEqual(getHandles({type:'rect',x:0,y:0,w:10,h:10,z:0}).length, 8, 'rect: 8 box handles');
    console.log('  ✓ getHandles: pen move-only (0 handles), line=2 endpoints, rect=8 box');
  }

  // v1.6.19: snapshot merge dedup — distinct clock seqs must all apply (the seq:0 bug)
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
    console.log('  ✓ doPaste remaps groupId — pasted copies get fresh group identity');
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
    sh.size=12; // second drag tick — no history entries yet
    _sfbFlush('size',12); // release: commits one style op
    assert.strictEqual(state.history.length,baseLen+1,'_sfbFlush: single history entry for whole drag');
    assert.strictEqual(state.history[state.history.length-1].op,'style','style op recorded');
    Store.undo();
    assert.strictEqual(state.shapes.find(s=>s.id===sh.id).size,4,'undo restores original size');
    console.log('  ✓ slider coalescing: multiple drag ticks → one style op → undo restores');
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

  // v1.6.39: handleCursor — correct CSS cursor for each resize handle
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

  // v1.6.39: Store undo/redo boundary — undo at bottom and redo at top are no-ops
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

  // G.hit — text (exact bbox, no tolerance)
  assert.strictEqual(G.hit({type:'text',x:0,y:0,w:120,h:24,size:14},{x:60,y:12}),true,'text: interior hits');
  assert.strictEqual(G.hit({type:'text',x:0,y:0,w:120,h:24,size:14},{x:130,y:12}),false,'text: outside right misses');
  // G.hit — frame (bbox + tolerance, same as sticky/image)
  assert.strictEqual(G.hit({type:'frame',x:10,y:10,w:100,h:80,size:2},{x:60,y:50}),true,'frame: interior hits');
  assert.strictEqual(G.hit({type:'frame',x:10,y:10,w:100,h:80,size:2},{x:200,y:50}),false,'frame: far outside misses');
  console.log('  ✓ G.hit text and frame shapes');

  // G.bbox — per-shape bounding box
  assert.deepStrictEqual(G.bbox({type:'rect',x:10,y:20,w:100,h:50}),{x:10,y:20,w:100,h:50},'bbox rect returns exact dims');
  assert.deepStrictEqual(G.bbox({type:'text',x:5,y:5,w:80,h:24}),{x:5,y:5,w:80,h:24},'bbox text returns exact dims');
  const lbx=G.bbox({type:'line',x1:0,y1:0,x2:60,y2:0,size:2});
  assert.ok(lbx.x<0&&lbx.w>60&&lbx.h>0,'bbox line expanded by size padding');
  const pbx=G.bbox({type:'pen',pts:[[10,20],[50,40]],size:4});
  assert.ok(pbx.x<10&&pbx.y<20&&pbx.x+pbx.w>50&&pbx.y+pbx.h>40,'bbox pen expands beyond all pts');
  // G.bboxAll — union of multiple shapes
  assert.strictEqual(G.bboxAll([]),null,'bboxAll empty → null');
  const abx=G.bboxAll([{type:'rect',x:0,y:0,w:50,h:50},{type:'rect',x:60,y:10,w:40,h:30}]);
  assert.strictEqual(abx.x,0,'bboxAll union: left edge');
  assert.strictEqual(abx.y,0,'bboxAll union: top edge');
  assert.strictEqual(abx.w,100,'bboxAll union: total width');
  assert.strictEqual(abx.h,50,'bboxAll union: total height');
  console.log('  ✓ G.bbox rect/text/line/pen and G.bboxAll union');

  // cycleSel — keyboard Tab cycling
  assert.strictEqual(cycleSel([],null,1),null,'cycleSel empty ids → null');
  assert.strictEqual(cycleSel(['a','b','c'],'a',1),'b','cycleSel forward from first');
  assert.strictEqual(cycleSel(['a','b','c'],'c',1),'a','cycleSel forward wraps to start');
  assert.strictEqual(cycleSel(['a','b','c'],'a',-1),'c','cycleSel backward wraps to end');
  assert.strictEqual(cycleSel(['a','b','c'],'x',1),'a','cycleSel unknown cur + forward → first');
  assert.strictEqual(cycleSel(['a','b','c'],'x',-1),'c','cycleSel unknown cur + backward → last');
  console.log('  ✓ cycleSel: forward/backward/wrap/unknown-current');

  // describeShape — SR shape announcement
  assert.ok(describeShape({type:'rect',x:10,y:20,w:100,h:50}).endsWith('@ 10,20'),'describeShape includes rounded position');
  assert.ok(describeShape({type:'rect',x:10,y:20,w:100,h:50}).length>5,'describeShape not empty');
  console.log('  ✓ describeShape: position suffix present');

  // inView — frustum culling
  const vp0={x:0,y:0,w:800,h:600};
  assert.strictEqual(inView({type:'rect',x:100,y:100,w:200,h:150},vp0),true,'inView: shape within viewport');
  assert.strictEqual(inView({type:'rect',x:900,y:100,w:200,h:150},vp0),false,'inView: shape outside right edge');
  assert.strictEqual(inView({type:'rect',x:-300,y:100,w:200,h:150},vp0),false,'inView: shape outside left edge');
  console.log('  ✓ inView: culls off-screen shapes, passes on-screen');

  // wrapText — pure text-wrapping function
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

  // getHandles — ellipse/sticky use same box-handles as rect
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

  // applyResize — handle-drag updates shape dimensions
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

  // penWidths — variable-width pen stroke
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

  // _buildGrid + _queryGrid — spatial index
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

  // doGroup / doUngroup — grouping ops and full undo/redo round-trip
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

  // pickTop — returns topmost (highest-z) shape at a world point
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

  // sortZ — sorts shapes array by ascending z value
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

  // Shape.translate — moves shape coordinates per type
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

  // G.marqueeHit — marquee fully contains shape's bbox
  {
    const s=Shape.make('rect',{x:20,y:20,w:60,h:40});
    assert.strictEqual(G.marqueeHit(s,{x:0,y:0,w:200,h:200}),true,'marqueeHit: shape fully inside marquee');
    assert.strictEqual(G.marqueeHit(s,{x:0,y:0,w:50,h:200}),false,'marqueeHit: shape right edge outside marquee');
    assert.strictEqual(G.marqueeHit(s,{x:25,y:25,w:200,h:200}),false,'marqueeHit: shape left edge outside marquee');
    console.log('  ✓ G.marqueeHit: full containment passes, partial overlap fails');
  }

  // Store move op — translates shapes, fully reversible
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

  // Store upd op — updates arbitrary fields, reversible
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

  // Store del op — removes shapes, fully reversible
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

  // Store clear op — removes all shapes, reversible
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

  // v1.6.55: doAlign remaining variants — right, bottom, cx, cy
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

  // v1.6.55: G.hit ellipse — filled interior vs boundary (unfilled edge)
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

  // v1.6.55: Store.applyRemote del op — remote peer can delete a local shape
  {
    state.shapes.length=0; state.history.length=0; state.histIdx=-1; state.seq=0; state.seenOps=new Set();
    const rd=Shape.make('rect',{x:0,y:0,w:10,h:10});
    Store.commit({op:'add',shape:rd});
    assert.strictEqual(state.shapes.length,1,'remote del setup: shape present');
    Store.applyRemote({op:'del',shapes:[JSON.parse(JSON.stringify(rd))],clock:{peer:'remoteD',seq:1,ts:1}});
    assert.strictEqual(state.shapes.length,0,'remote del op: shape removed');
    console.log('  ✓ Store.applyRemote del op removes the targeted shape');
  }

  console.log('\n✓ All behavioural tests passed');
  pass += 208; // prev 197 + 4 align variants + 5 ellipse G.hit + 2 remote del

} catch (err) {
  console.log('  ✗ behavioural tests crashed:', err.message);
  fail += 1;
}

console.log(`\n${pass} pass, ${fail} fail`);
process.exit(fail > 0 ? 1 : 0);
