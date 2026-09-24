# ADR-0194: ボックス図形のドロップシャドウ (s.shadow)

## 状態

実装済み (v1.7.252)。

## 背景

付箋だけが常時シャドウを持ち、他の図形に立体感を出す手段が
なかった (draw.io/Figma の shadow 相当)。`s.shadow` ブールで
4ボックス型 (rect/ellipse/diamond/image) に適用する。

## 決定

- `toggleShadow` (ctx「影」): style op で `s.shadow` をトグルし
  `state.style.shadow` に last-used 記録 → `Shape.make` 継承
- canvas: シルエット fill/stroke 前に shadow プロパティを設定、
  ラベル/ハッチ前にリセット (付箋と同じ rgba(15,23,42,.22),
  blur=10, offsetY=3)。image は drawImage 自体が影を落とす
- SVG: `feDropShadow` の共有フィルタ `<defs>` を影付き図形が
  ある時のみ出力し、主要素に `filter="url(#bsh)"`
- `_styleOf`/スポイト吸収に `shadow` 追加 — コピー/拾いが一貫

## 断念した代替案

- **sticky も対象**: 常時影がアイデンティティ — 切替は対象外。
- **影パラメータ可変**: 規約統一のため単一プリセット。

## 影響

- `s.shadow` 未設定の図形は不変。フィルタ `<defs>` は影図形が
  存在するエクスポートでのみ付与。
