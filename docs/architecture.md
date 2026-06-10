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
- `{op:'add', shape}` — shape を push
- `{op:'del', shapes:[...]}` — 複数削除を1つに
- `{op:'upd', id, before, after}` — 汎用プロパティ変更
- `{op:'move', ids:[...], dx, dy}` — 平行移動
- `{op:'zorder', before:[{id,z},...], after:[{id,z},...]}` — z 順序スナップショット差分
- `{op:'style', before:[{id,...},...], after:[{id,...},...]}` — マルチ選択スタイル一括変更 (スライダーコアレス)
- `{op:'align', before:[{id,...},...], after:[{id,...},...]}` — 整列
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

### 5. Render
RAF ループ。`needsRender` フラグで再描画をゲート。毎フレーム `draw()` を呼ぶわけではない — `invalidate()` が立ってる時だけ。

描画順:
1. 背景クリア
2. world→screen transform 設定
3. グリッド (zoom が十分なら)
4. フレーム (最初に描画して他の shape が上に乗る)
5. 全 shape (z順、viewport culling で範囲外スキップ)
6. draft (if any)
7. スマート整列ガイド (drag 中のみ)
8. screen space で選択枠 + 8 handle (line/arrow は端点 2 つ)
9. marquee (if any)
10. ミニマップ (独立 canvas)

### 6. Persist
IndexedDB (`board` / `docs` / `main`)。500ms デバウンス。`beforeunload` で最終セーブ。`Ctrl+S` で即時保存。読み込み時に `validShape` で全 shape を検証。

## 座標系

- **world**: shape が持つ座標 (無限)
- **screen**: canvas 上のピクセル / DPR 倍
- 変換: `s2w(p) = p/zoom + viewport`、`w2s(p) = (p-viewport)*zoom`
- 描画は `ctx.setTransform(zoom*DPR, 0, 0, zoom*DPR, -vp.x*zoom*DPR, -vp.y*zoom*DPR)`

## Hit testing

bbox 先置き (quick reject) → shape 型別詳細。`tol = 6/zoom` でズーム時も一定の当たり判定。

ペンは line segments の距離チェック。エンドポイント: Ramer-Douglas-Peucker (ε=0.5px) で commit 時に decimation。

**Spatial index** (`v1.6.11`): board に 40+ shape 以上ある場合、`pickTop` は `_buildGrid` でグリッドセルインデックスを構築し `_queryGrid` で候補を絞る。`_apply` ごとに `_invalidateGrid()` で無効化、次の `pickTop` で再構築。

## フレームレート

DPR キャップ 3 (Retina 2x が実効上限)。
requestAnimationFrame 1 本。ユーザー操作中も常に 60fps を目標。

重い場合の緩和:
- `needsRender` でスキップ
- グリッドは `gsZ<6` で描画スキップ + `opacity` で fade
- 選択枠は screen space で描画 (transform 切替 1 回のみ)
- Viewport culling: `inView(s, visibleWorldRect())` で範囲外 shape をスキップ
- getCSS: `_cssCache` でテーマカラーを memoize (テーマ変更時に `clearCSSCache`)

## DPR

`canvas.width = cssW * DPR` で内部解像度を確保。Retina で滑らか。DPR 変化 (マルチモニタ移動) で `resize()` 再計算。

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

## 今後

- マルチページ、レーザーポインタ、スレッドコメント (v1.7+)
- Plugin API (iframe sandbox + postMessage)、Figma import (v2.0)
- AES-GCM E2E 暗号化 (URL fragment key + WebRTC DataChannel)
