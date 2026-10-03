# ADR-0957: 長押し矢印キーのナッジ共合体 (held-key nudge coalescing)

- Status: accepted
- Date: 2026-10-01
- Version: 1.7.983

## Context

`nudgeSelection` (矢印キーで選択図形を 1/10px 移動) と ⌥arrow リサイズは、keydown の auto-repeat 毎 — 長押しで ~30/s — に `_rcOp` 経由で `move`/`resize` op を `_recordCommitted` していた。つまり **1回の「長押しナッジ」が 30 個の履歴エントリ**を生む。

実害は3系統:

1. **履歴溢流**: 履歴は HIST_MAX=400 上限。13秒の長押しで ~400 op が積まれ、それより前の実エントリ (add/del 等) が全部圧出される。
2. **⌘Z の粒度**: undo が「1px 戻る」単位になり、ユーザはナッジ全ランを30回 undo しないと戻れない。
3. **wire フラッド**: commit 毎に `_bcast` → BroadcastChannel/RTC へ 30Hz の op 送信。

先行例: v1.6.29 でスタイルスライダーのドラッグを `_sfbCapture`/`_sfbFlush` が単一 op へ共合済み — これはその**キーイベント側の同型**。

## Decision

`_nug` シングルトン + `_nugPush`/`_nugEnd` ペアの trailing-edge 共合器を導入:

```js
let _nug=null;
function _nugEnd(){const n=_nug;_nug=null;if(n){_cT(n.t);Store._recordCommitted(n.op);_keepSel(n.sel)}}
function _nugPush(op){
  const k=op.op+':'+(op.ids||op.after.map(a=>a.id)).join(','),arm=()=>{_cT(_nug&&_nug.t);_nug.t=_stO(_nugEnd,400)};
  if(_nug&&_nug.k===k){if(op.op==='move'){_nug.op.dx+=op.dx;_nug.op.dy+=op.dy}else _nug.op.after=op.after;arm();return}
  _nugEnd();
  _nug={k,op,sel:_selIds()};arm();
}
function _rcOp(op){_nugEnd();const o=_selIds();Store._recordCommitted(op);_keepSel(o)}
```

- **セッションキー** = `op 種 + id 集合`。同じキーが続く限り move は `dx/dy` を累積、resize は `after` を最新化 (before は初回のまま)。キーが変われば旧セッションを flush して新セッションへ。
- **400ms trailing-edge** — リピートが止まってから commit。`_sfbFlush` 系 (スタイルドラッグ) と同じ trailing-edge 規則。
- **flush 点**: タイマ + `_rcOp` (他の真 commit が時系列前に割り込まないよう先手 flush) + `Store.undo()`/`Store.redo()` (⌘Z がラン中に来たらまずセッションを commit → undo がその単一 op へ着地) + `switchPage` (ページ離脱)。リモート apply 内の `_pgAdopt` は意図的に未フック (apply 内のネスト commit はヘアリー; 保留 op は adoption 前後で位置整合が保たれる)。
- **`sel` はセッション開始時に捕捉** — flush 時の `_selIds()` だと直前の clear が混じる (v1.7.42a 原則: undo はナッジ前の選択へ復帰)。ジェスチャ drag-commit の origSel 規則と parity。

## Consequences

- 30px の長押しナッジ: **30 ops → 1 op** (dx=30)。⌘Z で一発復帰、wire は 1 op。
- delta `move`/`resize` は arbitration 上等価: 収束は x/y/w/h の per-property LWW であり、`_stampWrites` の刻印回数が減るだけで収束面は狭まる方向。
- **remote 側の live 性が変わる**: 従来はピアに ~30Hz で delta が流れたが、今後はラン終了時に累積 delta を一度に受信する。最終 state は同一 (LWW 収束)、UX 上は「ジャンプ」として見える。ドラッグムーブと同じ粒度 (drag-commit も pointerup で 1 op) なので挙動は一貫。
- local の live 描画は不変 — `_sT2` の mutate + `_iv` は従来どおり即時、共合されるのは commit (history+wire) だけ。

## Test pins

`nudgeSelection(1,0)×3` → 生 history 0、`_nugEnd()` 後に 1 op (dx=3 累積)。別 id 集合への切替 → セッション分断で 2 op 目。ソースピンは `_nugPush` 呼出両サイト (nudge/⌥resize) と flush 点。
