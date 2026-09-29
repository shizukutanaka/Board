# ADR-0571: hidden parity の architecture.md 同期

## 状態
実装済み (v1.7.599)

## 背景
ADR-0566/0568/0569 で成立した「非表示図形は選択されない」不変条件と
その強制機構 (chokepoint `_ss`/`_sad`、遷移方向の `_apply` `_sdl`、
hide→overlay 畳み) が architecture.md に未記載だった。

## 決定
Store 節の locked parity に続けて hidden parity 段落を追加し、将来の
変更者が direct `state.selection.add` や `_ss` バイパスを増やさないよう
規則を明文化。test.mjs には `_sl().add`/`state.selection=` が各1箇所のみ
の否定形ピンを追加して機械的に担保する。

## 影響
- ドキュメントのみ + テストピン。実行コードの変更なし
