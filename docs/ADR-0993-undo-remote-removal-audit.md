# ADR-0993 — undo × remote-removal 仲裁対称性監査 (完走: clean)

## 対象

`Store.undo()`/`redo()` の backward `_apply` と、その結果をピアへ伝える `_undoWire` op の forward `_apply` が、remote 除去 (del/tomb)・remote 書込 (per-key LWW) との仲裁で**同じ結論へ至るか**。一方向発散クラス: ローカルだけ復元/復活/無効化されて盤面が永久にずれる経路。

## 監査軸と結論

`Store.undo()` は backward 適用の**前に** `op.clock` を新 HLC 時計 `{peer:_pi(),seq:++state.seq,ts:_ut}` へ再刻印 (ADR-0717) し、wire op も同一 `_ut`・別 seq で刻印 → `_stampWrites` + `Net.broadcast`。**wire 発行は無条件** (backward が no-op でも wire は出る) — これ自体を「dead-shape op は到達側でも no-op」として固定。

| 軸 | ローカル (backward) | ピア (forward) | 対称? |
|---|---|---|---|
| prop ops (upd/style/resize/align/beautify) | `_lwwSkip` (peer-gated 逐キー) | `_lwwDrop` (逐キー `clockNewer` + `_chg`) | 等効 |
| move/zorder | 絶対 `after` / per-axis `_lwwSkip` | 同じ絶対適用 + `_lwwDrop` | ○ |
| group/ungroup | groupId `_lwwSkip` + locked skip | 同 | ○ |
| add/addMany→del | locked `_selR` / splice + `_del` tomb | del forward `_bN`+locked | ○ |
| del/clear→addMany | `!byId && !_tmb` + `op.wc` `_wR` + `_ccRest` | `!byId && !_tmb` + `_wR` | ○ |
| replace | swap case `_bT` `_born` + `_pgAdopt` | replace forward | ○ |
| pageAdd→pageDel | `_pgDel2` + `firstId`/`unpage` | pageDel forward | ○ |
| pageDel→pageAdd+addMany | index 復元 + `op.wc` | 同 payload | ○ |
| pageName | `bts`/`nts`/`ntp` carry (ADR-0727) | nts/bts 比較 | ○ |

## 時計の非対称→対称収束の本質

undo 時計 `_ut=nowTs()` は HLC (`_max(Date.now(), state._lastTs+1)`) で、**観測済み remote 時計より必ず新しい** (`applyRemote` が `_lastTs` floor を引き上げる)。ゆえに:

- remote del tomb (ts 大) を観測**後の** undo-of-del は `_tmb` を**抜けて復活** — undo は因果的に「新しい書込」として tomb を打ち負かす。ピア側 addMany も同一 `_ut` で `_tmb` を抜き同じく復活 → **対称な復活** (片側だけ死んで残る経路は存在しない)。
- remote prop 書込を観測後の undo-of-upd も `_lwwSkip` を抜き before 値を復元 — wire upd も同じキーを勝つ → **対称な before 復元**。
- `_tmb`/`_lwwSkip`/`_bN` ゲートが実効を持つのは**stale 時計を持つ op** (遅到着・重放・鍛造 op) に対して — 新鮮な undo 時計は honest 経路では常に勝者であり、両側で同一判定になる限り発散しない。

残余面 (文書化のみ): スナップショットマージ経由の**own-peer 時計鍛造**は wall+5min (ADR-0791) で上限内 — 悪意専用面、honest 経路は clean。

## 検証

`test.mjs` 2646–2680 の ADR-0993 ピン (実経路 `Store.commit`/`Store.undo`/`Store.applyRemote` + `Net.broadcast` スパイ):

1. remote del 済み図形への upd undo — ローカルもピアも dead-shape no-op で死んだまま。
2. add の undo — `_del` tomb を刻み wire `del` が対称に複製。
3. 新 remote tomb を超えた del undo — 両側対称に復活 (undo=因果的に新しい書込)。
4. 新 remote 書込を超えた upd undo — 両側対称に before 値へ復元。
