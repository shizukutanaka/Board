# ADR-0785 — img 再組立ての集計バイト予算

- 日付: 2026-09-29
- 状態: 実装済み

## Context

ADR-0781 で per-slot 12MB を入れたが、スロット数自体は 64 — ピアが多数キーで
ダブリングすれば 64 × 12MB ≈ **768MB** の in-flight 蓄積が可能だった。
バイト上限を「スロット単位」だけでなく「マップ集計」にも適用する必要があった。

## Decision

永続カウンタは持たず、チャンク到着ごとに O(64) で合計を再計算し、
24MB 超過時は最古スロットから逐次退避:

```js
let _tb=0;for(const v of this._imgChunks.values())_tb+=v.b||0;
while(_tb>24_000_000&&this._imgChunks.size){const _e=…;_tb-=…;this._imgChunks.delete(_e)}
if(this._imgChunks.get(msg.key)!==st)break;   // 自スロットが最古で退避された場合
```

- 再計算型にした理由: delete サイトが4箇所 (生成時 LRU/再起動/early-abort/join 完了)
  あり、永続カウンタは drift リスクがある。O(64) は誤差。
- 閾値 24MB: 同時 2 画像転送 (12MB×2) を許容しつつ爆発を止める最小値。
- 自分のスロットが退避された場合は当該チャンクを棄却 (最古 = 恐らく滞留)。

## Consequences

- in-flight 最悪保持量 768MB → 24MB。
- ADR-0781 (単スロット)・0784 (保持ストア)・0783 (送信キュー) と合わせて
  wire 蓄積系のバイト上限は完結。
- テストピン2件: 最古のみ退避・生きたスロットは完走。
