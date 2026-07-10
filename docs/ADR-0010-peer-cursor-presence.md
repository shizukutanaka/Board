# ADR-0010 — ピアカーソル表示 (presence: 他者のポインタ位置)

- Status: Accepted (implemented)
- Date: 2026-07-01
- 関連: `docs/spec.md` §14.2「同期の運用性…プレゼンス(他者カーソル/選択)も未実装 **[P1]**」、
  §14.3 ロードマップ「P1 | プレゼンス同期」、ADR-0001(frac z-order)、ADR-0002(per-property LWW)

## なぜ (Context)

`docs/spec.md` が優先度 P1(最上位)で挙げていた「同期の運用性」の弱点のうち、シグナリング
UX は ADR-0008 で緩和済みだが、「プレゼンス(他者カーソル/選択)」は完全に未実装のまま
残っていた。共同編集中、相手が今どこを見ている/触っているかが分からないのは、
BroadcastChannel/WebRTC で既にリアルタイム同期している他の全機能(図形の追加・移動・
スタイル変更が即座に反映される)と比べて体験の落差が大きい。

本 ADR は「他者カーソル」のみをスコープにする(「他者の選択状態のハイライト」は将来の
拡張として明示的に対象外 — 別途 ADR で扱う)。理由: カーソル位置だけでも体験価値の大半を
提供でき、実装・検証範囲を小さく保てる(CLAUDE.md「小さく保つ」「一気に全部は作らない」)。

## 何を (Decision)

### プロトコル: 新規メッセージ種別 `{k:'cursor', peer, x, y}`

- **非永続・op-log 対象外**: `Store.commit`/`history`/undo には一切乗らない。`state.peers`
  にのみ保持し、`Persist.save` の対象(`state.shapes`/`docName` 等)にも含まれない —
  再読み込み後にゴーストカーソルが残ることはない。
- **送信**: 新規 `Net.sendCursor(wp)`。既存の `broadcast(op)` と同じ二経路パターン
  (`_send()` で BroadcastChannel、`dc.readyState==='open'` なら WebRTC DataChannel にも
  直接 `dc.send`)を踏襲。`hello`/`ping` 等の他メッセージ種別は `_send()` のみ(BC 限定)
  だが、カーソルは cross-device(WebRTC)でこそ価値が高いため `broadcast()` 型の二経路を
  選んだ。
- **スロットル**: `CURSOR_THROTTLE_MS=60`(約16回/秒)。`pointermove` は数百Hzで発火し
  うるため、既存コードに倣い最小限のタイムスタンプ比較で間引く(新規タイマーやライブラリは
  導入しない)。追跡中のピアが1人もいなければ送信自体をスキップ(`state.peers.size===0`)。
- **受信検証**: `msg.x`/`msg.y` が有限数であることを確認してから採用(既存の `validRemotePayload`
  と同じ防御的 intake の精神 — 不正 peer からの `NaN`/`Infinity` 注入を無害化)。

### WebRTC ピアの識別に関する落とし穴(実装中に発見)

`_onRecv(msg)` は BroadcastChannel・WebRTC 両方の受信を1つの関数に集約しているが、
**WebRTC 経路には `hello`/`sync-req`/`ping` が一切流れない**(これらは `_send()` 経由=BC
限定のため)。したがって WebRTC 接続のピア表示は、相手の実 `peerId` ではなく
**自分側でその場生成した合成 id** `_rtcPeerId`(`_wireDC` の `dc.onopen` で1回だけ発行)
に紐づいている。もし新規 `cursor` メッセージが素直に `msg.peer`(送信側の実 peerId)で
`state.peers` を検索すると、WebRTC 経路では該当エントリが見つからず(合成 id とは別物)、
カーソル更新が黙って捨てられる — もしくは誤って新規のピアエントリを作ってしまい
アバター表示が二重化するおそれがあった。

対処として `_onRecv` に第2引数 `viaRtc`(既定 false)を追加し、`dc.onmessage` からの
呼び出しだけ `true` を渡す。`case 'cursor'` は `viaRtc` なら `this._rtcPeerId`、そうで
なければ `msg.peer` をキーに使う。既存の `op`/`hello`/`sync-req`/`snapshot`/`ping` の
処理は `viaRtc` を参照しないため無変更・無影響。

### レンダリング

`draw()` の既存レーザーポインタ描画のすぐ下に `drawPeerCursors()` を追加。
`state.peers` を走査し `.cursor` を持つエントリ(かつ `Presentation.isActive()` でない
とき)を、そのピアに割り当て済みの `PEER_COLORS` の色で小さな円+ラベルとして描画。
プレゼンス表示は「自分が今このボードを共同編集中」という文脈のための機能であり、
プレゼンモード(1人でフレームを見返す用途、CLAUDE.md 製品判断参照)とは無関係なため
プレゼン中は非表示にする。

## 代替案 (Alternatives)

- **選択状態のハイライトも同時に実装**: 却下(スコープ拡大)。カーソルのみで体験価値の
  大半を提供でき、選択ハイライトは色の衝突(自分の選択色 `--accent-contrast` との区別)
  や複数選択時の描画量など独自の設計論点があるため別 ADR に切り出す。
- **`requestAnimationFrame` ベースのスロットル**: 既存の `invalidate()` の rAF ゲートと
  紛らわしくなる(送信スロットルと再描画スロットルは別関心事)ため、単純なタイムスタンプ
  比較を選択(`Persist.schedule` のデバウンスと同系統の慣用句)。
- **WebRTC 経路も `hello`/`ping` 同様に完全に対象外にする**: 却下。カーソルは
  cross-device 接続でこそ価値が高く、BroadcastChannel(同一ブラウザの別タブ)限定では
  機能の主眼を外れる。

## 影響 (Consequences)

- 新規定数 `CURSOR_THROTTLE_MS`。`Net` に新規メソッド `sendCursor`、`_onRecv` のシグネチャに
  後方互換な第2引数追加。`state.peers` の値に任意の `cursor:{x,y}` フィールドが増える
  (`Persist`/op-log には触れない)。
- 新規関数 `drawPeerCursors()`、`draw()` から1行呼び出し追加。
- pointermove ハンドラに `Net.sendCursor(wp)` 呼び出しを追加(プレゼン中は呼ばない)。
- テスト: 2-peer 収束ハーネス(`test.mjs` 既存パターン)を使い、(a) BC 経路でカーソル
  座標が相手に伝わる、(b) `viaRtc=true` の場合は `_rtcPeerId` に正しく紐づく、
  (c) 存在しないピアへのカーソル更新は無視される、(d) 非有限数(`NaN`/`Infinity`)は
  拒否される、(e) スロットル内の連続呼び出しは送信されない、ことを固定。
