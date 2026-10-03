# ADR-0951: lblpos ジェスチャの cancel 復元欠落 — labelPos の半 mutation 解消

- ステータス: 採用 (実装済)
- 日付: 2026-10-01
- 関連: ADR-0117 (コネクタラベル位置ドラッグ), ADR-0764 (`_ptrReset` 終端状態統一), ADR-0766 (`_geoR` 幾何スコープ復元), ADR-0072/0132/0076 (ebend/cbend/way の復元分岐)

## コンテキスト

`lblpos` ドラッグ (コネクタラベル位置のツマミ掴み) は pointerdown で
`ptr.lblOrig=clone(onlySel)` を記録し、pointermove で `sh.labelPos` を live mutation
する。コミットは pointerup の style op (before/after labelPos)。

しかし中断復元を担う両関数 — `_cancelPointerGesture` (pointercancel/blur/hidden/
pagehide/second-pointer/lostpointercapture/overlay-open/undo-key 等全経路) と
`abortGesture` (第2ポインタ押下・Esc 系) — の else-if 復元チェーンが
move/resize/gresize/grot/rotate/ebend/cbend/way + `_eraseBatch` の8系統のみを網羅し、
**lblpos の分岐が存在しなかった**。

実害: mid-gesture cancel で `sh.labelPos` がドラッグ途中値のまま残る。
commit op が発行されないため (a) ローカルのみ shape が変異 → wire 未伝播でピアと発散、
(b) 以後の undo が (labelPos を含まない) before に戻し残留値を拾わない。
`labelPos` は `_geoR` の復元キー集合 (x/y/w/h/rotate/x1..y2/pts/way/bend/cbend/a/b/aF/bF)
に含まれないため、`_geoR` 呼出だけでは復元できない。

marquee/lasso/qline は in-flight で shape を変異させない (selection/draft のみ) ため
復元不要 — dragKind 12系統の網羅監査で lblpos のみが欠落していた。

## 決定

両関数の else-if チェーンに lblpos 分岐を追加:

```js
}else if(_dk('lblpos')&&ptr.lblOrig){
  const sh=byId(ptr.lblOrig.id);
  if(sh)ptr.lblOrig.labelPos==null?delete sh.labelPos:sh.labelPos=ptr.lblOrig.labelPos;
}
```

- ebend/cbend 分岐と同型の「orig に無ければ delete、あれば代入」の save-set 復元。
- `_geoR` キー集合は変更しない — labelPos はルート属性であり、他の7サイトの
  geoR 呼出で「ジェスチャ開始時値への上書き」が新たに発生するのを避ける
  (mid-gesture 到着したリモート labelPos patch を不用意に潰さない)。
  lblpos 分岐では自身が触った prop のみ復元する。

## 結果

- `node test.mjs`: 3043 → 3047 assertions (+4 ピン: in-flight 変異、
  `_cancelPointerGesture` 復元、abortGesture 復元、両経路の再 arm 健全性)
- 残り dragKind の欠落なし (12系統網羅表は本 ADR の監査結果を反映)

## 参照

- `index.html`: abortGesture (move/…/way + 新 lblpos 分岐)、`_cancelPointerGesture` 同
