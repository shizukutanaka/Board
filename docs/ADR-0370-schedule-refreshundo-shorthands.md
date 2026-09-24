# ADR-0370: Persist.schedule / Minimap.schedule / UI.refreshUndo shorthand

## 状態
承認 — round94

## 背景
`Persist.schedule()` 20 箇所、`UI.refreshUndo()` 9 箇所、`Minimap.schedule()` 3 箇所の
長い呼び出しを `_ps()/_ms()/_ru()` に置き ~300B 回収。`requestAnimationFrame` は
test.mjs が `new Function('window','document','requestAnimationFrame',…)` の引数名で
注入するため shorthand 不可 (eval 側の実装が名前依存)。

## 決定
`const _ps=()=>Persist.schedule(),_ms=()=>Minimap.schedule(),_ru=()=>UI.refreshUndo();`
遅延解決 (arrow) — 定義時点では Persist/Minimap/UI が未宣言でも初回呼出し時に
解決するため TDZ 安全。メソッド内の `this` は arrow 経由で正しく伝播。

## 影響
2044 全緑。
