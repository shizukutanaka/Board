# ADR-0913 — `frac` を構造キーとして patch 適用から除去

## Defect

ADR-0912 (`pg` 除去) と同型の意図/実装乖離 — ADR-0373 のコメントは
「`frac` z-order scrambles」も `_stripStruct` の防衛対象に列挙するが
`frac` は除去されていなかった。`frac` は wire 上 z-order の唯一の
正規キーで `zorder` op の `changes` 形式経由のみで LWW (`_lwwSkip` +
`clockNewer`) 収束する設計 — しかし `validPatch` の string whitelist
に載っているため、鍛造 `upd`/`style` patch で `_oa` 経由の無条件書換え
が可能だった:

- `clockNewer`/`_lwwSkip` 収束を迂回する z-order 攪乱
- `move` 適用は `x`/`y` 個別代入のため不受影響、whole-shape restore
  (add/del/clear/replace) は `_stripStruct` 非経由で正規 `frac` 維持

## Fix

- `_stripStruct`: `delete p.frac;` 追加
- style/resize/align/beautify inline strip にも `delete p.frac;`

`pg` と同じく prop のみ黙殺 — 正規プロデューサは prop patch に `frac`
を載せない (z-order 書き込みは `changes` 専用) ため後方互換の損失なし。
`s.z` は sort が `frac` のみ参照するため攪乱影響が限定的で今回は対象外。

## Gate

`node test.mjs`: 2924 pass, 0 fail (+1 source pin)。
raw 557,054B (上限 557,056B 内)。
