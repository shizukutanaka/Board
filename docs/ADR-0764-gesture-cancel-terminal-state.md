# ADR-0764: ジェスチャキャンセル終端状態の統一 (`_ptrReset`)

## 状態
実装済 (v1.7.790)

## 背景

ポインタジェスチャの中断経路は2系統ある:

1. **`abortGesture()`** — 二本目の指が接地してピンチへ移行する際の中断 (pointerdown `_nP()>=2` 経路)
2. **`_cancelPointerGesture()`** — pointercancel / Esc / blur / hidden / pagehide / contextmenu / プレゼン突入 / ページ切替 など外部要因による中断

両者は「進行中の in-place 変形を arm 時スナップショットへ巻き戻す」共通前半を持つが、**終端状態 (`ptr` フィールドの消去) が異なっていた**:

- `abortGesture` は `resizeOrig`/`rotOrig`/`resizeHandle` と `canvas.dataset.panning` を残した
- `_cancelPointerGesture` は `gAnc`/`rotA0`/`wayIdx`/`wayNew`/`lblOrig` を残した

## 問題

### 実害 (minor): grabbing カーソルの残留
`canvas[data-panning=true]{cursor:grabbing}` — パン中に二本目の指が接地すると `abortGesture` が `ptr.panning=false` にするが `dataset.panning` を戻さず、**ピンチ中もその後もカーソルが `grabbing` のまま**次のジェスチャが arm されるまで残留した。

### 潜在: 終端状態の非対称
残置フィールドは全て `dragKind` ゲート下でしか読まれないため現行では不活性だが、ダメージ矩形の need 集合 (2744–2746) は `resizeOrig`/`rotOrig` をゲート外で参照する — stale クローンは過大 invalidation の原因になり得た。フィールドが今後増えるたびに両経路へ分散して追記するのも保守上の欠陥だった。

## 決定

終端状態を単一の `_ptrReset()` へ統一し、両経路から呼ぶ:

```js
const _ptrReset=()=>{ptr.down=false;ptr.panning=false;ptr.dragKind=null;ptr.dragStartShapes=null;ptr.resizeHandle=null;ptr.resizeOrig=null;ptr.rotOrig=null;ptr.gOrig=null;ptr.gAnc=null;ptr.gBox=null;ptr.gPad=null;ptr.rotA0=null;ptr.ebendOrig=null;ptr.cbendOrig=null;ptr.wayOrig=null;ptr.wayIdx=null;ptr.wayNew=false;ptr.lblOrig=null;ptr.lineClick=false;canvas.dataset.panning='false'};
```

- **union の全フィールドを消す** — 全て単純な「arm 時のみ意味を持つ」スクラッチ状態であり、キャンセル後に残して意味のあるものは存在しない
- `dataset.panning` もここで戻す (通常の pointerup 経路 4448 でも個別に戻しているのは維持 — 正常終了時は `_ptrReset` を呼ばないため)
- `_zR()` / `_penPred=null` / `_iv()` / `_clearTouchState()` は各経路の文脈に留めた (同一タスクだが別カテゴリ — draft/marquee/guides は `_zR`、タッチ全体状態は cancel 側のみ)

## 効果

- grabbing カーソル残留を修正
- 両経路の終端 `ptr` 状態が**同一**になる (フィールド追加時は `_ptrReset` 1箇所のみ更新)
- ~190B の重複削除

## 検証

- source ピン: `_ptrReset` 定義・両呼出サイト・全フィールドの消去
- behavioural ピン: 全ジェスチャフィールドを arm した状態で `abortGesture()` / `_cancelPointerGesture()` を駆動し、終端状態が同一・全消去であること、`canvas.dataset.panning==='false'` であることを確認

## 参考

- 先行: ADR-0094 (Esc キャンセル), ADR-0516/0521/0524 (外部イベント経路), ADR-0636 (タッチ状態掃除), ADR-0664 (ページ切替キャンセル)
