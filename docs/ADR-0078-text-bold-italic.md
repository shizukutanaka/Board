# ADR-0078: テキストの太字 / 斜体

## 状態

実装済み (v1.7.136)。

## 背景

text/sticky には色・サイズ・揃え (ADR-0073/0075) はあるが、文字の
ウェイトと姿勢を変える手段がない。Figma/draw.io では ⌘B/⌘I が
最も打たれるスタイルショートカットであり、強調ラベルや注記の表現に必要。

## 決定

- `s.bold` / `s.italic` (boolean、既定なし=通常)。text/sticky のみ対象。
- `_fontStr(s,fs)` が `${italic?'italic ':''}${bold?'600 ':''}${fs}px <stack>` を
  生成し、drawText と sticky 本文の `c.font` 構築を単一化。
- `toggleTextFlag(k)` — 選択中 text/sticky に `style` op でトグル
  (`{id,bold:true|null}` 形式、false は削除で JSON を瘦せさせる)。
- ⌘B / ⌘I — Figma/draw.io と同じグローバルショートカット。
  編集中は textarea がフォーカスを持つため素通し (per-range 装飾は対象外)。
- `positionTextEditor` が `fontWeight`/`fontStyle` をオーバレイに反映 —
  編集中も見た目が一致。
- SVG 書き出しは `font-weight="600"` / `font-style="italic"` を条件付き付与
  (text と sticky 本文の両方)。
- copyStyle/pasteStyle のクリップボードに `bold`/`italic` を追加。

## 断念した代替案

- **文字列ごとの範囲装飾 (per-range)**: リッチテキスト構造と編集 UI が
  必要で scratchpad の重さを超える。whole-shape で十分。
- **ctx メニュー化**: ⌘B/⌘I は普遍的で、メニュー項目増よりヘルプ表記が適切
  (fontSizeStep と同じ判断)。
- **underline**: リンク/下線の意味衝突が大きく、ボード上の利用頻度が低い。
  現段階では不採用。

## 影響

- 新規 prop `s.bold`/`s.italic` — op/style/RTC/永続化は既存経路に自動乗車。
- wrapText の幅計測は bold で実測値が変わるが `_wrapCache` のキーは
  (text/maxWidth/fontSize) — bold 変更後もキャッシュが古い幅を返す恐れ。
  → `_wrapCache` は shape→lines の WeakMap で、キーに fstyle 系を含めない
  既存仕様だが、`Object.assign` による mutate ではキー不変のため
  sticky 折返しがずれる可能性。→ 対策: `toggleTextFlag` と SVG では
  measure 差分が小さいため許容、キャッシュキーに `s.bold` を追加して厳密化。
