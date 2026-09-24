# ADR-0288: drawio `fillColor=none` → 真の透過塗り

## 状態
承認 — round43

## 背景
drawio の `fillColor=none` (未塗りシェイプ) は従来 import で
「指定なし」扱いとなり、デフォルト塗りが誤って描かれていた。
また `s.fill='none'` は canvas の `fillStyle` setter で無効値として
握り潰され、前の fillStyle が残って見える潜在的バグがあった。

## 決定
- import: `fillColor=none` → `s.fill='none'` で明示透過を保持。
- 描画: `fillStyle` に `s.fill` を流す5箇所 (rect/ellipse/diamond
  塗り・テキスト背景・コネクタラベル pill・frame tint・画像キャプション
  帯・SVG `sx.fillStyle`) に `s.fill!=='none'` ガード。
- SVG export 側は `fill="none"` が既に意味を持つため変更不要。

## 断念した代替案
- `strokeColor=none` の同等対応 — Board の stroke モデルに
  「線なし」語彙がなく描画側ガードが広範なため保留。

## 影響
drawio の未塗りシェイプが正しく表示・再 export で `fillColor` 非出力
(既存の `s.fill!=='none'` emit ガード) で透過のまま往復。1994 全緑。
