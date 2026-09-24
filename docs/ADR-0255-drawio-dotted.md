# ADR-0255: drawio dotted ↔ dashed=1 + dashPattern

## 状態
承認 — round38

## 背景
Board の破線は `s.dash` ∈ 1=dashed/2=dotted の2値 (ADR-0178, excalidraw
は strokeStyle で往復済み)。drawio 側は `dashed=1` + `dashPattern=<on> <off>`
で表現し、dotted は `dashPattern=1 N` 系。従来の drawio export は
`dashed=1` のみ書いていたため dotted が dashed へ潰れ、import も全て
dash=1 に戻していた。

## 決定
- export (vertex+edge): `dashed=1` に加え dash=2 なら `dashPattern=1 1;`。
- import (vertex+edge): `dashed=1` で `dashPattern` が `1 <num>` なら
  dash=2、それ以外は dash=1。

## 断念した代替案
- 任意 dashPattern の往復 — Board の dash 語彙が2値なので近似のみ。

## 影響
dotted 線が drawio 往復で保持。1964 全緑。
