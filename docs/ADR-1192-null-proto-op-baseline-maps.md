# ADR-1192 — op `before` ベースライン lookup の null-proto 統一 (監査完走)

Status: implemented (v1.8.216) — `_lwwDrop`/`_stampWrites` の4サイトを
`{}` → `_wM()` へ統一 + 7 挙動/ソースピン。

## Context (監査経緯)

ADR-0788 (wclock 系) → ADR-1191 (`_reqWc`/`_syncReqWc`/`cov`) と続いた
null-proto 契約 sweep の最終面として、round942 で index.html の
**全 plain-`{}` / `Object.create` / `Map` サイトを wire 制御キーか
どうかで分類**した。

- Net 画像/フラグメント/ピア管理 (`_imgSent`/`_imgIn`/`_imgPending`/
  `_imgqT`/`_imgChunks`/`seenOps`/`peers`/`_idIndex`/`_penCache`/
  `_penBboxCache`/`_grpMap`/`_cssCache`/`_gbx`/`gids`/`reg`/
  `state.wclock`/`op.wc`) は既に `_mP()`/`_sT()`/`_wM()`/
  `Object.create(null)` で済み。
- `orig={}` (ADR-0720 replace-undo) や `n={}` (trim 一時) は
  ローカル生成キーのみ — wire 由来キーを取らず対象外。

残存した wire 由来キーの plain-`{}` map は **op の `before` ベースライン
lookup `bmap`/`bb` だけ** — `_lwwDrop` と `_stampWrites` の group/ungroup
枝と patch-op 枝の各1箇所、計4サイト:

```js
const bmap={};for(const b of (op.before||[]))bmap[b.id]=b;   // ×2
const bb={};if(_iA(op.before))for(const b of op.before)bb[b.id]=b;   // ×2
```

## 分析

`patches()` (validRemotePayload) は `before` メンバーの id に `_iS` + ≤64
のみ要求するため `id:'__proto__'` は **通る**。`bmap['__proto__']=E` と
代入すると own key は作られず `bmap` の [[Prototype]] が E へ書き換わり、
以後 `bmap[p.id]`/`bb[p.id]` は任意メンバーの実ベースラインではなく
毒 E を解決する:

- **patch 枝** (`bb`): `filt` が `_chg(E, after, key)` を評価 —
  E に after と同値を仕込むと変更 props を全員分まとめて drop (kept=0)。
- **group 枝** (`bmap`): `E.groupId=op.gid` を仕込むと全メンバーの
  `_chg` が false → `op.ids` 全滅 → op は適用なしで死ぬ。
- `_stampWrites` 側は同じマップで `w[key]=C` スタンプ判定を偽装 —
  変更 prop が wclock に載らない。

**悪用度は限定**: `before` は送信者自身が全委任した baseline で、毒の
中身も op の中身も攻撃者が自由に作れる → 今日は「自己破壊型」のみ
(op 全体の `_chg` 判定を均一に掛けて書換える範囲は、がっちり組まれた
after/before と等価)。ただし契約違反であることは確実 — 次の consumer
追加や `delete before[key]` 変異の共有が事故を増やさないよう、規則は
「wire 由来文字列をキーに取る map は全て null-proto」で完走する。

## 決定

4サイトを `_wM()` 化 (`Object.assign(Object.create(null),x)` — 毒
`id:'__proto__'` は通常の own key として格納され [[Prototype]] を
書き換えない)。`bb['sA']`/`bmap['sA']` は実ベースラインを正しく解決。

## Consequences

- null-proto 契約の列挙が**完走**: wire 制御キーの map クラスは
  ADR-0788 → 1191 → 1192 で index.html 全域を網羅した。
- 7 ピン (`Store._lwwDrop`/`_stampWrites` に forged `__proto__` baseline を
  通す behavioural 検証 ×5 + ソース pins ×2)。
- raw +~70B。
