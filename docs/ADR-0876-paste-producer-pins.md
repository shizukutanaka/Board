# ADR-0876 — ペースト生産者 bound の behavioural ピン

## Status
採用 (v1.7.902、test のみ)

## Context
ADR-0875 でローカル生産者の入口 bound 監査が clean 完走したが、ペースト系
`_textCascade` は内部関数のため behavioural ピンが存在しなかった。
巨大ペースト (>PASTE_MAX_CHARS) や過長 TSV セルが wire ゲートを超えた値を
生産すると、ローカル commit・ピア棄却で恒久発散する (0797 系)。

## Decision
`_textCascade` を test.mjs の export へ追加し、実経路で2系列をピン:

1. `6000` 文字の平文ペースト → text shape 生成、`text.length===4000`
   (PASTE_MAX_CHARS 打切り)、`validShape` 受理。
2. `3000` 文字セルを含む TSV ペースト → sticky grid 生成、
   全セル `text.length≤2000`、全図形 `validShape` 受理。

「produced shape が wire gate を通る」まで含めて検証することで、
producer parity (0875) の結論を機能経路で固定する。

## Consequence
- 9 asserts 追加 → 2889 → 2898 pass。
- index.html 変更なし (raw 557,045B 据置)。
- 将来 `_textCascade` / `PASTE_MAX_CHARS` / セル cap が regress すると
  本ピンで検出できる。
