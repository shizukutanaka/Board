# ADR-0260: drawio flipH/flipV ↔ s.flip 往復

## 状態
承認 — round38

## 背景
Board の反転は `s.flip` ビットマスク (1=水平, 2=垂直)。
drawio は style キー `flipH=1`/`flipV=1` で同じ意味を持つ。

## 決定
- export (vertex+edge): `s.flip&1` → `flipH=1;`、`s.flip&2` → `flipV=1;`。
- import: `_dioStyApply` に追加し vertex/edge 両ループへ一律適用。

## 断念した代替案
- edge 側のみ反転 — drawio は頂点にも flip キーを許すため両側。

## 影響
反転状態が drawio 往復で保持。1968 全緑。
