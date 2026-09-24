# ADR-0118: PNG 書き出しのスケール選択 (@1x/@4x)

## 状態

実装済み (v1.7.175)。

## 背景

PNG 書き出しは `exportScale` 上限付き 2x 固定 — Excalidraw 等の
1x/2x/3x 選択が無い。高解像度が欲しい印刷用途と、軽量にしたい
貼付用途の両方に対応できない。

## 決定

- `_renderPngBlob(shapes,cb,desired)` に desired scale 引数
  (既定 2)。`exportPNG(shapes,scale)` が引き継ぎ、scale≠2 時は
  ファイル名に `@Nx` サフィックス。
- export メニューに `ctxExportPNG1x` / `ctxExportPNG4x` を追加
  (従来項目は既定 2x のまま)。`exportScale` の寸法/面積キャップは
  全スケールで変わらず有効 — 4x でも巨大盤面は自動縮退。

## 断念した代替案

- **書き出しダイアログ**: 新モーダル+スライダは規模不相応 —
  メニュー項目3個で同じ到達性。

## 影響

- copyPNG は既定 2x のまま (クリップボードは中庸が適切)。
- `_renderPngBlob` シグネチャ変更に伴い既存 presence check を
  `desired` 版へ更新。
