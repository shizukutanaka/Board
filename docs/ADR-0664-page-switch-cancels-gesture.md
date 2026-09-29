# ADR-0664: ページ遷移でライブジェスチャをキャンセル

## Status
Accepted — round413

## Context
`switchPage` は `_zR()` (draft/marquee/lasso 等) を掃除するが `ptr.down`/`ptr.dragKind`/`ptr.dragStartShapes` を放置していた。PgUp/PgDn・`_pgFollow` (undo/redo 着地) ・リモート起因のページ遷移が mid-drag で発火すると:

1. ドラッグが新ページ上で継続 (ポインタ追従)
2. pointerup で `move` op が **別ページの図形にコミット** — 見えない図形を動かす

Esc/blur/hidden での `_cancelPointerGesture` と同じクラス (ADR-0634 系の「外部変化がジェスチャを中断する」不変条件の欠落経路)。

## Decision
`switchPage` で `_cxO()` 直後に `_cancelPointerGesture()` を呼ぶ — ドラッグ開始位置を復元した上でジェスチャを完全解除し、その後 `curPg` を切替える。

## Consequences
- ページ遷移はジェスチャの「変更なし中断」になる (Esc セマンティクスと一致)
- `_zR()` は残置 (marquee/lasso 等の `_cancelPointerGesture` 非対象状態を掃除)

## Tests
- mid-drag `switchPage` → `ptr.down`/`dragKind` クリア・開始位置復元・遷移は完了 (3 asserts)
- README サイズバッジの累積ドリフトを現状値へ更新 (~178KB)
