# ADR-0784 — _imgIn 受信 blob ストアのバイト上限

- 日付: 2026-09-29
- 状態: 実装済み

## Context

`_imgIn` (受信済み blob ストア) は件数 256 で bounded だったが、各エントリは
結合後 ≤12MB — **256 × 12MB ≈ 3GB** の base64 をピアが正当な img ストリームを
連投するだけで保持させられた。ADR-0781 (in-flight)・ADR-0783 (送信キュー) と
同じ「件数ではなくバイトで縛る」クラスの最後の積み残し。

## Decision

`_imgInB` (保持バイト数) を追跡し、set ごとに最古退避を「size>256 または
bytes>64MB」の while ループで統一:

```js
if(this._imgIn.has(msg.key))this._imgInB-=_ln(this._imgIn.get(msg.key));
this._imgIn.set(msg.key,data);this._imgInB=(this._imgInB||0)+_ln(data);
while(this._imgIn.size>256||this._imgInB>64_000_000){const k0=…;this._imgInB-=_ln(this._imgIn.get(k0));this._imgIn.delete(k0)}
```

- 再送同一キー (content-hash → 同一データ) は差分を先に引いて drift を防ぐ。
- 上限 64MB: 実用上は ~5 フルサイズ blob or 数百の通常画像を保持。
- 退避された blob を参照する図形は `_imgPending` のまま未解決 (表示退化するが
  メモリ枯渇より良い — 攻撃面での標準的トレードオフ)。
- `_imgIn` はルーム切替で消えない (content-addressed で跨室再利用、従来設計)
  のでカウンタも跨室で継続 — delete サイトが唯一のため会計は閉じる。

## Consequences

- 最悪保持量 ~3GB → 64MB。
- 正常用途 (実画像のやり取り) では上限に達しない。
- テストピン3件: バイト上限で最古退避・必要数のみ退避・実 blob は格納される。
