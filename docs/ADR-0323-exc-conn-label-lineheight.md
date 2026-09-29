# ADR-0323: コネクタラベルの excalidraw lineHeight 復元

## 状態
承認 — round55

## 背景
excalidraw で矢印にバインドされたテキスト (= Board の conn label)
の `lineHeight` が輸入で落ちていた — `_excTxt` 処理が
fontSize のみ復元していた (`p.lineH` は ADR-0210 で conn label
にも効く)。

## 決定
conn バインド fold 時に `e.lineHeight` (≠1.25) → `p.lineH`
(0.5–4 clamp、既存範囲と同値)。

## 断念した代替案
- bLabel 親にも同時適用 — 既に bLabel 経路は fontSize/valign/
  fontFamily を復元しており、lineH 追加は範囲外とした (conn
  label は行間が視認性に効く主系のみ)。

## 影響
コネクタラベル行間が往復。2031 全緑。
