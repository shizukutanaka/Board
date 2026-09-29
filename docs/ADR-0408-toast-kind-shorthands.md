# ADR-0408: トースト種別 shorthand (`_w/_o/_e`) + `_trimSeen` 集約

## 状態
実装済 (v1.7.443)

## 背景
`UI.toast(msg,'warn'|'ok'|'err')` の呼び出し形が 111 箇所に分散し、
`_tst(m,k)` 経由でも kind リテラルを毎回繰り返していた。
また `seenOps` 上限 trim (`MAX_SEEN_OPS` 超過時に古い 20% を削除) のブロックが
Store 側 2 箇所に複写されていた。

## 決定
- `_tst` 直後に `_w=m=>_tst(m,'warn'),_o=m=>_tst(m,'ok'),_e=m=>_tst(m,'err')` を
  追加し、50/39/22 サイトを畳み込み (~1.1KB 回収)。
- trim ブロックを `_trimSeen()` に集約 (~200B)。

## 影響
- 名前衝突について: 既存のローカル `const _o=off(...)` / `const _e=_cE(s)` 等と
  衝突するが、全箇所ローカル const 宣言済みで正当な shadowing。 terse 命名は
  既存 shorthand 規約 (`_w` は `_wrap*` と衝突しないことを確認済み) に従う。
- `_w`/`_o`/`_e` はトーストだけに使い、他用途の同名ローカルは既存どおり
  shadow で問題なし。

## 断念した代替案
- `_warn/_ok/_err` の長い名前: 111 箇所 × 4-5B の差で shorthand の目的を損なう。
- `seenOps` を LRU Map 化: Set は挿入順を保持するので先頭 20% 削除で十分。
