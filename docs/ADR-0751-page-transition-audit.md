# ADR-0751: ページ遷移経路の監査完走 — `_pgAdopt` ↔ `switchPage` 不変条件の結論

## Status: Accepted (documented audit conclusion)

## Context

`_pgAdopt` (スナップショット取込・import・apply-'replace' が通るページ集合の総取替え経路)
と `switchPage` (ローカルページ切替) の不変条件を並列監査した。両経路が保つべき不変条件:

1. ジェスチャ殺し (`_cancelPointerGesture` + `_cxO`) — 0664/0684 で両経路済み
2. カーソル hide 送出 (`Net.sendCursorHide`、curPg 代入の**後**) — 0689/0690 で両経路済み
3. `_gridVer` 系キャッシュの無効化 (`_iG`) — **0748 で `_pgAdopt` に追加**
4. 選択の `_pgOk` 再検証 (`_ss(_selIds())`) — **0749 で `_pgAdopt` に追加**
5. 着陸ページ名の SR アナウンス (`_ann`) — **0750 で `_pgAdopt` に追加**
6. タブ UI 再構築 (`_pgBar`) — 両経路済み

加えて `state.curPg` の書き込みサイト全走査 (apply pageAdd/pageDel/wholesale・
`_pgAdopt`・`switchPage`・undo) を確認 — すべて 1–6 の不変条件を満たす。

## Decision

監査完走を記録し、architecture.md の多ページ節に 0748–0750 の不変条件を同期した。
これ以上の同等クラスの修正は残っていない — 以降は別軸 (locked/hidden/wire/画像参照は
既完走) の監査か、新規機能または最適化が主軸となる。

## Consequences

- ページ遷移の不変条件は文書上 6 項目に集約され、将来の経路追加はこの表に照合される。
- 監査で見つかった実害は 0748–0750 の 3 件ですべて修正済み。
