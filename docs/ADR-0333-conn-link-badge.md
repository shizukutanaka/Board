# ADR-0333: コネクタ・ペンにもリンクバッジ

## 状態
承認 — round63

## 背景
🔗 バッジは `s.w!=null` (ボックス系) のみ描画され、コネクタは
リンクを保持できるのに視覚的手がかりがなかった (canvas/SVG
両経路で欠落、SR announce は既存)。

## 決定
canvas: conn は `_connLabelXY` アンカー右、pen は `pts[0]` 起点に
オフセット描画。SVG: conn は `_cL` 内部、pen は stroke `<g>` の後に
`<text>` 追加 (ラベル有無に依らず表示)。

## 影響
2041 全緑。
