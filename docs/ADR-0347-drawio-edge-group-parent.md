# ADR-0347: .drawio emit — コネクタの group parent

## 状態
承認 — round75

## 背景
ADR-0336 で vertex は `parent=g_<gid>` + 相対座標を emit するよう
なったが、edge cell は `parent="1"` + 絶対座標のまま残っていた
(受理ギャップとして棚上げ)。

## 決定
- edge cell も `parent="${_gc?g_s.groupId:'1'}"` で group 化し、
  sourcePoint / targetPoint / waypoints を group 原点相対で出力。
- import 側は `off(parent)` を edge 座標にも適用 — 従来 `_doff`
  (ページ水平オフセット) のみで、group parent 由来の相対座標を
  絶対へ復元できなかった (本 emit 変更に対応する必須修正)。
- `groupId=_pid` の復元は ADR-0336 の既存パスで完結。

## 影響
+~400B。drawio で group 化されたコネクタが group 移動に追従。
実 emit assert 追加 (2044 全緑)。
