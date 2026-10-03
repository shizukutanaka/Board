# ADR-0984: `ptr.reborn`/`_nug.reborn` の過剰マーク — remote 'replace' keep 存続図形

## Status

Accepted (v1.8.010) — implemented.

## Context

ADR-0970 で導入した `_rb` (reborn) 標識は「ジェスチャ arm 中に remote 側で (再)誕生した図形」
を記録し、`_gRst`/`_nugLock` の原状復元が **差替え後の新オブジェクトへ arm-time 値を
書き戻す stomp** を防ぐ収束機構である。記録は `_bT` (born スタンプ) の内部で remote
clock (`c.peer!==_pi()`) かつ `ptr.down`/`_nug` 生存時に走る。

しかし `_bT` は **born スタンプの適用可否に関わらず無条件で** reborn へ追加していた。
remote `'replace'` forward は末尾で `for(const s of _sh())_bT(s.id,op.clock)` と全図形へ
刻むため:

- incoming 差替え図形 — wc は `state.wclock=_wM()` でリセット済み。`!w._born` なので
  stamp 適用 + mark。正しい (live オブジェクトは本当に新しい)。
- tomb/削除図形 — `_sh()` 外、対象外。
- **keep 存続図形** — `_bN(s.id,op.clock)` (born が swap 時計より新しい) で
  `wc0` のエントリごと `_wR` 復元済み。live オブジェクトは差替えられず、arm した
  ジェスチャの mutation も保持されたまま。にもかかわらず `_bT` は remote clock を
  見て **unconditional に reborn へ追加**していた (born スタンプ自体は
  `clockNewer` で skip され実害なし)。

'clear' forward は keep 復元後に `_bT` ループを持たないため、同一クラスの keep は
mark されず正しい挙動だった — 'replace' だけが過剰だった。

## Defect (再現条件)

1. ローカルが図形 X を作成・commit (born=B0、時刻は新しい)。
2. X の move ドラッグを arm (`ptr.down`, `dragStartShapes` に arm-time clone)。
3. remote ピアの `'replace'` (clock C < B0、X は incoming set に含まれない) が到着。
   → X は keep で live オブジェクトのまま残る。`_bT` が X を `ptr.reborn` へ追加。
4. ユーザが Esc で cancel → `_gRst` は `_rb(X.id)` を見て restore を **スキップ**。
   → ドラッグ途中の位置がローカルにだけ残存。commit も起きない。
   → 各ピアは arm-time 値を保持 → 書き込みが来るまでの一方向発散。

`_nug` pending-op の `_nugLock` 復元も `n.reborn` で同型の skip をするため、keep メンバー
が pending 中に cancel/flush されると同じ非対称が起きる。

## Decision

`_bT` の reborn マークを **born スタンプが実際に適用された時に限定**:

```js
const _bT=(id,c)=>{
  const w=_wc()[id]||(_wc()[id]=_wM());
  if(!w._born||clockNewer(c,w._born)){   // ← mark はこのゲートの中
    w._born=c;
    if(c.peer!==_pi()){
      if(ptr.down)(ptr.reborn||(ptr.reborn=new Set())).add(id);
      if(_nug)(_nug.reborn||(_nug.reborn=new Set())).add(id);
    }
  }
}
```

効果:

| 経路 | wc 状態 | stamp | mark | 意図 |
|---|---|---|---|---|
| 'replace' incoming clone | reset 済み (空) | 適用 | mark | 新オブジェクト → restore skip ✓ |
| 'replace' keep | `_wR` で旧 born 復元済み (C より新) | skip | **無 mark** | 同一 live オブジェクト → restore ✓ |
| 'add'/'addMany'/'pageAdd' 新規 push | 新規 or tomb クリア済み | 適用 | mark | 新オブジェクト → skip ✓ |
| del/clear/pageDel backward | local clock | (apply なら適用) | `peer===_pi` で不発 | ローカル undo ✓ |
| 'clear' keep | `_wR` 復元 | (ループ自体なし) | — | 元々正しい挙動、今回と整合 |

到着順序 semantics (ADR-0970) は保持される: reset 済み/新規 wc では born は必ず
「適用」されるため、真正な再誕生は clock 比較に関わらず mark される。

残る限界: 鍛造 `afterWc` が swap clock より新しい born を運ぶ場合 mark が外れ stomp
し得るが、これは peer を信頼する全体モデルと同じ前提 (嘘の時計自体が既に他ドメインで
発散を産める) のため対象外。

## Verification

`test.mjs` behavioural ピン (5 assert):

- keep 存続図形が swap 後も同一 live オブジェクト (`byId(keepObj.id)===keepObj`)。
- keep 存続 id が `ptr.reborn` に入らない (修正前は入る)。
- incoming swap id は `ptr.reborn` に入る (契約の半分: 新オブジェクトは skip)。
- `abortGesture` 後、keep の `x` は arm-time 値へ復元 (修正前は 50 で残留)。
- incoming swap id の `x` は sender 値 777 を保持 (restore が skip される)。

`node test.mjs`: **3230 pass, 0 fail** (3225 + 5)、raw index.html **556,955B** (< 557,056B)。

## Consequences

- `'replace'` の keep マークは 'clear' の既存挙動と一致 — 同じ keep 規則、同じ
  restore 結果。
- `_nug.reborn` も同一ゲートで閉塞 (pending-nug メンバーが keep だった場合の
  run-start 復元が正しく走る)。
- 本 ADR は ADR-0926/0928 (born 刻印の対称性) と ADR-0969/0970/0971 (mid-gesture
  remote-write merge) の境界を整合させる修正。
