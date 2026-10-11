# ADR-1190 — スナップショット ask の deferred queue (窓内 2 件目を drop しない)

Status: implemented (v1.8.214) — `_sendSnapshot` の throttle deferral を ask 毎の
キューへ置換 + init リセット + 9 挙動/ソースピン。

## Context (監査経緯)

`_sendSnapshot(req)` は 1s スロットルで snapshot 応答を束ねる (ADR-0452:
deferred resend、forged hello/sync-req 洪水への amplification 防壁)。
旧実装は窓内の 2 件目以降を**暗黙に drop** していた:

```js
if(w>0){if(!this._snapT)this._snapT=_stO(()=>{this._snapT=0;this._sendSnapshot(req)},w);return}
```

`_snapT` が armed なら新しい呼出は何も記録せず return — armed タイマは
**最初の ask の `req` でのみ**再送する。

## 実害

スナップショットは broadcast — payload は**最初の asker の horizon** で計算される。

- joiner J1 が `sync-req{wc: 自 horizon}` → deferral 武装
- joiner J2 (新規・空盤面) が `hello`/`sync-req` を同一 1s 窓内で発行 → **drop**
- armed flush は J1 の delta snapshot のみ送出 → J2 は J1 の horizon より古い
  図形を全て取り損ねる
- J2 の `_snapRx` が立たないため `sync-req` retry が残るが、3 回 bound ×
  presence interval (~5s) — **最大 ~15s の空/不完全盤面**

同一 asker が horizon 更新後に再送する場合 (join 中にさらに op が到着) も
同様に drop され、返答は古い horizon のまま。

## Decision

deferral を per-ask queue へ置換:

```js
const q=this._snapRqs||(this._snapRqs=[]);
if(!req)q.length=0;
_pu(q,req);if(_ln(q)>8){q.length=1;q[0]=null}
this._snapT=_stO(()=>{...;for(const r of q)this._send(this._snapshotMsg(r))},w);
```

- **ask 毎に1送信** — 各 asker は自 horizon で計算された応答 (送判定 + dels)
  を得る。union-horizon 統合では send 判定 (両 horizon 共通 id のみ送判定で
  older clock) と dels 領域 (片方のみの id も tomb が必要) が異なるため、
  per-ask 送信が最も正確で小さいコード。
- **falsy ask は queue を collapse** — full snapshot は全 ask を包含する。
- **cap 8** — flood は `[null]` (full 一回) へ潰れる。throttle の amplification
  上限は維持 (窓あたり ≤8 send)。
- **`init` が `_snapRqs=_ud`** — ルーム切替で旧ルームの ask を持ち越さない。

## Rejected alternatives

- union-horizon 単一送信: send 判定は共通 id∩older clock、dels は union id∧
  older clock と 2 map が必要 — per-ask 送信より複雑で、`dels` の per-asker
  正確性も落ちる。
- 最新 ask のみ保持: 同じ drop 被害を最初の asker 側へ移すだけ。

## Pins (9)

両 ask queue・per-ask horizon 応答・falsy collapse・overflow→full・
init クリア + 2 ソースピン (queue 存在・per-ask flush)。
