# ADR-0676: 研究ノートの stale 記述を同期 (quadtree + DOM mirror)

## Status
Accepted — round426 (docs + CSS fix)

## Context
research-improvements.md に2件の stale「未実装」記述:
- §C 「quadtree 未実装、hover O(N)、draw 全走査」— 実際は uniform-grid 索引として実装済 (0016/0032/0654)、quadtree 自体は不要と判断
- §3.x 「DOM ミラー未実装」— 実装済 (0041、0646 でページスコープ化)。真の残差は per-shape ランドマーク分割のみ

## Changes
- 両記述を現在の実装状態へ同期 (結論は維持、実装済みと明記)
- `.pg-t` に `flex:none` — chip が縮まず横スクロールが機能

## Tests
2 ピン: 両記述の同期文字列
