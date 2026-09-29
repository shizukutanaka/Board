# ADR-0433: prop read 一括 fold (`_sk`/`_fi`/`_lb`)

## 状態
実装済 (v1.7.468)

## 背景
512KB raw ceiling に対して余白が ~19B まで逼迫していた。
`s.stroke` (62 サイト)、`s.fill` (57)、`s.label` (61) はモデル prop の
read で、`_lk`/`_sv`/`_hd`/`_fS` と同じく恒例の predicate/prop shorthand
化の対象。

## 決定
- `_sk=s=>s.stroke`、`_fi=s=>s.fill`、`_lb=s=>s.label` を mega-const に追加。
- fold は read site のみ: `s.X=` (代入)、`s.XPos` (`s.labelPos`) 系の
  別識別子、`extras.fill` 等の他レシーバは除外
  (`(?<![\w$.])s\.prop(?![=\w$...])` の lookaround で保護)。
  等値比較 (`s.fill===`) は従来通り literal のまま。
- 約 250B 回収 → 余白 ~120B。

## 影響
- 振る舞い不変 (純粋 byte-圧縮)。将来のラウンド用に headroom を確保。
- write site と `s.labelPos` は literal のままなので代入/判定の整合は不変。
