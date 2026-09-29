# ADR-0668: ミニマップナビ・空ヒントをページスコープへ

## Status
Accepted — round418

## Context
- `_renderScene` (ミニマップ内容) は ADR-0595/0646 で `_pgOk` 済だが、`_mmGo` タップナビは**全盤面 bbox で座標変換を再計算** → 別ページ図形があるとクリックが誤ビューポートに着陸
- `drawEmptyHint` が `_nS()===0` (全盤面) → 別ページに図形がある空ページでガイダンスが出ない

## Decision
- `_mmGo`: 描画済みシーンの変換 `_sc/_ox/_oy` (page-scoped) をそのまま再利用 — 「描いたものと同じ座標系でナビゲート」の不変条件。`_sc===0` (空シーン) ならナビ対象なしで早期 return
- `drawEmptyHint`: `!_ln(_shV())` — 閲覧ページに可視図形がない時にヒント (全盤面ではなく)

## Tests
- `_mmGo` のシーン変換再利用 + 全盤面 bbox 再計算の除去ピン
- 空ヒントの `_shV` ゲートピン (2 asserts)
