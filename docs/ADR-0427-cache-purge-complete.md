# ADR-0427: per-shape キャッシュパージの網羅化

## 状態
実装済 (v1.7.462)

## 背景
ADR-0424 は `del` op と `state.shapes=` 一括置換にパージを入れたが、
形状を取り除く経路は他にもあった:

- `add` op の undo (else 分岐の splice)
- `addMany` op の undo
- `clear` op の forward (`_sh().length=0`)
- `replace` op (`_sh().length=0` + push)
- イレーサーの即時フィードバック削除 (`eraseAt` の直接 splice)

## 決定
- `_psc(id)` helper に単一形状のパージを集約
  (`_penBboxCache.delete` + `_penCache` エントリ削除 + `_penCachePx` 減算)
- `del` ループの ADR-0424 の2行を `_psc` に置換 (同语义)
- `add`/`addMany` undo、`eraseAt` に `_psc`
- `clear`/`replace` の全消去に `_pcC()`

## 影響
- 形状を取り除く全経路で per-shape キャッシュがパージされる。
- 挙動不変 (キャッシュは観測不能な最適化)。
