# ADR-0510: canvas `beginPath`/`stroke`/`fill` の `_bp`/`_st2`/`_fil` 化

## 状態

実装済 (v1.7.543)

## 背景

描画パスの `c.beginPath()`/`c.stroke()`/`c.fill()` が 118 サイトに散在
(ローカル 2D ctx 変数名 `c` で統一済み — drawShape/drawOverlay/export 全経路)。

## 決定

`_bp=c=>c.beginPath()`、`_st2=c=>c.stroke()`、`_fil=c=>c.fill()` に集約
(`_bp(c)` の呼出し形で変数名も `_c` 統一)。`_st` は ADR-0397 で toast 短縮に
使用済みのため `_st2` に。

## 影響

- index.html ~-600B
- drawShape 等の読みは「パス開始→幾何→stroke/fill」の構造が視認しやすく
