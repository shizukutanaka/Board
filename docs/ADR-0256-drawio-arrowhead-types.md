# ADR-0256: drawio endArrow タイプ ↔ s.head

## 状態
承認 — round38

## 背景
Board の矢印ヘッドは `s.head` ∈ arrow|dot|open|none (ADR-0119)。
drawio 側は `endArrow` ∈ classic/block/open/oval/diamond/none。
従来の export は矢印なら既定ヘッド暗黙のみ、import は `endArrow=none`
のみ検出していたため、oval/dot や open ヘッドが潰れていた。

## 決定
- export (edge): `t==='line'||s.head==='none'` → `endArrow=none`、
  `s.head==='dot'` → `endArrow=oval`、`s.head==='open'` → `endArrow=open`、
  既定は classic (無記述)。
- import (edge): `endArrow` ∈ oval|diamond → `s.head='dot'`、
  `open` → `s.head='open'`、`none` → line。`startArrow!=='none'` →
  `s.start=1` (endArrow 独立に判定 — line+start-head の組合せを
  正しく復元できるよう else から分離)。

## 断念した代替案
- startArrow の型別化 — s.start は bool しか持たない。

## 影響
ヘッド形状が drawio 往復で保持。1965 全緑。
