# ADR-0630: ADR-0629 の実動作ピン

- 状態: 実装済
- 日付: 2026-09-28

## 背景

ADR-0629 のフォールバック走査はソースピンのみで、`_onRecv` 経路を通る
実動作検証がなかった。`Net._onRecv({k:'img'})` は test.mjs の eval 範囲
内にあるため実際の受信フローを直接駆動できる。

## 決定

`Net._onRecv` で img メッセージを実際に投入し、二系統を検証:

- (a) `_imgPending` に存在しない parked 図形 (evicted straggler 相当) が
  `s.img===key` フォールバックで `dataUrl` 解決 + `img` 削除
- (b) pending 追跡中の図形が主経路で解決 + pending エントリ削除

## 影響

4 assert 追加 (2169→2173 +本ラウンドで 2177)。`_onRecv` の img 分岐が
破壊された場合に両系統とも検出される。
