# ADR-0845 — _imgSent バイト上限の最古 evict を behavioural ピン

## Context

ADR-0842 で `_imgSent` に 64MB バイト上限を入れた。登録の存在ピンはあるが、
超過時に「挿入順最古から evict」する順序は未固定だった — 順序を間違えると
新しい blob が先に捨てられ、駐車中の参照が heal 不能になる。

## Test

33MB×2 の実エントリ + slim による新規 put で 66MB 超過を実スケールで再現し、
最古 `k1` のみが evict され `k2` と新キーが残ることを固定。
