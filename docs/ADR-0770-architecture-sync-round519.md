# ADR-0770 — architecture.md 同期 (0764–0769 期)

## Status
Accepted (docs only, v1.7.796)

## Context
ADR-0764–0769 の5件 (ジェスチャ終端 `_ptrReset` 統一・`_geoR` 幾何限定 orig 復元・
入れ子フレームメンバーシップ・プレゼン PgDn/PgUp・ピア pg 即時再描画) が
architecture.md に未反映だった。

## Decision
- ジェスチャ不変条件の bullet 群へ3件追記 — 終端状態 `_ptrReset` 統一 (0764)、
  `_geoR` 幾何限定復元 (0766)、プレゼンはスライドナビキーのみ通過 (0768)。
- 新節「フレームとメンバーシップ」を新設 — `withFrameChildren` チョークポイント・
  `_frameOf` 最外枠主張・excalidraw `frameId` parity (0767)。
- マルチページ presence bullet に `_refreshPeers` 即時呼出 (0769) を追記。

## Consequences
ジェスチャ・フレーム帰属・プレゼン入力の設計規則が文書と一致。
