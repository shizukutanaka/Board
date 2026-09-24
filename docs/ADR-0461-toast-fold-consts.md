# ADR-0461 — toast 呼び出し shorthand + 文字列 consts

## 状態

実装済 (v1.7.494)

## 背景

`_o(t('key'))`/`_w(t('key'))`/`_e(t('key'))` の toast 呼び出し形が 102 箇所に広がっており、512KB 緩い上限への余白が ~34B まで減っていた。CS 監査ラウンドの修正 (ADR-0459/0460) を収めるための余白が必要だった。

## 決定

- `_oT=k=>_o(t(k))` / `_wT=k=>_w(t(k))` / `_eT=k=>_e(t(k))` を導入し、単一引数 `t(...)` の toast 呼び出しを全面畳み込み (連結式 `_o(t('a')+x)` は `_o(` のまま残す)
- ブロックスコープで `_o`/`_e` を shadow していた 2 箇所のローカル変数を `_oo`/`_ce` に改名 (fold の安全性確保)
- 頻出文字列 consts: `_RO`/`_RW`/`_UT`/`_REC` (readonly/readwrite/Untitled/rectangle)

## 影響

- ~250B 回収 (99 sites) + consts ~70B — ADR-0460 の wclock 永続化 (~170B) を収めても余白を維持。
- i18n 経路は変わらない — `_oT` 等は `t()` を内部で呼ぶだけ (test.mjs の `t('key')` asserts は `T('key')` 形に同期)。
