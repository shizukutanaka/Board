# ADR-0057: 回転ノブの点ジオメトリ / 複数選択対応

## 状態

採用 (v1.7.115)

## 背景

ADR-0055 で `,`/`.` キー経路の回転が pen/line/arrow に拡張されたが、
マウスの**回転ノブ (dragKind='rotate')** は依然として
`getRotHandle` の `s.w==null` 早期 return と `size===1` の分岐で
箱形の単一選択に限定されていた。ノブは「アンカー (bbox 上辺) から
オフセットした円をドラッグし atan2 で角度を求める」仕組みで、
点ジオメトリには `s.x/y/w/h` がないため開始点すら作れなかった。

さらに複数選択ではキー回転 (`doRotate`、ADR-0005/0055 以降全型対応)
が効くのに、ノブ経路が選択 bbox に対して存在しなかった —
Excalidraw では複数選択の回転ノブが主要なグループ変形 UI。

## 決定

ADR-0056 (multi-selection resize) と同じ **orig→live 再計算**
パターンで `ptr.dragKind='grot'` を追加:

1. **`getRotHandle` 一般化**: `s.w!=null` 以外は `G.bbox(s)` で
   bbox を取り、ノブを bbox 上辺中央 + `ROT_OFFSET` に置く。
   回転 pivot は bbox 中心 (点ジオメトリは `rotate` を持たないため
   アンカーは常に非回転の上辺)。この1箇所の変更で drawSelection・
   hitRotHandle・hover の全経路が自動で点ジオメトリに効く。
2. **グループノブ**: `_grpRotHandle(gb)` で選択群 bbox に同じ幾何を
   適用 (複数選択・回転メンバ混在でも表示可能 — 回転は skew を生まず
   合成できるため ADR-0056 より制約が緩い)。
3. **grab**: 点ジオメトリ単一または複数選択でノブヒット時、
   `ptr.gOrig=Map(id→clone)`, `ptr.rotCx/rotCy=回転中心`,
   `ptr.rotA0=atan2(wp-中心)` (掴み角) を記録。
   箱形単一は従来の `dragKind='rotate'` パスのまま (upd op・絶対角)
   — 動作を変えず回帰リスクを避ける。
4. **drag**: `deg=(atan2now−rotA0)*180/π` の**デルタ角**で、
   `_rotShape(sh,orig,cx,cy,deg)` が orig から幾何を再計算:
   box は中心 orbit + `rotate=(orig.rotate||0)+deg`、pts / x1..y2 は
   剛体回転。orig からの写像なので Shift=15° スナップも絶対系と同じ
   品質で効き、誤差は蓄積しない。
5. **commit**: `align` op (`dir:'grot'`) に before/after — undo 1回で
   全メンバ復元、`origSel` で選択も復元。箱形単一の既存 `upd` 経路と
   共存 (新コードは箱形単一には走らない)。
6. **キャンセル**: abortGesture / _cancelPointerGesture / long-press
   ガードは gresize と同じ `gOrig` 復元機構を共有。

## 断念した代替案

- **dragKind='rotate' の拡張**: 箱形単一の絶対角パス (`rotate=deg`)
   と点ジオメトリのデルタ角パスは別機構。単一実装への統合は既存
   テストの更新範囲が広く、共存でも重複は10行程度 — 後者を選択。
- **ノブを全選択に無条件表示**: 全ロック選択や1点ドットペンへの
   ノブ表示は affordance の嘘になるため、lockedSel では従来どおり
   非表示 (drawSelection 側の early return を維持)。
- **`,`/`.` との操作統合**: キー回転は `doRotate` (増分・15°) の
   まま維持 — ノブは連続角、キーは離散角で共存が自然。

## 影響

- ペン/線/矢印単一選択で回転ノブが出て直接ドラッグ回転できる。
- 複数選択で選択群 bbox 上のノブから一括回転 (箱形は orbit+rotate、
  点ジオメトリは剛体回転、混合選択も同一 pivot)。
- Shift で15°スナップ、undo 1回で全メンバ復元、P2P/IDB は既存
  `align` op で完結。
- `getRotHandle` の一般化で getHandles/draw/hit の全経路に効く。
