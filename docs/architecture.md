# Architecture

> Board v1.6 の内部設計。Carmack (perf) · Martin (clean) · Pike (simple) の適用。

## 全体像

```
┌─────────────────────────────────────────────────────────────┐
│ index.html (single file, ~134KB raw / ~45KB gzip)           │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  ┌──────────┐   ┌────────┐   ┌──────┐   ┌──────────┐       │
│  │ pointer  │→  │  tool  │→  │ op   │→  │  state   │       │
│  │ keyboard │   │ handler│   │-log  │   │(shapes,  │       │
│  │ wheel    │   └────────┘   └──────┘   │ viewport)│       │
│  └──────────┘                           └─────┬────┘       │
│                                               │            │
│                                               ↓            │
│  ┌──────────────┐                      ┌───────────┐       │
│  │  IndexedDB   │ ← debounced 500ms ───│  RENDER   │       │
│  │   persist    │                      │  RAF loop │       │
│  └──────────────┘                      │ (Canvas2D)│       │
│                                        └───────────┘       │
└─────────────────────────────────────────────────────────────┘
```

## 層 (Martin 流)

### 1. Input
`canvas.addEventListener` と `window.addEventListener` で pointer / keyboard / wheel を受ける。ここでは **状態を変更しない**。ツールハンドラに委譲。

#### ジェスチャライフサイクル (v1.7.55x–562 — ADR-0516..0534)
`ptr` (down/dragKind/dragStartShapes/resizeOrig/… の単一構造体) が全ドラッグの
唯一の状態。pointerdown で `setPointerCapture` + (右ボタン以外のときのみ)
`ptr.down=true` — 右 down は即 return (ADR-0532: macOS/Linux の contextmenu は
mousedown 時点で発火するため、arm するとメニューガードが誤発動した)。
pointerup でコミット、pointercancel / `lostpointercapture` /
`visibilitychange`→hidden / `pagehide` / ドラッグ中の
`contextmenu` / touch long-press / Esc / window `blur` で
`_cancelPointerGesture()` — いずれも dragKind 別に部分変更を復元する統一
キャンセル経路。blur は同時に `_pointers.clear()` と `_pinchPrev`/`_pinchSnap`
と space 一時 hand ツール (`window._prevTool`) を再ベースライン化する — 別アプリで
取りこぼされた pointerup/keyup が後続ジェスチャを壊さないための防壁
(ADR-0534)。`pointerleave` は hover/laser のみ消去 (ドラッグは capture で継続)。
hidden/pagehide/blur の共通掃除口は `_clearTouchState()` — `_pointers` Map・
`_pinchPrev`/`_pinchSnap` に加えて `Minimap.cancelNav()` も呼び、ミニマップの
ドラッグスクラブ中状態 `_mmNav` も bfcache を跨いで残存させない (ADR-0632)。
`_cancelPointerGesture` 末尾でも同掃除口を呼び、Esc 等の cancel でもピンチ状態を
残存させない (ADR-0636: 残ると二本目の指の pointerup が stray ズームを発火)。
ドラッグ中の 24px 端帯は rAF エッジオートパン (ADR-0519)。`pointerId` は
`_pointers` Map で追跡し 2 本目でピンチ遷移。

**ジェスチャ×外部変化の不変条件 (v1.7.66x — ADR-0634..0637):**
- **overlay/モーダル突入はキャンセル先行**: `Presentation.enter()`・
  `editSelectedShapeKbd` (Enter) は冒頭で `if(ptr.down)_cancelPointerGesture()`
  — capture 継続のドラッグが overlay 裏で進行し不可視コミットするのを防ぐ。
- **ジェスチャ対象は _sel0 ではなく orig.id 解決**: resize/rotate の
  ドラッグ適用・コミット・キャンセル復元は全て `byId(ptr.*Orig.id)`
  (ADR-0635)。ジェスチャ中に選択が変わり得る (⌘A・リモート op・undo) ため
  「現在選択の先頭」参照は別図形への誤コミット/誤復元を招く。
- **mid-gesture 変化キー**: ⌘Z/⌘Y は先に cancel (ADR-0574)。他のキー変化
  (⌘D/⌘X/del/paste/⌘A) は dragStartShapes の id-map と byId ガードで
  自己整合 — cancel は不要。
- **終端状態は _ptrReset 統一**: 両キャンセル経路 (Esc/hidden の
  `_cancelPointerGesture` と pointercancel) の終端は `_ptrReset()` で ptr 状態
  (`down`/`dragKind`/`moveStart`/`dataset.panning`/`readout`) を一括クリアする
  (ADR-0764 — pan 中断で grabbing カーソルが残った実害を再発させない)。
- **orig 復元は幾何限定**: ジェスチャキャンセルの「orig 書き戻し」は全フィールド
  clone ではなく `_geoR()` で幾何キー (x/y/w/h/x1..y2/pts/way/z/rotate) のみ
  復元する (ADR-0766、16サイト)。mid-drag で届いたリモートの style/label 書込
  がキャンセルのたびに沈黙消失しない。
- **プレゼンはスライドナビキーのみ通過**: プレゼン中の `_pA` ゲートが全入力を
  呑む (0640)。例外はナビキー — ←→↑↓/Space/Enter/Esc に加えて PgDn/PgUp が
  前後スライドへ動く (0768 — deck-tool parity)。
クリップボードの OS 橋渡しは `_cpNow`/`_osClip` + `_textCascade` (SVG →
.board → .excalidraw → mxfile → TSV → 平文) が paste/drop 双方に効く
(ADR-0516/0518)。Safari の GestureEvent は gesturestart/change/end で
`_gScale` 比ズームに変換 (ADR-0517)。

`openTextEditor` は `byId(s.id)` で live 図形を再解決してから bind する
(ADR-0533) — `add` コミットは `_sh()` に clone を載せるため、呼び出し側が
持つ clone 前参照へ書き込むと live 図形だけが `text:''` のまま残る
(ローカルのみ不可視化・ピアは `upd` で正しいテキストを得ていた)。

#### 編集 overlay のライフサイクル (v1.7.58x — ADR-0556..0561)
text (textarea) / label (input) overlay は blur/Enter で commit、Escape で破棄。
コミット側は `byId` ガードで orphan 化 (remote del mid-edit) 時に phantom
upd/del を撃たない (ADR-0556/0557)。発生元が消えた付箋 ⌘Enter 連鎖も同様に
遮断 (ADR-0558)。毎フレームの `_teFollow`/`_lblFollow` が対象削除を検知して
**proactive close** するため del/clear/replace/snapshot/undo の全経路で overlay
が残らない (ADR-0559)。`_cxO()` が新規 editor オープン前に旧 overlay を blur
→ commit させ、`state.editing` の clobber (新 editor の follow 死亡 + 本文の
canvas/overlay 二重描画) を防ぐ (ADR-0560)。resize は canvas rect を動かすが
follow sig (x,y,zoom) が不変のため、`resize()` で sig をリセットして即再配置
(ADR-0561)。

### 2. Tools
現在のツール (`state.tool`) に応じて `begin* / cont* / end*` の三段階で gesture を処理。途中状態は `state.draft` に置く (undo に入れない)。`end*` で Store.commit。

