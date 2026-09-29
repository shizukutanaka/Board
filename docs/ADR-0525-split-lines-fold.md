# ADR-0525: `_spL` (`.split('\n')`) の活性化

## 状態

実装済み

## 背景

ADR-0522 で `_spL=s=>s.split('\n')` を定義したが、receiver が
`_St(_txx(s)||'')` 等のネスト括弧を含むため初回 regex が 0 サイトに留まり
def が死んでいた。サイト固有の文字列置換で 9 サイトを fold。

## 決定

`X.split('\n')` → `_spL(X)` — `_St(_lb(s))` ×2、`_txx(s)||''` 系 ×3
(`_St(...)` 内包サイトは `_St(_spL(...))` へ、`(_txx(s)||'')` の素の
substring が先に内側を食わないよう _St ラップ側を先に置換)、`_s0(txt,
PASTE_MAX_CHARS)`、`body`、`norm`、`(_txx(s)||'')` ×2。

## 影響

- 9 サイト、net ~−58B → 524,010B (残 ~278B)
- ピン同期: ADR-0210 / text auto-size の 2 件を post-fold リテラルへ
- test.mjs 2080 全緑
