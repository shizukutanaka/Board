# ADR-0639: プレゼンテーションの SR アナウンス

- 状態: 実装済
- 日付: 2026-09-28

## 背景

Presentation モードは全経路が視覚のみ: overlay + `presCounter` の
`i/n` カウンタ + フレームフィットズーム。スクリーンリーダー利用者は
「開始されたこと」「何枚中何枚目か」「終了」を一切受け取れなかった
(DOM ミラーは canvas 配下のため overlay の状態を反映しない)。

## 決定

`UI.announce` (aria-live) へ3点通知:

- `enter()`: `presEnter` + フレーム数 (`t('frame')` 既存キー流用)
- `_goto()`: `label||frame` + `${i+1}/${n}` (counter と同内容を SR へ)
- `leave()`: `presExit`

i18n は ja/en で `presEnter`/`presExit` を新設 (frame は流用)。

## 影響

- WCAG 情報パリティ (選択アナウンス ADR-0037、ピア参加 ADR-0463 と
  同系): プレゼン全状態が SR 到達可能に。増分 ~200B。
