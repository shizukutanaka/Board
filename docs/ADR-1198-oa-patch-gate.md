# ADR-1198: `_oa` パッチゲート — 生図形書込みの単一漏斗と許可されたバイパス

## 状態
規約化 (2026-10-01、clean 監査の契約ピン)

## 背景

`_apply`/`applyRemote` 内で図形 prop を書く経路は「書込み」だけでなく3つの副作用を要する:
img/dataUrl 共存解消・img 参照の `_park` (imgq heal)、pending 状態への `_gTouch` 折り込み。
副作用を持つ `_oa` を通らない直接 `s.prop=` 書込みは、リモート適用がローカルの
pending ジェスチャ/ナッジに踏み潰される発散 (ADR-0969/0971) と img heal の喪失を招く。

## 契約

### 1. `_oa` は4効果を持つ単一漏斗

```js
_oa=(o,p)=>{
  const r=Object.assign(o,p);                                    // (a) 書込み
  if(r.dataUrl&&r.img&&'dataUrl' in p)delete r.img;              // (b) 共存解消 — 書いた方が勝つ (ADR-1065)
  if(r.img&&_iS(r.id)&&(!r.dataUrl||'img' in p))_park(Net._imgPending,r.id,r.img);   // (c) img heal (ADR-0841)
  if(byId(o.id)===o)_gTouch(o.id,_ok(p));                        // (d) pending 折り込み (ADR-0971)
  return r}
```

全 patch 系適用 (`upd`/`style`/`resize`/`align`/`beautify` の before/after、del の
connClears、`_ccRest`、`_remoteDelConnFix` の gap-bind 修復) は `_oa` 経由。

### 2. 明示 `_gTouch` ペア型

`_oa` が表現できない書込み (delete・個別キーのみ) は直接書込み + 直後の `_gTouch`:

| サイト | 書込み | ペア |
|---|---|---|
| `move` 絶対値 (fwd/bwd) | `sh.x=`, `sh.y=` | `_gTouch(id,['x','y'])` |
| `group`/`ungroup` forward | `sh.groupId=`/`delete` | `_gTouch(id,['groupId'])` |
| `zorder` (fwd/bwd) | `sh.frac=` | `_gTouch(c.id,['frac'])` |
| snapshot merge (per-key) | `ex[k]=v`+`lw[k]` | `_gTouch(ex.id,[k])` + duNew/imgNew で park 等価 |

### 3. 構造 prop は patch ドメイン外

`s.pg` (pageAdd/`_pgDel2`/`_pgHeal`/`_pgHome`)、ページ行 (`p.name/nts/ntp/bts/btp`)、
wclock マップ、op 自己記録 (`op.shapes`/`op.i`/`op.name`/`op.moved`/`op.wc`/`op.firstId`)
は **patch/snapshot が運べない** (`_stripStruct` が pg/frac/groupId/type を剥がし、
ページ行・wclock・op 補助は shape prop ではない)。スナップショットが古い値を
復元する経路自体が存在しないため `_gTouch` は不要 — 実害になり得ない。

### 4. backward / ローカル専用パス

`_apply(op,false)` は `Store.undo`/`redo` が `_nugEnd()` + ptr cancel を先行させた後にのみ
走る — pending スナップショットは存在しない。リモート適用は常に forward なので、
backward の直接書込み (`group`/`ungroup`/`_ccRest`、delta `move` の `_sT2`) は
`_gTouch` 不要で正しい。delta move はリモートでは絶対値必須 (ADR-0741) で
そもそも intake で棄却される。

### 5. install 経路

`Net._attachShape` が構築時に park+共存解消を行う (新 id には pending orig が存在せず、
reborn は `_bT`/`ptr.reborn` が担当)。卸売 swap (`clear`/`replace`) は `_pcC`/`_pcR`/`_iG`
の一括パージを使い、per-shape `_psc` は冗長として省く。

## 検証 (round948)

- `_oa` ボディ (assign+coex+park+gTouch) — ソース確認。
- `move`/`group`/`ungroup`/`zorder`/snapshot-merge の `_gTouch` ペア — ソース確認。
- 挙動: `ptr.down`+`ptr.gOrig` 武装中に remote `move` → orig がリモート値を吸収。
- 挙動: `ptr.dragStartShapes` 武装中に remote `group` → orig が groupId を吸収。
- 挙動: `ptr.down` 解除後の remote `move` → orig マップは折り込まれない (down ゲート)。
- 挙動: img 参照のみの図形へ remote `upd` → `_park` で `Net._imgPending` 登録。
- 挙動: img 参照図形へ remote `upd {dataUrl}` → 共存 `img` プロパティ除去。
- `s.pg=` (pageAdd) は `_gTouch` ペア無しの許容直接書込み — 構造 prop 契約。
