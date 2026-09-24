# ADR-0488: `_snapBest` — snap edge best-pick ループの集約

## 状態

実装済 (v1.7.521)

## 背景

edge snap が「ソート済みエッジリスト + 探査値」から |e.v−v| 最小のエントリを選ぶ
for-of ループが 4 箇所に同一形で複写 (`resizeSnap` 縦/横、`_snapBoxIdx` mX/mY ループ):

```
let best=null;for(const e of _snapNear(arr,v,tol)){
  const d=e.v-v;if(!best||_abs(d)<_abs(best.d))best={d,at:e.v,b:e.b}}
```

## 決定

`_snapBest(arr,v,tol)` に集約 (null on no-hit)。`_snapBoxIdx` の nested 版は
「複数探査点 × リスト」なので `e=_snapBest(...)` 単一呼出しで最小を保持する
形に変換 (結果は同一: 複数 m それぞれの最近傍からグローバル最小を選ぶ)。

## 影響

- index.html −64B (523,500 → 523,436)
- 動作変更なし
