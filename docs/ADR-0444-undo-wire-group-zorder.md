# ADR-0444: `_undoWire` の group/ungroup/zorder 逆写像

## 状態
実装済 (v1.7.479)

## 背景
ADR-0443 は `group`/`ungroup`/`zorder`/`replace`/`beautify` を documented gap
(ローカルのみ) とした。精査の結果、前者 3 つは wire 安全な逆写像が可能:

- `group`/`ungroup` の undo は各図形の元 `groupId` を復元する操作で、
  `op.before[]` (per-shape `{id,groupId}`) が既に載っている。
  `{op:'upd',id,after:{groupId:b.groupId||null}}` の upd パッチ列は
  validRemotePayload を素通りする (`groupId` は文字列 prop、null は
  `!=null` ガードを素通り)。ローカル undo が `delete s.groupId` する代わりに
  ピアは `groupId:null` が残るが、falsy 等価でグルーピングに影響しない。
- `zorder` (minimal-delta `changes:[{id,before,after}]`) は
  before/after スワップで逆 op 化。レガシー `after` スナップショット形式は
  `op.before` をそのまま `after` として返す。

## 決定
`_undoWire` に `case 'group':case 'ungroup':` (before 無し→null) と
`case 'zorder':` を追加。`replace`/`beautify` は引き続き非対応 (wire に
validRemotePayload がない)。

## 影響
- 伝搬不能な undo は `replace`/`beautify` のみに縮小。
- 併走 dedupe: `_lP`/`_sp`/`_el`/`_va` prop fold + `_rdb`/`_fck` 集約 (~360B)。
