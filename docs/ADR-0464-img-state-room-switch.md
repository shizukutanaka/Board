# ADR-0464 — ルーム切替での画像転送状態リセット

## 状態

実装済 (v1.7.497)

## 背景

`Net.init` (room switch) は ADR-0458/0459 で `bye`・`seenOps`・`_snapT`・peers を掃除するが、**画像 blob 転送の3状態が持ち越されていた**:

- `_imgSent` (送信済み blob の dedup キー) — 新ルームのピアはまだ blob を持っていないのに、`_imgSent` があるため再送が抑制され、`img` 参照だけが届いて受信側の `_imgPending` に永久滞留 (画像が表示されない)
- `_imgChunks` (受信再組立の部分ストリーム) — 旧ルーム由来の部分チャンクが残る (ADR-0454 の n-mismatch 再起動で自己修復はするが、衛生上は掃除すべき)
- `_imgOuts` (送信キュー滞留分) — 旧ルーム宛ての未送出チャンクが新ルームへ流れる

ADR-0458 と同根の lifecycle バグ: BC channel は room ごとに張り直されるのに、room-scoped な転送状態だけが跨いでいた。

## 決定

`Net.init` で `_imgSent.clear()` + `_imgChunks.clear()` + `_imgOuts.length=0`。`_imgIn` (受信 blob キャッシュ、content-hash 住所付け) と `_imgPending` (滞留 ref — 新ルームのピアが同じ blob を送れば解決する) は保持。

## 影響

- ルーム切替後、新ピアは画像を正しく受信する (従来は blob が届かず `_imgPending` に留まり、`_imgIn` に残っていない限り描画不可)。
- 既存 blob は `_imgIn` にキャッシュ済みなので re-emit のコストは送信側の再チャンク化のみ。
