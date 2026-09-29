# ADR-0271: drawio strokeOpacity/fillOpacity → s.opacity 近似受容

## 状態
承認 — round40

## 背景
drawio は統一 `opacity` のほか `strokeOpacity`/`fillOpacity` の個別指定を
持つ。前者のみ読んでいたため、分割指定ファイルの透明度が失われていた。

## 決定
`_dioStyApply` で `[opacity, strokeOpacity, fillOpacity]` の有効値の
最小を `s.opacity` に採用 (Board は要素単一 opacity のみ — 最も控えめ
な値で近似)。

## 断念した代替案
- fill/stroke の opacity 分離 — Board の描画・スタイルモデル全体に
  波及する大改修で見合わない。

## 影響
分割 opacity 指定の drawio ファイルで透明度を保持。1978 全緑。
