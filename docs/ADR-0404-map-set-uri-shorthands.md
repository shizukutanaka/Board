# ADR-0404: `_mP`/`_sT`/`_eU`/`_dU` shorthand + round116-117 ガードテスト

## 状態
実装済 (v1.7.440)

## 背景
`new Map()` ×n / `new Set()` / `encodeURIComponent` / `decodeURIComponent` が残っていた最後の
高頻度リテラル。empty コンストラクタのみ畳む (引数付き `new Map(iter)` は仕様上温存)。

## 決定
`_mP=()=>new Map()`、`_sT=()=>new Set()`、`_eU=encodeURIComponent`、`_dU=decodeURIComponent`。
test.mjs 側の html.includes リテラルを同期。併せて ADR-0401..0403 で入れた
`_bcast`/`k:'name'`/`snapBig` 経路の存在ガードと `_snapshotMsg().name` 実動作をテスト化。

## 影響
~230B 回収 (天井下の余白を維持)。今後の wire メタ変更はガードテストで検出される。
