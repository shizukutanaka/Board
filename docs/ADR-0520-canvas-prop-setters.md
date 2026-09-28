# ADR-0520: canvas プロパティ代入の shorthand 化

## 状態

実装済み

## 背景

ADR-0510..0512 で canvas メソッド呼出 (`beginPath`/`stroke`/`fill`/`moveTo`/
`lineTo`/`save`/`restore`/`closePath`/`quadraticCurveTo`) を shorthand 化したが、
**プロパティ代入** (`X.fillStyle=v` 等) は未着手のまま残っていた — 合計
~160 サイト。レシーバは `c`/`ctx`/`sx`/`oc`/`mx`/`d.c2` 等多様。

## 決定

セッター関数群を追加し、代入サイトを呼出に畳み込む:

```js
const _fsS=(c,v)=>c.fillStyle=v,_ssS=(c,v)=>c.strokeStyle=v,_lnW=(c,v)=>c.lineWidth=v,
      _gaS=(c,v)=>c.globalAlpha=v,_taS=(c,v)=>c.textAlign=v,_tbS=(c,v)=>c.textBaseline=v;
```

`X.fillStyle=v` → `_fsS(X,v)`。対象は**単純トークン値のみ**
(識別子/member/数値/文字列リテラルで `;,)\n` 終端のもの)。三項演算子や
関数呼出等の複合式は値の境界を正規表現で確定できないため残置 — 偽陽性で
文法を壊すリスクを避ける設計判断 (79/158 サイトを安全に fold)。

## 影響

- net ~−340B (524,377B → 524,038B)、raw 512KB 天井への余白を確保
- 可読性は引数タプル化でほぼ等価; レシーバ種別に依らず動作
- test.mjs 2078 全緑 (ピン3件を post-fold リテラルに同期 + 1件追加)
