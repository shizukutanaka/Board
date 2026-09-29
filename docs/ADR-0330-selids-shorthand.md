# ADR-0330: `[...state.selection]` 短縮 `_selIds()`

## 状態
承認 — round60

## 背景
`[...state.selection]` のスプレッドが 53 箇所に散在 (計 ~1.1KB)。
ファイルは 512KB 上限手前にあった。

## 決定
`const _selIds=()=>[...state.selection]` をグローバルに集約。
定義は置換の後に挿入 (自己書き換え防止)。test.mjs 内の
node 側 `[...state.selection]` は page-world でないため残置。

## 影響
~500B 回収。挙動変更なし。2038 全緑。
