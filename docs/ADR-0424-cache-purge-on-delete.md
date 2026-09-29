# ADR-0424: per-shape キャッシュの削除時パージ

## 状態
実装済 (v1.7.459)

## 背景
`_penCache` (ラスタ bitmap、最大 ~16MP/枚) と `_penBboxCache` は shape id
キーの Map で、`del` op 適用時・`state.shapes=` 一括置換時に旧エントリが
残存していた。`_penCachePx` 会計がキャップ (12MP) まで stale 分を抱え、
生存ペンのキャッシュ有効容量を食い潰す。一括置換後の clone は `pts===p`
署名に一致しないため旧エントリは二度とヒットしない純粋リーク。

## 決定
- `del` op 適用ループ内で `_penBboxCache.delete(id)` + `_penCache` エントリ
  削除と `_penCachePx` 減算
- 5 箇所の `state.shapes=` 一括置換サイト (import/snapshot/share/restore)
  に `_pcC()` 完全クリアを追加 — WeakMap 系 (`_wrapCache`/`_clCache`) は
  GC 任せで対象外、`_imgCache` は dataUrl キー (形状生存と独立) なので触れない

## 影響
- 削除済みペンの bitmap (最大 4096²px) がキャップ一杯まで滞留する問題を解消。
- `byId`/`_idIndex` は `_iG()` 不変化で自壊しないため対象外と確認済み。
