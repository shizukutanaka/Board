# ADR-0306: canvas shadow 3属性を `_csh(s,c)` に集約

## 状態
承認 — round50

## 背景
`if(s.shadow){c.shadowColor='rgba(15,23,42,.22)';c.shadowBlur=10;c.shadowOffsetY=3}`
が 8 箇所に散在 (box/conn/text/frame 各 draw 分岐)。

## 決定
`const _csh=(s,c)=>{if(s.shadow){…3属性…}}` を globals に追加し
全サイト `_csh(s,c)` に置換。

## 断念した代替案
- shadow を `_svgFont` 式の一括属性 emit に — canvas ctx は逐次
  プロパティ代入なので関数化が唯一の集約法。

## 影響
raw -393B。2013 全緑。
