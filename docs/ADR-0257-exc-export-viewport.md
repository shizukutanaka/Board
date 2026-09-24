# ADR-0257: .excalidraw export に viewport を同梱

## 状態
承認 — round38

## 背景
`appState` に `gridSize:null` しか書いていなかったため、エクスポート
ファイルを Excalidraw で開くと初期位置がバラバラだった。

## 決定
`appState` に `scrollX:-viewport.x, scrollY:-viewport.y,
zoom:{value:viewport.zoom}` を追加。Excalidraw のスクロール座標系
(screen=(world+scroll)*zoom) において Board の左上原点 `viewport.x`
は `-scrollX` に一致する。Board 側の import は elements のみ読むため
往復時に自製 appState は無害。

## 断念した代替案
- `appState.viewBackgroundColor` — Board の紙色はテーマ連動で
  固定値にすると他方のテーマで不整合。据置き。

## 影響
.excalidraw を開いた時点で同じ表示位置/ズームが復元される。1967 全緑。