11 ツール: select, hand, pen, rect, ellipse, arrow, line, text, sticky, frame, eraser。

### 3. Store (op-log, Command pattern)
```js
Store.commit(op)              // apply + append + cap history
Store.undo()                  // apply inverse + decrement idx
Store.redo()                  // re-apply + increment idx
Store._apply(op, forward)     // switch on op.op
Store._recordCommitted(op)    // record pre-applied op (no re-apply)
Store.applyRemote(op)         // validate + apply remote op
Store.broadcast(op)           // send to peers via BroadcastChannel + WebRTC
```

op 型 (全て可逆; `_apply(op, false)` で完全に戻る):
- `{op:'add', shape}` — shape を push (**shape id で冪等**: 既に保持する id の remote add は重複
  push しない。`_applySnapshot` は seenOps を埋めずに shapes を差し替えるため、スナップショットが
  ライブ add op を追い越すと dedup を素通りする — 冪等性でその二重化を塞ぐ。ローカル commit は
  毎回新規 uid なので阻害されず、redo は undo が消した後なので再 push される)
- `{op:'del', shapes:[...], connClears?}` — 複数削除を1つに。forward は `sh.locked` をスキップし、
  undo は `byId` 冪等ガードでスキップ分を再 push しない (ADR-0547: さもないと同一 id 二重登録)
- `{op:'upd', id, before, after}` — 汎用プロパティ変更
- `{op:'move', ids:[...], dx, dy, after:[{id,x,y},...], before?}` — 平行移動。wire は絶対位置 `after`
  必須 (ADR-0729/0741: bare delta は raced-base 適用で発散するため受信側が拒絶)。forward は実際に
  動かした id を `op.moved` に記録し、undo は `moved` のみを逆移動 (ADR-0548: locked スキップ分が
  逆方向にずれるのを防止)
- `{op:'zorder', changes:[{id,before,after},...]}` — 分数インデックスの minimal-delta。
  wire はこの形式のみ (ADR-0742: 旧 `{after:[{id,z,frac}]}` wholesale は LWW/stamp なしの
  raced clobber のため受信側が拒絶)
- `{op:'style', before:[{id,...},...], after:[{id,...},...]}` — マルチ選択スタイル一括変更 (スライダーコアレス)
- `{op:'align', before:[{id,...},...], after:[{id,...},...]}` — 整列
- `{op:'resize', before:[{id,w,h},...], after:[{id,w,h},...]}` — キーボードリサイズ (Alt+矢印) の
  一括パッチ (style/align と同じ Object.assign 機構、複数選択でも単一 undo)
- `{op:'group', ids, gid}` / `{op:'ungroup', ids, gids}` — グループ
- `{op:'clear', shapes:[...]}` — 全消去

**全 op が可逆**。`_apply(op, false)` で完全に戻せる。`test.mjs` のプロパティベーステストで30シナリオ往復検証。

**locked parity**: 全 mutating op の forward は `sh.locked` をスキップする (ローカル/リモート共通)。
undo 経路では op 型ごとに対称性が異なる — 絶対パッチ系 (upd/style/align/resize/beautify/zorder/
group/ungroup) は per-shape `before` の書き戻しが冪等なため no-op で安全だが、存在を復元する `del`
と差分を適用する `move` はスキップ集合を backward に伝える必要がある (それぞれ `byId` ガードと
`op.moved` で対応 — ADR-0547/0548/0549)。

**hidden parity**: 「非表示図形は選択されない」不変条件は**チョークポイント集約**で保つ
(ADR-0566/0568)。selection への入口は `_ss(ids)` / `_sad(id)` の2つだけで、両者が
`byId`+`_sv` でフィルタする — 存在しない・非表示の id は ⌘A・マーキー・検索・undo 復元・
paste/duplicate/import どの経路でも選択に入らない。遷移方向 (既に選択済みの図形が `_hd` 化)
は `_apply` が prop-patch の後処理で `_sdl` する (style/upd/align/resize/beautify の
remote/redo をカバー)。hide 時に編集中 overlay があれば畳む — local hide は `hideSelection`
冒頭の `_cxO()`、remote/undo 経由は `_teFollow`/`_lblFollow` の `_hd` ガードが次フレームで
畳む (ADR-0569)。描画系でも同規則を守る — ピアの `p.sel` プレゼンスは
`drawPeerSelections` が `_hd` で落とす (ADR-0576: 非表示図形の位置を他者へ漏らさない)。
direct `state.selection.add` や新たな `_ss` バイパスを増やさないこと。

派生レンダリング面も同規則 (ADR-0592–0595): `_grpMapGet` のハロー集約・`_renderPngBlob`/
`buildSVG` の bbox 計算・`excScene` の要素 emit・Minimap の scene 描画はいずれも `_sv` で
フィルタする — 不可視内容がハロー・エクスポート余白・ミニマップ・第三者フォーマットへ
漏洩しない。例外はデータ保持が目的の経路のみ: `.board` エクスポートは `visible` prop を
保持し、`boardToDrawio` は `visible="0"` を emit して往復可能にする。

**dead-id parity** (ADR-0621/0623): 選択由来の id/shape リストは **dead id を含まない**。
remote del/replace と選択書込みの間には選択が stale id を持つ窓が残るため、派生リストは
出口側で `id=>{const s=byId(id);return s&&_ul(s)}` (live+unlocked) で濾す: `endSelect`/
`nudgeSelection` の `move` ids、`unlockedSelectionIds` (group op の `before` スナップショット
まで含む)。`_sb()` は `map(byId).filter(Boolean)` で供給源閉塞 — `undefined` を残すと
`_ul` の `.locked` 参照で TypeError となる (呼出し側の `s&&` 防御は downstream で残す)。

**img 参照の再解決**: 形状を復元する全経路 (del/clear/replace の backward、replace の forward) は
`_sh().push(Net._attachShape(clone(s)))` を通す。`img:` 参照を抱えた図形が undo で戻る際に
`_imgIn` の到達済み blob から `dataUrl` を再解決し、未到達なら `_imgPending` に再駐留する
(ADR-0551)。直接 `push(clone(s))` すると削除中に blob が到達した図形が永久 placeholder になる。
同じ attach は `pageAdd` forward のメンバー図形にも適用される (ADR-0752 — page duplicate・
.drawio multi-page・undo-wire addMany の image メンバーが参照のみで届くため)。
`_pgDel2` は末尾で `_pcC()` を呼び `_penCache`+`_imgPending` を**全域** purge する
(ADR-0753 — 生き残るページの駐車参照も巻き込む)。この wholesale wipe は安全:
`_imgPending` はあくまで fast index であり、blob 到着時の straggler 走査
(`for(const s of _sh())if(s.img===key)…`、ADR-0629) が全域を救済する。straggler 経路を
除去/弱化すると pageDel が他ページの画像を永久破壊する — test が両側面を固定する。

