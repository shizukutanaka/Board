# ADR-0017 — WebRTC 接続失敗のユーザーフィードバック (FT-20)

- Status: Accepted
- Date: 2026-09-23
- Ticket: `docs/feature-backlog.md` FT-20

## 問題

手動シグナリング WebRTC のトークンを交換した後、NAT/ファイアウォール越えで
ICE が失敗した場合、DataChannel は `open` イベントを一度も発火しない。
その場合 `dc.onclose` も発火しないため(仕様上 `close` イベントは `open` 済み
チャネルにのみ送られる)、ユーザーは**無反応のまま待ち続ける**。

`_wrtcInit` が作る `RTCPeerConnection` には
`onconnectionstatechange` / `oniceconnectionstatechange` が配線されていなかった。

## 検討した状態機械

| ケース | connectionState | dc.onopen | dc.onclose | 従来の表示 |
|---|---|---|---|---|
| 接続成功 | `connected` | 発火 | — | `connected` toast |
| open しないまま ICE 失敗 | `failed` | — | — | **なし**(FT-20) |
| open 後に ICE 失敗 | `failed` | 発火済 | 発火しうる | `disconnected`(最大二重) |
| 正常終了(相手が閉じる) | `closed` | 発火済 | 発火 | `disconnected` |

`connectionState === 'disconnected'` は Chrome では一過性の遷移として頻繁に
発火する(ICE 再試行中)ため、トースト対象から外す。

## 決定

1. `_wrtcInit` で `rtc.onconnectionstatechange` を配線し、
   `connectionState==='failed'` で `t('connectFailed')` の warn トーストを出す。
   同時に `this._rtcConnFailed = true` を立てる。
2. `dc.onclose` は `_rtcConnFailed` が立っているとき `disconnected` トーストを
   抑制する(ケース3の二重トースト防止)。ピア掃除(`state.peers` からの削除 +
   `_onConnChange`)は従来通り実行する — failed 時に `onclose` が来ないケースでも
   failed ハンドラ側で同じ掃除を冪等に行う。
3. `_wrtcInit` は新しい `RTCPeerConnection` を作るたび `_rtcConnFailed=false` に
   戻す(再接続で抑制状態が残らないように)。
4. i18n は ja/en 両方に `connectFailed` を追加。

### 却下した案

- `oniceconnectionstatechange` も併用: `connectionState` は ICE・DTLS の
  集約状態なので二重イベントになるだけ。片方で足りる。
- `disconnected` 状態でもトースト: 一過性遷移で誤報が出る。failed 確定まで待つ。
- 失敗時の自動再試行: 手動シグナリングでは相手側の新 answer が要るため
  自動再接続できない。トーストで人間に返すのが正しい境界。

## 検証

fake-DOM ハーネスは `RTCPeerConnection===undefined` のため結合検証は
実ブラウザ依存(FT-20 チケット記載の前提)。今回は playwright-core で
同機2ページ間の loopback DataChannel を確立できることを確認済みのため:

- 実ブラウザ: A→offer token → B→answer token → A consume で `connected`
  toast + ピア表示、B ページ閉鎖で A に `disconnected`(failed ではない)
- `connectionState` を getter で `'failed'` に偽装してハンドラを直接駆動し、
  `connectFailed` toast + `dc.onclose` 経由の二重トースト抑制を確認
- `node test.mjs`: presence チェック(onconnectionstatechange 配線、
  `_rtcConnFailed` ゲート、i18n キー ja/en)
