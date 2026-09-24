# ADR-0185: スポイトの全ルックプロパティ吸収 + start 継承

## 状態

実装済み (v1.7.243)。

## 背景

スポイト (I) は `state.style` の5プロパティ (stroke/fill/size/
opacity/dash) だけを吸収 — ADR-0180..0184 で last-used が
`state.style` に乗るようになった font/head/elbow/curve/r/fstyle/
align/fontSize は拾われず、「拾った見た目が次の図形に継承され
ない」矛盾が残った。Figma のスポイトは全スタイルを吸収する。

## 決定

スポイトが `_styleOf` の全プロパティを `state.style` に転記
(font/head/start/elbow/curve/r/fstyle/align/valign/fontSize/cbend
追加)。`toggleBothEnds` の `s.start` も継承対象に追加し、
`Shape.make('arrow')` が `state.style.start` を引き継ぐ。

## 断念した代替案

- **5キーのみ維持**: 継承語彙の拡大と矛盾。

## 影響

- スポイト使用後の新規図形は吸収元とより近い見た目になる —
  Figma 式で期待通り。`cbend`/`valign` は Shape.make が消費しない
  ので保持のみ (⌥V ペーストには従来通り含まれる)。
