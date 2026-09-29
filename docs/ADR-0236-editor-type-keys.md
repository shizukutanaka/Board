# ADR-0236: テキスト編集中の装飾ショートカット

## 状態

実装済み (v1.7.293)。

## 背景

⌘B/⌘I/⌘U/⌘⇧X の装飾トグルはグローバル keydown
が `input,textarea` ターゲットを早期 return する
ため、インラインエディタの編集中に効かなかった —
入力中に「ここ太字にしたい」と思っても先に
コミットする必要があった。

## 決定

textarea 自身の keydown に ⌘B/I/U/⇧X を
`toggleTextFlag` へルーティング (IME 合成中は
除外、既存規約と同じ)。オーバーレイの視覚
スタイルは `toggleTextFlag` 内の既存同期が
即座に反映する。

## 影響

- 編集中に装飾を試せる。undo は既存 `style` op。
- `ev.shiftKey` の `x` ガードは ⌘⇧X (strike) のみ。
