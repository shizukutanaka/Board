# ADR-1166 — スマート複製チェーンのデルタ・ライフサイクル (dd スナップショット + undo/ro parity)

## 状態
採用済み (v1.8.190) — 実害 2 件を修正 + 契約ピン

## 文脈

ADR-0080 の smart-duplicate (⌘D) は `dupIds`/`dupDelta` ペアで「複製→移動→再複製
でベクトルを反復する」連鎖を構成する。feed サイトは2箇所 — `nudgeSelection`
(矢印キー) と `endSelect` の drag-move commit — で、どちらも「チェーン live かつ
op.ids がまだ全員メンバー」なら `dupDelta` を加算する。この派生状態には
undo/ro/wire の三面での整合規則が無く、監査で実害 2 件を発見した。

## ソクラテス式確認

- Q: ro 下の nudge はチェーンを進めるか? — 進めていた (実害 A)。ro 採用下で
  nudge は live-write してから commit が `commit` の ro ゲートで棄却され
  `_roRe` が位置を巻き戻す — しかし `_dd()` の feed は**無条件**に走っていた。
  座標は戻るのに `dupDelta` だけが増え、ro 解除後の ⌘D が幻影ベクトルで着地
  する発散。`_fD&&!state.ro` ゲートで revert される move は feed しない契約へ。
- Q: armed-set の move を ⌘Z するとデルタも戻るか? — 戻らなかった (実害 B)。
  `_apply` 'move' の backward は座標のみ復元し `dupDelta` は post-move のまま —
  undo 直後の ⌘D が post-move ベクトルを適用し位置だけ逆戻りと不整合。
  `op.dd` (pre-move スナップショット) を同梱し、backward は snapshot 復元、
  forward は own-redo のみ `dd+dx/dd+dy` で再フィード (ADR-1163 `bro`/`bvp` と
  同型の `op.clock.peer===_pi()` ゲート — wire-slimmed remote には dd が無い)。
- Q: `dd` は wire に流れるか? — 流れない契約。`dd` は orig/moved/origSel と同じ
  undo-domain の復元データで、`_slimOp` の destructure strip に `dd:_d4` を追加
  (remote op は `applyRemote` が dedup+適用するのみで `_hi().push` を通らず
  `op.dd` は peer から非到達 — むしろ strip しないと輸送不能のゴミを運ぶ)。

## 決定

(1) 両 feed サイトで armed-set の move op に `dd={x:pre.x,y:pre.y}` を同梱、
`_apply` で `!forward→dupDelta=dd` / `forward&&own-clock→dd+dx,dd+dy`。
ゲートは `op.dd&&_dd()&&op.ids.every(dupIds.has)` — チェーン死亡やメンバー脱退
では復元しない。(2) 両 feed を `!state.ro` でゲート。(3) `_slimOp` が `dd` を剥がす。
8 behavioural asserts + 3 source pins で固定。pin は dd 有 op を
`_slimOp` 経由で wire から剥がれることも実検証。
