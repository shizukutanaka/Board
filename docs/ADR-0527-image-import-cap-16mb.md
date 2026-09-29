# ADR-0527: 画像取込の事前キャップを 4MB → 16MB

## 状態

実装済み

## 背景

`_imgImportFile` は `reader.result` (base64 dataUrl) が **4MB 超なら decode
前に reject**していた。一方 ADR-0022 は `IMG_IMPORT_MAX_DIM=2048` 超の画像を
WebP 縮退し、ADR-0379 は下流で dataUrl ≤16M を要求する。

→ 12MP 級のスマホ写真 (JPEG ~4.5MB → base64 ~6MB) は、縮退すれば ~300KB に
収まるにも関わらず事前ゲートで**棄却**されていた (実害: iPhone/Android の
標準写真が貼れない)。

ガードの真の目的は「IDB/op履歴/共有リンクに座るペイロード量」の上限であり、
decode 前サイズではない。decode 時メモリの上限はブラウザ側の画像デコード制限
(`img.onerror` → imgErr トースト) がカバーする。

## 決定

事前キャップを `16*1024*1024` に引き上げ — 下流の 16M dataUrl キャップ
(ADR-0379) と同一値に揃える。decode 後は従来通り 2048px WebP 縮退が走る。

## 影響

- スマホ写真の貼付/ドロップが動作
- 巨大画像の decode はブラウザの既存画像制限 + imgErr 経路で失敗通知
- ピン名更新 (`image size guard 16MB`)、test.mjs 全緑
