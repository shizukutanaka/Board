# ADR-0392: `_sa()` setAttribute shorthand

## 状態
実装済 (v1.7.433)

## 背景
`el.setAttribute(...)` が 20 箇所に散在 (~260B)。`_ga` (ADR-0340) の対で `_sa` を追加。
レシーバは単純な識別子/ドット参照のみ変換し、式を含む呼出は従来形のまま残した。

## 決定
`const _sa=(e,n,v)=>e.setAttribute(n,v)` を `_ga` の定義行に併記。

## 影響
約 180B 回収。`_sa` 自身の定義内 `e.setAttribute` は変換対象外 (自己参照回避)。
