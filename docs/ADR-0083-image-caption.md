# ADR-0083: 画像キャプション (image label)

## 状態

実装済み (v1.7.141)。

## 背景

box 型 (rect/ellipse/diamond) と connector (line/arrow)、frame は
`s.label` を編集・描画できるが、image は `_openLabelEditorFor` が
`return false` で弾かれ、キャプションを付けられない。
draw.io/Figma では画像へのキャプションは標準的な使い方。

## 決定

- `s.label` on image — box と同じ `upd` op 編集経路、editor は
  画像下端中央に開く。
- `_drawImgLabel`: 画像の内側下端に paper 色 (0.85 alpha) の帯を敷き、
  `wrapTextCached` で `s.w-8` に折返した行を中央寄せ描画。
  帯の高さは `lines*lh+4`、行数は `floor((h-4)/lh)` でクリップし、
  溢れる場合は末行に '…' を付ける (帯が画像をはみ出さない)。
- `_svgImgLabel`: 同じ帯+text を SVG に emit。
- `_openLabelEditorFor` のゲートに `image` を追加。

## 断念した代替案

- **画像の外 (下) に描画**: 盤面の他シェイプと重なり、hit/bbox も
  複雑になる。内側下端の帯は draw.io と同じ収まり。
- **`_drawBoxLabel` の再利用**: 全高中央配置は画像の上で視認性が悪い。
  帯+下端は別実装の価値がある。

## 影響

- image にも dblclick/Enter でラベル編集が開く。
- `_drawBoxLabel`/`_svgBoxLabel` は box 型専用のまま (image 専用の
  `_drawImgLabel`/`_svgImgLabel` を新設)。
