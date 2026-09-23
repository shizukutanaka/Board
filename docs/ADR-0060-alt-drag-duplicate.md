# ADR-0060: Alt+ドラッグで複製

## 状態

採用 (v1.7.118)

## 背景

Figma・Excalidraw・draw.io・Keynote など主要なキャンバスアプリは共通して
**Alt(⌥)+ドラッグ = 複製しながら移動** を持つ。Board には ⌘D (doDuplicate)
があるが「複製してすぐ移動」という頻出フローが2操作必要で、alt-drag の
慣例を持つユーザーからは未対応として感じられる。`docs/spec.md` の
コードパス・パリティ監査「drag/keyboard/remote の機能差を埋める」系の
改善として小さく実装できる。

## 決定

`pickOrMarquee` の hit 分岐で `e.altKey && !hit.locked` のとき、通常の
move-drag 開始前に複製を挟む:

```js
if(e.altKey&&!hit.locked){
  const dupSet=alreadySel?new Set(state.selection):new Set(toSelect);
  const srcShapes=[...withFrameChildren(dupSet)].map(byId).filter(s=>s&&!s.locked);
  const added=_placeCopies(srcShapes,0,0);   // commit addMany + selection→copies
  ptr.dragKind='move';
  ptr.dragStartShapes=new Map(added.map(id=>[id,clone(byId(id))]));
  return;
}
```

- 選択済みの図形を Alt+drag → **選択全体** を複製 (toSelect が全て selection
  に含まれる `alreadySel` 条件)。未選択の図形 → その図形 (グループなら群) のみ。
- `_placeCopies(src,0,0)` を再利用 — 新 id/グループ/コネクタ結合のリマップ、
  addMany 単一 commit (1 undo で全複製消去)、selection→コピー がそのまま効く。
- フレーム子は `withFrameChildren` で選択込みで複製する (move と同じ包含規則)。
- locked は対象外 (複製対象に含めない; hit 自体 locked なら通常経路へ)。
- dragStartShapes は**コピー**の位置を基準にするので、objectSnap/move/
  Shift-固定は従来どおり効く。

## 断念した代替案

- **⌘D の後にドラッグをシミュレート**: state を2段で変え、1 undo が
  複製+移動でなく複製のみになるのは不便。
- **コミットをドラッグ完了まで遅延**: live プレビュー中の中途半端な
  undo 状態が複雑。先に commit して移動は live/ptr のみ (move-drag は
  pointerup で move op commit) の設計が既存と整合。

## 影響

- Alt+drag で選択を複製しながら移動 — 2操作が1操作に。
- 追加の undo 単位は addMany (複製) 1回 — 既存の duplicate/paste と同じ。
- touch では alt 不可のため既存 ⌘D/長押し複製経路を変更なし。
