# ADR-0366: 関数 shorthand 一括化 (~1.8KB 回収)

## 状態
承認 — round90

## 背景
`invalidate()` ×103、`UI.toast(` ×134、`sortZ`×21 など長い関数名が
頻出。関数は再代入されないため `const _x=fn` エイリアスで安全
(live-read 関数形は不要)。

## 決定
`_iv=invalidate` `_ivO=invalidateOverlay` `_tst=UI.toast`
`_iG=_invalidateGrid` `_aS=_announceSel` `_iD=invalidateDamage`
`_sz=sortZ` — 計320箇所変換。
**`function X(){}` 定義サイトは literal のまま** (bulk replace が
`fn(` パターンで def 名も書き換える罠への対処 — 置換後に
`function _sz(){` 等を本名へ逆復元した)。

## 影響
-~1.8KB。2044 全緑。
