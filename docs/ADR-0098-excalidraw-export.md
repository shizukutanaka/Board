# ADR-0098: .excalidraw エクスポート (双方向 interop)

## 状態

実装済み (v1.7.156)。

## 背景

ADR-0043 で `.excalidraw` **インポート**は済みだが逆方向がない —
Board 単体のシーンを Excalidraw 利用者に渡す手段がない。

## 決定

- `excScene(shapes)` — 要素マッピング (id をそのまま維持):
  - rect/ellipse/diamond/frame → 同型 (`rect` は `s.r>0` で
    `roundness:{type:3}`、frame は `name=label`)
  - sticky → `rectangle` (fill=s.color) + 子 `text` 要素 (コンテナ
    非バインドで簡素化、groupIds は両要素へ)
  - text → `text` (`originalText`/`lineHeight`/`textAlign` 同梱)
  - pen → `freedraw` (絶対 pts → 要素局所座標)
  - line/arrow → 同型、`points` = `[0,0] + way + [dx,dy]` (全て x1,y1
    相対)、`endArrowhead:'arrow'`、`bind1/bind2` →
    `startBinding/endBinding` (elementId は同 id でそのまま有効)
  - image → `image` + トップレベル `files:{fileId:{mimeType,dataURL}}`
- `exportExc()` — exportBoard と同型の Blob ダウンロード
  (`*.excalidraw`)、エクスポートメニューに `ctxExportExc` 追加。
- 未対応 prop (hatch/opacity非1以外の装飾、curved/elbow) は既定値へ
  落とす (way 中間点で形状は保持される)。

## 断念した代替案

- **sticky → バインド済みコンテナテキスト**: boundElements/
  containerId の相互参照が重い — 視覚等価な rectangle+text ペアで十分。
- **粗さ (roughness) の再現**: Board はクリーン線のみ、値 0 固定。

## 影響

- `.excalidraw` の出力は excToShapes が再読み込み可能 (ラウンド
  トリップ方向の健全性はテストで担保)。
