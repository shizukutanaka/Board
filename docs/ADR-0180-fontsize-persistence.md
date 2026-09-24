# ADR-0180: フォントサイズの last-used 継承

## 状態

実装済み (v1.7.238)。

## 背景

⌘⇧,/⌘⇧. で変更した fontSize は選択中の図形にしか残らず、
次に作る text/sticky は常に既定値 (16/14) に戻っていた。
Figma/Excalidraw は「最後に使ったスタイルが次の図形に継承
される」規則 — stroke/fill/size は既に `state.style` 経由で
継承しているのに fontSize だけ未対応だった。

## 決定

`fontSizeStep` が適用した最新値を `state.style.fontSize` に記録
し、`beginText`/beginSticky/`Shape.make('sticky')` が
`state.style.fontSize||<既定>` を使う。

## 断念した代替案

- **fontSize をスタイルパネルへ追加**: 既存の stroke/fill/size
  の永続パターンに載せる方が小さい。パネル UI は別途検討。

## 影響

- fontSize を触ったことがないセッションでは既定値で不変。
