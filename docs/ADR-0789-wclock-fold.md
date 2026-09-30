# ADR-0789: wclock write/merge sites folded

## Status
実装済み (v1.7.815)

## Context
ADR-0788 (wclock null-proto 化) で tomb 書込み・clock 復元・
tomb-set merge の3系統が全サイト定跡化した (raw 残 ~176B まで逼迫)。

## Decision
3パターンを個別ヘルパへ集約:

- `_wD(id,c)` — `wclock[id]={_del:c}` (null-proto) 墓標書込み (3サイト)
- `_wR(id,w)` — `wclock[id]=clone(w)` per-prop clock 復元 (4サイト)
- `_wTb(rw,c,inN)` — 外部 clock 集合の tomb merge:
  `w._del` が持つ全エントリを `clockNewer(w._del,c)||!inN.has(id)` で採択
  (replace forward×2、clear forward — 空の `inN` で条件退化して再利用)
- 併せて `Object.entries` → `_oe` shorthand 化 (9サイト)

## Consequences
- ~226B 回収 (残量 ~400B)
- merge 条件の単一定義: replace/clear の「勝者 tomb」「swap 外 tomb」の
  採択規則が1箇所へ。将来の規則変更は `_wTb` のみで完結する。
- `_wTb` の第3引数は「after 集合に居る id は tomb を棄却しない」
  ガード — clear 経路では空 Set を渡して退化させる。
