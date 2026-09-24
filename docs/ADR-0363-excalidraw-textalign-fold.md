# ADR-0363: excalidraw `textAlign` → `s.align` 折り返し復元

## 状態
承認 — round88

## 背景
`.excalidraw` emit は `textAlign:s.align` を出力するが、bound text の
fold-back (conn label / bLabel / sticky の3経路) で `p.align` を復元して
いなかった。スタンドアロン text には ADR-0230 で実装済みのため
非対称のまま残っていた。

## 決定
3つの fold サイトで `e.textAlign!=='center'` のとき `p.align` を復元。

## 影響
再インポート時にラベル/付箋の横揃えが消失しなくなる。2044 全緑。
