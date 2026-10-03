# ADR-0915 — wire 補助データ (clock マップ・ページ集合・presence) 取込監査完走

構造キー cluster (ADR-0912/0913/0914) の残面として、op に同梱される
補助データの取込検証を全走査した。**全経路 gated で実害なし。**

## clock マップ (`op.wc` / `op.afterWc` / `d.wc`)

- リモート適用される clock マップは 2 系統のみ — 両方 `wcOk`/`validClock`
  gated:
  - `addMany.wc` (`wcOk`: 各エントリ prop→validClock、件数 ≤MAX_OP_SHAPES)
  - `replace.afterWc` (`wcOk`)
  - `validClock`: `peer` 文字列 ≤MAX_PEER_ID_LEN、`seq` 数値 finite or
    文字列 ≤80、`ts` `_tsOK` (wall+5min、ADR-0791)
- `del`/`clear`/`pageDel` の `op.wc` は `!forward` (undo 復元) のみで消費
  — リモートは常に forward 適用のため未検証でも非攻撃面
- IDB ドキュメント読込 `d.wc` (Persist) — エントリ毎 `validClock` gated
- `add` forward は `op.wc` を適用しない — snapshot add の `wc` は
  `_mergeSnapshotOp` (既知形状の per-prop LWW) でのみ消費、新規形状は
  「clock なし=最古」で後続の正規 op が常に勝つ収束設計

## `zorder` changes

`id` ≤64、before/after frac 文字列 ≤600 — ADR-0473/0485 gated。

## ページ集合 (`op.pages` / `op.curPg` / `msg.pages`)

- `_vPages`: 配列非空・≤64、各 `{id≤64, name≤80, nts:_tsOK, ntp≤64}` (ADR-0700)
- `curPg` は `_pgById` で再検証 → 失敗時 `v[0].id` フォールバック — 着地点が
  常に実在ページ
- `replace`/`pageAdd`/`pageDel`/`pageName` の補助フィールド (`i`/`firstId`/
  `unpage`/`nts`) — ADR-0755/0776/0791 gated

## snapshot マージ (`_mergeSnapshotOp` / `_applySnapshot`)

- add-only ゲート (0846) + `msg.ops` は `_s0(_,SHARE_MAX_SHAPES)`
- per-prop マージ: `id`/`type`/`_`/`__proto__`/`constructor`/`prototype`
  skip + `validPatch({[k]:v})` で各値検証 (0372)。`frac`/`pg` は収束のため
  意図的に merge 対象 (z-order・ページ帰属は snapshot の信頼範囲内の正当状態)
- `_applySnapshot`: `validShape`+tomb フィルタ+`_pgAdopt`+docName LWW 境界

## presence / メタ

- `cursor` 座標 `_fin`、`sel` ids `_s0+_idOK` ≤64、`msg.pg` `_s0(_,64)`
- `name`: `_tsOK(ts)`+`_nameWin`+`_s80`+`_idOK(namePeer)` (0699/0701/0780)
- `msg.rep`: `validClock` (0617)
- peer 生成: `MAX_PEERS` cap、snapshot 応答者選出 `_loResp` は asker 除外

## 結論

wire 補助データの取込面は監査完走 — 構造キー cluster 含め、op/clock/ページ/
presence の全 auxiliary フィールドが取込ゲートまたは適用時再検証で
bounded。実害なしのため ADR のみ。
