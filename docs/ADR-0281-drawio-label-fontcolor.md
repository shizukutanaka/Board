# ADR-0281: drawio fontColor を labeled box に拡張

## 状態
承認 — round41

## 背景
Board の box ラベルは stroke 色で描く。drawio はラベル色を `fontColor`
で持つが、従来の往復は text/sticky のみが対象で、ラベル付き rect/
ellipse/diamond のラベル色が失われていた (export では未発行、import
でも未適用)。

## 決定
- export: `s.label` がある vertex にも `fontColor=<s.stroke>` を発行。
- import: `sty.fontColor` を `s.label` 保有時にも `s.stroke` へ適用
  (`_dioStyApply` の strokeColor より後に評価され、ラベル色優先)。
  未ラベルの box では strokeColor がそのまま効く従来挙動。

## 断念した代替案
- ラベル色を stroke から独立 (新 prop) — Board のスタイルモデル変更に
  なり見送り。

## 影響
ラベル付き図形のラベル色が drawio 往復で保持。1988 全緑。
