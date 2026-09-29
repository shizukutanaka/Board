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
_apply` の ADR-0546 サイト (prop-patch 系 op が選択図形に触れたときの
パネル再同期チェック) を拡張し、style/upd/align/resize/beautify が
選択中図形を `_hd` にしたら `_sdl(id)` する。さらに復帰方向として
`_selR` (undo の origSel 復元チョークポイント) の `byId` フィルタに
`_sv` を追加 — 削除時は可視だったが undo までに非表示化された図形
(peer が間に hide した場合等) が選択に復帰するのを防ぐ。
2 箇所で local/remote/undo/redo 全経路をカバーする。

さらに**生成方向**: `_placeCopies` (paste/duplicate/import 共通) や
drawio/SVG/excalidraw import の3経路が `visible:0` を含む集合を
無条件選択していた — frame 複製や hidden を含む .board のペーストで
不可視の選択が発生し得た。

これら散在する経路違反を個別に塞ぐ代わりに、**不変条件を `_ss`/`_sad`
(selection への唯一の入口) に集約**した:

- `_ss=ids=>{…byId+_sv フィルタ…}` — 存在しない/非表示 id は選択に入らない
- `_sad=id=>{…同上…}` — add 単位でも同じ

コピーは hiddenness を保って生成される (Figma と同じく hidden は hidden
のまま複製) が、選択のみ可視に限定される。`_apply` の `_sdl` (遷移方向)
は別機構として残る — 選択が書き換えられない遷移での除外はそちらの責務。

## 影響
- 「非表示は選択されない」不変条件が選択起点だけでなく状態遷移にも保たれる
- test: remote style hide が selection から id を落とす behavioural assert
