# ADR-0840 — IDB 復元のぶら下がり img 参照を _imgPending へ駐車

## Context

ADR-0031 で画像バイトは content-hash の `imgs` ストアへ分離され、doc レコードの
図形は `{img:k}` 参照を持つ。ワイヤ取込 (`_attachShape`) は未解決参照を
`_imgPending` に駐車し、0835 の heartbeat imgq sweep が再要求を出す。

しかし IDB 復元経路 (`Persist.load`・`restoreBackup`) は `_imgAttach` だけで
`_attachShape` を通っていなかった。blob が `imgs` に無い参照 (送信途中切断で
blob が未到達のまま autosave された形状) は `{img:k}` のまま盤面へ戻り、
`_imgPending` に登録されないため **imgq 再要求が一切送出されない**。治癒は
任意キー到着時の straggler 走査 (0629) のみ — ピアが再送しない限り永久に
placeholder のままだった。

## Decision

両復元経路で `_imgAttach` の後に `shapes.map(s=>Net._attachShape(s))` を通す:

- `imgs` ストアに blob がある参照 → `_imgAttach` が既に `dataUrl` 解決済み
- `Net._imgIn` に既に到達済みの参照 → `_attachShape` が即時解決 (リロード直後に
  ワイヤで到着した blob も拾える)
- 未解決 → `_attachShape` が `_imgPending` へ駐車 → heartbeat sweep が imgq を
  送出 (0835/0837) → 応答 blob 到着で `dataUrl` を復帰し盤面も治癒

復元側は wire 形状と同一のライフサイクルに乗る — 新しい駐車経路は増やさない。

## Test

- 両 `_imgAttach` 呼出し直後に `Net._attachShape` 通過があるソースピン
  (load + restoreBackup の 2 サイト一致)。
