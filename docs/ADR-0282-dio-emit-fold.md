# ADR-0282: `_dioStyEmit` に fontStyle/locked を畳み込み

## 状態
承認 — round42

## 背景
ADR-0263 の emit 集約後も fontStyle (vertex 無条件 / edge はラベル条件)
と locked (`editable;deletable;movable` + vertex のみ `resizable`) が
両ループに残存していた。

## 決定
`_dioStyEmit(s,edge)` に第2引数を追加:
- fontStyle: `_fs` ビットを `!edge || s.label` で発行 (vertex 無条件を
  維持、edge はラベル保有時のみ)。
- locked: 共通3キー + `!edge` で `resizable=0` を追加。

## 断念した代替案
- fontSize も集約 — vertex 無条件 / edge はラベル条件で意味が異なるため
  局所維持。

## 影響
~200B 回収 + emit キーの一貫性。1989 全緑。
