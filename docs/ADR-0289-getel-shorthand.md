# ADR-0289: `document.getElementById` → `_g()` 集約 (raw -1.7KB)

## 状態
承認 — round44

## 背景
`document.getElementById(` が 84 箇所 (~25B/箇所) に散在し、
raw 512KB 上限まで ~300B しか残っていなかった。

## 決定
グローバル `const _g=id=>document.getElementById(id)` を導入し全箇所を
短縮。rtc ブロックのローカル `_g` 定義は削除 (同名のため自然に統合)。

## 断念した代替案
- DOM 参照の事前キャッシュ — 要素は静的だが初期化順の複雑化に見合わず。

## 影響
index.html -1.7KB (522,254B)。動作不変。1995 全緑。
