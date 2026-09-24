# ADR-0104: 同色を選択 (ctx メニュー)

## 状態

実装済み (v1.7.162)。

## 背景

混在盤面で「この色のものを全部」は Figma の Select Same → Fill が
定番。Board では色変更したい一群を手で拾うしかなかった。

## 決定

- `selectSamePaint()` — 単一選択時の ctx `ctxSelectSame`。
  paint キーは sticky=`s.color`、その他=`s.fill` (ADR-0082 の
  付箋色リマップと同じ規則)。一致が2未満なら no-op。
- 選択後 `_announceSel` + 件数トースト (⌘Enter と同じ報告経路)。
- ロック形状も選択に含める — 各 op が既にスキップ。

## 断念した代替案

- **属性別サブメニュー (fill/stroke/dash)**: ctx メニュー階層化の
  コスト対効果が薄い — paint 1軸で実用十分。

## 影響

- 選択置換のみの純粋 UI op (undo 対象外 — 選択は op ではない)。
