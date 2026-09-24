# ADR-0166: ⇧X で塗り↔線色をスワップ

## 状態

実装済み (v1.7.224)。

## 背景

塗りと線の色を入れ替えるには両方を個別に選び直す必要があった。
Illustrator の `⇧X` (Swap Fill/Stroke) は配色試行の定番操作。

## 決定

- `⇧X` (shift+x、meta なし) で選択中の塗り系図形
  (rect/ellipse/diamond/frame/sticky) の `stroke↔fill` を交換。
- 付箋は `color` を塗りとして扱う (`applyStyleToSelection` と
  同一マッピング規約) — 縁色 `stroke` と本体 `color` の交換。
- stroke-only 型 (pen/line/arrow/text/image) はスキップ。
- 単一の `style` op にまとめ undo 1回 (before/after は ??null で
  JSON 安全 + 未設定フィールドを維持)、完了トースト。

## 断念した代替案

- **ctx メニューのみ**: キーボード操作の方が高速で発見も
  ヘルプ経由 — 両方不要と判断 (ctx は既に過密)。
- **型を問わず全図形**: pen/矢印の `fill` は描画で未使用のため
  意味の無いプロパティを撒くのみ — 塗り系に限定。

## 影響

- style op 1件。リモート同期・LWW は既存機構に乗る。
