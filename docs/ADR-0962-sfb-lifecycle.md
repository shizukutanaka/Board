# ADR-0962: スライダー before バッファ `_sbf` のジェスチャ境界

## Status

Accepted (v1.7.988)

## Context

undo 共合のためスライダー系コントロール (size `rngSize` / opacity `rngOpacity` /
カラーピッカー `input.cp` の stroke/fill) は、ジェスチャ開始 (`focus`/`pointerdown`)
に選択図形の prop を `_sbf[id+p]` へ記録し、`change` で before/after style op を
1 件 commit する (`_sfbCapture`/`_sfbFlush`)。`input` の連発は live mutation のみで
op を産まない (ADR-0957 系のナッジ共合と同思想のフォーム側)。

`_sbf` のライフサイクルを監査したところ、2 欠陥があった。

1. **stale before**: `_sbfCapture` は `!(id+p in _sbf)` で「既にエントリがあれば
   skip」する — ジェスチャ内の input ドリフトを保つために必要だが、`capture` の後に
   `change` が発火しないままジェスチャが終わる経路 (blur で離脱、ピッカー cancel 等)
   でエントリが**永久残留**する。次ジェスチャまでの間に図形値が外部変化
   (他 UI・remote op・undo) すると、次ジェスチャの capture は skip され、古い値が
   op の `before` として commit される → **undo が誤値を復元**する実害。
2. **選択外リーク**: `_sfbFlush` は**現在の選択**の id しか消費しないので、capture
   後に選択から外れた id の `id+p` キーは永久に残る (有界だが消費不能の死にセル)。

## Decision

### ジェスチャ境界を `blur` とし、ドリフトを commit してから全消去

`change` が来ないジェスチャ終了を拾う唯一の確実な境界は `blur` (フォーカス移動)。
`_sfbBlur(p)` を各コントロールの `blur` に接続:

```js
function _sfbBlur(p){const b=[],a=[];for(const k in _sbf)if(_ew(k,p)){
  const s=byId(k.slice(0,-p.length));
  if(s&&!_lk(s)&&_sbf[k]!==s[p])_pp(b,a,s.id,p,_sbf[k],s[p]);
  delete _sbf[k];}
  if(_ln(b))_styleOp(b,a)}
```

- **ドリフト済みエントリ (recorded ≠ live)**: input プレビューで live が動いたが
  `change` が発火しなかった = mutation は盤面に**既に実在**するのに op が無い
  (undo 不能・wire 未送信 = 一方向発散)。blur 時点で `before=記録値 → after=live`
  の 1 style op として commit — 実害 (2) を併せて閉塞。
- **quiescent エントリ (recorded === live)**: commit 不要、破棄のみ。
- capture 側の within-gesture スキップは**維持**する — focus→pointerdown→input
  の連鎖で re-capture されると before がドリフト値で上書きされ正確なジェスチャ
  before を失うため (test.mjs:10461 系の契約)。stale リスクはジェスチャ**間**の
  blur 消去で解消する設計に変えた。

`blur` が `change` より先に来る並び (特に `input[type=color]` でプラットフォーム依存)
はドリフトを先に commit するので、後着の `change` は空バッファに flush →
`_sfbFlush` が no-op で収まり二重 op にならない。

### `_sfbFlush` の選択外プルーン

flush 冒頭で「同 prop (`_ew(k,p)`) かつ選択外」のキーを破棄:

```js
const sel=_sT(_sl());
for(const k in _sbf)if(_ew(k,p)&&!sel.has(k.slice(0,-p.length)))delete _sbf[k];
```

合成キー `id+p` は区切り文字を持たないが `k.slice(0,-p.length)` が id 部を復元する。
id 含む誤削除 (id が他 id+p の prefix になるパターン) は実質起き得ず、起きても
消費不能キーが早く破棄されるだけで無害。

## Consequences

- stale-before undo 経路を閉塞 (blur で境界が引かれるのでジェスチャ間の残留がない)。
- 「プレビューだけ走って commit されない」系の盤面ドリフトが op として着地 →
  undo/wire/persist の全派生面が正しく追従。
- `_sbf` は有界のまま (選択数×prop 数)、選択外キーも自浄。
- `switchPage`/tab-hide 系のライフサイクル経路は `_nug` と同様に `_sbf` も
  ジェスチャ状態としては残置されるが、blur が必ず後続するため収束する。
- ピン: test.mjs ADR-0962 ブロック (7 asserts) — blur 消去・次ジェスチャが
  live 値を採る・blur がドリフトを1 op 化・選択外プルーン。
