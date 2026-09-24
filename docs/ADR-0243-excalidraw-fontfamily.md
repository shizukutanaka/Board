# ADR-0243: excalidraw `fontFamily` ↔ `s.font`

## 状態
承認 — round36

## 背景
Board の `s.font` ∈ 'mono'|'serif'|absent(system)。excalidraw の fontFamily は
数値 ID: 1=Virgil(手書き), 2=Helvetica/Nunito(sans), 3=Cascadia(等幅),
5=Excalifont。export は常に既定フォントになり、import は未読だった。

## 決定
- export: `fontFamily:s.font==='mono'?3:2` を `_ct` と standalone text に。
  'serif' は excalidraw に serif 系が無いため sans(2) へ近似。
- import: `3→'mono'`、`1|5→'serif'` (Virgil/Excalifont の手書き感を
  唯一の装飾系である serif で近似 — 対応関係は近似である旨ここに記録)。
  それ以外 (2/4 等) は既定。
- 適用は text 要素とコンテナテキスト折り畳み (bLabel→親 label、
  無印→sticky) に限定 — 矢印等へ付けるとラベル描画に副作用が出るため。

## 断念した代替案
- serif→2 を丸める代わりに fontFamily=4 (Liberation) — 4 は図形テキストの
  未対応ケースが多く近似精度も変わらないため不採用。
- conn/rect への fontFamily 適用 — ラベル描画へ副作用。

## 影響
mono/装飾系が往復し、serif↔Virgil 系は近似と明記。1956 全緑。
