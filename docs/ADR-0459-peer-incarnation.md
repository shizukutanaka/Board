# ADR-0459 — ピア incarnation id (起動毎の識別子)

## 状態

実装済 (v1.7.493)

## 背景

`peerId` は localStorage `board.peer` でブラウザ永続、`state.seq` はリロード毎に 0 リセットだった。分散系として二つの障害を含んでいた:

1. **dedup キー再利用**: op 時計は `{peer, seq}`、受信側の `seenOps` は `peer:seq` で棄却する。リロード後は seq が 0 からやり直すため、部屋に残ったピアが保持する旧キーと衝突し、**リロード後の最初の N 個の op が静かに捨てられる** (受信側にとって「届いていない」ではなく「適用済みとして棄却」なので復旧しない)。
2. **同一ブラウザ複数タブの同期停止**: `msg.peer===_pi()` の自己エコー判定が PEER_ID 共有の別タブからのメッセージも自分扱いして棄却していた — BC の主要用途 (同一マシンの複数タブ) が成立していなかった。

## 決定

`state.peerId = PEER_ID+'.'+uid().slice(0,6)` — 永続基底 + 起動毎の nonce (incarnation id)。`_pi()` 経由で全ての送信 (hello/ping/bye/cursor/op 時計) に一貫して流れる。

付随して `Net.init` で部屋横断の残存物を掃除:

```js
_sO().clear();_cT(this._snapT);this._snapT=0;this._lastSnapAt=0;
```

- `seenOps` — 部屋を跨いだ dedup テーブルは意味をなさない (peer id は部屋毎にランダム)。
- `_snapT`/`_lastSnapAt` — ADR-0452 の deferred resend が部屋切替を跨いで新ルームへ発火するのを止める。

## 影響

- リロード/複数タブ間で `peer:seq` が衝突しない — op 配送の静かな欠落が解消。
- 同一ブラウザの複数タブが互いを別ピアとして認識し、BC 同期が初めて機能する (カーソル・選択・op がタブ間で共有される)。
- リロードしたピアは新しい id で現れる — 旧 id のプレゼンスは ADR-0457 の `bye` で即時除去、届かない場合は 15 秒の reap がフォールバック。
- `wclock`/時計の `clockNewer` は ts→peer→seq の全順序なので、peer 文字列が変わっても決定性を保つ。
