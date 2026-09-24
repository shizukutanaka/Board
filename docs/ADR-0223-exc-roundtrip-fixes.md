# ADR-0223: excalidraw 往復の結合・型名修復

## 状態

実装済み (v1.7.281)。

## 背景

ADR-0222 で export 側の `s.a/s.b` マップを直したが、
import 側は `startBinding/endBinding` を読んで `s.a/s.b`
に戻していなかった — 往復で結合が依然失われた。さらに
export が rect に excalidraw 正式型 `rectangle` ではなく
`type:"rect"` を出力しており、再インポートで矩形ごと
捨てられる実バグも同所にあった。

## 決定

- import: element 走査で `idOf`(exc id→board id) を構築し、
  line/arrow は要素参照を保持 → 全 vertex 構築後に
  `start/endBinding.elementId` を `s.a/s.b` へ解決
- export: `case'rect'` は `type:'rectangle'` で出力
  (ellipse/diamond は同名なのでそのまま)

## 断念した代替案

- focus → aF/bF の import 側近似: excalidraw focus は
  一次元で aF/bF は二次元 — 変換誤差が読み手を誤解させる。
  端点バインドのみ復元に留めた。

## 影響

- `.excalidraw` 往復で rect と結合が完全に保存される。
