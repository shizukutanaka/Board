# ADR-0405: .drawio `<diagram name>` ↔ docName 往復 + リテラル定数化

## 状態
実装済 (v1.7.441)

## 背景
`.board` / share-link / live-sync (ADR-0402) は docName を載せるが、`.drawio` だけ
書き出し側が固定 `name="Page-1"`、読み込み側も名前を見ていなかった — docName が
抜ける最後のフォーマット。

## 決定
- emit: `<diagram name="${_esc(_dn()||'Page-1')}">` — `_esc` で XML 属性エスケープ、
  無名時は従来通り `Page-1`。
- import: `drawioToShapes` が最初の `<diagram name>` を `_dioNm` ハンドオフ (ADR-0359
  `_dioVp` と同型) し、`importDrawioText` が `addMany` 成功後に
  `_setDocName(_dioNm.slice(0,80))`。空名・無属性は採用しない (現在の名前を温存)。
- 併せて `_un='undefined'` (typeof 比較文字列 — `_ud` は値の undefined で
  `typeof` 結果と比較不可) と `_AU/_AD/_AL2/_AR2` 矢印キー名を定数化。

## 影響
Board→draw.io→Board でボード名が保持される。`typeof X===_un` の導入で
「`_ud` は値、`'undefined'` は文字列」の区別が確立 — 誤用すると全チェックが恒偽になる。
