# ADR-0351: .excalidraw 画像キャプション往復 (bound text + bCap)

## 状態
承認 — round79

## 背景
`s.cap` (画像キャプション) は .excalidraw emit で完全に消失して
いた — excalidraw に caption 概念が無い。

## 決定
- emit: `s.cap` → 画像下端 22px 帯を覆う bound text
  (`_ct` 経由、ov override) + `bCap:1` フラグ。excalidraw 上では
  画像に結合されたテキストとして見える。
- import: `e.bCap` → `p.cap` 復元 (bLabel 分岐の手前で処理) —
  往復で `cap` が保たれる。bCap 無しの一般 bound text は
  従来どおり label/sticky 経路。

## 影響
+~330B (522,824B)。2044 全緑。

> **訂正 (ADR-0353)**: `s.cap` は実在しない prop だった — caption
> 帯は `s.label` が `_drawImgLabel` で描画される。本 ADR の bCap
> 経路は撤去され、s.label + bLabel 経路に置き換えられた。
