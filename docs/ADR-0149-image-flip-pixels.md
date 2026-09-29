# ADR-0149: 画像フリップでピクセルを反転 (バグ修正)

## 状態

実装済み (v1.7.206)。

## 背景

`flipShape` は bbox を鏡像するのみ — 対称箱の画像は
「同じ箱に同じビットマップ」が戻るため ⇧H/⇧V が画像に対して
**完全な no-op** だった。

## 決定

- 新 prop `s.flip` (bitmask: 1=水平, 2=垂直)。`flipShape` は画像
  型で `s.flip^=bit` を XOR — 位置のミラーは従来通り行うため
  グループフリップでは「箱の鏡像位置 + 内容も鏡像」になる。
- 描画3経路で反転: canvas (`c.save/translate/scale/restore`)、
  SVG (`<g transform="translate scale translate">` で囲む)、
  ミニマップ — 全て bbox 中心のワールド空間ミラー。
- op は doFlip のフルクローン before/after に自動で乗る。

## 断念した代替案

- **フリップ時にビットマップを焼き直す**: ImageData 処理は
  オフライン再現性・メモリとも重い — transform の方が安く
  反転解除も自然。

## 影響

- 他型は `s.flip` を持たず不変。dataUrl 不在のプレースホルダは
  反転不要 (対称)。