**反転 (flip H/V)** は専用 op を持たず、`align` op を再利用する: `doFlip(axis)` が選択 bbox 中心軸で
各シェイプ座標をミラー (`flipShape`) し、変更前後の完全クローンを `{op:'align',dir:'flip',before,after}`
として記録する。`align` の `_apply` が `Object.assign` でクローンを復元するため、追加の `_apply` 分岐は不要。
単一の非対称シェイプ (pen/line/arrow/text) で意味を持つ。⇧H/⇧V とコンテキストメニューから実行。

#### 受信 op / シェイプの検証 (security)
- `validShape(s)` — 全 intake 経路 (IDB ロード, sync スナップショット, remote add, URL import) が共有する
  構造検証。`id`/`type`/数値 `z` を要求し、pen は `pts` が非空かつ全要素が有限数の `[x,y]` であることを要求
  (欠落/非数の `pts` は `drawPen`/`G.hit`/`G.bbox` が `pts[i][0]` を参照する際にクラッシュするため)。
- `validRemotePayload(op)` — リモート op の payload を `_apply` 到達前に検証。ローカル op は in-process 生成で
  信頼するが、remote op (BroadcastChannel/WebRTC) は各 op 型が参照する正確なフィールドと有限な数値デルタを
  要求する (例: `move` の `dx={}` は全シェイプを NaN 化しうる)。構造的に健全な op にのみ true。

### 4. State
唯一の真実。以下しか存在しない:
```js
{
  shapes: [],
  selection: Set<id>,
  viewport: {x, y, zoom},
  tool, style, history, histIdx,
  clipboard, styleClipboard,
  hover, draft, editing, marquee, guides,
  showGrid, snap, docName, dirty, lastSaveAt,
  peerId, roomId, seq, seenOps,
}
```

### 5. Render (v1.7.x — ADR-0024〜0033 で再構築)

RAF ループ。`needsRender`/`needsOverlay` フラグで再描画をゲート。**2 層キャンバス**:
`draw()` (シーン, `#c`) と `drawOverlay()` (選択枠・ガイド・マーキー・ピアカーソル等の
エフェメラル chrome, `#ov`) を分離し、オーバーレイのみの変化でシーン全面再描画を
回避する (ADR-0024)。

`draw()` の経路は優先順でフォールバック:
1. **ズームプレビュー** (ADR-0030/0033): ピンチ/ctrl+wheel 中は `_pinchVp` の
   スナップショット bitmap をスケール blit。シーン再走査なし。
2. **パン blit** (ADR-0028): パン中は前フレームの自己 drawImage でピクセルを
   ずらし、露出した帯だけ `_dmgPair` clip で再描画。
3. **ダメージ矩形** (ADR-0026/0027): ドラッグ系ジェスチャや `_apply`/`applyRemote`
   由来の world 空間汚れ矩形を clip して局所再描画。交差判定は `_queryGrid`。
   **束縛コネクタ規則** (ADR-0597/0598/0599): 図形の変形に追従する束縛コネクタ
   (`aF`/`bF` が束縛先 extent から端点を動的解決) の掃引領域は、対象図形の bbox だけ
   では覆えない。ダメージを構成する全経路 (doMove/_gresizeDrag/_grotDrag/resize/
   rotate/`_apply`) は `(aF&&a∈対象)||(bF&&b∈対象)` のコネクタを変形前に収集し、
   変形後 `_bb` との `_dmgPair` union を合流する。
4. **全量**: 上記いずれでもない通常フレーム。

シーン側の描画順:
1. 背景クリア (ダメージ経路では clip 内のみ)
2. world→screen transform 設定
3. グリッド (zoom が十分なら)
4. `_grid` 空間索引で可視 shape を列挙 (ADR-0016) → z順にソート → `drawShape`
   - ペンは `_penCache` ビットマップ (ADR-0018)、bbox は O(1) シグネチャメモ化 (ADR-0019)
   - 下書きペンは `_inkCv` に確定セグメントを増分スタンプ + 生きた末尾だけベクトル (ADR-0029)
   - 画像は `_imgCache` — O(1) フィンガープリントキー (ADR-0021/0035)
5. オーバーレイ canvas (`#ov`) 側に: 選択枠 + 8 handle、整列ガイド、マーキー、
   レーザー、ピアカーソル/選択 (ADR-0024)
6. ミニマップ (独立 canvas) — 中身は `_gridVer` 連動ビットマップキャッシュ (ADR-0025)

### 6. Persist
IndexedDB (`board` / stores `docs` + `imgs`, DB_VER=2)。500ms デバウンス。`visibilitychange`→hidden で最終セーブ (`beforeunload` はモバイルで不可靠)。`Ctrl+S` で即時保存。読み込み時に `validShape` で全 shape を検証。ADR-0031 で画像バイトは `dataUrl` から content-hash キーの `imgs` blob ストアへ分離 — doc レコードは `img` 参照のみ保持し、`DOC_KEY`/`DOC_KEY+':prev'` が blob を共有 (重複書き込みなし、孤児は save 時 GC)。save 失敗は `_saveErrMsg` で `QuotaExceededError` を識別してトースト。

**因果マーカーも永続化する** (ADR-0460/0695/0699/0701): doc レコードは `shapes`/`viewport`/`pages`/`curPg` に加えて `wc` (per-prop 書込みクロック) と `rep`/`nts`/`ntp` (最後の replace マーカー・改名クロック) を同梱する。リロードでこれらが null/0 に戻ると、ピアの古い pre-swap スナップショットや旧 rename が wipe 済み内容を復活させ得るため。読み込み側は `validClock`/`_fin` で検証してから採用する (0864/0700/0701 の非有限値拒否と同一規則)。`:prev` バックアップ (ADR-0004) はスコープ外 — 復元自体が replace op として commit され新しい causal marker を立てる。

## 座標系

- **world**: shape が持つ座標 (無限)
- **screen**: canvas 上のピクセル / DPR 倍
- 変換: `s2w(p) = p/zoom + viewport`、`w2s(p) = (p-viewport)*zoom`
- 描画は `ctx.setTransform(zoom*DPR, 0, 0, zoom*DPR, -vp.x*zoom*DPR, -vp.y*zoom*DPR)`

## Hit testing

bbox 先置き (quick reject) → shape 型別詳細。`tol = 6/zoom` でズーム時も一定の当たり判定。

**回転シェイプの順序が重要 (v1.7.70 の学び)**: 回転ボックスの当たり判定は
「① ワールド点 vs `G.bbox`(= 回転後のワールド外接矩形)で quick-reject → ② ポインタを
シェイプのローカル座標系に**逆回転** → ③ 未回転の `s.x/s.w` で型別判定」の順で行う。
①(quick-reject)を②(逆回転)より**後**に置くと、ローカル座標系の点をワールド座標系の
外接矩形と比較するフレーム不一致になり、回転した非正方形シェイプの中心から離れた領域が
**不可視の当たり判定漏れ**になる(描画は正常なのにクリックできない)。逆回転は
`shapeRot()` と同じく `s.w!=null`(ボックスシェイプ)でガードする — line/arrow/pen は
未回転で描画されるので当たり判定も未回転にしないと `s.x/s.w=undefined` で中心が NaN になり
永久に当たらなくなる(表示=当たり判定パリティ)。

