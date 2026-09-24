# ADR-0473: wire キャップ整合 — zorder frac キー / group id の長さ制限

## 状態

実装済 (v1.7.506)

## 背景

`validPatch` は文字列 prop に 600 文字 (`text` は 5000) の上限を課す (ADR-0369)。しかし
`validRemotePayload` には同じ値を経由して board に侵入する経路が残っていた:

1. **`zorder` op の `changes[].before/after`**: `_iS` のみ検査し長さ無制限 — remote が 10MB の
   `frac` を `s.frac` へ直接書き込めた。以後の `sortZ()` は巨大文字列を比較し、compaction
   (ADR-0471/0472) が治すまでは再送出にも乗る。
2. **`group`/`ungroup` op の `gid`/`gids`**: `_iS`+非空のみ — `s.groupId` へ無上限文字列。
   `groupId` 自体は upd 経路では 600 キャップがあるのに、この専用 op 経路では bypass。

## 決定

- `zorder` change の `before`/`after` を **600 文字**でキャップ (validPatch の `frac` 上限と一致)。
- `group.gid` / `ungroup.gids[]` を **64 文字**でキャップ (uid 生成長の倍、ADR-0388 の shape id
  上限と一致)。

いずれも正規の local 生成値は桁違いに小さい (`uid()`=12〜36文字、frac は compaction により
実用上 <600) ため、正当な op を弾くことはない。

## 影響

- `s.frac`/`s.groupId` への oversized 注入経路を閉塞 — wire 層の長さ検査が payload 形式と整合
- 回帰テスト: `validRemotePayload` に対する境界値検査を追加 (<=600/64 受理、超過は棄却)
