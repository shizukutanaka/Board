# ADR-1027: wire ミューテーション×グリッド無効化 + presence ライフサイクル監査 (clean 完走)

## 背景

round776 の監査軸: **「図形オブジェクトへの直接変異 `_oa` が空間グリッド無効化 `_iG` に必ず到達するか」**。
`_oa` は `_apply` 外からも呼ばれる (connFix は `applyRemote` 内の `_apply` 直後に直行) ため、
`_iG` 未経由の変異があれば空間索引が stale のまま hit-test/marquee/カリングを誤る可能性があった。
併せて同一ファミリの隣接面 (起動順序・broadcast 時計・presence 寿命) を一括走査した。

## 監査表

| # | 軸 | 結果 |
|---|----|------|
| 1 | `_oa` パッチ適用 ↔ `_iG` 到達性 | **clean** |
| 2 | Boot 順序 (Persist.load × Net.init) | **clean** |
| 3 | broadcast 時計採番の完全性 | **clean** |
| 4 | presence ライフサイクル (touch/reap/bye/onclose) | **clean** |

### 1. `_oa` ↔ `_iG`

- `_oa=(o,p)=>{const r=Object.assign(o,p); ...; if(byId(o.id)===o)_gTouch(o.id,_ok(p)); return r}`
  自体は `_iG` を呼ばない (ADR-0969: live 図形のみ `_gTouch` でジェスチャ復元ドメインへ併合)。
- `_grid`/`_idIndex` は `_iG()` (= `_invalidateGrid`: `_grid=null;_idIndex=null;_gridVer++`) による
  **lazy 再構築**。`_iG` は dirty フラグを立てるだけで、実体は次回読取 (`_buildGrid`/byId) で再生成される。
- 全 live-shape `_oa` 呼出サイトは `_apply` head の `_iG()` 配下:
  - connFix (`_oa(sh,f.patch)`, applyRemote 内 `_apply` 直後) — `_apply` が `_iG()` を頭で発火済みで、
    connFix の変異は lazy rebuild が post-`_iG` 幾何を拾うため **stale にならない**。
  - backward connClears 復元 (~1656)、`_ccRest` (~1887)、`_apply` 各 case — 同様に配下。
  - `_pgHealS` の `s.pg` 変異も pages→null 化サイト (1746/1770) で `_apply` 内 = 配下。
- **契約ルール (新規)**: 盤面図形へ `_oa` (または同等の直接変異) を呼ぶ新経路は、
  同一イベントターン内に `_iG()` が既に発火していること。`_oa` 側へ `_iG` を入れない —
  `Object.assign` 単発の変異に全盤面インデックス再構築のコストを紐付けない設計意図を維持する。

### 2. Boot 順序

`main()` は `await Persist.open()` → `await Persist.load()` → backup check → `Share.importFromHash` →
`Share.inviteFromHash` → `Net.init()` を **全て await 直列**で実行する。
load 解決前に BC/DC 受信経路は存在せず、`_rafId=_rAF(frame)` も `Net.init` 後に初めて起動するため
「restore 未完了の盤面へ remote op が着弾 → load が `_rs` で全消去」の競合は構造的に不存在。

### 3. broadcast 時計採番

外向 op は全て一意の `(peer, ++state.seq, ts)` 時計を刻印する:

- `_fck=o=>{o.clock={peer:_pi(),seq:++state.seq,ts:nowTs()}}` — commit 系 (1568/1605) と
  broadcast-only 経路 `_syncTextFinalize` (5629) が共有。
- addMany リテラル 2145/7050 も `seq:++state.seq`。
- undo/redo wire (1595/1608) は `_fck`/`_stampWrites` 経由。
時計なし op が wire に出て `(peer,seq)` dedup に沈黙ドロップされる経路は不存在。

### 4. presence ライフサイクル

- `_touchPeer` — `MAX_PEERS` (32) cap + 既存行の `lastSeen` 更新。
- `_reapPeers` — `NET_PRESENCE_TIMEOUT` (15s) 超の BC 行を削除。**`rtc:` 行は skip** —
  DataChannel `onclose` が所有者 (`_pr().delete(dcRef._pid)`、superseded チャネルも自身の行を purge)。
- `bye` — 即時 `_pr().delete(pk)` (0457)。`rtc:` presence は `viaRtc` 経路で蘇生可能 (0986)。
- `_bcast` — BC + DC dual-transport (0401) で presence は RTC ピアにも届く。

### 残留注記 (受容)

- `dcRef._pid='rtc:'+uid().slice(0,4)` — 4 文字のため新旧チャネルで ~1/1.6M の衝突確率。
  衝突時は stale close が生きた presence 行を消し得るが、`this.dc!==dcRef` ゲートで live 状態は守られる。
  影響は cosmetic のため現行維持。
- `_touchPeer` の `MAX_PEERS` cap は flood 中 15s 間 legit ピアの presence 行を拒む —
  presence のみの cosmetic 制限、op 同期には影響なし。

## ピン

- `_oa` が live 図形のみ `_gTouch` する (0969)・`_iG` alias・`_pid` per-channel 付与 (ソースピン)
- `main()` で `await Persist.open();await Persist.load()` が `Net.init()` に先行 (順序ピン)
- `_fck` が一意時計を刻印 (ソースピン)
- `_reapPeers` が `rtc:` を skip (ソースピン) / `_bcast` が dual-transport (ソースピン)
- 行動ピン: `_touchPeer` → `peerCount` 増、`bye` intake → 即消、`rtc:` fresh 行が reap 後も残存
