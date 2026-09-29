# ADR-0094: Esc で進行中ポインタジェスチャをキャンセル

## 状態

実装済み (v1.7.152)。

## 背景

Esc は選択解除のみ — ドラッグ中 (move/resize/marquee/erase) に
押しても in-place 変異が残り、pointerup で意図しない移動が
commit される。pointercancel の復元経路 (`_cancelPointerGesture`)
は全種対応済みだが、キーボードからは呼べなかった。

## 決定

- Esc ハンドラで `ptr.down && ptr.dragKind` なら
  `_cancelPointerGesture()` を呼び return — モーダル/ctx 解除より
  優先 (ジェスチャがアクティブな状態でモーダルは開き得ない)。
- 選択は解除しない (ジェスチャが戻った形状は選択維持 — Figma
  と同じ挙動)。

## 断念した代替案

- **Esc = undo commit**: 変異はまだ op 化されていないため、
  cancel ではなく「commit して undo」では非同期 blur 副作用が
  残る。ジェスチャ段階の巻き戻しが正しい層。

## 影響

- ドラッグ中 Esc で形状が原位置に復帰、erase 中 Esc で復元。
- 非ドラッグ時の Esc 動作は不変。
