# ADR-0406: キー名/色リテラル定数化 (`_ES/_EN/_TB/_IK/_YW`) + `!==_un` + 往復テスト

## 状態
実装済 (v1.7.442)

## 背景
`'escape'/'enter'/'tab'` キー名とインク/付箋色リテラルが残存。`typeof X!=='undefined'`
(否定形) も `_un` 未適用だった。

## 決定
`_ES/_EN/_TB` キー名、`_IK='#0F172A'` (インク)、`_YW='#FEF08A'` (付箋黄) を定数化。
否定形 typeof を `_un` に統一。test.mjs に ADR-0405 (diagram name ↔ docName) の
往復ガードを追加。

## 影響
~330B 回収。`.slice(`/`.join(` は receiver 多様で畳んでも ~1B/箇所 — 可読性を優先し
断念 (次の回収は構造レベルの集約が必要)。
