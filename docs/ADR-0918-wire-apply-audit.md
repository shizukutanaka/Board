# ADR-0918 — wire op 適用側監査完走 (apply-site audit)

## Scope

0912-0917 で閉塞した構造キー strip cluster の最終面として、wire op
適用側 (applyRemote → `_lwwDrop` → `_apply` → `_stampWrites`) を
全 op 型について監査した。結論: **実害なし — 全経路が gated または
消費側安全**と確認し、本 ADR で完走を記録する。

## Verified

- **全配列フィールドは bounded** — `shapes`/`after`/`before`/`ids`/`gids`/
  `changes`/`connClears`/`wc` 全て `MAX_OP_SHAPES` + 要素検証
  (`validShape`/`validPatch`/`validClock`/`_idOK`/`wcOk`) で intake gated。
- **`group`/`ungroup`/`zorder` の `before`** — `b.id`/`b.groupId`/
  `c.before`/`c.after` のみ読む (≤64/≤600)。他 prop は着地しない
  (`bb` 経由 `_chg` の比較入力に過ぎず、`after` 側も書き込まない)。
- **clock スナップショット (`op.wc`/`afterWc`/`d.wc`)** —
  `_wTb` は `_del` 墓標のみ保存、`_wR` は shape 単位の全 key を復元するが
  これは undo-wire の member clock 復元プロトコルそのもの (0721/0722) で、
  `frac`/`groupId` 刻印は専用 op の LWW 仲裁に必要な設計値。
  `wcOk` で構造+数上限検証済み。
- **`add` apply の直接 push** — `_attachOp` が intake で
  `add`/`addMany`/`replace` を `_attachShape` 済み (img ref parking、
  ADR-0835) のため、適用側の `clone(op.shape)` push は `_` 鍵剥がしではなく
  単純複製で正しい。
- **`move`** — `sh.x`/`sh.y` のみ書込み、鍛造 extras は `_apply` で
  落ち、`_stampWrites` も `after` 配列経由 (post-filt) で x/y のみ刻印。
  `op.moved` は remote 未到達 (`after` 必須で `!_iA` 分岐は local のみ)。
- **`upd`** — `_stripStruct` (type/pg/frac/groupId/`_`) + locked ゲート +
  backward `_lwwSkip`。
- **style/resize/align/beautify** — 0917 で全構造鍵除去に統一
  (`type` は beautify のみ `_TYPES` ゲート)。
- **`del`/`clear`/`replace`/`pageAdd`/`pageDel`/`pageName`** —
  tombstone/`connClears`/wholesale 経路は 0734-0736/0776/0708 で確立。
- **`_lwwDrop`** — `upd`/`group`/`zorder` 専用分岐は全て
  `byId`+`_chg`+`clockNewer` でゲート、generic tail は `filt` で
  per-key 変更+新規性検査。`byId` なし id の patch は drop。

## Convention

「**patch は prop 値のみ運び、構造キー (type/pg/frac/groupId/`_`) は
適用直前に除去**」「**clock スナップショットは `wcOk` + 復元経路のみ**」
「**配列は全て `MAX_OP_SHAPES` + 要素検証**」の3規則で wire op は
完結。将来 op を追加する際は `REMOTE_OPS`・`validRemotePayload`・
`_lwwOp`/`_lwwDrop`・`_stampWrites`・適用サイトの6面を対で揃える。

round667: 実害なし — 監査完走記録 (docs のみ)。
