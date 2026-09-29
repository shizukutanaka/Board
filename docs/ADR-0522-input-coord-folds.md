# ADR-0522: input/coord/DOM 除去の shorthand 集約

## 状態

実装済み

## 背景

ADR-0519 (edge auto-pan) と ADR-0521 (lostpointercapture) の追加分で
raw が 512KB 天井を ~90B 超過。繰り返し構文の shorthand 化で相殺する。

## 決定

```js
const _cPt=e=>({x:e.clientX,y:e.clientY}),_nP=()=>_pointers.size,
      _osp=e=>({x:e.offsetX,y:e.offsetY}),_spL=s=>s.split('\n');   // 0522
const _rm=e=>e.remove(),_nc=()=>navigator.clipboard;               // 0522
```

- `{x:e.clientX,y:e.clientY}` ×3 → `_cPt(e)`
- `_pointers.size` ×5 → `_nP()`
- `sp={x:e.offsetX,y:e.offsetY}` ×2 → `sp=_osp(e)`
- `X.remove()` ×5 → `_rm(X)`
- `navigator.clipboard` ×6 → `_nc()`

net ~−160B で新機能2件の追加分を相殺 (524,229B < 524,288)。

## 影響

- 天井内に収容; 動作変更なし (純 fold)
- test.mjs 2079 全緑 (ピン2件を post-fold リテラルに同期)
