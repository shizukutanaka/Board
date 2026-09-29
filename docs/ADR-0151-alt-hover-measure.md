# ADR-0151: Alt+hover 距離ガイド (measure mode)

## 状態

実装済み (v1.7.209)。

## 背景

Figma / Sketch / Miro の定番: 選択中に Alt (⌥) を押しながら別の
図形にホバーすると、選択エンベロープと対象図形の間隔ガイドと
px 距離が表示される。Board には無く、配置の目測が効かなかった。

## 決定

- `state.measure={a,b}` (render-only, ワールド bbox のペア)。
  セレクトツール hover 経路で `e.altKey&&state.selection.size`
  のとき pickTop が選択外・非ロック・可視の図形を指せば
  `{a:選択エンベロープ, b:hover図形bbox}` を格納。
- 署名比較 (`_sig`) で変化時のみ invalidateOverlay —
  静止カーソルでは再描画ゼロ。
- `_drawMeasure` が軸ごとのギャップを描画: 投影帯の中点を通る
  実線 + 両端ティック + px ピル (readout と同一スタイル、
  色は AAA 検証済 `--accent-contrast`)。
- クリア条件: Alt keyup / pointerdown / Esc / ジェスチャリセット
  (既存の ephemeral リセット行に混入)。

## 断念した代替案

- **全エッジ間距離 (Figma のリッチ版)**: 対角配置時に8本以上の
  線が重なり読めない — 軸ギャップのみ (Figma 初期挙動と同等)。
- **ドラッグ中のライブ表示**: 既に object-snap ガイドと readout
  が出ており三重表示になる。hover 限定。

## 影響

- 描画はオーバーレイのみ、`state` 非汚染・undo/ペイロード無関係。
  a11y ストローク監査の --accent-contrast 参照数を 9→10 に更新。
