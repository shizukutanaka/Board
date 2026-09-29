# ADR-0677: プレゼン中のページ切替で幻影フレームを除外

## Status
Accepted — round427

## Context
ADR-0554 の `_goto` prune は `byId(f.id)` のみ — 別ページのフレームは id 実在で生き残り、`_zoomToFrame` が不可視フレーム (その `_pgOk` メンバーは新ページでは非描画) へズームする幻影スライド。pgBar/タブ chip はプレゼン overlay 下でもクリック可能 (キーは _pA で遮断済) なため到達可能。

## Decision
`_goto` の prune に `&&_pgOk(f)` — ページ切替後は現ページのフレームのみ残り、全て別ページなら `leave()` (0554 の既存経路)。

## Tests
0554 ピンを `&&_pgOk(f)` 含む形へ更新 (assert 数据置)
