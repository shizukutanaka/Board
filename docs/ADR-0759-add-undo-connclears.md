# ADR-0759: add/addMany の undo が生存期間の結合をピアと非対称に残す

## 状態

採択 — v1.7.785 実装済。

## 背景

ADR-0758 で `del` redo のコネクタ dangling を直した際、同型のもう一つの経路が残っていた: **`add`/`addMany` の undo**。

`add` の undo-wire は `{op:'del',shapes:[op.shape]}`、addMany は `{op:'del',shapes:op.shapes}` をブロードキャストする。ピアはこれを remote `del` として適用し、`op.connClears` (空) に加えて **`_remoteDelConnFix` で現行バインドを走査** → 削除対象に結合されたコネクタをクリアする。

ローカルの backward 適用は: splice → `_sdl` → tombstone `_del` → `_psc` → `_selR` — **コネクタクリアがない**。つまり:

1. A が図形 X を add (ペースト等)
2. 生存期間にコネクタ C が X へ結合 (ローカルの bind かリモートの upd で `C.a=X`)
3. A が undo → ローカルで X 削除、`C.a=X` が dangling 残り
4. ピアは `del` を受け取り `_remoteDelConnFix` で `C.a=null` にクリア
5. **発散**: ローカル `C.a=X` dangling、ピア `C.a=null`

del forward も同じギャップを持っていたがコミット時の `connClears` 記録が「コミット時点」の結合だけをカバーする問題として ADR-0758 で修正済み。こちらは記録が最初から存在しないパターン。

## 決定

`add`/`addMany` の backward 分岐で、削除の直後に **ピアと同じ `_remoteDelConnFix` を合成 del op で走らせる**:

```js
// add backward
const fx=this._remoteDelConnFix({op:'del',shapes:[op.shape]});if(fx)for(const p of fx)_oa(byId(p.id),p.patch);
// addMany backward
const fx=this._remoteDelConnFix({op:'del',shapes:op.shapes});if(fx)for(const p of fx)_oa(byId(p.id),p.patch);
```

- `_remoteDelConnFix` は `op.op==='del'` && `op.shapes` 配列だけを要求するため、合成 op で正確に同じ走査を共有できる
- 結合がなかった通常ケースでは `fx=null` でコストは dead-id 走査のみ
- locked コネクタは `_remoteDelConnFix` 内部で skip (既存 parity 維持)
- redo では対応不要 — forward add は tombstone 仲裁 + `byId` 冪等で、結合は del 経路の責任

## 結果

- `index.html` 2 箇所に1行ずつ追加 + コメント尾圧縮で byte 帳尻 (557,005B)
- `test.mjs` ピン 1 件 (両 backward サイトに `_remoteDelConnFix` が存在)
- 2756 pass / 0 fail
