# ADR-0204: フレームラベルの装飾 (italic/下線/取消線)

## 状態

実装済み (v1.7.262)。

## 背景

`toggleTextFlag` ゲートは `s.label` キャリア全般を通すが、
フレームラベルは `600 ${fs}px` リテラルで描画し italic/
under/strike が「設定可能だが描画されない」状態だった
(ADR-0197 align、ADR-0188 font と同系列の残件)。

## 決定

フレームラベル描画で italic プレフィクス (`${s.italic?'italic ':''}600`)
+ canvas の under/strike 手描きライン (label に合わせて位置調整、
600 ウェイト規約は維持) + SVG font-style/text-decoration。
toggleTextFlag ゲートに `s.type==='frame'` を追加しラベル未設定
フレームへも到達可能に。

## 断念した代替案

- **`_fontStr` 化して weight 可変**: フレーム名は常時キャプションの
  役割で 600 固定の視覚規約を維持。

## 影響

- フレーム名に取り消し線などが使える (廃止セクション表記等)。
