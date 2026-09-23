# ADR-0036: ミニマップのドラッグスクローブナビゲーション

## 状態
実装済み (v1.7.94)

## 背景
ミニマップは `click` イベントでのみナビゲートしていた — 広いボード上で目標
位置に近づくには「クリック→全体像確認→クリック」の繰り返しが必要だった。
Figma / tldraw 等のミニマップでは「押しっぱなしにしてドラッグすると
viewport が連続追従する」(スクラブ) が標準挙動。

## 決定
`click` → `pointerdown` + `pointermove` + `pointerup/cancel` に移行:
- `pointerdown` で `setPointerCapture` + 直ちに1回ナビゲート (クリックとの
  挙動互換を保持 — 単発クリックは従来どおり1回だけ移動)。
- `pointermove` は `_mmNav` フラグ中のみ追従 (ボタンを押したまま動かした
  場合のみスクラブ; ホバーでは動かない)。
- `pointerup`/`pointercancel` で解除 + `releasePointerCapture`。
  capture により、ポインタがミニマップ外にはみ出てもドラッグが継続する。

## 断念した代替案
- `click` を残し別途 pointermove 追従を追加 → down直後に click でも発火し
  二重ナビゲートになるため、pointerdown 一本化が素直。
- スクラブを rAF スロットル → 移動は `invalidate()` 経由で既に RAF 合体
  されるため不要。

## 影響
大きなボードでの長距離ナビゲーションが一動作になる。キーボード経路
(矢印キーパン / ⇧1 全体フィット) は従来どおり — 本件はポインタ UX のみ。
