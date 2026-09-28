# ADR-0547: del undo が locked 図形を重複登録しない

- 状態: 実装済み (v1.7.575)
- 系: Store / undo (実害修正)

## 背景

`del` op の forward 経路は `sh.locked` をスキップする (リモート/ローカル問わず
ロック図形は削除しない — ADR の locked parity)。しかし backward (undo) 経路は
`op.shapes` の全件を無条件で `_sh().push(clone(sh))` していた。

locked 図形が混ざる del を undo すると、forward で削除されなかった図形も
再 push され、**同一 id の図形が盤面に二重登録**される。症状: 同一図形が
2 枚重なって描画・ヒットし、`byId` は先着側を返すため後続 op が迷子になる。

## 決定

`del` の backward で `if(!byId(sh.id))_sh().push(clone(sh))` — add 系 op と
同じ冪等ガードを適用。connClears 復元は元から `byId(p.id)` で解決するため
変更不要 (二重 push が無ければ一意)。

## 影響

- ~40B 使用 (コメント尾の刈り込みで相殺)。
- behavioural テスト: locked+unlocked の混在 del → undo で件数不変をピン。
