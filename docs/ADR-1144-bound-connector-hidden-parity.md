# ADR-1144: bound-connector × hidden parity — connEnds resolves hidden targets as unbound

## Context

`visible===0` (`_hd`) は「不可視かつ完全に非干渉」の規約 (ADR-0137)。描画・ヒット・スナップ・エクスポート・Tab・選択・ホップマーク・DOM ミラー等の列挙面はすべて `_hd`/`_sv`/`_ulv` で hidden を除外済み (ADR-0571/0596、round893 でプレゼンフレームも閉塞)。

残る1面: **bound connector の端点解決**。`connEnds` は `s.a`/`s.b` の結合先を `byId` で引き、ライブ bbox のエッジ (`_edgePt`) へ投影する — hidden 図形の場合でも。drawShape が `_hd` を早期 return するため hidden 図形自体は描かれないが、それに結合した可視コネクタの端点は hidden 図形の**現在の輪郭**へ追従し続ける。結果:

- 矢印が「何もない空間」へ正確に向く — hidden 図形のエッジ位置を sub-pixel 精度でリークする (hidden = 不可視の不変条件に違反)。
- ピアが hidden 図形を移動すると (frame 子連れ・remote op・undo 経路) コネクタの端点が追従し、第三者が hidden 図形の位置変化を読み取れる。

同一リークが `_bt` (結合先名の検索文字列化、ADR-0381) にも存在した: hidden 図形の label/text/type で検索するとそのコネクタがヒットし、hidden 図形の**名前**を暴露する。

## Decision

`connEnds` に `_bnd` ゲートを導入 — `id` が unset / self / missing / **hidden** のとき null を返し、既存の unbound フォールバック (stored `s.x1,s.y1`) へ落とす:

```
const _bnd=id=>{const t=id&&id!==s.id?byId(id):null;return t&&!_hd(t)?t:null};
const a=_bnd(s.a),b=_bnd(s.b);
```

`_bt` も `if(t&&!_hd(t))` で同 parity に揃える。

**バインド自体は消さない**: `s.a`/`s.b`/`s.aF`/`s.bF` は保持され、un-hide で即座にライブ追従へ復帰する (del の connClears = バインド破棄とは異なる階層の操作)。

## Consequences

- 単一漏斗 (`connEnds`) のため、描画・ヒットテスト・G.bbox・`_linePts`・connClears の解決値・hop marks・エクスポート・ミニマップがすべて同一の「hidden = unbound」意味論に整合する。
- hidden 期間中の端点はバインド時の stored 座標に凍結 — hidden 図形の現在位置・追従リークが閉塞。stored 座標はコネクタ自身の過去状態であり、バインド時点以降の情報は何も漏らさない。
- `computeConnClears` でも hidden 結合先は stored 端点で解決される (描画済み位置との一致)。
- 7 behavioural pins。

## Deferred

- hidden 図形に結合した connector 自体を非表示にする案 (hide cascade) は、可視図形を別図形の visibility に連動させる設計分岐のため採用しない。バインドはデータとして残り、un-hide で完全復帰する。
