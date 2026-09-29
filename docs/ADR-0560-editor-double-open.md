# ADR-0560: editor 二重オープンの state.editing clobber 修正

## 状態
実装済 (v1.7.588)

## 背景
editor A (text または label) が開いたまま別図形を dblclick すると `openTextEditor` /
`openLabelEditor` が B を生成する。B の `_fc()` でフォーカスが移り A の blur が
**B の `state.editing=B.id` 代入の後に** 発火 → commit パスが `state.editing=null`
を書いて B の追従 (`_teFollow`) と描画スキップ (`s.id===_ed()`) を殺す —
B の本文が canvas と overlay で二重描画される実害。

## 決定
`_cxO()` helper を追加し、両 editor の入口で先行実行:
`if(_teTa)_teTa.blur();if(_lblTa)_lblTa.inp.blur()`。
旧 overlay が新しい editing 代入の前に commit → 順序が決定的になる。
(blur() は focus が移る場合も同じ commit 経路を通るため冪等)

## 影響
- dblclick 連続で editor を跨いでも前の編集が確実に commit され、新 editor の
  `_teFollow`・描画スキップが正常動作する
- `_stickyChain` 経由の再入 (⌘Enter) は既に blur 済みのため no-op で安全
