# ADR-0867: `dataUrl` 取込上限を wire 境界へ一致させる

## Context

`_imgImportFile` (drop/paste/picker の共有画像取込) は `reader.result` を
`> 16*1024*1024` で棄却していたが、wire 側 `validPatch` は
`dataUrl ≤ 16_000_000` 文字を要求する (ADR-0379)。2つの「16MB」定義が異なり、
`dataUrl ∈ (16_000_000, 16_777_216]` の ~777KB の窓ではローカルが画像 shape を
commit し、送出した op が全ピアの `validPatch` で棄却される発散が発生し得た。
ADR-0866 (pen pts / waypoint) と同じ「ローカル受理・ピア棄却」クラスの残存分岐。

## Decision

ローカル棄却境界を wire 定数と一致させる: `> 16_000_000`。

引数は `reader.result` (dataUrl 文字列そのもの) なので、比較対象は wire が見る
`s.dataUrl` と完全に同一の値 — 両側で byte-for-byte 一致する。

## Consequences

- 窓を通る画像はローカルでも早期棄却+toast → 発散経路を閉塞
- 全 intake で「`dataUrl ≤ 16_000_000`」の単一定義に統一
- ADR-0866 と合わせて「ローカル受理・ピア棄却」クラスは既知の全経路で閉塞
  (text 5000 / label 80 / link scheme+500 / docName 80 / pageName _s80 /
  pts 50000 / way 200 / dataUrl 16_000_000)

## Tests

- drop 画像 `__dataUrl` > 16_000_000 → 形状追加なし (FileReader スタブ経由)
- `__dataUrl` = 16_000_000 ちょうど → 受理
