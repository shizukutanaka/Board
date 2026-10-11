# ADR-1146: フレームメンバーシップ × ページ parity — 監査完走・契約ピン固定

## Context

ADR-1144/1145 は bound connector を hidden/off-page 結合先へ unbound 解決させた。同じ問いを**フレームの幾何メンバーシップとグループ列挙**へ拡張する: フレームは位置 (bbox 包含) で子を決め、グループは `groupId` で集まる。ページは `s.pg` で帰属する — 別ページの図形がフレーム領域内に幾何的に存在する、あるいは同一 `groupId` を共有する状態は、wire op / snapshot heal / unpage / rehome の組合せで成立し得る。そのとき各列挙面は:

- `withFrameChildren` (move/nudge/copy ソース): 別ページ図形がフレームドラッグに巻き込まれないか?
- `_frameOf` + `_xFS` (group resize/rotate): 別ページ子が群変換へ混入しないか?
- `selectFrameContents` (ctx op): 別ページ・非表示メンバーが選択されるか?
- `_grpMapGet` (halo): ページ横断のハローが描かれるか?
- `_ss` (selection chokepoint): 別ページ id が選択へ入るか?
- `_snapIndex` (object snap): 別ページ図形のエッジがスナップ候補になるか?

## Audit results — 全て既に閉域 (clean)

| 面 | ゲート | 備考 |
|---|---|---|
| `withFrameChildren` (L5307) | `!_pgOk(s)` | 幾何メンバーシップは hidden を含む (re-show 整合)、locked は適用側 `_lk`/`_ul` で |
| `_frameOf` (L827) | `_lk(s) \|\| !_pgOk(s)` | 同上 — hidden も写像 (move parity) |
| `selectFrameContents` (L9799) | `_sv(s) && _pgOk(s)` | 選択は可視 + 現ページのみ |
| `_grpMapGet` (L5089) | `_gi(s) && !_hd(s) && _pgOk(s)` | ハローはページ・hidden を跨がない |
| `_ss` (L853) | `_sv(h) && _pgOk(h)` | **chokepoint** — `_grpOf` が未フィルタでも off-page id は選択へ入れない |
| `_snapIndex` (L5221) | `_hd(s) \|\| !_pgOk(s)` | スナップ候補は現ページのみ |
| `pickTop`/marquee/`_bindAt`/Tab/`_sqMatches`/`_shV` | `_pgOk` 各所 | ADR-0646/0658/0662/0832 で既固定 |
| `_eraseBatch`/move commit | `locked`/`_ul` | 消去・確定は実効集合のみ |

設計非対称 (意図的): `withFrameChildren`/`_frameOf` は hidden メンバーを含める (幾何メンバーシップ = 位置関係の保持が本体) が、`_ss`/`selectFrameContents`/`_grpMapGet`/`_snapIndex` は hidden を除く (可視性を尊重すべき面)。`_grpOf` は未フィルタのまま — 全消費側がゲートするため安全 (構造上の chokepoint 設計)。

## Consequences

- Cross-page メンバーシップは wire op 由来の過渡状態でのみ発生し得るが、全消費面がゲート済みのため不活性のまま — re-paging で正規の可視性へ復帰する。
- **Deferred (documented, YAGNI)**: dblclick の group-descend は `grp.every(_hasS)` でゲートされる — `groupId` がページ横断する群 (remote op 経由のみ成立) では descend が不発になり label 編集へ落ちる。到達可能メンバーは既に最深レベルで選択済みのため UX 損害は実質なし。

## Behavioural pins (8)

1. `withFrameChildren` は現ページの子のみ含む (off-page 除外)
2. hidden メンバーはフレームと共に移動する (メンバーシップは幾何的)
3. `_frameOf` は現ページの子を写像する
4. `_frameOf` は off-page 子を絶対に捕捉しない
5. `selectFrameContents` は可視 + 現ページのみを選択する
6. `_grpMapGet` のハローはページ・hidden を跨がない
7. `_snapIndex` の候補に off-page/hidden エッジは現れない
8. `_ss` chokepoint が off-page id を拒否する
