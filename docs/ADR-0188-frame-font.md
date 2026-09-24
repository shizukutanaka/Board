# ADR-0188: フレームラベルの書体巡回

## 状態

実装済み (v1.7.246)。

## 背景

フレームラベルは `s.label` 未設定でも常に描画される (既定
'Frame') が、cycleFont/ctxFont のゲートは `s.label` キャリアのみ
を対象とし、ラベルなしフレームは書体変更から漏れていた。
ADR-0186 で描画側が `_fontFam` に対応したので、到達経路だけが
欠けていた。

## 決定

cycleFont/ctxFont のゲートに `s.type==='frame'` を追加し、
`Shape.make` の font 継承にも frame を含める (ADR-0181 の
last-used 規則の自然な延長)。

## 断念した代替案

- **fontSizeStep もフレームへ**: フレームラベルは fs=12 固定の
  キャプション規約 — サイズ可変化は階層を崩すため見送り。

## 影響

- フレームのラベルが mono/serif に切替可能に。`s.font` 未設定の
  フレームは従来通り system-ui。
