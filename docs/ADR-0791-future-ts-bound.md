# ADR-0791: future-ts bound on every LWW clock at intake

## 背景

`validClock` は clock の `{peer,seq,ts}` を検証していたが、`ts` には有限性しか要求していなかった。
上限がないため、悪意のある (あるいは時計が壊れた) ピアが `ts:1e15` を送信すると、LWW 仲裁で
**永久に勝ち続ける** — `clockNewer` は ts 第一キーなので、以後の全ローカル/正当ピア書き込みが負ける:

- **`op.clock`** — 全リモート op。1つの poison clock で対象図形の全 prop が永久凍結。
- **`wc` prop clocks** (addMany/snapshot 経路) — snapshot が全図形の全 prop を植え付け得た。
- **`msg.rep` / `state._lastRep`** — 'replace' の因果 marker。未来 rep を植えると以後の正当な
  swap がすべて「古い世代」として棄却され、wholesale 同期が止まる。
- **`msg.ts` / `msg.nameTs`** — ドキュメント名 LWW (`_nameWin`)。リモート改名を永久に勝たせる。
- **`op.nts` / `p.nts`** — ページ名 LWW。同上。
- **`d.nts` / `d.rep`** — IDB restore 経路 (ローカルに poison が残存する場合の自己修復も兼ねる)。

さらに深刻なのは **`_lastTs` ラチェット** (`applyRemote` が `state._lastTs=max(lastTs, op.clock.ts)`
する HLC-lite 床): 受け入れた未来 ts がローカル時計の床を引き上げ、以後の**こちらの**書き込みも
遠未来 ts を背負う → 正直ピアの bound で棄却され発散する。受信は「この値を他者も受け入れるか」
まで考えなければならない。

## 決定

`MAX_TS_SKEW=3e5` (壁時計 +5分) を上限とする検証ヘルパ `_tsOK` を新設し、
全 clock/ts 取込ポイントに適用した:

```js
const MAX_TS_SKEW=3e5,_tsOK=t=>_iN(t)&&_fin(t)&&t<=_now()+MAX_TS_SKEW;
```

- `validClock` — `c.ts!=null&&!_tsOK(c.ts)` → op/wc/rep/d.rep を一括カバー
- `_vPages` / pageName validOp / `p.nts` 適用 — ページ名 LWW
- `name` / `snapshot.nameTs` メッセージ — ドキュメント名 LWW (`_nameWin` 前)
- IDB restore `d.nts`

## なぜ `_now()` (壁時計) を基準にするか

`nowTs()` はラチェット (`_lastTs`) 由来なので、遠未来 ts を一度受け入れると**それ自身が汚染される**。
汚染された時計は自分の bound を緩めてしまう — 上限は壁時計で測る必要がある。

## なぜ 5分か — 自己安定化

受入 ts は `wall+B` 以下。ラチェットで我々の時計は最大 `wall+B` に引き上げられる。
以後の我々の書込み ts ≤ `wall+B` ≤ `wall'+B` (受信側の時計が進んでいる限り) → **正直ピアは常に受け入れる**。
つまり任意の B で poison 後も収束が自己修復する。B は「LWW を誰が何分勝てるか」の上限でもある:
24h だと1日分の勝ちを与えるが、5分なら影響は実質数分。実環境の clock skew (NTP で通常 <1s、
手動設定の壊れた時計でも UTC epoch には影響しにくい) を考えれば 5分で十分寛大。

## トレードオフ / 残課題

- **壁時計が 5分以上遅いピア**の書き込みは棄却される — そのピアは既に時計が壊れており
  LWW でもおかしな挙動をしていたはず。棄却は局所的 (そのピアだけ発散) で poison よりはるかに小さい。
- `_lastTs` ラチェット自体は変更していない — bound を通った ts のみが床を上げる設計で
  整合が取れている。
- 存在確認済みの同種穴: 存在するのは wall-clock 系 (presence staleness 等は LWW を駆動しないため対象外)。

## 依存

`MAX_PEER_ID_LEN`/`_fin`/`_iN` と同じ検証層。`validClock` への追加で
op.clock・wc・msg.rep・d.rep・undo-wire clock がすべてカバーされる。
