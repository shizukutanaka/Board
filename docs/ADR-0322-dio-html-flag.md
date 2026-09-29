# ADR-0322: drawio 書出に `html=1;` を付与

## 状態
承認 — round54

## 背景
drawio は `html=1` が無いセルの value をプレーンテキストとして
描画する。Board は `nl()` が改行を `&lt;br&gt;` に変換するため、
html=1 無しで書き出した .drawio を draw.io で開くと多行ラベルが
リテラル `<br>` 文字列として表示される実害バグだった。

## 決定
vertex/edge 両方の `let sty='html=1;'` 起点に変更 (後続 emit は
すべて `+=` で append 維持)。

## 断念した代替案
- `&lt;br&gt;` を改行文字に戻す — drawio の value 属性内で素の
  改行は正規化されず、html=1 が正規の手段。

## 影響
多行ラベルが draw.io で正しく表示される。2030 全緑。
