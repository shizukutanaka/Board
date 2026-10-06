# ADR-1074: ゼロデルタ dup チェーンの解消

## Status
Accepted — round824, v1.8.098

## Context
`_placeCopies(srcShapes,dx,dy)` は呼び出しごとに `state.dupIds`/`state.dupDelta`
を再シードし (ADR-0080)、次の ⌘D が選択中の図形が直前のペースト集合に一致すれば
同じベクトルで連鎖複製する (smart-duplicate)。

`dupDelta` の問題は、**ゼロ移動を伴う配置**でも無条件に `{x:dx,y:dy}` をシードする点:

- `_mergeImport` (ADR-1054) は `_placeCopies(shapes,0,0)` — インポート内容を
  出典座標そのままへ積む。
- paste-in-place (⌘⇧V、ADR-0113) も同じく 0 オフセット配置。

この直後に ⌘D を押すと smart 判定は通るが、渡すベクトルが `{0,0}` のため
コピーは元集合と完全に重なる — **不可視の複製が押すたびに積算**され、
ユーザーには「⌘D が効かない」に見える。undo/移動すると下から複製が出る
副次的な混乱も招く。

## Decision
`doDuplicate` の smart 判定に `(_dd().x||_dd().y)` を追加し、ゼロベクトルの
シードは「チェーンなし」として扱う。

```js
const smart=state.dupIds.size&&_dd()&&(_dd().x||_dd().y)&&sel.every(s=>state.dupIds.has(s.id));
```

ゼロデルタでは plain 経路へフォールバック → `_placeCopies(sel)` が既定
`20/zoom` オフセットを使い、可視の複製が 1 件作られると同時に `dupDelta` が
実ベクトルへ再シードされる。以後の ⌘D は通常どおり連鎖する。

シード側 (`_placeCopies`) ではなく消費側で修正した理由: ゼロベクトルのシード
自体は正直な記録であり (「直前の配置は差分ゼロだった」)、他の読み手
(moveDelta の累積更新 5243/5292) は `ids ⊆ dupIds` でガード済みのため
害がない。ノンチェーン判定は ⌘D の文脈でのみ必要。

## Consequences
- merge-import / paste-in-place 直後の ⌘D が可視オフセットの複製を作る。
- 既存のゼロ配置呼び出しすべてに効く一般修正 (将来の呼び出し追加にも安全)。
- 非ゼロベクトルの連鎖セマンティクスは不変。

## Alternatives
- シード時に `{0,0}` を既定ベクトルへ書換え: 記録が実際と乖離し、他の読み手へ
  誤情報を渡す。棄却。
- ゼロ配置時に `dupIds`/`dupDelta` をシードしない: チェーン状態の保持に意味は
  ないが、消費側ガードのほうが小さく局所的。棄却。
