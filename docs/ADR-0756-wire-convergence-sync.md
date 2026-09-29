# ADR-0756: architecture.md の undo-wire 収束節を 0729–0755 へ同期 (docs)

## Status: Docs sync

## Context

ADR-0728 で undo-wire の収束規則が architecture.md へ落ちた後、0729–0755 で
wire 層に以下が追加された:

- move の絶対位置双方向化 + undo-wire 絶対化 (0729/0731/0732) と delta 経路の
  軸別 `_lwwSkip` (0733)
- `beautify` patch-swap wire 化 (0730/0731)、`clear` の replace 翻訳 (0626)
- tombstone 維持規則: `_imgPending` wipe・wclock 洪水 cap・snapshot 空盤採用
  を跨いでも `{_del:clock}` を保持 (0734–0738)
- wire page-op 付帯フィールドの検証 (0755)

監査結果: 記述と実装の齟齬はなく、欠落していたのは文書側のみ。

## Decision

`docs/architecture.md` の「undo-wire の収束規則」に 4 箇条を追加し、
実装に変更は加えない (test.mjs の既存ピンが実装を固定済み)。
