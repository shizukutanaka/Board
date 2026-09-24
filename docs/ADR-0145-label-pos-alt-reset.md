# ADR-0145: Alt+click でコネクタラベルを中点へ

## 状態

実装済み (v1.7.202)。

## 背景

ADR-0116/0117 のラベル位置ドラッグで移した `s.labelPos` を中点に
戻す手段がルートリセットのみだった。ADR-0141/0143/0144 と同じ
「⌥click = 個別修整の解除」パターンをラベルドットにも適用。

## 決定

- 選択中コネクタのラベル位置への Alt+pointerdown はドラッグ
  開始ではなく `s.labelPos` 削除 → `_connLabelXY` の既定中点に
  復帰。style op → undo 一発。
- `labelPos` 未設定時は従来通りドラッグ開始。

## 断念した代替案

- **ctx「ラベル位置をリセット」**: 頂点単位の文脈メニューは
  hit 状態の引き回しが要り複雑。

## 影響

- ⌥click 文法4項目が完成: waypoint 削除 (0141) / elbow bend
  (0143) / curve cbend (0144) / labelPos (本ADR)。
