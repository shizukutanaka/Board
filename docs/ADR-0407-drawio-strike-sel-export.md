# ADR-0407: drawio `strikeThrough` 往復 + 選択範囲の .drawio 書き出し

## 状態
実装済 (v1.7.443)

## 背景
2件の drawio 完結ギャップ:

1. **`s.strike` の消失**: `_dioStyEmit` は bold/italic/under を `fontStyle` ビット
   (1|2|4) で書き出すが、drawio では取り消し線は `fontStyle` ビットに存在せず
   **独立キー `strikeThrough=1`**。emit/import とも未実装で、取り消し線が .drawio
   経由で黙って消えていた。
2. **選択範囲の .drawio 書き出し欠落**: `exportSelection` は png/svg/board/copy/
   svgcopy の5経路のみ — `boardToDrawio(shapes)` は既に任意形状集合を受ける設計
   なのに `exportDrawio` が `_sh()` 固定で、他フォーマットに揃っていなかった。

## 決定
- emit: `_dioStyEmit` に `if(s.strike)r+='strikeThrough=1;'`。
- import: `_dioStyApply` の fontStyle 行に `if(+sty.strikeThrough)s.strike=1`。
- `exportDrawio(shapes=_sh())` 引数化し `exportSelection` に `'drawio'` 分岐 +
  ctx メニュー `ctxExportSelDrawio` + ja/en i18n。

## 影響
- 部分集合書き出し時の親参照は安全: フレーム包含 (`_fOf`) は集合内フレームのみ
  検索するため集合外フレームに `parent` しない。`s.a`/`s.b` も `idOf` (集合内 id)
  経由で、外部バインドは source/target 未出力の自由端エッジになる。
- 選択が空なら従来どおり `noSelection` warn (Board は emit しない)。

## 断念した代替案
- excalidraw にも strike/underline を往復させる: excalidraw の text 要素に
  該当フィールドが存在せず lossy になるため対象外。
- drawio `fontStyle` ビットに取り消し線を混ぜる独自拡張: サードパーティ製
  ツールが読めない独自値なので標準 `strikeThrough=1` を採用。
