# ADR-0035: 画像参照の輸出入ハイジーン — `_imgKey` 3点指紋化 + `img` 内部参照の遮断

## 状態
実装済み (v1.7.93)

## 背景
ADR-0031 (image blob separation) の後始末として 3 件の小さいが実質的な問題が残った:

1. **`_imgKey` の衝突耐性不足**: `mime + length + tail-64` の単一末端指紋は、
   同じ長さで末尾 64 バイトが一致する別画像(同構造の PNG 系列、アイコン類、
   または悪意の .board 内に仕込まれたもの)で **別画像のキャッシュを表示**し得た。
   描画される内容が静かに差し替わる、検出不能の視覚バグ。
2. **`img` 内部参照の輸出漏れ**: `roundShapesForExport` は `{...s}` を丸ごと
   書き出すため、IDB blob キーである `img:'i...'` が .board / share / sync
   ペイロードに混入。受け手側では解決不能なデッドフィールド (将来の stage-2
   wire 参照と衝突する恐れ)。
3. **dataUrl 欠落画像で描画クラッシュ**: 細工された import で
   `{type:'image',img:'iX'}` (dataUrl 無し) が `validShape` を通ると、
   `drawShape`→`getImg(undefined)`→`u.slice` で TypeError → draw() が毎フレーム
   例外で停止 → **ボード全体が真っ白**。

## 決定
- `_imgKey` を **3 セグメント指紋**に: mime + length + 先頭48 + 中間48 + 末尾48。
  O(1) のまま、衝突には 3 箇所の離れたバイト帯の一致が必要に。
- `roundShapesForExport` で `delete o.img` — 可搬フォーマットから内部参照を遮断。
- `getImg` 冒頭で `!dataUrl.startsWith('data:')` を拒否、`drawShape` と minimap
  の image 分岐は dataUrl 無しをプレースホルダ描画 (欠落 ≠ クラッシュ)。

## 断念した代替案
- `validShape` で image に dataUrl を必須化 → blob 欠落の slim 形状までロード
  拒否に回り、利用可能なデータを捨てるため不採用 (欠落はプレースホルダ表示が
  データ損失より常に良い)。
- 全 dataUrl への getImg 一元ガードのみ (描画側ガード無し) → 一貫性のため
  呼び出し側でも null を扱う形に。

## 影響
- キャッシュ衝突による誤画像表示が実質不可能に。
- エクスポートフォーマットに内部実装詳細が残らない。
- 悪意/破損 .board での全画面停止を解消 (該当形状のみプレースホルダ)。
