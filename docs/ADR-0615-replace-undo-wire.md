# ADR-0615: 'replace' の undo を wire へ

## 状態
実装済 (v1.7.642)

## 背景
ADR-0613 で 'replace' が wire 収束するようになったが、`_undoWire` は
`default:return null` で 'replace' を生成していなかった。共有リンク/
.board 取込を行ったピアが ⌘Z を押すと、ローカルだけが旧盤面へ戻り、
リモート全員は import 後盤面を保持したまま — 次の全置換まで永続的に
発散する (スナップショットマージは削除を伝播しない)。

## 決定
`_undoWire` に `case 'replace'` を追加 — `{op:'replace',after:op.before,
afterWc:op.wc}` を返す:

- `after` = ローカル op が保持する pre-swap 図形配列 (validShape 通過)
- `afterWc` = pre-swap の wclock — 復元盤面の LWW メタも正しく戻す
- `_fck` が打つ新 clock により、ADR-0614 の勝者規則で全ピアが復元盤面へ
  収束 (undo は「もっとも新しい swap」として常に勝つ)

併せて `_lastRep` marker の食い違いを2箇所修正:

- `undo()`: wire op の新 clock へ進める — これが全ピア共通の marker
- `redo()`: `_apply` が記録した restamp 前の旧 clock を、`_fck` 後の
  新 clock へ更新

marker がローカル側で遅れていると、リモートで棄却される中間 clock の
swap だけがローカルに適用されて逆方向の発散を生む。

## 影響
- 'replace' の undo/redo が全ピアで収束 (0613/0614 系の補完)
- redo は `_fck` の無条件再スタンプで新 clock を得るため、ADR-0614 の
  古い swap 棄却に引っかからず全ピアへ届く
