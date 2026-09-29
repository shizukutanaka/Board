# ADR-0638: architecture.md へジェスチャ×外部変化の不変条件を同期

- 状態: 実装済
- 日付: 2026-09-28

## 背景

ADR-0634..0637 で成立したジェスチャ×外部変化の3規則 (overlay 突入の
キャンセル先行 / orig.id 対象解決 / cancel 時ピンチ掃除) がコードに
散在し、architecture.md のジェスチャライフサイクル節には未反映。
将来の overlay/ジェスチャ追加時に規則が見えず同型穴を再導入し得た。

## 決定

同節に「ジェスチャ×外部変化の不変条件」小節を追加:

1. overlay/モーダル突入は `if(ptr.down)_cancelPointerGesture()` 先行
   (Presentation.enter / editSelectedShapeKbd)
2. ジェスチャ対象は `_sel0` ではなく `byId(ptr.*Orig.id)` 解決
3. mid-gesture 変化キー: ⌘Z/⌘Y は cancel 先行、他は id-map + byId
   ガードで自己整合

## 影響

- 設計規則が文書レベルで固定 — 新規ジェスチャ/overlay 実装の
  レビュー基準となる。コード変更なし。
