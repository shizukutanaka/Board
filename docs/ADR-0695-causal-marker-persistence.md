# ADR-0695: 因果マーカー (_lastRep/_nameTs) の IDB 永続化

## Status
Accepted — round445

## Context
`wc` (per-shape LWW) は 0460 で doc record 同梱済みだが、同じ因果クラスの
`_lastRep` (swap 世代) と `_nameTs` (改名時計) は永続化されていなかった:
- リロード後 `_lastRep=null` → peer の pre-swap snapshot が wipe 済み図形を復活
- `_nameTs=0` → peer の古い rename/snapshot-name が新しい local 名を上書き

さらに `Net.init` の無条件リセット (0619) が boot 時の復元を打ち消していた。

## Decision
- doc record に `rep`/`nts` を同梱し `validClock`/`_iN` で復元
- `Net.init` のリセットは `state.roomId && roomId が変化` の時のみ (boot で据置)

## Tests
3 asserts: room 切替でリセット (0619 追従) + boot init は復元値を保持 + 0692/0693/0694 ピン維持
