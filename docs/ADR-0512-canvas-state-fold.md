# ADR-0512: canvas `save`/`restore`/`closePath`/`quadraticCurveTo` の shorthand 化

## 状態

実装済 (v1.7.545)

## 背景

ADR-0510/0511 の残り — `c.save()`/`c.restore()` (各16)、`c.closePath()` (6)、
`c.quadraticCurveTo(...)` (5) が散在。`_sv2`/`_rs2`/`_cP`/`_qC` に集約。

## 決定

`_sv2=c=>c.save()`、`_rs2=c=>c.restore()`、`_cP=c=>c.closePath()`、
`_qC=(c,x,y,cx,cy)=>c.quadraticCurveTo(x,y,cx,cy)`。`_sv`/`_cl`/`_qc` は
既存 shorthand と衝突するため `_sv2`/`_rs2`/`_qC` に。

## 影響

- index.html ~-200B
