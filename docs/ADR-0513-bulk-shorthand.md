# ADR-0513: canvas/Store/UI/Persist 呼出しの一括 shorthand 化

## 状態

実装済 (v1.7.546)

## 背景

ADR-0510..0512 でローカル ctx `c` のメソッドを畳んだが、同じ呼出し群が
別 ctx 名 (`sx`=minimap 用、`ctx`=主 canvas) とグローバルオブジェクト経由
(`Store.commit`/`UI.announce`/`URL.createObjectURL`/`tx.objectStore`/
`Presentation.isActive`) にも散在していた。

## 決定

- ctx メソッド: `_sD`(setLineDash) `_mTX`(measureText) `_sR2`(strokeRect)
  `_tr2`(translate) `_sTF`(setTransform) — 全て `(c,...)` 先頭引数形。
  `sx.`/`ctx.` 呼出しも既存 `_bp`/`_st2`/`_fil`/`_sv2`/`_rs2`/`_cP`/`_mT`/`_lT`/`_qC` に接続。
- グローバル: `_cmt`(Store.commit) `_ann`(UI.announce) `_oURL`(URL.createObjectURL)
  `_oS`(tx.objectStore) `_pA`(Presentation.isActive)。

## 影響

- index.html ~-746B (161 サイト、522,246→521,500)
- 呼出し側は受け取り ctx 名によらず統一形となるため可読性が上がる
