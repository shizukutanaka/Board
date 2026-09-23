# ADR-0061: diamond シェイプ

## 状態

採用 (v1.7.118)

## 背景

Excalidraw の標準パレット (selection, rectangle, **diamond**, ellipse,
arrow, line, freedraw, text, image, eraser) と Board を比較すると、
図形種別で欠けているのは **diamond (ひし形/判定)** のみ — draw.io/
FigJam/Keynote にも共通するフローチャートの必須形状。`.excalidraw`
インポート (ADR-0043) でも diamond は pen 多角形に近似しており、
真の型として持てば往復の忠実性も上がる。

## 決定

`diamond` をボックス型シェイプ (x/y/w/h) として追加 — 既存の box
機構 (bbox・marquee・resize・回転・_mapToBox/_rotShape・複数選択)
はそのまま効く:

- `Shape.make('diamond')` → 通常の box extras。`beginRectLike` 系は
  既にジェネリックなので switch の case リストに追加するだけ。
- `drawShape`: box の4辺中点を結ぶ polygon + fill/stroke +
  `_drawBoxLabel` (rect/ellipse と同じラベル経路)。
- `G.hit`: 正規化 `|dx|/rx+|dy|/ry` で判定 — fill ありは d≤1、
  なしは |d−1|<0.15 (ellipse と同じ相対トレランス)。
- `buildSVG`: `<polygon>` + label `<text>`。
- `KEYMAP.d='diamond'` (plain 'd' は空き、⌘D は meta 経路なので衝突なし)。
  ツールバーは ellipse と arrow の間に配置、help grid `['D',k.diamond]`。
- `excalidraw` インポートの `case'diamond'` を pen 近似から
  `Shape.make('diamond')` に変更 — round-trip 忠実性向上。
- dash 線種は `s.type==='diamond'` を dash 条件に追加して有効化。

## 断念した代替案

- **pen 多角形近似のまま**: excalidraw import が採る回避策。pen は
  リサイズ挙動 (pts アフィン) と塗りが異なり、flowchart 用途の
  編集性 (ラベル・スタイル・矢印接続点) が box 型に劣る。
- **triangle も同時に**: Excalidraw 標準には無く、Board のパレット
  簡潔性を優先。必要になれば同パターンで追加可能。

## 影響

- ツールバー + 'D' キーで diamond をドラッグ描画。fill/dash/label/
  リサイズ/回転/複製/整列/接続点/undo/同期/SVG すべて既存経路で動作。
- excalidraw インポートで diamond が忠実な型になる。
