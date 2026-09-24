# ADR-0412: text wrap の drawio/excalidraw 完全往復 + shorthand fold

## 状態
実装済 (v1.7.447)

## 背景
ADR-0411 の `s.wrap=0` 正規化で見えた2件の往復欠落:

1. **drawio**: emit が `s.wrap===0` の時のみ `whiteSpace=nowrap` を出力
   — `wrap` 未設定の通常 text (Board 既定=非折返し) が drawio で
   幅折返しに化ける。Board の wrap は opt-in (`wrap:1`) だが drawio の
   既定は wrap — 無印の text 全てが非対称だった。
2. **excalidraw**: `autoResize` は `true` 固定 emit で import は未読
   — `wrap:1` text が excalidraw 往復で wrap 消失。bound text は
   exc 仕様上 `autoResize:false` (コンテナ幅折返し) だが `true` を
   出していた。

## 決定
- drawio emit を `t==='text'` で常時出力: `s.wrap?'whiteSpace=wrap':'whiteSpace=nowrap'`。
- drawio import は `nowrap`→`wrap=0` に加え `wrap`→`wrap=1` を復元
  (従来 wrap 側は未定義=非折返しに落ちていた)。
- excalidraw emit: standalone text は `autoResize:!s.wrap`、
  bound text (`_ct`) は `autoResize:false` (コンテナ幅折返しの正しい表現)。
- import: `e.autoResize===false` → `s.wrap=1`。
- shorthand fold: `_rAF` (requestAnimationFrame×7), `_pF` (parseFloat×6),
  `_lg/_ls` (localStorage get/set ×4 ずつ) — ~190B 回収。

## 影響
- Board の text wrap 挙動が .drawio/.excalidraw で正確に往復する
  (非折返し既定・opt-in 折返し・bound text 折返しの全経路)。
- 回収した ~190B で往復修正 (~120B) を相殺。

## 断念した代替案
- bound text の `wrap` prop を別途追跡: `_ct` はコンテナ幅で常時折返しと
  いう Board の挙動そのものなので prop 追加は不要。
