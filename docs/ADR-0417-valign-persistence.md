# ADR-0417: `s.valign` の last-used 永続化 (style cycle parity 完結)

## 状態
実装済 (v1.7.452)

## 背景
ADR-0183..0190 系で「サイクル変更は `_st()` に最後使用値として保存し、
新規図形へ適用する」ルールが整備されたが、`cycleVAlign` だけが
`_st().valign` を書かない抜けだった — 縦揃えを変えても、次に作る
box/sticky は既定に戻る (他の style cycle は全て引き継ぐ)。

## 決定
- `cycleVAlign` 内で `_st().valign=nxt` (兄弟イディオムと同一)。
- Shape.make の last-used 適用に `valign` を追加 — 適用範囲は
  `rect|ellipse|diamond|sticky` (valign が効く box label/付箋テキスト
  側; standalone text は対象外、cycle の門と同じ)。

`wrap`/`cbend`/`labelPos`/`locked`/`flip` は per-shape の動作・幾何で
あり style ではないため persist 対象外 (設計一致)。

## 影響
- 縦揃えを1回変えると次に作る box/sticky も同じ揃え — draw.io/
  Figma の「最後に使ったスタイルが次に効く」慣例に整合。
- `_st()` の persist prop 群が `_styleOf` キーと全一致で完結。

## 断念した代替案
- 全 per-shape prop の persist: `wrap` 等は形状の挙動そのものであり
  「見た目のスタイル」ではない — 分離を維持した。
