# ADR-0555: 0552-0554 のソースピン + architecture.md img 参照節

## 状態
実装済 (v1.7.583)

## 背景
ADR-0552 (ctx 未処理キー呑み込み)、ADR-0553 (ctx メニュー max-height)、ADR-0554
(プレゼン `_frames` フィルタ) は実害修正だが regression pin がなかった。UI 層の変更は
behavioural harness が DOM を持たないため実動作テストが困難 — ソースピンで形状を固定する
(既存の test.mjs pin パターンと同じ)。

## 決定
- test.mjs に4ピン追加: max-height/overflow CSS、`top` クランプ下限、未処理キー
  `stopPropagation` 分岐、`_frames` の `byId` フィルタ
- architecture.md の Store 節に「img 参照の再解決」項を追加 — 形状を復元する全経路は
  `Net._attachShape` を通すルールを明文化 (ADR-0551 の規則を将来の編集者が破らないよう)

## 影響
- index.html は version のみ (実質コード差分ゼロ)
- 将来のリファクタが 0552-0554 の修正を巻き戻すとテストが赤くなる
