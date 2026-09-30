# ADR-0871 — 描画消費 prop の書式監査完走 (canvas/DOM sink ゲート行列)

## Status
採用 (v1.7.897、docs のみ)

## Context
ADR-0868 (数値値域) と ADR-0870 (色書式) で閉塞した「canvas が無効値の代入を
静黙に無視し、前 shape の描画状態が被害 shape に漏れる」系の実害。
残りの全描画 sink を棚卸しし、ゲート網羅性を確認した。

## Audit matrix — 描画消費 prop → sink → ゲート

| prop | sink | ゲート |
|---|---|---|
| `stroke`/`fill`/`color` | `fillStyle`/`strokeStyle` | ADR-0870 `_colOK` (`CSS.supports`) |
| `opacity` | `globalAlpha` | ADR-0868 ∈[0,1] |
| `size`/`fontSize` | `lineWidth`/`ctx.font` | ADR-0868 ∈(0,1e4] |
| `font` | `ctx.font` | `_fontFam` whitelist 写像 (`mono`/`serif`/system) |
| `align`/`valign` | `textAlign`/`textBaseline`/配置 | 全サイト `===`比較で default 退避 |
| `spacing` | `letterSpacing` | 有限数値 (`1e+21px` も CSS 指数表記で受理可能) |
| `lineH` | 行高乗数 (ctx 非代入) | 有限数値 → 決定的 cosmetic のみ |
| `dash` | `setLineDash` | `dashArr`: 1/2 以外 → `[]` (solid) 退避 |
| `head`/`startHead` | arrowhead 描画 | `_arrowHeadShape`: 未知名 → 三角形退避 |
| `fstyle` | hatch 塗り | `==='hatch'`/`'cross'` 比較 → 以外 solid 退避 |
| `type` | 描画分岐 | ADR-0387 `_TYPES` whitelist |
| `shadow` | `shadow*` | ローカル定数のみ |
| `lineCap`/`lineJoin` | ctx | ローカル定数のみ |
| `transform`/`scale`/`translate` | ctx | `_fin`+`_xyOK`+`clampZoom` 済数値 |
| `flip`/`rotate`/`cbend`/`labelPos`/`z`/`elbow`/`curve`/`hop`/`r`/`visible`/`start`/`wrap` | 変換/配置 | 有限数値 → 決定的 cosmetic |

DOM sink は ADR-0863 で完走済 (textContent 着地・`href` http ゲート・
value-typed 代入のみ)。`link`/`dataUrl`/`img`/`id` 系は別 ADR で既ゲート。

## Non-adoption — enum prop の whitelist gate

`head`/`startHead`/`fstyle`/`align`/`valign`/`font` に intake 棄却を
**採用しない**:
- 全て描画側で確定的 fallback を持ち、漏れ・発散の実害がない
- 歴史ボードが旧バージョン由来の列挙値を持ち得る — intake 棄却は
  描画可能な形状自体を落とすため backward compat 上 fallback 維持が正しい

(ADR-0869 の非採用原則「収束を破るゲートは入れない」と併せて記録)

## Consequence
render-consumed prop の format-gate 軸は完走 — 今後の prop 追加は
この表の sink 欄を更新するか、新 sink があれば `_colOK` 型のゲートを
validPatch に追加する。
