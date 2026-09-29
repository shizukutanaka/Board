# ADR-0422: `_zoomToFrame` の zoom を clamp + 退化 frame ガード

## 状態
実装済 (v1.7.457)

## 背景
プレゼンテーションモードの frame 遷移 `_zoomToFrame` が
`zoom=_min(scaleX,scaleY,4)` のみで `clampZoom` を経由していなかった:

- 巨大 frame → zoom が MIN_ZOOM を下回り viewport が破綻
- `frame.w`/`frame.h` が 0/負 (import 経由の退化図形) → scale が
  ±Infinity/NaN → `_min`/`_max` は NaN を伝播 → `v.zoom=NaN` で
  全描画が blank になる実害

## 決定
`zoom` を `clampZoom(_min(scaleX,scaleY,4))` に通し、`_fin` ガードで
非有限時は 1 にフォールバック:

```js
const zoom=_fin(scaleX)&&_fin(scaleY)?clampZoom(_min(scaleX,scaleY,4)):1;
```

`_vp().x/y` のセンタリング計算もそのまま clamped zoom を使うため
整合は保たれる。

## 影響
- プレゼン遷移が退化/巨大 frame で viewport を破壊しなくなる。
- 他の zoom 書込みサイト (`zoomAt`/`_fitViewport`/import/viewport
  restore) は既に `clampZoom` 経由 — これで経路が完結。

## 断念した代替案
- `clampZoom` 内で `_fin` ガード: 入口が複数あり、ここでは最小修正に
  留めた (全書込みサイトの監査ではこれが唯一の抜け)。
