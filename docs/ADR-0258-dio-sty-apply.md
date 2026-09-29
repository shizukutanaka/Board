# ADR-0258: `_dioStyApply` — vertex/edge 共通 style キー適用の集約

## 状態
承認 — round38

## 背景
drawio import の vertex ループと edge ループに、strokeColor/
strokeWidth/dashed(+dashPattern)/fontSize/fontStyle/shadow/locked/visible
の同一適用ブロックが重複していた。2サイト構造は新マッピング追加時に
片側だけ更新されるリスクを持つ (実際 edge には opacity が抜けていた)。

## 決定
`_dioStyApply(s,sty,hid)` に共通キーを集約し両ループから呼ぶ。
vertex/edge 専用キー (fillColor/fontColor/fontFamily/align/valign/
labelBackgroundColor) は従来どおり各ループに残す。

## 断念した代替案
- 据置き — opacity 欠落という実害があった。

## 影響
- edge の `opacity` が新たに適用される (輸入忠実度の副次修正)。
- 今後の共通キー追加は1箇所で済む。~450B 回収。1967 全緑。
