# ADR-0049: 選択にズーム (`⇧2`) + ビューポート fit 数式の共通化

- 日付: 2026-09-23
- 状態: 承認
- 関連: spec.md §14 (Excalidraw parity 項目群)

## 背景

`⇧1` (`fitToContent`) はボード全体にフィットするが、**選択だけにフィット**する
経路が無い。Excalidraw では `⇧2` = Zoom to selection が標準的で、巨大な盤面で
一箇所の作業領域へ寄る操作として定番。`noSelection` トーストの先例あり
(style コピー等)。

合わせて、viewport を矩形 b に pad/cap 付きでフィットする数式が
`fitToContent` / `_mirrorGo` で逐語重複しており、3箇所目を追加するなら
共通化が適切 (変更時のドリフト防止)。

## 決定

- `_fitViewport(b,pad,cap)`: `getBoundingClientRect` + `clampZoom` + centre +
  `UI.refreshZoom()` + `invalidate()`。announce は呼び出し側に残す
  (`fitToContent` は %、`_mirrorGo` は shape 名)。
- `zoomToSelection()`: 選択 bbox (`pad=60`,`cap=4`) で `_fitViewport`。
  選択空 → `noSelection` トースト (既存パターン)。cap=4 は cap=2 より
  寄れる (小さい選択を大きく見せるのが目的) 一方、1px 形状での 16× の
  極端ズームは避ける。
- キー: `⇧2` (`k==='2'||k==='@'`) — Excalidraw parity。help grid に追加。
- i18n: `selFit` (ja/en) — ヘルプ行 + 将来の UI ボタン用。

## 断念した代替案

- **`fitToContent` に選択引数を足す**: 意味論が違う (all vs selection)。
  共有は数式層で行う。
- **cap=2 揃え**: 小選択で効かない (単一 40px 付箋では zoom 2.0 と 5.0 で
  体感が全く違う)。cap=4 が中間点。

## 影響

- `⇧2` で選択領域にフィット (選択空でトースト)。
- `fitToContent`/`_mirrorGo`/`zoomToSelection` が同一の数式経路を共有。
- test.mjs: presence checks (`zoomToSelection`/`⇧2` bind/`selFit` i18n) を追加。
