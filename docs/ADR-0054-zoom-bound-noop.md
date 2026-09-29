# ADR-0054 — ズーム境界での純粋 no-op

## 状態

実装済み (v1.7.112)

## 背景

`zoomAt` はカーソル位置をアンカーに `clampZoom` 後の新 zoom で
`v.x/v.y` を再計算する。zoom が既に MIN/MAX に達していると `nz===v.zoom`
でも処理が続行され、アンカー再計算によってカーソルの微少移動分だけ
viewport が滑っていた — `docs/audit-2026-06.md` の残課題
「min/max ズーム到達時の zoomAt のわずかなパン」。

## 決定

`nz` の計算直後に `if(nz===v.zoom)return;` で早期 return —
境界では viewport・UI・invalidate すべてが完全な no-op。`_pinchSnapNow`
呼び出しより前に置くので、境界でのピンチプレビュースナップショットも
節約される。

## 断念した代替案

- **境界でも epsilon 許容してアンカーを動かす**: clamp 自体は正しいため
  視覚的には微小なドリフトが残るのみ — 解決にならない。
- **wheel ハンドラ側でガード**: zoomBy/keyboard zoom も同じ経路を通るため
  zoomAt 内部でガードするのが単一点。

## 影響

- 境界では `UI.refreshZoom`/`invalidate`/`_pinchSnapNow` もスキップ —
  ホイールティックごとの無駄な RAF 予約も消える。
- 通常のズーム動作は不変 (`nz!==v.zoom` で常に実行)。
- テスト: presence 1 件 + 実動作 (MIN/MAX での no-op、内部ズームの
  カーソルアンカー検証)。
