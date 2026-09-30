# ADR-0873 — テキスト編集 overlay の typography parity (letterSpacing/lineHeight)

## Status
採用 (v1.7.899)

## Context
canvas 描画は `c.letterSpacing=(_sp(s)||0)+'px'` (ADR-0205) と
`lh=fs*(s.lineH||1.25)` (ADR-0189) を使うが、編集 overlay
(`positionTextEditor`) は weight/style/decoration/family を適用する一方で
`letterSpacing`/`lineHeight` を**未適用**だった。

`spacing` や `lineH` を持つテキストを編集すると、overlay の表示が
canvas レンダリングと乖離する (WYSIWYG 破れ): 改行位置・行間・
文字幅が実際の描画と異なり、commit 直後に表示が跳ぶ。

## Decision
`positionTextEditor` に両プロパティを追加:

```js
ta.style.letterSpacing=(_sp(s)||0)+'px';
ta.style.lineHeight=s.lineH||'';
```

`lineHeight` は単位なし乗数で canvas の `fs*lineH` と一致、
`letterSpacing` は `(_sp(s)||0)+'px'` で canvas と同形。

## Consequence
- 編集中の見た目が描画と一致 (spacing/lineH 適用済み)
- ラベルエディタ側は `_openLabelEditorFor` が既に `spacing`/`lineH` を
  extras で引き継ぐため parity 完結

## Test pin
test.mjs: `positionTextEditor` が `ta.style.letterSpacing` と
`ta.style.lineHeight` を代入するソースピン 2件 (ADR-0873)。
