# ADR-0788 — wclock を null-prototype マップ化 (プロトタイプ汚染による盤面凍結の解消)

## Status
実装済 (v1.7.814)。

## Context — 発見した実害

ADR-0734 の墓標 (tombstone) は `state.wclock` (`{}` 初期化) に `{id:{_del:clock}}` として書き込み、
存在系の LWW を仲裁する:

```js
const wd=_wc()[sh.id];
if(wd&&wd._del&&clockNewer(wd._del,op.clock))continue;   // tomb が op より新しい → add 落とし
```

`_wc()[id]` の読み出しは **プロトタイプチェーンをたどる**。したがって `wclock` 自体の
プロトタイプが変異すれば、**存在しない id 全て**が同じ値を返すようになる。

リモート 'addMany' の `wc` 復元ループ (ADR-0721/0722/0723 の `op.wc`/`afterWc` 採用経路):

```js
for(const[id,w]of Object.entries(op.wc))_wc()[id]=clone(w);
```

は op が運ぶ id をそのまま書き込んでいた。`wc` に own key `'__proto__'` を含めると
(`JSON.parse` は普通に作れる — `wcOk` は値の形しか見ない)、`_wc()['__proto__']=v` が
`Object.prototype.__proto__` の setter を呼び、`state.wclock` の**プロトタイプ自体**が
`v` に置き換わる。

以後 `_wc()[id]` は任意の未登録 id に対してプロトタイプ上の `{_del:evil}` を返すようになり、
`clockNewer(evil, C)` で ts:9e18 級の clock が常に勝つ → **この1メッセージ以降、
全ての add/addMany が「墓標が新しい」として沈黙棄却される盤面凍結**。ローカル編集は動くが
同期された新規図形が一切現れない。

## Decision

対症のガード (`if(id==='__proto__')continue`) ではなく構造的修正を取る:

```js
const _wM=x=>Object.assign(Object.create(null),x);
```

`state.wclock` 本体・内側の per-prop マップ・`op.wc`/`afterWc`/`{...}` 採用・墓標書込み・
リセットの **全18サイト**を `_wM` へ畳み込み。null-prototype では `'__proto__'` は
setter ではなく**正規の own key**になり、将来追加される `wclock[x]=` 書き込みも
自動的に守られる。

## Consequences

- 攻撃者の `wc['__proto__']={_del:clock}` は「id が文字通り '__proto__' の図形の墓標」として
  own key に収まる。`_wc()['victim']` は undefined を返し add は正常に着弾。
- 正当な id `'__proto__'` の図形も正しく add/del/LWW が動く (own-key tomb)。
- `wcOk` は依然 `'__proto__'` キーを通す — 無害化済みのため敢えて拒否しない
  (拒否すると合法 id を持つ盤面を置いて行く)。
- wire の prop マージ側は既に `'__proto__'/'constructor'/'prototype'` を鍵フィルタ済み
  (~8422)。本 ADR は存在系 LWW 側の同型穴を閉じた。

## Verification

`test.mjs` behavioural block: `JSON.parse` で own `'__proto__'` キーを持つ `wc` を運ぶ
'addMany' → `Object.getPrototypeOf(state.wclock)===null` のまま、後続 add が着弾、
`id:'__proto__'` の図形が新しい clock で add/del されると own-key tomb が正しく立つ
(4 asserts)。
