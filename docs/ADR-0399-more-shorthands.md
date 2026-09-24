# ADR-0399: `_ap`/`_stO`/`_KD`/`_CH`/`_CK`/`_vpS` shorthand

## 状態
実装済 (v1.7.437)

## 背景
512KB 天井目前で ADR-0400 (snap 送信チャンク化) を入れる余白が必要だった。

## 決定
- `_ap(p,c)=p.appendChild(c)` — `appendChild` ×20
- `_stO=setTimeout` — ×13
- `_KD`/`_CH`/`_CK` — `'keydown'`/`'change'`/`'click'` イベント名リテラル (全て `_on`
  引数としてのみ使用; `_ce('input')` のようなタグ名は `_IN` 化しない — 意味が曖昧になるため)
- `_vpS()` — `viewport:{x:+_vp().x.toFixed(2),...}` emit が共有リンク (ADR-0112) と
  .board (ADR-0393) の2箇所に重複していたので関数化

## 影響
約 280B 回収。定数定義行での自己書換え (replace が定義自身を先に巻き込む罠) は
`_X=_X` → `_X='literal'` の復元で対処。
