# ADR-0631: resize の trailing-edge debounce

- 状態: 実装済
- 日付: 2026-09-28

## 背景

`resize()` は両 canvas のバッキングストアを再確保する
(`canvas.width = cssW * DPR` — 4K では 1 回 ~33MB×2)。従来
`window`/`visualViewport`/`orientation` の resize イベントに即時反応
していたため、OS のウィンドウドラッグや iOS の URL バー収縮
アニメーション (フレーム毎に連続発火) で「ドラッグのピクセル毎に
全バッファ再確保」というイベント嵐になっていた。

## 決定

`_resizeSoon` (150ms trailing-edge) を導入し、3 系統のリスナーを
全てデバウンス経路へ。`_watchDPR` の media-query 発火は単発のため
直接 `resize` のまま。

## 影響

- ドラッグ中の再確保が連続発火→終端 1 回に集約。見た目は CSS
  サイズが追従するためドラッグ中の伸縮は維持、確定時に内部解像度が
  再計算される。
- `resize` 自体は export のまま (boot/DPR/他の直接呼出し経路は不変)。
