# ADR-0865 — プロパティ値の serialize 重量上限

## Status
Accepted — v1.7.891

## Context

ADR-0858 で wire 取込の未知キーを **件数 64** で縛った。しかし件数だけでは
1 鍵あたりの値のサイズが無制限のまま残った:

```js
{op:'upd', id:'a', after:{junk:'x'.repeat(24_000_000)}}   // 24MB 1 鍵で受理
```

`upd`/`add` の patch は `Object.assign` で形状本体へ着地し、snapshot で
全ピアへ増殖する。wire メッセージの 24MB 上限内で、1 op が ~24MB の
ジャンクを盤面へ恒常的に蓄積できた。

## Decision

validPatch に「全 prop の serialize 重量 ≤6KB」を追加:

```js
for(const k of _ok(p))
  if(k!=='pts'&&k!=='dataUrl'&&k!=='text'&&_ln(_JS(p[k]))>6e3)return false;
```

- `pts` 除外 — 50000 タプルの固有上限を持つ (~1MB)
- `dataUrl` 除外 — 16MB の固有上限を持つ
- `text` 除外 — 5000 文字の固有上限を持つ (escape 展開で _JS が ~10KB に
  化けるため、別上限を持つ prop は別枠にする)

除外は「独自の上限を既に持つ prop」のみ。それ以外 (既知の小さい prop と
前方互換の未知 prop) は一律 6KB で縛る。最小値を記述する必要がなく、
どのキーでも同じ契約になる。

## Consequences

- 未知キーの前方互換性は維持 (6KB までの構造化値は通る)
- 24MB wire 上限は不変だが、形状へ着地するジャンク重量は ≤64×6KB=384KB
- 全 intake 経路 (wire op / snapshot merge / .board / share / IDB 読込) が
  validPatch/validShape を共有するため、一箇所の変更で全経路を閉塞

## Tests

- `>6KB` 未知キー値 → upd で棄却
- `≤6KB` 未知キー値 → 受理 (前方互換)
- `>6KB` serialize 配列値 → validShape で棄却
- text 5000 文字・dataUrl >6KB は固有上限のまま受理
