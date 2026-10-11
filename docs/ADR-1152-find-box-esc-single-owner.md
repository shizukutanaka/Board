# ADR-1152: 検索ボックス Esc fold の単一 owner 化 — element/window 競合の解消

## 状態
実装済み (v1.8.176, round902)

## コンテキスト

ADR-1151 は window keydown の input 早期リターンへ `e.target===_g('sqinput')` →
`toggleSq()` の分岐を追加した。ところが sqinput には**別の** keydown リスナが
`wire()` で直付けされており、既に独自の Esc fold を持っていた:

```js
// element リスナ (target で先に発火):
if(ev.key==='Escape'){_setSq('');_dsp(sq,'none');sq.value='';_ivO();_fc(canvas);}
```

イベントは同一 keydown: element が fold (`display:'none'`) → bubble で window
リスナが発火 → `e.target` は依然 sq → ADR-1151 の分岐が `toggleSq()` を呼ぶ →
`display==='none'` を見て **再オープン**。実ブラウザでは Esc が閉じて即座に
開き直す回帰だった (harness は window 経路のみ検証していたため緑のまま通過)。

ついでに判明した 1151 の記述の不完全さ: Esc でボックスが畳まないわけでは
なかった (element 側が常に畳んでいた)。1151 の真の実害は invoker 捕捉欠落
(fold が常に `_fc(canvas)` 固定) と、この二重 fold 表面。

## 決定

```js
// element リスナは Enter のみ所有; Esc は window ルータ専有:
_on(sq,_KD,ev=>{if(ev.key==='Enter'&&!ev.isComposing){_pd(ev); ... }})

// toggleSq close は可視クエリも消去 (旧 manual fold と parity):
else{_setSq('');sq.value='';_ivO(); ... }

// ⌘Enter commit の manual fold は invoker slot を消費:
_setSq('');_dsp(sq,'none');sq.value='';_ivO();_fc(canvas);_sqPrev=null;
```

### なぜ window 側を owner にするか (逆ではなく)
- window 側は `_aE()===sq` ゲート付きの invoker 復元を持つ — element 側は
  `_fc(canvas)` 固定で契約に届かない。
- element 側を残して window 側を止める方法 (`stopPropagation`) も可能だが、
  「Esc → fold」の責任をoverlay ルータのある window に集約する方が一貫する
  (ctx/help/share の Esc も window で扱っている)。
- element 側に残るのは Enter (advance / ⌘Enter commit) — ボックス固有の
  継続操作であって dismiss ではない。

### なぜ `sq.value=''` か
旧 manual fold が消していた可視テキスト。消さないと再オープン時に、フィルタ
が動いていないクエリ文字列が残る (`_setSq('')` は state 側を消すが input の
value は別)。close = clear で一貫。

### なぜ ⌘Enter 経路に `_sqPrev=null` か
commit 後のフォーカスは canvas が正しい (選択へのアクション)。その manual
fold は `_sqPrev` を消費せず残す — 「ボックスが閉じたら slot は null」という
不変条件を保つため null 化 (次回 open が再捕捉するので stale 参照を抱かない)。

## 検証

`node test.mjs` — 4418 pass / 0 fail。ピン 4 件:
ソース 1 (element リスナが Esc branch を持たない literal) + behavioural 3
(実ブラウザ順序 element→window の連続 dispatch で一度だけ畳む、close で
`sq.value` クリア、⌘F 開放の捕捉)。

## 関連

- ADR-1151 (find box focus contract) — この回帰を導入した親; invoker 復元の
  契約自体は維持 (window 側が所有)。
- ADR-0541/0552 (ctx メニュー未処理キー) — 「キー入力の owner は一箇所」の
  同型設計思想。