ペンは line segments の距離チェック。エンドポイント: Ramer-Douglas-Peucker で commit 時に decimation — ε は `0.5/zoom` のズーム適応 (ADR-0034: ズームイン時の精密筆跡を保持)。実装はスタック駆動の反復形 (再帰でないので長ストロークでスタック溢れしない)。

**Spatial index** (`v1.6.11` 導入、v1.7.x で拡張): board に 40+ shape 以上ある場合、`pickTop`・マーキー選択 (ADR-0032)・draw() の可視列挙 (ADR-0016)・ダメージ矩形の交差判定が `_buildGrid` で構築したグリッドセル索引を `_queryGrid` で使う。`_apply` ごとに `_invalidateGrid()` で無効化 (`_gridVer` 加算)、次のクエリで再構築。`_gridVer` はミニマップキャッシュ (ADR-0025) やスナップ索引 (ADR-0020) の無効化キーとしても共有される。

## フレームレート

DPR キャップ 3 (Retina 2x が実効上限)。
requestAnimationFrame 1 本。ユーザー操作中も常に 60fps を目標。

重い場合の緩和 (累積する施策の上位層):
- `needsRender`/`needsOverlay` でスキップ — アイドル時の描画コストはゼロ
- **2 層キャンバス** (ADR-0024): overlay-only 変化はシーンを触らない
- **プレビュービットマップ** (ADR-0028/0030/0033): パン/ズーム中はシーン再走査せず
  スナップショットを合成
- **ダメージ矩形** (ADR-0026/0027): ドラッグ/外部 op は汚れ矩形のみ再描画
- **空間索引** (ADR-0016): 可視列挙が `_grid` ベース (線形走査ではない)
- **ビットマップキャッシュ** (ADR-0018/0025): ペンストロークとミニマップ中身は
  rasterize 済みを再利用
- グリッドは `gsZ<6` で描画スキップ + `opacity` で fade
- 選択枠は screen space で描画 (transform 切替 1 回のみ)
- getCSS: `_cssCache` でテーマカラーを memoize (テーマ変更時に `clearCSSCache`)
- `_penCache` ペン bbox メモ化 (ADR-0019)、`_imgKey` O(1) 画像キー (ADR-0021)、
  `_snapIndex` ソート済みスナップ索引 (ADR-0020) でイベント駆動の線形走査を解消
- **キャッシュ不変条件**: シェイプ削除系は全て `_psc(id)`/`_pcC()` 経由で
  `_penBboxCache`/`_penCache`/`Net._imgPending` をパージ (ADR-0424/0427/0435) —
  id keyed な per-shape キャッシュが増えたら `_psc` 側に追加すること。
  `_wrapCache` のキーは (text, maxWidth, fontSize, bold, italic, font, spacing)
  — measureText に影響する prop を新設したらキーにも含める (ADR-0437)。
- **GPU コンテキストロスト** (ADR-0627): `contextlost` を preventDefault で
  `contextrestored` を許可し、復帰で `_ctxUp` が `_penCache`/`_inkD`/minimap
  `_scene` をパージして `_iv`/`_ivO` 再描画 — GPU リセット後のブランク残留を
  解消。GPU 裏付けのラスタキャッシュを新設したら `_ctxUp` のパージに含める
  (CPU 側の `_penBboxCache`/`_imgCache`/`_imgPending` は対象外)。

## DPR

`canvas.width = cssW * DPR` で内部解像度を確保。Retina で滑らか。DPR 変化 (マルチモニタ移動) で `resize()` 再計算。
`resize()` 自体はバッキングストア全再確保を伴うため、window/visualViewport/
orientation の resize リスナーは 150ms trailing-edge debounce (`_resizeSoon`)
を通る — OS ドラッグや iOS URL バーアニメーションの連続発火を終端 1 回に
集約する (ADR-0631)。`_watchDPR` の単発発火のみ直接呼び。

**オーバーレイパスの規約 (v1.7.62 の学び)**: `draw()` 後半のオーバーレイパス
(選択枠・ガイド・マーキー・レーザー・ピアカーソル/選択) は
`ctx.setTransform(DPR,0,0,DPR,0,0)` を張った **CSS px 空間**で描く。`G.w2s()` の出力を
そのまま使い、**`*DPR` を手で掛けてはならない** — トランスフォームが既に DPR を供給して
いるため二重適用になり、DPR>1 の画面で座標が DPR 倍にズレる。このバグは v1.6.5 から
5 関数に残存していた (DPR=1 では両者が一致するため、fake-DOM テストでも DPR=1 実機でも
原理的に検出不能だった)。線幅・破線・半径も CSS px で指定すればトランスフォーム経由で
正しくスケールする。test.mjs にプレゼンス検査 (`*DPR` の再混入検知) を追加済み。

## i18n

`I18N` オブジェクトに ja / en を併記。`navigator.language` で起動時判定。`T = I18N[LANG]`。
DOM 要素は `data-t` 属性 + `UI.applyI18n()` で翻訳 (起動時に 1 回走査)。
`t(key)` = `T[key] || I18N.en[key] || key` (キー名フォールバックで破綻しない)。

## セキュリティ

- `innerHTML =` は CI の grep で禁止 (ゼロ件確認)
- 外部リソース (`<script src>` / `<link href>`) は CI の grep で禁止
- SVG / PDF エクスポート: 全属性値を `_esc()` でエスケープ (`& < > "`)
- 画像: `data:image/` プレフィックス検証のみ許可
- 受信 op: `REMOTE_OPS` 許可リスト + `validRemotePayload` で型チェック
- `validShape` を全 intake パス (IDB, sync, URL, .board import) で適用

## アクセシビリティ (v1.6.37+)

