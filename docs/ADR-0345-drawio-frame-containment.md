# ADR-0345: .drawio emit のフレーム内包 (member parent=swimlane)

## 状態
承認 — round74

## 背景
Board の frame は空間内包モデル (frameOf は bbox 判定)。drawio では
swimlane に `parent` で子をぶら下げるのが本来の構造で、従来 emit
は全セル `parent="1"` で絶対座標の平坦出力 — draw.io 側で
lane をドラッグしても子が追従しなかった。

## 決定
- vertex id をループ前に一括事前割当 (`idOf`) — z-order に依らず
  member が frame の cell id を参照できるようにした。
- 内包判定 `_fOf(s)`: bbox 完全内包のうち最小面積の frame を
  innermost として選択。`parent=_pf` + `x-f.x,y-f.y` の相対座標。
  group (ADR-0336) が優先 (drawio の parent は単一のため)。
- import 側は既存 `_par`/`off()` が parent チェーンを解決するため
  変更不要 — Board の空間内包モデルに自然回帰し往復完結。

## 影響
+~600B (522,758B)。draw.io 側で lane ドラッグに子が追従する
本来の振る舞いになる。実 emit assert 追加 (2044 全緑)。
