# ADR-0234: excalidraw ラベルの往復 (bLabel コンテナテキスト)

## 状態

実装済み (v1.7.291)。

## 背景

ラベル付きボックスを .excalidraw に書き出すと
`label` が完全に喪失 — rectangle だけが出力されて
いた。excalidraw のコンテナモデルは「rect + 境界
text」でラベルを表すが、Board の sticky も同じ形に
出力されるため、単純な fold ではラベルと付箋を
区別できない。

## 決定

- **export**: label 付き rect/ellipse/diamond が
  container text を伴って出力 — text 要素に
  `bLabel:1` の Board 専用マーカーを付与
  (excalidraw は未知フィールドを無視する)
- **import**: コンテナ text が `bLabel` を持てば
  `p.label` に復元 (type は rect のまま)、
  持たなければ従来通り sticky fold (ADR-0225)

## 断念した代替案

- verticalAlign/textAlign で見分ける: スタイルの
  恣意性で誤分類し得る。明示マーカーが確実。
- ellipse/diamond のラベル位置 (中央) に近似して
  出力: コンテナtextは親と同一 bbox — 実 excalidraw
  での見た目は中央揃いで妥当。

## 影響

- ラベルが .excalidraw 往復で保存される。
  bLabel を持たない本物の excalidraw コンテナ
  (手作業で作った図) は従来通り sticky fold へ。
