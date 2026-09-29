# ADR-0511: canvas `moveTo`/`lineTo` の `_mT`/`_lT` 化

## 状態

実装済 (v1.7.544)

## 背景

`c.moveTo(x,y)`/`c.lineTo(x,y)` が 69 サイトに散在 (ADR-0510 と同じローカル `c` 統一)。

## 決定

`_mT=(c,x,y)=>c.moveTo(x,y)`、`_lT=(c,x,y)=>c.lineTo(x,y)` に集約。
`_a2`/`_fT`/`_sr2`/`_fr2` (arc/fillText/strokeRect/fillRect) は break-even
のため対象外。

## 影響

- index.html ~-140B
