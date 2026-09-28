# ADR-0585: reverseConn で cbend を符号反転する

## 状態

実装済 (round294)。ADR-0583/0584 (反転の経路プロパティミラー) と同じクラス。

## 背景

`reverseConn` はコネクタの方向を反転する (draw.io の "Reverse")。見た目の経路を保持しつつ意味上の向きだけを入れ替えるため、端点 `x1↔x2`・結合 `a↔b`・`aF↔bF`・ウェイポイント順・`labelPos→1-t` を既に変換している (ADR-0198/0209)。

`s.cbend` は曲線コネクタの制御点オフセットで、方向ベクトル `d = x2−x1` に対する**垂直方向の符号付き**スカラー (ADR-0132/0152)。方向を反転すると `d` が反転し、同じ符号の cbend は**反対側**へ弓なりを描く — 「向きだけ変えたい」操作で描画される曲線が鏡写しに変わってしまっていた。`cbend` は before/after にも含まれていなかったため、仮に手修正しても undo 破壊になる欠落だった。

## 決定

`reverseConn` で `s.cbend = -s.cbend` とし、before/after の両レコードへ `cbend` を追加する。

数学的には制御点 `cc = mid + n̂·cbend` (n̂ は d の単位法線) があり、反転後の `d' = −d` なら `n̂' = −n̂` なので、`cbend' = −cbend` で `cc` の世界座標が不変になる — 曲線がそのまま同一形状を保つ。

## 影響

- draw.io の Reverse と同じ「幾何不変・方向のみ反転」のセマンティクスに整合。
- before/after に `cbend` を同梱したため undo/ピア同期 (style op) も正しい。
- テスト: `reverseConn` をテスト export に追加し、`cbend:40` が `-40` へ反転するのと `x1/x2` スワップを assert。
