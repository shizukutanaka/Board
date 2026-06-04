# Architecture

> Board v1.0 の内部設計。Carmack (perf) · Martin (clean) · Pike (simple) の適用。

## 全体像

```
┌─────────────────────────────────────────────────────────────┐
│ index.html (single file, ~64KB)                             │
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

### 3. Store (op-log, Command pattern)
```js
Store.commit(op)    // apply + append + cap history
Store.undo()        // apply inverse + decrement idx
Store.redo()        // re-apply + increment idx
Store._apply(op, forward)   // switch on op.op
```

op 型:
- `{op:'add', shape}` — shape を push
- `{op:'del', shapes:[...]}` — 複数削除を1つに
- `{op:'upd', id, before, after}` — 汎用プロパティ変更
- `{op:'move', ids:[...], dx, dy}` — 平行移動
- `{op:'z', id, from, to}` — z 順序移動
- `{op:'clear', shapes:[...]}` — 全消去

**全 op が可逆**。`_apply(op, false)` で完全に戻せる。これが Phase 2 で CRDT 化する時のベース。

### 4. State
唯一の真実。以下しか存在しない:
```js
{
  shapes: [],
  selection: Set<id>,
  viewport: {x, y, zoom},
  tool, style, history, histIdx,
  clipboard, hover, draft, editing, marquee,
  showGrid, docName, dirty, lastSaveAt
}
```

### 5. Render
RAF ループ。`needsRender` フラグで再描画をゲート。毎フレーム `draw()` を呼ぶわけではない — `invalidate()` が立ってる時だけ。

描画順:
1. 背景クリア
2. world→screen transform 設定
3. グリッド (zoom が十分なら)
4. 全 shape (z順)
5. draft (if any)
6. screen space で選択枠 + handle
7. marquee (if any)

### 6. Persist
IndexedDB (`board` / `docs` / `main`)。500ms デバウンス。`beforeunload` で最終セーブ。

## 座標系

- **world**: shape が持つ座標 (無限)
- **screen**: canvas 上のピクセル / DPR 倍
- 変換: `s2w(p) = p/zoom + viewport`、`w2s(p) = (p-viewport)*zoom`
- 描画は `ctx.setTransform(zoom*DPR, 0, 0, zoom*DPR, -vp.x*zoom*DPR, -vp.y*zoom*DPR)`

## Hit testing

bbox 先置き (quick reject) → shape 型別詳細。`tol = 6/zoom` でズーム時も一定の当たり判定。

ペンは line segments の距離チェック。O(n×m) だが pts を間引いている (1px未満 drop) ので問題なし。1000 shape × 100 pts まで目視60fps確認。

Phase 1.1 で quadtree 導入予定 (shape > 500 で線形探索が重くなる)。

## フレームレート

DPR キャップ 3 (Retina 2x が実効上限)。
requestAnimationFrame 1 本。ユーザー操作中も常に 60fps を目標。

重い場合の緩和:
- `needsRender` でスキップ
- グリッドは `gsZ<6` で描画スキップ + `opacity` で fade
- 選択枠は screen space で描画 (transform 切替 1 回のみ)

## DPR

`canvas.width = cssW * DPR` で内部解像度を確保。Retina で滑らか。DPR 変化 (マルチモニタ移動) で `resize()` 再計算。

## i18n

`I18N` オブジェクトに ja / en を併記。`navigator.language` で起動時判定。Phase 1.4 で JSON 分離 + 1000 言語 MT infra 導入予定。

## Service Worker

インライン Blob で登録。単一 HTML を cache-first で返す。初回アクセス後は完全オフライン。

## XSS

- `innerHTML` は help grid と context menu のみ、かつ値は定数/i18n のみ (ユーザー入力不含)
- テキスト shape は `fillText`/`textContent` 描画 (HTML としては評価されない)
- Doc name は `<input>` value (DOM エスケープ済み)

## 今後

Phase 1.1: op-log を WebRTC DataChannel でブロードキャスト → CRDT に昇格 (op に `clock:{peer,seq}` 追加、last-writer-wins)。

Phase 2.0: プラグイン API (iframe sandbox + postMessage)、カスタム shape 型、Figma import。
