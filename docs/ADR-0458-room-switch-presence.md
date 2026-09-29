# ADR-0458 — ルーム切替時のプレゼンス掃除

## 状態

実装済 (v1.7.492)

## 背景

`Net.init(roomId)` はチャンネルを閉じて新ルームへ付け替えるだけで、二つの抜けがあった:

1. 旧ルームへ `bye` を送らない — 旧ルームの残ピアに自分のカーソル/選択が 15 秒残る。
2. `state.peers` を掃除しない — **旧ルームのピアがそのまま新ルームに持ち越され**、`lastSeen` reap (15 秒) まで別ルームのゴーストカーソル・選択ハロー・接続数が表示される。

## 決定

`init()` の先頭で、旧チャンネルへ `{k:'bye',peer:_pi()}` を送ってから `bc.close()` (ADR-0457 と同じメッセージを既存の `_send` で — この時点で `this.bc` はまだ旧チャンネル)。続いて `rtc:` で始まらないピア entry を全削除して `_ivO()`:

```js
if(this.bc){try{this._send({k:'bye',peer:_pi()});this.bc.close()}catch(_){}}
for(const id of _pr().keys())if(!id.startsWith('rtc:'))_pr().delete(id);_ivO();
```

RTC ピア (`rtc:` プレフィックス) は残す — WebRTC の DataChannel はルーム切替で閉じないため (ADR-0010 の lifecycle 管理と同じ規約。`_reapPeers` の `startsWith('rtc:')` 除外と一致)。

## 影響

- 旧ルームの残ピアが自分を即時に除去 (bye が届かない場合は従来どおり 15 秒で reap)。
- 新ルームに他ルームのプレゼンスが漏れ出さない。新ルームでは hello が再送され正規のプレゼンスが即時に再構築される。
