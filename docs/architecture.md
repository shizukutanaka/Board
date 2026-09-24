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
- `{op:'del', shapes:[...]}` — 複数削除を1つに
- `{op:'upd', id, before, after}` — 汎用プロパティ変更
- `{op:'move', ids:[...], dx, dy}` — 平行移動
- `{op:'zorder', before:[{id,z},...], after:[{id,z},...]}` — z 順序スナップショット差分
- `{op:'style', before:[{id,...},...], after:[{id,...},...]}` — マルチ選択スタイル一括変更 (スライダーコアレス)
- `{op:'align', before:[{id,...},...], after:[{id,...},...]}` — 整列
- `{op:'resize', before:[{id,w,h},...], after:[{id,w,h},...]}` — キーボードリサイズ (Alt+矢印) の
  一括パッチ (style/align と同じ Object.assign 機構、複数選択でも単一 undo)
- `{op:'group', ids, gid}` / `{op:'ungroup', ids, gids}` — グループ
- `{op:'clear', shapes:[...]}` — 全消去

**全 op が可逆**。`_apply(op, false)` で完全に戻せる。`test.mjs` のプロパティベーステストで30シナリオ往復検証。

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

## DPR

`canvas.width = cssW * DPR` で内部解像度を確保。Retina で滑らか。DPR 変化 (マルチモニタ移動) で `resize()` 再計算。

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

### CRDT clock
各 op は `{peer, seq}` clock を持ち、`seenOps` (Set) で重複排除。スナップショット sync は `seq:'snap'+i` で個別 clock を割当。

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
- **回転リサイズのカーソル向き**: `handleCursor` は軸並行の向きを返すため、回転シェイプでは
  カーソルの矢印向きが実際の伸縮方向と一致しない (機能は正しい、見た目のみ)。
- **マーキー選択はロックシェイプも選ぶ**: 選択はされるが `doMove` が移動をスキップするため、
  群移動でロックシェイプだけ取り残される (技術的に整合だが UX 上は分かりにくい)。
- **整列は回転後 bbox 基準**: `doAlign` は `G.bbox` (包絡矩形) で整列する。回転シェイプは
  見かけより大きい bbox を持つため、整列結果が直感と異なる場合がある。

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

## 今後

- Plugin API (iframe sandbox + postMessage)、Figma import (v2.0)

> 完了済み: z 順序の fractional indexing (ADR-0001)、AES-GCM E2E 暗号化
> (ADR-0015)。マルチページ/スレッドコメントは scratchpad 製品判断で対象外
> (CLAUDE.md「100点への距離」)。
