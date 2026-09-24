# ADR-0253: drawio fontFamily ↔ s.font カテゴリマッピング

## 状態
承認 — round37

## 背景
drawio の `fontFamily` は任意フォント名文字列。Board は `s.font` を
'mono'|'serif' のカテゴリのみ持つため完全往復は不可能だが、等幅/セリフ
という意図は往復できる。

## 決定
- import: vertex の `fontFamily` を小写化し `mono|courier|consol|cascadia|
  menlo|jetbrains` → 'mono'、`serif|times|georgia|garamond|palatino|book`
  → 'serif'。image 頂点は除く。
- export: `s.font` → `fontFamily=Courier New` (mono) / `Georgia` (serif)。
  どちらも draw.io 標準のフォント名で再 import 時に同カテゴリへ戻る。

## 断念した代替案
- フォント名そのまま保持 — s.font 語彙外の名前は描画できない。
- edge への適用 — edge ラベルは線色継承 + font prop 未対応のため据置き。

## 影響
等幅/セリフの意図が drawio 往復で保持。1962 全緑。
