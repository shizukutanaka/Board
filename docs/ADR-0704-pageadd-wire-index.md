# ADR-0704 — wire pageAdd が記録済みインデックス op.i を尊重

## 状態
採用 (v1.7.730)

## 文脈
`pageDel` の undo-wire は `{op:'pageAdd',id,name,i:op.i}` を送る (op.i = 削除前の
インデックス)。ところが forward 適用側は常に末尾へ push していた →
ローカルの backward は `splice(op.i,…)` で元位置へ戻す一方、peers は末尾に
復元 → **ページ順序がピア間で発散**していた。

## 変更
- `pageAdd` forward で `_iN(op.i)&&_fin(op.i)` の場合 `splice(clamp(i|0,0,len))` へ。
  `i` 非存在の従来 op は従来どおり末尾追加 (後方互換)
- `i|0` で非整数を切り捨て、`min/max` で [0,len] にクランプ —
  並行 del/add で集合がずれた相手にも収束

## 検証
- `op:'pageAdd',i:1` が pages[1] に挿入
- `i:99` は末尾へクランプ
- `i` なしは末尾追加 (従来動作)
