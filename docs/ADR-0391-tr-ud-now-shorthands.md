# ADR-0391: `_TR`/`_ud`/`_now` shorthand 追加

## 状態
実装済 (v1.7.432)

## 背景
512KB 天井まで残り ~300B の局面で、リテラル/組込み呼出の繰り返しをまだ拾える場所が
残っていた。

## 決定
- `'transparent'` ×20 → `const _TR='transparent'` (fill/stroke の transparent 指定が集中)
- `===undefined`/`!==undefined` ×8 → `===_ud`/`!==_ud` (`const _ud=void 0`)。
  `typeof X==='undefined'` は名前が異なるため対象外。
- `Date.now()` ×13 → `_now()`。ただし `nowTs` 内のみ `Date.now()` のまま — テストが
  `Date.now` をモンキーパッチして時計を巻き戻し、HLC-lite の clamp を検証するため。

## 影響
約 280B 回収。`nowTs` は例外的に shorthand 対象外としてコメントで明記済み。
