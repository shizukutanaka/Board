# ADR-0022 — 画像インポートの条件付きダウンスケール

- Status: Accepted
- Date: 2026-09-23
- 関連: FT-15 (画像 dataURL の参照分離 — ストレージ構造の変更、L)、ADR-0021

## 問題

ドロップ/ペーストされた画像は **デコードした dataURL をそのまま** image
シェイプに保存していた。スマホ/カメラ画像は 12MP 級・数 MB が普通で、
これがそのまま

- IndexedDB の永続ドキュメント
- op history の clone (`_apply` 差分記録)
- 共有リンクの deflate ペイロード

に乗る — 表示サイズ (maxDim 400wu) に対して常時 10 倍以上過剰。4MB 上限の
imgBig ガードで弾くだけで、中程度の大きさの写真は無警告で盤面を肥大化
させていた。FT-15 は「参照分離」でこの問題を構造的に解く設計だが、
データ形式の変更 (移行 + P2P 転送経路) を要し L 規模 — その価値の一部を
先に小さく回収する。

## 決定

1. ドロップとペーストの2経路に散在していた FileReader→ガード→decode→
   scale の重複ロジックを `_imgImportFile(f, cb)` に統合
   (`cb(dataUrl, naturalW, naturalH)`)。
2. `IMG_IMPORT_MAX_DIM=2048` を超える画像はキャンバスに再描画して
   `toDataURL('image/webp', 0.85)` に縮退。**WebP が出力されない場合や
   結果が元より大きい場合は元の dataURL をそのまま使う** — 劣化しない
   ことが保証される条件付き最適化。アルファチャンネルは WebP が保持する
   (Safari 14+ で universal)。
3. 警告は出さない (サイレント最適化)。元の自然サイズは cb に返し、
   従来通り 400wu 上限の表示スケールに使う。

## トレードオフ

元解像度は失われる — 拡大表示や高解像度エクスポートでは再アップされる
画質になる。2048px は表示上限 400wu の ~5 倍あり、盤面上で実用上識別
可能な劣化はない。scratchpad (使い捨てスケッチ) として speed/size を
優先する製品選択と整合する。

## 検証 (実施済)

- 実ブラウザ (headless Chrome): 4000×3000 JPEG (dataURL 1.63MB) →
  2048px WebP 364KB (4.5×縮小)、自然サイズは cb に正しく返る。
  800×600 PNG は無変更 (閾値未満)。
- `node test.mjs` 全緑 (presence + `_imgImportFile` のエラートースト保持)

## 却下した案

- **全画像を再エンコード**: 小さな PNG スクリーンショットを WebP に
  変えても容量メリットが殆どなく、可逆性だけ失う。閾値超過時のみ。
- **JPEG 再エンコード**: 透過を殺す。WebP は alpha 対応かつ同等以上の
  圧縮率。
- **createImageBitmap 経由**: Safari 未対応パスが要るだけで toDataURL
  再エンコードと同等 — Image+canvas で十分。
