# ADR-0506: `_ul` unlocked 判定 shorthand

## 状態

実装済 (v1.7.539)

## 背景

`s=>!_lk(s)` の unlocked 判定 arrow が 6 サイトに散在。

## 決定

`const _ul=s=>!_lk(s);` に集約 — `filter(_ul)`/`some(_ul)`/`_selAny(_ul)` で
point-free 利用。`_ulv` (unlocked+visible) は複合のため維持。

## 影響

- index.html ~-40B
- 動作変更なし
