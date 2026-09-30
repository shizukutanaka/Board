# ADR-0868: numeric prop の値域ゲート

## Context

`validPatch` の数値ホワイトリストは型 (`typeof number`) のみで値域は未拘束だった
(geometry ±1e7・`size ≤1e4`・`aF/bF 0..1` を除く)。canvas2d は範囲外の代入を
**黙って無視する**仕様のため、リモートが注入した異常値は「前の shape の描画状態が
次の shape に漏れる」非決定描画を引き起こす:

- `opacity < 0 || > 1` → `ctx.globalAlpha` への代入が無視され前 shape の alpha が漏れる
- `size ≤ 0` → `ctx.lineWidth` への代入が無視され前 shape の幅が漏れる
- `fontSize ≤ 0` → `'bold -5px X'` 等の無効 font 文字列で代入が無視され前 font が漏れる
- `fontSize` 巨大値 → グリフ・ラスタ化の停滞可能性

ローカル側の生成値は全て範囲内 (rngOpacity 0.1..1、digit 0..1、marker 0.4、
drawio/excalidraw importer クランプ、fontSizeStep 8..64、drawio ≤200) なので、
境界はローカル生成値を棄却しない。

## Decision

`validPatch` に範囲ゲートを追加:

- `opacity` は `[0, 1]` のみ受理 (0/1 は合法代入 — 不可視化は `visible` の仕事だが
  0 は値として正規)
- `size`・`fontSize` は `(0, 1e4]` のみ受理 (≤0 は無効代入、>1e4 はラスタ停滞)

他の numeric prop は確認済みで追加不要: `roundRect` は `r` を `_max(0,…)` で
クランプ、`dashArr` は未知値で `[]` 返却、`rotate` は三角関数で自由、`z` は
順序値のみ、`spacing`/`lineH`/`labelPos`/`cbend` は決定的な cosmetic 効果のみ。

## Consequences

- リモート注入値による前 shape 状態漏れを閉塞 — 描画が shape 順序以外の要因に
  依存しなくなる
- ローカル生成値は全て受理 (発散リスクなし)

## Tests

- `validRemotePayload` 経由で `opacity:1.5/-0.1`、`size:0`、`fontSize:0/2e4` を
  棄却、`{opacity:0.5,size:2,fontSize:16}` を受理
