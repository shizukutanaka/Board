# ADR-0976: コネクタ結合連鎖の再帰キャップ — 循環・自己結合の縮退

## 状態
採用 (v1.8.002)

## 文脈
結合コネクタの端点解決 `connEnds(s)` は `s.a`/`s.b` が指す図形の bbox を `byId`→`_bb` で取り、輪郭投影 `_edgePt` へ渡す。問題は `_bb` が **コネクタ自身の型判定で `_cE`(=connEnds) を再呼出**すること — 結合先が conn なら `connEnds(A)` → `byId('B')` → `_bb(B)` → `connEnds(B)` → `byId('A')` → … と伸びる。コネクタは id 文字列のみの検証 (`_idOK` ≤64文字) で結合先を持てるため、remote `add`/patch/import で `a:'self'` や相互結合は正当に通過する。

## 実害と修正

### 1. conn↔conn 結合循環 — RangeError による描画 DoS
`c1.a='c2'` かつ `c2.a='c1'` (あるいは更に長い輪) で `connEnds` が無限再帰 → `RangeError: Maximum call stack size`。`_dS` の per-shape 隔離で他図形は描けるが、該当図形は毎フレーム例外を投げて非描画 + 深度数万の巻き戻しコストが毎フレーム掛かる実質 DoS。ヒットテスト (`G.hit`→`_cE`)・`_bA` 包絡・エクスポート描画でも同じ例外が出る。

### 2. 自己結合 — 同型の深度1 循環
`s.a===s.id` でも同じ無限再帰が起きる (byId が自分を返す)。remote/import で自明に鍛造可能。

### 修正
`connEnds` に二段の弁を入れた:

```js
let _ceD=0;
function connEnds(s){
  if(_ceD>15||(!s.a&&!s.b))return s;   // 縮退: raw 端点を返す (s は x1..y2 を持つ)
  _ceD++;
  try{
    const a=s.a&&s.a!==s.id&&byId(s.a),b=s.b&&s.b!==s.id&&byId(s.b);
    ...
  }finally{_ceD--}
}
```

- `_ceD>15` で再帰深度キャップ — どんな長さの循環でも ~16 ネストで打ち切り、shape `s` 自身 (x1/y1/x2/y2 を持つので caller の `{x1,y1,x2,y2}` 契約を満たす) を返す。
- `s.a!==s.id` の自己結合スキップ — 深度1 は即座に raw 端点へ (無駄な16深の再帰を踏まない)。
- try/finally で例外時もカウンタ復帰 — 連続呼出で残留しない。

### 併走監査 (clean — 修正なし)
canvas API の数値ドメイン: `roundRect` は内部で `r=_max(0,_min(r,w/2,h/2))` と負 w/h 正規化で自衛、`_penR` は `w[i]*0.5*taper` (size≥0×taper∈[0,1]) で非負、`ellipse` は `_abs(w/2)`、`setLineDash` は全サイト `dashArr` (flag→配列) 経由で remote 配列が届かない、localStorage 書込4サイトは全て try 内。実害は `connEnds` のみだった。

## 検証
`node test.mjs` — 3185 pass / 0 fail・raw 556,990B (上限 557,056B)。ピン4件:
1. c1↔c2 循環で `connEnds(c1)` が例外なく有限端点を返す (cap 停止)
2. `c1.a='c1'` 自己結合が raw 端点 {x1:0,x2:50} へ即座に縮退
3. `c1.a='r1'` の正当結合が循環呼出後も contour 上 (x1===20) を正確に解決
4. cap 到達後の呼出でも `_ceD` が 0 へ復帰し後続解決が正常
