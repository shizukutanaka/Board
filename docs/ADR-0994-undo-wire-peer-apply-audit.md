# ADR-0994 — undo-wire × ピア forward-apply 対称性監査 (完走: clean)

## 対象

`Store.undo()` が発行する `_undoWire` op が**無条件送信** (ローカル backward が locked 等で no-op でも wire は出る) であることの妥当性 — ピア側 forward `_apply` のゲートがローカル backward と同じ結論に至るか。さらに `_slimOp`/`_slimShapes`/`_imgSlim` が wire 送信用に op を縮退させる際、ピアが必要とするフィールドを欠落させないか。

一方向発散クラス: (a) ローカルだけ no-op / 適用される、(b) wire op が `validRemotePayload` を落としてローカルだけ undo される、(c) kill-set/復元フィールド欠落で除去範囲がずれる。

## 監査軸と結論

| 軸 | 検証 | 結論 |
|---|---|---|
| `_undoWire` 網羅性 | 全17種 (add/addMany/del/clear/move/upd/style/resize/align/beautify/group/ungroup/zorder/replace/pageAdd/pageDel/pageName) が逆 op を生成 — undo-less kind なし | ○ (0989 で合法性もピン済) |
| locked 対称 | `sh.locked` ゲートが `_apply` 両方向で同一: upd (1673 `if(sh.locked)break`)、move 絶対+delta 両経路 (1686/1693)、group/ungroup (1795-1817)、zorder (1817)、patch 系 `('locked' in raw)` 例外つき (1834)、connClears (1656/1664/1773)、del forward skip (1647)、`_pgDel2` locked 存続 | 両側同一ゲート — ローカル no-op ⇒ ピアも no-op |
| `unpage` kill-set | pageAdd→pageDel: `unpage:1` は両側とも `op.shapes` (=commit 時の全形、validShape 通過) で kill-set をキャップ。空集合化時はローカル・ピア共に kill-set 外メンバーを `pg=null` で存続 | 対称 (0724/0725) |
| `_slimOp` 剥離対象 | 剥離は undo 専用のみ (`origSel`/`moved`/`orig`/`wc`/`before` の適宜)。必要フィールド全網羅: `connClears` (del)、`wc` (addMany)、`afterWc`/`pages`/`curPg` (replace)、`firstId`/`unpage`/`shapes` (pageDel)、`nts`/`ntp` (pageName)、`before` (upd の `_chg` 用) | ○ |
| `_slimShapes`/`_imgSlim` | img 参照の縮退のみ — shape 全フィールド保持で `validShape` 通過 (id-only 縮退は存在しない) | ○ |
| 発行経路 | `commit`/`_recordCommitted`/`undo`/`redo` 全て `op.clock.peer===_pi()` で `Net.broadcast` | ○ |
| 例外安全 | `clone(undefined)` は全呼出が存在ガード済みで到達不能; `_onRecv` は各メッセージ独立 (投出しても後続処理、op は `_ck` dedup 済み) | ○ |

## 付記

- wire が無条件でも発散しない理由: 適用側ゲート (`sh.locked`/`!byId`/`_tmb`/`_lwwSkip`/`_bN`/`only` kill-set) が**全て `_apply` 内部で両方向同一** — undo-wire は「もう一度同じ判定をさせる」だけで、判定結果は op 内容と受け手の状態のみで決まる。
- `_slimOp` の `'move'` 経路は live `byId` から絶対 `after`/`before` を再構成 (0729) — wire 値は op 記録値ではなく現在地由来で LWW と整合。
- 残余面: ADR-0993 同様、own-peer 時計鍛造 (snapshot 経由) は wall+5min 上限 (0791) — 悪意専用。

## 検証

`test.mjs` の ADR-0994 ピン (10 assert、実経路 `Store.commit`/`Store.undo`/`Store.applyRemote` + `Net.broadcast` スパイ + `Net._slimOp` 経由の wire 実形再現):

1. locked 図形への upd undo — ローカル no-op、wire upd は発行されるがピア側同一 locked ゲートで drop (対称 no-op)。
2. del undo — wire `addMany` が `wc` 時計スナップを同梱、connClears は独立 `upd` op で `after.a` 復元値を運ぶ。
3. pageAdd (duplicate 形) undo の `unpage` kill-set — ローカルと「受信ピア」(`peerId` 差替えリプレイ) が同一 kill-set で同一メンバー除去、kill-set 外の外来メンバーは両側 `pg=null` で存続。
