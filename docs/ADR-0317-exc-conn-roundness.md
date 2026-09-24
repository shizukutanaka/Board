# ADR-0317: excalidraw コネクタの roundness を curve へマップ

## 状態
承認 — round52

## 背景
excalidraw の丸みある矢印 (既定の round arrow) はベジエ曲線で
ルートされる。`st(e)` は roundness → `o.r=8` に一括マップして
いたが、コネクタの `s.r` はエルボー角丸専用で直線ルートには
視覚効果がなく、曲線性は失われていた。

## 決定
- 輸入: `_conn(s.type)&&e.roundness` → `s.curve=1` (+ `delete s.r`)
- 書出: `s.curve` → `roundness:{type:2}` を conn emit に追加

## 断念した代替案
- `s.r` を直線コネクタのセグメント角丸として再解釈 — excalidraw
  の semantics は「ルートが曲がる」であり折線角丸ではない。

## 影響
丸矢印が往復で曲線のまま保たれる。2025 全緑。
