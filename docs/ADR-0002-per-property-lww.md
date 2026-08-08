# ADR-0002 — 並行編集の収束: プロパティ単位 LWW

- **状態**: Accepted (2026-06-15 実装) — `upd`/`style`/`resize`/`align` に適用(変更キー検出で全 op 対応)。
  **2026-07-13 追記**: 本 ADR が「全 op 対応」と謳っていた LWW 保護のうち、undo(逆適用)時に
  「リモートの新しい書き込みを踏み潰さない」ガードが `upd` にしか実装されておらず、
  `style`/`resize`/`align`/`group`/`ungroup` には無かったバグを発見・修正(v1.7.68、
  `_lwwSkip` ヘルパーを新設し全ケースで共有)。詳細は本文末尾の「2026-07-13 追記」参照。
- **関連**: research-improvements.md 項目 D/K/L・§3.15(発散の実測)・§3.16(可換 vs 非可換)・
  ADR-0001(frac 順序の可換性)

## 背景 (なぜ)

二者ハーネス(§3.14)で**同じ図形の同じプロパティへの同時編集が発散する**ことを実測した(§3.15):

```
A: upd stroke=red    B: upd stroke=blue   (concurrent)
→ A sees blue, B sees red   ❌ DIVERGED
```

原因: `applyRemote` が受信 op を**受信順に `Object.assign`** するだけで、決定的なタイブレークが
無い。各 peer は「自分の op → 相手の op」順で適用するため、互いに相手の値で終わる。

一方 §3.16 で、**`move`(デルタ加算=可換)は同時編集でも収束**することを確認した。収束の可否は
「同期アルゴリズム」ではなく **op が可換か(デルタ)非可換か(絶対値上書き)**で決まっていた。

## 決定 (何を)

非可換な**絶対パッチ op にプロパティ単位の Last-Writer-Wins (LWW)** を導入する。

- **全順序 `clockNewer(a,b)`**: `(ts, peer, seq)` の辞書式比較。全 peer が同一 clock 三つ組を
  比較するので、**peer 間のウォールクロックのズレに関係なく勝者は決定的**。
- **単調ローカル時刻 `nowTs()` (HLC-lite)**: `clockNewer` は ts を seq より先に比較するため、
  **同一 peer 内でウォールクロックが逆行**(NTP 補正 / DST / 手動変更)すると、その peer 自身の
  新しい編集(高い seq)が古い編集に**リモートで負け**、ローカルは新・リモートは旧で発散する。
  `nowTs()=max(Date.now(), state._lastTs)` で**ローカル ts を逆行させない**。クランプで ts が
  等しくなった場合は `(peer,seq)` のタイブレークが同一 peer の書き込みを正しく順序付ける(seq は
  単調)。`applyRemote` でも観測した remote の ts まで floor を上げ、**remote 編集の因果後の
  ローカル編集が ts ≥ それ**になるようにする。peer 間の厳密な因果勝利(論理カウンタ成分)は将来の
  完全 HLC 課題。`commit`/`_recordCommitted` の clock スタンプは `nowTs()` 経由。
- **書き込みクロック `state.wclock`**: `shapeId → {prop: clock}`。**図形オブジェクトには載せない**
  (clone/snapshot/persist/validate を汚さない)。
- **変更キー検出 `_chg(before,after,key)`**: パッチのキーは **値が実際に変わった**もののみ LWW 対象。
  `before`/`after` を JSON 比較(pen `pts` 等のネストも深く比較)。これにより `resize`/`align` が
  **全図形スナップショット**(`clone(s)`)を after に持っても、**実際に動かした geometry キーだけ**を
  主張し、同時に編集された stroke 等を**上書きしない**。
- **`_lwwDrop(op)`**(remote のみ): 受信パッチの各**変更**プロパティを記録クロックと比較し、**古い or
  未変更の書き込みを落とす**(未変更キーも落とすので、スナップショット op が触っていないプロパティの
  並行編集を潰さない)。全部落ちれば op は no-op(適用スキップ)。
- **`_stampWrites(op)`**: ローカル commit・受理した remote op の双方で、**変更した**プロパティの
  書き込みクロックを `wclock` に記録。
- **適用範囲**: `upd`/`style`(最小パッチ)に加え、**`resize`/`align`(全図形スナップショット)も対応**。
  変更キー検出により、スナップショット型でも per-property 精度で収束しつつ並行 disjoint 編集を保つ。

## 収束の証明スケッチ

A が `prop=x@cA`、B が `prop=y@cB` を同時 commit(各自ローカルで `wclock[prop]` を自分の clock に):

- A が B の op 受信: `clockNewer(cB, cA)` なら適用(A=y)、否なら据置(A=x)。
- B が A の op 受信: `clockNewer(cA, cB)` なら適用(B=x)、否なら据置(B=y)。

`clockNewer` は全順序なので **ちょうど一方が真**。両 peer は同一の (cA,cB) を比較するため**同じ勝者**に
収束する。**互いに素なプロパティ**(A が stroke、B が size)は各々 `wclock` の別キーなので双方生存。

テスト(two-peer harness)で A 新/B 新/ts 同値(peer タイブレーク)/互いに素、の収束を担保。

## 代替案と却下理由

- **Excalidraw 流 version/versionNonce**(項目 K): 各図形に version+乱数。図形に状態を載せる必要があり
  clone/persist を汚す。本 ADR の「clock は別構造」案の方が単一HTML・依存ゼロに適合。将来 nonce が
  必要になれば clock に足せる。
- **全 op を CRDT 化(可換エンコーディング)**(§3.16 の理想): `style` を差分で持てば可換化しうるが
  大改修。まず LWW で発散を止め、可換化は段階的に(項目 L)。
