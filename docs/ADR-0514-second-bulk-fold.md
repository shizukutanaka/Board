# ADR-0514: 第二一括 shorthand 化 (make/translate/push/refreshZoom/transaction/fillText)

## 状態

実装済 (v1.7.547)

## 背景

ADR-0513 後の残り高頻度呼出し — `Shape.make` (39) `X.push` (191)
`Shape.translate` (9) `UI.refreshZoom` (6) `this.db.transaction` (7)
`c.fillText` (12)。

## 決定

`_smk`/`_sT2`/`_pu`/`_rZ`/`_trx`/`_fT` に集約。`_pu` は variadic
(`(a,...v)=>a.push(...v)`) で複数引数・スプレッド呼出しをすべてカバー。
`_ps` は ADR-0370 の `Persist.schedule` と衝突するため `_pu` に。

## 影響

- index.html ~-489B (264 サイト、521,500→521,011)
