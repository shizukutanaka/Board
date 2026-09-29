# ADR-0758: del の redo がギャップ期に結合されたコネクタをピアと非対称に残す

## 状態

採択 — v1.7.784 実装済。

## 背景

`del` op の `connClears` はコミット時点で `computeConnClears` が記録した結合クリアの集合。forward apply はその記録を `p.after` として機械適用する — これは正しい (undo も記録の `before` で対称復元する)。しかし **redo** は記録しか見ないため、undo→redo の空白期に発生した新規結合を拾えない。

具体シナリオ:

1. A が図形 X を含む `del` をコミット (`connClears` に X 結合のコネクタを記録)
2. A が undo → X 復活、記録済み結合も `before` で復元
3. 空白期にコネクタ C が X へ新規結合 (ローカルの `_endPointBind` かリモートの `upd` で `C.a=X`)
4. A が redo → `_apply(delOp, true)` は記録済み `connClears` のみ再適用 → C は含まれず `C.a=X` が dangling 残り
5. ピアは rebroadcast された `del` を applyRemote で受け取り、`op.connClears` 適用 + **`_remoteDelConnFix`** で現行バインドを走査 → C.a===X(死) → クリア
6. **発散**: ローカル `C.a=X` dangling、ピア `C.a=null`

`pageDel` は `_pgDel2` が apply 時に `computeConnClears(dead)` を毎回再導出するため既に正しい — `del` だけがコミット時スナップショットを使い回していた。

## 決定

`_apply` の `del` forward 分岐で、記録済み `connClears` 適用の直後に **`this._remoteDelConnFix(op)` を走らせる** — 受信側とまったく同じ走査をローカルでも行い、記録に含まれない現行バインドを消去する:

```js
if(op.connClears){for(const p of op.connClears){const sh=byId(p.id);if(sh&&!sh.locked)_oa(sh,p.after);}}
const fx=this._remoteDelConnFix(op);if(fx)for(const p of fx)_oa(byId(p.id),p.patch);
```

- 初回適用では `connClears` が全結合をカバーするため `fx` は空 (skipped handled) — 追加コストは dead-id 集合への結合走査のみ
- locked コネクタは `_remoteDelConnFix` が既に skip (ADR-0209/0707 parity)
- `pageDel` は `_pgDel2` の現行導出で対応済みのため変更なし

## 結果

- `index.html` 1 行追加 + コメント尾 2 箇所刈り込み + `_vPages` コメント尾圧縮 (byte 帳尻、556,887B)
- `test.mjs` ピン 1 件追加 (`this._remoteDelConnFix(op)` が `_apply` del forward に存在)
- 2754 pass / 0 fail
