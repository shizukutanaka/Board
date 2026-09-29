# ADR-0338: excalidraw アローヘッド列挙の双方向マップ

## 状態
承認 — round67

## 背景
excalidraw の arrowhead enum は
`arrow|bar|dot|crowfoot|crowfoot_one|triangle|triangle_outline|diamond|diamond_outline`。
Board は `arrow|dot|bar|open|none`。emit が `s.head='open'` を
生値で出し (`open` は exc 非対応 → ヘッド消失)、import は
`crowfoot`/`triangle`/`diamond` 等を未変換で `s.head` に入れていた
(描画側は未知値を既定三角にフォールバック)。

## 決定
- emit: `_excHead` — `open→crowfoot`、`bar/dot/arrow` は同名。
- import: `_unExcHead` — `crowfoot/crowfoot_one→open`、
  `triangle→arrow`、`triangle_outline→open`、`diamond*→dot`。
- 往復は `open`→`crowfoot`→`open` で冪等。

## 影響
+~400B (522,588B)。実往復 assert 追加。
