# ADR-0058: スナップショットマージを per-property LWW で収束させる

## 状態

採用 (v1.7.116)

## 背景

`docs/audit-2026-06.md` 第3弾の残課題「完全な CRDT マージ」が未解決の
まま残っていた。snapshot (hello/sync-req 応答) の merge 経路は:

```js
else if(Array.isArray(msg.ops))for(const op of msg.ops.slice(0,MAX_OP_SHAPES)){
  if(op.op!=='add'||!op.shape)continue;
  if(byId(op.shape.id))continue;   // already have → skip
  Store.applyRemote(op);
}
```

**既知の図形は無条件スキップ** — つまり同じ図形を両ピアが変更した
場合、マージ後も両者の内容は不一致のまま残る (発散)。未保有図形の
取り込みのみで「マージ」の名に値しなかった。

幸い ADR-0002 で **per-property LWW** (`state.wclock[id][prop] =
{peer,seq,ts}`) が既に実装済み — 収束に必要な時計機構は揃っている。

## 決定

snapshot の add op に送信側の wclock を同梱し、受信側で per-property
比較マージを行う:

1. `_snapshotMsg()`: 各 op に `wc:clone(state.wclock[s.id]||{})` を付加
   (clock 本体ではなく wclock — `wc` は各プロパティの最終書込時計)。
2. `_mergeSnapshotOp(op)` (named function — DOM 経路を介さずテスト可能):
   - 未保有 shape → 従来どおり `applyRemote` (add)。
   - 保有 shape → `rw[k]` が `validClock` で `lc` が無いか
     `clockNewer(rw[k],lw[k])` なら `ex[k]=op.shape[k]`、`lw[k]=rc` を
     記録 (受信側の将来の LWW 判定も一貫させる)。
   - 変更があれば dirty/invalidate/Persist.schedule。
   - `op.shape[k]===undefined` のキーはスキップ (削除プロパティを
     誤って undefined 書き込みしない)。
3. merge 戻り値を `'add'|'merge'|'keep'|'skip'` で返し、`_onRecv` は
   呼ぶだけ — 副作用は関数内に閉じる。

この設計の性質:
- **収束**: 同一 prop の最終書込が時計で一意に決まる → 両ピアで
  同じ結果に到達 (A が x を、B が label を変えた場合、両方が残る)。
- **履歴非汚染**: マージは収束動作なので undo 履歴に積まない
  (remote op の適用と同じ扱い)。
- **後方互換**: 旧版ピアは `wc` を送らない → `rw=null` で `'skip'`、
  従来と同じ keep 動作。新版ピア同士のみ収束が有効になる。

## 断念した代替案

- **図形単位タイムスタンプ**: shape に単一 `ts` を付け新しい方が全
  プロパティを取る方式は実装が安いが、A の x 変更と B の label 変更が
  片側に潰される。per-prop wclock が既にあるなら正しい解像度を使う。
- **wclock 全量を別フィールドで送る**: `ops` 側に `wc` を載せる方が
  op 単位で対応関係が明確 (id で引かなくて済む)。
- **削除の収束**: ローカルで消した shape が remote snapshot に残って
  いると復活してしまうが、それは現行 merge の未保有図形取込と同じ
  動作 (tombstone が無い設計)。本 ADR の範囲外。

## 影響

- 2つの非空ボードが合流したとき、変更済み図形も LWW で収束する。
- 旧版ピアとの互換は維持 (wc なし→従来 keep)。
- スナップショット payload は wclock 分だけ増加 (shape あたり概算
  +数十バイト/prop) — 1秒スロットル済みの経路なので許容。
