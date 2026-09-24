# ADR-0266: excalidraw コネクタラベル ↔ s.label 往復

## 状態
承認 — round39

## 背景
excalidraw の矢印/線も containerId bound text でラベルを持つ。輸入側は
container text の親が box 以外の場合折りたたみを skip していたため、
実ファイルのコネクタラベルが孤立 text 図形になっていた。輸出側は conn
ラベルをまったく出していなかった。

## 決定
- import: `_excTxt` 折りたたみで親が line/arrow なら `p.label` に復元
  (Board 再輸入・実 excalidraw 双方が対象。bLabel 有無を問わない)。
- export: `s.label` → `_connLabelXY` 経路位置の container text を発行
  (`containerId=s.id` + `bLabel` マーカー)。`_ct` に位置/サイズの
  オーバーライド引数 `ov` を追加 (conn は x/y/w/h を持たないため)。
- excalidraw 正式の boundElements 双方向リンクは張らない — 自前 import
  は containerId のみで復元でき、excalidraw 側は開いた時に位置を
  再レイアウトする。

## 断念した代替案
- boundElements も出力する完全仕様 — 双方向参照の id 管理コストに
  対し、こちらの復元精度は変わらない。

## 影響
コネクタラベルが excalidraw 往復で保持。1973 全緑。
