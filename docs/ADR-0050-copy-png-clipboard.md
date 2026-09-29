# ADR-0050: クリップボードへの PNG コピー

- 日付: 2026-09-23
- 状態: 承認
- 関連: ADR-0007 (エクスポートメニュー), spec.md §14 (Excalidraw parity 項目群)

## 背景

PNG はファイルに保存する経路しかない。Excalidraw 等では「copy to clipboard」
が定番で、メモ・チャット・ドキュメントへの貼り込みという scratchpad 的な
素早い使い回しに直接効く。`exportPNG` のオフスクリーン描画をそのまま再利用
できるため実装は薄い。

## 決定

- `_renderPngBlob(cb)`: `exportPNG` の描画パス (bboxAll + pad32 + scale 2 +
  paper 背景) をそのまま切り出して共有。`exportPNG` はダウンロード側だけ残す。
- `copyPNG()`: `navigator.clipboard.write([new ClipboardItem({'image/png':bl})])`。
  API 非対応 (古いブラウザ/非セキュア) → `copyUnsupported` トースト。
  write 拒否 (権限/非対応 MIME) → `copyFailed` トースト (既存キー)。
- メニュー: Export メニューの PNG/SVG の間に `ctxCopyPNG` 行 (ショートカット
  なし — ⌘⇧C はブラウザ DevTools と衝突する)。

## 断念した代替案

- **SVG のクリップボードコピー**: `ClipboardItem` の text/plain で SVG ソースを
  渡す手もあるが、貼り付け先アプリが PNG をほぼ確実に受け取る一方 SVG テキスト
  は受け先依存が強い。PNG のみで十分。
- **ショートカットキー**: ⌘⇧C は DevTools inspector と衝突。メニュー経由のみ。

## 影響

- Export メニューに「PNG をコピー」。成功/失敗/非対応で既存トースト経路を再利用。
- test.mjs: presence checks (`_renderPngBlob`/`copyPNG`/`ClipboardItem` guard/
  i18n) を追加。
