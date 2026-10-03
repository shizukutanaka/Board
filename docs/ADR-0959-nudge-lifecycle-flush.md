# ADR-0959: タブ非表示/終了でも pending nudge を flush する

- Status: accepted
- Date: 2026-10-01
- Version: 1.7.985

## Context

ADR-0957 の共合器 `_nug` は nudge ラン中に `sh.x`/`sh.y` を live mutation し、蓄積 op は `_nugEnd()` で初めて commit される (400ms trailing timer・`_rcOp`・undo/redo・`switchPage`)。ADR-0958 で commit 経路を全網羅したが、**commit を伴わない終了系ハンドラ**に flush がなかった:

- `visibilitychange` → hidden
- `pagehide` (iOS swipe-away / bfcache)
- `beforeunload`

これらの経路では `Persist.flushIfHidden('hidden')` / `Persist.save()` が **`_nug` 未 commit のまま** live mutation 済み `state.shapes` を IDB へ書き込む。一方蓄積 op は broadcast されないため:

- ローカル: 再読込でナッジ後位置を表示 (永続化済み)
- ピア: ナッジ op を受信していないためナッジ前位置のまま

→ prop LWW で将来 op が来ても別キーのまま残る**一方向発散**。timer による自然 flush は hidden タブで throttle され、bfcache 退避では発火しない。

## Decision

3 ハンドラの先頭で `_nugEnd()` を呼ぶ:

```js
_on(window,'beforeunload',e=>{
  _nugEnd();   // ADR-0959: commit a pending nudge so the dirty check sees it
  if(_dt()){...}
});
_on(document,'visibilitychange',()=>{if(document.visibilityState==='hidden'){_nugEnd();if(ptr.down)_cancelPointerGesture();...}});
_on(window,'pagehide',()=>{_nugEnd();if(ptr.down)_cancelPointerGesture();...});
```

- `beforeunload` は `_dt()` 判定**前**に flush: pending nudge を commit すると dirty になるため、「未保存変更あり」の判定が新 commit を正しく捉える (flush 前評価だと pending だけのケースで prompt を出さず op を捨てる)。
- 順序はジェスチャ cancel より先 — `_cancelPointerGesture` は別状態系で、pending op の commit は cancel に先立って完了すべき実時間の操作。
- `_nugEnd` は `_nug=null` 先行なので複数ハンドラの連続発火 (beforeunload→pagehide) で二度呼ばれても no-op。

## Consequences

- 0957 (共合) + 0958 (commit 時系列) + 0959 (終了系) で `_nug` のフラッシュ点が「timer・次 commit・undo/redo・ページ切替・タブ終了」の全経路をカバー — pending op が失われる経路は残らない。
- dirty 意味論の修正: pending nudge は「未保存の作業」として beforeunload prompt を正しく発火させる。

## Test pins

実 `fakeDoc._L['visibilitychange']` / `fakeWin._L['pagehide']` / `fakeWin._L['beforeunload']` リスナを dispatch し、pending セッションが 'move' op として commit され蓄積 delta が保持されることを 3 経路でピン化。既存 source-pin (1262/1263/9460) も `_nugEnd();` 込みの新文字列へ更新。
