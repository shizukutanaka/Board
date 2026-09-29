# ADR-0401: `_bcast` / `_setDocName` / `_dpr` / `_PM` `_PU` `_PC` `_lc` 縮約

## 状態
実装済 (v1.7.438)

## 背景
`Net` の4箇所が `this._send(m);if(this.dc&&this.dc.readyState==='open')try{this.dc.send(_JS(m))}catch(_){}` の
二重送信パターンを逐字で展開していた (cursor/selection/img-chunk)。また docName の適用
`state.docName=n;_g('docName').value=_dn();_syncDocTitle()` が3経路 (importFromHash / .board /
importDrawio) に重複していた。512KB raw 天井との残量が常に数十Bのため、形状化できない
継続的な縮約が必要。

## 決定
- `Net._bcast(msg)` — BroadcastChannel + RTC DataChannel の二重送信を一括化。4箇所を畳んで
  ネット ~120B 回収。`broadcast(op)` (op 本体) は slim 処理を持つため温存。
- `_setDocName(n)` — docName 適用一式 (state + 入力欄 + タイトル) を集約し3箇所を畳む。
- `_dpr=()=>window.devicePixelRatio` — 関数形にした理由: test.mjs の `new Function(window,...)`
  サンドボックスは裸グローバルを持たないため `const _dpr=devicePixelRatio` は評価時点で
  ReferenceError になる (ADR-0391 `_now` と同じ罠だがこちらは **定義側** が壊れる)。
- `_PM/_PU/_PC='pointermove'/'pointerup'/'pointercancel'`、`_lc=s=>s.toLowerCase()`。

## 影響
`window.devicePixelRatio` 参照は `_dpr()` 呼出に、イベント名リテラルは定数に置き換わるが、
配線形式・描画副作用は不変。`msg.peer===_pi()` の自エコー除外は `_onBCMsg` 先頭で維持。
