# ADR-0251: visualViewport.resize でもキャンバスを再サイズ

## 状態
承認 — round37

## 背景
iOS Safari は URL バーの収縮やソフトキーボード表示で **visual viewport**
だけを変化させ、`window.resize` が発火しない (layout viewport は不変)。
キャンバスが画面外に残る / 高さが足りない状態になり得た。

## 決定
`window.resize` に加え `visualViewport.resize` でも既存 `resize()` を呼ぶ
(対応ブラウザのみ feature-detect)。`resize()` は DPR/サイズ再計算済みで
冪等 — 二重発火しても無害。

## 断念した代替案
- `visualViewport.height` で CSS を更新 — canvas の物理ピクセル再割当が
  `resize()` に集約されているため新経路は不要。
- `scroll` イベント — ページは固定レイアウトでスクロールしない。

## 影響
iOS の URL バー/キーボード表示・消去で描画面が正しく追従。1961 全緑。
