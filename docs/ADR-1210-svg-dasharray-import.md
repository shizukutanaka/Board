# ADR-1210: SVG インポートで `stroke-dasharray` → `s.dash`

round960 / v1.8.234

## 背景

SVG インポートの適用漏れシリーズ (ADR-1207 寸法行列、ADR-1208 angle、ADR-1209 スタイル継承)
の続き。今回は**往復 (round-trip) 非対称**:

- Board の SVG **エクスポート**は `stroke-dasharray="…"` を出力する (7878 行付近)。
- しかし `svgToShapes` の `_svgStyle` はそれを読んでいなかった。
- 結果: 破線の図形を SVG エクスポート → 再インポートすると**実線に戻る**。
  自分の吐いた属性を自分が読めない、最も直接的な不対称。
- 他のインポータは線スタイルを取り込んでいる: mxgraph は `dashed=1` + `dashPattern`
  (ADR-0255, 7027 行付近)、excalidraw は `strokeStyle` (`'dashed'→1`/`'dotted'→2`)。
  SVG だけが線スタイルを黙って落としていた。

## 決定

`_svgStyle` に `stroke-dasharray` の読み取りを追加。`get()` が属性と `style=""` の
両形を見るので、どちらで書かれても届く。

破線/点線の判定: **先頭セグメント長 ≤ stroke-width なら点線 (dash=2)、より長ければ破線
(dash=1)**。根拠は Board 自身の `dashArr`:

- 点線: `[size*0.5, size*2]` — 先頭セグメントは線幅の半分
- 破線: `[size*3, size*2.5]` — 先頭セグメントは線幅の 3 倍

つまり自分のエクスポートを再インポートすれば同じスタイルに戻る。
SVG 一般でも「先頭セグメントが線幅より短い = ドット列」は広く成り立つ。

`stroke-dasharray="none"` や空値は実線のまま (dash を付けない)。
プレゼンテーション属性なので `<g stroke-dasharray="…">` は ADR-1209 の継承
コンテキスト `{...inh,...own}` で子孫へ自動到達 — 追加コード不要。

実装 (~7453):

```js
const da=_trm(get('stroke-dasharray')||'');
if(da&&!/^none\b/.test(da)){
  const d0=_pF(da.split(/[\s,]+/)[0]);
  if(_fin(d0))st.dash=d0<=(st.size||2)?2:1
}
```

## 対象外

- `stroke-linecap="round"` 単体での点線扱いは行わない (仕様上は linecap だけでは
  破線にならない。`0 4` のような 0 長セグメント + round cap の実ドットは先頭値 0 で
  点線判定に自然に収まる)。
- `stroke-dashoffset` は Board に対応プロパティがないため読まない。

## 検証

test.mjs に 5 挙動ピン:

1. `stroke-dasharray="8 4"` (stroke-width 2) → `dash===1`
2. `stroke-dasharray="0.5 4"` → `dash===2` (先頭セグメント ≤ 線幅)
3. `stroke-dasharray="none"` → dash なし
4. `<g stroke-dasharray="6 3">` → 子の rect が `dash===1` (継承到達)
5. `style="stroke-dasharray: 10 5"` → `dash===1` (inline style 形)
