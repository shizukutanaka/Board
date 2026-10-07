# ADR-1106 — ro 棄却後の成功フィードバックを入口ゲートで一括閉塞

- Status: accepted (implemented)
- Date: 2026-10-01
- Version: 1.8.130

## Context

`state.ro` (閲覧のみ、ADR-1057) の変異漏斗は `Store.commit` /
`Store._recordCommitted` / `_nugPush` の 3 点で全 commit を棄却し
(ADR-1076)、ADR-1104 で live 書き込みの `_roRe` 復元まで閉じた。

しかし漏斗の棄却は「盤面を汚さない」だけで、呼び出し側が棄却を知らずに
**成功フィードバックを発火し続ける**残穴が残っていた:

1. **成功トースト/アナウンス** — commit が棄却されても呼び出し側の
   `grouped`/`ungrouped`/`cleared`/`deleted`/`hiddenCount`/`framed`/
   `beautified`/`swapDone` 等が打たれ、ユーザーには「できた」ように見える
2. **pre-commit ダイアログ** — `_pgDel` の `confirm`、`_pgRename` の
   `prompt` が ro 下でも開く (問いかけても結局何も起きない)
3. **dead-id 副作用** — `_stickyChain` のエディタオープン、
   `connectSelection`/`hideSelection` の `_ss` 再上書きが commit 棄却後も走る

## Fix

ADR-1102/1105 と同型の入口ゲート `if(state.ro){_roNo();return}` を、
監査で分類した 18 サイトの先頭に一律適用:

| サイト | 棄却後に起きていた問題 |
|---|---|
| `_pgAdd` | 二重 `readOnlyMode` toast + 存在しないページへの `switchPage` |
| `_pgDel` | `confirm(pgDelQ)` が開く |
| `_pgRename` | `prompt` が開く |
| `_stickyChain` | dead-id `_ss` + エディタオープン |
| `hideSelection` | `_cxO` 実行 + `hiddenCount` toast |
| `connectSelection` | dead-id `_ss` |
| `showAllShapes` | `shownAll` toast |
| `wrapInFrame` | `framed` toast |
| `doGroup`/`doUngroup` | `grouped`/`ungrouped` toast |
| `doClearAll` | `confirm` + `cleared` toast |
| `doDelete` | `deleted` toast |
| `doFlip`/`doRotate` | announce |
| `doLock`/`unlockAll` | lock toasts |
| `doBeautify` | `beautified` toast |
| `swapFillStroke` | `swapDone` toast |

## Intentionally NOT gated

- zorder 系 (`_zCommit`/`doBringFront`/…)・`doMatchSize`・`nudgeSelection` —
  静黙リバートでフィードバックなし
- `doPaste`/`doDuplicate` 系 — 既にゲート済み `_placeCopies` を経由、
  `if(_ln(added))` でトーストも自然抑止 (ADR-1073)
- `applyStyleToSelection`/`fontSizeStep`/`cycle*` — `_st()` 書込みは
  スタイルプリファレンスであって盤面ではなく、トーストもない
- `doCopy` — 読み取り専用操作
- 描画ツール/arming/`eraseAt`/`createShapeKbd` — ツール arming が
  上流でゲート済みのため到達不能
- `_textCascade` (ADR-1102) / `_pgDup` (ADR-1105) — 既ゲート

## Pins

- 12 behavioural asserts: ro 下で全 gated アクションを連打 → live 書き込み
  なし・成功トーストゼロ (readOnlyMode のみ)・history 不変・pages 不変・
  `_stickyChain` が editor を開かない; editable 対照で group 適用。
- 1 source sweep: 18 サイト全てで関数先頭 140B 内の `_roNo` 存在を検証。
