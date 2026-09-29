# ADR-0365: 全 `state.X` フィールドの live-read shorthand 一括化 (~1.7KB)

## 状態
承認 — round89

## 背景
ADR-0362/0364 の `_vp()`/`_sh()` と同型 — 全フィールドが
「差し替えあり (Set/配列/オブジェクト再代入)」と「in-place 変更」の
混在のため、関数形 live-read のみが安全。

## 決定
`_sl()=selection` `_st()=style` `_df()=draft` `_wc()=wclock`
`_tl()=tool` `_dn()=docName` `_pr()=peers` `_hi()=history`
`_hx()=histIdx` `_dt()=dirty` `_ed()=editing` — 計304箇所変換。
**全ての再代入・複合代入 (`=` `+=` `++` `--`) サイトは literal のまま**。
regex guard: `state\.X(?!\s*(?:\+\+|--|[+\-*/%]?=[^=>]))`。
`state.styleClipboard` のような prefix 衝突は `\b` で除外。

## 影響
-~1.7KB。2044 全緑。
