# ADR-0171: ボックス/画像ラベルの水平揃え

## 状態

実装済み (v1.7.229)。

## 背景

`s.align` (左/中央/右) は text/sticky 本体の文字揃えとして実装済み
(ADR-0073) だったが、ボックスラベル・画像キャプションは常に中央
揃え固定 — 図形ラベルを左寄せしたい場合の手段が無かった。
draw.io はセルラベルが align に従う。

## 決定

- `cycleTextAlign` の型ゲートを `s.label` 保持図形へ拡張 —
  ctx「文字揃え」がラベル所持の rect/ellipse/diamond/frame/image
  にも到達。
- `_drawBoxLabel`/`_drawImgLabel`/`_svgBoxLabel`/`_svgImgLabel` で
  `s.align` を x/anchor/textAlign に反映 (既定 `center` で非設定
  図形の見た目不変)。下線/取消線のストローク幅も align に追従。
- コネクタラベルは対象外 — 中点ピルは定義上中央 (labelPos で
  弧長位置を動かす経路が別途存在)。

## 断念した代替案

- **別プロパティ `labelAlign`**: 同一概念の分裂。`align` 一本で
  styleClipboard/validPatch の流通を再利用。

## 影響

- style op 経由で undo/sync 適合。テキスト非所持図形は挙動不変。
