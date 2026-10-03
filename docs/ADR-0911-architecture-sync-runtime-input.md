# ADR-0911 — architecture.md を ADR-0887–0910 クラスタへ同期

## Context

round660 は docs 同期ラウンド。architecture.md は ADR-0886 頃まで
追従していたため、ランタイム入力面・export 隔離・boot ゲート・
ライフサイクル監査の差分を埋めた。実害コード変更なし。

## Synced rules

- **ランタイム入力面** (ジェスチャ節): `setPointerCapture` 全サイト
  try/catch (0906)、primary ボタンのみ arm (0896/0898)、
  `e.target.matches?.()` (0909)、passive/preventDefault/touch-action
  3条件監査完走 (0908)
- **per-shape 隔離** (export 節): `_dS` export ループ隔離 (0907) +
  ミニマップ同型 (0887)、`_mapToBox` 零extent・`esc()` ガード
  (0888–0891)、editor overlay の `_gridVer`+`_teFollow` 追従
  (0892–0894)
- **IDB 節**: intake 全経路 `validShape`/`_vPages`/`_vpOK`/`validClock`
  gated (0905)
- **新節「ブート・外部入力の検証」**: localStorage `board.peer`/`theme`
  検証 (0904)、wake lock 再取得・clipboard 検出/fallback・error
  surface 不在の設計判断 (0910)

## Gate

`node test.mjs` 2921 pass, 0 fail。index.html raw 変化なし (V bump のみ)。
