# ADR-1208 — excalidraw インポート: freedraw の `angle` も回転させる

## 背景

`excToShapes` は `e.angle` (ラジアン) を `rot(e)` で度に変換し、shape 型ごとに
適用先を分けている:

- box 系 (`_hb(s)`: rect/ellipse/diamond/frame/image) — `s.rotate=r`。
- connector (`_conn(s.type)`: line/arrow) — 端点 `(x1,y1)` / `(x2,y2)` と `way[]` を
  端点中点周りに剛体回転 (ADR-0300)。
- **freedraw → pen — どちらでもなく、`r` がどこにも届かず黙って捨てられていた。**

回転した手書きストロークを含む excalidraw ファイルを取り込むと、ストロークだけが
無回転で貼られる不一致。ADR-1207 (SVG インポートの寸法不対称) と同型の
「型ごとの適用漏れ」。

## 決定

`_hb` でも `_conn` でもない shape (= `s.pts` を持つ pen) には、UI 側の回転と同じ
`_rotPtsAbout` (ADR-0055: pen pts / line-arrow endpoints の剛体写像) を使い、
**ストローク自身の bbox 中心** を回転中心にする:

```js
if(r&&s.pts){const _eb=_bb(s),_rm=r*_PI/180;
  _rotPtsAbout(s,_eb.x+_eb.w/2,_eb.y+_eb.h/2,_cos(_rm),_sin(_rm))}
```

excalidraw は要素を自分のバウンディングボックス中心で回すので、中心は
`_bb(s)` (単一 shape の bbox; `_bA` は配列用) の中点 — `doRotate` が選択群の中心で回すのと同じ幾何。connector 経路
(端点中点 + elbow `_rotBend`) は既存動作のまま手を付けない。

## 検証

test.mjs に 3 挙動ピン: `angle=π/2` の freedraw `x=100,y=100,points=[[0,0],[10,0]]`
は pts が (105,95),(105,105) に回転 (bbox 中心 (105,100) 周り 90° CCW)、
角度なしの stroker は pts が不変 (ベースライン)。
