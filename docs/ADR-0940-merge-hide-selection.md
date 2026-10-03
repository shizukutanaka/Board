# ADR-0940 — snapshot merge による hide が選択から id を落とさない (0568 parity)

Status: 実装済み (v1.7.966, 2026-10-01)

## Context

ADR-0568 は「hidden 図形は選択に残らない」不変条件を確立した: op 適用パス
(`style`/`upd`/`align`/`resize`/`beautify`) は触れた図形が `_hd` なら `_sdl(id)`
で選択から除去する。だが同じ可視性反転を起こせるもう一つの経路 —
スナップショットの per-property LWW merge (`_mergeSnapshotOp`) — には
この衛生がなかった。

`state.selection` は `Set` の直保持で、読み取り側 (`_selIds()`) は
visible フィルタを掛けない。書き込み側 (`_ss`/`_sad`) のみが `_sv` を
ゲートするため、merge で `visible:0` に反転した図形の id は選択集合に
滞留する。

## Defect

あるピアが選択中の図形について `visible:0` の新しい clock を持つ
スナップショットを送ると:

1. merge が `ex.visible=0` を採用 (`dirty` → 'merge')。
2. 図形は非表示になるが `state.selection` に id が残る。
3. 以後の選択操作 (⌫ delete, ナッジ, 複製, エクスポート選択) が
   不可視の図形を対象に含めて不可視に変形・削除する。

## Fix

`_mergeSnapshotOp` の `dirty` 分岐で op 適用パスと同じ衛生を一行追加:

```js
if(_hd(ex))_sdl(ex.id);   // merge-hidden shape can't stay selected (0568 parity)
```

merge 自体は dirty に付随して呼ばれるため、これ以外の選択インデックス
操作は不要 (`locked:true` の merge で編集 overlay が残る系は `_teFollow`/
`_lblFollow` の per-frame `_hd||_lk||!_pgOk` ゲートが次フレームで畳む —
監査で確認済み)。

## Pin

test.mjs: merge-hide の behavioural pin (2 asserts) — `visible:0` merge が
選択済み図形に適用された後、`state.selection` から id が除去されることを
実経路で固定。
