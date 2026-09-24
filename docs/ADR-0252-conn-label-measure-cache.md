# ADR-0252: コネクタ/ボックスラベルの measureText キャッシュ

## 状態
承認 — round37

## 背景
`_drawConnLabel` は可視コネクタごとに**毎フレーム** 行数分の
`measureText` を走らせていた (幅 + underline/strike の再計測で最大 2×)。
canvas テキスト計測はフレーム内の高コスト API の筆頭。

## 決定
`_connLabelMeasure(s,c,lines,fs)` — WeakMap `<shape>` に
`(lines.join|fs|font|bold|italic)` をキーで `{ws,w}` をメモ化。
wrapTextCached (ADR-0078) と同じ「Store が in-place mutate するので
shape 参照は安定」の前提で安全。下線/取消線の行幅も `ws[i]` を再利用。
box label の装飾計測にも流用。

## 断念した代替案
- 全体を wrapTextCached 化 — ラベルは wrap ではなく `\n` 分割なので
  別物 (線幅の WeakMap だけが共通)。
- ctx.font 変更ごとの無効化 — キーが font フラグを含むため自明。

## 影響
可視ラベルコネクタ N 個 × 行数 L の measureText が定常 0 へ
(初回/変更時のみ)。1961 全緑。
