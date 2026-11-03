# ADR-1209 — svgToShapes: `<g>` のプレゼンテーション属性を継承させる

## 背景

`svgToShapes` の `visit(el,m)` は親子で **変換行列 `m2` だけ**を積んで降りる
(`m2=_svgMMul(m,_svgMOf(el.transform))`)。スタイルは `_svgStyle(el,_grad)` が
要素自身の属性とインライン `style` だけを読む。

ところが SVG では `fill`/`stroke`/`opacity`/`font-size`/`stroke-width` 等の
プレゼンテーション属性は**子孫へ継承**する。実在の SVG は `<g fill="…">` で
まとめて塗るのが普通で、要素自身に属性がなくても描画される — しかし
インポータはそれを捨て、**囲まれた図形が fill/stroke なし・full opacity・
デフォルト font-size で取り込まれる**不一致があった (ADR-1207/1208 と同型の
「適用経路の片側だけが存在する」系の漏れ)。

## 決定

`visit` に継承スタイルコンテキスト `inh` を追加し、行列と同じパスで伝播:

```js
const own=_svgStyle(el,_grad);
const st={...inh,...own};                        // child overrides the group
if(own.opacity!=null&&inh.opacity!=null)
  st.opacity=_max(0.05,+(own.opacity*inh.opacity).toFixed(3));
for(const c of el.children)visit(c,m2,st);
```

- 継承は `{...inh,...own}` — 子の属性が常に優先。
- `opacity` だけは SVG のグループ合成に倣って**積算** (他の属性は override)。
- `fontSize` は text shape が `_smk` で焼き込む値の前段なので、`_oa` へ渡す
  コピーでは従来どおり削除 — 継承 fontSize が rect 等に漏れない。
- s が null のノード (`<g>`/`<defs>` 等) でも `st` は子へ伝播する。

## 検証

test.mjs に 6 挙動ピン: `<g fill="#f00" stroke="#00f" opacity="0.5">` の中の
裸 rect → fill/stroke/opacity 継承、子属性が勝つ、opacity は 0.5×0.5=0.25、
`<g font-size="40">` が nested text へ届き、rect には漏れない。
