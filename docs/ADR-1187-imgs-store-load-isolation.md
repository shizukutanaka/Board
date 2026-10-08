# ADR-1187 — Persist.load の imgs-store 読取失敗を分離

Date: 2026-10-01  
Status: Implemented  
Version: 1.8.211

## Context

`Persist.load()` は doc レコード (docs store) の読取成功後、同じトランザクションで
imgs ストアの `getAll`/`getAllKeys` を `await` し、`_imgAttach` で図形へ blob を再結合
する (ADR-0031)。この attach 待機は無防備だった:

```js
if(shapes.some(s=>s.img)){
  const kv=await reqDone(_oS(tx,DB_IMG_STORE).getAll());   // rejects → load() rejects
  const ks=await reqDone(_oS(tx,DB_IMG_STORE).getAllKeys());
  shapes=_imgAttach(shapes,...);
}
shapes=shapes.map(s=>Net._attachShape(s));
```

## Problem — ソクラテス式に追う

**Q: imgs ストアの読取だけが失敗したら何が起きるか?**
A: `load()` 全体が reject する → boot は `catch` で `Persist._dbWarn()` を出すだけで、
`state.shapes` は空のまま起動する。

**Q: それでユーザーは何を失うか?**
A: doc read は成功していた — 図形リストは手元にあった。imgs-store の故障
(store 破破損・インデックス不整合・tx abort) は画像 blob だけの問題であり、
図形の位置・スタイル・ページは無傷。それを捨てるのは誤った失敗の伝播。

**Q: より悪いことは何か?**
A: 空盤面で起動した後、任意の編集 (または curPg 復元の `switchPage`) が
`Persist.schedule()` → `save()` を発火し、**復旧可能だった doc を空の shapes
で上書きする**。局所的な読取失敗が全体のデータ喪失へ転じる経路。

**Q: 正しい失敗の粒度は?**
A: 図形リストの採用は doc 読取の成功だけに従うべきで、画像添付の成功には
従わない。ref 持ち画像は既存の heal レーン (imgq) へ駐留すれば blob は
後でピア/自 store から回復できる — 「今解けない」≠「捨てる」。

## Decision

attach ブロックを nested try で隔離する:

```js
if(shapes.some(s=>s.img)){
  try{   // ADR-1187
    const kv=await reqDone(_oS(tx,DB_IMG_STORE).getAll());
    const ks=await reqDone(_oS(tx,DB_IMG_STORE).getAllKeys());
    shapes=_imgAttach(shapes,new Map(ks.map((k,i)=>[k,kv[i]])));
  }catch(_){}
  shapes=shapes.map(s=>Net._attachShape(s));   // ADR-0840 — always runs
}
```

- 失敗時は `shapes` を `_imgAttach` 無しで採用 (図形は一切失われない)。
- `Net._attachShape` (ADR-0840) は try の**外**に置く — blob を持たない
  `s.img` 参照はここで `Net._imgPending` へ駐留され、`_imgqSweep` が
  `imgq` 要求を送出して heal する。正常系でも同じ経路が未解決 ref を拾う。
- `_imgAttach` 自体は既に「失敗しても静黙に進む」実装ではないため、
  catch は attach 失敗の全型を許容する (read 失敗・map 構築失敗とも)。

## Consequences

- `load()` が doc read 成功後に reject する残存経路が消える。reject は
  docs store 自体の読取失敗 (=図形も取れない) に限られる — 正しい粒度。
- 起動時の画像は即時に出ない場合がある (ref 駐留 → imgq heal 待ち) が、
  盤面の幾何・編集は即座に機能し、画像は heal 次第補完される。
- データ喪失経路「局所 read 失敗 → 空盤面起動 → save 上書き」を閉塞。

## Tests

`test.mjs` に fake IDB ピン (3 asserts):

- `get` は doc を返し、`getAll`/`getAllKeys` は `onerror` で reject する
  `brokenImgs` を `Persist.db` へ注入して `Persist.load()` を実行。
- `byId('i1')` が生存 (図形リストが沈まない)。
- `Net._imgPending.has('i1')` — 未解決 ref が imgq heal へ駐留。
- `state.shapes.length===1` — 無損失。
