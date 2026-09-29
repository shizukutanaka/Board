# ADR-0775: '?' stub pages must lose every LWW comparison

## Status
実装済 (v1.7.801)

## Context
`state.pages` に未知の `s.pg` を修復する「スタブページ」を押し込む経路が
2 箇所ある:

1. `applyRemote` の pre-heal — wire op の `shape`/`shapes` が未知の `pg` を運んだ時。
2. `_pgHealS` — 盤面の図形がダングリング `pg` を指した時 (snapshot heal,
   pageAdd backward, `_pgAdopt`, remote-del-empties-set 等から呼ばれる)。

どちらも `{id, name:'?', nts:0}` で作っていた。

## Problem
スタブは「後から届く本物の pageAdd / snapshot が上書きするはず」の暫定物の
はずが、`nts:0` は通常のページと同じ LWW 領域だった。結果:

- 本物の `pageAdd` が届いても、forward は `_pgById(op.id)` で既存と見なして
  **スプライン追加をスキップ**し、スタブが `name:'?'` のまま残った
  (二重ページにならないよう設計済のガードが逆に恒久的スタブを固定)。
- snapshot union-heal でも `clockNewer({ts:p.nts}, {ts:l.nts})` が 0 vs 0 で
  負け、スタブ名が本物の名前に更新されなかった。
- つまり一度「?」タブが出ると、そのページ id に対しては LWW が二度と進まず
  架空タブが永存する。

## Decision
- スタブには **`nts:-1`** を与える。`clockNewer({ts:<何か>},{ts:-1})` は
  常に真なので、どんな本物の書き込み (pageAdd/snapshot 両方) でも必ず昇格する。
- 両スタブ生成サイトを `nts:-1` に統一 (二箇所、挙動不一致の再発を防止)。
- `pageAdd` forward は既存 `nts<0` エントリを **その場で昇格**
  (`name`/`nts` の上書き、再配置しない — 位置はヒール側の妥当性に従う)。
  また `_pgById` が無い場合のみ splice する `!l` ガードはそのまま
  (再適用で二重挿入しない — ADR-0657 ピンが保証)。

## Consequences
- '?' スタブが本物のページ情報を取り込む経路が LWW 一貫性を持つ。
- 2 箇所のスタブサイトが異なる挙動を持つというバグクラスを消去
  (0714 ピンが検出した不一致はこれで再発しない)。
