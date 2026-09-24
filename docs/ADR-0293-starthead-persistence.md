# ADR-0293: startHead のスタイル永続化

## 状態
承認 — round46

## 背景
ADR-0185 系の慣行で `state.style.*` に直近選択スタイルを保持し
新規図形に引き継ぐが、`s.startHead` (ADR-0286/0291) が対象外
だった。

## 決定
`state.style.startHead` (next==='none' → null) と `state.style.start`
を ctx 巡回で更新し、Shape.make の arrow 初期化で `base.startHead`
に反映。

## 断念した代替案
- start のみ永続 — head 語彙は s.startHead 側が正。

## 影響
開始ヘッド設定が次の矢印にも引き継がれる (Excalidraw/draw.io の
"last used style" 慣行に一致)。2000 全緑。
