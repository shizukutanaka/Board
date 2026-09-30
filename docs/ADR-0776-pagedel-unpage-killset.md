# ADR-0776 — pageDel 'unpage' はワイヤーの kill 集合を必須に

Status: accepted (round525)

## Context

ワイヤーの `pageDel` は2つの形を取る。通常形は `{op:'pageDel',id,clock,firstId?}` で、
受信側はメンバーを `firstId` のページへ再帰属させる。もう一方は `unpage` 形 —
「ページだけを消して中身も消す」undo 経路 (pageAdd undo の逆 op) — で、
`{op:'pageDel',id,clock,unpage:1,shapes:[...]}` を運ぶ。`shapes` は **kill 集合**:
受信側の `_pgDel2(op,null,die,firstId)` は `die` に含まれる id のみを消去し、
残りを `s.pg=null` で元ページから剥がす。

## Problem

`validRemotePayload` の `pageDel` 分岐は `id`/`firstId`/`unpage`/`shapes` を緩く
許可していたため、`unpage:1` を掲げながら `shapes` を運ばない op が intake を
素通りした。受信側では `die=new Set((op.shapes||[]).map(s=>s.id))` が空集合に
なる → `_pgDel2` は誰も消さず → `s.pg=null` スクラブだけが走る。結果:
送信側が削除したメンバーが受信側では「ページなしの生存図形」として残り、
盤面が発散する。加えて `unpage` の型チェックがなく、`unpage:'yes'` など
真値っぽい値も unpage 経路に入った。

## Decision

`validRemotePayload` の `pageDel` ケースを厳格化:

```js
case 'pageDel':
  return _idOK(op.id)
    &&(op.firstId==null||_idOK(op.firstId))
    &&(op.unpage==null||op.unpage===1)          // フラグは 1 のみ
    &&(!op.unpage||_iA(op.shapes))              // unpage → kill 集合必須
    &&(op.shapes==null||_iA(op.shapes)&&_ln(op.shapes)<=MAX_OP_SHAPES&&op.shapes.every(validShape));
```

- `unpage` を持つ op は `shapes` 配列を必須とする (空集合は kill 集合ゼロ =
  「un-page して消す」を「un-page だけして残す」に変えてしまうため棄却)。
- `unpage` の値は `1` 完全一致 (sender `_slimOp` が常に `unpage:1` を送る規約)。
- `shapes` があれば従来どおり `validShape` 検証 (`_slimShapes` は完全形状を
  保持するため conforming sender は通過する)。

## Consequences

- 非適合な unpage op は半適用されず wholesale で棄却 — 受信側はページも
  メンバーも保持する (発散は残るが「中途半端に適用」より安全側)。
- 通常形 (`unpage` なし、`shapes` なし) の挙動は不変 — receiver がメンバーを
  再導出する規約 (ADR-0705) にそのまま従う。
- test.mjs に behavioural ピン: kill-set なし / 非 1 フラグ → 棄却、
  conforming kill-set → 指定 id 消去 + 集合外メンバーは un-paged で生存。
