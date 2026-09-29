# ADR-0055 — 点ジオメトリ (pen/line/arrow) の回転

## 状態

実装済み (v1.7.113)

## 背景

`doFlip` は `flipShape` で全型のジオメトリを直接ミラーする (pts/x1,y1,x2,y2
すべて対応) のに対し、`doRotate` は `s.w!=null` でフィルタし、ペン・線・
矢印を回転対象外にしていた。ADR-0051 でペンが「仮想ボックス経由でリサイズ」
できるようになったのと同じく、点ジオメトリも回転行列の直接適用で回転可能
(Excalidraw は全要素を回転できる)。

## 決定

点ジオメトリは `rotate` フィールドを持たず (レンダラが `shapeRot` で
`s.w!=null` に限定)、幾何そのものを変換する:

```js
const _rotatable = s => s.w!=null || s.pts || s.x1!=null;
function _rotPtsAbout(s,gx,gy,cs,sn){   // pen pts / line-endpoints を群中心で回転
  const rot=(px,py)=>({x:gx+(px-gx)*cs-(py-gy)*sn, y:gy+(px-gx)*sn+(py-gy)*cs});
  if(s.pts) for(const p of s.pts){ const q=rot(p[0],p[1]); p[0]=q.x;p[1]=q.y }
  else if(s.x1!=null){ const a=rot(s.x1,s.y1),b=rot(s.x2,s.y2);
                       s.x1=a.x;s.y1=a.y;s.x2=b.x;s.y2=b.y }
}
```

`doRotate` の変更:
- 選択フィルタを `s.w!=null` → `_rotatable` に拡張 (pen/line/arrow が対象に)。
- 回転ループ内 `s.w==null` → `_rotPtsAbout` で全点を群 bbox 中心 `(gx,gy)` に
  回転 — 箱形の orbit+spin 経路と同じ回転中心で、混合選択でも一貫。
- frameOf の子収集フィルタも `s.w==null` → `!_rotatable(s)` に統一 —
  フレーム内のペンも一緒に公転する。
- 複数選択のアナウンスは `sel[0].rotate+'°'` → `d+'°'` (回転量) —
  点ジオメトリ選択では `rotate` が undefined になりうるため。

単一ペンの回転は自身の bbox 中心で「その場で回る」— 箱形の単一選択と
同じ意味論で、グループ化されていなくても自然に動く。

## 断念した代替案

- **ペンにも `s.rotate` フィールドを持たせる**: `shapeRot`/bbox/ヒット/
  エクスポート全分岐を汚染する — ADR-0051 と同じ理由で棄却。
- **回転ノブを点ジオメトリでも出す**: ノブは `rsh.rotate` をドラッグ中に
  in-place 書き換える設計で、pts への逐次適用は浮動小数点誤差が累積する。
  `,`/`.` キーと将来のメニュー経路のみに限定 (逐次ドラッグは porig からの
  全再計算が要るため別 ADR)。
- **bound 端点 (c1/c2) を回転対象外にする**: binding は `connEnds` が接続先
  shape から再計算するため、回転しても視覚的に接続が追従する — 格納座標は
  stale になるが未使用。一貫性のため全点変換で統一。

## 影響

- undo/redo は既存 `align` op (before/after 全クローン) で完結 — 新 op なし。
- `_penBboxCache`/`_penCached` の O(1) シグネチャ (p0/mid/pN 絶対値) は
  回転で必ず変わるため自動的にキャッシュミス → 再計算。
- ペン pts の in-place 変更は bbox パッド込み写像と同じく浮動小数点誤差を
  累積しない (`,`.` は確定角の一括適用)。
- テスト: presence 1 件 + 実動作 (単一ペン 90° 回転・line 端点回転・
  混合選択の一貫性・undo 復元)。
