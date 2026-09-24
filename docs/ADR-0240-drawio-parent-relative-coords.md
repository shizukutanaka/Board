# ADR-0240: drawio グループ内の親相対座標解決 + excScene 未閉鎖の修復

## 状態
承認 — round36

## 背景

2件の実害をまとめて修復する。

1. **親相対座標**: draw.io はグループ / スイムレーン / コンテナ内の子セルの
   `mxGeometry x,y` を**親セル相対**で格納する。Board のインポートは `parent`
   属性を読んでおらず、子が親の原点分だけずれた位置へ置かれていた。
   実ファイル (draw.io で保存した図形グループ) で再現する。

2. **`excScene` の閉じ `}` 欠落 (潜在的な全損バグ)**: `excScene` の
   `return{...}` の直後に関数本体の `}` が無かった。`importDrawioFile` 末尾の
   孤立 `}` が偶然に構文をバランスさせていたためファイルはパースするが、
   結果として `_dioSty` / `_dioLabel` / `drawioToShapes` / `importDrawioText` /
   `importDrawioFile` が**全て excScene の関数スコープ内にネスト**していた。
   strict モードでは外から見えず、貼り付け/ドロップ経路で `importDrawioText`
   が ReferenceError を投げる — .drawio インポートは出荷時からランタイムで
   完全に死んでいた (presence テストのみだったため検出されなかった)。

## 決定

1. `drawioToShapes` 先頭でセル id→`mxGeometry` (`_geo`) と id→親 id (`_par`)
   の 2 マップを構築し、`off(id)` が親チェーンを遡って世界座標オフセットを
   メモ化付きで返す。各 vertex の `x,y` に `off(cellId)` を加算する。
   `parent==="0"`/`"1"` (ルート層) ではゼロオフセットのまま。

2. `excScene` の `return` 直後に閉じ `}` を追加し、欠落を補償していた孤立 `}`
   (`importDrawioFile` 直後) を除去。関数群をトップレベルへ復帰させた。

## 断念した代替案

- **edge の mxPoint にも親オフセットを適用** — drawio の edge 幾何は
  `relative=1` で親チェーンに対して絶対扱いが多いため vertex のみに限定。
  実害が出たら再検討する。
- **`}` 欠落を lint/構文チェックで防ぐ** — `node --check` では検出できない
  (文法的には合法)。eval ベースの振る舞いテスト (test.mjs の Function return
  リスト化) が唯一の検出手段であり、今回 `drawioToShapes` を返却リストに
  加えたことで同型の再発も検出可能になった。

## 影響

- draw.io からコピー/エクスポートしたグループ内図形が正しい位置に来る。
- .drawio インポート経路全体が実際に動くようになる (出荷時から壊れていた)。
- `node test.mjs`: 1954 全緑。
