# ADR-0372: snapshot LWW マージの値ゲート

## 状態
承認 — round95

## 背景
`_mergeSnapshotOp` (ADR-0058) は known shape に対して `wc` が新しい
プロパティを `ex[k]=op.shape[k]` で無条件マージしていた。値は
`validPatch`/`validShape` を一切通らないため、敵対ピアが snapshot
op で `{x:NaN, pts:'bad', id:'x', __proto__:{…}, type:'pen'}` を
新しい clock 付きで送るとそのまま live shape に注入された
(描画 NaN / drawPen クラッシュ / byId 索引破壊 / プロトタイプ汚染)。

## 決定
マージループに値ゲートを追加:
- 構造キー `id`/`type` は merge 不可 (id は byId 索引、type は
  renderer 分岐 — 差替えはクラッシュ)
- 汚染キー `__proto__`/`constructor`/`prototype` + `_` 接頭辞を拒否
- `validPatch({[k]:v})` で値検証 (NaN 座標・非配列 pts/way・
  非文字列/超長文字列が skip)
- `frac` を validPatch 文字列リストに追加 (sort 不変条件を保護)

## 影響
2044 全緑 + ADR-0372 ブロック (NaN/pts/id/type の skip 検証)。
