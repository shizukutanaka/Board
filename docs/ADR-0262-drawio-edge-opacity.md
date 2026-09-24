# ADR-0262: drawio edge の opacity export (非対称の解消)

## 状態
承認 — round38

## 背景
ADR-0258 の `_dioStyApply` 集約で edge の opacity **import** は有効化
されたが、export は vertex のみ `opacity=` を書いており非対称だった —
往復で edge の透明度が失われていた。

## 決定
edge export にも `opacity=<0-100>` を出力 (vertex と同一式)。

## 断念した代替案
- export 側の共通 helper 化 — vertex/edge の sty 構築はキー構成が大きく
  異なり、現状の局所追加で十分。

## 影響
edge の不透明度が drawio 往復で保持。1970 全緑。
