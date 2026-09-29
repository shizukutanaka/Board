# ADR-0656: ピアアバターのツールチップに在席ページ名

## Context

ADR-0647 でピアカーソルはページスコープ化され、別ページのピアはキャンバス上に
描かれなくなった。結果として「ピアがどのページに居るか」の可視シグナルが
完全に消えていた — presence (pg 同梱) は届いているのに表示先がない。

## Decision

ピアアバター (`peerStack`) の tooltip で補う:

```js
el.title = id + ((p.pg && p.pg !== state.curPg && _pgById(p.pg))
  ? ' · ' + _pgById(p.pg).name : '');
```

- 同じページ = デフォルトとして注記しない (ノイズ回避)。別ページの場合のみ
  `peerId · ページ名` とする。
- `p.pg` はカーソルメッセージ同梱 (ADR-0647) — カーソルが動いた時点で既知。
  未受信 (ページ外で静止) は undefined → 注記なし (unknown≠別ページとして嘘をつかない)。

## Consequences

- 「あの人はどこ?」が tooltip 1 hover で答えられる。
- 表示は avatar の描画ループに組み込まれ、`pg` 変化で自動更新 (peerStack は
  presence 変化の度に再構築される)。
