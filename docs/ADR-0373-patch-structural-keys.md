# ADR-0373: リモートパッチの構造キー剥がし + payload bbox 防御

## 状態
承認 — round96

## 背景
2つの連結した実害:
1. `upd`/`style`/`resize`/`align` の `Object.assign(sh,p)` は構造キーを
   通していた — 敵対ピアの `upd:{after:{id:'X'}}` は byId 索引を破壊し、
   `{type:'pen'}` は renderer の `case 'pen'` で `pts.length` 読み取り
   クラッシュ (永続化されるため再読み込み後も全描画停止)。
   `_`-接頭辞キーは `_penSig`/`_bmp` 等の内部キャッシュ欄を上書き可能。
2. `_apply` の damage 収穫 `_u` が raw patch (`op.after`/`op.before` の
   各要素) を `G.bbox` に通す — `{type:'pen'}` を含む patch は `pts`
   なしで `pts.length` を読み **assign 前にクラッシュ**。1 の strip だけ
   では到達せず、こちらが先に発火する。

## 決定
- `_stripStruct(p,idToo)`: `delete p.type` + (`idToo` 時 `delete p.id`)
  + `_` 接頭辞キー削除。`upd` は `idToo` 有り (`after.id` は lookup に
  使わず差替え可能)、batch (style/resize/align) は `p.id===raw.id` で
  lookup と一致するため id は残して無害だが統一して剥がさない。
- `beautify` はローカル専用 op (REMOTE_OPS 外) で `type` 差替えが正規の
  振る舞い (pen→rect) — batch 側は `op.op==='beautify'` でスキップ。
- `_u` の `G.bbox` を try/catch — patch は pseudo-shape なので欠落 prop
  で落ちてよい (damage 推定は best-effort)。

## 影響
2044 全緑 + ADR-0373 ブロック (id/type/_penSig 剥がし + 正規 prop は適用)。
