# ADR-1138 — ピア表示名の失効・改名の即時反映

Status: Accepted (v1.8.162)

## Context

ピアの表示名 (ADR-1053) は `p.n` に保存され、canvas カーソルラベルと
DOM アバターの tooltip の両方で描かれる。従来の `_nIn` は

```js
const _nIn=(p,msg)=>{if(p&&_iS(msg.n))p.n=_s0(_trm(msg.n),24)||_ud};
```

と、`_iS(msg.n)` のときだけ書き込み、changed `pg` のときだけ
`UI.refreshPeers()` が走っていた。

## Audit findings

1. **clear が伝播しない。** ピアが名前を消すと `_nm()` は `null` を返し
   全 presence メッセージ (ping/cursor/cursorHide/selection) から `n` が
   落ちる。`_iS(msg.n)` が偽なので `p.n` は旧値のまま — 消した名が
   セッション中ずっと他盤面に表示され続ける。
2. **rename が DOM 側に届かない。** `n` 変更は `p.n` を書き換えるが、
   `refreshPeers` は `p.pg` 変化でのみ呼ばれていた。canvas ラベルは
   `_ivO()` で追従するが tooltip (`el.title`) は改名が pg 変化・参加・
   退出を伴うまで旧名のまま。

送信側規約 (`..._nm()` を全 ping/cursor/selection エンベロープへ展開) により、
`n` の不在は「名無しに戻った」を一意に意味する。

## Decision

```js
const _nIn=(p,msg)=>{if(p){const o=p.n;p.n=_iS(msg.n)&&_s0(_trm(msg.n),24)||_ud;if(p.n!==o)UI.refreshPeers()}};
```

- 無条件に再導出 — 非文字列/空trim は `_ud` (anonymous) へ戻す。
- `p.n!==o` で repaint を実変更に限定 — cursor は高頻度なので同値再送信は no-op。
- 三つの呼出サイト (ping / cursor / selection) は `_nIn` 内部の一箇所を
  共有し、いずれの経路でも改名・消去が tooltip へ即時反映される。

## Consequences

- 名前の「取り消し」がプライバシー上の約束として守られる。
- `refreshPeers` の呼び出し頻度は増えない (変更時のみ)。
- 未設定→未設定は `_ud!==_ud` で no-op。
