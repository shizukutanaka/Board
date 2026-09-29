# ADR-0778 — op が運ぶ未知 s.pg を '?' スタブへ即時 heal

Status: accepted (round527)

## Context

`_pgHealS` (ADR-0694) は「`s.pg` が現ページ集合に無い」形状を
修復する: ページモードでは `'?'` スタブを生成 (0775 で nts:-1・
pageAdd 昇格)、ページなし盤面では `pg` を scrub する。だが起動点は
wholesale イベント (`_pgAdopt`/snapshot/pageDel 後処理) のみで、
**個別 op (`add`/`addMany`/`upd`) が運ぶ `s.pg` は heal されなかった**。

その結果、ページモードの受信側が知らないページ id の `s.pg` を持つ
図形は `_pgOk` 不成立で**永久に不可視の orphan** となる — 実在しない
タブ配下で `byId` 上は生き残り、ページ集合がピアと発散した状態が残る。

## Decision

`_apply` の post-switch tail で `if(_pgOn()){_pgHealS();_pgBar()}` を
実行する。全 op 種を一点で覆い、スタブ生成を wholesale イベント待ちに
しない。

- `_pgOn()` 限定: ページなし盤面では `s.pg` を保持する — 後続の
  pageAdd が解決する forward-compat (0663 の既存セマンティクスを維持。
  一度 scrub すると実 pageAdd 到達時に first-page 誤帰属するため
  scrub 版は却下)。
- ページモード: 未知 `s.pg` は `'?'` スタブ生成 — 図形は stub タブ
  配下で到達可能、実 pageAdd 到達で 0775 が昇格。
- `_pgBar()` 同伴: スタブは集合を変えるのでタブ描画を即更新
  (sig-guarded で通常 op は no-op)。

## Consequences

- どの op 経路でも未知 `s.pg` が不可視 orphan を作らない — heal が
  全適用で一様に走る。
- `pageAdd` は引き続き stub を昇格し `pageName` は (nts,ntp) LWW で
  実名へ収束するため、スタブは一過性の収束中間形に留まる。
