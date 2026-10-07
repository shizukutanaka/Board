# ADR-1089: wire `wc` carriage audit

- ステータス: 採用 (監査完走 + 挙動ピン)
- 日付: 2026-10-01
- バージョン: 1.8.113

## コンテキスト

ADR-0721/0722 以降、op は **wclock スナップショット** (`wc` / `afterWc`) を wire に
同梱する — del/pageDel/replace の undo が LWW 時計を復元するため。未検証の
carrier があれば、far-future `_del` clock を書き込んで id を永久抹殺
(`_bN`/`_tmb` の全比較に勝つ ts=1e15 tomb → 再導入不能) する偽造窓になる。

`before` 契約シリーズ (ADR-1085–1088) の次の未確認面として、`wc` を搬送・消費
する全経路の intake 検証カバレッジを監査した。

## 監査結果 — 全 consumer が 3 つのいずれかに帰着 (clean)

### 1. intake 検証済み (`wcOk`)

| carrier | 検証 |
|---|---|
| `addMany.wc` | `wcOk` — map ≤ MAX_OP_SHAPES、全 entry が object で全 prop が `validClock` (ts ≤ wall+5min, ADR-0791) |
| `replace.afterWc` | 同上 |

### 2. consumer 側で自己消毒

| consumer | 消毒 |
|---|---|
| `_wR(id,w)` | ≤64 props、`_wK` whitelist + `frac`/`groupId`/`_born`/`_del`、各値 `validClock` → 落ちた prop は書き込まない |
| `_wAdopt(id,rw)` | 同上 (snapshot `wm` / `_mergeSnapshotOp` / IDB doc `wc` の3経路) |

### 3. wire `wc` が読まれない面

| op | 理由 |
|---|---|
| `del` | forward が `op.wc=_wM()` で受信側自身のスナップショットを先に書き込む — wire 値は上書き死 |
| `pageDel` | `_pgDel2` が同様に `op.wc=_wM()` 上書き — backward (local undo) のみが読む |
| `clear` | `REMOTE_OPS` 外 — wire に到達しない |
| `replace` | remote は `afterWc` のみ消費; `op.wc` を読む `_wTb` は `_recordCommitted` (local) のみ |

## 決定

コード変更なし。契約を挙動ピンで固定:

- 偽造 far-future `_del` は `addMany.wc`/`replace.afterWc` で intake 棄却
- 有効 `wc` は `_wR` で clock prop のみ採用 (非 clock prop 落とし)
- 偽造 `del.wc`/`pageDel.wc`/`replace.wc`/`clear.wc` は一切着地しない

## テスト (test.mjs, 13 asserts)

- `addMany wc` 偽造 3 件 + `replace afterWc` 偽造 1 件 → `validRemotePayload` 棄却
- `applyRemote(addMany{wc})` → clock prop 採用 / 非 clock 落ち
- `applyRemote(del{wc:forged})` → tomb は op.clock、偽造 1e15 不着地
- `applyRemote(replace{wc:forged,afterWc:{}})` → dead id は op.clock tomb、1e15 不着地
- `applyRemote(pageDel{wc:forged})` → メンバー tomb は op.clock、victim2 不着地
- `applyRemote(clear{wc:forged})` → REMOTE_OPS 外で適用なし

## 残課題

- `wcOk` は prop 名を制限しない (junk 名 + clock 値は `_wR` で whitelist 落ち、実害なし)
- `wcOk` は per-entry prop 数を見ない (`_wR` の ≤64 で空 entry に収斂、実害なし)
