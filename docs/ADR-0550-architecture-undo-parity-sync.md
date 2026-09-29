# ADR-0550: architecture.md の Store 節に locked parity / undo 対称性を同期

- 状態: 実装済み (v1.7.578)
- 系: docs

## 背景

ADR-0547/0548/0549 で locked parity の undo 監査が完結したが、
architecture.md の Store 節は「全 op が可逆」としか記していなかった。
`_apply(op,false)` の完全可逆性は op 型ごとの対称性に依存する実装詳細で、
「どの op が backward に何を伝える必要があるか」が文書に無いと
将来の op 追加時に同型バグを再持ち込みしやすい。

## 決定

architecture.md の op 型一覧に以下を追記:

- `del` — `connClears` フィールド + `byId` 冪等ガード (ADR-0547) の記述
- `move` — `op.moved` 記録 (ADR-0548) の記述
- 「locked parity」段落を新設: 全 mutating op の forward が `sh.locked` を
  スキップする規則と、絶対パッチ系 (`before` 書き戻しは冪等) vs
  存在/差分系 (`del`/`move` はスキップ集合を backward に伝える) の分類。

## 影響

- docs のみ (index.html は version bump のみ)。
