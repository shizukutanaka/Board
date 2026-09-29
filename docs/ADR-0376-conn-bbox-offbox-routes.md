# ADR-0376: コネクタ bbox にオフボックス経路点を含める

## 状態
採用 (v1.7.422)

## 背景
`G.bbox` のコネクタ分岐は終端矩形 (`connEnds`) + `s.way` のみを union していた。
しかし実際の描画経路はそれを逸脱することがある:

- `s.curve` — 制御点は弦から法線方向に `cbend` px (最大 ±400) 離れる
- `s.elbow` — trunk セグメントは `s.bend` のドラッグで終端矩形の外まで出せる

この不一致は2系統の実害を生んでいた:

1. **damage rect 欠落**: `_dmgPair(_cb, G.bbox(sh))` が apex を含まないため、
   曲線/肘をドラッグすると古いピクセルが残った (ゴースト)
2. **inView 誤カリング**: 端点 bbox が viewport 外でも曲線 apex が画面内にある
   コネクタが非描画になり、`G.hit` の quick-reject が apex クリックを棄却した

## 決定
`G.bbox` のコネタ分岐で `s.curve` は `_curveCtrl(e,s.cbend)`、`s.elbow` は
`_elbowPts(s)` の全点を union に追加する。

## 安全性
- `_elbowPts` → `G.bbox(結合先)` の再帰は、結合先が `_bindAt` で
  `line`/`arrow`/`pen` 除外 (コネタ結合不可) のため最深1段で終了する
- `_elbowPts` の呼出コストは小 (確定点列のみ) 、フレームごとに見えるコネクタ数で済む

## 断念した代替案
- 描画時に apex 位置のみ別キャッシュする案 — `G.bbox` 一箇所で済む分こちらが単純
