# ADR-0435: `_psc` が `_imgPending` もパージ

## 状態
実装済 (v1.7.470)

## 背景
画像 blob のチャンク未到着間、shape は `Net._imgPending` に `id→key` で
駐車される (ADR-0069)。shape がその間に削除されると `byId(id)` が null
になり後続の到着時は skip されるが、駐車エントリ自体は残ったまま
(256 上限で eviction はあるものの、削除済み id が slot を占有し続ける)。

## 決定
`_psc(id)` (全 shape 削除経路の per-shape パージ、ADR-0427) に
`Net._imgPending.delete(id)` を追加 — キャッシュと同じタイミングで
駐車エントリも解放する。`_psc` は全削除経路 (del/add-undo/clear/
replace/eraseAt/`state.shapes=` 一括差替) から呼ばれるため網羅的。

## 影響
- 削除済み shape 由来の `_imgPending` 滞留を解消。
- `_imgIn`/`_imgSent` は切断後も再利用される可能性があり従来通り維持。
