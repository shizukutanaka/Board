# ADR-0766: ジェスチャ orig 復元の幾何プロップ限定化

## 状態
実装済 (v1.7.792)

## 背景

ドラッグ系ジェスチャは pointerdown で `orig=clone(shape)` を撮り、per-frame の
re-base (移動・リサイズ) とキャンセル経路 (abortGesture / _cancelPointerGesture) で
`_oa(sh,clone(orig))` — **全プロップの書き戻し** — を行っていた。

```js
// doMove — フレーム毎
for(const [id,orig] of ptr.dragStartShapes){
  const sh=byId(id);if(!sh||sh.locked)continue;
  _oa(sh,clone(orig));   // ← orig が持つ全プロップを書き戻す
  _sT2(sh,dx,dy);
}
```

実害: ジェスチャ中に**リモート style/upd が着地**すると (例: ピアが同じ図形の
fill/dash/label を変更)、次の pointermove で `_oa` がスナップショットの値へ
書き戻し、リモート書込みを**ローカルだけ沈黙消失**させる。wclock は既にリモート
時計を保持しているため後続 op が再治癒することもなく、**ピアと発散**したまま残る。

per-frame apply パス自体は既に surgical だった (`_rotShape`・`applyResize`・
`_mapToBox` は幾何プロップのみを書く)。stomp していたのは復元/再ベース側のみ。

## 決定

復元を**幾何プロップ限定**の `_geoR` ヘルパへ統一:

```js
const _geoR=(s,o)=>{
  for(const k of['x','y','w','h','rotate','x1','y1','x2','y2',
                'pts','way','bend','cbend','a','b','aF','bF'])
    if(k in o)s[k]=clone(o[k]);
};
```

- `in` ガードで **orig が持つキーだけ**復元 — ジェスチャ中にリモートが**追加した**
  キー (例: 新規 `way`) は保持される。orig が持ちリモートが**削除した**キーは
  ジェスチャの所有物として復元 (幾何はドラッグが所有)。
- 変換対象: move の per-frame re-base (`_sT2` 前)・resize の per-frame re-base
  (`applyResize` 前)・abortGesture と _cancelPointerGesture の全復元枝
  (move/resize/gOrig+gAnc/rotate/ebend/cbend/way) の計16サイト。
- `delete` セマンティクス (`delete sh.way` / `delete sh.rotate` / `delete sh.bend`) は
  従来どおり `_geoR` 呼び出し前に維持 — キー不在を orig で表現するため。
- `lblpos` (labelPos ドラッグ) は両キャンセル経路で従来から非復元 — parity 維持し
  labelPos はキー集合に入れない (セマンティックプロップ)。
- undo/redo の `after` 復元 (`_oa` 全書き戻し) は意図どおり — 対象外。

## 結果

- リモート書込みが mid-drag で保持され、ジェスチャコミット後も生存する
  (幾何は LWW のローカル勝ち、非幾何はリモート勝ち — 収束と整合)。
- 16 サイトの `_oa(sh,clone(...))` が `_geoR(sh,...)` へ (shallow コストも削減)。

## 根拠
マルチピア WYSIWYG ボード (tldraw/Figma/Miro 系の共有編集文献) ではジェスチャは
「ドラッグ中の図形の幾何のみ」を一時所有するのが標準 — 非幾何プロップの同時
編集を stomp しない設計が既知の収束ルール (同 ADR-0638 のジェスチャ×外部変化
不変条件の補完)。
