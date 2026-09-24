# ADR-0297: conn 型判定を `_conn(t)` に集約

## 状態
承認 — round48

## 背景
`X.type==='line'||X.type==='arrow'` (コネクタ型判定) が 24 箇所に
散在。`s.head`/`aF`/`elbow`/`label` 等の conn プロパティゲートで
重複が目立ち、412KB 圧力も継続中。

## 決定
`const _conn=t=>t==='line'||t==='arrow'` を globals に追加し
`X.type==='line'||X.type==='arrow'` → `_conn(X.type)` に一括置換。

## 断念した代替案
- Shape.isConn メソッド追加 — 同一の論理だが書き下ろしが長い
  (`s.isConn()` は prototype が必要でより長い)。

## 影響
raw -442B。2004 全緑。
