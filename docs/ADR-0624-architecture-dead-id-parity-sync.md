# ADR-0624: architecture.md へ dead-id parity 不変条件を同期

状態: 実装済 (v1.7.651)

## 背景

ADR-0621/0623 で確立した「選択由来の id/shape リストは dead id を含まない」不変条件が architecture.md に未記載だった。hidden parity 節の直後に追記し、`id=>{const s=byId(id);return s&&_ul(s)}` のフィルタ形と `_sb()` の供給源閉塞 (`map(byId).filter(Boolean)`、`_ul(undefined)` TypeError 経路の説明付き) を新規コントリビュータ向けに規定した。

## 決定

docs/architecture.md の hidden parity 節末尾に **dead-id parity** 段落を追加。ドキュメントのみ、コード変更なし。

## 影響

- dead-id 由来の phantom op / before スナップショット混入 / TypeError 経路を設計不変条件として明文化
- 将来の選択由来リスト追加時に参照すべきフィルタ形を指針化
