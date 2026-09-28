# ADR-0594: .excalidraw エクスポートから非表示図形を除外する

## 状態

実装済 (round303)。

## 背景

`excScene` は全図形を `isDeleted:false` で emit していた。excalidraw 形式には
Board の `visible:0` に相当する「非表示」概念がない (`isDeleted` は削除 tombstone
であり、Board への再取込でも `excToShapes` が skip する)。そのため非表示にして
あった内容が .excalidraw ファイル上で**完全に可視な要素として漏洩**していた。

PNG/SVG の bbox 漏洩 (ADR-0593) より一段重い実害 — ジオメトリ・スタイル・テキスト
の中身そのものが第三者フォーマットへ可視状態で書き出されていた。

## 決定

`excScene` の要素ループ冒頭で `if(_hd(s))continue` — 非表示図形はエクスポート
から除外する。完全なデータ往復が必要な場合は `.board` エクスポートが担う
(そちらは `visible` を保持する)。drawio 側は `visible="0"` を emit する仕様が
あるため往復保持のまま。

## 影響

- 非表示コンテンツが .excalidraw ファイルに含まれない。
- 束縛先が非表示のコネクタは `a`/`b` が外向きにダングルするが、再取込時は
  格納座標へフォールバック (`connEnds` の既存規則) で破綻しない。
- テスト: hidden 図形が elements に含まれないことを assert。
