# ADR-0460 — wclock (per-prop LWW) の永続化

## 状態

実装済 (v1.7.494)

## 背景

プロパティ単位 LWW (ADR-0002) の仲裁テーブル `state.wclock` (shapeId → prop → clock) はメモリ上のみで、IndexedDB の doc record (`{v,shapes,viewport,docName,savedAt}`) に含まれていなかった。リロードで wclock が失われると:

- 自分がリロード前に書いた新しいプロパティ値の時計が消える
- 相手ピアが古い (ts の小さい) op を再送した場合、本来棄却すべきパッチを**受け入れてプロパティが退行**する

実害は限定的だが (ADR-0459 で incarnation id も変わり、op 再送自体は稀)、CS 的には CRDT メタデータの durability gap で、shapes だけ永続化して仲裁状態を捨てる設計は一貫していなかった。

## 決定

- save: doc record に `wc:_wc()` を追加
- load: `d.wc` をプロパティ単位で `validClock` 検証し `state.wclock` に復元 (shapes 同様、forward-incompat/破損への防御)

## 影響

- リロードを跨いでも LWW の勝者決定が一貫 — 古い op の再送で新しい値が退行しない。
- wclock のサイズは編集済みプロパティ数に比例し、shapes に比べ小さい (doc record への追加は軽微)。
- 削除済み図形の clock も復元されるが、`_stampWrites` は `byId` で実在図形のみ書き込むため無害 (purge は従来通り del op 時)。
