# ADR-0755: wire ページopの付帯フィールドを validRemotePayload で検証

## Status: Fix (input-validation hygiene)

## Context

`validRemotePayload` は op 本体 (id/name/shapes) を検証していたが、ページ op が
ワイヤに乗せる付帯フィールドは未チェックだった:

- `pageAdd.i` — pageDel undo-wire の復元 index。非有限 (NaN/Infinity/文字列) は
  apply で `_iN(op.i)&&_fin(op.i)` に落ち末尾挿入へ退避するため実害は軽微だが、
  非有限値が永続 op として履歴に残る。
- `pageDel.firstId` — 送信側の rehome 先。`_pgById(op.firstId)` が非文字列では
  falsy を返しローカル firstId へ退避するためこちらも軽微だが同じく汚染残存。
- `pageName.nts` — undo-wire 経路の復元名クロック。非有限 `nts` は apply で
  `_iN&&_fin` チェック済みだが、wire 層でも ADR-0700 (`_vPages`) / ADR-0701
  (docName) と同じ denial-of-edit クラスの入口として一貫して塞ぐ。

## Decision

3 ケースに最小の型ゲートを追加:
`pageAdd.i` は `null` か有限数、`pageDel.firstId` は `null` か `_idOK`、
`pageName.nts` は `null` か有限数。`unpage`/`ntp` は受信側の使い方 (truthy 判定
/`_pgById` 落ち) が既に安全なため対象外。既存のテスト行と合わせて
`html.includes` ソースピンを追加 (counter へ加算)。
