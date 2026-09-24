# ADR-0237: ラベル入力中の装飾ショートカット

## 状態

実装済み (v1.7.294)。

## 背景

ADR-0236 と同じ穴がラベル入力 (`_openLabelEditorFor`
の input) にも存在 — ボックスラベルは canvas 上で
bold/italic/under/strike を描画する (ADR-0204) が、
入力中にキーで切り替えられなかった。

## 決定

label input の keydown に ⌘B/I/U/⇧X を
`toggleTextFlag` へルーティング (入力は
commit 時に shape へ反映、装飾は即時 canvas
に可視化される)。

## 影響

- ラベル付け中に装飾を試せる — Tab 巡回 (ADR-0196)
  で連続ラベリングの手を止めない。
