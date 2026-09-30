# ADR-0846 — _mergeSnapshotOp の 'add'-only ゲートを behavioural ピン

## Context

`_mergeSnapshotOp` は snapshot マージ経路で `op.op!=='add'` を 'skip' するが、
これまではソース文字列ピンのみだった。細工した非 'add' op (del 等) が
snapshot 経路で実行されないことを実挙動で固定する。

## Test

在庫図形に対し `{op:'del',ids:[id]}` を流し、'skip' 返却 + 図形無改変を検証。
