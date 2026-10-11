# ADR-1191 — id-keyed wire マップの null-proto 統一 (`__proto__` 汚染の閉塞)

Status: implemented (v1.8.215) — `_reqWc`・`_syncReqWc`・`cov` の3サイトを
`{}` → `_wM()` へ統一 + 10 挙動/ソースピン。

## Context (監査経緯)

ADR-0788 で wclock/トゥームストーン map を null-proto 化した契約
(`__proto__` キーが prototype を書き換えない) は、wire 由来 id をキーに取る
lookup map の全残存サイトへ適用されているかを round941 で監査した。

`_sendSnapshot` の応答は asker の horizon `{id: clock}` で計算される
(ADR-1055/1093: per-shape send 判定 + dels tomb 広告)。horizon 解析の
`_reqWc`、送信側 horizon 構築の `_syncReqWc`、op baseline 網羅判定の
`cov` (ADR-1086/1087) の3サイトが plain `{}` を使っていた。

## 実害

`m={}` に `m['__proto__']=v` と書くと **own key は作られず [[Prototype]] が
v へ書き換わる** (v がオブジェクトの場合)。`validClock` は余計な自身
プロパティを拒否しない (`{ts,peer,seq}` の検証のみ) ため、crafted
sync-req:

```js
wc: { '__proto__': {ts:1, peer:'x', seq:0, sA:{ts:1e12, peer:'x', seq:1}} }
```

は responder 側で `m.__proto__ = その clock` とし、`req[s.id]` のプロトタイプ
鎖経由で `req['sA']` が `{ts:1e12}` に解決 — `_snapshotMsg` の send 判定
(`clockNewer(w[k], rc)`) が常時 false となり **shape 'sA' の delta を標的抑制**
できた。応答は broadcast (全ピアが merge する) なので、毒された応答自体を
ルーム全体へ届ける。joiner は horizon より新しい 'sA' の変更をこの周期では
受け取れず、発散状態が残る。

`_syncReqWc` (asker 側 `m={}`) も同型: 自盤面に `__proto__` id の図形があると
horizon エントリが serialization から静かに脱落。`cov` (baseline 網羅判定)
は `{id:'__proto__'}` メンバーが map source に入ると proto-poison — 網羅
判定の方向によっては誤判定の余地が残った。

## 決定

3サイトを `_wM()` (`Object.create(null)`) へ統一。null-proto では
`m['__proto__']=v` が通常の own key になり:

- 不在 id の lookup は `undefined` (proto 鎖に余計な props が漏れない)
- `_JS(m)` は `__proto__` を own key として serialize (horizon が完全)
- `cov` の `m[p.id]` は own key のみ解決 (網羅判定が構造的に正しい)

`_reqWc`/`_syncReqWc`/`cov` の呼出側は `req[s.id]`、`m[p.id]`、`_oe(req)`、
`_JS(m)` のみ — null-proto で全て問題なし。

## 棄却した代替

- **`id==='__proto__'` の拒否追加**: `_reqWc` は全か無か契約 (1件の invalid
  entry → null → full snapshot) のため、拒否では応答側コストが増える。
  null-proto はコード量ゼロ増・構造として常時正しい。
- **`_wK` フィルタの適用**: `id`/`type`/`pg` 等も拒否するが、horizon の id は
  そもそも shape/page id のみ — 網羅的な reject は過剰 (YAGNI)。
- **Map への置換**: 呼出側が `req[s.id]`・`_oe(req)` で読む — Map は
  `.get`/`.entries` へ全書き換えが必要で、差分が大きすぎる。

## 検証 (test.mjs)

- `wc:{'__proto__':{…,sA:{ts:1e12}}}` → `m.sA===undefined` (proto 汚染非解決)
- `m['__proto__'].peer==='x'` (own key として通常保持)
- 通常 entry (`sB`) は正常着地
- all-or-nothing: `{sB:'junk'}` → null / `{wc:42}` → null
- entry cap (SHARE_MAX_SHAPES+1) → null
- ソースピン: `_reqWc`/`cov`/`_syncReqWc` の3サイトが `const m=_wM()`
