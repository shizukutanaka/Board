# ADR-0285: ツールバー icon を SVG sprite 化 (raw -700B)

## 状態
承認 — round43

## 背景
ツールバーの20個のインラインSVG iconが同一の接頭辞
(`viewBox="0 0 24 24" fill="none" stroke="currentColor" ...` ~125B)を
持ち、raw 512KB 上限まで ~450B しか残っていなかった。

## 決定
古典的な `<symbol>` + `<use>` sprite 手法: hidden `<svg>` に
`<symbol id="iN" viewBox="0 0 24 24">` として本体を集約し、
各ボタンは `<svg class="ic"><use href="#iN"/></svg>` (~40B) で参照。
stroke/fill 系属性は `.ic` CSS から shadow tree へ継承。
stroke-width 2.2 のもの等4個の非統一 icon はインラインのまま残す。

## 断念した代替案
- CSS mask-image でアイコン化 — 内訳差異を吸収しにくく可読性低下。
- 更に stroke 属性を symbol 子要素へ — むしろ増える。

## 影響
index.html -710B。外観・a11y 不変 (use は aria-hidden ではなく
ボタンの aria-label が従来通り)。README のサイズ表記を
gzip 144→160KB 等の現状値にあわせて修正。1992 全緑。
