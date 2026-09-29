# ADR-0477: `indexOf`/`trim` の `_ix`/`_trm` shorthand 化

## 状態

実装済 (v1.7.510)

## 背景

512KB raw 上限の余白確保のため、同型呼出しを shorthand に畳む作業の継続 (ADR-0476 と同軸)。
`a.indexOf(b)` は 15 サイト、`x.trim()` は 10 サイト (単純識別子/メンバー receiver のみ)。

## 決定

- `_ix=(a,b)=>a.indexOf(b)` — 2 引数 indexOf・receiver が呼出式のサイトは対象外
- `_trm=x=>x.trim()`
- **命名注意**: `_iO` は既に `v=>typeof v==='object'` ガードとして占有 (ADR-0456) —
  fold 前の local/global identifier の衝突点検で検出し、`_ix` を採用

## 影響

- index.html −29B (524,023 → 523,994、余白 ~294B)
- 動作変更なし
