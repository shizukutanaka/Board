# ADR-0919 — snapshot LWW merge の `pg` スキップ欠落を閉塞

## 欠陥

`_mergeSnapshotOp` (既存図形への per-property LWW マージ、ADR-0058/0372) は
merge 対象キーを `id`/`type`/`_` 接頭辞/`__proto__`/`constructor`/`prototype`
+ `validPatch` 値ゲートで絞り込んでいたが、**`pg` (ページ帰属) が抜けていた**。

`w.pg` は stamp しない (ADR-0914 で構造キー刻印を全スキップ) ため、正当な
`wc` レコードに `pg` エントリは決して存在しない — つまり wire 上の
`wc:{pg:clock}` は鍛造専用の経路だった。鍛造 snapshot op が
`shape.pg='victimPage'` と `wc.pg=newerClock` を抱えて来ると:

```js
const lc=lw['pg'];            // undefined — never stamped
clockNewer(rc, undefined)     // → true
ex.pg = 'victimPage';         // shape exiled off its page
lw.pg = rc;                   // poisoned wclock entry persists
```

→ 既存図形が表示中ページから追放される (ADR-0912 の page exile と同族、
LWW merge 経路版)。`frac`/`groupId` は zorder/group 専用 op が正当に刻印
するため merge は正規プロトコル — `pg` のみがスキップ抜けだった。

## 修正

スキップ条件に `k==='pg'` を追加 (1 トークン)。`pg` は構造キーであり
帰属変更は pageAdd/pageDel 専用 op の管理下にあるため、snapshot merge が
受け取るべき正当な経路は存在しない。old-peer から来た `w.pg` (0914 以前の
刻印残り) も `shape.pg` と同値のため merge しても無害だが、skip で鍛造窓を
完全に閉じる。

## Behavioural pin (test.mjs)

- `shape.pg='pX'` + `wc:{pg:新clock, x:新clock}` の鍛造 snapshot op →
  `x` は merge、`pg` は 'p1' 据置、`wclock.pg` も刻まれない。

## Interop

旧バージョンと混在しても安全: 旧版が merge しようとしても新版側は単に
`pg` を無視するのみ (収束は最終的に新側の状態で揃う)。
