# ADR-1116 — backward 復元ループの `_born` 再スタンプ対称

## Status
Accepted (2026-10-01, round866)

## Context
存在時計 (existence clock) 機構は ADR-0926 で確立された: `w._born` が `w._del` より新しければ
kill op は負け、shape/page の導入・再導入が起きるたびに `_bT` が newer-wins でスタンプされる。
監査の問いは「`_bT` スタンプは全導入経路で対称か」だった。

`_bT` の完全なスタンプサイトマップ:

- ローカル/ピアの forward 導入: `add` fwd、`addMany` fwd、`pageAdd` fwd (ページ + メンバー)、
  `replace` fwd (keep + after 全員)、`_recordCommitted` (sender の swap + 採用ページ)、
  `_pgAdopt` (snapshot 採用)。
- undoer の backward 復元: `replace` backward (全結果 shape)、`del`/`clear`/`pageDel` backward。

## The divergence
3 つの backward 復元ループ (`del`/`clear`/`pageDel`) は `_bT` を **`!byId` ゲートの内側**で
呼んでいた — つまり「復元される」メンバーにしかスタンプしなかった。ピア側の対応する
forward 経路 (`addMany` :1691、`pageAdd` メンバーループ、`replace`) は tomb 非該当メンバー
**全員**に無条件で `_bT` + `delete wd._del` する。

発散シナリオ: メンバー X が kill 後に re-born (誕生時計 B1) して undo 時点で alive。
undoer は `!byId(X)` → `_bT` skip → `_born` は B1 のまま + 旧 `_del` が残る。ピアは undo-wire
(`del`/`clear` → `addMany`、`pageDel` → `pageAdd`+`addMany`) で `_born` を undo 時計 `ut`
に再スタンプ。窓 (B1, ut) の `del` が再配送されると undoer だけが `_bN` チェックを突破して
X を殺す → 片側のみ生存の集合発散。

## Decision
3 サイトすべてで `delete wd._del` + `_bT(sh.id, op.clock)` を `!byId` ゲートの外へホイスト —
`:1691` の addMany forward とバイト一致の構造に統一:

```js
for(const sh of op.shapes){const wd=_wc()[sh.id];if(_tmb(sh.id,op))continue;
  if(wd)delete wd._del;_bT(sh.id,op.clock);
  if(!byId(sh.id)&&_shCap())_sh().push(Net._attachShape(clone(sh)))}
```

併せて `_bT` を null-safe に (`if(!c)return`): backward `_apply` は防御的経路 (テスト等)
で `op.clock` なしでも走りうる — 時計なしスタンプは順序主張を持たないため no-op が正しい。

## Consequences
- `_tmb` ゲートはそのまま先に走る — 新しい tomb を持つ id は引き続き復元も再スタンプもされない。
- `_bT` の既存副作用 (`ptr.reborn`/`_nug.reborn` マーク) が forward と同一の条件で発火する
  ため、reborn 追跡の片側不一致も解消される。
- 補完的契約は監査済み: `_fck` は時計を鋳造するのみ (sender の自 commit に `_born` 不要 —
  新規 uid に tomb はありえない)、`_placeCopies` は全 id リマップ、doc-switch の `_rs`
  サイトは `wclock` をリセット (ADR-1111)、`_tmE` は `_del`/`_born` のみ読むため
  `_del` 削除 + `_bT` の順序は一貫。
