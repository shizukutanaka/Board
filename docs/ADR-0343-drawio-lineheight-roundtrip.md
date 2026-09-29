# ADR-0343: .drawio `lineHeight` ↔ `s.lineH` 往復

## 状態
承認 — round72

## 背景
Board の `s.lineH` (行高倍率、既定1.25) は excalidraw
(`lineHeight`、既定1.25) では往復済み (ADR-0242/0323) だが、
drawio の `lineHeight` (既定1.2) は未マップ — テキスト/ラベルの
行間が輸出入で失われていた。

## 決定
- emit: `_dioStyEmit` に `s.lineH&&!==1.25` で `lineHeight=` 出力
  (vertex/edge ラベル共通)。
- import: `_dioStyApply` に `+sty.lineHeight>0&&!==1.2` で
  `s.lineH` 復元 (0.5..4 に clamp、ADR-0242 と同レンジ)。
- 既定値差 (1.25 vs 1.2) は双方の暗黙既定値に委ねる設計 —
  明示指定時のみ往復。

## 影響
+~180B (522,078B)。往復 assert 追加で 2044 全緑。drawio 側の
行間制御 (ctx「Line spacing」) が異フォーマット間でも保存される。
