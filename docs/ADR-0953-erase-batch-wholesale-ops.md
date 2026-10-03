# ADR-0953 — erase ジェスチャ窓 × wholesale op の収束 (_unB 一括戻し)

- Status: accepted
- Date: 2026-10-01
- Related: ADR-0952 (erase 窓のリモート op), ADR-0736/0926 (clear/replace tomb-or-keep), ADR-0707 (pageDel parity), ADR-0922 (_tmb 墓標ゲート)

## Context

ADR-0952 は「窓内リモート op が個別図形を指す系統」(del/prop patch) を閉塞した。
対称の残り軸が**図形群をまとめて捜査する wholesale 経路** — tomb-or-keep 走査が
`_sh()` だけを見るため、`_eraseBatch` 内のメンバーは「存在しないもの」として扱われ
墓標も keep 判定も得られなかった:

### 実害 — バッチ中メンバーが wholesale の tomb-or-keep を素通りする

- **`'clear'` forward** (1709): `dead`/`keep` が `_sh()` のみ走査。バッチ中の X は
  `_del` 墓標を得られず、cancel の `_tmb` ゲート (ADR-0952) も空振り → ピアは X を
  消したのにローカルだけ復活する ghost。`'replace'` (全盤 swap) も同型:
  `old0`/`keep`/`inN` が全て `_sh()` 由来のため「swap 後にも居るべき X」が
  keep 判定に載らない。
- **`_pgDel2`** (pageDel メンバー kill): dead 走査が `_sh()` のみ — 消えるページの
  メンバーがバッチ中だと墓標・rehome のどちらも得られず、cancel が死んだページ
  帰属の図形を復活 (ghost + stale `s.pg`、最悪 '?' stub ページ heal を誘発)。
- **`_rs`** (`_applySnapshot`/importers/IDB restore の全置換): `state.shapes` を
  丸ごと入れ替えるのに `_eraseBatch` に触れない — 採用盤に無い図形が cancel で
  戻り、権威コンテンツと発散。

共通構造: 「送信側ピアではまだ live (消去は未 commit) の図形が、受信側では
wholesale 走査から不可視」という非対称。ADR-0952 が個別 op の byId 口を開けたのに対し、
本 ADR は集合走査経路の対称化。

## Decision

### `_unB` — wholesale 走査の前にバッチをシーンへ戻す

```js
const _unB=()=>{for(const s of _eraseBatch)_sh().push(s);_eraseBatch=[]};
```

適用位置: `'clear'` forward の走査直前、`'replace'` の `next` 確定直後
(前後両方向 — backward restore も同じ走査構造)、`_pgDel2` 冒頭。
これによりバッチメンバーはピア視点と同じ「live なシーン図形」として
`_del` 墓標・`_bN` keep・rehome の通常ゲートをそのまま通る。

### `_rs` — 権威採用がバッチを殺す

```js
const _rs=arr=>{_eraseBatch=[];state.shapes=_uniq(arr);_iG();_pcC()}
```

採用コンテンツがメンバーシップを決定する (X が採用盤に居れば再着地、居なければ
送信側とも一致して消える) ので、バッチを残す意味がない。unbatch せず破棄で
結果は同値かつ安い。

## Consequences

- erase 窓 × (clear / replace / pageDel / snapshot・import・IDB restore) で
  ローカルだけ図形が残る/消える一方向発散を閉塞
- unbatch はシーン末尾 push のため、swap で生存したメンバーの z-order が末尾へ
  動く極小の表示差 (frac キー保存下の edge ケース) — 許容・文書化
- 3 ピン追加: remote `replace` の swap-out・local `clear`・snapshot `_rs` 採用が
  cancel 後も `!byId` を維持することを実経路で固定
