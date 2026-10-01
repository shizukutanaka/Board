# ADR-0916 — `groupId` も構造キー (patch 非搭載・undo-wire は専用 op)

## Defect

ADR-0373 の構造キー strip (`_stripStruct` + インライン style strip) は
`type`/`id`/`_`-prefixed を落とし、0912/0913 で `pg`/`frac` を追加したが、
`groupId` は `validPatch` の文字列ホワイトリストに残ったまま patch 経由で
書き込み可能だった。鍛造 `upd{groupId:'x'}` は2系統の実害を持つ:

1. **halo/選択攪乱** — `sh.groupId` 着地で幻影グループメンバシップ:
   halo 描画 (`_grpOf` 経由)、グループ選択カスケード、`describeShape` の
   group announce が偽の集合を参照する。
2. **clock 刻印** — `_stampWrites` の汎用 `stamp()` が `w.groupId=C` を刻み、
   正規 `group`/`ungroup` op が `_lwwDrop`/`clockNewer`/`_lwwSkip` で
   棄却される (~5分 ts 窓で regroup が発散する、0914 と同型の非対称)。

## Why not a naive strip

`groupId` には**唯一の正当 patch 生産者**があった: `_undoWire` が
group/ungroup の undo を `upd{groupId}` patch として emit していた
(ADR-0444/0717 の undo 収束経路)。素の `delete p.groupId` だけでは
group undo がピアへ届かず再発散する。

## Fix

先に生産者を移行し、その後で strip を閉じる (strip と刻印の対称化):

1. `_undoWire` の `case 'group':case 'ungroup'` を書き直し —
   `before` の per-shape `groupId` を走査し、復帰先ごとに**専用 op**を emit:
   - `b.groupId` 真値 → `{op:'group',ids:[…],gid:g,before:[{id}]}`
   - `b.groupId` 偽値 (undo of 'group') → `{op:'ungroup',ids:[b.id],gids:[op.gid],before:[{id:b.id,groupId:op.gid}]}`
   `before` を同梱するため `_stampWrites`/`_lwwDrop` の `bmap`/`_chg` 分岐は
   無変更で仲裁できる (gids は validRemotePayload ADR-0473 必須フィールド)。
   新コードの emit は旧コードでも専用分岐で適用される (REMOTE_OPS 済み) —
   wire interop safe。
2. `_stripStruct` とインライン style strip に `delete p.groupId`。
3. `stamp()` スキップ集合に `'groupId'` を追加 (0914 の拡張)。

これで `groupId` は group/ungroup 専用 op と `doGroup` 直書き・新図形への
付与のみが正当な書き込み経路となる — `pg`/`frac` と同じ閉域構造キー化。

## Gate

`node test.mjs`: 2927 pass, 0 fail (+1 source pin、undo-wire pin も新形へ更新)。
raw ~557,030B (コメント圧縮で帳尻、上限 557,056B 内)。
