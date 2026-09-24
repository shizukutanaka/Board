# ADR-0362: `_vp()` live-read shorthand for state.viewport (~810B 回収)

## 状態
承認 — round87

## 背景
`state.viewport` は 79 箇所で参照される長い識別子 (14文字)。
`.x`/`.y`/`.zoom` への頻出アクセスを shorthand 化して余白を回収する。

## 断念した代替案
`let _vp=state.viewport` (参照エイリアス) — test.mjs を含む呼び出し側が
`state.viewport={x,y,zoom}` と**オブジェクトごと差し替える**慣習がある
ため、参照捕捉すると差し替え後の新オブジェクトを見逃す静かな劣化
(`_vp.zoom` が古い値に張り付く) になる。

## 決定
`const _vp=()=>state.viewport` — 関数形の live-read shorthand。
`_vp.x` → `_vp().x`、`_vp.zoom` → `_vp().zoom`、`Object.assign(_vp(),..)`、
`{..._vp()}`、`viewport:_vp()` に展開。関数のため TDZ も発生しない。

## 影響
-~810B (79 uses)。2044 全緑。
