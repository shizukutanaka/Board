# ADR-1105 — ro ページ複製の addMany broadcast リークを入口ゲートで閉塞

- Status: accepted (implemented)
- Date: 2026-10-01
- Version: 1.8.129

## Context

`state.ro` (閲覧のみ、ADR-1057) の変異漏斗は `Store.commit` /
`Store._recordCommitted` / `_nugPush` の 3 点で全 commit を棄却する
(ADR-1076/1104)。しかし op が peer へ届く経路は commit 内部の
`Net.broadcast` だけではない — 呼び出し側が `_cmt` の外で直接
`Net.broadcast(...)` を打つ補助経路がある (broadcast-only bridge)。

## Defect

`_pgDup` (ページ複製) は `_cmt({op:'pageAdd',…})` の直後に
`Net.broadcast({op:'addMany',shapes:sh})` を**無条件**で送る
(ADR-0650/0739 — pageAdd とは別路線でメンバー図形を全 peer へ配布)。
ro 下では `_cmt` が `pageAdd` を棄却して `state.pages` にページは
増えないのに、`addMany` だけがルームへ流出し、

1. ピア側に `s.pg=<存在しないページ id>` の図形が配送される
   (ADR-0778 の `'?'` スタブページ heal が発動しても、ro 側は
   pageAdd を持たないため集合が発散する)
2. 閲覧のみボードがルームへ書き込む — ro 契約自体の逸脱

という二重の発散を引き起こしていた。

## Fix

`_pgDup` 先頭に `if(state.ro){_roNo();return}` を追加 (ADR-1102 が
`importDrawioText` に取ったのと同一の入口ゲートパターン)。

## Audit

全 `Net.broadcast(` サイトを点検:

- `Store.commit` (:1495) / `_recordCommitted` (:1632) — 漏斗内、ro
  ゲート通過後にのみ到達。安全。
- `undo()` (:1648) / `redo()` (:1662) — 自身が `if(state.ro){_roNo();return false}` で先行棄却。安全。
- `_syncTextFinalize` (:5693) — `openTextEditor` (:5695) が ro 入口ゲート
  済み + ADR-1103 で ro 採用時に editor が fold するため到達不能。安全。
- `importDrawioText` (:7118) — ADR-1102 で入口ゲート済み。安全。
- `_pgDup` (:2198) — **本件**。入口ゲートで閉塞。

ページ系の他操作は commit-driven (live 書き込みなし) のため safe:

- `_pgAdd` — `pageAdd` op が `_apply` で `state.pages` に splice する;
  棄却されれば何も起きず、末尾の `switchPage(id)` は `_pgById` 不成立で
  no-op。
- `_pgDel`/`_pgRename` — 同様に commit 内部適用のみ。
- `switchPage`/`_pgAdopt` — `curPg` はビュー状態であり doc データでは
  ない; ro 下のページナビは許可。

## Pins

5 behavioural pins (ADR-1105 block in test.mjs):

- ro 下で `_pgDup()` 呼出 → `state.pages` 不変、`Net.broadcast` spy が
  1 件も捕獲しない、`readOnlyMode` トーストが鳴る。
- 非 ro コントロール → ページが +1、addMany が broadcast される。
- 1 source pin — `_pgDup` 先頭のゲート文字列。

`node test.mjs` → 4062 pass / 0 fail。raw 556,966B。

## Consequences

- ro 契約の外出経路が broadcast 面でも閉塞 (leak 面の監査は本 ADR で
  完走)。
- ro 下の pgDup ボタンは操作不能となるが、他の commit-driven ページ操作
  と同じ `readOnlyMode` フィードバックで統一。
