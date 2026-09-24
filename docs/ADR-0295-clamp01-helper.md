# ADR-0295: `_c01` clamp01 helper (raw -140B)

## 状態
承認 — round47

## 背景
`Math.min(1,Math.max(0,X))` の 0..1 クランプが11箇所に散在。

## 決定
`const _c01=v=>Math.min(1,Math.max(0,v))` を追加し全箇所を `_c01(X)` に。

## 影響
index.html -143B。2002 全緑 (ADR-0221 の存在チェックを `_c01` に更新)。
