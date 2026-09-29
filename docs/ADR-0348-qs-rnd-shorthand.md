# ADR-0348: `_rnd`/`_qs` shorthand による raw 回収 (~650B)

## 状態
承認 — round76

## 背景
512KB raw 上限に対し残 ~1.1KB まで迫っていた。

## 決定
- `_rnd=Math.round` (59箇所、~470B) — SW blob コードには
  Math.round が無いためスコープ衝突なし。
- `_qs=(e,s)=>e.querySelector(s)` (23箇所、~180B) — receiver
  統一 (`document`/`doc`/`c`/`g`/`m`/`ge`/`dg`)。querySelectorAll
  は件数が多いものの `_qs` と混同しやすいため対象外。

## 影響
raw 522,751B (回復 ~2.5KB)。挙動不変 (純alias)。
2044 全緑。
