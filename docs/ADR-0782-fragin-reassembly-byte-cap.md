# ADR-0782 — frag 再組立ての中間バイト上限

- 日付: 2026-09-29
- 状態: 実装済み

## Context

`_fragIn` ('snap'/'opc' の共有単一スロット再組立) は ADR-0781 と同型の穴を
持っていた: 結合後 ≤24MB の判定は全パーツ到着後にのみ走り、
384 チャンク × 96KB ≈ 37MB が `_snapIn`/`_opcIn` に蓄積し得た
(2 スロットで最大 ~74MB)。

## Decision

ADR-0781 と同じ構造 — スロットに `sn.b` を持たせ、格納ごとに加算し
24MB 超過でスロットを廃棄:

```js
if(!sn.p[seq]){sn.p[seq]=msg.data;sn.g++;sn.b=(sn.b||0)+_ln(msg.data)}
if(sn.b>24_000_000){this[key]=null;return}
```

呼出し側の `>24_000_000` 結合後チェックは definitive check として残す。

## Consequences

- 1 スロットの保持量が 37MB → 24MB で頭打ち (2 スロット合計 ~74MB → 48MB)。
- 中断後の後続 seq は新スロットとして再開 (ADR-0781 と同じ out-of-order 継続)。
- テストピン3件: abort → 新スロット再開・カウンタリセット・正常完了でクリア。
