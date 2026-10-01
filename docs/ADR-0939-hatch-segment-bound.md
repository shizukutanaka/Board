# ADR-0939: hatch セグメント生成の上限 — 巨大 extent での描画凍結閉塞

Status: implemented (v1.7.965)
Date: 2026-10-01

## Context

`_hatchSegs` は `(w+h)/gap` 本の対角線セグメントを生成する
(gap≥6、`fstyle:'hatch'|'cross'`)。図形の w/h は wire 取込で ±1e7 に
bounded (0792/0935/0936) — つまり **鍛造形状が `w:1e7, fstyle:'hatch'` で
到達可能**。従来の実装では ~3.3M セグメント (cross で ~6.6M) の配列を
可視中 **毎フレーム** 構築 → メインスレッド凍結・OOM。SVG エクスポートも
同数の `<line>` を吐き ~100MB のドキュメントになる。

## Fix

`_hatchSegs` 先頭で `gap=_max(gap,(w+h)>>11)` — 方向あたり ~2048 本上限。
通常 extent (<12k px) では自然 gap がそのまま使われ視覚不変、巨大 extent
では等間隔のまま疎化するのみでハッチ意匠は保たれる。

## Audit context

O(extent) 生成物の残走査: `_elbowSegs`/`_curveSegs` は固定分割数、
`wrapTextCached` は text 5000 上限、`RDP`/認識系は pts 50000 上限、
グリッド描画は viewport 寸法のみ依存。hatch が唯一の非 bounded 生成器。

## Consequences

- 巨大 extent ハッチ形状による描画凍結/SVG 肥大を閉塞。
- `_hatchSegs(0,0,1e7,1e7,6,false).length<=2100` の behavioural ピン追加。
