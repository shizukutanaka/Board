# ADR-0425: `_nS`/`_sv`/`_lk` shorthand fold

## 状態
実装済 (v1.7.460)

## 背景
`_sh().length` (33 読みサイト)、`s.visible!==0` (18)、`s.locked` (105) が
依然最頻出の非短縮パターン。

## 決定
- `_nS=()=>_sh().length` — live-read function (state 差替え対応)
- `_sv=s=>s.visible!==0` — visible flag predicate
- `_lk=s=>s.locked` — locked predicate

## 影響
- ~460B 回収 (523,716→523,257B、headroom ~1.0KB)。
- 書き込みサイト (`_sh().length=0`×3、`s.locked=`×4) は関数呼出に変換不可の
  ため literal を維持 — 「predicate fold は読みサイトのみ」の既存ルールを確認。
