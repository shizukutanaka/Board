# ADR-0484: architecture.md wire 節の最新化

## 状態

実装済 (v1.7.517)

## 背景

wire ライフサイクル節 (ADR-0468 追加) は ADR-0467 までの内容に留まり、
続く 0475 (有界 sync-req 再送)・0473/0479 (wire cap 整合)・0474
(スナップショット取込上限の拡張) が未記載だった。

## 決定

- presence tick での sync-req 有界再送 (`_snapRx`/`_snapRetry`、最大 3 回) と
  `Net.init` リセットを「throttle 再送」の直後に追加
- zorder `changes`/`after` の frac ≤600・id ≤64・group gid ≤64 の
  validRemotePayload 遮断 + `SHARE_MAX_SHAPES` への取込拡張を新節で追記

## 影響

- docs/architecture.md のみ。動作変更なし
