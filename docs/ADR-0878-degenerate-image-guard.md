# ADR-0878 — デジェネレート (0×0) 画像の棄却

## Status
採用 (v1.7.904)

## Context
`_imgImportFile` は decode 後に `cb(dataUrl,nw,nh)` へ `img.width/height`
をそのまま渡す。`naturalWidth=0` の画像 (寸法情報のない SVG 由来データ
など) でも `onload` が発火し得るため、`cb` が `nw=0,nh=0` で呼ばれ、
呼出側では `w:0,h:0` の不可視図形が盤面に着地するか、`s.w*nh/nw` で
NaN の高さが形状へ書き込まれる (後者は wire gate `_fin` でピア棄却 →
発散の小穴)。既存の `img.onerror` → `imgErr` トースト経路に合流させる。

## Decision
`img.onload` 先頭で `if(!nw||!nh){_wT('imgErr');return}` — decode 失敗と
同一のエラートーストで早期棄却。呼出側3経路 (drop cascade / paste /
replace-image) は全て cb 非到達で no-op になるため一箇所のゲートで完結。

## Consequence
- 不可視図形着地・NaN サイズのローカル受理/ピア棄却発散を閉塞。
- behavioural ピン: FileReader→Image stub (width=0) で cb 未到達 +
  エラートーストを固定 (2 asserts → 2904 pass)。
- 併せて直前のコメント断片 (drop cascade の severed 4行) を修復 (~40B)。
