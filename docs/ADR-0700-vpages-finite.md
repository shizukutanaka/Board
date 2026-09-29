# ADR-0700 — `_vPages` が LWW タイ順序フィールドの検証を強化

## 状態
採用 (v1.7.726)

## 文脈
ADR-0698 でページ名を `(p.nts, p.ntp)` 総順序化したが、`_vPages` は
`nts` に `typeof number` しか要求せず `ntp` を未検証だった:
- `nts: Infinity` — 全ての (ts,peer) 比較に勝ち、そのページ名を全ピアで
  **永続凍結** (validClock のドキュメントにある denial-of-edit と同型)
- `nts: NaN` — 比較が両方向 false → 改名が二度と受理されない凍結
- `ntp` が object/number/巨大文字列 — clone 越しに state.pages へ侵入し、
  以後の全 rename タイ順序を汚染

入口は snapshot union-heal・`_pgAdopt` (replace op / snapshot / import) の
全て — `_vPages` 1箇所で共通化されているため単点修正で塞げる。

## 変更
`_vPages` の per-page 条件に:
- `p.nts==null || (_iN(p.nts) && _fin(p.nts))` — Infinity/NaN 拒否
- `p.ntp==null || (_iS(p.ntp) && _ln(p.ntp)<=64)` — 非文字列/超過拒否

既存方針どおり不適合なら**ページセット全体を拒否** (単一ページモードへ
フォールバック) — 部分的受理は形状帰属との整合を壊す。

## 検証
- 有効セット受理 + Infinity/NaN nts + object ntp + 65+ ntp の5アサート
