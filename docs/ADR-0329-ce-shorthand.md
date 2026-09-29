# ADR-0329: `createElement` 短縮 `_ce()`

## 状態
承認 — round60

## 背景
`document.createElement(…)` が 36 箇所に散在 (計 ~700B)。

## 決定
`const _ce=t=>document.createElement(t)` をグローバルに集約。
定義を置換の**後**に挿入 — 自己書き換え防止。

## 影響
~650B 回収。挙動変更なし。2037 全緑。
