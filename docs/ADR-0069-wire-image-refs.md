# ADR-0069: ワイヤーレベル画像参照 (op/snapshot の img 参照化)

## 状態

採用 (v1.7.127)

## 背景

ADR-0031 で永続化層の画像バイトを content-hash blob に分離したが、
**通信経路 (BroadcastChannel op・WebRTC op・snapshot) では依然として
dataURL 本体が op にインライン**で流れる:

- `add` op に 1.6MB の画像が入るとそのまま JSON 化して全ピアに送信。
- snapshot (`_snapshotMsg`) は全シェイプを送信 — 画像が大半を占める。
- さらに RTCDataChannel は **~256KB/メッセージ**が現実の上限 —
  大きな画像を含む op は `dc.send` が静かに失敗し得た
  (RTC 経路では事実上画像同期が壊れていた可能性)。

## 決定

- **送信側**: `Net.broadcast(op)` で `add`/`addMany` のシェイプを
  `_imgSlim` に通し、`img` 参照 + 別メッセージ `{k:'img',key,seq,n,data}`
  として **op より先に**両チャネルへ送出 (`_flushImgOuts`)。
  data は 64KB チャンク分割 — DataChannel のサイズ上限を恒久的に回避。
  op 重複排除は `_imgSent` (セッション累積、同一 blob は1回のみ)。
- **snapshot**: `_snapshotMsg` 内で `ops`/`shapes` 双方をスリム化。
  重複排除は**フレッシュ Map** — 後から参加したピアにも blob が必ず届く
  (送信側は全参照 blob を毎回放出、受信側は冪等に格納)。
- **受信側**: `{k:'img'}` → `_imgChunks` で再構成 → `_imgIn` 格納。
  op/`_mergeSnapshotOp`/`_applySnapshot` 入口で `_attachShape` が
  `img` 参照を `dataUrl` に復元。未着の参照は `_imgPending` (shapeId→key)
  に保留し、blob 到着時に該当シェイプへ直接補完 + invalidate。
- **対象外 — 共有リンク**: URL そのものが輸送路であり blob を別配送する
  経路が存在しない (サーバーレス)。`exportToUrl` のペイロードは従来どおり
  インライン。これはスコープ判断であり不具合ではない。

## 断念した代替案

- **共有リンクも参照化**: 上記のとおり輸送路なしで不可能。
- **`img` op として history に記録**: blob は描画データであり undo 対象
  ではない — ephemeral メッセージとして分離 (cursor/selection と同列)。
- **ピアごとの送信済み管理**: 現在は bc+dc の2チャネルに一律送信 —
  厳密には冗長だが、参照 blob の合計はボードの画像総量に比例し
  追跡コストに見合わない。
- **チャンキングなし**: 単一巨大メッセージは DataChannel 上限に抵触 —
  分割は必須要件。

## 影響

- 画像を含む op/snapshot のワイヤーサイズが大幅減 (参照は ~20 文字)。
- RTC 経路で大きな画像が届かなかった潜在的な不具合を解消。
- 旧版 Board: `k:'img'` は未知 kind として無視、スリム化された `add` op は
  `img` キー付き shape として受理 (dataUrl なしの画像プレースホルダ表示)。
  相互運用でクラッシュしないことを確認。
- 永続化・履歴・共有リンクは変更なし (ワイヤー表現のみ)。