- **per-shape LWW**: 実装は小さいが**互いに素なプロパティ編集を片方失う**(現状より退行)。却下。

## トレードオフ / 既知の限界

- `wclock` は**永続化しない**(セッション内)。リロードで失われる(§3.11 と同性質)。再同期で
  再構築される。新規 join 直後の最初の同プロパティ衝突は、まだ書いていない側の `wclock` が空でも
  双方が自分の clock を記録済みなので収束する(証明スケッチ同様)。
- **undo/redo × 同期**: ~~undo は `wclock` を巻き戻さない(§F の replicated-undo は別課題)~~
  **→ v1.7.73 (ADR-0015) で解決**。undo は逆効果を持つ**新しい op** を新鮮なクロック付きで
  発行し、`_stampWrites` で `wclock` を自分の undo クロックに更新する(巻き戻すのではなく
  前進させる)。`_lwwSkip` で抑止されたキーはワイヤにも載らないため、
  「ローカルは戻ったのに `wclock` はリモートを最終書き込み者と記録したまま」という
  下記 2026-07-13 追記の不整合そのものが構造的に消えた。
- 悪意ある peer が巨大だが**妥当な(有限数)** `ts` で将来の全書き込みに勝つ余地(low severity;
  署名付き op = §3.8 完全性で対処)。これとは別に、**不正な `ts`(Infinity/NaN/オブジェクト/数値文字列)**
  は `validClock` で**受信時に拒否**する: `clockNewer((ts:number),(ts:object))` は両向き false に
  なるため、一度でも不正 ts が `wclock[id][key]` を汚染すると以後**いかなる正当な書き込みも勝てず**
  プロパティが永久凍結する(denial-of-edit)。これは「妥当だが巨大な ts」(署名待ち)とは異なる純粋な
  バリデーション漏れなので、ゲートで塞ぐ。`validClock` は `applyRemote` の単一ゲートで全 remote 経路
  (op / snapshot merge)を覆う。snapshot add は `seq:'snap:<id>'`(文字列)・`ts:0` なので通過する。
- 変更キー検出は `before` を要する。受信 op が `before` を欠く場合は「全キー変更」とみなす(pre-LWW 挙動）。
  Board の `upd`/`style`/`resize`/`align` は before を持って broadcast するので通常は精密。

## 影響

- 単独 peer の挙動は不変(`_lwwDrop` は remote のみ。commit は常に適用)。603 テスト緑。
- `state.wclock` 追加。`del`/`clear`/`replace` でクリーンアップ(肥大化と stale 防止)。さらに
  `_stampWrites` は `byId(id)` で**存在する図形のみ stamp** する: 削除済み図形への遅延 remote `upd`
  は `_apply` で no-op になるが、ガードが無いと `wclock[id]` を新規作成して**無限にリーク**する
  (`del` のクリーンアップは生存 id しか掃除しないため)。`group`/`ungroup`(§3.17)に拡張した際、
  この edge が顕在化した。
- 二者ハーネスで担保: 同プロパティ衝突の決定的収束(A新/B新/ts同値)・互いに素プロパティの双方生存・
  `resize` の収束・`resize×recolor` の双方生存(変更キー gating を外すと clobber して落ちる=非空虚)。
- ~~残: undo×sync(§F)~~ → v1.7.73 (ADR-0015) で解決。`resize`/`align` は変更キー検出で対応済(当初「将来」としたが本コミットで実装)。

## 2026-07-13 追記 — undo ガードの適用漏れ (v1.7.68)

多次元監査(8観測軸の並列エージェント + 3票制の敵対的検証)で発見: `_stampWrites` は
`upd`/`style`/`resize`/`align`/`group`/`ungroup` の**全て**を対象に per-property の
書き込みクロックを記録する(`_lwwOp` 参照)のに、**逆適用(undo)時にそのクロックを見て
「リモートの新しい書き込みを踏み潰さない」ガードは `_apply` の `upd` ケースにしか実装
されていなかった**。`style`/`resize`/`align`(バッチ絶対パッチ)と `group`/`ungroup`
(groupId 絶対代入)の逆適用は無条件に `Object.assign` していた。

**再現**: 2者が同じ図形を並行 resize(A: w=10→40 @ts=1000、B: w=10→99 @ts=2000)。
両者を交換すると LWW で両者 w=99 に収束し、`wclock['rX'].w` は両者とも peerB を記録する。
ここで A が「自分のローカル resize(既に無効化されている)」を Ctrl+Z で undo すると、
修正前は無条件に before パッチ(w=10)を適用し、A だけ w=10 に退行 — `wclock` は
peerB を最終書き込み者として記録したままなのに実際の値が食い違う、undo は broadcast
しないため B に伝わらず誰も気づかない、という静かな発散が起きていた。group/ungroup も
groupId について同型のバグを持っていた(`beautify` は `REMOTE_OPS`/`_lwwOp` に含まれない
ローカル専用 op のため対象外 — 並行編集の可能性が無く元々このガードは不要)。

**修正**: `_lwwSkip(id,key,op)` を共有ヘルパーとして新設し、`upd`・バッチ絶対パッチ
(`style`/`resize`/`align`/`beautify`)・`group`/`ungroup` の逆適用すべてから呼ぶ。
`upd` 自体も新ヘルパー経由に統一(挙動は不変、重複コードの解消)。

**テスト**: 二者ハーネスに2ケース追加 — (a) resize の収束後に A が自分の resize を
undo しても w=99 のまま(退行しない)、(b) 対比として並行書き込みが無い通常の resize
undo は従来通り値を戻す(ガードの過剰発動が無いことの確認)。group 側も同型のペアを追加。
非空虚性確認済み(修正前コードで `10 !== 99` として実際に fail することを確認)。
