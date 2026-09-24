# ADR-0238: drawio verticalAlign の往復

## 状態

実装済み (v1.7.295)。

## 背景

Board の `s.valign` (top/middle/bottom — ADR-0179/0192)
は drawio の `verticalAlign` と値域が一致するが
相互未マップ — 縦揃えが往復で喪失していた。

## 決定

import `verticalAlign` (top|middle|bottom) → `s.valign`、
export `s.valign` → `verticalAlign=`。ADR-0228 と
同じパターンのワンライナー対称。

## 影響

- drawio 図形の縦揃えが往復で保存される。
