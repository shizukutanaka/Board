# ADR-0457 — ピア離脱の `bye` メッセージ

## 状態

実装済 (v1.7.491)

## 背景

ピアのプレゼンス (カーソル・選択ハイライト・接続数) は `NET_PRESENCE_TIMEOUT` = 15 秒の `lastSeen` reap でしか除去されない。タブを閉じたピアのゴーストカーソルと選択ハローが残ピアの盤面に最長 15 秒残り、peer カウントも実態とずれる。

## 決定

`pagehide` (ADR-0453 で flush に使用済み、iOS Safari でも最後に確実に届くシグナル) で `{k:'bye',peer:_pi()}` を `_bcast` し、受信側で:

```js
case 'bye':{
  const pk=viaRtc?this._rtcPeerId:msg.peer;
  if(pk&&_pr().delete(pk)){_ivO();if(this._onConnChange)this._onConnChange()}
  if(viaRtc)this._rtcPeerId=null;
```

DC 経路 (`viaRtc`) では合成 id `_rtcPeerId` を参照・消去する — ADR-0010 の経路選択と同じ規約。`pagehide` はページ遷移・リロードでも発火するため、リロード後は新たに `hello` を送り直す既存挙動と整合する (一時的な再登場は従来どおり)。

## 影響

- ピアのカーソル/選択/接続数が離脱即時に消える。BC の postMessage は pagehide 中でも同一プロセス channel へ配送される。
- `bye` を送れなかった場合 (クラッシュ等) は従来どおり 15 秒の reap がフォールバック — 悪化なし。
