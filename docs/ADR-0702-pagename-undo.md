# ADR-0702 — ページ名改名の undo がローカルで効いていなかった

## 状態
採用 (v1.7.728)

## 文脈
pageName の LWW 化 (ADR-0681/0698) で backward ゲートが `op.bts>=p.nts` だった。
`bts` は forward が記録した**自分の書込より前**の時刻なので、この条件は
永遠に成立しない → **undo はローカルで常に no-op**、しかし `_undoWire` の
inverse op は peers に届き peers の名前だけ戻る → 発散。

## 変更
- backward ゲートを `!clockNewer(current(p.nts,p.ntp), op.clock)` へ:
  現行の名が**この op 自身の書込**(またはそれより古い) の時のみ `before` と
  (bts,btp) を復元。より新しい並行書込が立っている場合はスキップ —
  peers 側でも inverse op が LWW で負けるため一致で収束する
- `p.ntp` の復元を `op.btp!=null?op.btp:''` に統一 (従来は btp==null で旧値残存)
- 全比較で `p.ntp`/`clock.peer` の型を `_iS` 検証 (破損 ntp が比較へ混入するのを防ぐ)

## 検証
- local 改名 → undo で復元 → redo で再適用
- 並行の新しい remote 書込が立つ場合 undo が名前を上書きしない
- 副産物: doc record 復元の `d.nts` も `_fin` 検証 (破損 Infinity 凍結防止)
