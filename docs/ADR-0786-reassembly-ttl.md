# ADR-0786 — 再組立てスロットの TTL

- 日付: 2026-09-29
- 状態: 実装済み

## Context

ADR-0781/0782/0785 で再組立ての**量**は縛ったが、**寿命**は無かった:
`_imgChunks`/`_snapIn`/`_opcIn` のスロットは presence インターバルごとに
1 チャンクずつチラ送りすれば (あるいは送信者が単に退出すれば) 永続滞留した。
バイト上限は容量を止めるが、時間は止めない。

## Decision

presence タイマで `_reapPeers` と並走する `_reapFrags` を追加し、
60s アイドルのスロットを退避:

```js
const now=_now(),T=60e3;
for(const[k,v]of this._imgChunks)if(now-(v.t||0)>T)this._imgChunks.delete(k);
if(this._snapIn&&now-(this._snapIn.t||0)>T)this._snapIn=null;
if(this._opcIn&&now-(this._opcIn.t||0)>T)this._opcIn=null;
```

チャンク格納時に `st.t`/`sn.t` をスタンプ (スロット生成時ではなく最終活動で
判定 — 生きたストリームを殺さない)。遅い送信者が失ったスロットは
`seq:0` or out-of-order で自然に再開される。

## Consequences

- 再組立ての滞留が「容量 bounded」から「時間も bounded」へ。
- 正当な高速転送には影響なし (60s/チャンク間隔は余裕)。
- テストピン3件: 古い img スロット退避・新スロット生存・snap/opc の TTL。
