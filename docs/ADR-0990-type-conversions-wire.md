# ADR-0990: 型変換のワイヤ収束 — `type` を条件付き stamp/apply キーへ

## 状態: 実装済 (v1.8.016)

## 背景 — 「stamp 完全性」監査の発見

ADR-0989 の op-kind 対称監査で四リストは一致したが、`type` プロパティを運ぶ op の
ライフサイクルを突き詰めると三重の欠陥が残っていた。

### 生産側
`toggleLineArrow`(直線↔矢印)/`toggleStickyText`(付箋↔テキスト) は変換を
`style` op として commit し、パッチに `{id,type}` を含める。

### ワイヤ経路 (従来から全て合法)
- `validPatch`: `type` は string-prop ホワイトリスト通過
- `_slimOp`: `locked` のみ剥離、`type` は保持
- `_lwwDrop`: skip リストに `type` なし → 保持

### 欠陥 (適用側)
1. **`_apply` の patch-family 分岐が非 beautify op の `p.type` を無条件 `delete`**
   → ワイヤ到達した変換をピアが捨てる。**一方向発散** (ローカルは arrow、ピアは line のまま)。
2. **`before` パッチ側も同じく剥離** → ローカル undo が型を戻さない
   (fwd で適用された型は戻るが、bwd で before の `type` が消えている → 発散+履歴破壊)。
3. **`stamp()` が `type` を構造キーとして skip** → wclock 未刻印。
   (a) 後続のリモート書込と LWW 仲裁できず、(b) `_mergeSnapshotOp` の heal
   経路が `type` を知らず、op ロス時に永久に古い型のまま。

## 決定 — `_typOK` ゲートで「適用キー == 刻印キー」を担保

`type` は「適用されるなら刻印される、落とされるなら刻印されない」でなければならない
(apply-drop されて stamp されると、存在しない書込の wclock が後続の正当書込を毒する)。
なので1個の述語を3サイトで共用:

```js
const _typOK=(v,p,sh)=>_TYPES.has(v)&&(v!=='pen'||(_ptsOK(p=(p&&p.pts)||sh.pts)&&_ln(p)>0));
```

- `_TYPES` 未知型は拒否 (0373/0387 系の防衛維持)。
- **`pen` のみ pts 必須** — validShape が `_ptsOK(s.pts)&&_ln(s.pts)>0` を要求する
  唯一の型。書込後に「pts を持つ pen」か「pts が要らない型」のどちらかになればよい。
- `p` にはパッチを渡す (同 op で `pts` も運ぶ変換を救う)。`sh` は適用先の live shape。

### 3サイト
1. `_apply` patch-family (style/resize/align/beautify): `p.type!=null&&!_typOK` → `delete p.type`。
   旧挙動「beautify だけ全型無条件適用」を正当性ゲートへ統一した副次硬化も含む。
2. `_stampWrites` stamp ループ: `key==='type'` は `op.op==='upd'` または `!_typOK` で skip。
3. `_mergeSnapshotOp`: `k==='type'&&!_typOK(v,null,ex)` → merge しない
   (スナップショット heal が validShape 不適合の型を作らない)。

### `upd` は strip 維持
変換は style 系 op で運ばれる設計意図のため、`upd` の `_stripStruct` は従来通り
`type` を削除 — `upd` 経由で型は書けず、stamp もしない (適用キーと一致)。

## 代替案と却下理由
- **`type` を常に剥離のまま + 変換専用 op 新設**: 語彙追加・`_undoWire`/`validRemotePayload`
  の全面更新が要り、style op 経路で自然に済むものを複雑化する (YAGNI)。
- **`pen` も無条件許可**: pts 無き pen が drawPen で crash/永続 poison になる旧来の
  0373 懸念そのものを復活させる。偽造 `rect→pen` は従来通り棄却が正しい。

## 結果
- 直線↔矢印・付箋↔テキスト変換がピアへ伝搬 (発散解消)。
- 変換の undo がローカルでも動作 (before `type` 復元)。
- 変換が LWW 仲裁・スナップショット heal・存在時計の対象になる。
- 偽造 `rect→pen`(pts 無し)・未知型・`upd` 経由型は従来通り拒否。

## ピン (test.mjs)
12 assert: remote style `line→arrow` 適用+刻印、偽造 `rect→pen` 棄却、未知型棄却、
`pen→rect` 適用、upd 経由 `type` は適用/刻印なし、bwd で復元、`_undoWire` 逆 op 合法性、
スナップショット heal が `type` を採用、偽造 heal は拒否。ADR-0373 ピンも
「type は妥当時のみ適用」の新契約へ更新。
