# ADR-0839 — 実部屋切替で RTC リンクを閉じる

## Context

`Net.init` の部屋切替リセットは 0458/0467 で導入されたが、`rtc:` presence 行は
意図的に**温存**されていた — RTC リンクが部屋を跨いで生きる前提だった。

しかし wire の op/envelope は**ルームタグを持たない**。RTC リンクを維持したまま
ローカルが部屋を切り替えると:

- リモートの旧部屋 ops がローカルの**新**部屋へ適用される (混入)
- ローカルの新部屋 ops がリモートの**旧**部屋へ送信される (混入)

リモート側が切替を追随するプロトコルも存在しないため、リンク存続は必ず
双方向の cross-room 汚染になる。部屋切替のたび全量 snapshot 交換する設計でも
ないので「新部屋で再同期」も起きない。

## Decision

実部屋切替 (`state.roomId` 非空 かつ 新 `roomId` と不一致) で
`this.dc.close()` + `this.rtc.close()` を行う。`dc.onclose` の既存 cleanup
(自身の presence 行 purge・`_dcQ`/`_snapIn`/`_opcIn`/`_dcQB` リセット・
`disconnected` トースト・`_onConnChange`) が自然に発火し、リモート側も
同じ `onclose` で正常終了する。`this.dc`/`this.rtc` の null 化は不要 —
`_sendDC` は `readyState==='open'` ゲート済み、pc ハンドラは 0822 の
ref 同一性ゲート済み。

ブート時の初回 init・同一部屋への re-init では閉じない (既存の条件分岐内に
配置 — ブート init は `state.roomId` null で条件不成立)。

## Test

`Net.init` に stub dc/rtc を差し替えて実呼び出し、部屋切替で両方の `close()`
が呼ばれることをピン。
