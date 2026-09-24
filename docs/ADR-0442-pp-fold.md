# ADR-0442: `_pp` before/after patch push 集約

## 状態
実装済 (v1.7.477)

## 背景
512KB 上限目前のため、style op 系で繰り返される
`before.push({id,k:v});after.push({id,k:n})` のペア push パターン
(15 サイト、単一プロパティ) を `_pp(b,a,id,k,c,n)` ヘルパに集約。

## 決定
`const _pp=(b,a,id,k,c,n)=>{b.push({id,[k]:c});a.push({id,[k]:n})}`。
複数プロパティ push (`{id,w,h}`) や非対称サイト ( `{id,elbow,curve}`、
`{id:s.id,...}` ) は対象外。

## 影響
- 約 340B 回収 — 後続ラウンドの実装余白を確保。
