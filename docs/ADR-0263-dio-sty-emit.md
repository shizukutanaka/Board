# ADR-0263: `_dioStyEmit` — vertex/edge 共通 style キー出力の集約

## 状態
承認 — round39

## 背景
drawio export でも vertex/edge に同一の style 出力が重複:
strokeWidth / dashed(+dashPattern) / opacity / shadow / flipH・flipV。
ADR-0258 (import 側 `_dioStyApply`) と対称のリスク — 実際 ADR-0258
まで edge の opacity export が抜けていたのは二重管理の証左だった。

## 決定
`_dioStyEmit(s)` が共通5キーの sty フラグメントを返し、両 export
ループが `sty+=` で連結。strokeColor は vertex で text/sticky が
fontColor 派生のため共通化せず、edge の `editable=0;…;resizable=0` の
有無差、edge 専用 rounded / fontStyle・fontSize(ラベル条件) も局所維持。

## 断念した代替案
- 完全な emit 一本化 — strokeColor の type 条件で却って読みにくい。

## 影響
共通キー追加が1箇所で済む。~130B 回収。1971 全緑。
