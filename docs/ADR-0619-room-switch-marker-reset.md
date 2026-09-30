# ADR-0619: ルーム切替で因果 marker をリセット

## 状態
実装済 (v1.7.646)

## 背景
`Net.init(roomId)` は `seenOps`/`_snapRx`/img 転送状態/プレゼンストラッカを
リセットするが、ADR-0614 の `_lastRep` (最新適用 swap の clock) と
ADR-0581/0618 の `_nameTs` (改名 LWW 時計) は持ち越されていた。

これらは**wire ドメイン**の状態 — 時計空間はルーム (ピア集合) ごとに独立
している。持ち越すと:

- `_lastRep`: 新ルームのスナップショット `rep` が旧ルームの marker より
  「古い」と判定され `_applySnapshot`/マージが永久に棄却 — joiner が
  空盤面のまま同期しない
- `_nameTs`: 新ルームの改名が旧ルームの時計より小さいと永久に棄却 —
  ドキュメント名が収束しない

## 決定
`init()` のリセット列に `state._lastRep=null;_nameTs=0;` を追加。
`seenOps` と同じ発想 — causal marker はルーム横断で無意味。

## 影響
- ルーム切替後のスナップショット採用・改名収束が正しく動作
- RTC 持越しピアとの混在ケースも、各ピア側の marker 管理で整合
