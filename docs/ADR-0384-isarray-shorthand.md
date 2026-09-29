# ADR-0384: `Array.isArray` → `_iA` shorthand

## 状態
採用 (v1.7.428)

## 背景
`Array.isArray(` が 54 箇所 — リモート検証・import・ユーティリティ全般で最頻出
の長いビルトイン。512KB 天井対策の dedupe シリーズ (ADR-0378/0382) の続き。

## 決定
`const _iA=Array.isArray;` で参照のみ置換。`isArray` は静的メソッドで
`this` を参照しないため裸参照で安全。

## 影響
~500B 回収。test.mjs リテラル同期済み。
