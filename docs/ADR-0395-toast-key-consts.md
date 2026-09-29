# ADR-0395: `_IB`/`_EM`/`_CF` トーストキー定数化

## 状態
実装済 (v1.7.434)

## 背景
`t('invalidBoard')` ×13、`t('empty')` ×10、`t('copyFailed')` ×4 と、i18n キー名の
リテラル重複が残っていた (合計 ~500B)。

## 決定
`const _IB='invalidBoard',_EM='empty',_CF='copyFailed'` を shorthand 行に併記し、
全 `t('...')` 呼出を定数参照化。i18n 定義側 (`invalidBoard:'...'`) はキー名を
変えられないためリテラルのまま。

## 影響
約 190B 回収。キー名タイポが参照側で起きなくなる副次効果あり。
