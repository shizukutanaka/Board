# ADR-0568: 非表示化された図形を選択から落とす (_apply)

## 状態
実装済み (v1.7.595)

## 背景
ADR-0566 で「非表示図形は選択に入らない」不変条件を `selectFrameContents` に適用したが、
動的な経路が残っていた: リモートピアの hide (style op `visible:0` 受信) や
ローカル hide の redo は `_apply` が patch を適用するだけで `selection` から
id を落とさない。結果、ユーザーが見えない図形を選択したまま move/delete/style
を作用させ得た (非表示図形はヒットテストされないため解除もできない)。

ローカルの `hideSelection` は自前で `_sdl` するが、redo の forward 再適用と
remote 適用はその経路を通らない。

## 決定
`_apply` の ADR-0546 サイト (prop-patch 系 op が選択図形に触れたときの
パネル再同期チェック) を拡張し、style/upd/align/resize/beautify が
選択中図形を `_hd` にしたら `_sdl(id)` する。1 箇所の統合で
local/remote/undo/redo 全経路をカバーする。

## 影響
- 「非表示は選択されない」不変条件が選択起点だけでなく状態遷移にも保たれる
- test: remote style hide が selection から id を落とす behavioural assert
