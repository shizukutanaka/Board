# ADR-0546: prop 変化 op が選択中図形に触れたらスタイルパネルを再同期

- 状態: 実装済み (v1.7.574)
- 系: UI / 同期 (実害修正)

## 背景

`_syncStylePanelIfChanged` の署名は `_selN()+'|'+選択id列` のみで、
**選択メンバーシップ**しか見ていない。そのため選択を維持したまま
図形の prop が変わる経路 — リモートピアの style/upd op、undo/redo、
matchSize (align) 等 — ではパネルが古い値を表示し続けていた
(stroke スウォッチ・fill・dash・size・opacity スライダーが実値と乖離)。

## 決定

`Store._apply` の末尾 (op 適用後、damage 計算の前) で、prop 系 op
(`style|upd|align|resize|beautify`) の `_ids` (既に収穫済み) が
現在選択に1つでも触れたら `_selSig=null` を立てる。次フレームの
`_syncStylePanelIfChanged` が sig 不一致を検出して再同期する。

- `move` は除外: リモートドラッグが選択中図形に触れただけで毎パケット
  DOM スキャンが走るのを避ける (パネルに座標項目はない)。

## 影響

- ~170B 使用 (コメント刈り込みで相殺、raw 残量 ~36B)。
- undo/redo・リモート編集後のパネル不整合が解消。
