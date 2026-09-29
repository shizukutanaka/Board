# ADR-0334: `state.selection.size` → `_selN()`、`Number.isFinite` → `_fin()`

## 状態
承認 — round64

## 背景
`state.selection.size` が 55 箇所、`Number.isFinite(` が 54 箇所に
散在 (計 ~1.5KB)。ファイルは再び 512KB 上限手前にあった。

## 決定
`const _selN=()=>state.selection.size` と
`const _fin=Number.isFinite` をグローバルに集約し全置換
(計 ~1.3KB 削減)。定義は置換後に挿入。

## 影響
挙動変更なし。2042 全緑。
