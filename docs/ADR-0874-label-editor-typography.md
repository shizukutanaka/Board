# ADR-0874 — ラベルエディタの typography parity (letter-spacing/text-decoration)

## Status
採用 (v1.7.900)

## Context
ADR-0873 と同型: ラベル描画は `c.letterSpacing=(_sp(s)||0)+'px'` と
under/strike の装飾線 (3124/3153/3517) を使うが、ラベル `<input>` の
`cssText` は `font:` shorthand (italic/bold/size/family) のみで、
`letter-spacing` と `text-decoration` を未設定だった。

`spacing` や `under`/`strike` を持つ図形のラベルを編集すると、
入力表示が canvas レンダリングと乖離する WYSIWYG 破れ (0873 の
ラベル側 sibling)。

## Decision
`openLabelEditor` の `cssText` に宣言追加:

```
letter-spacing:${_sp(hit)||0}px;
text-decoration:${[hit.under?'underline':'',hit.strike?'line-through':''].filter(Boolean).join(' ')};
```

`letter-spacing` は `font:` shorthand に入らないため個別宣言。
`line-height` は単一行 input で無意味のため対象外。

## Consequence
- ラベル編集中の見た目が描画と一致 (spacing/under/strike 適用済み)
- 編集 overlay の typography parity は text editor (0873) と
  label editor (0874) の両経路で完結

## Test pin
test.mjs: label `<input>` cssText が `letter-spacing:${_sp(hit)}` と
`text-decoration` を含むソースピン 2件 (ADR-0874)。
