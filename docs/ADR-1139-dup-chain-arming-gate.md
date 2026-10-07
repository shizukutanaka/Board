# ADR-1139 — dup チェーンの武装を真の複製ジェスチャーに限定

Status: Accepted (v1.8.163)

## Context

スマート複製 (ADR-0080) は連続 ⌘D を等ベクトルでずらすために
`state.dupIds`/`state.dupDelta` を使う。`_placeCopies(srcShapes,dx,dy)` は
Alt+drag・paste・pasteInPlace・pasteAt・merge-import・doDuplicate・
importBoardText の全呼出サイトが共有する単一の配置シンクで、
従来は呼出のたび無条件にチェーンを再シードしていた:

```js
state.dupIds=_sT(added);state.dupDelta={x:dx,y:dy};
```

ADR-0080 はこの副作用を「harmless」と記したが、その推論は
`dx===undefined` (≈20/zoom 既定オフセット) のケースのみを想定していた。

## Audit findings

ペースト/インポートの (dx,dy) はユーザー変換ではなく**任意のセンタリング
ベクトル** — ビューポート中央やカーソル位置への引き寄せで数百 px に及ぶ。
`_placeCopies` がこのベクトルで dupDelta を上書きするため:

1. ⌘V → 直後の ⌘D が「貼った物を複製」ではなく**ペースト移動ベクトル分だけ
   離れた位置**に複製を作る。
2. 複製は数百 px 離れた画面外に着地し、ユーザーには見えないが
   `addMany` として commit され peer に broadcast される — 不可視の
   発散図形。
3. チェーンは継続武装するため、さらに ⌘D を押すと同ベクトルで画面外に
   伸び続ける。

`_mergeImport`/merge confirm 経路でも同じ汚染が起きる。

## Decision

`_placeCopies` に第4引数 `dup` を追加し、再シードをゲート:

```js
function _placeCopies(srcShapes,dx,dy,dup){
  ...
  if(dup){state.dupIds=_sT(added);state.dupDelta={x:dx,y:dy}}
  // only ⌘D arms the repeat chain — paste/import placement vectors
  // aren't user transforms
}
```

- `doDuplicate` は両枝 (smart パス `_dd().x/_dd().y` と既定 `_ud,_ud`) で
  `dup=1` を渡す — ⌘D 自体が次の ⌘D のベクトルを決める本来の意味論。
- Alt+drag は第3引数までで変更不要: その (0,0) デルタは falsy チェックで
  元々 no-op に落ち、⌘D の意図的な再武装は doDuplicate 経路に閉じる。
- `dx===_ud` の既定オフセット解決はシグネチャ変更以前の行なので
  従来通り `{x:o,y:o}` が dupDelta に入る。

## Consequences

- ⌘V → ⌘D が「貼った図形を既定 20px オフセットで複製」に戻る。
- ⌘D → ⌘D は引き続き前回ベクトルでチェーンする (smart-dup 維持)。
- merge-import、.board ペースト、外部 JSON インポートも含め、非複製の
  配置は dupIds/dupDelta を汚染しない。
- ADR-0080 の「harmless」推定は撤回 — 再シードは呼出文脈が
  「複製ジェスチャー」のときだけ意味を持つ。
