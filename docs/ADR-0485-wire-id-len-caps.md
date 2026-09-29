# ADR-0485: `validRemotePayload` の全 id フィールドに長さキャップ

## 状態

実装済 (v1.7.518)

## 背景

`validShape` は shape の `id` を string かつ ≤64 で検証している (ADR-0388) が、
**op レベル**の id フィールドは `_iS()` の型チェックのみで長さ未検証だった:

- `upd` の `op.id`
- `move` の `op.ids[]` エントリ
- `zorder` の `changes[].id` (legacy `after[].id` は ADR-0479 で対策済)
- `del.connClears[].id`
- `patches()` (style/resize/align/upd-array 共通) の `p.id`
- `group`/`ungroup` の `op.ids[]` エントリ + `before[].id`

長大な id は byId 探索・Map キー化・`_stampWrites` の連結に供給され得る —
DoS 的にも規約整合的にも shape id ≤64 を op 側へも適用すべき。

## 決定

上記 7 箇所の `_iS(...)` 直後に `&&_ln(...)<=64` を追加 (`upd` だけ `_ln(op.id)>64`
拒否の形)。gids の ≤64 は ADR-0473 で済みなので据置。

## 影響

- index.html +~120B (523,407 → 523,526)
- test.mjs に境界テスト 8 件 (id=64 受理/65 拒否を各フィールドで) + 既存 2 assert の
  pin パターン同期