- Canvas: `role="application"`, `aria-label` でキーボード操作を説明
- Toast: 親 `aria-live="polite"` + 個別 `role="alert"` (err/warn) / `role="status"` (ok)
- コンテキストメニュー: `role="menu"` / `role="menuitem"` / `role="separator"`, Escape で閉じる, 開時に最初の項目へフォーカス
- ヘルプモーダル / 共有モーダル: Escape で閉じる, `role="dialog"` + `aria-modal`
- 全インタラクティブ要素: `aria-label`, `aria-pressed`
- WCAG AAA: テキスト 18:1+, ブランドカラー `--brand-ink` (#003B40) で 7.5:1 非テキスト
- `prefers-reduced-motion` / `prefers-color-scheme` / `forced-colors` / `prefers-contrast` 対応

## P2P 同期

### BroadcastChannel (同一オリジン間)
`NET_CHANNEL_PREFIX+'board.'+roomId` チャンネルで op をブロードキャスト。`ping/pong` でピア検出 (`NET_PRESENCE_INTERVAL` 間隔)。

### WebRTC DataChannel (端末間)
手動シグナリング (offer/answer をコピーして交換)。DTLS 暗号化。

**ワイヤプロトコル (v1.7.4xx)**: 全メッセージは JSON 文字列。SCTP 単一
メッセージ上限 (~256KiB) に収まらないペイロードは断片化される:

- `op` — 通常の op ブロードキャスト (`broadcast`)。>200KB は `opc` 断片化
  (ADR-0431)。
- `snap` / `opc` — 64KB 断片 `{k,seq,n,data}`、受信は `_fragIn` が
  `{p,g,n}` 再構成。重複 `seq` は `!p[seq]` で棄却、n 不一致も棄却、
  完了時に join して元メッセージとして `_onRecv` に流す (24MB 上限)。
  宣言 `n>384` (24MB÷64KB) は受理不能として明示棄却、送信側 `_fragSend`
  も超過時に `syncTooLarge` トーストで中止 (ADR-0603) — 両側一致で
  「送ったが届かない」分岐を排除。切断時 `_snapIn/_opcIn` をリセット (ADR-0385)。
- `img` — 画像 blob の `{k,key,seq,n,data}` 断片。op/snapshot 内の画像は
  `_slimOp` で `img:<key>` 参照に痩身化され、バイト本体は別経路
  (`_imgOuts` → 64KB chunks → `_imgChunks` 再構成 → `_imgIn`)。
  参照先不明の shape は `_imgPending` に駐車し blob 到着で attach
  (ADR-0069/0374/0379)。削除済み shape の駐車エントリは `_psc` が除去
  (ADR-0435)。
- 送信は `_sendDC` 単一漏斗 — SCTP バッファ満杯の throw を
  `onbufferedamountlow` 再送キュー (`_dcQ`) に変換 (ADR-0432)。
  >256KiB の単一メッセージは永久に送れないため即 drop (ADR-0438)。
- `hello`/`sync-req`/`ping`/`cursor`/`selection`/`name` — BroadcastChannel
  経路のみ (RTC ピアは `_rtcPeerId` 合成 id で追跡、ADR-0010/0011)。
  snapshot 要求は 1 秒 throttle (安価要求×高価応答の増幅防止)。

### ライフサイクル (v1.7.49x)
- **incarnation**: peer id は `peerId+'.'+nonce` で起動毎に一意 — `seenOps`
  の `peer:seq` キーとリロード毎の seq リセットの衝突を解消 (ADR-0459)。
- **応答選出**: snapshot/sync-req の応答者は `_loResp` (最小 id ピア) で
  N→1 応答を抑止 (ADR-0455)。asker は選出から除外 — 最小 id の joiner が
  応答者 0 人になる飢餓を防止 (ADR-0465)。
- **throttle 再送**: `_sendSnapshot` が throttle で棄却した要求は 1.1s で
  遅延再送 (`_snapT`) — joiner が応答を得られない窓を解消 (ADR-0452)。
- **有界再送**: joiner は `_snapRx`/`_snapRetry` で応答未達を検出し、
  presence tick で sync-req を 3 回まで再送 (ADR-0475) — 応答喪失時の
  空盤面待機を解消。`Net.init` で両フラグをリセット。
- **離脱**: `pagehide` で flush+bye、bye 受信でピア即時除去 (ADR-0457)。
- **ルーム切替 hygiene** (ADR-0458/0464/0466/0467/0619): `Net.init` は
  旧チャンネルへ bye → `seenOps`・`_snapT`・非RTC `state.peers`・
  `_imgSent/_imgChunks/_imgOuts`・`_snapIn/_opcIn`・`_pCt` と因果
  marker (`state._lastRep`・`_nameTs`) をリセット。
  room-scoped 状態の持ち越しによる ghost カーソル・blob 未到達・
  ストリーム継ぎ接ぎ・phantom announce を全て防ぎ、wire ドメインの
  marker 持ち越しで新ルームの snapshot/改名が「古い」と永久棄却
  されるのを防ぐ (ADR-0619)。
- **'replace' 収束** (ADR-0613..0618): 全置換 (import/share 取込) は
  `{op:'replace',after,afterWc}` を wire に乗せる。`after` は
  `validShape` 配列、`afterWc` は prop clock マップとして検証。
  `state._lastRep` = 最新適用 swap clock で全順序を仲裁 — 並行 swap は
  `clockNewer` で勝者一意化 (0614)、undo/redo は `_undoWire` が
  pre-swap 盤面を再ブロードキャスト (0615)、`_recordCommitted` 経路も
  marker を記録 (0616)。snapshot は `rep:state._lastRep` を同梱し、
  受信側は「自身の marker より古い世代の snapshot」を棄却、より新しい
  `rep` は採用後に marker を整合 (0617)。snapshot の docName は
  `nameTs` で LWW — focused input 中のユーザー入力を保護しつつ
  改名を収束 (0609/0618)。
- **undo×sync**: undo/redo は逆 op (del→add、add→del、upd→逆patch) を
  ワイヤに乗せピア側も復元 (ADR-0443/0444)。del/clear の送信は
  `_slimOp` で画像バイトを痩身化 (ADR-0445)。

  undo-wire の収束規則 (ADR-0717–0727):
  - **undo は新規の競合書込**: `undo()`/`redo()` は適用前に
    `{peer,seq,ts}` を再刻印し、逆 op にも同一の (ts,peer) を付す —
    ローカル仲裁とワイヤで勝者が割れない (0717/0718)。
  - **復元対象は「元の時計」で戻る**: undo の新規 clock は op 自体の
    勝敗に使うが、復活する *状態* の時計は生前の値を輸送する —
    del/clear/pageDel の `wc` スナップ (0721/0722、clear は merge、
    全置換は行き違い時計を消す)、pageName の `nts/ntp` (0727)。
    さもないと undo clock を刻んだ側だけ「次の書込の勝者」が変わる。
  - **メンバー/効果は op 添付物でなく現状態で決める**: pageAdd undo は
    `op.shapes` ではなく `_pgDel2` の現メンバー基準 (0724)。後から
    `pg=op.id` を得た図形も op が死んで追う — ワイヤ pageDel と同じ
    セマンティクス。最終ページの undo は `unpage:1` wire で
    op 由来のみ死・残り un-page。
  - **帰属先は送側の選択を輸送**: pageDel の locked メンバー再帰属は
    `firstId` をワイヤに乗せる (0725) — ページ順が発散したピアで
    ローカル順から算出すると `pg` が永久分裂する (LWW 非対象)。
  - **locked ゲートは forward 側と対称**: upd/style/move/group/zorder/
    pageDel(connClears)/add の backward も `locked` を skip
    (0711–0716)。
  - **`_slimOp` は undo-domain を剥がし wire-domain を残す**: `bts/
    origSel/moved/connClears` は落とすが `wc/unpage+shapes/firstId/
    nts,ntp` はワイヤに必要なため残す (0705/0721–0727)。
  - **move は絶対位置で双方向**: 送信側・undo-wire とも `after`/`before`
    は絶対 {x,y} ペア — bare delta は raced 基準で非収束 (0729/0731/0732)。
    delta 経路の undo は軸毎 `_lwwSkip` でピア新規書込を保護 (0733)。
  - **`beautify`/`replace`/`clear` も wire op**: beautify は patch-swap
    (0730/0731)、clear は `{op:'replace',after:[],afterWc:{}}` に翻訳され
    `_lastRep` 因果順序と snapshot rep marker を共有 (0626)。
  - **墓標は世代を超えて残る**: del/clear/replace/pageDel の tombstone
    `{_del:clock}` は `_imgPending` wipe・wclock 洪水 cap (0738)・
    snapshot 空盤面採用 (0735) でも保持 — stale add/snapshot が
    削除済み図形を復活させない (0734–0737)。
  - **受信側検証**: `addMany.wc` は `replace.afterWc` と同じ `wcOk`
    検査 (0726) に加え、ページ op の付帯フィールド — `pageAdd.i`、
    `pageDel.firstId`、`pageName.nts` — も有限数/≤64文字列を要求 (0755)。
    悪意/壊損 clock・非有限値の NaN 汚染を遮断。
  - **`pageDel` の `unpage` は kill 集合 `shapes` を必須に** (0776):
    `unpage` は `===1` 完全一致 + `unpage` を持つ op は `shapes` 配列必須。
    kill 集合を運ばない unpage は「メンバーを消す」でなく「un-page して
    残す」になり送側と発散する — 非適合 op は半適用せず棄却。通常形の
    `shapes` なし (メンバーは受信側が再導出) は従来どおり受理。
- **frag 再起動**: `snap`/`opc`/`img` の `n` 不一致・key 衝突で旧断片を
  捨てて新ストリームを再起動、`_imgIn`/`_imgChunks` は 96KB/256-entry
  で上限化 (ADR-0448/0449/0454)。
- **切断**: `dc.onclose` で `_dcQ` 破棄 + 再組立スロット掃除
  (ADR-0446/0448)。
- **wire キャップ整合** (ADR-0473/0479): zorder `changes` の
  frac ≤600・id ≤64、group/ungroup の gid ≤64 — 敵性ピアの巨大
  文字列注入を `validRemotePayload` で遮断。スナップショット取込は
  `SHARE_MAX_SHAPES` (200k) まで許容し >500 図形盤面の切捨てを解消
  (ADR-0474)。
- **mixed-version intake** (ADR-0739–0742): 全 op clock は HLC floor (`nowTs`) で統一、
  wire の dead field (hello/ping seq・snapshot curPg) は剥がし、remote `move` は絶対
  `after` 必須・remote `zorder` は `changes` 必須 — stale-SW 旧版ピアが送出しうる
  旧 wire 形 (bare delta / wholesale z-order) を受信側で全て拒絶し、混在ルームでも
  収束規則が破れないようにした。
- **op 配列上限 = 盤面上限** (ADR-0602): `addMany`/`del`/`zorder`/
  `group`/`ungroup`/`connClears` の配列キャップは旧 ~500 固定から
  `MAX_OP_SHAPES=SHARE_MAX_SHAPES` へ統一 — 「一つの op が盤面の
  全図形をアドレスできる」上限で、501+ 一括 op が受信側だけ
  無通知棄却されて分岐していた問題を解消。実効の DoS 上限は
  配列数でなくワイヤサイズ (生 op ≤256KiB、断片化経路 ≤24MB)
  にある — それ超過は `_fragSend`/`_fragIn` の明示ガード (ADR-0603)。
- **clock 本体も bounded** (ADR-0779/0780): `validClock` は `peer ≤MAX_PEER_ID_LEN`・
  `seq ≤80` を要求し、snapshot ヘッダの `namePeer`/`ntp` も `_idOK` で縛る —
  文字列長の自由だった残窓を閉塞。`pageDel 'unpage'` は wire kill-set (`kill[]`)
  が無ければ棄却 (ADR-0776)。op が運ぶ未知の `s.pg` は `'?'` スタブ heal で
  表示崩壊させず、`pageAdd` が到着した時点で昇格解消する (ADR-0775/0778)。
- **蓄積量は件数ではなくバイトで縛る** (ADR-0781–0785): 再組立て・送信
  キュー・受信 blob 保持の全経路に per-slot + 集計のバイト予算:
  `img` スロット ≤12MB 且つ `_imgChunks` 集計 ≤24MB (最古 LRU 退避)、
  `snap`/`opc` スロット ≤24MB 早期中断、`_dcQ` ≤4096件 且つ ≤32MB (`_dcQB`)、
  保持側 `_imgIn` ≤256件 且つ ≤64MB。件数上限だけの時代は「最大チャンク
  ×件数」で GB 級に膨らみ得た — 現在の攻撃者駆動保持量の実効上限は合計
  ~112MB。
- **再組立てに TTL** (ADR-0786): 容量だけでなく寿命も縛る — presence タイマで
  `_reapPeers` と並走する `_reapFrags` が 60s アイドルの `_imgChunks`/
  `_snapIn`/`_opcIn` スロットを退避 (各チャンク格納時の `t` スタンプで
  最終活動判定 — 生きたストリームは殺さない)。後続チャンクは seq:0/
  out-of-order で自然に再開される。
- **wclock は null-proto マップ** (ADR-0788/0789): `__proto__` という id を持つ
  wire `wc` キーがマップ原型を変異させ、墓標判定が全図形を「削除済み」と誤読して
  全 add を凍結する 1-op 実害があった。`_wM` (Object.create(null)) / `_wD`/`_wR`/
  `_wTb` が全書込・復元・墓標マージを集約し、dup-id 図形は wholesale 取込で
  keep-last dedupe (byId last-wins parity、0790)。
- **LWW 時計と幾何値も bounded** (ADR-0791–0793): `validClock`/wc/name/IDB の全
  ts を `_tsOK` (壁時計+5分) に — 遠未来 ts は LWW に永久勝利して収束を乗っ取る
  (`nowTs` が remote ts に単調追従するので bounded 取込は自己修復的)。座標は
  `_xyOK` (|v|≤1e7) に、非座標 prop も `size≤1e4` (bbox pad: pen/conn÷2、矢印×3、
  elbow stub×8)、`bend` (world coord) `_xyOK`、結合フォーカス `aF/bF∈[0,1]` に —
  座標に触れない遠方値でも bboxAll を汚染し得た経路を完走閉塞。

### CRDT clock
各 op は `{peer, seq}` clock を持ち、`seenOps` (Set) で重複排除。スナップショット
sync は `seq:'snap:<shapeId>'` で shape 単位の clock を割当 (配列 index ではなく
グローバル一意な id キー — 再 snapshot での dedup 衝突を回避)。`wc` に
per-shape プロパティ単位 LWW 時計を同梱し、受信側 `_mergeSnapshotOp` が
既存図形を property merge (ADR-0058)。マージする値自体も `validPatch`
でゲート (ADR-0372/0373)。

## 回転 (v1.6.62-65 — ソクラテス問答監査)

`shape.rotate` (度) は **全 box 型** (rect/ellipse/sticky/text/image/frame) に適用される。
pen/line/arrow は点ジオメトリで box 中心が無く回転中心が NaN になるため `doRotate` で除外
(`s.w!=null` フィルタ)。複数選択回転は選択 bbox 中心で各シェイプを公転 (`doFlip` と同じ
群中心セマンティクス)、単一選択はその場回転。`,`/`.` キーで ±15°、ロックシェイプは除外。

**ドラッグ回転ハンドル (v1.6.67)**: 単一選択時、`getRotHandle` がシェイプ上辺中央の外側
(`ROT_OFFSET` 画面px) に回転ノブの世界座標を返す (回転シェイプではノブも公転)。
`hitRotHandle` でヒット → `ptr.dragKind='rotate'`。ドラッグ中は
`atan2(wp.y-cy, wp.x-cx)+90°` で絶対角を算出 (ノブ上 = 0°)、Shift で 15° スナップ。
ピボットはシェイプ中心 (`drawShape` と一致)。コミットは `upd` op で可逆、確定時に
`describeShape` を `aria-live` トーストで読み上げ。`pointercancel` で `rotOrig` 復元。
ノブは resize ハンドルより優先 (bbox 外なので衝突しない)。

全経路で整合 (v1.6.65 で予算撤去後に完成):
- **draw**: `drawShape` が `ctx.translate/rotate` で box 中心周りに回転。
- **hit**: `G.hit` が点を逆回転して未回転ヒットテスト。
- **bbox**: `G.bbox` が回転包絡矩形を返す (text も v1.6.65 で対応)。
- **SVG**: rect/ellipse/text/image/sticky/frame に `transform="rotate(...)"`。
- **PNG**: `drawShape` 経由で自動的に回転。
- **ミニマップ**: 各 box シェイプに回転変換を適用 (v1.6.65)。
- **コネクタ束縛**: `_edgePt` が回転対応 — 対象点を逆回転 → 未回転 box のエッジ計算 →
  順回転で、回転シェイプの**実エッジ**に端点を投影 (包絡矩形角ではない、v1.6.65)。
- **describeShape**: SR アナウンスにロック状態と回転角を含む (v1.6.65)。
- **リサイズ (v1.6.69)**: `getHandles` は回転シェイプでも 8 ハンドルを回転位置に返す。
  `applyResize` はドラッグ点をローカル (未回転) フレームへ逆回転 → 既存 switch/Shift/Alt を
  適用 → 反対側アンカー (角/辺中点) をワールド座標で固定するよう平行移動。回転矩形の選択枠は
  `_rotPt` で 4 角をなぞる。Shift (比率)・Alt (中心固定) も回転シェイプで機能。

### 残る軽微な非対応
- **整列は回転後 bbox 基準**: `doAlign` は `G.bbox` (包絡矩形) で整列する。回転シェイプは
  見かけより大きい bbox を持つため、整列結果が直感と異なる場合がある。

> 解消済み: 回転リサイズのカーソル向き (v1.7.392 / ADR-0341)、
> マーキー選択のロック除外 (ADR-0127)。

## コネクタ束縛と変換 (v1.7.61x — ADR-0209/0377/0583–0588)

コネクタ (`line`/`arrow`) は `a`/`b` (結合先 id)、`aF`/`bF` (結合先の回転込み extent
`_bb` 上の比率座標 {fx,fy})、`labelPos` (経路パラメタ t∈0..1)、`way`/`bend`/`cbend`
(経路形状) を持つ。`connEnds` が `a`/`b`/`aF`/`bF` を優先解決し、非結合時は `x1..y2`。

**変換ごとの不変条件**:

| 変換 | `x1..y2`/`way`/`bend` | `cbend` | `labelPos` | `aF`/`bF` |
|---|---|---|---|---|
| translate | 平行移動 | 不変 (符号付き垂距) | 不変 (パラメタ) | 不変 (extent 追随) |
| flip | 鏡映 (bend は trunk 軸のみ) | 符号反転 (chirality) | `1−t` (0583) | `1−f` — 結合先が反転した場合のみ (0584/0588) |
| reverse | 端点交換+way 逆順 | 符号反転 (0585) | `1−t` | `a`↔`b` swap 保持 |
| rotate/grot | 軌道+自転 (_rotBend) | 不変 (方向に追従) | 不変 | 軌道+自転で再正規化 (0586/0587) |
| gresize/resize | `_mapToBox` 写像 | スケール | 不変 | 比率なので extent 追随 |

- **`connClears`** (del 系 op 同梱): 結合先削除時に `a`/`b`/`aF`/`bF` をクリアし
  端点を現在値に凍結 (`computeConnClears`)。locked コネクタは清書しない。
  - **記録ではなく再導出も併用**: `del` forward は記録 `connClears` 適用の後で
    `_remoteDelConnFix(op)` を走査 — undo↔redo ギャップ中の新規結合も消去し
    受信側と同一結果になる (0758)。`add`/`addMany` backward も同機構を合成
    del op で実行 — 生存期間の結合がピア側 `del` 逆 op と同じく消える (0759)
  - **locked 生存者の binding は保持**: `del` が locked で splice を skip する
    図形を含む場合、その図形への結合は消さない — `goneIds`/`delIds` の判定に
    `!(byId(id)||{}).locked`、wire 記録適用は端点毎に生存者判定 (0760)
- **選択外コネクタ**も結合先が変換対象なら before/after に同梱して変換
  (0586 doRotate / 0588 doFlip / 0587 grot は `ptr.gAnc` で原値退避・再計算 — ドリフト防止)。

## フレームとメンバーシップ (v1.7.79x — ADR-0767)

frame のメンバーシップは `s.grp` ではなく**幾何**で決まる — 図形の回転込み
外接 `_bb` がフレーム `_bb` に `_inR` 完全内包されればメンバー。コンテインメント
は `_pgOk` でページスコープ。

- **`withFrameChildren(ids)`**: 選択へメンバーを拡張する唯一のチョークポイント。
  delete/nudge/align/dup/placeCopies/ステータス対象集合が全てこれを通る。
  **入れ子フレームもメンバー** (0767) — 旧 `_frm` 除外だと外枠の move/delete で
  内枠が取り残され detached なまま残った。
- **`_frameOf(sel, ok)`**: メンバー→フレームの unitMap。入れ子時は**最外枠**が
  主張する (outer-keyed: 自分外包の内側フレームをスキップする `j<i||!contains`
  選択)。図形のフレームは1つだけ (`m.has` 先着)、`ok` 述語で対象フィルタ
  (`_rotatable` 等)。align/rotate/grot の「フレームごとにまとめて変換」が使う。
- **excalidraw parity**: emit の `frameId` も同じ主張規則 — 内側フレーム図形にも
  `frameId=外枠` を書く (0767)。

## 検索ハイライトの描画 (v1.6.61)

`_sq` にマッチするシェイプはワールド変換ブロック内で `strokeRect` され、
`lineWidth=3/zoom` でズーム補正して一定の視覚太さを保つ (スクリーン空間描画の代替)。

## 外部フォーマット相互運用 (v1.7.2xx–1.7.3xx)

`.excalidraw` / `.drawio` の双方向変換は「往復で Board モデルが保存される」を設計目標にする。
- `.drawio` import は非圧縮 + deflate-raw+base64 の両形式を `importDrawioText` /
  `_dioInflate` (8MB 爆弾ガード ADR-0325) が処理。`<UserObject>` ラッパー (ADR-0328)、
  複数 `<diagram>` ページの横並び平坦化 (ADR-0311/0324)、`parent` チェーンの
  座標解決 (ADR-0240) と `style="group;"` ↔ `s.groupId` 往復 (ADR-0336) を含む。
- `.drawio` export は `_dioStyEmit` にスタイル属性を集約 (ADR-0263)。
- `.excalidraw` は `excScene`/`excToShapes` が containerId ラベル・boundElements・
  arrowhead enum (ADR-0338) を往復。
- セキュリティ: `validPatch` が全 intake パスの共有ゲート (dataUrl/link のスキーム
  検証 ADR-0327)。

## マルチページ (v1.7.67x — ADR-0646–0670)

`state.pages=[{id,name,nts}]` (null = ページ機構未起動)、`state.curPg`=閲覧中ページ、
図形 `s.pg` は帰属ページ (未設定は `pages[0].id` へ位置づけ帰属)。
`pageAdd/pageDel/pageName` op が wire 収束 — `pageAdd` は `op.shapes` でメンバーを
同梱 (0650)、`pageDel` は forward が `op.shapes`+`op.i` を記録して undo 可能、
`pageName` は `p.nts` の LWW。

**ページスコープ不変条件** (0658–0669 の監査結論):

| 層 | スコープ | 例 |
|---|---|---|
| 表示/選択/入力 | `_pgOk` (閲覧ページ) | draw 反復、pickTop、marquee (`_sad`/`_ss` チョークポイント)、検索 `_sqMatches`、Tab チェーン、selectInverse/frame contents、showAll/unlockAll、fitFrames、ホップ候補、空ヒント、ミニマップナビ、ステータス図形数 |
| 単一シーン export | `_shV` (可視+ページ) | PNG/SVG/.excalidraw — 明示引数にも同じ制約 (0666) |
| 永続化/全ドキュメント | `_sh()` グローバル | `.board`/.drawio export、Persist、snapshot、`replace`/`clear` |
| 幾何不変条件 | `_sh()` グローバル | 結合コネクタ掃引 (`ptr.gAnc`/`_bc`/`_rc`/`computeConnClears`)、z 空間、`_buildGrid` 候補生成 |

- **遷移はジェスチャを殺す**: `switchPage`/`_pgAdopt` が `_cancelPointerGesture`
  (0664) — 別ページ図形への不可視コミットを防ぐ。`_pgAdopt` は `_cxO` で
  編集エディタも畳む (0684)。adopt 時はさらに `_iG` で `_gridVer` 系キャッシュ
  を無効化 (0748 — `_sqMatches` 等が旧帰属のまま返るのを防ぐ)、`_ss(_selIds())`
  で選択を `_pgOk` 再検証 (0749 — 旧ページ図形が不可視のまま選択に残るのを防ぐ)、
  ページ交代なら `_ann` で着陸ページ名を SR アナウンス (0750 — switchPage 同格)
- **プレゼンス**: `cursor`/`selection` wire に `pg` 同梱、別ページカーソルは非描画
  (0647)、アバターツールチップ+クリック follow (0656/0670)。送出 dedup 鍵に
  `curPg` 同梱 (0680 — 選択不変のページ切替でも再送)。ピアの `pg` 変化は
  `_refreshPeers` を即時呼んでツールチップのページ名を遅れなく更新する
  (0769 — presence ではなく `frame()` の presence 検出間隔に依存させない)
- **帰属ヒール**: 未知 `pg` を持つ remote 図形は `?` ページを自動生成 (0646)、
  `pageAdd` backward の最終ページ→残部へ再帰属、`pageDel` 系は switchPage 経由で
  ビュー着地 (0649/0663)。`pageDel` はメンバー wclock も削除 (0679)
- **スナップショット**: 受信側の `curPg` を保持 (0672)、同一 id ページ名は
  `nts` LWW で union-heal (0681)
- **送出順不変条件**: `pg` 同梱の presence 送信は `curPg` 代入の**後**に行う
  — 逆順だと hide/sel が旧ページを指しピア側のアバタ/follow が誤着する
  (`switchPage` 0689、`_pgAdopt` 0690)。ページ交代が起こり得る経路はすべて
  cursorHide を送る (ピアカーソル残存の防止)
- **タブ UI** (`_pgBar`, 0673–0686): `#pgTabs` の chip 再構築は `_pgSig`
  (id+`\x1f`+name join) 変化時のみ — フォーカス chip を `_pgid` で復元
  (0683)。chip は完全名 `aria-label` (0682)、アクティブは `aria-current`+
  `scrollIntoView` 追従 (0675/0685)。ページ集合変化でアバターツールチップも
  更新 (0686)
- **派生面**: プレゼン `_goto` はページ切替でオフページフレームを prune (0677)、
  .drawio export は非表示を除外 (0678 — excalidraw 0594 と同格)、`curPg` は
  doc record で永続化 (0674)

**改名/削除の収束規則** (ADR-0698–0705 の監査結論):

- **改名は (ts,peer) 全順序 LWW**: `p.nts`+`p.ntp` に `clockNewer` — ts 同値の
  並行改名は peer 文字列比較で一意化 (0698)。docName も `_nameTs`+`_namePeer`
  で同規則 (0699)。`nts`/`nameTs` は**有限数か不在のみ**受理 — NaN/Infinity は
  改名を永久凍結するため `_vPages`・name msg・snapshot nameTs・doc record で
  一律棄却 (0700/0701)
- **undo ゲートは「現行 = 自身の書込」で判定**: `bts>=nts` は永遠に不成立で
  undo がローカル no-op だった (0702)。`!clockNewer(current, op.clock)` なら
  復元可 — より新しい書込が立つ場合はスキップし、wire inverse op も相手側
  LWW で負けるため両者収束
- **ローカル限定ガードと remote 適用の分離**: `pageDel` の `<2` ガードは
  `clock.peer===_pi()` のローカルのみ — remote は最終ページでも適用し
  空集合はページモード終了へ整合 (0703 — 拒否するとページ集合が永続発散)
- **wire pageAdd は `op.i` で位置復元**: pageDel undo-wire の復元がローカル
  `splice(i)` vs peers 末尾 push で順序発散していた (0704)。`i` なしは末尾互換
- **wire は適用フィールドのみ**: pageDel → `{id,clock}`、pageName →
  `{id,after,clock}` — メンバー/i/name/undo-domain は受信側が再計算するため
  dead weight (0705)
- **pageDel は 'del' parity**: locked メンバーは除去せず `firstId` へ再帰属
  (空集合経路では un-paged → `_pgHealS`)、結合コネクタは
  `computeConnClears` で端点凍結+`op.connClears` 記録 (backward は
  `before` 復元、undo-wire はピアへ `upd{before}` で再結合) (0707)
- **pageAdd のメンバーは `pg=op.id` 強制**: wire `shapes` の `pg` を信頼しない
  — op が帰属を定義し全ピアで同値正規化 (0708)
- **編集 overlay は off-page で畳む**: `_teFollow`/`_lblFollow` の畳み条件に
  `!_pgOk` — remote `upd{pg}` の再帰属で不可視図形へ沈黙入力しない (0709)

## 今後

- Plugin API (iframe sandbox + postMessage)、Figma import (v2.0)

> 完了済み: z 順序の fractional indexing (ADR-0001)、AES-GCM E2E 暗号化
> (ADR-0015)、マルチページ (ADR-0646–0686)。
> スレッドコメントは scratchpad 製品判断で対象外 (CLAUDE.md「100点への距離」)。
