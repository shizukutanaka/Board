# ADR-0661: 「すべて解除」/ フレームフィットを現ページに限定

## Status
Accepted — round409

## Context
ADR-0660 と同じ監査軸 (`_sh()` 全走査のページ帰属フィルタ欠落) で2件の残存:

1. **`unlockAll`** — 全 `locked` を剥がすため、別ページで意図的にロックした図形まで解除していた (clear/show-all のページスコープ規則と不整合)。
2. **`fitFrames`** — メンバー判定 (`s.id===f.id||_lk(s))continue`) に `_pgOk` がなく、**別ページの図形が幾何学的に内包されていればコンテンツとしてフィット幅に混入**。`withFrameChildren` (move/delete/duplicate の帰属判定) は `_pgOk` 済みなのに対し、こちらだけ未適用だった。

## Decision
- `unlockAll`: `filter(s=>_lk(s)&&_pgOk(s))`
- `fitFrames` メンバーループ: `||!_pgOk(s)` を continue 条件へ
- ctx メニュー表示条件も同じ述語へ (`_sh().some(_hd)`/`_lk` は他ページのみに当たるとクリックで空振り → `s=>…&&_pgOk(s)`)

## Consequences
- 「一括解除」「フレームをコンテンツに合わせる」は見えているページの範囲内でのみ作用
- 単一ページでは従来と完全に同一

## Tests
- 現ページの lock 解除・別ページ lock 維持、フィット幅が別ページメンバーを無視 (w=34)
- 両述語のソースピン
