# ADR-0548: move の undo は forward が実際に動かした id だけを逆移動

- 状態: 実装済み (v1.7.576)
- 系: Store / undo (実害修正)

## 背景

`move` op の forward は `if(forward&&sh.locked)continue` で locked 図形を
スキップする。しかし backward (undo) は `op.ids` 全件に `-dx,-dy` を掛けて
いた — forward で動かなかった locked 図形が undo で**逆方向に平行移動**する
実害 (ロックした図形が勝手にずれる)。

`del` undo の二重登録 (ADR-0547) と同型: forward のスキップ集合が
backward 復元に反映されていない。

## 決定

forward で実際に平行移動した id を `op.moved` に記録し、backward は
`op.moved||op.ids` を走査する (旧 op / 未記録パスは `op.ids` にフォールバック)。

- `op.moved` は `commit` の `_apply→broadcast` 順序により wire にも載るが、
  リモートピアは `forward&&sh.locked` を自ピアの状態で評価するため読まない。
  逆伝搬 op (undo→wire) も `op.ids` ベースのまま各ピアの locked 判定に委ねる。
- redo は forward を再適用するため `op.moved=[]` で再記録して冪等。

## 影響

- ~130B 使用 (コメント尾の刈り込みで相殺、raw 残 ~8B)。
- behavioural テスト: locked+unlocked 混在 move → undo で locked 不動をピン。
