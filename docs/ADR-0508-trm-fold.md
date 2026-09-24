# ADR-0508: `.trim()` を `_trm` shorthand に拡大

## 状態

実装済 (v1.7.541)

## 背景

`X.trim()` が 14 サイトに残存 (import/export/normalize 経路) — `_trm` helper は
ADR-0477 で導入済みだが拡大未適用だった。

## 決定

メソッド呼出し `X.trim()` を `_trm(X)` に畳み込み
(`getComputedStyle().getPropertyValue()` 経路を含む)。

## 影響

- index.html ~-60B
- 動作変更なし
