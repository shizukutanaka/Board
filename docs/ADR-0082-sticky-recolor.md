# ADR-0082: 付箋の色変更 (fill スウォッチの s.color マップ)

## 状態

実装済み (v1.7.140)。

## 背景

付箋 (`s.color`) は生成時に STICKY_COLORS からランダムに決まり、
**変更する経路が一切ない**。fill スウォッチは `s.fill` を書くが、
sticky の描画は `s.color||'#FEF08A'` を参照するため効かない
(静的には fill が設定されるが見た目は不変 — サイレントな無効操作)。

## 決定

`applyStyleToSelection` で `fill` パッチを適用する際、対象が
`s.type==='sticky'` なら `s.fill` ではなく `s.color` を書き換える
(実効プロパティ `eff` にマップし before/after も `color` で記録)。
- 既存 UI (色スウォッチ + カラーピッカー) がそのまま付箋の色変えに
  なる — 新規 UI 不要。
- fill=null (無色) 選択時は `s.color=null` → 描画は `#FEF08A`
  既定にフォールバック (破壊的でない)。
- copyStyle/pasteStyle 経由でも同じマップが効く。

## 断念した代替案

- **ctx メニューで STICKY_COLORS 巡回**: 6色に限定され、メニュー項目を
  増やす。フルパレットを使えるスウォッチ経路の方が優れている。
- **sticky に独立の色 UI**: UI 増加は scratchpad の重さに見合わない。

## 影響

- sticky 選択時に fill スウォッチ/カラーピッカーが視覚的に機能するように。
- `s.fill` は sticky で依然未使用 (drawShape のフォールバック `s.color`)。
- undo/sync は既存 style op で完結 (before/after は `color` キー)。
