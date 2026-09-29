# ADR-0466 — ルーム切替で受信再組立もリセット

## 状態

実装済 (v1.7.499)

## 背景

ADR-0464 で `_imgSent`/`_imgChunks`/`_imgOuts` を room-scoped にリセットしたが、同じスロット型の **`_snapIn`/`_opcIn`** (snap/opc フラグメント受信再組立) が残っていた。dc.onclose では既にクリアされる (ADR-0385/0446/0448) が、BroadcastChannel の張り直しでは残存していた:

- 旧ルームで受信中だった部分ストリーム `{p:[],g,n}` が新ルームへ持ち越される
- 新ルームのピアが同じ `n` の snap/opc ストリームを送ると、**旧ルーム由来の seq チャンクと新ストリームが継ぎ接ぎ**に — join した JSON が破損 → `JSON.parse` 失敗でドロップ (自己修復はするが 1 ストリームが無駄)
- ADR-0454 の n-mismatch 再起動ではカバーできない「同 n の継ぎ接ぎ」

## 決定

`Net.init` の ADR-0464 行に `this._snapIn=null;this._opcIn=null` を追加。`_fragIn` のスロットは BC/RTC 共有なので、clear で進行中の RTC 転送が再起動することになる — 稀な同時遷移で影響は 1 ストリームの再送のみ。

## 影響

- ルーム切替直後の初回 snapshot/opc が常にクリーンな状態から再組立される — 継ぎ接ぎ破損の窓を排除。
