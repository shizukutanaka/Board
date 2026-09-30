# ADR-0850 — `_connLabelMeasure` のメモ化キーに letter-spacing を含める

## Status
Accepted (implemented v1.7.876)

## Context
ADR-0252 で導入した `_connLabelMeasure` は、コネクタラベル / ボックスラベル /
テキストの下線・取消線・背景プレートの行幅を `measureText` から計算し、
`WeakMap` で図形ごとにメモ化している。キーは
`lns.join('\n') + fs + bold + italic + fontFamily` で構成されていた。

`drawShape` は描画前に `c.letterSpacing = (_sp(s)||0)+'px'` を ctx へ設定する
(ctx "Letter spacing" 巡回で `s.spacing` は 0→1→2 とユーザー変更可能)。
`ctx.letterSpacing` は `measureText().width` に反映されるため、`s.spacing` を
変えた後もメモがヒットし続けると、ラベルピル・下線・取消線・背景プレートの
幅が変更前の値で張り付く。

なぜ既存メモでは問題がなかったか:

- `_wrapCache` は ADR-0437 で既に `s.spacing` をキーへ含んでいた。
- `_penCached` (ペン bitmap) は opacity/shadow/letterSpacing を**焼き込まず**
  composite 時に ctx 側で適用する設計のため除外が正しい。
- `_connLabelMeasure` は `measureText` を直接呼ぶため、測定入力として
  `letterSpacing` が有効 — キー欠落は実害。

## Decision
キー末尾へ `'|'+(_sp(s)||0)` を追加。spacing 変更ごとの再計測は 1 回のみで、
その後は再びメモヒットするため定常コストは変わらない。

## Consequences
- spacing 巡回後にコネクタラベルのピル幅・下線/取消線長・テキスト背景プレートが
  正しい幅で再描画される。
- Behavioural ピン: spacing のみを変えた再呼出で計測回数が増えることを固定
  (test.mjs ADR-0850)。
