# ADR-0501: `_hb` box-shape 判定 shorthand

## 状態

実装済 (v1.7.534)

## 背景

`s.w!=null` / `s.w==null` は「この図形がボックス系 (bbox を持つ rect/ellipse/image/frame/…)」の判定イディオムで 15 サイトに散在。`s.w` は非ボックス型 (pen/line/arrow/text) では未定義。

## 決定

`const _hb=s=>s.w!=null;` を追加し全サイトを `_hb(s)` / `!_hb(s)` に畳み込み。

## 影響

- index.html ~-30B (15 サイト × ~4B − def ~24B + 逆帰演 2B)
- 読み: `_hb` = "has box dimensions"
