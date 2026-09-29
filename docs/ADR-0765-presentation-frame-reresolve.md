# ADR-0765: プレゼン遷移のフレーム id 再解決

## 状態
実装済 (v1.7.791)

## 背景

`Presentation` は `enter()` で `_frames=_getFrames()` を撮り、以後 `next`/`prev`/`refit` が
その配列を参照する。`enter` 以降に**ホールセール置換** — リモート `'replace'`、
del/add の undo-redo、スナップショット採用 (`_rs`) — が走ると、図形オブジェクトは
**同じ id のまま別インスタンスへ交換**される (LWW 収束のため `Store` は常に clone を
push する設計)。`_frames` は死んだ clone を指し続ける。

`_goto(i)` は ADR-0554/0677 で `_frames=_frames.filter(f=>byId(f.id)&&_pgOk(f))`
として存在・ページ検証済みにしたが、`byId` で生存を確認した**後も `_zoomToFrame` には
捕捉した旧オブジェクトを渡していた**:

```js
_frames=_frames.filter(f=>byId(f.id)&&_pgOk(f));   // byId(f.id) は live、だが捨てる
_zoomToFrame(_frames[_idx]);                        // ← 死んだ clone の rect へ zoom
```

実害: プレゼン中にピアの `'replace'` (盤面入替え) や undo がフレーム図形を交換すると、
次の `next`/`prev`/`refit` が**交換前の rect** に着陸する。リモート側でフレームが
移動・リサイズされていた場合、表示は誤った位置/倍率へ飛ぶ。`pg` も stale — 交換後の
clone が別ページ帰属でも旧 `pg` でフィルタしてしまう。

## 決定

`_goto` のフィルタで解決済み参照へ置き換える:

```js
_frames=_frames.map(f=>byId(f.id)).filter(f=>f&&_pgOk(f));if(!_ln(_frames)){leave();return}
```

- `map(f=>byId(f.id))` — 死んだ clone 参照を live オブジェクトへ交換 (生存確認の
  `byId` 結果を捨てずに使う)
- `filter(f=>f&&_pgOk(f))` — 削除済み・オフページをドロップ (0554/0677 の保証を保持、
  `pg` も live 値で判定)
- 以後 `_zoomToFrame(_frames[_idx])` は常に live の rect/pg を見る

`refit()` も同経路 (`_goto(_idx)` 呼び出し) のため自動的に治る。

## 根拠

- Board の Store は **immutable-apply**: `_apply` 系は `state.shapes` を clone で再構築する
  (ADR-0009)。そのため「id が同じ」は「オブジェクトが同じ」を意味しない — 長寿命の
  参照キャッシュは全て交換を想定する必要がある (同型: `_goto` 以前に修正済みの
  `ptr.gOrig` 系 `_sel0`→`byId` 解決 ADR-0635)。
- コスト: `enter` 時に1回撮影 + 各 `_goto` で O(#frames) の `byId` — フレーム数は
  普通数十以下、map+filter は線形で十分。

## テスト

- ソースピン: `_frames=_frames.map(f=>byId(f.id)).filter(f=>f&&_pgOk(f))` 存在。
- Behavioural: `Presentation.enter()` → 同一 id の新 clone へ `state.shapes` を
  入替え (f2 を x=400→900 に移動) → `Presentation.next()` で viewport.x が
  **live clone の中心** (cx=1000) に着陸することを検証、および stale rect 着陸点
  (cx=500) との非一致を検証。
- 既存の 0554/0677 ピンを新しいフィルタ形へ追従。
