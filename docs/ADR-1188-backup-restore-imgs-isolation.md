# ADR-1188 — restoreBackup の imgs-store 読取失敗を分離

Date: 2026-10-01  
Status: Implemented  
Version: 1.8.212  
Supersedes context: ADR-1187 (Persist.load の同型閉塞)

## Context

`Persist.restoreBackup()` は ADR-0004 の「全消去/インポート直前の自動バックアップ」を
復元する経路。ADR-1187 で閉塞した `load()` と全く同じ構造 — バックアップ doc
(docs store の `main:prev`) の読取成功後、imgs ストアへ無防備な `getAll`/`getAllKeys`
を `await` していた:

```js
let shapes=d&&_iA(d.shapes)?d.shapes:[];
if(shapes.some(s=>s.img)){
  const tx2=_trx(this.db,[DB_IMG_STORE],_RO);
  const kv=await reqDone(tx2.objectStore(DB_IMG_STORE).getAll());
  ...
}
```

## Problem

`load()` と違いここは outer `try` の内側なので、失敗は `backupRestoreFailed` toast +
`false` return に収まる — 即座のデータ喪失はない。しかし:

**Q: imgs ストアが恒久的に壊れていたら?**
A: slot は `discardBackup` されず残る (削除は `_repC` 成功後) が、boot プロンプトの
再提示も再試行も全て同一点で落ちる → バックアップは**永遠にリストア不能**になる。

**Q: 失敗すべき粒度は?**
A: `load()` と同一 — 図形リストは docs store の読取だけに従うべきで、画像添付は
独立の失敗ドメイン。blob が取れなくても幾何・テキスト・構造は復元する価値がある
(むしろバックアップは「最後の砦」なので部分復元 > 全失敗)。

**Q: なぜ `save()`/`saveBackup()` には同じ隔離を入れないか?**
A: 書込み系は失敗時に partial doc を残してはいけない — tx の atomicity 自体が
保護であり、imgs getAll 失敗 → catch → dirty 復元+toast → retry が正しい粒度。
読取系だけがこの隔離を要する。

## Decision

`restoreBackup` の attach ブロックに ADR-1187 と同じ nested try を適用:

```js
if(shapes.some(s=>s.img)){
  try{   // ADR-1188
    const tx2=_trx(this.db,[DB_IMG_STORE],_RO);
    const kv=await reqDone(tx2.objectStore(DB_IMG_STORE).getAll());
    const ks=await reqDone(tx2.objectStore(DB_IMG_STORE).getAllKeys());
    shapes=_imgAttach(shapes,new Map(ks.map((k,i)=>[k,kv[i]])));
  }catch(_){}
  shapes=shapes.map(s=>Net._attachShape(s));   // ADR-0840 — always runs
}
```

`_attachShape` を try の外に置く点も同一: 未解決 `s.img` ref は `_imgPending` へ
駐留され imgq heal へ送られる。復元されたバックアップは commit (`_repC`) として
wire へも載るため、heal も通常経路で進む。

## Consequences

- バックアップ復元が「blob が今取れるか」に依存しなくなる — 局所 read 失敗が
  全復元を拒否する経路を閉塞。
- 復元直後に画像が暫く出ない場合がある (imgq heal 待ち)。復元は commit として
  保存されるため heal 完了後に正しく解決される。
- 画像だけ失われるケース (blob 真欠損) でも幾何・ページ・名前は確実に戻る。

## Tests

`test.mjs` に fake IDB ピン (3 asserts):

- `transaction()` が tx 風オブジェクト (objectStore + oncomplete 発火) を返し、
  `get('main:prev')` はバックアップ doc を返し `getAll`/`getAllKeys` は reject。
- `restoreBackup()` が `true` を返す (復元は拒否されない)。
- `byId('i2')` が生存 + `Net._imgPending.has('i2')` で ref 駐留。
