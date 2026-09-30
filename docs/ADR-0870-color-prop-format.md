# ADR-0870 — wire の色 prop に書式検証 (invalid CSS color の代入無視で前 shape の色が漏れる)

## Status
採用 (v1.7.896)

## Context
ADR-0868 (opacity/size/fontSize の値域ゲート) と同型の残穴:
`stroke`/`fill`/`color` は validPatch で文字列型+≤600 長のみ検証で書式は未拘束だった。
Canvas の `fillStyle`/`strokeStyle` は**無効な CSS 色を静黙に無視する**
(代入前の値を保持する) — そのため、リモートが `{stroke:'bogus'}` を送ると
被害 shape が前に描画した shape の色で描かれる、同 ignored-assignment 系の実害。

侵入経路は広い:
- wire op (`upd`/`add`/`addMany`/`replace`/`snapshot`) — `validShape`→`validPatch`
- SVG インポータ `_svgColor` — `url(#x)` を解決しなければ任意文字列をそのまま返し、
  drawio/excalidraw インポータも生の色文字列を持ち込む (ADR-0796 で wire parity 化済)
- DOM シンク (label editor の `style.color`) も代入無視型

ローカル生成元は全て安全 (パレット hex、`'transparent'`、`'none'` センチネル、
`_gC('--brand')` の computed 値、STICKY_COLORS) — 書式ゲートで落ちる正当値はない。

## Decision
`validPatch` に色 prop 書式ゲートを追加:

```js
const _CSS=typeof CSS!=='undefined'?CSS:null;
const _colOK=v=>v==='none'||(_CSS?_CSS.supports('color',v):/^#[0-9a-fA-F]{3,8}$|^[a-zA-Z]+\([^)]{0,80}\)$|^[a-zA-Z]{1,20}$/.test(v));
for(const k of['color','stroke','fill'])if(p[k]!=null&&!_colOK(p[k]))return false;
```

- **`CSS.supports('color',v)` 優先** — 名前色のホワイトリストは regex で書けない
  (`rebeccapurple` vs `bogus`) のでプラットフォームパーサに委譲。
  `#rgb`/`#rrggbb`/`#rrggbbaa`、`rgb()/rgba()/hsl()/hsla()`、全 CSS 名前色を受理。
- **`v==='none'` センチネル保護** — `fill:'none'` は Board の「フィルなし」記号
  (ADR-0288、drawio transparent parity)。CSS 色ではないので別扱いが必須。
- **非 DOM フォールバック** — `CSS` 未定義の環境 (テスト) では構造 regex に倒す:
  hex/`func(...)`/短いアルファ名を受理。偽名色は素通しするが、canvas が存在しない
  環境では ignored-assignment の実害自体が起きないので過剰厳格である必要なし。

## Consequence
- `{stroke:'url(evil)'}`、`{fill:'rgb('}`、`{color:';x:#fff'}` 等は wire で棄却
- SVG/drawio/excalidraw インポートの未知色も同じゲートで棄却 → 両経路で発散なし
- コネクタ/pen/sticky 全型で共通 — `color` は sticky 色として `c.fillStyle=s.color` に直行

## Test pin
`test.mjs` に `globalThis.CSS` スタブ (正しい色構文=受理、junk=棄却を mirror) と
9 behavioural asserts: url()/非色語/malformed rgb()/宣言注入の棄却 +
hex/rgba()/transparent/none/named の受理 (`validRemotePayload({op:'upd',...})` 経由)。

## 追記: draw.io `default` キーワード

draw.io は `fillColor=default` / `strokeColor=default` を書き出す (drawioToShapes がそのまま s.fill/s.stroke に載せる)。CSS color ではないため validShape が shape ごと拒否し、import で図形が消える・既存 doc の load で図形が消える回帰になる。`none` と同じく Board 側の既知トークンとして `_colOK` で通す。
