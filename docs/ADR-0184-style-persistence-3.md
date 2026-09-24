# ADR-0184: r/fstyle/align の last-used 継承

## 状態

実装済み (v1.7.242)。

## 背景

ADR-0180/0181/0183 の継承規則 (fontSize → head/font → elbow/curve) に
残る隙間 — 角丸 `s.r`、ハッチ `s.fstyle`、文字揃え `s.align` も
「連続して同じスタイルで作りたい」需要が高い見た目プロパティ。

## 決定

`toggleRound`/`cycleCorner`/`cycleFillStyle`/`cycleTextAlign` が適用
値を `state.style.r`/`fstyle`/`align` に記録し、`Shape.make` が
型別に継承:
- `r` → rect/diamond/image (0 も有効値 — 角0が継承)
- `fstyle` → rect/diamond (image には適用しない — ハッチは図形用)
- `align` → text/sticky

`fstyle`/`align` は `null` 記録で継承解除 (巡回が既定値に戻った時)。

## 断念した代替案

- **bold/italic/valign/visible まで継承**: 意味を変えるフラグは新規
  図形で意外性が大きい — 見た目プロパティに限定。

## 影響

- 未操作セッションでは不変。`applyStyleToSelection`/パネル操作は
  対象外 (選択向け操作 — 「次の図形」への意図は読めないため)。
