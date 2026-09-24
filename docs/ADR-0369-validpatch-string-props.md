# ADR-0369: validPatch 文字列 prop 型 + 長さ、数値フラグ網羅

## 状態
承認 — round93

## 背景
ADR-0367/0368 の続き。文字列 prop は `_cleanVal` で「string は OK」と
素通しするため、`upd:{text:123}` の非文字列や、`text` に 1MB の巨大
文字列を注入して毎フレームの wrapText を暴走させる経路が残っていた。
数値フラグ側も `elbow/curve/hop/flip/shadow/r/visible/start` が未収録。

## 決定
- 文字列リスト (typeof==='string'): `text/label/docName/link/groupId/
  img/color/stroke/fill/font/head/startHead/align/valign/type/dataUrl/
  fstyle/a/b` — `a/b` はコネクタ結合先シェイプ id。`dataUrl` は形式
  チェック (下段) があるため型のみ。
- 長さ上限: `text` ≤5000、その他 ≤600 (生成時の slice 上限 240/500 に
  余裕を持たせた値 — 正規 Board 出力は全て内側に収まる)。
- 数値フラグ追加: `elbow/curve/hop/flip/shadow/r/visible/start`。
  `locked` は bool/number 混在のため除外、`aF/bF` は object (ADR-0367)。

## 影響
2044 全緑。test.mjs に ADR-0369 ブロック追加。
