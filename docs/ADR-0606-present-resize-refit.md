# ADR-0606: プレゼン中のビューポートリサイズで現在フレームを再フィット

## 状態
実装済 (v1.7.633)

## 背景
プレゼンモードは `_goto` → `_zoomToFrame` で現在フレームへフィットするが、
その後の `resize()` (window resize / visualViewport resize — iOS URL バー・
キーボード・回転、モニター間ドラッグの DPR 変化) はバッキングストアと
`vp` を触るだけでフレームのフィットを再計算しなかった。結果、リサイズ後に
プレゼン中のフレームがズーム枠からずれて見える (次の next/prev で直る
までの一時劣化だが、プレゼン中は最も目立つ画面)。

## 決定
- `Presentation.refit()` を公開 — `if(_active)_goto(_idx)`。
  `_goto` は既に削除フレームの再フィルタ (ADR-0554) とカウンタ更新を
  行うので、そのまま再フィットに転用できる
- `resize()` の末尾で `if(_pA())Presentation.refit()` —
  window/visualViewport の両リサイズ経路 (`_on(window,'resize',resize)`
  + `visualViewport` ハンドラ) が同じ `resize()` を通るため一箇所で網羅。
  DPR 変化 (`_watchDPR` → resize) も同一経路で救済

## 影響
- ウィンドウリサイズ・モバイル回転・iOS URL バー伸縮・モニター間
  ドラッグ中もプレゼンフレームが常にフィット状態を維持
- 非アクティブ時は早期 return で無コスト
