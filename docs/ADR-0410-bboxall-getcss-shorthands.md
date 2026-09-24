# ADR-0410: `_bA` (G.bboxAll) + `_gC` (getCSS) shorthand 化

## 状態
実装済 (v1.7.445)

## 背景
- `G.bboxAll(` が 30 箇所に分散 — `_bb=s=>G.bbox(s)` (単一形状) は既に shorthand
  化済みだが union 版は残っていた。
- `getCSS(` が 19 箇所 — CSS カスタムプロパティ読み取り関数。

## 決定
- `_bA=s=>G.bboxAll(s)` を `_bb` と同じ const チェーン (ADR-0378) に追加。
- `getCSS` の関数宣言自体を `function _gC(v)` に改名し全呼び出しを `_gC(...)` に。

## 影響
~320B 回収 (512KB 上限まで ~640B の余白)。
`getCSS` → `_gC` は `function` 宣言の改名なので test.mjs の eval scope 変更不要 —
ただし `html.match(/getCSS\('--brand'\)/g)` のリテラル同期を要した (本件の
定数自己書換えトラップ: 定義行自体が `.replace` にヒットするため `_gC=v=>_gC(v)`
の自己参照を一旦生成してしまった → function 宣言改名に切替えて解決)。

## 断念した代替案
- `_gC=v=>getCSS(v)` のラッパー const: 呼び出し側だけ短くして def は残る —
  function 宣言改名の方が 1 行節約かつ自己参照バグも無い。
- `slice(0,` 系統の畳み込み: receiver が多様で短縮量が ~2B/箇所に留まるため見送り。
