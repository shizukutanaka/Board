# ADR-0841 — パッチ適用経由の img 参照を _oa 単一ゲートで駐車

## Context

ADR-0840 は「形状丸ごと取込」(wire add/addMany/replace・IDB 復元) の `img:` 参照駐車
を揃えた。残る経路は **部分パッチの適用**: リモート op (`upd`・`style`/`resize`/
`align`/`beautify`) とスナップショット per-property マージ (1520) と `connClears`
適用が `Object.assign` (`_oa`) で直接 `sh.img` を書き得る。`img` は `validPatch` の
許可キー (1331) なので正当な wire 形 — パッチが `{img:'k'}` を運べば shape は参照を
得るが `_attachShape` を通らず `_imgPending` に登録されない → imgq 再要求なし。

## Decision

`_oa` を単純な `Object.assign` から「適用後に dangling `img` を駐車する」ゲートへ
拡張:

```js
_oa=(o,p)=>{const r=Object.assign(o,p);
  if(r.img&&!r.dataUrl&&_iS(r.id)){const P=Net._imgPending;
    if(P.size>=256&&!P.has(r.id))P.delete(P.keys().next().value);
    P.set(r.id,{k:r.img,t0:nowTs()})}
  return r};
```

- 対象は全 `_oa` 適用 = 図形のみ (全呼出しサイトが shape 宛。`_iS(r.id)` で非図形
  宛ても no-op)。
- `{img, dataUrl}` 同載のパッチは駐車しない — 解決済み。
- 256-cap 最古evict も wire 駐車 (0374/0835) と同一規則で複製 — 新駐車経路でも
  保留リストが爆発しない。
- 副作用の範囲: `_oa` を `eff` 等の一時オブジェクトではなく図形へ適用する全サイトで
  `r.img` の一次参照が増えるだけ — コスト無視できる。

## Test

`_oa` を新たに export し、`_oa(sh,{img:'k'})` で駐車・`_oa(sh,{img,dataUrl})` で
不駐車を behavioural ピン。
