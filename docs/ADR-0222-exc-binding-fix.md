# ADR-0222: excalidraw エクスポートの結合修復

## 状態

実装済み (v1.7.280)。

## 背景

`excScene` は `startBinding:s.bind1` / `endBinding:s.bind2`
を読んでいたが、Board の結合フィールドは `s.a`/`s.b` —
`bind1/bind2` は存在しないため **出力が常に unbound** で、
往復で接続が失われていた (test.mjs の fixture もバグを
写していた)。

## 決定

- `s.a`/`s.b` を `startBinding`/`endBinding` にマップ。
  aF/bF 固定アンカーは `focus` (±1 正規化) へ近似変換
- 結合先の vertex に `boundElements` (excalidraw が
  binding 整合に参照する双方向表) を出力 — 従来 null

## 断念した代替案

- focus を aF/bF の y 成分も含めて完全マップ: excalidraw
  の focus は一次元 (-1..1) で次元が違う。fx のみの近似に
  留め、注記した。

## 影響

- `.excalidraw` 往復で結合が保存される。
  既存のテスト fixture も正しいフィールド名に修正。
