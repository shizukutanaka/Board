# ADR-0326: `preventDefault` 短縮 `_pd()`

## 状態
承認 — round58

## 背景
`e.preventDefault()` / `ev.preventDefault()` が 84 箇所に散在し
(計 ~1.4KB)、ファイルは 512KB 上限手前に到達していた。

## 決定
`const _pd=e=>e.preventDefault();` をグローバル定数に追加し
全 84 箇所を `_pd(e)` / `_pd(ev)` に置換 (~0.9KB 削減)。

## 断念した代替案
- `addEventListener` を `{passive:false}` で包む別方式 — 呼び出し
  側コードの方が冗長になる。

## 影響
挙動変更なし。2034 全緑。
