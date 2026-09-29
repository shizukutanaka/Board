# ADR-0644: イベント系列 harness の運用規約

- 状態: 実装済
- 日付: 2026-09-28

## 背景

ADR-0641 の合成イベント dispatch は、約 80 個の実系列ピン
(rounds 350–379) を経て確立された。過程で見つかった harness 特有の
挙動 — stale リスナ混入、reset の非対称、snap/grid — は後続のテスト作者が
必ず踏む罠なので、規約として固定する。

## 決定 (運用規約)

1. **`fire1`/`fireKey1` を原則とする。** `fn` は behavioural ブロック内で
   複数回起動され、`_L[t]` にインスタンス数ぶんリスナが積まれる。古い
   インスタンスのリスナも実行され、独自の module state に作用するが、
   その `Store.commit` は共有 fake BroadcastChannel 経由で**現行
   `state.shapes` へ phantom op として再流入**する (実測: 死んだ id
   `a=41321f4a` の第2矢印)。index 0 が現行インスタンスなので
   `slice(0,1)` で隔離する。
2. **`reset()` の境界を把握する。** shapes/history/histIdx/seq/seenOps/
   wclock/selection/draft/ptr.down は戻るが、`state.editing`・
   `state.viewport`・`state.hover`・`state.measure` は**戻らない**。
   viewport に依存するピンは各ブロック冒頭で
   `state.viewport={x:0,y:0,zoom:1}` を復元する (wheel pan テストが
   後続の hit 座標を 40px ずらす混入が実際に起きた)。
3. **snapPt 許容で書く。** 座標は ~20px グリッドへスナップされる —
   `(150,150)` → `160`。端点 pin は `>140` のような許容形にする。
4. **`target.matches` stub は正規表現。** ハンドラが渡すのはリテラル
   `'input,textarea'` — `s=>/input|textarea/.test(s)`。
5. **エディタ開きは appendChild スパイ。** label editor = `INPUT`、
   text editor = `TEXTAREA`、`el.value` で対象図形まで特定できる
   (誤 shape 参照の回帰も検出可能)。
6. **window リスナは `_L` 直接 dispatch。** `fireKey1` は keydown 固定。
   keyup (Alt measure 解除) 等は
   `(fakeWin._L['keyup']||[]).slice(0,1)` を自分で呼ぶ。
7. **ライブ参照は `state.shapes[i]` 経由。** `Store.commit` は clone する —
   生成物の `Shape.make` 返り値は id 比較用に留め、変化の検証は
   `state.shapes` / `byId` で取る。

## 影響

- spec §14.3.1 P3 の残を「レンダリング実体・複合系列 (pinch 実済、
  resize debounce/長押しタイマ系は sync harness 外)」へ絞り込み。
- 今後の系列ピンはこの規約に従う。
