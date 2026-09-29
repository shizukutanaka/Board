# ADR-0397: `_St`/`_PD` + 残トーストキー定数化

## 状態
実装済 (v1.7.435)

## 背景
`String(x)` ×32、`'pointerdown'` ×6、および `t('noSelection'|'selectTwo'|'pasted'|
'exportFailed'|'selAllMatches')` の 4 回リテラルが残存。

## 決定
`_St=String`, `_PD='pointerdown'` と `_NS/_ST/_PA/_EF/_SM` を shorthand 行に追加。
`String` → `_St` は識別子境界を厳密にチェック (`getAsString`/`toString` などを
巻き込まない)。

## 影響
合計 ~220B 回収 (headroom ~30B→~255B)。
