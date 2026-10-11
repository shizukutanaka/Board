# ADR-1201 — mid-arm ro flip 境界: `gone` パーティションの `op.orig` 拡張 + `_keepSel` の op オブジェクト化

- Status: Accepted
- Date: 2026-10-01
- Round: 951 / v1.8.225

## Context

ADR-0965/0971 で導入された `_nugLock` は pending op flush 時に
mid-run で失われたメンバーを `gone` 集合へ分割し、commit される op から
`ids`/`before`/`after`/`changes` の4フィールドを滤過する
(ADR-1131: op は自分が適用した差分のみを記述する、の pending-op 版)。

一方 `_keepSel` (ADR-0312) は commit 直後に `_hi()[_hx()]` (履歴 tip)
へ `origSel` を書き込み、undo の選択復元を担う — **commit が履歴に
push した** という暗黙前提で動く。

## The defects

同じ「commit 棄却境界」に隣接する2欠陥を閉塞する。

### 1. `gone` が `op.orig` を滤過していなかった → `_roRe` が remote-reborn を破壊

`nudgeSelection` が arm する `move` op は第5の restore-domain
フィールド `op.orig` (id→clone(shape) スナップショット map、wire 非搬送)
を持ち、これだけが `gone` 滤過を受けていなかった。

1. `nudgeSelection` で move op が arm (全選択メンバーの `orig` 保持)。
2. arm 中に remote 側で メンバー M が reborn (del → add、`_bT` が
   `_nug.reborn.add(M)`)。remote の M は remote 幾何を持つ。
3. arm 中に `state.ro` が立つ (ro share-link / ro doc の採用)。
4. `_nugEnd` → `_nugLock`: M は `rb.has` で `gone` へ — 配列フィールド
   から除去される。**だが `op.orig[M]` は残留する。**
5. `_recordCommitted` → `state.ro` → `_roRe(op)` → `op.orig` を走査 →
   M に **pre-move のローカル stale スナップショット**を `_oa` で書き戻す
   → remote-reborn の M をローカル限定で破壊 (全ピアは remote 状態を保持)。

類似パターン (locked メンバーの restore) は `_nugLock` が先に同じ
`orig` で `_geoR` 復元するため冪等で無害、`!s` (消滅メンバー) は
`_roRe` 内の `byId` ガードで素通し — 有害なのは reborn 型のみ。

### 2. `_keepSel` が履歴 tip へ書く → 棄却 commit で直前 op の origSel を汚染/クラッシュ

`_recordCommitted`/`commit` の early-return (`state.ro`、dedup) は
op を履歴に push しない。`_keepSel` が無条件に tip へ `origSel` を
書くため:

- 履歴非空 → **直前の無関係な op** の undo 選択復元を静的に上書き。
- 履歴空 (fresh board) → `_hi()[_hx()]` が undefined で **TypeError**。
- 到達経路: remote ro 採用後の `undo()`/`commit()`/`_nugEnd()`/
  `_rcOp()` 先頭の `_nugEnd` flush (ro チェックより先に flush する設計)、
  `_placeCopies` 経路 (ro で `[]` 返却後も caller の `_keepSel` が走った)。

## Decision

両方とも「op が自分のデータを運ぶ」原則で閉塞:

```js
// _nugLock 末尾 — orig は id キー map なので専用1行
if(op.orig)for(const g of gone)delete op.orig[g];

// _keepSel — tip ではなく引数の op オブジェクトへ書く
const _keepSel=(op,arr)=>{if(_ln(arr))op.origSel=arr};
```

全13呼出サイトは `op` を渡す形へ (`_keepSel(op,origSel)`)。
`_placeCopies` 経路は内部で `{op:'addMany'}` を作るため、
`_placeCopies` 自身が `_keepSel(o,_selIds())` を実行
(commit 時点で選択は未変更 = caller の origSel と同一)。
`origSel` は `_slimOp` が全 op 経路で wire から剥がすため
pre-stamp しても wire に流出しない — `_repC`/`beautify` と同じ
「op literal に origSel を含める」既存イディオムに統一。

## Alternatives considered

- `_roRe` 側で `op.ids` 外を skip — 対称性は「committed op が
  self-describing である」原則を破る (history に残る op も `orig` を
  正しく縮めるため `_nugLock` purge 採用)。
- `commit`/`_recordCommitted` が truthy を返しサイト側で `&&` ゲート —
  `_placeCopies` 内部 commit で op ハンドルが取れず、同等の効果を
  より小さく実現できる op-オブジェクト化を採用。
- `_keepSel` に `_hx()>=0` ガードのみ追加 — クラッシュは消えるが
  汚染は残るため棄却。

## Consequences

- `_keepSel` の新契約: 「op オブジェクトへ undo 選択復元を添付」。
  書込みは op が履歴に入るかに依らず安全 (wire 非流出)。
- `_placeCopies` 由来の全 addMany が undo 選択復元を持つようになる
  (`_mergeImport` 等 `_keepSel` 非持ちの経路にも一貫して付く — 統一)。
- dedup/apply-throw 等あらゆる「commit が着地しない」経路で
  前の op の origSel が汚染されないことが保証される。

## Pins (test.mjs)

1. armed move + mid-run remote reborn + ro flip → `_nugEnd` で reborn
   メンバーに remote データが残る (stale orig 非復元)。
2. 同条件で生存側メンバーは `orig` へ復元される (ro revert の契約維持)。
3. ro-棄却 pending op は履歴へ着地せず、前 op の `origSel` も汚染しない。
4. `delete op.orig[g]` のソースピン。
5. `_keepSel=(op,arr)=>` のソースピン (tip 非依存)。
6. `_placeCopies` 内部で `_keepSel(o,_selIds())` のソースピン。
