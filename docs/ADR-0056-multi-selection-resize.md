# ADR-0056: 複数選択リサイズ — 選択 bbox の8ハンドル

## 状態

採用 (v1.7.114)

## 背景

Board のリサイズは**単一選択に限られていた**: `drawSelection` が
`state.selection.size===1` のときのみハンドルを描き、pointerdown の
ハンドルヒットも `size===1` の分岐の中にしかなかった。2つ以上の
シェイプを選んでもマウスでまとめて伸縮する手段がない。

Excalidraw / Figma / tldraw はいずれも複数選択時に「選択群 bbox の
8ハンドル」を提供し、グループ化せずに一括スケールできるのが標準
(これらのアプリでは group 操作より多用される基本ジェスチャ)。
`docs/feature-triage-2026-07.md` の transform 完全性の観点でも
単一選択限定は未実装の穴だった。

さらに既存コードには**見かけだけの死んだ UI** があった: `drawSelection`
は複数選択の bbox 4隅にハンドルらしき四角を描いていたが、pointerdown
側のヒット判定は `size===1` にしか配線されておらず、掴んでも
何も起きない。見えているのに動かないハンドルは affordance の嘘であり、
本 ADR で表示を8ハンドルに拡張した上で実際に動くようにする。

## 決定

`ptr.dragKind='gresize'` として新ジェスチャ種を追加し、ADR-0051
(ペンの仮想ボックスリサイズ) で確立した**仮想ボックスへの再帰**
パターンを拡張する:

1. **ハンドル表示**: `drawSelection` で `size>1` かつ全ロックでなく
   かつ**回転メンバを含まない**場合、選択群 bbox に8ハンドルを描く
   (既存の `getHandles` は `{x,y,w,h}` プレーンオブジェクトで動く)。
2. **掴み**: pointerdown で bbox 上のハンドルヒット時、非ロック
   メンバの `id→clone` を `ptr.gOrig`、開始 bbox を `ptr.gBox` に記録。
3. **ドラッグ**: `vbox`/`vorig` (仮想ボックス) に `applyResize` を
   そのまま呼ぶ → Shift の縦横比ロック・Alt の対称リサイズ・
   オブジェクトスナップ/ガイドが**全部そのまま効く**。結果ボックスと
   開始 bbox から `sx,sy` を得て、`_mapToBox` が各メンバの幾何
   (box は x/y/w/h、pen は pts、line/arrow は x1..y2) をアフィン写像。
   orig から毎フレーム写像するため浮動誤差は蓄積しない。
4. **確定**: pointerup で `align` op (`dir:'gresize'`) に before/after
   を積んで1回の undo で済む — flip/rotate/lock と同じバッチ絶対
   パッチ機構。`origSel` も記録し undo で選択も復元。
5. **キャンセル**: `_cancelPointerGesture` の既存リストア経路に
   gresize 分を追加 (Android touch-takeover / スタイラス OOR 対応)。

`resizeSnap` の除外条件は `s.id===orig.id` から
`state.selection.has(s.id)` に変更 — リサイズ中は選択=被操作集合が
常に成立するため、単一リサイズの挙動を変えずにグループメンバへの
自己スナップを排除できる (key は選択 id の join)。

**回転メンバ除外の理由**: 軸方向スケールを回転ボックスに掛けると
平行四辺形 (skew) になり、Board の `x/y/w/h+rotate` 表現では表せない。
Excalidraw は affine matrix で skew まで表現するが、ここでは歪みを
生まない設計を選んだ (回転メンバ混在時はハンドルを出さない)。

## 断念した代替案

- **メンバごとの applyResize 呼び出し**: 各メンバに個別にハンドル
  数式を適用すると各シェイプの bbox ではなく群 bbox でスナップ/縦横比
  が効かず、結果も不整合。群単位の仮想ボックス一括が正しい抽象化。
- **skew 表現の追加 (matrix)**: Excalidraw 式だが状態表現・undo・
  エクスポート全般に波及する拡張。scratchpad の複雑さ予算を超える。
- **`upd` op の連発**: メンバ数ぶんの op だと undo が一度に全部戻らない。
  `align` のバッチ機構が既にこの用途を想定している。

## 影響

- 複数選択でそのまま8ハンドルドラッグ → 群の一括スケール。
- Shift=群の縦横比維持、Alt=群中心からの対称、スナップ有効。
- 回転シェイプ混在・全ロックの選択では従来どおりハンドル非表示。
- undo/redo・P2P 共有・IDB 永続化は既存 `align` op で完結、新 op なし。
- `_cancelPointerGesture`・long-press ガードに gresize を追加。
